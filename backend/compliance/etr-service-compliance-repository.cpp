#include "compliance/compliance_repository.h"
#include "logging/logger.h"
#include <chrono>

namespace etr {
namespace compliance {

ComplianceRepository::ComplianceRepository(
    std::shared_ptr<persistence::DatabaseConnection> db_connection
) : db_connection_(std::move(db_connection)) {
    logging::Logger::getInstance().info("ComplianceRepository initialized");
}

bool ComplianceRepository::addOrUpdateRequirement(const ComplianceRequirement& requirement) {
    try {
        // Start transaction
        auto transaction = db_connection_->createTransaction();
        
        // Check if requirement exists
        std::string check_query = 
            "SELECT requirement_id FROM etr.compliance_requirements WHERE requirement_id = $1";
        
        auto check_result = db_connection_->executeQuery(
            check_query,
            {
                {
                    "requirement_id",
                    requirement.requirement_id,
                    persistence::PgParamType::TEXT,
                    false
                }
            }
        );
        
        bool exists = check_result.getNumRows() > 0;
        
        std::string query;
        std::vector<persistence::PgParam> params;
        
        if (exists) {
            // Update existing requirement
            query = 
                "UPDATE etr.compliance_requirements SET "
                "requirement_name = $1, "
                "regulation_id = $2, "
                "regulation_name = $3, "
                "regulation_reference = $4, "
                "description = $5, "
                "required_count = $6, "
                "duration_days = $7, "
                "updated_at = $8 "
                "WHERE requirement_id = $9";
            
            params = {
                {
                    "requirement_name",
                    requirement.requirement_name,
                    persistence::PgParamType::TEXT,
                    false
                },
                {
                    "regulation_id",
                    requirement.regulation_id,
                    persistence::PgParamType::TEXT,
                    false
                },
                {
                    "regulation_name",
                    requirement.regulation_name,
                    persistence::PgParamType::TEXT,
                    false
                },
                {
                    "regulation_reference",
                    requirement.regulation_reference,
                    persistence::PgParamType::TEXT,
                    false
                },
                {
                    "description",
                    requirement.description,
                    persistence::PgParamType::TEXT,
                    false
                },
                {
                    "required_count",
                    std::to_string(requirement.required_count),
                    persistence::PgParamType::INTEGER,
                    false
                },
                {
                    "duration_days",
                    requirement.duration_days ? std::to_string(*requirement.duration_days) : "",
                    persistence::PgParamType::INTEGER,
                    !requirement.duration_days.has_value()
                },
                {
                    "updated_at",
                    std::to_string(std::chrono::duration_cast<std::chrono::seconds>(
                        std::chrono::system_clock::now().time_since_epoch()
                    ).count()),
                    persistence::PgParamType::TIMESTAMP,
                    false
                },
                {
                    "requirement_id",
                    requirement.requirement_id,
                    persistence::PgParamType::TEXT,
                    false
                }
            };
        } else {
            // Insert new requirement
            query = 
                "INSERT INTO etr.compliance_requirements ("
                "requirement_id, requirement_name, regulation_id, regulation_name, "
                "regulation_reference, description, required_count, duration_days, "
                "created_at, updated_at) "
                "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)";
            
            params = {
                {
                    "requirement_id",
                    requirement.requirement_id,
                    persistence::PgParamType::TEXT,
                    false
                },
                {
                    "requirement_name",
                    requirement.requirement_name,
                    persistence::PgParamType::TEXT,
                    false
                },
                {
                    "regulation_id",
                    requirement.regulation_id,
                    persistence::PgParamType::TEXT,
                    false
                },
                {
                    "regulation_name",
                    requirement.regulation_name,
                    persistence::PgParamType::TEXT,
                    false
                },
                {
                    "regulation_reference",
                    requirement.regulation_reference,
                    persistence::PgParamType::TEXT,
                    false
                },
                {
                    "description",
                    requirement.description,
                    persistence::PgParamType::TEXT,
                    false
                },
                {
                    "required_count",
                    std::to_string(requirement.required_count),
                    persistence::PgParamType::INTEGER,
                    false
                },
                {
                    "duration_days",
                    requirement.duration_days ? std::to_string(*requirement.duration_days) : "",
                    persistence::PgParamType::INTEGER,
                    !requirement.duration_days.has_value()
                },
                {
                    "created_at",
                    std::to_string(std::chrono::duration_cast<std::chrono::seconds>(
                        std::chrono::system_clock::now().time_since_epoch()
                    ).count()),
                    persistence::PgParamType::TIMESTAMP,
                    false
                }
            };
        }
        
        // Execute query
        auto result = db_connection_->executeQuery(query, params);
        
        // Handle equivalent requirements
        if (exists) {
            // Delete existing equivalent requirements
            std::string delete_eq_query = 
                "DELETE FROM etr.equivalent_requirements WHERE source_requirement_id = $1";
            
            db_connection_->executeQuery(
                delete_eq_query,
                {
                    {
                        "requirement_id",
                        requirement.requirement_id,
                        persistence::PgParamType::TEXT,
                        false
                    }
                }
            );
        }
        
        // Add equivalent requirements
        for (const auto& eq_req : requirement.equivalent_requirements) {
            std::string eq_query = 
                "INSERT INTO etr.equivalent_requirements (source_requirement_id, target_requirement_id) "
                "VALUES ($1, $2)";
            
            db_connection_->executeQuery(
                eq_query,
                {
                    {
                        "source_requirement_id",
                        requirement.requirement_id,
                        persistence::PgParamType::TEXT,
                        false
                    },
                    {
                        "target_requirement_id",
                        eq_req,
                        persistence::PgParamType::TEXT,
                        false
                    }
                }
            );
        }
        
        // Commit transaction
        transaction.commit();
        
        logging::Logger::getInstance().info(
            "Added/updated compliance requirement: {}",
            requirement.requirement_id
        );
        
        return true;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error(
            "Error adding/updating compliance requirement: {}",
            e.what()
        );
        return false;
    }
}

bool ComplianceRepository::deleteRequirement(const std::string& requirement_id) {
    try {
        // Start transaction
        auto transaction = db_connection_->createTransaction();
        
        // Delete equivalent requirements
        std::string delete_eq_query = 
            "DELETE FROM etr.equivalent_requirements WHERE source_requirement_id = $1 OR target_requirement_id = $1";
        
        db_connection_->executeQuery(
            delete_eq_query,
            {
                {
                    "requirement_id",
                    requirement_id,
                    persistence::PgParamType::TEXT,
                    false
                }
            }
        );
        
        // Delete regulation mappings
        std::string delete_map_query = 
            "DELETE FROM etr.regulation_mappings WHERE source_requirement_id = $1 OR target_requirement_id = $1";
        
        db_connection_->executeQuery(
            delete_map_query,
            {
                {
                    "requirement_id",
                    requirement_id,
                    persistence::PgParamType::TEXT,
                    false
                }
            }
        );
        
        // Delete requirement
        std::string delete_query = 
            "DELETE FROM etr.compliance_requirements WHERE requirement_id = $1";
        
        auto result = db_connection_->executeQuery(
            delete_query,
            {
                {
                    "requirement_id",
                    requirement_id,
                    persistence::PgParamType::TEXT,
                    false
                }
            }
        );
        
        // Commit transaction
        transaction.commit();
        
        logging::Logger::getInstance().info(
            "Deleted compliance requirement: {}",
            requirement_id
        );
        
        return result.getAffectedRows() > 0;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error(
            "Error deleting compliance requirement: {}",
            e.what()
        );
        return false;
    }
}

std::optional<ComplianceRequirement> ComplianceRepository::getRequirement(const std::string& requirement_id) {
    try {
        // Query for requirement
        std::string query = 
            "SELECT requirement_id, requirement_name, regulation_id, regulation_name, "
            "regulation_reference, description, required_count, duration_days "
            "FROM etr.compliance_requirements WHERE requirement_id = $1";
        
        auto result = db_connection_->executeQuery(
            query,
            {
                {
                    "requirement_id",
                    requirement_id,
                    persistence::PgParamType::TEXT,
                    false
                }
            }
        );
        
        if (result.getNumRows() == 0) {
            return std::nullopt;
        }
        
        // Create requirement object
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
        
        // Query for equivalent requirements
        std::string eq_query = 
            "SELECT target_requirement_id FROM etr.equivalent_requirements WHERE source_requirement_id = $1";
        
        auto eq_result = db_connection_->executeQuery(
            eq_query,
            {
                {
                    "requirement_id",
                    requirement_id,
                    persistence::PgParamType::TEXT,
                    false
                }
            }
        );
        
        for (int i = 0; i < eq_result.getNumRows(); i++) {
            requirement.equivalent_requirements.push_back(
                eq_result.getString(i, "target_requirement_id")
            );
        }
        
        logging::Logger::getInstance().debug(
            "Retrieved compliance requirement: {}",
            requirement_id
        );
        
        return requirement;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error(
            "Error getting compliance requirement: {}",
            e.what()
        );
        return std::nullopt;
    }
}

std::vector<ComplianceRequirement> ComplianceRepository::listRequirements(
    const std::optional<std::string>& regulation_id,
    const std::optional<std::string>& certification_type
) {
    try {
        std::vector<ComplianceRequirement> requirements;
        
        // Construct query based on filters
        std::string query = 
            "SELECT requirement_id, requirement_name, regulation_id, regulation_name, "
            "regulation_reference, description, required_count, duration_days "
            "FROM etr.compliance_requirements";
        
        std::vector<persistence::PgParam> params;
        std::vector<std::string> conditions;
        
        if (regulation_id) {
            conditions.push_back("regulation_id = $" + std::to_string(params.size() + 1));
            params.push_back({
                "regulation_id",
                *regulation_id,
                persistence::PgParamType::TEXT,
                false
            });
        }
        
        // Apply certification type filter through metadata
        if (certification_type) {
            // In a real implementation, this would join with a metadata table
            // For simplicity, we'll just log that this filter was requested
            logging::Logger::getInstance().info(
                "Certification type filter not implemented in this version"
            );
        }
        
        // Add WHERE clause if there are conditions
        if (!conditions.empty()) {
            query += " WHERE " + conditions[0];
            for (size_t i = 1; i < conditions.size(); i++) {
                query += " AND " + conditions[i];
            }
        }
        
        // Execute query
        auto result = db_connection_->executeQuery(query, params);
        
        // Process results
        for (int i = 0; i < result.getNumRows(); i++) {
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
            std::string eq_query = 
                "SELECT target_requirement_id FROM etr.equivalent_requirements WHERE source_requirement_id = $1";
            
            auto eq_result = db_connection_->executeQuery(
                eq_query,
                {
                    {
                        "requirement_id",
                        requirement.requirement_id,
                        persistence::PgParamType::TEXT,
                        false
                    }
                }
            );
            
            for (int j = 0; j < eq_result.getNumRows(); j++) {
                requirement.equivalent_requirements.push_back(
                    eq_result.getString(j, "target_requirement_id")
                );
            }
            
            requirements.push_back(requirement);
        }
        
        logging::Logger::getInstance().debug(
            "Listed {} compliance requirements",
            requirements.size()
        );
        
        return requirements;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error(
            "Error listing compliance requirements: {}",
            e.what()
        );
        return {};
    }
}

bool ComplianceRepository::addOrUpdateMapping(const RegulationMapping& mapping) {
    try {
        // Start transaction
        auto transaction = db_connection_->createTransaction();
        
        // Check if mapping exists
        std::string check_query = 
            "SELECT source_requirement_id FROM etr.regulation_mappings "
            "WHERE source_requirement_id = $1 AND target_requirement_id = $2";
        
        auto check_result = db_connection_->executeQuery(
            check_query,
            {
                {
                    "source_requirement_id",
                    mapping.source_requirement_id,
                    persistence::PgParamType::TEXT,
                    false
                },
                {
                    "target_requirement_id",
                    mapping.target_requirement_id,
                    persistence::PgParamType::TEXT,
                    false
                }
            }
        );
        
        bool exists = check_result.getNumRows() > 0;
        
        std::string query;
        
        if (exists) {
            // Update existing mapping
            query = 
                "UPDATE etr.regulation_mappings SET "
                "equivalence_factor = $1, "
                "notes = $2 "
                "WHERE source_requirement_id = $3 AND target_requirement_id = $4";
        } else {
            // Insert new mapping
            query = 
                "INSERT INTO etr.regulation_mappings ("
                "source_requirement_id, source_requirement_name, "
                "target_requirement_id, target_requirement_name, "
                "equivalence_factor, notes) "
                "VALUES ($3, $5, $4, $6, $1, $2)";
        }
        
        auto result = db_connection_->executeQuery(
            query,
            {
                {
                    "equivalence_factor",
                    std::to_string(mapping.equivalence_factor),
                    persistence::PgParamType::DOUBLE,
                    false
                },
                {
                    "notes",
                    mapping.notes,
                    persistence::PgParamType::TEXT,
                    false
                },
                {
                    "source_requirement_id",
                    mapping.source_requirement_id,
                    persistence::PgParamType::TEXT,
                    false
                },
                {
                    "target_requirement_id",
                    mapping.target_requirement_id,
                    persistence::PgParamType::TEXT,
                    false
                },
                {
                    "source_requirement_name",
                    mapping.source_requirement_name,
                    persistence::PgParamType::TEXT,
                    false
                },
                {
                    "target_requirement_name",
                    mapping.target_requirement_name,
                    persistence::PgParamType::TEXT,
                    false
                }
            }
        );
        
        // Commit transaction
        transaction.commit();
        
        logging::Logger::getInstance().info(
            "Added/updated regulation mapping: {} -> {}",
            mapping.source_requirement_id,
            mapping.target_requirement_id
        );
        
        return true;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error(
            "Error adding/updating regulation mapping: {}",
            e.what()
        );
        return false;
    }
}

bool ComplianceRepository::deleteMapping(
    const std::string& source_requirement_id,
    const std::string& target_requirement_id
) {
    try {
        // Delete mapping
        std::string query = 
            "DELETE FROM etr.regulation_mappings "
            "WHERE source_requirement_id = $1 AND target_requirement_id = $2";
        
        auto result = db_connection_->executeQuery(
            query,
            {
                {
                    "source_requirement_id",
                    source_requirement_id,
                    persistence::PgParamType::TEXT,
                    false
                },
                {
                    "target_requirement_id",
                    target_requirement_id,
                    persistence::PgParamType::TEXT,
                    false
                }
            }
        );
        
        logging::Logger::getInstance().info(
            "Deleted regulation mapping: {} -> {}",
            source_requirement_id,
            target_requirement_id
        );
        
        return result.getAffectedRows() > 0;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error(
            "Error deleting regulation mapping: {}",
            e.what()
        );
        return false;
    }
}

std::vector<RegulationMapping> ComplianceRepository::getMappings(
    const std::optional<std::string>& source_regulation_id,
    const std::optional<std::string>& target_regulation_id
) {
    try {
        std::vector<RegulationMapping> mappings;
        
        // Construct query based on filters
        std::string query = 
            "SELECT rm.source_requirement_id, rm.source_requirement_name, "
            "rm.target_requirement_id, rm.target_requirement_name, "
            "rm.equivalence_factor, rm.notes, "
            "cr1.regulation_id AS source_regulation_id, "
            "cr2.regulation_id AS target_regulation_id "
            "FROM etr.regulation_mappings rm "
            "JOIN etr.compliance_requirements cr1 ON rm.source_requirement_id = cr1.requirement_id "
            "JOIN etr.compliance_requirements cr2 ON rm.target_requirement_id = cr2.requirement_id";
        
        std::vector<persistence::PgParam> params;
        std::vector<std::string> conditions;
        
        if (source_regulation_id) {
            conditions.push_back("cr1.regulation_id = $" + std::to_string(params.size() + 1));
            params.push_back({
                "source_regulation_id",
                *source_regulation_id,
                persistence::PgParamType::TEXT,
                false
            });
        }
        
        if (target_regulation_id) {
            conditions.push_back("cr2.regulation_id = $" + std::to_string(params.size() + 1));
            params.push_back({
                "target_regulation_id",
                *target_regulation_id,
                persistence::PgParamType::TEXT,
                false
            });
        }
        
        // Add WHERE clause if there are conditions
        if (!conditions.empty()) {
            query += " WHERE " + conditions[0];
            for (size_t i = 1; i < conditions.size(); i++) {
                query += " AND " + conditions[i];
            }
        }
        
        // Execute query
        auto result = db_connection_->executeQuery(query, params);
        
        // Process results
        for (int i = 0; i < result.getNumRows(); i++) {
            RegulationMapping mapping;
            mapping.source_requirement_id = result.getString(i, "source_requirement_id");
            mapping.source_requirement_name = result.getString(i, "source_requirement_name");
            mapping.target_requirement_id = result.getString(i, "target_requirement_id");
            mapping.target_requirement_name = result.getString(i, "target_requirement_name");
            mapping.equivalence_factor = result.getDouble(i, "equivalence_factor");
            mapping.notes = result.getString(i, "notes");
            
            mappings.push_back(mapping);
        }
        
        logging::Logger::getInstance().debug(
            "Listed {} regulation mappings",
            mappings.size()
        );
        
        return mappings;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error(
            "Error getting regulation mappings: {}",
            e.what()
        );
        return {};
    }
}

} // namespace compliance
} // namespace etr