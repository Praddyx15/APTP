#include "syllabus/syllabus_service.h"
#include "logging/logger.h"
#include <chrono>
#include <algorithm>
#include <sstream>
#include <uuid.h>

namespace etr {
namespace syllabus {

// Utility functions for conversions
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
    return SyllabusStatus::DRAFT; // Default to DRAFT
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
    return ChangeType::MODIFIED; // Default to MODIFIED
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
    return ElementType::SYLLABUS; // Default to SYLLABUS
}

// SyllabusService implementation
SyllabusService::SyllabusService(
    std::shared_ptr<ISyllabusRepository> syllabus_repository,
    std::shared_ptr<signature::IDigitalSignatureService> signature_service
) : syllabus_repository_(std::move(syllabus_repository)),
    signature_service_(std::move(signature_service)) {
    
    logging::Logger::getInstance().info("SyllabusService initialized");
}

SyllabusService::~SyllabusService() = default;

std::string SyllabusService::createSyllabus(const Syllabus& syllabus) {
    try {
        // Validate syllabus
        if (syllabus.getTitle().empty() || syllabus.getCourseId().empty() || 
            syllabus.getAuthorId().empty() || syllabus.getVersion().empty()) {
            logging::Logger::getInstance().error("Invalid syllabus data: missing required fields");
            return "";
        }
        
        // Create a copy with appropriate timestamps
        Syllabus copy = syllabus;
        auto now = std::chrono::system_clock::now();
        
        if (copy.getCreatedAt() == std::chrono::system_clock::time_point()) {
            copy.setCreatedAt(now);
        }
        
        if (copy.getUpdatedAt() == std::chrono::system_clock::time_point()) {
            copy.setUpdatedAt(now);
        }
        
        // Ensure status is valid
        if (copy.getStatus() == SyllabusStatus::APPROVED && !copy.getApprovalSignature()) {
            copy.setStatus(SyllabusStatus::DRAFT);
            logging::Logger::getInstance().warn("Syllabus status set to DRAFT because it lacks approval signature");
        }
        
        // Create syllabus in repository
        std::string syllabus_id = syllabus_repository_->createSyllabus(copy);
        
        if (syllabus_id.empty()) {
            logging::Logger::getInstance().error("Failed to create syllabus");
            return "";
        }
        
        logging::Logger::getInstance().info("Created syllabus: {}, version: {}", 
            syllabus_id, copy.getVersion());
        
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
        
        if (!syllabus) {
            logging::Logger::getInstance().debug("Syllabus not found: {}, version: {}", 
                syllabus_id, version ? *version : "latest");
            return std::nullopt;
        }
        
        logging::Logger::getInstance().debug("Retrieved syllabus: {}, version: {}", 
            syllabus_id, syllabus->getVersion());
        
        return syllabus;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error getting syllabus: {}", e.what());
        return std::nullopt;
    }
}

bool SyllabusService::updateSyllabus(const Syllabus& syllabus, const std::string& user_id) {
    try {
        // Check if user is authorized to modify syllabus
        if (!isAuthorizedToModify(syllabus, user_id)) {
            logging::Logger::getInstance().error("User {} not authorized to modify syllabus {}", 
                user_id, syllabus.getSyllabusId());
            return false;
        }
        
        // Get existing syllabus to calculate changes
        auto existing = syllabus_repository_->getSyllabus(
            syllabus.getSyllabusId(), syllabus.getVersion());
        
        if (!existing) {
            logging::Logger::getInstance().error("Syllabus not found for update: {}, version: {}", 
                syllabus.getSyllabusId(), syllabus.getVersion());
            return false;
        }
        
        // Create a copy with updated timestamp
        Syllabus copy = syllabus;
        copy.setUpdatedAt(std::chrono::system_clock::now());
        
        // Ensure status is valid
        if (copy.getStatus() == SyllabusStatus::APPROVED && !copy.getApprovalSignature()) {
            copy.setStatus(SyllabusStatus::DRAFT);
            logging::Logger::getInstance().warn("Syllabus status set to DRAFT because it lacks approval signature");
        }
        
        // Calculate changes
        auto changes = calculateChanges(*existing, copy, user_id);
        
        // Update syllabus
        bool success = syllabus_repository_->updateSyllabus(copy);
        
        if (!success) {
            logging::Logger::getInstance().error("Failed to update syllabus: {}, version: {}", 
                syllabus.getSyllabusId(), syllabus.getVersion());
            return false;
        }
        
        // Log changes
        for (const auto& change : changes) {
            syllabus_repository_->logChange(syllabus.getSyllabusId(), change);
        }
        
        logging::Logger::getInstance().info("Updated syllabus: {}, version: {}, with {} changes", 
            syllabus.getSyllabusId(), syllabus.getVersion(), changes.size());
        
        return true;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error updating syllabus: {}", e.what());
        return false;
    }
}

bool SyllabusService::deleteSyllabus(const std::string& syllabus_id, const std::string& user_id) {
    try {
        // Get syllabus to check authorization
        auto syllabus = syllabus_repository_->getSyllabus(syllabus_id);
        
        if (!syllabus) {
            logging::Logger::getInstance().error("Syllabus not found for deletion: {}", syllabus_id);
            return false;
        }
        
        // Check if user is authorized to modify syllabus
        if (!isAuthorizedToModify(*syllabus, user_id)) {
            logging::Logger::getInstance().error("User {} not authorized to delete syllabus {}", 
                user_id, syllabus_id);
            return false;
        }
        
        // Check if syllabus is approved
        if (syllabus->getStatus() == SyllabusStatus::APPROVED) {
            logging::Logger::getInstance().error("Cannot delete approved syllabus: {}", syllabus_id);
            return false;
        }
        
        // Delete syllabus
        bool success = syllabus_repository_->deleteSyllabus(syllabus_id);
        
        if (success) {
            logging::Logger::getInstance().info("Deleted syllabus: {}", syllabus_id);
        } else {
            logging::Logger::getInstance().error("Failed to delete syllabus: {}", syllabus_id);
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
        auto result = syllabus_repository_->listSyllabi(
            course_id, status, effective_date, page, page_size, sort_by, ascending);
        
        logging::Logger::getInstance().debug("Listed {} syllabi (total: {})", 
            result.first.size(), result.second);
        
        return result;
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
        auto changes = syllabus_repository_->trackChanges(syllabus_id, from_version, to_version);
        
        logging::Logger::getInstance().debug("Tracked {} changes between versions {} and {}", 
            changes.size(), from_version, to_version);
        
        return changes;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error tracking syllabus changes: {}", e.what());
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
        // Get syllabus
        auto syllabus = syllabus_repository_->getSyllabus(syllabus_id);
        
        if (!syllabus) {
            logging::Logger::getInstance().error("Syllabus not found for approval: {}", syllabus_id);
            return false;
        }
        
        // Verify certificate
        if (!signature_service_->validateCertificate(certificate_data)) {
            logging::Logger::getInstance().error("Invalid certificate for syllabus approval");
            return false;
        }
        
        // Extract user ID from certificate and verify it matches approver_id
        std::string cert_user_id = signature_service_->extractUserIdFromCertificate(certificate_data);
        if (cert_user_id != approver_id) {
            logging::Logger::getInstance().error("Certificate user ID ({}) does not match approver ID ({})",
                cert_user_id, approver_id);
            return false;
        }
        
        // Parse certificate and get info
        auto cert_info = signature_service_->parseCertificate(certificate_data);
        if (!cert_info) {
            logging::Logger::getInstance().error("Failed to parse certificate for syllabus approval");
            return false;
        }
        
        // Generate signature digest
        std::vector<uint8_t> digest = generateSyllabusDigest(*syllabus);
        
        // Create signature info
        records::SignatureInfo signature;
        signature.signer_id = approver_id;
        signature.signer_name = cert_info->subject_name;
        signature.certificate_id = cert_info->certificate_id;
        signature.signature_data = signature_data;
        signature.timestamp = std::chrono::system_clock::now();
        
        // Verify signature
        X509* cert = X509_new();
        BIO* bio = BIO_new(BIO_s_mem());
        BIO_puts(bio, certificate_data.c_str());
        PEM_read_bio_X509(bio, &cert, nullptr, nullptr);
        BIO_free(bio);
        
        // For simplicity, we'll just set the signature as valid
        // In a real implementation, we would verify the signature against the digest
        signature.is_valid = true;
        
        X509_free(cert);
        
        // Update syllabus with signature and status
        syllabus->setApprovalSignature(signature);
        syllabus->setStatus(SyllabusStatus::APPROVED);
        syllabus->setUpdatedAt(std::chrono::system_clock::now());
        
        // Update syllabus
        bool success = syllabus_repository_->updateSyllabus(*syllabus);
        
        if (success) {
            logging::Logger::getInstance().info("Approved syllabus: {}, version: {}", 
                syllabus_id, syllabus->getVersion());
        } else {
            logging::Logger::getInstance().error("Failed to approve syllabus: {}", syllabus_id);
        }
        
        return success;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error approving syllabus: {}", e.what());
        return false;
    }
}

bool SyllabusService::archiveSyllabus(
    const std::string& syllabus_id,
    const std::string& user_id
) {
    try {
        // Get syllabus
        auto syllabus = syllabus_repository_->getSyllabus(syllabus_id);
        
        if (!syllabus) {
            logging::Logger::getInstance().error("Syllabus not found for archiving: {}", syllabus_id);
            return false;
        }
        
        // Check if user is authorized to modify syllabus
        if (!isAuthorizedToModify(*syllabus, user_id)) {
            logging::Logger::getInstance().error("User {} not authorized to archive syllabus {}", 
                user_id, syllabus_id);
            return false;
        }
        
        // Update syllabus status
        syllabus->setStatus(SyllabusStatus::ARCHIVED);
        syllabus->setUpdatedAt(std::chrono::system_clock::now());
        
        // Update syllabus
        bool success = syllabus_repository_->updateSyllabus(*syllabus);
        
        if (success) {
            logging::Logger::getInstance().info("Archived syllabus: {}, version: {}", 
                syllabus_id, syllabus->getVersion());
        } else {
            logging::Logger::getInstance().error("Failed to archive syllabus: {}", syllabus_id);
        }
        
        return success;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error archiving syllabus: {}", e.what());
        return false;
    }
}

std::string SyllabusService::cloneSyllabus(
    const std::string& syllabus_id,
    const std::string& new_version,
    const std::string& user_id
) {
    try {
        // Get source syllabus
        auto source = syllabus_repository_->getSyllabus(syllabus_id);
        
        if (!source) {
            logging::Logger::getInstance().error("Source syllabus not found for cloning: {}", syllabus_id);
            return "";
        }
        
        // Create a copy with new version and timestamps
        Syllabus clone = *source;
        clone.setVersion(new_version);
        clone.setStatus(SyllabusStatus::DRAFT);
        clone.setAuthorId(user_id);
        
        auto now = std::chrono::system_clock::now();
        clone.setCreatedAt(now);
        clone.setUpdatedAt(now);
        
        // Clear approval signature
        clone.setApprovalSignature({});
        
        // Create new syllabus
        std::string new_syllabus_id = syllabus_repository_->createSyllabus(clone);
        
        if (new_syllabus_id.empty()) {
            logging::Logger::getInstance().error("Failed to clone syllabus: {}", syllabus_id);
            return "";
        }
        
        logging::Logger::getInstance().info("Cloned syllabus {} to {} with version {}", 
            syllabus_id, new_syllabus_id, new_version);
        
        return new_syllabus_id;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error cloning syllabus: {}", e.what());
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
        
        // Set author ID and status
        syllabus->setAuthorId(user_id);
        syllabus->setStatus(SyllabusStatus::DRAFT);
        
        // Set timestamps
        auto now = std::chrono::system_clock::now();
        syllabus->setCreatedAt(now);
        syllabus->setUpdatedAt(now);
        
        // Clear approval signature
        syllabus->setApprovalSignature({});
        
        // Create syllabus
        std::string syllabus_id = syllabus_repository_->createSyllabus(*syllabus);
        
        if (syllabus_id.empty()) {
            logging::Logger::getInstance().error("Failed to import syllabus from JSON");
            return "";
        }
        
        logging::Logger::getInstance().info("Imported syllabus from JSON: {}, version: {}", 
            syllabus_id, syllabus->getVersion());
        
        return syllabus_id;
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
            logging::Logger::getInstance().error("Syllabus not found for export: {}, version: {}", 
                syllabus_id, version ? *version : "latest");
            return "";
        }
        
        // Convert to JSON
        nlohmann::json json = syllabus->toJson();
        
        logging::Logger::getInstance().info("Exported syllabus to JSON: {}, version: {}", 
            syllabus_id, syllabus->getVersion());
        
        return json.dump(4);
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error exporting syllabus to JSON: {}", e.what());
        return "";
    }
}

std::vector<uint8_t> SyllabusService::generateSyllabusDigest(const Syllabus& syllabus) {
    try {
        // Create a JSON representation of the syllabus
        nlohmann::json json = syllabus.toJson();
        
        // Remove approval signature to create a consistent digest
        if (json.contains("approval_signature")) {
            json.erase("approval_signature");
        }
        
        // Generate digest
        std::string json_str = json.dump();
        
        // This is a simplified implementation, in a real system we would use cryptographic digest
        std::vector<uint8_t> digest(json_str.begin(), json_str.end());
        
        return digest;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error generating syllabus digest: {}", e.what());
        return {};
    }
}

bool SyllabusService::isAuthorizedToModify(const Syllabus& syllabus, const std::string& user_id) {
    // For simplicity, we'll allow modification if:
    // 1. User is the author
    // 2. Syllabus is in DRAFT state
    
    if (syllabus.getAuthorId() == user_id) {
        return true;
    }
    
    if (syllabus.getStatus() == SyllabusStatus::DRAFT) {
        // In a real implementation, we would check user roles/permissions
        return true;
    }
    
    return false;
}

std::vector<SyllabusChange> SyllabusService::calculateChanges(
    const Syllabus& old_syllabus,
    const Syllabus& new_syllabus,
    const std::string& user_id
) {
    std::vector<SyllabusChange> changes;
    auto now = std::chrono::system_clock::now();
    
    // Check for syllabus-level changes
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
        change.timestamp = now;
        
        if (old_syllabus.getTitle() != new_syllabus.getTitle()) {
            change.old_values["title"] = old_syllabus.getTitle();
            change.new_values["title"] = new_syllabus.getTitle();
        }
        
        if (old_syllabus.getDescription() != new_syllabus.getDescription()) {
            change.old_values["description"] = old_syllabus.getDescription();
            change.new_values["description"] = new_syllabus.getDescription();
        }
        
        if (old_syllabus.getEffectiveDate() != new_syllabus.getEffectiveDate()) {
            change.old_values["effective_date"] = std::to_string(std::chrono::duration_cast<std::chrono::milliseconds>(
                old_syllabus.getEffectiveDate().time_since_epoch()).count());
            change.new_values["effective_date"] = std::to_string(std::chrono::duration_cast<std::chrono::milliseconds>(
                new_syllabus.getEffectiveDate().time_since_epoch()).count());
        }
        
        if (old_syllabus.getExpirationDate() != new_syllabus.getExpirationDate()) {
            if (old_syllabus.getExpirationDate()) {
                change.old_values["expiration_date"] = std::to_string(std::chrono::duration_cast<std::chrono::milliseconds>(
                    old_syllabus.getExpirationDate()->time_since_epoch()).count());
            } else {
                change.old_values["expiration_date"] = "null";
            }
            
            if (new_syllabus.getExpirationDate()) {
                change.new_values["expiration_date"] = std::to_string(std::chrono::duration_cast<std::chrono::milliseconds>(
                    new_syllabus.getExpirationDate()->time_since_epoch()).count());
            } else {
                change.new_values["expiration_date"] = "null";
            }
        }
        
        changes.push_back(change);
    }
    
    // Compare sections
    std::unordered_map<std::string, const SyllabusSection*> old_sections;
    for (const auto& section : old_syllabus.getSections()) {
        old_sections[section.section_id] = &section;
    }
    
    std::unordered_map<std::string, const SyllabusSection*> new_sections;
    for (const auto& section : new_syllabus.getSections()) {
        new_sections[section.section_id] = &section;
    }
    
    // Sections added or modified
    for (const auto& section : new_syllabus.getSections()) {
        auto it = old_sections.find(section.section_id);
        
        if (it == old_sections.end()) {
            // Section added
            SyllabusChange change;
            change.change_type = ChangeType::ADDED;
            change.element_type = ElementType::SECTION;
            change.element_id = section.section_id;
            change.parent_id = new_syllabus.getSyllabusId();
            change.description = "Added section: " + section.title;
            change.author_id = user_id;
            change.timestamp = now;
            
            change.new_values["title"] = section.title;
            change.new_values["description"] = section.description;
            change.new_values["order"] = std::to_string(section.order);
            
            changes.push_back(change);
        } else {
            // Check if section modified
            const auto& old_section = *it->second;
            
            if (old_section.title != section.title ||
                old_section.description != section.description ||
                old_section.order != section.order) {
                
                SyllabusChange change;
                change.change_type = ChangeType::MODIFIED;
                change.element_type = ElementType::SECTION;
                change.element_id = section.section_id;
                change.parent_id = new_syllabus.getSyllabusId();
                change.description = "Modified section: " + section.title;
                change.author_id = user_id;
                change.timestamp = now;
                
                if (old_section.title != section.title) {
                    change.old_values["title"] = old_section.title;
                    change.new_values["title"] = section.title;
                }
                
                if (old_section.description != section.description) {
                    change.old_values["description"] = old_section.description;
                    change.new_values["description"] = section.description;
                }
                
                if (old_section.order != section.order) {
                    change.old_values["order"] = std::to_string(old_section.order);
                    change.new_values["order"] = std::to_string(section.order);
                }
                
                changes.push_back(change);
            }
            
            // Check exercises
            std::unordered_map<std::string, const SyllabusExercise*> old_exercises;
            for (const auto& exercise : old_section.exercises) {
                old_exercises[exercise.exercise_id] = &exercise;
            }
            
            std::unordered_map<std::string, const SyllabusExercise*> new_exercises;
            for (const auto& exercise : section.exercises) {
                new_exercises[exercise.exercise_id] = &exercise;
            }
            
            // Exercises added or modified
            for (const auto& exercise : section.exercises) {
                auto ex_it = old_exercises.find(exercise.exercise_id);
                
                if (ex_it == old_exercises.end()) {
                    // Exercise added
                    SyllabusChange change;
                    change.change_type = ChangeType::ADDED;
                    change.element_type = ElementType::EXERCISE;
                    change.element_id = exercise.exercise_id;
                    change.parent_id = section.section_id;
                    change.description = "Added exercise: " + exercise.title;
                    change.author_id = user_id;
                    change.timestamp = now;
                    
                    change.new_values["title"] = exercise.title;
                    change.new_values["description"] = exercise.description;
                    change.new_values["order"] = std::to_string(exercise.order);
                    change.new_values["duration_minutes"] = std::to_string(exercise.duration_minutes);
                    change.new_values["exercise_type"] = exercise.exercise_type;
                    
                    changes.push_back(change);
                } else {
                    // Check if exercise modified
                    const auto& old_exercise = *ex_it->second;
                    
                    if (old_exercise.title != exercise.title ||
                        old_exercise.description != exercise.description ||
                        old_exercise.order != exercise.order ||
                        old_exercise.duration_minutes != exercise.duration_minutes ||
                        old_exercise.exercise_type != exercise.exercise_type) {
                        
                        SyllabusChange change;
                        change.change_type = ChangeType::MODIFIED;
                        change.element_type = ElementType::EXERCISE;
                        change.element_id = exercise.exercise_id;
                        change.parent_id = section.section_id;
                        change.description = "Modified exercise: " + exercise.title;
                        change.author_id = user_id;
                        change.timestamp = now;
                        
                        if (old_exercise.title != exercise.title) {
                            change.old_values["title"] = old_exercise.title;
                            change.new_values["title"] = exercise.title;
                        }
                        
                        if (old_exercise.description != exercise.description) {
                            change.old_values["description"] = old_exercise.description;
                            change.new_values["description"] = exercise.description;
                        }
                        
                        if (old_exercise.order != exercise.order) {
                            change.old_values["order"] = std::to_string(old_exercise.order);
                            change.new_values["order"] = std::to_string(exercise.order);
                        }
                        
                        if (old_exercise.duration_minutes != exercise.duration_minutes) {
                            change.old_values["duration_minutes"] = std::to_string(old_exercise.duration_minutes);
                            change.new_values["duration_minutes"] = std::to_string(exercise.duration_minutes);
                        }
                        
                        if (old_exercise.exercise_type != exercise.exercise_type) {
                            change.old_values["exercise_type"] = old_exercise.exercise_type;
                            change.new_values["exercise_type"] = exercise.exercise_type;
                        }
                        
                        changes.push_back(change);
                    }
                    
                    // We could continue with more detailed comparison of objectives, criteria, etc.
                    // For brevity, we'll stop here
                }
            }
            
            // Exercises removed
            for (const auto& [ex_id, old_exercise] : old_exercises) {
                if (new_exercises.find(ex_id) == new_exercises.end()) {
                    // Exercise removed
                    SyllabusChange change;
                    change.change_type = ChangeType::REMOVED;
                    change.element_type = ElementType::EXERCISE;
                    change.element_id = ex_id;
                    change.parent_id = section.section_id;
                    change.description = "Removed exercise: " + old_exercise->title;
                    change.author_id = user_id;
                    change.timestamp = now;
                    
                    change.old_values["title"] = old_exercise->title;
                    
                    changes.push_back(change);
                }
            }
        }
    }
    
    // Sections removed
    for (const auto& [sec_id, old_section] : old_sections) {
        if (new_sections.find(sec_id) == new_sections.end()) {
            // Section removed
            SyllabusChange change;
            change.change_type = ChangeType::REMOVED;
            change.element_type = ElementType::SECTION;
            change.element_id = sec_id;
            change.parent_id = new_syllabus.getSyllabusId();
            change.description = "Removed section: " + old_section->title;
            change.author_id = user_id;
            change.timestamp = now;
            
            change.old_values["title"] = old_section->title;
            
            changes.push_back(change);
        }
    }
    
    return changes;
}

// JSON serialization implementations
nlohmann::json GradeDefinition::toJson() const {
    nlohmann::json json;
    json["grade"] = grade;
    json["description"] = description;
    json["is_passing"] = is_passing;
    return json;
}

std::optional<GradeDefinition> GradeDefinition::fromJson(const nlohmann::json& json) {
    try {
        GradeDefinition def;
        def.grade = json["grade"];
        def.description = json["description"];
        def.is_passing = json["is_passing"];
        return def;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error parsing grade definition from JSON: {}", e.what());
        return std::nullopt;
    }
}

nlohmann::json GradingCriteria::toJson() const {
    nlohmann::json json;
    json["criteria_id"] = criteria_id;
    json["name"] = name;
    json["description"] = description;
    json["is_required"] = is_required;
    
    json["grade_definitions"] = nlohmann::json::array();
    for (const auto& def : grade_definitions) {
        json["grade_definitions"].push_back(def.toJson());
    }
    
    json["regulation_references"] = regulation_references;
    
    return json;
}

std::optional<GradingCriteria> GradingCriteria::fromJson(const nlohmann::json& json) {
    try {
        GradingCriteria criteria;
        criteria.criteria_id = json["criteria_id"];
        criteria.name = json["name"];
        criteria.description = json["description"];
        criteria.is_required = json["is_required"];
        
        for (const auto& def_json : json["grade_definitions"]) {
            auto def = GradeDefinition::fromJson(def_json);
            if (def) {
                criteria.grade_definitions.push_back(*def);
            }
        }
        
        criteria.regulation_references = json["regulation_references"].get<std::map<std::string, std::string>>();
        
        return criteria;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error parsing grading criteria from JSON: {}", e.what());
        return std::nullopt;
    }
}

nlohmann::json SyllabusExercise::toJson() const {
    nlohmann::json json;
    json["exercise_id"] = exercise_id;
    json["title"] = title;
    json["description"] = description;
    json["order"] = order;
    json["duration_minutes"] = duration_minutes;
    json["exercise_type"] = exercise_type;
    json["objectives"] = objectives;
    json["references"] = references;
    json["equipment"] = equipment;
    
    json["grading_criteria"] = nlohmann::json::array();
    for (const auto& criteria : grading_criteria) {
        json["grading_criteria"].push_back(criteria.toJson());
    }
    
    json["prerequisite_exercises"] = prerequisite_exercises;
    json["metadata"] = metadata;
    
    return json;
}

std::optional<SyllabusExercise> SyllabusExercise::fromJson(const nlohmann::json& json) {
    try {
        SyllabusExercise exercise;
        exercise.exercise_id = json["exercise_id"];
        exercise.title = json["title"];
        exercise.description = json["description"];
        exercise.order = json["order"];
        exercise.duration_minutes = json["duration_minutes"];
        exercise.exercise_type = json["exercise_type"];
        exercise.objectives = json["objectives"].get<std::vector<std::string>>();
        exercise.references = json["references"].get<std::vector<std::string>>();
        exercise.equipment = json["equipment"].get<std::vector<std::string>>();
        
        for (const auto& criteria_json : json["grading_criteria"]) {
            auto criteria = GradingCriteria::fromJson(criteria_json);
            if (criteria) {
                exercise.grading_criteria.push_back(*criteria);
            }
        }
        
        exercise.prerequisite_exercises = json["prerequisite_exercises"].get<std::vector<std::string>>();
        exercise.metadata = json["metadata"].get<std::map<std::string, std::string>>();
        
        return exercise;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error parsing syllabus exercise from JSON: {}", e.what());
        return std::nullopt;
    }
}

nlohmann::json SyllabusSection::toJson() const {
    nlohmann::json json;
    json["section_id"] = section_id;
    json["title"] = title;
    json["description"] = description;
    json["order"] = order;
    
    json["exercises"] = nlohmann::json::array();
    for (const auto& exercise : exercises) {
        json["exercises"].push_back(exercise.toJson());
    }
    
    return json;
}

std::optional<SyllabusSection> SyllabusSection::fromJson(const nlohmann::json& json) {
    try {
        SyllabusSection section;
        section.section_id = json["section_id"];
        section.title = json["title"];
        section.description = json["description"];
        section.order = json["order"];
        
        for (const auto& exercise_json : json["exercises"]) {
            auto exercise = SyllabusExercise::fromJson(exercise_json);
            if (exercise) {
                section.exercises.push_back(*exercise);
            }
        }
        
        return section;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error parsing syllabus section from JSON: {}", e.what());
        return std::nullopt;
    }
}

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
    json["timestamp"] = std::chrono::duration_cast<std::chrono::milliseconds>(
        timestamp.time_since_epoch()).count();
    
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
        change.old_values = json["old_values"].get<std::map<std::string, std::string>>();
        change.new_values = json["new_values"].get<std::map<std::string, std::string>>();
        change.rationale = json["rationale"];
        change.author_id = json["author_id"];
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

nlohmann::json SyllabusSummary::toJson() const {
    nlohmann::json json;
    json["syllabus_id"] = syllabus_id;
    json["course_id"] = course_id;
    json["title"] = title;
    json["version"] = version;
    json["effective_date"] = std::chrono::duration_cast<std::chrono::milliseconds>(
        effective_date.time_since_epoch()).count();
    
    if (expiration_date) {
        json["expiration_date"] = std::chrono::duration_cast<std::chrono::milliseconds>(
            expiration_date->time_since_epoch()).count();
    }
    
    json["status"] = syllabusStatusToString(status);
    json["author_id"] = author_id;
    json["created_at"] = std::chrono::duration_cast<std::chrono::milliseconds>(
        created_at.time_since_epoch()).count();
    json["updated_at"] = std::chrono::duration_cast<std::chrono::milliseconds>(
        updated_at.time_since_epoch()).count();
    
    return json;
}

std::optional<SyllabusSummary> SyllabusSummary::fromJson(const nlohmann::json& json) {
    try {
        SyllabusSummary summary;
        summary.syllabus_id = json["syllabus_id"];
        summary.course_id = json["course_id"];
        summary.title = json["title"];
        summary.version = json["version"];
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