#include "communication/grpc_messaging_service.h"
#include "logging/logger.h"

#include <grpcpp/server_builder.h>
#include <grpcpp/create_channel.h>
#include <grpcpp/security/credentials.h>
#include <chrono>
#include <random>
#include <uuid.h>

namespace core_platform {
namespace communication {

// Local service discovery implementation
LocalServiceDiscovery& LocalServiceDiscovery::getInstance() {
    static LocalServiceDiscovery instance;
    return instance;
}

bool LocalServiceDiscovery::registerService(const std::string& service_name, const std::string& endpoint) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    // Check if endpoint already exists
    auto it = services_.find(service_name);
    if (it != services_.end()) {
        for (const auto& existing_endpoint : it->second) {
            if (existing_endpoint == endpoint) {
                logging::Logger::getInstance().debug("Service {} endpoint {} already registered", 
                    service_name, endpoint);
                return true;
            }
        }
    }
    
    // Add endpoint
    services_[service_name].push_back(endpoint);
    logging::Logger::getInstance().info("Registered service {} at {}", service_name, endpoint);
    return true;
}

bool LocalServiceDiscovery::unregisterService(const std::string& service_name, const std::string& endpoint) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    auto it = services_.find(service_name);
    if (it != services_.end()) {
        auto& endpoints = it->second;
        auto endpoint_it = std::find(endpoints.begin(), endpoints.end(), endpoint);
        
        if (endpoint_it != endpoints.end()) {
            endpoints.erase(endpoint_it);
            logging::Logger::getInstance().info("Unregistered service {} at {}", service_name, endpoint);
            
            // Remove service if no endpoints left
            if (endpoints.empty()) {
                services_.erase(it);
            }
            
            return true;
        }
    }
    
    logging::Logger::getInstance().warn("Service {} at {} not found for unregistration", 
        service_name, endpoint);
    return false;
}

std::string LocalServiceDiscovery::discoverService(const std::string& service_name) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    auto it = services_.find(service_name);
    if (it != services_.end() && !it->second.empty()) {
        // Simple load balancing - pick a random endpoint
        std::random_device rd;
        std::mt19937 gen(rd());
        std::uniform_int_distribution<size_t> dist(0, it->second.size() - 1);
        
        const std::string& endpoint = it->second[dist(gen)];
        logging::Logger::getInstance().debug("Discovered service {} at {}", service_name, endpoint);
        return endpoint;
    }
    
    logging::Logger::getInstance().warn("Service {} not found for discovery", service_name);
    return "";
}

std::vector<std::string> LocalServiceDiscovery::getAllServiceInstances(const std::string& service_name) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    auto it = services_.find(service_name);
    if (it != services_.end()) {
        return it->second;
    }
    
    return {};
}

// gRPC service implementation
class MessagingServiceImpl final : public MessagingService::Service {
public:
    explicit MessagingServiceImpl(GrpcMessagingService* service) : service_(service) {}
    
    grpc::Status SendMessage(
        grpc::ServerContext* context,
        const MessageRequest* request,
        MessageResponse* response
    ) override {
        logging::Logger::getInstance().debug("Received message from {}", request->sender());
        
        try {
            // Convert protobuf message to internal format
            Message message;
            message.id = request->id();
            message.sender = request->sender();
            message.target = request->target();
            message.type = request->type();
            message.payload = nlohmann::json::parse(request->payload());
            message.timestamp = std::chrono::system_clock::from_time_t(request->timestamp());
            
            // Handle message
            Message response_msg = service_->handleIncomingMessage(message);
            
            // Convert response to protobuf
            response->set_id(response_msg.id);
            response->set_sender(response_msg.sender);
            response->set_target(response_msg.target);
            response->set_type(response_msg.type);
            response->set_payload(response_msg.payload.dump());
            response->set_timestamp(
                std::chrono::system_clock::to_time_t(response_msg.timestamp)
            );
            response->set_success(true);
            
            return grpc::Status::OK;
        }
        catch (const std::exception& e) {
            logging::Logger::getInstance().error("Error handling message: {}", e.what());
            
            response->set_id(request->id());
            response->set_sender(service_->getServiceName());
            response->set_target(request->sender());
            response->set_type("error");
            response->set_success(false);
            response->set_error_message(e.what());
            
            return grpc::Status(grpc::StatusCode::INTERNAL, e.what());
        }
    }
    
    grpc::Status StreamMessages(
        grpc::ServerContext* context,
        grpc::ServerReaderWriter<MessageResponse, MessageRequest>* stream
    ) override {
        logging::Logger::getInstance().debug("Started message stream");
        
        MessageRequest request;
        while (stream->Read(&request)) {
            try {
                // Convert protobuf message to internal format
                Message message;
                message.id = request.id();
                message.sender = request.sender();
                message.target = request.target();
                message.type = request.type();
                message.payload = nlohmann::json::parse(request.payload());
                message.timestamp = std::chrono::system_clock::from_time_t(request.timestamp());
                
                // Handle message
                Message response_msg = service_->handleIncomingMessage(message);
                
                // Convert response to protobuf
                MessageResponse response;
                response.set_id(response_msg.id);
                response.set_sender(response_msg.sender);
                response.set_target(response_msg.target);
                response.set_type(response_msg.type);
                response.set_payload(response_msg.payload.dump());
                response.set_timestamp(
                    std::chrono::system_clock::to_time_t(response_msg.timestamp)
                );
                response.set_success(true);
                
                stream->Write(response);
            }
            catch (const std::exception& e) {
                logging::Logger::getInstance().error("Error handling streamed message: {}", e.what());
                
                MessageResponse response;
                response.set_id(request.id());
                response.set_sender(service_->getServiceName());
                response.set_target(request.sender());
                response.set_type("error");
                response.set_success(false);
                response.set_error_message(e.what());
                
                stream->Write(response);
            }
        }
        
        logging::Logger::getInstance().debug("Ended message stream");
        return grpc::Status::OK;
    }
    
private:
    GrpcMessagingService* service_;
};

// GrpcMessagingService implementation
GrpcMessagingService::GrpcMessagingService(
    const std::string& service_name,
    const std::string& host,
    int port,
    std::shared_ptr<IServiceDiscovery> discovery
) :
    service_name_(service_name),
    host_(host),
    port_(port),
    discovery_(std::move(discovery)),
    running_(false) {
    
    logging::Logger::getInstance().debug("Created GrpcMessagingService for {} at {}:{}", 
        service_name_, host_, port_);
}

GrpcMessagingService::~GrpcMessagingService() {
    stop();
}

bool GrpcMessagingService::start() {
    if (running_) {
        logging::Logger::getInstance().warn("GrpcMessagingService already running");
        return true;
    }
    
    try {
        // Start server in a new thread
        running_ = true;
        server_thread_ = std::thread(&GrpcMessagingService::runServer, this);
        
        // Register with service discovery
        std::string endpoint = host_ + ":" + std::to_string(port_);
        if (!discovery_->registerService(service_name_, endpoint)) {
            logging::Logger::getInstance().error("Failed to register service with discovery");
            stop();
            return false;
        }
        
        logging::Logger::getInstance().info("GrpcMessagingService started");
        return true;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Failed to start GrpcMessagingService: {}", e.what());
        running_ = false;
        return false;
    }
}

void GrpcMessagingService::stop() {
    if (!running_) {
        return;
    }
    
    logging::Logger::getInstance().info("Stopping GrpcMessagingService");
    
    // Unregister from service discovery
    std::string endpoint = host_ + ":" + std::to_string(port_);
    discovery_->unregisterService(service_name_, endpoint);
    
    // Stop gRPC server
    running_ = false;
    
    if (server_) {
        server_->Shutdown();
    }
    
    if (server_thread_.joinable()) {
        server_thread_.join();
    }
    
    // Clear all channels
    std::lock_guard<std::mutex> lock(channels_mutex_);
    channels_.clear();
    
    logging::Logger::getInstance().info("GrpcMessagingService stopped");
}

bool GrpcMessagingService::sendMessage(const Message& message) {
    if (!running_) {
        logging::Logger::getInstance().error("Cannot send message, service not running");
        return false;
    }
    
    try {
        // Get target service endpoint
        std::string target_endpoint = discovery_->discoverService(message.target);
        if (target_endpoint.empty()) {
            logging::Logger::getInstance().error("Target service {} not found", message.target);
            return false;
        }
        
        // Get or create channel
        auto channel = getChannel(message.target);
        
        // Create stub
        auto stub = MessagingService::NewStub(channel);
        
        // Create request
        MessageRequest request;
        request.set_id(message.id);
        request.set_sender(service_name_);
        request.set_target(message.target);
        request.set_type(message.type);
        request.set_payload(message.payload.dump());
        request.set_timestamp(
            std::chrono::system_clock::to_time_t(message.timestamp)
        );
        
        // Send message
        MessageResponse response;
        grpc::ClientContext context;
        
        // Set timeout
        context.set_deadline(
            std::chrono::system_clock::now() + std::chrono::seconds(5)
        );
        
        grpc::Status status = stub->SendMessage(&context, request, &response);
        
        if (!status.ok()) {
            logging::Logger::getInstance().error("Failed to send message to {}: {} ({})", 
                message.target, status.error_message(), status.error_code());
            return false;
        }
        
        logging::Logger::getInstance().debug("Message sent to {}: {}", message.target, message.id);
        return true;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error sending message: {}", e.what());
        return false;
    }
}

std::optional<Message> GrpcMessagingService::sendMessageWithResponse(
    const Message& message, 
    int timeout_ms
) {
    if (!running_) {
        logging::Logger::getInstance().error("Cannot send message, service not running");
        return std::nullopt;
    }
    
    try {
        // Generate a unique ID for this request if not set
        std::string message_id = message.id;
        if (message_id.empty()) {
            uuids::uuid uuid = uuids::uuid_system_generator{}();
            message_id = uuids::to_string(uuid);
        }
        
        // Create a promise for the response
        std::promise<Message> response_promise;
        auto response_future = response_promise.get_future();
        
        {
            std::lock_guard<std::mutex> lock(pending_mutex_);
            pending_responses_[message_id] = std::move(response_promise);
        }
        
        // Create message with response handler
        Message request_msg = message;
        request_msg.id = message_id;
        
        // Send the message
        if (!sendMessage(request_msg)) {
            // Remove pending response on failure
            std::lock_guard<std::mutex> lock(pending_mutex_);
            pending_responses_.erase(message_id);
            return std::nullopt;
        }
        
        // Wait for response with timeout
        auto status = response_future.wait_for(std::chrono::milliseconds(timeout_ms));
        
        if (status != std::future_status::ready) {
            // Timeout occurred
            std::lock_guard<std::mutex> lock(pending_mutex_);
            pending_responses_.erase(message_id);
            logging::Logger::getInstance().warn("Timeout waiting for response to message {}", message_id);
            return std::nullopt;
        }
        
        // Get response
        Message response = response_future.get();
        
        logging::Logger::getInstance().debug("Received response to message {}", message_id);
        return response;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error in sendMessageWithResponse: {}", e.what());
        return std::nullopt;
    }
}

void GrpcMessagingService::registerHandler(const std::string& message_type, MessageHandler handler) {
    std::lock_guard<std::mutex> lock(handlers_mutex_);
    handlers_[message_type] = std::move(handler);
    logging::Logger::getInstance().debug("Registered handler for message type: {}", message_type);
}

void GrpcMessagingService::unregisterHandler(const std::string& message_type) {
    std::lock_guard<std::mutex> lock(handlers_mutex_);
    handlers_.erase(message_type);
    logging::Logger::getInstance().debug("Unregistered handler for message type: {}", message_type);
}

Message GrpcMessagingService::handleIncomingMessage(const Message& message) {
    logging::Logger::getInstance().debug("Handling message {} of type {}", message.id, message.type);
    
    // Check if this is a response to a pending request
    if (message.type == "response") {
        std::lock_guard<std::mutex> lock(pending_mutex_);
        
        auto it = pending_responses_.find(message.id);
        if (it != pending_responses_.end()) {
            // Set the response value
            it->second.set_value(message);
            pending_responses_.erase(it);
            
            // Create acknowledgment response
            Message ack;
            ack.id = message.id;
            ack.sender = service_name_;
            ack.target = message.sender;
            ack.type = "ack";
            ack.payload = {{"status", "acknowledged"}};
            ack.timestamp = std::chrono::system_clock::now();
            
            return ack;
        }
    }
    
    // Find handler for message type
    MessageHandler handler;
    {
        std::lock_guard<std::mutex> lock(handlers_mutex_);
        auto it = handlers_.find(message.type);
        if (it != handlers_.end()) {
            handler = it->second;
        }
    }
    
    // Process message with handler
    if (handler) {
        try {
            handler(message);
            
            // Create success response
            Message response;
            response.id = message.id;
            response.sender = service_name_;
            response.target = message.sender;
            response.type = "response";
            response.payload = {{"status", "success"}};
            response.timestamp = std::chrono::system_clock::now();
            
            return response;
        }
        catch (const std::exception& e) {
            logging::Logger::getInstance().error("Error in message handler: {}", e.what());
            
            // Create error response
            Message response;
            response.id = message.id;
            response.sender = service_name_;
            response.target = message.sender;
            response.type = "error";
            response.payload = {
                {"status", "error"},
                {"error", e.what()}
            };
            response.timestamp = std::chrono::system_clock::now();
            
            return response;
        }
    }
    else {
        logging::Logger::getInstance().warn("No handler for message type: {}", message.type);
        
        // Create error response for unknown message type
        Message response;
        response.id = message.id;
        response.sender = service_name_;
        response.target = message.sender;
        response.type = "error";
        response.payload = {
            {"status", "error"},
            {"error", "No handler for message type: " + message.type}
        };
        response.timestamp = std::chrono::system_clock::now();
        
        return response;
    }
}

void GrpcMessagingService::runServer() {
    std::string server_address = host_ + ":" + std::to_string(port_);
    
    MessagingServiceImpl service(this);
    
    grpc::ServerBuilder builder;
    builder.AddListeningPort(server_address, grpc::InsecureServerCredentials());
    builder.RegisterService(&service);
    
    server_ = builder.BuildAndStart();
    logging::Logger::getInstance().info("Server listening on {}", server_address);
    
    server_->Wait();
    
    logging::Logger::getInstance().info("Server shutdown");
}

std::shared_ptr<grpc::Channel> GrpcMessagingService::getChannel(const std::string& service_name) {
    std::lock_guard<std::mutex> lock(channels_mutex_);
    
    auto it = channels_.find(service_name);
    if (it != channels_.end()) {
        return it->second;
    }
    
    // Get endpoint from service discovery
    std::string endpoint = discovery_->discoverService(service_name);
    if (endpoint.empty()) {
        throw std::runtime_error("Service not found: " + service_name);
    }
    
    // Create new channel
    auto channel = grpc::CreateChannel(endpoint, grpc::InsecureChannelCredentials());
    channels_[service_name] = channel;
    
    return channel;
}

std::string GrpcMessagingService::getServiceName() const {
    return service_name_;
}

} // namespace communication
} // namespace core_platform