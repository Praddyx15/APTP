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
        