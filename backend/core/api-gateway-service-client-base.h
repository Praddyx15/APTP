#pragma once

#include <string>
#include <memory>
#include <grpcpp/grpcpp.h>
#include <nlohmann/json.hpp>
#include "logging/logger.h"
#include "metrics/metrics.h"

namespace api_gateway {
namespace services {

/**
 * @brief Base class for service clients
 */
class ServiceClientBase {
public:
    /**
     * @brief Constructor
     * @param service_name Name of the service
     * @param endpoint Service endpoint (host:port)
     * @param logger Logger instance
     * @param metrics Metrics instance
     */
    ServiceClientBase(
        const std::string& service_name,
        const std::string& endpoint,
        std::shared_ptr<logging::Logger> logger,
        std::shared_ptr<metrics::RequestMetrics> metrics
    );
    
    /**
     * @brief Destructor
     */
    virtual ~ServiceClientBase();
    
    /**
     * @brief Get service name
     * @return Service name
     */
    const std::string& getServiceName() const;
    
    /**
     * @brief Get service endpoint
     * @return Service endpoint
     */
    const std::string& getEndpoint() const;
    
    /**
     * @brief Check if service is available
     * @return True if service is available
     */
    virtual bool isAvailable() const;
    
    /**
     * @brief Check service health
     * @return True if service is healthy
     */
    virtual bool checkHealth();
    
    /**
     * @brief Create gRPC channel with deadline
     * @param deadline_ms Deadline in milliseconds
     * @return gRPC channel with deadline
     */
    std::shared_ptr<grpc::Channel> createChannel(int deadline_ms = 5000) const;
    
    /**
     * @brief Create gRPC context with token
     * @param token JWT token
     * @param deadline_ms Deadline in milliseconds
     * @return gRPC client context
     */
    std::unique_ptr<grpc::ClientContext> createContext(
        const std::string& token = "",
        int deadline_ms = 5000
    ) const;
    
    /**
     * @brief Handle gRPC error
     * @param status gRPC status
     * @param method Method name
     * @return Error message or empty string if no error
     */
    std::string handleGrpcError(
        const grpc::Status& status,
        const std::string& method
    ) const;
    
    /**
     * @brief Record request metrics
     * @param method Method name
     * @param success Whether request was successful
     * @param duration_ms Duration in milliseconds
     */
    void recordMetrics(
        const std::string& method,
        bool success,
        int duration_ms
    ) const;
    
protected:
    std::string service_name_;
    std::string endpoint_;
    std::shared_ptr<logging::Logger> logger_;
    std::shared_ptr<metrics::RequestMetrics> metrics_;
    std::shared_ptr<grpc::Channel> channel_;
    bool available_;
};

} // namespace services
} // namespace api_gateway