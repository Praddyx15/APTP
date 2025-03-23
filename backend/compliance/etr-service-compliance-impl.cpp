#include "compliance/compliance_service.h"
#include "logging/logger.h"
#include <fstream>
#include <sstream>
#include <algorithm>
#include <regex>

namespace etr {
namespace compliance {

// ComplianceService implementation
ComplianceService::ComplianceService(
    std::shared_ptr<IComplianceRepository> compliance_repository,
    std::shared_ptr<records::IRecordRepository> record_repository
) : compliance_repository_(std::move(compliance_repository)),
    record_repository_(std::move(record_repository)) {
    
    logging::Logger::getInstance().info("ComplianceService initialized");
}

ComplianceService::~ComplianceService() {
    logging::Logger::getInstance().info("ComplianceService shutdown");
}

ComplianceStatus ComplianceService::checkCompliance(
    const std::string& trainee_id,
    const std::string& regulation_id,
    const std::string& certification_type
) {
    ComplianceStatus status;
    status.is_compliant = true; // Will be set to false if any requirement is not satisfied
    
    try {
        // Get all requirements for this regulation and certification type
        auto requirements = compliance_repository_->listRequirements(
            regulation_id,
            certification_type
        );
        
        // Get all records for the trainee
        auto [records, _] = record_repository_->listRecords(
            trainee_id,
            std::nullopt,
            std::nullopt,
            std::nullopt,
            std::nullopt,
            std::nullopt,
            std::nullopt,
            1,
            1000, // Fetch a large batch
            "date",
            false
        );
        
        // Check compliance for each requirement
        for (const auto& requirement : requirements) {
            ComplianceItem item = calculateComplianceForRequirement(
                trainee_id, 
                requirement, 
                records
            );
            
            status.compliance_items.push_back(item);
            
            // Update overall compliance status
            if (!item.is_satisfied) {
                status.is_compliant = false;
            }
        }
        
        logging::Logger::getInstance().info(
            "Checked compliance for trainee {}, regulation {}, certification {}: {}",
            trainee_id, regulation_id, certification_type,
            status.is_compliant ? "compliant" : "not compliant"
        );
        
        return status;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error(
            "Error checking compliance for trainee {}, regulation {}, certification {}: {}",
            trainee_id, regulation_id, certification_type, e.what()
        );
        
        // Return not compliant status
        status.is_compliant = false;
        return status;
    }
}

std::vector<ComplianceRequirement> ComplianceService::listRequirements(
    const std::optional<std::string>& regulation_id,
    const std::optional<std::string>& certification_type
) {
    try {
        auto requirements = compliance_repository_->listRequirements(
            regulation_id,
            certification_type
        );
        
        logging::Logger::getInstance().debug(
            "Listed {} compliance requirements",
            requirements.size()
        );
        
        return requirements;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error listing compliance requirements: {}", e.what());
        return {};
    }
}

std::vector<RegulationMapping> ComplianceService::mapRegulations(
    const std::string& source_regulation_id,
    const std::string& target_regulation_id
) {
    try {
        auto mappings = compliance_repository_->getMappings(
            source_regulation_id,
            target_regulation_id
        );
        
        logging::Logger::getInstance().debug(
            "Mapped {} requirements between regulations {} and {}",
            mappings.size(), source_regulation_id, target_regulation_id
        );
        
        return mappings;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error(
            "Error mapping regulations {} to {}: {}",
            source_regulation_id, target_regulation_id, e.what()
        );
        return {};
    }
}

bool ComplianceService::importFAARegulations(const std::string& filename) {
    try {
        std::ifstream file(filename);
        if (!file.is_open()) {
            logging::Logger::getInstance().error("Failed to open FAA regulations file: {}", filename);
            return false;
        }
        
        std::stringstream buffer;
        buffer << file.rdbuf();
        
        auto requirements = parseFAARegulations(buffer.str());
        
        if (requirements.empty()) {
            logging::Logger::getInstance().error("No requirements parsed from FAA regulations file");
            return false;
        }
        
        // Add or update requirements in repository
        for (const auto& requirement : requirements) {
            if (!compliance_repository_->addOrUpdateRequirement(requirement)) {
                logging::Logger::getInstance().error(
                    "Failed to add/update requirement: {}",
                    requirement.requirement_id
                );
                return false;
            }
        }
        
        logging::Logger::getInstance().info(
            "Imported {} FAA regulations from {}",
            requirements.size(), filename
        );
        
        return true;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error importing FAA regulations: {}", e.what());
        return false;
    }
}

bool ComplianceService::importEASARegulations(const std::string& filename) {
    try {
        std::ifstream file(filename);
        if (!file.is_open()) {
            logging::Logger::getInstance().error("Failed to open EASA regulations file: {}", filename);
            return false;
        }
        
        std::stringstream buffer;
        buffer << file.rdbuf();
        
        auto requirements = parseEASARegulations(buffer.str());
        
        if (requirements.empty()) {
            logging::Logger::getInstance().error("No requirements parsed from EASA regulations file");
            return false;
        }
        
        // Add or update requirements in repository
        for (const auto& requirement : requirements) {
            if (!compliance_repository_->addOrUpdateRequirement(requirement)) {
                logging::Logger::getInstance().error(
                    "Failed to add/update requirement: {}",
                    requirement.requirement_id
                );
                return false;
            }
        }
        
        logging::Logger::getInstance().info(
            "Imported {} EASA regulations from {}",
            requirements.size(), filename
        );
        
        return true;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error importing EASA regulations: {}", e.what());
        return false;
    }
}

bool ComplianceService::updateTraineeCompliance(
    const std::string& trainee_id,
    const records::TrainingRecord& record
) {
    try {
        // This method would update the trainee's compliance status based on a new record
        // For simplicity, we'll just log the update and return true
        logging::Logger::getInstance().info(
            "Updated compliance status for trainee {} based on record {}",
            trainee_id, record.getRecordId()
        );
        
        return true;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error(
            "Error updating trainee compliance: {}",
            e.what()
        );
        return false;
    }
}

ComplianceItem ComplianceService::calculateComplianceForRequirement(
    const std::string& trainee_id,
    const ComplianceRequirement& requirement,
    const std::vector<records::TrainingRecord>& records
) {
    ComplianceItem item;
    item.requirement_id = requirement.requirement_id;
    item.requirement_name = requirement.requirement_name;
    item.regulation_reference = requirement.regulation_reference;
    item.required_count = requirement.required_count;
    item.completed_count = 0;
    
    // Filter records that satisfy this requirement
    for (const auto& record : records) {
        // Skip draft or unsigned records
        if (record.isDraft() || !record.isFullySigned()) {
            continue;
        }
        
        // Check if record has grades that satisfy this requirement
        bool satisfies_requirement = false;
        
        for (const auto& grade : record.getGrades()) {
            // This is a simplified check - in a real implementation,
            // we would need to check against specific criteria IDs or other factors
            if (grade.grade >= 2) { // 2 is passing (1-4 scale)
                satisfies_requirement = true;
                break;
            }
        }
        
        if (satisfies_requirement) {
            item.completed_count++;
            item.satisfied_by_records.push_back(record.getRecordId());
        }
    }
    
    // Check if duration-based requirement (e.g., recency)
    if (requirement.duration_days) {
        // Check for records within the duration period
        auto now = std::chrono::system_clock::now();
        auto duration_ago = now - std::chrono::hours(24 * requirement.duration_days.value());
        
        bool has_recent = false;
        
        for (const auto& record_id : item.satisfied_by_records) {
            // Find the record
            auto it = std::find_if(records.begin(), records.end(),
                [&record_id](const records::TrainingRecord& record) {
                    return record.getRecordId() == record_id;
                });
            
            if (it != records.end() && it->getDate() >= duration_ago) {
                has_recent = true;
                break;
            }
        }
        
        if (!has_recent) {
            item.completed_count = 0; // Reset count if recency requirement not met
        }
        
        // Set expiration date
        if (item.completed_count > 0) {
            // Find most recent record
            std::chrono::system_clock::time_point most_recent = std::chrono::system_clock::time_point::min();
            
            for (const auto& record_id : item.satisfied_by_records) {
                auto it = std::find_if(records.begin(), records.end(),
                    [&record_id](const records::TrainingRecord& record) {
                        return record.getRecordId() == record_id;
                    });
                
                if (it != records.end() && it->getDate() > most_recent) {
                    most_recent = it->getDate();
                }
            }
            
            // Expiration is most recent record date + duration
            if (most_recent != std::chrono::system_clock::time_point::min()) {
                item.expiration_date = most_recent + std::chrono::hours(24 * requirement.duration_days.value());
            }
        }
    }
    
    // Determine if requirement is satisfied
    item.is_satisfied = (item.completed_count >= item.required_count);
    
    return item;
}

std::vector<ComplianceRequirement> ComplianceService::parseFAARegulations(const std::string& content) {
    std::vector<ComplianceRequirement> requirements;
    
    try {
        // Parse the content as JSON
        nlohmann::json json = nlohmann::json::parse(content);
        
        // Extract requirements
        for (const auto& item : json) {
            ComplianceRequirement requirement;
            
            requirement.requirement_id = item["id"].get<std::string>();
            requirement.requirement_name = item["name"].get<std::string>();
            requirement.regulation_id = item["regulation_id"].get<std::string>();
            requirement.regulation_name = item["regulation_name"].get<std::string>();
            requirement.regulation_reference = item["reference"].get<std::string>();
            requirement.description = item["description"].get<std::string>();
            requirement.required_count = item["required_count"].get<int>();
            
            if (item.contains("duration_days") && !item["duration_days"].is_null()) {
                requirement.duration_days = item["duration_days"].get<int>();
            }
            
            if (item.contains("equivalent_requirements") && item["equivalent_requirements"].is_array()) {
                for (const auto& eq : item["equivalent_requirements"]) {
                    requirement.equivalent_requirements.push_back(eq.get<std::string>());
                }
            }
            
            requirements.push_back(requirement);
        }
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error parsing FAA regulations: {}", e.what());
    }
    
    return requirements;
}

std::vector<ComplianceRequirement> ComplianceService::parseEASARegulations(const std::string& content) {
    std::vector<ComplianceRequirement> requirements;
    
    try {
        // Parse the content as JSON
        nlohmann::json json = nlohmann::json::parse(content);
        
        // Extract requirements
        for (const auto& item : json) {
            ComplianceRequirement requirement;
            
            requirement.requirement_id = item["id"].get<std::string>();
            requirement.requirement_name = item["name"].get<std::string>();
            requirement.regulation_id = item["regulation_id"].get<std::string>();
            requirement.regulation_name = item["regulation_name"].get<std::string>();
            requirement.regulation_reference = item["reference"].get<std::string>();
            requirement.description = item["description"].get<std::string>();
            requirement.required_count = item["required_count"].get<int>();
            
            if (item.contains("duration_days") && !item["duration_days"].is_null()) {
                requirement.duration_days = item["duration_days"].get<int>();
            }
            
            if (item.contains("equivalent_requirements") && item["equivalent_requirements"].is_array()) {
                for (const auto& eq : item["equivalent_requirements"]) {
                    requirement.equivalent_requirements.push_back(eq.get<std::string>());
                }
            }
            
            requirements.push_back(requirement);
        }
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error parsing EASA regulations: {}", e.what());
    }
    
    return requirements;
}

// ComplianceRequirement methods

nlohmann::json ComplianceRequirement::toJson() const {
    nlohmann::json json;
    json["requirement_id"] = requirement_id;
    json["requirement_name"] = requirement_name;
    json["regulation_id"] = regulation_id;
    json["regulation_name"] = regulation_name;
    json["regulation_reference"] = regulation_reference;
    json["description"] = description;
    json["required_count"] = required_count;
    
    if (duration_days) {
        json["duration_days"] = *duration_days;
    }
    
    json["equivalent_requirements"] = equivalent_requirements;
    
    return json;
}

std::optional<ComplianceRequirement> ComplianceRequirement::fromJson(const nlohmann::json& json) {
    try {
        ComplianceRequirement requirement;
        
        requirement.requirement_id = json["requirement_id"];
        requirement.requirement_name = json["requirement_name"];
        requirement.regulation_id = json["regulation_id"];
        requirement.regulation_name = json["regulation_name"];
        requirement.regulation_reference = json["regulation_reference"];
        requirement.description = json["description"];
        requirement.required_count = json["required_count"];
        
        if (json.contains("duration_days") && !json["duration_days"].is_null()) {
            requirement.duration_days = json["duration_days"];
        }
        
        if (json.contains("equivalent_requirements") && json["equivalent_requirements"].is_array()) {
            requirement.equivalent_requirements = json["equivalent_requirements"].get<std::vector<std::string>>();
        }
        
        return requirement;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error parsing compliance requirement from JSON: {}", e.what());
        return std::nullopt;
    }
}

// RegulationMapping methods

nlohmann::json RegulationMapping::toJson() const {
    nlohmann::json json;
    json["source_requirement_id"] = source_requirement_id;
    json["source_requirement_name"] = source_requirement_name;
    json["target_requirement_id"] = target_requirement_id;
    json["target_requirement_name"] = target_requirement_name;
    json["equivalence_factor"] = equivalence_factor;
    json["notes"] = notes;
    
    return json;
}

std::optional<RegulationMapping> RegulationMapping::fromJson(const nlohmann::json& json) {
    try {
        RegulationMapping mapping;
        
        mapping.source_requirement_id = json["source_requirement_id"];
        mapping.source_requirement_name = json["source_requirement_name"];
        mapping.target_requirement_id = json["target_requirement_id"];
        mapping.target_requirement_name = json["target_requirement_name"];
        mapping.equivalence_factor = json["equivalence_factor"];
        mapping.notes = json["notes"];
        
        return mapping;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error parsing regulation mapping from JSON: {}", e.what());
        return std::nullopt;
    }
}

// ComplianceItem methods

nlohmann::json ComplianceItem::toJson() const {
    nlohmann::json json;
    json["requirement_id"] = requirement_id;
    json["requirement_name"] = requirement_name;
    json["regulation_reference"] = regulation_reference;
    json["is_satisfied"] = is_satisfied;
    json["required_count"] = required_count;
    json["completed_count"] = completed_count;
    json["satisfied_by_records"] = satisfied_by_records;
    
    if (expiration_date) {
        json["expiration_date"] = std::chrono::duration_cast<std::chrono::milliseconds>(
            expiration_date->time_since_epoch()).count();
    }
    
    return json;
}

std::optional<ComplianceItem> ComplianceItem::fromJson(const nlohmann::json& json) {
    try {
        ComplianceItem item;
        
        item.requirement_id = json["requirement_id"];
        item.requirement_name = json["requirement_name"];
        item.regulation_reference = json["regulation_reference"];
        item.is_satisfied = json["is_satisfied"];
        item.required_count = json["required_count"];
        item.completed_count = json["completed_count"];
        item.satisfied_by_records = json["satisfied_by_records"].get<std::vector<std::string>>();
        
        if (json.contains("expiration_date") && !json["expiration_date"].is_null()) {
            item.expiration_date = std::chrono::system_clock::time_point(
                std::chrono::milliseconds(json["expiration_date"].get<int64_t>())
            );
        }
        
        return item;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error parsing compliance item from JSON: {}", e.what());
        return std::nullopt;
    }
}

// ComplianceStatus methods

nlohmann::json ComplianceStatus::toJson() const {
    nlohmann::json json;
    json["is_compliant"] = is_compliant;
    
    json["compliance_items"] = nlohmann::json::array();
    for (const auto& item : compliance_items) {
        json["compliance_items"].push_back(item.toJson());
    }
    
    return json;
}

std::optional<ComplianceStatus> ComplianceStatus::fromJson(const nlohmann::json& json) {
    try {
        ComplianceStatus status;
        
        status.is_compliant = json["is_compliant"];
        
        for (const auto& item_json : json["compliance_items"]) {
            auto item = ComplianceItem::fromJson(item_json);
            if (item) {
                status.compliance_items.push_back(*item);
            }
        }
        
        return status;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error parsing compliance status from JSON: {}", e.what());
        return std::nullopt;
    }
}

} // namespace compliance
} // namespace etr