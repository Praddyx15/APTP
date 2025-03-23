#pragma once

#include "connectors/device_connector.h"
#include "fusion/data_fusion.h"
#include <string>
#include <vector>
#include <memory>
#include <optional>
#include <chrono>
#include <mutex>
#include <thread>
#include <atomic>
#include <queue>
#include <condition_variable>
#include <filesystem>

namespace data_acquisition {
namespace persistence {

/**
 * @brief Storage format enum
 */
enum class StorageFormat {
    CSV,
    JSON,
    BINARY,
    PARQUET,
    SQL
};

/**
 * @brief Convert StorageFormat to string
 * @param format Storage format
 * @return String representation
 */
std::string storageFormatToString(StorageFormat format);

/**
 * @brief Convert string to StorageFormat
 * @param str String representation
 * @return Storage format
 */
StorageFormat storageFormatFromString(const std::string& str);

/**
 * @brief Storage options
 */
struct StorageOptions {
    StorageFormat format;
    bool compress;
    bool include_metadata;
    int flush_interval_ms;
    std::string encryption_key;
    std::unordered_map<std::string, std::string> additional_options;
};

/**
 * @brief Session metadata
 */
struct SessionMetadata {
    std::string session_id;
    std::string user_id;
    std::string exercise_id;
    std::chrono::system_clock::time_point start_time;
    std::chrono::system_clock::time_point end_time;
    std::vector<std::string> device_ids;
    std::unordered_map<std::string, std::string> additional_metadata;
    
    /**
     * @brief Convert to JSON
     * @return JSON representation
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     * @param json JSON representation
     * @return Session metadata or nullopt if invalid
     */
    static std::optional<SessionMetadata> fromJson(const nlohmann::json& json);
};

/**
 * @brief Session data query
 */
struct SessionDataQuery {
    std::string session_id;
    std::optional<std::string> device_id;
    std::optional<connectors::DataType> data_type;
    std::optional<std::chrono::system_clock::time_point> start_time;
    std::optional<std::chrono::system_clock::time_point> end_time;
    std::optional<int> limit;
    std::optional<int> offset;
    std::optional<std::string> filter_expression;
    std::optional<std::string> sort_expression;
};

/**
 * @brief Session data result
 */
struct SessionDataResult {
    std::string session_id;
    std::vector<std::unique_ptr<connectors::DeviceData>> device_data;
    std::vector<fusion::FusedData> fusion_data;
    bool has_more;
    int total_count;
};

/**
 * @brief Data storage interface
 */
class IDataStorage {
public:
    virtual ~IDataStorage() = default;
    
    /**
     * @brief Initialize the storage
     * @param options Storage options
     * @return True if initialized successfully
     */
    virtual bool initialize(const StorageOptions& options) = 0;
    
    /**
     * @brief Shutdown the storage
     */
    virtual void shutdown() = 0;
    
    /**
     * @brief Create a new session
     * @param metadata Session metadata
     * @return True if created successfully
     */
    virtual bool createSession(const SessionMetadata& metadata) = 0;
    
    /**
     * @brief Close a session
     * @param session_id Session ID
     * @param end_time Session end time
     * @return True if closed successfully
     */
    virtual bool closeSession(const std::string& session_id, const std::chrono::system_clock::time_point& end_time) = 0;
    
    /**
     * @brief Store device data
     * @param session_id Session ID
     * @param data Device data
     * @return True if stored successfully
     */
    virtual bool storeDeviceData(const std::string& session_id, const connectors::DeviceData& data) = 0;
    
    /**
     * @brief Store fusion data
     * @param session_id Session ID
     * @param data Fusion data
     * @return True if stored successfully
     */
    virtual bool storeFusionData(const std::string& session_id, const fusion::FusedData& data) = 0;
    
    /**
     * @brief Get session metadata
     * @param session_id Session ID
     * @return Session metadata or nullopt if not found
     */
    virtual std::optional<SessionMetadata> getSessionMetadata(const std::string& session_id) = 0;
    
    /**
     * @brief Update session metadata
     * @param metadata Session metadata
     * @return True if updated successfully
     */
    virtual bool updateSessionMetadata(const SessionMetadata& metadata) = 0;
    
    /**
     * @brief Query session data
     * @param query Session data query
     * @return Session data result
     */
    virtual SessionDataResult querySessionData(const SessionDataQuery& query) = 0;
    
    /**
     * @brief List all sessions
     * @param user_id Optional user ID filter
     * @param exercise_id Optional exercise ID filter
     * @param limit Optional limit
     * @param offset Optional offset
     * @return List of session metadata
     */
    virtual std::vector<SessionMetadata> listSessions(
        const std::optional<std::string>& user_id = std::nullopt,
        const std::optional<std::string>& exercise_id = std::nullopt,
        const std::optional<int>& limit = std::nullopt,
        const std::optional<int>& offset = std::nullopt
    ) = 0;
    
    /**
     * @brief Delete a session
     * @param session_id Session ID
     * @return True if deleted successfully
     */
    virtual bool deleteSession(const std::string& session_id) = 0;
    
    /**
     * @brief Export session data
     * @param session_id Session ID
     * @param format Export format
     * @param output_path Output path
     * @return True if exported successfully
     */
    virtual bool exportSession(
        const std::string& session_id, 
        StorageFormat format, 
        const std::string& output_path
    ) = 0;
    
    /**
     * @brief Import session data
     * @param input_path Input path
     * @param format Import format
     * @return Imported session ID or empty string if import failed
     */
    virtual std::string importSession(
        const std::string& input_path, 
        StorageFormat format
    ) = 0;
    
    /**
     * @brief Get storage statistics
     * @return Statistics as JSON
     */
    virtual nlohmann::json getStatistics() = 0;
};

/**
 * @brief File-based data storage implementation
 */
class FileDataStorage : public IDataStorage {
public:
    FileDataStorage();
    ~FileDataStorage() override;
    
    bool initialize(const StorageOptions& options) override;
    void shutdown() override;
    bool createSession(const SessionMetadata& metadata) override;
    bool closeSession(const std::string& session_id, const std::chrono::system_clock::time_point& end_time) override;
    bool storeDeviceData(const std::string& session_id, const connectors::DeviceData& data) override;
    bool storeFusionData(const std::string& session_id, const fusion::FusedData& data) override;
    std::optional<SessionMetadata> getSessionMetadata(const std::string& session_id) override;
    bool updateSessionMetadata(const SessionMetadata& metadata) override;
    SessionDataResult querySessionData(const SessionDataQuery& query) override;
    std::vector<SessionMetadata> listSessions(
        const std::optional<std::string>& user_id,
        const std::optional<std::string>& exercise_id,
        const std::optional<int>& limit,
        const std::optional<int>& offset
    ) override;
    bool deleteSession(const std::string& session_id) override;
    bool exportSession(
        const std::string& session_id, 
        StorageFormat format, 
        const std::string& output_path
    ) override;
    std::string importSession(
        const std::string& input_path, 
        StorageFormat format
    ) override;
    nlohmann::json getStatistics() override;
    
private:
    /**
     * @brief Session data files
     */
    struct SessionFiles {
        std::filesystem::path metadata_path;
        std::filesystem::path device_data_path;
        std::filesystem::path fusion_data_path;
        std::unique_ptr<std::ofstream> device_data_file;
        std::unique_ptr<std::ofstream> fusion_data_file;
        std::chrono::system_clock::time_point last_flush_time;
    };
    
    /**
     * @brief Get session files
     * @param session_id Session ID
     * @param create_if_missing Create if missing
     * @return Session files or nullptr if not found
     */
    SessionFiles* getSessionFiles(const std::string& session_id, bool create_if_missing = false);
    
    /**
     * @brief Flush session files
     * @param session_id Session ID
     * @param force Force flush even if interval not reached
     * @return True if flushed successfully
     */
    bool flushSessionFiles(const std::string& session_id, bool force = false);
    
    /**
     * @brief Parse device data from JSON
     * @param json JSON representation
     * @return Device data or nullptr if invalid
     */
    std::unique_ptr<connectors::DeviceData> parseDeviceData(const nlohmann::json& json);
    
    /**
     * @brief Write data batch to disk
     */
    void writeBatchToDisk();
    
    /**
     * @brief Worker thread function
     */
    void workerThread();
    
    StorageOptions options_;
    std::filesystem::path base_path_;
    std::unordered_map<std::string, std::unique_ptr<SessionFiles>> session_files_;
    mutable std::mutex sessions_mutex_;
    
    // Worker thread for async writes
    std::thread worker_thread_;
    std::atomic<bool> running_;
    std::queue<std::function<void()>> work_queue_;
    std::mutex queue_mutex_;
    std::condition_variable queue_condition_;
};

/**
 * @brief Database-based data storage implementation
 */
class DatabaseDataStorage : public IDataStorage {
public:
    DatabaseDataStorage();
    ~DatabaseDataStorage() override;
    
    bool initialize(const StorageOptions& options) override;
    void shutdown() override;
    bool createSession(const SessionMetadata& metadata) override;
    bool closeSession(const std::string& session_id, const std::chrono::system_clock::time_point& end_time) override;
    bool storeDeviceData(const std::string& session_id, const connectors::DeviceData& data) override;
    bool storeFusionData(const std::string& session_id, const fusion::FusedData& data) override;
    std::optional<SessionMetadata> getSessionMetadata(const std::string& session_id) override;
    bool updateSessionMetadata(const SessionMetadata& metadata) override;
    SessionDataResult querySessionData(const SessionDataQuery& query) override;
    std::vector<SessionMetadata> listSessions(
        const std::optional<std::string>& user_id,
        const std::optional<std::string>& exercise_id,
        const std::optional<int>& limit,
        const std::optional<int>& offset
    ) override;
    bool deleteSession(const std::string& session_id) override;
    bool exportSession(
        const std::string& session_id, 
        StorageFormat format, 
        const std::string& output_path
    ) override;
    std::string importSession(
        const std::string& input_path, 
        StorageFormat format
    ) override;
    nlohmann::json getStatistics() override;
    
private:
    // Database connection details would go here
    // This would be implemented with a proper SQL library (e.g., SQLite, PostgreSQL)
    // For now, this is just a placeholder
};

/**
 * @brief Data persistence manager
 */
class DataPersistenceManager {
public:
    /**
     * @brief Get the singleton instance
     * @return Manager instance
     */
    static DataPersistenceManager& getInstance();
    
    /**
     * @brief Initialize the manager
     * @param storage_type Storage type ("file" or "database")
     * @param options Storage options
     * @return True if initialized successfully
     */
    bool initialize(const std::string& storage_type, const StorageOptions& options);
    
    /**
     * @brief Shutdown the manager
     */
    void shutdown();
    
    /**
     * @brief Get the storage instance
     * @return Storage instance
     */
    IDataStorage* getStorage();
    
    /**
     * @brief Create a new session
     * @param metadata Session metadata
     * @return True if created successfully
     */
    bool createSession(const SessionMetadata& metadata);
    
    /**
     * @brief Close a session
     * @param session_id Session ID
     * @return True if closed successfully
     */
    bool closeSession(const std::string& session_id);
    
    /**
     * @brief Store device data
     * @param session_id Session ID
     * @param data Device data
     * @return True if stored successfully
     */
    bool storeDeviceData(const std::string& session_id, const connectors::DeviceData& data);
    
    /**
     * @brief Store fusion data
     * @param session_id Session ID
     * @param data Fusion data
     * @return True if stored successfully
     */
    bool storeFusionData(const std::string& session_id, const fusion::FusedData& data);
    
    /**
     * @brief Query session data
     * @param query Session data query
     * @return Session data result
     */
    SessionDataResult querySessionData(const SessionDataQuery& query);
    
private:
    DataPersistenceManager();
    ~DataPersistenceManager();
    
    DataPersistenceManager(const DataPersistenceManager&) = delete;
    DataPersistenceManager& operator=(const DataPersistenceManager&) = delete;
    
    std::unique_ptr<IDataStorage> storage_;
    std::atomic<bool> initialized_{false};
    mutable std::mutex mutex_;
};

} // namespace persistence
} // namespace data_acquisition