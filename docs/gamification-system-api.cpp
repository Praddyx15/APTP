#include <drogon/drogon.h>
#include <json/json.h>
#include <string>
#include <vector>
#include <map>
#include <memory>
#include <mutex>
#include "gamification_repository.h"
#include "achievement_manager.h"
#include "leaderboard_service.h"

namespace atp {
namespace gamification {

class GamificationSystemAPI : public drogon::HttpController<GamificationSystemAPI> {
public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(GamificationSystemAPI::getAchievements, "/api/gamification/achievements/{userId}", drogon::Get);
    ADD_METHOD_TO(GamificationSystemAPI::unlockAchievement, "/api/gamification/achievements/{userId}/unlock", drogon::Post);
    ADD_METHOD_TO(GamificationSystemAPI::getLeaderboard, "/api/gamification/leaderboard", drogon::Get);
    ADD_METHOD_TO(GamificationSystemAPI::getTrainingChallenges, "/api/gamification/challenges/{userId}", drogon::Get);
    ADD_METHOD_TO(GamificationSystemAPI::updateChallengeProgress, "/api/gamification/challenges/{userId}/progress", drogon::Post);
    ADD_METHOD_TO(GamificationSystemAPI::getSkillTree, "/api/gamification/skill-tree/{userId}", drogon::Get);
    ADD_METHOD_TO(GamificationSystemAPI::progressSkill, "/api/gamification/skill-tree/{userId}/progress", drogon::Post);
    ADD_METHOD_TO(GamificationSystemAPI::getStreaks, "/api/gamification/streaks/{userId}", drogon::Get);
    ADD_METHOD_TO(GamificationSystemAPI::updateStreak, "/api/gamification/streaks/{userId}/update", drogon::Post);
    ADD_METHOD_TO(GamificationSystemAPI::getRewards, "/api/gamification/rewards/{userId}", drogon::Get);
    ADD_METHOD_TO(GamificationSystemAPI::redeemReward, "/api/gamification/rewards/{userId}/redeem", drogon::Post);
    METHOD_LIST_END

    GamificationSystemAPI();

    void getAchievements(const drogon::HttpRequestPtr& req, 
                        std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                        const std::string& userId);
    
    void unlockAchievement(const drogon::HttpRequestPtr& req,
                          std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                          const std::string& userId);
    
    void getLeaderboard(const drogon::HttpRequestPtr& req,
                       std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    void getTrainingChallenges(const drogon::HttpRequestPtr& req,
                             std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                             const std::string& userId);
    
    void updateChallengeProgress(const drogon::HttpRequestPtr& req,
                               std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                               const std::string& userId);
    
    void getSkillTree(const drogon::HttpRequestPtr& req,
                     std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                     const std::string& userId);
    
    void progressSkill(const drogon::HttpRequestPtr& req,
                      std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                      const std::string& userId);
    
    void getStreaks(const drogon::HttpRequestPtr& req,
                   std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                   const std::string& userId);
    
    void updateStreak(const drogon::HttpRequestPtr& req,
                     std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                     const std::string& userId);
    
    void getRewards(const drogon::HttpRequestPtr& req,
                   std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                   const std::string& userId);
    
    void redeemReward(const drogon::HttpRequestPtr& req,
                     std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                     const std::string& userId);

private:
    std::shared_ptr<GamificationRepository> gamificationRepo_;
    std::shared_ptr<AchievementManager> achievementManager_;
    std::shared_ptr<LeaderboardService> leaderboardService_;
    
    // Helper methods
    Json::Value generateAchievementProgress(const std::string& userId);
    Json::Value generatePersonalizedChallenges(const std::string& userId);
    bool validateAchievementUnlock(const std::string& userId, const std::string& achievementId);
    Json::Value applyAchievementRewards(const std::string& userId, const std::string& achievementId);
    Json::Value normalizeLeaderboardScores(const std::vector<Json::Value>& rawScores);
    Json::Value buildSkillTreeData(const std::string& userId);
    bool validateSkillProgression(const std::string& userId, const std::string& skillId);
    Json::Value calculateStreakRewards(const std::string& userId, int streakLength);
};

GamificationSystemAPI::GamificationSystemAPI() {
    // Initialize components
    gamificationRepo_ = std::make_shared<GamificationRepository>();
    achievementManager_ = std::make_shared<AchievementManager>();
    leaderboardService_ = std::make_shared<LeaderboardService>();
}

void GamificationSystemAPI::getAchievements(const drogon::HttpRequestPtr& req, 
                      std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                      const std::string& userId) {
    try {
        // Extract query parameters
        auto params = req->getParameters();
        std::string category = params.find("category") != params.end() ? params["category"] : "all";
        bool includeHidden = params.find("include_hidden") != params.end() && params["include_hidden"] == "true";
        
        // Get achievements for user
        Json::Value achievements = gamificationRepo_->getUserAchievements(userId, category, includeHidden);
        
        // Generate achievement progress
        Json::Value progress = generateAchievementProgress(userId);
        
        // Prepare response
        Json::Value result;
        result["user_id"] = userId;
        result["achievements"] = achievements;
        result["progress"] = progress;
        
        // Add achievement stats
        Json::Value stats;
        stats["total_earned"] = gamificationRepo_->getEarnedAchievementCount(userId);
        stats["total_available"] = gamificationRepo_->getTotalAchievementCount(category);
        stats["completion_percentage"] = (stats["total_earned"].asInt() * 100.0) / stats["total_available"].asInt();
        
        result["stats"] = stats;
        
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

void GamificationSystemAPI::unlockAchievement(const drogon::HttpRequestPtr& req,
                        std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                        const std::string& userId) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    try {
        // Extract achievement ID
        std::string achievementId = (*json)["achievement_id"].asString();
        
        // Validate achievement can be unlocked
        if (!validateAchievementUnlock(userId, achievementId)) {
            Json::Value error;
            error["status"] = "error";
            error["message"] = "Achievement requirements not met";
            
            auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
            resp->setStatusCode(drogon::k400BadRequest);
            callback(resp);
            return;
        }
        
        // Unlock achievement
        bool success = achievementManager_->unlockAchievement(userId, achievementId);
        
        if (!success) {
            Json::Value error;
            error["status"] = "error";
            error["message"] = "Failed to unlock achievement";
            
            auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
            resp->setStatusCode(drogon::k500InternalServerError);
            callback(resp);
            return;
        }
        
        // Apply achievement rewards
        Json::Value rewards = applyAchievementRewards(userId, achievementId);
        
        // Get achievement details
        Json::Value achievement = gamificationRepo_->getAchievementDetails(achievementId);
        
        // Prepare response
        Json::Value result;
        result["status"] = "success";
        result["user_id"] = userId;
        result["achievement"] = achievement;
        result["rewards"] = rewards;
        result["unlocked_at"] = drogon::utils::getFormattedDate();
        
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

void GamificationSystemAPI::getLeaderboard(const drogon::HttpRequestPtr& req,
                     std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    try {
        // Extract query parameters
        auto params = req->getParameters();
        std::string category = params.find("category") != params.end() ? params["category"] : "overall";
        std::string timeFrame = params.find("time_frame") != params.end() ? params["time_frame"] : "all_time";
        int limit = params.find("limit") != params.end() ? std::stoi(params["limit"]) : 10;
        
        // Get leaderboard data
        std::vector<Json::Value> rawLeaderboard = leaderboardService_->getLeaderboard(category, timeFrame, limit);
        
        // Normalize scores for fair comparison
        Json::Value normalizedLeaderboard = normalizeLeaderboardScores(rawLeaderboard);
        
        // Prepare response
        Json::Value result;
        result["category"] = category;
        result["time_frame"] = timeFrame;
        result["generated_at"] = drogon::utils::getFormattedDate();
        result["entries"] = normalizedLeaderboard;
        
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

void GamificationSystemAPI::getTrainingChallenges(const drogon::HttpRequestPtr& req,
                           std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                           const std::string& userId) {
    try {
        // Extract query parameters
        auto params = req->getParameters();
        std::string category = params.find("category") != params.end() ? params["category"] : "all";
        std::string status = params.find("status") != params.end() ? params["status"] : "active";
        
        // Get active challenges
        Json::Value challenges = gamificationRepo_->getUserChallenges(userId, category, status);
        
        // Generate personalized challenges if needed
        if (challenges.size() < 3 && status == "active") {
            Json::Value personalizedChallenges = generatePersonalizedChallenges(userId);
            
            // Add personalized challenges to the list
            for (const auto& challenge : personalizedChallenges) {
                challenges.append(challenge);
            }
            
            // Save personalized challenges
            for (const auto& challenge : personalizedChallenges) {
                gamificationRepo_->saveUserChallenge(userId, challenge);
            }
        }
        
        // Prepare response
        Json::Value result;
        result["user_id"] = userId;
        result["category"] = category;
        result["status"] = status;
        result["challenges"] = challenges;
        
        // Add challenge stats
        Json::Value stats;
        stats["active_count"] = gamificationRepo_->getUserChallengeCount(userId, "active");
        stats["completed_count"] = gamificationRepo_->getUserChallengeCount(userId, "completed");
        stats["success_rate"] = gamificationRepo_->getUserChallengeSuccessRate(userId);
        
        result["stats"] = stats;
        
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

void GamificationSystemAPI::updateChallengeProgress(const drogon::HttpRequestPtr& req,
                             std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                             const std::string& userId) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    try {
        // Extract challenge ID and progress
        std::string challengeId = (*json)["challenge_id"].asString();
        int progressValue = (*json)["progress"].asInt();
        
        // Get current challenge
        Json::Value challenge = gamificationRepo_->getUserChallenge(userId, challengeId);
        
        if (challenge.isNull()) {
            Json::Value error;
            error["status"] = "error";
            error["message"] = "Challenge not found";
            
            auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
            resp->setStatusCode(drogon::k404NotFound);
            callback(resp);
            return;
        }
        
        // Update progress
        int currentProgress = challenge["current_progress"].asInt();
        int targetProgress = challenge["target_progress"].asInt();
        
        // Calculate new progress
        int newProgress = currentProgress + progressValue;
        if (newProgress > targetProgress) {
            newProgress = targetProgress;
        }
        
        challenge["current_progress"] = newProgress;
        
        // Check if challenge is completed
        bool isCompleted = (newProgress >= targetProgress);
        
        if (isCompleted) {
            challenge["status"] = "completed";
            challenge["completed_at"] = drogon::utils::getFormattedDate();
            
            // Apply rewards
            Json::Value rewards;
            rewards["experience_points"] = challenge["reward_xp"];
            rewards["points"] = challenge["reward_points"];
            
            // Apply rewards to user
            gamificationRepo_->applyUserRewards(userId, rewards);
        }
        
        // Save updated challenge
        gamificationRepo_->updateUserChallenge(userId, challengeId, challenge);
        
        // Prepare response
        Json::Value result;
        result["status"] = "success";
        result["user_id"] = userId;
        result["challenge_id"] = challengeId;
        result["previous_progress"] = currentProgress;
        result["current_progress"] = newProgress;
        result["target_progress"] = targetProgress;
        result["is_completed"] = isCompleted;
        
        if (isCompleted) {
            result["rewards"] = Json::Value(Json::objectValue);
            result["rewards"]["experience_points"] = challenge["reward_xp"];
            result["rewards"]["points"] = challenge["reward_points"];
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

void GamificationSystemAPI::getSkillTree(const drogon::HttpRequestPtr& req,
                   std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                   const std::string& userId) {
    try {
        // Extract query parameters
        auto params = req->getParameters();
        std::string category = params.find("category") != params.end() ? params["category"] : "all";
        
        // Build skill tree data
        Json::Value skillTree = buildSkillTreeData(userId);
        
        // Filter by category if specified
        if (category != "all") {
            Json::Value filteredSkillTree(Json::arrayValue);
            
            for (const auto& skill : skillTree) {
                if (skill["category"].asString() == category) {
                    filteredSkillTree.append(skill);
                }
            }
            
            skillTree = filteredSkillTree;
        }
        
        // Get user's level and experience
        Json::Value userProfile = gamificationRepo_->getUserProfile(userId);
        
        // Prepare response
        Json::Value result;
        result["user_id"] = userId;
        result["level"] = userProfile["level"];
        result["experience"] = userProfile["experience"];
        result["skill_tree"] = skillTree;
        
        // Add skill stats
        Json::Value stats;
        stats["unlocked_skills"] = gamificationRepo_->getUserUnlockedSkillCount(userId);
        stats["total_skills"] = gamificationRepo_->getTotalSkillCount(category);
        stats["mastery_percentage"] = (stats["unlocked_skills"].asInt() * 100.0) / stats["total_skills"].asInt();
        
        result["stats"] = stats;
        
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

void GamificationSystemAPI::progressSkill(const drogon::HttpRequestPtr& req,
                    std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                    const std::string& userId) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    try {
        // Extract skill ID and progress action
        std::string skillId = (*json)["skill_id"].asString();
        std::string action = (*json)["action"].asString();
        
        // Validate skill progression
        if (!validateSkillProgression(userId, skillId)) {
            Json::Value error;
            error["status"] = "error";
            error["message"] = "Skill prerequisites not met or already mastered";
            
            auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
            resp->setStatusCode(drogon::k400BadRequest);
            callback(resp);
            return;
        }
        
        // Get skill details
        Json::Value skill = gamificationRepo_->getSkillDetails(skillId);
        
        // Get user's current progress on this skill
        Json::Value userSkill = gamificationRepo_->getUserSkillProgress(userId, skillId);
        
        int currentLevel = 0;
        if (!userSkill.isNull()) {
            currentLevel = userSkill["level"].asInt();
        }
        
        int maxLevel = skill["max_level"].asInt();
        
        // Calculate new level based on action
        int newLevel = currentLevel;
        
        if (action == "increase") {
            newLevel = currentLevel + 1;
            if (newLevel > maxLevel) {
                newLevel = maxLevel;
            }
        }
        else if (action == "master") {
            newLevel = maxLevel;
        }
        
        // Update skill progress
        userSkill["level"] = newLevel;
        userSkill["updated_at"] = drogon::utils::getFormattedDate();
        
        if (newLevel == maxLevel && currentLevel < maxLevel) {
            userSkill["mastered"] = true;
            userSkill["mastered_at"] = drogon::utils::getFormattedDate();
            
            // Apply mastery rewards
            int masteryXp = skill["mastery_xp"].asInt();
            
            // Update user's experience
            Json::Value userProfile = gamificationRepo_->getUserProfile(userId);
            int currentXp = userProfile["experience"].asInt();
            int newXp = currentXp + masteryXp;
            
            userProfile["experience"] = newXp;
            
            // Check for level up
            int currentLevel = userProfile["level"].asInt();
            int xpForNextLevel = (currentLevel + 1) * 1000; // Simple level calculation
            
            if (newXp >= xpForNextLevel) {
                userProfile["level"] = currentLevel + 1;
            }
            
            // Save updated profile
            gamificationRepo_->updateUserProfile(userId, userProfile);
        }
        
        // Save updated skill progress
        gamificationRepo_->updateUserSkillProgress(userId, skillId, userSkill);
        
        // Prepare response
        Json::Value result;
        result["status"] = "success";
        result["user_id"] = userId;
        result["skill_id"] = skillId;
        result["skill_name"] = skill["name"];
        result["previous_level"] = currentLevel;
        result["current_level"] = newLevel;
        result["max_level"] = maxLevel;
        
        if (newLevel == maxLevel && currentLevel < maxLevel) {
            result["mastered"] = true;
            result["rewards"] = Json::Value(Json::objectValue);
            result["rewards"]["experience_points"] = skill["mastery_xp"];
            
            if (userProfile["level"].asInt() > currentLevel) {
                result["level_up"] = true;
                result["new_level"] = userProfile["level"];
            }
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

void GamificationSystemAPI::getStreaks(const drogon::HttpRequestPtr& req,
                 std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                 const std::string& userId) {
    try {
        // Get user's streak information
        Json::Value streakData = gamificationRepo_->getUserStreaks(userId);
        
        // Prepare response
        Json::Value result;
        result["user_id"] = userId;
        result["current_streak"] = streakData["current_streak"];
        result["longest_streak"] = streakData["longest_streak"];
        result["last_activity_date"] = streakData["last_activity_date"];
        result["streak_history"] = streakData["streak_history"];
        
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

void GamificationSystemAPI::updateStreak(const drogon::HttpRequestPtr& req,
                   std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                   const std::string& userId) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    try {
        // Extract activity information
        std::string activityType = (*json)["activity_type"].asString();
        std::string activityDate = (*json).get("activity_date", drogon::utils::getFormattedDate()).asString();
        
        // Get user's current streak information
        Json::Value streakData = gamificationRepo_->getUserStreaks(userId);
        
        int currentStreak = streakData["current_streak"].asInt();
        int longestStreak = streakData["longest_streak"].asInt();
        std::string lastActivityDate = streakData["last_activity_date"].asString();
        
        // Check if this is a new day compared to last activity
        bool isNewDay = (lastActivityDate != activityDate);
        
        // Calculate new streak
        int newStreak = currentStreak;
        
        if (isNewDay) {
            // Check if this is a consecutive day
            // In a real implementation, proper date comparison would be done
            bool isConsecutiveDay = true; // Simplified for this example
            
            if (isConsecutiveDay) {
                newStreak = currentStreak + 1;
                
                // Update longest streak if needed
                if (newStreak > longestStreak) {
                    longestStreak = newStreak;
                }
            }
            else {
                // Streak broken
                newStreak = 1;
            }
        }
        
        // Update streak data
        streakData["current_streak"] = newStreak;
        streakData["longest_streak"] = longestStreak;
        streakData["last_activity_date"] = activityDate;
        
        // Add to history
        Json::Value historyEntry;
        historyEntry["date"] = activityDate;
        historyEntry["activity_type"] = activityType;
        
        streakData["streak_history"].append(historyEntry);
        
        // Save updated streak data
        gamificationRepo_->updateUserStreaks(userId, streakData);
        
        // Calculate streak rewards if streak increased
        Json::Value rewards;
        
        if (newStreak > currentStreak) {
            rewards = calculateStreakRewards(userId, newStreak);
            
            // Apply rewards to user
            gamificationRepo_->applyUserRewards(userId, rewards);
        }
        
        // Prepare response
        Json::Value result;
        result["status"] = "success";
        result["user_id"] = userId;
        result["previous_streak"] = currentStreak;
        result["current_streak"] = newStreak;
        result["longest_streak"] = longestStreak;
        
        if (!rewards.isNull()) {
            result["rewards"] = rewards;
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

void GamificationSystemAPI::getRewards(const drogon::HttpRequestPtr& req,
                 std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                 const std::string& userId) {
    try {
        // Extract query parameters
        auto params = req->getParameters();
        std::string status = params.find("status") != params.end() ? params["status"] : "available";
        
        // Get user rewards
        Json::Value rewards = gamificationRepo_->getUserRewards(userId, status);
        
        // Get user points
        Json::Value userProfile = gamificationRepo_->getUserProfile(userId);
        
        // Prepare response
        Json::Value result;
        result["user_id"] = userId;
        result["points"] = userProfile["points"];
        result["rewards"] = rewards;
        
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

void GamificationSystemAPI::redeemReward(const drogon::HttpRequestPtr& req,
                   std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                   const std::string& userId) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    try {
        // Extract reward ID
        std::string rewardId = (*json)["reward_id"].asString();
        
        // Get reward details
        Json::Value reward = gamificationRepo_->getRewardDetails(rewardId);
        
        if (reward.isNull()) {
            Json::Value error;
            error["status"] = "error";
            error["message"] = "Reward not found";
            
            auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
            resp->setStatusCode(drogon::k404NotFound);
            callback(resp);
            return;
        }
        
        // Get user profile to check points
        Json::Value userProfile = gamificationRepo_->getUserProfile(userId);
        int userPoints = userProfile["points"].asInt();
        int rewardCost = reward["cost"].asInt();
        
        if (userPoints < rewardCost) {
            Json::Value error;
            error["status"] = "error";
            error["message"] = "Insufficient points";
            error["user_points"] = userPoints;
            error["reward_cost"] = rewardCost;
            
            auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
            resp->setStatusCode(drogon::k400BadRequest);
            callback(resp);
            return;
        }
        
        // Deduct points
        userProfile["points"] = userPoints - rewardCost;
        gamificationRepo_->updateUserProfile(userId, userProfile);
        
        // Record reward redemption
        Json::Value redemption;
        redemption["user_id"] = userId;
        redemption["reward_id"] = rewardId;
        redemption["redeemed_at"] = drogon::utils::getFormattedDate();
        redemption["cost"] = rewardCost;
        redemption["status"] = "pending";
        
        std::string redemptionId = gamificationRepo_->recordRewardRedemption(redemption);
        
        // Prepare response
        Json::Value result;
        result["status"] = "success";
        result["user_id"] = userId;
        result["reward_id"] = rewardId;
        result["reward_name"] = reward["name"];
        result["redemption_id"] = redemptionId;
        result["cost"] = rewardCost;
        result["previous_points"] = userPoints;
        result["current_points"] = userProfile["points"];
        result["redemption_status"] = "pending";
        
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
Json::Value GamificationSystemAPI::generateAchievementProgress(const std::string& userId) {
    // In a real implementation, this would calculate actual progress for each achievement
    // For this example, we'll return mock progress data
    
    Json::Value progress(Json::objectValue);
    
    // Get user's in-progress achievements
    std::vector<Json::Value> inProgressAchievements = gamificationRepo_->getUserInProgressAchievements(userId);
    
    for (const auto& achievement : inProgressAchievements) {
        std::string achievementId = achievement["id"].asString();
        int currentProgress = achievement["current_progress"].asInt();
        int targetProgress = achievement["target_progress"].asInt();
        
        Json::Value achievementProgress;
        achievementProgress["current"] = currentProgress;
        achievementProgress["target"] = targetProgress;
        achievementProgress["percentage"] = (currentProgress * 100.0) / targetProgress;
        
        progress[achievementId] = achievementProgress;
    }
    
    return progress;
}

Json::Value GamificationSystemAPI::generatePersonalizedChallenges(const std::string& userId) {
    // In a real implementation, this would analyze user data to generate tailored challenges
    // For this example, we'll return mock challenges
    
    Json::Value challenges(Json::arrayValue);
    
    // Get user profile to personalize challenges
    Json::Value userProfile = gamificationRepo_->getUserProfile(userId);
    int userLevel = userProfile["level"].asInt();
    
    // Challenge 1: Training sessions
    Json::Value challenge1;
    challenge1["id"] = "ch-" + userId + "-" + std::to_string(std::rand());
    challenge1["type"] = "training";
    challenge1["title"] = "Consistent Training";
    challenge1["description"] = "Complete 5 training sessions within the next 7 days";
    challenge1["current_progress"] = 0;
    challenge1["target_progress"] = 5;
    challenge1["reward_xp"] = 150 + (userLevel * 10); // Scale with user level
    challenge1["reward_points"] = 100;
    challenge1["status"] = "active";
    challenge1["expires_at"] = ""; // Would be calculated based on current date + 7 days
    
    challenges.append(challenge1);
    
    // Challenge 2: Perfect score
    Json::Value challenge2;
    challenge2["id"] = "ch-" + userId + "-" + std::to_string(std::rand());
    challenge2["type"] = "performance";
    challenge2["title"] = "Perfect Execution";
    challenge2["description"] = "Achieve a perfect score on any assessment";
    challenge2["current_progress"] = 0;
    challenge2["target_progress"] = 1;
    challenge2["reward_xp"] = 200 + (userLevel * 15);
    challenge2["reward_points"] = 150;
    challenge2["status"] = "active";
    
    challenges.append(challenge2);
    
    // Challenge 3: Skill development
    Json::Value challenge3;
    challenge3["id"] = "ch-" + userId + "-" + std::to_string(std::rand());
    challenge3["type"] = "skill";
    challenge3["title"] = "Skill Mastery";
    challenge3["description"] = "Master 2 new skills in your skill tree";
    challenge3["current_progress"] = 0;
    challenge3["target_progress"] = 2;
    challenge3["reward_xp"] = 180 + (userLevel * 12);
    challenge3["reward_points"] = 120;
    challenge3["status"] = "active";
    
    challenges.append(challenge3);
    
    return challenges;
}

bool GamificationSystemAPI::validateAchievementUnlock(const std::string& userId, const std::string& achievementId) {
    // Get achievement details
    Json::Value achievement = gamificationRepo_->getAchievementDetails(achievementId);
    
    if (achievement.isNull()) {
        return false;
    }
    
    // Check if already unlocked
    bool isUnlocked = gamificationRepo_->isAchievementUnlocked(userId, achievementId);
    
    if (isUnlocked) {
        return false;
    }
    
    // Check prerequisites
    if (achievement.isMember("prerequisites") && achievement["prerequisites"].isArray()) {
        for (const auto& prereq : achievement["prerequisites"]) {
            std::string prereqId = prereq.asString();
            
            if (!gamificationRepo_->isAchievementUnlocked(userId, prereqId)) {
                return false;
            }
        }
    }
    
    // Check requirements based on achievement type
    std::string achievementType = achievement["type"].asString();
    
    if (achievementType == "progress") {
        // Progress-based achievement
        int currentProgress = achievement.isMember("current_progress") ? 
                            achievement["current_progress"].asInt() : 0;
        int targetProgress = achievement["target_progress"].asInt();
        
        return currentProgress >= targetProgress;
    }
    else if (achievementType == "milestone") {
        // Milestone achievement - validate based on user stats
        std::string milestoneType = achievement["milestone_type"].asString();
        int milestoneValue = achievement["milestone_value"].asInt();
        
        if (milestoneType == "training_count") {
            int userTrainingCount = gamificationRepo_->getUserTrainingCount(userId);
            return userTrainingCount >= milestoneValue;
        }
        else if (milestoneType == "perfect_score_count") {
            int userPerfectScoreCount = gamificationRepo_->getUserPerfectScoreCount(userId);
            return userPerfectScoreCount >= milestoneValue;
        }
        // Add more milestone types as needed
    }
    
    // For other achievement types or if no validation is needed
    return true;
}

Json::Value GamificationSystemAPI::applyAchievementRewards(const std::string& userId, const std::string& achievementId) {
    // Get achievement details to determine rewards
    Json::Value achievement = gamificationRepo_->getAchievementDetails(achievementId);
    
    Json::Value rewards(Json::objectValue);
    
    // Experience points
    int xpReward = achievement.get("reward_xp", 0).asInt();
    rewards["experience_points"] = xpReward;
    
    // Points
    int pointsReward = achievement.get("reward_points", 0).asInt();
    rewards["points"] = pointsReward;
    
    // Unlock badges if applicable
    if (achievement.isMember("reward_badges") && achievement["reward_badges"].isArray()) {
        Json::Value badges(Json::arrayValue);
        
        for (const auto& badgeId : achievement["reward_badges"]) {
            // Unlock badge for user
            achievementManager_->unlockBadge(userId, badgeId.asString());
            
            // Add badge details to response
            Json::Value badge = gamificationRepo_->getBadgeDetails(badgeId.asString());
            badges.append(badge);
        }
        
        rewards["badges"] = badges;
    }
    
    // Apply experience and points to user profile
    Json::Value userProfile = gamificationRepo_->getUserProfile(userId);
    
    int currentXp = userProfile["experience"].asInt();
    int currentPoints = userProfile["points"].asInt();
    int currentLevel = userProfile["level"].asInt();
    
    int newXp = currentXp + xpReward;
    int newPoints = currentPoints + pointsReward;
    
    userProfile["experience"] = newXp;
    userProfile["points"] = newPoints;
    
    // Check for level up
    int xpForNextLevel = (currentLevel + 1) * 1000; // Simple level calculation
    
    if (newXp >= xpForNextLevel) {
        int newLevel = currentLevel + 1;
        userProfile["level"] = newLevel;
        rewards["level_up"] = true;
        rewards["new_level"] = newLevel;
    }
    
    // Save updated profile
    gamificationRepo_->updateUserProfile(userId, userProfile);
    
    return rewards;
}

Json::Value GamificationSystemAPI::normalizeLeaderboardScores(const std::vector<Json::Value>& rawScores) {
    // In a real implementation, this would normalize scores based on various factors
    // For this example, we'll just convert the vector to a Json::Value array
    
    Json::Value normalizedScores(Json::arrayValue);
    
    for (const auto& score : rawScores) {
        normalizedScores.append(score);
    }
    
    return normalizedScores;
}

Json::Value GamificationSystemAPI::buildSkillTreeData(const std::string& userId) {
    // Get all skills
    std::vector<Json::Value> allSkills = gamificationRepo_->getAllSkills();
    
    // Get user's skill progress
    std::map<std::string, Json::Value> userSkillProgress = gamificationRepo_->getUserSkillProgressMap(userId);
    
    // Build skill tree with user progress
    Json::Value skillTree(Json::arrayValue);
    
    for (const auto& skill : allSkills) {
        Json::Value skillNode = skill;
        std::string skillId = skill["id"].asString();
        
        // Add user progress
        if (userSkillProgress.find(skillId) != userSkillProgress.end()) {
            skillNode["user_level"] = userSkillProgress[skillId]["level"];
            skillNode["mastered"] = userSkillProgress[skillId]["mastered"];
            
            if (userSkillProgress[skillId]["mastered"].asBool()) {
                skillNode["mastered_at"] = userSkillProgress[skillId]["mastered_at"];
            }
        }
        else {
            skillNode["user_level"] = 0;
            skillNode["mastered"] = false;
        }
        
        // Add unlock status
        skillNode["unlocked"] = isSkillUnlocked(userId, skill);
        
        skillTree.append(skillNode);
    }
    
    return skillTree;
}

bool GamificationSystemAPI::isSkillUnlocked(const std::string& userId, const Json::Value& skill) {
    // Check prerequisites
    if (skill.isMember("prerequisites") && skill["prerequisites"].isArray()) {
        for (const auto& prereq : skill["prerequisites"]) {
            std::string prereqId = prereq.asString();
            
            // Check if prerequisite skill is mastered
            Json::Value userSkill = gamificationRepo_->getUserSkillProgress(userId, prereqId);
            
            if (userSkill.isNull() || !userSkill["mastered"].asBool()) {
                return false;
            }
        }
    }
    
    // Check level requirement
    if (skill.isMember("level_requirement")) {
        int levelReq = skill["level_requirement"].asInt();
        
        Json::Value userProfile = gamificationRepo_->getUserProfile(userId);
        int userLevel = userProfile["level"].asInt();
        
        if (userLevel < levelReq) {
            return false;
        }
    }
    
    return true;
}

bool GamificationSystemAPI::validateSkillProgression(const std::string& userId, const std::string& skillId) {
    // Get skill details
    Json::Value skill = gamificationRepo_->getSkillDetails(skillId);
    
    if (skill.isNull()) {
        return false;
    }
    
    // Check if skill is unlocked
    if (!isSkillUnlocked(userId, skill)) {
        return false;
    }
    
    // Get user's current progress on this skill
    Json::Value userSkill = gamificationRepo_->getUserSkillProgress(userId, skillId);
    
    // Check if already mastered
    if (!userSkill.isNull() && userSkill["mastered"].asBool()) {
        return false;
    }
    
    return true;
}

Json::Value GamificationSystemAPI::calculateStreakRewards(const std::string& userId, int streakLength) {
    Json::Value rewards(Json::objectValue);
    
    // Calculate rewards based on streak length
    int xpReward = 0;
    int pointsReward = 0;
    
    // Example reward scale
    if (streakLength >= 365) {
        // 1 year streak
        xpReward = 1000;
        pointsReward = 500;
    }
    else if (streakLength >= 180) {
        // 6 month streak
        xpReward = 500;
        pointsReward = 250;
    }
    else if (streakLength >= 90) {
        // 3 month streak
        xpReward = 300;
        pointsReward = 150;
    }
    else if (streakLength >= 30) {
        // 1 month streak
        xpReward = 200;
        pointsReward = 100;
    }
    else if (streakLength >= 7) {
        // 1 week streak
        xpReward = 50;
        pointsReward = 25;
    }
    else {
        // Daily streaks (1-6 days)
        xpReward = 10 * streakLength;
        pointsReward = 5 * streakLength;
    }
    
    rewards["experience_points"] = xpReward;
    rewards["points"] = pointsReward;
    
    // Special milestones might unlock badges
    if (streakLength == 7 || streakLength == 30 || streakLength == 90 || 
        streakLength == 180 || streakLength == 365) {
        
        std::string badgeId = "streak-" + std::to_string(streakLength);
        achievementManager_->unlockBadge(userId, badgeId);
        
        Json::Value badge = gamificationRepo_->getBadgeDetails(badgeId);
        
        Json::Value badges(Json::arrayValue);
        badges.append(badge);
        
        rewards["badges"] = badges;
    }
    
    return rewards;
}

} // namespace gamification
} // namespace atp

// Main application setup
int main() {
    // Configure Drogon app
    drogon::app().setLogPath("./")
                 .setLogLevel(trantor::Logger::kInfo)
                 .addListener("0.0.0.0", 8086)
                 .setThreadNum(16)
                 .run();
    
    return 0;
}
