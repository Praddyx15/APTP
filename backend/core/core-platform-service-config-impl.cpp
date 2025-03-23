#include "config/config_service.h"
#include "logging/logger.h"

#include <fstream>
#include <iostream>
#include <sstream>
#include <algorithm>
#include <stdexcept>
#include <cstdlib>

namespace core_platform {
namespace config {

// FileConfigSource implementation

FileConfigSource::FileConfigSource(const std::string& file_path, int priority)
    : file_path_(file_path), priority_(priority) {
}

nlohmann::json FileConfigSource::load() {
    try {
        std::ifstream file(file_path_);
        if (!file.is_open()) {
            logging::Logger::getInstance().warn("Could not open config file: {}", file_path_);
            return nlohmann::json::object();
        }
        
        nlohmann::json config;
        file >> config;
        
        logging::Logger::getInstance().info("Loaded configuration from file: {}", file_path_);
        return config;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error loading configuration from file {}: {}", 
            file_path_, e.what());
        return nlohmann::json::object();
    }
}

bool FileConfigSource::save(const nlohmann::json& config) {
    try {
        std::ofstream file(file_path_);
        if (!file.is_open()) {
            logging::Logger::getInstance().error("Could not open config file for writing: {}", file_path_);
            return false;
        }
        
        file << std::setw(4) << config;
        
        logging::Logger::getInstance().info("Saved configuration to file: {}", file_path_);
        return true;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error saving configuration to file {}: {}", 
            file_path_, e.what());
        return false;
    }
}

int FileConfigSource::getPriority() const {
    return priority_;
}

// EnvConfigSource implementation

EnvConfigSource::EnvConfigSource(const std::string& prefix, int priority)
    : prefix_(prefix), priority_(priority) {
}

nlohmann::json EnvConfigSource::load() {
    nlohmann::json config = nlohmann::json::object();
    
    // Platform-specific code to get environment variables
    #ifdef _WIN32
        char* env = nullptr;
        size_t len = 0;
        if (_dupenv_s(&env, &len, "PATH") == 0 && env != nullptr) {
            free(env);
        }
        
        // Windows env var enumeration
        LPWCH envStrings = GetEnvironmentStringsW();
        if (envStrings != nullptr) {
            LPWCH current = envStrings;
            while (*current) {
                DWORD size = WideCharToMultiByte(CP_UTF8, 0, current, -1, NULL, 0, NULL, NULL);
                if (size > 0) {
                    std::vector<char> buffer(size);
                    WideCharToMultiByte(CP_UTF8, 0, current, -1, buffer.data(), size, NULL, NULL);
                    std::string envVar(buffer.data());
                    
                    size_t pos = envVar.find('=');
                    if (pos != std::string::npos) {
                        std::string key = envVar.substr(0, pos);
                        std::string value = envVar.substr(pos + 1);
                        
                        if (key.find(prefix_) == 0) {
                            std::string configKey = key.substr(prefix_.length());
                            std::replace(configKey.begin(), configKey.end(), '_', '.');
                            std::transform(configKey.begin(), configKey.end(), configKey.begin(), ::tolower);
                            
                            // Parse and convert the value to appropriate JSON type
                            try {
                                if (value == "true" || value == "false") {
                                    config[configKey] = (value == "true");
                                } else if (std::all_of(value.begin(), value.end(), [](char c) {
                                    return std::isdigit(c) || c == '-' || c == '+';
                                })) {
                                    config[configKey] = std::stoi(value);
                                } else if (std::all_of(value.begin(), value.end(), [](char c) {
                                    return std::isdigit(c) || c == '.' || c == '-' || c == '+' || c == 'e' || c == 'E';
                                })) {
                                    config[configKey] = std::stod(value);
                                } else {
                                    config[configKey] = value;
                                }
                            } catch (const std::exception&) {
                                config[configKey] = value;
                            }
                        }
                    }
                }
                
                current += wcslen(current) + 1;
            }
            FreeEnvironmentStringsW(envStrings);
        }
    #else
        // POSIX env var enumeration
        for (char** env = environ; *env != nullptr; ++env) {
            std::string envVar(*env);
            size_t pos = envVar.find('=');
            if (pos != std::string::npos) {
                std::string key = envVar.substr(0, pos);
                std::string value = envVar.substr(pos + 1);
                
                if (key.find(prefix_) == 0) {
                    std::string configKey = key.substr(prefix_.length());
                    std::replace(configKey.begin(), configKey.end(), '_', '.');
                    std::transform(configKey.begin(), configKey.end(), configKey.begin(), ::tolower);
                    
                    // Parse and convert the value to appropriate JSON type
                    try {
                        if (value == "true" || value == "false") {
                            config[configKey] = (value == "true");
                        } else if (std::all_of(value.begin(), value.end(), [](char c) {
                            return std::isdigit(c) || c == '-' || c == '+';
                        })) {
                            config[configKey] = std::stoi(value);
                        } else if (std::all_of(value.begin(), value.end(), [](char c) {
                            return std::isdigit(c) || c == '.' || c == '-' || c == '+' || c == 'e' || c == 'E';
                        })) {
                            config[configKey] = std::stod(value);
                        } else {
                            config[configKey] = value;
                        }
                    } catch (const std::exception&) {
                        config[configKey] = value;
                    }
                }
            }
        }
    #endif
    
    logging::Logger::getInstance().info("Loaded configuration from environment variables with prefix: {}", prefix_);
    return config;
}

bool EnvConfigSource::save(const nlohmann::json& config) {
    // Environment variables cannot be saved programmatically in a cross-platform way
    logging::Logger::getInstance().warn("Saving to environment variables is not supported");
    return false;
}

int EnvConfigSource::getPriority() const {
    return priority_;
}

// ConfigService implementation

ConfigService& ConfigService::getInstance() {
    static ConfigService instance;
    return instance;
}

ConfigService::ConfigService() : config_(nlohmann::json::object()) {
    logging::Logger::getInstance().info("ConfigService initialized");
}

void ConfigService::addSource(std::shared_ptr<IConfigSource> source) {
    std::lock_guard<std::mutex> lock(mutex_);
    sources_.push_back(source);
    
    // Sort sources by priority (descending)
    std::sort(sources_.begin(), sources_.end(), 
        [](const std::shared_ptr<IConfigSource>& a, const std::shared_ptr<IConfigSource>& b) {
            return a->getPriority() > b->getPriority();
        });
    
    // Load configuration from this source and merge with existing
    nlohmann::json source_config = source->load();
    
    // Merge with existing configuration
    // Higher priority sources override lower priority ones
    for (auto& [key, value] : source_config.items()) {
        config_[key] = value;
    }
    
    logging::Logger::getInstance().debug("Added configuration source with priority {}", source->getPriority());
}

bool ConfigService::has(const std::string& key) const {
    std::lock_guard<std::mutex> lock(mutex_);
    
    std::vector<std::string> path = parseKey(key);
    if (path.empty()) {
        return false;
    }
    
    nlohmann::json value = getJsonAtPath(config_, path);
    return !value.is_null();
}

bool ConfigService::reload() {
    std::lock_guard<std::mutex> lock(mutex_);
    
    // Clear existing configuration
    config_ = nlohmann::json::object();
    
    // Load from all sources in order of priority
    for (const auto& source : sources_) {
        nlohmann::json source_config = source->load();
        
        // Merge with existing configuration
        for (auto& [key, value] : source_config.items()) {
            config_[key] = value;
        }
    }
    
    logging::Logger::getInstance().info("Configuration reloaded from all sources");
    return true;
}

std::vector<std::string> ConfigService::parseKey(const std::string& key) const {
    std::vector<std::string> result;
    std::stringstream ss(key);
    std::string segment;
    
    while (std::getline(ss, segment, '.')) {
        if (!segment.empty()) {
            result.push_back(segment);
        }
    }
    
    return result;
}

nlohmann::json ConfigService::getJsonAtPath(
    const nlohmann::json& json, 
    const std::vector<std::string>& path
) const {
    nlohmann::json current = json;
    
    for (const auto& segment : path) {
        if (!current.is_object() || !current.contains(segment)) {
            return nullptr;
        }
        
        current = current[segment];
    }
    
    return current;
}

void ConfigService::setJsonAtPath(
    nlohmann::json& json, 
    const std::vector<std::string>& path, 
    const nlohmann::json& value
) {
    if (path.empty()) {
        return;
    }
    
    nlohmann::json* current = &json;
    
    for (size_t i = 0; i < path.size() - 1; ++i) {
        const auto& segment = path[i];
        
        if (!current->is_object()) {
            *current = nlohmann::json::object();
        }
        
        if (!current->contains(segment)) {
            (*current)[segment] = nlohmann::json::object();
        }
        
        current = &(*current)[segment];
    }
    
    (*current)[path.back()] = value;
}

// Template specializations

template<>
std::optional<std::string> ConfigService::getValueAs(const std::string& key) const {
    std::lock_guard<std::mutex> lock(mutex_);
    
    std::vector<std::string> path = parseKey(key);
    if (path.empty()) {
        return std::nullopt;
    }
    
    nlohmann::json value = getJsonAtPath(config_, path);
    if (value.is_null()) {
        return std::nullopt;
    }
    
    try {
        return value.get<std::string>();
    } catch (const std::exception& e) {
        logging::Logger::getInstance().warn("Failed to convert config value for key {} to string: {}", 
            key, e.what());
        return std::nullopt;
    }
}

template<>
std::optional<int> ConfigService::getValueAs(const std::string& key) const {
    std::lock_guard<std::mutex> lock(mutex_);
    
    std::vector<std::string> path = parseKey(key);
    if (path.empty()) {
        return std::nullopt;
    }
    
    nlohmann::json value = getJsonAtPath(config_, path);
    if (value.is_null()) {
        return std::nullopt;
    }
    
    try {
        return value.get<int>();
    } catch (const std::exception& e) {
        logging::Logger::getInstance().warn("Failed to convert config value for key {} to int: {}", 
            key, e.what());
        return std::nullopt;
    }
}

template<>
std::optional<double> ConfigService::getValueAs(const std::string& key) const {
    std::lock_guard<std::mutex> lock(mutex_);
    
    std::vector<std::string> path = parseKey(key);
    if (path.empty()) {
        return std::nullopt;
    }
    
    nlohmann::json value = getJsonAtPath(config_, path);
    if (value.is_null()) {
        return std::nullopt;
    }
    
    try {
        return value.get<double>();
    } catch (const std::exception& e) {
        logging::Logger::getInstance().warn("Failed to convert config value for key {} to double: {}", 
            key, e.what());
        return std::nullopt;
    }
}

template<>
std::optional<bool> ConfigService::getValueAs(const std::string& key) const {
    std::lock_guard<std::mutex> lock(mutex_);
    
    std::vector<std::string> path = parseKey(key);
    if (path.empty()) {
        return std::nullopt;
    }
    
    nlohmann::json value = getJsonAtPath(config_, path);
    if (value.is_null()) {
        return std::nullopt;
    }
    
    try {
        return value.get<bool>();
    } catch (const std::exception& e) {
        logging::Logger::getInstance().warn("Failed to convert config value for key {} to bool: {}", 
            key, e.what());
        return std::nullopt;
    }
}

template<>
std::optional<std::vector<std::string>> ConfigService::getValueAs(const std::string& key) const {
    std::lock_guard<std::mutex> lock(mutex_);
    
    std::vector<std::string> path = parseKey(key);
    if (path.empty()) {
        return std::nullopt;
    }
    
    nlohmann::json value = getJsonAtPath(config_, path);
    if (value.is_null() || !value.is_array()) {
        return std::nullopt;
    }
    
    try {
        return value.get<std::vector<std::string>>();
    } catch (const std::exception& e) {
        logging::Logger::getInstance().warn("Failed to convert config value for key {} to string array: {}", 
            key, e.what());
        return std::nullopt;
    }
}

template<>
void ConfigService::setValue(const std::string& key, const std::string& value) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    std::vector<std::string> path = parseKey(key);
    if (path.empty()) {
        return;
    }
    
    setJsonAtPath(config_, path, value);
    
    // Save to all writable sources
    for (const auto& source : sources_) {
        source->save(config_);
    }
    
    logging::Logger::getInstance().debug("Set config value for key {}: {}", key, value);
}

template<>
void ConfigService::setValue(const std::string& key, const int& value) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    std::vector<std::string> path = parseKey(key);
    if (path.empty()) {
        return;
    }
    
    setJsonAtPath(config_, path, value);
    
    // Save to all writable sources
    for (const auto& source : sources_) {
        source->save(config_);
    }
    
    logging::Logger::getInstance().debug("Set config value for key {}: {}", key, value);
}

template<>
void ConfigService::setValue(const std::string& key, const double& value) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    std::vector<std::string> path = parseKey(key);
    if (path.empty()) {
        return;
    }
    
    setJsonAtPath(config_, path, value);
    
    // Save to all writable sources
    for (const auto& source : sources_) {
        source->save(config_);
    }
    
    logging::Logger::getInstance().debug("Set config value for key {}: {}", key, value);
}

template<>
void ConfigService::setValue(const std::string& key, const bool& value) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    std::vector<std::string> path = parseKey(key);
    if (path.empty()) {
        return;
    }
    
    setJsonAtPath(config_, path, value);
    
    // Save to all writable sources
    for (const auto& source : sources_) {
        source->save(config_);
    }
    
    logging::Logger::getInstance().debug("Set config value for key {}: {}", key, value);
}

template<>
void ConfigService::setValue(const std::string& key, const std::vector<std::string>& value) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    std::vector<std::string> path = parseKey(key);
    if (path.empty()) {
        return;
    }
    
    setJsonAtPath(config_, path, value);
    
    // Save to all writable sources
    for (const auto& source : sources_) {
        source->save(config_);
    }
    
    logging::Logger::getInstance().debug("Set config value for key {}: array with {} elements", 
        key, value.size());
}

} // namespace config
} // namespace core_platform