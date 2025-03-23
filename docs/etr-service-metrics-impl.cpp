#include "metrics/metrics_service.h"
#include <thread>
#include <chrono>

namespace etr {
namespace metrics {

MetricsService::MetricsService()
    : registry_(std::make_shared<prometheus::Registry>()),
      expose_http_(false),
      http_port_(9103),
      push_gateway_(false),
      push_port_(9091),
      push_interval_sec_(15),
      running_(false) {
}

MetricsService::~MetricsService() {
    shutdown();
}

MetricsService& MetricsService::getInstance() {
    static MetricsService instance;
    return instance;
}

void MetricsService::initialize(
    const std::string& service_name,
    bool expose_http,
    const std::string& http_address,
    int http_port,
    bool push_gateway,
    const std::string& push_address,
    int push_port,
    int push_interval_sec
) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    service_name_ = service_name;
    expose_http_ = expose_http;
    http_address_ = http_address;
    http_port_ = http_port;
    push_gateway_ = push_gateway;
    push_address_ = push_address;
    push_port_ = push_port;
    push_interval_sec_ = push_interval_sec;
    
    // Start HTTP exposition server if enabled
    if (expose_http_) {
        startHttpServer();
    }
    
    // Setup push gateway client if enabled
    if (push_gateway_) {
        std::string push_gateway_url = push_address_ + ":" + std::to_string(push_port_);
        push_gateway_client_ = std::make_unique<prometheus::PushGateway>(push_gateway_url);
        
        // Start push thread
        running_ = true;
        push_thread_ = std::thread([this]() {
            while (running_) {
                try {
                    pushMetrics();
                } 
                catch (const std::exception& e) {
                    logging::Logger::getInstance().error("Error pushing metrics: {}", e.what());
                }
                
                // Sleep for push interval
                for (int i = 0; i < push_interval_sec_ && running_; ++i) {
                    std::this_thread::sleep_for(std::chrono::seconds(1));
                }
            }
        });
    }
    
    logging::Logger::getInstance().info("MetricsService initialized for service: {}", service_name_);
}

prometheus::Counter& MetricsService::createCounter(
    const std::string& name,
    const std::string& help,
    const std::map<std::string, std::string>& labels
) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    // Check if family exists
    auto family_it = counter_families_.find(name);
    if (family_it == counter_families_.end()) {
        // Create new family
        auto& family = prometheus::BuildCounter()
            .Name(name)
            .Help(help)
            .Register(*registry_);
        
        counter_families_[name] = &family;
        family_it = counter_families_.find(name);
        
        logging::Logger::getInstance().debug("Created counter family: {}", name);
    }
    
    // Create or get counter with labels
    return family_it->second->Add(labels);
}

prometheus::Gauge& MetricsService::createGauge(
    const std::string& name,
    const std::string& help,
    const std::map<std::string, std::string>& labels
) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    // Check if family exists
    auto family_it = gauge_families_.find(name);
    if (family_it == gauge_families_.end()) {
        // Create new family
        auto& family = prometheus::BuildGauge()
            .Name(name)
            .Help(help)
            .Register(*registry_);
        
        gauge_families_[name] = &family;
        family_it = gauge_families_.find(name);
        
        logging::Logger::getInstance().debug("Created gauge family: {}", name);
    }
    
    // Create or get gauge with labels
    return family_it->second->Add(labels);
}

prometheus::Histogram& MetricsService::createHistogram(
    const std::string& name,
    const std::string& help,
    const std::map<std::string, std::string>& labels,
    const std::vector<double>& buckets
) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    // Check if family exists
    auto family_it = histogram_families_.find(name);
    if (family_it == histogram_families_.end()) {
        // Create new family
        auto& family = prometheus::BuildHistogram()
            .Name(name)
            .Help(help)
            .Buckets(buckets)
            .Register(*registry_);
        
        histogram_families_[name] = &family;
        family_it = histogram_families_.find(name);
        
        logging::Logger::getInstance().debug("Created histogram family: {}", name);
    }
    
    // Create or get histogram with labels
    return family_it->second->Add(labels);
}

void MetricsService::pushMetrics() {
    if (!push_gateway_ || !push_gateway_client_) {
        return;
    }
    
    try {
        push_gateway_client_->Push(registry_, service_name_, {{"instance", service_name_}});
        logging::Logger::getInstance().debug("Pushed metrics to push gateway");
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Failed to push metrics: {}", e.what());
    }
}

void MetricsService::startHttpServer() {
    if (!expose_http_) {
        return;
    }
    
    try {
        std::string endpoint = http_address_ + ":" + std::to_string(http_port_);
        exposer_ = std::make_unique<prometheus::Exposer>(endpoint);
        exposer_->RegisterCollectable(registry_);
        
        logging::Logger::getInstance().info("Started metrics HTTP server on {}", endpoint);
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Failed to start metrics HTTP server: {}", e.what());
        expose_http_ = false;
    }
}

void MetricsService::shutdown() {
    // Stop push thread
    if (push_thread_.joinable()) {
        running_ = false;
        push_thread_.join();
    }
    
    // Clean up resources
    exposer_.reset();
    push_gateway_client_.reset();
    
    logging::Logger::getInstance().info("MetricsService shut down");
}

// ScopedTimer implementation

ScopedTimer::ScopedTimer(prometheus::Histogram& histogram)
    : histogram_(histogram), start_time_(std::chrono::steady_clock::now()) {
}

ScopedTimer::~ScopedTimer() {
    auto end_time = std::chrono::steady_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::seconds>(end_time - start_time_).count();
    histogram_.Observe(duration);
}

} // namespace metrics
} // namespace etr