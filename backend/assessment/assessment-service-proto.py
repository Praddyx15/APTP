syntax = "proto3";

package assessment;

// Assessment service definition
service AssessmentService {
  // Create a new assessment
  rpc CreateAssessment (Assessment) returns (AssessmentResponse);
  
  // Get an assessment by ID
  rpc GetAssessment (AssessmentRequest) returns (Assessment);
  
  // Update an assessment
  rpc UpdateAssessment (Assessment) returns (AssessmentResponse);
  
  // Delete an assessment
  rpc DeleteAssessment (AssessmentRequest) returns (AssessmentResponse);
  
  // List assessments based on criteria
  rpc ListAssessments (ListAssessmentsRequest) returns (ListAssessmentsResponse);
  
  // Grade assessment
  rpc GradeAssessment (GradeRequest) returns (AssessmentResponse);
  
  // Get all assessments for a trainee
  rpc GetTraineeAssessments (TraineeRequest) returns (ListAssessmentsResponse);
  
  // Get assessment statistics
  rpc GetAssessmentStats (StatsRequest) returns (StatsResponse);
  
  // Start assessment session
  rpc StartAssessmentSession (SessionRequest) returns (SessionResponse);
  
  // End assessment session
  rpc EndAssessmentSession (SessionRequest) returns (SessionResponse);
  
  // Track assessment progress
  rpc TrackProgress (ProgressRequest) returns (ProgressResponse);
  
  // Add comments to assessment
  rpc AddComments (CommentsRequest) returns (AssessmentResponse);
  
  // Add attachment to assessment
  rpc AddAttachment (AttachmentRequest) returns (AttachmentResponse);
  
  // Get attachment from assessment
  rpc GetAttachment (AttachmentRequest) returns (AttachmentData);
}

// Assessment type enum
enum AssessmentType {
  UNKNOWN = 0;
  KNOWLEDGE_TEST = 1;
  PRACTICAL_TEST = 2;
  SIMULATOR_SESSION = 3;
  FLIGHT_SESSION = 4;
  WRITTEN_EXAM = 5;
  ORAL_EXAM = 6;
}

// Status enum
enum AssessmentStatus {
  STATUS_UNKNOWN = 0;
  SCHEDULED = 1;
  IN_PROGRESS = 2;
  COMPLETED = 3;
  GRADED = 4;
  CANCELLED = 5;
}

// Grading scale enum
enum GradingScale {
  SCALE_UNKNOWN = 0;
  SCALE_1_4 = 1;  // 1-4 scale (1=unsatisfactory, 4=excellent)
  SCALE_PERCENTAGE = 2;  // 0-100%
  SCALE_PASS_FAIL = 3;  // Pass/Fail
  SCALE_LETTER = 4;  // A, B, C, D, F
}

// Assessment message
message Assessment {
  string assessment_id = 1;
  string title = 2;
  string description = 3;
  AssessmentType type = 4;
  AssessmentStatus status = 5;
  string trainee_id = 6;
  string instructor_id = 7;
  string course_id = 8;
  string syllabus_id = 9;
  string exercise_id = 10;
  int64 scheduled_time = 11;  // milliseconds since epoch
  int64 actual_start_time = 12;  // milliseconds since epoch
  int64 actual_end_time = 13;  // milliseconds since epoch
  GradingScale grading_scale = 14;
  repeated GradeItem grades = 15;
  bool passed = 16;
  double overall_score = 17;
  string comments = 18;
  repeated string attachments = 19;
  repeated string tags = 20;
  map<string, string> metadata = 21;
  bool is_draft = 22;
  string created_by = 23;
  int64 created_at = 24;  // milliseconds since epoch
  int64 updated_at = 25;  // milliseconds since epoch
}

// Grade item
message GradeItem {
  string criteria_id = 1;
  string criteria_name = 2;
  double score = 3;
  string comments = 4;
  bool is_critical = 5;
  bool satisfactory = 6;
}

// Request to get assessment by ID
message AssessmentRequest {
  string assessment_id = 1;
}

// Response to assessment operations
message AssessmentResponse {
  bool success = 1;
  string assessment_id = 2;
  string error_message = 3;
  int64 timestamp = 4;  // milliseconds since epoch
}

// Request to list assessments
message ListAssessmentsRequest {
  string trainee_id = 1;
  string instructor_id = 2;
  string course_id = 3;
  string syllabus_id = 4;
  AssessmentType type = 5;
  AssessmentStatus status = 6;
  int64 start_date = 7;  // milliseconds since epoch
  int64 end_date = 8;  // milliseconds since epoch
  int32 page = 9;
  int32 page_size = 10;
  string sort_by = 11;
  bool ascending = 12;
  repeated string tags = 13;
}

// Response for list assessments
message ListAssessmentsResponse {
  bool success = 1;
  repeated Assessment assessments = 2;
  int32 total_count = 3;
  int32 page = 4;
  int32 page_size = 5;
  string error_message = 6;
}

// Request to grade assessment
message GradeRequest {
  string assessment_id = 1;
  string instructor_id = 2;
  repeated GradeItem grades = 3;
  double overall_score = 4;
  bool passed = 5;
  string comments = 6;
}

// Request to get trainee assessments
message TraineeRequest {
  string trainee_id = 1;
  string course_id = 2;
  AssessmentType type = 3;
  AssessmentStatus status = 4;
  int64 start_date = 5;  // milliseconds since epoch
  int64 end_date = 6;  // milliseconds since epoch
}

// Request to get assessment statistics
message StatsRequest {
  string trainee_id = 1;
  string course_id = 2;
  string instructor_id = 3;
  string syllabus_id = 4;
  AssessmentType type = 5;
  int64 start_date = 6;  // milliseconds since epoch
  int64 end_date = 7;  // milliseconds since epoch
}

// Response for assessment statistics
message StatsResponse {
  bool success = 1;
  int32 total_assessments = 2;
  int32 passed_assessments = 3;
  int32 failed_assessments = 4;
  double average_score = 5;
  repeated CriteriaStats criteria_stats = 6;
  string error_message = 7;
}

// Statistics for criteria
message CriteriaStats {
  string criteria_id = 1;
  string criteria_name = 2;
  double average_score = 3;
  int32 count = 4;
  map<string, double> score_distribution = 5;
}

// Request to start/end assessment session
message SessionRequest {
  string assessment_id = 1;
  string user_id = 2;
  map<string, string> session_data = 3;
}

// Response for session operations
message SessionResponse {
  bool success = 1;
  string assessment_id = 2;
  string session_id = 3;
  int64 timestamp = 4;  // milliseconds since epoch
  string error_message = 5;
}

// Request to track assessment progress
message ProgressRequest {
  string assessment_id = 1;
  string user_id = 2;
  double progress_percentage = 3;
  string current_section = 4;
  map<string, string> progress_data = 5;
}

// Response for progress tracking
message ProgressResponse {
  bool success = 1;
  string assessment_id = 2;
  double progress_percentage = 3;
  int64 estimated_completion_time = 4;  // milliseconds since epoch
  string error_message = 5;
}

// Request to add comments
message CommentsRequest {
  string assessment_id = 1;
  string user_id = 2;
  string comments = 3;
  bool append = 4;  // If true, append to existing comments, otherwise replace
}

// Request to add/get attachment
message AttachmentRequest {
  string assessment_id = 1;
  string attachment_name = 2;
  string content_type = 3;
  bytes data = 4;  // Only for AddAttachment
}

// Response for attachment operations
message AttachmentResponse {
  bool success = 1;
  string assessment_id = 2;
  string attachment_path = 3;
  string error_message = 4;
}

// Attachment data response
message AttachmentData {
  bool success = 1;
  string assessment_id = 2;
  string attachment_name = 3;
  string content_type = 4;
  bytes data = 5;
  string error_message = 6;
}