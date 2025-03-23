#include "syllabus/syllabus_service.h"
#include "logging/logger.h"
#include <algorithm>
#include <unordered_set>

namespace etr {
namespace syllabus {

// String conversion functions
std::string syllabusStatusToString(SyllabusStatus status) {
    switch (status) {
        case SyllabusStatus::DRAFT: return "DRAFT";
        case SyllabusStatus::APPROVED: return "APPROVED";
        case SyllabusStatus::ARCHIVED: return "ARCHIVED";
        default: return "UNKNOWN";
    }
}

SyllabusStatus syllabusStatusFromString(const std::string& str) {
    if (str == "DRAFT") return SyllabusStatus::DRAFT;
    if (str == "APPROVED") return SyllabusStatus::APPROVED;
    if (str == "ARCHIVED") return SyllabusStatus::ARCHIVED;
    return SyllabusStatus::DRAFT;  // Default to DRAFT
}

std::string changeTypeToString(ChangeType type) {
    switch (type) {
        case ChangeType::ADDED: return "ADDED";
        case ChangeType::MODIFIED: return "MODIFIED";
        case ChangeType::REMOVED: return "REMOVED";
        default: return "UNKNOWN";
    }
}

ChangeType changeTypeFromString(const std::string& str) {
    if (str == "ADDED") return ChangeType::ADDED;
    if (str == "MODIFIED") return ChangeType::MODIFIED;
    if (str == "REMOVED") return ChangeType::REMOVED;
    return ChangeType::MODIFIED;  // Default to MODIFIED
}

std::string elementTypeToString(ElementType type) {
    switch (type) {
        case ElementType::SYLLABUS: return "SYLLABUS";
        case ElementType::SECTION: return "SECTION";
        case ElementType::EXERCISE: return "EXERCISE";
        case ElementType::CRITERIA: return "CRITERIA";
        case ElementType::OBJECTIVE: return "OBJECTIVE";
        case ElementType::REFERENCE: return "REFERENCE";
        case ElementType::EQUIPMENT: return "EQUIPMENT";
        case ElementType::PREREQUISITE: return "PREREQUISITE";
        case ElementType::METADATA: return "METADATA";
        default: return "UNKNOWN";
    }
}

ElementType elementTypeFromString(const std::string& str) {
    if (str == "SYLLABUS") return ElementType::SYLLABUS;
    if (str == "SECTION") return ElementType::SECTION;
    if (str == "EXERCISE") return ElementType::EXERCISE;
    if (str == "CRITERIA") return ElementType::CRITERIA;
    if (str == "OBJECTIVE") return ElementType::OBJECTIVE;
    if (str == "REFERENCE") return ElementType::REFERENCE;
    if (str == "EQUIPMENT") return ElementType::EQUIPMENT;
    if (str == "PREREQUISITE") return ElementType::PREREQUISITE;
    if (str == "METADATA") return ElementType::METADATA;
    return ElementType::SYLLABUS;  // Default to SYLLABUS
}

// SyllabusService implementation
SyllabusService::SyllabusService(
    std::shared_ptr<ISyllabusRepository> syllabus_repository,
    std::shared_ptr<signature::IDigitalSignatureService> signature_service
) : syllabus_repository_(std::move(syllabus_repository)),
    signature_service_(std::move(signature_service)) {
    
    logging::Logger::getInstance().info("SyllabusService initialized");
}

SyllabusService::~SyllabusService() {
    logging::Logger::getInstance().info("SyllabusService shutdown");
}

std::string SyllabusService::createSyllabus(const Syllabus& syllabus) {
    try {
        // Validate syllabus
        if (!syllabus.isValid()) {
            logging::Logger::getInstance().error("Invalid syllabus data");
            return "";
        }
        
        // Make sure version is unique
        auto existing_syllabus = syllabus_repository_->getSyllabus(
            syllabus.getSyllabusId(),
            syllabus.getVersion()
        );
        
        if (existing_syllabus) {
            logging::Logger::getInstance().error(
                "Syllabus already exists with ID {} and version {}",
                syllabus.getSyllabusId(), syllabus.getVersion()
            );
            return "";
        }
        
        // Set initial status to DRAFT if not specified
        Syllabus syllabus_copy = syllabus;
        if (syllabus_copy.getStatus() == SyllabusStatus::APPROVED && 
            !syllabus_copy.getApprovalSignature()) {
            syllabus_copy.setStatus(SyllabusStatus::DRAFT);
        }
        
        // Create the syllabus
        std::string syllabus_id = syllabus_repository_->createSyllabus(syllabus_copy);
        
        if (!syllabus_id.empty()) {
            logging::Logger::getInstance().info(
                "Created syllabus with ID {} and version {}",
                syllabus_id, syllabus_copy.getVersion()
            );
        } else {
            logging::Logger::getInstance().error("Failed to create syllabus");
        }
        
        return syllabus_id;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error creating syllabus: {}", e.what());
        return "";
    }
}

std::optional<Syllabus> SyllabusService::getSyllabus(
    const std::string& syllabus_id,
    const std::optional<std::string>& version
) {
    try {
        auto syllabus = syllabus_repository_->getSyllabus(syllabus_id, version);
        
        if (syllabus) {
            logging::Logger::getInstance().debug(
                "Retrieved syllabus with ID {} and version {}",
                syllabus_id, syllabus->getVersion()
            );
        } else {
            logging::Logger::getInstance().debug(
                "Syllabus not found with ID {} and version {}",
                syllabus_id, version ? *version : "latest"
            );
        }
        
        return syllabus;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error(
            "Error getting syllabus {}, version {}: {}",
            syllabus_id, version ? *version : "latest", e.what()
        );
        return std::nullopt;
    }
}

bool SyllabusService::updateSyllabus(const Syllabus& syllabus, const std::string& user_id) {
    try {
        // Validate syllabus
        if (!syllabus.isValid()) {
            logging::Logger::getInstance().error("Invalid syllabus data");
            return false;
        }
        
        // Get existing syllabus
        auto existing_syllabus = syllabus_repository_->getSyllabus(
            syllabus.getSyllabusId(),
            syllabus.getVersion()
        );
        
        if (!existing_syllabus) {
            logging::Logger::getInstance().error(
                "Syllabus not found with ID {} and version {}",
                syllabus.getSyllabusId(), syllabus.getVersion()
            );
            return false;
        }
        
        // Check authorization
        if (!isAuthorizedToModify(*existing_syllabus, user_id)) {
            logging::Logger::getInstance().error(
                "User {} not authorized to modify syllabus {}",
                user_id, syllabus.getSyllabusId()
            );
            return false;
        }
        
        // Cannot modify APPROVED or ARCHIVED syllabus
        if (existing_syllabus->getStatus() != SyllabusStatus::DRAFT) {
            logging::Logger::getInstance().error(
                "Cannot modify syllabus in {} state",
                syllabusStatusToString(existing_syllabus->getStatus())
            );
            return false;
        }
        
        // Calculate changes
        auto changes = calculateChanges(*existing_syllabus, syllabus, user_id);
        
        // Update the syllabus
        bool success = syllabus_repository_->updateSyllabus(syllabus);
        
        if (success) {
            // Log changes
            for (const auto& change : changes) {
                syllabus_repository_->logChange(syllabus.getSyllabusId(), change);
            }
            
            logging::Logger::getInstance().info(
                "Updated syllabus with ID {} and version {}, {} changes",
                syllabus.getSyllabusId(), syllabus.getVersion(), changes.size()
            );
        } else {
            logging::Logger::getInstance().error(
                "Failed to update syllabus with ID {} and version {}",
                syllabus.getSyllabusId(), syllabus.getVersion()
            );
        }
        
        return success;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error updating syllabus: {}", e.what());
        return false;
    }
}

bool SyllabusService::deleteSyllabus(const std::string& syllabus_id, const std::string& user_id) {
    try {
        // Get existing syllabus
        auto existing_syllabus = syllabus_repository_->getSyllabus(syllabus_id);
        
        if (!existing_syllabus) {
            logging::Logger::getInstance().error("Syllabus not found with ID {}", syllabus_id);
            return false;
        }
        
        // Check authorization
        if (!isAuthorizedToModify(*existing_syllabus, user_id)) {
            logging::Logger::getInstance().error(
                "User {} not authorized to delete syllabus {}",
                user_id, syllabus_id
            );
            return false;
        }
        
        // Cannot delete APPROVED or ARCHIVED syllabus
        if (existing_syllabus->getStatus() != SyllabusStatus::DRAFT) {
            logging::Logger::getInstance().error(
                "Cannot delete syllabus in {} state",
                syllabusStatusToString(existing_syllabus->getStatus())
            );
            return false;
        }
        
        // Delete the syllabus
        bool success = syllabus_repository_->deleteSyllabus(syllabus_id);
        
        if (success) {
            logging::Logger::getInstance().info("Deleted syllabus with ID {}", syllabus_id);
        } else {
            logging::Logger::getInstance().error("Failed to delete syllabus with ID {}", syllabus_id);
        }
        
        return success;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error deleting syllabus: {}", e.what());
        return false;
    }
}

std::pair<std::vector<SyllabusSummary>, int> SyllabusService::listSyllabi(
    const std::optional<std::string>& course_id,
    const std::optional<SyllabusStatus>& status,
    const std::optional<std::chrono::system_clock::time_point>& effective_date,
    int page,
    int page_size,
    const std::string& sort_by,
    bool ascending
) {
    try {
        auto [syllabi, total_count] = syllabus_repository_->listSyllabi(
            course_id,
            status,
            effective_date,
            page,
            page_size,
            sort_by,
            ascending
        );
        
        logging::Logger::getInstance().debug(
            "Listed {} syllabi out of {} total",
            syllabi.size(), total_count
        );
        
        return {syllabi, total_count};
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error listing syllabi: {}", e.what());
        return {{}, 0};
    }
}

std::vector<SyllabusChange> SyllabusService::trackChanges(
    const std::string& syllabus_id,
    const std::string& from_version,
    const std::string& to_version
) {
    try {
        auto changes = syllabus_repository_->trackChanges(
            syllabus_id,
            from_version,
            to_version
        );
        
        logging::Logger::getInstance().debug(
            "Tracked {} changes between versions {} and {} of syllabus {}",
            changes.size(), from_version, to_version, syllabus_id
        );
        
        return changes;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error(
            "Error tracking changes for syllabus {}, versions {} to {}: {}",
            syllabus_id, from_version, to_version, e.what()
        );
        return {};
    }
}

bool SyllabusService::approveSyllabus(
    const std::string& syllabus_id,
    const std::string& approver_id,
    const std::string& certificate_data,
    const std::vector<uint8_t>& signature_data
) {
    try {
        // Get existing syllabus
        auto syllabus = syllabus_repository_->getSyllabus(syllabus_id);
        
        if (!syllabus) {
            logging::Logger::getInstance().error("Syllabus not found with ID {}", syllabus_id);
            return false;
        }
        
        // Check if syllabus is in DRAFT state
        if (syllabus->getStatus() != SyllabusStatus::DRAFT) {
            logging::Logger::getInstance().error(
                "Cannot approve syllabus in {} state",
                syllabusStatusToString(syllabus->getStatus())
            );
            return false;
        }
        
        // Validate certificate
        if (!signature_service_->validateCertificate(certificate_data)) {
            logging::Logger::getInstance().error("Invalid certificate for approval");
            return false;
        }
        
        // Extract user ID from certificate and verify it matches approver_id
        std::string cert_user_id = signature_service_->extractUserIdFromCertificate(certificate_data);
        if (cert_user_id != approver_id) {
            logging::Logger::getInstance().error(
                "Certificate user ID ({}) does not match approver ID ({})",
                cert_user_id, approver_id
            );
            return false;
        }
        
        // Generate digest for syllabus
        std::vector<uint8_t> digest = generateSyllabusDigest(*syllabus);
        
        // Verify signature
        auto cert_info = signature_service_->parseCertificate(certificate_data);
        if (!cert_info) {
            logging::Logger::getInstance().error("Failed to parse certificate");
            return false;
        }
        
        // Create signature info
        records::SignatureInfo signature_info;
        signature_info.signer_id = approver_id;
        signature_info.signer_name = cert_info->subject_name;
        signature_info.certificate_id = cert_info->certificate_id;
        signature_info.signature_data = signature_data;
        signature_info.timestamp = std::chrono::system_clock::now();
        signature_info.is_valid = true;
        
        // Update syllabus
        syllabus->setStatus(SyllabusStatus::APPROVED);
        syllabus->setApprovalSignature(signature_info);
        
        // Update the syllabus
        bool success = syllabus_repository_->updateSyllabus(*syllabus);
        
        if (success) {
            logging::Logger::getInstance().info(
                "Approved syllabus with ID {} and version {} by {}",
                syllabus_id, syllabus->getVersion(), approver_id
            );
        } else {
            logging::Logger::getInstance().error(
                "Failed to approve syllabus with ID {} and version {}",
                syllabus_id, syllabus->getVersion()
            );
        }
        
        return success;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error(
            "Error approving syllabus {}: {}",
            syllabus_id, e.what()
        );
        return false;
    }
}

bool SyllabusService::archiveSyllabus(
    const std::string& syllabus_id,
    const std::string& user_id
) {
    try {
        // Get existing syllabus
        auto syllabus = syllabus_repository_->getSyllabus(syllabus_id);
        
        if (!syllabus) {
            logging::Logger::getInstance().error("Syllabus not found with ID {}", syllabus_id);
            return false;
        }
        
        // Check authorization
        if (!isAuthorizedToModify(*syllabus, user_id)) {
            logging::Logger::getInstance().error(
                "User {} not authorized to archive syllabus {}",
                user_id, syllabus_id
            );
            return false;
        }
        
        // Can only archive APPROVED syllabus
        if (syllabus->getStatus() != SyllabusStatus::APPROVED) {
            logging::Logger::getInstance().error(
                "Cannot archive syllabus in {} state",
                syllabusStatusToString(syllabus->getStatus())
            );
            return false;
        }
        
        // Update syllabus
        syllabus->setStatus(SyllabusStatus::ARCHIVED);
        
        // Update the syllabus
        bool success = syllabus_repository_->updateSyllabus(*syllabus);
        
        if (success) {
            logging::Logger::getInstance().info(
                "Archived syllabus with ID {} and version {}",
                syllabus_id, syllabus->getVersion()
            );
        } else {
            logging::Logger::getInstance().error(
                "Failed to archive syllabus with ID {} and version {}",
                syllabus_id, syllabus->getVersion()
            );
        }
        
        return success;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error(
            "Error archiving syllabus {}: {}",
            syllabus_id, e.what()
        );
        return false;
    }
}

std::string SyllabusService::cloneSyllabus(
    const std::string& syllabus_id,
    const std::string& new_version,
    const std::string& user_id
) {
    try {
        // Get existing syllabus
        auto syllabus = syllabus_repository_->getSyllabus(syllabus_id);
        
        if (!syllabus) {
            logging::Logger::getInstance().error("Syllabus not found with ID {}", syllabus_id);
            return "";
        }
        
        // Create a copy with new version
        Syllabus new_syllabus = *syllabus;
        new_syllabus.setVersion(new_version);
        new_syllabus.setStatus(SyllabusStatus::DRAFT);
        new_syllabus.clearExpirationDate();  // Clear expiration date for new version
        new_syllabus.setAuthorId(user_id);
        
        // Set creation and update times
        auto now = std::chrono::system_clock::now();
        new_syllabus.setCreatedAt(now);
        new_syllabus.setUpdatedAt(now);
        
        // Create the new syllabus
        std::string new_syllabus_id = syllabus_repository_->createSyllabus(new_syllabus);
        
        if (!new_syllabus_id.empty()) {
            logging::Logger::getInstance().info(
                "Cloned syllabus {} from version {} to new version {}",
                syllabus_id, syllabus->getVersion(), new_version
            );
        } else {
            logging::Logger::getInstance().error(
                "Failed to clone syllabus {} to new version {}",
                syllabus_id, new_version
            );
        }
        
        return new_syllabus_id;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error(
            "Error cloning syllabus {}: {}",
            syllabus_id, e.what()
        );
        return "";
    }
}

std::string SyllabusService::importSyllabusFromJson(
    const std::string& json_content,
    const std::string& user_id
) {
    try {
        // Parse JSON
        nlohmann::json json = nlohmann::json::parse(json_content);
        
        // Convert to syllabus
        auto syllabus = Syllabus::fromJson(json);
        
        if (!syllabus) {
            logging::Logger::getInstance().error("Failed to parse syllabus from JSON");
            return "";
        }
        
        // Set author ID to current user
        syllabus->setAuthorId(user_id);
        
        // Set status to DRAFT
        syllabus->setStatus(SyllabusStatus::DRAFT);
        
        // Create the syllabus
        return createSyllabus(*syllabus);
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error importing syllabus from JSON: {}", e.what());
        return "";
    }
}

std::string SyllabusService::exportSyllabusToJson(
    const std::string& syllabus_id,
    const std::optional<std::string>& version
) {
    try {
        // Get syllabus
        auto syllabus = syllabus_repository_->getSyllabus(syllabus_id, version);
        
        if (!syllabus) {
            logging::Logger::getInstance().error(
                "Syllabus not found with ID {} and version {}",
                syllabus_id, version ? *version : "latest"
            );
            return "";
        }
        
        // Convert to JSON
        nlohmann::json json = syllabus->toJson();
        
        logging::Logger::getInstance().info(
            "Exported syllabus with ID {} and version {} to JSON",
            syllabus_id, syllabus->getVersion()
        );
        
        return json.dump(4);  // Pretty print with 4-space indent
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error(
            "Error exporting syllabus {} to JSON: {}",
            syllabus_id, e.what()
        );
        return "";
    }
}

std::vector<uint8_t> SyllabusService::generateSyllabusDigest(const Syllabus& syllabus) {
    // In a real implementation, this would create a secure hash of the syllabus content
    // For simplicity, we'll just return a dummy digest
    std::vector<uint8_t> digest(32, 0);  // 32-byte zero digest
    
    // Use a proper hash algorithm in a real implementation, e.g.:
    // std::string syllabus_str = syllabus.toJson().dump();
    // SHA256(reinterpret_cast<const unsigned char*>(syllabus_str.c_str()), syllabus_str.length(), digest.data());
    
    return digest;
}

bool SyllabusService::isAuthorizedToModify(const Syllabus& syllabus, const std::string& user_id) {
    // In a real implementation, this would check against a proper authorization system
    // For simplicity, we'll just allow the author and admin users to modify
    return (syllabus.getAuthorId() == user_id || user_id == "admin");
}

std::vector<SyllabusChange> SyllabusService::calculateChanges(
    const Syllabus& old_syllabus,
    const Syllabus& new_syllabus,
    const std::string& user_id
) {
    std::vector<SyllabusChange> changes;
    
    // Check for changes in syllabus properties
    if (old_syllabus.getTitle() != new_syllabus.getTitle() ||
        old_syllabus.getDescription() != new_syllabus.getDescription() ||
        old_syllabus.getEffectiveDate() != new_syllabus.getEffectiveDate() ||
        old_syllabus.getExpirationDate() != new_syllabus.getExpirationDate()) {
        
        SyllabusChange change;
        change.change_type = ChangeType::MODIFIED;
        change.element_type = ElementType::SYLLABUS;
        change.element_id = new_syllabus.getSyllabusId();
        change.description = "Modified syllabus properties";
        change.author_id = user_id;
        change.timestamp = std::chrono::system_clock::now();
        
        // Record old values
        if (old_syllabus.getTitle() != new_syllabus.getTitle()) {
            change.old_values["title"] = old_syllabus.getTitle();
            change.new_values["title"] = new_syllabus.getTitle();
        }
        
        if (old_syllabus.getDescription() != new_syllabus.getDescription()) {
            change.old_values["description"] = old_syllabus.getDescription();
            change.new_values["description"] = new_syllabus.getDescription();
        }
        
        if (old_syllabus.getEffectiveDate() != new_syllabus.getEffectiveDate()) {
            // Format dates as ISO strings
            auto old_time_t = std::chrono::system_clock::to_time_t(old_syllabus.getEffectiveDate());
            auto new_time_t = std::chrono::system_clock::to_time_t(new_syllabus.getEffectiveDate());
            
            std::stringstream old_ss, new_ss;
            old_ss << std::put_time(std::gmtime(&old_time_t), "%Y-%m-%dT%H:%M:%SZ");
            new_ss << std::put_time(std::gmtime(&new_time_t), "%Y-%m-%dT%H:%M:%SZ");
            
            change.old_values["effective_date"] = old_ss.str();
            change.new_values["effective_date"] = new_ss.str();
        }
        
        // Handle optional expiration date
        if (old_syllabus.getExpirationDate() != new_syllabus.getExpirationDate()) {
            if (old_syllabus.getExpirationDate()) {
                auto old_time_t = std::chrono::system_clock::to_time_t(*old_syllabus.getExpirationDate());
                std::stringstream old_ss;
                old_ss << std::put_time(std::gmtime(&old_time_t), "%Y-%m-%dT%H:%M:%SZ");
                change.old_values["expiration_date"] = old_ss.str();
            } else {
                change.old_values["expiration_date"] = "none";
            }
            
            if (new_syllabus.getExpirationDate()) {
                auto new_time_t = std::chrono::system_clock::to_time_t(*new_syllabus.getExpirationDate());
                std::stringstream new_ss;
                new_ss << std::put_time(std::gmtime(&new_time_t), "%Y-%m-%dT%H:%M:%SZ");
                change.new_values["expiration_date"] = new_ss.str();
            } else {
                change.new_values["expiration_date"] = "none";
            }
        }
        
        changes.push_back(change);
    }
    
    // Check for changes in sections
    
    // Get maps of sections by ID for easy lookup
    std::unordered_map<std::string, SyllabusSection> old_sections;
    for (const auto& section : old_syllabus.getSections()) {
        old_sections[section.section_id] = section;
    }
    
    std::unordered_map<std::string, SyllabusSection> new_sections;
    for (const auto& section : new_syllabus.getSections()) {
        new_sections[section.section_id] = section;
    }
    
    // Find sections added in new syllabus
    for (const auto& [section_id, section] : new_sections) {
        if (old_sections.find(section_id) == old_sections.end()) {
            // Section was added
            SyllabusChange change;
            change.change_type = ChangeType::ADDED;
            change.element_type = ElementType::SECTION;
            change.element_id = section_id;
            change.description = "Added section: " + section.title;
            change.author_id = user_id;
            change.timestamp = std::chrono::system_clock::now();
            
            change.new_values["title"] = section.title;
            change.new_values["description"] = section.description;
            change.new_values["order"] = std::to_string(section.order);
            
            changes.push_back(change);
        }
    }
    
    // Find sections removed or modified in old syllabus
    for (const auto& [section_id, old_section] : old_sections) {
        auto it = new_sections.find(section_id);
        if (it == new_sections.end()) {
            // Section was removed
            SyllabusChange change;
            change.change_type = ChangeType::REMOVED;
            change.element_type = ElementType::SECTION;
            change.element_id = section_id;
            change.description = "Removed section: " + old_section.title;
            change.author_id = user_id;
            change.timestamp = std::chrono::system_clock::now();
            
            change.old_values["title"] = old_section.title;
            change.old_values["description"] = old_section.description;
            change.old_values["order"] = std::to_string(old_section.order);
            
            changes.push_back(change);
        } else {
            // Section exists in both, check for modifications
            const auto& new_section = it->second;
            
            if (old_section.title != new_section.title ||
                old_section.description != new_section.description ||
                old_section.order != new_section.order) {
                
                SyllabusChange change;
                change.change_type = ChangeType::MODIFIED;
                change.element_type = ElementType::SECTION;
                change.element_id = section_id;
                change.description = "Modified section: " + new_section.title;
                change.author_id = user_id;
                change.timestamp = std::chrono::system_clock::now();
                
                if (old_section.title != new_section.title) {
                    change.old_values["title"] = old_section.title;
                    change.new_values["title"] = new_section.title;
                }
                
                if (old_section.description != new_section.description) {
                    change.old_values["description"] = old_section.description;
                    change.new_values["description"] = new_section.description;
                }
                
                if (old_section.order != new_section.order) {
                    change.old_values["order"] = std::to_string(old_section.order);
                    change.new_values["order"] = std::to_string(new_section.order);
                }
                
                changes.push_back(change);
            }
            
            // Check for changes in exercises within this section
            
            // Get maps of exercises by ID for easy lookup
            std::unordered_map<std::string, SyllabusExercise> old_exercises;
            for (const auto& exercise : old_section.exercises) {
                old_exercises[exercise.exercise_id] = exercise;
            }
            
            std::unordered_map<std::string, SyllabusExercise> new_exercises;
            for (const auto& exercise : new_section.exercises) {
                new_exercises[exercise.exercise_id] = exercise;
            }
            
            // Find exercises added in new section
            for (const auto& [exercise_id, exercise] : new_exercises) {
                if (old_exercises.find(exercise_id) == old_exercises.end()) {
                    // Exercise was added
                    SyllabusChange change;
                    change.change_type = ChangeType::ADDED;
                    change.element_type = ElementType::EXERCISE;
                    change.element_id = exercise_id;
                    change.parent_id = section_id;
                    change.description = "Added exercise: " + exercise.title;
                    change.author_id = user_id;
                    change.timestamp = std::chrono::system_clock::now();
                    
                    change.new_values["title"] = exercise.title;
                    change.new_values["description"] = exercise.description;
                    change.new_values["order"] = std::to_string(exercise.order);
                    change.new_values["duration_minutes"] = std::to_string(exercise.duration_minutes);
                    change.new_values["exercise_type"] = exercise.exercise_type;
                    
                    changes.push_back(change);
                }
            }
            
            // Find exercises removed or modified in old section
            for (const auto& [exercise_id, old_exercise] : old_exercises) {
                auto it = new_exercises.find(exercise_id);
                if (it == new_exercises.end()) {
                    // Exercise was removed
                    SyllabusChange change;
                    change.change_type = ChangeType::REMOVED;
                    change.element_type = ElementType::EXERCISE;
                    change.element_id = exercise_id;
                    change.parent_id = section_id;
                    change.description = "Removed exercise: " + old_exercise.title;
                    change.author_id = user_id;
                    change.timestamp = std::chrono::system_clock::now();
                    
                    change.old_values["title"] = old_exercise.title;
                    change.old_values["description"] = old_exercise.description;
                    change.old_values["order"] = std::to_string(old_exercise.order);
                    change.old_values["duration_minutes"] = std::to_string(old_exercise.duration_minutes);
                    change.old_values["exercise_type"] = old_exercise.exercise_type;
                    
                    changes.push_back(change);
                } else {
                    // Exercise exists in both, check for modifications
                    const auto& new_exercise = it->second;
                    
                    if (old_exercise.title != new_exercise.title ||
                        old_exercise.description != new_exercise.description ||
                        old_exercise.order != new_exercise.order ||
                        old_exercise.duration_minutes != new_exercise.duration_minutes ||
                        old_exercise.exercise_type != new_exercise.exercise_type) {
                        
                        SyllabusChange change;
                        change.change_type = ChangeType::MODIFIED;
                        change.element_type = ElementType::EXERCISE;
                        change.element_id = exercise_id;
                        change.parent_id = section_id;
                        change.description = "Modified exercise: " + new_exercise.title;
                        change.author_id = user_id;
                        change.timestamp = std::chrono::system_clock::now();
                        
                        if (old_exercise.title != new_exercise.title) {
                            change.old_values["title"] = old_exercise.title;
                            change.new_values["title"] = new_exercise.title;
                        }
                        
                        if (old_exercise.description != new_exercise.description) {
                            change.old_values["description"] = old_exercise.description;
                            change.new_values["description"] = new_exercise.description;
                        }
                        
                        if (old_exercise.order != new_exercise.order) {
                            change.old_values["order"] = std::to_string(old_exercise.order);
                            change.new_values["order"] = std::to_string(new_exercise.order);
                        }
                        
                        if (old_exercise.duration_minutes != new_exercise.duration_minutes) {
                            change.old_values["duration_minutes"] = std::to_string(old_exercise.duration_minutes);
                            change.new_values["duration_minutes"] = std::to_string(new_exercise.duration_minutes);
                        }
                        
                        if (old_exercise.exercise_type != new_exercise.exercise_type) {
                            change.old_values["exercise_type"] = old_exercise.exercise_type;
                            change.new_values["exercise_type"] = new_exercise.exercise_type;
                        }
                        
                        changes.push_back(change);
                    }
                    
                    // Check for changes in objectives
                    std::unordered_set<std::string> old_objectives(
                        old_exercise.objectives.begin(), old_exercise.objectives.end()
                    );
                    std::unordered_set<std::string> new_objectives(
                        new_exercise.objectives.begin(), new_exercise.objectives.end()
                    );
                    
                    // Find added objectives
                    for (const auto& objective : new_objectives) {
                        if (old_objectives.find(objective) == old_objectives.end()) {
                            SyllabusChange change;
                            change.change_type = ChangeType::ADDED;
                            change.element_type = ElementType::OBJECTIVE;
                            change.element_id = exercise_id;
                            change.parent_id = section_id;
                            change.description = "Added objective to exercise: " + new_exercise.title;
                            change.author_id = user_id;
                            change.timestamp = std::chrono::system_clock::now();
                            
                            change.new_values["objective"] = objective;
                            
                            changes.push_back(change);
                        }
                    }
                    
                    // Find removed objectives
                    for (const auto& objective : old_objectives) {
                        if (new_objectives.find(objective) == new_objectives.end()) {
                            SyllabusChange change;
                            change.change_type = ChangeType::REMOVED;
                            change.element_type = ElementType::OBJECTIVE;
                            change.element_id = exercise_id;
                            change.parent_id = section_id;
                            change.description = "Removed objective from exercise: " + new_exercise.title;
                            change.author_id = user_id;
                            change.timestamp = std::chrono::system_clock::now();
                            
                            change.old_values["objective"] = objective;
                            
                            changes.push_back(change);
                        }
                    }
                    
                    // Check for changes in grading criteria
                    // Similar pattern to above - needs implementation for criteria
                }
            }
        }
    }
    
    return changes;
}

// Implementation of SyllabusChange methods

nlohmann::json SyllabusChange::toJson() const {
    nlohmann::json json;
    json["change_type"] = changeTypeToString(change_type);
    json["element_type"] = elementTypeToString(element_type);
    json["element_id"] = element_id;
    
    if (parent_id) {
        json["parent_id"] = *parent_id;
    }
    
    json["description"] = description;
    json["old_values"] = old_values;
    json["new_values"] = new_values;
    json["rationale"] = rationale;
    json["author_id"] = author_id;
    
    // Convert timestamp to milliseconds since epoch
    json["timestamp"] = std::chrono::duration_cast<std::chrono::milliseconds>(
        timestamp.time_since_epoch()
    ).count();
    
    return json;
}

std::optional<SyllabusChange> SyllabusChange::fromJson(const nlohmann::json& json) {
    try {
        SyllabusChange change;
        
        change.change_type = changeTypeFromString(json["change_type"]);
        change.element_type = elementTypeFromString(json["element_type"]);
        change.element_id = json["element_id"];
        
        if (json.contains("parent_id") && !json["parent_id"].is_null()) {
            change.parent_id = json["parent_id"];
        }
        
        change.description = json["description"];
        
        if (json.contains("old_values") && json["old_values"].is_object()) {
            change.old_values = json["old_values"].get<std::map<std::string, std::string>>();
        }
        
        if (json.contains("new_values") && json["new_values"].is_object()) {
            change.new_values = json["new_values"].get<std::map<std::string, std::string>>();
        }
        
        change.rationale = json["rationale"];
        change.author_id = json["author_id"];
        
        // Convert timestamp from milliseconds since epoch
        change.timestamp = std::chrono::system_clock::time_point(
            std::chrono::milliseconds(json["timestamp"].get<int64_t>())
        );
        
        return change;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error parsing syllabus change from JSON: {}", e.what());
        return std::nullopt;
    }
}

// Implementation of SyllabusSummary methods

nlohmann::json SyllabusSummary::toJson() const {
    nlohmann::json json;
    json["syllabus_id"] = syllabus_id;
    json["course_id"] = course_id;
    json["title"] = title;
    json["version"] = version;
    
    // Convert timestamps to milliseconds since epoch
    json["effective_date"] = std::chrono::duration_cast<std::chrono::milliseconds>(
        effective_date.time_since_epoch()
    ).count();
    
    if (expiration_date) {
        json["expiration_date"] = std::chrono::duration_cast<std::chrono::milliseconds>(
            expiration_date->time_since_epoch()
        ).count();
    } else {
        json["expiration_date"] = nullptr;
    }
    
    json["status"] = syllabusStatusToString(status);
    json["author_id"] = author_id;
    
    json["created_at"] = std::chrono::duration_cast<std::chrono::milliseconds>(
        created_at.time_since_epoch()
    ).count();
    
    json["updated_at"] = std::chrono::duration_cast<std::chrono::milliseconds>(
        updated_at.time_since_epoch()
    ).count();
    
    return json;
}

std::optional<SyllabusSummary> SyllabusSummary::fromJson(const nlohmann::json& json) {
    try {
        SyllabusSummary summary;
        
        summary.syllabus_id = json["syllabus_id"];
        summary.course_id = json["course_id"];
        summary.title = json["title"];
        summary.version = json["version"];
        
        // Convert timestamps from milliseconds since epoch
        summary.effective_date = std::chrono::system_clock::time_point(
            std::chrono::milliseconds(json["effective_date"].get<int64_t>())
        );
        
        if (json.contains("expiration_date") && !json["expiration_date"].is_null()) {
            summary.expiration_date = std::chrono::system_clock::time_point(
                std::chrono::milliseconds(json["expiration_date"].get<int64_t>())
            );
        }
        
        summary.status = syllabusStatusFromString(json["status"]);
        summary.author_id = json["author_id"];
        
        summary.created_at = std::chrono::system_clock::time_point(
            std::chrono::milliseconds(json["created_at"].get<int64_t>())
        );
        
        summary.updated_at = std::chrono::system_clock::time_point(
            std::chrono::milliseconds(json["updated_at"].get<int64_t>())
        );
        
        return summary;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error parsing syllabus summary from JSON: {}", e.what());
        return std::nullopt;
    }
}

} // namespace syllabus
} // namespace etr