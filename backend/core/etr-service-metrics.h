#pragma once

#include <string>
#include <memory>
#include <unordered_map>
#include <mutex>
#include <vector>
#include <thread>
#include <atomic>
#include <prometheus/counter.h>
#include <prometheus/gauge.h>
#include <prometheus/histogram.h>
#include <prometheus/registry.h>
#include <prometheus/exposer.h>
#include <prometheus/push_gateway.h>

#include "logging/logger.h"

namespace etr {
namespace metrics {

/**
 * @brief Metrics service for collecting and exposing metrics
 */
class MetricsService {
public:
    /**
     * @brief Get the singleton instance
     * @return MetricsService singleton
     */
    static MetricsService& getInstance();
    
    /**
     * @brief Initialize the metrics service
     * @param service_name Service name for metrics namespace
     * @param expose_http Enable HTTP exposition on given address:port
     * @param http_address Address to expose metrics on
     * @param http_port Port to expose metrics on
     * @param push_gateway Enable push gateway publishing
     * @param push_address Push gateway address
     * @param push_port Push gateway port
     * @param push_interval_sec Push interval in seconds
     */
    void initialize(
        const std::string& service_name,
        bool expose_http = true,
        const std::string& http_address = "0.0.0.0",
        int http_port = 9103,
        bool push_gateway = false,
        const std::string& push_address = "localhost",
        int push_port = 9091,
        int push_interval_sec = 15
    );
    
    /**
     * @brief Create or get a counter
     * @param name Counter name
     * @param help Counter help text
     * @param labels Counter labels
     * @return Counter reference
     */
    prometheus::Counter& createCounter(
        const std::string& name,
        const std::string& help,
        const std::map<std::string, std::string>& labels = {}
    );
    
    /**
     * @brief Create or get a gauge
     * @param name Gauge name
     * @param help Gauge help text
     * @param labels Gauge labels
     * @return Gauge reference
     */
    prometheus::Gauge& createGauge(
        const std::string& name,
        const std::string& help,
        const std::map<std::string, std::string>& labels = {}
    );
    
    /**
     * @brief Create or get a histogram
     * @param name Histogram name
     * @param help Histogram help text
     * @param labels Histogram labels
     * @param buckets Histogram buckets
     * @return Histogram reference
     */
    prometheus::Histogram& createHistogram(
        const std::string& name,
        const std::string& help,
        const std::map<std::string, std::string>& labels = {},
        const std::vector<double>& buckets = prometheus::Histogram::ExponentialBuckets(0.005, 2, 10)
    );
    
    /**
     * @brief Push metrics to push gateway
     * Called automatically by timer if push gateway is enabled
     */
    void pushMetrics();
    
    /**
     * @brief Start HTTP exposition server
     * Called automatically by initialize if expose_http is true
     */
    void startHttpServer();
    
    /**
     * @brief Stop HTTP exposition server and push timer
     */
    void shutdown();

private:
    MetricsService();
    ~MetricsService();
    
    MetricsService(const MetricsService&) = delete;
    MetricsService& operator=(const MetricsService&) = delete;
    
    std::shared_ptr<prometheus::Registry> registry_;
    std::string service_name_;
    
    // HTTP exposition
    bool expose_http_;
    std::string http_address_;
    int http_port_;
    std::unique_ptr<prometheus::Exposer> exposer_;
    
    // Push gateway
    bool push_gateway_;
    std::string push_address_;
    int push_port_;
    int push_interval_sec_;
    std::unique_ptr<prometheus::PushGateway> push_gateway_client_;
    
    // Push timer
    std::thread push_thread_;
    std::atomic<bool> running_;
    
    // Families cache
    std::unordered_map<std::string, prometheus::Family<prometheus::Counter>*> counter_families_;
    std::unordered_map<std::string, prometheus::Family<prometheus::Gauge>*> gauge_families_;
    std::unordered_map<std::string, prometheus::Family<prometheus::Histogram>*> histogram_families_;
    
    std::mutex mutex_;
};

/**
 * @brief Utility class for timing operations and recording metrics
 */
class ScopedTimer {
public:
    /**
     * @brief Constructor
     * @param histogram Histogram to record duration
     */
    explicit ScopedTimer(prometheus::Histogram& histogram);
    
    /**
     * @brief Destructor - records elapsed time
     */
    ~ScopedTimer();
    
private:
    prometheus::Histogram& histogram_;
    std::chrono::steady_clock::time_point start_time_;
};

} // namespace metrics
} // namespace etr