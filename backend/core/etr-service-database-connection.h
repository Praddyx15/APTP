#pragma once

#include <string>
#include <memory>
#include <mutex>
#include <vector>
#include <unordered_map>
#include <optional>
#include <libpq-fe.h>
#include <nlohmann/json.hpp>
#include "logging/logger.h"

namespace etr {
namespace persistence {

/**
 * @brief PostgreSQL parameter type
 */
enum class PgParamType {
    TEXT,
    INTEGER,
    BIGINT,
    BOOLEAN,
    TIMESTAMP,
    DOUBLE,
    BYTEA,
    JSONB
};

/**
 * @brief PostgreSQL parameter
 */
struct PgParam {
    std::string name;
    std::string value;
    PgParamType type;
    bool is_null;
};

/**
 * @brief PostgreSQL query result
 */
class PgResult {
public:
    /**
     * @brief Constructor
     * @param result PGresult pointer
     */
    explicit PgResult(PGresult* result);
    
    /**
     * @brief Destructor
     */
    ~PgResult();
    
    /**
     * @brief Move constructor
     * @param other Other result
     */
    PgResult(PgResult&& other) noexcept;
    
    /**
     * @brief Move assignment
     * @param other Other result
     * @return This result
     */
    PgResult& operator=(PgResult&& other) noexcept;
    
    // Delete copy constructor and assignment
    PgResult(const PgResult&) = delete;
    PgResult& operator=(const PgResult&) = delete;
    
    /**
     * @brief Get number of rows
     * @return Number of rows
     */
    int getNumRows() const;
    
    /**
     * @brief Get number of columns
     * @return Number of columns
     */
    int getNumColumns() const;
    
    /**
     * @brief Get column name
     * @param column_index Column index
     * @return Column name
     */
    std::string getColumnName(int column_index) const;
    
    /**
     * @brief Get column index
     * @param column_name Column name
     * @return Column index or -1 if not found
     */
    int getColumnIndex(const std::string& column_name) const;
    
    /**
     * @brief Get value as string
     * @param row_index Row index
     * @param column_index Column index
     * @return Value or empty string if null or out of bounds
     */
    std::string getString(int row_index, int column_index) const;
    
    /**
     * @brief Get value as string by column name
     * @param row_index Row index
     * @param column_name Column name
     * @return Value or empty string if null or not found
     */
    std::string getString(int row_index, const std::string& column_name) const;
    
    /**
     * @brief Get value as integer
     * @param row_index Row index
     * @param column_index Column index
     * @param default_value Default value if null or invalid
     * @return Value
     */
    int getInt(int row_index, int column_index, int default_value = 0) const;
    
    /**
     * @brief Get value as integer by column name
     * @param row_index Row index
     * @param column_name Column name
     * @param default_value Default value if null or invalid
     * @return Value
     */
    int getInt(int row_index, const std::string& column_name, int default_value = 0) const;
    
    /**
     * @brief Get value as 64-bit integer
     * @param row_index Row index
     * @param column_index Column index
     * @param default_value Default value if null or invalid
     * @return Value
     */
    int64_t getInt64(int row_index, int column_index, int64_t default_value = 0) const;
    
    /**
     * @brief Get value as 64-bit integer by column name
     * @param row_index Row index
     * @param column_name Column name
     * @param default_value Default value if null or invalid
     * @return Value
     */
    int64_t getInt64(int row_index, const std::string& column_name, int64_t default_value = 0) const;
    
    /**
     * @brief Get value as double
     * @param row_index Row index
     * @param column_index Column index
     * @param default_value Default value if null or invalid
     * @return Value
     */
    double getDouble(int row_index, int column_index, double default_value = 0.0) const;
    
    /**
     * @brief Get value as double by column name
     * @param row_index Row index
     * @param column_name Column name
     * @param default_value Default value if null or invalid
     * @return Value
     */
    double getDouble(int row_index, const std::string& column_name, double default_value = 0.0) const;
    
    /**
     * @brief Get value as boolean
     * @param row_index Row index
     * @param column_index Column index
     * @param default_value Default value if null or invalid
     * @return Value
     */
    bool getBool(int row_index, int column_index, bool default_value = false) const;
    
    /**
     * @brief Get value as boolean by column name
     * @param row_index Row index
     * @param column_name Column name
     * @param default_value Default value if null or invalid
     * @return Value
     */
    bool getBool(int row_index, const std::string& column_name, bool default_value = false) const;
    
    /**
     * @brief Get value as binary data
     * @param row_index Row index
     * @param column_index Column index
     * @return Binary data or empty vector if null or not found
     */
    std::vector<uint8_t> getBinary(int row_index, int column_index) const;
    
    /**
     * @brief Get value as binary data by column name
     * @param row_index Row index
     * @param column_name Column name
     * @return Binary data or empty vector if null or not found
     */
    std::vector<uint8_t> getBinary(int row_index, const std::string& column_name) const;
    
    /**
     * @brief Get value as JSON
     * @param row_index Row index
     * @param column_index Column index
     * @return JSON object or null if invalid
     */
    nlohmann::json getJson(int row_index, int column_index) const;
    
    /**
     * @brief Get value as JSON by column name
     * @param row_index Row index
     * @param column_name Column name
     * @return JSON object or null if invalid
     */
    nlohmann::json getJson(int row_index, const std::string& column_name) const;
    
    /**
     * @brief Get timestamp as time_point
     * @param row_index Row index
     * @param column_index Column index
     * @return Time point or nullopt if null or invalid
     */
    std::optional<std::chrono::system_clock::time_point> getTimestamp(int row_index, int column_index) const;
    
    /**
     * @brief Get timestamp as time_point by column name
     * @param row_index Row index
     * @param column_name Column name
     * @return Time point or nullopt if null or invalid
     */
    std::optional<std::chrono::system_clock::time_point> getTimestamp(int row_index, const std::string& column_name) const;
    
    /**
     * @brief Check if value is null
     * @param row_index Row index
     * @param column_index Column index
     * @return True if null
     */
    bool isNull(int row_index, int column_index) const;
    
    /**
     * @brief Check if value is null by column name
     * @param row_index Row index
     * @param column_name Column name
     * @return True if null
     */
    bool isNull(int row_index, const std::string& column_name) const;
    
    /**
     * @brief Convert row to JSON object
     * @param row_index Row index
     * @return JSON object
     */
    nlohmann::json getRowAsJson(int row_index) const;
    
    /**
     * @brief Convert all rows to JSON array
     * @return JSON array
     */
    nlohmann::json getAllRowsAsJson() const;
    
    /**
     * @brief Check if result is empty
     * @return True if empty
     */
    bool isEmpty() const;
    
    /**
     * @brief Check if result has error
     * @return True if error
     */
    bool hasError() const;
    
    /**
     * @brief Get error message
     * @return Error message
     */
    std::string getErrorMessage() const;
    
    /**
     * @brief Get affected row count
     * @return Affected row count
     */
    int getAffectedRows() const;
    
private:
    PGresult* result_;
    bool has_error_;
    std::string error_message_;
};

/**
 * @brief Database transaction
 */
class Transaction {
public:
    /**
     * @brief Constructor
     * @param conn Database connection
     */
    explicit Transaction(class DatabaseConnection& conn);
    
    /**
     * @brief Destructor - rolls back if not committed
     */
    ~Transaction();
    
    /**
     * @brief Commit transaction
     * @return True if committed successfully
     */
    bool commit();
    
    /**
     * @brief Rollback transaction
     * @return True if rolled back successfully
     */
    bool rollback();
    
    /**
     * @brief Check if transaction is active
     * @return True if active
     */
    bool isActive() const;
    
private:
    class DatabaseConnection& conn_;
    bool active_;
};

/**
 * @brief Database connection
 */
class DatabaseConnection {
public:
    /**
     * @brief Constructor
     * @param host Host
     * @param port Port
     * @param dbname Database name
     * @param user User
     * @param password Password
     */
    DatabaseConnection(
        const std::string& host,
        int port,
        const std::string& dbname,
        const std::string& user,
        const std::string& password
    );
    
    /**
     * @brief Destructor
     */
    ~DatabaseConnection();
    
    /**
     * @brief Connect to database
     * @return True if connected successfully
     */
    bool connect();
    
    /**
     * @brief Disconnect from database
     */
    void disconnect();
    
    /**
     * @brief Check if connected
     * @return True if connected
     */
    bool isConnected() const;
    
    /**
     * @brief Execute query with parameters
     * @param query Query string
     * @param params Parameters
     * @return Query result
     */
    PgResult executeQuery(
        const std::string& query,
        const std::vector<PgParam>& params = {}
    );
    
    /**
     * @brief Execute query and get first row as JSON
     * @param query Query string
     * @param params Parameters
     * @return JSON object or null if no rows
     */
    nlohmann::json queryFirstRowAsJson(
        const std::string& query,
        const std::vector<PgParam>& params = {}
    );
    
    /**
     * @brief Execute query and get all rows as JSON
     * @param query Query string
     * @param params Parameters
     * @return JSON array
     */
    nlohmann::json queryAllRowsAsJson(
        const std::string& query,
        const std::vector<PgParam>& params = {}
    );
    
    /**
     * @brief Begin transaction
     * @return True if transaction started successfully
     */
    bool beginTransaction();
    
    /**
     * @brief Commit transaction
     * @return True if committed successfully
     */
    bool commitTransaction();
    
    /**
     * @brief Rollback transaction
     * @return True if rolled back successfully
     */
    bool rollbackTransaction();
    
    /**
     * @brief Check if in transaction
     * @return True if in transaction
     */
    bool inTransaction() const;
    
    /**
     * @brief Create transaction object
     * @return Transaction
     */
    Transaction createTransaction();
    
    /**
     * @brief Escape string
     * @param str String to escape
     * @return Escaped string
     */
    std::string escapeString(const std::string& str) const;
    
    /**
     * @brief Escape identifier
     * @param identifier Identifier to escape
     * @return Escaped identifier
     */
    std::string escapeIdentifier(const std::string& identifier) const;
    
    /**
     * @brief Get last error message
     * @return Error message
     */
    std::string getLastError() const;
    
    /**
     * @brief Get connection info
     * @return Connection info
     */
    std::string getConnectionInfo() const;
    
private:
    friend class Transaction;
    
    std::string host_;
    int port_;
    std::string dbname_;
    std::string user_;
    std::string password_;
    PGconn* conn_;
    bool in_transaction_;
    mutable std::mutex mutex_;
};

} // namespace persistence
} // namespace etr