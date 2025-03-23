#include "signature/certificate_repository.h"
#include "logging/logger.h"
#include <chrono>

namespace etr {
namespace signature {

// Implementation of the Certificate Repository
CertificateRepository::CertificateRepository(
    std::shared_ptr<persistence::DatabaseConnection> db_connection
) : db_connection_(std::move(db_connection)) {
    logging::Logger::getInstance().info("CertificateRepository initialized");
}

CertificateRepository::~CertificateRepository() = default;

bool CertificateRepository::storeCertificate(const CertificateInfo& certificate) {
    try {
        persistence::Transaction transaction = db_connection_->createTransaction();
        
        // Check if certificate already exists
        std::string query = R"(
            SELECT certificate_id FROM etr.certificates 
            WHERE certificate_id = $1
        )";
        
        auto result = db_connection_->executeQuery(query, {
            {.name = "certificate_id", .value = certificate.certificate_id, .type = persistence::PgParamType::TEXT, .is_null = false}
        });
        
        bool exists = !result.isEmpty();
        
        if (exists) {
            // Update existing certificate
            query = R"(
                UPDATE etr.certificates SET
                    user_id = $1,
                    subject_name = $2,
                    issuer_name = $3,
                    serial_number = $4,
                    not_before = $5,
                    not_after = $6,
                    raw_data = $7,
                    is_valid = $8
                WHERE certificate_id = $9
            )";
        } else {
            // Insert new certificate
            query = R"(
                INSERT INTO etr.certificates (
                    user_id, subject_name, issuer_name, serial_number,
                    not_before, not_after, raw_data, is_valid, certificate_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            )";
        }
        
        // Extract user_id from subject name (simplified)
        std::string user_id = extractUserIdFromSubject(certificate.subject_name);
        
        // Convert dates to strings in ISO format
        auto not_before_time_t = std::chrono::system_clock::to_time_t(certificate.not_before);
        auto not_after_time_t = std::chrono::system_clock::to_time_t(certificate.not_after);
        
        char not_before_str[100], not_after_str[100];
        std::strftime(not_before_str, sizeof(not_before_str), "%Y-%m-%d %H:%M:%S", std::gmtime(&not_before_time_t));
        std::strftime(not_after_str, sizeof(not_after_str), "%Y-%m-%d %H:%M:%S", std::gmtime(&not_after_time_t));
        
        // Execute query
        auto update_result = db_connection_->executeQuery(query, {
            {.name = "user_id", .value = user_id, .type = persistence::PgParamType::TEXT, .is_null = false},
            {.name = "subject_name", .value = certificate.subject_name, .type = persistence::PgParamType::TEXT, .is_null = false},
            {.name = "issuer_name", .value = certificate.issuer_name, .type = persistence::PgParamType::TEXT, .is_null = false},
            {.name = "serial_number", .value = certificate.serial_number, .type = persistence::PgParamType::TEXT, .is_null = false},
            {.name = "not_before", .value = not_before_str, .type = persistence::PgParamType::TIMESTAMP, .is_null = false},
            {.name = "not_after", .value = not_after_str, .type = persistence::PgParamType::TIMESTAMP, .is_null = false},
            {.name = "raw_data", .value = "", .type = persistence::PgParamType::BYTEA, .is_null = false}, // Raw data would be properly handled in real implementation
            {.name = "is_valid", .value = certificate.is_valid ? "true" : "false", .type = persistence::PgParamType::BOOLEAN, .is_null = false},
            {.name = "certificate_id", .value = certificate.certificate_id, .type = persistence::PgParamType::TEXT, .is_null = false}
        });
        
        if (update_result.hasError()) {
            logging::Logger::getInstance().error("Error storing certificate: {}", update_result.getErrorMessage());
            transaction.rollback();
            return false;
        }
        
        transaction.commit();
        
        logging::Logger::getInstance().info("Certificate {} stored successfully", certificate.certificate_id);
        return true;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error storing certificate: {}", e.what());
        return false;
    }
}

std::optional<CertificateInfo> CertificateRepository::getCertificate(const std::string& certificate_id) {
    try {
        std::string query = R"(
            SELECT 
                certificate_id, user_id, subject_name, issuer_name, serial_number,
                not_before, not_after, raw_data, is_valid, is_revoked
            FROM etr.certificates
            WHERE certificate_id = $1
        )";
        
        auto result = db_connection_->executeQuery(query, {
            {.name = "certificate_id", .value = certificate_id, .type = persistence::PgParamType::TEXT, .is_null = false}
        });
        
        if (result.isEmpty()) {
            logging::Logger::getInstance().debug("Certificate {} not found", certificate_id);
            return std::nullopt;
        }
        
        // Parse result row into CertificateInfo
        CertificateInfo certificate;
        
        certificate.certificate_id = result.getString(0, "certificate_id");
        certificate.subject_name = result.getString(0, "subject_name");
        certificate.issuer_name = result.getString(0, "issuer_name");
        certificate.serial_number = result.getString(0, "serial_number");
        
        // Parse dates from ISO format string
        auto not_before_tp = result.getTimestamp(0, "not_before");
        auto not_after_tp = result.getTimestamp(0, "not_after");
        
        if (not_before_tp) {
            certificate.not_before = *not_before_tp;
        }
        
        if (not_after_tp) {
            certificate.not_after = *not_after_tp;
        }
        
        // Get raw data (binary)
        certificate.raw_data = result.getBinary(0, "raw_data");
        
        certificate.is_valid = result.getBool(0, "is_valid");
        
        bool is_revoked = result.getBool(0, "is_revoked");
        
        // A certificate is valid only if it's marked as valid and not revoked
        certificate.is_valid = certificate.is_valid && !is_revoked;
        
        logging::Logger::getInstance().debug("Retrieved certificate {}", certificate_id);
        
        return certificate;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error retrieving certificate {}: {}", certificate_id, e.what());
        return std::nullopt;
    }
}

std::vector<CertificateInfo> CertificateRepository::getCertificatesByUserId(const std::string& user_id) {
    std::vector<CertificateInfo> certificates;
    
    try {
        std::string query = R"(
            SELECT 
                certificate_id, user_id, subject_name, issuer_name, serial_number,
                not_before, not_after, raw_data, is_valid, is_revoked
            FROM etr.certificates
            WHERE user_id = $1
            ORDER BY not_after DESC
        )";
        
        auto result = db_connection_->executeQuery(query, {
            {.name = "user_id", .value = user_id, .type = persistence::PgParamType::TEXT, .is_null = false}
        });
        
        for (int i = 0; i < result.getNumRows(); i++) {
            CertificateInfo certificate;
            
            certificate.certificate_id = result.getString(i, "certificate_id");
            certificate.subject_name = result.getString(i, "subject_name");
            certificate.issuer_name = result.getString(i, "issuer_name");
            certificate.serial_number = result.getString(i, "serial_number");
            
            // Parse dates from ISO format string
            auto not_before_tp = result.getTimestamp(i, "not_before");
            auto not_after_tp = result.getTimestamp(i, "not_after");
            
            if (not_before_tp) {
                certificate.not_before = *not_before_tp;
            }
            
            if (not_after_tp) {
                certificate.not_after = *not_after_tp;
            }
            
            // Get raw data (binary)
            certificate.raw_data = result.getBinary(i, "raw_data");
            
            certificate.is_valid = result.getBool(i, "is_valid");
            
            bool is_revoked = result.getBool(i, "is_revoked");
            
            // A certificate is valid only if it's marked as valid and not revoked
            certificate.is_valid = certificate.is_valid && !is_revoked;
            
            certificates.push_back(certificate);
        }
        
        logging::Logger::getInstance().debug("Retrieved {} certificates for user {}", certificates.size(), user_id);
        
        return certificates;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error retrieving certificates for user {}: {}", user_id, e.what());
        return {};
    }
}

bool CertificateRepository::revokeCertificate(const std::string& certificate_id, const std::string& reason) {
    try {
        persistence::Transaction transaction = db_connection_->createTransaction();
        
        std::string query = R"(
            UPDATE etr.certificates
            SET is_revoked = true,
                revocation_reason = $1,
                revocation_time = NOW()
            WHERE certificate_id = $2
        )";
        
        auto result = db_connection_->executeQuery(query, {
            {.name = "reason", .value = reason, .type = persistence::PgParamType::TEXT, .is_null = false},
            {.name = "certificate_id", .value = certificate_id, .type = persistence::PgParamType::TEXT, .is_null = false}
        });
        
        if (result.getAffectedRows() == 0) {
            logging::Logger::getInstance().warn("Certificate {} not found for revocation", certificate_id);
            transaction.rollback();
            return false;
        }
        
        transaction.commit();
        
        logging::Logger::getInstance().info("Certificate {} revoked: {}", certificate_id, reason);
        return true;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error revoking certificate {}: {}", certificate_id, e.what());
        return false;
    }
}

bool CertificateRepository::isCertificateRevoked(const std::string& certificate_id) {
    try {
        std::string query = R"(
            SELECT is_revoked
            FROM etr.certificates
            WHERE certificate_id = $1
        )";
        
        auto result = db_connection_->executeQuery(query, {
            {.name = "certificate_id", .value = certificate_id, .type = persistence::PgParamType::TEXT, .is_null = false}
        });
        
        if (result.isEmpty()) {
            logging::Logger::getInstance().warn("Certificate {} not found for revocation check", certificate_id);
            return false;
        }
        
        bool is_revoked = result.getBool(0, "is_revoked");
        
        logging::Logger::getInstance().debug("Certificate {} revocation status: {}", 
            certificate_id, is_revoked ? "revoked" : "not revoked");
        
        return is_revoked;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error checking revocation for certificate {}: {}", 
            certificate_id, e.what());
        return false;
    }
}

std::vector<std::pair<std::string, std::string>> CertificateRepository::getCertificateRevocationList() {
    std::vector<std::pair<std::string, std::string>> crl;
    
    try {
        std::string query = R"(
            SELECT certificate_id, revocation_reason
            FROM etr.certificates
            WHERE is_revoked = true
        )";
        
        auto result = db_connection_->executeQuery(query, {});
        
        for (int i = 0; i < result.getNumRows(); i++) {
            std::string cert_id = result.getString(i, "certificate_id");
            std::string reason = result.getString(i, "revocation_reason");
            
            crl.emplace_back(cert_id, reason);
        }
        
        logging::Logger::getInstance().debug("Retrieved {} revoked certificates", crl.size());
        
        return crl;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error retrieving certificate revocation list: {}", e.what());
        return {};
    }
}

std::string CertificateRepository::extractUserIdFromSubject(const std::string& subject) {
    // Extract user ID from subject name
    // This is a simplified implementation - in a real system, this would parse the DN properly
    
    // Look for CN= in the subject
    size_t cn_pos = subject.find("CN=");
    if (cn_pos == std::string::npos) {
        return "";
    }
    
    // Find the end of the CN value (either a comma or end of string)
    size_t end_pos = subject.find(',', cn_pos);
    if (end_pos == std::string::npos) {
        end_pos = subject.length();
    }
    
    // Extract the CN value
    std::string cn = subject.substr(cn_pos + 3, end_pos - cn_pos - 3);
    
    // Trim whitespace
    cn.erase(0, cn.find_first_not_of(" \n\r\t"));
    cn.erase(cn.find_last_not_of(" \n\r\t") + 1);
    
    return cn;
}

} // namespace signature
} // namespace etr