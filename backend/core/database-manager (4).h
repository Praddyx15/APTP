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
        const std::string& sql, const DbParams& params = {}) override {
        try {
            if (!valid_) {
                return Result<DbQueryResult, AptException>::error(
                    AptException(ErrorCode::DB_TRANSACTION_ERROR, "Transaction is no longer valid")
                );
            }
            
            // Build SQL binder with parameters
            auto binder = transaction_->execSqlRequest(sql);
            for (const auto& param : params) {
                binder << param.second;
            }
            
            // Execute query
            auto result = binder.exec();
            return Result<DbQueryResult, AptException>::success(DbQueryResult(result));
        } catch (const drogon::orm::DbException& e) {
            return Result<DbQueryResult, AptException>::error(
                AptException(ErrorCode::DB_QUERY_ERROR, 
                             "Failed to execute query in transaction: " + std::string(e.base().what()))
            );
        } catch (const std::exception& e) {
            return Result<DbQueryResult, AptException>::error(
                AptException(ErrorCode::DB_QUERY_ERROR, 
                             "Failed to execute query in transaction: " + std::string(e.what()))
            );
        }
    }
    
    bool isValid() const override {
        return valid_;
    }
    
private:
    drogon::orm::TransactionPtr transaction_;
    bool valid_;
};

// Implementation of DatabaseManager constructor
inline DatabaseManager::DatabaseManager(const DbManagerConfig& config)
    : config_(config) {
}

// Implementation of DatabaseManager::initialize
inline Result<void, AptException> DatabaseManager::initialize() {
    try {
        std::lock_guard<std::mutex> lock(clientsMutex_);
        
        // Create clients for each connection
        for (const auto& [name, connConfig] : config_.connections) {
            auto result = createDbClient(name, connConfig);
            if (result.isError()) {
                return Result<void, AptException>::error(result.error());
            }
            
            clients_[name] = result.value();
            connectionTypes_[name] = connConfig.type;
        }
        
        // Run migrations if enabled
        if (config_.migration.autoMigrate) {
            auto migrationResult = runMigrations();
            if (migrationResult.isError()) {
                return migrationResult;
            }
        }
        
        return Result<void, AptException>::success({});
    } catch (const std::exception& e) {
        return Result<void, AptException>::error(
            AptException(ErrorCode::DB_CONNECTION_ERROR, 
                         "Failed to initialize database manager: " + std::string(e.what()))
        );
    }
}

// Implementation of DatabaseManager::runMigrations
inline Result<void, AptException> DatabaseManager::runMigrations() {
    try {
        // Check if migrations directory exists
        std::filesystem::path migrationsPath(config_.migration.migrationsPath);
        if (!std::filesystem::exists(migrationsPath) || !std::filesystem::is_directory(migrationsPath)) {
            return Result<void, AptException>::error(
                AptException(ErrorCode::INVALID_ARGUMENT, 
                             "Migrations directory does not exist: " + config_.migration.migrationsPath)
            );
        }
        
        // Get all migration files and sort them by name
        std::vector<std::filesystem::path> migrationFiles;
        for (const auto& entry : std::filesystem::directory_iterator(migrationsPath)) {
            if (entry.is_regular_file() && entry.path().extension() == ".sql") {
                migrationFiles.push_back(entry.path());
            }
        }
        
        std::sort(migrationFiles.begin(), migrationFiles.end());
        
        // For each connection, run migrations
        for (const auto& [name, client] : clients_) {
            // Create migrations table if it doesn't exist
            std::string createTableSql = "CREATE TABLE IF NOT EXISTS " + 
                config_.migration.migrationTable + 
                " (id SERIAL PRIMARY KEY, version VARCHAR(255) NOT NULL, " +
                "applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP);";
            
            auto createResult = exec(createTableSql, {}, name);
            if (createResult.isError()) {
                return Result<void, AptException>::error(createResult.error());
            }
            
            // Get already applied migrations
            std::string getAppliedSql = "SELECT version FROM " + 
                config_.migration.migrationTable + 
                " ORDER BY version;";
            
            auto getResult = exec(getAppliedSql, {}, name);
            if (getResult.isError()) {
                return Result<void, AptException>::error(getResult.error());
            }
            
            auto appliedResult = getResult.value();
            std::unordered_set<std::string> appliedMigrations;
            
            for (size_t i = 0; i < appliedResult.size(); ++i) {
                auto row = appliedResult.getRowAsJson(i);
                appliedMigrations.insert(row["version"].get<std::string>());
            }
            
            // Run migrations in a transaction
            auto txResult = beginTransaction(name);
            if (txResult.isError()) {
                return Result<void, AptException>::error(txResult.error());
            }
            
            auto tx = txResult.value();
            
            try {
                for (const auto& migrationFile : migrationFiles) {
                    std::string version = migrationFile.stem().string();
                    
                    // Skip if already applied
                    if (appliedMigrations.find(version) != appliedMigrations.end()) {
                        continue;
                    }
                    
                    // Read migration file
                    std::ifstream file(migrationFile);
                    if (!file.is_open()) {
                        return Result<void, AptException>::error(
                            AptException(ErrorCode::INVALID_ARGUMENT, 
                                        "Failed to open migration file: " + migrationFile.string())
                        );
                    }
                    
                    std::string sql((std::istreambuf_iterator<char>(file)),
                                  std::istreambuf_iterator<char>());
                    file.close();
                    
                    // Execute migration
                    auto migrationResult = tx->exec(sql);
                    if (migrationResult.isError()) {
                        tx->rollback();
                        return Result<void, AptException>::error(
                            AptException(ErrorCode::DB_QUERY_ERROR, 
                                        "Failed to apply migration " + version + ": " + 
                                        migrationResult.error().what())
                        );
                    }
                    
                    // Record migration
                    std::string recordSql = "INSERT INTO " + 
                        config_.migration.migrationTable + 
                        " (version) VALUES ($1);";
                    
                    auto recordResult = tx->exec(recordSql, {{"version", version}});
                    if (recordResult.isError()) {
                        tx->rollback();
                        return Result<void, AptException>::error(
                            AptException(ErrorCode::DB_QUERY_ERROR, 
                                        "Failed to record migration " + version + ": " + 
                                        recordResult.error().what())
                        );
                    }
                }
                
                // Commit transaction
                auto commitResult = tx->commit();
                if (commitResult.isError()) {
                    return Result<void, AptException>::error(commitResult.error());
                }
            } catch (const std::exception& e) {
                tx->rollback();
                return Result<void, AptException>::error(
                    AptException(ErrorCode::DB_TRANSACTION_ERROR, 
                                "Failed to run migrations: " + std::string(e.what()))
                );
            }
        }
        
        return Result<void, AptException>::success({});
    } catch (const std::exception& e) {
        return Result<void, AptException>::error(
            AptException(ErrorCode::UNKNOWN_ERROR, 
                         "Failed to run migrations: " + std::string(e.what()))
        );
    }
}

// Implementation of DatabaseManager::getDbClient
inline std::shared_ptr<drogon::orm::DbClient> DatabaseManager::getDbClient(const std::string& connectionName) {
    std::lock_guard<std::mutex> lock(clientsMutex_);
    std::string name = getEffectiveConnectionName(connectionName);
    
    auto it = clients_.find(name);
    if (it == clients_.end()) {
        throw AptException(ErrorCode::INVALID_ARGUMENT, 
                           "Database connection not found: " + name);
    }
    
    return it->second;
}

// Implementation of DatabaseManager::exec
inline Result<DbQueryResult, AptException> DatabaseManager::exec(
    const std::string& sql, 
    const DbParams& params,
    const std::string& connectionName) {
    
    try {
        std::string name = getEffectiveConnectionName(connectionName);
        auto client = getDbClient(name);
        
        // Build SQL binder with parameters
        auto binder = client->execSqlRequest(sql);
        for (const auto& param : params) {
            binder << param.second;
        }
        
        // Execute query
        auto result = binder.exec();
        return Result<DbQueryResult, AptException>::success(DbQueryResult(result));
    } catch (const drogon::orm::DbException& e) {
        return Result<DbQueryResult, AptException>::error(
            AptException(ErrorCode::DB_QUERY_ERROR, 
                         "Failed to execute query: " + std::string(e.base().what()))
        );
    } catch (const std::exception& e) {
        return Result<DbQueryResult, AptException>::error(
            AptException(ErrorCode::DB_QUERY_ERROR, 
                         "Failed to execute query: " + std::string(e.what()))
        );
    }
}

// Implementation of DatabaseManager::execAsync
inline std::future<Result<DbQueryResult, AptException>> DatabaseManager::execAsync(
    const std::string& sql, 
    const DbParams& params,
    const std::string& connectionName) {
    
    return std::async(std::launch::async, [this, sql, params, connectionName]() {
        return exec(sql, params, connectionName);
    });
}

// Implementation of DatabaseManager::beginTransaction
inline Result<std::shared_ptr<Transaction>, AptException> DatabaseManager::beginTransaction(
    const std::string& connectionName) {
    
    try {
        std::string name = getEffectiveConnectionName(connectionName);
        auto client = getDbClient(name);
        
        // Start transaction
        auto transaction = client->newTransaction();
        return Result<std::shared_ptr<Transaction>, AptException>::success(
            std::make_shared<PostgresTransaction>(transaction)
        );
    } catch (const drogon::orm::DbException& e) {
        return Result<std::shared_ptr<Transaction>, AptException>::error(
            AptException(ErrorCode::DB_TRANSACTION_ERROR, 
                         "Failed to begin transaction: " + std::string(e.base().what()))
        );
    } catch (const std::exception& e) {
        return Result<std::shared_ptr<Transaction>, AptException>::error(
            AptException(ErrorCode::DB_TRANSACTION_ERROR, 
                         "Failed to begin transaction: " + std::string(e.what()))
        );
    }
}

// Implementation of DatabaseManager::isConnected
inline bool DatabaseManager::isConnected(const std::string& connectionName) {
    try {
        std::string name = getEffectiveConnectionName(connectionName);
        auto client = getDbClient(name);
        
        // Try a simple query to check connection
        client->execSqlSync("SELECT 1");
        return true;
    } catch (...) {
        return false;
    }
}

// Implementation of DatabaseManager::getDbType
inline DbConnectionType DatabaseManager::getDbType(const std::string& connectionName) {
    std::lock_guard<std::mutex> lock(clientsMutex_);
    std::string name = getEffectiveConnectionName(connectionName);
    
    auto it = connectionTypes_.find(name);
    if (it == connectionTypes_.end()) {
        throw AptException(ErrorCode::INVALID_ARGUMENT, 
                           "Database connection not found: " + name);
    }
    
    return it->second;
}

// Implementation of DatabaseManager::createDbClient
inline Result<std::shared_ptr<drogon::orm::DbClient>, AptException> DatabaseManager::createDbClient(
    const std::string& connectionName,
    const DbConnectionConfig& config) {
    
    try {
        std::string connStr;
        
        // If explicit connection string is provided, use it
        if (!config.connectionString.empty()) {
            connStr = config.connectionString;
        } else {
            // Otherwise, build connection string based on type
            switch (config.type) {
                case DbConnectionType::POSTGRESQL:
                case DbConnectionType::TIMESCALEDB:
                    connStr = "postgresql://";
                    if (!config.username.empty()) {
                        connStr += config.username;
                        if (!config.password.empty()) {
                            connStr += ":" + config.password;
                        }
                        connStr += "@";
                    }
                    connStr += config.host;
                    if (config.port > 0) {
                        connStr += ":" + std::to_string(config.port);
                    }
                    connStr += "/" + config.database;
                    
                    // Add options
                    if (config.enableSSL) {
                        connStr += "?sslmode=require";
                    }
                    
                    break;
                    
                case DbConnectionType::MYSQL:
                    connStr = "mysql://";
                    if (!config.username.empty()) {
                        connStr += config.username;
                        if (!config.password.empty()) {
                            connStr += ":" + config.password;
                        }
                        connStr += "@";
                    }
                    connStr += config.host;
                    if (config.port > 0) {
                        connStr += ":" + std::to_string(config.port);
                    }
                    connStr += "/" + config.database;
                    break;
                    
                case DbConnectionType::SQLITE:
                    connStr = "sqlite3://" + config.database;
                    break;
            }
        }
        
        // Create client
        auto client = drogon::orm::DbClient::newDbClient(connStr, 
                                                       config.type == DbConnectionType::MYSQL ?
                                                           drogon::orm::ClientType::MySQL :
                                                       config.type == DbConnectionType::SQLITE ?
                                                           drogon::orm::ClientType::Sqlite :
                                                           drogon::orm::ClientType::PostgreSQL,
                                                       config.poolSize);
        
        return Result<std::shared_ptr<drogon::orm::DbClient>, AptException>::success(client);
    } catch (const drogon::orm::DbException& e) {
        return Result<std::shared_ptr<drogon::orm::DbClient>, AptException>::error(
            AptException(ErrorCode::DB_CONNECTION_ERROR, 
                         "Failed to create database client: " + std::string(e.base().what()))
        );
    } catch (const std::exception& e) {
        return Result<std::shared_ptr<drogon::orm::DbClient>, AptException>::error(
            AptException(ErrorCode::DB_CONNECTION_ERROR, 
                         "Failed to create database client: " + std::string(e.what()))
        );
    }
}

// Implementation of DatabaseManager::getEffectiveConnectionName
inline std::string DatabaseManager::getEffectiveConnectionName(const std::string& connectionName) {
    return connectionName.empty() ? config_.defaultConnection : connectionName;
}

} // namespace db
} // namespace apt
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