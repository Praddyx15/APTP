#pragma once

#include <string>
#include <memory>
#include <mutex>
#include <unordered_map>
#include <vector>
#include <chrono>
#include <thread>
#include <sstream>
#include <functional>
#include <filesystem>

#include <drogon/drogon.h>
#include <nlohmann/json.hpp>

namespace apt {
namespace core {

enum class LogLevel {
    TRACE,
    DEBUG,
    INFO,
    WARN,
    ERROR,
    FATAL
};

struct LogContext {
    std::string module;
    std::string method;
    std::string userId;
    std::string requestId;
    std::string sessionId;
    std::unordered_map<std::string, std::string> attributes;
};

struct LogEntry {
    LogLevel level;
    std::string message;
    std::chrono::system_clock::time_point timestamp;
    std::thread::id threadId;
    LogContext context;
};

/**
 * Log sink interface for different logging destinations
 */
class LogSink {
public:
    virtual ~LogSink() = default;
    virtual void write(const LogEntry& entry) = 0;
    virtual void flush() = 0;
};

/**
 * Console log sink that outputs to stdout/stderr
 */
class ConsoleLogSink : public LogSink {
public:
    void write(const LogEntry& entry) override;
    void flush() override;
};

/**
 * File log sink that outputs to a file
 */
class FileLogSink : public LogSink {
public:
    explicit FileLogSink(const std::string& filename, 
                        bool appendTimestamp = true,
                        size_t maxSizeBytes = 10 * 1024 * 1024,
                        size_t maxFiles = 5);
    ~FileLogSink() override;

    void write(const LogEntry& entry) override;
    void flush() override;

private:
    void rotateLogIfNeeded();
    std::string getTimestampedFilename() const;

    std::string baseFilename_;
    bool appendTimestamp_;
    size_t maxSizeBytes_;
    size_t maxFiles_;
    std::unique_ptr<std::ofstream> fileStream_;
    std::mutex fileMutex_;
    size_t currentSize_;
};

/**
 * Syslog sink for system logging
 */
class SyslogSink : public LogSink {
public:
    explicit SyslogSink(const std::string& appName);
    ~SyslogSink() override;

    void write(const LogEntry& entry) override;
    void flush() override;

private:
    std::string appName_;
};

/**
 * Structured logging sink that outputs JSON format
 */
class JsonLogSink : public LogSink {
public:
    explicit JsonLogSink(std::shared_ptr<LogSink> wrappedSink);

    void write(const LogEntry& entry) override;
    void flush() override;

private:
    std::shared_ptr<LogSink> wrappedSink_;
};

/**
 * Network log sink that sends logs over network
 */
class NetworkLogSink : public LogSink {
public:
    explicit NetworkLogSink(const std::string& endpoint, 
                           const std::string& apiKey = "",
                           size_t batchSize = 100,
                           std::chrono::milliseconds flushInterval = std::chrono::milliseconds(5000));
    ~NetworkLogSink() override;

    void write(const LogEntry& entry) override;
    void flush() override;

private:
    void flushWorker();
    void sendBatch(const std::vector<LogEntry>& batch);

    std::string endpoint_;
    std::string apiKey_;
    size_t batchSize_;
    std::chrono::milliseconds flushInterval_;
    std::vector<LogEntry> buffer_;
    std::mutex bufferMutex_;
    std::thread flushThread_;
    bool running_;
};

/**
 * Class to create a log entry with context
 */
class LogBuilder {
public:
    LogBuilder(LogLevel level, const std::string& module, const std::string& method);
    ~LogBuilder();

    LogBuilder& message(const std::string& msg);
    LogBuilder& userId(const std::string& id);
    LogBuilder& requestId(const std::string& id);
    LogBuilder& sessionId(const std::string& id);
    LogBuilder& attribute(const std::string& key, const std::string& value);

    // Stream-style interface
    template<typename T>
    LogBuilder& operator<<(const T& value) {
        std::ostringstream oss;
        oss << messageStream_.str() << value;
        messageStream_.str(oss.str());
        return *this;
    }

private:
    LogLevel level_;
    std::ostringstream messageStream_;
    LogContext context_;
    bool submitted_;
};

/**
 * Main logging manager class
 */
class LogManager {
public:
    static LogManager& instance() {
        static LogManager instance;
        return instance;
    }

    void addSink(std::shared_ptr<LogSink> sink);
    void removeSink(std::shared_ptr<LogSink> sink);
    void setDefaultLevel(LogLevel level);
    void setModuleLevel(const std::string& module, LogLevel level);
    LogLevel getEffectiveLevel(const std::string& module) const;

    void log(const LogEntry& entry);

    // Helper methods for creating LogBuilders
    LogBuilder trace(const std::string& module, const std::string& method);
    LogBuilder debug(const std::string& module, const std::string& method);
    LogBuilder info(const std::string& module, const std::string& method);
    LogBuilder warn(const std::string& module, const std::string& method);
    LogBuilder error(const std::string& module, const std::string& method);
    LogBuilder fatal(const std::string& module, const std::string& method);

private:
    LogManager();
    ~LogManager();

    LogManager(const LogManager&) = delete;
    LogManager& operator=(const LogManager&) = delete;

    std::vector<std::shared_ptr<LogSink>> sinks_;
    mutable std::mutex sinksMutex_;
    
    LogLevel defaultLevel_;
    std::unordered_map<std::string, LogLevel> moduleLevels_;
    mutable std::mutex levelsMutex_;
};

// Convenience macros for logging
#define LOG_TRACE(module, method) apt::core::LogManager::instance().trace(module, method)
#define LOG_DEBUG(module, method) apt::core::LogManager::instance().debug(module, method)
#define LOG_INFO(module, method) apt::core::LogManager::instance().info(module, method)
#define LOG_WARN(module, method) apt::core::LogManager::instance().warn(module, method)
#define LOG_ERROR(module, method) apt::core::LogManager::instance().error(module, method)
#define LOG_FATAL(module, method) apt::core::LogManager::instance().fatal(module, method)

// Implementation of ConsoleLogSink::write
inline void ConsoleLogSink::write(const LogEntry& entry) {
    static const std::unordered_map<LogLevel, std::string> levelStrings = {
        {LogLevel::TRACE, "TRACE"},
        {LogLevel::DEBUG, "DEBUG"},
        {LogLevel::INFO,  "INFO "},
        {LogLevel::WARN,  "WARN "},
        {LogLevel::ERROR, "ERROR"},
        {LogLevel::FATAL, "FATAL"}
    };

    // Format timestamp
    auto time_t = std::chrono::system_clock::to_time_t(entry.timestamp);
    std::tm tm = *std::localtime(&time_t);
    char timeBuffer[32];
    std::strftime(timeBuffer, sizeof(timeBuffer), "%Y-%m-%d %H:%M:%S", &tm);

    // Build the log message
    std::ostringstream os;
    os << "[" << timeBuffer << "." 
       << std::chrono::duration_cast<std::chrono::milliseconds>(
              entry.timestamp.time_since_epoch()
          ).count() % 1000
       << "] [" << levelStrings.at(entry.level) << "] ["
       << entry.context.module << ":" << entry.context.method << "] ["
       << entry.threadId << "] ";

    if (!entry.context.userId.empty()) {
        os << "[User:" << entry.context.userId << "] ";
    }
    
    if (!entry.context.requestId.empty()) {
        os << "[Req:" << entry.context.requestId << "] ";
    }
    
    if (!entry.context.sessionId.empty()) {
        os << "[Session:" << entry.context.sessionId << "] ";
    }
    
    for (const auto& attr : entry.context.attributes) {
        os << "[" << attr.first << ":" << attr.second << "] ";
    }
    
    os << entry.message << std::endl;

    // Choose the output stream based on log level
    auto& outStream = (entry.level >= LogLevel::ERROR) ? std::cerr : std::cout;
    outStream << os.str();
}

// Implementation of ConsoleLogSink::flush
inline void ConsoleLogSink::flush() {
    std::cout.flush();
    std::cerr.flush();
}

// Implementation of LogManager constructor
inline LogManager::LogManager() : defaultLevel_(LogLevel::INFO) {
    // By default, add a console sink
    addSink(std::make_shared<ConsoleLogSink>());
}

// Implementation of LogManager destructor
inline LogManager::~LogManager() {
    // Flush all sinks before shutting down
    std::lock_guard<std::mutex> lock(sinksMutex_);
    for (auto& sink : sinks_) {
        sink->flush();
    }
}

// Implementation of LogManager::addSink
inline void LogManager::addSink(std::shared_ptr<LogSink> sink) {
    std::lock_guard<std::mutex> lock(sinksMutex_);
    sinks_.push_back(sink);
}

// Implementation of LogManager::removeSink
inline void LogManager::removeSink(std::shared_ptr<LogSink> sink) {
    std::lock_guard<std::mutex> lock(sinksMutex_);
    sinks_.erase(std::remove(sinks_.begin(), sinks_.end(), sink), sinks_.end());
}

// Implementation of LogManager::setDefaultLevel
inline void LogManager::setDefaultLevel(LogLevel level) {
    std::lock_guard<std::mutex> lock(levelsMutex_);
    defaultLevel_ = level;
}

// Implementation of LogManager::setModuleLevel
inline void LogManager::setModuleLevel(const std::string& module, LogLevel level) {
    std::lock_guard<std::mutex> lock(levelsMutex_);
    moduleLevels_[module] = level;
}

// Implementation of LogManager::getEffectiveLevel
inline LogLevel LogManager::getEffectiveLevel(const std::string& module) const {
    std::lock_guard<std::mutex> lock(levelsMutex_);
    auto it = moduleLevels_.find(module);
    return (it != moduleLevels_.end()) ? it->second : defaultLevel_;
}

// Implementation of LogManager::log
inline void LogManager::log(const LogEntry& entry) {
    // Check if we should log this level
    if (entry.level < getEffectiveLevel(entry.context.module)) {
        return;
    }

    // Write to all sinks
    std::lock_guard<std::mutex> lock(sinksMutex_);
    for (auto& sink : sinks_) {
        sink->write(entry);
    }
}

// Helper methods for creating LogBuilders
inline LogBuilder LogManager::trace(const std::string& module, const std::string& method) {
    return LogBuilder(LogLevel::TRACE, module, method);
}

inline LogBuilder LogManager::debug(const std::string& module, const std::string& method) {
    return LogBuilder(LogLevel::DEBUG, module, method);
}

inline LogBuilder LogManager::info(const std::string& module, const std::string& method) {
    return LogBuilder(LogLevel::INFO, module, method);
}

inline LogBuilder LogManager::warn(const std::string& module, const std::string& method) {
    return LogBuilder(LogLevel::WARN, module, method);
}

inline LogBuilder LogManager::error(const std::string& module, const std::string& method) {
    return LogBuilder(LogLevel::ERROR, module, method);
}

inline LogBuilder LogManager::fatal(const std::string& module, const std::string& method) {
    return LogBuilder(LogLevel::FATAL, module, method);
}

// Implementation of LogBuilder constructor
inline LogBuilder::LogBuilder(LogLevel level, const std::string& module, const std::string& method)
    : level_(level), submitted_(false) {
    context_.module = module;
    context_.method = method;
}

// Implementation of LogBuilder destructor
inline LogBuilder::~LogBuilder() {
    if (!submitted_) {
        // If the message hasn't been explicitly submitted, do it now
        LogEntry entry;
        entry.level = level_;
        entry.message = messageStream_.str();
        entry.timestamp = std::chrono::system_clock::now();
        entry.threadId = std::this_thread::get_id();
        entry.context = context_;
        
        LogManager::instance().log(entry);
        submitted_ = true;
    }
}

// Implementation of LogBuilder::message
inline LogBuilder& LogBuilder::message(const std::string& msg) {
    messageStream_ << msg;
    return *this;
}

// Implementation of LogBuilder::userId
inline LogBuilder& LogBuilder::userId(const std::string& id) {
    context_.userId = id;
    return *this;
}

// Implementation of LogBuilder::requestId
inline LogBuilder& LogBuilder::requestId(const std::string& id) {
    context_.requestId = id;
    return *this;
}

// Implementation of LogBuilder::sessionId
inline LogBuilder& LogBuilder::sessionId(const std::string& id) {
    context_.sessionId = id;
    return *this;
}

// Implementation of LogBuilder::attribute
inline LogBuilder& LogBuilder::attribute(const std::string& key, const std::string& value) {
    context_.attributes[key] = value;
    return *this;
}

// Implementation of FileLogSink constructor
inline FileLogSink::FileLogSink(const std::string& filename, 
                              bool appendTimestamp,
                              size_t maxSizeBytes,
                              size_t maxFiles)
    : baseFilename_(filename),
      appendTimestamp_(appendTimestamp),
      maxSizeBytes_(maxSizeBytes),
      maxFiles_(maxFiles),
      currentSize_(0) {
    
    std::string actualFilename = appendTimestamp_ ? getTimestampedFilename() : baseFilename_;
    
    // Create directory if it doesn't exist
    std::filesystem::path filePath(actualFilename);
    std::filesystem::create_directories(filePath.parent_path());
    
    // Open the file
    fileStream_ = std::make_unique<std::ofstream>(actualFil