#include "logging/logger.h"
#include <algorithm>
#include <cctype>
#include <iostream>
#include <filesystem>
#include <spdlog/async.h>
#include <spdlog/sinks/daily_file_sink.h>
#include <spdlog/sinks/syslog_sink.h>

namespace core_platform {
namespace logging {

LogLevel logLevelFromString(const std::string& level) {
    std::string level_lower = level;
    std::transform(level_lower.begin(), level_lower.end(), level_lower.begin(),
                   [](unsigned char c) { return std::tolower(c); });
    
    if (level_lower == "trace") return LogLevel::TRACE;
    if (level_lower == "debug") return LogLevel::DEBUG;
    if (level_lower == "info") return LogLevel::INFO;
    if (level_lower == "warn" || level_lower == "warning") return LogLevel::WARN;
    if (level_lower == "error" || level_lower == "err") return LogLevel::ERROR;
    if (level_lower == "critical" || level_lower == "fatal") return LogLevel::CRITICAL;
    if (level_lower == "off") return LogLevel::OFF;
    
    // Default to INFO if not recognized
    return LogLevel::INFO;
}

std::string logLevelToString(LogLevel level) {
    switch (level) {
        case LogLevel::TRACE: return "trace";
        case LogLevel::DEBUG: return "debug";
        case LogLevel::INFO: return "info";
        case LogLevel::WARN: return "warn";
        case LogLevel::ERROR: return "error";
        case LogLevel::CRITICAL: return "critical";
        case LogLevel::OFF: return "off";
        default: return "unknown";
    }
}

Logger::Logger() : initialized_(false) {
    // Create a default console logger until properly initialized
    logger_ = spdlog::stdout_color_mt("core_platform");
    logger_->set_level(spdlog::level::info);
}

Logger& Logger::getInstance() {
    static Logger instance;
    return instance;
}

void Logger::initialize(
    const std::string& service_name,
    LogLevel log_level,
    const std::string& log_path,
    size_t max_file_size,
    size_t max_files
) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    if (initialized_) {
        logger_->warn("Logger already initialized, skipping re-initialization");
        return;
    }
    
    try {
        // Register the async logger with a thread pool of 8 threads and a queue size of 8192
        spdlog::init_thread_pool(8192, 8);
        
        std::vector<spdlog::sink_ptr> sinks;
        
        // Always add console output sink
        auto console_sink = std::make_shared<spdlog::sinks::stdout_color_sink_mt>();
        console_sink->set_level(static_cast<spdlog::level::level_enum>(log_level));
        sinks.push_back(console_sink);
        
        // Add file sink if path provided
        if (!log_path.empty()) {
            std::filesystem::path log_dir = std::filesystem::path(log_path).parent_path();
            
            // Create log directory if it doesn't exist
            if (!log_dir.empty() && !std::filesystem::exists(log_dir)) {
                std::filesystem::create_directories(log_dir);
            }
            
            auto file_sink = std::make_shared<spdlog::sinks::rotating_file_sink_mt>(
                log_path, max_file_size, max_files);
            file_sink->set_level(static_cast<spdlog::level::level_enum>(log_level));
            sinks.push_back(file_sink);
        }
        
        // Create an async logger with multiple sinks
        logger_ = std::make_shared<spdlog::async_logger>(
            service_name, sinks.begin(), sinks.end(),
            spdlog::thread_pool(), spdlog::async_overflow_policy::block);
        
        // Set log pattern with timestamp, service name, and thread ID
        logger_->set_pattern("%Y-%m-%d %H:%M:%S.%e [%n] [%t] [%l] %v");
        
        // Set log level
        logger_->set_level(static_cast<spdlog::level::level_enum>(log_level));
        
        // Register the logger in the registry
        spdlog::register_logger(logger_);
        
        // Set as default logger
        spdlog::set_default_logger(logger_);
        
        initialized_ = true;
        
        logger_->info("Logger initialized for service: {}", service_name);
    }
    catch (const std::exception& ex) {
        std::cerr << "Logger initialization failed: " << ex.what() << std::endl;
        
        // Fallback to console logger
        logger_ = spdlog::stdout_color_mt(service_name);
        logger_->set_level(static_cast<spdlog::level::level_enum>(log_level));
        logger_->error("Failed to initialize logger with file sink: {}", ex.what());
    }
}

void Logger::setLevel(LogLevel level) {
    std::lock_guard<std::mutex> lock(mutex_);
    logger_->set_level(static_cast<spdlog::level::level_enum>(level));
    logger_->info("Log level set to: {}", logLevelToString(level));
}

LogLevel Logger::getLevel() const {
    return static_cast<LogLevel>(logger_->level());
}

void Logger::flush() {
    logger_->flush();
}

} // namespace logging
} // namespace core_platform