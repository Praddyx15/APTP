#pragma once

#include <memory>
#include <string>
#include <vector>
#include <chrono>
#include <grpcpp/grpcpp.h>

#include "etr_service.grpc.pb.h"
#include "records/record_service.h"
#include "signature/digital_signature.h"
#include "compliance/compliance_service.h"
#include "syllabus/syllabus_service.h"

namespace etr {
namespace service {

/**
 * @brief gRPC service implementation for Electronic Training Records
 */
class ETRServiceImpl final : public ElectronicTrainingRecordsService::Service {
public:
    /**
     * @brief Constructor
     * @param record_service Record service
     * @param signature_service Signature service
     * @param compliance_service Compliance service
     * @param syllabus_service Syllabus service
     */
    ETRServiceImpl(
        std::shared_ptr<records::IRecordService> record_service,
        std::shared_ptr<signature::IDigitalSignatureService> signature_service,
        std::shared_ptr<compliance::IComplianceService> compliance_service,
        std::shared_ptr<syllabus::ISyllabusService> syllabus_service
    );

    // Records management
    grpc::Status CreateTrainingRecord(
        grpc::ServerContext* context,
        const TrainingRecord* request,
        RecordResponse* response
    ) override;

    grpc::Status GetTrainingRecord(
        grpc::ServerContext* context,
        const RecordRequest* request,
        TrainingRecord* response
    ) override;

    grpc::Status UpdateTrainingRecord(
        grpc::ServerContext* context,
        const TrainingRecord* request,
        RecordResponse* response
    ) override;

    grpc::Status DeleteTrainingRecord(
        grpc::ServerContext* context,
        const RecordRequest* request,
        RecordResponse* response
    ) override;

    grpc::Status ListTrainingRecords(
        grpc::ServerContext* context,
        const ListRecordsRequest* request,
        ListRecordsResponse* response
    ) override;

    // Digital signature
    grpc::Status SignRecord(
        grpc::ServerContext* context,
        const SignatureRequest* request,
        SignatureResponse* response
    ) override;

    grpc::Status VerifySignature(
        grpc::ServerContext* context,
        const VerifyRequest* request,
        VerifyResponse* response
    ) override;

    // Compliance tracking
    grpc::Status CheckCompliance(
        grpc::ServerContext* context,
        const ComplianceRequest* request,
        ComplianceResponse* response
    ) override;

    grpc::Status ListComplianceRequirements(
        grpc::ServerContext* context,
        const ListComplianceRequest* request,
        ListComplianceResponse* response
    ) override;

    grpc::Status MapRegulations(
        grpc::ServerContext* context,
        const RegulationMappingRequest* request,
        RegulationMappingResponse* response
    ) override;

    // Syllabus management
    grpc::Status CreateSyllabus(
        grpc::ServerContext* context,
        const Syllabus* request,
        SyllabusResponse* response
    ) override;

    grpc::Status GetSyllabus(
        grpc::ServerContext* context,
        const SyllabusRequest* request,
        Syllabus* response
    ) override;

    grpc::Status UpdateSyllabus(
        grpc::ServerContext* context,
        const Syllabus* request,
        SyllabusResponse* response
    ) override;

    grpc::Status DeleteSyllabus(
        grpc::ServerContext* context,
        const SyllabusRequest* request,
        SyllabusResponse* response
    ) override;

    grpc::Status ListSyllabi(
        grpc::ServerContext* context,
        const ListSyllabiRequest* request,
        ListSyllabiResponse* response
    ) override;

    grpc::Status TrackSyllabusChanges(
        grpc::ServerContext* context,
        const SyllabusChangeRequest* request,
        SyllabusChangeResponse* response
    ) override;

private:
    /**
     * @brief Convert internal training record to protobuf
     * @param record Internal record
     * @return Protobuf record
     */
    TrainingRecord convertToProto(const records::TrainingRecord& record);

    /**
     * @brief Convert protobuf training record to internal
     * @param proto_record Protobuf record
     * @return Internal record
     */
    records::TrainingRecord convertFromProto(const TrainingRecord& proto_record);

    /**
     * @brief Convert internal syllabus to protobuf
     * @param syllabus Internal syllabus
     * @return Protobuf syllabus
     */
    Syllabus convertToProto(const syllabus::Syllabus& syllabus);

    /**
     * @brief Convert protobuf syllabus to internal
     * @param proto_syllabus Protobuf syllabus
     * @return Internal syllabus
     */
    syllabus::Syllabus convertFromProto(const Syllabus& proto_syllabus);

    /**
     * @brief Convert internal signature info to protobuf
     * @param signature Internal signature info
     * @return Protobuf signature info
     */
    SignatureInfo convertToProto(const records::SignatureInfo& signature);

    /**
     * @brief Convert protobuf signature info to internal
     * @param proto_signature Protobuf signature info
     * @return Internal signature info
     */
    records::SignatureInfo convertFromProto(const SignatureInfo& proto_signature);

    /**
     * @brief Convert internal compliance status to protobuf
     * @param status Internal compliance status
     * @return Protobuf compliance response
     */
    ComplianceResponse convertToProto(const compliance::ComplianceStatus& status);

    /**
     * @brief Convert internal compliance requirement to protobuf
     * @param requirement Internal compliance requirement
     * @return Protobuf compliance requirement
     */
    ComplianceRequirement convertToProto(const compliance::ComplianceRequirement& requirement);

    /**
     * @brief Convert internal regulation mapping to protobuf
     * @param mapping Internal regulation mapping
     * @return Protobuf regulation mapping
     */
    RegulationMapping convertToProto(const compliance::RegulationMapping& mapping);

    /**
     * @brief Convert internal syllabus changes to protobuf
     * @param changes Internal syllabus changes
     * @return Protobuf syllabus changes
     */
    std::vector<SyllabusChange> convertToProto(const std::vector<syllabus::SyllabusChange>& changes);

    /**
     * @brief Extract authentication token from context
     * @param context gRPC server context
     * @return Token or empty string if not found
     */
    std::string extractToken(const grpc::ServerContext* context);

    /**
     * @brief Validate authentication token
     * @param token Authentication token
     * @return True if valid
     */
    bool validateToken(const std::string& token);

    /**
     * @brief Extract user ID from token
     * @param token Authentication token
     * @return User ID or empty string if extraction failed
     */
    std::string extractUserId(const std::string& token);

    std::shared_ptr<records::IRecordService> record_service_;
    std::shared_ptr<signature::IDigitalSignatureService> signature_service_;
    std::shared_ptr<compliance::IComplianceService> compliance_service_;
    std::shared_ptr<syllabus::ISyllabusService> syllabus_service_;
};

} // namespace service
} // namespace etr