#include "compliance/compliance_repository.h"
#include "logging/logger.h"
#include "persistence/database_connection.h"

namespace etr {
namespace compliance {

class ComplianceRepository : public IComplianceRepository {
public:
    ComplianceRepository(std::shared_ptr<persistence::DatabaseConnection> db_connection)
        : db_connection_(std::move(db_connection)) {
        logging::Logger::getInstance().info("ComplianceRepository initialized");
    }

    ~ComplianceRepository() override {
        logging::Logger::getInstance().info("ComplianceRepository shutdown");
    }

    bool addOrUpdateRequirement(const ComplianceRequirement& requirement) override {
        try {
            // Check if requirement exists
            std::string check_query = 
                "SELECT requirement_id FROM etr.compliance_requirements WHERE requirement_id = $1";
            
            auto result = db_connection_->executeQuery(check_query, {
                {":requirement_id", requirement.requirement_id, persistence::PgParamType::TEXT, false}
            });
            
            bool exists = !result.isEmpty();
            
            persistence::Transaction transaction = db_connection_->createTransaction();
            
            if (exists) {
                // Update existing requirement
                std::string update_query = 
                    "UPDATE etr.compliance_requirements SET "
                    "requirement_name = $1, "
                    "regulation_id = $2, "
                    "regulation_name = $3, "
                    "regulation_reference = $4, "
                    "description = $5, "
                    "required_count = $6, "
                    "duration_days = $7, "
                    "updated_at = NOW() "
                    "WHERE requirement_id = $8";
                
                auto update_result = db_connection_->executeQuery(update_query, {
                    {":requirement_name", requirement.requirement_name, persistence::PgParamType::TEXT, false},
                    {":regulation_id", requirement.regulation_id, persistence::PgParamType::TEXT, false},
                    {":regulation_name", requirement.regulation_name, persistence::PgParamType::TEXT, false},
                    {":regulation_reference", requirement.regulation_reference, persistence::PgParamType::TEXT, false},
                    {":description", requirement.description, persistence::PgParamType::TEXT, false},
                    {":required_count", std::to_string(requirement.required_count), persistence::PgParamType::INTEGER, false},
                    {":duration_days", requirement.duration_days ? std::to_string(*requirement.duration_days) : "", 
                     persistence::PgParamType::INTEGER, !requirement.duration_days.has_value()},
                    {":requirement_id", requirement.requirement_id, persistence::PgParamType::TEXT, false}
                });
                
                if (update_result.hasError()) {
                    transaction.rollback();
                    logging::Logger::getInstance().error("Failed to update requirement: {}", update_result.getErrorMessage());
                    return false;
                }
            } else {
                // Insert new requirement
                std::string insert_query = 
                    "INSERT INTO etr.compliance_requirements "
                    "(requirement_id, requirement_name, regulation_id, regulation_name, "
                    "regulation_reference, description, required_count, duration_days, "
                    "created_at, updated_at) "
                    "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())";
                
                auto insert_result = db_connection_->executeQuery(insert_query, {
                    {":requirement_id", requirement.requirement_id, persistence::PgParamType::TEXT, false},
                    {":requirement_name", requirement.requirement_name, persistence::PgParamType::TEXT, false},
                    {":regulation_id", requirement.regulation_id, persistence::PgParamType::TEXT, false},
                    {":regulation_name", requirement.regulation_name, persistence::PgParamType::TEXT, false},
                    {":regulation_reference", requirement.regulation_reference, persistence::PgParamType::TEXT, false},
                    {":description", requirement.description, persistence::PgParamType::TEXT, false},
                    {":required_count", std::to_string(requirement.required_count), persistence::PgParamType::INTEGER, false},
                    {":duration_days", requirement.duration_days ? std::to_string(*requirement.duration_days) : "", 
                     persistence::PgParamType::INTEGER, !requirement.duration_days.has_value()}
                });
                
                if (insert_result.hasError()) {
                    transaction.rollback();
                    logging::Logger::getInstance().error("Failed to insert requirement: {}", insert_result.getErrorMessage());
                    return false;
                }
            }
            
            // Delete existing equivalent requirements
            std::string delete_equiv_query = 
                "DELETE FROM etr.equivalent_requirements WHERE source_requirement_id = $1";
            
            auto delete_equiv_result = db_connection_->executeQuery(delete_equiv_query, {
                {":source_requirement_id", requirement.requirement_id, persistence::PgParamType::TEXT, false}
            });
            
            if (delete_equiv_result.hasError()) {
                transaction.rollback();
                logging::Logger::getInstance().error("Failed to delete equivalent requirements: {}", 
                    delete_equiv_result.getErrorMessage());
                return false;
            }
            
            // Insert equivalent requirements
            for (const auto& equiv_id : requirement.equivalent_requirements) {
                std::string insert_equiv_query = 
                    "INSERT INTO etr.equivalent_requirements "
                    "(source_requirement_id, target_requirement_id) "
                    "VALUES ($1, $2)";
                
                auto insert_equiv_result = db_connection_->executeQuery(insert_equiv_query, {
                    {":source_requirement_id", requirement.requirement_id, persistence::PgParamType::TEXT, false},
                    {":target_requirement_id", equiv_id, persistence::PgParamType::TEXT, false}
                });
                
                if (insert_equiv_result.hasError()) {
                    transaction.rollback();
                    logging::Logger::getInstance().error("Failed to insert equivalent requirement: {}", 
                        insert_equiv_result.getErrorMessage());
                    return false;
                }
            }
            
            transaction.commit();
            
            logging::Logger::getInstance().info("Added/updated requirement: {}", requirement.requirement_id);
            return true;
        }
        catch (const std::exception& e) {
            logging::Logger::getInstance().error("Error adding/updating requirement: {}", e.what());
            return false;
        }
    }

    bool deleteRequirement(const std::string& requirement_id) override {
        try {
            persistence::Transaction transaction = db_connection_->createTransaction();
            
            // Delete equivalent requirements
            std::string delete_equiv_query = 
                "DELETE FROM etr.equivalent_requirements WHERE source_requirement_id = $1 OR target_requirement_id = $1";
            
            auto delete_equiv_result = db_connection_->executeQuery(delete_equiv_query, {
                {":requirement_id", requirement_id, persistence::PgParamType::TEXT, false}
            });
            
            if (delete_equiv_result.hasError()) {
                transaction.rollback();
                logging::Logger::getInstance().error("Failed to delete equivalent requirements: {}", 
                    delete_equiv_result.getErrorMessage());
                return false;
            }
            
            // Delete regulation mappings
            std::string delete_mapping_query = 
                "DELETE FROM etr.regulation_mappings WHERE source_requirement_id = $1 OR target_requirement_id = $1";
            
            auto delete_mapping_result = db_connection_->executeQuery(delete_mapping_query, {
                {":requirement_id", requirement_id, persistence::PgParamType::TEXT, false}
            });
            
            if (delete_mapping_result.hasError()) {
                transaction.rollback();
                logging::Logger::getInstance().error("Failed to delete regulation mappings: {}", 
                    delete_mapping_result.getErrorMessage());
                return false;
            }
            
            // Delete trainee compliance records
            std::string delete_trainee_records_query = 
                "DELETE FROM etr.trainee_compliance_records WHERE requirement_id = $1";
            
            auto delete_trainee_records_result = db_connection_->executeQuery(delete_trainee_records_query, {
                {":requirement_id", requirement_id, persistence::PgParamType::TEXT, false}
            });
            
            if (delete_trainee_records_result.hasError()) {
                transaction.rollback();
                logging::Logger::getInstance().error("Failed to delete trainee compliance records: {}", 
                    delete_trainee_records_result.getErrorMessage());
                return false;
            }
            
            // Delete trainee compliance
            std::string delete_trainee_query = 
                "DELETE FROM etr.trainee_compliance WHERE requirement_id = $1";
            
            auto delete_trainee_result = db_connection_->executeQuery(delete_trainee_query, {
                {":requirement_id", requirement_id, persistence::PgParamType::TEXT, false}
            });
            
            if (delete_trainee_result.hasError()) {
                transaction.rollback();
                logging::Logger::getInstance().error("Failed to delete trainee compliance: {}", 
                    delete_trainee_result.getErrorMessage());
                return false;
            }
            
            // Delete requirement
            std::string delete_query = 
                "DELETE FROM etr.compliance_requirements WHERE requirement_id = $1";
            
            auto delete_result = db_connection_->executeQuery(delete_query, {
                {":requirement_id", requirement_id, persistence::PgParamType::TEXT, false}
            });
            
            if (delete_result.hasError()) {
                transaction.rollback();
                logging::Logger::getInstance().error("Failed to delete requirement: {}", 
                    delete_result.getErrorMessage());
                return false;
            }
            
            transaction.commit();
            
            logging::Logger::getInstance().info("Deleted requirement: {}", requirement_id);
            return true;
        }
        catch (const std::exception& e) {
            logging::Logger::getInstance().error("Error deleting requirement: {}", e.what());
            return false;
        }
    }

    std::optional<ComplianceRequirement> getRequirement(const std::string& requirement_id) override {
        try {
            std::string query = 
                "SELECT requirement_id, requirement_name, regulation_id, regulation_name, "
                "regulation_reference, description, required_count, duration_days "
                "FROM etr.compliance_requirements WHERE requirement_id = $1";
            
            auto result = db_connection_->executeQuery(query, {
                {":requirement_id", requirement_id, persistence::PgParamType::TEXT, false}
            });
            
            if (result.isEmpty()) {
                logging::Logger::getInstance().debug("Requirement not found: {}", requirement_id);
                return std::nullopt;
            }
            
            ComplianceRequirement requirement;
            requirement.requirement_id = result.getString(0, "requirement_id");
            requirement.requirement_name = result.getString(0, "requirement_name");
            requirement.regulation_id = result.getString(0, "regulation_id");
            requirement.regulation_name = result.getString(0, "regulation_name");
            requirement.regulation_reference = result.getString(0, "regulation_reference");
            requirement.description = result.getString(0, "description");
            requirement.required_count = result.getInt(0, "required_count");
            
            if (!result.isNull(0, "duration_days")) {
                requirement.duration_days = result.getInt(0, "duration_days");
            }
            
            // Get equivalent requirements
            std::string equiv_query = 
                "SELECT target_requirement_id FROM etr.equivalent_requirements WHERE source_requirement_id = $1";
            
            auto equiv_result = db_connection_->executeQuery(equiv_query, {
                {":source_requirement_id", requirement_id, persistence::PgParamType::TEXT, false}
            });
            
            for (int i = 0; i < equiv_result.getNumRows(); ++i) {
                requirement.equivalent_requirements.push_back(equiv_result.getString(i, "target_requirement_id"));
            }
            
            logging::Logger::getInstance().debug("Retrieved requirement: {}", requirement_id);
            return requirement;
        }
        catch (const std::exception& e) {
            logging::Logger::getInstance().error("Error getting requirement: {}", e.what());
            return std::nullopt;
        }
    }

    std::vector<ComplianceRequirement> listRequirements(
        const std::optional<std::string>& regulation_id,
        const std::optional<std::string>& certification_type
    ) override {
        try {
            std::stringstream query_ss;
            query_ss << "SELECT requirement_id, requirement_name, regulation_id, regulation_name, "
                     << "regulation_reference, description, required_count, duration_days "
                     << "FROM etr.compliance_requirements WHERE 1=1";
            
            std::vector<persistence::PgParam> params;
            
            if (regulation_id) {
                query_ss << " AND regulation_id = $" << (params.size() + 1);
                params.push_back({":regulation_id", *regulation_id, persistence::PgParamType::TEXT, false});
            }
            
            // In a real implementation, we would have a link table for certification types
            // For simplicity, we'll assume certification_type is stored in metadata or similar
            
            query_ss << " ORDER BY regulation_id, requirement_name";
            
            auto result = db_connection_->executeQuery(query_ss.str(), params);
            
            std::vector<ComplianceRequirement> requirements;
            
            for (int i = 0; i < result.getNumRows(); ++i) {
                ComplianceRequirement requirement;
                requirement.requirement_id = result.getString(i, "requirement_id");
                requirement.requirement_name = result.getString(i, "requirement_name");
                requirement.regulation_id = result.getString(i, "regulation_id");
                requirement.regulation_name = result.getString(i, "regulation_name");
                requirement.regulation_reference = result.getString(i, "regulation_reference");
                requirement.description = result.getString(i, "description");
                requirement.required_count = result.getInt(i, "required_count");
                
                if (!result.isNull(i, "duration_days")) {
                    requirement.duration_days = result.getInt(i, "duration_days");
                }
                
                // Get equivalent requirements
                std::string equiv_query = 
                    "SELECT target_requirement_id FROM etr.equivalent_requirements WHERE source_requirement_id = $1";
                
                auto equiv_result = db_connection_->executeQuery(equiv_query, {
                    {":source_requirement_id", requirement.requirement_id, persistence::PgParamType::TEXT, false}
                });
                
                for (int j = 0; j < equiv_result.getNumRows(); ++j) {
                    requirement.equivalent_requirements.push_back(equiv_result.getString(j, "target_requirement_id"));
                }
                
                requirements.push_back(requirement);
            }
            
            logging::Logger::getInstance().debug("Listed {} requirements", requirements.size());
            return requirements;
        }
        catch (const std::exception& e) {
            logging::Logger::getInstance().error("Error listing requirements: {}", e.what());
            return {};
        }
    }

    bool addOrUpdateMapping(const RegulationMapping& mapping) override {
        try {
            // Check if mapping exists
            std::string check_query = 
                "SELECT source_requirement_id FROM etr.regulation_mappings "
                "WHERE source_requirement_id = $1 AND target_requirement_id = $2";
            
            auto result = db_connection_->executeQuery(check_query, {
                {":source_requirement_id", mapping.source_requirement_id, persistence::PgParamType::TEXT, false},
                {":target_requirement_id", mapping.target_requirement_id, persistence::PgParamType::TEXT, false}
            });
            
            bool exists = !result.isEmpty();
            
            if (exists) {
                // Update existing mapping
                std::string update_query = 
                    "UPDATE etr.regulation_mappings SET "
                    "equivalence_factor = $1, "
                    "notes = $2 "
                    "WHERE source_requirement_id = $3 AND target_requirement_id = $4";
                
                auto update_result = db_connection_->executeQuery(update_query, {
                    {":equivalence_factor", std::to_string(mapping.equivalence_factor), persistence::PgParamType::DOUBLE, false},
                    {":notes", mapping.notes, persistence::PgParamType::TEXT, false},
                    {":source_requirement_id", mapping.source_requirement_id, persistence::PgParamType::TEXT, false},
                    {":target_requirement_id", mapping.target_requirement_id, persistence::PgParamType::TEXT, false}
                });
                
                if (update_result.hasError()) {
                    logging::Logger::getInstance().error("Failed to update mapping: {}", update_result.getErrorMessage());
                    return false;
                }
            } else {
                // Insert new mapping
                std::string insert_query = 
                    "INSERT INTO etr.regulation_mappings "
                    "(source_requirement_id, target_requirement_id, equivalence_factor, notes) "
                    "VALUES ($1, $2, $3, $4)";
                
                auto insert_result = db_connection_->executeQuery(insert_query, {
                    {":source_requirement_id", mapping.source_requirement_id, persistence::PgParamType::TEXT, false},
                    {":target_requirement_id", mapping.target_requirement_id, persistence::PgParamType::TEXT, false},
                    {":equivalence_factor", std::to_string(mapping.equivalence_factor), persistence::PgParamType::DOUBLE, false},
                    {":notes", mapping.notes, persistence::PgParamType::TEXT, false}
                });
                
                if (insert_result.hasError()) {
                    logging::Logger::getInstance().error("Failed to insert mapping: {}", insert_result.getErrorMessage());
                    return false;
                }
            }
            
            logging::Logger::getInstance().info("Added/updated mapping: {} -> {}", 
                mapping.source_requirement_id, mapping.target_requirement_id);
            return true;
        }
        catch (const std::exception& e) {
            logging::Logger::getInstance().error("Error adding/updating mapping: {}", e.what());
            return false;
        }
    }

    bool deleteMapping(
        const std::string& source_requirement_id,
        const std::string& target_requirement_id
    ) override {
        try {
            std::string delete_query = 
                "DELETE FROM etr.regulation_mappings "
                "WHERE source_requirement_id = $1 AND target_requirement_id = $2";
            
            auto delete_result = db_connection_->executeQuery(delete_query, {
                {":source_requirement_id", source_requirement_id, persistence::PgParamType::TEXT, false},
                {":target_requirement_id", target_requirement_id, persistence::PgParamType::TEXT, false}
            });
            
            if (delete_result.hasError()) {
                logging::Logger::getInstance().error("Failed to delete mapping: {}", delete_result.getErrorMessage());
                return false;
            }
            
            logging::Logger::getInstance().info("Deleted mapping: {} -> {}", 
                source_requirement_id, target_requirement_id);
            return true;
        }
        catch (const std::exception& e) {
            logging::Logger::getInstance().error("Error deleting mapping: {}", e.what());
            return false;
        }
    }

    std::vector<RegulationMapping> getMappings(
        const std::optional<std::string>& source_regulation_id,
        const std::optional<std::string>& target_regulation_id
    ) override {
        try {
            std::stringstream query_ss;
            query_ss << "SELECT m.source_requirement_id, src.requirement_name as source_requirement_name, "
                     << "m.target_requirement_id, tgt.requirement_name as target_requirement_name, "
                     << "m.equivalence_factor, m.notes "
                     << "FROM etr.regulation_mappings m "
                     << "JOIN etr.compliance_requirements src ON m.source_requirement_id = src.requirement_id "
                     << "JOIN etr.compliance_requirements tgt ON m.target_requirement_id = tgt.requirement_id "
                     << "WHERE 1=1";
            
            std::vector<persistence::PgParam> params;
            
            if (source_regulation_id) {
                query_ss << " AND src.regulation_id = $" << (params.size() + 1);
                params.push_back({":source_regulation_id", *source_regulation_id, persistence::PgParamType::TEXT, false});
            }
            
            if (target_regulation_id) {
                query_ss << " AND tgt.regulation_id = $" << (params.size() + 1);
                params.push_back({":target_regulation_id", *target_regulation_id, persistence::PgParamType::TEXT, false});
            }
            
            query_ss << " ORDER BY src.requirement_name, tgt.requirement_name";
            
            auto result = db_connection_->executeQuery(query_ss.str(), params);
            
            std::vector<RegulationMapping> mappings;
            
            for (int i = 0; i < result.getNumRows(); ++i) {
                RegulationMapping mapping;
                mapping.source_requirement_id = result.getString(i, "source_requirement_id");
                mapping.source_requirement_name = result.getString(i, "source_requirement_name");
                mapping.target_requirement_id = result.getString(i, "target_requirement_id");
                mapping.target_requirement_name = result.getString(i, "target_requirement_name");
                mapping.equivalence_factor = result.getDouble(i, "equivalence_factor");
                mapping.notes = result.getString(i, "notes");
                
                mappings.push_back(mapping);
            }
            
            logging::Logger::getInstance().debug("Listed {} mappings", mappings.size());
            return mappings;
        }
        catch (const std::exception& e) {
            logging::Logger::getInstance().error("Error getting mappings: {}", e.what());
            return {};
        }
    }

private:
    std::shared_ptr<persistence::DatabaseConnection> db_connection_;
};

// Factory function to create compliance repository
std::shared_ptr<IComplianceRepository> createComplianceRepository(
    std::shared_ptr<persistence::DatabaseConnection> db_connection
) {
    return std::make_shared<ComplianceRepository>(std::move(db_connection));
}

} // namespace compliance
} // namespace etr