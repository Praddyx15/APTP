#include <drogon/drogon.h>
#include <json/json.h>
#include <memory>
#include <string>
#include <vector>
#include <unordered_map>
#include "syllabus_repository.h"
#include "regulatory_compliance.h"
#include "version_manager.h"

namespace atp {
namespace syllabus {

class SyllabusTemplateSystem : public drogon::HttpController<SyllabusTemplateSystem> {
public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(SyllabusTemplateSystem::getTemplates, "/api/syllabus/templates", drogon::Get);
    ADD_METHOD_TO(SyllabusTemplateSystem::getTemplate, "/api/syllabus/templates/{id}", drogon::Get);
    ADD_METHOD_TO(SyllabusTemplateSystem::createTemplate, "/api/syllabus/templates", drogon::Post);
    ADD_METHOD_TO(SyllabusTemplateSystem::updateTemplate, "/api/syllabus/templates/{id}", drogon::Put);
    ADD_METHOD_TO(SyllabusTemplateSystem::analyzeImpact, "/api/syllabus/templates/{id}/impact", drogon::Post);
    ADD_METHOD_TO(SyllabusTemplateSystem::applyTemplate, "/api/syllabus/apply-template", drogon::Post);
    ADD_METHOD_TO(SyllabusTemplateSystem::compareVersions, "/api/syllabus/templates/{id}/versions/compare", drogon::Get);
    ADD_METHOD_TO(SyllabusTemplateSystem::trackEvolution, "/api/syllabus/templates/{id}/evolution", drogon::Get);
    METHOD_LIST_END

    SyllabusTemplateSystem();

    void getTemplates(const drogon::HttpRequestPtr& req, 
                      std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    void getTemplate(const drogon::HttpRequestPtr& req,
                     std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                     const std::string& id);
    
    void createTemplate(const drogon::HttpRequestPtr& req,
                        std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    void updateTemplate(const drogon::HttpRequestPtr& req,
                        std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                        const std::string& id);
    
    void analyzeImpact(const drogon::HttpRequestPtr& req,
                       std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                       const std::string& id);
    
    void applyTemplate(const drogon::HttpRequestPtr& req,
                       std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    void compareVersions(const drogon::HttpRequestPtr& req,
                        std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                        const std::string& id);
    
    void trackEvolution(const drogon::HttpRequestPtr& req,
                        std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                        const std::string& id);

private:
    std::shared_ptr<SyllabusRepository> syllabusRepo_;
    std::shared_ptr<RegulatoryCompliance> regulatoryCompliance_;
    std::shared_ptr<VersionManager> versionManager_;
    
    // Template categories
    std::unordered_map<std::string, std::string> templateCategories_;
    
    // Helper methods
    Json::Value validateTemplateStructure(const Json::Value& template_);
    Json::Value mergeWithBase(const Json::Value& template_, const std::string& baseTemplateId);
    Json::Value applyCustomizations(const Json::Value& template_, const Json::Value& customizations);
    Json::Value getTemplateDependencies(const std::string& templateId);
};

SyllabusTemplateSystem::SyllabusTemplateSystem() {
    // Initialize components
    syllabusRepo_ = std::make_shared<SyllabusRepository>();
    regulatoryCompliance_ = std::make_shared<RegulatoryCompliance>();
    versionManager_ = std::make_shared<VersionManager>();
    
    // Initialize template categories
    templateCategories_["joc_mcc"] = "Joint Operations Course / Multi-Crew Cooperation";
    templateCategories_["initial_type"] = "Initial Type Rating";
    templateCategories_["recurrent"] = "Recurrent Training";
    templateCategories_["instructor"] = "Instructor Training";
    templateCategories_["line_training"] = "Line Training";
    templateCategories_["conversion"] = "Conversion Course";
}

void SyllabusTemplateSystem::getTemplates(const drogon::HttpRequestPtr& req, 
                    std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    // Extract query parameters
    auto params = req->getParameters();
    std::string category = params.find("category") != params.end() ? params["category"] : "";
    std::string regulationType = params.find("regulation") != params.end() ? params["regulation"] : "";
    
    // Get templates from repository
    auto templates = syllabusRepo_->getTemplates(category, regulationType);
    
    // Add category information
    for (auto& template_ : templates) {
        std::string templateCategory = template_["category"].asString();
        if (templateCategories_.find(templateCategory) != templateCategories_.end()) {
            template_["category_name"] = templateCategories_[templateCategory];
        }
    }
    
    // Prepare response
    Json::Value result;
    result["templates"] = templates;
    result["total"] = templates.size();
    
    auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
    callback(resp);
}

void SyllabusTemplateSystem::getTemplate(const drogon::HttpRequestPtr& req,
                   std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                   const std::string& id) {
    // Get template from repository
    auto template_ = syllabusRepo_->getTemplate(id);
    
    if (template_.isNull()) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k404NotFound);
        resp->setBody("Template not found");
        callback(resp);
        return;
    }
    
    // Add version history
    template_["versions"] = versionManager_->getVersionHistory(id);
    
    // Add dependencies
    template_["dependencies"] = getTemplateDependencies(id);
    
    // Add regulatory compliance status
    template_["compliance"] = regulatoryCompliance_->checkCompliance(template_);
    
    auto resp = drogon::HttpResponse::newHttpJsonResponse(template_);
    callback(resp);
}

void SyllabusTemplateSystem::createTemplate(const drogon::HttpRequestPtr& req,
                      std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    // Validate template structure
    auto validationResult = validateTemplateStructure(*json);
    if (!validationResult["valid"].asBool()) {
        auto resp = drogon::HttpResponse::newHttpJsonResponse(validationResult);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    // Check if based on another template
    std::string baseTemplateId = (*json)["base_template_id"].asString();
    Json::Value finalTemplate = *json;
    
    if (!baseTemplateId.empty()) {
        // Merge with base template
        finalTemplate = mergeWithBase(finalTemplate, baseTemplateId);
    }
    
    // Add metadata
    finalTemplate["created_at"] = drogon::utils::getFormattedDate();
    finalTemplate["version"] = "1.0";
    
    // Save template
    std::string templateId = syllabusRepo_->createTemplate(finalTemplate);
    
    // Create initial version
    versionManager_->createVersion(templateId, "1.0", "Initial creation", finalTemplate);
    
    // Check regulatory compliance
    auto compliance = regulatoryCompliance_->checkCompliance(finalTemplate);
    
    // Prepare response
    Json::Value result;
    result["template_id"] = templateId;
    result["version"] = "1.0";
    result["compliance"] = compliance;
    
    auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
    resp->setStatusCode(drogon::k201Created);
    callback(resp);
}

void SyllabusTemplateSystem::updateTemplate(const drogon::HttpRequestPtr& req,
                      std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                      const std::string& id) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    // Get existing template
    auto existingTemplate = syllabusRepo_->getTemplate(id);
    if (existingTemplate.isNull()) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k404NotFound);
        resp->setBody("Template not found");
        callback(resp);
        return;
    }
    
    // Validate template structure
    auto validationResult = validateTemplateStructure(*json);
    if (!validationResult["valid"].asBool()) {
        auto resp = drogon::HttpResponse::newHttpJsonResponse(validationResult);
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    // Get current version
    std::string currentVersion = existingTemplate["version"].asString();
    
    // Increment version
    std::string newVersion;
    std::string changeMessage = (*json)["change_message"].asString();
    
    if (changeMessage.empty()) {
        changeMessage = "Updated template";
    }
    
    // Simple version incrementing (would be more sophisticated in production)
    int majorVersion = std::stoi(currentVersion.substr(0, currentVersion.find('.')));
    int minorVersion = std::stoi(currentVersion.substr(currentVersion.find('.')+1));
    
    if ((*json)["major_update"].asBool()) {
        majorVersion++;
        minorVersion = 0;
    } else {
        minorVersion++;
    }
    
    newVersion = std::to_string(majorVersion) + "." + std::to_string(minorVersion);
    
    // Update template
    Json::Value updatedTemplate = *json;
    updatedTemplate["version"] = newVersion;
    updatedTemplate["updated_at"] = drogon::utils::getFormattedDate();
    
    // Save template
    syllabusRepo_->updateTemplate(id, updatedTemplate);
    
    // Create new version
    versionManager_->createVersion(id, newVersion, changeMessage, updatedTemplate);
    
    // Check regulatory compliance
    auto compliance = regulatoryCompliance_->checkCompliance(updatedTemplate);
    
    // Prepare response
    Json::Value result;
    result["template_id"] = id;
    result["version"] = newVersion;
    result["previous_version"] = currentVersion;
    result["compliance"] = compliance;
    
    auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
    callback(resp);
}

void SyllabusTemplateSystem::analyzeImpact(const drogon::HttpRequestPtr& req,
                     std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                     const std::string& id) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    // Get existing template
    auto existingTemplate = syllabusRepo_->getTemplate(id);
    if (existingTemplate.isNull()) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k404NotFound);
        resp->setBody("Template not found");
        callback(resp);
        return;
    }
    
    // Analyze impact of proposed changes
    Json::Value changes = *json;
    
    // Apply changes to create a proposed template
    Json::Value proposedTemplate = existingTemplate;
    
    if (changes.isMember("modules")) {
        proposedTemplate["modules"] = changes["modules"];
    }
    
    if (changes.isMember("metadata")) {
        for (const auto& key : changes["metadata"].getMemberNames()) {
            proposedTemplate["metadata"][key] = changes["metadata"][key];
        }
    }
    
    // Compare compliance between existing and proposed template
    auto existingCompliance = regulatoryCompliance_->checkCompliance(existingTemplate);
    auto proposedCompliance = regulatoryCompliance_->checkCompliance(proposedTemplate);
    
    // Identify changes in compliance
    Json::Value complianceChanges;
    complianceChanges["before"] = existingCompliance;
    complianceChanges["after"] = proposedCompliance;
    
    // Calculate compliance impact statistics
    int totalReqsBefore = existingCompliance["requirements_total"].asInt();
    int metReqsBefore = existingCompliance["requirements_met"].asInt();
    
    int totalReqsAfter = proposedCompliance["requirements_total"].asInt();
    int metReqsAfter = proposedCompliance["requirements_met"].asInt();
    
    double compliancePercentBefore = (double)metReqsBefore / totalReqsBefore * 100.0;
    double compliancePercentAfter = (double)metReqsAfter / totalReqsAfter * 100.0;
    
    complianceChanges["compliance_before_percent"] = compliancePercentBefore;
    complianceChanges["compliance_after_percent"] = compliancePercentAfter;
    complianceChanges["compliance_change_percent"] = compliancePercentAfter - compliancePercentBefore;
    
    // Identify affected items
    Json::Value affectedItems;
    
    // Example: analyze which modules and lessons are affected by changes
    // This would be more sophisticated in a real implementation
    if (changes.isMember("modules")) {
        for (const auto& module : changes["modules"]) {
            std::string moduleId = module["id"].asString();
            
            // Find corresponding module in existing template
            bool moduleExists = false;
            for (const auto& existingModule : existingTemplate["modules"]) {
                if (existingModule["id"].asString() == moduleId) {
                    moduleExists = true;
                    
                    // Compare and identify changes
                    Json::Value moduleChanges;
                    moduleChanges["id"] = moduleId;
                    moduleChanges["title"] = module["title"].asString();
                    
                    // Identify lesson changes
                    if (module.isMember("lessons") && existingModule.isMember("lessons")) {
                        Json::Value lessonChanges;
                        
                        for (const auto& lesson : module["lessons"]) {
                            std::string lessonId = lesson["id"].asString();
                            
                            // Find corresponding lesson
                            bool lessonExists = false;
                            for (const auto& existingLesson : existingModule["lessons"]) {
                                if (existingLesson["id"].asString() == lessonId) {
                                    lessonExists = true;
                                    
                                    // Check if lesson changed
                                    if (lesson.toStyledString() != existingLesson.toStyledString()) {
                                        lessonChanges.append(lessonId);
                                    }
                                    
                                    break;
                                }
                            }
                            
                            // New lesson
                            if (!lessonExists) {
                                lessonChanges.append(lessonId + " (new)");
                            }
                        }
                        
                        // Check for removed lessons
                        for (const auto& existingLesson : existingModule["lessons"]) {
                            std::string lessonId = existingLesson["id"].asString();
                            
                            bool lessonExists = false;
                            for (const auto& lesson : module["lessons"]) {
                                if (lesson["id"].asString() == lessonId) {
                                    lessonExists = true;
                                    break;
                                }
                            }
                            
                            // Removed lesson
                            if (!lessonExists) {
                                lessonChanges.append(lessonId + " (removed)");
                            }
                        }
                        
                        if (lessonChanges.size() > 0) {
                            moduleChanges["lessons"] = lessonChanges;
                        }
                    }
                    
                    affectedItems.append(moduleChanges);
                    break;
                }
            }
            
            // New module
            if (!moduleExists) {
                Json::Value moduleChanges;
                moduleChanges["id"] = moduleId;
                moduleChanges["title"] = module["title"].asString();
                moduleChanges["status"] = "new";
                
                affectedItems.append(moduleChanges);
            }
        }
        
        // Check for removed modules
        for (const auto& existingModule : existingTemplate["modules"]) {
            std::string moduleId = existingModule["id"].asString();
            
            bool moduleExists = false;
            for (const auto& module : changes["modules"]) {
                if (module["id"].asString() == moduleId) {
                    moduleExists = true;
                    break;
                }
            }
            
            // Removed module
            if (!moduleExists) {
                Json::Value moduleChanges;
                moduleChanges["id"] = moduleId;
                moduleChanges["title"] = existingModule["title"].asString();
                moduleChanges["status"] = "removed";
                
                affectedItems.append(moduleChanges);
            }
        }
    }
    
    // Prepare response
    Json::Value result;
    result["template_id"] = id;
    result["current_version"] = existingTemplate["version"].asString();
    result["compliance_impact"] = complianceChanges;
    result["affected_items"] = affectedItems;
    
    auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
    callback(resp);
}

void SyllabusTemplateSystem::applyTemplate(const drogon::HttpRequestPtr& req,
                     std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    // Get template
    std::string templateId = (*json)["template_id"].asString();
    auto template_ = syllabusRepo_->getTemplate(templateId);
    
    if (template_.isNull()) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k404NotFound);
        resp->setBody("Template not found");
        callback(resp);
        return;
    }
    
    // Get customizations
    Json::Value customizations = (*json)["customizations"];
    
    // Apply customizations to template
    Json::Value customizedTemplate = applyCustomizations(template_, customizations);
    
    // Add metadata
    customizedTemplate["based_on_template"] = templateId;
    customizedTemplate["based_on_version"] = template_["version"].asString();
    customizedTemplate["created_at"] = drogon::utils::getFormattedDate();
    
    // Save as new syllabus or template based on request type
    std::string newId;
    if ((*json)["create_type"].asString() == "template") {
        // Save as new template
        customizedTemplate["name"] = (*json)["name"].asString();
        customizedTemplate["description"] = (*json)["description"].asString();
        customizedTemplate["version"] = "1.0";
        
        newId = syllabusRepo_->createTemplate(customizedTemplate);
        versionManager_->createVersion(newId, "1.0", "Created from template " + templateId, customizedTemplate);
    } else {
        // Save as syllabus
        customizedTemplate["name"] = (*json)["name"].asString();
        customizedTemplate["description"] = (*json)["description"].asString();
        
        newId = syllabusRepo_->createSyllabus(customizedTemplate);
    }
    
    // Check regulatory compliance
    auto compliance = regulatoryCompliance_->checkCompliance(customizedTemplate);
    
    // Prepare response
    Json::Value result;
    result["id"] = newId;
    result["based_on_template"] = templateId;
    result["based_on_version"] = template_["version"].asString();
    result["type"] = (*json)["create_type"].asString();
    result["compliance"] = compliance;
    
    auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
    resp->setStatusCode(drogon::k201Created);
    callback(resp);
}

void SyllabusTemplateSystem::compareVersions(const drogon::HttpRequestPtr& req,
                        std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                        const std::string& id) {
    // Extract query parameters
    auto params = req->getParameters();
    std::string version1 = params.find("v1") != params.end() ? params["v1"] : "";
    std::string version2 = params.find("v2") != params.end() ? params["v2"] : "";
    
    if (version1.empty() || version2.empty()) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        resp->setBody("Missing version parameters (v1, v2)");
        callback(resp);
        return;
    }
    
    // Get template versions
    auto templateV1 = versionManager_->getVersion(id, version1);
    auto templateV2 = versionManager_->getVersion(id, version2);
    
    if (templateV1.isNull() || templateV2.isNull()) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k404NotFound);
        resp->setBody("One or both template versions not found");
        callback(resp);
        return;
    }
    
    // Compare versions
    Json::Value differences;
    
    // Compare metadata
    Json::Value metadataDiff;
    for (const auto& key : templateV1["metadata"].getMemberNames()) {
        if (!templateV2["metadata"].isMember(key) || 
            templateV1["metadata"][key].toStyledString() != templateV2["metadata"][key].toStyledString()) {
            metadataDiff[key] = Json::Value(Json::objectValue);
            metadataDiff[key]["v1"] = templateV1["metadata"][key];
            metadataDiff[key]["v2"] = templateV2["metadata"].isMember(key) ? 
                                      templateV2["metadata"][key] : Json::Value(Json::nullValue);
        }
    }
    
    for (const auto& key : templateV2["metadata"].getMemberNames()) {
        if (!templateV1["metadata"].isMember(key)) {
            metadataDiff[key] = Json::Value(Json::objectValue);
            metadataDiff[key]["v1"] = Json::Value(Json::nullValue);
            metadataDiff[key]["v2"] = templateV2["metadata"][key];
        }
    }
    
    if (!metadataDiff.empty()) {
        differences["metadata"] = metadataDiff;
    }
    
    // Compare modules
    Json::Value modulesDiff;
    
    // Build module maps for easier comparison
    std::unordered_map<std::string, Json::Value> modulesV1;
    std::unordered_map<std::string, Json::Value> modulesV2;
    
    for (const auto& module : templateV1["modules"]) {
        modulesV1[module["id"].asString()] = module;
    }
    
    for (const auto& module : templateV2["modules"]) {
        modulesV2[module["id"].asString()] = module;
    }
    
    // Find changed and removed modules
    for (const auto& pair : modulesV1) {
        std::string moduleId = pair.first;
        Json::Value moduleV1 = pair.second;
        
        if (modulesV2.find(moduleId) != modulesV2.end()) {
            // Module exists in both versions, check for changes
            Json::Value moduleV2 = modulesV2[moduleId];
            
            if (moduleV1.toStyledString() != moduleV2.toStyledString()) {
                // Module changed
                Json::Value moduleDiff;
                moduleDiff["id"] = moduleId;
                moduleDiff["title_v1"] = moduleV1["title"];
                moduleDiff["title_v2"] = moduleV2["title"];
                
                // Check for lesson changes
                Json::Value lessonsDiff;
                
                // Build lesson maps
                std::unordered_map<std::string, Json::Value> lessonsV1;
                std::unordered_map<std::string, Json::Value> lessonsV2;
                
                for (const auto& lesson : moduleV1["lessons"]) {
                    lessonsV1[lesson["id"].asString()] = lesson;
                }
                
                for (const auto& lesson : moduleV2["lessons"]) {
                    lessonsV2[lesson["id"].asString()] = lesson;
                }
                
                // Compare lessons
                for (const auto& lessonPair : lessonsV1) {
                    std::string lessonId = lessonPair.first;
                    Json::Value lessonV1 = lessonPair.second;
                    
                    if (lessonsV2.find(lessonId) != lessonsV2.end()) {
                        // Lesson exists in both versions
                        Json::Value lessonV2 = lessonsV2[lessonId];
                        
                        if (lessonV1.toStyledString() != lessonV2.toStyledString()) {
                            // Lesson changed
                            Json::Value lessonDiff;
                            lessonDiff["id"] = lessonId;
                            lessonDiff["title_v1"] = lessonV1["title"];
                            lessonDiff["title_v2"] = lessonV2["title"];
                            lessonDiff["status"] = "changed";
                            
                            lessonsDiff[lessonId] = lessonDiff;
                        }
                    } else {
                        // Lesson removed in v2
                        Json::Value lessonDiff;
                        lessonDiff["id"] = lessonId;
                        lessonDiff["title"] = lessonV1["title"];
                        lessonDiff["status"] = "removed";
                        
                        lessonsDiff[lessonId] = lessonDiff;
                    }
                }
                
                // Find new lessons in v2
                for (const auto& lessonPair : lessonsV2) {
                    std::string lessonId = lessonPair.first;
                    
                    if (lessonsV1.find(lessonId) == lessonsV1.end()) {
                        // New lesson in v2
                        Json::Value lessonDiff;
                        lessonDiff["id"] = lessonId;
                        lessonDiff["title"] = lessonPair.second["title"];
                        lessonDiff["status"] = "added";
                        
                        lessonsDiff[lessonId] = lessonDiff;
                    }
                }
                
                if (!lessonsDiff.empty()) {
                    moduleDiff["lessons"] = lessonsDiff;
                }
                
                modulesDiff[moduleId] = moduleDiff;
            }
        } else {
            // Module removed in v2
            Json::Value moduleDiff;
            moduleDiff["id"] = moduleId;
            moduleDiff["title"] = moduleV1["title"];
            moduleDiff["status"] = "removed";
            
            modulesDiff[moduleId] = moduleDiff;
        }
    }
    
    // Find new modules in v2
    for (const auto& pair : modulesV2) {
        std::string moduleId = pair.first;
        
        if (modulesV1.find(moduleId) == modulesV1.end()) {
            // New module in v2
            Json::Value moduleDiff;
            moduleDiff["id"] = moduleId;
            moduleDiff["title"] = pair.second["title"];
            moduleDiff["status"] = "added";
            
            modulesDiff[moduleId] = moduleDiff;
        }
    }
    
    if (!modulesDiff.empty()) {
        differences["modules"] = modulesDiff;
    }
    
    // Compare compliance
    auto complianceV1 = regulatoryCompliance_->checkCompliance(templateV1);
    auto complianceV2 = regulatoryCompliance_->checkCompliance(templateV2);
    
    Json::Value complianceDiff;
    complianceDiff["v1"] = complianceV1;
    complianceDiff["v2"] = complianceV2;
    
    differences["compliance"] = complianceDiff;
    
    // Prepare response
    Json::Value result;
    result["template_id"] = id;
    result["version1"] = version1;
    result["version2"] = version2;
    result["differences"] = differences;
    result["has_differences"] = !differences.empty();
    
    auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
    callback(resp);
}

void SyllabusTemplateSystem::trackEvolution(const drogon::HttpRequestPtr& req,
                      std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                      const std::string& id) {
    // Get version history
    auto versionHistory = versionManager_->getVersionHistory(id);
    
    if (versionHistory.empty()) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k404NotFound);
        resp->setBody("Template not found or no version history available");
        callback(resp);
        return;
    }
    
    // Track evolution metrics
    Json::Value evolutionMetrics;
    
    // Size metrics
    Json::Value sizeMetrics;
    std::vector<int> moduleCountHistory;
    std::vector<int> lessonCountHistory;
    std::vector<std::string> versionLabels;
    
    // Compliance metrics
    Json::Value complianceMetrics;
    std::vector<double> complianceScoreHistory;
    
    // Effectiveness metrics (if available)
    Json::Value effectivenessMetrics;
    std::vector<double> effectivenessScoreHistory;
    
    // Calculate metrics for each version
    for (const auto& versionInfo : versionHistory) {
        std::string version = versionInfo["version"].asString();
        versionLabels.push_back(version);
        
        // Get version content
        auto versionContent = versionManager_->getVersion(id, version);
        
        // Size metrics
        int moduleCount = versionContent["modules"].size();
        moduleCountHistory.push_back(moduleCount);
        
        int lessonCount = 0;
        for (const auto& module : versionContent["modules"]) {
            lessonCount += module["lessons"].size();
        }
        lessonCountHistory.push_back(lessonCount);
        
        // Compliance metrics
        auto compliance = regulatoryCompliance_->checkCompliance(versionContent);
        double complianceScore = compliance["requirements_met"].asInt() * 100.0 / compliance["requirements_total"].asInt();
        complianceScoreHistory.push_back(complianceScore);
        
        // Effectiveness metrics (if available)
        // This would typically be calculated from training outcome data
        // For this example, we'll use a placeholder value
        effectivenessScoreHistory.push_back(0.0);
    }
    
    // Prepare metrics JSON
    for (size_t i = 0; i < versionLabels.size(); ++i) {
        Json::Value versionMetrics;
        versionMetrics["module_count"] = moduleCountHistory[i];
        versionMetrics["lesson_count"] = lessonCountHistory[i];
        versionMetrics["compliance_score"] = complianceScoreHistory[i];
        
        if (effectivenessScoreHistory[i] > 0) {
            versionMetrics["effectiveness_score"] = effectivenessScoreHistory[i];
        }
        
        sizeMetrics[versionLabels[i]] = versionMetrics;
    }
    
    evolutionMetrics["size"] = sizeMetrics;
    
    // Calculate trend analysis
    Json::Value trends;
    
    // Module count trend
    trends["module_count_trend"] = calculateTrend(moduleCountHistory);
    
    // Lesson count trend
    trends["lesson_count_trend"] = calculateTrend(lessonCountHistory);
    
    // Compliance score trend
    trends["compliance_score_trend"] = calculateTrend(complianceScoreHistory);
    
    evolutionMetrics["trends"] = trends;
    
    // Generate best practice recommendations
    Json::Value recommendations;
    
    // Check for potential issues based on metrics
    if (calculateTrend(moduleCountHistory) > 0.5) {
        recommendations.append("Template is growing rapidly in module count. Consider reviewing for potential redundancy.");
    }
    
    if (calculateTrend(complianceScoreHistory) < 0) {
        recommendations.append("Compliance score is trending downward. Review recent changes for regulatory alignment.");
    }
    
    // Add more recommendations (in a real implementation, these would be AI-generated)
    recommendations.append("Consider organizing modules into logical groups for improved navigation");
    recommendations.append("Ensure assessment criteria are clearly defined for each lesson");
    
    evolutionMetrics["recommendations"] = recommendations;
    
    // Prepare response
    Json::Value result;
    result["template_id"] = id;
    result["version_count"] = versionHistory.size();
    result["latest_version"] = versionLabels.back();
    result["first_version"] = versionLabels.front();
    result["evolution_metrics"] = evolutionMetrics;
    
    auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
    callback(resp);
}

// Helper methods
Json::Value SyllabusTemplateSystem::validateTemplateStructure(const Json::Value& template_) {
    Json::Value result;
    result["valid"] = true;
    Json::Value errors;
    
    // Check for required fields
    if (!template_.isMember("name") || template_["name"].asString().empty()) {
        errors.append("Template name is required");
        result["valid"] = false;
    }
    
    if (!template_.isMember("category") || template_["category"].asString().empty()) {
        errors.append("Template category is required");
        result["valid"] = false;
    }
    
    if (!template_.isMember("modules") || !template_["modules"].isArray()) {
        errors.append("Modules array is required");
        result["valid"] = false;
    } else {
        // Validate modules
        for (int i = 0; i < template_["modules"].size(); ++i) {
            const auto& module = template_["modules"][i];
            
            if (!module.isMember("id") || module["id"].asString().empty()) {
                errors.append("Module at index " + std::to_string(i) + " is missing ID");
                result["valid"] = false;
            }
            
            if (!module.isMember("title") || module["title"].asString().empty()) {
                errors.append("Module at index " + std::to_string(i) + " is missing title");
                result["valid"] = false;
            }
            
            if (module.isMember("lessons") && module["lessons"].isArray()) {
                // Validate lessons
                for (int j = 0; j < module["lessons"].size(); ++j) {
                    const auto& lesson = module["lessons"][j];
                    
                    if (!lesson.isMember("id") || lesson["id"].asString().empty()) {
                        errors.append("Lesson at index " + std::to_string(j) + " in module " + 
                                     module["id"].asString() + " is missing ID");
                        result["valid"] = false;
                    }
                    
                    if (!lesson.isMember("title") || lesson["title"].asString().empty()) {
                        errors.append("Lesson at index " + std::to_string(j) + " in module " + 
                                     module["id"].asString() + " is missing title");
                        result["valid"] = false;
                    }
                }
            }
        }
    }
    
    if (!result["valid"].asBool()) {
        result["errors"] = errors;
    }
    
    return result;
}

Json::Value SyllabusTemplateSystem::mergeWithBase(const Json::Value& template_, const std::string& baseTemplateId) {
    // Get base template
    auto baseTemplate = syllabusRepo_->getTemplate(baseTemplateId);
    
    if (baseTemplate.isNull()) {
        // Return original template if base not found
        return template_;
    }
    
    // Create merged template
    Json::Value mergedTemplate = baseTemplate;
    
    // Override metadata
    if (template_.isMember("metadata")) {
        for (const auto& key : template_["metadata"].getMemberNames()) {
            mergedTemplate["metadata"][key] = template_["metadata"][key];
        }
    }
    
    // Override modules if provided
    if (template_.isMember("modules")) {
        mergedTemplate["modules"] = template_["modules"];
    }
    
    // Add derivation information
    mergedTemplate["derived_from"] = baseTemplateId;
    mergedTemplate["derived_from_version"] = baseTemplate["version"];
    
    // Override name and description
    if (template_.isMember("name")) {
        mergedTemplate["name"] = template_["name"];
    }
    
    if (template_.isMember("description")) {
        mergedTemplate["description"] = template_["description"];
    }
    
    return mergedTemplate;
}

Json::Value SyllabusTemplateSystem::applyCustomizations(const Json::Value& template_, const Json::Value& customizations) {
    // Create customized template
    Json::Value customizedTemplate = template_;
    
    // Apply metadata customizations
    if (customizations.isMember("metadata")) {
        for (const auto& key : customizations["metadata"].getMemberNames()) {
            customizedTemplate["metadata"][key] = customizations["metadata"][key];
        }
    }
    
    // Apply module customizations
    if (customizations.isMember("modules")) {
        // Convert template modules to map for easier access
        std::unordered_map<std::string, Json::Value> moduleMap;
        Json::Value newModules(Json::arrayValue);
        
        for (const auto& module : template_["modules"]) {
            moduleMap[module["id"].asString()] = module;
        }
        
        // Process module customizations
        for (const auto& moduleCustomization : customizations["modules"]) {
            std::string moduleId = moduleCustomization["id"].asString();
            
            if (moduleMap.find(moduleId) != moduleMap.end()) {
                // Module exists, apply customizations
                Json::Value customizedModule = moduleMap[moduleId];
                
                // Override module properties
                for (const auto& key : moduleCustomization.getMemberNames()) {
                    if (key != "id" && key != "lessons") {
                        customizedModule[key] = moduleCustomization[key];
                    }
                }
                
                // Apply lesson customizations
                if (moduleCustomization.isMember("lessons")) {
                    // Convert lessons to map
                    std::unordered_map<std::string, Json::Value> lessonMap;
                    Json::Value newLessons(Json::arrayValue);
                    
                    for (const auto& lesson : customizedModule["lessons"]) {
                        lessonMap[lesson["id"].asString()] = lesson;
                    }
                    
                    // Process lesson customizations
                    for (const auto& lessonCustomization : moduleCustomization["lessons"]) {
                        std::string lessonId = lessonCustomization["id"].asString();
                        
                        if (lessonMap.find(lessonId) != lessonMap.end()) {
                            // Lesson exists, apply customizations
                            Json::Value customizedLesson = lessonMap[lessonId];
                            
                            // Override lesson properties
                            for (const auto& key : lessonCustomization.getMemberNames()) {
                                if (key != "id") {
                                    customizedLesson[key] = lessonCustomization[key];
                                }
                            }
                            
                            newLessons.append(customizedLesson);
                            lessonMap.erase(lessonId);
                        } else {
                            // New lesson
                            newLessons.append(lessonCustomization);
                        }
                    }
                    
                    // Add remaining lessons
                    for (const auto& pair : lessonMap) {
                        newLessons.append(pair.second);
                    }
                    
                    customizedModule["lessons"] = newLessons;
                }
                
                newModules.append(customizedModule);
                moduleMap.erase(moduleId);
            } else {
                // New module
                newModules.append(moduleCustomization);
            }
        }
        
        // Add remaining modules
        for (const auto& pair : moduleMap) {
            newModules.append(pair.second);
        }
        
        customizedTemplate["modules"] = newModules;
    }
    
    return customizedTemplate;
}

Json::Value SyllabusTemplateSystem::getTemplateDependencies(const std::string& templateId) {
    // Get all templates that depend on this one
    auto dependencies = syllabusRepo_->getTemplateDependencies(templateId);
    
    Json::Value result;
    result["derived_templates"] = dependencies["derived_templates"];
    result["derived_syllabi"] = dependencies["derived_syllabi"];
    
    return result;
}

double SyllabusTemplateSystem::calculateTrend(const std::vector<int>& values) {
    if (values.size() < 2) {
        return 0.0;
    }
    
    double sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (size_t i = 0; i < values.size(); ++i) {
        double x = i;
        double y = values[i];
        
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
    }
    
    double n = values.size();
    double slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    // Normalize slope to -1 to 1 range
    double maxSlope = *std::max_element(values.begin(), values.end()) - *std::min_element(values.begin(), values.end());
    if (maxSlope > 0) {
        return slope / maxSlope;
    }
    
    return 0.0;
}

double SyllabusTemplateSystem::calculateTrend(const std::vector<double>& values) {
    if (values.size() < 2) {
        return 0.0;
    }
    
    double sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    for (size_t i = 0; i < values.size(); ++i) {
        double x = i;
        double y = values[i];
        
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
    }
    
    double n = values.size();
    double slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    // Normalize slope to -1 to 1 range
    double maxVal = *std::max_element(values.begin(), values.end());
    double minVal = *std::min_element(values.begin(), values.end());
    double maxSlope = maxVal - minVal;
    
    if (maxSlope > 0) {
        return slope / maxSlope;
    }
    
    return 0.0;
}

} // namespace syllabus
} // namespace atp

// Main application setup
int main() {
    // Configure Drogon app
    drogon::app().setLogPath("./")
                 .setLogLevel(trantor::Logger::kInfo)
                 .addListener("0.0.0.0", 8081)
                 .setThreadNum(16)
                 .run();
    
    return 0;
}
