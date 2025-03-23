// /debriefing/controllers/DebriefingController.h
#pragma once

#include <drogon/HttpController.h>
#include "../services/SessionReplayService.h"
#include "../services/EventTaggingService.h"
#include "../services/PerformanceDeviationService.h"
#include "../services/DebriefReportService.h"

namespace debriefing {

class DebriefingController : public drogon::HttpController<DebriefingController> {
public:
    DebriefingController();
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(DebriefingController::createReplaySession, "/api/debriefing/replay-session", drogon::Post);
    ADD_METHOD_TO(DebriefingController::getReplaySession, "/api/debriefing/replay-session/{id}", drogon::Get);
    ADD_METHOD_TO(DebriefingController::addEventTag, "/api/debriefing/event-tag", drogon::Post);
    ADD_METHOD_TO(DebriefingController::getEventTags, "/api/debriefing/event-tags/{sessionId}", drogon::Get);
    ADD_METHOD_TO(DebriefingController::detectPerformanceDeviations, "/api/debriefing/detect-deviations", drogon::Post);
    ADD_METHOD_TO(DebriefingController::generateDebriefReport, "/api/debriefing/report", drogon::Post);
    ADD_METHOD_TO(DebriefingController::getDebriefReportTemplates, "/api/debriefing/report-templates", drogon::Get);
    METHOD_LIST_END

private:
    void createReplaySession(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void getReplaySession(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback, const std::string& id);
    void addEventTag(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void getEventTags(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback, const std::string& sessionId);
    void detectPerformanceDeviations(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void generateDebriefReport(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void getDebriefReportTemplates(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);

    std::shared_ptr<SessionReplayService> replayService_;
    std::shared_ptr<EventTaggingService> eventTaggingService_;
    std::shared_ptr<PerformanceDeviationService> deviationService_;
    std::shared_ptr<DebriefReportService> reportService_;
};

} // namespace debriefing

// /debriefing/controllers/DebriefingController.cc
#include "DebriefingController.h"
#include <drogon/HttpResponse.h>
#include <json/json.h>

using namespace debriefing;

DebriefingController::DebriefingController()
    : replayService_(std::make_shared<SessionReplayService>()),
      eventTaggingService_(std::make_shared<EventTaggingService>()),
      deviationService_(std::make_shared<PerformanceDeviationService>()),
      reportService_(std::make_shared<DebriefReportService>()) {}

void DebriefingController::createReplaySession(const drogon::HttpRequestPtr& req, 
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
        std::string trainingSessionId = (*json)["trainingSessionId"].asString();
        std::string pilotId = (*json)["pilotId"].asString();
        std::string instructorId = (*json)["instructorId"].asString();
        Json::Value dataSources = (*json)["dataSources"];
        
        // Create replay session
        auto result = replayService_->createReplaySession(trainingSessionId, pilotId, instructorId, dataSources);
        
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::HttpStatusCode::k201Created);
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

void DebriefingController::getReplaySession(const drogon::HttpRequestPtr& req, 
                                          std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                                          const std::string& id) {
    try {
        // Get replay session
        auto result = replayService_->getReplaySession(id);
        
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

// /dashboard/controllers/AdminDashboardController.h
#pragma once

#include <drogon/HttpController.h>
#include "../services/KpiMonitoringService.h"
#include "../services/InterventionTrackingService.h"
#include "../services/ResourceUtilizationService.h"
#include "../services/TrainingAnalyticsService.h"

namespace dashboard {

class AdminDashboardController : public drogon::HttpController<AdminDashboardController> {
public:
    AdminDashboardController();
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(AdminDashboardController::getKpiData, "/api/dashboard/kpi", drogon::Get);
    ADD_METHOD_TO(AdminDashboardController::getInterventions, "/api/dashboard/interventions", drogon::Get);
    ADD_METHOD_TO(AdminDashboardController::trackIntervention, "/api/dashboard/intervention", drogon::Post);
    ADD_METHOD_TO(AdminDashboardController::getResourceUtilization, "/api/dashboard/resources", drogon::Get);
    ADD_METHOD_TO(AdminDashboardController::forecastResourceUtilization, "/api/dashboard/resources/forecast", drogon::Post);
    ADD_METHOD_TO(AdminDashboardController::getTrainingAnalytics, "/api/dashboard/analytics", drogon::Get);
    ADD_METHOD_TO(AdminDashboardController::getDashboardConfig, "/api/dashboard/config", drogon::Get);
    ADD_METHOD_TO(AdminDashboardController::updateDashboardConfig, "/api/dashboard/config", drogon::Put);
    METHOD_LIST_END

private:
    void getKpiData(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void getInterventions(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void trackIntervention(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void getResourceUtilization(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void forecastResourceUtilization(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void getTrainingAnalytics(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void getDashboardConfig(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void updateDashboardConfig(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);

    std::shared_ptr<KpiMonitoringService> kpiService_;
    std::shared_ptr<InterventionTrackingService> interventionService_;
    std::shared_ptr<ResourceUtilizationService> resourceService_;
    std::shared_ptr<TrainingAnalyticsService> analyticsService_;
};

} // namespace dashboard

// /debriefing/services/SessionReplayService.h
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <json/json.h>
#include "../models/ReplaySession.h"
#include "../models/TimeSeriesData.h"
#include "../models/DataSource.h"
#include "../repositories/ReplaySessionRepository.h"

namespace debriefing {

class SessionReplayService {
public:
    SessionReplayService();
    ~SessionReplayService();

    // Create a new replay session
    Json::Value createReplaySession(const std::string& trainingSessionId, const std::string& pilotId, 
                                   const std::string& instructorId, const Json::Value& dataSources);
    
    // Get replay session by ID
    Json::Value getReplaySession(const std::string& sessionId);
    
    // Get time series data for playback
    Json::Value getTimeSeriesData(const std::string& sessionId, const std::string& dataType, 
                                 double startTime, double endTime);
    
    // Add data source to replay session
    Json::Value addDataSource(const std::string& sessionId, const std::string& dataSourceType, 
                             const std::string& dataSourceId);
    
    // Remove data source from replay session
    bool removeDataSource(const std::string& sessionId, const std::string& dataSourceId);
    
    // Change playback speed
    Json::Value setPlaybackSpeed(const std::string& sessionId, double speed);
    
    // Get available playback ranges
    Json::Value getPlaybackRanges(const std::string& sessionId);
    
    // Create a clip from the replay session
    Json::Value createReplayClip(const std::string& sessionId, double startTime, double endTime, 
                               const std::string& title, const std::string& description);
    
    // Get replay clips
    Json::Value getReplayClips(const std::string& sessionId);

private:
    // Load session data
    ReplaySession loadSessionData(const std::string& sessionId);
    
    // Load time series data
    std::vector<TimeSeriesData> loadTimeSeriesData(const std::string& sessionId, const std::string& dataType,
                                                double startTime, double endTime);
    
    // Synchronize multiple data sources
    std::vector<TimeSeriesData> synchronizeDataSources(const std::vector<DataSource>& dataSources, 
                                                    double startTime, double endTime);
    
    // Preprocess time series data for playback
    std::vector<TimeSeriesData> preprocessTimeSeriesData(const std::vector<TimeSeriesData>& data);
    
    // Repository for session storage
    std::shared_ptr<ReplaySessionRepository> repository_;
};

} // namespace debriefing

// /debriefing/services/EventTaggingService.h
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <json/json.h>
#include "../models/EventTag.h"
#include "../models/TagCategory.h"
#include "../repositories/EventTagRepository.h"

namespace debriefing {

class EventTaggingService {
public:
    EventTaggingService();
    ~EventTaggingService();

    // Add event tag
    Json::Value addEventTag(const std::string& sessionId, const std::string& userId, 
                          double timestamp, const std::string& category,
                          const std::string& description, const Json::Value& metadata);
    
    // Get event tags for a session
    Json::Value getEventTags(const std::string& sessionId);
    
    // Get event tags by category
    Json::Value getEventTagsByCategory(const std::string& sessionId, const std::string& category);
    
    // Get event tags by time range
    Json::Value getEventTagsByTimeRange(const std::string& sessionId, double startTime, double endTime);
    
    // Update event tag
    Json::Value updateEventTag(const std::string& tagId, const std::string& description, 
                             const std::string& category, const Json::Value& metadata);
    
    // Delete event tag
    bool deleteEventTag(const std::string& tagId);
    
    // Get tag categories
    Json::Value getTagCategories();
    
    // Create tag category
    Json::Value createTagCategory(const std::string& name, const std::string& description, 
                                const std::string& color);
    
    // Generate tag analytics
    Json::Value generateTagAnalytics(const std::string& sessionId);

private:
    // Validate tag data
    bool validateTagData(const std::string& sessionId, const std::string& userId, 
                        double timestamp, const std::string& category);
    
    // Get tag category info
    TagCategory getTagCategory(const std::string& category);
    
    // Generate tag ID
    std::string generateTagId();
    
    // Repository for tag storage
    std::shared_ptr<EventTagRepository> repository_;
};

} // namespace debriefing

// /debriefing/services/PerformanceDeviationService.h
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <json/json.h>
#include "../models/PerformanceDeviation.h"
#include "../models/PerformanceThreshold.h"
#include "../repositories/DeviationRepository.h"

namespace debriefing {

class PerformanceDeviationService {
public:
    PerformanceDeviationService();
    ~PerformanceDeviationService();

    // Detect performance deviations in a session
    Json::Value detectPerformanceDeviations(const std::string& sessionId, const Json::Value& parameters = Json::Value());
    
    // Get performance deviations for a session
    Json::Value getPerformanceDeviations(const std::string& sessionId);
    
    // Configure deviation detection parameters
    Json::Value configureDeviationDetection(const std::string& deviceType, const Json::Value& thresholds);
    
    // Get deviation detection configuration
    Json::Value getDeviationDetectionConfig(const std::string& deviceType);
    
    // Flag or unflag a deviation
    Json::Value flagDeviation(const std::string& deviationId, bool flag, const std::string& comment = "");
    
    // Add instructor comment to a deviation
    Json::Value addDeviationComment(const std::string& deviationId, const std::string& userId, 
                                  const std::string& comment);
    
    // Get deviation comments
    Json::Value getDeviationComments(const std::string& deviationId);
    
    // Generate deviation report
    Json::Value generateDeviationReport(const std::string& sessionId, const std::string& format = "json");

private:
    // Load performance data
    std::vector<Json::Value> loadPerformanceData(const std::string& sessionId);
    
    // Load performance thresholds
    std::vector<PerformanceThreshold> loadPerformanceThresholds(const std::string& deviceType);
    
    // Analyze flight parameters for deviations
    std::vector<PerformanceDeviation> analyzeFlightParameters(const std::vector<Json::Value>& data, 
                                                          const std::vector<PerformanceThreshold>& thresholds);
    
    // Analyze procedure compliance for deviations
    std::vector<PerformanceDeviation> analyzeProcedureCompliance(const std::vector<Json::Value>& data, 
                                                              const std::vector<PerformanceThreshold>& thresholds);
    
    // Apply statistical anomaly detection
    std::vector<PerformanceDeviation> applyAnomalyDetection(const std::vector<Json::Value>& data);
    
    // Generate deviation ID
    std::string generateDeviationId();
    
    // Repository for deviation storage
    std::shared_ptr<DeviationRepository> repository_;
};

} // namespace debriefing

// /debriefing/services/DebriefReportService.h
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <json/json.h>
#include "../models/DebriefReport.h"
#include "../models/ReportTemplate.h"
#include "../repositories/ReportRepository.h"

namespace debriefing {

class DebriefReportService {
public:
    DebriefReportService();
    ~DebriefReportService();

    // Generate debrief report
    Json::Value generateDebriefReport(const std::string& sessionId, const std::string& templateId, 
                                    const Json::Value& customParams = Json::Value());
    
    // Get report by ID
    Json::Value getReport(const std::string& reportId);
    
    // Get reports for a session
    Json::Value getSessionReports(const std::string& sessionId);
    
    // Get report templates
    Json::Value getReportTemplates();
    
    // Create report template
    Json::Value createReportTemplate(const std::string& name, const std::string& description, 
                                   const Json::Value& sections);
    
    // Update report template
    Json::Value updateReportTemplate(const std::string& templateId, const std::string& name, 
                                   const std::string& description, const Json::Value& sections);
    
    // Delete report template
    bool deleteReportTemplate(const std::string& templateId);
    
    // Add AI insights to report
    Json::Value addAiInsights(const std::string& reportId);
    
    // Export report to various formats
    std::string exportReport(const std::string& reportId, const std::string& format);

private:
    // Load session data
    Json::Value loadSessionData(const std::string& sessionId);
    
    // Load template data
    ReportTemplate loadTemplateData(const std::string& templateId);
    
    // Generate report sections based on template
    std::vector<Json::Value> generateReportSections(const ReportTemplate& template_, 
                                                 const Json::Value& sessionData,
                                                 const Json::Value& customParams);
    
    // Generate AI insights
    Json::Value generateAiInsights(const Json::Value& sessionData);
    
    // Format report content
    std::string formatReportContent(const DebriefReport& report, const std::string& format);
    
    // Generate report ID
    std::string generateReportId();
    
    // Repository for report storage
    std::shared_ptr<ReportRepository> repository_;
};

} // namespace debriefing

// /dashboard/services/KpiMonitoringService.h
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <json/json.h>
#include "../models/KeyPerformanceIndicator.h"
#include "../models/KpiAlert.h"
#include "../repositories/KpiRepository.h"

namespace dashboard {

class KpiMonitoringService {
public:
    KpiMonitoringService();
    ~KpiMonitoringService();

    // Get KPI data
    Json::Value getKpiData(const std::string& scope = "all", const std::string& timeFrame = "current");
    
    // Get KPI data for specific entity
    Json::Value getEntityKpiData(const std::string& entityType, const std::string& entityId, 
                               const std::string& timeFrame = "current");
    
    // Configure KPI thresholds
    Json::Value configureKpiThresholds(const std::string& kpiId, double warningThreshold, 
                                     double criticalThreshold);
    
    // Get KPI alerts
    Json::Value getKpiAlerts(const std::string& severity = "all");
    
    // Acknowledge KPI alert
    Json::Value acknowledgeKpiAlert(const std::string& alertId, const std::string& userId, 
                                  const std::string& comment = "");
    
    // Subscribe to KPI alerts
    Json::Value subscribeToKpiAlerts(const std::string& userId, const std::string& kpiId, 
                                   const std::string& notificationType);
    
    // Create custom KPI
    Json::Value createCustomKpi(const std::string& name, const std::string& description, 
                              const std::string& formula, const std::string& unit, 
                              double warningThreshold, double criticalThreshold);
    
    // Update custom KPI
    Json::Value updateCustomKpi(const std::string& kpiId, const std::string& name, 
                              const std::string& description, const std::string& formula, 
                              const std::string& unit, double warningThreshold, 
                              double criticalThreshold);
    
    // Delete custom KPI
    bool deleteCustomKpi(const std::string& kpiId);

private:
    // Load KPI definitions
    std::vector<KeyPerformanceIndicator> loadKpiDefinitions();
    
    // Calculate KPI values
    std::vector<std::pair<std::string, double>> calculateKpiValues(const std::vector<KeyPerformanceIndicator>& kpis, 
                                                                const std::string& scope, 
                                                                const std::string& timeFrame);
    
    // Check for KPI threshold violations
    std::vector<KpiAlert> checkThresholdViolations(const std::vector<std::pair<std::string, double>>& kpiValues, 
                                                const std::vector<KeyPerformanceIndicator>& kpis);
    
    // Evaluate KPI formula
    double evaluateFormula(const std::string& formula, const Json::Value& variables);
    
    // Generate KPI ID
    std::string generateKpiId();
    
    // Repository for KPI storage
    std::shared_ptr<KpiRepository> repository_;
};

} // namespace dashboard

// /dashboard/services/InterventionTrackingService.h
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <json/json.h>
#include "../models/Intervention.h"
#include "../models/InterventionType.h"
#include "../repositories/InterventionRepository.h"

namespace dashboard {

class InterventionTrackingService {
public:
    InterventionTrackingService();
    ~InterventionTrackingService();

    // Track a new intervention
    Json::Value trackIntervention(const std::string& traineeId, const std::string& instructorId, 
                                const std::string& interventionType, const std::string& description, 
                                const Json::Value& details);
    
    // Get interventions
    Json::Value getInterventions(const std::string& traineeId = "", const std::string& instructorId = "", 
                               const std::string& interventionType = "", const std::string& status = "", 
                               const std::string& startDate = "", const std::string& endDate = "");
    
    // Get intervention by ID
    Json::Value getIntervention(const std::string& interventionId);
    
    // Update intervention status
    Json::Value updateInterventionStatus(const std::string& interventionId, const std::string& status, 
                                       const std::string& comment = "");
    
    // Add comment to intervention
    Json::Value addInterventionComment(const std::string& interventionId, const std::string& userId, 
                                     const std::string& comment);
    
    // Get intervention types
    Json::Value getInterventionTypes();
    
    // Create intervention type
    Json::Value createInterventionType(const std::string& name, const std::string& description, 
                                     const std::string& category, const Json::Value& fields);
    
    // Generate intervention analytics
    Json::Value generateInterventionAnalytics(const std::string& groupBy = "type");

private:
    // Validate intervention data
    bool validateInterventionData(const std::string& traineeId, const std::string& instructorId, 
                                const std::string& interventionType);
    
    // Validate intervention type fields
    bool validateTypeFields(const std::string& interventionType, const Json::Value& details);
    
    // Get intervention type info
    InterventionType getInterventionTypeInfo(const std::string& interventionType);
    
    // Generate intervention ID
    std::string generateInterventionId();
    
    // Repository for intervention storage
    std::shared_ptr<InterventionRepository> repository_;
};

} // namespace dashboard

// /dashboard/services/ResourceUtilizationService.h
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <json/json.h>
#include "../models/Resource.h"
#include "../models/ResourceUtilization.h"
#include "../repositories/ResourceRepository.h"

namespace dashboard {

class ResourceUtilizationService {
public:
    ResourceUtilizationService();
    ~ResourceUtilizationService();

    // Get resource utilization
    Json::Value getResourceUtilization(const std::string& resourceType = "all", 
                                     const std::string& timeFrame = "current");
    
    // Get resource utilization by ID
    Json::Value getResourceUtilizationById(const std::string& resourceId, 
                                         const std::string& timeFrame = "current");
    
    // Forecast resource utilization
    Json::Value forecastResourceUtilization(const std::string& resourceType, 
                                          const std::string& startDate, 
                                          const std::string& endDate, 
                                          const Json::Value& parameters = Json::Value());
    
    // Get resource capacity
    Json::Value getResourceCapacity(const std::string& resourceType = "all");
    
    // Update resource capacity
    Json::Value updateResourceCapacity(const std::string& resourceId, double capacity);
    
    // Get resource utilization trends
    Json::Value getUtilizationTrends(const std::string& resourceType, 
                                   const std::string& startDate, 
                                   const std::string& endDate, 
                                   const std::string& interval = "day");
    
    // Optimize resource allocation
    Json::Value optimizeResourceAllocation(const Json::Value& constraints);
    
    // Get resource allocation conflicts
    Json::Value getResourceConflicts(const std::string& startDate, const std::string& endDate);

private:
    // Load resources
    std::vector<Resource> loadResources(const std::string& resourceType);
    
    // Load resource utilization data
    std::vector<ResourceUtilization> loadUtilizationData(const std::string& resourceId, 
                                                      const std::string& timeFrame);
    
    // Calculate utilization metrics
    Json::Value calculateUtilizationMetrics(const std::vector<ResourceUtilization>& utilizationData, 
                                          const Resource& resource);
    
    // Apply forecasting algorithm
    std::vector<ResourceUtilization> applyForecastingAlgorithm(const std::vector<ResourceUtilization>& historicalData, 
                                                            const std::string& startDate, 
                                                            const std::string& endDate, 
                                                            const Json::Value& parameters);
    
    // Calculate resource efficiency
    double calculateResourceEfficiency(const std::vector<ResourceUtilization>& utilizationData, 
                                     const Resource& resource);
    
    // Apply resource optimization algorithm
    Json::Value applyOptimizationAlgorithm(const std::vector<Resource>& resources, 
                                         const Json::Value& constraints);
    
    // Repository for resource storage
    std::shared_ptr<ResourceRepository> repository_;
};

} // namespace dashboard

// /dashboard/services/TrainingAnalyticsService.h
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <json/json.h>
#include "../models/TrainingMetric.h"
#include "../models/TrainingCohort.h"
#include "../repositories/AnalyticsRepository.h"

namespace dashboard {

class TrainingAnalyticsService {
public:
    TrainingAnalyticsService();
    ~TrainingAnalyticsService();

    // Get training analytics
    Json::Value getTrainingAnalytics(const std::string& metricType = "all", 
                                   const std::string& timeFrame = "current");
    
    // Get trainee performance analytics
    Json::Value getTraineePerformance(const std::string& traineeId, 
                                    const std::string& metricType = "all");
    
    // Get instructor performance analytics
    Json::Value getInstructorPerformance(const std::string& instructorId, 
                                       const std::string& metricType = "all");
    
    // Compare cohort performance
    Json::Value compareCohortPerformance(const std::string& cohortId1, 
                                       const std::string& cohortId2, 
                                       const std::string& metricType = "all");
    
    // Get training completion trends
    Json::Value getCompletionTrends(const std::string& programType, 
                                  const std::string& startDate, 
                                  const std::string& endDate, 
                                  const std::string& interval = "month");
    
    // Get certification success rates
    Json::Value getCertificationSuccessRates(const std::string& programType, 
                                           const std::string& startDate, 
                                           const std::string& endDate);
    
    // Get training bottlenecks
    Json::Value getTrainingBottlenecks(const std::string& programType);
    
    // Get instructor effectiveness ratings
    Json::Value getInstructorEffectiveness(const std::string& departmentId = "");

private:
    // Load training metrics
    std::vector<TrainingMetric> loadTrainingMetrics(const std::string& metricType, 
                                                 const std::string& timeFrame);
    
    // Load trainee performance data
    Json::Value loadTraineePerformanceData(const std::string& traineeId, 
                                         const std::string& metricType);
    
    // Load instructor performance data
    Json::Value loadInstructorPerformanceData(const std::string& instructorId, 
                                            const std::string& metricType);
    
    // Load cohort data
    TrainingCohort loadCohortData(const std::string& cohortId);
    
    // Calculate performance metrics
    Json::Value calculatePerformanceMetrics(const std::vector<Json::Value>& performanceData, 
                                          const std::string& metricType);
    
    // Calculate completion rates
    Json::Value calculateCompletionRates(const std::vector<Json::Value>& completionData, 
                                       const std::string& interval);
    
    // Identify training bottlenecks
    std::vector<Json::Value> identifyBottlenecks(const std::vector<Json::Value>& progressData, 
                                              const std::string& programType);
    
    // Repository for analytics storage
    std::shared_ptr<AnalyticsRepository> repository_;
};

} // namespace dashboard

// Python ML component for session replay and performance deviation detection
# /debriefing/ml/session_analyzer.py
import os
import json
import numpy as np
import pandas as pd
from datetime import datetime
from typing import Dict, List, Any, Tuple, Optional
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler
from scipy.stats import zscore
from scipy.signal import find_peaks

class SessionAnalyzer:
    """Analyze flight session data for deviations and patterns"""
    
    def __init__(self, model_path: str = "deviation_models"):
        self.model_path = model_path
        
        # Load models and thresholds
        self.parameter_thresholds = self._load_parameter_thresholds()
        self.procedure_templates = self._load_procedure_templates()
    
    def _load_parameter_thresholds(self) -> Dict[str, Dict[str, float]]:
        """Load parameter thresholds for deviation detection"""
        # This would typically load from a database or config file
        # Using hardcoded values for example
        return {
            "airspeed": {
                "min": -15.0,  # Knots below target
                "max": 10.0,   # Knots above target
                "rate_max": 5.0  # Max rate of change (knots/sec)
            },
            "altitude": {
                "min": -100.0,  # Feet below target
                "max": 100.0,   # Feet above target
                "rate_max": 1000.0  # Max rate of change (feet/min)
            },
            "bank_angle": {
                "min": -5.0,    # Degrees below target
                "max": 5.0,     # Degrees above target
                "abs_max": 30.0  # Absolute maximum (degrees)
            },
            "pitch_angle": {
                "min": -3.0,    # Degrees below target
                "max": 3.0,     # Degrees above target
                "abs_max": 15.0  # Absolute maximum (degrees)
            },
            "heading": {
                "min": -5.0,    # Degrees below target
                "max": 5.0,     # Degrees above target
                "rate_max": 3.0  # Max rate of change (degrees/sec)
            },
            "vertical_speed": {
                "min": -200.0,  # Feet/min below target
                "max": 200.0,   # Feet/min above target
                "abs_max": 1000.0  # Absolute maximum (feet/min)
            }
        }
    
    def _load_procedure_templates(self) -> Dict[str, List[Dict[str, Any]]]:
        """Load procedure templates for compliance checking"""
        # This would typically load from a database
        # Using hardcoded templates for example
        return {
            "takeoff": [
                {"parameter": "flaps", "value": "takeoff", "tolerance": 0, "description": "Flaps set to takeoff position"},
                {"parameter": "throttle", "value": 100, "tolerance": 5, "description": "Throttle set to takeoff power"},
                {"parameter": "pitch_angle", "value": 10, "tolerance": 2, "description": "Rotation at proper pitch angle"}
            ],
            "approach": [
                {"parameter": "airspeed", "value": "approach_speed", "tolerance": 5, "description": "Maintain approach speed"},
                {"parameter": "flaps", "value": "landing", "tolerance": 0, "description": "Flaps set to landing position"},
                {"parameter": "gear", "value": "down", "tolerance": 0, "description": "Landing gear down and locked"}
            ],
            "emergency_descent": [
                {"parameter": "throttle", "value": "idle", "tolerance": 5, "description": "Throttle at idle"},
                {"parameter": "pitch_angle", "value": -5, "tolerance": 2, "description": "Nose down pitch"},
                {"parameter": "airspeed", "value": "maneuvering_speed", "tolerance": 10, "description": "Airspeed below maximum"}
            ]
        }
    
    def detect_parameter_deviations(self, session_data: pd.DataFrame, 
                                   ref_values: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Detect deviations in flight parameters
        
        Args:
            session_data: DataFrame with flight parameters and timestamps
            ref_values: Optional reference values for each parameter
            
        Returns:
            List of detected deviations
        """
        if session_data.empty:
            return []
        
        deviations = []
        
        # Make sure we have a timestamp column
        if 'timestamp' not in session_data.columns:
            session_data['timestamp'] = np.arange(len(session_data))
        
        # Get parameters to analyze
        parameters = [col for col in session_data.columns if col in self.parameter_thresholds]
        
        for param in parameters:
            # Skip if parameter is not present
            if param not in session_data.columns:
                continue
            
            # Get thresholds for this parameter
            thresholds = self.parameter_thresholds[param]
            
            # Get reference value if provided, otherwise use mean
            ref_value = ref_values.get(param, session_data[param].mean()) if ref_values else session_data[param].mean()
            
            # Calculate deviations from reference
            deviations_from_ref = session_data[param] - ref_value
            
            # Apply threshold checks
            min_threshold = thresholds.get('min', -float('inf'))
            max_threshold = thresholds.get('max', float('inf'))
            abs_max = thresholds.get('abs_max', float('inf'))
            
            # Min/max deviation from reference
            min_violations = deviations_from_ref < min_threshold
            max_violations = deviations_from_ref > max_threshold
            
            # Absolute maximum check
            abs_violations = np.abs(session_data[param]) > abs_max if abs_max < float('inf') else np.zeros_like(min_violations)
            
            # Rate of change check
            rate_violations = np.zeros_like(min_violations)
            if 'rate_max' in thresholds and len(session_data) > 1:
                # Calculate rate of change
                if 'time' in session_data.columns:
                    # Use actual time differences
                    time_diff = np.diff(session_data['time'])
                    param_diff = np.diff(session_data[param])
                    rates = np.abs(param_diff / np.maximum(time_diff, 0.001))  # Avoid division by zero
                else:
                    # Assume constant time steps
                    rates = np.abs(np.diff(session_data[param]))
                
                # Check for violations
                rate_max = thresholds['rate_max']
                rate_violations_subset = rates > rate_max
                
                # Align with original array size
                rate_violations[1:] = rate_violations_subset
            
            # Combine all violations
            violations = min_violations | max_violations | abs_violations | rate_violations
            
            # Group continuous violations
            if violations.any():
                # Find starts and ends of violation segments
                starts = np.where(np.concatenate(([False], violations[:-1] != violations[1:], [True])) & violations)[0]
                ends = np.where(np.concatenate(([False], violations[:-1] != violations[1:], [True])) & ~violations)[0]
                
                # Process each violation segment
                for start, end in zip(starts, ends):
                    # Calculate segment statistics
                    segment = session_data.iloc[start:end]
                    mean_value = segment[param].mean()
                    max_value = segment[param].max()
                    min_value = segment[param].min()
                    duration = segment['timestamp'].iloc[-1] - segment['timestamp'].iloc[0]
                    
                    # Determine deviation type
                    if (min_violations.iloc[start:end]).any():
                        deviation_type = "below_minimum"
                    elif (max_violations.iloc[start:end]).any():
                        deviation_type = "above_maximum"
                    elif (abs_violations.iloc[start:end]).any():
                        deviation_type = "absolute_maximum_exceeded"
                    elif (rate_violations.iloc[start:end]).any():
                        deviation_type = "rate_of_change_exceeded"
                    else:
                        deviation_type = "unknown"
                    
                    # Create deviation record
                    deviation = {
                        'id': f"dev_{param}_{start}_{end}",
                        'parameter': param,
                        'start_time': float(segment['timestamp'].iloc[0]),
                        'end_time': float(segment['timestamp'].iloc[-1]),
                        'duration': float(duration),
                        'mean_value': float(mean_value),
                        'min_value': float(min_value),
                        'max_value': float(max_value),
                        'reference_value': float(ref_value),
                        'deviation_type': deviation_type,
                        'severity': self._calculate_deviation_severity(param, mean_value, ref_value, thresholds)
                    }
                    
                    deviations.append(deviation)
        
        return deviations
    
    def _calculate_deviation_severity(self, parameter: str, actual_value: float, 
                                     reference_value: float, thresholds: Dict[str, float]) -> str:
        """Calculate the severity of a deviation based on how far it exceeds thresholds"""
        deviation = abs(actual_value - reference_value)
        
        # Get relevant thresholds
        min_threshold = abs(thresholds.get('min', 0))
        max_threshold = abs(thresholds.get('max', 0))
        abs_max = thresholds.get('abs_max', float('inf'))
        
        # Use the larger of min/max thresholds
        threshold = max(min_threshold, max_threshold)
        
        if threshold == 0:
            return "medium"  # Default if no thresholds defined
        
        # Calculate severity ratio
        severity_ratio = deviation / threshold
        
        if severity_ratio <= 1.2:
            return "low"
        elif severity_ratio <= 2.0:
            return "medium"
        else:
            return "high"
    
    def detect_procedure_deviations(self, session_data: pd.DataFrame, 
                                   procedure_type: str) -> List[Dict[str, Any]]:
        """
        Detect deviations from standard procedures
        
        Args:
            session_data: DataFrame with flight parameters and timestamps
            procedure_type: Type of procedure to check (takeoff, approach, etc.)
            
        Returns:
            List of detected procedure deviations
        """
        if session_data.empty or procedure_type not in self.procedure_templates:
            return []
        
        deviations = []
        
        # Get procedure template
        procedure = self.procedure_templates[procedure_type]
        
        # Check each step in the procedure
        for i, step in enumerate(procedure):
            parameter = step['parameter']
            expected_value = step['value']
            tolerance = step['tolerance']
            description = step['description']
            
            # Skip if parameter is not in the data
            if parameter not in session_data.columns:
                continue
            
            # Handle special values (like 'takeoff', 'approach_speed', etc.)
            if isinstance(expected_value, str):
                # This would typically look up the appropriate value from a config
                # Using examples here
                if expected_value == 'takeoff':
                    expected_value = 1  # Example for flaps position
                elif expected_value == 'approach_speed':
                    expected_value = 120  # Example airspeed
                elif expected_value == 'landing':
                    expected_value = 2  # Example for flaps position
                elif expected_value == 'down':
                    expected_value = 1  # Example for gear position (1=down)
                elif expected_value == 'idle':
                    expected_value = 0  # Example for throttle position
                elif expected_value == 'maneuvering_speed':
                    expected_value = 150  # Example airspeed
            
            # Check for deviations
            values = session_data[parameter].values
            if isinstance(expected_value, (int, float)):
                # For numeric values, check if within tolerance
                deviations_mask = np.abs(values - expected_value) > tolerance
                
                if np.any(deviations_mask):
                    # Find segments of continuous deviations
                    segments = self._find_continuous_segments(deviations_mask)
                    
                    for start_idx, end_idx in segments:
                        segment = session_data.iloc[start_idx:end_idx]
                        
                        # Calculate statistics
                        mean_value = segment[parameter].mean()
                        max_value = segment[parameter].max()
                        min_value = segment[parameter].min()
                        
                        if 'timestamp' in session_data.columns:
                            start_time = segment['timestamp'].iloc[0]
                            end_time = segment['timestamp'].iloc[-1]
                            duration = end_time - start_time
                        else:
                            start_time = start_idx
                            end_time = end_idx
                            duration = end_idx - start_idx
                        
                        # Create deviation record
                        deviation = {
                            'id': f"proc_{procedure_type}_{i}_{start_idx}_{end_idx}",
                            'procedure': procedure_type,
                            'step': i + 1,
                            'description': description,
                            'parameter': parameter,
                            'expected_value': float(expected_value),
                            'actual_mean_value': float(mean_value),
                            'min_value': float(min_value),
                            'max_value': float(max_value),
                            'start_time': float(start_time),
                            'end_time': float(end_time),
                            'duration': float(duration),
                            'severity': self._calculate_procedure_severity(mean_value, expected_value, tolerance)
                        }
                        
                        deviations.append(deviation)
            else:
                # For non-numeric values (like string enums), exact match is required
                deviations_mask = values != expected_value
                
                if np.any(deviations_mask):
                    # Handle similar to numeric case
                    # Implementation would be similar to above
                    pass
        
        return deviations
    
    def _find_continuous_segments(self, mask: np.ndarray) -> List[Tuple[int, int]]:
        """Find segments of continuous True values in a boolean mask"""
        segments = []
        
        # Find changes in the mask
        changes = np.diff(np.concatenate(([False], mask, [False])))
        start_indices = np.where(changes == 1)[0]
        end_indices = np.where(changes == -1)[0]
        
        # Pair starts and ends
        for start, end in zip(start_indices, end_indices):
            segments.append((start, end))
        
        return segments
    
    def _calculate_procedure_severity(self, actual_value: float, expected_value: float, 
                                     tolerance: float) -> str:
        """Calculate the severity of a procedure deviation"""
        if tolerance == 0:
            return "high"  # Zero tolerance means any deviation is severe
        
        deviation = abs(actual_value - expected_value)
        severity_ratio = deviation / tolerance
        
        if severity_ratio <= 1.5:
            return "low"
        elif severity_ratio <= 3.0:
            return "medium"
        else:
            return "high"
    
    def detect_anomalies(self, session_data: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Detect statistical anomalies in flight parameters
        
        Args:
            session_data: DataFrame with flight parameters and timestamps
            
        Returns:
            List of detected anomalies
        """
        if session_data.empty:
            return []
        
        anomalies = []
        
        # Make sure we have a timestamp column
        if 'timestamp' not in session_data.columns:
            session_data['timestamp'] = np.arange(len(session_data))
        
        # Select numeric columns for analysis
        numeric_cols = session_data.select_dtypes(include=[np.number]).columns
        numeric_cols = [col for col in numeric_cols if col != 'timestamp']
        
        if len(numeric_cols) == 0:
            return []
        
        # Z-score method for univariate anomalies
        for col in numeric_cols:
            z_scores = zscore(session_data[col], nan_policy='omit')
            
            # Find points with high z-scores (outliers)
            outliers = np.abs(z_scores) > 3.0
            
            if np.any(outliers):
                # Find segments of continuous outliers
                segments = self._find_continuous_segments(outliers)
                
                for start_idx, end_idx in segments:
                    segment = session_data.iloc[start_idx:end_idx]
                    
                    # Calculate statistics
                    mean_value = segment[col].mean()
                    max_value = segment[col].max()
                    min_value = segment[col].min()
                    max_z = np.max(np.abs(z_scores[start_idx:end_idx]))
                    
                    anomaly = {
                        'id': f"anom_{col}_{start_idx}_{end_idx}",
                        'parameter': col,
                        'type': 'statistical_outlier',
                        'start_time': float(segment['timestamp'].iloc[0]),
                        'end_time': float(segment['timestamp'].iloc[-1]),
                        'duration': float(segment['timestamp'].iloc[-1] - segment['timestamp'].iloc[0]),
                        'mean_value': float(mean_value),
                        'min_value': float(min_value),
                        'max_value': float(max_value),
                        'z_score': float(max_z),
                        'severity': 'high' if max_z > 5.0 else 'medium' if max_z > 4.0 else 'low'
                    }
                    
                    anomalies.append(anomaly)
        
        # DBSCAN for multivariate anomalies
        if len(numeric_cols) >= 2 and len(session_data) > 10:
            try:
                # Standardize the data
                scaler = StandardScaler()
                scaled_data = scaler.fit_transform(session_data[numeric_cols])
                
                # Apply DBSCAN
                dbscan = DBSCAN(eps=0.5, min_samples=5)
                clusters = dbscan.fit_predict(scaled_data)
                
                # Find outliers (points labeled as -1)
                outlier_indices = np.where(clusters == -1)[0]
                
                if len(outlier_indices) > 0:
                    # Group consecutive outliers
                    segments = []
                    current_segment = [outlier_indices[0]]
                    
                    for i in range(1, len(outlier_indices)):
                        if outlier_indices[i] == outlier_indices[i-1] + 1:
                            current_segment.append(outlier_indices[i])
                        else:
                            segments.append(current_segment)
                            current_segment = [outlier_indices[i]]
                    
                    if current_segment:
                        segments.append(current_segment)
                    
                    # Process each segment
                    for segment_indices in segments:
                        start_idx = segment_indices[0]
                        end_idx = segment_indices[-1] + 1
                        segment = session_data.iloc[start_idx:end_idx]
                        
                        # Calculate distance from cluster centers to determine severity
                        # (simplified approach here)
                        severity = 'medium'
                        if len(segment_indices) > 10:
                            severity = 'high'
                        elif len(segment_indices) <= 3:
                            severity = 'low'
                        
                        anomaly = {
                            'id': f"anom_multi_{start_idx}_{end_idx}",
                            'type': 'multivariate_anomaly',
                            'parameters': list(numeric_cols),
                            'start_time': float(segment['timestamp'].iloc[0]),
                            'end_time': float(segment['timestamp'].iloc[-1]),
                            'duration': float(segment['timestamp'].iloc[-1] - segment['timestamp'].iloc[0]),
                            'points_count': len(segment_indices),
                            'severity': severity
                        }
                        
                        anomalies.append(anomaly)
            except Exception as e:
                print(f"Error in multivariate anomaly detection: {e}")
        
        return anomalies
    
    def generate_session_insights(self, session_data: pd.DataFrame, 
                                 deviations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Generate insights about the training session
        
        Args:
            session_data: DataFrame with flight parameters and timestamps
            deviations: List of detected deviations
            
        Returns:
            Dictionary with insights
        """
        if session_data.empty:
            return {'status': 'error', 'message': 'No session data available'}
        
        insights = {
            'generated_at': datetime.now().isoformat(),
            'session_duration': float(session_data['timestamp'].iloc[-1] - session_data['timestamp'].iloc[0]) if 'timestamp' in session_data.columns else float(len(session_data)),
            'deviation_count': len(deviations),
            'high_severity_count': sum(1 for d in deviations if d.get('severity') == 'high'),
            'medium_severity_count': sum(1 for d in deviations if d.get('severity') == 'medium'),
            'low_severity_count': sum(1 for d in deviations if d.get('severity') == 'low'),
            'parameter_insights': {},
            'key_moments': [],
            'improvement_areas': [],
            'strengths': []
        }
        
        # Generate parameter insights
        numeric_cols = session_data.select_dtypes(include=[np.number]).columns
        numeric_cols = [col for col in numeric_cols if col != 'timestamp' and col in self.parameter_thresholds]
        
        for col in numeric_cols:
            # Calculate statistics
            mean_val = session_data[col].mean()
            std_val = session_data[col].std()
            min_val = session_data[col].min()
            max_val = session_data[col].max()
            
            # Count deviations for this parameter
            param_deviations = [d for d in deviations if d.get('parameter') == col]
            
            insights['parameter_insights'][col] = {
                'mean': float(mean_val),
                'std': float(std_val),
                'min': float(min_val),
                'max': float(max_val),
                'deviation_count': len(param_deviations),
                'stability': self._calculate_stability(session_data[col])
            }
        
        # Identify key moments
        # 1. Significant parameter changes
        for col in numeric_cols:
            if len(session_data) > 10:
                # Calculate rolling mean to smooth data
                rolling_mean = session_data[col].rolling(window=5, center=True).mean()
                
                # Calculate rate of change
                if 'time' in session_data.columns:
                    time_diff = np.diff(session_data['time'])
                    param_diff = np.diff(rolling_mean)
                    rates = param_diff / np.maximum(time_diff, 0.001)
                else:
                    rates = np.diff(rolling_mean)
                
                # Find peaks in absolute rate
                abs_rates = np.abs(rates)
                peaks, _ = find_peaks(abs_rates, height=np.percentile(abs_rates, 95), distance=10)
                
                for peak_idx in peaks:
                    if 'timestamp' in session_data.columns:
                        timestamp = session_data['timestamp'].iloc[peak_idx]
                    else:
                        timestamp = peak_idx
                    
                    insights['key_moments'].append({
                        'time': float(timestamp),
                        'type': 'rapid_change',
                        'parameter': col,
                        'value': float(session_data[col].iloc[peak_idx]),
                        'rate': float(rates[peak_idx])
                    })
        
        # 2. Deviation starts
        for deviation in deviations:
            if deviation.get('severity') in ['high', 'medium']:
                insights['key_moments'].append({
                    'time': deviation.get('start_time'),
                    'type': 'deviation_start',
                    'parameter': deviation.get('parameter', 'multiple'),
                    'severity': deviation.get('severity')
                })
        
        # Sort key moments by time
        insights['key_moments'].sort(key=lambda x: x['time'])
        
        # Identify improvement areas based on deviations
        # Group deviations by parameter
        param_deviations = {}
        for deviation in deviations:
            param = deviation.get('parameter', 'procedure')
            if param not in param_deviations:
                param_deviations[param] = []
            param_deviations[param].append(deviation)
        
        # Add improvement areas for parameters with multiple or severe deviations
        for param, devs in param_deviations.items():
            if len(devs) >= 3 or any(d.get('severity') == 'high' for d in devs):
                if param in self.parameter_thresholds:
                    # Parameter deviation
                    insights['improvement_areas'].append({
                        'area': param,
                        'type': 'parameter_control',
                        'description': f"Improve control of {param}",
                        'deviation_count': len(devs),
                        'high_severity_count': sum(1 for d in devs if d.get('severity') == 'high')
                    })
                else:
                    # Procedure deviation
                    insights['improvement_areas'].append({
                        'area': param,
                        'type': 'procedure_compliance',
                        'description': f"Improve adherence to {param} procedures",
                        'deviation_count': len(devs),
                        'high_severity_count': sum(1 for d in devs if d.get('severity') == 'high')
                    })
        
        # Identify strengths (parameters with good stability and few deviations)
        for col in numeric_cols:
            param_devs = param_deviations.get(col, [])
            param_insights = insights['parameter_insights'].get(col, {})
            
            if len(param_devs) <= 1 and param_insights.get('stability', 0) >= 0.8:
                insights['strengths'].append({
                    'area': col,
                    'type': 'parameter_control',
                    'description': f"Good control of {col}",
                    'stability': param_insights.get('stability', 0)
                })
        
        return insights
    
    def _calculate_stability(self, series: pd.Series) -> float:
        """Calculate stability score (0-1) for a time series"""
        if len(series) <= 1:
            return 1.0
        
        # Calculate normalized standard deviation
        mean = series.mean()
        std = series.std()
        
        if mean == 0:
            cv = std  # Avoid division by zero
        else:
            cv = std / abs(mean)  # Coefficient of variation
        
        # Calculate stability (1 = perfectly stable, 0 = very unstable)
        stability = 1.0 / (1.0 + min(cv, 1.0))
        
        return float(stability)

# Python ML component for AI-powered debrief reports
# /debriefing/ml/debrief_report_generator.py
import os
import json
import numpy as np
import pandas as pd
from datetime import datetime
from typing import Dict, List, Any, Optional
import matplotlib.pyplot as plt
import io
import base64
from sklearn.ensemble import IsolationForest

class DebriefReportGenerator:
    """Generate AI-enhanced debrief reports from session data and deviations"""
    
    def __init__(self, templates_path: str = "report_templates"):
        self.templates_path = templates_path
        
        # Load report templates
        self.templates = self._load_templates()
    
    def _load_templates(self) -> Dict[str, Any]:
        """Load report templates"""
        # This would typically load from files or a database
        # Using hardcoded templates for example
        return {
            "standard": {
                "id": "standard",
                "name": "Standard Debrief Report",
                "description": "Standard comprehensive debrief report with performance analysis",
                "sections": [
                    {"id": "summary", "name": "Executive Summary", "required": True},
                    {"id": "performance", "name": "Performance Metrics", "required": True},
                    {"id": "deviations", "name": "Significant Deviations", "required": True},
                    {"id": "insights", "name": "AI Insights", "required": False},
                    {"id": "recommendations", "name": "Recommendations", "required": True}
                ]
            },
            "quick": {
                "id": "quick",
                "name": "Quick Debrief Report",
                "description": "Abbreviated report highlighting key issues only",
                "sections": [
                    {"id": "summary", "name": "Summary", "required": True},
                    {"id": "key_issues", "name": "Key Issues", "required": True},
                    {"id": "recommendations", "name": "Quick Recommendations", "required": True}
                ]
            },
            "instructor": {
                "id": "instructor",
                "name": "Instructor Debrief Guide",
                "description": "Detailed guide for instructors with teaching points",
                "sections": [
                    {"id": "summary", "name": "Performance Summary", "required": True},
                    {"id": "deviations", "name": "Significant Deviations", "required": True},
                    {"id": "teaching_points", "name": "Teaching Points", "required": True},
                    {"id": "discussion_topics", "name": "Discussion Topics", "required": True},
                    {"id": "follow_up", "name": "Follow-up Training Recommendations", "required": True}
                ]
            }
        }
    
    def generate_report(self, session_data: Dict[str, Any], template_id: str, 
                       custom_params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Generate a debrief report
        
        Args:
            session_data: Dictionary with session information, metrics, deviations, etc.
            template_id: ID of the template to use
            custom_params: Optional custom parameters for report generation
            
        Returns:
            Generated report
        """
        # Validate inputs
        if not session_data:
            return {'status': 'error', 'message': 'No session data provided'}
        
        if template_id not in self.templates:
            template_id = "standard"  # Default to standard template
        
        template = self.templates[template_id]
        
        # Initialize report
        report = {
            'id': f"report_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            'template_id': template_id,
            'template_name': template['name'],
            'session_id': session_data.get('session_id', 'unknown'),
            'pilot_id': session_data.get('pilot_id', 'unknown'),
            'pilot_name': session_data.get('pilot_name', 'unknown'),
            'instructor_id': session_data.get('instructor_id', 'unknown'),
            'instructor_name': session_data.get('instructor_name', 'unknown'),
            'aircraft_type': session_data.get('aircraft_type', 'unknown'),
            'session_date': session_data.get('session_date', datetime.now().isoformat()),
            'generation_date': datetime.now().isoformat(),
            'sections': []
        }
        
        # Generate each section based on template
        for section_template in template['sections']:
            section_id = section_template['id']
            section_name = section_template['name']
            
            # Generate section content
            section_content = self._generate_section(section_id, session_data, custom_params)
            
            # Add section to report
            section = {
                'id': section_id,
                'name': section_name,
                'content': section_content
            }
            
            report['sections'].append(section)
        
        # Add AI insights if specified in template
        needs_ai_insights = any(s['id'] == 'insights' for s in template['sections'])
        if needs_ai_insights and session_data.get('flight_data') is not None:
            ai_insights = self._generate_ai_insights(session_data)
            
            # Find insights section or create it
            insights_section = next((s for s in report['sections'] if s['id'] == 'insights'), None)
            if insights_section:
                insights_section['content'] = {**insights_section['content'], **ai_insights}
            else:
                report['sections'].append({
                    'id': 'insights',
                    'name': 'AI Insights',
                    'content': ai_insights
                