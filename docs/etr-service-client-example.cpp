#include <iostream>
#include <memory>
#include <string>
#include <grpcpp/grpcpp.h>
#include "etr_service.grpc.pb.h"

// Helper function to print record details
void printRecord(const etr::TrainingRecord& record) {
    std::cout << "Record ID: " << record.record_id() << std::endl;
    std::cout << "Trainee: " << record.trainee_id() << std::endl;
    std::cout << "Instructor: " << record.instructor_id() << std::endl;
    std::cout << "Type: " << record.record_type() << std::endl;
    std::cout << "Course: " << record.course_id() << std::endl;
    std::cout << "Syllabus: " << record.syllabus_id() << std::endl;
    std::cout << "Exercise: " << record.exercise_id() << std::endl;
    std::cout << "Date: " << record.date() << std::endl;
    std::cout << "Duration: " << record.duration_minutes() << " minutes" << std::endl;
    std::cout << "Location: " << record.location() << std::endl;
    
    std::cout << "Grades:" << std::endl;
    for (const auto& grade : record.grades()) {
        std::cout << "  - " << grade.criteria_name() << ": " << grade.grade() 
                  << " (" << grade.comments() << ")" << std::endl;
    }
    
    std::cout << "Comments: " << record.comments() << std::endl;
    std::cout << "Draft: " << (record.is_draft() ? "Yes" : "No") << std::endl;
    
    if (record.has_trainee_signature()) {
        std::cout << "Signed by trainee: " << record.trainee_signature().signer_name() << std::endl;
    }
    
    if (record.has_instructor_signature()) {
        std::cout << "Signed by instructor: " << record.instructor_signature().signer_name() << std::endl;
    }
    
    std::cout << std::endl;
}

int main(int argc, char** argv) {
    // Parse command line arguments
    std::string server_address = "localhost:50053";
    if (argc > 1) {
        server_address = argv[1];
    }
    
    // Set up credentials
    std::shared_ptr<grpc::ChannelCredentials> creds = grpc::InsecureChannelCredentials();
    
    // Create channel
    std::shared_ptr<grpc::Channel> channel = grpc::CreateChannel(server_address, creds);
    
    // Create stub
    std::unique_ptr<etr::ElectronicTrainingRecordsService::Stub> stub = 
        etr::ElectronicTrainingRecordsService::NewStub(channel);
    
    // Setup call credentials (JWT token)
    std::string jwt_token = "your_jwt_token_here"; // Replace with actual token
    
    grpc::ClientContext context;
    context.AddMetadata("authorization", "Bearer " + jwt_token);
    
    // Example 1: Create a training record
    {
        etr::TrainingRecord record;
        record.set_trainee_id("trainee123");
        record.set_instructor_id("instructor456");
        record.set_record_type(etr::RecordType::TRAINING_SESSION);
        record.set_course_id("course789");
        record.set_syllabus_id("syllabus101");
        record.set_exercise_id("exercise202");
        record.set_date(std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch()
        ).count());
        record.set_duration_minutes(60);
        record.set_location("Simulator Room A");
        record.set_aircraft_type("B737-800");
        
        // Add grades
        auto grade1 = record.add_grades();
        grade1->set_criteria_id("criteria1");
        grade1->set_criteria_name("Procedural Knowledge");
        grade1->set_grade(3);
        grade1->set_comments("Good knowledge of procedures");
        
        auto grade2 = record.add_grades();
        grade2->set_criteria_id("criteria2");
        grade2->set_criteria_name("Communication");
        grade2->set_grade(4);
        grade2->set_comments("Excellent communication skills");
        
        record.set_comments("Overall good performance");
        record.set_is_draft(true);
        
        // Create client context
        grpc::ClientContext create_context;
        create_context.AddMetadata("authorization", "Bearer " + jwt_token);
        
        // Call the CreateTrainingRecord method
        etr::RecordResponse response;
        grpc::Status status = stub->CreateTrainingRecord(&create_context, record, &response);
        
        if (status.ok()) {
            std::cout << "Successfully created record: " << response.record_id() << std::endl;
            
            // Save the record ID for later use
            std::string record_id = response.record_id();
            
            // Example 2: Get the record we just created
            {
                grpc::ClientContext get_context;
                get_context.AddMetadata("authorization", "Bearer " + jwt_token);
                
                etr::RecordRequest request;
                request.set_record_id(record_id);
                
                etr::TrainingRecord get_response;
                grpc::Status get_status = stub->GetTrainingRecord(&get_context, request, &get_response);
                
                if (get_status.ok()) {
                    std::cout << "Retrieved record:" << std::endl;
                    printRecord(get_response);
                } else {
                    std::cerr << "Error getting record: " << get_status.error_message() << std::endl;
                }
            }
            
            // Example 3: Update the record
            {
                grpc::ClientContext update_context;
                update_context.AddMetadata("authorization", "Bearer " + jwt_token);
                
                // Get record again for update
                grpc::ClientContext get_context;
                get_context.AddMetadata("authorization", "Bearer " + jwt_token);
                
                etr::RecordRequest get_request;
                get_request.set_record_id(record_id);
                
                etr::TrainingRecord record_to_update;
                grpc::Status get_status = stub->GetTrainingRecord(&get_context, get_request, &record_to_update);
                
                if (get_status.ok()) {
                    // Update the record
                    record_to_update.set_comments("Updated comments: performance needs improvement in some areas");
                    
                    // Add another grade
                    auto grade3 = record_to_update.add_grades();
                    grade3->set_criteria_id("criteria3");
                    grade3->set_criteria_name("Situational Awareness");
                    grade3->set_grade(2);
                    grade3->set_comments("Needs improvement in maintaining situational awareness");
                    
                    // Submit update
                    etr::RecordResponse update_response;
                    grpc::Status update_status = stub->UpdateTrainingRecord(&update_context, record_to_update, &update_response);
                    
                    if (update_status.ok()) {
                        std::cout << "Successfully updated record: " << update_response.record_id() << std::endl;
                    } else {
                        std::cerr << "Error updating record: " << update_status.error_message() << std::endl;
                    }
                } else {
                    std::cerr << "Error getting record for update: " << get_status.error_message() << std::endl;
                }
            }
            
            // Example 4: Sign the record as instructor
            {
                grpc::ClientContext sign_context;
                sign_context.AddMetadata("authorization", "Bearer " + jwt_token);
                
                etr::SignatureRequest sign_request;
                sign_request.set_record_id(record_id);
                sign_request.set_signer_id("instructor456");
                sign_request.set_is_instructor(true);
                
                // In a real scenario, this would be a digital signature
                std::vector<uint8_t> dummy_signature(32, 0);
                sign_request.set_signature_data(dummy_signature.data(), dummy_signature.size());
                
                etr::SignatureResponse sign_response;
                grpc::Status sign_status = stub->SignRecord(&sign_context, sign_request, &sign_response);
                
                if (sign_status.ok()) {
                    std::cout << "Successfully signed record as instructor" << std::endl;
                } else {
                    std::cerr << "Error signing record: " << sign_status.error_message() << std::endl;
                }
            }
            
            // Example 5: List all records for the trainee
            {
                grpc::ClientContext list_context;
                list_context.AddMetadata("authorization", "Bearer " + jwt_token);
                
                etr::ListRecordsRequest list_request;
                list_request.set_trainee_id("trainee123");
                list_request.set_page(1);
                list_request.set_page_size(10);
                list_request.set_sort_by("date");
                list_request.set_ascending(false);
                
                etr::ListRecordsResponse list_response;
                grpc::Status list_status = stub->ListTrainingRecords(&list_context, list_request, &list_response);
                
                if (list_status.ok()) {
                    std::cout << "Found " << list_response.records_size() << " records (total: " 
                              << list_response.total_count() << ")" << std::endl;
                    
                    for (int i = 0; i < list_response.records_size(); ++i) {
                        std::cout << "Record " << (i+1) << ":" << std::endl;
                        printRecord(list_response.records(i));
                    }
                } else {
                    std::cerr << "Error listing records: " << list_status.error_message() << std::endl;
                }
            }
            
            // Example 6: Check compliance for the trainee
            {
                grpc::ClientContext compliance_context;
                compliance_context.AddMetadata("authorization", "Bearer " + jwt_token);
                
                etr::ComplianceRequest compliance_request;
                compliance_request.set_trainee_id("trainee123");
                compliance_request.set_regulation_id("FAA-61");
                compliance_request.set_certification_type("CPL");
                
                etr::ComplianceResponse compliance_response;
                grpc::Status compliance_status = stub->CheckCompliance(&compliance_context, compliance_request, &compliance_response);
                
                if (compliance_status.ok()) {
                    std::cout << "Compliance status: " << (compliance_response.is_compliant() ? "Compliant" : "Not Compliant") << std::endl;
                    
                    std::cout << "Compliance items:" << std::endl;
                    for (const auto& item : compliance_response.compliance_items()) {
                        std::cout << "  - " << item.requirement_name() << ": " 
                                  << (item.is_satisfied() ? "Satisfied" : "Not Satisfied")
                                  << " (" << item.completed_count() << "/" << item.required_count() << ")" << std::endl;
                    }
                } else {
                    std::cerr << "Error checking compliance: " << compliance_status.error_message() << std::endl;
                }
            }
            
        } else {
            std::cerr << "Error creating record: " << status.error_message() << std::endl;
        }
    }
    
    return 0;
}