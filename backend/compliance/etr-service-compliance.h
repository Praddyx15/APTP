#pragma once

#include <string>
#include <vector>
#include <map>
#include <memory>
#include <optional>
#include <chrono>
#include <nlohmann/json.hpp>
#include "records/record_model.h"

namespace etr {
namespace compliance {

/**
 * @brief Compliance requirement
 */
struct ComplianceRequirement {
    std::string requirement_id;
    std::string requirement_name;
    std::string regulation_id;
    std::string regulation_name;
    std::string regulation_reference;
    std::string description;
    int required_count;
    std::optional<int> duration_days;  // If time-limited requirement
    std::vector<std::string> equivalent_requirements;
    
    /**
     * @brief Convert to JSON
     * @return JSON representation
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     * @param json JSON representation
     * @return Compliance requirement or nullopt if invalid
     */
    static std::optional<ComplianceRequirement> fromJson(const nlohmann::json& json);
};

/**
 * @brief Regulation mapping
 */
struct RegulationMapping {
    std::string source_requirement_id;
    std::string source_requirement_name;
    std::string target_requirement_id;
    std::string target_requirement_name;
    double equivalence_factor;  // 1.0 = full equivalence
    std::string notes;
    
    /**
     * @brief Convert to JSON
     * @return JSON representation
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     * @param json JSON representation
     * @return Regulation mapping or nullopt if invalid
     */
    static std::optional<RegulationMapping> fromJson(const nlohmann::json& json);
};

/**
 * @brief Compliance item
 */
struct ComplianceItem {
    std::string requirement_id;
    std::string requirement_name;
    std::string regulation_reference;
    bool is_satisfied;
    int required_count;
    int completed_count;
    std::vector<std::string> satisfied_by_records;
    std::optional<std::chrono::system_clock::time_point> expiration_date;
    
    /**
     * @brief Convert to JSON
     * @return JSON representation
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     * @param json JSON representation
     * @return Compliance item or nullopt if invalid
     */
    static std::optional<ComplianceItem> fromJson(const nlohmann::json& json);
};

/**
 * @brief Compliance status
 */
struct ComplianceStatus {
    bool is_compliant;
    std::vector<ComplianceItem> compliance_items;
    
    /**
     * @brief Convert to JSON
     * @return JSON representation
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     * @param json JSON representation
     * @return Compliance status or nullopt if invalid
     */
    static std::optional<ComplianceStatus> fromJson(const nlohmann::json& json);
};

/**
 * @brief Compliance repository interface
 */
class IComplianceRepository {
public:
    virtual ~IComplianceRepository() = default;
    
    /**
     * @brief Add or update a compliance requirement
     * @param requirement Compliance requirement
     * @return True if added or updated successfully
     */
    virtual bool addOrUpdateRequirement(const ComplianceRequirement& requirement) = 0;
    
    /**
     * @brief Delete a compliance requirement
     * @param requirement_id Requirement ID
     * @return True if deleted successfully
     */
    virtual bool deleteRequirement(const std::string& requirement_id) = 0;
    
    /**
     * @brief Get a compliance requirement
     * @param requirement_id Requirement ID
     * @return Compliance requirement or nullopt if not found
     */
    virtual std::optional<ComplianceRequirement> getRequirement(const std::string& requirement_id) = 0;
    
    /**
     * @brief List compliance requirements
     * @param regulation_id Regulation ID (optional)
     * @param certification_type Certification type (optional)
     * @return Compliance requirements
     */
    virtual std::vector<ComplianceRequirement> listRequirements(
        const std::optional<std::string>& regulation_id = std::nullopt,
        const std::optional<std::string>& certification_type = std::nullopt
    ) = 0;
    
    /**
     * @brief Add or update a regulation mapping
     * @param mapping Regulation mapping
     * @return True if added or updated successfully
     */
    virtual bool addOrUpdateMapping(const RegulationMapping& mapping) = 0;
    
    /**
     * @brief Delete a regulation mapping
     * @param source_requirement_id Source requirement ID
     * @param target_requirement_id Target requirement ID
     * @return True if deleted successfully
     */
    virtual bool deleteMapping(
        const std::string& source_requirement_id,
        const std::string& target_requirement_id
    ) = 0;
    
    /**
     * @brief Get mappings between regulations
     * @param source_regulation_id Source regulation ID
     * @param target_regulation_id Target regulation ID
     * @return Regulation mappings
     */
    virtual std::vector<RegulationMapping> getMappings(
        const std::optional<std::string>& source_regulation_id = std::nullopt,
        const std::optional<std::string>& target_regulation_id = std::nullopt
    ) = 0;
};

/**
 * @brief Compliance service interface
 */
class IComplianceService {
public:
    virtual ~IComplianceService() = default;
    
    /**
     * @brief Check trainee compliance
     * @param trainee_id Trainee ID
     * @param regulation_id Regulation ID
     * @param certification_type Certification type
     * @return Compliance status
     */
    virtual ComplianceStatus checkCompliance(
        const std::string& trainee_id,
        const std::string& regulation_id,
        const std::string& certification_type
    ) = 0;
    
    /**
     * @brief List compliance requirements
     * @param regulation_id Regulation ID (optional)
     * @param certification_type Certification type (optional)
     * @return Compliance requirements
     */
    virtual std::vector<ComplianceRequirement> listRequirements(
        const std::optional<std::string>& regulation_id = std::nullopt,
        const std::optional<std::string>& certification_type = std::nullopt
    ) = 0;
    
    /**
     * @brief Map regulations
     * @param source_regulation_id Source regulation ID
     * @param target_regulation_id Target regulation ID
     * @return Regulation mappings
     */
    virtual std::vector<RegulationMapping> mapRegulations(
        const std::string& source_regulation_id,
        const std::string& target_regulation_id
    ) = 0;
    
    /**
     * @brief Import FAA regulations
     * @param filename Filename
     * @return True if imported successfully
     */
    virtual bool importFAARegulations(const std::string& filename) = 0;
    
    /**
     * @brief Import EASA regulations
     * @param filename Filename
     * @return True if imported successfully
     */
    virtual bool importEASARegulations(const std::string& filename) = 0;
    
    /**
     * @brief Update trainee compliance
     * @param trainee_id Trainee ID
     * @param record Record
     * @return True if updated successfully
     */
    virtual bool updateTraineeCompliance(
        const std::string& trainee_id,
        const records::TrainingRecord& record
    ) = 0;
};

/**
 * @brief Compliance service implementation
 */
class ComplianceService : public IComplianceService {
public:
    /**
     * @brief Constructor
     * @param compliance_repository Compliance repository
     * @param record_repository Record repository
     */
    ComplianceService(
        std::shared_ptr<IComplianceRepository> compliance_repository,
        std::shared_ptr<records::IRecordRepository> record_repository
    );
    
    /**
     * @brief Destructor
     */
    ~ComplianceService() override;
    
    ComplianceStatus checkCompliance(
        const std::string& trainee_id,
        const std::string& regulation_id,
        const std::string& certification_type
    ) override;
    
    std::vector<ComplianceRequirement> listRequirements(
        const std::optional<std::string>& regulation_id,
        const std::optional<std::string>& certification_type
    ) override;
    
    std::vector<RegulationMapping> mapRegulations(
        const std::string& source_regulation_id,
        const std::string& target_regulation_id
    ) override;
    
    bool importFAARegulations(const std::string& filename) override;
    
    bool importEASARegulations(const std::string& filename) override;
    
    bool updateTraineeCompliance(
        const std::string& trainee_id,
        const records::TrainingRecord& record
    ) override;
    
private:
    /**
     * @brief Calculate compliance for a requirement
     * @param trainee_id Trainee ID
     * @param requirement Requirement
     * @param records Records
     * @return Compliance item
     */
    ComplianceItem calculateComplianceForRequirement(
        const std::string& trainee_id,
        const ComplianceRequirement& requirement,
        const std::vector<records::TrainingRecord>& records
    );
    
    /**
     * @brief Parse FAA regulations
     * @param content File content
     * @return Compliance requirements
     */
    std::vector<ComplianceRequirement> parseFAARegulations(const std::string& content);
    
    /**
     * @brief Parse EASA regulations
     * @param content File content
     * @return Compliance requirements
     */
    std::vector<ComplianceRequirement> parseEASARegulations(const std::string& content);
    
    std::shared_ptr<IComplianceRepository> compliance_repository_;
    std::shared_ptr<records::IRecordRepository> record_repository_;
};

} // namespace compliance
} // namespace etr