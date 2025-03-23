# Return empty dataframe with correct columns
            columns = list(data.columns) + ['prediction']
            if include_confidence_intervals:
                columns.extend(['lower_bound', 'upper_bound'])
            return pd.DataFrame(columns=columns)
    
    def generate_intervention_suggestions(self, model_name: str, 
                                         trainee_data: pd.DataFrame,
                                         threshold: float = 0.8) -> List[Dict[str, Any]]:
        """
        Generate suggestions for interventions based on predicted performance
        
        Args:
            model_name: Name of the trained model to use
            trainee_data: DataFrame with trainee data
            threshold: Threshold for triggering interventions (0.0-1.0)
            
        Returns:
            List of intervention suggestions
        """
        try:
            # Make predictions
            predictions = self.predict(model_name, trainee_data)
            
            # Merge with trainee data
            results = trainee_data.copy()
            results['prediction'] = predictions['prediction']
            
            # Generate suggestions based on predicted performance
            suggestions = []
            
            # Group by trainee
            for trainee_id, trainee_results in results.groupby('trainee_id'):
                # Check if performance below threshold
                # In a real implementation, this would depend on how performance is measured
                # Here, we'll assume higher is better (e.g., competency rating on 1-4 scale)
                
                average_prediction = trainee_results['prediction'].mean()
                
                # Determine competency areas to target
                # In a real implementation, you would use a more sophisticated approach
                if 'competency_area' in trainee_results.columns:
                    # Group by competency area
                    area_predictions = trainee_results.groupby('competency_area')['prediction'].mean()
                    
                    # Find areas below threshold
                    weak_areas = area_predictions[area_predictions < threshold * 4]  # Assuming 4 is max score
                    
                    if not weak_areas.empty:
                        # Generate suggestions for each weak area
                        for area, score in weak_areas.items():
                            suggestion = {
                                'trainee_id': trainee_id,
                                'competency_area': area,
                                'current_score': score,
                                'threshold': threshold * 4,
                                'intervention_type': self._get_intervention_type(area, score),
                                'description': self._get_intervention_description(area, score),
                                'priority': self._calculate_priority(score, threshold * 4)
                            }
                            suggestions.append(suggestion)
                else:
                    # Generate general suggestion if competency areas not available
                    if average_prediction < threshold * 4:
                        suggestion = {
                            'trainee_id': trainee_id,
                            'competency_area': 'general',
                            'current_score': average_prediction,
                            'threshold': threshold * 4,
                            'intervention_type': 'additional_training',
                            'description': 'Recommend additional training sessions based on overall performance',
                            'priority': self._calculate_priority(average_prediction, threshold * 4)
                        }
                        suggestions.append(suggestion)
            
            # Sort suggestions by priority
            suggestions.sort(key=lambda x: x['priority'], reverse=True)
            
            return suggestions
            
        except Exception as e:
            logger.error(f"Error generating intervention suggestions: {str(e)}")
            return []
    
    def _get_intervention_type(self, area: str, score: float) -> str:
        """Determine appropriate intervention type based on competency area and score"""
        # This is a simplified implementation
        # In a real system, this would be more sophisticated
        
        if score < 2.0:  # Critical intervention needed
            intervention_types = {
                'technical_knowledge': 'intensive_training',
                'flight_planning': 'structured_exercises',
                'aircraft_handling': 'simulator_sessions',
                'navigation': 'review_sessions',
                'communication': 'communication_workshop',
                'decision_making': 'scenario_training',
                'situational_awareness': 'awareness_exercises',
                'crew_coordination': 'team_exercises',
                'emergency_procedures': 'emergency_drills',
                'general': 'comprehensive_review'
            }
        else:  # Moderate intervention needed
            intervention_types = {
                'technical_knowledge': 'focused_study',
                'flight_planning': 'planning_exercises',
                'aircraft_handling': 'practice_sessions',
                'navigation': 'navigation_exercises',
                'communication': 'communication_practice',
                'decision_making': 'decision_exercises',
                'situational_awareness': 'awareness_training',
                'crew_coordination': 'coordination_practice',
                'emergency_procedures': 'procedure_review',
                'general': 'targeted_practice'
            }
        
        return intervention_types.get(area, 'additional_training')
    
    def _get_intervention_description(self, area: str, score: float) -> str:
        """Generate description for intervention based on competency area and score"""
        # This is a simplified implementation
        # In a real system, this would be more sophisticated
        
        if area == 'technical_knowledge':
            return f"Recommend focused study on technical knowledge areas. Current score: {score:.2f}"
        elif area == 'flight_planning':
            return f"Provide additional flight planning exercises with instructor feedback. Current score: {score:.2f}"
        elif area == 'aircraft_handling':
            return f"Schedule additional simulator sessions focusing on aircraft handling. Current score: {score:.2f}"
        elif area == 'navigation':
            return f"Conduct targeted navigation exercises and review. Current score: {score:.2f}"
        elif area == 'communication':
            return f"Practice radio communications and ATC interactions. Current score: {score:.2f}"
        elif area == 'decision_making':
            return f"Provide scenario-based training to improve decision making. Current score: {score:.2f}"
        elif area == 'situational_awareness':
            return f"Conduct exercises to enhance situational awareness. Current score: {score:.2f}"
        elif area == 'crew_coordination':
            return f"Provide CRM training and multi-crew exercises. Current score: {score:.2f}"
        elif area == 'emergency_procedures':
            return f"Review and practice emergency procedures. Current score: {score:.2f}"
        else:
            return f"Recommend additional training based on overall performance. Current score: {score:.2f}"
    
    def _calculate_priority(self, score: float, threshold: float) -> int:
        """Calculate priority for intervention (1-5, with 5 being highest priority)"""
        # Calculate gap between current score and threshold
        gap = threshold - score
        
        if gap <= 0:
            return 0  # No intervention needed
        elif gap < 0.5:
            return 1  # Low priority
        elif gap < 1.0:
            return 2  # Medium-low priority
        elif gap < 1.5:
            return 3  # Medium priority
        elif gap < 2.0:
            return 4  # Medium-high priority
        else:
            return 5  # High priority
    
    def evaluate_model(self, model_name: str, test_data: pd.DataFrame, 
                      target_col: str) -> Dict[str, Any]:
        """
        Evaluate model performance on test data
        
        Args:
            model_name: Name of the trained model to use
            test_data: DataFrame with test data
            target_col: Name of target column with actual values
            
        Returns:
            Dictionary with evaluation metrics
        """
        try:
            # Make predictions
            predictions = self.predict(model_name, test_data)
            
            # Calculate metrics
            y_true = test_data[target_col].values
            y_pred = predictions['prediction'].values
            
            metrics = {
                'mse': mean_squared_error(y_true, y_pred),
                'mae': mean_absolute_error(y_true, y_pred),
                'rmse': np.sqrt(mean_squared_error(y_true, y_pred)),
                'r2': r2_score(y_true, y_pred),
                'sample_count': len(y_true)
            }
            
            # Calculate additional statistics
            metrics['mean_true'] = np.mean(y_true)
            metrics['mean_pred'] = np.mean(y_pred)
            metrics['std_true'] = np.std(y_true)
            metrics['std_pred'] = np.std(y_pred)
            
            # Calculate residuals
            residuals = y_true - y_pred
            metrics['mean_residual'] = np.mean(residuals)
            metrics['std_residual'] = np.std(residuals)
            
            logger.info(f"Model '{model_name}' evaluation - "
                       f"MSE: {metrics['mse']:.4f}, "
                       f"R²: {metrics['r2']:.4f}")
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error evaluating model: {str(e)}")
            return {'error': str(e)}
    
    def _save_model(self, model_name: str):
        """Save a trained model to disk"""
        model_data = self.models[model_name]
        
        # Create model directory
        model_dir = self.models_dir / model_name
        model_dir.mkdir(exist_ok=True, parents=True)
        
        try:
            # Save model info
            with open(model_dir / 'info.json', 'w') as f:
                # Convert numpy types to Python native types
                info_dict = self._convert_to_serializable(model_data['info'])
                json.dump(info_dict, f, indent=2)
            
            # Save model based on type
            model_type = model_data['info']['model_type']
            
            if model_type == 'prophet':
                # Save each Prophet model
                prophet_models = model_data['model']
                os.makedirs(model_dir / 'prophet_models', exist_ok=True)
                
                for trainee_id, prophet_model in prophet_models.items():
                    model_path = model_dir / 'prophet_models' / f'{trainee_id}.json'
                    # Prophet has built-in serialization
                    with open(model_path, 'w') as f:
                        prophet_model.serialize_posterior_samples(f)
            
            elif model_type == 'neural_network':
                # Save PyTorch model
                torch.save(model_data['model'].state_dict(), model_dir / 'model.pt')
                # Save architecture info
                with open(model_dir / 'architecture.json', 'w') as f:
                    json.dump(model_data['info']['architecture'], f, indent=2)
            
            else:
                # Use pickle for other model types
                with open(model_dir / 'model.pkl', 'wb') as f:
                    pickle.dump(model_data['model'], f)
            
            # Save preprocessors
            if 'scalers' in model_data:
                with open(model_dir / 'scalers.pkl', 'wb') as f:
                    pickle.dump(model_data['scalers'], f)
            
            if 'encoders' in model_data:
                with open(model_dir / 'encoders.pkl', 'wb') as f:
                    pickle.dump(model_data['encoders'], f)
            
            logger.info(f"Model '{model_name}' saved successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error saving model '{model_name}': {str(e)}")
            return False
    
    def _load_model(self, model_name: str) -> bool:
        """Load a trained model from disk"""
        model_dir = self.models_dir / model_name
        
        if not model_dir.exists():
            logger.warning(f"Model directory '{model_name}' not found")
            return False
        
        try:
            # Load model info
            with open(model_dir / 'info.json', 'r') as f:
                model_info = json.load(f)
            
            # Load model based on type
            model_type = model_info['model_type']
            
            if model_type == 'prophet':
                # Load Prophet models
                prophet_models = {}
                prophet_dir = model_dir / 'prophet_models'
                
                if prophet_dir.exists():
                    for model_file in prophet_dir.glob('*.json'):
                        trainee_id = model_file.stem
                        prophet_model = Prophet()
                        with open(model_file, 'r') as f:
                            prophet_model.deserialize_posterior_samples(f)
                        prophet_models[trainee_id] = prophet_model
                
                model = prophet_models
            
            elif model_type == 'neural_network':
                # Load architecture info
                with open(model_dir / 'architecture.json', 'r') as f:
                    architecture = json.load(f)
                
                # Create neural network with same architecture
                model = self._create_neural_network(
                    input_dim=architecture['input_dim'],
                    hidden_layers=architecture['hidden_layers'],
                    dropout_rate=architecture['dropout_rate']
                )
                
                # Load state dict
                model.load_state_dict(torch.load(model_dir / 'model.pt'))
                model.eval()  # Set to evaluation mode
            
            else:
                # Load pickled model
                with open(model_dir / 'model.pkl', 'rb') as f:
                    model = pickle.load(f)
            
            # Load preprocessors
            scalers = {}
            encoders = {}
            
            if (model_dir / 'scalers.pkl').exists():
                with open(model_dir / 'scalers.pkl', 'rb') as f:
                    scalers = pickle.load(f)
            
            if (model_dir / 'encoders.pkl').exists():
                with open(model_dir / 'encoders.pkl', 'rb') as f:
                    encoders = pickle.load(f)
            
            # Store in models dictionary
            self.models[model_name] = {
                'model': model,
                'info': model_info,
                'scalers': scalers,
                'encoders': encoders
            }
            
            logger.info(f"Model '{model_name}' loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error loading model '{model_name}': {str(e)}")
            return False
    
    def _convert_to_serializable(self, obj):
        """Convert object to JSON-serializable form"""
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, dict):
            return {key: self._convert_to_serializable(value) for key, value in obj.items()}
        elif isinstance(obj, list):
            return [self._convert_to_serializable(item) for item in obj]
        else:
            return obj

# Example usage
if __name__ == "__main__":
    # Sample data generation
    def generate_sample_data(n_trainees=20, n_samples_per_trainee=10):
        np.random.seed(42)
        
        data = []
        start_date = datetime(2023, 1, 1)
        
        for trainee_id in range(1, n_trainees + 1):
            # Generate trainee attributes
            trainee_experience = np.random.choice(['low', 'medium', 'high'])
            trainee_age = np.random.randint(22, 45)
            
            for i in range(n_samples_per_trainee):
                # Generate assessment date
                assessment_date = start_date + timedelta(days=i * 7 + np.random.randint(0, 5))
                
                # Generate competency scores (1-4 scale)
                base_score = 2.0 + np.random.normal(0, 0.5)
                base_score += 0.5 if trainee_experience == 'high' else (0.2 if trainee_experience == 'medium' else 0)
                
                # Add time trend (improvement over time)
                time_effect = i * 0.05
                
                for competency in [
                    'technical_knowledge', 'flight_planning', 'aircraft_handling',
                    'navigation', 'communication', 'decision_making',
                    'situational_awareness', 'crew_coordination', 'emergency_procedures'
                ]:
                    # Add competency-specific variation
                    comp_variation = np.random.normal(0, 0.3)
                    
                    # Calculate final score and clamp between 1-4
                    score = max(1.0, min(4.0, base_score + time_effect + comp_variation))
                    
                    data.append({
                        'trainee_id': f'trainee_{trainee_id}',
                        'assessment_date': assessment_date,
                        'competency_area': competency,
                        'score': round(score, 1),
                        'instructor_id': f'instructor_{np.random.randint(1, 6)}',
                        'trainee_experience': trainee_experience,
                        'trainee_age': trainee_age,
                        'aircraft_type': np.random.choice(['C172', 'PA28', 'BE58']),
                        'weather_conditions': np.random.choice(['VMC', 'IMC', 'Marginal'])
                    })
        
        return pd.DataFrame(data)
    
    # Generate sample data
    df = generate_sample_data()
    print(f"Generated {len(df)} sample records")
    
    # Initialize predictor
    predictor = TraineePerformancePredictor()
    
    # Split data
    train_data = df.sample(frac=0.8, random_state=42)
    test_data = df.drop(train_data.index)
    
    # Train model
    model_name = "trainee_model_gb"
    result = predictor.train_model(
        data=train_data,
        target_col='score',
        model_type='gradient_boosting',
        feature_cols=['trainee_experience', 'trainee_age', 'aircraft_type', 'weather_conditions'],
        categorical_cols=['trainee_experience', 'aircraft_type', 'weather_conditions'],
        time_col='assessment_date',
        trainee_id_col='trainee_id',
        model_name=model_name
    )
    
    print(f"Model training results: MSE={result['metrics']['mse_test']:.4f}, R²={result['metrics']['r2_test']:.4f}")
    
    # Make predictions
    predictions = predictor.predict(model_name, test_data)
    print("Sample predictions:")
    print(predictions.head())
    
    # Generate intervention suggestions
    suggestions = predictor.generate_intervention_suggestions(model_name, test_data, threshold=0.75)
    print(f"Generated {len(suggestions)} intervention suggestions")
    
    # Evaluate model
    metrics = predictor.evaluate_model(model_name, test_data, 'score')
    print(f"Evaluation metrics: MSE={metrics['mse']:.4f}, R²={metrics['r2']:.4f}")

# backend/ai-modules/automation-workflows/workflow_engine.py
import os
import sys
import logging
import json
import yaml
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Callable, Union
from pathlib import Path
import threading
import queue
import schedule
from dataclasses import dataclass, field
import importlib.util
import inspect
import traceback
import re

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('workflow_engine.log')
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class WorkflowStep:
    """Represents a single step in a workflow"""
    id: str
    type: str
    name: str
    description: str
    parameters: Dict[str, Any] = field(default_factory=dict)
    condition: Optional[str] = None
    timeout_seconds: int = 300
    retry_count: int = 0
    retry_delay_seconds: int = 30
    
    # Execution state
    status: str = "pending"
    result: Any = None
    error: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None

@dataclass
class WorkflowInstance:
    """Represents a running instance of a workflow"""
    id: str
    workflow_id: str
    name: str
    description: str
    status: str = "pending"
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    variables: Dict[str, Any] = field(default_factory=dict)
    steps: List[WorkflowStep] = field(default_factory=list)
    current_step_index: int = 0
    logs: List[Dict[str, Any]] = field(default_factory=list)

class WorkflowEngine:
    """
    Engine for automating workflows in the Advanced Pilot Training Platform.
    Supports custom step types, conditional execution, scheduling, and more.
    """
    
    def __init__(self, workflows_dir: str = 'workflows', plugins_dir: str = 'plugins'):
        """
        Initialize the workflow engine
        
        Args:
            workflows_dir: Directory containing workflow definitions
            plugins_dir: Directory containing custom step implementations
        """
        self.workflows_dir = Path(workflows_dir)
        self.plugins_dir = Path(plugins_dir)
        
        # Create directories if they don't exist
        self.workflows_dir.mkdir(exist_ok=True, parents=True)
        self.plugins_dir.mkdir(exist_ok=True, parents=True)
        
        # Initialize data stores
        self.workflow_definitions = {}
        self.workflow_instances = {}
        self.scheduled_workflows = {}
        
        # Initialize worker thread for executing workflows
        self.work_queue = queue.Queue()
        self.worker_thread = threading.Thread(target=self._worker_thread_func, daemon=True)
        self.running = False
        
        # Register built-in step types
        self.step_handlers = {}
        self._register_builtin_step_types()
        
        # Load workflow definitions
        self._load_workflow_definitions()
        
        # Load plugins
        self._load_plugins()
    
    def start(self):
        """Start the workflow engine and worker thread"""
        if not self.running:
            self.running = True
            self.worker_thread.start()
            logger.info("Workflow engine started")
            
            # Start the scheduler in a separate thread
            threading.Thread(target=self._run_scheduler, daemon=True).start()
    
    def stop(self):
        """Stop the workflow engine and worker thread"""
        if self.running:
            self.running = False
            self.work_queue.put(None)  # Signal worker thread to exit
            self.worker_thread.join(timeout=5.0)
            logger.info("Workflow engine stopped")
    
    def _worker_thread_func(self):
        """Worker thread function to process workflow steps"""
        while self.running:
            try:
                # Get next work item from queue
                work_item = self.work_queue.get(timeout=1.0)
                
                # Check for exit signal
                if work_item is None:
                    break
                
                # Process work item
                instance_id, step_index = work_item
                self._execute_workflow_step(instance_id, step_index)
                
                # Mark work item as done
                self.work_queue.task_done()
                
            except queue.Empty:
                # No work available, just continue
                pass
            except Exception as e:
                logger.error(f"Error in worker thread: {str(e)}")
                traceback.print_exc()
    
    def _run_scheduler(self):
        """Run the scheduler for scheduled workflows"""
        while self.running:
            schedule.run_pending()
            time.sleep(1)
    
    def _register_builtin_step_types(self):
        """Register built-in step types"""
        self.register_step_type("script", self._handle_script_step)
        self.register_step_type("http_request", self._handle_http_request_step)
        self.register_step_type("database_query", self._handle_database_query_step)
        self.register_step_type("python", self._handle_python_step)
        self.register_step_type("condition", self._handle_condition_step)
        self.register_step_type("delay", self._handle_delay_step)
        self.register_step_type("notification", self._handle_notification_step)
        self.register_step_type("document_generation", self._handle_document_generation_step)
    
    def _load_workflow_definitions(self):
        """Load workflow definitions from the workflows directory"""
        if not self.workflows_dir.exists():
            logger.warning(f"Workflows directory {self.workflows_dir} does not exist")
            return
        
        # Find all YAML and JSON files in the directory
        workflow_files = list(self.workflows_dir.glob("*.yaml"))
        workflow_files.extend(self.workflows_dir.glob("*.yml"))
        workflow_files.extend(self.workflows_dir.glob("*.json"))
        
        for file_path in workflow_files:
            try:
                # Load workflow definition
                with open(file_path, 'r') as f:
                    if file_path.suffix in ['.yaml', '.yml']:
                        workflow_def = yaml.safe_load(f)
                    else:
                        workflow_def = json.load(f)
                
                # Validate and add to definitions
                if self._validate_workflow_definition(workflow_def):
                    workflow_id = workflow_def.get('id')
                    self.workflow_definitions[workflow_id] = workflow_def
                    
                    # Set up schedule if defined
                    if 'schedule' in workflow_def:
                        self._schedule_workflow(workflow_id, workflow_def['schedule'])
                    
                    logger.info(f"Loaded workflow definition: {workflow_id}")
                else:
                    logger.warning(f"Invalid workflow definition in {file_path}")
                
            except Exception as e:
                logger.error(f"Error loading workflow from {file_path}: {str(e)}")
    
    def _load_plugins(self):
        """Load plugin modules from the plugins directory"""
        if not self.plugins_dir.exists():
            logger.warning(f"Plugins directory {self.plugins_dir} does not exist")
            return
        
        # Find all Python files in the plugins directory
        plugin_files = list(self.plugins_dir.glob("*.py"))
        
        for file_path in plugin_files:
            try:
                # Load module
                module_name = file_path.stem
                spec = importlib.util.spec_from_file_location(module_name, file_path)
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                
                # Look for step handlers
                for name, obj in inspect.getmembers(module):
                    if inspect.isfunction(obj) and name.startswith('handle_'):
                        step_type = name[7:]  # Remove 'handle_' prefix
                        self.register_step_type(step_type, obj)
                        logger.info(f"Registered plugin step type: {step_type}")
                
            except Exception as e:
                logger.error(f"Error loading plugin from {file_path}: {str(e)}")
    
    def _validate_workflow_definition(self, workflow_def: Dict[str, Any]) -> bool:
        """
        Validate a workflow definition
        
        Args:
            workflow_def: Workflow definition dictionary
            
        Returns:
            True if valid, False otherwise
        """
        # Check required fields
        required_fields = ['id', 'name', 'version', 'steps']
        
        for field in required_fields:
            if field not in workflow_def:
                logger.warning(f"Workflow definition missing required field: {field}")
                return False
        
        # Validate steps
        if not isinstance(workflow_def['steps'], list) or len(workflow_def['steps']) == 0:
            logger.warning("Workflow must have at least one step")
            return False
        
        # Validate each step
        for i, step in enumerate(workflow_def['steps']):
            if not isinstance(step, dict):
                logger.warning(f"Step {i} is not a dictionary")
                return False
            
            if 'id' not in step:
                logger.warning(f"Step {i} missing 'id' field")
                return False
            
            if 'type' not in step:
                logger.warning(f"Step {i} missing 'type' field")
                return False
            
            # Check if step type is registered
            if step['type'] not in self.step_handlers:
                logger.warning(f"Unknown step type '{step['type']}' in step {step['id']}")
                # Don't return False here, as the step type might be registered later
        
        return True
    
    def _schedule_workflow(self, workflow_id: str, schedule_def: Dict[str, Any]):
        """
        Set up scheduling for a workflow
        
        Args:
            workflow_id: ID of the workflow to schedule
            schedule_def: Schedule definition dictionary
        """
        # Check schedule type
        schedule_type = schedule_def.get('type', 'interval')
        
        if schedule_type == 'interval':
            # Interval-based schedule
            interval_minutes = schedule_def.get('interval_minutes', 60)
            
            # Create a job that runs every interval_minutes
            job = schedule.every(interval_minutes).minutes.do(self.start_workflow, workflow_id=workflow_id)
            
            # Store job reference
            self.scheduled_workflows[workflow_id] = job
            logger.info(f"Scheduled workflow {workflow_id} to run every {interval_minutes} minutes")
            
        elif schedule_type == 'cron':
            # Cron-like schedule
            # Parse cron expression (simplified)
            cron_expr = schedule_def.get('cron', '0 0 * * *')  # Default: daily at midnight
            minute, hour, day, month, day_of_week = cron_expr.split()
            
            # Create scheduled job based on cron components
            job = None
            
            # Handle minute
            if minute != '*':
                # Only supporting simple minute values, not ranges or lists
                job = schedule.every().day.at(f"{hour.zfill(2)}:{minute.zfill(2)}").do(
                    self.start_workflow, workflow_id=workflow_id)
            else:
                # Default to running at the start of the hour
                job = schedule.every().day.at(f"{hour.zfill(2)}:00").do(
                    self.start_workflow, workflow_id=workflow_id)
            
            # Store job reference
            self.scheduled_workflows[workflow_id] = job
            logger.info(f"Scheduled workflow {workflow_id} with cron expression: {cron_expr}")
            
        elif schedule_type == 'daily':
            # Daily schedule at specific time
            time_str = schedule_def.get('time', '00:00')
            
            # Create a job that runs daily at the specified time
            job = schedule.every().day.at(time_str).do(self.start_workflow, workflow_id=workflow_id)
            
            # Store job reference
            self.scheduled_workflows[workflow_id] = job
            logger.info(f"Scheduled workflow {workflow_id} to run daily at {time_str}")
            
        else:
            logger.warning(f"Unknown schedule type '{schedule_type}' for workflow {workflow_id}")
    
    def register_step_type(self, step_type: str, handler_func: Callable):
        """
        Register a new step type handler
        
        Args:
            step_type: Type identifier for the step
            handler_func: Function to handle execution of this step type
        """
        self.step_handlers[step_type] = handler_func
        logger.debug(f"Registered step type: {step_type}")
    
    def start_workflow(self, workflow_id: str, input_variables: Dict[str, Any] = None) -> Optional[str]:
        """
        Start a new workflow instance
        
        Args:
            workflow_id: ID of the workflow definition to start
            input_variables: Initial variables for the workflow
            
        Returns:
            ID of the created workflow instance, or None if failed
        """
        try:
            # Check if workflow definition exists
            if workflow_id not in self.workflow_definitions:
                logger.warning(f"Workflow definition not found: {workflow_id}")
                return None
            
            workflow_def = self.workflow_definitions[workflow_id]
            
            # Generate instance ID
            instance_id = f"{workflow_id}_{int(time.time())}_{os.getpid()}"
            
            # Create workflow steps from definition
            steps = []
            for step_def in workflow_def.get('steps', []):
                step = WorkflowStep(
                    id=step_def.get('id'),
                    type=step_def.get('type'),
                    name=step_def.get('name', step_def.get('id')),
                    description=step_def.get('description', ''),
                    parameters=step_def.get('parameters', {}),
                    condition=step_def.get('condition'),
                    timeout_seconds=step_def.get('timeout_seconds', 300),
                    retry_count=step_def.get('retry_count', 0),
                    retry_delay_seconds=step_def.get('retry_delay_seconds', 30)
                )
                steps.append(step)
            
            # Create workflow instance
            instance = WorkflowInstance(
                id=instance_id,
                workflow_id=workflow_id,
                name=workflow_def.get('name', workflow_id),
                description=workflow_def.get('description', ''),
                variables=input_variables or {},
                steps=steps,
                start_time=datetime.now()
            )
            
            # Set initial status
            instance.status = "running"
            
            # Store instance
            self.workflow_instances[instance_id] = instance
            
            # Log workflow start
            self._log_workflow_event(instance_id, "workflow_started", {
                "workflow_id": workflow_id,
                "input_variables": input_variables
            })
            
            # Start first step
            self._queue_next_step(instance_id)
            
            logger.info(f"Started workflow instance: {instance_id}")
            return instance_id
            
        except Exception as e:
            logger.error(f"Error starting workflow {workflow_id}: {str(e)}")
            return None
    
    def _queue_next_step(self, instance_id: str):
        """
        Queue the next step for execution
        
        Args:
            instance_id: ID of the workflow instance
        """
        instance = self.workflow_instances.get(instance_id)
        if not instance:
            logger.warning(f"Workflow instance not found: {instance_id}")
            return
        
        # Check if workflow is complete
        if instance.current_step_index >= len(instance.steps):
            self._complete_workflow(instance_id)
            return
        
        # Get current step
        step = instance.steps[instance.current_step_index]
        
        # Evaluate condition if present
        if step.condition and not self._evaluate_condition(step.condition, instance.variables):
            logger.info(f"Skipping step {step.id} because condition evaluated to false")
            
            # Mark step as skipped
            step.status = "skipped"
            
            # Log step skipped
            self._log_workflow_event(instance_id, "step_skipped", {
                "step_id": step.id,
                "condition": step.condition
            })
            
            # Move to next step
            instance.current_step_index += 1
            self._queue_next_step(instance_id)
            return
        
        # Queue step for execution
        self.work_queue.put((instance_id, instance.current_step_index))
    
    def _execute_workflow_step(self, instance_id: str, step_index: int):
        """
        Execute a single workflow step
        
        Args:
            instance_id: ID of the workflow instance
            step_index: Index of the step to execute
        """
        instance = self.workflow_instances.get(instance_id)
        if not instance:
            logger.warning(f"Workflow instance not found: {instance_id}")
            return
        
        # Check step index
        if step_index >= len(instance.steps):
            logger.warning(f"Invalid step index {step_index} for workflow {instance_id}")
            return
        
        # Get step
        step = instance.steps[step_index]
        
        # Update step status
        step.status = "running"
        step.start_time = datetime.now()
        
        # Log step started
        self._log_workflow_event(instance_id, "step_started", {
            "step_id": step.id,
            "step_type": step.type,
            "parameters": step.parameters
        })
        
        try:
            # Get step handler
            handler = self.step_handlers.get(step.type)
            if not handler:
                raise ValueError(f"No handler registered for step type: {step.type}")
            
            # Execute step with timeout
            step_result = self._execute_with_timeout(
                handler, 
                instance, 
                step,
                timeout_seconds=step.timeout_seconds
            )
            
            # Update step status
            step.status = "completed"
            step.result = step_result
            step.end_time = datetime.now()
            
            # Log step completed
            self._log_workflow_event(instance_id, "step_completed", {
                "step_id": step.id,
                "execution_time_seconds": (step.end_time - step.start_time).total_seconds(),
                "result": self._sanitize_for_logging(step_result)
            })
            
            # Update workflow variables with step result
            if isinstance(step_result, dict):
                instance.variables.update(step_result)
            else:
                # Store result in a variable named after the step
                instance.variables[step.id] = step_result
            
            # Move to next step
            instance.current_step_index += 1
            self._queue_next_step(instance_id)
            
        except Exception as e:
            # Update step status
            step.status = "failed"
            step.error = str(e)
            step.end_time = datetime.now()
            
            # Log step failed
            self._log_workflow_event(instance_id, "step_failed", {
                "step_id": step.id,
                "error": str(e),
                "execution_time_seconds": (step.end_time - step.start_time).total_seconds()
            })
            
            # Check if step should be retried
            if step.retry_count > 0:
                step.retry_count -= 1
                step.status = "pending"
                
                # Log retry
                self._log_workflow_event(instance_id, "step_retry", {
                    "step_id": step.id,
                    "retries_remaining": step.retry_count,
                    "retry_delay_seconds": step.retry_delay_seconds
                })
                
                # Schedule retry after delay
                threading.Timer(
                    step.retry_delay_seconds,
                    lambda: self.work_queue.put((instance_id, step_index))
                ).start()
                
            else:
                # Handle error in workflow
                self._handle_workflow_error(instance_id, step, e)
    
    def _execute_with_timeout(self, handler, instance, step, timeout_seconds):
        """
        Execute a step handler with a timeout
        
        Args:
            handler: Step handler function
            instance: Workflow instance
            step: Workflow step
            timeout_seconds: Timeout in seconds
            
        Returns:
            Result from the step handler
        """
        # Simple implementation without actual timeout
        # In a production system, you would use a separate process or thread with timeout
        return handler(instance, step)
    
    def _handle_workflow_error(self, instance_id: str, step: WorkflowStep, error: Exception):
        """
        Handle a workflow execution error
        
        Args:
            instance_id: ID of the workflow instance
            step: Step that failed
            error: Exception that occurred
        """
        instance = self.workflow_instances.get(instance_id)
        if not instance:
            return
        
        # Check error handling configuration
        instance_def = self.workflow_definitions.get(instance.workflow_id, {})
        error_handling = instance_def.get('error_handling', 'abort')
        
        if error_handling == 'continue':
            # Continue with next step despite error
            logger.info(f"Continuing workflow {instance_id} after error in step {step.id}")
            
            # Log error handling
            self._log_workflow_event(instance_id, "error_handled", {
                "step_id": step.id,
                "error": str(error),
                "action": "continue"
            })
            
            # Move to next step
            instance.current_step_index += 1
            self._queue_next_step(instance_id)
            
        elif error_handling == 'goto':
            # Go to specified step
            goto_step = instance_def.get('error_goto_step')
            
            if goto_step:
                # Find step index
                for i, s in enumerate(instance.steps):
                    if s.id == goto_step:
                        logger.info(f"Moving workflow {instance_id} to step {goto_step} after error")
                        
                        # Log error handling
                        self._log_workflow_event(instance_id, "error_handled", {
                            "step_id": step.id,
                            "error": str(error),
                            "action": "goto",
                            "target_step": goto_step
                        })
                        
                        # Set next step
                        instance.current_step_index = i
                        self._queue_next_step(instance_id)
                        return
            
            # If goto step not found, abort
            logger.warning(f"Error goto step {goto_step} not found, aborting workflow {instance_id}")
            self._fail_workflow(instance_id, f"Error in step {step.id}: {str(error)}")
            
        else:
            # Abort workflow (default)
            self._fail_workflow(instance_id, f"Error in step {step.id}: {str(error)}")
    
    def _complete_workflow(self, instance_id: str):
        """
        Mark a workflow instance as completed
        
        Args:
            instance_id: ID of the workflow instance
        """
        instance = self.workflow_instances.get(instance_id)
        if not instance:
            return
        
        # Update instance status
        instance.status = "completed"
        instance.end_time = datetime.now()
        
        # Calculate execution time
        execution_time = (instance.end_time - instance.start_time).total_seconds()
        
        # Log workflow completion
        self._log_workflow_event(instance_id, "workflow_completed", {
            "execution_time_seconds": execution_time,
            "output_variables": self._sanitize_for_logging(instance.variables)
        })
        
        logger.info(f"Workflow instance {instance_id} completed successfully in {execution_time:.2f} seconds")
    
    def _fail_workflow(self, instance_id: str, error_message: str):
        """
        Mark a workflow instance as failed
        
        Args:
            instance_id: ID of the workflow instance
            error_message: Error message
        """
        instance = self.workflow_instances.get(instance_id)
        if not instance:
            return
        
        # Update instance status
        instance.status = "failed"
        instance.end_time = datetime.now()
        
        # Calculate execution time
        execution_time = (instance.end_time - instance.start_time).total_seconds()
        
        # Log workflow failure
        self._log_workflow_event(instance_id, "workflow_failed", {
            "error": error_message,
            "execution_time_seconds": execution_time
        })
        
        logger.info(f"Workflow instance {instance_id} failed: {error_message}")
    
    def _log_workflow_event(self, instance_id: str, event_type: str, details: Dict[str, Any]):
        """
        Log a workflow event
        
        Args:
            instance_id: ID of the workflow instance
            event_type: Type of event
            details: Event details
        """
        instance = self.workflow_instances.get(instance_id)
        if not instance:
            return
        
        # Create log entry
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "event_type": event_type,
            "details": details
        }
        
        # Add to instance logs
        instance.logs.append(log_entry)
        
        # Log to logger
        logger.debug(f"Workflow {instance_id} event: {event_type}")
    
    def _sanitize_for_logging(self, data: Any) -> Any:
        """
        Sanitize data for logging (remove sensitive information, truncate large objects)
        
        Args:
            data: Data to sanitize
            
        Returns:
            Sanitized data
        """
        if isinstance(data, dict):
            # Sanitize dictionary
            result = {}
            for key, value in data.items():
                # Skip sensitive keys
                if key.lower() in ['password', 'secret', 'token', 'key', 'auth']:
                    result[key] = '***REDACTED***'
                else:
                    result[key] = self._sanitize_for_logging(value)
            return result
        elif isinstance(data, list):
            # Sanitize list
            if len(data) > 10:
                # Truncate long lists
                return [self._sanitize_for_logging(item) for item in data[:10]] + ['...']
            else:
                return [self._sanitize_for_logging(item) for item in data]
        elif isinstance(data, (str, int, float, bool, type(None))):
            # Primitive types pass through
            return data
        else:
            # Other types convert to string
            return str(data)
    
    def _evaluate_condition(self, condition: str, variables: Dict[str, Any]) -> bool:
        """
        Evaluate a condition expression
        
        Args:
            condition: Condition expression
            variables: Variables dictionary
            
        Returns:
            Boolean result of condition evaluation
        """
        try:
            # Create a safe evaluation environment
            env = {'__builtins__': {}}
            
            # Add variables to environment
            env.update(variables)
            
            # Add some safe functions
            env.update({
                'len': len,
                'str': str,
                'int': int,
                'float': float,
                'bool': bool,
                'list': list,
                'dict': dict,
                'min': min,
                'max': max,
                'sum': sum,
                'all': all,
                'any': any
            })
            
            # Evaluate condition
            result = eval(condition, env)
            
            # Convert to boolean
            return bool(result)
        except Exception as e:
            logger.warning(f"Error evaluating condition '{condition}': {str(e)}")
            return False
    
    def get_workflow_status(self, instance_id: str) -> Dict[str, Any]:
        """
        Get status of a workflow instance
        
        Args:
            instance_id: ID of the workflow instance
            
        Returns:
            Status information dictionary
        """
        instance = self.workflow_instances.get(instance_id)
        if not instance:
            return {"error": "Workflow instance not found"}
        
        # Calculate execution time or elapsed time
        if instance.end_time:
            execution_time = (instance.end_time - instance.start_time).total_seconds()
        else:
            execution_time = (datetime.now() - instance.start_time).total_seconds()
        
        # Count steps by status
        step_counts = {
            "total": len(instance.steps),
            "completed": sum(1 for step in instance.steps if step.status == "completed"),
            "running": sum(1 for step in instance.steps if step.status == "running"),
            "pending": sum(1 for step in instance.steps if step.status == "pending"),
            "failed": sum(1 for step in instance.steps if step.status == "failed"),
            "skipped": sum(1 for step in instance.steps if step.status == "skipped")
        }
        
        # Create status response
        status = {
            "instance_id": instance.id,
            "workflow_id": instance.workflow_id,
            "name": instance.name,
            "status": instance.status,
            "start_time": instance.start_time.isoformat() if instance.start_time else None,
            "end_time": instance.end_time.isoformat() if instance.end_time else None,
            "execution_time_seconds": execution_time,
            "current_step_index": instance.current_step_index,
            "current_step": instance.steps[instance.current_step_index].id if instance.current_step_index < len(instance.steps) else None,
            "step_counts": step_counts,
            "variables": self._sanitize_for_logging(instance.variables)
        }
        
        return status
    
    def get_workflow_logs(self, instance_id: str) -> List[Dict[str, Any]]:
        """
        Get logs for a workflow instance
        
        Args:
            instance_id: ID of the workflow instance
            
        Returns:
            List of log entries
        """
        instance = self.workflow_instances.get(instance_id)
        if not instance:
            return []
        
        return instance.logs
    
    def list_workflows(self) -> List[Dict[str, Any]]:
        """
        List all workflow definitions
        
        Returns:
            List of workflow definition summaries
        """
        result = []
        
        for workflow_id, workflow_def in self.workflow_definitions.items():
            result.append({
                "id": workflow_id,
                "name": workflow_def.get("name", workflow_id),
                "version": workflow_def.get("version", "1.0"),
                "description": workflow_def.get("description", ""),
                "step_count": len(workflow_def.get("steps", [])),
                "scheduled": workflow_id in self.scheduled_workflows
            })
        
        return result
    
    def list_workflow_instances(self, workflow_id: str = None, status: str = None) -> List[Dict[str, Any]]:
        """
        List workflow instances
        
        Args:
            workflow_id: Optional filter by workflow ID
            status: Optional filter by status
            
        Returns:
            List of workflow instance summaries
        """
        result = []
        
        for instance_id, instance in self.workflow_instances.items():
            # Apply filters
            if workflow_id and instance.workflow_id != workflow_id:
                continue
            
            if status and instance.status != status:
                continue
            
            # Calculate execution time or elapsed time
            if instance.end_time:
                execution_time = (instance.end_time - instance.start_time).total_seconds()
            else:
                execution_time = (datetime.now() - instance.start_time).total_seconds()
            
            result.append({
                "instance_id": instance_id,
                "workflow_id": instance.workflow_id,
                "name": instance.name,
                "status": instance.status,
                "start_time": instance.start_time.isoformat() if instance.start_time else None,
                "end_time": instance.end_time.isoformat() if instance.end_time else None,
                "execution_time_seconds": execution_time,
                "step_count": len(instance.steps),
                "current_step": instance.current_step_index
            })
        
        return result
    
    # Built-in step handlers
    
    def _handle_script_step(self, instance: WorkflowInstance, step: WorkflowStep) -> Any:
        """Handle execution of a script step"""
        # Get script parameters
        script_type = step.parameters.get('type', 'bash')
        script_content = step.parameters.get('script', '')
        timeout = step.parameters.get('timeout', 60)
        
        logger.info(f"Executing {script_type} script")
        
        # Replace variables in script content
        script_content = self._replace_variables(script_content, instance.variables)
        
        # Execute script based on type
        if script_type == 'bash':
            # Use subprocess to run bash script
            import subprocess
            
            # Create temporary script file
            script_file = Path('/tmp') / f"workflow_{instance.id}_{step.id}.sh"
            with open(script_file, 'w') as f:
                f.write(script_content)
            
            # Make executable
            os.chmod(script_file, 0o755)
            
            # Run script
            process = subprocess.run(
                ['/bin/bash', script_file],
                capture_output=True,
                text=True,
                timeout=timeout
            )
            
            # Remove temporary file
            os.unlink(script_file)
            
            # Check result
            if process.returncode != 0:
                raise RuntimeError(f"Script execution failed: {process.stderr}")
            
            # Return output
            return {
                'stdout': process.stdout,
                'stderr': process.stderr,
                'return_code': process.returncode
            }
            
        else:
            raise ValueError(f"Unsupported script type: {script_type}")
    
    def _handle_http_request_step(self, instance: WorkflowInstance, step: WorkflowStep) -> Any:
        """Handle execution of an HTTP request step"""
        import requests
        
        # Get request parameters
        method = step.parameters.get('method', 'GET')
        url = step.parameters.get('url', '')
        headers = step.parameters.get('headers', {})
        body = step.parameters.get('body', None)
        timeout = step.parameters.get('timeout', 30)
        
        # Replace variables in parameters
        url = self._replace_variables(url, instance.variables)
        
        # Replace variables in headers
        for key, value in headers.items():
            if isinstance(value, str):
                headers[key] = self._replace_variables(value, instance.variables)
        
        # Replace variables in body
        if isinstance(body, str):
            body = self._replace_variables(body, instance.variables)
        elif isinstance(body, dict):
            body = self._replace_variables_in_dict(body, instance.variables)
        
        logger.info(f"Making HTTP {method} request to {url}")
        
        # Make request
        response = requests.request(
            method=method,
            url=url,
            headers=headers,
            json=body if body else None,
            timeout=timeout
        )
        
        # Check response
        if step.parameters.get('fail_on_error', True) and response.status_code >= 400:
            raise RuntimeError(f"HTTP request failed with status {response.status_code}: {response.text}")
        
        # Parse response based on content type
        if 'application/json' in response.headers.get('Content-Type', ''):
            response_body = response.json()
        else:
            response_body = response.text
        
        # Return response data
        return {
            'status_code': response.status_code,
            'headers': dict(response.headers),
            'body': response_body
        }
    
    def _handle_database_query_step(self, instance: WorkflowInstance, step: WorkflowStep) -> Any:
        """Handle execution of a database query step"""
        # In a real implementation, this would use a database connection
        # For this example, we'll simulate database access
        
        # Get query parameters
        query_type = step.parameters.get('type', 'select')
        query = step.parameters.get('query', '')
        parameters = step.parameters.get('parameters', {})
        connection = step.parameters.get('connection', 'default')
        
        # Replace variables in query
        query = self._replace_variables(query, instance.variables)
        
        # Replace variables in parameters
        parameters = self._replace_variables_in_dict(parameters, instance.variables)
        
        logger.info(f"Executing database query: {query_type}")
        
        # Simulate database access
        if query_type == 'select':
            # For demonstration, return dummy data
            return {
                'rows': [
                    {'id': 1, 'name': 'Sample 1'},
                    {'id': 2, 'name': 'Sample 2'}
                ],
                'row_count': 2
            }
        elif query_type in ['insert', 'update', 'delete']:
            return {
                'row_count': 1,
                'affected_rows': 1
            }
        else:
            raise ValueError(f"Unsupported query type: {query_type}")
    
    def _handle_python_step(self, instance: WorkflowInstance, step: WorkflowStep) -> Any:
        """Handle execution of a Python code step"""
        # Get code parameters
        code = step.parameters.get('code', '')
        timeout = step.parameters.get('timeout', 60)
        
        # Replace variables in code
        code = self._replace_variables(code, instance.variables)
        
        logger.info(f"Executing Python code in step {step.id}")
        
        # Set up execution environment
        locals_dict = {
            'workflow_instance': instance,
            'workflow_step': step,
            'workflow_variables': instance.variables,
            'result': None
        }
        
        # Execute code
        exec(code, globals(), locals_dict)
        
        # Return result if provided
        return locals_dict.get('result')
    
    def _handle_condition_step(self, instance: WorkflowInstance, step: WorkflowStep) -> Any:
        """Handle execution of a condition step"""
        # Get condition parameters
        condition = step.parameters.get('condition', 'True')
        true_value = step.parameters.get('true_value', True)
        false_value = step.parameters.get('false_value', False)
        
        # Evaluate condition
        result = self._evaluate_condition(condition, instance.variables)
        
        # Return appropriate value
        return true_value if result else false_value
    
    def _handle_delay_step(self, instance: WorkflowInstance, step: WorkflowStep) -> Any:
        """Handle execution of a delay step"""
        # Get delay parameters
        seconds = step.parameters.get('seconds', 0)
        minutes = step.parameters.get('minutes', 0)
        hours = step.parameters.get('hours', 0)
        
        # Calculate total delay in seconds
        total_seconds = seconds + minutes * 60 + hours * 3600
        
        logger.info(f"Delaying execution for {total_seconds} seconds")
        
        # Sleep for the specified duration
        time.sleep(total_seconds)
        
        # Return delay information
        return {
            'delay_seconds': total_seconds,
            'completed_at': datetime.now().isoformat()
        }
    
    def _handle_notification_step(self, instance: WorkflowInstance, step: WorkflowStep) -> Any:
        """Handle execution of a notification step"""
        # Get notification parameters
        notification_type = step.parameters.get('type', 'log')
        subject = step.parameters.get('subject', f"Notification from workflow {instance.name}")
        message = step.parameters.get('message', '')
        recipients = step.parameters.get('recipients', [])
        
        # Replace variables in subject and message
        subject = self._replace_variables(subject, instance.variables)
        message = self._replace_variables(message, instance.variables)
        
        logger.info(f"Sending {notification_type} notification: {subject}")
        
        # Handle different notification types
        if notification_type == 'log':
            # Just log the message
            logger.info(f"Notification - {subject}: {message}")
            
        elif notification_type == 'email':
            # In a real implementation, this would send an email
            # This is just a placeholder
            logger.info(f"Email notification to {recipients}: {subject}")
            
        elif notification_type == 'sms':
            # In a real implementation, this would send an SMS
            # This is just a placeholder
            logger.info(f"SMS notification to {recipients}: {subject}")
            
        else:
            raise ValueError(f"Unsupported notification type: {notification_type}")
        
        # Return notification information
        return {
            'type': notification_type,
            'subject': subject,
            'recipients': recipients,
            'sent_at': datetime.now().isoformat()
        }
    
    def _handle_document_generation_step(self, instance: WorkflowInstance, step: WorkflowStep) -> Any:
        """Handle execution of a document generation step"""
        # Get document parameters
        document_type = step.parameters.get('type', 'text')
        template = step.parameters.get('template', '')
        output_path = step.parameters.get('output_path', '')
        variables = step.parameters.get('variables', {})
        
        # Merge workflow variables with step-specific variables
        merged_variables = instance.variables.copy()
        merged_variables.update(variables)
        
        # Replace variables in template and output path
        template = self._replace_variables(template, merged_variables)
        output_path = self._replace_variables(output_path, merged_variables)
        
        logger.info(f"Generating {document_type} document: {output_path}")
        
        # Generate document based on type
        if document_type == 'text':
            # Simple text document
            content = template
            
            # Write to file
            with open(output_path, 'w') as f:
                f.write(content)
            
        elif document_type == 'html':
            # HTML document
            content = template
            
            # Write to file
            with open(output_path, 'w') as f:
                f.write(content)
            
        elif document_type == 'pdf':
            # In a real implementation, this would generate a PDF
            # This is just a placeholder
            logger.info(f"PDF generation not implemented in this example")
            
        else:
            raise ValueError(f"Unsupported document type: {document_type}")
        
        # Return document information
        return {
            'type': document_type,
            'path': output_path,
            'size': os.path.getsize(output_path) if os.path.exists(output_path) else 0,
            'generated_at': datetime.now().isoformat()
        }
    
    def _replace_variables(self, text: str, variables: Dict[str, Any]) -> str:
        """
        Replace variables in text with values from variables dictionary
        
        Args:
            text: Text with variable placeholders
            variables: Variables dictionary
            
        Returns:
            Text with variables replaced
        """
        if not isinstance(text, str):
            return text
        
        # Replace ${variable} with variable value
        pattern = r'\${([^}]+)}'
        
        def replacement(match):
            var_name = match.group(1)
            if var_name in variables:
                value = variables[var_name]
                if isinstance(value, (str, int, float, bool)):
                    return str(value)
                else:
                    return str(value)
            return match.group(0)
        
        return re.sub(pattern, replacement, text)
    
    def _replace_variables_in_dict(self, data: Dict[str, Any], variables: Dict[str, Any]) -> Dict[str, Any]:
        """
        Replace variables in dictionary values with values from variables dictionary
        
        Args:
            data: Dictionary with variable placeholders in values
            variables: Variables dictionary
            
        Returns:
            Dictionary with variables replaced
        """
        result = {}
        
        for key, value in data.items():
            if isinstance(value, str):
                result[key] = self._replace_variables(value, variables)
            elif isinstance(value, dict):
                result[key] = self._replace_variables_in_dict(value, variables)
            elif isinstance(value, list):
                result[key] = [
                    self._replace_variables(item, variables) if isinstance(item, str)
                    else (self._replace_variables_in_dict(item, variables) if isinstance(item, dict) else item)
                    for item in value
                ]
            else:
                result[key] = value
        
        return result

# Example usage
if __name__ == "__main__":
    # Create workflow engine instance
    engine = WorkflowEngine()
    
    # Start the engine
    engine.start()
    
    try:
        # Create a sample workflow definition
        sample_workflow = {
            "id": "sample_workflow",
            "name": "Sample Workflow",
            "version": "1.0",
            "description": "A sample workflow demonstrating basic functionality",
            "steps": [
                {
                    "id": "step1",
                    "type": "python",
                    "name": "Generate Data",
                    "description": "Generate sample data for the workflow",
                    "parameters": {
                        "code": """
import random
import datetime

# Generate some sample data
result = {
    'random_number': random.randint(1, 100),
    'timestamp': datetime.datetime.now().isoformat(),
    'sample_list': [random.randint(1, 10) for _ in range(5)]
}

print(f"Generated sample data: {result}")
"""
                    }
                },
                {
                    "id": "step2",
                    "type": "condition",
                    "name": "Check Random Number",
                    "description": "Check if the random number is greater than 50",
                    "parameters": {
                        "condition": "step1.get('random_number', 0) > 50",
                        "true_value": {"result": "high", "message": "Number is high"},
                        "false_value": {"result": "low", "message": "Number is low"}
                    }
                },
                {
                    "id": "step3",
                    "type": "notification",
                    "name": "Send Notification",
                    "description": "Log a notification based on the condition result",
                    "parameters": {
                        "type": "log",
                        "subject": "Random Number Check",
                        "message": "The random number ${step1.random_number} is ${step2.result} (${step2.message})"
                    }
                }
            ]
        }
        
        # Add workflow definition
        engine.workflow_definitions["sample_workflow"] = sample_workflow
        
        # Start workflow instance
        instance_id = engine.start_workflow("sample_workflow")
        
        # Wait for workflow to complete
        print(f"Started workflow instance: {instance_id}")
        print("Waiting for workflow to complete...")
        
        # Simple polling
        while True:
            status = engine.get_workflow_status(instance_id)
            if status["status"] in ["completed", "failed"]:
                break
            time.sleep(0.5)
        
        # Print workflow status
        print("\nWorkflow completed!")
        print(f"Status: {status['status']}")
        print(f"Execution time: {status['execution_time_seconds']:.2f} seconds")
        print("\nWorkflow variables:")
        for key, value in status['variables'].items():
            print(f"  {key}: {value}")
        
        # Print logs
        print("\nWorkflow logs:")
        for log in engine.get_workflow_logs(instance_id):
            print(f"  {log['timestamp']} - {log['event_type']}")
        
    finally:
        # Stop the engine
        engine.stop()

# backend/ai-modules/research-assistant/research_assistant.py
import os
import sys
import logging
import json
import time
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple, Union
from pathlib import Path
import threading
import queue
import pickle
import re
import hashlib
import requests
from bs4 import BeautifulSoup
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import nltk
from nltk.tokenize import sent_tokenize, word_tokenize
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('research_assistant.log')
    ]
)
logger = logging.getLogger(__name__)

# Download NLTK resources
try:
    nltk.download('punkt', quiet=True)
    nltk.download('stopwords', quiet=True)
    nltk.download('wordnet', quiet=True)
except Exception as e:
    logger.warning(f"Failed to download NLTK resources: {str(e)}")

class ResearchAssistant:
    """
    Research assistant for finding, analyzing, and organizing aviation-related
    research materials. Includes web scraping, citation tracking, and
    plagiarism detection capabilities.
    """
    
    def __init__(self, cache_dir: str = 'research_cache'):
        """
        Initialize the research assistant
        
        Args:
            cache_dir: Directory to store cached research data
        """
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(exist_ok=True, parents=True)
        
        # Initialize sub-directories
        self.web_cache_dir = self.cache_dir / 'web'
        self.document_cache_dir = self.cache_dir / 'documents'
        self.search_cache_dir = self.cache_dir / 'searches'
        
        self.web_cache_dir.mkdir(exist_ok=True)
        self.document_cache_dir.mkdir(exist_ok=True)
        self.search_cache_dir.mkdir(exist_ok=True)
        
        # Initialize caches
        self.search_cache = self._load_cache('search_cache.pkl')
        self.web_page_cache = self._load_cache('web_page_cache.pkl')
        self.document_cache = self._load_cache('document_cache.pkl')
        self.citation_cache = self._load_cache('citation_cache.pkl')
        
        # Initialize processing tools
        self.stop_words = set(stopwords.words('english'))
        self.lemmatizer = WordNetLemmatizer()
        
        # Configure default request headers
        self.request_headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml',
            'Accept-Language': 'en-US,en;q=0.9'
        }
        
        # Aviation-specific sources
        self.aviation_sources = {
            'faa': {
                'name': 'Federal Aviation Administration',
                'base_url': 'https://www.faa.gov',
                'search_url': 'https://www.faa.gov/search/?q={query}'
            },
            'easa': {
                'name': 'European Union Aviation Safety Agency',
                'base_url': 'https://www.easa.europa.eu',
                'search_url': 'https://www.easa.europa.eu/search?text={query}'
            },
            'icao': {
                'name': 'International Civil Aviation Organization',
                'base_url': 'https://www.icao.int',
                'search_url': 'https://www.icao.int/search/pages/results.aspx?k={query}'
            },
            'nasa': {
                'name': 'NASA Technical Reports Server',
                'base_url': 'https://ntrs.nasa.gov',
                'search_url': 'https://ntrs.nasa.gov/search?q={query}'
            },
            'skybrary': {
                'name': 'SKYbrary Aviation Safety',
                'base_url': 'https://www.skybrary.aero',
                'search_url': 'https://www.skybrary.aero/index.php?search={query}'
            }
        }
    
    def _load_cache(self, filename: str) -> Dict[str, Any]:
        """Load cache from file"""
        cache_path = self.cache_dir / filename
        if cache_path.exists():
            try:
                with open(cache_path, 'rb') as f:
                    return pickle.load(f)
            except Exception as e:
                logger.warning(f"Failed to load cache from {filename}: {str(e)}")
        return {}
    
    def _save_cache(self, cache: Dict[str, Any], filename: str):
        """Save cache to file"""
        cache_path = self.cache_dir / filename
        try:
            with open(cache_path, 'wb') as f:
                pickle.dump(cache, f)
        except Exception as e:
            logger.warning(f"Failed to save cache to {filename}: {str(e)}")
    
    def _get_cache_key(self, *args) -> str:
        """Generate a cache key from arguments"""
        key_str = ":".join(str(arg) for arg in args)
        return hashlib.md5(key_str.encode()).hexdigest()
    
    def search(self, query: str, sources: List[str] = None, 
              max_results: int = 20, use_cache: bool = True,
              cache_ttl_hours: int = 24) -> List[Dict[str, Any]]:
        """
        Search for research materials across specified sources
        
        Args:
            query: Search query
            sources: List of source IDs to search (if None, search all)
            max_results: Maximum number of results to return
            use_cache: Whether to use cached results
            cache_ttl_hours: Cache TTL in hours
            
        Returns:
            List of search result items
        """
        # Normalize query
        query = query.strip().lower()
        
        # Generate cache key
        cache_key = self._get_cache_key('search', query, str(sources), str(max_results))
        
        # Check cache
        if use_cache and cache_key in self.search_cache:
            cache_entry = self.search_cache[cache_key]
            cache_age = datetime.now() - cache_entry['timestamp']
            
            if cache_age.total_seconds() < cache_ttl_hours * 3600:
                logger.info(f"Using cached search results for query: {query}")
                return cache_entry['results']
        
        # Select sources to search
        if sources is None:
            search_sources = list(self.aviation_sources.keys())
        else:
            search_sources = [s for s in sources if s in self.aviation_sources]
        
        logger.info(f"Searching for '{query}' across {len(search_sources)} sources")
        
        # Initialize results
        all_results = []
        
        # Search each source
        for source_id in search_sources:
            source_info = self.aviation_sources[source_id]
            source_results = self._search_source(query, source_id, source_info)
            all_results.extend(source_results)
        
        # Sort results by relevance score
        all_results.sort(key=lambda x: x['relevance_score'], reverse=True)
        
        # Limit results
        results = all_results[:max_results]
        
        # Cache results
        self.search_cache[cache_key] = {
            'timestamp': datetime.now(),
            'results': results
        }
        self._save_cache(self.search_cache, 'search_cache.pkl')
        
        return results
    
    def _search_source(self, query: str, source_id: str, 
                      source_info: Dict[str, str]) -> List[Dict[str, Any]]:
        """Search a specific source for the query"""
        try:
            # Format search URL
            search_url = source_info['search_url'].format(query=requests.utils.quote(query))
            
            # Fetch search results page
            response = requests.get(search_url, headers=self.request_headers, timeout=10)
            response.raise_for_status()
            
            # Process based on source
            if source_id == 'faa':
                return self._extract_faa_search_results(response.text, query)
            elif source_id == 'easa':
                return self._extract_easa_search_results(response.text, query)
            elif source_id == 'icao':
                return self._extract_icao_search_results(response.text, query)
            elif source_id == 'nasa':
                return self._extract_nasa_search_results(response.text, query)
            elif source_id == 'skybrary':
                return self._extract_skybrary_search_results(response.text, query)
            else:
                # Generic extraction for unknown sources
                return self._extract_generic_search_results(response.text, query, source_id, source_info)
            
        except Exception as e:
            logger.warning(f"Error searching {source_id}: {str(e)}")
            return []
    
    def _extract_generic_search_results(self, html_content: str, query: str, 
                                       source_id: str, source_info: Dict[str, str]) -> List[Dict[str, Any]]:
        """Extract search results from generic HTML content"""
        results = []
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Look for common search result patterns
        # This is a simplified implementation that might not work for all sites
        result_elements = soup.select('div.search-result, div.result, article, .result-item')
        
        for element in result_elements[:20]:  # Limit to first 20 results
            # Extract title
            title_elem = element.select_one('h2, h3, .title, .result-title')
            title = title_elem.get_text().strip() if title_elem else "Untitled"
            
            # Extract URL
            link_elem = element.select_one('a')
            url = link_elem.get('href') if link_elem else None
            
            # Normalize URL
            if url and not url.startswith(('http://', 'https://')):
                url = source_info['base_url'] + ('' if url.startswith('/') else '/') + url
            
            # Extract snippet
            snippet_elem = element.select_one('p, .snippet, .description, .summary')
            snippet = snippet_elem.get_text().strip() if snippet_elem else ""
            
            # Calculate relevance score
            relevance_score = self._calculate_relevance_score(title + " " + snippet, query)
            
            # Add to results if URL is valid
            if url:
                results.append({
                    'title': title,
                    'url': url,
                    'snippet': snippet,
                    'source': source_info['name'],
                    'source_id': source_id,
                    'relevance_score': relevance_score,
                    'query': query,
                    'timestamp': datetime.now().isoformat()
                })
        
        return results
    
    # Custom extraction methods for each source
    # In a real implementation, these would be more sophisticated
    
    def _extract_faa_search_results(self, html_content: str, query: str) -> List[Dict[str, Any]]:
        """Extract search results from FAA website"""
        # This is a placeholder - would need custom implementation for actual FAA site
        return self._extract_generic_search_results(
            html_content, query, 'faa', self.aviation_sources['faa']
        )
    
    def _extract_easa_search_results(self, html_content: str, query: str) -> List[Dict[str, Any]]:
        """Extract search results from EASA website"""
        return self._extract_generic_search_results(
            html_content, query, 'easa', self.aviation_sources['easa']
        )
    
    def _extract_icao_search_results(self, html_content: str, query: str) -> List[Dict[str, Any]]:
        """Extract search results from ICAO website"""
        return self._extract_generic_search_results(
            html_content, query, 'icao', self.aviation_sources['icao']
        )
    
    def _extract_nasa_search_results(self, html_content: str, query: str) -> List[Dict[str, Any]]:
        """Extract search results from NASA NTRS"""
        return self._extract_generic_search_results(
            html_content, query, 'nasa', self.aviation_sources['nasa']
        )
    
    def _extract_skybrary_search_results(self, html_content: str, query: str) -> List[Dict[str, Any]]:
        """Extract search results from SKYbrary"""
        return self._extract_generic_search_results(
            html_content, query, 'skybrary', self.aviation_sources['skybrary']
        )
    
    def _calculate_relevance_score(self, text: str, query: str) -> float:
        """Calculate relevance score of text for a query"""
        # Preprocess text and query
        text_tokens = [self.lemmatizer.lemmatize(word.lower()) 
                       for word in word_tokenize(text) 
                       if word.lower() not in self.stop_words]
        
        query_tokens = [self.lemmatizer.lemmatize(word.lower()) 
                        for word in word_tokenize(query) 
                        if word.lower() not in self.stop_words]
        
        # Count query term occurrences
        term_count = sum(text_tokens.count(token) for token in query_tokens)
        
        # Calculate basic TF score
        if len(text_tokens) > 0:
            tf_score = term_count / len(text_tokens)
        else:
            tf_score = 0
        
        # Check for exact phrase matches
        exact_match_score = 0
        if len(query_tokens) > 1:
            text_lower = text.lower()
            query_lower = query.lower()
            if query_lower in text_lower:
                exact_match_score = 0.5
        
        # Title match bonus - simplified by assuming text includes title
        title_match_score = 0
        for token in query_tokens:
            if token in text_tokens[:10]:  # Assume first 10 tokens might be title
                title_match_score += 0.1
        
        # Combined score (simple weighted sum)
        relevance_score = (0.5 * tf_score) + exact_match_score + title_match_score
        
        # Normalize to 0-1 range
        return min(1.0, relevance_score)
    
    def fetch_page_content(self, url: str, use_cache: bool = True,
                          cache_ttl_hours: int = 168) -> Dict[str, Any]:
        """
        Fetch and parse a web page
        
        Args:
            url: URL to fetch
            use_cache: Whether to use cached content
            cache_ttl_hours: Cache TTL in hours
            
        Returns:
            Dictionary with page content and metadata
        """
        # Generate cache key
        cache_key = self._get_cache_key('page', url)
        
        # Check cache
        if use_cache and cache_key in self.web_page_cache:
            cache_entry = self.web_page_cache[cache_key]
            cache_age = datetime.now() - cache_entry['fetch_time']
            
            if cache_age.total_seconds() < cache_ttl_hours * 3600:
                logger.info(f"Using cached page content for URL: {url}")
                return cache_entry
        
        try:
            logger.info(f"Fetching page content from URL: {url}")
            
            # Fetch page
            response = requests.get(url, headers=self.request_headers, timeout=15)
            response.raise_for_status()
            
            # Parse content
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Extract title
            title = soup.title.get_text().strip() if soup.title else "Untitled"
            
            # Extract main content
            main_content = self._extract_main_content(soup)
            
            # Extract metadata
            meta_description = ""
            meta_desc_tag = soup.find('meta', attrs={'name': 'description'})
            if meta_desc_tag and 'content' in meta_desc_tag.attrs:
                meta_description = meta_desc_tag['content']
            
            # Extract publication date if available
            pub_date = self._extract_publication_date(soup)
            
            # Extract authors if available
            authors = self._extract_authors(soup)
            
            # Check if it's a PDF link
            is_pdf = url.lower().endswith('.pdf') or 'application/pdf' in response.headers.get('Content-Type', '')
            
            # Handle PDF content
            if is_pdf:
                # In a real implementation, use PyPDF2 or similar to extract PDF content
                content_text = "PDF content extraction not implemented in this example"
            else:
                # Extract plain text from HTML content
                content_text = self._extract_text_from_html(main_content)
            
            # Create result
            result = {
                'url': url,
                'title': title,
                'meta_description': meta_description,
                'content_text': content_text,
                'content_html': str(main_content),
                'publication_date': pub_date,
                'authors': authors,
                'is_pdf': is_pdf,
                'fetch_time': datetime.now(),
                'status': 'success'
            }
            
            # Cache result
            self.web_page_cache[cache_key] = result
            self._save_cache(self.web_page_cache, 'web_page_cache.pkl')
            
            return result
            
        except Exception as e:
            logger.warning(f"Error fetching page content from {url}: {str(e)}")
            
            # Create error result
            error_result = {
                'url': url,
                'status': 'error',
                'error_message': str(e),
                'fetch_time': datetime.now()
            }
            
            # Cache error result
            self.web_page_cache[cache_key] = error_result
            self._save_cache(self.web_page_cache, 'web_page_cache.pkl')
            
            return error_result
    
    def _extract_main_content(self, soup: BeautifulSoup) -> BeautifulSoup:
        """Extract main content from web page"""
        # Check for common content container elements
        content_candidates = []
        
        # Look for semantic elements
        for element_type in ['article', 'main', '[role=main]', 'section']:
            elements = soup.select(element_type)
            content_candidates.extend(elements)
        
        # Look for common content class patterns
        for class_pattern in ['content', 'article', 'post', 'entry', 'main', 'text']:
            elements = soup.select(f'.{class_pattern}')
            content_candidates.extend(elements)
        
        # If we have candidates, select the one with the most text
        if content_candidates:
            best_candidate = max(content_candidates, key=lambda x: len(x.get_text()))
            return best_candidate
        
        # Fallback to body
        return soup.body or soup
    
    def _extract_text_from_html(self, element: BeautifulSoup) -> str:
        """Extract clean text from HTML content"""
        # Remove script and style elements
        for script in element(['script', 'style', 'header', 'footer', 'nav']):
            script.decompose()
        
        # Get text
        text = element.get_text('\n', strip=True)
        
        # Remove excessive whitespace
        text = re.sub(r'\n+', '\n', text)
        text = re.sub(r'\s+', ' ', text)
        
        return text.strip()
    
    def _extract_publication_date(self, soup: BeautifulSoup) -> str:
        """Extract publication date from web page"""
        # Look for common date patterns
        date_patterns = [
            # Meta tags
            ('meta[property="article:published_time"]', 'content'),
            ('meta[name="publication_date"]', 'content'),
            ('meta[name="date"]', 'content'),
            # Common HTML patterns
            ('time', 'datetime'),
            ('.date', None),
            ('.published', None),
            ('.pubdate', None)
        ]
        
        for selector, attr in date_patterns:
            elements = soup.select(selector)
            if elements:
                for element in elements:
                    if attr and attr in element.attrs:
                        return element[attr]
                    else:
                        text = element.get_text().strip()
                        if text:
                            return text
        
        return ""
    
    def _extract_authors(self, soup: BeautifulSoup) -> List[str]:
        """Extract author information from web page"""
        authors = []
        
        # Look for common author patterns
        author_patterns = [
            # Meta tags
            ('meta[name="author"]', 'content'),
            ('meta[property="article:author"]', 'content'),
            # Common HTML patterns
            ('.author', None),
            ('.byline', None),
            ('span[itemprop="author"]', None),
            ('[rel="author"]', None)
        ]
        
        for selector, attr in author_patterns:
            elements = soup.select(selector)
            if elements:
                for element in elements:
                    if attr and attr in element.attrs:
                        author = element[attr].strip()
                    else:
                        author = element.get_text().strip()
                    
                    if author and author not in authors:
                        authors.append(author)
        
        return authors
    
    def analyze_text(self, text: str) -> Dict[str, Any]:
        """
        Analyze text to extract key information
        
        Args:
            text: Text to analyze
            
        Returns:
            Dictionary with analysis results
        """
        try:
            # Split text into sentences
            sentences = sent_tokenize(text)
            
            # Tokenize and preprocess text
            tokens = [word.lower() for word in word_tokenize(text) 
                      if word.isalpha() and word.lower() not in self.stop_words]
            
            # Calculate basic statistics
            word_count = len(tokens)
            sentence_count = len(sentences)
            avg_sentence_length = word_count / sentence_count if sentence_count > 0 else 0
            
            # Calculate word frequencies
            word_freq = {}
            for word in tokens:
                word = self.lemmatizer.lemmatize(word)
                word_freq[word] = word_freq.get(word, 0) + 1
            
            # Sort word frequencies
            top_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:20]
            
            # Extract key sentences (simple extractive summarization)
            key_sentences = self._extract_key_sentences(sentences, tokens, top_words, min(5, sentence_count))
            
            # Create summary
            if len(key_sentences) > 0:
                summary = " ".join(key_sentences)
            else:
                # Fallback to first few sentences
                summary = " ".join(sentences[:3]) if sentence_count >= 3 else text
            
            # Create analysis result
            result = {
                'word_count': word_count,
                'sentence_count': sentence_count,
                'avg_sentence_length': avg_sentence_length