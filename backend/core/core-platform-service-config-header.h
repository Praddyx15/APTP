#pragma once

#include <string>
#include <unordered_map>
#include <any>
#include <mutex>
#include <optional>
#include <memory>
#include <vector>
#include <nlohmann/json.hpp>

namespace core_platform {
namespace config {

/**
 * @brief Configuration service interface
 */
class IConfigService {
public:
    virtual ~IConfigService() = default;
    
    /**
     * @brief Get a configuration value
     * @tparam T Value type
     * @param key Configuration key
     * @return Configuration value or nullopt if not found
     */
    template<typename T>
    std::optional<T> get(const std::string& key) const {
        return getValueAs<T>(key);
    }
    
    /**
     * @brief Set a configuration value
     * @tparam T Value type
     * @param key Configuration key
     * @param value Configuration value
     */
    template<typename T>
    void set(const std::string& key, const T& value) {
        setValue(key, value);
    }
    
    /**
     * @brief Check if a configuration key exists
     * @param key Configuration key
     * @return True if key exists
     */
    virtual bool has(const std::string& key) const = 0;
    
    /**
     * @brief Reload configuration from sources
     * @return True if reload was successful
     */
    virtual bool reload() = 0;
    
protected:
    /**
     * @brief Get a configuration value as a specific type
     * @tparam T Value type
     * @param key Configuration key
     * @return Configuration value or nullopt if not found or wrong type
     */
    template<typename T>
    virtual std::optional<T> getValueAs(const std::string& key) const = 0;
    
    /**
     * @brief Set a configuration value
     * @tparam T Value type
     * @param key Configuration key
     * @param value Configuration value
     */
    template<typename T>
    virtual void setValue(const std::string& key, const T& value) = 0;
};

/**
 * @brief Configuration source interface
 */
class IConfigSource {
public:
    virtual ~IConfigSource() = default;
    
    /**
     * @brief Load configuration from source
     * @return Configuration data as JSON
     */
    virtual nlohmann::json load() = 0;
    
    /**
     * @brief Save configuration to source
     * @param config Configuration data as JSON
     * @return True if save was successful
     */
    virtual bool save(const nlohmann::json& config) = 0;
    
    /**
     * @brief Get the priority of this source
     * Higher priority sources override lower priority ones
     * @return Priority value
     */
    virtual int getPriority() const = 0;
};

/**
 * @brief File-based configuration source
 */
class FileConfigSource : public IConfigSource {
public:
    /**
     * @brief Constructor
     * @param file_path Path to configuration file
     * @param priority Source priority
     */
    FileConfigSource(const std::string& file_path, int priority = 0);
    
    /**
     * @brief Load configuration from file
     * @return Configuration data as JSON
     */
    nlohmann::json load() override;
    
    /**
     * @brief Save configuration to file
     * @param config Configuration data as JSON
     * @return True if save was successful
     */
    bool save(const nlohmann::json& config) override;
    
    /**
     * @brief Get the priority of this source
     * @return Priority value
     */
    int getPriority() const override;
    
private:
    std::string file_path_;
    int priority_;
};

/**
 * @brief Environment variable configuration source
 */
class EnvConfigSource : public IConfigSource {
public:
    /**
     * @brief Constructor
     * @param prefix Prefix for environment variables
     * @param priority Source priority
     */
    EnvConfigSource(const std::string& prefix = "APP_", int priority = 100);
    
    /**
     * @brief Load configuration from environment variables
     * @return Configuration data as JSON
     */
    nlohmann::json load() override;
    
    /**
     * @brief Save configuration to environment variables
     * Environment variables cannot be saved, so this always returns false
     * @param config Configuration data as JSON
     * @return Always false
     */
    bool save(const nlohmann::json& config) override;
    
    /**
     * @brief Get the priority of this source
     * @return Priority value
     */
    int getPriority() const override;
    
private:
    std::string prefix_;
    int priority_;
};

/**
 * @brief Configuration service implementation
 */
class ConfigService : public IConfigService {
public:
    /**
     * @brief Get the singleton instance
     * @return ConfigService singleton
     */
    static ConfigService& getInstance();
    
    /**
     * @brief Add a configuration source
     * @param source Configuration source
     */
    void addSource(std::shared_ptr<IConfigSource> source);
    
    /**
     * @brief Check if a configuration key exists
     * @param key Configuration key
     * @return True if key exists
     */
    bool has(const std::string& key) const override;
    
    /**
     * @brief Reload configuration from all sources
     * @return True if reload was successful
     */
    bool reload() override;
    
protected:
    /**
     * @brief Get a configuration value as a specific type
     * @tparam T Value type
     * @param key Configuration key
     * @return Configuration value or nullopt if not found or wrong type
     */
    template<typename T>
    std::optional<T> getValueAs(const std::string& key) const override;
    
    /**
     * @brief Set a configuration value
     * @tparam T Value type
     * @param key Configuration key
     * @param value Configuration value
     */
    template<typename T>
    void setValue(const std::string& key, const T& value) override;
    
private:
    ConfigService();
    ~ConfigService() = default;
    
    ConfigService(const ConfigService&) = delete;
    ConfigService& operator=(const ConfigService&) = delete;
    
    /**
     * @brief Parse a configuration key path
     * @param key Configuration key in dot notation
     * @return Vector of key segments
     */
    std::vector<std::string> parseKey(const std::string& key) const;
    
    /**
     * @brief Get JSON element at path
     * @param json JSON object
     * @param path Key path segments
     * @return JSON element or null if not found
     */
    nlohmann::json getJsonAtPath(const nlohmann::json& json, const std::vector<std::string>& path) const;
    
    /**
     * @brief Set JSON element at path
     * @param json JSON object to modify
     * @param path Key path segments
     * @param value Value to set
     */
    void setJsonAtPath(nlohmann::json& json, const std::vector<std::string>& path, const nlohmann::json& value);
    
    std::vector<std::shared_ptr<IConfigSource>> sources_;
    nlohmann::json config_;
    mutable std::mutex mutex_;
};

// Template specializations for common types
template<>
std::optional<std::string> ConfigService::getValueAs(const std::string& key) const;

template<>
std::optional<int> ConfigService::getValueAs(const std::string& key) const;

template<>
std::optional<double> ConfigService::getValueAs(const std::string& key) const;

template<>
std::optional<bool> ConfigService::getValueAs(const std::string& key) const;

template<>
std::optional<std::vector<std::string>> ConfigService::getValueAs(const std::string& key) const;

template<>
void ConfigService::setValue(const std::string& key, const std::string& value);

template<>
void ConfigService::setValue(const std::string& key, const int& value);

template<>
void ConfigService::setValue(const std::string& key, const double& value);

template<>
void ConfigService::setValue(const std::string& key, const bool& value);

template<>
void ConfigService::setValue(const std::string& key, const std::vector<std::string>& value);

} // namespace config
} // namespace core_platform