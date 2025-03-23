#pragma once

#include <string>
#include <unordered_map>
#include <any>
#include <functional>
#include <memory>
#include <mutex>
#include <vector>
#include <variant>
#include <optional>
#include <filesystem>
#include <fstream>
#include <type_traits>
#include <chrono>

#include <drogon/drogon.h>
#include <nlohmann/json.hpp>

namespace apt {
namespace core {

// Forward declarations
class ConfigChangeEvent;
class ConfigurationManager;

/**
 * Configuration change event emitted when a configuration value changes
 */
class ConfigChangeEvent {
public:
    ConfigChangeEvent(const std::string& key, const std::any& oldValue, const std::any& newValue)
        : key_(key), oldValue_(oldValue), newValue_(newValue) {}

    const std::string& key() const { return key_; }
    const std::any& oldValue() const { return oldValue_; }
    const std::any& newValue() const { return newValue_; }

private:
    std::string key_;
    std::any oldValue_;
    std::any newValue_;
};

/**
 * Configuration source interface for loading settings from different sources
 */
class ConfigSource {
public:
    virtual ~ConfigSource() = default;
    virtual void load(ConfigurationManager& configManager) = 0;
    virtual bool isDynamic() const { return false; }
    virtual void watchForChanges(ConfigurationManager& configManager) {}
};

/**
 * Environment variable configuration source
 */
class EnvConfigSource : public ConfigSource {
public:
    explicit EnvConfigSource(const std::string& prefix = "APT_") : prefix_(prefix) {}
    
    void load(ConfigurationManager& configManager) override;
    
private:
    std::string prefix_;
};

/**
 * JSON file configuration source
 */
class JsonFileConfigSource : public ConfigSource {
public:
    explicit JsonFileConfigSource(const std::string& filePath) : filePath_(filePath) {}
    
    void load(ConfigurationManager& configManager) override;
    bool isDynamic() const override { return true; }
    void watchForChanges(ConfigurationManager& configManager) override;
    
private:
    std::string filePath_;
    std::filesystem::file_time_type lastModifiedTime_;
};

/**
 * Database configuration source
 */
class DatabaseConfigSource : public ConfigSource {
public:
    explicit DatabaseConfigSource(const std::string& connectionString) 
        : connectionString_(connectionString) {}
    
    void load(ConfigurationManager& configManager) override;
    bool isDynamic() const override { return true; }
    void watchForChanges(ConfigurationManager& configManager) override;
    
private:
    std::string connectionString_;
    std::chrono::system_clock::time_point lastCheckTime_;
};

/**
 * Configuration Manager for the Advanced Pilot Training Platform
 * 
 * Provides a centralized configuration system with the following features:
 * - Multiple configuration sources (environment, files, database)
 * - Type-safe access to configuration values
 * - Change notifications for dynamic configuration updates
 * - Thread-safe access to configuration values
 */
class ConfigurationManager : public std::enable_shared_from_this<ConfigurationManager> {
public:
    using ChangeCallback = std::function<void(const ConfigChangeEvent&)>;
    
    static std::shared_ptr<ConfigurationManager> create() {
        return std::shared_ptr<ConfigurationManager>(new ConfigurationManager());
    }
    
    ~ConfigurationManager() {
        stopWatching();
    }
    
    /**
     * Add a configuration source to the manager
     */
    void addSource(std::shared_ptr<ConfigSource> source) {
        std::lock_guard<std::mutex> lock(mutex_);
        sources_.push_back(source);
        source->load(*this);
        
        if (source->isDynamic() && watcherRunning_) {
            source->watchForChanges(*this);
        }
    }
    
    /**
     * Start watching for configuration changes
     */
    void startWatching() {
        std::lock_guard<std::mutex> lock(mutex_);
        if (!watcherRunning_) {
            watcherRunning_ = true;
            watcherThread_ = std::thread([this]() {
                watcherLoop();
            });
            
            for (const auto& source : sources_) {
                if (source->isDynamic()) {
                    source->watchForChanges(*this);
                }
            }
        }
    }
    
    /**
     * Stop watching for configuration changes
     */
    void stopWatching() {
        std::lock_guard<std::mutex> lock(mutex_);
        if (watcherRunning_) {
            watcherRunning_ = false;
            if (watcherThread_.joinable()) {
                watcherThread_.join();
            }
        }
    }
    
    /**
     * Reload all configuration sources
     */
    void reload() {
        std::lock_guard<std::mutex> lock(mutex_);
        for (const auto& source : sources_) {
            source->load(*this);
        }
    }
    
    /**
     * Set a configuration value
     */
    template<typename T>
    void set(const std::string& key, const T& value) {
        std::lock_guard<std::mutex> lock(mutex_);
        auto oldValue = values_.find(key) != values_.end() ? values_[key] : std::any();
        values_[key] = value;
        
        // Emit change event
        ConfigChangeEvent event(key, oldValue, std::any(value));
        emitChangeEvent(event);
    }
    
    /**
     * Get a configuration value with a specified type
     */
    template<typename T>
    std::optional<T> get(const std::string& key) const {
        std::lock_guard<std::mutex> lock(mutex_);
        auto it = values_.find(key);
        if (it != values_.end()) {
            try {
                return std::any_cast<T>(it->second);
            } catch (const std::bad_any_cast&) {
                LOG_ERROR << "Configuration type mismatch for key: " << key;
                return std::nullopt;
            }
        }
        return std::nullopt;
    }
    
    /**
     * Get a configuration value with a default
     */
    template<typename T>
    T getWithDefault(const std::string& key, const T& defaultValue) const {
        auto value = get<T>(key);
        return value.has_value() ? *value : defaultValue;
    }
    
    /**
     * Check if a configuration key exists
     */
    bool has(const std::string& key) const {
        std::lock_guard<std::mutex> lock(mutex_);
        return values_.find(key) != values_.end();
    }
    
    /**
     * Register a callback for configuration changes
     */
    size_t onConfigChange(const ChangeCallback& callback) {
        std::lock_guard<std::mutex> lock(mutex_);
        size_t id = nextCallbackId_++;
        changeCallbacks_[id] = callback;
        return id;
    }
    
    /**
     * Unregister a configuration change callback
     */
    void removeConfigChangeCallback(size_t callbackId) {
        std::lock_guard<std::mutex> lock(mutex_);
        changeCallbacks_.erase(callbackId);
    }
    
private:
    // Private constructor for singleton pattern
    ConfigurationManager() : watcherRunning_(false), nextCallbackId_(0) {}
    
    void emitChangeEvent(const ConfigChangeEvent& event) {
        for (const auto& [id, callback] : changeCallbacks_) {
            try {
                callback(event);
            } catch (const std::exception& e) {
                LOG_ERROR << "Error in configuration change callback: " << e.what();
            }
        }
    }
    
    void watcherLoop() {
        using namespace std::chrono_literals;
        
        while (watcherRunning_) {
            {
                std::lock_guard<std::mutex> lock(mutex_);
                for (const auto& source : sources_) {
                    if (source->isDynamic()) {
                        try {
                            source->watchForChanges(*this);
                        } catch (const std::exception& e) {
                            LOG_ERROR << "Error watching for configuration changes: " << e.what();
                        }
                    }
                }
            }
            
            // Sleep for a short time to avoid high CPU usage
            std::this_thread::sleep_for(5s);
        }
    }
    
    mutable std::mutex mutex_;
    std::unordered_map<std::string, std::any> values_;
    std::vector<std::shared_ptr<ConfigSource>> sources_;
    std::unordered_map<size_t, ChangeCallback> changeCallbacks_;
    std::thread watcherThread_;
    bool watcherRunning_;
    size_t nextCallbackId_;
};

// Implementation of EnvConfigSource::load
inline void EnvConfigSource::load(ConfigurationManager& configManager) {
    // Get all environment variables
    for (char** env = environ; *env != nullptr; ++env) {
        std::string envStr = *env;
        size_t pos = envStr.find('=');
        if (pos != std::string::npos) {
            std::string key = envStr.substr(0, pos);
            std::string value = envStr.substr(pos + 1);
            
            // Only process variables with the specified prefix
            if (key.compare(0, prefix_.size(), prefix_) == 0) {
                std::string configKey = key.substr(prefix_.size());
                configManager.set(configKey, value);
            }
        }
    }
}

// Implementation of JsonFileConfigSource::load
inline void JsonFileConfigSource::load(ConfigurationManager& configManager) {
    try {
        if (std::filesystem::exists(filePath_)) {
            lastModifiedTime_ = std::filesystem::last_write_time(filePath_);
            
            std::ifstream file(filePath_);
            nlohmann::json jsonConfig;
            file >> jsonConfig;
            
            loadJsonObject(configManager, jsonConfig, "");
        }
    } catch (const std::exception& e) {
        LOG_ERROR << "Error loading configuration from file " << filePath_ << ": " << e.what();
    }
}

// Helper function to load JSON values into ConfigurationManager
inline void loadJsonObject(ConfigurationManager& configManager, 
                    const nlohmann::json& jsonObj, 
                    const std::string& prefix) {
    for (auto it = jsonObj.begin(); it != jsonObj.end(); ++it) {
        std::string key = prefix.empty() ? it.key() : prefix + "." + it.key();
        
        if (it->is_object()) {
            loadJsonObject(configManager, *it, key);
        } else if (it->is_string()) {
            configManager.set(key, it->get<std::string>());
        } else if (it->is_number_integer()) {
            configManager.set(key, it->get<int64_t>());
        } else if (it->is_number_float()) {
            configManager.set(key, it->get<double>());
        } else if (it->is_boolean()) {
            configManager.set(key, it->get<bool>());
        } else if (it->is_array()) {
            // For arrays, store as JSON string
            configManager.set(key, it->dump());
        }
    }
}

// Implementation of JsonFileConfigSource::watchForChanges
inline void JsonFileConfigSource::watchForChanges(ConfigurationManager& configManager) {
    try {
        if (std::filesystem::exists(filePath_)) {
            auto currentModifiedTime = std::filesystem::last_write_time(filePath_);
            if (currentModifiedTime != lastModifiedTime_) {
                lastModifiedTime_ = currentModifiedTime;
                load(configManager);
            }
        }
    } catch (const std::exception& e) {
        LOG_ERROR << "Error checking for file changes: " << e.what();
    }
}

// Implementation of DatabaseConfigSource::load
inline void DatabaseConfigSource::load(ConfigurationManager& configManager) {
    try {
        auto dbClient = drogon::app().getDbClient(connectionString_);
        lastCheckTime_ = std::chrono::system_clock::now();
        
        // Execute a query to get all configuration settings
        auto result = dbClient->execSqlSync("SELECT key, value, type FROM app_configuration");
        
        for (const auto& row : result) {
            std::string key = row["key"].as<std::string>();
            std::string value = row["value"].as<std::string>();
            std::string type = row["type"].as<std::string>();
            
            if (type == "string") {
                configManager.set(key, value);
            } else if (type == "integer") {
                configManager.set(key, std::stoll(value));
            } else if (type == "double") {
                configManager.set(key, std::stod(value));
            } else if (type == "boolean") {
                configManager.set(key, (value == "true" || value == "1"));
            } else if (type == "json") {
                // Store JSON as string
                configManager.set(key, value);
            }
        }
    } catch (const std::exception& e) {
        LOG_ERROR << "Error loading configuration from database: " << e.what();
    }
}

// Implementation of DatabaseConfigSource::watchForChanges
inline void DatabaseConfigSource::watchForChanges(ConfigurationManager& configManager) {
    try {
        auto now = std::chrono::system_clock::now();
        auto duration = std::chrono::duration_cast<std::chrono::seconds>(now - lastCheckTime_).count();
        
        // Only check database every 60 seconds to avoid too many queries
        if (duration >= 60) {
            auto dbClient = drogon::app().getDbClient(connectionString_);
            lastCheckTime_ = now;
            
            // Query for changes since last check
            auto result = dbClient->execSqlSync(
                "SELECT key, value, type FROM app_configuration WHERE updated_at > $1",
                drogon::orm::SqlBinder().parameter(
                    std::chrono::system_clock::to_time_t(lastCheckTime_ - std::chrono::seconds(1))
                )
            );
            
            for (const auto& row : result) {
                std::string key = row["key"].as<std::string>();
                std::string value = row["value"].as<std::string>();
                std::string type = row["type"].as<std::string>();
                
                if (type == "string") {
                    configManager.set(key, value);
                } else if (type == "integer") {
                    configManager.set(key, std::stoll(value));
                } else if (type == "double") {
                    configManager.set(key, std::stod(value));
                } else if (type == "boolean") {
                    configManager.set(key, (value == "true" || value == "1"));
                } else if (type == "json") {
                    configManager.set(key, value);
                }
            }
        }
    } catch (const std::exception& e) {
        LOG_ERROR << "Error checking for database configuration changes: " << e.what();
    }
}

} // namespace core
} // namespace apt
