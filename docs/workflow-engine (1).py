import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { RetryStrategy, WorkflowTask, TaskStatus, WorkflowDefinition, 
         WorkflowInstance, TaskDefinition, WorkflowEvent, 
         ConditionalExpression, TaskResult } from '../models/workflow.types';
import { NotificationService } from '../services/notification.service';
import { ExternalApiService } from '../services/external-api.service';
import { Logger } from '../utils/logger';

/**
 * Workflow Engine for configurable document processing pipelines
 * Provides event-driven task execution with conditional paths and retry mechanisms
 */
export class WorkflowEngine {
  private workflowDefinitions: Map<string, WorkflowDefinition>;
  private workflowInstances: Map<string, WorkflowInstance>;
  private eventEmitter: EventEmitter;
  private notificationService: NotificationService;
  private externalApiService: ExternalApiService;
  private logger: Logger;

  constructor(
    notificationService: NotificationService,
    externalApiService: ExternalApiService,
    logger: Logger
  ) {
    this.workflowDefinitions = new Map();
    this.workflowInstances = new Map();
    this.eventEmitter = new EventEmitter();
    this.notificationService = notificationService;
    this.externalApiService = externalApiService;
    this.logger = logger;
    
    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Register a new workflow definition
   */
  registerWorkflow(definition: WorkflowDefinition): string {
    const workflowId = definition.id || uuidv4();
    
    // Validate workflow definition
    this.validateWorkflowDefinition(definition);
    
    // Store with validated ID
    const validatedDefinition = { 
      ...definition, 
      id: workflowId 
    };
    
    this.workflowDefinitions.set(workflowId, validatedDefinition);
    this.logger.info(`Workflow definition registered: ${workflowId}`);
    
    return workflowId;
  }

  /**
   * Start a workflow instance based on a registered definition
   */
  async startWorkflow(
    definitionId: string, 
    initialData: Record<string, any> = {}
  ): Promise<string> {
    const definition = this.workflowDefinitions.get(definitionId);
    
    if (!definition) {
      throw new Error(`Workflow definition not found: ${definitionId}`);
    }
    
    const instanceId = uuidv4();
    
    // Create workflow instance
    const instance: WorkflowInstance = {
      id: instanceId,
      definitionId,
      status: 'running',
      currentTasks: [],
      completedTasks: [],
      failedTasks: [],
      data: { ...initialData },
      startTime: new Date(),
      endTime: null,
      auditLog: [{
        timestamp: new Date(),
        event: 'workflow_started',
        details: { definitionId }
      }]
    };
    
    this.workflowInstances.set(instanceId, instance);
    
    // Find starting tasks (those with no dependencies)
    const startingTasks = definition.tasks.filter(task => 
      !task.dependsOn || task.dependsOn.length === 0
    );
    
    // Queue starting tasks for execution
    for (const taskDef of startingTasks) {
      await this.queueTask(instanceId, taskDef.id);
    }
    
    this.logger.info(`Workflow instance started: ${instanceId} (definition: ${definitionId})`);
    
    return instanceId;
  }

  /**
   * Pause a running workflow instance
   */
  pauseWorkflowInstance(instanceId: string): void {
    const instance = this.workflowInstances.get(instanceId);
    
    if (!instance) {
      throw new Error(`Workflow instance not found: ${instanceId}`);
    }
    
    if (instance.status !== 'running') {
      throw new Error(`Cannot pause workflow in status: ${instance.status}`);
    }
    
    // Update status
    instance.status = 'paused';
    instance.auditLog.push({
      timestamp: new Date(),
      event: 'workflow_paused',
      details: {}
    });
    
    this.logger.info(`Workflow instance paused: ${instanceId}`);
  }

  /**
   * Resume a paused workflow instance
   */
  async resumeWorkflowInstance(instanceId: string): Promise<void> {
    const instance = this.workflowInstances.get(instanceId);
    
    if (!instance) {
      throw new Error(`Workflow instance not found: ${instanceId}`);
    }
    
    if (instance.status !== 'paused') {
      throw new Error(`Cannot resume workflow in status: ${instance.status}`);
    }
    
    // Update status
    instance.status = 'running';
    instance.auditLog.push({
      timestamp: new Date(),
      event: 'workflow_resumed',
      details: {}
    });
    
    // Re-queue current tasks
    for (const task of instance.currentTasks) {
      if (task.status === 'paused') {
        task.status = 'queued';
        await this.executeTask(instanceId, task.id);
      }
    }
    
    this.logger.info(`Workflow instance resumed: ${instanceId}`);
  }

  /**
   * Cancel a workflow instance
   */
  cancelWorkflowInstance(instanceId: string): void {
    const instance = this.workflowInstances.get(instanceId);
    
    if (!instance) {
      throw new Error(`Workflow instance not found: ${instanceId}`);
    }
    
    if (instance.status === 'completed' || instance.status === 'failed' || instance.status === 'cancelled') {
      throw new Error(`Cannot cancel workflow in status: ${instance.status}`);
    }
    
    // Update status
    instance.status = 'cancelled';
    instance.endTime = new Date();
    instance.auditLog.push({
      timestamp: new Date(),
      event: 'workflow_cancelled',
      details: {}
    });
    
    // Cancel all current tasks
    for (const task of instance.currentTasks) {
      if (task.status !== 'completed' && task.status !== 'failed') {
        task.status = 'cancelled';
        this.emitTaskEvent(instanceId, task.id, 'task_cancelled');
      }
    }
    
    this.logger.info(`Workflow instance cancelled: ${instanceId}`);
  }

  /**
   * Get workflow instance status and data
   */
  getWorkflowInstance(instanceId: string): WorkflowInstance | undefined {
    return this.workflowInstances.get(instanceId);
  }

  /**
   * Queue a task for execution
   */
  private async queueTask(instanceId: string, taskId: string): Promise<void> {
    const instance = this.workflowInstances.get(instanceId);
    
    if (!instance) {
      throw new Error(`Workflow instance not found: ${instanceId}`);
    }
    
    const definition = this.workflowDefinitions.get(instance.definitionId);
    
    if (!definition) {
      throw new Error(`Workflow definition not found: ${instance.definitionId}`);
    }
    
    const taskDef = definition.tasks.find(t => t.id === taskId);
    
    if (!taskDef) {
      throw new Error(`Task definition not found: ${taskId}`);
    }
    
    // Check if the task is already in the current tasks list
    const existingTask = instance.currentTasks.find(t => t.id === taskId);
    
    if (existingTask) {
      // Task is already queued or running
      return;
    }
    
    // If task has conditions, evaluate them
    if (taskDef.conditions && !this.evaluateConditions(taskDef.conditions, instance.data)) {
      // Conditions not met, skip this task
      this.logger.info(`Task conditions not met, skipping: ${taskId} in workflow ${instanceId}`);
      
      // Find and queue next tasks
      await this.queueNextTasks(instanceId, taskId);
      return;
    }
    
    // Create task instance
    const task: WorkflowTask = {
      id: taskId,
      status: 'queued',
      attempts: 0,
      startTime: null,
      endTime: null,
      error: null,
      result: null
    };
    
    // Add to current tasks
    instance.currentTasks.push(task);
    
    // Log task queued
    instance.auditLog.push({
      timestamp: new Date(),
      event: 'task_queued',
      details: { taskId }
    });
    
    // Execute task if workflow is running
    if (instance.status === 'running') {
      await this.executeTask(instanceId, taskId);
    }
  }

  /**
   * Execute a queued task
   */
  private async executeTask(instanceId: string, taskId: string): Promise<void> {
    const instance = this.workflowInstances.get(instanceId);
    
    if (!instance) {
      throw new Error(`Workflow instance not found: ${instanceId}`);
    }
    
    if (instance.status !== 'running') {
      // Workflow is not running, don't execute task
      return;
    }
    
    const taskIndex = instance.currentTasks.findIndex(t => t.id === taskId);
    
    if (taskIndex === -1) {
      throw new Error(`Task not found in current tasks: ${taskId}`);
    }
    
    const task = instance.currentTasks[taskIndex];
    
    if (task.status !== 'queued') {
      // Task is not queued, don't execute
      return;
    }
    
    const definition = this.workflowDefinitions.get(instance.definitionId);
    
    if (!definition) {
      throw new Error(`Workflow definition not found: ${instance.definitionId}`);
    }
    
    const taskDef = definition.tasks.find(t => t.id === taskId);
    
    if (!taskDef) {
      throw new Error(`Task definition not found: ${taskId}`);
    }
    
    // Update task status
    task.status = 'running';
    task.startTime = new Date();
    task.attempts++;
    
    // Log task started
    instance.auditLog.push({
      timestamp: new Date(),
      event: 'task_started',
      details: { taskId, attempt: task.attempts }
    });
    
    this.emitTaskEvent(instanceId, taskId, 'task_started');
    
    try {
      // Execute task
      let result: any;
      
      switch (taskDef.type) {
        case 'document_processing':
          result = await this.executeDocumentProcessingTask(taskDef, instance.data);
          break;
        case 'notification':
          result = await this.executeNotificationTask(taskDef, instance.data);
          break;
        case 'external_api':
          result = await this.executeExternalApiTask(taskDef, instance.data);
          break;
        case 'data_transformation':
          result = await this.executeDataTransformationTask(taskDef, instance.data);
          break;
        default:
          throw new Error(`Unsupported task type: ${taskDef.type}`);
      }
      
      // Update task status
      task.status = 'completed';
      task.endTime = new Date();
      task.result = result;
      
      // Update workflow data
      if (taskDef.outputDataMapping) {
        this.applyOutputDataMapping(taskDef.outputDataMapping, result, instance.data);
      }
      
      // Log task completed
      instance.auditLog.push({
        timestamp: new Date(),
        event: 'task_completed',
        details: { taskId }
      });
      
      this.emitTaskEvent(instanceId, taskId, 'task_completed');
      
      // Move task to completed tasks
      instance.currentTasks.splice(taskIndex, 1);
      instance.completedTasks.push(task);
      
      // Queue next tasks
      await this.queueNextTasks(instanceId, taskId);
      
      // Check if workflow is completed
      this.checkWorkflowCompletion(instanceId);
    } catch (error) {
      // Handle task failure
      await this.handleTaskFailure(instanceId, taskIndex, task, taskDef, error);
    }
  }

  /**
   * Handle task execution failure with retry mechanism
   */
  private async handleTaskFailure(
    instanceId: string,
    taskIndex: number,
    task: WorkflowTask,
    taskDef: TaskDefinition,
    error: any
  ): Promise<void> {
    const instance = this.workflowInstances.get(instanceId);
    
    if (!instance) {
      return;
    }
    
    // Update task with error
    task.error = {
      message: error.message || 'Unknown error',
      stack: error.stack,
      timestamp: new Date()
    };
    
    // Log task error
    instance.auditLog.push({
      timestamp: new Date(),
      event: 'task_error',
      details: { 
        taskId: task.id, 
        attempt: task.attempts, 
        error: task.error.message 
      }
    });
    
    this.emitTaskEvent(instanceId, task.id, 'task_error');
    
    // Check if retry is possible
    const retryStrategy = taskDef.retryStrategy || { maxAttempts: 1, delay: 0 };
    
    if (task.attempts < retryStrategy.maxAttempts) {
      // Set status to retry
      task.status = 'retry';
      
      // Log retry scheduled
      instance.auditLog.push({
        timestamp: new Date(),
        event: 'task_retry_scheduled',
        details: { 
          taskId: task.id, 
          attempt: task.attempts, 
          nextAttempt: task.attempts + 1, 
          delay: retryStrategy.delay 
        }
      });
      
      // Schedule retry
      setTimeout(async () => {
        if (instance.status === 'running') {
          task.status = 'queued';
          await this.executeTask(instanceId, task.id);
        }
      }, retryStrategy.delay);
    } else {
      // Max retries reached, mark as failed
      task.status = 'failed';
      task.endTime = new Date();
      
      // Log task failed
      instance.auditLog.push({
        timestamp: new Date(),
        event: 'task_failed',
        details: { 
          taskId: task.id, 
          attempts: task.attempts 
        }
      });
      
      this.emitTaskEvent(instanceId, task.id, 'task_failed');
      
      // Move to failed tasks
      instance.currentTasks.splice(taskIndex, 1);
      instance.failedTasks.push(task);
      
      // Handle error based on task configuration
      if (taskDef.errorHandling === 'continue') {
        // Continue workflow despite failure
        await this.queueNextTasks(instanceId, task.id);
        this.checkWorkflowCompletion(instanceId);
      } else {
        // Fail the workflow
        instance.status = 'failed';
        instance.endTime = new Date();
        
        // Log workflow failed
        instance.auditLog.push({
          timestamp: new Date(),
          event: 'workflow_failed',
          details: { 
            reason: `Task failed: ${task.id}`,
            error: task.error?.message 
          }
        });
      }
    }
  }

  /**
   * Queue next tasks that depend on the completed task
   */
  private async queueNextTasks(instanceId: string, completedTaskId: string): Promise<void> {
    const instance = this.workflowInstances.get(instanceId);
    
    if (!instance) {
      return;
    }
    
    const definition = this.workflowDefinitions.get(instance.definitionId);
    
    if (!definition) {
      return;
    }
    
    // Find tasks that depend on the completed task
    const nextTasks = definition.tasks.filter(task => 
      task.dependsOn && task.dependsOn.includes(completedTaskId)
    );
    
    for (const nextTask of nextTasks) {
      // Check if all dependencies are completed
      const allDependenciesMet = nextTask.dependsOn?.every(depTaskId => {
        // Check if dependency is in completed tasks
        return instance.completedTasks.some(t => t.id === depTaskId);
      }) ?? true;
      
      if (allDependenciesMet) {
        // Queue the task
        await this.queueTask(instanceId, nextTask.id);
      }
    }
  }

  /**
   * Check if workflow is completed (no more tasks to execute)
   */
  private checkWorkflowCompletion(instanceId: string): void {
    const instance = this.workflowInstances.get(instanceId);
    
    if (!instance) {
      return;
    }
    
    if (instance.status !== 'running') {
      // Workflow is not running, nothing to check
      return;
    }
    
    if (instance.currentTasks.length === 0) {
      // No more tasks, workflow is completed
      instance.status = 'completed';
      instance.endTime = new Date();
      
      // Log workflow completed
      instance.auditLog.push({
        timestamp: new Date(),
        event: 'workflow_completed',
        details: {
          totalTasks: instance.completedTasks.length + instance.failedTasks.length,
          failedTasks: instance.failedTasks.length
        }
      });
      
      this.emitWorkflowEvent(instanceId, 'workflow_completed');
    }
  }

  /**
   * Set up event listeners for the workflow engine
   */
  private setupEventListeners(): void {
    // Example event listeners
    this.eventEmitter.on('workflow_started', (event: WorkflowEvent) => {
      this.logger.info(`Workflow started: ${event.instanceId}`);
    });
    
    this.eventEmitter.on('workflow_completed', (event: WorkflowEvent) => {
      this.logger.info(`Workflow completed: ${event.instanceId}`);
    });
    
    this.eventEmitter.on('workflow_failed', (event: WorkflowEvent) => {
      this.logger.warn(`Workflow failed: ${event.instanceId}`, event.data);
    });
  }

  /**
   * Emit a task-related event
   */
  private emitTaskEvent(instanceId: string, taskId: string, eventType: string): void {
    const instance = this.workflowInstances.get(instanceId);
    
    if (!instance) {
      return;
    }
    
    const task = [...instance.currentTasks, ...instance.completedTasks, ...instance.failedTasks]
      .find(t => t.id === taskId);
    
    if (!task) {
      return;
    }
    
    const event: WorkflowEvent = {
      eventType,
      instanceId,
      definitionId: instance.definitionId,
      taskId,
      timestamp: new Date(),
      data: {
        taskStatus: task.status,
        taskResult: task.result,
        taskError: task.error
      }
    };
    
    this.eventEmitter.emit(eventType, event);
  }

  /**
   * Emit a workflow-related event
   */
  private emitWorkflowEvent(instanceId: string, eventType: string): void {
    const instance = this.workflowInstances.get(instanceId);
    
    if (!instance) {
      return;
    }
    
    const event: WorkflowEvent = {
      eventType,
      instanceId,
      definitionId: instance.definitionId,
      timestamp: new Date(),
      data: {
        status: instance.status,
        completedTasks: instance.completedTasks.length,
        failedTasks: instance.failedTasks.length
      }
    };
    
    this.eventEmitter.emit(eventType, event);
  }

  /**
   * Evaluate conditional expressions
   */
  private evaluateConditions(conditions: ConditionalExpression[], data: Record<string, any>): boolean {
    // Simple condition evaluator
    return conditions.every(condition => {
      const leftValue = this.resolveDataPath(condition.left, data);
      const rightValue = typeof condition.right === 'string' && condition.right.startsWith(') 
        ? this.resolveDataPath(condition.right, data) 
        : condition.right;
      
      switch (condition.operator) {
        case 'eq':
          return leftValue === rightValue;
        case 'neq':
          return leftValue !== rightValue;
        case 'gt':
          return leftValue > rightValue;
        case 'gte':
          return leftValue >= rightValue;
        case 'lt':
          return leftValue < rightValue;
        case 'lte':
          return leftValue <= rightValue;
        case 'contains':
          return String(leftValue).includes(String(rightValue));
        case 'startsWith':
          return String(leftValue).startsWith(String(rightValue));
        case 'endsWith':
          return String(leftValue).endsWith(String(rightValue));
        case 'exists':
          return leftValue !== undefined && leftValue !== null;
        default:
          return false;
      }
    });
  }

  /**
   * Apply output data mapping to workflow data
   */
  private applyOutputDataMapping(
    mapping: Record<string, string>, 
    taskResult: any, 
    data: Record<string, any>
  ): void {
    for (const [targetPath, sourcePath] of Object.entries(mapping)) {
      const value = this.resolveDataPath(sourcePath, taskResult);
      this.setDataAtPath(targetPath, value, data);
    }
  }

  /**
   * Execute specific task types
   */
  private async executeDocumentProcessingTask(
    taskDef: TaskDefinition, 
    data: Record<string, any>
  ): Promise<TaskResult> {
    // Implementation for document processing task
    // This would integrate with document processing services
    return { processed: true, status: 'success' };
  }

  private async executeNotificationTask(
    taskDef: TaskDefinition, 
    data: Record<string, any>
  ): Promise<TaskResult> {
    const templateId = taskDef.config?.templateId;
    const recipients = taskDef.config?.recipients;
    const resolvedRecipients = Array.isArray(recipients) 
      ? recipients.map(r => typeof r === 'string' && r.startsWith(') 
          ? this.resolveDataPath(r, data) 
          : r)
      : [];
    
    // Send notification using the notification service
    await this.notificationService.sendNotification({
      templateId,
      recipients: resolvedRecipients,
      data: this.prepareNotificationData(taskDef.config?.dataMapping, data)
    });
    
    return { sent: true, recipients: resolvedRecipients.length };
  }

  private async executeExternalApiTask(
    taskDef: TaskDefinition, 
    data: Record<string, any>
  ): Promise<TaskResult> {
    const endpoint = taskDef.config?.endpoint;
    const method = taskDef.config?.method || 'GET';
    const headers = taskDef.config?.headers || {};
    const resolvedHeaders: Record<string, string> = {};
    
    // Resolve header values from data
    for (const [key, value] of Object.entries(headers)) {
      resolvedHeaders[key] = typeof value === 'string' && value.startsWith(') 
        ? this.resolveDataPath(value, data) 
        : value;
    }
    
    // Prepare request body if applicable
    let body = undefined;
    if (taskDef.config?.body) {
      if (typeof taskDef.config.body === 'string' && taskDef.config.body.startsWith(')) {
        body = this.resolveDataPath(taskDef.config.body, data);
      } else if (taskDef.config.bodyMapping) {
        body = this.prepareApiRequestBody(taskDef.config.bodyMapping, data);
      } else {
        body = taskDef.config.body;
      }
    }
    
    // Call external API
    const response = await this.externalApiService.callExternalApi({
      endpoint,
      method,
      headers: resolvedHeaders,
      body
    });
    
    return response;
  }

  private async executeDataTransformationTask(
    taskDef: TaskDefinition, 
    data: Record<string, any>
  ): Promise<TaskResult> {
    // Implementation for data transformation task
    // This would apply transformations to workflow data
    const transformations = taskDef.config?.transformations || [];
    const result: Record<string, any> = {};
    
    for (const transformation of transformations) {
      switch (transformation.type) {
        case 'map':
          result[transformation.target] = this.mapTransformation(transformation, data);
          break;
        case 'filter':
          result[transformation.target] = this.filterTransformation(transformation, data);
          break;
        case 'reduce':
          result[transformation.target] = this.reduceTransformation(transformation, data);
          break;
        case 'format':
          result[transformation.target] = this.formatTransformation(transformation, data);
          break;
        default:
          throw new Error(`Unsupported transformation type: ${transformation.type}`);
      }
    }
    
    return result;
  }

  /**
   * Helper methods for data transformation
   */
  private mapTransformation(transformation: any, data: Record<string, any>): any {
    const source = this.resolveDataPath(transformation.source, data);
    
    if (!Array.isArray(source)) {
      throw new Error('Map transformation requires array source');
    }
    
    return source.map(item => {
      const result: Record<string, any> = {};
      
      for (const [key, path] of Object.entries(transformation.mapping)) {
        result[key] = this.resolveDataPath(path as string, item);
      }
      
      return result;
    });
  }

  private filterTransformation(transformation: any, data: Record<string, any>): any {
    const source = this.resolveDataPath(transformation.source, data);
    
    if (!Array.isArray(source)) {
      throw new Error('Filter transformation requires array source');
    }
    
    return source.filter(item => 
      this.evaluateConditions(transformation.conditions, item)
    );
  }

  private reduceTransformation(transformation: any, data: Record<string, any>): any {
    const source = this.resolveDataPath(transformation.source, data);
    
    if (!Array.isArray(source)) {
      throw new Error('Reduce transformation requires array source');
    }
    
    const initialValue = transformation.initialValue !== undefined 
      ? transformation.initialValue 
      : {};
    
    return source.reduce((acc, item) => {
      switch (transformation.operation) {
        case 'sum':
          return acc + (typeof item === 'number' ? item : 0);
        case 'concat':
          return Array.isArray(acc) ? [...acc, item] : [acc, item];
        case 'merge':
          return { ...acc, ...item };
        default:
          return acc;
      }
    }, initialValue);
  }

  private formatTransformation(transformation: any, data: Record<string, any>): any {
    const source = this.resolveDataPath(transformation.source, data);
    
    switch (transformation.format) {
      case 'string':
        return String(source);
      case 'number':
        return Number(source);
      case 'boolean':
        return Boolean(source);
      case 'date':
        return new Date(source);
      case 'json':
        return typeof source === 'string' ? JSON.parse(source) : source;
      case 'template':
        return this.applyTemplate(transformation.template, data);
      default:
        return source;
    }
  }

  /**
   * Helper methods for data access and manipulation
   */
  private resolveDataPath(path: string, data: any): any {
    if (!path.startsWith(')) {
      return path;
    }
    
    const parts = path.substring(1).split('.');
    let value = data;
    
    for (const part of parts) {
      if (value === undefined || value === null) {
        return undefined;
      }
      
      value = value[part];
    }
    
    return value;
  }

  private setDataAtPath(path: string, value: any, data: Record<string, any>): void {
    const parts = path.split('.');
    let current = data;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      
      if (!(part in current)) {
        current[part] = {};
      }
      
      current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
  }

  private prepareNotificationData(
    mapping: Record<string, string> | undefined, 
    data: Record<string, any>
  ): Record<string, any> {
    if (!mapping) {
      return data;
    }
    
    const result: Record<string, any> = {};
    
    for (const [key, path] of Object.entries(mapping)) {
      result[key] = this.resolveDataPath(path, data);
    }
    
    return result;
  }

  private prepareApiRequestBody(
    mapping: Record<string, string> | undefined, 
    data: Record<string, any>
  ): Record<string, any> {
    if (!mapping) {
      return data;
    }
    
    const result: Record<string, any> = {};
    
    for (const [key, path] of Object.entries(mapping)) {
      result[key] = this.resolveDataPath(path, data);
    }
    
    return result;
  }

  private applyTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\${([^}]+)}/g, (match, path) => {
      const value = this.resolveDataPath(`${path}`, data);
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Validate a workflow definition
   */
  private validateWorkflowDefinition(definition: WorkflowDefinition): void {
    // Check for required fields
    if (!definition.name) {
      throw new Error('Workflow definition must have a name');
    }
    
    if (!definition.tasks || !Array.isArray(definition.tasks) || definition.tasks.length === 0) {
      throw new Error('Workflow definition must have at least one task');
    }
    
    // Check that all tasks have unique IDs
    const taskIds = new Set<string>();
    
    for (const task of definition.tasks) {
      if (!task.id) {
        throw new Error('All tasks must have an ID');
      }
      
      if (taskIds.has(task.id)) {
        throw new Error(`Duplicate task ID found: ${task.id}`);
      }
      
      taskIds.add(task.id);
    }
    
    // Check that all task dependencies exist
    for (const task of definition.tasks) {
      if (task.dependsOn) {
        for (const depTaskId of task.dependsOn) {
          if (!taskIds.has(depTaskId)) {
            throw new Error(`Task ${task.id} depends on non-existent task: ${depTaskId}`);
          }
        }
      }
    }
    
    // Check for cycles in the task dependencies
    this.checkForCycles(definition.tasks);
  }

  /**
   * Check for cycles in task dependencies
   */
  private checkForCycles(tasks: TaskDefinition[]): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    
    for (const task of tasks) {
      if (!visited.has(task.id)) {
        if (this.isCyclicUtil(task.id, tasks, visited, recursionStack)) {
          throw new Error('Cycle detected in task dependencies');
        }
      }
    }
  }

  private isCyclicUtil(
    taskId: string,
    tasks: TaskDefinition[],
    visited: Set<string>,
    recursionStack: Set<string>
  ): boolean {
    visited.add(taskId);
    recursionStack.add(taskId);
    
    const task = tasks.find(t => t.id === taskId);
    
    if (task && task.dependsOn) {
      for (const depTaskId of task.dependsOn) {
        if (!visited.has(depTaskId)) {
          if (this.isCyclicUtil(depTaskId, tasks, visited, recursionStack)) {
            return true;
          }
        } else if (recursionStack.has(depTaskId)) {
          return true;
        }
      }
    }
    
    recursionStack.delete(taskId);
    return false;
  }
}