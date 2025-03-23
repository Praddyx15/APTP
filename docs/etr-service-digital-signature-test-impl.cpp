#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include <openssl/pem.h>
#include <openssl/x509.h>
#include <openssl/evp.h>

#include "signature/digital_signature.h"
#include "records/record_model.h"

using namespace etr::signature;
using namespace testing;

// Helper to generate a test certificate
std::string generateTestCertificate(const std::string& common_name) {
    X509* cert = X509_new();
    EVP_PKEY* pkey = EVP_PKEY_new();
    RSA* rsa = RSA_new();
    BIGNUM* bn = BN_new();
    BN_set_word(bn, RSA_F4);
    RSA_generate_key_ex(rsa, 2048, bn, nullptr);
    EVP_PKEY_assign_RSA(pkey, rsa);

    X509_set_version(cert, 2);
    ASN1_INTEGER_set(X509_get_serialNumber(cert), 1);
    X509_gmtime_adj(X509_get_notBefore(cert), 0);
    X509_gmtime_adj(X509_get_notAfter(cert), 60 * 60 * 24 * 365);
    X509_set_pubkey(cert, pkey);

    X509_NAME* name = X509_get_subject_name(cert);
    X509_NAME_add_entry_by_txt(name, "CN", MBSTRING_ASC, 
        reinterpret_cast<const unsigned char*>(common_name.c_str()), -1, -1, 0);
    X509_set_issuer_name(cert, name);

    X509_sign(cert, pkey, EVP_sha256());

    BIO* bio = BIO_new(BIO_s_mem());
    PEM_write_bio_X509(bio, cert);
    char* pem_data;
    long pem_size = BIO_get_mem_data(bio, &pem_data);
    std::string cert_pem(pem_data, pem_size);

    BIO_free(bio);
    X509_free(cert);
    EVP_PKEY_free(pkey);
    BN_free(bn);

    return cert_pem;
}

// Helper to sign data with a key
std::vector<uint8_t> signData(const std::vector<uint8_t>& data, EVP_PKEY* pkey) {
    EVP_MD_CTX* md_ctx = EVP_MD_CTX_new();
    EVP_SignInit(md_ctx, EVP_sha256());
    EVP_SignUpdate(md_ctx, data.data(), data.size());
    
    unsigned int sig_len = 0;
    EVP_SignFinal(md_ctx, nullptr, &sig_len, pkey);
    
    std::vector<uint8_t> signature(sig_len);
    EVP_SignFinal(md_ctx, signature.data(), &sig_len, pkey);
    EVP_MD_CTX_free(md_ctx);
    
    return signature;
}

class DigitalSignatureTest : public Test {
protected:
    void SetUp() override {
        // Initialize OpenSSL
        OpenSSL_add_all_algorithms();
        ERR_load_crypto_strings();
        
        // Create service
        signature_service_ = std::make_unique<X509DigitalSignatureService>();
        
        // Generate test certificates
        trainee_cert_ = generateTestCertificate("trainee123");
        instructor_cert_ = generateTestCertificate("instructor456");
        
        // Create test record
        test_record_ = etr::records::TrainingRecord("test-record-id");
        test_record_.setTraineeId("trainee123");
        test_record_.setInstructorId("instructor456");
        test_record_.setRecordType(etr::records::RecordType::TRAINING_SESSION);
        test_record_.setCourseId("test-course");
        test_record_.setSyllabusId("test-syllabus");
        test_record_.setExerciseId("test-exercise");
        test_record_.setDate(std::chrono::system_clock::now());
        test_record_.setDurationMinutes(60);
        test_record_.setLocation("Test Location");
        test_record_.setComments("Test comments");
        
        etr::records::GradeItem grade;
        grade.criteria_id = "test-criteria";
        grade.criteria_name = "Test Criteria";
        grade.grade = 3;
        grade.comments = "Good performance";
        test_record_.addGrade(grade);
    }
    
    void TearDown() override {
        // Cleanup OpenSSL
        EVP_cleanup();
        ERR_free_strings();
    }
    
    std::unique_ptr<X509DigitalSignatureService> signature_service_;
    std::string trainee_cert_;
    std::string instructor_cert_;
    etr::records::TrainingRecord test_record_;
};

TEST_F(DigitalSignatureTest, ParseCertificate) {
    auto cert_info = signature_service_->parseCertificate(trainee_cert_);
    
    ASSERT_TRUE(cert_info.has_value());
    EXPECT_EQ(cert_info->subject_name, "/CN=trainee123");
    EXPECT_FALSE(cert_info->certificate_id.empty());
    EXPECT_TRUE(cert_info->is_valid);
}

TEST_F(DigitalSignatureTest, ExtractUserIdFromCertificate) {
    std::string user_id = signature_service_->extractUserIdFromCertificate(trainee_cert_);
    
    EXPECT_EQ(user_id, "trainee123");
}

TEST_F(DigitalSignatureTest, GenerateDigest) {
    std::vector<uint8_t> digest = signature_service_->generateDigest(test_record_);
    
    EXPECT_FALSE(digest.empty());
    
    // Changing the record should change the digest
    etr::records::TrainingRecord modified_record = test_record_;
    modified_record.setComments("Modified comments");
    
    std::vector<uint8_t> modified_digest = signature_service_->generateDigest(modified_record);
    
    EXPECT_NE(digest, modified_digest);
}

TEST_F(DigitalSignatureTest, SignRecord) {
    // Create a dummy signature
    std::vector<uint8_t> dummy_signature(32, 0);
    
    // Sign record as trainee
    auto trainee_signature = signature_service_->signRecord(
        test_record_, 
        "trainee123", 
        trainee_cert_, 
        dummy_signature, 
        false
    );
    
    ASSERT_TRUE(trainee_signature.has_value());
    EXPECT_EQ(trainee_signature->signer_id, "trainee123");
    EXPECT_TRUE(test_record_.isSignedByTrainee());
    
    // Sign record as instructor
    auto instructor_signature = signature_service_->signRecord(
        test_record_, 
        "instructor456", 
        instructor_cert_, 
        dummy_signature, 
        true
    );
    
    ASSERT_TRUE(instructor_signature.has_value());
    EXPECT_EQ(instructor_signature->signer_id, "instructor456");
    EXPECT_TRUE(test_record_.isSignedByInstructor());
    
    // Record should be fully signed
    EXPECT_TRUE(test_record_.isFullySigned());
}

TEST_F(DigitalSignatureTest, VerifySignature) {
    // Create a dummy signature
    std::vector<uint8_t> dummy_signature(32, 0);
    
    // Sign record as trainee
    auto trainee_signature = signature_service_->signRecord(
        test_record_, 
        "trainee123", 
        trainee_cert_, 
        dummy_signature, 
        false
    );
    
    ASSERT_TRUE(trainee_signature.has_value());
    
    // Verify trainee signature
    auto verify_result = signature_service_->verifySignature(
        test_record_, 
        "trainee123"
    );
    
    ASSERT_TRUE(verify_result.has_value());
    EXPECT_TRUE(verify_result->first);
    EXPECT_EQ(verify_result->second.signer_id, "trainee123");
}

int main(int argc, char** argv) {
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}