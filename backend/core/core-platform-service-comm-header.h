#pragma once

#include <string>
#include <memory>
#include <functional>
#include <unordered_map>
#include <thread>
#include <mutex>
#include <condition_variable>
#include <future>
#include <queue>
#include <chrono>

#include <grpcpp/grpcpp.h>
#include <nlohmann/json.hpp>

namespace core_platform {
namespace communication {

/**
 * @brief Service discovery interface
 */
class IServiceDiscovery {
public:
    virtual ~IServiceDiscovery() = default;
    
    /**
     * @brief Register a service
     * @param service_name Service name
     * @param endpoint Service endpoint (host:port)
     * @return True if registration was successful
     */
    virtual bool registerService(const std::string& service_name, const std::string& endpoint) = 0;
    
    /**
     * @brief Unregister a service
     * @param service_name Service name
     * @param endpoint Service endpoint (host:port)
     * @return True if unregistration was successful
     */
    virtual bool unregisterService(const std::string& service_name, const std::string& endpoint) = 0;
    
    /**
     * @brief Discover a service
     * @param service_name Service name
     * @return Service endpoint or empty string if not found
     */
    virtual std::string discoverService(const std::string& service_name) = 0;
    
    /**
     * @brief Get all instances of a service
     * @param service_name Service name
     * @return Vector of service endpoints
     */
    virtual std::vector<std::string> getAllServiceInstances(const std::string& service_name) = 0;
};

/**
 * @brief Simple in-memory service discovery implementation
 */
class LocalServiceDiscovery : public IServiceDiscovery {
public:
    /**
     * @brief Get the singleton instance
     * @return LocalServiceDiscovery singleton
     */
    static LocalServiceDiscovery& getInstance();
    
    bool registerService(const std::string& service_name, const std::string& endpoint) override;
    bool unregisterService(const std::string& service_name, const std::string& endpoint) override;
    std::string discoverService(const std::string& service_name) override;
    std::vector<std::string> getAllServiceInstances(const std::string& service_name) override;

private:
    LocalServiceDiscovery() = default;
    ~LocalServiceDiscovery() = default;
    
    LocalServiceDiscovery(const LocalServiceDiscovery&) = delete;
    LocalServiceDiscovery& operator=(const LocalServiceDiscovery&) = delete;
    
    std::unordered_map<std::string, std::vector<std::string>> services_;
    std::mutex mutex_;
};

/**
 * @brief Message structure for inter-service communication
 */
struct Message {
    std::string id;
    std::string sender;
    std::string target;
    std::string type;
    nlohmann::json payload;
    std::chrono::system_clock::time_point timestamp;
    
    Message() : timestamp(std::chrono::system_clock::now()) {}
};

/**
 * @brief Message handler callback type
 */
using MessageHandler = std::function<void(const Message&)>;

/**
 * @brief Inter-service communication interface
 */
class IMessagingService {
public:
    virtual ~IMessagingService() = default;
    
    /**
     * @brief Start the messaging service
     * @return True if started successfully
     */
    virtual bool start() = 0;
    
    /**
     * @brief Stop the messaging service
     */
    virtual void stop() = 0;
    
    /**
     * @brief Send a message to a service
     * @param message Message to send
     * @return True if the message was sent successfully
     */
    virtual bool sendMessage(const Message& message) = 0;
    
    /**
     * @brief Send a message and wait for a response
     * @param message Message to send
     * @param timeout_ms Timeout in milliseconds
     * @return Response message or nullopt if timed out
     */
    virtual std::optional<Message> sendMessageWithResponse(
        const Message& message, 
        int timeout_ms = 5000
    ) = 0;
    
    /**
     * @brief Register a message handler
     * @param message_type Message type to handle
     * @param handler Handler function
     */
    virtual void registerHandler(const std::string& message_type, MessageHandler handler) = 0;
    
    /**
     * @brief Unregister a message handler
     * @param message_type Message type to unregister
     */
    virtual void unregisterHandler(const std::string& message_type) = 0;
};

/**
 * @brief gRPC-based messaging service implementation
 */
class GrpcMessagingService : public IMessagingService {
public:
    /**
     * @brief Constructor
     * @param service_name This service's name
     * @param host Host to bind to
     * @param port Port to bind to
     * @param discovery Service discovery implementation
     */
    GrpcMessagingService(
        const std::string& service_name,
        const std::string& host,
        int port,
        std::shared_ptr<IServiceDiscovery> discovery
    );
    
    ~GrpcMessagingService() override;
    
    bool start() override;
    void stop() override;
    bool sendMessage(const Message& message) override;
    std::optional<Message> sendMessageWithResponse(const Message& message, int timeout_ms = 5000) override;
    void registerHandler(const std::string& message_type, MessageHandler handler) override;
    void unregisterHandler(const std::string& message_type) override;

private:
    /**
     * @brief Handle an incoming message
     * @param message Received message
     * @return Response message
     */
    Message handleIncomingMessage(const Message& message);
    
    /**
     * @brief Run the server in a separate thread
     */
    void runServer();
    
    /**
     * @brief Get or create a client channel to a service
     * @param service_name Target service name
     * @return gRPC channel
     */
    std::shared_ptr<grpc::Channel> getChannel(const std::string& service_name);
    
    std::string service_name_;
    std::string host_;
    int port_;
    std::shared_ptr<IServiceDiscovery> discovery_;
    std::unique_ptr<grpc::Server> server_;
    std::thread server_thread_;
    std::atomic<bool> running_;
    
    std::unordered_map<std::string, MessageHandler> handlers_;
    std::mutex handlers_mutex_;
    
    std::unordered_map<std::string, std::shared_ptr<grpc::Channel>> channels_;
    std::mutex channels_mutex_;
    
    // For request-response pattern
    std::unordered_map<std::string, std::promise<Message>> pending_responses_;
    std::mutex pending_mutex_;
};

} // namespace communication
} // namespace core_platform