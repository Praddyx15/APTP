import os
import sys
import logging
import json
import time
from typing import List, Dict, Any, Optional, Tuple, Union
import traceback
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import joblib
from scipy.stats import pearsonr

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class TrainingDataset(Dataset):
    """Dataset for pilot training performance data"""
    
    def __init__(self, features, targets):
        self.features = torch.tensor(features, dtype=torch.float32)
        self.targets = torch.tensor(targets, dtype=torch.float32)
    
    def __len__(self):
        return len(self.features)
    
    def __getitem__(self, idx):
        return self.features[idx], self.targets[idx]

class PilotPerformanceModel(nn.Module):
    """Neural network model for pilot performance prediction"""
    
    def __init__(self, input_dim, hidden_dim=128, output_dim=1, dropout_rate=0.3):
        super(PilotPerformanceModel, self).__init__()
        
        self.network = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.BatchNorm1d(hidden_dim),
            nn.Dropout(dropout_rate),
            
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.ReLU(),
            nn.BatchNorm1d(hidden_dim // 2),
            nn.Dropout(dropout_rate),
            
            nn.Linear(hidden_dim // 2, hidden_dim // 4),
            nn.ReLU(),
            nn.BatchNorm1d(hidden_dim // 4),
            nn.Dropout(dropout_rate),
            
            nn.Linear(hidden_dim // 4, output_dim)
        )
    
    def forward(self, x):
        return self.network(x)

class BayesianKnowledgeTracing:
    """
    Bayesian Knowledge Tracing implementation for skill decay prediction
    
    This model tracks the probability that a pilot has mastered a skill
    and predicts how that mastery degrades over time without practice.
    """
    
    def __init__(self):
        # Default BKT parameters
        # p_init: Initial probability of mastery
        # p_transit: Probability of transitioning from unmastered to mastered
        # p_slip: Probability of "slipping" (incorrect despite mastery)
        # p_guess: Probability of "guessing" (correct despite no mastery)
        # decay_rate: Rate at which mastery decays over time
        self.params = {
            'p_init': 0.3,
            'p_transit': 0.1,
            'p_slip': 0.1,
            'p_guess': 0.05,
            'decay_rate': 0.01  # Daily decay rate
        }
    
    def fit(self, performance_data):
        """
        Fit BKT parameters to historical performance data
        
        Args:
            performance_data: DataFrame with columns for skill, performance, and time_since_last_practice
        """
        # In a real implementation, this would use EM algorithm or MCMC
        # to fit the parameters to observed data
        
        # For now, just use simple heuristics
        if len(performance_data) > 10:
            # Estimate p_init from first attempt success rate
            first_attempts = performance_data.groupby('skill').first()
            self.params['p_init'] = first_attempts['performance'].mean()
            
            # Estimate p_transit from improvement between consecutive attempts
            self.params['p_transit'] = 0.1
            
            # Estimate decay rate from performance drop over time
            time_diffs = []
            perf_diffs = []
            
            for skill, group in performance_data.groupby('skill'):
                sorted_group = group.sort_values('timestamp')
                for i in range(1, len(sorted_group)):
                    if sorted_group.iloc[i]['time_since_last_practice'] > 0:
                        time_diffs.append(sorted_group.iloc[i]['time_since_last_practice'])
                        perf_diffs.append(sorted_group.iloc[i-1]['performance'] - sorted_group.iloc[i]['performance'])
            
            if len(time_diffs) > 0 and len(perf_diffs) > 0:
                avg_time = np.mean(time_diffs)
                avg_perf_drop = np.mean([d for d in perf_diffs if d > 0])
                if avg_time > 0 and avg_perf_drop > 0:
                    self.params['decay_rate'] = avg_perf_drop / avg_time
    
    def predict_mastery(self, current_mastery, days_since_practice):
        """
        Predict mastery level after a period without practice
        
        Args:
            current_mastery: Current probability of mastery
            days_since_practice: Number of days since last practice
        
        Returns:
            Updated mastery probability
        """
        # Apply exponential decay
        decay_factor = np.exp(-self.params['decay_rate'] * days_since_practice)
        
        # Decay the difference between current mastery and zero
        decayed_mastery = current_mastery * decay_factor
        
        return decayed_mastery
    
    def update(self, prior_mastery, performance):
        """
        Update mastery estimate based on observed performance
        
        Args:
            prior_mastery: Prior probability of mastery
            performance: Observed performance (1 for correct, 0 for incorrect)
        
        Returns:
            Updated mastery probability
        """
        p_slip = self.params['p_slip']
        p_guess = self.params['p_guess']
        p_transit = self.params['p_transit']
        
        if performance:
            # P(mastered | correct)
            numerator = prior_mastery * (1 - p_slip)
            denominator = prior_mastery * (1 - p_slip) + (1 - prior_mastery) * p_guess
        else:
            # P(mastered | incorrect)
            numerator = prior_mastery * p_slip
            denominator = prior_mastery * p_slip + (1 - prior_mastery) * (1 - p_guess)
        
        updated_mastery = numerator / denominator if denominator > 0 else prior_mastery
        
        # Apply learning
        updated_mastery = updated_mastery + (1 - updated_mastery) * p_transit
        
        return updated_mastery
    
    def save(self, filepath):
        """Save model parameters to file"""
        with open(filepath, 'w') as f:
            json.dump(self.params, f)
    
    def load(self, filepath):
        """Load model parameters from file"""
        with open(filepath, 'r') as f:
            self.params = json.load(f)

class PerformancePredictionModel:
    """
    Advanced performance prediction model for the Advanced Pilot Training Platform
    
    This model combines neural networks for overall performance prediction
    with Bayesian Knowledge Tracing for skill decay estimation.
    """
    
    def __init__(self, model_dir: str = "./models", use_gpu: bool = True):
        """
        Initialize the performance prediction model.
        
        Args:
            model_dir: Directory to store/load models
            use_gpu: Whether to use GPU for training/inference if available
        """
        self.model_dir = Path(model_dir)
        self.use_gpu = use_gpu and torch.cuda.is_available()
        self.device = torch.device("cuda" if self.use_gpu else "cpu")
        
        logger.info(f"Initializing Performance Prediction Model (using {'GPU' if self.use_gpu else 'CPU'})")
        
        # Feature preprocessing
        self.feature_scaler = None
        self.categorical_encoder = None
        self.target_scaler = None
        
        # Performance prediction model
        self.model = None
        self.feature_columns = None
        self.target_columns = None
        
        # Skill decay models (one per skill)
        self.skill_decay_models = {}
        
        # Fatigue model
        self.fatigue_model = None
        
        # Ensure model directory exists
        os.makedirs(self.model_dir, exist_ok=True)
    
    def preprocess_features(self, data: pd.DataFrame, fit: bool = False) -> np.ndarray:
        """
        Preprocess features for the model
        
        Args:
            data: DataFrame with features
            fit: Whether to fit the preprocessors on this data
        
        Returns:
            Preprocessed features as numpy array
        """
        if self.feature_columns is None:
            raise ValueError("Feature columns not defined. Call fit() first or load a trained model.")
        
        # Filter to include only known feature columns
        data = data[self.feature_columns].copy()
        
        # Split numerical and categorical features
        numerical_features = data.select_dtypes(include=['int64', 'float64']).columns.tolist()
        categorical_features = data.select_dtypes(include=['object', 'category']).columns.tolist()
        
        # Process numerical features
        numerical_data = data[numerical_features].values
        if fit:
            self.feature_scaler = StandardScaler()
            numerical_data = self.feature_scaler.fit_transform(numerical_data)
        elif self.feature_scaler is not None:
            numerical_data = self.feature_scaler.transform(numerical_data)
        
        # Process categorical features
        if categorical_features:
            categorical_data = data[categorical_features].values
            if fit:
                self.categorical_encoder = OneHotEncoder(sparse=False, handle_unknown='ignore')
                categorical_data = self.categorical_encoder.fit_transform(categorical_data)
            elif self.categorical_encoder is not None:
                categorical_data = self.categorical_encoder.transform(categorical_data)
            
            # Combine numerical and categorical features
            features = np.hstack((numerical_data, categorical_data))
        else:
            features = numerical_data
        
        return features
    
    def preprocess_targets(self, data: pd.DataFrame, fit: bool = False) -> np.ndarray:
        """
        Preprocess target variables for the model
        
        Args:
            data: DataFrame with target variables
            fit: Whether to fit the preprocessors on this data
        
        Returns:
            Preprocessed targets as numpy array
        """
        if self.target_columns is None:
            raise ValueError("Target columns not defined. Call fit() first or load a trained model.")
        
        # Extract target variables
        targets = data[self.target_columns].values
        
        # Scale target variables
        if fit:
            self.target_scaler = StandardScaler()
            targets = self.target_scaler.fit_transform(targets)
        elif self.target_scaler is not None:
            targets = self.target_scaler.transform(targets)
        
        return targets
    
    def fit(self, training_data: pd.DataFrame, 
            feature_columns: List[str], 
            target_columns: List[str],
            epochs: int = 100,
            batch_size: int = 32,
            learning_rate: float = 0.001,
            validation_split: float = 0.2,
            patience: int = 10,
            verbose: bool = True) -> Dict[str, Any]:
        """
        Train the performance prediction model
        
        Args:
            training_data: DataFrame with training data
            feature_columns: List of column names to use as features
            target_columns: List of column names to predict
            epochs: Number of training epochs
            batch_size: Batch size for training
            learning_rate: Learning rate for optimizer
            validation_split: Fraction of data to use for validation
            patience: Number of epochs to wait before early stopping
            verbose: Whether to print training progress
        
        Returns:
            Dictionary with training history and metrics
        """
        self.feature_columns = feature_columns
        self.target_columns = target_columns
        
        # Preprocess data
        features = self.preprocess_features(training_data, fit=True)
        targets = self.preprocess_targets(training_data, fit=True)
        
        # Split into training and validation sets
        X_train, X_val, y_train, y_val = train_test_split(
            features, targets, test_size=validation_split, random_state=42)
        
        # Create dataloaders
        train_dataset = TrainingDataset(X_train, y_train)
        val_dataset = TrainingDataset(X_val, y_val)
        train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
        val_loader = DataLoader(val_dataset, batch_size=batch_size)
        
        # Initialize model
        input_dim = features.shape[1]
        output_dim = targets.shape[1]
        self.model = PilotPerformanceModel(input_dim, hidden_dim=128, output_dim=output_dim)
        self.model.to(self.device)
        
        # Initialize optimizer and loss function
        optimizer = torch.optim.Adam(self.model.parameters(), lr=learning_rate)
        criterion = nn.MSELoss()
        
        # Training loop
        best_val_loss = float('inf')
        patience_counter = 0
        history = {
            "train_loss": [],
            "val_loss": []
        }
        
        for epoch in range(epochs):
            # Training phase
            self.model.train()
            train_loss = 0.0
            
            for batch_features, batch_targets in train_loader:
                batch_features = batch_features.to(self.device)
                batch_targets = batch_targets.to(self.device)
                
                # Forward pass
                outputs = self.model(batch_features)
                loss = criterion(outputs, batch_targets)
                
                # Backward pass and optimize
                optimizer.zero_grad()
                loss.backward()
                optimizer.step()
                
                train_loss += loss.item() * batch_features.size(0)
            
            train_loss /= len(train_loader.dataset)
            history["train_loss"].append(train_loss)
            
            # Validation phase
            self.model.eval()
            val_loss = 0.0
            
            with torch.no_grad():
                for batch_features, batch_targets in val_loader:
                    batch_features = batch_features.to(self.device)
                    batch_targets = batch_targets.to(self.device)
                    
                    outputs = self.model(batch_features)
                    loss = criterion(outputs, batch_targets)
                    
                    val_loss += loss.item() * batch_features.size(0)
                
                val_loss /= len(val_loader.dataset)
                history["val_loss"].append(val_loss)
            
            # Early stopping
            if val_loss < best_val_loss:
                best_val_loss = val_loss
                patience_counter = 0
                self.save_model()
            else:
                patience_counter += 1
            
            if patience_counter >= patience:
                if verbose:
                    logger.info(f"Early stopping at epoch {epoch+1}")
                break
            
            if verbose and (epoch + 1) % 10 == 0:
                logger.info(f"Epoch {epoch+1}/{epochs}, Train Loss: {train_loss:.4f}, Val Loss: {val_loss:.4f}")
        
        # Load the best model
        self.load_model()
        
        # Evaluate on validation set
        self.model.eval()
        with torch.no_grad():
            val_features = torch.tensor(X_val, dtype=torch.float32).to(self.device)
            val_targets = torch.tensor(y_val, dtype=torch.float32).to(self.device)
            
            predictions = self.model(val_features).cpu().numpy()
            actual = val_targets.cpu().numpy()
            
            # Inverse transform the predictions and actual values
            if self.target_scaler is not None:
                predictions = self.target_scaler.inverse_transform(predictions)
                actual = self.target_scaler.inverse_transform(actual)
            
            # Calculate metrics
            metrics = {
                "mse": mean_squared_error(actual, predictions),
                "rmse": np.sqrt(mean_squared_error(actual, predictions)),
                "mae": mean_absolute_error(actual, predictions),
                "r2": r2_score(actual, predictions)
            }
            
            # Calculate correlation for each target
            correlations = []
            for i in range(actual.shape[1]):
                corr, _ = pearsonr(actual[:, i], predictions[:, i])
                correlations.append(corr)
            
            metrics["correlations"] = correlations
        
        # Train skill decay models
        if 'skill' in training_data.columns and 'performance' in training_data.columns:
            self._train_skill_decay_models(training_data)
        
        return {
            "history": history,
            "metrics": metrics
        }
    
    def _train_skill_decay_models(self, training_data: pd.DataFrame):
        """
        Train BKT models for skill decay prediction
        
        Args:
            training_data: DataFrame with columns for skill, performance, and timestamp
        """
        if 'skill' not in training_data.columns:
            logger.warning("No 'skill' column in training data, skipping skill decay model training")
            return
        
        # Add time since last practice if not present
        if 'time_since_last_practice' not in training_data.columns:
            training_data = training_data.copy()
            training_data['time_since_last_practice'] = 0
            
            for skill, group in training_data.groupby('skill'):
                sorted_group = group.sort_values('timestamp')
                time_diffs = [0]
                
                for i in range(1, len(sorted_group)):
                    prev_time = sorted_group.iloc[i-1]['timestamp']
                    curr_time = sorted_group.iloc[i]['timestamp']
                    
                    # Calculate time difference in days
                    if isinstance(prev_time, pd.Timestamp) and isinstance(curr_time, pd.Timestamp):
                        diff_days = (curr_time - prev_time).days
                    else:
                        diff_days = 0
                    
                    time_diffs.append(diff_days)
                
                sorted_indices = sorted_group.index
                for i, idx in enumerate(sorted_indices):
                    training_data.at[idx, 'time_since_last_practice'] = time_diffs[i]
        
        # Train a BKT model for each skill
        unique_skills = training_data['skill'].unique()
        for skill in unique_skills:
            skill_data = training_data[training_data['skill'] == skill]
            
            model = BayesianKnowledgeTracing()
            model.fit(skill_data)
            
            self.skill_decay_models[skill] = model
            
            # Save the model
            model_path = self.model_dir / f"skill_decay_{skill}.json"
            model.save(model_path)
    
    def predict(self, data: pd.DataFrame) -> np.ndarray:
        """
        Make performance predictions for the given data
        
        Args:
            data: DataFrame with feature data
        
        Returns:
            NumPy array with predictions
        """
        if self.model is None:
            raise ValueError("Model not trained. Call fit() first or load a trained model.")
        
        # Preprocess features
        features = self.preprocess_features(data)
        
        # Convert to tensor
        features_tensor = torch.tensor(features, dtype=torch.float32).to(self.device)
        
        # Make predictions
        self.model.eval()
        with torch.no_grad():
            predictions = self.model(features_tensor).cpu().numpy()
        
        # Inverse transform predictions
        if self.target_scaler is not None:
            predictions = self.target_scaler.inverse_transform(predictions)
        
        return predictions
    
    def predict_skill_decay(self, skill: str, current_mastery: float, days_since_practice: int) -> float:
        """
        Predict skill decay over time
        
        Args:
            skill: Name of the skill
            current_mastery: Current mastery level (0.0 to 1.0)
            days_since_practice: Number of days since last practice
        
        Returns:
            Predicted mastery level after decay
        """
        if skill not in self.skill_decay_models:
            logger.warning(f"No decay model for skill '{skill}', using default decay rate")
            # Use a generic BKT model
            model = BayesianKnowledgeTracing()
        else:
            model = self.skill_decay_models[skill]
        
        return model.predict_mastery(current_mastery, days_since_practice)
    
    def save_model(self, filepath: Optional[str] = None):
        """
        Save the model and preprocessors to disk
        
        Args:
            filepath: Path to save the model (default: model_dir/model.pt)
        """
        if filepath is None:
            filepath = self.model_dir / "model.pt"
        else:
            filepath = Path(filepath)
        
        # Create directory if it doesn't exist
        filepath.parent.mkdir(parents=True, exist_ok=True)
        
        # Save model
        model_state = {
            'model_state_dict': self.model.state_dict() if self.model else None,
            'feature_columns': self.feature_columns,
            'target_columns': self.target_columns
        }
        torch.save(model_state, filepath)
        
        # Save preprocessors
        if self.feature_scaler is not None:
            joblib.dump(self.feature_scaler, filepath.parent / "feature_scaler.pkl")
        
        if self.categorical_encoder is not None:
            joblib.dump(self.categorical_encoder, filepath.parent / "categorical_encoder.pkl")
        
        if self.target_scaler is not None:
            joblib.dump(self.target_scaler, filepath.parent / "target_scaler.pkl")
        
        # Save metadata
        metadata = {
            'feature_columns': self.feature_columns,
            'target_columns': self.target_columns,
            'input_dim': self.model.network[0].in_features if self.model else None,
            'output_dim': self.model.network[-1].out_features if self.model else None,
            'saved_at': time.time()
        }
        
        with open(filepath.parent / "metadata.json", 'w') as f:
            json.dump(metadata, f)
        
        logger.info(f"Model saved to {filepath}")
    
    def load_model(self, filepath: Optional[str] = None):
        """
        Load the model and preprocessors from disk
        
        Args:
            filepath: Path to load the model from (default: model_dir/model.pt)
        """
        if filepath is None:
            filepath = self.model_dir / "model.pt"
        else:
            filepath = Path(filepath)
        
        if not filepath.exists():
            raise FileNotFoundError(f"Model file not found: {filepath}")
        
        # Load model
        model_state = torch.load(filepath, map_location=self.device)
        
        self.feature_columns = model_state['feature_columns']
        self.target_columns = model_state['target_columns']
        
        # Load metadata
        metadata_path = filepath.parent / "metadata.json"
        if metadata_path.exists():
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
                input_dim = metadata.get('input_dim')
                output_dim = metadata.get('output_dim')
        else:
            # Use first and last layer dimensions if available
            if model_state['model_state_dict'] is not None:
                first_layer = next(iter(model_state['model_state_dict'].items()))
                last_layer = list(model_state['model_state_dict'].items())[-2]
                
                if 'weight' in first_layer[0] and '0' in first_layer[0]:
                    input_dim = first_layer[1].shape[1]
                else:
                    input_dim = None
                
                if 'weight' in last_layer[0] and str(len(model_state['model_state_dict']) // 4 - 1) in last_layer[0]:
                    output_dim = last_layer[1].shape[0]
                else:
                    output_dim = None
            else:
                input_dim = None
                output_dim = None
        
        # Initialize model with correct dimensions
        if input_dim is not None and output_dim is not None:
            self.model = PilotPerformanceModel(input_dim, output_dim=output_dim)
            self.model.to(self.device)
            
            # Load model state
            if model_state['model_state_dict'] is not None:
                self.model.load_state_dict(model_state['model_state_dict'])
        
        # Load preprocessors
        scaler_path = filepath.parent / "feature_scaler.pkl"
        if scaler_path.exists():
            self.feature_scaler = joblib.load(scaler_path)
        
        encoder_path = filepath.parent / "categorical_encoder.pkl"
        if encoder_path.exists():
            self.categorical_encoder = joblib.load(encoder_path)
        
        target_scaler_path = filepath.parent / "target_scaler.pkl"
        if target_scaler_path.exists():
            self.target_scaler = joblib.load(target_scaler_path)
        
        # Load skill decay models
        for skill_model_path in filepath.parent.glob("skill_decay_*.json"):
            skill_name = skill_model_path.stem.replace("skill_decay_", "")
            model = BayesianKnowledgeTracing()
            model.load(skill_model_path)
            self.skill_decay_models[skill_name] = model
        
        logger.info(f"Model loaded from {filepath}")

# Fatigue risk modeling class
class FatigueRiskModel:
    """
    Fatigue risk modeling with duty cycle analysis
    
    This model predicts pilot fatigue levels based on duty patterns,
    circadian factors, and sleep opportunities.
    """
    
    def __init__(self):
        # Constants for the Three-Process Model of alertness
        self.params = {
            'homeostatic_time_constant': 4.2,  # Time constant for Process S (hours)
            'circadian_amplitude': 0.21,       # Amplitude of Process C
            'circadian_mesor': 0.73,           # Mesor (midline) of Process C
            'sleep_debt_weight': 0.15,         # Weight of cumulative sleep debt
            'recovery_rate': 0.55              # Recovery rate during sleep
        }
    
    def predict_fatigue(self, duty_periods: List[Dict[str, Any]], 
                       sleep_periods: List[Dict[str, Any]],
                       prediction_times: List[float]) -> List[float]:
        """
        Predict fatigue levels at specified times
        
        Args:
            duty_periods: List of duty periods (start_time, end_time)
            sleep_periods: List of sleep periods (start_time, end_time, quality)
            prediction_times: List of times to predict fatigue levels for
        
        Returns:
            List of predicted fatigue scores (0-100, where 100 is most fatigued)
        """
        fatigue_scores = []
        
        for time_point in prediction_times:
            # Calculate homeostatic pressure (Process S)
            homeostatic = self._calculate_homeostatic_pressure(sleep_periods, time_point)
            
            # Calculate circadian rhythm (Process C)
            circadian = self._calculate_circadian_factor(time_point)
            
            # Calculate sleep inertia (Process W)
            inertia = self._calculate_sleep_inertia(sleep_periods, time_point)
            
            # Calculate duty-related fatigue
            duty_fatigue = self._calculate_duty_fatigue(duty_periods, time_point)
            
            # Combine factors to get final fatigue score
            fatigue_score = (
                homeostatic * 0.45 +
                (1 - circadian) * 0.3 +
                inertia * 0.1 +
                duty_fatigue * 0.15
            ) * 100
            
            # Clip to range 0-100
            fatigue_score = max(0, min(100, fatigue_score))
            fatigue_scores.append(fatigue_score)
        
        return fatigue_scores
    
    def _calculate_homeostatic_pressure(self, sleep_periods, time_point):
        """Calculate homeostatic sleep pressure (Process S)"""
        # In a real implementation, this would track sleep debt over time
        
        # Find the most recent sleep period before time_point
        recent_sleep = None
        for period in sleep_periods:
            if period['end_time'] <= time_point:
                if recent_sleep is None or period['end_time'] > recent_sleep['end_time']:
                    recent_sleep = period
        
        if recent_sleep is None:
            # No sleep recorded - high sleep pressure
            return 0.8
        
        # Calculate hours since last sleep
        hours_awake = (time_point - recent_sleep['end_time']) / 3600
        
        # Sleep pressure increases with time awake
        pressure = 1 - np.exp(-hours_awake / self.params['homeostatic_time_constant'])
        
        # Adjust for sleep quality of last sleep
        if 'quality' in recent_sleep:
            quality_factor = recent_sleep['quality']  # 0-1 scale
            pressure = pressure * (1.5 - quality_factor * 0.5)
        
        return pressure
    
    def _calculate_circadian_factor(self, time_point):
        """Calculate circadian rhythm factor (Process C)"""
        # Convert time_point to time of day (0-24 hours)
        time_of_day = (time_point % 86400) / 3600  # seconds to hours
        
        # Simplified circadian rhythm - lowest at ~3-4 AM, highest at ~3-4 PM
        phase = 2 * np.pi * (time_of_day / 24)
        circadian = self.params['circadian_mesor'] + self.params['circadian_amplitude'] * np.cos(phase + 4)
        
        return circadian
    
    def _calculate_sleep_inertia(self, sleep_periods, time_point):
        """Calculate sleep inertia (Process W)"""
        # Find any recent sleep period that ended very recently
        for period in sleep_periods:
            if period['end_time'] <= time_point:
                minutes_since_wakeup = (time_point - period['end_time']) / 60
                
                # Sleep inertia is strong immediately after waking but dissipates quickly
                if minutes_since_wakeup < 30:
                    return np.exp(-minutes_since_wakeup / 15)
        
        return 0.0
    
    def _calculate_duty_fatigue(self, duty_periods, time_point):
        """Calculate duty-related fatigue"""
        # Check if currently on duty
        on_duty = False
        current_duty_duration = 0
        
        for period in duty_periods:
            if period['start_time'] <= time_point <= period['end_time']:
                on_duty = True
                current_duty_duration = (time_point - period['start_time']) / 3600  # in hours
                break
        
        if not on_duty:
            return 0.0
        
        # Fatigue increases with duty duration
        duty_fatigue = 1 - np.exp(-current_duty_duration / 10)
        
        return duty_fatigue
    
    def analyze_duty_patterns(self, duty_periods: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze duty patterns for fatigue risk factors
        
        Args:
            duty_periods: List of duty periods (start_time, end_time)
        
        Returns:
            Dictionary with duty pattern analysis
        """
        if not duty_periods:
            return {"risk_level": "unknown", "factors": []}
        
        # Sort duty periods by start time
        sorted_periods = sorted(duty_periods, key=lambda x: x['start_time'])
        
        # Calculate duty metrics
        total_duty_hours = sum((p['end_time'] - p['start_time']) / 3600 for p in duty_periods)
        avg_duty_length = total_duty_hours / len(duty_periods)
        
        # Calculate rest periods
        rest_periods = []
        for i in range(1, len(sorted_periods)):
            rest_start = sorted_periods[i-1]['end_time']
            rest_end = sorted_periods[i]['start_time']
            rest_periods.append({
                'start_time': rest_start,
                'end_time': rest_end,
                'duration': (rest_end - rest_start) / 3600  # hours
            })
        
        # Analyze rest periods
        short_rest_count = sum(1 for r in rest_periods if r['duration'] < 12)
        
        # Check for night duty (defined as shifts including 02:00-06:00 local time)
        night_duty_count = 0
        for period in duty_periods:
            start_hour = (period['start_time'] % 86400) / 3600
            end_hour = (period['end_time'] % 86400) / 3600
            
            # Handling overnight shifts
            if end_hour < start_hour:
                end_hour += 24
            
            if (start_hour <= 2 and end_hour >= 2) or (start_hour <= 6 and end_hour >= 6) or (start_hour >= 2 and end_hour <= 6):
                night_duty_count += 1
        
        # Calculate risk factors
        risk_factors = []
        
        if avg_duty_length > 10:
            risk_factors.append(f"Long duty periods (avg {avg_duty_length:.1f} hours)")
        
        if short_rest_count > 0:
            risk_factors.append(f"Short rest periods ({short_rest_count} instances < 12 hours)")
        
        if night_duty_count > 0:
            risk_factors.append(f"Night duty ({night_duty_count} instances)")
        
        # Determine overall risk level
        risk_level = "low"
        if len(risk_factors) >= 3:
            risk_level = "high"
        elif len(risk_factors) >= 1:
            risk_level = "moderate"
        
        return {
            "risk_level": risk_level,
            "factors": risk_factors,
            "metrics": {
                "total_duty_hours": total_duty_hours,
                "avg_duty_length": avg_duty_length,
                "night_duty_count": night_duty_count,
                "short_rest_count": short_rest_count
            }
        }

# Command-line interface
if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Performance Prediction Model for Advanced Pilot Training Platform")
    parser.add_argument("--train", "-t", help="CSV file with training data")
    parser.add_argument("--predict", "-p", help="CSV file with data to predict")
    parser.add_argument("--output", "-o", help="Output file for results (JSON)")
    parser.add_argument("--model-dir", "-m", default="./models", help="Directory for model files")
    parser.add_argument("--cpu", action="store_true", help="Force CPU usage even if GPU is available")
    parser.add_argument("--verbose", "-v", action="store_true", help="Enable verbose logging")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    try:
        model = PerformancePredictionModel(args.model_dir, not args.cpu)
        
        if args.train:
            # Load training data
            data = pd.read_csv(args.train)
            
            # Identify feature and target columns
            # This is a simplified example - in practice, you would specify these
            feature_cols = [col for col in data.columns if not col.startswith('target_')]
            target_cols = [col for col in data.columns if col.startswith('target_')]
            
            if not target_cols:
                target_cols = ['performance']  # Default target
            
            # Train model
            results = model.fit(data, feature_cols, target_cols, verbose=args.verbose)
            
            # Save results
            if args.output:
                with open(args.output, 'w') as f:
                    json.dump(results, f, indent=2)
            else:
                print(json.dumps(results, indent=2))
        
        elif args.predict:
            # Load data for prediction
            data = pd.read_csv(args.predict)
            
            # Make predictions
            predictions = model.predict(data)
            
            # Format results
            results = {
                'predictions': predictions.tolist(),
                'feature_columns': model.feature_columns,
                'target_columns': model.target_columns
            }
            
            # Save or print results
            if args.output:
                with open(args.output, 'w') as f:
                    json.dump(results, f, indent=2)
            else:
                print(json.dumps(results, indent=2))
        
        else:
            logger.error("Either --train or --predict must be specified")
            parser.print_help()
            sys.exit(1)
        
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        logger.error(traceback.format_exc())
        sys.exit(1)