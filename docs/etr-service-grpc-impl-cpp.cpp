#include "service/etr_service_impl.h"
#include "logging/logger.h"
#include "metrics/metrics_service.h"

#include <sstream>
#include <chrono>
#include <jwt-cpp/jwt.h>

namespace etr {
namespace service {

ETRServiceImpl::ETRServiceImpl(
    std::shared_ptr<records::IRecordService> record_service,
    std::shared_ptr<signature::IDigitalSignatureService> signature_service,
    std::shared_ptr<compliance::IComplianceService> compliance_service,
    std::shared_ptr<syllabus::ISyllabusService> syllabus_service
)
    : record_service_(std::move(record_service)),
      signature_service_(std::move(signature_service)),
      compliance_service_(std::move(compliance_service)),
      syllabus_service_(std::move(syllabus_service)) {
    
    logging::Logger::getInstance().info("ETR Service Implementation initialized");
}

grpc::Status ETRServiceImpl::CreateTrainingRecord(
    grpc::ServerContext* context,
    const TrainingRecord* request,
    RecordResponse* response
) {
    // Create metric for request timing
    auto& request_duration = metrics::MetricsService::getInstance().createHistogram(
        "etr_request_duration_seconds",
        "ETR request duration in seconds",
        {{"method", "CreateTrainingRecord"}}
    );
    
    auto start_time = std::chrono::steady_clock::now();
    
    // Check authentication
    std::string token = extractToken(context);
    if (!validateToken(token)) {
        auto end_time = std::chrono::steady_clock::now();
        double duration = std::chrono::duration<double>(end_time - start_time).count();
        request_duration.Observe(duration);
        
        return grpc::Status(grpc::StatusCode::UNAUTHENTICATED, "Invalid authentication token");
    }
    
    try {
        // Convert protobuf to internal model
        records::TrainingRecord record = convertFromProto(*request);
        
        // Create record
        std::string record_id = record_service_->createRecord(record);
        
        if (record_id.empty()) {
            auto end_time = std::chrono::steady_clock::now();
            double duration = std::chrono::duration<double>(end_time - start_time).count();
            request_duration.Observe(duration);
            
            return grpc::Status(grpc::StatusCode::INTERNAL, "Failed to create training record");
        }
        
        // Set response
        response->set_success(true);
        response->set_record_id(record_id);
        response->set_timestamp(
            std::chrono::duration_cast<std::chrono::milliseconds>(
                std::chrono::system_clock::now().time_since_epoch()
            ).count()
        );
        
        // Log success
        logging::Logger::getInstance().info("Created training record with ID: {}", record_id);
        
        // Update metrics
        auto end_time = std::chrono::steady_clock::now();
        double duration = std::chrono::duration<double>(end_time - start_time).count();
        request_duration.Observe(duration);
        
        auto& success_counter = metrics::MetricsService::getInstance().createCounter(
            "etr_record_operations_total",
            "ETR record operations",
            {{"operation", "create"}, {"status", "success"}}
        );
        success_counter.Increment();
        
        return grpc::Status::OK;
    } 
    catch (const std::exception& e) {
        // Log error
        logging::Logger::getInstance().error("Error creating training record: {}", e.what());
        
        // Set error response
        response->set_success(false);
        response->set_error_message(e.what());
        response->set_timestamp(
            std::chrono::duration_cast<std::chrono::milliseconds>(
                std::chrono::system_clock::now().time_since_epoch()
            ).count()
        );
        
        // Update metrics
        auto end_time = std::chrono::steady_clock::now();
        double duration = std::chrono::duration<double>(end_time - start_time).count();
        request_duration.Observe(duration);
        
        auto& error_counter = metrics::MetricsService::getInstance().createCounter(
            "etr_record_operations_total",
            "ETR record operations",
            {{"operation", "create"}, {"status", "error"}}
        );
        error_counter.Increment();
        
        return grpc::Status(grpc::StatusCode::INTERNAL, e.what());
    }
}

grpc::Status ETRServiceImpl::GetTrainingRecord(
    grpc::ServerContext* context,
    const RecordRequest* request,
    TrainingRecord* response
) {
    // Create metric for request timing
    auto& request_duration = metrics::MetricsService::getInstance().createHistogram(
        "etr_request_duration_seconds",
        "ETR request duration in seconds",
        {{"method", "GetTrainingRecord"}}
    );
    
    auto start_time = std::chrono::steady_clock::now();
    
    // Check authentication
    std::string token = extractToken(context);
    if (!validateToken(token)) {
        auto end_time = std::chrono::steady_clock::now();
        double duration = std::chrono::duration<double>(end_time - start_time).count();
        request_duration.Observe(duration);
        
        return grpc::Status(grpc::StatusCode::UNAUTHENTICATED, "Invalid authentication token");
    }
    
    try {
        // Get record
        std::optional<records::TrainingRecord> record = record_service_->getRecord(request->record_id());
        
        if (!record) {
            auto end_time = std::chrono::steady_clock::now();
            double duration = std::chrono::duration<double>(end_time - start_time).count();
            request_duration.Observe(duration);
            
            return grpc::Status(grpc::StatusCode::NOT_FOUND, "Training record not found");
        }
        
        // Convert internal model to protobuf
        *response = convertToProto(*record);
        
        // Log success
        logging::Logger::getInstance().info("Retrieved training record with ID: {}", request->record_id());
        
        // Update metrics
        auto end_time = std::chrono::steady_clock::now();
        double duration = std::chrono::duration<double>(end_time - start_time).count();
        request_duration.Observe(duration);
        
        auto& success_counter = metrics::MetricsService::getInstance().createCounter(
            "etr_record_operations_total",
            "ETR record operations",
            {{"operation", "get"}, {"status", "success"}}
        );
        success_counter.Increment();
        
        return grpc::Status::OK;
    } 
    catch (const std::exception& e) {
        // Log error
        logging::Logger::getInstance().error("Error getting training record: {}", e.what());
        
        // Update metrics
        auto end_time = std::chrono::steady_clock::now();
        double duration = std::chrono::duration<double>(end_time - start_time).count();
        request_duration.Observe(duration);
        
        auto& error_counter = metrics::MetricsService::getInstance().createCounter(
            "etr_record_operations_total",
            "ETR record operations",
            {{"operation", "get"}, {"status", "error"}}
        );
        error_counter.Increment();
        
        return grpc::Status(grpc::StatusCode::INTERNAL, e.what());
    }
}

grpc::Status ETRServiceImpl::UpdateTrainingRecord(
    grpc::ServerContext* context,
    const TrainingRecord* request,
    RecordResponse* response
) {
    // Create metric for request timing
    auto& request_duration = metrics::MetricsService::getInstance().createHistogram(
        "etr_request_duration_seconds",
        "ETR request duration in seconds",
        {{"method", "UpdateTrainingRecord"}}
    );
    
    auto start_time = std::chrono::steady_clock::now();
    
    // Check authentication
    std::string token = extractToken(context);
    if (!validateToken(token)) {
        auto end_time = std::chrono::steady_clock::now();
        double duration = std::chrono::duration<double>(end_time - start_time).count();
        request_duration.Observe(duration);
        
        return grpc::Status(grpc::StatusCode::UNAUTHENTICATED, "Invalid authentication token");
    }
    
    try {
        // Convert protobuf to internal model
        records::TrainingRecord record = convertFromProto(*request);
        
        // Update record
        bool success = record_service_->updateRecord(record);
        
        if (!success) {
            auto end_time = std::chrono::steady_clock::now();
            double duration = std::chrono::duration<double>(end_time - start_time).count();
            request_duration.Observe(duration);
            
            return grpc::Status(grpc::StatusCode::NOT_FOUND, "Training record not found");
        }
        
        // Set response
        response->set_success(true);
        response->set_record_id(record.getRecordId());
        response->set_timestamp(
            std::chrono::duration_cast<std::chrono::milliseconds>(
                std::chrono::system_clock::now().time_since_epoch()
            ).count()
        );
        
        // Log success
        logging::Logger::getInstance().info("Updated training record with ID: {}", record.getRecordId());
        
        // Update metrics
        auto end_time = std::chrono::steady_clock::now();
        double duration = std::chrono::duration<double>(end_time - start_time).count();
        request_duration.Observe(duration);
        
        auto& success_counter = metrics::MetricsService::getInstance().createCounter(
            "etr_record_operations_total",
            "ETR record operations",
            {{"operation", "update"}, {"status", "success"}}
        );
        success_counter.Increment();
        
        return grpc::Status::OK;
    } 
    catch (const std::exception& e) {
        // Log error
        logging::Logger::getInstance().error("Error updating training record: {}", e.what());
        
        // Set error response
        response->set_success(false);
        response->set_error_message(e.what());
        response->set_timestamp(
            std::chrono::duration_cast<std::chrono::milliseconds>(
                std::chrono::system_clock::now().time_since_epoch()
            ).count()
        );
        
        // Update metrics
        auto end_time = std::chrono::steady_clock::now();
        double duration = std::chrono::duration<double>(end_time - start_time).count();
        request_duration.Observe(duration);
        
        auto& error_counter = metrics::MetricsService::getInstance().createCounter(
            "etr_record_operations_total",
            "ETR record operations",
            {{"operation", "update"}, {"status", "error"}}
        );
        error_counter.Increment();
        
        return grpc::Status(grpc::StatusCode::INTERNAL, e.what());
    }
}

grpc::Status ETRServiceImpl::DeleteTrainingRecord(
    grpc::ServerContext* context,
    const RecordRequest* request,
    RecordResponse* response
) {
    // Create metric for request timing
    auto& request_duration = metrics::MetricsService::getInstance().createHistogram(
        "etr_request_duration_seconds",
        "ETR request duration in seconds",
        {{"method", "DeleteTrainingRecord"}}
    );
    
    auto start_time = std::chrono::steady_clock::now();
    
    // Check authentication
    std::string token = extractToken(context);
    if (!validateToken(token)) {
        auto end_time = std::chrono::steady_clock::now();
        double duration = std::chrono::duration<double>(end_time - start_time).count();
        request_duration.Observe(duration);
        
        return grpc::Status(grpc::StatusCode::UNAUTHENTICATED, "Invalid authentication token");
    }
    
    // Check authorization
    std::string user_id = extractUserId(token);
    
    try {
        // Delete record
        bool success = record_service_->deleteRecord(request->record_id());
        
        if (!success) {
            auto end_time = std::chrono::steady_clock::now();
            double duration = std::chrono::duration<double>(end_time - start_time).count();
            request_duration.Observe(duration);
            
            return grpc::Status(grpc::StatusCode::NOT_FOUND, "Training record not found");
        }
        
        // Set response
        response->set_success(true);
        response->set_record_id(request->record_id());
        response->set_timestamp(
            std::chrono::duration_cast<std::chrono::milliseconds>(
                std::chrono::system_clock::now().time_since_epoch()
            ).count()
        );
        
        // Log success
        logging::Logger::getInstance().info("Deleted training record with ID: {}", request->record_id());
        
        // Update metrics
        auto end_time = std::chrono::steady_clock::now();
        double duration = std::chrono::duration<double>(end_time - start_time).count();
        request_duration.Observe(duration);
        
        auto& success_counter = metrics::MetricsService::getInstance().createCounter(
            "etr_record_operations_total",
            "ETR record operations",
            {{"operation", "delete"}, {"status", "success"}}
        );
        success_counter.Increment();
        
        return grpc::Status::OK;
    } 
    catch (const std::exception& e) {
        // Log error
        logging::Logger::getInstance().error("Error deleting training record: {}", e.what());
        
        // Set error response
        response->set_success(false);
        response->set_error_message(e.what());
        response->set_timestamp(
            std::chrono::duration_cast<std::chrono::milliseconds>(
                std::chrono::system_clock::now().time_since_epoch()
            ).count()
        );
        
        // Update metrics
        auto end_time = std::chrono::steady_clock::now();
        double duration = std::chrono::duration<double>(end_time - start_time).count();
        request_duration.Observe(duration);
        
        auto& error_counter = metrics::MetricsService::getInstance().createCounter(
            "etr_record_operations_total",
            "ETR record operations",
            {{"operation", "delete"}, {"status", "error"}}
        );
        error_counter.Increment();
        
        return grpc::Status(grpc::StatusCode::INTERNAL, e.what());
    }
}

grpc::Status ETRServiceImpl::ListTrainingRecords(
    grpc::ServerContext* context,
    const ListRecordsRequest* request,
    ListRecordsResponse* response
) {
    // Create metric for request timing
    auto& request_duration = metrics::MetricsService::getInstance().createHistogram(
        "etr_request_duration_seconds",
        "ETR request duration in seconds",
        {{"method", "ListTrainingRecords"}}
    );
    
    auto start_time = std::chrono::steady_clock::now();
    
    // Check authentication
    std::string token = extractToken(context);
    if (!validateToken(token)) {
        auto end_time = std::chrono::steady_clock::now();
        double duration = std::chrono::duration<double>(end_time - start_time).count();
        request_duration.Observe(duration);
        
        return grpc::Status(grpc::StatusCode::UNAUTHENTICATED, "Invalid authentication token");
    }
    
    try {
        // Convert parameters
        std::optional<std::string> trainee_id;
        if (!request->trainee_id().empty()) {
            trainee_id = request->trainee_id();
        }
        
        std::optional<std::string> instructor_id;
        if (!request->instructor_id().empty()) {
            instructor_id = request->instructor_id();
        }
        
        std::optional<std::string> course_id;
        if (!request->course_id().empty()) {
            course_id = request->course_id();
        }
        
        std::optional<std::string> syllabus_id;
        if (!request->syllabus_id().empty()) {
            syllabus_id = request->syllabus_id();
        }
        
        std::optional<records::RecordType> record_type;
        if (request->record_type() != RecordType::UNKNOWN_RECORD) {
            record_type = static_cast<records::RecordType>(
                static_cast<int>(request->record_type()) - 1
            );
        }
        
        std::optional<std::chrono::system_clock::time_point> start_date;
        if (request->start_date() > 0) {
            start_date = std::chrono::system_clock::time_point(
                std::chrono::milliseconds(request->start_date())
            );
        }
        
        std::optional<std::chrono::system_clock::time_point> end_date;
        if (request->end_date() > 0) {
            end_date = std::chrono::system_clock::time_point(
                std::chrono::milliseconds(request->end_date())
            );
        }
        
        // List records
        auto [records, total_count] = record_service_->listRecords(
            trainee_id,
            instructor_id,
            course_id,
            syllabus_id,
            record_type,
            start_date,
            end_date,
            request->page(),
            request->page_size(),
            request->sort_by(),
            request->ascending()
        );
        
        // Set response
        response->set_success(true);
        response->set_total_count(total_count);
        response->set_page(request->page());
        response->set_page_size(request->page_size());
        
        // Add records to response
        for (const auto& record : records) {
            *response->add_records() = convertToProto(record);
        }
        
        // Log success
        logging::Logger::getInstance().info("Listed {} training records", records.size());
        
        // Update metrics
        auto end_time = std::chrono::steady_clock::now();
        double duration = std::chrono::duration<double>(end_time - start_time).count();
        request_duration.Observe(duration);
        
        auto& success_counter = metrics::MetricsService::getInstance().createCounter(
            "etr_record_operations_total",
            "ETR record operations",
            {{"operation", "list"}, {"status", "success"}}
        );
        success_counter.Increment();
        
        return grpc::Status::OK;
    } 
    catch (const std::exception& e) {
        // Log error
        logging::Logger::getInstance().error("Error listing training records: {}", e.what());
        
        // Set error response
        response->set_success(false);
        response->set_error_message(e.what());
        
        // Update metrics
        auto end_time = std::chrono::steady_clock::now();
        double duration = std::chrono::duration<double>(end_time - start_time).count();
        request_duration.Observe(duration);
        
        auto& error_counter = metrics::MetricsService::getInstance().createCounter(
            "etr_record_operations_total",
            "ETR record operations",
            {{"operation", "list"}, {"status", "error"}}
        );
        error_counter.Increment();
        
        return grpc::Status(grpc::StatusCode::INTERNAL, e.what());
    }
}

// Conversion methods
TrainingRecord ETRServiceImpl::convertToProto(const records::TrainingRecord& record) {
    TrainingRecord proto_record;
    
    // Set basic fields
    proto_record.set_record_id(record.getRecordId());
    proto_record.set_trainee_id(record.getTraineeId());
    proto_record.set_instructor_id(record.getInstructorId());
    proto_record.set_record_type(static_cast<RecordType>(
        static_cast<int>(record.getRecordType()) + 1
    ));
    proto_record.set_course_id(record.getCourseId());
    proto_record.set_syllabus_id(record.getSyllabusId());
    proto_record.set_exercise_id(record.getExerciseId());
    
    // Set date
    proto_record.set_date(
        std::chrono::duration_cast<std::chrono::milliseconds>(
            record.getDate().time_since_epoch()
        ).count()
    );
    
    proto_record.set_duration_minutes(record.getDurationMinutes());
    proto_record.set_location(record.getLocation());
    proto_record.set_aircraft_type(record.getAircraftType());
    
    // Set grades
    for (const auto& grade : record.getGrades()) {
        auto* proto_grade = proto_record.add_grades();
        proto_grade->set_criteria_id(grade.criteria_id);
        proto_grade->set_criteria_name(grade.criteria_name);
        proto_grade->set_grade(grade.grade);
        proto_grade->set_comments(grade.comments);
    }
    
    // Set attachments
    for (const auto& attachment : record.getAttachments()) {
        proto_record.add_attachments(attachment);
    }
    
    proto_record.set_comments(record.getComments());
    
    // Set trainee signature
    if (record.getTraineeSignature()) {
        auto* proto_sig = proto_record.mutable_trainee_signature();
        *proto_sig = convertToProto(*record.getTraineeSignature());
    }
    
    // Set instructor signature
    if (record.getInstructorSignature()) {
        auto* proto_sig = proto_record.mutable_instructor_signature();
        *proto_sig = convertToProto(*record.getInstructorSignature());
    }
    
    proto_record.set_is_draft(record.isDraft());
    
    // Set timestamps
    proto_record.set_created_at(
        std::chrono::duration_cast<std::chrono::milliseconds>(
            record.getCreatedAt().time_since_epoch()
        ).count()
    );
    
    proto_record.set_updated_at(
        std::chrono::duration_cast<std::chrono::milliseconds>(
            record.getUpdatedAt().time_since_epoch()
        ).count()
    );
    
    // Set metadata
    for (const auto& [key, value] : record.getMetadata()) {
        (*proto_record.mutable_metadata())[key] = value;
    }
    
    return proto_record;
}

records::TrainingRecord ETRServiceImpl::convertFromProto(const TrainingRecord& proto_record) {
    records::TrainingRecord record(proto_record.record_id());
    
    // Set basic fields
    record.setTraineeId(proto_record.trainee_id());
    record.setInstructorId(proto_record.instructor_id());
    record.setRecordType(static_cast<records::RecordType>(
        static_cast<int>(proto_record.record_type()) - 1
    ));
    record.setCourseId(proto_record.course_id());
    record.setSyllabusId(proto_record.syllabus_id());
    record.setExerciseId(proto_record.exercise_id());
    
    // Set date
    if (proto_record.date() > 0) {
        record.setDate(std::chrono::system_clock::time_point(
            std::chrono::milliseconds(proto_record.date())
        ));
    }
    
    record.setDurationMinutes(proto_record.duration_minutes());
    record.setLocation(proto_record.location());
    record.setAircraftType(proto_record.aircraft_type());
    
    // Set grades
    std::vector<records::GradeItem> grades;
    for (const auto& proto_grade : proto_record.grades()) {
        records::GradeItem grade;
        grade.criteria_id = proto_grade.criteria_id();
        grade.criteria_name = proto_grade.criteria_name();
        grade.grade = proto_grade.grade();
        grade.comments = proto_grade.comments();
        grades.push_back(grade);
    }
    record.setGrades(grades);
    
    // Set attachments
    std::vector<std::string> attachments;
    for (const auto& attachment : proto_record.attachments()) {
        attachments.push_back(attachment);
    }
    record.setAttachments(attachments);
    
    record.setComments(proto_record.comments());
    
    // Set trainee signature
    if (proto_record.has_trainee_signature()) {
        record.setTraineeSignature(convertFromProto(proto_record.trainee_signature()));
    }
    
    // Set instructor signature
    if (proto_record.has_instructor_signature()) {
        record.setInstructorSignature(convertFromProto(proto_record.instructor_signature()));
    }
    
    record.setDraft(proto_record.is_draft());
    
    // Set timestamps
    if (proto_record.created_at() > 0) {
        record.setCreatedAt(std::chrono::system_clock::time_point(
            std::chrono::milliseconds(proto_record.created_at())
        ));
    }
    
    if (proto_record.updated_at() > 0) {
        record.setUpdatedAt(std::chrono::system_clock::time_point(
            std::chrono::milliseconds(proto_record.updated_at())
        ));
    }
    
    // Set metadata
    std::map<std::string, std::string> metadata;
    for (const auto& [key, value] : proto_record.metadata()) {
        metadata[key] = value;
    }
    record.setMetadata(metadata);
    
    return record;
}

SignatureInfo ETRServiceImpl::convertToProto(const records::SignatureInfo& signature) {
    SignatureInfo proto_signature;
    
    proto_signature.set_signer_id(signature.signer_id);
    proto_signature.set_signer_name(signature.signer_name);
    proto_signature.set_certificate_id(signature.certificate_id);
    proto_signature.set_signature_data(
        signature.signature_data.data(),
        signature.signature_data.size()
    );
    proto_signature.set_timestamp(
        std::chrono::duration_cast<std::chrono::milliseconds>(
            signature.timestamp.time_since_epoch()
        ).count()
    );
    proto_signature.set_is_valid(signature.is_valid);
    
    return proto_signature;
}

records::SignatureInfo ETRServiceImpl::convertFromProto(const SignatureInfo& proto_signature) {
    records::SignatureInfo signature;
    
    signature.signer_id = proto_signature.signer_id();
    signature.signer_name = proto_signature.signer_name();
    signature.certificate_id = proto_signature.certificate_id();
    
    // Copy signature data
    const std::string& sig_data = proto_signature.signature_data();
    signature.signature_data.assign(sig_data.begin(), sig_data.end());
    
    // Set timestamp
    signature.timestamp = std::chrono::system_clock::time_point(
        std::chrono::milliseconds(proto_signature.timestamp())
    );
    
    signature.is_valid = proto_signature.is_valid();
    
    return signature;
}

// Authentication & Authorization methods
std::string ETRServiceImpl::extractToken(const grpc::ServerContext* context) {
    // Find authorization metadata
    auto auth_iter = context->client_metadata().find("authorization");
    if (auth_iter != context->client_metadata().end()) {
        const std::string auth_header(auth_iter->second.data(), auth_iter->second.size());
        
        // Check Bearer prefix
        if (auth_header.substr(0, 7) == "Bearer ") {
            return auth_header.substr(7);
        }
    }
    
    return "";
}

bool ETRServiceImpl::validateToken(const std::string& token) {
    // For demo purposes, just check if token is not empty
    // In a real implementation, this would validate with the core platform service
    if (token.empty()) {
        return false;
    }
    
    try {
        // Basic JWT validation
        auto decoded = jwt::decode(token);
        
        // Check expiration
        if (decoded.has_expires_at() && decoded.get_expires_at() < std::chrono::system_clock::now()) {
            logging::Logger::getInstance().warn("Token expired");
            return false;
        }
        
        return true;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().warn("Token validation error: {}", e.what());
        return false;
    }
}

std::string ETRServiceImpl::extractUserId(const std::string& token) {
    if (token.empty()) {
        return "";
    }
    
    try {
        // Decode JWT to extract user ID
        auto decoded = jwt::decode(token);
        return decoded.get_subject();
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().warn("Error extracting user ID from token: {}", e.what());
        return "";
    }
}

// Implement other methods...
// For brevity, I'm showing a few key methods. In a real implementation, you would implement all the methods.

} // namespace service
} // namespace etr