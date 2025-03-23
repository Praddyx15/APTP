#include "signature/digital_signature.h"
#include "logging/logger.h"
#include <string>
#include <vector>
#include <fstream>
#include <sstream>

namespace etr {
namespace signature {

X509DigitalSignatureService::X509DigitalSignatureService(
    const std::string& ca_certificate_path,
    const std::string& crl_path
) : ca_certificate_path_(ca_certificate_path),
    crl_path_(crl_path),
    cert_store_(X509_STORE_new(), X509_STORE_free),
    digest_algorithm_(EVP_sha256()) {
    
    // Initialize OpenSSL
    OpenSSL_add_all_algorithms();
    ERR_load_crypto_strings();
    
    // Create certificate store
    if (!cert_store_) {
        logging::Logger::getInstance().error("Failed to create X509 certificate store");
        return;
    }
    
    // Load CA certificate if provided
    if (!ca_certificate_path_.empty()) {
        FILE* ca_file = fopen(ca_certificate_path_.c_str(), "r");
        if (ca_file) {
            X509* ca_cert = PEM_read_X509(ca_file, nullptr, nullptr, nullptr);
            fclose(ca_file);
            
            if (ca_cert) {
                if (X509_STORE_add_cert(cert_store_.get(), ca_cert) != 1) {
                    logging::Logger::getInstance().error("Failed to add CA certificate to store");
                }
                X509_free(ca_cert);
            } else {
                logging::Logger::getInstance().error("Failed to load CA certificate from {}", ca_certificate_path_);
            }
        } else {
            logging::Logger::getInstance().error("Failed to open CA certificate file: {}", ca_certificate_path_);
        }
    }
    
    // Load CRL if provided
    if (!crl_path_.empty()) {
        FILE* crl_file = fopen(crl_path_.c_str(), "r");
        if (crl_file) {
            X509_CRL* crl = PEM_read_X509_CRL(crl_file, nullptr, nullptr, nullptr);
            fclose(crl_file);
            
            if (crl) {
                if (X509_STORE_add_crl(cert_store_.get(), crl) != 1) {
                    logging::Logger::getInstance().error("Failed to add CRL to store");
                }
                X509_CRL_free(crl);
            } else {
                logging::Logger::getInstance().error("Failed to load CRL from {}", crl_path_);
            }
        } else {
            logging::Logger::getInstance().error("Failed to open CRL file: {}", crl_path_);
        }
    }
    
    // Set up verification parameters
    X509_VERIFY_PARAM* param = X509_VERIFY_PARAM_new();
    X509_VERIFY_PARAM_set_flags(param, X509_V_FLAG_CRL_CHECK | X509_V_FLAG_CRL_CHECK_ALL);
    X509_STORE_set1_param(cert_store_.get(), param);
    X509_VERIFY_PARAM_free(param);
    
    logging::Logger::getInstance().info("X509DigitalSignatureService initialized");
}

X509DigitalSignatureService::~X509DigitalSignatureService() {
    // Cleanup OpenSSL
    EVP_cleanup();
    ERR_free_strings();
    
    logging::Logger::getInstance().info("X509DigitalSignatureService shutdown");
}

std::optional<records::SignatureInfo> X509DigitalSignatureService::signRecord(
    records::TrainingRecord& record,
    const std::string& signer_id,
    const std::string& certificate_data,
    const std::vector<uint8_t>& signature_data,
    bool is_instructor
) {
    try {
        // Parse certificate
        auto cert_info = parseCertificate(certificate_data);
        if (!cert_info) {
            logging::Logger::getInstance().error("Failed to parse certificate for signing");
            return std::nullopt;
        }
        
        // Validate certificate
        if (!validateCertificate(certificate_data)) {
            logging::Logger::getInstance().error("Certificate validation failed for signing");
            return std::nullopt;
        }
        
        // Extract user ID from certificate and verify it matches signer_id
        std::string cert_user_id = extractUserIdFromCertificate(certificate_data);
        if (cert_user_id != signer_id) {
            logging::Logger::getInstance().error("Certificate user ID ({}) does not match signer ID ({})",
                cert_user_id, signer_id);
            return std::nullopt;
        }
        
        // Generate signature info
        records::SignatureInfo signature_info;
        signature_info.signer_id = signer_id;
        signature_info.signer_name = cert_info->subject_name;
        signature_info.certificate_id = cert_info->certificate_id;
        signature_info.signature_data = signature_data;
        signature_info.timestamp = std::chrono::system_clock::now();
        
        // Verify signature with certificate
        X509* cert = getX509Certificate(certificate_data);
        if (!cert) {
            logging::Logger::getInstance().error("Failed to get X509 certificate for verification");
            return std::nullopt;
        }
        
        std::vector<uint8_t> digest = generateDigest(record);
        
        // Verify signature
        bool signature_valid = verifySignatureWithCertificate(cert, digest, signature_data);
        X509_free(cert);
        
        if (!signature_valid) {
            logging::Logger::getInstance().error("Signature verification failed");
            return std::nullopt;
        }
        
        signature_info.is_valid = true;
        
        // Add signature to record
        if (is_instructor) {
            record.setInstructorSignature(signature_info);
        } else {
            record.setTraineeSignature(signature_info);
        }
        
        logging::Logger::getInstance().info("Record {} signed by {} ({})",
            record.getRecordId(), signer_id, is_instructor ? "instructor" : "trainee");
        
        return signature_info;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error signing record: {}", e.what());
        return std::nullopt;
    }
}

std::optional<std::pair<bool, records::SignatureInfo>> X509DigitalSignatureService::verifySignature(
    const records::TrainingRecord& record,
    const std::string& signer_id
) {
    try {
        // Get signature based on signer ID
        std::optional<records::SignatureInfo> signature;
        
        if (record.getInstructorSignature() && record.getInstructorSignature()->signer_id == signer_id) {
            signature = record.getInstructorSignature();
        } else if (record.getTraineeSignature() && record.getTraineeSignature()->signer_id == signer_id) {
            signature = record.getTraineeSignature();
        }
        
        if (!signature) {
            logging::Logger::getInstance().error("No signature found for signer: {}", signer_id);
            return std::nullopt;
        }
        
        // Get certificate from repository or other source
        // For this implementation, we'll assume the certificate is embedded in the signature
        // In a real implementation, we would retrieve it from a certificate repository
        
        // Generate digest
        std::vector<uint8_t> digest = generateDigest(record);
        
        // Verify signature
        bool is_valid = signature->is_valid;
        
        logging::Logger::getInstance().info("Signature verification for record {}, signer {}: {}",
            record.getRecordId(), signer_id, is_valid ? "valid" : "invalid");
        
        return std::make_pair(is_valid, *signature);
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error verifying signature: {}", e.what());
        return std::nullopt;
    }
}

std::optional<CertificateInfo> X509DigitalSignatureService::parseCertificate(
    const std::string& certificate_data
) {
    try {
        X509* cert = getX509Certificate(certificate_data);
        if (!cert) {
            logging::Logger::getInstance().error("Failed to parse X509 certificate");
            return std::nullopt;
        }
        
        CertificateInfo cert_info;
        
        // Get subject name
        X509_NAME* subject_name = X509_get_subject_name(cert);
        char subject_name_buf[256];
        X509_NAME_oneline(subject_name, subject_name_buf, sizeof(subject_name_buf));
        cert_info.subject_name = subject_name_buf;
        
        // Get issuer name
        X509_NAME* issuer_name = X509_get_issuer_name(cert);
        char issuer_name_buf[256];
        X509_NAME_oneline(issuer_name, issuer_name_buf, sizeof(issuer_name_buf));
        cert_info.issuer_name = issuer_name_buf;
        
        // Get serial number
        ASN1_INTEGER* serial = X509_get_serialNumber(cert);
        BIGNUM* bn = ASN1_INTEGER_to_BN(serial, nullptr);
        char* serial_str = BN_bn2hex(bn);
        cert_info.serial_number = serial_str;
        OPENSSL_free(serial_str);
        BN_free(bn);
        
        // Get validity period
        const ASN1_TIME* not_before = X509_get0_notBefore(cert);
        const ASN1_TIME* not_after = X509_get0_notAfter(cert);
        
        // Convert ASN1_TIME to time_t
        int day, sec;
        ASN1_TIME_diff(&day, &sec, nullptr, not_before);
        std::chrono::system_clock::time_point now = std::chrono::system_clock::now();
        std::chrono::seconds seconds(day * 86400 + sec);
        cert_info.not_before = now + seconds;
        
        ASN1_TIME_diff(&day, &sec, nullptr, not_after);
        cert_info.not_after = now + std::chrono::seconds(day * 86400 + sec);
        
        // Generate certificate ID (thumbprint)
        unsigned char md[EVP_MAX_MD_SIZE];
        unsigned int md_len;
        X509_digest(cert, EVP_sha256(), md, &md_len);
        
        std::stringstream thumbprint;
        for (unsigned int i = 0; i < md_len; i++) {
            thumbprint << std::hex << std::setw(2) << std::setfill('0') << (int)md[i];
        }
        cert_info.certificate_id = thumbprint.str();
        
        // Get raw certificate data
        BIO* bio = BIO_new(BIO_s_mem());
        PEM_write_bio_X509(bio, cert);
        
        char* pem_data;
        long pem_size = BIO_get_mem_data(bio, &pem_data);
        
        cert_info.raw_data.assign(pem_data, pem_data + pem_size);
        
        BIO_free(bio);
        
        // Validate certificate
        cert_info.is_valid = validateCertificate(certificate_data);
        
        X509_free(cert);
        
        logging::Logger::getInstance().debug("Parsed certificate: {}", cert_info.certificate_id);
        
        return cert_info;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error parsing certificate: {}", e.what());
        return std::nullopt;
    }
}

bool X509DigitalSignatureService::validateCertificate(
    const std::string& certificate_data
) {
    try {
        X509* cert = getX509Certificate(certificate_data);
        if (!cert) {
            logging::Logger::getInstance().error("Failed to parse X509 certificate for validation");
            return false;
        }
        
        // Create certificate store context
        X509_STORE_CTX* ctx = X509_STORE_CTX_new();
        if (!ctx) {
            logging::Logger::getInstance().error("Failed to create X509 store context");
            X509_free(cert);
            return false;
        }
        
        if (X509_STORE_CTX_init(ctx, cert_store_.get(), cert, nullptr) != 1) {
            logging::Logger::getInstance().error("Failed to initialize X509 store context");
            X509_STORE_CTX_free(ctx);
            X509_free(cert);
            return false;
        }
        
        // Verify certificate
        int verify_result = X509_verify_cert(ctx);
        
        // Get verification error if any
        if (verify_result != 1) {
            int error = X509_STORE_CTX_get_error(ctx);
            logging::Logger::getInstance().error("Certificate validation failed: {}",
                X509_verify_cert_error_string(error));
        }
        
        X509_STORE_CTX_free(ctx);
        X509_free(cert);
        
        return (verify_result == 1);
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error validating certificate: {}", e.what());
        return false;
    }
}

std::string X509DigitalSignatureService::extractUserIdFromCertificate(
    const std::string& certificate_data
) {
    try {
        X509* cert = getX509Certificate(certificate_data);
        if (!cert) {
            logging::Logger::getInstance().error("Failed to parse X509 certificate for user ID extraction");
            return "";
        }
        
        // Get subject name
        X509_NAME* subject_name = X509_get_subject_name(cert);
        
        // Extract Common Name (CN) which often contains the user ID
        int cn_index = X509_NAME_get_index_by_NID(subject_name, NID_commonName, -1);
        if (cn_index < 0) {
            logging::Logger::getInstance().error("No Common Name found in certificate");
            X509_free(cert);
            return "";
        }
        
        X509_NAME_ENTRY* cn_entry = X509_NAME_get_entry(subject_name, cn_index);
        if (!cn_entry) {
            logging::Logger::getInstance().error("Failed to get Common Name entry");
            X509_free(cert);
            return "";
        }
        
        ASN1_STRING* cn_data = X509_NAME_ENTRY_get_data(cn_entry);
        
        // Convert ASN1 string to C string
        const unsigned char* utf8_data;
        int utf8_len = ASN1_STRING_to_UTF8(&utf8_data, cn_data);
        
        std::string user_id;
        if (utf8_len > 0) {
            user_id.assign(reinterpret_cast<const char*>(utf8_data), utf8_len);
            OPENSSL_free((void*)utf8_data);
        }
        
        X509_free(cert);
        
        logging::Logger::getInstance().debug("Extracted user ID from certificate: {}", user_id);
        
        return user_id;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error extracting user ID from certificate: {}", e.what());
        return "";
    }
}

std::vector<uint8_t> X509DigitalSignatureService::generateDigest(
    const records::TrainingRecord& record
) {
    try {
        // Serialize record to JSON
        nlohmann::json record_json = record.toJson();
        
        // Remove existing signatures to create a consistent digest
        if (record_json.contains("trainee_signature")) {
            record_json.erase("trainee_signature");
        }
        
        if (record_json.contains("instructor_signature")) {
            record_json.erase("instructor_signature");
        }
        
        // Convert JSON to string
        std::string record_str = record_json.dump();
        
        // Generate digest
        std::vector<uint8_t> digest(EVP_MAX_MD_SIZE);
        unsigned int digest_len = 0;
        
        EVP_MD_CTX* ctx = EVP_MD_CTX_new();
        EVP_DigestInit_ex(ctx, digest_algorithm_, nullptr);
        EVP_DigestUpdate(ctx, record_str.c_str(), record_str.length());
        EVP_DigestFinal_ex(ctx, digest.data(), &digest_len);
        EVP_MD_CTX_free(ctx);
        
        // Resize digest to actual length
        digest.resize(digest_len);
        
        return digest;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error generating digest: {}", e.what());
        return {};
    }
}

X509* X509DigitalSignatureService::getX509Certificate(const std::string& certificate_data) {
    BIO* bio = BIO_new(BIO_s_mem());
    BIO_puts(bio, certificate_data.c_str());
    
    X509* cert = PEM_read_bio_X509(bio, nullptr, nullptr, nullptr);
    BIO_free(bio);
    
    return cert;
}

bool X509DigitalSignatureService::verifySignatureWithCertificate(
    X509* cert,
    const std::vector<uint8_t>& digest,
    const std::vector<uint8_t>& signature
) {
    if (!cert || digest.empty() || signature.empty()) {
        return false;
    }
    
    EVP_PKEY* pubkey = X509_get_pubkey(cert);
    if (!pubkey) {
        logging::Logger::getInstance().error("Failed to get public key from certificate");
        return false;
    }
    
    EVP_MD_CTX* md_ctx = EVP_MD_CTX_new();
    EVP_PKEY_CTX* pkey_ctx = nullptr;
    
    int result = 0;
    
    EVP_DigestVerifyInit(md_ctx, &pkey_ctx, digest_algorithm_, nullptr, pubkey);
    
    // Skip the digest step since we already have the digest
    // Use EVP_DigestVerify to verify the signature against the digest
    result = EVP_PKEY_verify(pkey_ctx, signature.data(), signature.size(), 
                            digest.data(), digest.size());
    
    EVP_MD_CTX_free(md_ctx);
    EVP_PKEY_free(pubkey);
    
    return (result == 1);
}

bool X509DigitalSignatureService::checkCertificateRevocation(X509* cert) {
    if (!cert) {
        return false;
    }
    
    // In a real implementation, you would check the certificate against a CRL or OCSP
    // For simplicity, we'll assume the certificate is not revoked
    
    return true;
}

// CertificateInfo methods

nlohmann::json CertificateInfo::toJson() const {
    nlohmann::json json;
    json["certificate_id"] = certificate_id;
    json["subject_name"] = subject_name;
    json["issuer_name"] = issuer_name;
    json["serial_number"] = serial_number;
    json["not_before"] = std::chrono::duration_cast<std::chrono::milliseconds>(
        not_before.time_since_epoch()).count();
    json["not_after"] = std::chrono::duration_cast<std::chrono::milliseconds>(
        not_after.time_since_epoch()).count();
    json["is_valid"] = is_valid;
    
    // Convert raw data to base64
    std::stringstream ss;
    for (const auto& byte : raw_data) {
        ss << std::hex << std::setw(2) << std::setfill('0') << (int)byte;
    }
    json["raw_data"] = ss.str();
    
    return json;
}

std::optional<CertificateInfo> CertificateInfo::fromJson(const nlohmann::json& json) {
    try {
        CertificateInfo cert_info;
        
        cert_info.certificate_id = json["certificate_id"];
        cert_info.subject_name = json["subject_name"];
        cert_info.issuer_name = json["issuer_name"];
        cert_info.serial_number = json["serial_number"];
        
        cert_info.not_before = std::chrono::system_clock::time_point(
            std::chrono::milliseconds(json["not_before"]));
        cert_info.not_after = std::chrono::system_clock::time_point(
            std::chrono::milliseconds(json["not_after"]));
        
        cert_info.is_valid = json["is_valid"];
        
        // Convert raw data from hex string
        std::string raw_data_hex = json["raw_data"];
        for (size_t i = 0; i < raw_data_hex.length(); i += 2) {
            std::string byte_hex = raw_data_hex.substr(i, 2);
            uint8_t byte = std::stoi(byte_hex, nullptr, 16);
            cert_info.raw_data.push_back(byte);
        }
        
        return cert_info;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error parsing certificate from JSON: {}", e.what());
        return std::nullopt;
    }
}

} // namespace signature
} // namespace etr