#pragma once

#include <string>
#include <exception>
#include <stdexcept>
#include <memory>
#include <functional>
#include <vector>
#include <type_traits>
#include <optional>
#include <variant>
#include <unordered_map>
#include <mutex>
#include <thread>
#include <future>

#include <drogon/drogon.h>
#include <nlohmann/json.hpp>

namespace apt {
namespace core {

/**
 * Error codes for the Advanced Pilot Training Platform
 */
enum class ErrorCode {
    // General errors (0-999)
    UNKNOWN_ERROR = 0,
    INVALID_ARGUMENT = 1,
    INVALID_STATE = 2,
    NOT_IMPLEMENTED = 3,
    TIMEOUT = 4,
    RESOURCE_EXHAUSTED = 5,
    PERMISSION_DENIED = 6,
    NOT_FOUND = 7,
    ALREADY_EXISTS = 8,
    ABORTED = 9,
    CANCELLED = 10,
    
    // Database errors (1000-1999)
    DB_CONNECTION_ERROR = 1000,
    DB_QUERY_ERROR = 1001,
    DB_TRANSACTION_ERROR = 1002,
    DB_CONSTRAINT_VIOLATION = 1003,
    DB_INTEGRITY_ERROR = 1004,
    
    // API errors (2000-2999)
    API_AUTHENTICATION_ERROR = 2000,
    API_AUTHORIZATION_ERROR = 2001,
    API_REQUEST_VALIDATION_ERROR = 2002,
    API_RATE_LIMIT_EXCEEDED = 2003,
    API_ENDPOINT_NOT_FOUND = 2004,
    API_METHOD_NOT_ALLOWED = 2005,
    API_CONTENT_TYPE_ERROR = 2006,
    
    // Document processing errors (3000-3999)
    DOC_PARSING_ERROR = 3000,
    DOC_VALIDATION_ERROR = 3001,
    DOC_IO_ERROR = 3002,
    DOC_UNSUPPORTED_FORMAT = 3003,
    DOC_TOO_LARGE = 3004,
    
    // Syllabus errors (4000-4999)
    SYLLABUS_VALIDATION_ERROR = 4000,
    SYLLABUS_GENERATION_ERROR = 4001,
    SYLLABUS_COMPLIANCE_ERROR = 4002,
    SYLLABUS_VERSION_ERROR = 4003,
    
    // Assessment errors (5000-5999)
    ASSESSMENT_VALIDATION_ERROR = 5000,
    ASSESSMENT_GRADING_ERROR = 5001,
    ASSESSMENT_COMPLETION_ERROR = 5002,
    
    // User management errors (6000-6999)
    USER_AUTHENTICATION_ERROR = 6000,
    USER_AUTHORIZATION_ERROR = 6001,
    USER_PROFILE_ERROR = 6002,
    USER_LOGBOOK_ERROR = 6003,
    
    // Scheduler errors (7000-7999)
    SCHEDULER_RESOURCE_UNAVAILABLE = 7000,
    SCHEDULER_CONFLICT_ERROR = 7001,
    SCHEDULER_OPTIMIZATION_ERROR = 7002,
    
    // Analytics errors (8000-8999)
    ANALYTICS_CALCULATION_ERROR = 8000,
    ANALYTICS_DATA_ERROR = 8001,
    ANALYTICS_PREDICTION_ERROR = 8002,
    
    // Compliance errors (9000-9999)
    COMPLIANCE_VALIDATION_ERROR = 9000,
    COMPLIANCE_AUDIT_ERROR = 9001,
    COMPLIANCE_VERIFICATION_ERROR = 9002,
    
    // Collaboration errors (10000-10999)
    COLLABORATION_SESSION_ERROR = 10000,
    COLLABORATION_MESSAGING_ERROR = 10001,
    COLLABORATION_SYNC_ERROR = 10002,
    
    // Integration errors (11000-11999)
    INTEGRATION_CONNECTION_ERROR = 11000,
    INTEGRATION_DATA_FORMAT_ERROR = 11001,
    INTEGRATION_SYNC_ERROR = 11002,
    INTEGRATION_SIMULATOR_ERROR = 11003,
    INTEGRATION_BIOMETRIC_ERROR = 11004,
    INTEGRATION_ENTERPRISE_ERROR = 11005,
    INTEGRATION_CALENDAR_ERROR = 11006,
    
    // Security errors (12000-12999)
    SECURITY_ENCRYPTION_ERROR = 12000,
    SECURITY_DECRYPTION_ERROR = 12001,
    SECURITY_TOKEN_ERROR = 12002,
    SECURITY_AUDIT_ERROR = 12003,
    SECURITY_BLOCKCHAIN_ERROR = 12004
};

/**
 * Base exception class for the Advanced Pilot Training Platform
 */
class AptException : public std::exception {
public:
    AptException(ErrorCode code, const std::string& message)
        : code_(code), message_(message) {}
    
    AptException(ErrorCode code, const std::string& message, const std::exception& cause)
        : code_(code), message_(message), cause_(std::current_exception()) {}
    
    ErrorCode code() const { return code_; }
    const char* what() const noexcept override { return message_.c_str(); }
    std::exception_ptr cause() const { return cause_; }
    
private:
    ErrorCode code_;
    std::string message_;
    std::exception_ptr cause_;
};

// Specific exception types
class InvalidArgumentException : public AptException {
public:
    InvalidArgumentException(const std::string& message)
        : AptException(ErrorCode::INVALID_ARGUMENT, message) {}
};

class NotFoundException : public AptException {
public:
    NotFoundException(const std::string& message)
        : AptException(ErrorCode::NOT_FOUND, message) {}
};

class AuthenticationException : public AptException {
public:
    AuthenticationException(const std::string& message)
        : AptException(ErrorCode::USER_AUTHENTICATION_ERROR, message) {}
};

class AuthorizationException : public AptException {
public:
    AuthorizationException(const std::string& message)
        : AptException(ErrorCode::USER_AUTHORIZATION_ERROR, message) {}
};

class DatabaseException : public AptException {
public:
    DatabaseException(ErrorCode code, const std::string& message)
        : AptException(code, message) {}
    
    static DatabaseException connectionError(const std::string& message) {
        return DatabaseException(ErrorCode::DB_CONNECTION_ERROR, message);
    }
    
    static DatabaseException queryError(const std::string& message) {
        return DatabaseException(ErrorCode::DB_QUERY_ERROR, message);
    }
    
    static DatabaseException transactionError(const std::string& message) {
        return DatabaseException(ErrorCode::DB_TRANSACTION_ERROR, message);
    }
    
    static DatabaseException constraintViolation(const std::string& message) {
        return DatabaseException(ErrorCode::DB_CONSTRAINT_VIOLATION, message);
    }
};

/**
 * Result class to represent either a success value or an error
 */
template<typename T, typename E = AptException>
class Result {
public:
    // Create a success result
    static Result<T, E> success(const T& value) {
        return Result<T, E>(value);
    }
    
    static Result<T, E> success(T&& value) {
        return Result<T, E>(std::move(value));
    }
    
    // Create an error result
    static Result<T, E> error(const E& error) {
        return Result<T, E>(error);
    }
    
    static Result<T, E> error(E&& error) {
        return Result<T, E>(std::move(error));
    }
    
    // Checks if the result is a success
    bool isSuccess() const {
        return std::holds_alternative<T>(variant_);
    }
    
    // Checks if the result is an error
    bool isError() const {
        return std::holds_alternative<E>(variant_);
    }
    
    // Get the success value
    const T& value() const {
        if (!isSuccess()) {
            throw std::runtime_error("Cannot get value from error result");
        }
        return std::get<T>(variant_);
    }
    
    T& value() {
        if (!isSuccess()) {
            throw std::runtime_error("Cannot get value from error result");
        }
        return std::get<T>(variant_);
    }
    
    // Get the error
    const E& error() const {
        if (!isError()) {
            throw std::runtime_error("Cannot get error from success result");
        }
        return std::get<E>(variant_);
    }
    
    E& error() {
        if (!isError()) {
            throw std::runtime_error("Cannot get error from success result");
        }
        return std::get<E>(variant_);
    }
    
    // Map the success value to another type
    template<typename U, typename Func>
    Result<U, E> map(Func&& f) const {
        if (isSuccess()) {
            return Result<U, E>::success(f(value()));
        } else {
            return Result<U, E>::error(error());
        }
    }
    
    // Map the error to another type
    template<typename F, typename Func>
    Result<T, F> mapError(Func&& f) const {
        if (isError()) {
            return Result<T, F>::error(f(error()));
        } else {
            return Result<T, F>::success(value());
        }
    }
    
    // Flat map the success value to another result
    template<typename U, typename Func>
    Result<U, E> flatMap(Func&& f) const {
        if (isSuccess()) {
            return f(value());
        } else {
            return Result<U, E>::error(error());
        }
    }
    
    // Get the success value or a default if it's an error
    T valueOr(const T& defaultValue) const {
        if (isSuccess()) {
            return value();
        } else {
            return defaultValue;
        }
    }
    
    // Apply a function on success or return the provided default on error
    template<typename U, typename Func>
    U fold(const U& defaultValue, Func&& f) const {
        if (isSuccess()) {
            return f(value());
        } else {
            return defaultValue;
        }
    }
    
    // Execute a function on success
    template<typename Func>
    Result<T, E>& onSuccess(Func&& f) {
        if (isSuccess()) {
            f(value());
        }
        return *this;
    }
    
    // Execute a function on error
    template<typename Func>
    Result<T, E>& onError(Func&& f) {
        if (isError()) {
            f(error());
        }
        return *this;
    }
    
private:
    // Construct from success value
    explicit Result(const T& value) : variant_(value) {}
    explicit Result(T&& value) : variant_(std::move(value)) {}
    
    // Construct from error
    explicit Result(const E& error) : variant_(error) {}
    explicit Result(E&& error) : variant_(std::move(error)) {}
    
    std::variant<T, E> variant_;
};

/**
 * Utility to create async tasks that return Result
 */
template<typename T, typename E = AptException>
class Task {
public:
    using ResultType = Result<T, E>;
    using TaskFunction = std::function<ResultType()>;
    
    // Create a task from a function
    static Task<T, E> create(TaskFunction&& function) {
        return Task<T, E>(std::move(function));
    }
    
    // Run the task asynchronously
    std::future<ResultType> runAsync() const {
        return std::async(std::launch::async, function_);
    }
    
    // Run the task synchronously
    ResultType run() const {
        return function_();
    }
    
private:
    explicit Task(TaskFunction&& function) : function_(std::move(function)) {}
    
    TaskFunction function_;
};

/**
 * Error handling utilities
 */
class ErrorHandler {
public:
    using ErrorCallback = std::function<void(const AptException&)>;
    
    // Register a global error handler
    static void registerGlobalHandler(const ErrorCallback& callback) {
        std::lock_guard<std::mutex> lock(mutex_);
        globalHandlers_.push_back(callback);
    }
    
    // Register an error handler for a specific error code
    static void registerHandler(ErrorCode code, const ErrorCallback& callback) {
        std::lock_guard<std::mutex> lock(mutex_);
        codeHandlers_[code].push_back(callback);
    }
    
    // Handle an exception
    static void handleException(const AptException& ex) {
        std::lock_guard<std::mutex> lock(mutex_);
        
        // Call handlers for the specific error code
        auto codeIt = codeHandlers_.find(ex.code());
        if (codeIt != codeHandlers_.end()) {
            for (const auto& handler : codeIt->second) {
                handler(ex);
            }
        }
        
        // Call global handlers
        for (const auto& handler : globalHandlers_) {
            handler(ex);
        }
    }
    
private:
    static std::mutex mutex_;
    static std::vector<ErrorCallback> globalHandlers_;
    static std::unordered_map<ErrorCode, std::vector<ErrorCallback>> codeHandlers_;
};

// Initialize static members
std::mutex ErrorHandler::mutex_;
std::vector<ErrorHandler::ErrorCallback> ErrorHandler::globalHandlers_;
std::unordered_map<ErrorCode, std::vector<ErrorHandler::ErrorCallback>> ErrorHandler::codeHandlers_;

/**
 * Utility class for handling errors in HTTP responses
 */
class HttpErrorHandler {
public:
    // Create a HTTP response from an exception
    static drogon::HttpResponsePtr createErrorResponse(const AptException& ex) {
        // Log the exception
        LOG_ERROR("core", "httpError") << "HTTP error: " << ex.what() << ", code: " << static_cast<int>(ex.code());
        
        // Create JSON response
        nlohmann::json errorJson = {
            {"error", true},
            {"code", static_cast<int>(ex.code())},
            {"message", ex.what()}
        };
        
        // Create response with appropriate status code
        int httpStatus = mapErrorCodeToHttpStatus(ex.code());
        auto resp = drogon::HttpResponse::newHttpJsonResponse(errorJson);
        resp->setStatusCode(static_cast<drogon::HttpStatusCode>(httpStatus));
        
        return resp;
    }
    
    // Create a HTTP response from a generic exception
    static drogon::HttpResponsePtr createErrorResponse(const std::exception& ex) {
        // Log the exception
        LOG_ERROR("core", "httpError") << "Unhandled exception: " << ex.what();
        
        // Create JSON response
        nlohmann::json errorJson = {
            {"error", true},
            {"code", static_cast<int>(ErrorCode::UNKNOWN_ERROR)},
            {"message", ex.what()}
        };
        
        // Create response with 500 status code
        auto resp = drogon::HttpResponse::newHttpJsonResponse(errorJson);
        resp->setStatusCode(drogon::HttpStatusCode::k500InternalServerError);
        
        return resp;
    }
    
private:
    // Map error codes to HTTP status codes
    static int mapErrorCodeToHttpStatus(ErrorCode code) {
        switch (code) {
            case ErrorCode::INVALID_ARGUMENT:
            case ErrorCode::API_REQUEST_VALIDATION_ERROR:
            case ErrorCode::DOC_VALIDATION_ERROR:
            case ErrorCode::SYLLABUS_VALIDATION_ERROR:
            case ErrorCode::ASSESSMENT_VALIDATION_ERROR:
                return 400; // Bad Request
                
            case ErrorCode::USER_AUTHENTICATION_ERROR:
            case ErrorCode::API_AUTHENTICATION_ERROR:
            case ErrorCode::SECURITY_TOKEN_ERROR:
                return 401; // Unauthorized
                
            case ErrorCode::USER_AUTHORIZATION_ERROR:
            case ErrorCode::API_AUTHORIZATION_ERROR:
            case ErrorCode::PERMISSION_DENIED:
                return 403; // Forbidden
                
            case ErrorCode::NOT_FOUND:
            case ErrorCode::API_ENDPOINT_NOT_FOUND:
                return 404; // Not Found
                
            case ErrorCode::API_METHOD_NOT_ALLOWED:
                return 405; // Method Not Allowed
                
            case ErrorCode::API_CONTENT_TYPE_ERROR:
                return 415; // Unsupported Media Type
                
            case ErrorCode::ALREADY_EXISTS:
            case ErrorCode::DB_CONSTRAINT_VIOLATION:
                return 409; // Conflict
                
            case ErrorCode::API_RATE_LIMIT_EXCEEDED:
            case ErrorCode::RESOURCE_EXHAUSTED:
                return 429; // Too Many Requests
                
            case ErrorCode::TIMEOUT:
                return 408; // Request Timeout
                
            case ErrorCode::CANCELLED:
            case ErrorCode::ABORTED:
                return 499; // Client Closed Request
                
            default:
                return 500; // Internal Server Error
        }
    }
};