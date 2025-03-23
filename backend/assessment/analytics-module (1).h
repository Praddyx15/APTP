// backend/analytics/include/AnalyticsEngine.h
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <chrono>
#include <optional>
#include <functional>
#include <unordered_map>
#include <variant>
#include <future>

#include "core/include/ErrorHandling.h"
#include "core/include/DatabaseManager.h"
#include "assessment/include/AssessmentTypes.h"

namespace APTP::Analytics {

// Data types for analytics
enum class DataType {
    Integer,
    Float,
    Double,
    String,
    Boolean,
    DateTime,
    Duration,
    JSON,
    Array
};

// Metric types
enum class MetricType {
    Count,          // Count of occurrences
    Sum,            // Sum of values
    Average,        // Average of values
    Minimum,        // Minimum value
    Maximum,        // Maximum value
    StandardDeviation, // Standard deviation
    Percentile,     // Percentile (requires parameter)
    Custom          // Custom calculation
};

// Time aggregation
enum class TimeAggregation {
    None,           // No time aggregation
    Minute,         // Group by minute
    Hour,           // Group by hour
    Day,            // Group by day
    Week,           // Group by week
    Month,          // Group by month
    Quarter,        // Group by quarter
    Year,           // Group by year
    Custom          // Custom time period
};

// KPI category
enum class KPICategory {
    Performance,    // Training performance
    Completion,     // Training completion
    Compliance,     // Regulatory compliance
    Efficiency,     // Resource efficiency
    Satisfaction,   // Trainee satisfaction
    Custom          // Custom category
};

// Value for analytics data
using AnalyticsValue = std::variant<
    int64_t,
    double,
    std::string,
    bool,
    std::chrono::system_clock::time_point,
    std::chrono::seconds,
    std::vector<std::variant<int64_t, double, std::string, bool>>
>;

// Data point for analytics
struct DataPoint {
    std::string id;
    std::string metricId;
    std::string dimensionId;
    std::string entityId;   // ID of entity (trainee, instructor, etc.)
    std::string entityType; // Type of entity
    std::chrono::system_clock::time_point timestamp;
    AnalyticsValue value;
    std::unordered_map<std::string, std::string> tags;
    std::unordered_map<std::string, std::string> metadata;
};

// Metric definition
struct MetricDefinition {
    std::string id;
    std::string name;
    std::string description;
    MetricType type;
    DataType dataType;
    std::string unit;
    std::string formula; // For custom metrics
    std::string aggregationMethod;
    TimeAggregation timeAggregation;
    KPICategory category;
    bool isRealTime;
    bool isVisible;
    std::vector<std::string> relatedMetrics;
    std::vector<std::string> tags;
    std::unordered_map<std::string, std::string> metadata;
};

// Dimension definition
struct DimensionDefinition {
    std::string id;
    std::string name;
    std::string description;
    DataType dataType;
    std::vector<std::string> possibleValues; // For categorical dimensions
    bool isFilterable;
    bool isGroupable;
    std::vector<std::string> tags;
    std::unordered_map<std::string, std::string> metadata;
};

// Dashboard definition
struct DashboardDefinition {
    std::string id;
    std::string name;
    std::string description;
    std::string ownerUserId;
    std::vector<std::string> widgetIds;
    bool isPublic;
    bool isDefault;
    std::vector<std::string> tags;
    std::unordered_map<std::string, std::string> metadata;
};

// Widget types
enum class WidgetType {
    LineChart,
    BarChart,
    PieChart,
    ScatterPlot,
    Table,
    Gauge,
    KPI,
    HeatMap,
    Map,
    Custom
};

// Widget definition
struct WidgetDefinition {
    std::string id;
    std::string name;
    std::string description;
    WidgetType type;
    std::vector<std::string> metricIds;
    std::vector<std::string> dimensionIds;
    std::string query; // SQL or custom query
    std::unordered_map<std::string, std::string> configuration;
    std::vector<std::string> tags;
    std::unordered_map<std::string, std::string> metadata;
};

// Time range for analytics queries
struct TimeRange {
    std::optional<std::chrono::system_clock::time_point> start;
    std::optional<std::chrono::system_clock::time_point> end;
    std::optional<std::chrono::seconds> duration; // Alternative to end
    
    static TimeRange Last24Hours() {
        TimeRange range;
        range.end = std::chrono::system_clock::now();
        range.start = *range.end - std::chrono::hours(24);
        return range;
    }
    
    static TimeRange Last7Days() {
        TimeRange range;
        range.end = std::chrono::system_clock::now();
        range.start = *range.end - std::chrono::hours(24 * 7);
        return range;
    }
    
    static TimeRange Last30Days() {
        TimeRange range;
        range.end = std::chrono::system_clock::now();
        range.start = *range.end - std::chrono::hours(24 * 30);
        return range;
    }
    
    static TimeRange Custom(
        std::chrono::system_clock::time_point start,
        std::chrono::system_clock::time_point end) {
        TimeRange range;
        range.start = start;
        range.end = end;
        return range;
    }
};

// Filter for analytics queries
struct AnalyticsFilter {
    std::string dimensionId;
    std::string operator_; // "=", "<>", ">", "<", ">=", "<=", "IN", "NOT IN", "LIKE", "NOT LIKE"
    AnalyticsValue value;
};

// Grouping for analytics queries
struct AnalyticsGrouping {
    std::string dimensionId;
    TimeAggregation timeAggregation = TimeAggregation::None;
};

// Sort order for analytics queries
struct AnalyticsSort {
    std::string metricId;
    bool ascending = true;
};

// Analytics query
struct AnalyticsQuery {
    std::vector<std::string> metricIds;
    std::vector<AnalyticsFilter> filters;
    std::vector<AnalyticsGrouping> groupings;
    std::vector<AnalyticsSort> sortOrder;
    TimeRange timeRange;
    size_t limit = 1000;
    size_t offset = 0;
};

// Analytics result
struct AnalyticsResult {
    std::vector<std::string> columns;
    std::vector<std::vector<AnalyticsValue>> rows;
    
    size_t rowCount() const { return rows.size(); }
    size_t columnCount() const { return columns.size(); }
    
    template<typename T>
    std::optional<T> getValue(size_t row, size_t column) const {
        if (row >= rows.size() || column >= columns.size()) {
            return std::nullopt;
        }
        
        try {
            return std::get<T>(rows[row][column]);
        } catch (const std::bad_variant_access&) {
            return std::nullopt;
        }
    }
    
    template<typename T>
    std::optional<T> getValue(size_t row, const std::string& columnName) const {
        auto it = std::find(columns.begin(), columns.end(), columnName);
        if (it == columns.end()) {
            return std::nullopt;
        }
        
        size_t column = std::distance(columns.begin(), it);
        return getValue<T>(row, column);
    }
};

// Prediction model types
enum class PredictionModelType {
    LinearRegression,
    RandomForest,
    NeuralNetwork,
    GradientBoosting,
    ARIMA,
    Prophet,
    Custom
};

// Prediction model definition
struct PredictionModelDefinition {
    std::string id;
    std::string name;
    std::string description;
    PredictionModelType type;
    std::string targetMetricId;
    std::vector<std::string> featureMetricIds;
    std::string modelPath; // Path to saved model
    std::string pythonModulePath; // Path to Python module for custom models
    std::chrono::system_clock::time_point lastTrainingTime;
    double accuracy;
    double rmse; // Root Mean Square Error
    std::vector<std::string> tags;
    std::unordered_map<std::string, std::string> metadata;
};

// Prediction result
struct PredictionResult {
    std::string modelId;
    std::string targetMetricId;
    std::vector<std::pair<std::chrono::system_clock::time_point, double>> predictions;
    std::vector<std::pair<std::chrono::system_clock::time_point, double>> confidenceIntervalLower;
    std::vector<std::pair<std::chrono::system_clock::time_point, double>> confidenceIntervalUpper;
    double confidenceLevel;
    std::unordered_map<std::string, std::string> metadata;
};

// Analytics engine class
class AnalyticsEngine {
public:
    static AnalyticsEngine& getInstance();
    
    // Initialize the analytics engine
    APTP::Core::Result<void> initialize();
    
    // Register a new metric
    APTP::Core::Result<MetricDefinition> registerMetric(
        const std::string& name,
        const std::string& description,
        MetricType type,
        DataType dataType,
        const std::string& unit,
        TimeAggregation timeAggregation = TimeAggregation::None,
        KPICategory category = KPICategory::Performance);
    
    // Get metric by ID
    APTP::Core::Result<MetricDefinition> getMetric(const std::string& metricId);
    
    // Update metric
    APTP::Core::Result<MetricDefinition> updateMetric(
        const std::string& metricId,
        const MetricDefinition& updatedMetric);
    
    // Delete metric
    APTP::Core::Result<void> deleteMetric(const std::string& metricId);
    
    // List metrics
    APTP::Core::Result<std::vector<MetricDefinition>> listMetrics(
        const std::optional<KPICategory>& category = std::nullopt,
        const std::optional<std::string>& tag = std::nullopt);
    
    // Register a new dimension
    APTP::Core::Result<DimensionDefinition> registerDimension(
        const std::string& name,
        const std::string& description,
        DataType dataType,
        const std::vector<std::string>& possibleValues = {},
        bool isFilterable = true,
        bool isGroupable = true);
    
    // Get dimension by ID
    APTP::Core::Result<DimensionDefinition> getDimension(const std::string& dimensionId);
    
    // Update dimension
    APTP::Core::Result<DimensionDefinition> updateDimension(
        const std::string& dimensionId,
        const DimensionDefinition& updatedDimension);
    
    // Delete dimension
    APTP::Core::Result<void> deleteDimension(const std::string& dimensionId);
    
    // List dimensions
    APTP::Core::Result<std::vector<DimensionDefinition>> listDimensions(
        const std::optional<std::string>& tag = std::nullopt);
    
    // Record data point
    APTP::Core::Result<void> recordDataPoint(
        const std::string& metricId,
        const std::string& dimensionId,
        const std::string& entityId,
        const std::string& entityType,
        const AnalyticsValue& value,
        const std::optional<std::chrono::system_clock::time_point>& timestamp = std::nullopt);
    
    // Record multiple data points
    APTP::Core::Result<void> recordDataPoints(const std::vector<DataPoint>& dataPoints);
    
    // Execute analytics query
    APTP::Core::Result<AnalyticsResult> executeQuery(const AnalyticsQuery& query);
    
    // Execute analytics query asynchronously
    std::future<APTP::Core::Result<AnalyticsResult>> executeQueryAsync(const AnalyticsQuery& query);
    
    // Create dashboard
    APTP::Core::Result<DashboardDefinition> createDashboard(
        const std::string& name,
        const std::string& description,
        const std::string& ownerUserId,
        bool isPublic = false,
        bool isDefault = false);
    
    // Get dashboard by ID
    APTP::Core::Result<DashboardDefinition> getDashboard(const std::string& dashboardId);
    
    // Update dashboard
    APTP::Core::Result<DashboardDefinition> updateDashboard(
        const std::string& dashboardId,
        const DashboardDefinition& updatedDashboard);
    
    // Delete dashboard
    APTP::Core::Result<void> deleteDashboard(const std::string& dashboardId);
    
    // List dashboards
    APTP::Core::Result<std::vector<DashboardDefinition>> listDashboards(
        const std::optional<std::string>& ownerUserId = std::nullopt,
        const std::optional<bool>& isPublic = std::nullopt);
    
    // Create widget
    APTP::Core::Result<WidgetDefinition> createWidget(
        const std::string& name,
        const std::string& description,
        WidgetType type,
        const std::vector<std::string>& metricIds,
        const std::vector<std::string>& dimensionIds,
        const std::string& query = "");
    
    // Get widget by ID
    APTP::Core::Result<WidgetDefinition> getWidget(const std::string& widgetId);
    
    // Update widget
    APTP::Core::Result<WidgetDefinition> updateWidget(
        const std::string& widgetId,
        const WidgetDefinition& updatedWidget);
    
    // Delete widget
    APTP::Core::Result<void> deleteWidget(const std::string& widgetId);
    
    // Add widget to dashboard
    APTP::Core::Result<void> addWidgetToDashboard(
        const std::string& dashboardId,
        const std::string& widgetId);
    
    // Remove widget from dashboard
    APTP::Core::Result<void> removeWidgetFromDashboard(
        const std::string& dashboardId,
        const std::string& widgetId);
    
    // Execute widget query
    APTP::Core::Result<AnalyticsResult> executeWidgetQuery(
        const std::string& widgetId,
        const TimeRange& timeRange);
    
    // Create prediction model
    APTP::Core::Result<PredictionModelDefinition> createPredictionModel(
        const std::string& name,
        const std::string& description,
        PredictionModelType type,
        const std::string& targetMetricId,
        const std::vector<std::string>& featureMetricIds);
    
    // Get prediction model by ID
    APTP::Core::Result<PredictionModelDefinition> getPredictionModel(const std::string& modelId);
    
    // Update prediction model
    APTP::Core::Result<PredictionModelDefinition> updatePredictionModel(
        const std::string& modelId,
        const PredictionModelDefinition& updatedModel);
    
    // Delete prediction model
    APTP::Core::Result<void> deletePredictionModel(const std::string& modelId);
    
    // Train prediction model
    APTP::Core::Result<PredictionModelDefinition> trainPredictionModel(
        const std::string& modelId,
        const TimeRange& trainingDataTimeRange);
    
    // Generate predictions
    APTP::Core::Result<PredictionResult> generatePredictions(
        const std::string& modelId,
        const std::chrono::system_clock::time_point& startTime,
        const std::chrono::system_clock::time_point& endTime,
        size_t numPredictions = 10,
        double confidenceLevel = 0.95);
    
    // Export data to CSV
    APTP::Core::Result<std::string> exportToCSV(
        const AnalyticsQuery& query,
        const std::string& delimiter = ",");
    
    // Export data to JSON
    APTP::Core::Result<std::string> exportToJSON(const AnalyticsQuery& query);
    
    // Get KPI value
    APTP::Core::Result<double> getKPIValue(
        const std::string& metricId,
        const TimeRange& timeRange,
        const std::vector<AnalyticsFilter>& filters = {});
    
    // Calculate KPI trend
    APTP::Core::Result<std::vector<std::pair<std::chrono::system_clock::time_point, double>>> 
    calculateKPITrend(
        const std::string& metricId,
        const TimeRange& timeRange,
        TimeAggregation aggregation = TimeAggregation::Day,
        const std::vector<AnalyticsFilter>& filters = {});
    
    // Generate automated insights
    struct AutomatedInsight {
        std::string id;
        std::string title;
        std::string description;
        std::string metricId;
        std::string insightType; // "Anomaly", "Trend", "Correlation", "Prediction"
        double significance; // 0.0 to 1.0
        std::chrono::system_clock::time_point timestamp;
        std::unordered_map<std::string, AnalyticsValue> data;
    };
    
    APTP::Core::Result<std::vector<AutomatedInsight>> generateInsights(
        const std::vector<std::string>& metricIds,
        const TimeRange& timeRange,
        size_t maxInsights = 10);
    
    // Calculate correlation between metrics
    APTP::Core::Result<double> calculateCorrelation(
        const std::string& metricId1,
        const std::string& metricId2,
        const TimeRange& timeRange,
        const std::vector<AnalyticsFilter>& filters = {});

private:
    AnalyticsEngine();
    ~AnalyticsEngine();
    
    struct Impl;
    std::unique_ptr<Impl> impl_;
};

} // namespace APTP::Analytics

// backend/analytics/src/AnalyticsEngine.cpp (partial implementation)
#include "AnalyticsEngine.h"
#include "core/include/Logger.h"
#include "core/include/DatabaseManager.h"
#include <nlohmann/json.hpp>
#include <chrono>

namespace APTP::Analytics {

struct AnalyticsEngine::Impl {
    // Internal implementation details
    bool initialized = false;
    
    // Database queries
    const std::string SQL_CREATE_METRIC = 
        "INSERT INTO analytics_metrics (id, name, description, type, data_type, unit, formula, aggregation_method, time_aggregation, category, is_real_time, is_visible, tags, metadata) "
        "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) "
        "RETURNING id";
    
    const std::string SQL_GET_METRIC = 
        "SELECT id, name, description, type, data_type, unit, formula, aggregation_method, time_aggregation, category, is_real_time, is_visible, related_metrics, tags, metadata "
        "FROM analytics_metrics "
        "WHERE id = $1";
    
    const std::string SQL_UPDATE_METRIC = 
        "UPDATE analytics_metrics "
        "SET name = $2, description = $3, type = $4, data_type = $5, unit = $6, formula = $7, aggregation_method = $8, time_aggregation = $9, category = $10, is_real_time = $11, is_visible = $12, related_metrics = $13, tags = $14, metadata = $15 "
        "WHERE id = $1 "
        "RETURNING id";
    
    const std::string SQL_DELETE_METRIC = 
        "DELETE FROM analytics_metrics "
        "WHERE id = $1";
    
    const std::string SQL_LIST_METRICS = 
        "SELECT id, name, description, type, data_type, unit, formula, aggregation_method, time_aggregation, category, is_real_time, is_visible, related_metrics, tags, metadata "
        "FROM analytics_metrics ";
    
    // Time-series data table
    const std::string SQL_RECORD_DATA_POINT = 
        "INSERT INTO analytics_data (id, metric_id, dimension_id, entity_id, entity_type, timestamp, value, tags, metadata) "
        "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)";
    
    // Helper methods
    APTP::Core::Result<MetricDefinition> metricFromDbResult(const APTP::Core::DbResultSet& resultSet, size_t row) {
        // In a real implementation, this would extract metric data from DB result
        // This is a simplified placeholder
        MetricDefinition metric;
        metric.id = resultSet.getValue<std::string>(row, "id").value_or("");
        metric.name = resultSet.getValue<std::string>(row, "name").value_or("");
        metric.description = resultSet.getValue<std::string>(row, "description").value_or("");
        // ... extract other fields
        
        return APTP::Core::Success(metric);
    }
    
    APTP::Core::Result<DimensionDefinition> dimensionFromDbResult(const APTP::Core::DbResultSet& resultSet, size_t row) {
        // Similar to metricFromDbResult
        DimensionDefinition dimension;
        dimension.id = resultSet.getValue<std::string>(row, "id").value_or("");
        // ... extract other fields
        
        return APTP::Core::Success(dimension);
    }
    
    // Convert AnalyticsValue to string for SQL
    std::string analyticsValueToString(const AnalyticsValue& value) {
        return std::visit([](auto&& arg) -> std::string {
            using T = std::decay_t<decltype(arg)>;
            if constexpr (std::is_same_v<T, int64_t>) {
                return std::to_string(arg);
            } else if constexpr (std::is_same_v<T, double>) {
                return std::to_string(arg);
            } else if constexpr (std::is_same_v<T, std::string>) {
                return "'" + arg + "'"; // Note: In real code, this would need SQL escaping
            } else if constexpr (std::is_same_v<T, bool>) {
                return arg ? "true" : "false";
            } else if constexpr (std::is_same_v<T, std::chrono::system_clock::time_point>) {
                auto time_t = std::chrono::system_clock::to_time_t(arg);
                std::stringstream ss;
                ss << std::put_time(std::gmtime(&time_t), "'%Y-%m-%d %H:%M:%S'");
                return ss.str();
            } else if constexpr (std::is_same_v<T, std::chrono::seconds>) {
                return std::to_string(arg.count()) + " seconds";
            } else if constexpr (std::is_same_v<T, std::vector<std::variant<int64_t, double, std::string, bool>>>) {
                std::stringstream ss;
                ss << "ARRAY[";
                for (size_t i = 0; i < arg.size(); ++i) {
                    if (i > 0) ss << ", ";
                    ss << analyticsValueToString(arg[i]);
                }
                ss << "]";
                return ss.str();
            } else {
                return "NULL";
            }
        }, value);
    }
    
    // Build SQL query from AnalyticsQuery
    std::string buildSQLQuery(const AnalyticsQuery& query) {
        std::stringstream sql;
        
        // Select metrics
        sql << "SELECT ";
        
        if (query.groupings.empty()) {
            // No grouping, select raw data points
            sql << "timestamp, ";
            for (size_t i = 0; i < query.metricIds.size(); ++i) {
                if (i > 0) sql << ", ";
                sql << "value as " << query.metricIds[i];
            }
        } else {
            // With grouping, apply aggregation functions
            for (const auto& grouping : query.groupings) {
                if (grouping.timeAggregation != TimeAggregation::None) {
                    // Time-based grouping
                    switch (grouping.timeAggregation) {
                        case TimeAggregation::Minute:
                            sql << "date_trunc('minute', timestamp) as time_group, ";
                            break;
                        case TimeAggregation::Hour:
                            sql << "date_trunc('hour', timestamp) as time_group, ";
                            break;
                        case TimeAggregation::Day:
                            sql << "date_trunc('day', timestamp) as time_group, ";
                            break;
                        case TimeAggregation::Week:
                            sql << "date_trunc('week', timestamp) as time_group, ";
                            break;
                        case TimeAggregation::Month:
                            sql << "date_trunc('month', timestamp) as time_group, ";
                            break;
                        case TimeAggregation::Quarter:
                            sql << "date_trunc('quarter', timestamp) as time_group, ";
                            break;
                        case TimeAggregation::Year:
                            sql << "date_trunc('year', timestamp) as time_group, ";
                            break;
                        default:
                            break;
                    }
                } else {
                    // Dimension-based grouping
                    sql << "dimension_id as " << grouping.dimensionId << ", ";
                }
            }
            
            // Add metrics with aggregation
            for (size_t i = 0; i < query.metricIds.size(); ++i) {
                if (i > 0) sql << ", ";
                
                // Look up metric to get aggregation method
                // For this example, we'll use a hardcoded aggregation
                sql << "avg(value) as " << query.metricIds[i];
            }
        }
        
        // From analytics_data table
        sql << " FROM analytics_data WHERE ";
        
        // Add metric filters
        sql << "(";
        for (size_t i = 0; i < query.metricIds.size(); ++i) {
            if (i > 0) sql << " OR ";
            sql << "metric_id = '" << query.metricIds[i] << "'";
        }
        sql << ")";
        
        // Add time range
        if (query.timeRange.start.has_value()) {
            sql << " AND timestamp >= " << analyticsValueToString(*query.timeRange.start);
        }
        
        if (query.timeRange.end.has_value()) {
            sql << " AND timestamp <= " << analyticsValueToString(*query.timeRange.end);
        } else if (query.timeRange.duration.has_value() && query.timeRange.start.has_value()) {
            auto end = *query.timeRange.start + *query.timeRange.duration;
            sql << " AND timestamp <= " << analyticsValueToString(end);
        }
        
        // Add other filters
        for (const auto& filter : query.filters) {
            sql << " AND " << filter.dimensionId << " " << filter.operator_ << " " 
                << analyticsValueToString(filter.value);
        }
        
        // Add grouping
        if (!query.groupings.empty()) {
            sql << " GROUP BY ";
            
            bool needsComma = false;
            for (const auto& grouping : query.groupings) {
                if (needsComma) sql << ", ";
                
                if (grouping.timeAggregation != TimeAggregation::None) {
                    sql << "time_group";
                } else {
                    sql << grouping.dimensionId;
                }
                
                needsComma = true;
            }
        }
        
        // Add sorting
        if (!query.sortOrder.empty()) {
            sql << " ORDER BY ";
            
            for (size_t i = 0; i < query.sortOrder.size(); ++i) {
                if (i > 0) sql << ", ";
                
                sql << query.sortOrder[i].metricId;
                
                if (!query.sortOrder[i].ascending) {
                    sql << " DESC";
                }
            }
        } else {
            // Default sort by timestamp
            sql << " ORDER BY timestamp";
        }
        
        // Add limit and offset
        if (query.limit > 0) {
            sql << " LIMIT " << query.limit;
        }
        
        if (query.offset > 0) {
            sql << " OFFSET " << query.offset;
        }
        
        return sql.str();
    }
};

AnalyticsEngine& AnalyticsEngine::getInstance() {
    static AnalyticsEngine instance;
    return instance;
}

AnalyticsEngine::AnalyticsEngine() : impl_(std::make_unique<Impl>()) {}
AnalyticsEngine::~AnalyticsEngine() = default;

APTP::Core::Result<void> AnalyticsEngine::initialize() {
    if (impl_->initialized) {
        return APTP::Core::Success();
    }
    
    APTP::Core::Logger::getInstance().info("Initializing AnalyticsEngine");
    
    // In a real implementation, this would:
    // 1. Create database tables if they don't exist
    // 2. Create a TimescaleDB hypertable for time series data
    // 3. Initialize any caches or in-memory data structures
    
    impl_->initialized = true;
    return APTP::Core::Success();
}

APTP::Core::Result<MetricDefinition> AnalyticsEngine::registerMetric(
    const std::string& name,
    const std::string& description,
    MetricType type,
    DataType dataType,
    const std::string& unit,
    TimeAggregation timeAggregation,
    KPICategory category) {
    
    if (!impl_->initialized) {
        return APTP::Core::Error<MetricDefinition>(APTP::Core::ErrorCode::InvalidState);
    }
    
    APTP::Core::Logger::getInstance().info(
        "Registering metric: {} (type={}, dataType={})",
        name, static_cast<int>(type), static_cast<int>(dataType));
    
    try {
        // Generate a unique ID for the metric
        std::string metricId = "metric-" + std::to_string(std::hash<std::string>{}(
            name + description + std::to_string(std::time(nullptr))));
        
        // Determine aggregation method based on metric type
        std::string aggregationMethod;
        switch (type) {
            case MetricType::Count:
                aggregationMethod = "count";
                break;
            case MetricType::Sum:
                aggregationMethod = "sum";
                break;
            case MetricType::Average:
                aggregationMethod = "avg";
                break;
            case MetricType::Minimum:
                aggregationMethod = "min";
                break;
            case MetricType::Maximum:
                aggregationMethod = "max";
                break;
            case MetricType::StandardDeviation:
                aggregationMethod = "stddev";
                break;
            default:
                aggregationMethod = "avg"; // Default
                break;
        }
        
        // Prepare parameters for database query
        std::unordered_map<std::string, APTP::Core::DbValue> params;
        params["$1"] = metricId;
        params["$2"] = name;
        params["$3"] = description;
        params["$4"] = static_cast<int64_t>(type);
        params["$5"] = static_cast<int64_t>(dataType);
        params["$6"] = unit;
        params["$7"] = ""; // formula (empty for non-custom)
        params["$8"] = aggregationMethod;
        params["$9"] = static_cast<int64_t>(timeAggregation);
        params["$10"] = static_cast<int64_t>(category);
        params["$11"] = true; // isRealTime
        params["$12"] = true; // isVisible
        params["$13"] = nlohmann::json::array().dump(); // tags
        params["$14"] = nlohmann::json{}.dump(); // metadata
        
        // Execute database query
        auto result = APTP::Core::PostgreSQLManager::getInstance().executeScalar(
            impl_->SQL_CREATE_METRIC, params);
        
        if (result.isError()) {
            APTP::Core::Logger::getInstance().error("Failed to register metric in database");
            return APTP::Core::Error<MetricDefinition>(APTP::Core::ErrorCode::AnalyticsError);
        }
        
        // Create the metric definition object
        MetricDefinition metric;
        metric.id = metricId;
        metric.name = name;
        metric.description = description;
        metric.type = type;
        metric.dataType = dataType;
        metric.unit = unit;
        metric.aggregationMethod = aggregationMethod;
        metric.timeAggregation = timeAggregation;
        metric.category = category;
        metric.isRealTime = true;
        metric.isVisible = true;
        
        return APTP::Core::Success(metric);
    } catch (const std::exception& e) {
        APTP::Core::Logger::getInstance().error("Exception registering metric: {}", e.what());
        return APTP::Core::Error<MetricDefinition>(APTP::Core::ErrorCode::AnalyticsError);
    }
}

APTP::Core::Result<void> AnalyticsEngine::recordDataPoint(
    const std::string& metricId,
    const std::string& dimensionId,
    const std::string& entityId,
    const std::string& entityType,
    const AnalyticsValue& value,
    const std::optional<std::chrono::system_clock::time_point>& timestamp) {
    
    if (!impl_->initialized) {
        return APTP::Core::Error<void>(APTP::Core::ErrorCode::InvalidState);
    }
    
    try {
        // Generate a unique ID for the data point
        std::string dataPointId = "dp-" + std::to_string(std::hash<std::string>{}(
            metricId + dimensionId + entityId + entityType + std::to_string(std::time(nullptr))));
        
        // Use current time if timestamp not provided
        auto actualTimestamp = timestamp.value_or(std::chrono::system_clock::now());
        
        // Prepare parameters for database query
        std::unordered_map<std::string, APTP::Core::DbValue> params;
        params["$1"] = dataPointId;
        params["$2"] = metricId;
        params["$3"] = dimensionId;
        params["$4"] = entityId;
        params["$5"] = entityType;
        params["$6"] = actualTimestamp;
        
        // Convert value to appropriate database type
        // This is a simplified implementation
        params["$7"] = std::visit([](auto&& arg) -> APTP::Core::DbValue {
            return arg;
        }, value);
        
        params["$8"] = nlohmann::json::array().dump(); // tags
        params["$9"] = nlohmann::json{}.dump(); // metadata
        
        // Execute database query
        auto result = APTP::Core::PostgreSQLManager::getInstance().executeNonQuery(
            impl_->SQL_RECORD_DATA_POINT, params);
        
        if (result.isError()) {
            APTP::Core::Logger::getInstance().error("Failed to record data point in database");
            return APTP::Core::Error<void>(APTP::Core::ErrorCode::AnalyticsError);
        }
        
        return APTP::Core::Success();
    } catch (const std::exception& e) {
        APTP::Core::Logger::getInstance().error("Exception recording data point: {}", e.what());
        return APTP::Core::Error<void>(APTP::Core::ErrorCode::AnalyticsError);
    }
}

APTP::Core::Result<AnalyticsResult> AnalyticsEngine::executeQuery(const AnalyticsQuery& query) {
    if (!impl_->initialized) {
        return APTP::Core::Error<AnalyticsResult>(APTP::Core::ErrorCode::InvalidState);
    }
    
    try {
        // Build SQL query
        std::string sql = impl_->buildSQLQuery(query);
        
        APTP::Core::Logger::getInstance().debug("Executing analytics query: {}", sql);
        
        // Execute the query
        auto result = APTP::Core::PostgreSQLManager::getInstance().executeQuery(sql);
        
        if (result.isError()) {
            APTP::Core::Logger::getInstance().error("Failed to execute analytics query");
            return APTP::Core::Error<AnalyticsResult>(APTP::Core::ErrorCode::AnalyticsError);
        }
        
        // Convert the database result to AnalyticsResult
        AnalyticsResult analyticsResult;
        
        // Add columns
        for (const auto& columnName : result.value().columnNames) {
            analyticsResult.columns.push_back(columnName);
        }
        
        // Add rows
        for (size_t rowIdx = 0; rowIdx < result.value().rowCount(); ++rowIdx) {
            std::vector<AnalyticsValue> row;
            
            for (size_t colIdx = 0; colIdx < result.value().columnCount(); ++colIdx) {
                // Convert DbValue to AnalyticsValue
                // This is a simplified implementation
                const auto& dbValue = result.value().rows[rowIdx][colIdx];
                
                // Use std::visit to convert DbValue to AnalyticsValue
                row.push_back(std::visit([](auto&& arg) -> AnalyticsValue {
                    return arg;
                }, dbValue));
            }
            
            analyticsResult.rows.push_back(row);
        }
        
        return APTP::Core::Success(analyticsResult);
    } catch (const std::exception& e) {
        APTP::Core::Logger::getInstance().error("Exception executing analytics query: {}", e.what());
        return APTP::Core::Error<AnalyticsResult>(APTP::Core::ErrorCode::AnalyticsError);
    }
}

// Additional method implementations would follow similar patterns...

} // namespace APTP::Analytics
