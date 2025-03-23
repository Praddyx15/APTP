// backend/core/include/ConfigurationManager.h
#pragma once

#include <string>
#include <unordered_map>
#include <any>
#include <functional>
#include <mutex>
#include <shared_mutex>
#include <filesystem>
#include <optional>
#include <variant>
#include <vector>

namespace APTP::Core {

enum class ConfigSource {
    Environment,
    File,
    Database
};

class ConfigurationManager {
public:
    using ConfigCallback = std::function<void(const std::string&, const std::any&)>;
    
    static ConfigurationManager& getInstance();
    
    template<typename T>
    std::optional<T> get(const std::string& key) const;
    
    template<typename T>
    T getOrDefault(const std::string& key, const T& defaultValue) const;
    
    template<typename T>
    bool set(const std::string& key, const T& value, ConfigSource source);
    
    void loadFromEnvironment();
    bool loadFromFile(const std::filesystem::path& path);
    bool loadFromDatabase(const std::string& connectionString);
    
    void registerChangeCallback(const std::string& key, ConfigCallback callback);
    void unregisterChangeCallback(const std::string& key, const void* callbackOwner);
    void clearChangeCallbacks();

private:
    ConfigurationManager();
    ~ConfigurationManager();
    
    struct CallbackInfo {
        void* owner;
        ConfigCallback callback;
    };
    
    std::unordered_map<std::string, std::any> configValues_;
    std::unordered_map<std::string, std::vector<CallbackInfo>> callbacks_;
    std::unordered_map<std::string, ConfigSource> configSources_;
    
    mutable std::shared_mutex mutex_;
    
    void notifyChangeCallbacks(const std::string& key, const std::any& value);
};

// Implementation of template methods
template<typename T>
std::optional<T> ConfigurationManager::get(const std::string& key) const {
    std::shared_lock<std::shared_mutex> lock(mutex_);
    auto it = configValues_.find(key);
    if (it != configValues_.end()) {
        try {
            return std::any_cast<T>(it->second);
        } catch (const std::bad_any_cast&) {
            return std::nullopt;
        }
    }
    return std::nullopt;
}

template<typename T>
T ConfigurationManager::getOrDefault(const std::string& key, const T& defaultValue) const {
    auto value = get<T>(key);
    return value.has_value() ? *value : defaultValue;
}

template<typename T>
bool ConfigurationManager::set(const std::string& key, const T& value, ConfigSource source) {
    std::unique_lock<std::shared_mutex> lock(mutex_);
    configValues_[key] = value;
    configSources_[key] = source;
    lock.unlock();
    notifyChangeCallbacks(key, value);
    return true;
}

} // namespace APTP::Core

// backend/core/include/Logger.h
#pragma once

#include <string>
#include <sstream>
#include <memory>
#include <unordered_map>
#include <source_location>
#include <chrono>

namespace APTP::Core {

enum class LogLevel {
    Trace,
    Debug,
    Info,
    Warning,
    Error,
    Critical
};

class LogContext {
public:
    LogContext() = default;
    LogContext(const LogContext&) = default;
    LogContext& operator=(const LogContext&) = default;
    
    template<typename T>
    LogContext& add(const std::string& key, const T& value) {
        std::stringstream ss;
        ss << value;
        context_[key] = ss.str();
        return *this;
    }
    
    const std::unordered_map<std::string, std::string>& getContext() const {
        return context_;
    }
    
private:
    std::unordered_map<std::string, std::string> context_;
};

class Logger {
public:
    static Logger& getInstance();
    
    void setLogLevel(LogLevel level);
    LogLevel getLogLevel() const;
    
    template<typename... Args>
    void log(LogLevel level, 
             const std::source_location& location,
             const LogContext& context,
             const std::string& format,
             const Args&... args);
    
    template<typename... Args>
    void trace(const std::string& format, const Args&... args,
              const std::source_location& location = std::source_location::current());
    
    template<typename... Args>
    void debug(const std::string& format, const Args&... args,
              const std::source_location& location = std::source_location::current());
    
    template<typename... Args>
    void info(const std::string& format, const Args&... args,
             const std::source_location& location = std::source_location::current());
    
    template<typename... Args>
    void warning(const std::string& format, const Args&... args,
                const std::source_location& location = std::source_location::current());
    
    template<typename... Args>
    void error(const std::string& format, const Args&... args,
              const std::source_location& location = std::source_location::current());
    
    template<typename... Args>
    void critical(const std::string& format, const Args&... args,
                 const std::source_location& location = std::source_location::current());

private:
    Logger();
    ~Logger();
    
    struct LoggerImpl;
    std::unique_ptr<LoggerImpl> impl_;
};

// Convenient global functions
template<typename... Args>
void trace(const std::string& format, const Args&... args,
          const std::source_location& location = std::source_location::current()) {
    Logger::getInstance().trace(format, args..., location);
}

template<typename... Args>
void debug(const std::string& format, const Args&... args,
          const std::source_location& location = std::source_location::current()) {
    Logger::getInstance().debug(format, args..., location);
}

template<typename... Args>
void info(const std::string& format, const Args&... args,
         const std::source_location& location = std::source_location::current()) {
    Logger::getInstance().info(format, args..., location);
}

template<typename... Args>
void warning(const std::string& format, const Args&... args,
            const std::source_location& location = std::source_location::current()) {
    Logger::getInstance().warning(format, args..., location);
}

template<typename... Args>
void error(const std::string& format, const Args&... args,
          const std::source_location& location = std::source_location::current()) {
    Logger::getInstance().error(format, args..., location);
}

template<typename... Args>
void critical(const std::string& format, const Args&... args,
             const std::source_location& location = std::source_location::current()) {
    Logger::getInstance().critical(format, args..., location);
}

// Helper class for RAII-style logging
class ScopedLogger {
public:
    template<typename... Args>
    ScopedLogger(const std::string& componentName, const std::string& operationName, const Args&... args,
                const std::source_location& location = std::source_location::current())
        : componentName_(componentName), operationName_(operationName), location_(location) {
        LogContext context;
        (context.add(std::to_string(sizeof...(Args) - Args), args), ...);
        Logger::getInstance().debug("Starting operation {} in component {}", operationName_, componentName_, location_);
        startTime_ = std::chrono::high_resolution_clock::now();
    }
    
    ~ScopedLogger() {
        auto endTime = std::chrono::high_resolution_clock::now();
        auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(endTime - startTime_).count();
        Logger::getInstance().debug("Completed operation {} in component {} (took {}ms)", 
                                   operationName_, componentName_, duration, location_);
    }
    
private:
    std::string componentName_;
    std::string operationName_;
    std::source_location location_;
    std::chrono::time_point<std::chrono::high_resolution_clock> startTime_;
};

} // namespace APTP::Core

// backend/core/include/ErrorHandling.h
#pragma once

#include <string>
#include <exception>
#include <functional>
#include <optional>
#include <variant>
#include <source_location>

namespace APTP::Core {

// Generic error code definition
enum class ErrorCode {
    // System errors
    Success = 0,
    Unknown = 1,
    InvalidArgument = 2,
    OutOfRange = 3,
    ResourceUnavailable = 4,
    Timeout = 5,
    NotImplemented = 6,
    InvalidState = 7,
    
    // Application-specific errors
    DocumentProcessingError = 1000,
    SyllabusGenerationError = 2000,
    AssessmentError = 3000,
    UserManagementError = 4000,
    SchedulerError = 5000,
    AnalyticsError = 6000,
    ComplianceError = 7000,
    CollaborationError = 8000,
    VisualizationError = 9000,
    IntegrationError = 10000,
    SecurityError = 11000
};

// Base exception class for the application
class APTPException : public std::exception {
public:
    APTPException(ErrorCode code, 
                 const std::string& message, 
                 const std::source_location& location = std::source_location::current());
    
    ErrorCode getErrorCode() const;
    const std::string& getFullMessage() const;
    const char* what() const noexcept override;
    const std::source_location& getLocation() const;
    
private:
    ErrorCode errorCode_;
    std::string message_;
    std::string fullMessage_;
    std::source_location location_;
};

// Result class for handling operations that can fail
template<typename T, typename E = ErrorCode>
class Result {
public:
    Result(T value) : value_(std::move(value)), error_{} {}
    Result(E error) : value_{}, error_(std::move(error)) {}
    
    bool isSuccess() const { return value_.has_value(); }
    bool isError() const { return error_.has_value(); }
    
    const T& value() const { 
        if (!value_) throw APTPException(ErrorCode::InvalidState, "Attempted to access value of failed Result");
        return *value_; 
    }
    
    T& value() { 
        if (!value_) throw APTPException(ErrorCode::InvalidState, "Attempted to access value of failed Result");
        return *value_; 
    }
    
    const E& error() const { 
        if (!error_) throw APTPException(ErrorCode::InvalidState, "Attempted to access error of successful Result");
        return *error_; 
    }
    
    // Map success value using a function
    template<typename U, typename Func>
    Result<U, E> map(Func&& func) const {
        if (isSuccess()) {
            return Result<U, E>(func(value()));
        } else {
            return Result<U, E>(error());
        }
    }
    
    // Flat map (monadic bind) success value using a function that returns a Result
    template<typename U, typename Func>
    Result<U, E> flatMap(Func&& func) const {
        if (isSuccess()) {
            return func(value());
        } else {
            return Result<U, E>(error());
        }
    }
    
    // Handle both success and error cases
    template<typename SuccessFunc, typename ErrorFunc>
    auto match(SuccessFunc&& successFunc, ErrorFunc&& errorFunc) const {
        if (isSuccess()) {
            return successFunc(value());
        } else {
            return errorFunc(error());
        }
    }
    
private:
    std::optional<T> value_;
    std::optional<E> error_;
};

// Void result class for operations that don't return a value
template<typename E>
class Result<void, E> {
public:
    Result() : success_(true), error_{} {}
    Result(E error) : success_(false), error_(std::move(error)) {}
    
    bool isSuccess() const { return success_; }
    bool isError() const { return !success_; }
    
    const E& error() const { 
        if (success_) throw APTPException(ErrorCode::InvalidState, "Attempted to access error of successful Result");
        return *error_; 
    }
    
    // Flat map void result to a result with a value
    template<typename U, typename Func>
    Result<U, E> flatMap(Func&& func) const {
        if (isSuccess()) {
            return func();
        } else {
            return Result<U, E>(error());
        }
    }
    
    // Handle both success and error cases
    template<typename SuccessFunc, typename ErrorFunc>
    auto match(SuccessFunc&& successFunc, ErrorFunc&& errorFunc) const {
        if (isSuccess()) {
            return successFunc();
        } else {
            return errorFunc(error());
        }
    }
    
private:
    bool success_;
    std::optional<E> error_;
};

// Helper to create success result
template<typename T>
Result<T> Success(T value) {
    return Result<T>(std::move(value));
}

// Helper to create void success result
inline Result<void> Success() {
    return Result<void>();
}

// Helper to create error result
template<typename T, typename E>
Result<T, E> Error(E error) {
    return Result<T, E>(std::move(error));
}

// Helper for void error result
template<typename E>
Result<void, E> Error(E error) {
    return Result<void, E>(std::move(error));
}

// Exception handler utility
class ExceptionHandler {
public:
    template<typename Func, typename... Args>
    static auto tryExecute(Func&& func, Args&&... args) -> Result<decltype(func(args...))> {
        try {
            if constexpr (std::is_void_v<decltype(func(args...))>) {
                func(std::forward<Args>(args)...);
                return Success();
            } else {
                return Success(func(std::forward<Args>(args)...));
            }
        } catch (const APTPException& e) {
            return Error<decltype(func(args...))>(e.getErrorCode());
        } catch (const std::exception& e) {
            return Error<decltype(func(args...))>(ErrorCode::Unknown);
        } catch (...) {
            return Error<decltype(func(args...))>(ErrorCode::Unknown);
        }
    }
};

} // namespace APTP::Core

// backend/core/src/ConfigurationManager.cpp
#include "ConfigurationManager.h"
#include "Logger.h"
#include <fstream>
#include <json.hpp> // Using nlohmann/json

namespace APTP::Core {

ConfigurationManager& ConfigurationManager::getInstance() {
    static ConfigurationManager instance;
    return instance;
}

ConfigurationManager::ConfigurationManager() {
    // Constructor implementation
}

ConfigurationManager::~ConfigurationManager() {
    // Destructor implementation
}

void ConfigurationManager::loadFromEnvironment() {
    // Implementation to load from environment variables
    // This is a simplified example
    
    // List of environment variables to check
    const std::vector<std::string> envVars = {
        "APTP_DB_HOST", "APTP_DB_PORT", "APTP_DB_USER", "APTP_DB_PASSWORD", "APTP_DB_NAME",
        "APTP_LOG_LEVEL", "APTP_API_PORT", "APTP_API_HOST", "APTP_REDIS_URL",
        "APTP_SECURITY_KEY", "APTP_JWT_SECRET", "APTP_ENABLE_SSL"
    };
    
    for (const auto& var : envVars) {
        if (const char* env = std::getenv(var.c_str())) {
            set<std::string>(var, std::string(env), ConfigSource::Environment);
            info("Loaded environment variable: {}", var);
        }
    }
}

bool ConfigurationManager::loadFromFile(const std::filesystem::path& path) {
    try {
        // Check if file exists
        if (!std::filesystem::exists(path)) {
            error("Configuration file not found: {}", path.string());
            return false;
        }
        
        // Read JSON file
        std::ifstream file(path);
        nlohmann::json jsonConfig;
        file >> jsonConfig;
        
        // Process JSON and add to configuration
        for (auto it = jsonConfig.begin(); it != jsonConfig.end(); ++it) {
            const auto& key = it.key();
            const auto& value = it.value();
            
            if (value.is_string()) {
                set<std::string>(key, value.get<std::string>(), ConfigSource::File);
            } else if (value.is_number_integer()) {
                set<int>(key, value.get<int>(), ConfigSource::File);
            } else if (value.is_number_float()) {
                set<double>(key, value.get<double>(), ConfigSource::File);
            } else if (value.is_boolean()) {
                set<bool>(key, value.get<bool>(), ConfigSource::File);
            } else if (value.is_array() || value.is_object()) {
                // Store complex types as JSON strings
                set<std::string>(key, value.dump(), ConfigSource::File);
            }
        }
        
        info("Loaded configuration from file: {}", path.string());
        return true;
    } catch (const std::exception& e) {
        error("Failed to load configuration from file: {} ({})", path.string(), e.what());
        return false;
    }
}

bool ConfigurationManager::loadFromDatabase(const std::string& connectionString) {
    // This would be implemented to load configuration from a database
    // For this example, we'll provide a stub implementation
    
    info("Loading configuration from database with connection: {}", connectionString);
    // In a real implementation, you would connect to the database and load configuration values
    
    // Mock implementation for example purposes
    set<std::string>("db_loaded", "true", ConfigSource::Database);
    set<int>("db_config_version", 1, ConfigSource::Database);
    
    return true;
}

void ConfigurationManager::registerChangeCallback(const std::string& key, ConfigCallback callback) {
    std::unique_lock<std::shared_mutex> lock(mutex_);
    CallbackInfo info{nullptr, callback};
    callbacks_[key].push_back(info);
}

void ConfigurationManager::unregisterChangeCallback(const std::string& key, const void* callbackOwner) {
    std::unique_lock<std::shared_mutex> lock(mutex_);
    auto it = callbacks_.find(key);
    if (it != callbacks_.end()) {
        auto& callbacksList = it->second;
        callbacksList.erase(
            std::remove_if(callbacksList.begin(), callbacksList.end(),
                [callbackOwner](const CallbackInfo& info) { return info.owner == callbackOwner; }),
            callbacksList.end()
        );
    }
}

void ConfigurationManager::clearChangeCallbacks() {
    std::unique_lock<std::shared_mutex> lock(mutex_);
    callbacks_.clear();
}

void ConfigurationManager::notifyChangeCallbacks(const std::string& key, const std::any& value) {
    // Make a copy of the callbacks to avoid holding the lock during callback execution
    std::vector<ConfigCallback> callbacksToNotify;
    {
        std::shared_lock<std::shared_mutex> lock(mutex_);
        auto it = callbacks_.find(key);
        if (it != callbacks_.end()) {
            for (const auto& callbackInfo : it->second) {
                callbacksToNotify.push_back(callbackInfo.callback);
            }
        }
    }
    
    // Execute callbacks
    for (const auto& callback : callbacksToNotify) {
        try {
            callback(key, value);
        } catch (const std::exception& e) {
            error("Exception in configuration change callback for key {}: {}", key, e.what());
        }
    }
}

// backend/core/src/Logger.cpp implementation would go here
// backend/core/src/ErrorHandling.cpp implementation would go here

} // namespace APTP::Core
