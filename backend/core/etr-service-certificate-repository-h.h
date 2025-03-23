#pragma once

#include <string>
#include <vector>
#include <optional>
#include <memory>
#include "signature/digital_signature.h"
#include "persistence/database_connection.h"

namespace etr {
namespace signature {

/**
 * @brief Certificate repository interface
 */
class ICertificateRepository {
public:
    virtual ~ICertificateRepository() = default;
    
    /**
     * @brief Store certificate
     * @param certificate Certificate info
     * @return True if stored successfully
     */
    virtual bool storeCertificate(const CertificateInfo& certificate) = 0;
    
    /**
     * @brief Get certificate by ID
     * @param certificate_id Certificate ID
     * @return Certificate info or nullopt if not found
     */
    virtual std::optional<CertificateInfo> getCertificate(const std::string& certificate_id) = 0;
    
    /**
     * @brief Get certificates by user ID
     * @param user_id User ID
     * @return Certificates
     */
    virtual std::vector<CertificateInfo> getCertificatesByUserId(const std::string& user_id) = 0;
    
    /**
     * @brief Revoke certificate
     * @param certificate_id Certificate ID
     * @param reason Revocation reason
     * @return True if revoked successfully
     */
    virtual bool revokeCertificate(const std::string& certificate_id, const std::string& reason) = 0;
    
    /**
     * @brief Check if certificate is revoked
     * @param certificate_id Certificate ID
     * @return True if revoked
     */
    virtual bool isCertificateRevoked(const std::string& certificate_id) = 0;
    
    /**
     * @brief Get certificate revocation list
     * @return Certificate revocation list
     */
    virtual std::vector<std::pair<std::string, std::string>> getCertificateRevocationList() = 0;
};

/**
 * @brief Certificate repository implementation
 */
class CertificateRepository : public ICertificateRepository {
public:
    /**
     * @brief Constructor
     * @param db_connection Database connection
     */
    explicit CertificateRepository(std::shared_ptr<persistence::DatabaseConnection> db_connection);
    
    /**
     * @brief Destructor
     */
    ~CertificateRepository() override;
    
    // ICertificateRepository implementation
    bool storeCertificate(const CertificateInfo& certificate) override;
    std::optional<CertificateInfo> getCertificate(const std::string& certificate_id) override;
    std::vector<CertificateInfo> getCertificatesByUserId(const std::string& user_id) override;
    bool revokeCertificate(const std::string& certificate_id, const std::string& reason) override;
    bool isCertificateRevoked(const std::string& certificate_id) override;
    std::vector<std::pair<std::string, std::string>> getCertificateRevocationList() override;
    
private:
    /**
     * @brief Extract user ID from subject
     * @param subject Subject name
     * @return User ID
     */
    std::string extractUserIdFromSubject(const std::string& subject);
    
    std::shared_ptr<persistence::DatabaseConnection> db_connection_;
};

} // namespace signature
} // namespace etr