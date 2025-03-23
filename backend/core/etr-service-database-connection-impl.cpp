#include "persistence/database_connection.h"
#include "logging/logger.h"

#include <chrono>
#include <sstream>
#include <iomanip>

namespace etr {
namespace persistence {

// PgResult implementation

PgResult::PgResult(PGresult* result)
    : result_(result), has_error_(false), error_message_("") {
    
    // Check for errors
    if (result_) {
        ExecStatusType status = PQresultStatus(result_);
        if (status != PGRES_COMMAND_OK && status != PGRES_TUPLES_OK) {
            has_error_ = true;
            error_message_ = PQresultErrorMessage(result_);
        }
    } else {
        has_error_ = true;
        error_message_ = "Null PGresult";
    }
}

PgResult::~PgResult() {
    if (result_) {
        PQclear(result_);
        result_ = nullptr;
    }
}

PgResult::PgResult(PgResult&& other) noexcept
    : result_(other.result_), has_error_(other.has_error_), error_message_(std::move(other.error_message_)) {
    other.result_ = nullptr;
}

PgResult& PgResult::operator=(PgResult&& other) noexcept {
    if (this != &other) {
        if (result_) {
            PQclear(result_);
        }
        
        result_ = other.result_;
        has_error_ = other.has_error_;
        error_message_ = std::move(other.error_message_);
        
        other.result_ = nullptr;
    }
    
    return *this;
}

int PgResult::getNumRows() const {
    return result_ ? PQntuples(result_) : 0;
}

int PgResult::getNumColumns() const {
    return result_ ? PQnfields(result_) : 0;
}

std::string PgResult::getColumnName(int column_index) const {
    if (!result_ || column_index < 0 || column_index >= getNumColumns()) {
        return "";
    }
    
    return PQfname(result_, column_index);
}

int PgResult::getColumnIndex(const std::string& column_name) const {
    if (!result_) {
        return -1;
    }
    
    return PQfnumber(result_, column_name.c_str());
}

std::string PgResult::getString(int row_index, int column_index) const {
    if (!result_ || row_index < 0 || row_index >= getNumRows() ||
        column_index < 0 || column_index >= getNumColumns() ||
        PQgetisnull(result_, row_index, column_index)) {
        return "";
    }
    
    return PQgetvalue(result_, row_index, column_index);
}

std::string PgResult::getString(int row_index, const std::string& column_name) const {
    return getString(row_index, getColumnIndex(column_name));
}

int PgResult::getInt(int row_index, int column_index, int default_value) const {
    if (!result_ || row_index < 0 || row_index >= getNumRows() ||
        column_index < 0 || column_index >= getNumColumns() ||
        PQgetisnull(result_, row_index, column_index)) {
        return default_value;
    }
    
    try {
        return std::stoi(PQgetvalue(result_, row_index, column_index));
    } catch (const std::exception&) {
        return default_value;
    }
}

int PgResult::getInt(int row_index, const std::string& column_name, int default_value) const {
    return getInt(row_index, getColumnIndex(column_name), default_value);
}

int64_t PgResult::getInt64(int row_index, int column_index, int64_t default_value) const {
    if (!result_ || row_index < 0 || row_index >= getNumRows() ||
        column_index < 0 || column_index >= getNumColumns() ||
        PQgetisnull(result_, row_index, column_index)) {
        return default_value;
    }
    
    try {
        return std::stoll(PQgetvalue(result_, row_index, column_index));
    } catch (const std::exception&) {
        return default_value;
    }
}

int64_t PgResult::getInt64(int row_index, const std::string& column_name, int64_t default_value) const {
    return getInt64(row_index, getColumnIndex(column_name), default_value);
}

double PgResult::getDouble(int row_index, int column_index, double default_value) const {
    if (!result_ || row_index < 0 || row_index >= getNumRows() ||
        column_index < 0 || column_index >= getNumColumns() ||
        PQgetisnull(result_, row_index, column_index)) {
        return default_value;
    }
    
    try {
        return std::stod(PQgetvalue(result_, row_index, column_index));
    } catch (const std::exception&) {
        return default_value;
    }
}

double PgResult::getDouble(int row_index, const std::string& column_name, double default_value) const {
    return getDouble(row_index, getColumnIndex(column_name), default_value);
}

bool PgResult::getBool(int row_index, int column_index, bool default_value) const {
    if (!result_ || row_index < 0 || row_index >= getNumRows() ||
        column_index < 0 || column_index >= getNumColumns() ||
        PQgetisnull(result_, row_index, column_index)) {
        return default_value;
    }
    
    std::string value = PQgetvalue(result_, row_index, column_index);
    return (value == "t" || value == "true" || value == "1");
}

bool PgResult::getBool(int row_index, const std::string& column_name, bool default_value) const {
    return getBool(row_index, getColumnIndex(column_name), default_value);
}

std::vector<uint8_t> PgResult::getBinary(int row_index, int column_index) const {
    if (!result_ || row_index < 0 || row_index >= getNumRows() ||
        column_index < 0 || column_index >= getNumColumns() ||
        PQgetisnull(result_, row_index, column_index)) {
        return {};
    }
    
    // Get binary data
    size_t size = PQgetlength(result_, row_index, column_index);
    const char* data = PQgetvalue(result_, row_index, column_index);
    
    // Convert from hex format (bytea)
    size_t out_size;
    unsigned char* binary_data = PQunescapeBytea(reinterpret_cast<const unsigned char*>(data), &out_size);
    
    if (!binary_data) {
        return {};
    }
    
    // Copy to vector
    std::vector<uint8_t> result(binary_data, binary_data + out_size);
    
    // Free allocated memory
    PQfreemem(binary_data);
    
    return result;
}

std::vector<uint8_t> PgResult::getBinary(int row_index, const std::string& column_name) const {
    return getBinary(row_index, getColumnIndex(column_name));
}

nlohmann::json PgResult::getJson(int row_index, int column_index) const {
    if (!result_ || row_index < 0 || row_index >= getNumRows() ||
        column_index < 0 || column_index >= getNumColumns() ||
        PQgetisnull(result_, row_index, column_index)) {
        return nlohmann::json::object();
    }
    
    try {
        return nlohmann::json::parse(PQgetvalue(result_, row_index, column_index));
    } catch (const std::exception&) {
        return nlohmann::json::object();
    }
}

nlohmann::json PgResult::getJson(int row_index, const std::string& column_name) const {
    return getJson(row_index, getColumnIndex(column_name));
}

std::optional<std::chrono::system_clock::time_point> PgResult::getTimestamp(
    int row_index, int column_index
) const {
    if (!result_ || row_index < 0 || row_index >= getNumRows() ||
        column_index < 0 || column_index >= getNumColumns() ||
        PQgetisnull(result_, row_index, column_index)) {
        return std::nullopt;
    }
    
    std::string timestamp_str = PQgetvalue(result_, row_index, column_index);
    
    // Parse PostgreSQL timestamp (e.g., "2023-01-01 12:34:56")
    std::tm tm = {};
    std::istringstream ss(timestamp_str);
    ss >> std::get_time(&tm, "%Y-%m-%d %H:%M:%S");
    
    if (ss.fail()) {
        return std::nullopt;
    }
    
    // Convert to time_point
    std::time_t time = std::mktime(&tm);
    return std::chrono::system_clock::from_time_t(time);
}

std::optional<std::chrono::system_clock::time_point> PgResult::getTimestamp(
    int row_index, const std::string& column_name
) const {
    return getTimestamp(row_index, getColumnIndex(column_name));
}

bool PgResult::isNull(int row_index, int column_index) const {
    if (!result_ || row_index < 0 || row_index >= getNumRows() ||
        column_index < 0 || column_index >= getNumColumns()) {
        return true;
    }
    
    return PQgetisnull(result_, row_index, column_index);
}

bool PgResult::isNull(int row_index, const std::string& column_name) const {
    return isNull(row_index, getColumnIndex(column_name));
}

nlohmann::json PgResult::getRowAsJson(int row_index) const {
    if (!result_ || row_index < 0 || row_index >= getNumRows()) {
        return nlohmann::json::object();
    }
    
    nlohmann::json row = nlohmann::json::object();
    
    for (int col = 0; col < getNumColumns(); ++col) {
        std::string column_name = getColumnName(col);
        
        if (isNull(row_index, col)) {
            row[column_name] = nullptr;
        } else {
            // Get OID (PostgreSQL data type)
            Oid type_oid = PQftype(result_, col);
            
            switch (type_oid) {
                case 16: // bool
                    row[column_name] = getBool(row_index, col);
                    break;
                case 20: // int8
                case 21: // int2
                case 23: // int4
                    row[column_name] = getInt64(row_index, col);
                    break;
                case 700: // float4
                case 701: // float8
                    row[column_name] = getDouble(row_index, col);
                    break;
                case 114: // json
                case 3802: // jsonb
                    row[column_name] = getJson(row_index, col);
                    break;
                case 17: // bytea
                    {
                        auto binary = getBinary(row_index, col);
                        std::stringstream ss;
                        ss << "\\x";
                        for (const auto& byte : binary) {
                            ss << std::hex << std::setw(2) << std::setfill('0') << static_cast<int>(byte);
                        }
                        row[column_name] = ss.str();
                    }
                    break;
                default: // text, varchar, etc.
                    row[column_name] = getString(row_index, col);
                    break;
            }
        }
    }
    
    return row;
}

nlohmann::json PgResult::getAllRowsAsJson() const {
    nlohmann::json rows = nlohmann::json::array();
    
    for (int row = 0; row < getNumRows(); ++row) {
        rows.push_back(getRowAsJson(row));
    }
    
    return rows;
}

bool PgResult::isEmpty() const {
    return getNumRows() == 0;
}

bool PgResult::hasError() const {
    return has_error_;
}

std::string PgResult::getErrorMessage() const {
    return error_message_;
}

int PgResult::getAffectedRows() const {
    if (!result_) {
        return 0;
    }
    
    const char* affected = PQcmdTuples(result_);
    if (!affected || *affected == '\0') {
        return 0;
    }
    
    try {
        return std::stoi(affected);
    } catch (const std::exception&) {
        return 0;
    }
}

// Transaction implementation

Transaction::Transaction(DatabaseConnection& conn)
    : conn_(conn), active_(false) {
    active_ = conn_.beginTransaction();
}

Transaction::~Transaction() {
    if (active_) {
        conn_.rollbackTransaction();
    }
}

bool Transaction::commit() {
    if (!active_) {
        return false;
    }
    
    active_ = false;
    return conn_.commitTransaction();
}

bool Transaction::rollback() {
    if (!active_) {
        return false;
    }
    
    active_ = false;
    return conn_.rollbackTransaction();
}

bool Transaction::isActive() const {
    return active_;
}

// DatabaseConnection implementation

DatabaseConnection::DatabaseConnection(
    const std::string& host,
    int port,
    const std::string& dbname,
    const std::string& user,
    const std::string& password
)
    : host_(host), port_(port), dbname_(dbname), user_(user), password_(password),
      conn_(nullptr), in_transaction_(false) {
}

DatabaseConnection::~DatabaseConnection() {
    disconnect();
}

bool DatabaseConnection::connect() {
    std::lock_guard<std::mutex> lock(mutex_);
    
    if (conn_) {
        // Already connected
        return true;
    }
    
    // Build connection string
    std::string conninfo = "host=" + host_ +
                          " port=" + std::to_string(port_) +
                          " dbname=" + dbname_ +
                          " user=" + user_ +
                          " password=" + password_;
    
    // Connect to database
    conn_ = PQconnectdb(conninfo.c_str());
    
    if (PQstatus(conn_) != CONNECTION_OK) {
        std::string error = PQerrorMessage(conn_);
        PQfinish(conn_);
        conn_ = nullptr;
        
        logging::Logger::getInstance().error("Database connection failed: {}", error);
        return false;
    }
    
    logging::Logger::getInstance().info("Connected to database {}@{}:{}/{}",
        user_, host_, port_, dbname_);
    return true;
}

void DatabaseConnection::disconnect() {
    std::lock_guard<std::mutex> lock(mutex_);
    
    if (conn_) {
        PQfinish(conn_);
        conn_ = nullptr;
        in_transaction_ = false;
        
        logging::Logger::getInstance().info("Disconnected from database");
    }
}

bool DatabaseConnection::isConnected() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return conn_ && PQstatus(conn_) == CONNECTION_OK;
}

PgResult DatabaseConnection::executeQuery(
    const std::string& query,
    const std::vector<PgParam>& params
) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    if (!conn_) {
        logging::Logger::getInstance().error("Cannot execute query: not connected to database");
        return PgResult(nullptr);
    }
    
    // Prepare parameters
    std::vector<const char*> param_values;
    std::vector<int> param_lengths;
    std::vector<int> param_formats;
    std::vector<std::string> string_values; // Keep strings alive
    std::vector<std::vector<uint8_t>> binary_values; // Keep binary data alive
    
    for (const auto& param : params) {
        if (param.is_null) {
            param_values.push_back(nullptr);
            param_lengths.push_back(0);
            param_formats.push_back(0);
        } else {
            switch (param.type) {
                case PgParamType::BYTEA:
                    {
                        // Convert from hex string to binary
                        if (param.value.substr(0, 2) == "\\x") {
                            std::string hex = param.value.substr(2);
                            std::vector<uint8_t> binary;
                            
                            for (size_t i = 0; i < hex.length(); i += 2) {
                                std::string byte_hex = hex.substr(i, 2);
                                uint8_t byte = std::stoi(byte_hex, nullptr, 16);
                                binary.push_back(byte);
                            }
                            
                            binary_values.push_back(binary);
                            param_values.push_back(reinterpret_cast<const char*>(binary_values.back().data()));
                            param_lengths.push_back(static_cast<int>(binary_values.back().size()));
                            param_formats.push_back(1); // Binary format
                        } else {
                            string_values.push_back(param.value);
                            param_values.push_back(string_values.back().c_str());
                            param_lengths.push_back(static_cast<int>(string_values.back().length()));
                            param_formats.push_back(0); // Text format
                        }
                    }
                    break;
                default:
                    string_values.push_back(param.value);
                    param_values.push_back(string_values.back().c_str());
                    param_lengths.push_back(static_cast<int>(string_values.back().length()));
                    param_formats.push_back(0); // Text format
                    break;
            }
        }
    }
    
    // Execute query
    PGresult* result = PQexecParams(
        conn_,
        query.c_str(),
        static_cast<int>(params.size()),
        nullptr, // Let server determine param types
        param_values.empty() ? nullptr : param_values.data(),
        param_lengths.empty() ? nullptr : param_lengths.data(),
        param_formats.empty() ? nullptr : param_formats.data(),
        0 // Result in text format
    );
    
    // Check result
    PgResult pg_result(result);
    
    if (pg_result.hasError()) {
        logging::Logger::getInstance().error("Query error: {}", pg_result.getErrorMessage());
    }
    
    return pg_result;
}

nlohmann::json DatabaseConnection::queryFirstRowAsJson(
    const std::string& query,
    const std::vector<PgParam>& params
) {
    PgResult result = executeQuery(query, params);
    
    if (result.hasError() || result.isEmpty()) {
        return nlohmann::json::object();
    }
    
    return result.getRowAsJson(0);
}

nlohmann::json DatabaseConnection::queryAllRowsAsJson(
    const std::string& query,
    const std::vector<PgParam>& params
) {
    PgResult result = executeQuery(query, params);
    
    if (result.hasError()) {
        return nlohmann::json::array();
    }
    
    return result.getAllRowsAsJson();
}

bool DatabaseConnection::beginTransaction() {
    std::lock_guard<std::mutex> lock(mutex_);
    
    if (!conn_) {
        logging::Logger::getInstance().error("Cannot begin transaction: not connected to database");
        return false;
    }
    
    if (in_transaction_) {
        logging::Logger::getInstance().warn("Transaction already in progress");
        return true;
    }
    
    PGresult* result = PQexec(conn_, "BEGIN");
    bool success = (PQresultStatus(result) == PGRES_COMMAND_OK);
    PQclear(result);
    
    if (success) {
        in_transaction_ = true;
        logging::Logger::getInstance().debug("Transaction begun");
    } else {
        logging::Logger::getInstance().error("Failed to begin transaction: {}", PQerrorMessage(conn_));
    }
    
    return success;
}

bool DatabaseConnection::commitTransaction() {
    std::lock_guard<std::mutex> lock(mutex_);
    
    if (!conn_) {
        logging::Logger::getInstance().error("Cannot commit transaction: not connected to database");
        return false;
    }
    
    if (!in_transaction_) {
        logging::Logger::getInstance().warn("No transaction in progress to commit");
        return false;
    }
    
    PGresult* result = PQexec(conn_, "COMMIT");
    bool success = (PQresultStatus(result) == PGRES_COMMAND_OK);
    PQclear(result);
    
    in_transaction_ = false;
    
    if (success) {
        logging::Logger::getInstance().debug("Transaction committed");
    } else {
        logging::Logger::getInstance().error("Failed to commit transaction: {}", PQerrorMessage(conn_));
    }
    
    return success;
}

bool DatabaseConnection::rollbackTransaction() {
    std::lock_guard<std::mutex> lock(mutex_);
    
    if (!conn_) {
        logging::Logger::getInstance().error("Cannot rollback transaction: not connected to database");
        return false;
    }
    
    if (!in_transaction_) {
        logging::Logger::getInstance().warn("No transaction in progress to rollback");
        return false;
    }
    
    PGresult* result = PQexec(conn_, "ROLLBACK");
    bool success = (PQresultStatus(result) == PGRES_COMMAND_OK);
    PQclear(result);
    
    in_transaction_ = false;
    
    if (success) {
        logging::Logger::getInstance().debug("Transaction rolled back");
    } else {
        logging::Logger::getInstance().error("Failed to rollback transaction: {}", PQerrorMessage(conn_));
    }
    
    return success;
}

bool DatabaseConnection::inTransaction() const {
    std::lock_guard<std::mutex> lock(mutex_);
    return in_transaction_;
}

Transaction DatabaseConnection::createTransaction() {
    return Transaction(*this);
}

std::string DatabaseConnection::escapeString(const std::string& str) const {
    std::lock_guard<std::mutex> lock(mutex_);
    
    if (!conn_) {
        return str;
    }
    
    // Allocate enough space for escaped string
    size_t buf_size = str.size() * 2 + 1;
    std::vector<char> buf(buf_size);
    
    // Escape string
    int error;
    size_t escaped_size = PQescapeStringConn(conn_, buf.data(), str.c_str(), str.size(), &error);
    
    if (error) {
        logging::Logger::getInstance().error("Error escaping string: {}", PQerrorMessage(conn_));
        return str;
    }
    
    return std::string(buf.data(), escaped_size);
}

std::string DatabaseConnection::escapeIdentifier(const std::string& identifier) const {
    std::lock_guard<std::mutex> lock(mutex_);
    
    if (!conn_) {
        return "\"" + identifier + "\"";
    }
    
    // Escape identifier
    char* escaped = PQescapeIdentifier(conn_, identifier.c_str(), identifier.size());
    
    if (!escaped) {
        logging::Logger::getInstance().error("Error escaping identifier: {}", PQerrorMessage(conn_));
        return "\"" + identifier + "\"";
    }
    
    std::string result = escaped;
    PQfreemem(escaped);
    
    return result;
}

std::string DatabaseConnection::getLastError() const {
    std::lock_guard<std::mutex> lock(mutex_);
    
    if (!conn_) {
        return "Not connected to database";
    }
    
    return PQerrorMessage(conn_);
}

std::string DatabaseConnection::getConnectionInfo() const {
    return user_ + "@" + host_ + ":" + std::to_string(port_) + "/" + dbname_;
}

} // namespace persistence
} // namespace etr