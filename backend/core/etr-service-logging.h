#pragma once

#include <string>
#include <memory>
#include <mutex>
#include <spdlog/spdlog.h>
#include <spdlog/sinks/rotating_file_sink.h>
#include <spdlog/sinks/stdout_color_sinks.h>

namespace etr {
namespace logging {

/**
 * @brief Log level enumeration
 */
enum class LogLevel {
    TRACE = spdlog::level::trace,
    DEBUG = spdlog::level::debug,
    INFO = spdlog::level::info,
    WARN = spdlog::level::warn,
    ERROR = spdlog::level::err,
    CRITICAL = spdlog::level::critical,
    OFF = spdlog::level::off
};

/**
 * @brief Convert string to log level
 * @param level Level string (case-insensitive)
 * @return LogLevel value
 */
LogLevel logLevelFromString(const std::string& level);

/**
 * @brief Convert log level to string
 * @param level LogLevel value
 * @return Level string
 */
std::string logLevelToString(LogLevel level);

/**
 * @brief Logging service
 */
class Logger {
public:
    /**
     * @brief Get the singleton logger instance
     * @return Logger instance
     */
    static Logger& getInstance();
    
    /**
     * @brief Initialize the logger
     * @param service_name Service name for log identification
     * @param log_level Default log level
     * @param log_path Path to log file (empty for console only)
     * @param max_file_size Maximum log file size in bytes
     * @param max_files Maximum number of log files for rotation
     * @param console_logging Whether to log to console
     */
    void initialize(
        const std::string& service_name,
        LogLevel log_level = LogLevel::INFO,
        const std::string& log_path = "",
        size_t max_file_size = 10 * 1024 * 1024,
        size_t max_files = 5,
        bool console_logging = true
    );
    
    /**
     * @brief Set the log level
     * @param level New log level
     */
    void setLevel(LogLevel level);
    
    /**
     * @brief Get the current log level
     * @return Current log level
     */
    LogLevel getLevel() const;
    
    /**
     * @brief Log a trace message
     * @tparam Args Variadic template for format arguments
     * @param fmt Format string
     * @param args Format arguments
     */
    template<typename... Args>
    void trace(const std::string& fmt, const Args&... args) {
        logger_->trace(fmt, args...);
    }
    
    /**
     * @brief Log a debug message
     * @tparam Args Variadic template for format arguments
     * @param fmt Format string
     * @param args Format arguments
     */
    template<typename... Args>
    void debug(const std::string& fmt, const Args&... args) {
        logger_->debug(fmt, args...);
    }
    
    /**
     * @brief Log an info message
     * @tparam Args Variadic template for format arguments
     * @param fmt Format string
     * @param args Format arguments
     */
    template<typename... Args>
    void info(const std::string& fmt, const Args&... args) {
        logger_->info(fmt, args...);
    }
    
    /**
     * @brief Log a warning message
     * @tparam Args Variadic template for format arguments
     * @param fmt Format string
     * @param args Format arguments
     */
    template<typename... Args>
    void warn(const std::string& fmt, const Args&... args) {
        logger_->warn(fmt, args...);
    }
    
    /**
     * @brief Log an error message
     * @tparam Args Variadic template for format arguments
     * @param fmt Format string
     * @param args Format arguments
     */
    template<typename... Args>
    void error(const std::string& fmt, const Args&... args) {
        logger_->error(fmt, args...);
    }
    
    /**
     * @brief Log a critical message
     * @tparam Args Variadic template for format arguments
     * @param fmt Format string
     * @param args Format arguments
     */
    template<typename... Args>
    void critical(const std::string& fmt, const Args&... args) {
        logger_->critical(fmt, args...);
    }
    
    /**
     * @brief Flush the logger
     */
    void flush();
    
private:
    Logger();
    ~Logger() = default;
    
    Logger(const Logger&) = delete;
    Logger& operator=(const Logger&) = delete;
    
    std::shared_ptr<spdlog::logger> logger_;
    std::mutex mutex_;
    bool initialized_;
};

} // namespace logging
} // namespace etr