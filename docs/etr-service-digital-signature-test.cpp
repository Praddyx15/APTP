#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include "signature/digital_signature.h"
#include "records/record_model.h"
#include <filesystem>
#include <fstream>
#include <openssl/pem.h>
#include <openssl/rsa.h>
#include <openssl/evp.h>

using namespace etr::signature;
using namespace etr::records;
using namespace testing;

// Mock certificate repository
class MockCertificateRepository : public ICertificateRepository {
public:
    MOCK_METHOD(bool, storeCertificate, (const CertificateInfo&), (override));
    MOCK_METHOD(std::optional<CertificateInfo>, getCertificate, (const std::string&), (override));
    MOCK_METHOD(std::vector<CertificateInfo>, getCertificatesByUserId, (const std::string&), (override));
    MOCK_METHOD(bool, revokeCertificate, (const std::string&, const std::string&), (override));
    MOCK_METHOD(bool, isCertificateRevoked, (const std::string&), (override));
    MOCK_METHOD(std::vector<std::pair<std::string, std::string>>, getCertificateRevocationList, (), (override));
};

class DigitalSignatureTest : public Test {
protected:
    void SetUp() override {
        // Create temporary directory for test certificates
        test_dir_ = std::filesystem::temp_directory_path() / "etr_test_certs";
        std::filesystem::create_directories(test_dir_);
        
        // Generate test certificates
        generateTestCertificates();
        
        // Create mock repository
        mock_repository_ = std::make_shared<MockCertificateRepository>();
        
        // Create signature service
        signature_service_ = std::make_unique<X509DigitalSignatureService>(
            (test_dir_ / "ca_cert.pem").string(),
            ""
        );
    }
    
    void TearDown() override {
        // Clean up test directory
        std::filesystem::remove_all(test_dir_);
    }
    
    // Helper to generate test certificates
    void generateTestCertificates() {
        // Generate CA key and certificate
        EVP_PKEY* ca_key = generateRSAKey();
        X509* ca_cert = generateCertificate(ca_key, nullptr, "CN=Test CA,O=ETR Test,C=US", true);
        
        // Generate user key and certificate
        EVP_PKEY* user_key = generateRSAKey();
        X509* user_cert = generateCertificate(user_key, ca_key, "CN=test-user,O=ETR Test,C=US", false);
        
        // Save CA certificate
        saveCertificate(ca_cert, (test_dir_ / "ca_cert.pem").string());
        
        // Save user certificate and private key
        saveCertificate(user_cert, (test_dir_ / "user_cert.pem").string());
        savePrivateKey(user_key, (test_dir_ / "user_key.pem").string());
        
        // Clean up
        EVP_PKEY_free(ca_key);
        X509_free(ca_cert);
        EVP_PKEY_free(user_key);
        X509_free(user_cert);
    }
    
    // Helper to generate RSA key
    EVP_PKEY* generateRSAKey() {
        EVP_PKEY* key = EVP_PKEY_new();
        RSA* rsa = RSA_generate_key(2048, RSA_F4, nullptr, nullptr);
        EVP_PKEY_assign_RSA(key, rsa);
        return key;
    }
    
    // Helper to generate certificate
    X509* generateCertificate(EVP_PKEY* key, EVP_PKEY* issuer_key, const std::string& subject, bool is_ca) {
        X509* cert = X509_new();
        
        // Set version
        X509_set_version(cert, 2);  // X509v3
        
        // Set serial number
        ASN1_INTEGER_set(X509_get_serialNumber(cert), 1);
        
        // Set validity
        X509_gmtime_adj(X509_get_notBefore(cert), 0);
        X509_gmtime_adj(X509_get_notAfter(cert), 31536000L);  // 1 year
        
        // Set subject
        X509_NAME* name = X509_get_subject_name(cert);
        
        // Parse subject string
        std::istringstream subject_stream(subject);
        std::string token;
        while (std::getline(subject_stream, token, ',')) {
            size_t pos = token.find('=');
            if (pos != std::string::npos) {
                std::string field = token.substr(0, pos);
                std::string value = token.substr(pos + 1);
                
                if (field == "CN") {
                    X509_NAME_add_entry_by_txt(name, "commonName", MBSTRING_ASC, 
                        reinterpret_cast<const unsigned char*>(value.c_str()), -1, -1, 0);
                } else if (field == "O") {
                    X509_NAME_add_entry_by_txt(name, "organizationName", MBSTRING_ASC, 
                        reinterpret_cast<const unsigned char*>(value.c_str()), -1, -1, 0);
                } else if (field == "C") {
                    X509_NAME_add_entry_by_txt(name, "countryName", MBSTRING_ASC, 
                        reinterpret_cast<const unsigned char*>(value.c_str()), -1, -1, 0);
                }
            }
        }
        
        // Set issuer
        if (issuer_key) {
            // Signed by issuer
            X509* issuer_cert = X509_new();
            X509_NAME* issuer_name = X509_get_subject_name(issuer_cert);
            X509_NAME_add_entry_by_txt(issuer_name, "commonName", MBSTRING_ASC, 
                reinterpret_cast<const unsigned char*>("Test CA"), -1, -1, 0);
            X509_set_issuer_name(cert, issuer_name);
            X509_free(issuer_cert);
        } else {
            // Self-signed
            X509_set_issuer_name(cert, name);
        }
        
        // Set public key
        X509_set_pubkey(cert, key);
        
        // Set CA extension if needed
        if (is_ca) {
            X509_EXTENSION* ext = X509V3_EXT_conf_nid(nullptr, nullptr, NID_basic_constraints, "critical,CA:TRUE");
            X509_add_ext(cert, ext, -1);
            X509_EXTENSION_free(ext);
        }
        
        // Sign the certificate
        if (issuer_key) {
            X509_sign(cert, issuer_key, EVP_sha256());
        } else {
            X509_sign(cert, key, EVP_sha256());
        }
        
        return cert;
    }
    
    // Helper to save certificate to file
    void saveCertificate(X509* cert, const std::string& filename) {
        FILE* file = fopen(filename.c_str(), "w");
        if (file) {
            PEM_write_X509(file, cert);
            fclose(file);
        }
    }
    
    // Helper to save private key to file
    void savePrivateKey(EVP_PKEY* key, const std::string& filename) {
        FILE* file = fopen(filename.c_str(), "w");
        if (file) {
            PEM_write_PrivateKey(file, key, nullptr, nullptr, 0, nullptr, nullptr);
            fclose(file);
        }
    }
    
    // Helper to read file content
    std::string readFile(const std::string& filename) {
        std::ifstream file(filename);
        std::stringstream buffer;
        buffer << file.rdbuf();
        return buffer.str();
    }
    
    // Helper to create a valid record for testing
    TrainingRecord createValidRecord() {
        TrainingRecord record("test-record-id");
        record.setTraineeId("test-user");
        record.setInstructorId("test-instructor");
        record.setRecordType(RecordType::TRAINING_SESSION);
        record.setCourseId("test-course");
        record.setSyllabusId("test-syllabus");
        record.setExerciseId("test-exercise");
        record.setDate(std::chrono::system_clock::now());
        record.setDurationMinutes(60);
        record.setLocation("Test Location");
        
        GradeItem grade;
        grade.criteria_id = "test-criteria";
        grade.criteria_name = "Test Criteria";
        grade.grade = 3;
        grade.comments = "Good performance";
        record.addGrade(grade);
        
        record.setComments("Test comments");
        record.setDraft(true);
        
        return record;
    }
    
    // Helper to create a signature
    std::vector<uint8_t> createSignature(const std::string& private_key_path, const std::vector<uint8_t>& digest) {
        // Load private key
        FILE* key_file = fopen(private_key_path.c_str(), "r");
        if (!key_file) {
            return {};
        }
        
        EVP_PKEY* pkey = PEM_read_PrivateKey(key_file, nullptr, nullptr, nullptr);
        fclose(key_file);
        
        if (!pkey) {
            return {};
        }
        
        // Create signature
        EVP_MD_CTX* md_ctx = EVP_MD_CTX_new();
        EVP_PKEY_CTX* pkey_ctx = nullptr;
        std::vector<uint8_t> signature(EVP_PKEY_size(pkey));
        size_t sig_len = signature.size();
        
        EVP_DigestSignInit(md_ctx, &pkey_ctx, EVP_sha256(), nullptr, pkey);
        EVP_DigestSignUpdate(md_ctx, digest.data(), digest.size());
        EVP_DigestSignFinal(md_ctx, signature.data(), &sig_len);
        
        EVP_MD_CTX_free(md_ctx);
        EVP_PKEY_free(pkey);
        
        signature.resize(sig_len);
        return signature;
    }
    
    std::filesystem::path test_dir_;
    std::shared_ptr<MockCertificateRepository> mock_repository_;
    std::unique_ptr<X509DigitalSignatureService> signature_service_;
};

TEST_F(DigitalSignatureTest, ParseCertificate) {
    // Read test certificate
    std::string cert_data = readFile((test_dir_ / "user_cert.pem").string());
    
    // Parse certificate
    auto cert_info = signature_service_->parseCertificate(cert_data);
    
    // Verify result
    ASSERT_TRUE(cert_info.has_value());
    EXPECT_EQ(cert_info->subject_name, "/CN=test-user/O=ETR Test/C=US");
    EXPECT_EQ(cert_info->issuer_name, "/CN=Test CA/O=ETR Test/C=US");
    EXPECT_FALSE(cert_info->certificate_id.empty());
}

TEST_F(DigitalSignatureTest, ValidateCertificate) {
    // Read test certificate
    std::string cert_data = readFile((test_dir_ / "user_cert.pem").string());
    
    // Validate certificate
    bool result = signature_service_->validateCertificate(cert_data);
    
    // Verify result
    EXPECT_TRUE(result);
}

TEST_F(DigitalSignatureTest, ExtractUserIdFromCertificate) {
    // Read test certificate
    std::string cert_data = readFile((test_dir_ / "user_cert.pem").string());
    
    // Extract user ID
    std::string user_id = signature_service_->extractUserIdFromCertificate(cert_data);
    
    // Verify result
    EXPECT_EQ(user_id, "test-user");
}

TEST_F(DigitalSignatureTest, SignRecord) {
    // Create test record
    auto record = createValidRecord();
    
    // Read test certificate
    std::string cert_data = readFile((test_dir_ / "user_cert.pem").string());
    
    // Generate digest
    std::vector<uint8_t> digest = signature_service_->generateDigest(record);
    
    // Create signature
    std::vector<uint8_t> signature = createSignature((test_dir_ / "user_key.pem").string(), digest);
    
    // Sign record
    auto result = signature_service_->signRecord(
        record,
        "test-user",
        cert_data,
        signature,
        false  // Trainee signature
    );
    
    // Verify result
    ASSERT_TRUE(result.has_value());
    EXPECT_TRUE(result->is_valid);
    EXPECT_EQ(result->signer_id, "test-user");
    
    // Verify record has signature
    ASSERT_TRUE(record.getTraineeSignature().has_value());
    EXPECT_EQ(record.getTraineeSignature()->signer_id, "test-user");
    EXPECT_TRUE(record.getTraineeSignature()->is_valid);
}

TEST_F(DigitalSignatureTest, VerifySignature) {
    // Create test record
    auto record = createValidRecord();
    
    // Read test certificate
    std::string cert_data = readFile((test_dir_ / "user_cert.pem").string());
    
    // Generate digest
    std::vector<uint8_t> digest = signature_service_->generateDigest(record);
    
    // Create signature
    std::vector<uint8_t> signature = createSignature((test_dir_ / "user_key.pem").string(), digest);
    
    // Sign record
    auto sign_result = signature_service_->signRecord(
        record,
        "test-user",
        cert_data,
        signature,
        false  // Trainee signature
    );
    
    ASSERT_TRUE(sign_result.has_value());
    
    // Verify signature
    auto verify_result = signature_service_->verifySignature(record, "test-user");
    
    // Verify result
    ASSERT_TRUE(verify_result.has_value());
    EXPECT_TRUE(verify_result->first);  // Signature is valid
    EXPECT_EQ(verify_result->second.signer_id, "test-user");
}

TEST_F(DigitalSignatureTest, GenerateDigest) {
    // Create test record
    auto record = createValidRecord();
    
    // Generate digest
    std::vector<uint8_t> digest = signature_service_->generateDigest(record);
    
    // Verify digest is not empty
    EXPECT_FALSE(digest.empty());
    
    // Modify record
    record.setComments("Modified comments");
    
    // Generate new digest
    std::vector<uint8_t> new_digest = signature_service_->generateDigest(record);
    
    // Verify digests are different
    EXPECT_NE(digest, new_digest);
}

int main(int argc, char** argv) {
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}