// backend/core/include/DatabaseManager.h
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <future>
#include <optional>
#include <functional>
#include <tuple>
#include <unordered_map>
#include <variant>
#include <chrono>
#include <mutex>
#include <shared_mutex>

#include "core/include/ErrorHandling.h"

namespace APTP::Core {

// Database value types
using DbValue = std::variant<
    std::nullptr_t,
    int64_t,
    double,
    std::string,
    bool,
    std::vector<uint8_t>,
    std::chrono::system_clock::time_point
>;

// Database row type
using DbRow = std::vector<DbValue>;

// Database result set
struct DbResultSet {
    std::vector<std::string> columnNames;
    std::vector<DbRow> rows;
    
    size_t rowCount() const { return rows.size(); }
    size_t columnCount() const { return columnNames.size(); }
    
    template<typename T>
    std::optional<T> getValue(size_t row, size_t column) const {
        if (row >= rows.size() || column >= columnNames.size()) {
            return std::nullopt;
        }
        
        try {
            return std::get<T>(rows[row][column]);
        } catch (const std::bad_variant_access&) {
            return std::nullopt;
        }
    }
    
    template<typename T>
    std::optional<T> getValue(size_t row, const std::string& columnName) const {
        auto it = std::find(columnNames.begin(), columnNames.end(), columnName);
        if (it == columnNames.end()) {
            return std::nullopt;
        }
        
        size_t column = std::distance(columnNames.begin(), it);
        return getValue<T>(row, column);
    }
};

// Database connection parameters
struct DbConnectionParams {
    std::string host;
    uint16_t port;
    std::string dbName;
    std::string username;
    std::string password;
    std::string connectionString;
    std::chrono::seconds connectionTimeout = std::chrono::seconds(30);
    std::chrono::seconds commandTimeout = std::chrono::seconds(30);
    bool useSsl = false;
    std::string sslMode = "require";
    std::string sslCertPath;
    std::string sslKeyPath;
    std::string sslRootCertPath;
    
    // Helper method to build connection string
    std::string buildConnectionString() const {
        if (!connectionString.empty()) {
            return connectionString;
        }
        
        std::string connStr = "host=" + host + 
                             " port=" + std::to_string(port) + 
                             " dbname=" + dbName + 
                             " user=" + username + 
                             " password=" + password;
        
        if (useSsl) {
            connStr += " sslmode=" + sslMode;
            
            if (!sslCertPath.empty()) {
                connStr += " sslcert=" + sslCertPath;
            }
            
            if (!sslKeyPath.empty()) {
                connStr += " sslkey=" + sslKeyPath;
            }
            
            if (!sslRootCertPath.empty()) {
                connStr += " sslrootcert=" + sslRootCertPath;
            }
        }
        
        return connStr;
    }
};

// Transaction isolation level
enum class TransactionIsolationLevel {
    ReadUncommitted,
    ReadCommitted,
    RepeatableRead,
    Serializable
};

// Forward declarations
class DbConnection;
class DbTransaction;
class DbCommand;
class DbParameter;

// Database connection interface
class DbConnection {
public:
    virtual ~DbConnection() = default;
    
    // Open the connection
    virtual APTP::Core::Result<void> open() = 0;
    
    // Close the connection
    virtual APTP::Core::Result<void> close() = 0;
    
    // Check if connection is open
    virtual bool isOpen() const = 0;
    
    // Begin a transaction
    virtual APTP::Core::Result<std::unique_ptr<DbTransaction>> beginTransaction(
        TransactionIsolationLevel isolationLevel = TransactionIsolationLevel::ReadCommitted) = 0;
    
    // Create a command
    virtual std::unique_ptr<DbCommand> createCommand(const std::string& commandText) = 0;
    
    // Execute a command directly
    virtual APTP::Core::Result<DbResultSet> executeQuery(const std::string& commandText) = 0;
    virtual APTP::Core::Result<int64_t> executeNonQuery(const std::string& commandText) = 0;
    virtual APTP::Core::Result<DbValue> executeScalar(const std::string& commandText) = 0;
    
    // Execute a command asynchronously
    virtual std::future<APTP::Core::Result<DbResultSet>> executeQueryAsync(const std::string& commandText) = 0;
    virtual std::future<APTP::Core::Result<int64_t>> executeNonQueryAsync(const std::string& commandText) = 0;
    virtual std::future<APTP::Core::Result<DbValue>> executeScalarAsync(const std::string& commandText) = 0;
    
    // Get last error
    virtual std::string getLastError() const = 0;
};

// Database transaction interface
class DbTransaction {
public:
    virtual ~DbTransaction() = default;
    
    // Commit the transaction
    virtual APTP::Core::Result<void> commit() = 0;
    
    // Rollback the transaction
    virtual APTP::Core::Result<void> rollback() = 0;
    
    // Check if transaction is active
    virtual bool isActive() const = 0;
};

// Database command interface
class DbCommand {
public:
    virtual ~DbCommand() = default;
    
    // Set command text
    virtual void setCommandText(const std::string& commandText) = 0;
    
    // Set command timeout
    virtual void setCommandTimeout(std::chrono::seconds timeout) = 0;
    
    // Add a parameter
    virtual void addParameter(const std::string& name, const DbValue& value) = 0;
    
    // Clear parameters
    virtual void clearParameters() = 0;
    
    // Execute the command
    virtual APTP::Core::Result<DbResultSet> executeQuery() = 0;
    virtual APTP::Core::Result<int64_t> executeNonQuery() = 0;
    virtual APTP::Core::Result<DbValue> executeScalar() = 0;
    
    // Execute the command asynchronously
    virtual std::future<APTP::Core::Result<DbResultSet>> executeQueryAsync() = 0;
    virtual std::future<APTP::Core::Result<int64_t>> executeNonQueryAsync() = 0;
    virtual std::future<APTP::Core::Result<DbValue>> executeScalarAsync() = 0;
};

// Database migration interface
class DbMigration {
public:
    virtual ~DbMigration() = default;
    
    // Get migration version
    virtual std::string getVersion() const = 0;
    
    // Get migration description
    virtual std::string getDescription() const = 0;
    
    // Get up migration SQL
    virtual std::string getUpMigration() const = 0;
    
    // Get down migration SQL
    virtual std::string getDownMigration() const = 0;
};

// Database connection pool
class DbConnectionPool {
public:
    static DbConnectionPool& getInstance();
    
    // Initialize the connection pool
    APTP::Core::Result<void> initialize(const DbConnectionParams& params, size_t minPoolSize = 5, size_t maxPoolSize = 20);
    
    // Get a connection from the pool
    APTP::Core::Result<std::shared_ptr<DbConnection>> getConnection();
    
    // Return a connection to the pool
    void returnConnection(std::shared_ptr<DbConnection> connection);
    
    // Get pool statistics
    size_t getAvailableConnectionsCount() const;
    size_t getActiveConnectionsCount() const;
    size_t getTotalConnectionsCount() const;

private:
    DbConnectionPool();
    ~DbConnectionPool();
    
    struct Impl;
    std::unique_ptr<Impl> impl_;
};

// Database manager for PostgreSQL
class PostgreSQLManager {
public:
    static PostgreSQLManager& getInstance();
    
    // Initialize the database manager
    APTP::Core::Result<void> initialize(const DbConnectionParams& params);
    
    // Run migrations
    APTP::Core::Result<void> runMigrations(const std::string& migrationsPath);
    APTP::Core::Result<void> runMigrationUp(const DbMigration& migration);
    APTP::Core::Result<void> runMigrationDown(const DbMigration& migration);
    
    // Execute a query
    APTP::Core::Result<DbResultSet> executeQuery(const std::string& sql);
    APTP::Core::Result<int64_t> executeNonQuery(const std::string& sql);
    APTP::Core::Result<DbValue> executeScalar(const std::string& sql);
    
    // Execute a parameterized query
    APTP::Core::Result<DbResultSet> executeQuery(
        const std::string& sql, 
        const std::unordered_map<std::string, DbValue>& parameters);
    
    APTP::Core::Result<int64_t> executeNonQuery(
        const std::string& sql, 
        const std::unordered_map<std::string, DbValue>& parameters);
    
    APTP::Core::Result<DbValue> executeScalar(
        const std::string& sql, 
        const std::unordered_map<std::string, DbValue>& parameters);
    
    // Execute in a transaction
    template<typename Func>
    APTP::Core::Result<std::invoke_result_t<Func, std::shared_ptr<DbConnection>&, std::unique_ptr<DbTransaction>&>> 
    executeInTransaction(Func&& func, TransactionIsolationLevel isolationLevel = TransactionIsolationLevel::ReadCommitted) {
        auto connResult = DbConnectionPool::getInstance().getConnection();
        if (connResult.isError()) {
            return APTP::Core::Error<std::invoke_result_t<Func, std::shared_ptr<DbConnection>&, std::unique_ptr<DbTransaction>&>>(
                APTP::Core::ErrorCode::ResourceUnavailable);
        }
        
        auto conn = connResult.value();
        auto txResult = conn->beginTransaction(isolationLevel);
        if (txResult.isError()) {
            DbConnectionPool::getInstance().returnConnection(conn);
            return APTP::Core::Error<std::invoke_result_t<Func, std::shared_ptr<DbConnection>&, std::unique_ptr<DbTransaction>&>>(
                APTP::Core::ErrorCode::ResourceUnavailable);
        }
        
        auto tx = std::move(txResult.value());
        
        try {
            auto result = func(conn, tx);
            auto commitResult = tx->commit();
            
            if (commitResult.isError()) {
                tx->rollback();
                DbConnectionPool::getInstance().returnConnection(conn);
                return APTP::Core::Error<std::invoke_result_t<Func, std::shared_ptr<DbConnection>&, std::unique_ptr<DbTransaction>&>>(
                    APTP::Core::ErrorCode::ResourceUnavailable);
            }
            
            DbConnectionPool::getInstance().returnConnection(conn);
            return APTP::Core::Success(result);
        } catch (const std::exception& e) {
            tx->rollback();
            DbConnectionPool::getInstance().returnConnection(conn);
            return APTP::Core::Error<std::invoke_result_t<Func, std::shared_ptr<DbConnection>&, std::unique_ptr<DbTransaction>&>>(
                APTP::Core::ErrorCode::ResourceUnavailable);
        }
    }
    
    // Get database schema information
    APTP::Core::Result<std::vector<std::string>> getTables();
    APTP::Core::Result<std::vector<std::string>> getViews();
    APTP::Core::Result<std::vector<std::tuple<std::string, std::string, std::string>>> getColumns(const std::string& table);

private:
    PostgreSQLManager();
    ~PostgreSQLManager();
    
    struct Impl;
    std::unique_ptr<Impl> impl_;
};

// TimescaleDB manager for time-series data
class TimescaleDBManager {
public:
    static TimescaleDBManager& getInstance();
    
    // Initialize the TimescaleDB manager
    APTP::Core::Result<void> initialize(const DbConnectionParams& params);
    
    // Create a hypertable
    APTP::Core::Result<void> createHypertable(
        const std::string& tableName, 
        const std::string& timeColumn,
        const std::string& partitioningColumn = "",
        int64_t chunkTimeInterval = 86400000000); // Default 1 day in microseconds
    
    // Insert time-series data
    template<typename T>
    APTP::Core::Result<int64_t> insertTimeSeriesData(
        const std::string& tableName,
        const std::string& timeColumn,
        const std::chrono::system_clock::time_point& timestamp,
        const std::unordered_map<std::string, T>& values) {
        
        // Construct the SQL query
        std::string columns = timeColumn;
        std::string placeholders = "$1";
        
        int paramIndex = 2;
        for (const auto& [column, _] : values) {
            columns += ", " + column;
            placeholders += ", $" + std::to_string(paramIndex++);
        }
        
        std::string sql = "INSERT INTO " + tableName + " (" + columns + ") VALUES (" + placeholders + ")";
        
        // Prepare parameters
        std::unordered_map<std::string, DbValue> parameters;
        
        // Convert timestamp to database value
        parameters["$1"] = timestamp;
        
        // Add other values
        paramIndex = 2;
        for (const auto& [column, value] : values) {
            parameters["$" + std::to_string(paramIndex++)] = value;
        }
        
        // Execute the query
        return PostgreSQLManager::getInstance().executeNonQuery(sql, parameters);
    }
    
    // Query time-series data with time range
    APTP::Core::Result<DbResultSet> queryTimeSeriesData(
        const std::string& tableName,
        const std::string& timeColumn,
        const std::chrono::system_clock::time_point& startTime,
        const std::chrono::system_clock::time_point& endTime,
        const std::vector<std::string>& selectColumns = {},
        const std::string& orderBy = "",
        size_t limit = 0);
    
    // Aggregate time-series data with time buckets
    APTP::Core::Result<DbResultSet> aggregateTimeSeriesData(
        const std::string& tableName,
        const std::string& timeColumn,
        const std::string& bucketSize, // e.g., '1 hour', '5 minutes'
        const std::chrono::system_clock::time_point& startTime,
        const std::chrono::system_clock::time_point& endTime,
        const std::vector<std::pair<std::string, std::string>>& aggregations, // (column, function)
        const std::vector<std::string>& groupByColumns = {});
    
    // Create a continuous aggregate
    APTP::Core::Result<void> createContinuousAggregate(
        const std::string& viewName,
        const std::string& query,
        const std::string& refreshInterval = "1 hour");

private:
    TimescaleDBManager();
    ~TimescaleDBManager();
    
    struct Impl;
    std::unique_ptr<Impl> impl_;
};

} // namespace APTP::Core

// backend/core/src/DatabaseManager.cpp (partial implementation)
#include "DatabaseManager.h"
#include "Logger.h"
#include <memory>
#include <queue>
#include <pqxx/pqxx>

namespace APTP::Core {

// Implementation of DbConnectionPool
struct DbConnectionPool::Impl {
    DbConnectionParams connectionParams;
    size_t minPoolSize;
    size_t maxPoolSize;
    
    std::queue<std::shared_ptr<DbConnection>> availableConnections;
    std::unordered_map<DbConnection*, std::shared_ptr<DbConnection>> activeConnections;
    
    mutable std::shared_mutex mutex;
    
    bool initialized = false;
    
    // Helper to create a new connection
    APTP::Core::Result<std::shared_ptr<DbConnection>> createConnection() {
        try {
            // This would create a PostgreSQL connection
            // For this example, we'll use a simplified implementation
            
            // The actual implementation would use pqxx to create a connection
            
            return APTP::Core::Success(std::shared_ptr<DbConnection>(nullptr));
        } catch (const std::exception& e) {
            APTP::Core::Logger::getInstance().error("Failed to create database connection: {}", e.what());
            return APTP::Core::Error<std::shared_ptr<DbConnection>>(APTP::Core::ErrorCode::ResourceUnavailable);
        }
    }
};

DbConnectionPool& DbConnectionPool::getInstance() {
    static DbConnectionPool instance;
    return instance;
}

DbConnectionPool::DbConnectionPool() : impl_(std::make_unique<Impl>()) {}
DbConnectionPool::~DbConnectionPool() = default;

APTP::Core::Result<void> DbConnectionPool::initialize(const DbConnectionParams& params, size_t minPoolSize, size_t maxPoolSize) {
    std::unique_lock<std::shared_mutex> lock(impl_->mutex);
    
    if (impl_->initialized) {
        return APTP::Core::Success();
    }
    
    impl_->connectionParams = params;
    impl_->minPoolSize = minPoolSize;
    impl_->maxPoolSize = maxPoolSize;
    
    // Create initial connections
    for (size_t i = 0; i < minPoolSize; ++i) {
        auto connResult = impl_->createConnection();
        if (connResult.isSuccess()) {
            impl_->availableConnections.push(connResult.value());
        } else {
            APTP::Core::Logger::getInstance().warning("Failed to create initial connection {}/{}", i + 1, minPoolSize);
        }
    }
    
    impl_->initialized = true;
    
    APTP::Core::Logger::getInstance().info(
        "Initialized database connection pool (min={}, max={})", 
        minPoolSize, maxPoolSize);
    
    return APTP::Core::Success();
}

APTP::Core::Result<std::shared_ptr<DbConnection>> DbConnectionPool::getConnection() {
    std::unique_lock<std::shared_mutex> lock(impl_->mutex);
    
    if (!impl_->initialized) {
        return APTP::Core::Error<std::shared_ptr<DbConnection>>(APTP::Core::ErrorCode::InvalidState);
    }
    
    // Check if there's an available connection
    if (!impl_->availableConnections.empty()) {
        auto conn = impl_->availableConnections.front();
        impl_->availableConnections.pop();
        impl_->activeConnections[conn.get()] = conn;
        return APTP::Core::Success(conn);
    }
    
    // Check if we can create a new connection
    if (impl_->activeConnections.size() < impl_->maxPoolSize) {
        auto connResult = impl_->createConnection();
        if (connResult.isSuccess()) {
            auto conn = connResult.value();
            impl_->activeConnections[conn.get()] = conn;
            return APTP::Core::Success(conn);
        } else {
            return connResult;
        }
    }
    
    // Pool is exhausted
    return APTP::Core::Error<std::shared_ptr<DbConnection>>(APTP::Core::ErrorCode::ResourceUnavailable);
}

void DbConnectionPool::returnConnection(std::shared_ptr<DbConnection> connection) {
    if (!connection) {
        return;
    }
    
    std::unique_lock<std::shared_mutex> lock(impl_->mutex);
    
    auto it = impl_->activeConnections.find(connection.get());
    if (it != impl_->activeConnections.end()) {
        impl_->activeConnections.erase(it);
        
        // Make sure connection is healthy before returning it to the pool
        if (connection->isOpen()) {
            impl_->availableConnections.push(connection);
        } else {
            // Try to reopen the connection
            auto openResult = connection->open();
            if (openResult.isSuccess()) {
                impl_->availableConnections.push(connection);
            } else {
                // Connection is unusable, discard it
                APTP::Core::Logger::getInstance().warning("Discarded unhealthy database connection");
            }
        }
    }
}

size_t DbConnectionPool::getAvailableConnectionsCount() const {
    std::shared_lock<std::shared_mutex> lock(impl_->mutex);
    return impl_->availableConnections.size();
}

size_t DbConnectionPool::getActiveConnectionsCount() const {
    std::shared_lock<std::shared_mutex> lock(impl_->mutex);
    return impl_->activeConnections.size();
}

size_t DbConnectionPool::getTotalConnectionsCount() const {
    std::shared_lock<std::shared_mutex> lock(impl_->mutex);
    return impl_->availableConnections.size() + impl_->activeConnections.size();
}

// Implementation of PostgreSQLManager
struct PostgreSQLManager::Impl {
    DbConnectionParams connectionParams;
    bool initialized = false;
    
    std::unordered_map<std::string, std::string> preparedStatements;
    mutable std::shared_mutex mutex;
    
    // Helper to execute a query with connection from pool
    template<typename Func>
    auto executeWithConnection(Func&& func) -> decltype(func(std::declval<std::shared_ptr<DbConnection>&>())) {
        auto connResult = DbConnectionPool::getInstance().getConnection();
        if (connResult.isError()) {
            using ResultType = decltype(func(std::declval<std::shared_ptr<DbConnection>&>()));
            return APTP::Core::Error<typename ResultType::value_type>(APTP::Core::ErrorCode::ResourceUnavailable);
        }
        
        auto conn = connResult.value();
        auto result = func(conn);
        
        DbConnectionPool::getInstance().returnConnection(conn);
        return result;
    }
};

PostgreSQLManager& PostgreSQLManager::getInstance() {
    static PostgreSQLManager instance;
    return instance;
}

PostgreSQLManager::PostgreSQLManager() : impl_(std::make_unique<Impl>()) {}
PostgreSQLManager::~PostgreSQLManager() = default;

APTP::Core::Result<void> PostgreSQLManager::initialize(const DbConnectionParams& params) {
    std::unique_lock<std::shared_mutex> lock(impl_->mutex);
    
    if (impl_->initialized) {
        return APTP::Core::Success();
    }
    
    impl_->connectionParams = params;
    
    // Initialize the connection pool
    auto poolInitResult = DbConnectionPool::getInstance().initialize(params);
    if (poolInitResult.isError()) {
        return poolInitResult;
    }
    
    impl_->initialized = true;
    
    APTP::Core::Logger::getInstance().info(
        "Initialized PostgreSQL manager (host={}, db={})", 
        params.host, params.dbName);
    
    return APTP::Core::Success();
}

APTP::Core::Result<void> PostgreSQLManager::runMigrations(const std::string& migrationsPath) {
    // This would scan the migrations path and run all migrations in order
    // For this example, we'll provide a stub implementation
    
    APTP::Core::Logger::getInstance().info("Running migrations from {}", migrationsPath);
    
    // In a real implementation, this would:
    // 1. Create a migrations table if it doesn't exist
    // 2. Scan the migrations directory for SQL files
    // 3. Parse migration versions from filenames
    // 4. Check which migrations have already been applied
    // 5. Apply new migrations in version order
    
    return APTP::Core::Success();
}

APTP::Core::Result<DbResultSet> PostgreSQLManager::executeQuery(const std::string& sql) {
    return impl_->executeWithConnection([&](std::shared_ptr<DbConnection>& conn) {
        return conn->executeQuery(sql);
    });
}

APTP::Core::Result<int64_t> PostgreSQLManager::executeNonQuery(const std::string& sql) {
    return impl_->executeWithConnection([&](std::shared_ptr<DbConnection>& conn) {
        return conn->executeNonQuery(sql);
    });
}

APTP::Core::Result<DbValue> PostgreSQLManager::executeScalar(const std::string& sql) {
    return impl_->executeWithConnection([&](std::shared_ptr<DbConnection>& conn) {
        return conn->executeScalar(sql);
    });
}

APTP::Core::Result<DbResultSet> PostgreSQLManager::executeQuery(
    const std::string& sql, 
    const std::unordered_map<std::string, DbValue>& parameters) {
    
    return impl_->executeWithConnection([&](std::shared_ptr<DbConnection>& conn) {
        auto cmd = conn->createCommand(sql);
        
        for (const auto& [name, value] : parameters) {
            cmd->addParameter(name, value);
        }
        
        return cmd->executeQuery();
    });
}

APTP::Core::Result<int64_t> PostgreSQLManager::executeNonQuery(
    const std::string& sql, 
    const std::unordered_map<std::string, DbValue>& parameters) {
    
    return impl_->executeWithConnection([&](std::shared_ptr<DbConnection>& conn) {
        auto cmd = conn->createCommand(sql);
        
        for (const auto& [name, value] : parameters) {
            cmd->addParameter(name, value);
        }
        
        return cmd->executeNonQuery();
    });
}

APTP::Core::Result<DbValue> PostgreSQLManager::executeScalar(
    const std::string& sql, 
    const std::unordered_map<std::string, DbValue>& parameters) {
    
    return impl_->executeWithConnection([&](std::shared_ptr<DbConnection>& conn) {
        auto cmd = conn->createCommand(sql);
        
        for (const auto& [name, value] : parameters) {
            cmd->addParameter(name, value);
        }
        
        return cmd->executeScalar();
    });
}

APTP::Core::Result<std::vector<std::string>> PostgreSQLManager::getTables() {
    const std::string sql = 
        "SELECT table_name FROM information_schema.tables "
        "WHERE table_schema = 'public' AND table_type = 'BASE TABLE' "
        "ORDER BY table_name";
    
    auto result = executeQuery(sql);
    if (result.isError()) {
        return APTP::Core::Error<std::vector<std::string>>(APTP::Core::ErrorCode::ResourceUnavailable);
    }
    
    std::vector<std::string> tables;
    const auto& resultSet = result.value();
    
    for (size_t i = 0; i < resultSet.rowCount(); ++i) {
        auto tableName = resultSet.getValue<std::string>(i, 0);
        if (tableName.has_value()) {
            tables.push_back(*tableName);
        }
    }
    
    return APTP::Core::Success(tables);
}

APTP::Core::Result<std::vector<std::string>> PostgreSQLManager::getViews() {
    const std::string sql = 
        "SELECT table_name FROM information_schema.views "
        "WHERE table_schema = 'public' "
        "ORDER BY table_name";
    
    auto result = executeQuery(sql);
    if (result.isError()) {
        return APTP::Core::Error<std::vector<std::string>>(APTP::Core::ErrorCode::ResourceUnavailable);
    }
    
    std::vector<std::string> views;
    const auto& resultSet = result.value();
    
    for (size_t i = 0; i < resultSet.rowCount(); ++i) {
        auto viewName = resultSet.getValue<std::string>(i, 0);
        if (viewName.has_value()) {
            views.push_back(*viewName);
        }
    }
    
    return APTP::Core::Success(views);
}

APTP::Core::Result<std::vector<std::tuple<std::string, std::string, std::string>>> 
PostgreSQLManager::getColumns(const std::string& table) {
    const std::string sql = 
        "SELECT column_name, data_type, is_nullable "
        "FROM information_schema.columns "
        "WHERE table_schema = 'public' AND table_name = $1 "
        "ORDER BY ordinal_position";
    
    std::unordered_map<std::string, DbValue> parameters;
    parameters["$1"] = table;
    
    auto result = executeQuery(sql, parameters);
    if (result.isError()) {
        return APTP::Core::Error<std::vector<std::tuple<std::string, std::string, std::string>>>(
            APTP::Core::ErrorCode::ResourceUnavailable);
    }
    
    std::vector<std::tuple<std::string, std::string, std::string>> columns;
    const auto& resultSet = result.value();
    
    for (size_t i = 0; i < resultSet.rowCount(); ++i) {
        auto columnName = resultSet.getValue<std::string>(i, "column_name");
        auto dataType = resultSet.getValue<std::string>(i, "data_type");
        auto isNullable = resultSet.getValue<std::string>(i, "is_nullable");
        
        if (columnName.has_value() && dataType.has_value() && isNullable.has_value()) {
            columns.emplace_back(*columnName, *dataType, *isNullable);
        }
    }
    
    return APTP::Core::Success(columns);
}

// Implementation of TimescaleDBManager would follow a similar pattern
// This would provide specialized methods for time-series data management

} // namespace APTP::Core
