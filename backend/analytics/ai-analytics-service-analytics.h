#pragma once

#include <string>
#include <vector>
#include <map>
#include <memory>
#include <optional>
#include <chrono>
#include <nlohmann/json.hpp>
#include <Eigen/Dense>

namespace ai_analytics {
namespace analytics {

/**
 * @brief Performance metric types
 */
enum class MetricType {
    ACCURACY,
    PRECISION,
    RECALL,
    F1_SCORE,
    ERROR_RATE,
    MEAN_ABSOLUTE_ERROR,
    MEAN_SQUARED_ERROR,
    ROOT_MEAN_SQUARED_ERROR,
    R_SQUARED,
    CONFUSION_MATRIX,
    ROC_CURVE,
    PR_CURVE,
    LEARNING_CURVE
};

/**
 * @brief Convert MetricType to string
 * @param type Metric type
 * @return String representation
 */
std::string metricTypeToString(MetricType type);

/**
 * @brief Convert string to MetricType
 * @param str String representation
 * @return Metric type
 */
MetricType metricTypeFromString(const std::string& str);

/**
 * @brief Prediction interval level
 */
enum class PredictionIntervalLevel {
    CONFIDENCE_50,
    CONFIDENCE_80,
    CONFIDENCE_90,
    CONFIDENCE_95,
    CONFIDENCE_99
};

/**
 * @brief Convert PredictionIntervalLevel to confidence value
 * @param level Prediction interval level
 * @return Confidence value (0-1)
 */
double predictionIntervalLevelToValue(PredictionIntervalLevel level);

/**
 * @brief Performance metric
 */
struct PerformanceMetric {
    MetricType type;
    double value;
    std::optional<double> lower_bound;
    std::optional<double> upper_bound;
    std::optional<std::vector<std::vector<double>>> matrix_value;
    std::optional<std::vector<std::pair<double, double>>> curve_points;
    
    /**
     * @brief Convert to JSON
     * @return JSON representation
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     * @param json JSON representation
     * @return Performance metric or nullopt if invalid
     */
    static std::optional<PerformanceMetric> fromJson(const nlohmann::json& json);
};

/**
 * @brief Training history point
 */
struct TrainingHistoryPoint {
    int epoch;
    double training_loss;
    double validation_loss;
    std::map<std::string, double> metrics;
    
    /**
     * @brief Convert to JSON
     * @return JSON representation
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     * @param json JSON representation
     * @return Training history point or nullopt if invalid
     */
    static std::optional<TrainingHistoryPoint> fromJson(const nlohmann::json& json);
};

/**
 * @brief Training history
 */
struct TrainingHistory {
    std::string model_id;
    std::vector<TrainingHistoryPoint> history;
    
    /**
     * @brief Convert to JSON
     * @return JSON representation
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     * @param json JSON representation
     * @return Training history or nullopt if invalid
     */
    static std::optional<TrainingHistory> fromJson(const nlohmann::json& json);
};

/**
 * @brief Performance prediction
 */
struct PerformancePrediction {
    std::string trainee_id;
    std::string exercise_id;
    double predicted_score;
    std::optional<double> lower_bound;
    std::optional<double> upper_bound;
    std::map<std::string, double> criteria_predictions;
    std::chrono::system_clock::time_point prediction_time;
    
    /**
     * @brief Convert to JSON
     * @return JSON representation
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     * @param json JSON representation
     * @return Performance prediction or nullopt if invalid
     */
    static std::optional<PerformancePrediction> fromJson(const nlohmann::json& json);
};

/**
 * @brief Performance trend
 */
struct PerformanceTrend {
    std::string trainee_id;
    std::string metric;
    std::vector<std::pair<std::chrono::system_clock::time_point, double>> data_points;
    std::optional<std::pair<double, double>> linear_trend; // (slope, intercept)
    
    /**
     * @brief Convert to JSON
     * @return JSON representation
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     * @param json JSON representation
     * @return Performance trend or nullopt if invalid
     */
    static std::optional<PerformanceTrend> fromJson(const nlohmann::json& json);
};

/**
 * @brief Performance benchmark
 */
struct PerformanceBenchmark {
    std::string benchmark_id;
    std::string name;
    std::string description;
    double threshold_value;
    double mean_value;
    double std_dev;
    std::vector<double> percentiles; // [p10, p25, p50, p75, p90]
    
    /**
     * @brief Convert to JSON
     * @return JSON representation
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     * @param json JSON representation
     * @return Performance benchmark or nullopt if invalid
     */
    static std::optional<PerformanceBenchmark> fromJson(const nlohmann::json& json);
};

/**
 * @brief Performance analytics service interface
 */
class IPerformanceAnalyticsService {
public:
    virtual ~IPerformanceAnalyticsService() = default;
    
    /**
     * @brief Calculate performance metrics
     * @param actual Actual values
     * @param predicted Predicted values
     * @param metric_types Metric types to calculate
     * @return Performance metrics
     */
    virtual std::vector<PerformanceMetric> calculateMetrics(
        const std::vector<double>& actual,
        const std::vector<double>& predicted,
        const std::vector<MetricType>& metric_types
    ) = 0;
    
    /**
     * @brief Calculate confusion matrix
     * @param actual Actual classes
     * @param predicted Predicted classes
     * @param class_labels Class labels
     * @return Confusion matrix
     */
    virtual PerformanceMetric calculateConfusionMatrix(
        const std::vector<int>& actual,
        const std::vector<int>& predicted,
        const std::vector<std::string>& class_labels
    ) = 0;
    
    /**
     * @brief Calculate ROC curve
     * @param actual Actual classes (0 or 1)
     * @param probabilities Predicted probabilities
     * @return ROC curve
     */
    virtual PerformanceMetric calculateROCCurve(
        const std::vector<int>& actual,
        const std::vector<double>& probabilities
    ) = 0;
    
    /**
     * @brief Calculate precision-recall curve
     * @param actual Actual classes (0 or 1)
     * @param probabilities Predicted probabilities
     * @return PR curve
     */
    virtual PerformanceMetric calculatePRCurve(
        const std::vector<int>& actual,
        const std::vector<double>& probabilities
    ) = 0;
    
    /**
     * @brief Predict trainee performance
     * @param trainee_id Trainee ID
     * @param exercise_id Exercise ID
     * @param features Input features
     * @param interval_level Prediction interval level
     * @return Performance prediction
     */
    virtual PerformancePrediction predictTraineePerformance(
        const std::string& trainee_id,
        const std::string& exercise_id,
        const std::map<std::string, double>& features,
        PredictionIntervalLevel interval_level = PredictionIntervalLevel::CONFIDENCE_95
    ) = 0;
    
    /**
     * @brief Calculate performance trend
     * @param trainee_id Trainee ID
     * @param metric Metric name
     * @param start_date Start date
     * @param end_date End date
     * @return Performance trend
     */
    virtual PerformanceTrend calculatePerformanceTrend(
        const std::string& trainee_id,
        const std::string& metric,
        const std::chrono::system_clock::time_point& start_date,
        const std::chrono::system_clock::time_point& end_date
    ) = 0;
    
    /**
     * @brief Get performance benchmarks
     * @param exercise_id Exercise ID
     * @return Performance benchmarks
     */
    virtual std::vector<PerformanceBenchmark> getPerformanceBenchmarks(
        const std::string& exercise_id
    ) = 0;
    
    /**
     * @brief Compare trainee performance to benchmarks
     * @param trainee_id Trainee ID
     * @param exercise_id Exercise ID
     * @return Comparison results as JSON
     */
    virtual nlohmann::json compareToPerformanceBenchmarks(
        const std::string& trainee_id,
        const std::string& exercise_id
    ) = 0;
    
    /**
     * @brief Get relative strengths and weaknesses
     * @param trainee_id Trainee ID
     * @return Strengths and weaknesses as JSON
     */
    virtual nlohmann::json getStrengthsAndWeaknesses(
        const std::string& trainee_id
    ) = 0;
    
    /**
     * @brief Generate training recommendations
     * @param trainee_id Trainee ID
     * @return Recommendations as JSON
     */
    virtual nlohmann::json generateTrainingRecommendations(
        const std::string& trainee_id
    ) = 0;
};

/**
 * @brief Performance analytics service implementation
 */
class PerformanceAnalyticsService : public IPerformanceAnalyticsService {
public:
    /**
     * @brief Constructor
     */
    PerformanceAnalyticsService();
    
    /**
     * @brief Destructor
     */
    ~PerformanceAnalyticsService() override;
    
    std::vector<PerformanceMetric> calculateMetrics(
        const std::vector<double>& actual,
        const std::vector<double>& predicted,
        const std::vector<MetricType>& metric_types
    ) override;
    
    PerformanceMetric calculateConfusionMatrix(
        const std::vector<int>& actual,
        const std::vector<int>& predicted,
        const std::vector<std::string>& class_labels
    ) override;
    
    PerformanceMetric calculateROCCurve(
        const std::vector<int>& actual,
        const std::vector<double>& probabilities
    ) override;
    
    PerformanceMetric calculatePRCurve(
        const std::vector<int>& actual,
        const std::vector<double>& probabilities
    ) override;
    
    PerformancePrediction predictTraineePerformance(
        const std::string& trainee_id,
        const std::string& exercise_id,
        const std::map<std::string, double>& features,
        PredictionIntervalLevel interval_level
    ) override;
    
    PerformanceTrend calculatePerformanceTrend(
        const std::string& trainee_id,
        const std::string& metric,
        const std::chrono::system_clock::time_point& start_date,
        const std::chrono::system_clock::time_point& end_date
    ) override;
    
    std::vector<PerformanceBenchmark> getPerformanceBenchmarks(
        const std::string& exercise_id
    ) override;
    
    nlohmann::json compareToPerformanceBenchmarks(
        const std::string& trainee_id,
        const std::string& exercise_id
    ) override;
    
    nlohmann::json getStrengthsAndWeaknesses(
        const std::string& trainee_id
    ) override;
    
    nlohmann::json generateTrainingRecommendations(
        const std::string& trainee_id
    ) override;
    
private:
    /**
     * @brief Calculate accuracy
     * @param actual Actual values
     * @param predicted Predicted values
     * @return Accuracy metric
     */
    PerformanceMetric calculateAccuracy(
        const std::vector<double>& actual,
        const std::vector<double>& predicted
    );
    
    /**
     * @brief Calculate precision
     * @param actual Actual values
     * @param predicted Predicted values
     * @return Precision metric
     */
    PerformanceMetric calculatePrecision(
        const std::vector<double>& actual,
        const std::vector<double>& predicted
    );
    
    /**
     * @brief Calculate recall
     * @param actual Actual values
     * @param predicted Predicted values
     * @return Recall metric
     */
    PerformanceMetric calculateRecall(
        const std::vector<double>& actual,
        const std::vector<double>& predicted
    );
    
    /**
     * @brief Calculate F1 score
     * @param actual Actual values
     * @param predicted Predicted values
     * @return F1 score metric
     */
    PerformanceMetric calculateF1Score(
        const std::vector<double>& actual,
        const std::vector<double>& predicted
    );
    
    /**
     * @brief Calculate error rate
     * @param actual Actual values
     * @param predicted Predicted values
     * @return Error rate metric
     */
    PerformanceMetric calculateErrorRate(
        const std::vector<double>& actual,
        const std::vector<double>& predicted
    );
    
    /**
     * @brief Calculate mean absolute error
     * @param actual Actual values
     * @param predicted Predicted values
     * @return MAE metric
     */
    PerformanceMetric calculateMAE(
        const std::vector<double>& actual,
        const std::vector<double>& predicted
    );
    
    /**
     * @brief Calculate mean squared error
     * @param actual Actual values
     * @param predicted Predicted values
     * @return MSE metric
     */
    PerformanceMetric calculateMSE(
        const std::vector<double>& actual,
        const std::vector<double>& predicted
    );
    
    /**
     * @brief Calculate root mean squared error
     * @param actual Actual values
     * @param predicted Predicted values
     * @return RMSE metric
     */
    PerformanceMetric calculateRMSE(
        const std::vector<double>& actual,
        const std::vector<double>& predicted
    );
    
    /**
     * @brief Calculate R-squared
     * @param actual Actual values
     * @param predicted Predicted values
     * @return R-squared metric
     */
    PerformanceMetric calculateRSquared(
        const std::vector<double>& actual,
        const std::vector<double>& predicted
    );
    
    /**
     * @brief Calculate linear regression parameters
     * @param x X values
     * @param y Y values
     * @return Pair of (slope, intercept)
     */
    std::pair<double, double> calculateLinearRegression(
        const std::vector<double>& x,
        const std::vector<double>& y
    );
};

} // namespace analytics
} // namespace ai_analytics