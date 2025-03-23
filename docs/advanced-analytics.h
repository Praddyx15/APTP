// /analytics/controllers/PredictiveAnalyticsController.h
#pragma once

#include <drogon/HttpController.h>
#include "../services/SkillDecayPredictionService.h"
#include "../services/FatigueRiskModelingService.h"
#include "../services/PerformanceConsistencyService.h"
#include "../services/TrainingEffectivenessService.h"

namespace analytics {

class PredictiveAnalyticsController : public drogon::HttpController<PredictiveAnalyticsController> {
public:
    PredictiveAnalyticsController();
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(PredictiveAnalyticsController::predictSkillDecay, "/api/analytics/predict-skill-decay", drogon::Post);
    ADD_METHOD_TO(PredictiveAnalyticsController::modelFatigueRisk, "/api/analytics/model-fatigue-risk", drogon::Post);
    ADD_METHOD_TO(PredictiveAnalyticsController::assessPerformanceConsistency, "/api/analytics/assess-consistency", drogon::Post);
    ADD_METHOD_TO(PredictiveAnalyticsController::forecastTrainingEffectiveness, "/api/analytics/forecast-effectiveness", drogon::Post);
    ADD_METHOD_TO(PredictiveAnalyticsController::generateEarlyInterventions, "/api/analytics/early-interventions", drogon::Post);
    METHOD_LIST_END

private:
    void predictSkillDecay(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void modelFatigueRisk(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void assessPerformanceConsistency(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void forecastTrainingEffectiveness(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void generateEarlyInterventions(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);

    std::shared_ptr<SkillDecayPredictionService> skillDecayService_;
    std::shared_ptr<FatigueRiskModelingService> fatigueRiskService_;
    std::shared_ptr<PerformanceConsistencyService> performanceConsistencyService_;
    std::shared_ptr<TrainingEffectivenessService> trainingEffectivenessService_;
};

} // namespace analytics

// /analytics/controllers/PredictiveAnalyticsController.cc
#include "PredictiveAnalyticsController.h"
#include <drogon/HttpResponse.h>
#include <json/json.h>

using namespace analytics;

PredictiveAnalyticsController::PredictiveAnalyticsController()
    : skillDecayService_(std::make_shared<SkillDecayPredictionService>()),
      fatigueRiskService_(std::make_shared<FatigueRiskModelingService>()),
      performanceConsistencyService_(std::make_shared<PerformanceConsistencyService>()),
      trainingEffectivenessService_(std::make_shared<TrainingEffectivenessService>()) {}

void PredictiveAnalyticsController::predictSkillDecay(const drogon::HttpRequestPtr& req, 
                                                    std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::HttpStatusCode::k400BadRequest);
        resp->setContentTypeCode(drogon::ContentType::CT_APPLICATION_JSON);
        Json::Value error;
        error["error"] = "Invalid JSON";
        resp->setBody(error.toStyledString());
        callback(resp);
        return;
    }

    try {
        std::string pilotId = (*json)["pilotId"].asString();
        std::string skillId = (*json)["skillId"].asString();
        int daysElapsed = (*json)["daysElapsed"].asInt();
        
        // Predict skill decay
        auto result = skillDecayService_->predictSkillDecay(pilotId, skillId, daysElapsed);
        
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::HttpStatusCode::k200OK);
        resp->setContentTypeCode(drogon::ContentType::CT_APPLICATION_JSON);
        resp->setBody(result.toStyledString());
        callback(resp);
    } catch (const std::exception& e) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::HttpStatusCode::k500InternalServerError);
        resp->setContentTypeCode(drogon::ContentType::CT_APPLICATION_JSON);
        Json::Value error;
        error["error"] = e.what();
        resp->setBody(error.toStyledString());
        callback(resp);
    }
}

void PredictiveAnalyticsController::modelFatigueRisk(const drogon::HttpRequestPtr& req, 
                                                  std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::HttpStatusCode::k400BadRequest);
        resp->setContentTypeCode(drogon::ContentType::CT_APPLICATION_JSON);
        Json::Value error;
        error["error"] = "Invalid JSON";
        resp->setBody(error.toStyledString());
        callback(resp);
        return;
    }

    try {
        std::string pilotId = (*json)["pilotId"].asString();
        Json::Value dutySchedule = (*json)["dutySchedule"];
        
        // Model fatigue risk
        auto result = fatigueRiskService_->modelFatigueRisk(pilotId, dutySchedule);
        
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::HttpStatusCode::k200OK);
        resp->setContentTypeCode(drogon::ContentType::CT_APPLICATION_JSON);
        resp->setBody(result.toStyledString());
        callback(resp);
    } catch (const std::exception& e) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::HttpStatusCode::k500InternalServerError);
        resp->setContentTypeCode(drogon::ContentType::CT_APPLICATION_JSON);
        Json::Value error;
        error["error"] = e.what();
        resp->setBody(error.toStyledString());
        callback(resp);
    }
}

// Implementation of other controller methods omitted for brevity...

// /analytics/controllers/AdaptiveLearningController.h
#pragma once

#include <drogon/HttpController.h>
#include "../services/SyllabusOptimizationService.h"
#include "../services/PerformanceMetricsService.h"
#include "../services/InterventionRecommendationService.h"

namespace analytics {

class AdaptiveLearningController : public drogon::HttpController<AdaptiveLearningController> {
public:
    AdaptiveLearningController();
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(AdaptiveLearningController::optimizeSyllabus, "/api/adaptive/optimize-syllabus", drogon::Post);
    ADD_METHOD_TO(AdaptiveLearningController::trackPerformanceMetrics, "/api/adaptive/track-metrics", drogon::Post);
    ADD_METHOD_TO(AdaptiveLearningController::getPerformanceMetrics, "/api/adaptive/metrics/{pilotId}", drogon::Get);
    ADD_METHOD_TO(AdaptiveLearningController::generateInterventionRecommendations, "/api/adaptive/intervention-recommendations", drogon::Post);
    METHOD_LIST_END

private:
    void optimizeSyllabus(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void trackPerformanceMetrics(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void getPerformanceMetrics(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback, const std::string& pilotId);
    void generateInterventionRecommendations(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);

    std::shared_ptr<SyllabusOptimizationService> syllabusOptimizationService_;
    std::shared_ptr<PerformanceMetricsService> performanceMetricsService_;
    std::shared_ptr<InterventionRecommendationService> interventionRecommendationService_;
};

} // namespace analytics

// /analytics/services/SkillDecayPredictionService.h
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <json/json.h>
#include "../models/SkillDecayModel.h"
#include "../models/PilotPerformanceHistory.h"
#include "../models/SkillProfile.h"

namespace analytics {

class SkillDecayPredictionService {
public:
    SkillDecayPredictionService();
    ~SkillDecayPredictionService();

    // Predict skill decay for a pilot's specific skill
    Json::Value predictSkillDecay(const std::string& pilotId, const std::string& skillId, int daysElapsed);
    
    // Predict skill decay for all of a pilot's skills
    Json::Value predictAllSkillsDecay(const std::string& pilotId, int daysElapsed);
    
    // Generate personalized practice recommendations to mitigate decay
    Json::Value generatePracticeRecommendations(const std::string& pilotId, const Json::Value& decayPredictions);
    
    // Update decay model with new performance data
    void updateDecayModel(const std::string& pilotId, const std::string& skillId, double performance);
    
    // Build a new decay model for a pilot's skill
    SkillDecayModel buildDecayModel(const std::string& pilotId, const std::string& skillId);

private:
    // Load pilot's performance history
    PilotPerformanceHistory loadPerformanceHistory(const std::string& pilotId);
    
    // Extract performance data for a specific skill
    std::vector<std::pair<int, double>> extractSkillPerformance(const PilotPerformanceHistory& history, const std::string& skillId);
    
    // Apply Bayesian Knowledge Tracing algorithm
    double applyBayesianKnowledgeTracing(const std::vector<std::pair<int, double>>& performances, int daysElapsed);
    
    // Calculate forgetting curve parameters
    std::pair<double, double> calculateForgettingCurveParams(const std::vector<std::pair<int, double>>& performances);
    
    // Storage for decay models
    std::unordered_map<std::string, std::unordered_map<std::string, SkillDecayModel>> pilotSkillModels_;
};

} // namespace analytics

// /analytics/services/FatigueRiskModelingService.h
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <json/json.h>
#include "../models/FatigueModel.h"
#include "../models/DutyPeriod.h"
#include "../models/CircadianRhythm.h"

namespace analytics {

class FatigueRiskModelingService {
public:
    FatigueRiskModelingService();
    ~FatigueRiskModelingService();

    // Model fatigue risk based on duty schedule
    Json::Value modelFatigueRisk(const std::string& pilotId, const Json::Value& dutySchedule);
    
    // Calculate fatigue score for a specific time
    double calculateFatigueScore(const std::string& pilotId, const std::time_t& timestamp, const std::vector<DutyPeriod>& dutyHistory);
    
    // Generate duty schedule optimization recommendations
    Json::Value optimizeDutySchedule(const std::string& pilotId, const Json::Value& dutySchedule);
    
    // Assess impact of fatigue on performance
    Json::Value assessFatiguePerformanceImpact(const std::string& pilotId, double fatigueScore);
    
    // Update fatigue model with new sleep and duty data
    void updateFatigueModel(const std::string& pilotId, const Json::Value& sleepData, const Json::Value& dutyData);

private:
    // Parse duty schedule from JSON
    std::vector<DutyPeriod> parseDutySchedule(const Json::Value& dutySchedule);
    
    // Load pilot's circadian rhythm profile
    CircadianRhythm loadCircadianProfile(const std::string& pilotId);
    
    // Calculate sleep debt based on sleep and duty history
    double calculateSleepDebt(const std::vector<DutyPeriod>& dutyHistory, const Json::Value& sleepData);
    
    // Apply Three-Process Model of alertness
    double applyThreeProcessModel(const CircadianRhythm& rhythm, double sleepDebt, const std::time_t& timestamp);
    
    // Storage for fatigue models
    std::unordered_map<std::string, FatigueModel> pilotFatigueModels_;
};

} // namespace analytics

// /analytics/services/SyllabusOptimizationService.h
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <json/json.h>
#include "../models/LearningPathModel.h"
#include "../models/TrainingOutcome.h"
#include "../models/SyllabusOptimization.h"

namespace analytics {

class SyllabusOptimizationService {
public:
    SyllabusOptimizationService();
    ~SyllabusOptimizationService();

    // Optimize syllabus based on outcome analysis
    Json::Value optimizeSyllabus(const std::string& syllabusId, const std::string& targetGroup = "");
    
    // Generate personalized learning path for a trainee
    Json::Value generatePersonalizedPath(const std::string& syllabusId, const std::string& traineeId);
    
    // Analyze training outcomes for syllabus effectiveness
    Json::Value analyzeTrainingOutcomes(const std::string& syllabusId, const std::vector<std::string>& trainingRecordIds);
    
    // Identify potential syllabus bottlenecks
    Json::Value identifySyllabusBottlenecks(const std::string& syllabusId);
    
    // Suggest content reordering for improved learning
    Json::Value suggestContentReordering(const std::string& syllabusId);

private:
    // Load training outcomes for analysis
    std::vector<TrainingOutcome> loadTrainingOutcomes(const std::vector<std::string>& trainingRecordIds);
    
    // Build learning path model using machine learning
    LearningPathModel buildLearningPathModel(const std::vector<TrainingOutcome>& outcomes);
    
    // Apply multivariate regression for effectiveness prediction
    Json::Value applyMultivariateRegression(const std::vector<TrainingOutcome>& outcomes);
    
    // Generate optimization recommendations
    SyllabusOptimization generateOptimizationRecommendations(const std::string& syllabusId, const Json::Value& analysisResults);
    
    // Apply reinforcement learning for path optimization
    Json::Value applyReinforcementLearning(const std::string& syllabusId, const std::string& traineeId);
    
    // Storage for learning path models
    std::unordered_map<std::string, LearningPathModel> syllabusPathModels_;
};

} // namespace analytics

// /analytics/services/PerformanceMetricsService.h
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <json/json.h>
#include "../models/PerformanceMetric.h"
#include "../models/MetricThreshold.h"
#include "../models/AlertConfiguration.h"

namespace analytics {

class PerformanceMetricsService {
public:
    PerformanceMetricsService();
    ~PerformanceMetricsService();

    // Track real-time performance metrics
    Json::Value trackPerformanceMetrics(const std::string& sessionId, const Json::Value& metrics);
    
    // Get performance metrics for a pilot
    Json::Value getPerformanceMetrics(const std::string& pilotId, const std::string& timeRange = "all");
    
    // Define alert thresholds for metrics
    void defineAlertThresholds(const std::string& metricType, const MetricThreshold& threshold);
    
    // Configure alerting parameters
    void configureAlerts(const std::string& targetId, const AlertConfiguration& config);
    
    // Check for threshold violations
    Json::Value checkThresholdViolations(const std::string& pilotId, const Json::Value& currentMetrics);
    
    // Generate metrics visualization data
    Json::Value generateVisualizationData(const std::string& pilotId, const std::string& metricType, const std::string& timeRange);

private:
    // Parse metrics from JSON
    std::vector<PerformanceMetric> parseMetrics(const Json::Value& metricsJson);
    
    // Process reaction time metrics
    Json::Value processReactionTimeMetrics(const std::string& sessionId, const Json::Value& metrics);
    
    // Process cognitive workload metrics
    Json::Value processCognitiveWorkloadMetrics(const std::string& sessionId, const Json::Value& metrics);
    
    // Process procedural compliance metrics
    Json::Value processProceduralComplianceMetrics(const std::string& sessionId, const Json::Value& metrics);
    
    // Process technical accuracy metrics
    Json::Value processTechnicalAccuracyMetrics(const std::string& sessionId, const Json::Value& metrics);
    
    // Apply moving average smoothing to metrics
    std::vector<double> applyMovingAverage(const std::vector<double>& values, int windowSize);
    
    // Detect anomalies in metric streams
    std::vector<int> detectAnomalies(const std::vector<double>& values, double zThreshold = 3.0);
    
    // Storage for metric thresholds
    std::unordered_map<std::string, MetricThreshold> metricThresholds_;
    
    // Storage for alert configurations
    std::unordered_map<std::string, AlertConfiguration> alertConfigurations_;
};

} // namespace analytics

// Python ML component for skill decay prediction
// /analytics/ml/skill_decay_predictor.py
import os
import json
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Any
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import BayesianRidge
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset

class SkillDecayPredictor:
    def __init__(self, model_path: str = "skill_decay_models"):
        self.model_path = model_path
        self.models = {}
        
        # Create model directory if it doesn't exist
        os.makedirs(model_path, exist_ok=True)
        
        # Load existing models
        self._load_models()
    
    def _load_models(self):
        """
        Load existing skill decay models
        """
        try:
            model_files = [f for f in os.listdir(self.model_path) if f.endswith('.json')]
            for model_file in model_files:
                with open(os.path.join(self.model_path, model_file), 'r') as f:
                    model_data = json.load(f)
                    pilot_id = model_data.get('pilot_id')
                    skill_id = model_data.get('skill_id')
                    
                    if pilot_id and skill_id:
                        if pilot_id not in self.models:
                            self.models[pilot_id] = {}
                        
                        self.models[pilot_id][skill_id] = model_data
        except Exception as e:
            print(f"Error loading models: {e}")
    
    def predict_skill_decay(self, pilot_id: str, skill_id: str, days_elapsed: int) -> Dict[str, Any]:
        """
        Predict skill decay for a specific pilot's skill
        """
        # Check if we have a model for this pilot and skill
        if pilot_id in self.models and skill_id in self.models[pilot_id]:
            model = self.models[pilot_id][skill_id]
            
            # Extract model parameters
            model_type = model.get('model_type', 'ebbinghaus')
            
            if model_type == 'ebbinghaus':
                # Apply Ebbinghaus forgetting curve model
                initial_strength = model.get('initial_strength', 1.0)
                decay_rate = model.get('decay_rate', 0.05)
                
                # R = e^(-t/S) where R is retention, t is time, and S is strength of memory
                retention = initial_strength * np.exp(-decay_rate * days_elapsed)
                
                # Ensure retention is between 0 and 1
                retention = max(0.0, min(1.0, retention))
                
                return {
                    'pilot_id': pilot_id,
                    'skill_id': skill_id,
                    'days_elapsed': days_elapsed,
                    'retention': float(retention),
                    'decay': 1.0 - float(retention),
                    'model_type': model_type,
                    'confidence': model.get('confidence', 0.85)
                }
            
            elif model_type == 'bkt':
                # Apply Bayesian Knowledge Tracing
                # BKT parameters
                p_known = model.get('p_known', 0.5)  # Probability of skill being known
                p_transit = model.get('p_transit', 0.1)  # Probability of learning
                p_forget = model.get('p_forget', 0.01)  # Probability of forgetting per day
                
                # Apply forgetting over time
                for _ in range(days_elapsed):
                    p_known = p_known * (1 - p_forget) + (1 - p_known) * p_transit
                
                return {
                    'pilot_id': pilot_id,
                    'skill_id': skill_id,
                    'days_elapsed': days_elapsed,
                    'retention': float(p_known),
                    'decay': 1.0 - float(p_known),
                    'model_type': model_type,
                    'confidence': model.get('confidence', 0.8)
                }
            
            elif model_type == 'neural_network':
                # Use a neural network model for more complex decay patterns
                # This would normally load a trained PyTorch or TensorFlow model
                # For simplicity, we're using a dummy prediction here
                
                # Factors that would typically influence the prediction
                recency_factor = np.exp(-0.01 * days_elapsed)
                frequency_factor = model.get('practice_frequency', 0.5)
                proficiency_factor = model.get('proficiency_level', 0.8)
                
                # Combined prediction (this would be more sophisticated in reality)
                retention = recency_factor * (0.6 + 0.4 * frequency_factor * proficiency_factor)
                
                return {
                    'pilot_id': pilot_id,
                    'skill_id': skill_id,
                    'days_elapsed': days_elapsed,
                    'retention': float(retention),
                    'decay': 1.0 - float(retention),
                    'model_type': model_type,
                    'confidence': model.get('confidence', 0.9)
                }
            
            else:
                # Default to a simple linear decay model
                days_to_zero = model.get('days_to_zero', 180)
                retention = max(0.0, 1.0 - (days_elapsed / days_to_zero))
                
                return {
                    'pilot_id': pilot_id,
                    'skill_id': skill_id,
                    'days_elapsed': days_elapsed,
                    'retention': float(retention),
                    'decay': 1.0 - float(retention),
                    'model_type': 'linear',
                    'confidence': 0.7
                }
        
        # If no model exists, use a default model
        return self._default_prediction(pilot_id, skill_id, days_elapsed)
    
    def _default_prediction(self, pilot_id: str, skill_id: str, days_elapsed: int) -> Dict[str, Any]:
        """
        Generate a default prediction when no model exists
        """
        # Default Ebbinghaus model parameters
        initial_strength = 1.0
        decay_rate = 0.05
        
        # R = e^(-t/S) where R is retention
        retention = initial_strength * np.exp(-decay_rate * days_elapsed)
        
        # Ensure retention is between 0 and 1
        retention = max(0.0, min(1.0, retention))
        
        return {
            'pilot_id': pilot_id,
            'skill_id': skill_id,
            'days_elapsed': days_elapsed,
            'retention': float(retention),
            'decay': 1.0 - float(retention),
            'model_type': 'ebbinghaus_default',
            'confidence': 0.6,
            'note': 'Default model used - no personalized model available'
        }
    
    def build_decay_model(self, pilot_id: str, skill_id: str, performance_history: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Build a skill decay model for a pilot's skill based on performance history
        """
        if not performance_history:
            return self._create_default_model(pilot_id, skill_id)
        
        # Extract data from performance history
        timestamps = []
        performances = []
        
        for entry in performance_history:
            timestamp = entry.get('timestamp')
            if not timestamp:
                continue
                
            # Convert timestamp to datetime if it's a string
            if isinstance(timestamp, str):
                timestamp = datetime.fromisoformat(timestamp)
            
            performance = entry.get('performance', 0.0)
            timestamps.append(timestamp)
            performances.append(performance)
        
        if not timestamps:
            return self._create_default_model(pilot_id, skill_id)
        
        # Calculate days since first performance for each entry
        first_timestamp = min(timestamps)
        days_elapsed = [(ts - first_timestamp).days for ts in timestamps]
        
        # Determine best model based on data
        if len(performances) >= 10:
            # Enough data for neural network
            model = self._build_neural_network_model(pilot_id, skill_id, days_elapsed, performances)
        elif len(performances) >= 5:
            # Use Bayesian Knowledge Tracing
            model = self._build_bkt_model(pilot_id, skill_id, days_elapsed, performances)
        else:
            # Use simple Ebbinghaus model
            model = self._build_ebbinghaus_model(pilot_id, skill_id, days_elapsed, performances)
        
        # Save the model
        with open(os.path.join(self.model_path, f"{pilot_id}_{skill_id}_model.json"), 'w') as f:
            json.dump(model, f, indent=2)
        
        # Update models dictionary
        if pilot_id not in self.models:
            self.models[pilot_id] = {}
        
        self.models[pilot_id][skill_id] = model
        
        return model
    
    def _create_default_model(self, pilot_id: str, skill_id: str) -> Dict[str, Any]:
        """
        Create a default model when no performance history exists
        """
        model = {
            'pilot_id': pilot_id,
            'skill_id': skill_id,
            'model_type': 'ebbinghaus',
            'initial_strength': 1.0,
            'decay_rate': 0.05,
            'confidence': 0.6,
            'created_at': datetime.now().isoformat(),
            'note': 'Default model created due to insufficient performance history'
        }
        
        return model
    
    def _build_ebbinghaus_model(self, pilot_id: str, skill_id: str, days_elapsed: List[int], performances: List[float]) -> Dict[str, Any]:
        """
        Build an Ebbinghaus forgetting curve model
        """
        # Normalize performances to 0-1 range if needed
        max_perf = max(performances)
        if max_perf > 1.0:
            performances = [p / max_perf for p in performances]
        
        # Fit exponential decay model
        # R = a * e^(-b*t)
        # Take natural log of both sides: ln(R) = ln(a) - b*t
        
        # Handle zero or negative performances for log transform
        log_performances = []
        valid_days = []
        
        for i, perf in enumerate(performances):
            if perf > 0:
                log_performances.append(np.log(perf))
                valid_days.append(days_elapsed[i])
        
        if not log_performances:
            return self._create_default_model(pilot_id, skill_id)
        
        # Fit linear regression on log-transformed data
        X = np.array(valid_days).reshape(-1, 1)
        y = np.array(log_performances)
        
        model = BayesianRidge()
        model.fit(X, y)
        
        # Extract parameters
        intercept = model.coef_[0]
        slope = -model.intercept_  # Note the sign reversal due to our formulation
        
        # Convert to Ebbinghaus parameters
        initial_strength = np.exp(intercept)
        decay_rate = -slope  # Decay rate should be positive
        
        # Ensure parameters are in reasonable ranges
        initial_strength = max(0.1, min(1.0, initial_strength))
        decay_rate = max(0.001, min(0.2, decay_rate))
        
        # Calculate confidence based on model score
        confidence = max(0.6, min(0.9, model.score(X, y) + 0.6))
        
        return {
            'pilot_id': pilot_id,
            'skill_id': skill_id,
            'model_type': 'ebbinghaus',
            'initial_strength': float(initial_strength),
            'decay_rate': float(decay_rate),
            'confidence': float(confidence),
            'created_at': datetime.now().isoformat(),
            'data_points': len(performances)
        }
    
    def _build_bkt_model(self, pilot_id: str, skill_id: str, days_elapsed: List[int], performances: List[float]) -> Dict[str, Any]:
        """
        Build a Bayesian Knowledge Tracing model
        """
        # Convert continuous performances to binary (mastered/not mastered)
        # Threshold of 0.8 (80%) is commonly used to indicate mastery
        mastery_threshold = 0.8
        binary_performances = [1 if p >= mastery_threshold else 0 for p in performances]
        
        # Initial BKT parameters
        p_known = 0.5  # Initial probability of skill being known
        p_transit = 0.1  # Probability of learning
        p_forget = 0.01  # Probability of forgetting per day
        p_slip = 0.1  # Probability of making a mistake despite knowing
        p_guess = 0.2  # Probability of getting it right despite not knowing
        
        # Optimize parameters using Expectation-Maximization
        # This is a simplified implementation - a real BKT would use proper EM
        for _ in range(10):  # 10 iterations of optimization
            # E-step: calculate p_known at each step
            p_knowns = []
            current_p_known = p_known
            
            for i in range(len(binary_performances)):
                # Update based on days elapsed since last measurement
                days_since_last = days_elapsed[i] - (days_elapsed[i-1] if i > 0 else 0)
                for _ in range(days_since_last):
                    current_p_known = current_p_known * (1 - p_forget) + (1 - current_p_known) * p_transit
                
                # Update based on observation
                if binary_performances[i] == 1:
                    # Correct response
                    p_evidence = current_p_known * (1 - p_slip) + (1 - current_p_known) * p_guess
                    p_knowns.append(current_p_known * (1 - p_slip) / p_evidence)
                else:
                    # Incorrect response
                    p_evidence = current_p_known * p_slip + (1 - current_p_known) * (1 - p_guess)
                    p_knowns.append(current_p_known * p_slip / p_evidence)
                
                # Update current_p_known for next iteration
                current_p_known = p_knowns[-1]
            
            # M-step: update parameters
            # In a real implementation, this would be more sophisticated
            p_known = np.mean(p_knowns)
            p_slip = 0.1  # Simplified - would normally be optimized
            p_guess = 0.2  # Simplified - would normally be optimized
            
            # Estimate p_forget based on performance degradation over time
            if len(p_knowns) > 1:
                # Look at decreases in p_known over time
                decreases = []
                for i in range(1, len(p_knowns)):
                    if p_knowns[i] < p_knowns[i-1]:
                        days_diff = days_elapsed[i] - days_elapsed[i-1]
                        if days_diff > 0:
                            decreases.append((p_knowns[i-1] - p_knowns[i]) / days_diff)
                
                if decreases:
                    p_forget = min(0.05, max(0.001, np.mean(decreases)))
                else:
                    p_forget = 0.01
        
        # Calculate confidence based on data points and consistency
        confidence = min(0.9, 0.6 + 0.05 * len(performances))
        
        return {
            'pilot_id': pilot_id,
            'skill_id': skill_id,
            'model_type': 'bkt',
            'p_known': float(p_known),
            'p_transit': float(p_transit),
            'p_forget': float(p_forget),
            'p_slip': float(p_slip),
            'p_guess': float(p_guess),
            'confidence': float(confidence),
            'created_at': datetime.now().isoformat(),
            'data_points': len(performances)
        }
    
    def _build_neural_network_model(self, pilot_id: str, skill_id: str, days_elapsed: List[int], performances: List[float]) -> Dict[str, Any]:
        """
        Build a neural network model for complex decay patterns
        This is a simplified implementation - a real model would be more sophisticated
        """
        # Normalize inputs and outputs
        X = np.array(days_elapsed).reshape(-1, 1)
        y = np.array(performances).reshape(-1, 1)
        
        scaler_X = StandardScaler()
        scaler_y = StandardScaler()
        
        X_scaled = scaler_X.fit_transform(X)
        y_scaled = scaler_y.fit_transform(y)
        
        # Convert to PyTorch tensors
        X_tensor = torch.FloatTensor(X_scaled)
        y_tensor = torch.FloatTensor(y_scaled)
        
        # Create dataset and dataloader
        dataset = TensorDataset(X_tensor, y_tensor)
        dataloader = DataLoader(dataset, batch_size=min(8, len(X)), shuffle=True)
        
        # Define a simple neural network
        class SkillDecayNN(nn.Module):
            def __init__(self):
                super(SkillDecayNN, self).__init__()
                self.fc1 = nn.Linear(1, 10)
                self.fc2 = nn.Linear(10, 10)
                self.fc3 = nn.Linear(10, 1)
                self.relu = nn.ReLU()
                self.sigmoid = nn.Sigmoid()
            
            def forward(self, x):
                x = self.relu(self.fc1(x))
                x = self.relu(self.fc2(x))
                x = self.fc3(x)
                return x
        
        # Initialize model, loss function, and optimizer
        nn_model = SkillDecayNN()
        criterion = nn.MSELoss()
        optimizer = optim.Adam(nn_model.parameters(), lr=0.01)
        
        # Train the model
        epochs = 500
        losses = []
        
        for epoch in range(epochs):
            epoch_loss = 0.0
            for inputs, targets in dataloader:
                optimizer.zero_grad()
                outputs = nn_model(inputs)
                loss = criterion(outputs, targets)
                loss.backward()
                optimizer.step()
                epoch_loss += loss.item()
            
            losses.append(epoch_loss)
            
            # Early stopping based on convergence
            if epoch > 10 and abs(losses[-1] - losses[-2]) < 1e-4:
                break
        
        # Evaluate the model
        nn_model.eval()
        with torch.no_grad():
            predictions = nn_model(X_tensor)
            predictions = scaler_y.inverse_transform(predictions.numpy())
            mse = np.mean((predictions - y) ** 2)
            r2 = 1 - (np.sum((y - predictions) ** 2) / np.sum((y - np.mean(y)) ** 2))
        
        # Calculate confidence based on R² score
        confidence = min(0.95, max(0.7, r2 + 0.7))
        
        # Extract parameters (simplified)
        # In a real implementation, we would save the full model
        
        # Compute practice frequency
        if len(days_elapsed) > 1:
            intervals = [days_elapsed[i] - days_elapsed[i-1] for i in range(1, len(days_elapsed))]
            practice_frequency = 1.0 / (np.mean(intervals) if intervals else 30)
            practice_frequency = min(1.0, max(0.0, practice_frequency))
        else:
            practice_frequency = 0.5
        
        # Compute proficiency level
        proficiency_level = np.mean(performances)
        
        return {
            'pilot_id': pilot_id,
            'skill_id': skill_id,
            'model_type': 'neural_network',
            'r2_score': float(r2),
            'mse': float(mse),
            'practice_frequency': float(practice_frequency),
            'proficiency_level': float(proficiency_level),
            'confidence': float(confidence),
            'created_at': datetime.now().isoformat(),
            'data_points': len(performances)
        }
    
    def generate_practice_recommendations(self, pilot_id: str, decay_predictions: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate personalized practice recommendations to mitigate skill decay
        """
        recommendations = {
            'pilot_id': pilot_id,
            'timestamp': datetime.now().isoformat(),
            'skill_recommendations': []
        }
        
        # Process each skill in the decay predictions
        for skill_id, prediction in decay_predictions.items():
            decay = prediction.get('decay', 0.0)
            
            if decay < 0.2:
                priority = 'low'
                interval_days = 60
            elif decay < 0.5:
                priority = 'medium'
                interval_days = 30
            else:
                priority = 'high'
                interval_days = 14
            
            # Personalized recommendation
            skill_rec = {
                'skill_id': skill_id,
                'decay': decay,
                'priority': priority,
                'recommended_interval_days': interval_days,
                'recommended_practice_methods': self._get_practice_methods(skill_id, decay)
            }
            
            recommendations['skill_recommendations'].append(skill_rec)
        
        # Sort recommendations by priority
        recommendations['skill_recommendations'].sort(
            key=lambda x: {'high': 0, 'medium': 1, 'low': 2}[x['priority']]
        )
        
        return recommendations
    
    def _get_practice_methods(self, skill_id: str, decay: float) -> List[Dict[str, Any]]:
        """
        Get appropriate practice methods for a given skill and decay level
        """
        # This would normally be based on a database of skill-specific practice methods
        # Simplified implementation here
        methods = []
        
        # Basic practice method categories
        if decay < 0.3:
            # Light refresher
            methods.append({
                'type': 'theoretical_review',
                'description': 'Review procedures and checklists related to this skill',
                'duration_minutes': 30
            })
        elif decay < 0.6:
            # Moderate practice
            methods.append({
                'type': 'simulation_exercise',
                'description': 'Complete targeted simulation exercises focusing on this skill',
                'duration_minutes': 60
            })
        else:
            # Intensive refresher
            methods.append({
                'type': 'instructor_session',
                'description': 'Schedule a dedicated session with an instructor to rebuild proficiency',
                'duration_minutes': 120
            })
        
        return methods

# /analytics/ml/syllabus_optimizer.py
import os
import json
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from scipy.stats import pearsonr

class SyllabusOptimizer:
    def __init__(self, data_path: str = "training_outcomes"):
        self.data_path = data_path
        
        # Create data directory if it doesn't exist
        os.makedirs(data_path, exist_ok=True)
    
    def optimize_syllabus(self, syllabus_id: str, training_outcomes: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Optimize a syllabus based on training outcomes analysis
        """
        if not training_outcomes:
            return {
                'syllabus_id': syllabus_id,
                'status': 'error',
                'message': 'No training outcomes provided for analysis'
            }
        
        # Convert training outcomes to DataFrame for analysis
        outcomes_df = self._prepare_training_data(training_outcomes)
        
        # Analyze module effectiveness
        module_effectiveness = self._analyze_module_effectiveness(outcomes_df)
        
        # Analyze module order impacts
        order_impact = self._analyze_module_order_impact(outcomes_df)
        
        # Analyze time allocation efficiency
        time_efficiency = self._analyze_time_allocation(outcomes_df)
        
        # Identify bottlenecks
        bottlenecks = self._identify_bottlenecks(outcomes_df)
        
        # Generate optimization recommendations
        recommendations = self._generate_recommendations(
            syllabus_id,
            module_effectiveness,
            order_impact,
            time_efficiency,
            bottlenecks
        )
        
        return {
            'syllabus_id': syllabus_id,
            'timestamp': pd.Timestamp.now().isoformat(),
            'analysis_coverage': len(outcomes_df) / max(1, outcomes_df['trainee_id'].nunique()),
            'module_effectiveness': module_effectiveness,
            'order_impact': order_impact,
            'time_efficiency': time_efficiency,
            'bottlenecks': bottlenecks,
            'recommendations': recommendations
        }
    
    def _prepare_training_data(self, training_outcomes: List[Dict[str, Any]]) -> pd.DataFrame:
        """
        Convert training outcomes to a structured DataFrame
        """
        # Extract relevant fields for analysis
        data = []
        
        for outcome in training_outcomes:
            trainee_id = outcome.get('trainee_id')
            if not trainee_id:
                continue
                
            modules = outcome.get('modules', [])
            for module in modules:
                module_id = module.get('module_id')
                if not module_id:
                    continue
                
                # Extract module performance data
                entry = {
                    'trainee_id': trainee_id,
                    'module_id': module_id,
                    'module_order': module.get('order', 0),
                    'score': module.get('score', 0.0),
                    'completion_time': module.get('completion_time', 0),
                    'attempts': module.get('attempts', 1),
                    'passed': module.get('passed', False),
                    'difficulty_rating': module.get('difficulty_rating', 3.0),
                    'instructor_id': module.get('instructor_id', ''),
                    'timestamp': module.get('timestamp', '')
                }
                
                data.append(entry)
        
        # Convert to DataFrame
        df = pd.DataFrame(data)
        
        # Add sequential module indicators
        if not df.empty:
            df['seq_num'] = df.groupby('trainee_id')['timestamp'].rank(method='dense')
            
            # Add previous module info for sequence analysis
            df['prev_module'] = df.groupby('trainee_id')['module_id'].shift(1)
            df['prev_score'] = df.groupby('trainee_id')['score'].shift(1)
        
        return df
    
    def _analyze_module_effectiveness(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Analyze the effectiveness of each module based on performance data
        """
        if df.empty:
            return {'status': 'error', 'message': 'No data available for analysis'}
        
        # Group by module_id and calculate metrics
        module_stats = df.groupby('module_id').agg({
            'score': ['mean', 'std'],
            'completion_time': ['mean', 'std'],
            'attempts': 'mean',
            'passed': 'mean',
            'difficulty_rating': 'mean',
            'trainee_id': 'count'
        }).reset_index()
        
        # Flatten multi-level columns
        module_stats.columns = ['_'.join(col).strip('_') for col in module_stats.columns.values]
        
        # Calculate normalized effectiveness score
        # Higher scores = better performance, lower time, fewer attempts
        module_stats['performance_z'] = (module_stats['score_mean'] - module_stats['score_mean'].mean()) / module_stats['score_mean'].std()
        module_stats['time_z'] = -1 * (module_stats['completion_time_mean'] - module_stats['completion_time_mean'].mean()) / module_stats['completion_time_mean'].std()
        module_stats['attempts_z'] = -1 * (module_stats['attempts_mean'] - module_stats['attempts_mean'].mean()) / module_stats['attempts_mean'].std()
        
        # Combined effectiveness score
        module_stats['effectiveness_score'] = (
            module_stats['performance_z'] * 0.4 + 
            module_stats['time_z'] * 0.3 + 
            module_stats['attempts_z'] * 0.3
        )
        
        # Calculate difficulty balance (how well matched is difficulty to outcomes)
        # Ideal: Higher difficulty should correlate with lower scores but not too dramatically
        difficulty_balance = []
        
        for _, row in module_stats.iterrows():
            module_id = row['module_id']
            module_data = df[df['module_id'] == module_id]
            
            if len(module_data) > 5:  # Need enough data points
                # Calculate correlation between difficulty rating and score
                corr, _ = pearsonr(module_data['difficulty_rating'], module_data['score'])
                expected_corr = -0.3  # We expect moderate negative correlation
                balance = 1.0 - min(1.0, abs(corr - expected_corr) / 0.5)  # Higher = better balanced
            else:
                balance = 0.5  # Default for low data
            
            difficulty_balance.append(balance)
        
        module_stats['difficulty_balance'] = difficulty_balance
        
        # Prepare results
        results = {
            'modules': []
        }
        
        for _, row in module_stats.iterrows():
            module_result = {
                'module_id': row['module_id'],
                'effectiveness_score': float(row['effectiveness_score']),
                'avg_score': float(row['score_mean']),
                'avg_completion_time': float(row['completion_time_mean']),
                'avg_attempts': float(row['attempts_mean']),
                'pass_rate': float(row['passed_mean']),
                'difficulty_rating': float(row['difficulty_rating_mean']),
                'difficulty_balance': float(row['difficulty_balance']),
                'sample_size': int(row['trainee_id_count'])
            }
            
            results['modules'].append(module_result)
        
        # Sort by effectiveness score
        results['modules'].sort(key=lambda x: x['effectiveness_score'], reverse=True)
        
        return results
    
    def _analyze_module_order_impact(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Analyze the impact of module sequencing on outcomes
        """
        if df.empty or 'prev_module' not in df.columns:
            return {'status': 'error', 'message': 'Insufficient data for sequence analysis'}
        
        # Filter to entries with previous module data
        sequence_df = df.dropna(subset=['prev_module', 'prev_score'])
        
        if len(sequence_df) < 10:  # Need enough sequential data
            return {'status': 'error', 'message': 'Insufficient sequential data for analysis'}
        
        # Group by current and previous module
        sequence_stats = sequence_df.groupby(['module_id', 'prev_module']).agg({
            'score': ['mean', 'count'],
            'completion_time': 'mean',
            'attempts': 'mean'
        }).reset_index()
        
        # Flatten multi-level columns
        sequence_stats.columns = ['_'.join(col).strip('_') for col in sequence_stats.columns.values]
        
        # Identify optimal predecessors for each module
        optimal_sequences = []
        
        for module_id in sequence_stats['module_id'].unique():
            module_sequences = sequence_stats[sequence_stats['module_id'] == module_id]
            
            if len(module_sequences) > 0:
                # Find predecessor that leads to best performance
                best_idx = module_sequences['score_mean'].idxmax()
                best_predecessor = module_sequences.iloc[best_idx]
                
                # Check if we have enough data for this sequence
                if best_predecessor['score_count'] >= 3:
                    optimal_sequences.append({
                        'module_id': module_id,
                        'optimal_predecessor': best_predecessor['prev_module'],
                        'performance_gain': float(best_predecessor['score_mean'] - module_sequences['score_mean'].mean()),
                        'sample_size': int(best_predecessor['score_count'])
                    })
        
        # Calculate overall module ordering effectiveness
        module_order_effectiveness = {}
        
        for module_id in df['module_id'].unique():
            # Calculate average performance when this module is at different positions
            performance_by_position = df[df['module_id'] == module_id].groupby('module_order').agg({
                'score': ['mean', 'count']
            }).reset_index()
            
            # Flatten multi-level columns
            performance_by_position.columns = ['_'.join(col).strip('_') for col in performance_by_position.columns.values]
            
            if len(performance_by_position) > 1:
                # Find position with best performance
                best_idx = performance_by_position['score_mean'].idxmax()
                best_position = performance_by_position.iloc[best_idx]
                
                module_order_effectiveness[module_id] = {
                    'optimal_position': int(best_position['module_order']),
                    'current_avg_position': float(df[df['module_id'] == module_id]['module_order'].mean()),
                    'performance_variance': float(performance_by_position['score_mean'].std()),
                    'position_sensitivity': float(performance_by_position['score_mean'].max() - performance_by_position['score_mean'].min())
                }
        
        return {
            'optimal_sequences': optimal_sequences,
            'module_order_effectiveness': module_order_effectiveness
        }
    
    def _analyze_time_allocation(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Analyze time allocation efficiency
        """
        if df.empty:
            return {'status': 'error', 'message': 'No data available for analysis'}
        
        # Calculate time efficiency metrics
        time_metrics = []
        
        for module_id in df['module_id'].unique():
            module_data = df[df['module_id'] == module_id]
            
            if len(module_data) >= 5:  # Need enough data points
                # Calculate correlation between time spent and score
                time_score_corr, _ = pearsonr(module_data['completion_time'], module_data['score'])
                
                # Calculate optimal time range
                # Find the sweet spot where more time doesn't improve scores
                time_buckets = pd.qcut(module_data['completion_time'], 4, duplicates='drop')
                time_score_analysis = module_data.groupby(time_buckets)['score'].mean()
                
                optimal_bucket = time_score_analysis.idxmax()
                if optimal_bucket is not None:
                    optimal_min = optimal_bucket.left
                    optimal_max = optimal_bucket.right
                else:
                    # Fallback if bucketing fails
                    optimal_min = module_data['completion_time'].quantile(0.25)
                    optimal_max = module_data['completion_time'].quantile(0.75)
                
                # Calculate time efficiency
                avg_time = module_data['completion_time'].mean()
                time_efficiency = 1.0 - min(1.0, abs(avg_time - (optimal_min + optimal_max) / 2) / ((optimal_max - optimal_min) / 2))
                
                time_metrics.append({
                    'module_id': module_id,
                    'avg_completion_time': float(avg_time),
                    'optimal_min_time': float(optimal_min),
                    'optimal_max_time': float(optimal_max),
                    'time_score_correlation': float(time_score_corr),
                    'time_efficiency': float(time_efficiency)
                })
        
        # Sort by time efficiency
        time_metrics.sort(key=lambda x: x['time_efficiency'], reverse=True)
        
        return {
            'module_time_metrics': time_metrics
        }
    
    def _identify_bottlenecks(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Identify bottlenecks in the syllabus
        """
        if df.empty:
            return {'status': 'error', 'message': 'No data available for analysis'}
        
        bottlenecks = []
        
        # Identify modules with significantly lower pass rates
        module_pass_rates = df.groupby('module_id')['passed'].agg(['mean', 'count']).reset_index()
        avg_pass_rate = module_pass_rates['mean'].mean()
        pass_rate_std = module_pass_rates['mean'].std()
        
        for _, row in module_pass_rates.iterrows():
            if row['count'] >= 5 and row['mean'] < (avg_pass_rate - pass_rate_std * 0.5):
                bottlenecks.append({
                    'module_id': row['module_id'],
                    'type': 'low_pass_rate',
                    'pass_rate': float(row['mean']),
                    'severity': 'high' if row['mean'] < (avg_pass_rate - pass_rate_std) else 'medium',
                    'sample_size': int(row['count'])
                })
        
        # Identify modules with unusually high attempt counts
        module_attempts = df.groupby('module_id')['attempts'].agg(['mean', 'count']).reset_index()
        avg_attempts = module_attempts['mean'].mean()
        attempts_std = module_attempts['mean'].std()
        
        for _, row in module_attempts.iterrows():
            if row['count'] >= 5 and row['mean'] > (avg_attempts + attempts_std * 0.5):
                bottlenecks.append({
                    'module_id': row['module_id'],
                    'type': 'high_attempts',
                    'avg_attempts': float(row['mean']),
                    'severity': 'high' if row['mean'] > (avg_attempts + attempts_std) else 'medium',
                    'sample_size': int(row['count'])
                })
        
        # Identify modules that cause subsequent module failures
        sequence_df = df.dropna(subset=['prev_module', 'prev_score'])
        
        if len(sequence_df) >= 10:
            impact_analysis = sequence_df.groupby('prev_module').agg({
                'score': 'mean',
                'passed': 'mean',
                'trainee_id': 'count'
            }).reset_index()
            
            avg_subsequent_pass = impact_analysis['passed'].mean()
            subsequent_pass_std = impact_analysis['passed'].std()
            
            for _, row in impact_analysis.iterrows():
                if row['trainee_id'] >= 5 and row['passed'] < (avg_subsequent_pass - subsequent_pass_std * 0.5):
                    bottlenecks.append({
                        'module_id': row['prev_module'],
                        'type': 'poor_preparation',
                        'subsequent_pass_rate': float(row['passed']),
                        'severity': 'high' if row['passed'] < (avg_subsequent_pass - subsequent_pass_std) else 'medium',
                        'sample_size': int(row['trainee_id'])
                    })
        
        # Deduplicate bottlenecks (a module might have multiple issues)
        unique_bottlenecks = {}
        for bottleneck in bottlenecks:
            module_id = bottleneck['module_id']
            if module_id not in unique_bottlenecks or bottleneck['severity'] == 'high':
                unique_bottlenecks[module_id] = bottleneck
        
        return {
            'bottlenecks': list(unique_bottlenecks.values())
        }
    
    def _generate_recommendations(self,
                                syllabus_id: str,
                                module_effectiveness: Dict[str, Any],
                                order_impact: Dict[str, Any],
                                time_efficiency: Dict[str, Any],
                                bottlenecks: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate syllabus optimization recommendations
        """
        recommendations = {
            'content_adjustments': [],
            'sequence_adjustments': [],
            'time_adjustments': [],
            'bottleneck_remediation': []
        }
        
        # Content adjustment recommendations
        if 'modules' in module_effectiveness:
            for module in module_effectiveness['modules']:
                if module['effectiveness_score'] < -0.5 and module['sample_size'] >= 5:
                    recommendations['content_adjustments'].append({
                        'module_id': module['module_id'],
                        'issue': 'low_effectiveness',
                        'recommendation': 'Review and revise module content to improve learning outcomes',
                        'priority': 'high' if module['effectiveness_score'] < -1.0 else 'medium',
                        'metrics': {
                            'effectiveness_score': module['effectiveness_score'],
                            'pass_rate': module['pass_rate']
                        }
                    })
                
                if module['difficulty_balance'] < 0.5 and module['sample_size'] >= 5:
                    recommendations['content_adjustments'].append({
                        'module_id': module['module_id'],
                        'issue': 'difficulty_imbalance',
                        'recommendation': 'Adjust difficulty to better match trainee capabilities',
                        'priority': 'medium',
                        'metrics': {
                            'difficulty_rating': module['difficulty_rating'],
                            'difficulty_balance': module['difficulty_balance']
                        }
                    })
        
        # Sequence adjustment recommendations
        if 'optimal_sequences' in order_impact:
            for sequence in order_impact['optimal_sequences']:
                if sequence['performance_gain'] > 0.1 and sequence['sample_size'] >= 3:
                    recommendations['sequence_adjustments'].append({
                        'module_id': sequence['module_id'],
                        'issue': 'suboptimal_sequence',
                        'recommendation': f"Position module after {sequence['optimal_predecessor']} for optimal learning",
                        'priority': 'high' if sequence['performance_gain'] > 0.2 else 'medium',
                        'metrics': {
                            'performance_gain': sequence['performance_gain'],
                            'optimal_predecessor': sequence['optimal_predecessor']
                        }
                    })
        
        # Time adjustment recommendations
        if 'module_time_metrics' in time_efficiency:
            for metric in time_efficiency['module_time_metrics']:
                if metric['time_efficiency'] < 0.6:
                    current_time = metric['avg_completion_time']
                    optimal_min = metric['optimal_min_time']
                    optimal_max = metric['optimal_max_time']
                    
                    if current_time < optimal_min:
                        recommendations['time_adjustments'].append({
                            'module_id': metric['module_id'],
                            'issue': 'insufficient_time',
                            'recommendation': f"Increase allocated time from {current_time:.1f} to {optimal_min:.1f}-{optimal_max:.1f} minutes",
                            'priority': 'medium',
                            'metrics': {
                                'current_time': current_time,
                                'optimal_min': optimal_min,
                                'optimal_max': optimal_max
                            }
                        })
                    elif current_time > optimal_max:
                        recommendations['time_adjustments'].append({
                            'module_id': metric['module_id'],
                            'issue': 'excessive_time',
                            'recommendation': f"Decrease allocated time from {current_time:.1f} to {optimal_min:.1f}-{optimal_max:.1f} minutes",
                            'priority': 'low',
                            'metrics': {
                                'current_time': current_time,
                                'optimal_min': optimal_min,
                                'optimal_max': optimal_max
                            }
                        })
        
        # Bottleneck remediation recommendations
        if 'bottlenecks' in bottlenecks:
            for bottleneck in bottlenecks['bottlenecks']:
                if bottleneck['type'] == 'low_pass_rate':
                    recommendations['bottleneck_remediation'].append({
                        'module_id': bottleneck['module_id'],
                        'issue': 'high_failure_rate',
                        'recommendation': "Review difficulty, prerequisites, and assessment methods",
                        'priority': bottleneck['severity'],
                        'metrics': {
                            'pass_rate': bottleneck['pass_rate']
                        }
                    })
                elif bottleneck['type'] == 'high_attempts':
                    recommendations['bottleneck_remediation'].append({
                        'module_id': bottleneck['module_id'],
                        'issue': 'repeated_attempts',
                        'recommendation': "Improve instructional clarity and provide additional support resources",
                        'priority': bottleneck['severity'],
                        'metrics': {
                            'avg_attempts': bottleneck['avg_attempts']
                        }
                    })
                elif bottleneck['type'] == 'poor_preparation':
                    recommendations['bottleneck_remediation'].append({
                        'module_id': bottleneck['module_id'],
                        'issue': 'insufficient_preparation',
                        'recommendation': "Strengthen this module to better prepare trainees for subsequent modules",
                        'priority': bottleneck['severity'],
                        'metrics': {
                            'subsequent_pass_rate': bottleneck['subsequent_pass_rate']
                        }
                    })
        
        # Sort recommendations by priority
        priority_order = {'high': 0, 'medium': 1, 'low': 2}
        for category in recommendations:
            recommendations[category].sort(
                key=lambda x: priority_order.get(x['priority'], 3)
            )
        
        # Add summary
        recommendations['summary'] = {
            'content_adjustments_count': len(recommendations['content_adjustments']),
            'sequence_adjustments_count': len(recommendations['sequence_adjustments']),
            'time_adjustments_count': len(recommendations['time_adjustments']),
            'bottleneck_remediations_count': len(recommendations['bottleneck_remediation']),
            'high_priority_count': sum(1 for cat in recommendations.values() 
                                     for rec in cat if rec.get('priority') == 'high')
        }
        
        return recommendations
    
    def generate_personalized_path(self, syllabus_id: str, trainee_id: str, 
                                  performance_history: Dict[str, Any],
                                  learning_style: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Generate a personalized learning path for a trainee
        """
        if not performance_history:
            return {
                'syllabus_id': syllabus_id,
                'trainee_id': trainee_id,
                'status': 'error',
                'message': 'No performance history available for analysis'
            }
        
        # Default learning style if not provided
        if not learning_style:
            learning_style = {
                'visual': 0.5,
                'auditory': 0.5,
                'kinesthetic': 0.5,
                'reading_writing': 0.5,
                'preferred_pace': 'medium'
            }
        
        # Extract performance data
        completed_modules = performance_history.get('completed_modules', [])
        strengths = performance_history.get('strengths', [])
        weaknesses = performance_history.get('weaknesses', [])
        
        # Load syllabus structure
        syllabus_structure = self._load_syllabus_structure(syllabus_id)
        if not syllabus_structure:
            return {
                'syllabus_id': syllabus_id,
                'trainee_id': trainee_id,
                'status': 'error',
                'message': 'Failed to load syllabus structure'
            }
        
        # Identify remaining modules
        remaining_modules = []
        for module in syllabus_structure.get('modules', []):
            module_id = module.get('id')
            if module_id and module_id not in [m.get('module_id') for m in completed_modules]:
                remaining_modules.append(module)
        
        # Create personalized path
        personalized_path = {
            'syllabus_id': syllabus_id,
            'trainee_id': trainee_id,
            'timestamp': pd.Timestamp.now().isoformat(),
            'learning_style': learning_style,
            'completed_modules_count': len(completed_modules),
            'remaining_modules_count': len(remaining_modules),
            'recommended_sequence': [],
            'estimated_completion_time': 0,
            'focus_areas': []
        }
        
        # Generate module sequence recommendations
        if remaining_modules:
            # Score remaining modules based on prerequisites, weaknesses, etc.
            scored_modules = []
            
            for module in remaining_modules:
                score = 0
                
                # Check prerequisites
                prereqs = module.get('prerequisites', [])
                prereqs_met = all(prereq in [m.get('module_id') for m in completed_modules] 
                                for prereq in prereqs)
                
                if not prereqs_met:
                    continue  # Skip modules with unmet prerequisites
                
                # Higher score for addressing weaknesses
                module_skills = module.get('skills', [])
                weakness_overlap = len(set(module_skills).intersection(set(weaknesses)))
                score += weakness_overlap * 3
                
                # Lower score for modules targeting already strong areas
                strength_overlap = len(set(module_skills).intersection(set(strengths)))
                score -= strength_overlap * 1.5
                
                # Adjust based on difficulty progression
                difficulty = module.get('difficulty', 3)
                avg_completed_difficulty = 3.0
                if completed_modules:
                    avg_completed_difficulty = sum(m.get('difficulty', 3) for m in completed_modules) / len(completed_modules)
                
                # Prefer gradual difficulty progression
                difficulty_delta = difficulty - avg_completed_difficulty
                if difficulty_delta > 1.5:
                    score -= 2
                elif difficulty_delta < -1.5:
                    score -= 1
                
                # Adjust for learning style match
                style_match = module.get('learning_style_match', {})
                style_score = 0
                for style, weight in learning_style.items():
                    if style in style_match:
                        style_score += weight * style_match[style]
                
                score += style_score
                
                # Add to scored modules
                scored_modules.append({
                    'module': module,
                    'score': score
                })
            
            # Sort by score (descending)
            scored_modules.sort(key=lambda x: x['score'], reverse=True)
            
            # Create recommended sequence
            total_time = 0
            for scored_module in scored_modules:
                module = scored_module['module']
                module_time = module.get('estimated_time', 60)
                total_time += module_time
                
                personalized_path['recommended_sequence'].append({
                    'module_id': module.get('id'),
                    'title': module.get('title', 'Unknown Module'),
                    'estimated_time': module_time,
                    'difficulty': module.get('difficulty', 3),
                    'recommendation_score': scored_module['score'],
                    'rationale': self._generate_recommendation_rationale(module, 
                                                                       scored_module['score'],
                                                                       weaknesses,
                                                                       strengths)
                })
            
            personalized_path['estimated_completion_time'] = total_time
        
        # Identify focus areas based on weaknesses
        for weakness in weaknesses:
            # Find modules that address this weakness
            relevant_modules = [m for m in syllabus_structure.get('modules', []) 
                             if weakness in m.get('skills', [])]
            
            if relevant_modules:
                focus_area = {
                    'skill': weakness,
                    'priority': 'high',
                    'recommended_modules': [m.get('id') for m in relevant_modules[:3]],
                    'supplementary_resources': self._get_supplementary_resources(weakness)
                }
                
                personalized_path['focus_areas'].append(focus_area)
        
        return personalized_path
    
    def _load_syllabus_structure(self, syllabus_id: str) -> Dict[str, Any]:
        """
        Load the structure of a syllabus
        """
        # This would normally load from a database or file
        # Simplified implementation for demonstration
        try:
            syllabus_path = os.path.join(self.data_path, f"syllabus_{syllabus_id}.json")
            if os.path.exists(syllabus_path):
                with open(syllabus_path, 'r') as f:
                    return json.load(f)
            else:
                return {
                    'id': syllabus_id,
                    'modules': []
                }
        except Exception as e:
            print(f"Error loading syllabus structure: {e}")
            return None
    
    def _generate_recommendation_rationale(self, 
                                         module: Dict[str, Any], 
                                         score: float,
                                         weaknesses: List[str],
                                         strengths: List[str]) -> str:
        """
        Generate a human-readable rationale for module recommendation
        """
        reasons = []
        
        # Check for weakness targeting
        module_skills = module.get('skills', [])
        weakness_overlap = set(module_skills).intersection(set(weaknesses))
        if weakness_overlap:
            reasons.append(f"Addresses areas needing improvement: {', '.join(weakness_overlap)}")
        
        # Check for prerequisites
        prereqs = module.get('prerequisites', [])
        if prereqs:
            reasons.append("Prerequisites have been completed")
        
        # Check difficulty
        difficulty = module.get('difficulty', 3)
        if difficulty <= 2:
            reasons.append("Appropriate difficulty level for current progress")
        elif difficulty >= 4:
            reasons.append("Challenging module to increase proficiency")
        
        # Check learning style match
        style_match = module.get('learning_style_match', {})
        if any(v >= 0.7 for v in style_match.values()):
            top_style = max(style_match.items(), key=lambda x: x[1])[0]
            reasons.append(f"Matches {top_style} learning preference")
        
        # If no specific reasons, give a generic one
        if not reasons:
            reasons.append("Logical next step in training progression")
        
        return " • ".join(reasons)
    
    def _get_supplementary_resources(self, skill: str) -> List[Dict[str, Any]]:
        """
        Get supplementary resources for a specific skill
        """
        # This would normally query a database of resources
        # Simplified implementation for demonstration
        return [
            {
                'type': 'reference_document',
                'title': f"Guide to {skill.replace('_', ' ').title()}",
                'url': f"resources/{skill.lower().replace(' ', '_')}_guide.pdf"
            },
            {
                'type': 'video',
                'title': f"{skill.replace('_', ' ').title()} Demonstration",
                'url': f"videos/{skill.lower().replace(' ', '_')}_demo.mp4"
            }
        ]

# Unit tests for PredictiveAnalyticsController
// /analytics/tests/PredictiveAnalyticsControllerTest.cc
#include <gtest/gtest.h>
#include <drogon/drogon.h>
#include <drogon/HttpClient.h>
#include "../controllers/PredictiveAnalyticsController.h"
#include "../services/SkillDecayPredictionService.h"
#include "../services/FatigueRiskModelingService.h"

using namespace analytics;

class PredictiveAnalyticsControllerTest : public ::testing::Test {
protected:
    void SetUp() override {
        // Mock services
        skillDecayService_ = std::make_shared<SkillDecayPredictionService>();
        fatigueRiskService_ = std::make_shared<FatigueRiskModelingService>();
        
        // Create controller with mocked services
        controller_ = std::make_shared<PredictiveAnalyticsController>();
        // Inject mocked services (would need dependency injection framework or setter methods)
    }

    std::shared_ptr<PredictiveAnalyticsController> controller_;
    std::shared_ptr<SkillDecayPredictionService> skillDecayService_;
    std::shared_ptr<FatigueRiskModelingService> fatigueRiskService_;
};

TEST_F(PredictiveAnalyticsControllerTest, PredictSkillDecaySuccess) {
    // Create request with valid JSON
    drogon::HttpRequestPtr req = drogon::HttpRequest::newHttpRequest();
    req->setMethod(drogon::HttpMethod::Post);
    req->setContentTypeCode(drogon::ContentType::CT_APPLICATION_JSON);
    
    Json::Value requestBody;
    requestBody["pilotId"] = "pilot-123";
    requestBody["skillId"] = "crosswind-landing";
    requestBody["daysElapsed"] = 30;
    req->setBody(requestBody.toStyledString());
    
    bool callbackCalled = false;
    
    // Call the endpoint
    controller_->predictSkillDecay(req, [&callbackCalled](const drogon::HttpResponsePtr& resp) {
        callbackCalled = true;
        EXPECT_EQ(resp->getStatusCode(), drogon::HttpStatusCode::k200OK);
        
        // Parse response JSON
        Json::Value responseJson;
        Json::Reader reader;
        reader.parse(resp->getBody(), responseJson);
        
        // Validate response
        EXPECT_TRUE(responseJson.isObject());
        // Add more specific validations based on expected response structure
    });
    
    EXPECT_TRUE(callbackCalled);
}

TEST_F(PredictiveAnalyticsControllerTest, PredictSkillDecayInvalidJson) {
    // Create request with invalid JSON
    drogon::HttpRequestPtr req = drogon::HttpRequest::newHttpRequest();
    req->setMethod(drogon::HttpMethod::Post);
    req->setContentTypeCode(drogon::ContentType::CT_APPLICATION_JSON);
    req->setBody("invalid json data");
    
    bool callbackCalled = false;
    
    // Call the endpoint
    controller_->predictSkillDecay(req, [&callbackCalled](const drogon::HttpResponsePtr& resp) {
        callbackCalled = true;
        EXPECT_EQ(resp->getStatusCode(), drogon::HttpStatusCode::k400BadRequest);
    });
    
    EXPECT_TRUE(callbackCalled);
}

// Additional tests would be included here...

// Unit tests for SkillDecayPredictionService
// /analytics/tests/SkillDecayPredictionServiceTest.cc
#include <gtest/gtest.h>
#include "../services/SkillDecayPredictionService.h"

using namespace analytics;

class SkillDecayPredictionServiceTest : public ::testing::Test {
protected:
    void SetUp() override {
        service_ = std::make_shared<SkillDecayPredictionService>();
    }

    std::shared_ptr<SkillDecayPredictionService> service_;
};

TEST_F(SkillDecayPredictionServiceTest, PredictSkillDecay) {
    std::string pilotId = "test-pilot-123";
    std::string skillId = "emergency-descent";
    int daysElapsed = 60;
    
    Json::Value result = service_->predictSkillDecay(pilotId, skillId, daysElapsed);
    
    // Verify structure of result
    EXPECT_TRUE(result.isObject());
    EXPECT_TRUE(result.isMember("pilotId"));
    EXPECT_EQ(result["pilotId"].asString(), pilotId);
    EXPECT_TRUE(result.isMember("skillId"));
    EXPECT_EQ(result["skillId"].asString(), skillId);
    EXPECT_TRUE(result.isMember("retention"));
    EXPECT_TRUE(result.isMember("decay"));
    
    // Verify decay calculation
    double retention = result["retention"].asDouble();
    double decay = result["decay"].asDouble();
    EXPECT_GE(retention, 0.0);
    EXPECT_LE(retention, 1.0);
    EXPECT_GE(decay, 0.0);
    EXPECT_LE(decay, 1.0);
    EXPECT_NEAR(retention + decay, 1.0, 0.001);
}

TEST_F(SkillDecayPredictionServiceTest, GeneratePracticeRecommendations) {
    std::string pilotId = "test-pilot-123";
    
    // Create test decay predictions
    Json::Value decayPredictions;
    Json::Value prediction1;
    prediction1["retention"] = 0.8;
    prediction1["decay"] = 0.2;
    
    Json::Value prediction2;
    prediction2["retention"] = 0.3;
    prediction2["decay"] = 0.7;
    
    decayPredictions["skill1"] = prediction1;
    decayPredictions["skill2"] = prediction2;
    
    Json::Value result = service_->generatePracticeRecommendations(pilotId, decayPredictions);
    
    // Verify structure of result
    EXPECT_TRUE(result.isObject());
    EXPECT_TRUE(result.isMember("pilotId"));
    EXPECT_EQ(result["pilotId"].asString(), pilotId);
    EXPECT_TRUE(result.isMember("timestamp"));
    EXPECT_TRUE(result.isMember("skill_recommendations"));
    EXPECT_TRUE(result["skill_recommendations"].isArray());
    
    // Verify recommendations logic
    Json::Value recommendations = result["skill_recommendations"];
    EXPECT_GE(recommendations.size(), 2);
    
    // Higher decay should be higher priority
    if (recommendations.size() >= 2) {
        Json::Value firstRec = recommendations[0];
        EXPECT_TRUE(firstRec.isMember("skill_id"));
        EXPECT_TRUE(firstRec.isMember("priority"));
        EXPECT_TRUE(firstRec.isMember("recommended_interval_days"));
        
        // Verify that higher decay gets higher priority
        if (firstRec["skill_id"].asString() == "skill2") {
            EXPECT_EQ(firstRec["priority"].asString(), "high");
        }
    }
}

// Python tests for skill_decay_predictor.py
# /analytics/ml/tests/test_skill_decay_predictor.py
import unittest
import json
import os
import tempfile
from analytics.ml.skill_decay_predictor import SkillDecayPredictor

class TestSkillDecayPredictor(unittest.TestCase):
    def setUp(self):
        # Create temporary directory for models
        self.temp_dir = tempfile.mkdtemp()
        self.predictor = SkillDecayPredictor(model_path=self.temp_dir)
        
        # Test data
        self.pilot_id = "test_pilot_123"
        self.skill_id = "crosswind_landing"
        self.days_elapsed = 45
    
    def tearDown(self):
        # Clean up temporary directory
        for f in os.listdir(self.temp_dir):
            os.remove(os.path.join(self.temp_dir, f))
        os.rmdir(self.temp_dir)
    
    def test_predict_skill_decay_default(self):
        # Test prediction with no existing model
        result = self.predictor.predict_skill_decay(self.pilot_id, self.skill_id, self.days_elapsed)
        
        # Verify structure of result
        self.assertIsInstance(result, dict)
        self.assertEqual(result['pilot_id'], self.pilot_id)
        self.assertEqual(result['skill_id'], self.skill_id)
        self.assertEqual(result['days_elapsed'], self.days_elapsed)
        self.assertIn('retention', result)
        self.assertIn('decay', result)
        self.assertIn('model_type', result)
        
        # Verify decay calculation
        retention = result['retention']
        decay = result['decay']
        self.assertGreaterEqual(retention, 0.0)
        self.assertLessEqual(retention, 1.0)
        self.assertGreaterEqual(decay, 0.0)
        self.assertLessEqual(decay, 1.0)
        self.assertAlmostEqual(retention + decay, 1.0)
    
    def test_build_decay_model(self):
        # Create test performance history
        performance_history = [
            {
                'timestamp': '2023-01-01T12:00:00',
                'performance': 0.9
            },
            {
                'timestamp': '2023-01-15T12:00:00',
                'performance': 0.85
            },
            {
                'timestamp': '2023-02-01T12:00:00',
                'performance': 0.78
            }
        ]
        
        # Build a model
        model = self.predictor.build_decay_model(self.pilot_id, self.skill_id, performance_history)
        
        # Verify structure of model
        self.assertIsInstance(model, dict)
        self.assertEqual(model['pilot_id'], self.pilot_id)
        self.assertEqual(model['skill_id'], self.skill_id)
        self.assertIn('model_type', model)
        self.assertIn('created_at', model)
        
        # Verify model was saved
        model_file = os.path.join(self.temp_dir, f"{self.pilot_id}_{self.skill_id}_model.json")
        self.assertTrue(os.path.exists(model_file))
        
        # Verify model was loaded into memory
        self.assertIn(self.pilot_id, self.predictor.models)
        self.assertIn(self.skill_id, self.predictor.models[self.pilot_id])
    
    def test_predict_after_model_build(self):
        # Create test performance history
        performance_history = [
            {
                'timestamp': '2023-01-01T12:00:00',
                'performance': 0.9
            },
            {
                'timestamp': '2023-01-15T12:00:00',
                'performance': 0.85
            },
            {
                'timestamp': '2023-02-01T12:00:00',
                'performance': 0.78
            }
        ]
        
        # Build a model first
        self.predictor.build_decay_model(self.pilot_id, self.skill_id, performance_history)
        
        # Then predict
        result = self.predictor.predict_skill_decay(self.pilot_id, self.skill_id, self.days_elapsed)
        
        # Verify prediction uses the built model, not the default
        self.assertNotEqual(result.get('model_type'), 'ebbinghaus_default')
        self.assertNotIn('default model used', result.get('note', '').lower())

# Python tests for syllabus_optimizer.py
# /analytics/ml/tests/test_syllabus_optimizer.py
import unittest
import json
import os
import tempfile
from analytics.ml.syllabus_optimizer import SyllabusOptimizer

class TestSyllabusOptimizer(unittest.TestCase):
    def setUp(self):
        # Create temporary directory for data
        self.temp_dir = tempfile.mkdtemp()
        self.optimizer = SyllabusOptimizer(data_path=self.temp_dir)
        
        # Test data
        self.syllabus_id = "test_syllabus_123"
        
        # Create sample training outcomes
        self.training_outcomes = [
            {
                'trainee_id': 'trainee1',
                'modules': [
                    {
                        'module_id': 'module1',
                        'order': 1,
                        'score': 0.85,
                        'completion_time': 45,
                