// /backend/collaboration/include/collaboration/CollaborationService.h
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <unordered_map>
#include <chrono>
#include <mutex>
#include <drogon/HttpController.h>
#include "core/ConfigurationManager.h"
#include "user-management/UserManager.h"
#include "database/DatabaseManager.h"
#include "collaboration/WorkspaceManager.h"
#include "collaboration/Message.h"
#include "collaboration/WebSocketHandler.h"
#include "collaboration/NotificationService.h"

namespace Collaboration {

class CollaborationService {
public:
    CollaborationService(
        std::shared_ptr<Core::ConfigurationManager> config,
        std::shared_ptr<User::UserManager> userManager,
        std::shared_ptr<Database::DatabaseManager> dbManager
    );
    ~CollaborationService();

    // Workspace management
    std::shared_ptr<Workspace> createWorkspace(const std::string& name, const std::string& ownerId);
    std::shared_ptr<Workspace> getWorkspace(const std::string& workspaceId);
    bool deleteWorkspace(const std::string& workspaceId, const std::string& userId);
    std::vector<std::shared_ptr<Workspace>> getUserWorkspaces(const std::string& userId);
    
    // Workspace sharing & access control
    bool addUserToWorkspace(const std::string& workspaceId, const std::string& userId, WorkspaceRole role);
    bool removeUserFromWorkspace(const std::string& workspaceId, const std::string& userId);
    bool updateUserRole(const std::string& workspaceId, const std::string& userId, WorkspaceRole newRole);
    std::vector<WorkspaceUser> getWorkspaceUsers(const std::string& workspaceId);
    
    // Real-time collaboration
    bool startCollaborationSession(const std::string& workspaceId, const std::string& userId);
    bool endCollaborationSession(const std::string& workspaceId, const std::string& userId);
    std::vector<std::string> getActiveUsers(const std::string& workspaceId);
    
    // Messaging
    MessageId sendMessage(const std::string& workspaceId, const std::string& senderId, 
                         const std::string& content, MessageType type = MessageType::TEXT);
    std::vector<Message> getMessages(const std::string& workspaceId, 
                                    std::chrono::system_clock::time_point since,
                                    int limit = 50);
    
    // Document collaboration
    bool lockDocument(const std::string& docId, const std::string& userId);
    bool unlockDocument(const std::string& docId, const std::string& userId);
    bool applyDocumentChange(const std::string& docId, const DocumentChange& change);
    std::vector<DocumentChange> getDocumentChanges(const std::string& docId, 
                                                 int sinceVersion = -1);
    
    // Version control
    VersionId createVersion(const std::string& docId, const std::string& userId, 
                           const std::string& comment);
    std::vector<Version> getVersionHistory(const std::string& docId);
    bool revertToVersion(const std::string& docId, VersionId versionId, 
                        const std::string& userId);
                        
    // Notifications
    void registerForNotifications(const std::string& userId, const std::string& endpoint);
    void unregisterFromNotifications(const std::string& userId, const std::string& endpoint);
    void sendNotification(const std::string& targetUserId, const Notification& notification);

private:
    std::shared_ptr<Core::ConfigurationManager> config_;
    std::shared_ptr<User::UserManager> userManager_;
    std::shared_ptr<Database::DatabaseManager> dbManager_;
    std::shared_ptr<WorkspaceManager> workspaceManager_;
    std::shared_ptr<WebSocketHandler> wsHandler_;
    std::shared_ptr<NotificationService> notificationService_;
    
    // Cache of active users per workspace
    std::unordered_map<std::string, std::unordered_set<std::string>> activeUsers_;
    std::mutex activeUsersMutex_;
    
    bool validateUserAccess(const std::string& workspaceId, const std::string& userId, 
                           WorkspaceRole requiredRole);
    void broadcastToWorkspace(const std::string& workspaceId, const std::string& event,
                             const std::string& data);
};

} // namespace Collaboration

// /backend/collaboration/include/collaboration/WorkspaceManager.h
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <unordered_map>
#include "collaboration/Workspace.h"
#include "database/DatabaseManager.h"

namespace Collaboration {

class WorkspaceManager {
public:
    explicit WorkspaceManager(std::shared_ptr<Database::DatabaseManager> dbManager);
    ~WorkspaceManager();
    
    // Workspace CRUD operations
    std::shared_ptr<Workspace> createWorkspace(const std::string& name, const std::string& ownerId);
    std::shared_ptr<Workspace> getWorkspace(const std::string& workspaceId);
    bool updateWorkspace(const std::shared_ptr<Workspace>& workspace);
    bool deleteWorkspace(const std::string& workspaceId);
    
    // User workspace queries
    std::vector<std::shared_ptr<Workspace>> getUserWorkspaces(const std::string& userId);
    
    // Cache management
    void refreshCache();
    void invalidateWorkspaceCache(const std::string& workspaceId);

private:
    std::shared_ptr<Database::DatabaseManager> dbManager_;
    std::unordered_map<std::string, std::shared_ptr<Workspace>> workspaceCache_;
    std::mutex cacheMutex_;
    
    std::shared_ptr<Workspace> loadWorkspaceFromDb(const std::string& workspaceId);
    bool saveWorkspaceToDb(const std::shared_ptr<Workspace>& workspace);
};

} // namespace Collaboration

// /backend/collaboration/include/collaboration/Message.h
#pragma once

#include <string>
#include <chrono>
#include <vector>
#include <optional>
#include <nlohmann/json.hpp>

namespace Collaboration {

using MessageId = std::string;

enum class MessageType {
    TEXT,
    FILE,
    SYSTEM,
    NOTIFICATION
};

struct MessageAttachment {
    std::string fileId;
    std::string fileName;
    std::string mimeType;
    size_t fileSize;
    
    nlohmann::json toJson() const;
    static MessageAttachment fromJson(const nlohmann::json& json);
};

class Message {
public:
    Message(
        const std::string& workspaceId,
        const std::string& senderId,
        const std::string& content,
        MessageType type = MessageType::TEXT
    );
    
    // Getters
    MessageId getId() const { return id_; }
    std::string getWorkspaceId() const { return workspaceId_; }
    std::string getSenderId() const { return senderId_; }
    std::string getContent() const { return content_; }
    MessageType getType() const { return type_; }
    std::chrono::system_clock::time_point getTimestamp() const { return timestamp_; }
    const std::optional<MessageAttachment>& getAttachment() const { return attachment_; }
    
    // Setters
    void setAttachment(const MessageAttachment& attachment) { attachment_ = attachment; }
    
    // Serialization
    nlohmann::json toJson() const;
    static Message fromJson(const nlohmann::json& json);

private:
    MessageId id_;
    std::string workspaceId_;
    std::string senderId_;
    std::string content_;
    MessageType type_;
    std::chrono::system_clock::time_point timestamp_;
    std::optional<MessageAttachment> attachment_;
};

} // namespace Collaboration

// /backend/collaboration/include/collaboration/WebSocketHandler.h
#pragma once

#include <string>
#include <unordered_map>
#include <unordered_set>
#include <mutex>
#include <functional>
#include <drogon/WebSocketController.h>
#include "user-management/UserManager.h"

namespace Collaboration {

class WebSocketHandler : public drogon::WebSocketController<WebSocketHandler> {
public:
    explicit WebSocketHandler(std::shared_ptr<User::UserManager> userManager);
    
    // WebSocket controller handlers
    void handleNewConnection(const drogon::HttpRequestPtr& req, 
                            const drogon::WebSocketConnectionPtr& conn) override;
    void handleNewMessage(const drogon::WebSocketConnectionPtr& conn,
                         std::string&& message,
                         const drogon::WebSocketMessageType& type) override;
    void handleConnectionClosed(const drogon::WebSocketConnectionPtr& conn) override;
    
    // Message broadcasting methods
    void broadcastToUser(const std::string& userId, const std::string& message);
    void broadcastToWorkspace(const std::string& workspaceId, const std::string& message);
    void broadcastToAll(const std::string& message);
    
    // Connection management
    void registerConnection(const std::string& userId, const std::string& workspaceId,
                          const drogon::WebSocketConnectionPtr& conn);
    void unregisterConnection(const drogon::WebSocketConnectionPtr& conn);
    
    // Event handling
    using MessageHandler = std::function<void(const std::string&, const std::string&, const std::string&)>;
    void registerMessageHandler(const std::string& eventType, MessageHandler handler);

    WS_PATH_LIST_BEGIN
    WS_PATH_ADD("/ws/collaboration", drogon::Get);
    WS_PATH_LIST_END

private:
    std::shared_ptr<User::UserManager> userManager_;
    
    // Connection mappings
    std::unordered_map<drogon::WebSocketConnectionPtr, std::string> connToUserId_;
    std::unordered_map<drogon::WebSocketConnectionPtr, std::string> connToWorkspaceId_;
    std::unordered_map<std::string, std::unordered_set<drogon::WebSocketConnectionPtr>> userIdToConns_;
    std::unordered_map<std::string, std::unordered_set<drogon::WebSocketConnectionPtr>> workspaceIdToConns_;
    
    // Event handlers
    std::unordered_map<std::string, std::vector<MessageHandler>> eventHandlers_;
    
    // Thread safety
    std::mutex mutex_;
    
    // Helper methods
    bool validateToken(const std::string& token, std::string& userId);
    void processMessage(const drogon::WebSocketConnectionPtr& conn, const std::string& message);
};

} // namespace Collaboration

// /backend/collaboration/include/collaboration/NotificationService.h
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <unordered_map>
#include <mutex>
#include "core/ConfigurationManager.h"
#include "database/DatabaseManager.h"

namespace Collaboration {

enum class NotificationType {
    MESSAGE,
    DOCUMENT_CHANGE,
    WORKSPACE_INVITATION,
    SYSTEM,
    ASSESSMENT_COMPLETED
};

struct Notification {
    std::string id;
    std::string targetUserId;
    std::string title;
    std::string content;
    NotificationType type;
    std::string sourceId; // workspaceId, documentId, etc.
    std::chrono::system_clock::time_point timestamp;
    bool read = false;
    
    nlohmann::json toJson() const;
    static Notification fromJson(const nlohmann::json& json);
};

class NotificationService {
public:
    NotificationService(
        std::shared_ptr<Core::ConfigurationManager> config,
        std::shared_ptr<Database::DatabaseManager> dbManager
    );
    ~NotificationService();
    
    // Notification management
    std::string createNotification(const Notification& notification);
    bool markAsRead(const std::string& notificationId, const std::string& userId);
    bool markAllAsRead(const std::string& userId);
    bool deleteNotification(const std::string& notificationId, const std::string& userId);
    
    // Query methods
    std::vector<Notification> getUserNotifications(
        const std::string& userId, 
        bool unreadOnly = false,
        int limit = 20
    );
    
    // Push notification registration
    bool registerDevice(const std::string& userId, const std::string& deviceToken,
                      const std::string& platform);
    bool unregisterDevice(const std::string& deviceToken);
    
    // Send notifications
    bool sendPushNotification(const Notification& notification);
    bool sendEmailNotification(const Notification& notification);

private:
    std::shared_ptr<Core::ConfigurationManager> config_;
    std::shared_ptr<Database::DatabaseManager> dbManager_;
    
    // In-memory cache of pending notifications
    std::unordered_map<std::string, std::vector<Notification>> pendingNotifications_;
    std::mutex notificationMutex_;
    
    // Helper methods
    bool storeNotification(const Notification& notification);
    std::vector<std::string> getUserDeviceTokens(const std::string& userId);
};

} // namespace Collaboration

// /backend/collaboration/src/CollaborationService.cpp
#include "collaboration/CollaborationService.h"
#include <spdlog/spdlog.h>
#include <uuid/uuid.h>

namespace Collaboration {

CollaborationService::CollaborationService(
    std::shared_ptr<Core::ConfigurationManager> config,
    std::shared_ptr<User::UserManager> userManager,
    std::shared_ptr<Database::DatabaseManager> dbManager
) : config_(config), userManager_(userManager), dbManager_(dbManager) {
    // Initialize workspace manager
    workspaceManager_ = std::make_shared<WorkspaceManager>(dbManager_);
    
    // Initialize WebSocket handler
    wsHandler_ = std::make_shared<WebSocketHandler>(userManager_);
    
    // Initialize notification service
    notificationService_ = std::make_shared<NotificationService>(config_, dbManager_);
    
    // Register message handlers
    wsHandler_->registerMessageHandler("document_change", 
        [this](const std::string& userId, const std::string& workspaceId, const std::string& data) {
            // Process document change event
            spdlog::debug("Received document change from user {} in workspace {}", userId, workspaceId);
            
            // Parse the document change data
            auto jsonData = nlohmann::json::parse(data);
            std::string docId = jsonData["documentId"];
            DocumentChange change = DocumentChange::fromJson(jsonData["change"]);
            
            // Apply the change
            this->applyDocumentChange(docId, change);
            
            // Broadcast to other users in the workspace
            this->broadcastToWorkspace(workspaceId, "document_updated", data);
        }
    );
    
    wsHandler_->registerMessageHandler("message", 
        [this](const std::string& userId, const std::string& workspaceId, const std::string& data) {
            // Process new message event
            spdlog::debug("Received message from user {} in workspace {}", userId, workspaceId);
            
            // Parse message data
            auto jsonData = nlohmann::json::parse(data);
            std::string content = jsonData["content"];
            MessageType type = static_cast<MessageType>(jsonData["type"].get<int>());
            
            // Save the message
            MessageId msgId = this->sendMessage(workspaceId, userId, content, type);
            
            // Add message ID to response
            nlohmann::json response = jsonData;
            response["id"] = msgId;
            response["timestamp"] = std::chrono::system_clock::now().time_since_epoch().count();
            
            // Broadcast to workspace
            this->broadcastToWorkspace(workspaceId, "new_message", response.dump());
        }
    );
    
    spdlog::info("Collaboration service initialized");
}

CollaborationService::~CollaborationService() {
    spdlog::info("Collaboration service shutting down");
}

std::shared_ptr<Workspace> CollaborationService::createWorkspace(
    const std::string& name, const std::string& ownerId
) {
    // Validate user exists
    if (!userManager_->userExists(ownerId)) {
        spdlog::error("Cannot create workspace: user {} does not exist", ownerId);
        return nullptr;
    }
    
    // Create the workspace
    auto workspace = workspaceManager_->createWorkspace(name, ownerId);
    if (workspace) {
        spdlog::info("Created workspace {} with name {} for owner {}", 
                  workspace->getId(), name, ownerId);
    }
    
    return workspace;
}

std::shared_ptr<Workspace> CollaborationService::getWorkspace(const std::string& workspaceId) {
    return workspaceManager_->getWorkspace(workspaceId);
}

bool CollaborationService::deleteWorkspace(const std::string& workspaceId, const std::string& userId) {
    // Get the workspace
    auto workspace = workspaceManager_->getWorkspace(workspaceId);
    if (!workspace) {
        spdlog::error("Cannot delete workspace {}: not found", workspaceId);
        return false;
    }
    
    // Verify user is the owner
    if (workspace->getOwnerId() != userId) {
        spdlog::error("User {} is not authorized to delete workspace {}", userId, workspaceId);
        return false;
    }
    
    // Delete the workspace
    bool success = workspaceManager_->deleteWorkspace(workspaceId);
    if (success) {
        spdlog::info("Deleted workspace {} owned by {}", workspaceId, userId);
        
        // Notify all workspace users
        for (const auto& user : workspace->getUsers()) {
            if (user.userId != userId) {  // Don't notify the deleter
                Notification notification{
                    .targetUserId = user.userId,
                    .title = "Workspace Deleted",
                    .content = "The workspace '" + workspace->getName() + "' has been deleted.",
                    .type = NotificationType::SYSTEM,
                    .sourceId = workspaceId,
                    .timestamp = std::chrono::system_clock::now()
                };
                notificationService_->createNotification(notification);
            }
        }
    }
    
    return success;
}

std::vector<std::shared_ptr<Workspace>> CollaborationService::getUserWorkspaces(
    const std::string& userId
) {
    return workspaceManager_->getUserWorkspaces(userId);
}

bool CollaborationService::addUserToWorkspace(
    const std::string& workspaceId, const std::string& userId, WorkspaceRole role
) {
    // Validate user exists
    if (!userManager_->userExists(userId)) {
        spdlog::error("Cannot add user to workspace: user {} does not exist", userId);
        return false;
    }
    
    // Get the workspace
    auto workspace = workspaceManager_->getWorkspace(workspaceId);
    if (!workspace) {
        spdlog::error("Cannot add user to workspace {}: workspace not found", workspaceId);
        return false;
    }
    
    // Add the user
    bool success = workspace->addUser(userId, role);
    if (success) {
        // Update the workspace
        workspaceManager_->updateWorkspace(workspace);
        spdlog::info("Added user {} to workspace {} with role {}", 
                  userId, workspaceId, static_cast<int>(role));
        
        // Notify the user
        auto userName = userManager_->getUserName(userId);
        Notification notification{
            .targetUserId = userId,
            .title = "Workspace Invitation",
            .content = "You have been added to workspace '" + workspace->getName() + "'.",
            .type = NotificationType::WORKSPACE_INVITATION,
            .sourceId = workspaceId,
            .timestamp = std::chrono::system_clock::now()
        };
        notificationService_->createNotification(notification);
        
        // Broadcast to workspace users
        nlohmann::json data = {
            {"userId", userId},
            {"userName", userName},
            {"role", static_cast<int>(role)}
        };
        broadcastToWorkspace(workspaceId, "user_added", data.dump());
    }
    
    return success;
}

bool CollaborationService::removeUserFromWorkspace(
    const std::string& workspaceId, const std::string& userId
) {
    // Get the workspace
    auto workspace = workspaceManager_->getWorkspace(workspaceId);
    if (!workspace) {
        spdlog::error("Cannot remove user from workspace {}: workspace not found", workspaceId);
        return false;
    }
    
    // Remove the user
    bool success = workspace->removeUser(userId);
    if (success) {
        // Update the workspace
        workspaceManager_->updateWorkspace(workspace);
        spdlog::info("Removed user {} from workspace {}", userId, workspaceId);
        
        // Notify the user
        Notification notification{
            .targetUserId = userId,
            .title = "Workspace Removal",
            .content = "You have been removed from workspace '" + workspace->getName() + "'.",
            .type = NotificationType::SYSTEM,
            .sourceId = workspaceId,
            .timestamp = std::chrono::system_clock::now()
        };
        notificationService_->createNotification(notification);
        
        // Broadcast to workspace users
        nlohmann::json data = {
            {"userId", userId}
        };
        broadcastToWorkspace(workspaceId, "user_removed", data.dump());
    }
    
    return success;
}

bool CollaborationService::updateUserRole(
    const std::string& workspaceId, const std::string& userId, WorkspaceRole newRole
) {
    // Get the workspace
    auto workspace = workspaceManager_->getWorkspace(workspaceId);
    if (!workspace) {
        spdlog::error("Cannot update user role in workspace {}: workspace not found", workspaceId);
        return false;
    }
    
    // Update the role
    bool success = workspace->updateUserRole(userId, newRole);
    if (success) {
        // Update the workspace
        workspaceManager_->updateWorkspace(workspace);
        spdlog::info("Updated role for user {} in workspace {} to {}", 
                  userId, workspaceId, static_cast<int>(newRole));
        
        // Broadcast to workspace users
        nlohmann::json data = {
            {"userId", userId},
            {"role", static_cast<int>(newRole)}
        };
        broadcastToWorkspace(workspaceId, "user_role_updated", data.dump());
    }
    
    return success;
}

std::vector<WorkspaceUser> CollaborationService::getWorkspaceUsers(const std::string& workspaceId) {
    auto workspace = workspaceManager_->getWorkspace(workspaceId);
    if (!workspace) {
        spdlog::error("Cannot get users for workspace {}: workspace not found", workspaceId);
        return {};
    }
    
    return workspace->getUsers();
}

// ... Additional method implementations would follow ...

bool CollaborationService::validateUserAccess(
    const std::string& workspaceId, const std::string& userId, WorkspaceRole requiredRole
) {
    auto workspace = workspaceManager_->getWorkspace(workspaceId);
    if (!workspace) {
        return false;
    }
    
    auto userRole = workspace->getUserRole(userId);
    if (!userRole.has_value()) {
        return false;
    }
    
    return static_cast<int>(userRole.value()) >= static_cast<int>(requiredRole);
}

void CollaborationService::broadcastToWorkspace(
    const std::string& workspaceId, const std::string& event, const std::string& data
) {
    nlohmann::json message = {
        {"event", event},
        {"data", nlohmann::json::parse(data)}
    };
    
    wsHandler_->broadcastToWorkspace(workspaceId, message.dump());
}

} // namespace Collaboration

// /backend/collaboration/src/Message.cpp
#include "collaboration/Message.h"
#include <uuid/uuid.h>

namespace Collaboration {

Message::Message(
    const std::string& workspaceId,
    const std::string& senderId,
    const std::string& content,
    MessageType type
) : workspaceId_(workspaceId),
    senderId_(senderId),
    content_(content),
    type_(type),
    timestamp_(std::chrono::system_clock::now()) {
    
    // Generate unique ID
    uuid_t uuid;
    uuid_generate(uuid);
    char uuid_str[37];
    uuid_unparse_lower(uuid, uuid_str);
    id_ = uuid_str;
}

nlohmann::json Message::toJson() const {
    nlohmann::json json = {
        {"id", id_},
        {"workspaceId", workspaceId_},
        {"senderId", senderId_},
        {"content", content_},
        {"type", static_cast<int>(type_)},
        {"timestamp", timestamp_.time_since_epoch().count()}
    };
    
    if (attachment_.has_value()) {
        json["attachment"] = attachment_->toJson();
    }
    
    return json;
}

Message Message::fromJson(const nlohmann::json& json) {
    Message message(
        json["workspaceId"].get<std::string>(),
        json["senderId"].get<std::string>(),
        json["content"].get<std::string>(),
        static_cast<MessageType>(json["type"].get<int>())
    );
    
    message.id_ = json["id"].get<std::string>();
    message.timestamp_ = std::chrono::system_clock::time_point(
        std::chrono::milliseconds(json["timestamp"].get<int64_t>())
    );
    
    if (json.contains("attachment")) {
        message.attachment_ = MessageAttachment::fromJson(json["attachment"]);
    }
    
    return message;
}

nlohmann::json MessageAttachment::toJson() const {
    return {
        {"fileId", fileId},
        {"fileName", fileName},
        {"mimeType", mimeType},
        {"fileSize", fileSize}
    };
}

MessageAttachment MessageAttachment::fromJson(const nlohmann::json& json) {
    return {
        .fileId = json["fileId"].get<std::string>(),
        .fileName = json["fileName"].get<std::string>(),
        .mimeType = json["mimeType"].get<std::string>(),
        .fileSize = json["fileSize"].get<size_t>()
    };
}

} // namespace Collaboration

// /backend/collaboration/include/collaboration/CollaborationController.h
#pragma once

#include <drogon/HttpController.h>
#include <memory>
#include "collaboration/CollaborationService.h"

namespace Collaboration {

class CollaborationController : public drogon::HttpController<CollaborationController> {
public:
    CollaborationController(std::shared_ptr<CollaborationService> service);
    
    // Workspace management
    void createWorkspace(const drogon::HttpRequestPtr& req, 
                        std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void getWorkspace(const drogon::HttpRequestPtr& req,
                    std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void deleteWorkspace(const drogon::HttpRequestPtr& req,
                        std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void getUserWorkspaces(const drogon::HttpRequestPtr& req,
                         std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    // Workspace users
    void addUserToWorkspace(const drogon::HttpRequestPtr& req,
                           std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void removeUserFromWorkspace(const drogon::HttpRequestPtr& req,
                               std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void updateUserRole(const drogon::HttpRequestPtr& req,
                      std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void getWorkspaceUsers(const drogon::HttpRequestPtr& req,
                         std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    // Messaging
    void getMessages(const drogon::HttpRequestPtr& req,
                    std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    // Document collaboration
    void getDocumentChanges(const drogon::HttpRequestPtr& req,
                          std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void getVersionHistory(const drogon::HttpRequestPtr& req,
                         std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void revertToVersion(const drogon::HttpRequestPtr& req,
                        std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    // Notifications
    void getUserNotifications(const drogon::HttpRequestPtr& req,
                            std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void markNotificationAsRead(const drogon::HttpRequestPtr& req,
                              std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void markAllNotificationsAsRead(const drogon::HttpRequestPtr& req,
                                  std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void registerDeviceForNotifications(const drogon::HttpRequestPtr& req,
                                      std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    // Route registration
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(CollaborationController::createWorkspace, "/api/workspaces", drogon::Post);
    ADD_METHOD_TO(CollaborationController::getWorkspace, "/api/workspaces/{id}", drogon::Get);
    ADD_METHOD_TO(CollaborationController::deleteWorkspace, "/api/workspaces/{id}", drogon::Delete);
    ADD_METHOD_TO(CollaborationController::getUserWorkspaces, "/api/users/{id}/workspaces", drogon::Get);
    
    ADD_METHOD_TO(CollaborationController::addUserToWorkspace, "/api/workspaces/{id}/users", drogon::Post);
    ADD_METHOD_TO(CollaborationController::removeUserFromWorkspace, "/api/workspaces/{id}/users/{userId}", drogon::Delete);
    ADD_METHOD_TO(CollaborationController::updateUserRole, "/api/workspaces/{id}/users/{userId}/role", drogon::Put);
    ADD_METHOD_TO(CollaborationController::getWorkspaceUsers, "/api/workspaces/{id}/users", drogon::Get);
    
    ADD_METHOD_TO(CollaborationController::getMessages, "/api/workspaces/{id}/messages", drogon::Get);
    
    ADD_METHOD_TO(CollaborationController::getDocumentChanges, "/api/documents/{id}/changes", drogon::Get);
    ADD_METHOD_TO(CollaborationController::getVersionHistory, "/api/documents/{id}/versions", drogon::Get);
    ADD_METHOD_TO(CollaborationController::revertToVersion, "/api/documents/{id}/versions/{versionId}/revert", drogon::Post);
    
    ADD_METHOD_TO(CollaborationController::getUserNotifications, "/api/users/{id}/notifications", drogon::Get);
    ADD_METHOD_TO(CollaborationController::markNotificationAsRead, "/api/notifications/{id}/read", drogon::Put);
    ADD_METHOD_TO(CollaborationController::markAllNotificationsAsRead, "/api/users/{id}/notifications/read", drogon::Put);
    ADD_METHOD_TO(CollaborationController::registerDeviceForNotifications, "/api/users/{id}/devices", drogon::Post);
    METHOD_LIST_END

private:
    std::shared_ptr<CollaborationService> service_;
    
    // Helper methods
    std::string getUserIdFromRequest(const drogon::HttpRequestPtr& req);
    bool validateRequest(const drogon::HttpRequestPtr& req, std::string& userId);
    drogon::HttpResponsePtr createErrorResponse(int statusCode, const std::string& message);
    drogon::HttpResponsePtr createJsonResponse(int statusCode, const nlohmann::json& data);
};

} // namespace Collaboration

// /backend/collaboration/python/ai_chat_assistant.py
import os
import json
import datetime
import threading
import time
from typing import Dict, List, Optional, Tuple

import numpy as np
import tensorflow as tf
from transformers import AutoTokenizer, TFAutoModelForCausalLM

class ChatAssistant:
    """AI-powered chat assistant for collaborative flight training.
    
    This assistant helps instructors and trainees with:
    - Answering technical questions about aircraft and procedures
    - Providing context-aware suggestions during document editing
    - Summarizing conversations and generating action items
    - Facilitating knowledge sharing between trainees
    """
    
    def __init__(self, model_path: str = "flight_training_gpt"):
        """Initialize the chat assistant with the specified model.
        
        Args:
            model_path: Path to the fine-tuned model
        """
        self.tokenizer = AutoTokenizer.from_pretrained(model_path)
        self.model = TFAutoModelForCausalLM.from_pretrained(model_path)
        
        # Cache for workspace context
        self.workspace_contexts: Dict[str, Dict] = {}
        self.context_lock = threading.Lock()
        
        # Start context cleanup thread
        self.cleanup_thread = threading.Thread(target=self._periodic_cleanup, daemon=True)
        self.cleanup_thread.start()
    
    def process_message(self, workspace_id: str, user_id: str, 
                        message: str) -> Tuple[str, List[Dict]]:
        """Process a user message and generate a response.
        
        Args:
            workspace_id: ID of the workspace
            user_id: ID of the user sending the message
            message: Content of the message
            
        Returns:
            Tuple of (response_text, suggested_actions)
        """
        # Get or create workspace context
        context = self._get_workspace_context(workspace_id)
        
        # Add message to conversation history
        context["messages"].append({
            "user_id": user_id,
            "content": message,
            "timestamp": datetime.datetime.now().isoformat()
        })
        
        # Format conversation for the model
        prompt = self._format_conversation(context)
        
        # Generate response
        response = self._generate_response(prompt)
        
        # Extract suggested actions if any
        suggested_actions = self._extract_actions(response)
        
        # Clean response if needed
        cleaned_response = self._clean_response(response)
        
        # Add assistant's response to conversation history
        context["messages"].append({
            "user_id": "assistant",
            "content": cleaned_response,
            "timestamp": datetime.datetime.now().isoformat()
        })
        
        # Limit conversation history size
        if len(context["messages"]) > 100:
            context["messages"] = context["messages"][-100:]
        
        return cleaned_response, suggested_actions
    
    def update_workspace_context(self, workspace_id: str, 
                                documents: List[Dict], 
                                syllabus: Optional[Dict] = None):
        """Update the context for a workspace with relevant documents and syllabus.
        
        Args:
            workspace_id: ID of the workspace
            documents: List of documents in the workspace
            syllabus: Current syllabus if available
        """
        with self.context_lock:
            context = self._get_workspace_context(workspace_id)
            
            # Update document references
            context["documents"] = [{
                "id": doc["id"],
                "title": doc["title"],
                "summary": doc.get("summary", ""),
                "type": doc.get("type", "")
            } for doc in documents]
            
            # Update syllabus if provided
            if syllabus:
                context["syllabus"] = {
                    "id": syllabus["id"],
                    "title": syllabus["title"],
                    "modules": [m["title"] for m in syllabus.get("modules", [])]
                }
            
            # Update last activity timestamp
            context["last_activity"] = datetime.datetime.now().isoformat()
    
    def summarize_conversation(self, workspace_id: str, 
                              time_period: Optional[str] = "1d") -> Dict:
        """Generate a summary of recent conversation in the workspace.
        
        Args:
            workspace_id: ID of the workspace
            time_period: Time period to summarize (e.g., "1d" for 1 day)
            
        Returns:
            Dictionary with summary and extracted action items
        """
        # Get workspace context
        context = self._get_workspace_context(workspace_id)
        
        # Filter messages by time period
        cutoff = self._parse_time_period(time_period)
        recent_messages = [
            msg for msg in context["messages"] 
            if datetime.datetime.fromisoformat(msg["timestamp"]) >= cutoff
        ]
        
        if not recent_messages:
            return {
                "summary": "No recent conversations.",
                "action_items": []
            }
        
        # Format messages for summarization
        messages_text = "\n".join([
            f"{msg['user_id']}: {msg['content']}" for msg in recent_messages
        ])
        
        # Generate summary prompt
        prompt = f"""Please summarize the following conversation and extract action items:

{messages_text}

Summary:"""
        
        # Generate summary
        summary_text = self._generate_response(prompt, max_tokens=150)
        
        # Extract action items
        action_items_prompt = f"""Based on this conversation, list the specific action items:

{messages_text}

Action items:"""
        
        action_items_text = self._generate_response(action_items_prompt, max_tokens=150)
        action_items = [item.strip() for item in action_items_text.split('\n') if item.strip()]
        
        return {
            "summary": summary_text,
            "action_items": action_items
        }
    
    def _get_workspace_context(self, workspace_id: str) -> Dict:
        """Get or create context for a workspace."""
        with self.context_lock:
            if workspace_id not in self.workspace_contexts:
                self.workspace_contexts[workspace_id] = {
                    "messages": [],
                    "documents": [],
                    "syllabus": None,
                    "last_activity": datetime.datetime.now().isoformat()
                }
            return self.workspace_contexts[workspace_id]
    
    def _format_conversation(self, context: Dict) -> str:
        """Format the conversation context for the model."""
        # Add system context
        prompt = "You are an AI assistant for flight training. "
        
        # Add document context if available
        if context["documents"]:
            prompt += "Available documents:\n"
            for doc in context["documents"][:5]:  # Limit to 5 most relevant
                prompt += f"- {doc['title']} ({doc['type']})\n"
            prompt += "\n"
        
        # Add syllabus context if available
        if context["syllabus"]:
            prompt += f"Current syllabus: {context['syllabus']['title']}\n"
            if context["syllabus"].get("modules"):
                prompt += "Modules: " + ", ".join(context["syllabus"]["modules"][:5]) + "\n\n"
        
        # Add conversation history
        for msg in context["messages"][-10:]:  # Last 10 messages
            if msg["user_id"] == "assistant":
                prompt += f"Assistant: {msg['content']}\n"
            else:
                prompt += f"User: {msg['content']}\n"
        
        prompt += "Assistant:"
        return prompt
    
    def _generate_response(self, prompt: str, max_tokens: int = 250) -> str:
        """Generate a response using the model."""
        inputs = self.tokenizer(prompt, return_tensors="tf")
        
        # Generate response
        output = self.model.generate(
            inputs.input_ids,
            max_new_tokens=max_tokens,
            do_sample=True,
            temperature=0.7,
            top_p=0.9,
            pad_token_id=self.tokenizer.eos_token_id
        )
        
        # Decode response and extract assistant's output
        full_output = self.tokenizer.decode(output[0], skip_special_tokens=True)
        response = full_output[len(prompt):].strip()
        
        return response
    
    def _extract_actions(self, response: str) -> List[Dict]:
        """Extract suggested actions from the response."""
        actions = []
        
        # Look for action patterns like [ACTION: description]
        import re
        action_matches = re.findall(r'\[ACTION: ([^\]]+)\]', response)
        
        for match in action_matches:
            actions.append({
                "type": "suggested_action",
                "description": match
            })
        
        return actions
    
    def _clean_response(self, response: str) -> str:
        """Clean the response by removing action tags and other artifacts."""
        # Remove action tags
        import re
        cleaned = re.sub(r'\[ACTION: ([^\]]+)\]', '', response)
        
        return cleaned.strip()
    
    def _parse_time_period(self, period: str) -> datetime.datetime:
        """Parse a time period string like '1d' or '4h' and return cutoff datetime."""
        now = datetime.datetime.now()
        
        if not period:
            # Default to 1 day
            return now - datetime.timedelta(days=1)
        
        unit = period[-1].lower()
        try:
            amount = int(period[:-1])
        except ValueError:
            # Default to 1 day if invalid format
            return now - datetime.timedelta(days=1)
        
        if unit == 'd':
            return now - datetime.timedelta(days=amount)
        elif unit == 'h':
            return now - datetime.timedelta(hours=amount)
        elif unit == 'w':
            return now - datetime.timedelta(weeks=amount)
        else:
            # Default to 1 day for unknown units
            return now - datetime.timedelta(days=1)
    
    def _periodic_cleanup(self):
        """Periodically clean up old workspace contexts."""
        while True:
            time.sleep(3600)  # Run every hour
            
            with self.context_lock:
                now = datetime.datetime.now()
                to_remove = []
                
                for workspace_id, context in self.workspace_contexts.items():
                    last_activity = datetime.datetime.fromisoformat(context["last_activity"])
                    # Remove contexts inactive for more than 7 days
                    if (now - last_activity).days > 7:
                        to_remove.append(workspace_id)
                
                for workspace_id in to_remove:
                    del self.workspace_contexts[workspace_id]

# Example usage:
# assistant = ChatAssistant()
# response, actions = assistant.process_message("workspace1", "user1", "What's the procedure for engine failure during takeoff?")
