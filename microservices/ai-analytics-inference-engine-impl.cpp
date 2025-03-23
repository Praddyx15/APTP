#include "inference/inference_engine.h"
#include "logging/logger.h"
#include <fstream>
#include <algorithm>
#include <numeric>
#include <random>
#include <cmath>

namespace ai_analytics {
namespace inference {

InferenceEngine::InferenceEngine()
    : initialized_(false),
      model_path_(""),
      batch_size_(1),
      use_gpu_(false),
      verbose_(false) {
    
    // Initialize random generator for fallback predictions
    std::random_device rd;
    random_generator_ = std::mt19937(rd());
}

InferenceEngine::~InferenceEngine() {
    if (initialized_) {
        unloadModel();
    }
}

bool InferenceEngine::initialize(const InferenceConfig& config) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    try {
        model_path_ = config.model_path;
        batch_size_ = config.batch_size;
        use_gpu_ = config.use_gpu;
        verbose_ = config.verbose;
        
        // Load model
        if (!loadModel()) {
            logging::Logger::getInstance().error("Failed to load model from {}", model_path_);
            return false;
        }
        
        initialized_ = true;
        logging::Logger::getInstance().info("Inference engine initialized with model {}", model_path_);
        
        return true;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error initializing inference engine: {}", e.what());
        return false;
    }
}

bool InferenceEngine::loadModel() {
    try {
        // Check if model file exists
        std::ifstream model_file(model_path_);
        if (!model_file.good()) {
            logging::Logger::getInstance().error("Model file not found: {}", model_path_);
            return false;
        }
        
        // In a real implementation, this would load the model using TensorFlow C++ API
        // For this example, we'll simulate model loading
        
        // Parse model configuration
        std::string model_content((std::istreambuf_iterator<char>(model_file)),
                                 std::istreambuf_iterator<char>());
        
        // Extract input and output shapes from model
        input_shape_ = {batch_size_, 128}; // Example input shape: [batch_size, feature_dim]
        output_shape_ = {batch_size_, 10}; // Example output shape: [batch_size, num_classes]
        
        // Set up TensorFlow session
        if (use_gpu_) {
            logging::Logger::getInstance().info("Using GPU for inference");
            // In a real implementation, configure TensorFlow to use GPU
        } else {
            logging::Logger::getInstance().info("Using CPU for inference");
            // In a real implementation, configure TensorFlow to use CPU
        }
        
        logging::Logger::getInstance().info("Model loaded successfully from {}", model_path_);
        logging::Logger::getInstance().debug("Input shape: {}x{}", input_shape_[0], input_shape_[1]);
        logging::Logger::getInstance().debug("Output shape: {}x{}", output_shape_[0], output_shape_[1]);
        
        return true;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error loading model: {}", e.what());
        return false;
    }
}

void InferenceEngine::unloadModel() {
    std::lock_guard<std::mutex> lock(mutex_);
    
    if (initialized_) {
        // In a real implementation, this would clean up TensorFlow resources
        
        initialized_ = false;
        logging::Logger::getInstance().info("Model unloaded");
    }
}

InferenceResult InferenceEngine::infer(const std::vector<float>& features) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    InferenceResult result;
    result.success = false;
    
    if (!initialized_) {
        result.error_message = "Inference engine not initialized";
        logging::Logger::getInstance().error(result.error_message);
        return result;
    }
    
    try {
        // Check input shape
        if (features.size() != static_cast<size_t>(input_shape_[1])) {
            std::ostringstream oss;
            oss << "Input feature size mismatch: expected " << input_shape_[1]
                << ", got " << features.size();
            result.error_message = oss.str();
            logging::Logger::getInstance().error(result.error_message);
            return result;
        }
        
        // In a real implementation, this would run inference using TensorFlow C++ API
        // For this example, we'll simulate inference with some calculations
        
        // Normalize features
        std::vector<float> normalized_features = features;
        float feature_mean = std::accumulate(features.begin(), features.end(), 0.0f) / features.size();
        float feature_stddev = std::sqrt(std::inner_product(
            features.begin(), features.end(), features.begin(), 0.0f,
            std::plus<>(), [feature_mean](float x, float y) {
                return (x - feature_mean) * (y - feature_mean);
            }) / features.size());
        
        if (feature_stddev > 0) {
            for (size_t i = 0; i < normalized_features.size(); ++i) {
                normalized_features[i] = (normalized_features[i] - feature_mean) / feature_stddev;
            }
        }
        
        // Create input tensor
        // In a real implementation: TF_Tensor* input_tensor = ...
        
        // Run inference
        // In a real implementation: TF_SessionRun(session, ...)
        
        // Generate simulated output
        std::vector<float> logits(output_shape_[1]);
        
        // Simulate a simple linear transformation
        for (size_t i = 0; i < logits.size(); ++i) {
            float sum = 0.0f;
            for (size_t j = 0; j < normalized_features.size(); ++j) {
                // Simulate weights with a simple pattern
                float weight = std::sin(static_cast<float>(i * j) / normalized_features.size());
                sum += normalized_features[j] * weight;
            }
            logits[i] = sum;
        }
        
        // Apply softmax to get probabilities
        float max_logit = *std::max_element(logits.begin(), logits.end());
        std::vector<float> probs(logits.size());
        float sum_exp = 0.0f;
        
        for (size_t i = 0; i < logits.size(); ++i) {
            probs[i] = std::exp(logits[i] - max_logit);
            sum_exp += probs[i];
        }
        
        for (size_t i = 0; i < probs.size(); ++i) {
            probs[i] /= sum_exp;
        }
        
        // Get top prediction
        auto max_it = std::max_element(probs.begin(), probs.end());
        int predicted_class = std::distance(probs.begin(), max_it);
        float confidence = *max_it;
        
        // Set result
        result.success = true;
        result.predictions = probs;
        result.predicted_class = predicted_class;
        result.confidence = confidence;
        
        if (verbose_) {
            logging::Logger::getInstance().debug("Inference result: class={}, confidence={:.4f}",
                                              predicted_class, confidence);
        }
        
        return result;
    }
    catch (const std::exception& e) {
        result.error_message = std::string("Error during inference: ") + e.what();
        logging::Logger::getInstance().error(result.error_message);
        return result;
    }
}

InferenceResult InferenceEngine::inferBatch(const std::vector<std::vector<float>>& batch_features) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    InferenceResult result;
    result.success = false;
    
    if (!initialized_) {
        result.error_message = "Inference engine not initialized";
        logging::Logger::getInstance().error(result.error_message);
        return result;
    }
    
    try {
        // Check batch size
        if (batch_features.empty()) {
            result.error_message = "Empty batch";
            logging::Logger::getInstance().error(result.error_message);
            return result;
        }
        
        if (batch_features.size() > static_cast<size_t>(batch_size_)) {
            std::ostringstream oss;
            oss << "Batch size too large: max=" << batch_size_ << ", got=" << batch_features.size();
            result.error_message = oss.str();
            logging::Logger::getInstance().error(result.error_message);
            return result;
        }
        
        // Check feature dimensions
        for (size_t i = 0; i < batch_features.size(); ++i) {
            if (batch_features[i].size() != static_cast<size_t>(input_shape_[1])) {
                std::ostringstream oss;
                oss << "Input feature size mismatch at index " << i
                    << ": expected " << input_shape_[1]
                    << ", got " << batch_features[i].size();
                result.error_message = oss.str();
                logging::Logger::getInstance().error(result.error_message);
                return result;
            }
        }
        
        // In a real implementation, this would run batch inference using TensorFlow C++ API
        // For this example, we'll process each sample individually
        
        std::vector<std::vector<float>> batch_predictions;
        std::vector<int> batch_predicted_classes;
        std::vector<float> batch_confidences;
        
        for (const auto& features : batch_features) {
            InferenceResult single_result = infer(features);
            
            if (!single_result.success) {
                result.error_message = single_result.error_message;
                return result;
            }
            
            batch_predictions.push_back(single_result.predictions);
            batch_predicted_classes.push_back(single_result.predicted_class);
            batch_confidences.push_back(single_result.confidence);
        }
        
        // Set batch result
        result.success = true;
        result.batch_predictions = batch_predictions;
        result.batch_predicted_classes = batch_predicted_classes;
        result.batch_confidences = batch_confidences;
        
        if (verbose_) {
            logging::Logger::getInstance().debug("Batch inference completed for {} samples",
                                              batch_features.size());
        }
        
        return result;
    }
    catch (const std::exception& e) {
        result.error_message = std::string("Error during batch inference: ") + e.what();
        logging::Logger::getInstance().error(result.error_message);
        return result;
    }
}

std::vector<float> InferenceEngine::preprocessFeatures(const DataPoint& data_point) {
    try {
        // Extract features from data point based on its type
        std::vector<float> features;
        
        switch (data_point.data_type) {
            case DataType::GAZE: {
                // Extract gaze features
                const GazeData& gaze = data_point.gaze_data;
                features = {
                    gaze.x, gaze.y, gaze.z,
                    gaze.confidence,
                    // Add derived features
                    static_cast<float>(std::sin(gaze.x * M_PI)),
                    static_cast<float>(std::cos(gaze.y * M_PI))
                };
                break;
            }
            
            case DataType::PHYSIOLOGICAL: {
                // Extract physiological features
                const PhysiologicalData& physio = data_point.physiological_data;
                features = {
                    physio.heart_rate,
                    physio.respiration_rate,
                    physio.skin_conductance,
                    physio.temperature,
                    // Add normalized features
                    physio.heart_rate / 100.0f,
                    physio.respiration_rate / 20.0f,
                    physio.skin_conductance / 10.0f,
                    (physio.temperature - 36.0f) / 2.0f
                };
                break;
            }
            
            case DataType::SIMULATOR: {
                // Extract simulator features
                const SimulatorData& sim = data_point.simulator_data;
                features = {
                    sim.altitude,
                    sim.airspeed,
                    sim.heading,
                    sim.pitch,
                    sim.roll,
                    sim.vertical_speed,
                    // Add control inputs
                    sim.control_pitch,
                    sim.control_roll,
                    sim.control_yaw,
                    sim.control_throttle
                };
                break;
            }
            
            case DataType::PERFORMANCE: {
                // Extract performance features
                const PerformanceData& perf = data_point.performance_data;
                features = {
                    perf.score,
                    perf.completion_time,
                    perf.error_count,
                    perf.accuracy,
                    // Add normalized features
                    perf.score / 100.0f,
                    perf.completion_time / 300.0f,
                    perf.error_count / 10.0f,
                    perf.accuracy
                };
                break;
            }
            
            default: {
                logging::Logger::getInstance().error("Unsupported data type for preprocessing");
                return {};
            }
        }
        
        // Pad or truncate features to match expected input size
        if (features.size() < static_cast<size_t>(input_shape_[1])) {
            features.resize(input_shape_[1], 0.0f);
        } else if (features.size() > static_cast<size_t>(input_shape_[1])) {
            features.resize(input_shape_[1]);
        }
        
        return features;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error preprocessing features: {}", e.what());
        return {};
    }
}

InferenceResult InferenceEngine::inferCognitiveState(const std::vector<DataPoint>& data_points) {
    try {
        // Check if we have enough data points
        if (data_points.empty()) {
            InferenceResult result;
            result.success = false;
            result.error_message = "No data points provided";
            return result;
        }
        
        // Preprocess each data point and create a batch
        std::vector<std::vector<float>> batch_features;
        
        for (const auto& data_point : data_points) {
            std::vector<float> features = preprocessFeatures(data_point);
            
            if (features.empty()) {
                InferenceResult result;
                result.success = false;
                result.error_message = "Failed to preprocess features";
                return result;
            }
            
            batch_features.push_back(features);
        }
        
        // Run batch inference
        InferenceResult result = inferBatch(batch_features);
        
        // Map class indices to cognitive states
        if (result.success) {
            for (size_t i = 0; i < result.batch_predicted_classes.size(); ++i) {
                int class_index = result.batch_predicted_classes[i];
                std::string state;
                
                switch (class_index) {
                    case 0: state = "FOCUSED"; break;
                    case 1: state = "DISTRACTED"; break;
                    case 2: state = "COGNITIVE_OVERLOAD"; break;
                    case 3: state = "FATIGUED"; break;
                    case 4: state = "STRESSED"; break;
                    case 5: state = "RELAXED"; break;
                    case 6: state = "CONFUSED"; break;
                    case 7: state = "ENGAGED"; break;
                    case 8: state = "BORED"; break;
                    case 9: state = "NORMAL"; break;
                    default: state = "UNKNOWN";
                }
                
                result.state_labels.push_back(state);
            }
        }
        
        return result;
    }
    catch (const std::exception& e) {
        InferenceResult result;
        result.success = false;
        result.error_message = std::string("Error inferring cognitive state: ") + e.what();
        logging::Logger::getInstance().error(result.error_message);
        return result;
    }
}

InferenceResult InferenceEngine::inferPerformancePrediction(
    const std::vector<DataPoint>& historical_data,
    const std::vector<DataPoint>& current_data
) {
    try {
        // Combine historical and current data
        std::vector<DataPoint> combined_data = historical_data;
        combined_data.insert(combined_data.end(), current_data.begin(), current_data.end());
        
        // Check if we have enough data points
        if (combined_data.empty()) {
            InferenceResult result;
            result.success = false;
            result.error_message = "No data points provided";
            return result;
        }
        
        // Preprocess data and create features
        std::vector<float> features;
        
        // Extract statistical features from combined data
        features = extractStatisticalFeatures(combined_data);
        
        if (features.empty()) {
            InferenceResult result;
            result.success = false;
            result.error_message = "Failed to extract statistical features";
            return result;
        }
        
        // Run inference
        InferenceResult result = infer(features);
        
        // Map output to performance metrics
        if (result.success) {
            // For performance prediction, we interpret the output as regression values
            // Each output value corresponds to a different performance metric
            
            std::unordered_map<std::string, float> performance_metrics;
            
            if (result.predictions.size() >= 10) {
                performance_metrics["overall_score"] = result.predictions[0] * 100.0f;
                performance_metrics["accuracy"] = result.predictions[1];
                performance_metrics["completion_time"] = result.predictions[2] * 300.0f; // Scale to seconds
                performance_metrics["error_rate"] = result.predictions[3];
                performance_metrics["learning_progress"] = result.predictions[4];
                performance_metrics["proficiency"] = result.predictions[5];
                performance_metrics["training_effectiveness"] = result.predictions[6];
                performance_metrics["recommendation_confidence"] = result.predictions[7];
                performance_metrics["cognitive_load"] = result.predictions[8];
                performance_metrics["engagement"] = result.predictions[9];
            }
            
            result.performance_metrics = performance_metrics;
        }
        
        return result;
    }
    catch (const std::exception& e) {
        InferenceResult result;
        result.success = false;
        result.error_message = std::string("Error inferring performance prediction: ") + e.what();
        logging::Logger::getInstance().error(result.error_message);
        return result;
    }
}

InferenceResult InferenceEngine::generateRecommendations(
    const std::vector<DataPoint>& performance_data,
    const std::vector<DataPoint>& cognitive_data
) {
    try {
        // Combine performance and cognitive data
        std::vector<DataPoint> combined_data = performance_data;
        combined_data.insert(combined_data.end(), cognitive_data.begin(), cognitive_data.end());
        
        // Check if we have enough data points
        if (combined_data.empty()) {
            InferenceResult result;
            result.success = false;
            result.error_message = "No data points provided";
            return result;
        }
        
        // Extract features for recommendation generation
        std::vector<float> features = extractRecommendationFeatures(combined_data);
        
        if (features.empty()) {
            InferenceResult result;
            result.success = false;
            result.error_message = "Failed to extract recommendation features";
            return result;
        }
        
        // Run inference
        InferenceResult result = infer(features);
        
        // Generate recommendations based on model output
        if (result.success) {
            std::vector<std::string> recommendations;
            
            // Determine which recommendation templates to use based on prediction probabilities
            if (result.predictions.size() >= 10) {
                std::vector<std::pair<float, int>> sorted_probs;
                for (size_t i = 0; i < result.predictions.size(); ++i) {
                    sorted_probs.push_back({result.predictions[i], static_cast<int>(i)});
                }
                
                // Sort in descending order of probability
                std::sort(sorted_probs.begin(), sorted_probs.end(),
                          [](const auto& a, const auto& b) { return a.first > b.first; });
                
                // Use top 3 recommendations
                for (size_t i = 0; i < std::min(size_t(3), sorted_probs.size()); ++i) {
                    int rec_index = sorted_probs[i].second;
                    float confidence = sorted_probs[i].first;
                    
                    // Only include recommendations with sufficient confidence
                    if (confidence < 0.1f) {
                        continue;
                    }
                    
                    // Generate recommendation based on index
                    std::string recommendation;
                    switch (rec_index) {
                        case 0:
                            recommendation = "Focus on improving procedural knowledge through additional ground training.";
                            break;
                        case 1:
                            recommendation = "Practice emergency scenarios to improve response time and accuracy.";
                            break;
                        case 2:
                            recommendation = "Review communication protocols and practice radio communication.";
                            break;
                        case 3:
                            recommendation = "Work on maintaining situational awareness during high-workload phases.";
                            break;
                        case 4:
                            recommendation = "Practice flight planning and decision-making exercises.";
                            break;
                        case 5:
                            recommendation = "Focus on precise aircraft control during approach and landing.";
                            break;
                        case 6:
                            recommendation = "Review and practice instrument scan techniques.";
                            break;
                        case 7:
                            recommendation = "Work on task prioritization during complex scenarios.";
                            break;
                        case 8:
                            recommendation = "Practice checklist discipline and procedural compliance.";
                            break;
                        case 9:
                            recommendation = "Focus on developing a consistent and methodical approach to troubleshooting.";
                            break;
                        default:
                            break;
                    }
                    
                    if (!recommendation.empty()) {
                        recommendations.push_back(recommendation);
                    }
                }
            }
            
            result.recommendations = recommendations;
        }
        
        return result;
    }
    catch (const std::exception& e) {
        InferenceResult result;
        result.success = false;
        result.error_message = std::string("Error generating recommendations: ") + e.what();
        logging::Logger::getInstance().error(result.error_message);
        return result;
    }
}

std::vector<float> InferenceEngine::extractStatisticalFeatures(const std::vector<DataPoint>& data_points) {
    try {
        if (data_points.empty()) {
            return {};
        }
        
        // Initialize feature vector
        std::vector<float> features;
        
        // Count data points by type
        int gaze_count = 0;
        int physio_count = 0;
        int simulator_count = 0;
        int performance_count = 0;
        
        // Collect values by type for statistical analysis
        std::vector<float> gaze_x_values;
        std::vector<float> gaze_y_values;
        std::vector<float> heart_rate_values;
        std::vector<float> altitude_values;
        std::vector<float> airspeed_values;
        std::vector<float> pitch_values;
        std::vector<float> roll_values;
        std::vector<float> score_values;
        std::vector<float> error_values;
        
        for (const auto& data_point : data_points) {
            switch (data_point.data_type) {
                case DataType::GAZE:
                    gaze_count++;
                    gaze_x_values.push_back(data_point.gaze_data.x);
                    gaze_y_values.push_back(data_point.gaze_data.y);
                    break;
                
                case DataType::PHYSIOLOGICAL:
                    physio_count++;
                    heart_rate_values.push_back(data_point.physiological_data.heart_rate);
                    break;
                
                case DataType::SIMULATOR:
                    simulator_count++;
                    altitude_values.push_back(data_point.simulator_data.altitude);
                    airspeed_values.push_back(data_point.simulator_data.airspeed);
                    pitch_values.push_back(data_point.simulator_data.pitch);
                    roll_values.push_back(data_point.simulator_data.roll);
                    break;
                
                case DataType::PERFORMANCE:
                    performance_count++;
                    score_values.push_back(data_point.performance_data.score);
                    error_values.push_back(data_point.performance_data.error_count);
                    break;
                
                default:
                    break;
            }
        }
        
        // Add counts as features
        features.push_back(static_cast<float>(data_points.size()));
        features.push_back(static_cast<float>(gaze_count));
        features.push_back(static_cast<float>(physio_count));
        features.push_back(static_cast<float>(simulator_count));
        features.push_back(static_cast<float>(performance_count));
        
        // Add statistical features for each data type
        auto add_stats = [&features](const std::vector<float>& values) {
            if (values.empty()) {
                features.push_back(0.0f);  // Mean
                features.push_back(0.0f);  // Std
                features.push_back(0.0f);  // Min
                features.push_back(0.0f);  // Max
                features.push_back(0.0f);  // Range
                return;
            }
            
            float sum = std::accumulate(values.begin(), values.end(), 0.0f);
            float mean = sum / values.size();
            
            float sq_sum = std::inner_product(
                values.begin(), values.end(), values.begin(), 0.0f,
                std::plus<>(), [mean](float x, float y) {
                    return (x - mean) * (y - mean);
                });
            float stddev = std::sqrt(sq_sum / values.size());
            
            float min_val = *std::min_element(values.begin(), values.end());
            float max_val = *std::max_element(values.begin(), values.end());
            float range = max_val - min_val;
            
            features.push_back(mean);
            features.push_back(stddev);
            features.push_back(min_val);
            features.push_back(max_val);
            features.push_back(range);
        };
        
        // Add stats for each collected value type
        add_stats(gaze_x_values);
        add_stats(gaze_y_values);
        add_stats(heart_rate_values);
        add_stats(altitude_values);
        add_stats(airspeed_values);
        add_stats(pitch_values);
        add_stats(roll_values);
        add_stats(score_values);
        add_stats(error_values);
        
        // Add derived features
        
        // Gaze dispersion
        if (!gaze_x_values.empty() && !gaze_y_values.empty()) {
            float gaze_dispersion = 0.0f;
            for (size_t i = 0; i < gaze_x_values.size(); ++i) {
                float x_diff = gaze_x_values[i] - 0.5f;  // Assuming center is at (0.5, 0.5)
                float y_diff = gaze_y_values[i] - 0.5f;
                gaze_dispersion += std::sqrt(x_diff * x_diff + y_diff * y_diff);
            }
            gaze_dispersion /= gaze_x_values.size();
            features.push_back(gaze_dispersion);
        } else {
            features.push_back(0.0f);
        }
        
        // Heart rate variability
        if (heart_rate_values.size() > 1) {
            std::vector<float> hr_diffs;
            for (size_t i = 1; i < heart_rate_values.size(); ++i) {
                hr_diffs.push_back(std::abs(heart_rate_values[i] - heart_rate_values[i-1]));
            }
            float hr_variability = std::accumulate(hr_diffs.begin(), hr_diffs.end(), 0.0f) / hr_diffs.size();
            features.push_back(hr_variability);
        } else {
            features.push_back(0.0f);
        }
        
        // Control stability
        if (!pitch_values.empty() && !roll_values.empty()) {
            float pitch_stability = 0.0f;
            float roll_stability = 0.0f;
            
            for (size_t i = 1; i < pitch_values.size(); ++i) {
                pitch_stability += std::abs(pitch_values[i] - pitch_values[i-1]);
            }
            
            for (size_t i = 1; i < roll_values.size(); ++i) {
                roll_stability += std::abs(roll_values[i] - roll_values[i-1]);
            }
            
            if (pitch_values.size() > 1) {
                pitch_stability /= (pitch_values.size() - 1);
            }
            
            if (roll_values.size() > 1) {
                roll_stability /= (roll_values.size() - 1);
            }
            
            features.push_back(pitch_stability);
            features.push_back(roll_stability);
        } else {
            features.push_back(0.0f);
            features.push_back(0.0f);
        }
        
        // Performance trends
        if (score_values.size() > 1) {
            float score_trend = score_values.back() - score_values.front();
            features.push_back(score_trend);
        } else {
            features.push_back(0.0f);
        }
        
        // Ensure we have the expected number of features
        if (features.size() < static_cast<size_t>(input_shape_[1])) {
            features.resize(input_shape_[1], 0.0f);
        } else if (features.size() > static_cast<size_t>(input_shape_[1])) {
            features.resize(input_shape_[1]);
        }
        
        return features;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error extracting statistical features: {}", e.what());
        return {};
    }
}

std::vector<float> InferenceEngine::extractRecommendationFeatures(const std::vector<DataPoint>& data_points) {
    try {
        // Start with statistical features
        std::vector<float> features = extractStatisticalFeatures(data_points);
        
        if (features.empty()) {
            return {};
        }
        
        // Extract additional features specific to recommendations
        
        // Count data types
        int gaze_count = 0;
        int physio_count = 0;
        int simulator_count = 0;
        int performance_count = 0;
        
        // Recent performance metrics
        std::vector<float> recent_scores;
        std::vector<float> recent_errors;
        std::vector<float> recent_completion_times;
        
        // Cognitive state indicators
        float focus_indicator = 0.0f;
        float stress_indicator = 0.0f;
        float fatigue_indicator = 0.0f;
        
        // Extract recent data (last 10 points or all if fewer)
        size_t recent_count = std::min(size_t(10), data_points.size());
        auto recent_start = data_points.end() - recent_count;
        
        for (auto it = recent_start; it != data_points.end(); ++it) {
            const auto& data_point = *it;
            
            switch (data_point.data_type) {
                case DataType::GAZE:
                    gaze_count++;
                    // Calculate focus indicator from gaze stability
                    focus_indicator += data_point.gaze_data.confidence;
                    break;
                
                case DataType::PHYSIOLOGICAL:
                    physio_count++;
                    // Calculate stress from heart rate
                    if (data_point.physiological_data.heart_rate > 90.0f) {
                        stress_indicator += (data_point.physiological_data.heart_rate - 90.0f) / 30.0f;
                    }
                    break;
                
                case DataType::SIMULATOR:
                    simulator_count++;
                    // Control smoothness could indicate fatigue
                    fatigue_indicator += std::abs(data_point.simulator_data.control_pitch) +
                                       std::abs(data_point.simulator_data.control_roll);
                    break;
                
                case DataType::PERFORMANCE:
                    performance_count++;
                    recent_scores.push_back(data_point.performance_data.score);
                    recent_errors.push_back(data_point.performance_data.error_count);
                    recent_completion_times.push_back(data_point.performance_data.completion_time);
                    break;
                
                default:
                    break;
            }
        }
        
        // Normalize indicators
        if (gaze_count > 0) {
            focus_indicator /= gaze_count;
        }
        
        if (physio_count > 0) {
            stress_indicator /= physio_count;
        }
        
        if (simulator_count > 0) {
            fatigue_indicator /= simulator_count;
        }
        
        // Add cognitive indicators to features
        features.push_back(focus_indicator);
        features.push_back(stress_indicator);
        features.push_back(fatigue_indicator);
        
        // Add recent performance metrics
        if (!recent_scores.empty()) {
            float avg_score = std::accumulate(recent_scores.begin(), recent_scores.end(), 0.0f) / recent_scores.size();
            features.push_back(avg_score);
        } else {
            features.push_back(0.0f);
        }
        
        if (!recent_errors.empty()) {
            float avg_errors = std::accumulate(recent_errors.begin(), recent_errors.end(), 0.0f) / recent_errors.size();
            features.push_back(avg_errors);
        } else {
            features.push_back(0.0f);
        }
        
        if (!recent_completion_times.empty()) {
            float avg_time = std::accumulate(recent_completion_times.begin(), recent_completion_times.end(), 0.0f) / 
                           recent_completion_times.size();
            features.push_back(avg_time);
        } else {
            features.push_back(0.0f);
        }
        
        // Trend indicators (improvement or deterioration)
        if (recent_scores.size() > 1) {
            float first_half_avg = 0.0f;
            float second_half_avg = 0.0f;
            size_t half_size = recent_scores.size() / 2;
            
            for (size_t i = 0; i < half_size; ++i) {
                first_half_avg += recent_scores[i];
            }
            
            for (size_t i = half_size; i < recent_scores.size(); ++i) {
                second_half_avg += recent_scores[i];
            }
            
            first_half_avg /= half_size;
            second_half_avg /= (recent_scores.size() - half_size);
            
            float trend = second_half_avg - first_half_avg;
            features.push_back(trend);
        } else {
            features.push_back(0.0f);
        }
        
        // Ensure we have the expected number of features
        if (features.size() < static_cast<size_t>(input_shape_[1])) {
            features.resize(input_shape_[1], 0.0f);
        } else if (features.size() > static_cast<size_t>(input_shape_[1])) {
            features.resize(input_shape_[1]);
        }
        
        return features;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error extracting recommendation features: {}", e.what());
        return {};
    }
}

// InferenceResult methods

nlohmann::json InferenceResult::toJson() const {
    nlohmann::json json;
    json["success"] = success;
    
    if (!success) {
        json["error_message"] = error_message;
        return json;
    }
    
    // Add single prediction results if available
    if (!predictions.empty()) {
        json["predictions"] = predictions;
        json["predicted_class"] = predicted_class;
        json["confidence"] = confidence;
    }
    
    // Add batch prediction results if available
    if (!batch_predictions.empty()) {
        json["batch_predictions"] = batch_predictions;
        json["batch_predicted_classes"] = batch_predicted_classes;
        json["batch_confidences"] = batch_confidences;
    }
    
    // Add cognitive state labels if available
    if (!state_labels.empty()) {
        json["state_labels"] = state_labels;
    }
    
    // Add performance metrics if available
    if (!performance_metrics.empty()) {
        json["performance_metrics"] = performance_metrics;
    }
    
    // Add recommendations if available
    if (!recommendations.empty()) {
        json["recommendations"] = recommendations;
    }
    
    return json;
}

std::optional<InferenceResult> InferenceResult::fromJson(const nlohmann::json& json) {
    try {
        InferenceResult result;
        result.success = json["success"];
        
        if (!result.success) {
            result.error_message = json["error_message"];
            return result;
        }
        
        // Get single prediction results if available
        if (json.contains("predictions") && json["predictions"].is_array()) {
            result.predictions = json["predictions"].get<std::vector<float>>();
            result.predicted_class = json["predicted_class"];
            result.confidence = json["confidence"];
        }
        
        // Get batch prediction results if available
        if (json.contains("batch_predictions") && json["batch_predictions"].is_array()) {
            result.batch_predictions = json["batch_predictions"].get<std::vector<std::vector<float>>>();
            result.batch_predicted_classes = json["batch_predicted_classes"].get<std::vector<int>>();
            result.batch_confidences = json["batch_confidences"].get<std::vector<float>>();
        }
        
        // Get cognitive state labels if available
        if (json.contains("state_labels") && json["state_labels"].is_array()) {
            result.state_labels = json["state_labels"].get<std::vector<std::string>>();
        }
        
        // Get performance metrics if available
        if (json.contains("performance_metrics") && json["performance_metrics"].is_object()) {
            result.performance_metrics = json["performance_metrics"].get<std::unordered_map<std::string, float>>();
        }
        
        // Get recommendations if available
        if (json.contains("recommendations") && json["recommendations"].is_array()) {
            result.recommendations = json["recommendations"].get<std::vector<std::string>>();
        }
        
        return result;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error parsing inference result from JSON: {}", e.what());
        return std::nullopt;
    }
}

} // namespace inference
} // namespace ai_analytics