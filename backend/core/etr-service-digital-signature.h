#pragma once

#include <string>
#include <vector>
#include <map>
#include <memory>
#include <optional>
#include <chrono>
#include <openssl/evp.h>
#include <openssl/x509.h>
#include <openssl/pem.h>
#include "records/record_model.h"

namespace etr {
namespace signature {

/**
 * @brief Certificate information
 */
struct CertificateInfo {
    std::string certificate_id;
    std::string subject_name;
    std::string issuer_name;
    std::string serial_number;
    std::chrono::system_clock::time_point not_before;
    std::chrono::system_clock::time_point not_after;
    std::vector<uint8_t> raw_data;
    bool is_valid;
    
    /**
     * @brief Convert to JSON
     * @return JSON representation
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     * @param json JSON representation
     * @return Certificate info or nullopt if invalid
     */
    static std::optional<CertificateInfo> fromJson(const nlohmann::json& json);
};

/**
 * @brief Digital signature service interface
 */
class IDigitalSignatureService {
public:
    virtual ~IDigitalSignatureService() = default;
    
    /**
     * @brief Sign a record
     * @param record Record to sign
     * @param signer_id Signer ID
     * @param certificate_data Certificate data in PEM format
     * @param signature_data Signature data
     * @param is_instructor Whether signer is instructor
     * @return Signature info or nullopt if signing failed
     */
    virtual std::optional<records::SignatureInfo> signRecord(
        records::TrainingRecord& record,
        const std::string& signer_id,
        const std::string& certificate_data,
        const std::vector<uint8_t>& signature_data,
        bool is_instructor
    ) = 0;
    
    /**
     * @brief Verify a record signature
     * @param record Record to verify
     * @param signer_id Signer ID
     * @return Pair of (is_valid, signature_info) or nullopt if signature not found
     */
    virtual std::optional<std::pair<bool, records::SignatureInfo>> verifySignature(
        const records::TrainingRecord& record,
        const std::string& signer_id
    ) = 0;
    
    /**
     * @brief Parse certificate
     * @param certificate_data Certificate data in PEM format
     * @return Certificate info or nullopt if parsing failed
     */
    virtual std::optional<CertificateInfo> parseCertificate(
        const std::string& certificate_data
    ) = 0;
    
    /**
     * @brief Validate certificate
     * @param certificate_data Certificate data in PEM format
     * @return True if certificate is valid
     */
    virtual bool validateCertificate(
        const std::string& certificate_data
    ) = 0;
    
    /**
     * @brief Extract user ID from certificate
     * @param certificate_data Certificate data in PEM format
     * @return User ID or empty string if extraction failed
     */
    virtual std::string extractUserIdFromCertificate(
        const std::string& certificate_data
    ) = 0;
    
    /**
     * @brief Generate digest for record
     * @param record Record to generate digest for
     * @return Digest or empty vector if generation failed
     */
    virtual std::vector<uint8_t> generateDigest(
        const records::TrainingRecord& record
    ) = 0;
};

/**
 * @brief X.509 digital signature service implementation
 */
class X509DigitalSignatureService : public IDigitalSignatureService {
public:
    /**
     * @brief Constructor
     * @param ca_certificate_path Path to CA certificate
     * @param crl_path Path to certificate revocation list
     */
    X509DigitalSignatureService(
        const std::string& ca_certificate_path = "",
        const std::string& crl_path = ""
    );
    
    /**
     * @brief Destructor
     */
    ~X509DigitalSignatureService() override;
    
    std::optional<records::SignatureInfo> signRecord(
        records::TrainingRecord& record,
        const std::string& signer_id,
        const std::string& certificate_data,
        const std::vector<uint8_t>& signature_data,
        bool is_instructor
    ) override;
    
    std::optional<std::pair<bool, records::SignatureInfo>> verifySignature(
        const records::TrainingRecord& record,
        const std::string& signer_id
    ) override;
    
    std::optional<CertificateInfo> parseCertificate(
        const std::string& certificate_data
    ) override;
    
    bool validateCertificate(
        const std::string& certificate_data
    ) override;
    
    std::string extractUserIdFromCertificate(
        const std::string& certificate_data
    ) override;
    
    std::vector<uint8_t> generateDigest(
        const records::TrainingRecord& record
    ) override;
    
private:
    /**
     * @brief Get X509 certificate from PEM data
     * @param certificate_data Certificate data in PEM format
     * @return X509 certificate or nullptr if parsing failed
     */
    X509* getX509Certificate(const std::string& certificate_data);
    
    /**
     * @brief Verify signature
     * @param cert X509 certificate
     * @param digest Digest
     * @param signature Signature
     * @return True if signature is valid
     */
    bool verifySignatureWithCertificate(
        X509* cert,
        const std::vector<uint8_t>& digest,
        const std::vector<uint8_t>& signature
    );
    
    /**
     * @brief Check certificate revocation
     * @param cert X509 certificate
     * @return True if certificate is not revoked
     */
    bool checkCertificateRevocation(X509* cert);
    
    std::string ca_certificate_path_;
    std::string crl_path_;
    std::unique_ptr<X509_STORE, decltype(&X509_STORE_free)> cert_store_;
    const EVP_MD* digest_algorithm_;
};

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

} // namespace signature
} // namespace etr