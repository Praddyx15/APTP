#include <drogon/drogon.h>
#include <json/json.h>
#include <string>
#include <vector>
#include <map>
#include <memory>
#include <mutex>
#include "knowledge_repository.h"
#include "content_validator.h"
#include "recommendation_engine.h"

namespace atp {
namespace community {

class CommunityKnowledgeBackend : public drogon::HttpController<CommunityKnowledgeBackend> {
public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(CommunityKnowledgeBackend::getBestPractices, "/api/community/best-practices", drogon::Get);
    ADD_METHOD_TO(CommunityKnowledgeBackend::submitBestPractice, "/api/community/best-practices", drogon::Post);
    ADD_METHOD_TO(CommunityKnowledgeBackend::rateBestPractice, "/api/community/best-practices/{id}/rate", drogon::Post);
    ADD_METHOD_TO(CommunityKnowledgeBackend::getScenarios, "/api/community/scenarios", drogon::Get);
    ADD_METHOD_TO(CommunityKnowledgeBackend::submitScenario, "/api/community/scenarios", drogon::Post);
    ADD_METHOD_TO(CommunityKnowledgeBackend::rateScenario, "/api/community/scenarios/{id}/rate", drogon::Post);
    ADD_METHOD_TO(CommunityKnowledgeBackend::getForumThreads, "/api/community/forum/threads", drogon::Get);
    ADD_METHOD_TO(CommunityKnowledgeBackend::createForumThread, "/api/community/forum/threads", drogon::Post);
    ADD_METHOD_TO(CommunityKnowledgeBackend::getForumPosts, "/api/community/forum/threads/{threadId}/posts", drogon::Get);
    ADD_METHOD_TO(CommunityKnowledgeBackend::createForumPost, "/api/community/forum/threads/{threadId}/posts", drogon::Post);
    ADD_METHOD_TO(CommunityKnowledgeBackend::getExpertNetwork, "/api/community/experts", drogon::Get);
    ADD_METHOD_TO(CommunityKnowledgeBackend::requestExpertAssistance, "/api/community/experts/request", drogon::Post);
    ADD_METHOD_TO(CommunityKnowledgeBackend::getExpertProfile, "/api/community/experts/{expertId}", drogon::Get);
    ADD_METHOD_TO(CommunityKnowledgeBackend::getPersonalizedRecommendations, "/api/community/recommendations/{userId}", drogon::Get);
    ADD_METHOD_TO(CommunityKnowledgeBackend::getContentStatistics, "/api/community/statistics", drogon::Get);
    ADD_METHOD_TO(CommunityKnowledgeBackend::searchContent, "/api/community/search", drogon::Get);
    METHOD_LIST_END

    CommunityKnowledgeBackend();

    void getBestPractices(const drogon::HttpRequestPtr& req, 
                        std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    void submitBestPractice(const drogon::HttpRequestPtr& req,
                          std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    void rateBestPractice(const drogon::HttpRequestPtr& req,
                        std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                        const std::string& id);
    
    void getScenarios(const drogon::HttpRequestPtr& req,
                    std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    void submitScenario(const drogon::HttpRequestPtr& req,
                      std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    void rateScenario(const drogon::HttpRequestPtr& req,
                    std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                    const std::string& id);
    
    void getForumThreads(const drogon::HttpRequestPtr& req,
                       std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    void createForumThread(const drogon::HttpRequestPtr& req,
                         std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    void getForumPosts(const drogon::HttpRequestPtr& req,
                     std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                     const std::string& threadId);
    
    void createForumPost(const drogon::HttpRequestPtr& req,
                       std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                       const std::string& threadId);
    
    void getExpertNetwork(const drogon::HttpRequestPtr& req,
                        std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    void requestExpertAssistance(const drogon::HttpRequestPtr& req,
                               std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    void getExpertProfile(const drogon::HttpRequestPtr& req,
                        std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                        const std::string& expertId);
    
    void getPersonalizedRecommendations(const drogon::HttpRequestPtr& req,
                                      std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                                      const std::string& userId);
    
    void getContentStatistics(const drogon::HttpRequestPtr& req,
                            std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    void searchContent(const drogon::HttpRequestPtr& req,
                     std::function<void(const drogon::HttpResponsePtr&)>&& callback);

private:
    std::shared_ptr<KnowledgeRepository> knowledgeRepo_;
    std::shared_ptr<ContentValidator> contentValidator_;
    std::shared_ptr<RecommendationEngine> recommendationEngine_;
    
    // Helper methods
    Json::Value formatBestPracticeForResponse(const Json::Value& bestPractice);
    Json::Value formatScenarioForResponse(const Json::Value& scenario);
    Json::Value formatForumThreadForResponse(const Json::Value& thread);
    Json::Value formatForumPostForResponse(const Json::Value& post);
    Json::Value formatExpertProfileForResponse(const Json::Value& expert);
    Json::Value generateContentStatistics();
    Json::Value sanitizeUserInput(const Json::Value& input);
    bool validateUserPermission(const std::string& userId, const std::string& action, const std::string& resourceId);
};

CommunityKnowledgeBackend::CommunityKnowledgeBackend() {
    // Initialize components
    knowledgeRepo_ = std::make_shared<KnowledgeRepository>();
    contentValidator_ = std::make_shared<ContentValidator>();
    recommendationEngine_ = std::make_shared<RecommendationEngine>();
}

void CommunityKnowledgeBackend::getBestPractices(const drogon::HttpRequestPtr& req, 
                      std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    try {
        // Extract query parameters
        auto params = req->getParameters();
        std::string category = params.find("category") != params.end() ? params["category"] : "all";
        std::string sortBy = params.find("sort_by") != params.end() ? params["sort_by"] : "rating";
        int limit = params.find("limit") != params.end() ? std::stoi(params["limit"]) : 10;
        int offset = params.find("offset") != params.end() ? std::stoi(params["offset"]) : 0;
        
        // Get best practices
        std::vector<Json::Value> bestPractices = knowledgeRepo_->getBestPractices(category, sortBy, limit, offset);
        
        // Format best practices for response
        Json::Value formattedPractices(Json::arrayValue);
        
        for (const auto& practice : bestPractices) {
            formattedPractices.append(formatBestPracticeForResponse(practice));
        }
        
        // Get total count for pagination
        int totalCount = knowledgeRepo_->getBestPracticeCount(category);
        
        // Prepare response
        Json::Value result;
        result["best_practices"] = formattedPractices;
        result["total_count"] = totalCount;
        result["limit"] = limit;
        result["offset"] = offset;
        result["category"] = category;
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
        callback(resp);
    }
    catch (const std::exception& e) {
        Json::Value error;
        error["status"] = "error";
        error["message"] = e.what();
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
        resp->setStatusCode(drogon::k500InternalServerError);
        callback(resp);
    }
}

void CommunityKnowledgeBackend::submitBestPractice(const drogon::HttpRequestPtr& req,
                        std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    try {
        // Sanitize input
        Json::Value sanitizedInput = sanitizeUserInput(*json);
        
        // Validate content
        Json::Value validationResult = contentValidator_->validateBestPractice(sanitizedInput);
        
        if (!validationResult["valid"].asBool()) {
            auto resp = drogon::HttpResponse::newHttpJsonResponse(validationResult);
            resp->setStatusCode(drogon::k400BadRequest);
            callback(resp);
            return;
        }
        
        // Extract best practice data
        std::string title = sanitizedInput["title"].asString();
        std::string content = sanitizedInput["content"].asString();
        std::string category = sanitizedInput["category"].asString();
        std::string authorId = sanitizedInput["author_id"].asString();
        
        // Check user permission
        if (!validateUserPermission(authorId, "create", "best_practice")) {
            Json::Value error;
            error["status"] = "error";
            error["message"] = "User does not have permission to create best practices";
            
            auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
            resp->setStatusCode(drogon::k403Forbidden);
            callback(resp);
            return;
        }
        
        // Prepare best practice data
        Json::Value bestPractice;
        bestPractice["title"] = title;
        bestPractice["content"] = content;
        bestPractice["category"] = category;
        bestPractice["author_id"] = authorId;
        bestPractice["created_at"] = drogon::utils::getFormattedDate();
        bestPractice["rating"] = 0;
        bestPractice["rating_count"] = 0;
        bestPractice["status"] = "pending_review";  // New practices need review
        
        // Add tags if provided
        if (sanitizedInput.isMember("tags") && sanitizedInput["tags"].isArray()) {
            bestPractice["tags"] = sanitizedInput["tags"];
        }
        
        // Save best practice
        std::string practiceId = knowledgeRepo_->saveBestPractice(bestPractice);
        
        // Add ID to the saved practice
        bestPractice["id"] = practiceId;
        
        // Format for response
        Json::Value formattedPractice = formatBestPracticeForResponse(bestPractice);
        
        // Prepare response
        Json::Value result;
        result["status"] = "success";
        result["message"] = "Best practice submitted for review";
        result["best_practice"] = formattedPractice;
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
        resp->setStatusCode(drogon::k201Created);
        callback(resp);
    }
    catch (const std::exception& e) {
        Json::Value error;
        error["status"] = "error";
        error["message"] = e.what();
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
        resp->setStatusCode(drogon::k500InternalServerError);
        callback(resp);
    }
}

void CommunityKnowledgeBackend::rateBestPractice(const drogon::HttpRequestPtr& req,
                      std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                      const std::string& id) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    try {
        // Extract rating data
        int rating = (*json)["rating"].asInt();
        std::string userId = (*json)["user_id"].asString();
        std::string comment = (*json).get("comment", "").asString();
        
        // Validate rating range (1-5)
        if (rating < 1 || rating > 5) {
            Json::Value error;
            error["status"] = "error";
            error["message"] = "Rating must be between 1 and 5";
            
            auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
            resp->setStatusCode(drogon::k400BadRequest);
            callback(resp);
            return;
        }
        
        // Check if best practice exists
        Json::Value bestPractice = knowledgeRepo_->getBestPractice(id);
        
        if (bestPractice.isNull()) {
            Json::Value error;
            error["status"] = "error";
            error["message"] = "Best practice not found";
            
            auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
            resp->setStatusCode(drogon::k404NotFound);
            callback(resp);
            return;
        }
        
        // Check if user has already rated this best practice
        bool alreadyRated = knowledgeRepo_->hasUserRatedBestPractice(id, userId);
        
        if (alreadyRated) {
            // Update existing rating
            Json::Value userRating = knowledgeRepo_->getUserBestPracticeRating(id, userId);
            int oldRating = userRating["rating"].asInt();
            
            // Record updated rating
            knowledgeRepo_->updateBestPracticeRating(id, userId, rating, comment);
            
            // Update best practice aggregate rating
            int ratingCount = bestPractice["rating_count"].asInt();
            double totalRating = bestPractice["rating"].asDouble() * ratingCount;
            
            // Subtract old rating and add new rating
            totalRating = totalRating - oldRating + rating;
            
            // Calculate new average rating
            double newRating = totalRating / ratingCount;
            
            bestPractice["rating"] = newRating;
            
            // Save updated best practice
            knowledgeRepo_->updateBestPractice(id, bestPractice);
            
            // Prepare response
            Json::Value result;
            result["status"] = "success";
            result["message"] = "Rating updated successfully";
            result["best_practice_id"] = id;
            result["old_rating"] = oldRating;
            result["new_rating"] = rating;
            result["average_rating"] = newRating;
            
            auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
            callback(resp);
        }
        else {
            // Create new rating
            Json::Value userRating;
            userRating["best_practice_id"] = id;
            userRating["user_id"] = userId;
            userRating["rating"] = rating;
            userRating["comment"] = comment;
            userRating["created_at"] = drogon::utils::getFormattedDate();
            
            // Save user rating
            knowledgeRepo_->saveBestPracticeRating(userRating);
            
            // Update best practice aggregate rating
            int ratingCount = bestPractice["rating_count"].asInt();
            double totalRating = bestPractice["rating"].asDouble() * ratingCount;
            
            // Add new rating and increment count
            totalRating += rating;
            ratingCount++;
            
            // Calculate new average rating
            double newRating = totalRating / ratingCount;
            
            bestPractice["rating"] = newRating;
            bestPractice["rating_count"] = ratingCount;
            
            // Save updated best practice
            knowledgeRepo_->updateBestPractice(id, bestPractice);
            
            // Prepare response
            Json::Value result;
            result["status"] = "success";
            result["message"] = "Rating submitted successfully";
            result["best_practice_id"] = id;
            result["rating"] = rating;
            result["average_rating"] = newRating;
            result["rating_count"] = ratingCount;
            
            auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
            callback(resp);
        }
    }
    catch (const std::exception& e) {
        Json::Value error;
        error["status"] = "error";
        error["message"] = e.what();
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
        resp->setStatusCode(drogon::k500InternalServerError);
        callback(resp);
    }
}

void CommunityKnowledgeBackend::getScenarios(const drogon::HttpRequestPtr& req,
                  std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    try {
        // Extract query parameters
        auto params = req->getParameters();
        std::string category = params.find("category") != params.end() ? params["category"] : "all";
        std::string aircraftType = params.find("aircraft_type") != params.end() ? params["aircraft_type"] : "";
        std::string sortBy = params.find("sort_by") != params.end() ? params["sort_by"] : "rating";
        int limit = params.find("limit") != params.end() ? std::stoi(params["limit"]) : 10;
        int offset = params.find("offset") != params.end() ? std::stoi(params["offset"]) : 0;
        
        // Get scenarios
        std::vector<Json::Value> scenarios = knowledgeRepo_->getScenarios(category, aircraftType, sortBy, limit, offset);
        
        // Format scenarios for response
        Json::Value formattedScenarios(Json::arrayValue);
        
        for (const auto& scenario : scenarios) {
            formattedScenarios.append(formatScenarioForResponse(scenario));
        }
        
        // Get total count for pagination
        int totalCount = knowledgeRepo_->getScenarioCount(category, aircraftType);
        
        // Prepare response
        Json::Value result;
        result["scenarios"] = formattedScenarios;
        result["total_count"] = totalCount;
        result["limit"] = limit;
        result["offset"] = offset;
        result["category"] = category;
        
        if (!aircraftType.empty()) {
            result["aircraft_type"] = aircraftType;
        }
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
        callback(resp);
    }
    catch (const std::exception& e) {
        Json::Value error;
        error["status"] = "error";
        error["message"] = e.what();
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
        resp->setStatusCode(drogon::k500InternalServerError);
        callback(resp);
    }
}

void CommunityKnowledgeBackend::submitScenario(const drogon::HttpRequestPtr& req,
                    std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    try {
        // Sanitize input
        Json::Value sanitizedInput = sanitizeUserInput(*json);
        
        // Validate content
        Json::Value validationResult = contentValidator_->validateScenario(sanitizedInput);
        
        if (!validationResult["valid"].asBool()) {
            auto resp = drogon::HttpResponse::newHttpJsonResponse(validationResult);
            resp->setStatusCode(drogon::k400BadRequest);
            callback(resp);
            return;
        }
        
        // Extract scenario data
        std::string title = sanitizedInput["title"].asString();
        std::string description = sanitizedInput["description"].asString();
        std::string category = sanitizedInput["category"].asString();
        std::string aircraftType = sanitizedInput["aircraft_type"].asString();
        std::string authorId = sanitizedInput["author_id"].asString();
        
        // Check user permission
        if (!validateUserPermission(authorId, "create", "scenario")) {
            Json::Value error;
            error["status"] = "error";
            error["message"] = "User does not have permission to create scenarios";
            
            auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
            resp->setStatusCode(drogon::k403Forbidden);
            callback(resp);
            return;
        }
        
        // Prepare scenario data
        Json::Value scenario;
        scenario["title"] = title;
        scenario["description"] = description;
        scenario["category"] = category;
        scenario["aircraft_type"] = aircraftType;
        scenario["author_id"] = authorId;
        scenario["created_at"] = drogon::utils::getFormattedDate();
        scenario["rating"] = 0;
        scenario["rating_count"] = 0;
        scenario["download_count"] = 0;
        scenario["status"] = "pending_review";  // New scenarios need review
        
        // Add scenario parameters if provided
        if (sanitizedInput.isMember("parameters") && sanitizedInput["parameters"].isObject()) {
            scenario["parameters"] = sanitizedInput["parameters"];
        }
        
        // Add tags if provided
        if (sanitizedInput.isMember("tags") && sanitizedInput["tags"].isArray()) {
            scenario["tags"] = sanitizedInput["tags"];
        }
        
        // Save scenario
        std::string scenarioId = knowledgeRepo_->saveScenario(scenario);
        
        // Add ID to the saved scenario
        scenario["id"] = scenarioId;
        
        // Format for response
        Json::Value formattedScenario = formatScenarioForResponse(scenario);
        
        // Prepare response
        Json::Value result;
        result["status"] = "success";
        result["message"] = "Scenario submitted for review";
        result["scenario"] = formattedScenario;
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
        resp->setStatusCode(drogon::k201Created);
        callback(resp);
    }
    catch (const std::exception& e) {
        Json::Value error;
        error["status"] = "error";
        error["message"] = e.what();
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
        resp->setStatusCode(drogon::k500InternalServerError);
        callback(resp);
    }
}

void CommunityKnowledgeBackend::rateScenario(const drogon::HttpRequestPtr& req,
                  std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                  const std::string& id) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    try {
        // Extract rating data
        int rating = (*json)["rating"].asInt();
        std::string userId = (*json)["user_id"].asString();
        std::string comment = (*json).get("comment", "").asString();
        
        // Validate rating range (1-5)
        if (rating < 1 || rating > 5) {
            Json::Value error;
            error["status"] = "error";
            error["message"] = "Rating must be between 1 and 5";
            
            auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
            resp->setStatusCode(drogon::k400BadRequest);
            callback(resp);
            return;
        }
        
        // Check if scenario exists
        Json::Value scenario = knowledgeRepo_->getScenario(id);
        
        if (scenario.isNull()) {
            Json::Value error;
            error["status"] = "error";
            error["message"] = "Scenario not found";
            
            auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
            resp->setStatusCode(drogon::k404NotFound);
            callback(resp);
            return;
        }
        
        // Check if user has already rated this scenario
        bool alreadyRated = knowledgeRepo_->hasUserRatedScenario(id, userId);
        
        if (alreadyRated) {
            // Update existing rating
            Json::Value userRating = knowledgeRepo_->getUserScenarioRating(id, userId);
            int oldRating = userRating["rating"].asInt();
            
            // Record updated rating
            knowledgeRepo_->updateScenarioRating(id, userId, rating, comment);
            
            // Update scenario aggregate rating
            int ratingCount = scenario["rating_count"].asInt();
            double totalRating = scenario["rating"].asDouble() * ratingCount;
            
            // Subtract old rating and add new rating
            totalRating = totalRating - oldRating + rating;
            
            // Calculate new average rating
            double newRating = totalRating / ratingCount;
            
            scenario["rating"] = newRating;
            
            // Save updated scenario
            knowledgeRepo_->updateScenario(id, scenario);
            
            // Prepare response
            Json::Value result;
            result["status"] = "success";
            result["message"] = "Rating updated successfully";
            result["scenario_id"] = id;
            result["old_rating"] = oldRating;
            result["new_rating"] = rating;
            result["average_rating"] = newRating;
            
            auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
            callback(resp);
        }
        else {
            // Create new rating
            Json::Value userRating;
            userRating["scenario_id"] = id;
            userRating["user_id"] = userId;
            userRating["rating"] = rating;
            userRating["comment"] = comment;
            userRating["created_at"] = drogon::utils::getFormattedDate();
            
            // Save user rating
            knowledgeRepo_->saveScenarioRating(userRating);
            
            // Update scenario aggregate rating
            int ratingCount = scenario["rating_count"].asInt();
            double totalRating = scenario["rating"].asDouble() * ratingCount;
            
            // Add new rating and increment count
            totalRating += rating;
            ratingCount++;
            
            // Calculate new average rating
            double newRating = totalRating / ratingCount;
            
            scenario["rating"] = newRating;
            scenario["rating_count"] = ratingCount;
            
            // Save updated scenario
            knowledgeRepo_->updateScenario(id, scenario);
            
            // Prepare response
            Json::Value result;
            result["status"] = "success";
            result["message"] = "Rating submitted successfully";
            result["scenario_id"] = id;
            result["rating"] = rating;
            result["average_rating"] = newRating;
            result["rating_count"] = ratingCount;
            
            auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
            callback(resp);
        }
    }
    catch (const std::exception& e) {
        Json::Value error;
        error["status"] = "error";
        error["message"] = e.what();
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
        resp->setStatusCode(drogon::k500InternalServerError);
        callback(resp);
    }
}

void CommunityKnowledgeBackend::getForumThreads(const drogon::HttpRequestPtr& req,
                     std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    try {
        // Extract query parameters
        auto params = req->getParameters();
        std::string category = params.find("category") != params.end() ? params["category"] : "all";
        std::string sortBy = params.find("sort_by") != params.end() ? params["sort_by"] : "recent";
        int limit = params.find("limit") != params.end() ? std::stoi(params["limit"]) : 20;
        int offset = params.find("offset") != params.end() ? std::stoi(params["offset"]) : 0;
        
        // Get forum threads
        std::vector<Json::Value> threads = knowledgeRepo_->getForumThreads(category, sortBy, limit, offset);
        
        // Format threads for response
        Json::Value formattedThreads(Json::arrayValue);
        
        for (const auto& thread : threads) {
            formattedThreads.append(formatForumThreadForResponse(thread));
        }
        
        // Get total count for pagination
        int totalCount = knowledgeRepo_->getForumThreadCount(category);
        
        // Prepare response
        Json::Value result;
        result["threads"] = formattedThreads;
        result["total_count"] = totalCount;
        result["limit"] = limit;
        result["offset"] = offset;
        result["category"] = category;
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
        callback(resp);
    }
    catch (const std::exception& e) {
        Json::Value error;
        error["status"] = "error";
        error["message"] = e.what();
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
        resp->setStatusCode(drogon::k500InternalServerError);
        callback(resp);
    }
}

void CommunityKnowledgeBackend::createForumThread(const drogon::HttpRequestPtr& req,
                       std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    try {
        // Sanitize input
        Json::Value sanitizedInput = sanitizeUserInput(*json);
        
        // Validate content
        Json::Value validationResult = contentValidator_->validateForumThread(sanitizedInput);
        
        if (!validationResult["valid"].asBool()) {
            auto resp = drogon::HttpResponse::newHttpJsonResponse(validationResult);
            resp->setStatusCode(drogon::k400BadRequest);
            callback(resp);
            return;
        }
        
        // Extract thread data
        std::string title = sanitizedInput["title"].asString();
        std::string content = sanitizedInput["content"].asString();
        std::string category = sanitizedInput["category"].asString();
        std::string authorId = sanitizedInput["author_id"].asString();
        
        // Check user permission
        if (!validateUserPermission(authorId, "create", "forum_thread")) {
            Json::Value error;
            error["status"] = "error";
            error["message"] = "User does not have permission to create forum threads";
            
            auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
            resp->setStatusCode(drogon::k403Forbidden);
            callback(resp);
            return;
        }
        
        // Prepare thread data
        Json::Value thread;
        thread["title"] = title;
        thread["content"] = content;
        thread["category"] = category;
        thread["author_id"] = authorId;
        thread["created_at"] = drogon::utils::getFormattedDate();
        thread["updated_at"] = thread["created_at"];
        thread["view_count"] = 0;
        thread["reply_count"] = 0;
        thread["is_pinned"] = false;
        thread["is_locked"] = false;
        
        // Add tags if provided
        if (sanitizedInput.isMember("tags") && sanitizedInput["tags"].isArray()) {
            thread["tags"] = sanitizedInput["tags"];
        }
        
        // Save thread
        std::string threadId = knowledgeRepo_->saveForumThread(thread);
        
        // Add ID to the saved thread
        thread["id"] = threadId;
        
        // Format for response
        Json::Value formattedThread = formatForumThreadForResponse(thread);
        
        // Prepare response
        Json::Value result;
        result["status"] = "success";
        result["message"] = "Forum thread created successfully";
        result["thread"] = formattedThread;
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
        resp->setStatusCode(drogon::k201Created);
        callback(resp);
    }
    catch (const std::exception& e) {
        Json::Value error;
        error["status"] = "error";
        error["message"] = e.what();
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
        resp->setStatusCode(drogon::k500InternalServerError);
        callback(resp);
    }
}

void CommunityKnowledgeBackend::getForumPosts(const drogon::HttpRequestPtr& req,
                   std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                   const std::string& threadId) {
    try {
        // Extract query parameters
        auto params = req->getParameters();
        std::string sortBy = params.find("sort_by") != params.end() ? params["sort_by"] : "chronological";
        int limit = params.find("limit") != params.end() ? std::stoi(params["limit"]) : 50;
        int offset = params.find("offset") != params.end() ? std::stoi(params["offset"]) : 0;
        
        // Check if thread exists
        Json::Value thread = knowledgeRepo_->getForumThread(threadId);
        
        if (thread.isNull()) {
            Json::Value error;
            error["status"] = "error";
            error["message"] = "Forum thread not found";
            
            auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
            resp->setStatusCode(drogon::k404NotFound);
            callback(resp);
            return;
        }
        
        // Increment view count
        thread["view_count"] = thread["view_count"].asInt() + 1;
        knowledgeRepo_->updateForumThread(threadId, thread);
        
        // Get forum posts
        std::vector<Json::Value> posts = knowledgeRepo_->getForumPosts(threadId, sortBy, limit, offset);
        
        // Format posts for response
        Json::Value formattedPosts(Json::arrayValue);
        
        for (const auto& post : posts) {
            formattedPosts.append(formatForumPostForResponse(post));
        }
        
        // Get total count for pagination
        int totalCount = knowledgeRepo_->getForumPostCount(threadId);
        
        // Format thread for response
        Json::Value formattedThread = formatForumThreadForResponse(thread);
        
        // Prepare response
        Json::Value result;
        result["thread"] = formattedThread;
        result["posts"] = formattedPosts;
        result["total_post_count"] = totalCount;
        result["limit"] = limit;
        result["offset"] = offset;
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
        callback(resp);
    }
    catch (const std::exception& e) {
        Json::Value error;
        error["status"] = "error";
        error["message"] = e.what();
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
        resp->setStatusCode(drogon::k500InternalServerError);
        callback(resp);
    }
}

void CommunityKnowledgeBackend::createForumPost(const drogon::HttpRequestPtr& req,
                     std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                     const std::string& threadId) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    try {
        // Check if thread exists and is not locked
        Json::Value thread = knowledgeRepo_->getForumThread(threadId);
        
        if (thread.isNull()) {
            Json::Value error;
            error["status"] = "error";
            error["message"] = "Forum thread not found";
            
            auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
            resp->setStatusCode(drogon::k404NotFound);
            callback(resp);
            return;
        }
        
        if (thread["is_locked"].asBool()) {
            Json::Value error;
            error["status"] = "error";
            error["message"] = "Thread is locked, new posts are not allowed";
            
            auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
            resp->setStatusCode(drogon::k403Forbidden);
            callback(resp);
            return;
        }
        
        // Sanitize input
        Json::Value sanitizedInput = sanitizeUserInput(*json);
        
        // Validate content
        Json::Value validationResult = contentValidator_->validateForumPost(sanitizedInput);
        
        if (!validationResult["valid"].asBool()) {
            auto resp = drogon::HttpResponse::newHttpJsonResponse(validationResult);
            resp->setStatusCode(drogon::k400BadRequest);
            callback(resp);
            return;
        }
        
        // Extract post data
        std::string content = sanitizedInput["content"].asString();
        std::string authorId = sanitizedInput["author_id"].asString();
        
        // Check user permission
        if (!validateUserPermission(authorId, "create", "forum_post")) {
            Json::Value error;
            error["status"] = "error";
            error["message"] = "User does not have permission to create forum posts";
            
            auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
            resp->setStatusCode(drogon::k403Forbidden);
            callback(resp);
            return;
        }
        
        // Prepare post data
        Json::Value post;
        post["thread_id"] = threadId;
        post["content"] = content;
        post["author_id"] = authorId;
        post["created_at"] = drogon::utils::getFormattedDate();
        post["updated_at"] = post["created_at"];
        post["is_solution"] = false;
        
        // Save post
        std::string postId = knowledgeRepo_->saveForumPost(post);
        
        // Add ID to the saved post
        post["id"] = postId;
        
        // Update thread
        thread["reply_count"] = thread["reply_count"].asInt() + 1;
        thread["updated_at"] = post["created_at"];
        knowledgeRepo_->updateForumThread(threadId, thread);
        
        // Format for response
        Json::Value formattedPost = formatForumPostForResponse(post);
        
        // Prepare response
        Json::Value result;
        result["status"] = "success";
        result["message"] = "Forum post created successfully";
        result["post"] = formattedPost;
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
        resp->setStatusCode(drogon::k201Created);
        callback(resp);
    }
    catch (const std::exception& e) {
        Json::Value error;
        error["status"] = "error";
        error["message"] = e.what();
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
        resp->setStatusCode(drogon::k500InternalServerError);
        callback(resp);
    }
}

void CommunityKnowledgeBackend::getExpertNetwork(const drogon::HttpRequestPtr& req,
                      std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    try {
        // Extract query parameters
        auto params = req->getParameters();
        std::string expertise = params.find("expertise") != params.end() ? params["expertise"] : "all";
        std::string sortBy = params.find("sort_by") != params.end() ? params["sort_by"] : "rating";
        int limit = params.find("limit") != params.end() ? std::stoi(params["limit"]) : 10;
        int offset = params.find("offset") != params.end() ? std::stoi(params["offset"]) : 0;
        
        // Get experts
        std::vector<Json::Value> experts = knowledgeRepo_->getExperts(expertise, sortBy, limit, offset);
        
        // Format experts for response
        Json::Value formattedExperts(Json::arrayValue);
        
        for (const auto& expert : experts) {
            formattedExperts.append(formatExpertProfileForResponse(expert));
        }
        
        // Get total count for pagination
        int totalCount = knowledgeRepo_->getExpertCount(expertise);
        
        // Prepare response
        Json::Value result;
        result["experts"] = formattedExperts;
        result["total_count"] = totalCount;
        result["limit"] = limit;
        result["offset"] = offset;
        result["expertise"] = expertise;
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
        callback(resp);
    }
    catch (const std::exception& e) {
        Json::Value error;
        error["status"] = "error";
        error["message"] = e.what();
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
        resp->setStatusCode(drogon::k500InternalServerError);
        callback(resp);
    }
}

void CommunityKnowledgeBackend::requestExpertAssistance(const drogon::HttpRequestPtr& req,
                             std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    try {
        // Sanitize input
        Json::Value sanitizedInput = sanitizeUserInput(*json);
        
        // Extract request data
        std::string userId = sanitizedInput["user_id"].asString();
        std::string expertId = sanitizedInput["expert_id"].asString();
        std::string topic = sanitizedInput["topic"].asString();
        std::string description = sanitizedInput["description"].asString();
        
        // Check if expert exists
        Json::Value expert = knowledgeRepo_->getExpert(expertId);
        
        if (expert.isNull()) {
            Json::Value error;
            error["status"] = "error";
            error["message"] = "Expert not found";
            
            auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
            resp->setStatusCode(drogon::k404NotFound);
            callback(resp);
            return;
        }
        
        // Create assistance request
        Json::Value request;
        request["user_id"] = userId;
        request["expert_id"] = expertId;
        request["topic"] = topic;
        request["description"] = description;
        request["created_at"] = drogon::utils::getFormattedDate();
        request["status"] = "pending";
        
        // Add optional fields
        if (sanitizedInput.isMember("priority")) {
            request["priority"] = sanitizedInput["priority"];
        } else {
            request["priority"] = "normal";
        }
        
        if (sanitizedInput.isMember("deadline")) {
            request["deadline"] = sanitizedInput["deadline"];
        }
        
        // Save request
        std::string requestId = knowledgeRepo_->saveExpertAssistanceRequest(request);
        
        // Add ID to the saved request
        request["id"] = requestId;
        
        // Prepare response
        Json::Value result;
        result["status"] = "success";
        result["message"] = "Expert assistance request submitted successfully";
        result["request_id"] = requestId;
        result["expert"] = formatExpertProfileForResponse(expert);
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
        resp->setStatusCode(drogon::k201Created);
        callback(resp);
    }
    catch (const std::exception& e) {
        Json::Value error;
        error["status"] = "error";
        error["message"] = e.what();
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
        resp->setStatusCode(drogon::k500InternalServerError);
        callback(resp);
    }
}

void CommunityKnowledgeBackend::getExpertProfile(const drogon::HttpRequestPtr& req,
                      std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                      const std::string& expertId) {
    try {
        // Get expert profile
        Json::Value expert = knowledgeRepo_->getExpert(expertId);
        
        if (expert.isNull()) {
            Json::Value error;
            error["status"] = "error";
            error["message"] = "Expert not found";
            
            auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
            resp->setStatusCode(drogon::k404NotFound);
            callback(resp);
            return;
        }
        
        // Format expert profile
        Json::Value formattedProfile = formatExpertProfileForResponse(expert);
        
        // Get expert's contributions
        formattedProfile["contributions"] = knowledgeRepo_->getExpertContributions(expertId);
        
        // Get expert's availability
        formattedProfile["availability"] = knowledgeRepo_->getExpertAvailability(expertId);
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(formattedProfile);
        callback(resp);
    }
    catch (const std::exception& e) {
        Json::Value error;
        error["status"] = "error";
        error["message"] = e.what();
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
        resp->setStatusCode(drogon::k500InternalServerError);
        callback(resp);
    }
}

void CommunityKnowledgeBackend::getPersonalizedRecommendations(const drogon::HttpRequestPtr& req,
                                    std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                                    const std::string& userId) {
    try {
        // Extract query parameters
        auto params = req->getParameters();
        std::string contentType = params.find("content_type") != params.end() ? params["content_type"] : "all";
        int limit = params.find("limit") != params.end() ? std::stoi(params["limit"]) : 10;
        
        // Get user profile/history for recommendation context
        Json::Value userProfile = knowledgeRepo_->getUserProfile(userId);
        
        if (userProfile.isNull()) {
            Json::Value error;
            error["status"] = "error";
            error["message"] = "User not found";
            
            auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
            resp->setStatusCode(drogon::k404NotFound);
            callback(resp);
            return;
        }
        
        // Generate recommendations
        Json::Value recommendations = recommendationEngine_->generateRecommendations(userId, contentType, limit);
        
        // Prepare response
        Json::Value result;
        result["user_id"] = userId;
        result["content_type"] = contentType;
        result["recommendations"] = recommendations;
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
        callback(resp);
    }
    catch (const std::exception& e) {
        Json::Value error;
        error["status"] = "error";
        error["message"] = e.what();
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
        resp->setStatusCode(drogon::k500InternalServerError);
        callback(resp);
    }
}

void CommunityKnowledgeBackend::getContentStatistics(const drogon::HttpRequestPtr& req,
                          std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    try {
        // Generate content statistics
        Json::Value statistics = generateContentStatistics();
        
        // Prepare response
        Json::Value result;
        result["statistics"] = statistics;
        result["generated_at"] = drogon::utils::getFormattedDate();
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
        callback(resp);
    }
    catch (const std::exception& e) {
        Json::Value error;
        error["status"] = "error";
        error["message"] = e.what();
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
        resp->setStatusCode(drogon::k500InternalServerError);
        callback(resp);
    }
}

void CommunityKnowledgeBackend::searchContent(const drogon::HttpRequestPtr& req,
                   std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    try {
        // Extract query parameters
        auto params = req->getParameters();
        std::string query = params.find("q") != params.end() ? params["q"] : "";
        std::string contentType = params.find("content_type") != params.end() ? params["content_type"] : "all";
        std::string sortBy = params.find("sort_by") != params.end() ? params["sort_by"] : "relevance";
        int limit = params.find("limit") != params.end() ? std::stoi(params["limit"]) : 20;
        int offset = params.find("offset") != params.end() ? std::stoi(params["offset"]) : 0;
        
        if (query.empty()) {
            Json::Value error;
            error["status"] = "error";
            error["message"] = "Search query is required";
            
            auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
            resp->setStatusCode(drogon::k400BadRequest);
            callback(resp);
            return;
        }
        
        // Search content
        Json::Value searchResults = knowledgeRepo_->searchContent(query, contentType, sortBy, limit, offset);
        
        // Prepare response
        Json::Value result;
        result["query"] = query;
        result["content_type"] = contentType;
        result["results"] = searchResults["results"];
        result["total_count"] = searchResults["total_count"];
        result["limit"] = limit;
        result["offset"] = offset;
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
        callback(resp);
    }
    catch (const std::exception& e) {
        Json::Value error;
        error["status"] = "error";
        error["message"] = e.what();
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
        resp->setStatusCode(drogon::k500InternalServerError);
        callback(resp);
    }
}

// Helper methods

Json::Value CommunityKnowledgeBackend::formatBestPracticeForResponse(const Json::Value& bestPractice) {
    Json::Value formatted = bestPractice;
    
    // Add author information
    if (formatted.isMember("author_id")) {
        std::string authorId = formatted["author_id"].asString();
        Json::Value authorInfo = knowledgeRepo_->getUserBasicInfo(authorId);
        
        if (!authorInfo.isNull()) {
            formatted["author"] = authorInfo;
        }
    }
    
    return formatted;
}

Json::Value CommunityKnowledgeBackend::formatScenarioForResponse(const Json::Value& scenario) {
    Json::Value formatted = scenario;
    
    // Add author information
    if (formatted.isMember("author_id")) {
        std::string authorId = formatted["author_id"].asString();
        Json::Value authorInfo = knowledgeRepo_->getUserBasicInfo(authorId);
        
        if (!authorInfo.isNull()) {
            formatted["author"] = authorInfo;
        }
    }
    
    return formatted;
}

Json::Value CommunityKnowledgeBackend::formatForumThreadForResponse(const Json::Value& thread) {
    Json::Value formatted = thread;
    
    // Add author information
    if (formatted.isMember("author_id")) {
        std::string authorId = formatted["author_id"].asString();
        Json::Value authorInfo = knowledgeRepo_->getUserBasicInfo(authorId);
        
        if (!authorInfo.isNull()) {
            formatted["author"] = authorInfo;
        }
    }
    
    return formatted;
}

Json::Value CommunityKnowledgeBackend::formatForumPostForResponse(const Json::Value& post) {
    Json::Value formatted = post;
    
    // Add author information
    if (formatted.isMember("author_id")) {
        std::string authorId = formatted["author_id"].asString();
        Json::Value authorInfo = knowledgeRepo_->getUserBasicInfo(authorId);
        
        if (!authorInfo.isNull()) {
            formatted["author"] = authorInfo;
        }
    }
    
    return formatted;
}

Json::Value CommunityKnowledgeBackend::formatExpertProfileForResponse(const Json::Value& expert) {
    Json::Value formatted = expert;
    
    // Remove sensitive information
    formatted.removeMember("password");
    formatted.removeMember("email_verified");
    
    // Add expertise areas with details
    if (formatted.isMember("expertise_areas") && formatted["expertise_areas"].isArray()) {
        Json::Value detailedExpertise(Json::arrayValue);
        
        for (const auto& area : formatted["expertise_areas"]) {
            Json::Value expertiseDetails = knowledgeRepo_->getExpertiseAreaDetails(area.asString());
            
            if (!expertiseDetails.isNull()) {
                detailedExpertise.append(expertiseDetails);
            }
        }
        
        formatted["expertise_details"] = detailedExpertise;
    }
    
    return formatted;
}

Json::Value CommunityKnowledgeBackend::generateContentStatistics() {
    Json::Value statistics;
    
    // Best practices statistics
    Json::Value bestPracticeStats;
    bestPracticeStats["total_count"] = knowledgeRepo_->getBestPracticeCount("all");
    bestPracticeStats["by_category"] = knowledgeRepo_->getBestPracticeCountByCategory();
    bestPracticeStats["average_rating"] = knowledgeRepo_->getAverageBestPracticeRating();
    bestPracticeStats["created_last_30_days"] = knowledgeRepo_->getBestPracticeCountLastDays(30);
    
    statistics["best_practices"] = bestPracticeStats;
    
    // Scenarios statistics
    Json::Value scenarioStats;
    scenarioStats["total_count"] = knowledgeRepo_->getScenarioCount("all", "");
    scenarioStats["by_category"] = knowledgeRepo_->getScenarioCountByCategory();
    scenarioStats["by_aircraft_type"] = knowledgeRepo_->getScenarioCountByAircraftType();
    scenarioStats["average_rating"] = knowledgeRepo_->getAverageScenarioRating();
    scenarioStats["created_last_30_days"] = knowledgeRepo_->getScenarioCountLastDays(30);
    
    statistics["scenarios"] = scenarioStats;
    
    // Forum statistics
    Json::Value forumStats;
    forumStats["thread_count"] = knowledgeRepo_->getForumThreadCount("all");
    forumStats["post_count"] = knowledgeRepo_->getTotalForumPostCount();
    forumStats["active_users_last_30_days"] = knowledgeRepo_->getActiveForumUsersLastDays(30);
    forumStats["by_category"] = knowledgeRepo_->getForumThreadCountByCategory();
    forumStats["threads_created_last_30_days"] = knowledgeRepo_->getForumThreadCountLastDays(30);
    
    statistics["forum"] = forumStats;
    
    // Expert network statistics
    Json::Value expertStats;
    expertStats["expert_count"] = knowledgeRepo_->getExpertCount("all");
    expertStats["by_expertise"] = knowledgeRepo_->getExpertCountByExpertise();
    expertStats["assistance_requests_last_30_days"] = knowledgeRepo_->getExpertAssistanceRequestCountLastDays(30);
    
    statistics["expert_network"] = expertStats;
    
    // Overall user engagement
    Json::Value userEngagement;
    userEngagement["total_users"] = knowledgeRepo_->getTotalUserCount();
    userEngagement["active_last_7_days"] = knowledgeRepo_->getActiveUsersLastDays(7);
    userEngagement["active_last_30_days"] = knowledgeRepo_->getActiveUsersLastDays(30);
    userEngagement["content_contributors"] = knowledgeRepo_->getContentContributorCount();
    
    statistics["user_engagement"] = userEngagement;
    
    return statistics;
}

Json::Value CommunityKnowledgeBackend::sanitizeUserInput(const Json::Value& input) {
    // In a real implementation, this would sanitize user input to prevent XSS and other attacks
    // For this example, we'll just do a very simple sanitization
    
    Json::Value sanitized;
    
    for (const auto& key : input.getMemberNames()) {
        if (input[key].isString()) {
            // Simple example: remove script tags
            std::string value = input[key].asString();
            
            // Replace <script> tags
            size_t startPos = 0;
            while ((startPos = value.find("<script", startPos)) != std::string::npos) {
                size_t endPos = value.find("</script>", startPos);
                if (endPos != std::string::npos) {
                    endPos += 9; // Length of "</script>"
                    value.replace(startPos, endPos - startPos, "");
                } else {
                    break;
                }
            }
            
            sanitized[key] = value;
        }
        else if (input[key].isObject()) {
            sanitized[key] = sanitizeUserInput(input[key]);
        }
        else if (input[key].isArray()) {
            Json::Value sanitizedArray(Json::arrayValue);
            
            for (const auto& element : input[key]) {
                if (element.isObject()) {
                    sanitizedArray.append(sanitizeUserInput(element));
                }
                else if (element.isString()) {
                    std::string value = element.asString();
                    
                    // Replace <script> tags
                    size_t startPos = 0;
                    while ((startPos = value.find("<script", startPos)) != std::string::npos) {
                        size_t endPos = value.find("</script>", startPos);
                        if (endPos != std::string::npos) {
                            endPos += 9; // Length of "</script>"
                            value.replace(startPos, endPos - startPos, "");
                        } else {
                            break;
                        }
                    }
                    
                    sanitizedArray.append(value);
                }
                else {
                    sanitizedArray.append(element);
                }
            }
            
            sanitized[key] = sanitizedArray;
        }
        else {
            sanitized[key] = input[key];
        }
    }
    
    return sanitized;
}

bool CommunityKnowledgeBackend::validateUserPermission(const std::string& userId, const std::string& action, const std::string& resourceId) {
    // In a real implementation, this would check user permissions from a database or auth service
    // For this example, we'll assume all users have permissions
    return true;
}

} // namespace community
} // namespace atp

// Main application setup
int main() {
    // Configure Drogon app
    drogon::app().setLogPath("./")
                 .setLogLevel(trantor::Logger::kInfo)
                 .addListener("0.0.0.0", 8087)
                 .setThreadNum(16)
                 .run();
    
    return 0;
}
