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
    fileStream_ = std::make_unique<std::ofstream>(actualFilename, std::ios::app);
    
    if (!fileStream_->is_open()) {
        throw std::runtime_error("Failed to open log file: " + actualFilename);
    }
    
    // Get the current file size
    currentSize_ = std::filesystem::file_size(actualFilename);
}

// Implementation of FileLogSink destructor
inline FileLogSink::~FileLogSink() {
    if (fileStream_) {
        fileStream_->flush();
        fileStream_->close();
    }
}

// Implementation of FileLogSink::write
inline void FileLogSink::write(const LogEntry& entry) {
    std::lock_guard<std::mutex> lock(fileMutex_);
    
    // Format the log entry to string
    std::ostringstream os;
    auto timeT = std::chrono::system_clock::to_time_t(entry.timestamp);
    std::tm tm = *std::localtime(&timeT);
    char timeBuffer[32];
    std::strftime(timeBuffer, sizeof(timeBuffer), "%Y-%m-%d %H:%M:%S", &tm);
    
    os << "[" << timeBuffer << "] ["
       << static_cast<int>(entry.level) << "] ["
       << entry.context.module << ":" << entry.context.method << "] ";
    
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
    
    // Write to file
    std::string logLine = os.str();
    *fileStream_ << logLine;
    currentSize_ += logLine.size();
    
    // Check if we need to rotate the log
    rotateLogIfNeeded();
}

// Implementation of FileLogSink::flush
inline void FileLogSink::flush() {
    std::lock_guard<std::mutex> lock(fileMutex_);
    if (fileStream_) {
        fileStream_->flush();
    }
}

// Implementation of FileLogSink::rotateLogIfNeeded
inline void FileLogSink::rotateLogIfNeeded() {
    if (currentSize_ >= maxSizeBytes_) {
        // Close current file
        fileStream_->close();
        
        // Get list of existing log files
        std::filesystem::path basePath(baseFilename_);
        std::vector<std::filesystem::path> logFiles;
        
        // Add current base log file if it exists
        if (std::filesystem::exists(baseFilename_)) {
            logFiles.push_back(baseFilename_);
        }
        
        // Find rotated log files
        std::string baseFilenameStr = baseFilename_;
        std::string baseName = basePath.stem().string();
        std::string extension = basePath.extension().string();
        std::string directory = basePath.parent_path().string();
        
        // Look for files like baseFilename.1, baseFilename.2, etc.
        for (size_t i = 1; i <= maxFiles_; i++) {
            std::string rotatedFilename = directory + "/" + baseName + "." + std::to_string(i) + extension;
            if (std::filesystem::exists(rotatedFilename)) {
                logFiles.push_back(rotatedFilename);
            }
        }
        
        // Sort by modification time (newest first)
        std::sort(logFiles.begin(), logFiles.end(), [](const std::filesystem::path& a, const std::filesystem::path& b) {
            return std::filesystem::last_write_time(a) > std::filesystem::last_write_time(b);
        });
        
        // Rotate log files
        for (size_t i = 0; i < logFiles.size(); i++) {
            if (i >= maxFiles_ - 1) {
                // Remove excess log files
                std::filesystem::remove(logFiles[i]);
            } else {
                // Rename log files
                std::string newFilename = directory + "/" + baseName + "." + std::to_string(i + 1) + extension;
                std::filesystem::rename(logFiles[i], newFilename);
            }
        }
        
        // Create new log file
        fileStream_ = std::make_unique<std::ofstream>(baseFilename_, std::ios::app);
        if (!fileStream_->is_open()) {
            throw std::runtime_error("Failed to open new log file: " + baseFilename_);
        }
        
        currentSize_ = 0;
    }
}

// Implementation of FileLogSink::getTimestampedFilename
inline std::string FileLogSink::getTimestampedFilename() const {
    auto now = std::chrono::system_clock::now();
    auto timeT = std::chrono::system_clock::to_time_t(now);
    std::tm tm = *std::localtime(&timeT);
    
    char timeBuffer[32];
    std::strftime(timeBuffer, sizeof(timeBuffer), "%Y%m%d_%H%M%S", &tm);
    
    std::filesystem::path basePath(baseFilename_);
    std::string baseName = basePath.stem().string();
    std::string extension = basePath.extension().string();
    std::string directory = basePath.parent_path().string();
    
    return directory + "/" + baseName + "_" + timeBuffer + extension;
}

// Implementation of SyslogSink constructor
inline SyslogSink::SyslogSink(const std::string& appName) : appName_(appName) {
    // Open connection to syslog
    openlog(appName_.c_str(), LOG_PID | LOG_CONS, LOG_USER);
}

// Implementation of SyslogSink destructor
inline SyslogSink::~SyslogSink() {
    // Close connection to syslog
    closelog();
}

// Implementation of SyslogSink::write
inline void SyslogSink::write(const LogEntry& entry) {
    // Map LogLevel to syslog priority
    int priority;
    switch (entry.level) {
        case LogLevel::TRACE:
        case LogLevel::DEBUG:
            priority = LOG_DEBUG;
            break;
        case LogLevel::INFO:
            priority = LOG_INFO;
            break;
        case LogLevel::WARN:
            priority = LOG_WARNING;
            break;
        case LogLevel::ERROR:
            priority = LOG_ERR;
            break;
        case LogLevel::FATAL:
            priority = LOG_CRIT;
            break;
        default:
            priority = LOG_NOTICE;
    }
    
    // Format log message
    std::ostringstream os;
    os << "[" << entry.context.module << ":" << entry.context.method << "] ";
    
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
    
    os << entry.message;
    
    // Write to syslog
    syslog(priority, "%s", os.str().c_str());
}

// Implementation of SyslogSink::flush
inline void SyslogSink::flush() {
    // Syslog doesn't require explicit flushing
}

// Implementation of JsonLogSink constructor
inline JsonLogSink::JsonLogSink(std::shared_ptr<LogSink> wrappedSink) : wrappedSink_(wrappedSink) {
    if (!wrappedSink_) {
        throw std::invalid_argument("Wrapped sink cannot be null");
    }
}

// Implementation of JsonLogSink::write
inline void JsonLogSink::write(const LogEntry& entry) {
    // Map LogLevel to string
    static const std::unordered_map<LogLevel, std::string> levelStrings = {
        {LogLevel::TRACE, "TRACE"},
        {LogLevel::DEBUG, "DEBUG"},
        {LogLevel::INFO,  "INFO"},
        {LogLevel::WARN,  "WARN"},
        {LogLevel::ERROR, "ERROR"},
        {LogLevel::FATAL, "FATAL"}
    };
    
    // Create JSON object
    nlohmann::json jsonEntry;
    
    // Basic log information
    jsonEntry["level"] = levelStrings.at(entry.level);
    jsonEntry["message"] = entry.message;
    
    // Timestamp
    auto timeT = std::chrono::system_clock::to_time_t(entry.timestamp);
    auto millis = std::chrono::duration_cast<std::chrono::milliseconds>(
        entry.timestamp.time_since_epoch()
    ).count() % 1000;
    
    std::tm tm = *std::localtime(&timeT);
    char timeBuffer[32];
    std::strftime(timeBuffer, sizeof(timeBuffer), "%Y-%m-%dT%H:%M:%S", &tm);
    
    std::ostringstream timestampStr;
    timestampStr << timeBuffer << "." << std::setfill('0') << std::setw(3) << millis << "Z";
    jsonEntry["timestamp"] = timestampStr.str();
    
    // Thread information
    std::ostringstream threadIdStr;
    threadIdStr << entry.threadId;
    jsonEntry["thread_id"] = threadIdStr.str();
    
    // Context information
    jsonEntry["context"] = {
        {"module", entry.context.module},
        {"method", entry.context.method}
    };
    
    if (!entry.context.userId.empty()) {
        jsonEntry["context"]["user_id"] = entry.context.userId;
    }
    
    if (!entry.context.requestId.empty()) {
        jsonEntry["context"]["request_id"] = entry.context.requestId;
    }
    
    if (!entry.context.sessionId.empty()) {
        jsonEntry["context"]["session_id"] = entry.context.sessionId;
    }
    
    if (!entry.context.attributes.empty()) {
        jsonEntry["context"]["attributes"] = entry.context.attributes;
    }
    
    // Create new log entry with JSON message
    LogEntry jsonLogEntry = entry;
    jsonLogEntry.message = jsonEntry.dump();
    
    // Write to wrapped sink
    wrappedSink_->write(jsonLogEntry);
}

// Implementation of JsonLogSink::flush
inline void JsonLogSink::flush() {
    wrappedSink_->flush();
}

// Implementation of NetworkLogSink constructor
inline NetworkLogSink::NetworkLogSink(const std::string& endpoint, 
                                    const std::string& apiKey,
                                    size_t batchSize,
                                    std::chrono::milliseconds flushInterval)
    : endpoint_(endpoint),
      apiKey_(apiKey),
      batchSize_(batchSize),
      flushInterval_(flushInterval),
      running_(true) {
    
    // Start the flush worker thread
    flushThread_ = std::thread(&NetworkLogSink::flushWorker, this);
}

// Implementation of NetworkLogSink destructor
inline NetworkLogSink::~NetworkLogSink() {
    {
        std::lock_guard<std::mutex> lock(bufferMutex_);
        running_ = false;
    }
    
    if (flushThread_.joinable()) {
        flushThread_.join();
    }
    
    // Flush any remaining logs
    flush();
}

// Implementation of NetworkLogSink::write
inline void NetworkLogSink::write(const LogEntry& entry) {
    std::lock_guard<std::mutex> lock(bufferMutex_);
    
    buffer_.push_back(entry);
    
    // If buffer is full, flush it
    if (buffer_.size() >= batchSize_) {
        auto bufferCopy = buffer_;
        buffer_.clear();
        
        // Release the lock before sending to avoid blocking other threads
        lock.~lock_guard();
        
        sendBatch(bufferCopy);
    }
}

// Implementation of NetworkLogSink::flush
inline void NetworkLogSink::flush() {
    std::vector<LogEntry> bufferCopy;
    
    {
        std::lock_guard<std::mutex> lock(bufferMutex_);
        bufferCopy = buffer_;
        buffer_.clear();
    }
    
    if (!bufferCopy.empty()) {
        sendBatch(bufferCopy);
    }
}

// Implementation of NetworkLogSink::flushWorker
inline void NetworkLogSink::flushWorker() {
    while (running_) {
        // Sleep for the flush interval
        std::this_thread::sleep_for(flushInterval_);
        
        // Flush logs
        flush();
    }
}

// Implementation of NetworkLogSink::sendBatch
inline void NetworkLogSink::sendBatch(const std::vector<LogEntry>& batch) {
    if (batch.empty()) {
        return;
    }
    
    try {
        // Format batch as JSON array
        nlohmann::json jsonBatch = nlohmann::json::array();
        
        for (const auto& entry : batch) {
            // Map LogLevel to string
            static const std::unordered_map<LogLevel, std::string> levelStrings = {
                {LogLevel::TRACE, "TRACE"},
                {LogLevel::DEBUG, "DEBUG"},
                {LogLevel::INFO,  "INFO"},
                {LogLevel::WARN,  "WARN"},
                {LogLevel::ERROR, "ERROR"},
                {LogLevel::FATAL, "FATAL"}
            };
            
            // Create JSON object for log entry
            nlohmann::json jsonEntry;
            
            // Basic log information
            jsonEntry["level"] = levelStrings.at(entry.level);
            jsonEntry["message"] = entry.message;
            
            // Timestamp
            auto timeT = std::chrono::system_clock::to_time_t(entry.timestamp);
            auto millis = std::chrono::duration_cast<std::chrono::milliseconds>(
                entry.timestamp.time_since_epoch()
            ).count() % 1000;
            
            std::tm tm = *std::localtime(&timeT);
            char timeBuffer[32];
            std::strftime(timeBuffer, sizeof(timeBuffer), "%Y-%m-%dT%H:%M:%S", &tm);
            
            std::ostringstream timestampStr;
            timestampStr << timeBuffer << "." << std::setfill('0') << std::setw(3) << millis << "Z";
            jsonEntry["timestamp"] = timestampStr.str();
            
            // Thread information
            std::ostringstream threadIdStr;
            threadIdStr << entry.threadId;
            jsonEntry["thread_id"] = threadIdStr.str();
            
            // Context information
            jsonEntry["context"] = {
                {"module", entry.context.module},
                {"method", entry.context.method}
            };
            
            if (!entry.context.userId.empty()) {
                jsonEntry["context"]["user_id"] = entry.context.userId;
            }
            
            if (!entry.context.requestId.empty()) {
                jsonEntry["context"]["request_id"] = entry.context.requestId;
            }
            
            if (!entry.context.sessionId.empty()) {
                jsonEntry["context"]["session_id"] = entry.context.sessionId;
            }
            
            if (!entry.context.attributes.empty()) {
                jsonEntry["context"]["attributes"] = entry.context.attributes;
            }
            
            jsonBatch.push_back(jsonEntry);
        }
        
        // Send request using Drogon HTTP client
        auto client = drogon::HttpClient::newHttpClient(endpoint_);
        auto req = drogon::HttpRequest::newHttpRequest();
        
        req->setMethod(drogon::HttpMethod::Post);
        req->setPath("/logs");
        req->setContentTypeString("application/json");
        req->addHeader("Accept", "application/json");
        
        if (!apiKey_.empty()) {
            req->addHeader("X-API-Key", apiKey_);
        }
        
        req->setBody(jsonBatch.dump());
        
        // Send synchronously (we're already in a background thread)
        auto response = client->sendRequest(req);
        
        if (response->statusCode() != drogon::k200OK) {
            LOG_ERROR("core", "logSink") << "Failed to send logs to endpoint: " 
                << endpoint_ << ", status: " << response->statusCode();
        }
    } catch (const std::exception& e) {
        LOG_ERROR("core", "logSink") << "Error sending logs to endpoint: " 
            << endpoint_ << ", error: " << e.what();
    }
}