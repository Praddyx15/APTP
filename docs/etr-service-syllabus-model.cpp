#include "syllabus/syllabus.h"
#include "logging/logger.h"
#include <uuid.h>
#include <algorithm>

namespace etr {
namespace syllabus {

// SyllabusStatus conversion methods
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

// ChangeType conversion methods
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

// ElementType conversion methods
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

// GradeDefinition
nlohmann::json GradeDefinition::toJson() const {
    nlohmann::json json;
    json["grade"] = grade;
    json["description"] = description;
    json["is_passing"] = is_passing;
    return json;
}

std::optional<GradeDefinition> GradeDefinition::fromJson(const nlohmann::json& json) {
    try {
        GradeDefinition definition;
        definition.grade = json["grade"];
        definition.description = json["description"];
        definition.is_passing = json["is_passing"];
        return definition;
    } catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error parsing grade definition from JSON: {}", e.what());
        return std::nullopt;
    }
}

// GradingCriteria
nlohmann::json GradingCriteria::toJson() const {
    nlohmann::json json;
    json["criteria_id"] = criteria_id;
    json["name"] = name;
    json["description"] = description;
    
    json["grade_definitions"] = nlohmann::json::array();
    for (const auto& definition : grade_definitions) {
        json["grade_definitions"].push_back(definition.toJson());
    }
    
    json["is_required"] = is_required;
    
    json["regulation_references"] = nlohmann::json::object();
    for (const auto& [key, value] : regulation_references) {
        json["regulation_references"][key] = value;
    }
    
    return json;
}

std::optional<GradingCriteria> GradingCriteria::fromJson(const nlohmann::json& json) {
    try {
        GradingCriteria criteria;
        criteria.criteria_id = json["criteria_id"];
        criteria.name = json["name"];
        criteria.description = json["description"];
        
        for (const auto& def_json : json["grade_definitions"]) {
            auto definition = GradeDefinition::fromJson(def_json);
            if (definition) {
                criteria.grade_definitions.push_back(*definition);
            }
        }
        
        criteria.is_required = json["is_required"];
        
        for (const auto& [key, value] : json["regulation_references"].items()) {
            criteria.regulation_references[key] = value;
        }
        
        return criteria;
    } catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error parsing grading criteria from JSON: {}", e.what());
        return std::nullopt;
    }
}

// SyllabusExercise
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
    
    json["metadata"] = nlohmann::json::object();
    for (const auto& [key, value] : metadata) {
        json["metadata"][key] = value;
    }
    
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
        
        for (const auto& [key, value] : json["metadata"].items()) {
            exercise.metadata[key] = value;
        }
        
        return exercise;
    } catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error parsing syllabus exercise from JSON: {}", e.what());
        return std::nullopt;
    }
}

// SyllabusSection
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
    } catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error parsing syllabus section from JSON: {}", e.what());
        return std::nullopt;
    }
}

// Syllabus
Syllabus::Syllabus() {
    // Generate a new ID
    uuids::uuid id = uuids::uuid_system_generator{}();
    syllabus_id_ = uuids::to_string(id);
    
    // Set default values
    status_ = SyllabusStatus::DRAFT;
    created_at_ = std::chrono::system_clock::now();
    updated_at_ = created_at_;
}

Syllabus::Syllabus(const std::string& id) : syllabus_id_(id) {
    // Set default values
    status_ = SyllabusStatus::DRAFT;
    created_at_ = std::chrono::system_clock::now();
    updated_at_ = created_at_;
}

const std::string& Syllabus::getSyllabusId() const {
    return syllabus_id_;
}

void Syllabus::setSyllabusId(const std::string& id) {
    syllabus_id_ = id;
}

const std::string& Syllabus::getCourseId() const {
    return course_id_;
}

void Syllabus::setCourseId(const std::string& id) {
    course_id_ = id;
}

const std::string& Syllabus::getTitle() const {
    return title_;
}

void Syllabus::setTitle(const std::string& title) {
    title_ = title;
}

const std::string& Syllabus::getDescription() const {
    return description_;
}

void Syllabus::setDescription(const std::string& description) {
    description_ = description;
}

const std::string& Syllabus::getVersion() const {
    return version_;
}

void Syllabus::setVersion(const std::string& version) {
    version_ = version;
}

std::chrono::system_clock::time_point Syllabus::getEffectiveDate() const {
    return effective_date_;
}

void Syllabus::setEffectiveDate(const std::chrono::system_clock::time_point& date) {
    effective_date_ = date;
}

std::optional<std::chrono::system_clock::time_point> Syllabus::getExpirationDate() const {
    return expiration_date_;
}

void Syllabus::setExpirationDate(const std::chrono::system_clock::time_point& date) {
    expiration_date_ = date;
}

void Syllabus::clearExpirationDate() {
    expiration_date_ = std::nullopt;
}

SyllabusStatus Syllabus::getStatus() const {
    return status_;
}

void Syllabus::setStatus(SyllabusStatus status) {
    status_ = status;
}

const std::string& Syllabus::getAuthorId() const {
    return author_id_;
}

void Syllabus::setAuthorId(const std::string& id) {
    author_id_ = id;
}

const std::vector<SyllabusSection>& Syllabus::getSections() const {
    return sections_;
}

void Syllabus::setSections(const std::vector<SyllabusSection>& sections) {
    sections_ = sections;
}

void Syllabus::addSection(const SyllabusSection& section) {
    sections_.push_back(section);
    
    // Sort sections by order
    std::sort(sections_.begin(), sections_.end(), 
              [](const SyllabusSection& a, const SyllabusSection& b) {
                  return a.order < b.order;
              });
}

bool Syllabus::updateSection(const SyllabusSection& section) {
    for (auto& existing_section : sections_) {
        if (existing_section.section_id == section.section_id) {
            existing_section = section;
            
            // Sort sections by order
            std::sort(sections_.begin(), sections_.end(), 
                      [](const SyllabusSection& a, const SyllabusSection& b) {
                          return a.order < b.order;
                      });
            
            return true;
        }
    }
    
    return false;
}

bool Syllabus::removeSection(const std::string& section_id) {
    auto it = std::find_if(sections_.begin(), sections_.end(),
                           [&section_id](const SyllabusSection& section) {
                               return section.section_id == section_id;
                           });
    
    if (it != sections_.end()) {
        sections_.erase(it);
        return true;
    }
    
    return false;
}

std::optional<SyllabusSection> Syllabus::getSection(const std::string& section_id) const {
    auto it = std::find_if(sections_.begin(), sections_.end(),
                           [&section_id](const SyllabusSection& section) {
                               return section.section_id == section_id;
                           });
    
    if (it != sections_.end()) {
        return *it;
    }
    
    return std::nullopt;
}

const std::map<std::string, std::string>& Syllabus::getMetadata() const {
    return metadata_;
}

void Syllabus::setMetadata(const std::map<std::string, std::string>& metadata) {
    metadata_ = metadata;
}

std::string Syllabus::getMetadataValue(const std::string& key) const {
    auto it = metadata_.find(key);
    if (it != metadata_.end()) {
        return it->second;
    }
    
    return "";
}

void Syllabus::setMetadataValue(const std::string& key, const std::string& value) {
    metadata_[key] = value;
}

std::chrono::system_clock::time_point Syllabus::getCreatedAt() const {
    return created_at_;
}

void Syllabus::setCreatedAt(const std::chrono::system_clock::time_point& time) {
    created_at_ = time;
}

std::chrono::system_clock::time_point Syllabus::getUpdatedAt() const {
    return updated_at_;
}

void Syllabus::setUpdatedAt(const std::chrono::system_clock::time_point& time) {
    updated_at_ = time;
}

const std::optional<records::SignatureInfo>& Syllabus::getApprovalSignature() const {
    return approval_signature_;
}

void Syllabus::setApprovalSignature(const records::SignatureInfo& signature) {
    approval_signature_ = signature;
}

std::optional<std::pair<SyllabusExercise, std::string>> Syllabus::findExercise(const std::string& exercise_id) const {
    for (const auto& section : sections_) {
        for (const auto& exercise : section.exercises) {
            if (exercise.exercise_id == exercise_id) {
                return std::make_pair(exercise, section.section_id);
            }
        }
    }
    
    return std::nullopt;
}

bool Syllabus::updateExercise(const SyllabusExercise& exercise, const std::string& section_id) {
    for (auto& section : sections_) {
        if (section.section_id == section_id) {
            for (auto& existing_exercise : section.exercises) {
                if (existing_exercise.exercise_id == exercise.exercise_id) {
                    existing_exercise = exercise;
                    
                    // Sort exercises by order
                    std::sort(section.exercises.begin(), section.exercises.end(), 
                              [](const SyllabusExercise& a, const SyllabusExercise& b) {
                                  return a.order < b.order;
                              });
                    
                    return true;
                }
            }
        }
    }
    
    return false;
}

bool Syllabus::addExerciseToSection(const SyllabusExercise& exercise, const std::string& section_id) {
    for (auto& section : sections_) {
        if (section.section_id == section_id) {
            section.exercises.push_back(exercise);
            
            // Sort exercises by order
            std::sort(section.exercises.begin(), section.exercises.end(), 
                      [](const SyllabusExercise& a, const SyllabusExercise& b) {
                          return a.order < b.order;
                      });
            
            return true;
        }
    }
    
    return false;
}

bool Syllabus::removeExercise(const std::string& exercise_id) {
    for (auto& section : sections_) {
        auto it = std::find_if(section.exercises.begin(), section.exercises.end(),
                               [&exercise_id](const SyllabusExercise& exercise) {
                                   return exercise.exercise_id == exercise_id;
                               });
        
        if (it != section.exercises.end()) {
            section.exercises.erase(it);
            return true;
        }
    }
    
    return false;
}

bool Syllabus::isApproved() const {
    return status_ == SyllabusStatus::APPROVED && approval_signature_.has_value();
}

bool Syllabus::isValid() const {
    // Check required fields
    if (course_id_.empty() || title_.empty() || version_.empty() || author_id_.empty()) {
        return false;
    }
    
    // Check if there are sections
    if (sections_.empty()) {
        return false;
    }
    
    // Check if sections have exercises
    for (const auto& section : sections_) {
        if (section.exercises.empty()) {
            return false;
        }
    }
    
    return true;
}

nlohmann::json Syllabus::toJson() const {
    nlohmann::json json;
    json["syllabus_id"] = syllabus_id_;
    json["course_id"] = course_id_;
    json["title"] = title_;
    json["description"] = description_;
    json["version"] = version_;
    
    json["effective_date"] = std::chrono::duration_cast<std::chrono::milliseconds>(
        effective_date_.time_since_epoch()).count();
    
    if (expiration_date_) {
        json["expiration_date"] = std::chrono::duration_cast<std::chrono::milliseconds>(
            expiration_date_->time_since_epoch()).count();
    }
    
    json["status"] = syllabusStatusToString(status_);
    json["author_id"] = author_id_;
    
    json["sections"] = nlohmann::json::array();
    for (const auto& section : sections_) {
        json["sections"].push_back(section.toJson());
    }
    
    json["metadata"] = metadata_;
    
    json["created_at"] = std::chrono::duration_cast<std::chrono::milliseconds>(
        created_at_.time_since_epoch()).count();
    
    json["updated_at"] = std::chrono::duration_cast<std::chrono::milliseconds>(
        updated_at_.time_since_epoch()).count();
    
    if (approval_signature_) {
        json["approval_signature"] = nlohmann::json::object();
        json["approval_signature"]["signer_id"] = approval_signature_->signer_id;
        json["approval_signature"]["signer_name"] = approval_signature_->signer_name;
        json["approval_signature"]["certificate_id"] = approval_signature_->certificate_id;
        
        // Convert signature data to base64
        std::stringstream ss;
        for (const auto& byte : approval_signature_->signature_data) {
            ss << std::hex << std::setw(2) << std::setfill('0') << (int)byte;
        }
        json["approval_signature"]["signature_data"] = ss.str();
        
        json["approval_signature"]["timestamp"] = std::chrono::duration_cast<std::chrono::milliseconds>(
            approval_signature_->timestamp.time_since_epoch()).count();
        
        json["approval_signature"]["is_valid"] = approval_signature_->is_valid;
    }
    
    return json;
}

std::optional<Syllabus> Syllabus::fromJson(const nlohmann::json& json) {
    try {
        Syllabus syllabus;
        
        syllabus.syllabus_id_ = json["syllabus_id"];
        syllabus.course_id_ = json["course_id"];
        syllabus.title_ = json["title"];
        syllabus.description_ = json["description"];
        syllabus.version_ = json["version"];
        
        syllabus.effective_date_ = std::chrono::system_clock::time_point(
            std::chrono::milliseconds(json["effective_date"].get<int64_t>()));
        
        if (json.contains("expiration_date") && !json["expiration_date"].is_null()) {
            syllabus.expiration_date_ = std::chrono::system_clock::time_point(
                std::chrono::milliseconds(json["expiration_date"].get<int64_t>()));
        }
        
        syllabus.status_ = syllabusStatusFromString(json["status"]);
        syllabus.author_id_ = json["author_id"];
        
        for (const auto& section_json : json["sections"]) {
            auto section = SyllabusSection::fromJson(section_json);
            if (section) {
                syllabus.sections_.push_back(*section);
            }
        }
        
        if (json.contains("metadata") && json["metadata"].is_object()) {
            for (const auto& [key, value] : json["metadata"].items()) {
                syllabus.metadata_[key] = value;
            }
        }
        
        syllabus.created_at_ = std::chrono::system_clock::time_point(
            std::chrono::milliseconds(json["created_at"].get<int64_t>()));
        
        syllabus.updated_at_ = std::chrono::system_clock::time_point(
            std::chrono::milliseconds(json["updated_at"].get<int64_t>()));
        
        if (json.contains("approval_signature") && !json["approval_signature"].is_null()) {
            records::SignatureInfo signature;
            signature.signer_id = json["approval_signature"]["signer_id"];
            signature.signer_name = json["approval_signature"]["signer_name"];
            signature.certificate_id = json["approval_signature"]["certificate_id"];
            
            // Convert signature data from hex string
            std::string signature_data_hex = json["approval_signature"]["signature_data"];
            for (size_t i = 0; i < signature_data_hex.length(); i += 2) {
                std::string byte_hex = signature_data_hex.substr(i, 2);
                uint8_t byte = std::stoi(byte_hex, nullptr, 16);
                signature.signature_data.push_back(byte);
            }
            
            signature.timestamp = std::chrono::system_clock::time_point(
                std::chrono::milliseconds(json["approval_signature"]["timestamp"].get<int64_t>()));
            
            signature.is_valid = json["approval_signature"]["is_valid"];
            
            syllabus.approval_signature_ = signature;
        }
        
        return syllabus;
    } catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error parsing syllabus from JSON: {}", e.what());
        return std::nullopt;
    }
}

nlohmann::json Syllabus::generateAuditLog(
    const std::string& action,
    const std::string& user_id,
    const std::string& details
) const {
    nlohmann::json log;
    log["syllabus_id"] = syllabus_id_;
    log["version"] = version_;
    log["action"] = action;
    log["user_id"] = user_id;
    log["details"] = details;
    log["timestamp"] = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()).count();
    
    return log;
}

// SyllabusChange
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
        
        for (const auto& [key, value] : json["old_values"].items()) {
            change.old_values[key] = value;
        }
        
        for (const auto& [key, value] : json["new_values"].items()) {
            change.new_values[key] = value;
        }
        
        change.rationale = json["rationale"];
        change.author_id = json["author_id"];
        
        change.timestamp = std::chrono::system_clock::time_point(
            std::chrono::milliseconds(json["timestamp"].get<int64_t>()));
        
        return change;
    } catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error parsing syllabus change from JSON: {}", e.what());
        return std::nullopt;
    }
}

// SyllabusSummary
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
            std::chrono::milliseconds(json["effective_date"].get<int64_t>()));
        
        if (json.contains("expiration_date") && !json["expiration_date"].is_null()) {
            summary.expiration_date = std::chrono::system_clock::time_point(
                std::chrono::milliseconds(json["expiration_date"].get<int64_t>()));
        }
        
        summary.status = syllabusStatusFromString(json["status"]);
        summary.author_id = json["author_id"];
        
        summary.created_at = std::chrono::system_clock::time_point(
            std::chrono::milliseconds(json["created_at"].get<int64_t>()));
        
        summary.updated_at = std::chrono::system_clock::time_point(
            std::chrono::milliseconds(json["updated_at"].get<int64_t>()));
        
        return summary;
    } catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error parsing syllabus summary from JSON: {}", e.what());
        return std::nullopt;
    }
}

} // namespace syllabus
} // namespace etr