#!/usr/bin/env python3
"""
Predictive Analytics Engine for Advanced Pilot Training Platform
Provides advanced analytics capabilities including skill decay prediction,
performance consistency assessment, and syllabus optimization
"""

import os
import json
import pickle
import logging
import datetime
from typing import Dict, List, Any, Optional, Tuple

import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
import scipy.stats as stats
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import BayesianRidge
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
import tensorflow as tf
from tensorflow import keras

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Model Storage Path
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODEL_DIR, exist_ok=True)

# Set seeds for reproducibility
np.random.seed(42)
tf.random.set_seed(42)

# Skills Decay Prediction Model
class SkillDecayModel:
    """Predicts skill decay over time using Bayesian Knowledge Tracing"""
    
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        
        # BKT parameters
        self.default_params = {
            'p_transit': 0.1,    # Probability of transitioning from not mastered to mastered
            'p_slip': 0.1,       # Probability of slipping (incorrect when mastered)
            'p_guess': 0.2,      # Probability of guessing (correct when not mastered)
            'p_init': 0.5,       # Initial probability of mastery
            'decay_rate': 0.01   # Daily decay rate for skills
        }
    
    def train(self, training_data: pd.DataFrame) -> None:
        """Train the skill decay model on historical data"""
        
        # Extract features
        X = training_data[['days_since_training', 'practice_frequency', 
                          'initial_performance', 'complexity']]
        y = training_data['current_performance']
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Create and train model
        self.model = Pipeline([
            ('scaler', StandardScaler()),
            ('regressor', BayesianRidge(n_iter=500))
        ])
        
        self.model.fit(X_train, y_train)
        
        # Evaluate model
        y_pred = self.model.predict(X_test)
        mse = mean_squared_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        logger.info(f"Skill decay model trained. MSE: {mse:.4f}, R²: {r2:.4f}")
        
        # Save the model
        with open(os.path.join(MODEL_DIR, "skill_decay_model.pkl"), "wb") as f:
            pickle.dump(self.model, f)
    
    def load_model(self) -> None:
        """Load a pre-trained model"""
        model_path = os.path.join(MODEL_DIR, "skill_decay_model.pkl")
        
        if os.path.exists(model_path):
            with open(model_path, "rb") as f:
                self.model = pickle.load(f)
            logger.info("Loaded skill decay model from file")
        else:
            logger.warning("No pre-trained skill decay model found, will train on demand")
    
    def predict_decay(self, trainee_data: Dict[str, Any]) -> Dict[str, Any]:
        """Predict skill decay for a given trainee"""
        
        # Ensure the model is loaded
        if self.model is None:
            self.load_model()
            
            # If still None, return a default prediction based on BKT
            if self.model is None:
                return self._predict_with_bkt(trainee_data)
        
        # Extract features
        skills = trainee_data.get('skills', [])
        predictions = []
        
        for skill in skills:
            # Prepare features
            features = np.array([[
                skill.get('days_since_training', 0),
                skill.get('practice_frequency', 0),
                skill.get('initial_performance', 0.5),
                skill.get('complexity', 0.5)
            ]])
            
            # Predict performance
            current_performance = self.model.predict(features)[0]
            
            # Calculate time to intervention
            days_to_intervention = self._calculate_days_to_intervention(
                current_performance, skill.get('performance_threshold', 0.7)
            )
            
            # Generate decay curve
            decay_curve = self._generate_decay_curve(
                skill, current_performance, days_to_intervention
            )
            
            predictions.append({
                'skill_id': skill.get('skill_id', 'unknown'),
                'skill_name': skill.get('skill_name', 'Unknown Skill'),
                'current_performance': float(current_performance),
                'days_to_intervention': int(days_to_intervention),
                'decay_curve': decay_curve
            })
        
        return {
            'trainee_id': trainee_data.get('trainee_id', 'unknown'),
            'prediction_date': datetime.datetime.now().isoformat(),
            'predictions': predictions
        }
    
    def _predict_with_bkt(self, trainee_data: Dict[str, Any]) -> Dict[str, Any]:
        """Predict using Bayesian Knowledge Tracing when no trained model exists"""
        
        skills = trainee_data.get('skills', [])
        predictions = []
        
        for skill in skills:
            # Get skill parameters or use defaults
            p_transit = skill.get('p_transit', self.default_params['p_transit'])
            p_slip = skill.get('p_slip', self.default_params['p_slip'])
            p_guess = skill.get('p_guess', self.default_params['p_guess'])
            p_init = skill.get('p_init', self.default_params['p_init'])
            decay_rate = skill.get('decay_rate', self.default_params['decay_rate'])
            
            # Get days since training
            days_since_training = skill.get('days_since_training', 0)
            
            # Apply BKT with decay
            p_mastery = p_init
            
            # Update based on observed performance data if available
            if 'observations' in skill:
                for obs in skill['observations']:
                    correct = obs.get('correct', False)
                    
                    if correct:
                        # P(mastered | correct) using Bayes rule
                        p_mastery = (p_mastery * (1 - p_slip)) / (p_mastery * (1 - p_slip) + (1 - p_mastery) * p_guess)
                    else:
                        # P(mastered | incorrect) using Bayes rule
                        p_mastery = (p_mastery * p_slip) / (p_mastery * p_slip + (1 - p_mastery) * (1 - p_guess))
                    
                    # Apply knowledge transition
                    p_mastery = p_mastery + (1 - p_mastery) * p_transit
            
            # Apply decay based on days since training
            p_mastery = p_mastery * (1 - decay_rate) ** days_since_training
            
            # Set current performance as probability of mastery
            current_performance = p_mastery
            
            # Calculate time to intervention
            threshold = skill.get('performance_threshold', 0.7)
            days_to_intervention = int(np.log(threshold / current_performance) / np.log(1 - decay_rate)) if current_performance > threshold else 0
            
            # Generate decay curve
            decay_curve = self._generate_decay_curve_bkt(
                current_performance, decay_rate, days_to_intervention + 30
            )
            
            predictions.append({
                'skill_id': skill.get('skill_id', 'unknown'),
                'skill_name': skill.get('skill_name', 'Unknown Skill'),
                'current_performance': float(current_performance),
                'days_to_intervention': int(days_to_intervention),
                'decay_curve': decay_curve
            })
        
        return {
            'trainee_id': trainee_data.get('trainee_id', 'unknown'),
            'prediction_date': datetime.datetime.now().isoformat(),
            'predictions': predictions,
            'model_type': 'bkt_default'  # Indicate we used the default BKT model
        }
    
    def _calculate_days_to_intervention(self, current_performance: float, 
                                       threshold: float) -> int:
        """Calculate days until performance will fall below threshold"""
        
        if current_performance <= threshold:
            return 0
        
        # Using average decay rate if model doesn't provide it directly
        avg_decay_rate = 0.01  # 1% decay per day as a default
        
        # Calculate days to reach threshold
        if avg_decay_rate > 0:
            days = int(np.log(threshold / current_performance) / np.log(1 - avg_decay_rate))
            return max(0, days)
        
        return 365  # Return a large number if no decay
    
    def _generate_decay_curve(self, skill: Dict[str, Any], 
                             current_performance: float,
                             days_to_intervention: int) -> List[Dict[str, Any]]:
        """Generate a decay curve for visualization"""
        
        # Get decay-related parameters
        decay_rate = skill.get('decay_rate', self.default_params['decay_rate'])
        
        # Generate curve for 30 days beyond intervention point
        days = days_to_intervention + 30
        curve = []
        
        for day in range(days):
            predicted_performance = current_performance * (1 - decay_rate) ** day
            curve.append({
                'day': day,
                'performance': float(predicted_performance)
            })
        
        return curve
    
    def _generate_decay_curve_bkt(self, current_performance: float, 
                                 decay_rate: float, days: int) -> List[Dict[str, Any]]:
        """Generate a decay curve using BKT model"""
        
        curve = []
        
        for day in range(days):
            predicted_performance = current_performance * (1 - decay_rate) ** day
            curve.append({
                'day': day,
                'performance': float(predicted_performance)
            })
        
        return curve


# Fatigue Risk Model
class FatigueRiskModel:
    """Predicts fatigue risk based on duty cycles and circadian factors"""
    
    def __init__(self):
        self.model = None
    
    def train(self, training_data: pd.DataFrame) -> None:
        """Train the fatigue risk model on historical data"""
        
        # Extract features
        X = training_data[['duty_hours_past_24h', 'duty_hours_past_7d', 
                          'hours_since_last_rest', 'time_of_day',
                          'timezone_changes_past_3d', 'sleep_quality']]
        y = training_data['fatigue_score']
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Create and train model
        self.model = Pipeline([
            ('scaler', StandardScaler()),
            ('regressor', RandomForestRegressor(n_estimators=100, random_state=42))
        ])
        
        self.model.fit(X_train, y_train)
        
        # Evaluate model
        y_pred = self.model.predict(X_test)
        mse = mean_squared_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        logger.info(f"Fatigue risk model trained. MSE: {mse:.4f}, R²: {r2:.4f}")
        
        # Save the model
        with open(os.path.join(MODEL_DIR, "fatigue_risk_model.pkl"), "wb") as f:
            pickle.dump(self.model, f)
    
    def load_model(self) -> None:
        """Load a pre-trained model"""
        model_path = os.path.join(MODEL_DIR, "fatigue_risk_model.pkl")
        
        if os.path.exists(model_path):
            with open(model_path, "rb") as f:
                self.model = pickle.load(f)
            logger.info("Loaded fatigue risk model from file")
        else:
            logger.warning("No pre-trained fatigue risk model found, will use simplified formula")
    
    def predict_fatigue(self, duty_data: Dict[str, Any]) -> Dict[str, Any]:
        """Predict fatigue risk for a given duty schedule"""
        
        # Ensure the model is loaded
        if self.model is None:
            self.load_model()
            
            # If still None, use simplified formula
            if self.model is None:
                return self._predict_with_simplified_model(duty_data)
        
        # Extract features from schedules
        schedules = duty_data.get('schedules', [])
        predictions = []
        
        for schedule in schedules:
            # Prepare features
            features = np.array([[
                schedule.get('duty_hours_past_24h', 0),
                schedule.get('duty_hours_past_7d', 0),
                schedule.get('hours_since_last_rest', 0),
                schedule.get('time_of_day', 12),  # 24-hour format
                schedule.get('timezone_changes_past_3d', 0),
                schedule.get('sleep_quality', 0.5)  # 0-1 scale
            ]])
            
            # Predict fatigue score
            fatigue_score = float(self.model.predict(features)[0])
            
            # Calculate risk category
            risk_category = self._categorize_risk(fatigue_score)
            
            # Generate mitigation strategies
            mitigations = self._generate_mitigations(fatigue_score, risk_category, schedule)
            
            predictions.append({
                'schedule_id': schedule.get('schedule_id', 'unknown'),
                'trainee_id': schedule.get('trainee_id', 'unknown'),
                'fatigue_score': fatigue_score,
                'risk_category': risk_category,
                'mitigations': mitigations
            })
        
        return {
            'prediction_date': datetime.datetime.now().isoformat(),
            'predictions': predictions
        }
    
    def _predict_with_simplified_model(self, duty_data: Dict[str, Any]) -> Dict[str, Any]:
        """Use simplified formula when no trained model exists"""
        
        schedules = duty_data.get('schedules', [])
        predictions = []
        
        for schedule in schedules:
            # Extract key fatigue factors
            duty_24h = schedule.get('duty_hours_past_24h', 0)
            duty_7d = schedule.get('duty_hours_past_7d', 0) / 168  # Normalize to 0-1
            hours_since_rest = schedule.get('hours_since_last_rest', 0) / 24  # Normalize to 0-1
            
            # Time of day factor (circadian effect)
            time_of_day = schedule.get('time_of_day', 12)  # 24-hour format
            # Highest fatigue at 3-5 AM, lowest at 3-5 PM
            circadian_factor = 1 - 0.5 * np.cos((time_of_day - 4) * np.pi / 12)
            
            # Timezone changes
            timezone_changes = schedule.get('timezone_changes_past_3d', 0) * 0.1
            
            # Sleep quality
            sleep_quality = 1 - schedule.get('sleep_quality', 0.5)  # Invert so higher is worse
            
            # Calculate fatigue score (0-10 scale)
            fatigue_score = (
                0.3 * (duty_24h / 24) +  # Weight of recent duty
                0.2 * duty_7d +          # Weight of cumulative duty
                0.2 * hours_since_rest + # Weight of time since rest
                0.15 * circadian_factor + # Weight of time of day
                0.1 * timezone_changes + # Weight of timezone changes
                0.05 * sleep_quality     # Weight of sleep quality
            ) * 10
            
            # Ensure score is between 0-10
            fatigue_score = max(0, min(10, fatigue_score))
            
            # Calculate risk category
            risk_category = self._categorize_risk(fatigue_score)
            
            # Generate mitigation strategies
            mitigations = self._generate_mitigations(fatigue_score, risk_category, schedule)
            
            predictions.append({
                'schedule_id': schedule.get('schedule_id', 'unknown'),
                'trainee_id': schedule.get('trainee_id', 'unknown'),
                'fatigue_score': float(fatigue_score),
                'risk_category': risk_category,
                'mitigations': mitigations
            })
        
        return {
            'prediction_date': datetime.datetime.now().isoformat(),
            'predictions': predictions,
            'model_type': 'simplified'  # Indicate we used the simplified model
        }
    
    def _categorize_risk(self, fatigue_score: float) -> str:
        """Categorize fatigue risk based on score"""
        
        if fatigue_score < 3:
            return "Low"
        elif fatigue_score < 6:
            return "Moderate"
        elif fatigue_score < 8:
            return "High"
        else:
            return "Severe"
    
    def _generate_mitigations(self, fatigue_score: float, risk_category: str, 
                             schedule: Dict[str, Any]) -> List[str]:
        """Generate fatigue mitigation strategies based on risk level"""
        
        mitigations = []
        
        # Common mitigation for all risk levels
        mitigations.append("Ensure proper hydration")
        
        if risk_category == "Low":
            mitigations.append("Maintain normal procedures")
            
        elif risk_category == "Moderate":
            mitigations.append("Consider strategic caffeine intake")
            mitigations.append("Increase monitoring of fatigue signs")
            
            # Add specific mitigations based on schedule factors
            if schedule.get('duty_hours_past_24h', 0) > 8:
                mitigations.append("Take short breaks every 1-2 hours")
            
            if schedule.get('time_of_day', 12) < 6 or schedule.get('time_of_day', 12) > 22:
                mitigations.append("Increase lighting levels in cockpit")
            
        elif risk_category == "High":
            mitigations.append("Implement crew augmentation if available")
            mitigations.append("Mandatory controlled rest periods")
            mitigations.append("Enhanced monitoring by other crewmembers")
            
            # Specific high-risk mitigations
            if schedule.get('hours_since_last_rest', 0) > 12:
                mitigations.append("Ensure minimum 30-minute break before critical phases")
            
            if schedule.get('timezone_changes_past_3d', 0) > 0:
                mitigations.append("Adjust light exposure to aid circadian adaptation")
            
        elif risk_category == "Severe":
            mitigations.append("Consider operational limitation or delay")
            mitigations.append("Implement maximum automation use")
            mitigations.append("Additional crewmember for monitoring if possible")
            mitigations.append("Mandatory rest before next duty period")
        
        return mitigations


# Training Effectiveness Model
class TrainingEffectivenessModel:
    """Predicts training effectiveness using multivariate regression"""
    
    def __init__(self):
        self.model = None
    
    def train(self, training_data: pd.DataFrame) -> None:
        """Train the training effectiveness model on historical data"""
        
        # Extract features
        X = training_data[['training_duration', 'sessions_per_week', 
                           'instructor_experience', 'training_method',
                           'trainee_experience', 'material_complexity']]
        # Convert categorical variables to one-hot encoding
        X = pd.get_dummies(X, columns=['training_method'])
        
        y = training_data['effectiveness_score']
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Create and train model
        self.model = Pipeline([
            ('scaler', StandardScaler()),
            ('regressor', GradientBoostingRegressor(n_estimators=100, random_state=42))
        ])
        
        self.model.fit(X_train, y_train)
        
        # Evaluate model
        y_pred = self.model.predict(X_test)
        mse = mean_squared_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        logger.info(f"Training effectiveness model trained. MSE: {mse:.4f}, R²: {r2:.4f}")
        
        # Save the model
        with open(os.path.join(MODEL_DIR, "training_effectiveness_model.pkl"), "wb") as f:
            pickle.dump(self.model, f)
    
    def load_model(self) -> None:
        """Load a pre-trained model"""
        model_path = os.path.join(MODEL_DIR, "training_effectiveness_model.pkl")
        
        if os.path.exists(model_path):
            with open(model_path, "rb") as f:
                self.model = pickle.load(f)
            logger.info("Loaded training effectiveness model from file")
        else:
            logger.warning("No pre-trained effectiveness model found")
    
    def predict_effectiveness(self, training_data: Dict[str, Any]) -> Dict[str, Any]:
        """Predict training effectiveness for a given training program"""
        
        # Ensure the model is loaded
        if self.model is None:
            self.load_model()
            
            # If still None, use expert rules
            if self.model is None:
                return self._predict_with_expert_rules(training_data)
        
        # Extract program details
        programs = training_data.get('programs', [])
        predictions = []
        
        # Get available training methods from the model
        try:
            training_methods = [col.replace('training_method_', '') 
                               for col in self.model.named_steps['regressor'].feature_names_in_
                               if 'training_method_' in col]
        except (AttributeError, KeyError):
            # Fallback if we can't extract feature names
            training_methods = ["classroom", "simulator", "aircraft", "cbt", "vr"]
        
        for program in programs:
            # Create one-hot encoding for training method
            method_features = {f"training_method_{tm}": 0 for tm in training_methods}
            
            # Set the used method to 1
            method = program.get('training_method', 'simulator')
            if f"training_method_{method}" in method_features:
                method_features[f"training_method_{method}"] = 1
            
            # Combine all features
            feature_dict = {
                'training_duration': program.get('training_duration', 5),
                'sessions_per_week': program.get('sessions_per_week', 3),
                'instructor_experience': program.get('instructor_experience', 5),
                'trainee_experience': program.get('trainee_experience', 3),
                'material_complexity': program.get('material_complexity', 3)
            }
            
            # Add method features
            feature_dict.update(method_features)
            
            # Convert to DataFrame with correct column order
            feature_df = pd.DataFrame([feature_dict])
            
            # Ensure all required columns are present, set missing to 0
            for col in self.model.named_steps['regressor'].feature_names_in_:
                if col not in feature_df.columns:
                    feature_df[col] = 0
            
            # Order columns correctly
            feature_df = feature_df[self.model.named_steps['regressor'].feature_names_in_]
            
            # Predict effectiveness
            effectiveness_score = float(self.model.predict(feature_df)[0])
            
            # Calculate confidence interval
            confidence = self._calculate_confidence(effectiveness_score, program)
            
            # Generate recommendations
            recommendations = self._generate_recommendations(effectiveness_score, program)
            
            predictions.append({
                'program_id': program.get('program_id', 'unknown'),
                'effectiveness_score': effectiveness_score,
                'confidence_interval': confidence,
                'recommendations': recommendations
            })
        
        return {
            'prediction_date': datetime.datetime.now().isoformat(),
            'predictions': predictions
        }
    
    def _predict_with_expert_rules(self, training_data: Dict[str, Any]) -> Dict[str, Any]:
        """Use expert rules to predict effectiveness when no model is available"""
        
        programs = training_data.get('programs', [])
        predictions = []
        
        for program in programs:
            # Extract key factors
            duration = program.get('training_duration', 5)  # Days
            sessions = program.get('sessions_per_week', 3)
            instructor_exp = program.get('instructor_experience', 5)  # 1-10 scale
            trainee_exp = program.get('trainee_experience', 3)  # 1-10 scale
            complexity = program.get('material_complexity', 3)  # 1-10 scale
            method = program.get('training_method', 'simulator')
            
            # Method effectiveness weights
            method_weights = {
                'classroom': 0.6,
                'simulator': 0.9,
                'aircraft': 1.0,
                'cbt': 0.7,
                'vr': 0.8
            }
            
            method_weight = method_weights.get(method, 0.7)
            
            # Calculate base effectiveness (0-10 scale)
            base_score = (
                0.3 * (duration / 10) +      # More days, better, up to a point
                0.15 * (sessions / 5) +      # More sessions per week, better, up to a point
                0.2 * (instructor_exp / 10) + # More instructor experience, better
                0.15 * (trainee_exp / 10) +  # More trainee experience, better for comprehension
                0.2 * (1 - complexity / 10)  # Less complexity, easier to learn
            ) * 10
            
            # Apply method weight
            effectiveness_score = base_score * method_weight
            
            # Ensure score is between 0-10
            effectiveness_score = max(0, min(10, effectiveness_score))
            
            # Calculate confidence
            confidence = self._calculate_confidence(effectiveness_score, program)
            
            # Generate recommendations
            recommendations = self._generate_recommendations(effectiveness_score, program)
            
            predictions.append({
                'program_id': program.get('program_id', 'unknown'),
                'effectiveness_score': float(effectiveness_score),
                'confidence_interval': confidence,
                'recommendations': recommendations,
                'model_type': 'expert_rules'
            })
        
        return {
            'prediction_date': datetime.datetime.now().isoformat(),
            'predictions': predictions
        }
    
    def _calculate_confidence(self, score: float, program: Dict[str, Any]) -> Dict[str, float]:
        """Calculate confidence interval for effectiveness prediction"""
        
        # Simplified confidence calculation - would be more sophisticated in production
        # Standard error increases for unusual combinations of parameters
        
        # Base standard error
        std_error = 0.5
        
        # Adjust based on available data quality
        data_quality = program.get('data_quality', 0.5)  # 0-1 scale
        std_error = std_error * (2 - data_quality)
        
        # Calculate 95% confidence interval
        lower_bound = max(0, score - 1.96 * std_error)
        upper_bound = min(10, score + 1.96 * std_error)
        
        return {
            'lower_bound': float(lower_bound),
            'upper_bound': float(upper_bound),
            'standard_error': float(std_error)
        }
    
    def _generate_recommendations(self, score: float, program: Dict[str, Any]) -> List[str]:
        """Generate recommendations to improve training effectiveness"""
        
        recommendations = []
        
        if score < 4:
            recommendations.append("Consider restructuring the training program")
            recommendations.append("Reduce complexity by breaking content into smaller modules")
            recommendations.append("Increase hands-on practice time")
            
            if program.get('sessions_per_week', 3) < 3:
                recommendations.append("Increase training frequency to improve retention")
            
            if program.get('instructor_experience', 5) < 5:
                recommendations.append("Assign more experienced instructors to this program")
        
        elif score < 7:
            recommendations.append("Consider adding supplementary training materials")
            
            if program.get('training_method', '') == 'classroom':
                recommendations.append("Incorporate simulator sessions for practical application")
            
            if program.get('material_complexity', 3) > 7:
                recommendations.append("Add additional preparation modules before complex topics")
        
        else:
            recommendations.append("Monitor ongoing effectiveness through regular assessments")
            recommendations.append("Document successful approaches for other training programs")
            
            # Always suggest at least one improvement
            if program.get('trainee_experience', 3) < 5:
                recommendations.append("Consider adding optional advanced modules for experienced trainees")
        
        return recommendations


# Performance Consistency Model
class PerformanceConsistencyModel:
    """Assesses performance consistency and detects anomalies"""
    
    def __init__(self):
        self.model = None
    
    def train(self, training_data: pd.DataFrame) -> None:
        """Train the performance consistency model using neural network"""
        
        # Extract features
        X = training_data.drop(['trainee_id', 'consistency_score', 'date'], axis=1, errors='ignore')
        y = training_data['consistency_score']
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Create scaler
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Build neural network model
        model = keras.Sequential([
            keras.layers.Dense(64, activation='relu', input_shape=(X_train.shape[1],)),
            keras.layers.Dropout(0.2),
            keras.layers.Dense(32, activation='relu'),
            keras.layers.Dropout(0.2),
            keras.layers.Dense(1)
        ])
        
        model.compile(optimizer='adam', loss='mse', metrics=['mae'])
        
        # Train model
        history = model.fit(
            X_train_scaled, y_train,
            epochs=100,
            batch_size=32,
            validation_split=0.2,
            verbose=0,
            callbacks=[
                keras.callbacks.EarlyStopping(patience=10, restore_best_weights=True)
            ]
        )
        
        # Evaluate model
        test_results = model.evaluate(X_test_scaled, y_test, verbose=0)
        logger.info(f"Performance consistency model trained. MSE: {test_results[0]:.4f}, MAE: {test_results[1]:.4f}")
        
        # Save model and scaler
        self.model = model
        self.scaler = scaler
        
        model.save(os.path.join(MODEL_DIR, "consistency_model"))
        
        with open(os.path.join(MODEL_DIR, "consistency_scaler.pkl"), "wb") as f:
            pickle.dump(scaler, f)
    
    def load_model(self) -> None:
        """Load a pre-trained model"""
        model_path = os.path.join(MODEL_DIR, "consistency_model")
        scaler_path = os.path.join(MODEL_DIR, "consistency_scaler.pkl")
        
        if os.path.exists(model_path) and os.path.exists(scaler_path):
            self.model = keras.models.load_model(model_path)
            
            with open(scaler_path, "rb") as f:
                self.scaler = pickle.load(f)
                
            logger.info("Loaded performance consistency model from file")
        else:
            logger.warning("No pre-trained consistency model found")
    
    def assess_consistency(self, performance_data: Dict[str, Any]) -> Dict[str, Any]:
        """Assess performance consistency for a given trainee"""
        
        # Ensure the model is loaded
        if self.model is None:
            self.load_model()
            
            # If still None, use statistical methods
            if self.model is None:
                return self._assess_with_statistics(performance_data)
        
        # Extract trainee performances
        trainees = performance_data.get('trainees', [])
        assessments = []
        
        for trainee in trainees:
            # Extract performance metrics
            metrics = trainee.get('performance_metrics', [])
            
            if not metrics:
                continue
            
            # Convert to DataFrame for easier processing
            metric_df = pd.DataFrame(metrics)
            
            # Prepare features
            feature_cols = [col for col in metric_df.columns if col not in ['date', 'session_id']]
            X = metric_df[feature_cols]
            
            # Scale features
            X_scaled = self.scaler.transform(X)
            
            # Predict consistency score
            consistency_score = float(self.model.predict(X_scaled).mean())
            
            # Detect anomalies
            anomalies = self._detect_anomalies(metric_df, feature_cols)
            
            # Calculate variance metrics
            variance_metrics = {
                col: float(metric_df[col].std()) 
                for col in feature_cols
            }
            
            assessments.append({
                'trainee_id': trainee.get('trainee_id', 'unknown'),
                'consistency_score': consistency_score,
                'variance_metrics': variance_metrics,
                'anomalies': anomalies,
                'recommendation': self._generate_consistency_recommendation(
                    consistency_score, variance_metrics, anomalies
                )
            })
        
        return {
            'assessment_date': datetime.datetime.now().isoformat(),
            'assessments': assessments
        }
    
    def _assess_with_statistics(self, performance_data: Dict[str, Any]) -> Dict[str, Any]:
        """Assess consistency using statistical methods when no model is available"""
        
        trainees = performance_data.get('trainees', [])
        assessments = []
        
        for trainee in trainees:
            # Extract performance metrics
            metrics = trainee.get('performance_metrics', [])
            
            if not metrics:
                continue
            
            # Convert to DataFrame for easier processing
            metric_df = pd.DataFrame(metrics)
            
            # Prepare features
            feature_cols = [col for col in metric_df.columns if col not in ['date', 'session_id']]
            
            if not feature_cols:
                continue
            
            # Calculate coefficient of variation for each metric
            cv_scores = {}
            for col in feature_cols:
                mean = metric_df[col].mean()
                std = metric_df[col].std()
                
                # Avoid division by zero
                if mean != 0:
                    cv = std / mean
                else:
                    cv = std  # Use std if mean is zero
                    
                cv_scores[col] = cv
            
            # Overall consistency score (0-10 scale, lower CV is better)
            # We invert and scale the average CV to get a consistency score
            avg_cv = sum(cv_scores.values()) / len(cv_scores)
            consistency_score = 10 * np.exp(-2 * avg_cv)  # Exponential transform
            
            # Detect anomalies
            anomalies = self._detect_anomalies(metric_df, feature_cols)
            
            # Calculate variance metrics
            variance_metrics = {
                col: float(metric_df[col].std()) 
                for col in feature_cols
            }
            
            assessments.append({
                'trainee_id': trainee.get('trainee_id', 'unknown'),
                'consistency_score': float(consistency_score),
                'variance_metrics': variance_metrics,
                'anomalies': anomalies,
                'recommendation': self._generate_consistency_recommendation(
                    consistency_score, variance_metrics, anomalies
                ),
                'model_type': 'statistical'
            })
        
        return {
            'assessment_date': datetime.datetime.now().isoformat(),
            'assessments': assessments
        }
    
    def _detect_anomalies(self, data: pd.DataFrame, 
                         feature_cols: List[str]) -> List[Dict[str, Any]]:
        """Detect anomalies in performance data"""
        
        anomalies = []
        
        # Simple Z-score based anomaly detection
        for col in feature_cols:
            # Calculate z-scores
            mean = data[col].mean()
            std = data[col].std()
            
            if std == 0:
                continue
                
            z_scores = (data[col] - mean) / std
            
            # Find anomalies (|z| > 2)
            anomaly_indices = np.where(np.abs(z_scores) > 2)[0]
            
            for idx in anomaly_indices:
                session_id = data.iloc[idx].get('session_id', str(idx))
                date = data.iloc[idx].get('date', 'unknown')
                value = float(data.iloc[idx][col])
                z_score = float(z_scores.iloc[idx])
                
                anomalies.append({
                    'metric': col,
                    'session_id': session_id,
                    'date': date,
                    'value': value,
                    'z_score': z_score,
                    'severity': 'high' if abs(z_score) > 3 else 'medium'
                })
        
        return anomalies
    
    def _generate_consistency_recommendation(self, consistency_score: float,
                                           variance_metrics: Dict[str, float],
                                           anomalies: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate recommendations for improving consistency"""
        
        recommendation = {
            'summary': '',
            'actions': []
        }
        
        if consistency_score < 4:
            recommendation['summary'] = "Significant performance inconsistency detected"
            recommendation['actions'].append("Review fundamentals and reinforce standard procedures")
            recommendation['actions'].append("Increase training frequency to build muscle memory")
            recommendation['actions'].append("Consider structured remedial training focused on consistency")
            
        elif consistency_score < 7:
            recommendation['summary'] = "Moderate performance inconsistency detected"
            recommendation['actions'].append("Focus training on areas with highest variance")
            recommendation['actions'].append("Practice mental preparation techniques for consistent performance")
            
        else:
            recommendation['summary'] = "Good performance consistency observed"
            recommendation['actions'].append("Maintain current practice routine")
            recommendation['actions'].append("Challenge with more complex scenarios to maintain engagement")
        
        # Add specific recommendations based on anomalies
        if anomalies:
            high_severity = [a for a in anomalies if a['severity'] == 'high']
            
            if high_severity:
                metrics = set(a['metric'] for a in high_severity)
                metrics_str = ", ".join(metrics)
                recommendation['actions'].append(
                    f"Investigate factors affecting performance in: {metrics_str}"
                )
        
        # Add specific recommendations based on high variance metrics
        if variance_metrics:
            # Find top 2 highest variance metrics
            sorted_metrics = sorted(variance_metrics.items(), key=lambda x: x[1], reverse=True)
            
            if len(sorted_metrics) > 0:
                top_metric = sorted_metrics[0][0]
                recommendation['actions'].append(
                    f"Prioritize consistency training in {top_metric}"
                )
            
            if len(sorted_metrics) > 1:
                second_metric = sorted_metrics[1][0]
                recommendation['actions'].append(
                    f"Secondary focus on improving consistency in {second_metric}"
                )
        
        return recommendation


# Syllabus Optimization Model
class SyllabusOptimizationModel:
    """Optimizes syllabus structure based on learning outcomes"""
    
    def __init__(self):
        self.model = None
    
    def train(self, training_data: pd.DataFrame) -> None:
        """Train the syllabus optimization model"""
        
        # Extract features from training data
        X = training_data.drop(['syllabus_id', 'module_id', 'effectiveness'], axis=1, errors='ignore')
        y = training_data['effectiveness']
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Create and train model
        self.model = Pipeline([
            ('scaler', StandardScaler()),
            ('regressor', GradientBoostingRegressor(n_estimators=100, random_state=42))
        ])
        
        self.model.fit(X_train, y_train)
        
        # Evaluate model
        y_pred = self.model.predict(X_test)
        mse = mean_squared_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        logger.info(f"Syllabus optimization model trained. MSE: {mse:.4f}, R²: {r2:.4f}")
        
        # Save the model
        with open(os.path.join(MODEL_DIR, "syllabus_optimization_model.pkl"), "wb") as f:
            pickle.dump(self.model, f)
    
    def load_model(self) -> None:
        """Load a pre-trained model"""
        model_path = os.path.join(MODEL_DIR, "syllabus_optimization_model.pkl")
        
        if os.path.exists(model_path):
            with open(model_path, "rb") as f:
                self.model = pickle.load(f)
            logger.info("Loaded syllabus optimization model from file")
        else:
            logger.warning("No pre-trained syllabus optimization model found")
    
    def optimize_syllabus(self, syllabus_data: Dict[str, Any]) -> Dict[str, Any]:
        """Optimize syllabus structure for improved outcomes"""
        
        # Ensure the model is loaded
        if self.model is None:
            self.load_model()
            
            # If still None, use heuristic optimization
            if self.model is None:
                return self._optimize_with_heuristics(syllabus_data)
        
        # Extract syllabus details
        syllabi = syllabus_data.get('syllabi', [])
        optimizations = []
        
        for syllabus in syllabi:
            modules = syllabus.get('modules', [])
            optimized_modules = []
            
            for module in modules:
                # Extract module features
                features = {
                    'duration': module.get('duration', 1),
                    'complexity': module.get('complexity', 5),
                    'theory_percentage': module.get('theory_percentage', 50),
                    'practical_percentage': module.get('practical_percentage', 50),
                    'position_in_syllabus': module.get('position', 0) / max(1, len(modules)),
                    'prerequisites_count': len(module.get('prerequisites', [])),
                    'assessment_count': len(module.get('assessments', []))
                }
                
                # Additional derived features
                features['theory_practical_ratio'] = features['theory_percentage'] / max(1, features['practical_percentage'])
                
                # Convert to DataFrame for prediction
                feature_df = pd.DataFrame([features])
                
                # Predict module effectiveness
                current_effectiveness = float(self.model.predict(feature_df)[0])
                
                # Try different module configurations to optimize
                optimized_config, optimized_effectiveness = self._find_optimal_configuration(
                    features, current_effectiveness, self.model
                )
                
                # Calculate percentage improvement
                improvement = (optimized_effectiveness - current_effectiveness) / max(0.01, current_effectiveness) * 100
                
                # Prepare optimization recommendations
                optimization = {
                    'module_id': module.get('id', 'unknown'),
                    'module_name': module.get('name', 'Unknown Module'),
                    'current_effectiveness': current_effectiveness,
                    'optimized_effectiveness': optimized_effectiveness,
                    'improvement_percentage': float(improvement),
                    'current_config': {k: v for k, v in features.items() if k != 'theory_practical_ratio'},
                    'recommended_config': {k: v for k, v in optimized_config.items() if k != 'theory_practical_ratio'}
                }
                
                # Add specific recommendations
                optimization['recommendations'] = self._generate_optimization_recommendations(
                    features, optimized_config
                )
                
                optimized_modules.append(optimization)
            
            # Calculate overall syllabus optimization
            current_avg_effectiveness = np.mean([m['current_effectiveness'] for m in optimized_modules])
            optimized_avg_effectiveness = np.mean([m['optimized_effectiveness'] for m in optimized_modules])
            
            # Also optimize module sequence
            reordered_sequence, sequence_effectiveness = self._optimize_module_sequence(
                modules, self.model
            )
            
            overall_improvement = (optimized_avg_effectiveness - current_avg_effectiveness) / max(0.01, current_avg_effectiveness) * 100
            
            # Sort modules by improvement potential
            sorted_modules = sorted(optimized_modules, key=lambda x: x['improvement_percentage'], reverse=True)
            
            optimizations.append({
                'syllabus_id': syllabus.get('id', 'unknown'),
                'syllabus_name': syllabus.get('name', 'Unknown Syllabus'),
                'current_effectiveness': float(current_avg_effectiveness),
                'optimized_effectiveness': float(optimized_avg_effectiveness),
                'overall_improvement': float(overall_improvement),
                'modules': sorted_modules,
                'recommended_sequence': reordered_sequence,
                'sequence_effectiveness': float(sequence_effectiveness)
            })
        
        return {
            'optimization_date': datetime.datetime.now().isoformat(),
            'optimizations': optimizations
        }
    
    def _optimize_with_heuristics(self, syllabus_data: Dict[str, Any]) -> Dict[str, Any]:
        """Use heuristic rules to optimize syllabus when no model is available"""
        
        # Extract syllabus details
        syllabi = syllabus_data.get('syllabi', [])
        optimizations = []
        
        for syllabus in syllabi:
            modules = syllabus.get('modules', [])
            optimized_modules = []
            
            for module in modules:
                # Extract module features
                features = {
                    'duration': module.get('duration', 1),
                    'complexity': module.get('complexity', 5),
                    'theory_percentage': module.get('theory_percentage', 50),
                    'practical_percentage': module.get('practical_percentage', 50),
                    'position_in_syllabus': module.get('position', 0) / max(1, len(modules)),
                    'prerequisites_count': len(module.get('prerequisites', [])),
                    'assessment_count': len(module.get('assessments', []))
                }
                
                # Estimate current effectiveness using heuristics (0-10 scale)
                theory_practical_balance = 10 - abs(features['theory_percentage'] - features['practical_percentage']) / 10
                complexity_adjustment = 10 - features['complexity']
                assessment_ratio = min(10, features['assessment_count'] * 2)
                
                current_effectiveness = (
                    0.3 * theory_practical_balance +
                    0.3 * complexity_adjustment +
                    0.4 * assessment_ratio
                )
                
                # Apply heuristic optimization rules
                optimized_config = features.copy()
                
                # Rule 1: Balance theory and practical (50/50 is ideal for most modules)
                if abs(features['theory_percentage'] - features['practical_percentage']) > 20:
                    optimized_config['theory_percentage'] = 50
                    optimized_config['practical_percentage'] = 50
                
                # Rule 2: Optimal assessment count is about 1 per hour of training
                optimal_assessments = max(1, int(features['duration']))
                
                if features['assessment_count'] < optimal_assessments:
                    optimized_config['assessment_count'] = optimal_assessments
                
                # Rule 3: Complexity should match position in syllabus
                # Earlier modules should be less complex
                optimal_complexity = features['position_in_syllabus'] * 10
                
                if features['complexity'] > optimal_complexity + 2:
                    optimized_config['complexity'] = min(9, max(1, int(optimal_complexity)))
                
                # Estimate optimized effectiveness
                optimized_theory_practical_balance = 10 - abs(optimized_config['theory_percentage'] - optimized_config['practical_percentage']) / 10
                optimized_complexity_adjustment = 10 - optimized_config['complexity']
                optimized_assessment_ratio = min(10, optimized_config['assessment_count'] * 2)
                
                optimized_effectiveness = (
                    0.3 * optimized_theory_practical_balance +
                    0.3 * optimized_complexity_adjustment +
                    0.4 * optimized_assessment_ratio
                )
                
                # Calculate improvement
                improvement = (optimized_effectiveness - current_effectiveness) / max(0.01, current_effectiveness) * 100
                
                # Prepare optimization recommendations
                optimization = {
                    'module_id': module.get('id', 'unknown'),
                    'module_name': module.get('name', 'Unknown Module'),
                    'current_effectiveness': float(current_effectiveness),
                    'optimized_effectiveness': float(optimized_effectiveness),
                    'improvement_percentage': float(improvement),
                    'current_config': features,
                    'recommended_config': optimized_config
                }
                
                # Add specific recommendations
                optimization['recommendations'] = self._generate_optimization_recommendations(
                    features, optimized_config
                )
                
                optimized_modules.append(optimization)
            
            # Calculate overall syllabus optimization
            current_avg_effectiveness = np.mean([m['current_effectiveness'] for m in optimized_modules])
            optimized_avg_effectiveness = np.mean([m['optimized_effectiveness'] for m in optimized_modules])
            
            # Optimize module sequence using prerequisites and complexity
            reordered_sequence = self._heuristic_sequence_optimization(modules)
            
            # Estimate sequence effectiveness (improvement over original)
            sequence_effectiveness = current_avg_effectiveness * 1.05  # Assume 5% improvement from reordering
            
            overall_improvement = (optimized_avg_effectiveness - current_avg_effectiveness) / max(0.01, current_avg_effectiveness) * 100
            
            # Sort modules by improvement potential
            sorted_modules = sorted(optimized_modules, key=lambda x: x['improvement_percentage'], reverse=True)
            
            optimizations.append({
                'syllabus_id': syllabus.get('id', 'unknown'),
                'syllabus_name': syllabus.get('name', 'Unknown Syllabus'),
                'current_effectiveness': float(current_avg_effectiveness),
                'optimized_effectiveness': float(optimized_avg_effectiveness),
                'overall_improvement': float(overall_improvement),
                'modules': sorted_modules,
                'recommended_sequence': reordered_sequence,
                'sequence_effectiveness': float(sequence_effectiveness),
                'model_type': 'heuristic'
            })
        
        return {
            'optimization_date': datetime.datetime.now().isoformat(),
            'optimizations': optimizations
        }
    
    def _find_optimal_configuration(self, current_features: Dict[str, float], 
                                  current_effectiveness: float,
                                  model) -> Tuple[Dict[str, float], float]:
        """Find optimal module configuration through systematic exploration"""
        
        # Start with current configuration
        best_config = current_features.copy()
        best_effectiveness = current_effectiveness
        
        # Parameters to optimize and their ranges
        param_ranges = {
            'duration': [max(0.5, current_features['duration'] - 0.5), 
                         current_features['duration'], 
                         current_features['duration'] + 0.5],
            'theory_percentage': [max(20, current_features['theory_percentage'] - 10),
                                 current_features['theory_percentage'],
                                 min(80, current_features['theory_percentage'] + 10)],
            'assessment_count': [max(1, current_features['assessment_count'] - 1),
                                current_features['assessment_count'],
                                current_features['assessment_count'] + 1]
        }
        
        # Grid search for best configuration
        for duration in param_ranges['duration']:
            for theory_pct in param_ranges['theory_percentage']:
                for assessment_count in param_ranges['assessment_count']:
                    # Create test configuration
                    test_config = current_features.copy()
                    test_config['duration'] = duration
                    test_config['theory_percentage'] = theory_pct
                    test_config['practical_percentage'] = 100 - theory_pct
                    test_config['theory_practical_ratio'] = theory_pct / max(1, 100 - theory_pct)
                    test_config['assessment_count'] = assessment_count
                    
                    # Convert to DataFrame for prediction
                    test_df = pd.DataFrame([test_config])
                    
                    # Predict effectiveness
                    effectiveness = float(model.predict(test_df)[0])
                    
                    # Update best if improvement found
                    if effectiveness > best_effectiveness:
                        best_effectiveness = effectiveness
                        best_config = test_config.copy()
        
        return best_config, best_effectiveness
    
    def _optimize_module_sequence(self, modules: List[Dict[str, Any]], 
                                model) -> Tuple[List[str], float]:
        """Optimize the sequence of modules in the syllabus"""
        
        # This would use a more sophisticated algorithm in production
        # For example, topological sort based on prerequisites and then
        # optimize within constraints using the model
        
        # Simple implementation: sort by complexity and prerequisites
        module_info = []
        
        for i, module in enumerate(modules):
            module_info.append({
                'id': module.get('id', f'module_{i}'),
                'name': module.get('name', f'Module {i}'),
                'complexity': module.get('complexity', 5),
                'prerequisites': module.get('prerequisites', []),
                'original_position': i
            })
        
        # Build dependency graph
        dependencies = {m['id']: set(m['prerequisites']) for m in module_info}
        
        # Perform topological sort
        sorted_modules = []
        visited = set()
        temp_visited = set()
        
        def visit(module_id):
            if module_id in temp_visited:
                # Cycle detected, break it
                return
            
            if module_id in visited:
                return
            
            temp_visited.add(module_id)
            
            for dependency in dependencies.get(module_id, []):
                visit(dependency)
            
            temp_visited.remove(module_id)
            visited.add(module_id)
            sorted_modules.append(module_id)
        
        # Visit all modules
        for module in module_info:
            if module['id'] not in visited:
                visit(module['id'])
        
        # Reverse to get correct order
        sorted_modules.reverse()
        
        # Estimate effectiveness of new sequence
        # This would use the actual model in production
        sequence_effectiveness = 8.0  # Placeholder
        
        # Convert IDs to names for readability
        id_to_name = {m['id']: m['name'] for m in module_info}
        named_sequence = [id_to_name.get(mid, mid) for mid in sorted_modules]
        
        return named_sequence, sequence_effectiveness
    
    def _heuristic_sequence_optimization(self, modules: List[Dict[str, Any]]) -> List[str]:
        """Optimize module sequence using prerequisites and complexity"""
        
        module_info = []
        
        for i, module in enumerate(modules):
            module_info.append({
                'id': module.get('id', f'module_{i}'),
                'name': module.get('name', f'Module {i}'),
                'complexity': module.get('complexity', 5),
                'prerequisites': module.get('prerequisites', []),
                'original_position': i
            })
        
        # Build dependency graph
        dependencies = {m['id']: set(m['prerequisites']) for m in module_info}
        
        # Perform topological sort
        sorted_modules = []
        visited = set()
        temp_visited = set()
        
        def visit(module_id):
            if module_id in temp_visited:
                # Cycle detected, break it
                return
            
            if module_id in visited:
                return
            
            temp_visited.add(module_id)
            
            for dependency in dependencies.get(module_id, []):
                visit(dependency)
            
            temp_visited.remove(module_id)
            visited.add(module_id)
            sorted_modules.append(module_id)
        
        # Visit all modules
        for module in module_info:
            if module['id'] not in visited:
                visit(module['id'])
        
        # Reverse to get correct order
        sorted_modules.reverse()
        
        # Convert IDs to names for readability
        id_to_name = {m['id']: m['name'] for m in module_info}
        named_sequence = [id_to_name.get(mid, mid) for mid in sorted_modules]
        
        return named_sequence
    
    def _generate_optimization_recommendations(self, current_config: Dict[str, Any],
                                            optimized_config: Dict[str, Any]) -> List[str]:
        """Generate specific recommendations based on configuration changes"""
        
        recommendations = []
        
        # Check duration change
        duration_change = optimized_config['duration'] - current_config['duration']
        if abs(duration_change) >= 0.5:
            if duration_change > 0:
                recommendations.append(f"Increase module duration by {duration_change:.1f} hours for better knowledge retention")
            else:
                recommendations.append(f"Decrease module duration by {abs(duration_change):.1f} hours to improve focus and engagement")
        
        # Check theory/practical balance
        theory_change = optimized_config['theory_percentage'] - current_config['theory_percentage']
        if abs(theory_change) >= 5:
            if theory_change > 0:
                recommendations.append(f"Increase theoretical content by {theory_change:.0f}% to build stronger conceptual foundation")
            else:
                recommendations.append(f"Reduce theoretical content by {abs(theory_change):.0f}% in favor of more hands-on practice")
        
        # Check assessment count
        assessment_change = optimized_config['assessment_count'] - current_config['assessment_count']
        if assessment_change != 0:
            if assessment_change > 0:
                recommendations.append(f"Add {assessment_change} additional assessment point(s) to reinforce learning")
            else:
                recommendations.append(f"Reduce assessment count by {abs(assessment_change)} to decrease evaluation pressure")
        
        # Check complexity
        complexity_change = optimized_config['complexity'] - current_config['complexity']
        if abs(complexity_change) >= 1:
            if complexity_change > 0:
                recommendations.append(f"Increase content complexity to better match learner capabilities")
            else:
                recommendations.append(f"Reduce content complexity to improve comprehension and retention")
        
        # Add general recommendation if no specific changes
        if not recommendations:
            recommendations.append("Current module configuration is near optimal")
        
        return recommendations


# Initialize models
skill_decay_model = SkillDecayModel()
fatigue_risk_model = FatigueRiskModel()
training_effectiveness_model = TrainingEffectivenessModel()
performance_consistency_model = PerformanceConsistencyModel()
syllabus_optimization_model = SyllabusOptimizationModel()

# API endpoints
@app.route("/api/predict/skill-decay", methods=["POST"])
def predict_skill_decay():
    """Predict skill decay for a trainee"""
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    try:
        result = skill_decay_model.predict_decay(data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error predicting skill decay: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/predict/fatigue-risk", methods=["POST"])
def predict_fatigue_risk():
    """Predict fatigue risk for duty schedules"""
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    try:
        result = fatigue_risk_model.predict_fatigue(data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error predicting fatigue risk: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/predict/training-effectiveness", methods=["POST"])
def predict_training_effectiveness():
    """Predict training effectiveness for a program"""
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    try:
        result = training_effectiveness_model.predict_effectiveness(data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error predicting training effectiveness: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/assess/performance-consistency", methods=["POST"])
def assess_performance_consistency():
    """Assess performance consistency for a trainee"""
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    try:
        result = performance_consistency_model.assess_consistency(data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error assessing performance consistency: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/optimize/syllabus", methods=["POST"])
def optimize_syllabus():
    """Optimize syllabus structure"""
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    try:
        result = syllabus_optimization_model.optimize_syllabus(data)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error optimizing syllabus: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/train/skill-decay", methods=["POST"])
def train_skill_decay_endpoint():
    """Train skill decay model with new data"""
    data = request.json
    if not data or 'training_data' not in data:
        return jsonify({"error": "No training data provided"}), 400
    
    try:
        # Convert to DataFrame
        df = pd.DataFrame(data['training_data'])
        skill_decay_model.train(df)
        return jsonify({"status": "success", "message": "Skill decay model trained successfully"})
    except Exception as e:
        logger.error(f"Error training skill decay model: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/train/fatigue-risk", methods=["POST"])
def train_fatigue_risk_endpoint():
    """Train fatigue risk model with new data"""
    data = request.json
    if not data or 'training_data' not in data:
        return jsonify({"error": "No training data provided"}), 400
    
    try:
        # Convert to DataFrame
        df = pd.DataFrame(data['training_data'])
        fatigue_risk_model.train(df)
        return jsonify({"status": "success", "message": "Fatigue risk model trained successfully"})
    except Exception as e:
        logger.error(f"Error training fatigue risk model: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/train/training-effectiveness", methods=["POST"])
def train_effectiveness_endpoint():
    """Train training effectiveness model with new data"""
    data = request.json
    if not data or 'training_data' not in data:
        return jsonify({"error": "No training data provided"}), 400
    
    try:
        # Convert to DataFrame
        df = pd.DataFrame(data['training_data'])
        training_effectiveness_model.train(df)
        return jsonify({"status": "success", "message": "Training effectiveness model trained successfully"})
    except Exception as e:
        logger.error(f"Error training effectiveness model: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/train/performance-consistency", methods=["POST"])
def train_consistency_endpoint():
    """Train performance consistency model with new data"""
    data = request.json
    if not data or 'training_data' not in data:
        return jsonify({"error": "No training data provided"}), 400
    
    try:
        # Convert to DataFrame
        df = pd.DataFrame(data['training_data'])
        performance_consistency_model.train(df)
        return jsonify({"status": "success", "message": "Performance consistency model trained successfully"})
    except Exception as e:
        logger.error(f"Error training consistency model: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/api/train/syllabus-optimization", methods=["POST"])
def train_syllabus_optimization_endpoint():
    """Train syllabus optimization model with new data"""
    data = request.json
    if not data or 'training_data' not in data:
        return jsonify({"error": "No training data provided"}), 400
    
    try:
        # Convert to DataFrame
        df = pd.DataFrame(data['training_data'])
        syllabus_optimization_model.train(df)
        return jsonify({"status": "success", "message": "Syllabus optimization model trained successfully"})
    except Exception as e:
        logger.error(f"Error training syllabus optimization model: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    # Try to load pre-trained models
    skill_decay_model.load_model()
    fatigue_risk_model.load_model()
    training_effectiveness_model.load_model()
    performance_consistency_model.load_model()
    syllabus_optimization_model.load_model()
    
    # Starting the Flask application
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port)
