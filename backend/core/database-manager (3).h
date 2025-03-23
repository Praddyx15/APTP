#pragma once

#include <string>
#include <memory>
#include <vector>
#include <unordered_map>
#include <optional>
#include <mutex>
#include <future>
#include <chrono>

#include <drogon/drogon.h>
#include <nlohmann/json.hpp>

#include "../core/error-handling.hpp"
#include "../core/logging-system.hpp"

namespace apt {
namespace db {

/**
 * Database connection type
 */
enum class DbConnectionType {
    POSTGRESQL,
    MYSQL,
    SQLITE,
    TIMESCALEDB
};

/**
 * Database connection configuration
 */
struct DbConnectionConfig {
    DbConnectionType type = DbConnectionType::POSTGRESQL;
    std::string host = "localhost";
    int port = 5432; // Default for PostgreSQL
    std::string database;
    std::string username;
    std::string password;
    std::string connectionString;
    int poolSize = 5;
    std::chrono::seconds connectionTimeout = std::chrono::seconds(10);
    bool enableSSL = false;
    std::unordered_map<std::string, std::string> options;
};

/**
 * Database migration configuration
 */
struct DbMigrationConfig {
    std::string migrationsPath = "./migrations";
    bool autoMigrate = false;
    std::string migrationTable = "schema_migrations";
};

/**
 * Database manager configuration
 */
struct DbManagerConfig {
    std::unordered_map<std::string, DbConnectionConfig> connections;
    std::string defaultConnection = "default";
    DbMigrationConfig migration;
    bool enablePreparedStatements = true;
    bool enableTransactionLog = true;
};

/**
 * Database query parameters
 */
using DbParams = std::vector<std::pair<std::string, drogon::orm::SqlBinder::StoreInSqlString>>;

/**
 * Database query result
 */
class DbQueryResult {
public:
    DbQueryResult(const drogon::orm::Result& result) : result_(result) {}
    
    /**
     * Check if the result is empty
     */
    bool empty() const { return result_.empty(); }
    
    /**
     * Get the number of rows in the result
     */
    size_t size() const { return result_.size(); }
    
    /**
     * Get a row as a JSON object
     */
    nlohmann::json getRowAsJson(size_t index) const {
        if (index >= result_.size()) {
            throw AptException(ErrorCode::INVALID_ARGUMENT, 
                               "Row index out of bounds: " + std::to_string(index));
        }
        
        nlohmann::json row = nlohmann::json::object();
        for (auto field : result_[index]) {
            if (field.isNull()) {
                row[field.name()] = nullptr;
            } else {
                switch (field.type()) {
                    case drogon::orm::SqlNull:
                        row[field.name()] = nullptr;
                        break;
                    case drogon::orm::SqlTinyInt:
                    case drogon::orm::SqlSmallInt:
                    case drogon::orm::SqlInteger:
                        row[field.name()] = field.as<int32_t>();
                        break;
                    case drogon::orm::SqlBigInt:
                        row[field.name()] = field.as<int64_t>();
                        break;
                    case drogon::orm::SqlReal:
                    case drogon::orm::SqlFloat:
                    case drogon::orm::SqlDouble:
                        row[field.name()] = field.as<double>();
                        break;
                    case drogon::orm::SqlText:
                    case drogon::orm::SqlChar:
                    case drogon::orm::SqlVarchar:
                        row[field.name()] = field.as<std::string>();
                        break;
                    case drogon::orm::SqlTimestamp:
                        row[field.name()] = field.as<std::string>();
                        break;
                    case drogon::orm::SqlBoolean:
                        row[field.name()] = field.as<bool>();
                        break;
                    case drogon::orm::SqlOther:
                    default:
                        // For JSON, JSONB, arrays, etc.
                        row[field.name()] = field.as<std::string>();
                        break;
                }
            }
        }
        
        return row;
    }
    
    /**
     * Get all rows as a JSON array
     */
    nlohmann::json getAllRowsAsJson() const {
        nlohmann::json rows = nlohmann::json::array();
        for (size_t i = 0; i < result_.size(); ++i) {
            rows.push_back(getRowAsJson(i));
        }
        return rows;
    }
    
    /**
     * Get the underlying Drogon result
     */
    const drogon::orm::Result& getResult() const { return result_; }
    
private:
    drogon::orm::Result result_;
};

/**
 * Transaction interface
 */
class Transaction {
public:
    virtual ~Transaction() {}
    
    /**
     * Commit the transaction
     */
    virtual Result<void, AptException> commit() = 0;
    
    /**
     * Rollback the transaction
     */
    virtual Result<void, AptException> rollback() = 0;
    
    /**
     * Execute a SQL query within the transaction
     */
    virtual Result<DbQueryResult, AptException> exec(
        const std::string& sql, const DbParams& params = {}) = 0;
    
    /**
     * Check if the transaction is still valid
     */
    virtual bool isValid() const = 0;
};

/**
 * Database manager class for the Advanced Pilot Training Platform
 */
class DatabaseManager {
public:
    /**
     * Constructor
     */
    explicit DatabaseManager(const DbManagerConfig& config);
    
    /**
     * Initialize the database manager
     */
    Result<void, AptException> initialize();
    
    /**
     * Run database migrations
     */
    Result<void, AptException> runMigrations();
    
    /**
     * Get a database client for a specific connection
     */
    std::shared_ptr<drogon::orm::DbClient> getDbClient(const std::string& connectionName = "");
    
    /**
     * Execute a SQL query
     */
    Result<DbQueryResult, AptException> exec(
        const std::string& sql, 
        const DbParams& params = {},
        const std::string& connectionName = "");
    
    /**
     * Execute a SQL query asynchronously
     */
    std::future<Result<DbQueryResult, AptException>> execAsync(
        const std::string& sql, 
        const DbParams& params = {},
        const std::string& connectionName = "");
    
    /**
     * Begin a transaction
     */
    Result<std::shared_ptr<Transaction>, AptException> beginTransaction(
        const std::string& connectionName = "");
    
    /**
     * Check if the database is connected
     */
    bool isConnected(const std::string& connectionName = "");
    
    /**
     * Get the database type
     */
    DbConnectionType getDbType(const std::string& connectionName = "");
    
private:
    DbManagerConfig config_;
    std::mutex clientsMutex_;
    std::unordered_map<std::string, std::shared_ptr<drogon::orm::DbClient>> clients_;
    std::unordered_map<std::string, DbConnectionType> connectionTypes_;
    
    /**
     * Create a database client for a connection
     */
    Result<std::shared_ptr<drogon::orm::DbClient>, AptException> createDbClient(
        const std::string& connectionName,
        const DbConnectionConfig& config);
    
    /**
     * Get the effective connection name
     */
    std::string getEffectiveConnectionName(const std::string& connectionName);
};

/**
 * Implementation of Transaction for PostgreSQL
 */
class PostgresTransaction : public Transaction {
public:
    PostgresTransaction(drogon::orm::TransactionPtr transaction)
        : transaction_(transaction), valid_(true) {}
    
    Result<void, AptException> commit() override {
        try {
            if (!valid_) {
                return Result<void, AptException>::error(
                    AptException(ErrorCode::DB_TRANSACTION_ERROR, "Transaction is no longer valid")
                );
            }
            
            transaction_->commit();
            valid_ = false;
            return Result<void, AptException>::success({});
        } catch (const drogon::orm::DbException& e) {
            valid_ = false;
            return Result<void, AptException>::error(
                AptException(ErrorCode::DB_TRANSACTION_ERROR, 
                             "Failed to commit transaction: " + std::string(e.base().what()))
            );
        } catch (const std::exception& e) {
            valid_ = false;
            return Result<void, AptException>::error(
                AptException(ErrorCode::DB_TRANSACTION_ERROR, 
                             "Failed to commit transaction: " + std::string(e.what()))
            );
        }
    }
    
    Result<void, AptException> rollback() override {
        try {
            if (!valid_) {
                return Result<void, AptException>::error(
                    AptException(ErrorCode::DB_TRANSACTION_ERROR, "Transaction is no longer valid")
                );
            }
            
            transaction_->rollback();
            valid_ = false;
            return Result<void, AptException>::success({});
        } catch (const drogon::orm::DbException& e) {
            valid_ = false;
            return Result<void, AptException>::error(
                AptException(ErrorCode::DB_TRANSACTION_ERROR, 
                             "Failed to rollback transaction: " + std::string(e.base().what()))
            );
        } catch (const std::exception& e) {
            valid_ = false;
            return Result<void, AptException>::error(
                AptException(ErrorCode::DB_TRANSACTION_ERROR, 
                             "Failed to rollback transaction: " + std::string(e.what()))
            );
        }
    }
    
    Result<DbQueryResult, AptException> exec(