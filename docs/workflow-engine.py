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
          totalTasks: instance.complet