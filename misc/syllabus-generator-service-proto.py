syntax = "proto3";

package syllabusgen;

// Service definition for syllabus generator
service SyllabusGeneratorService {
  // Generate a syllabus from documents
  rpc GenerateSyllabus (GenerateSyllabusRequest) returns (SyllabusResponse);
  
  // Extract training content from documents
  rpc ExtractTrainingContent (ExtractContentRequest) returns (ContentResponse);
  
  // Generate syllabus structure
  rpc GenerateSyllabusStructure (StructureRequest) returns (StructureResponse);
  
  // Validate syllabus against regulatory requirements
  rpc ValidateSyllabusCompliance (ValidationRequest) returns (ValidationResponse);
  
  // Manage syllabus templates
  rpc CreateTemplate (TemplateRequest) returns (TemplateResponse);
  rpc GetTemplate (GetTemplateRequest) returns (TemplateResponse);
  rpc UpdateTemplate (TemplateRequest) returns (TemplateResponse);
  rpc DeleteTemplate (DeleteTemplateRequest) returns (DeleteTemplateResponse);
  rpc ListTemplates (ListTemplatesRequest) returns (ListTemplatesResponse);
  
  // Analyze compliance impact of modifications
  rpc AnalyzeComplianceImpact (ImpactAnalysisRequest) returns (ImpactAnalysisResponse);
}

// Request to generate a syllabus
message GenerateSyllabusRequest {
  string course_id = 1;
  string title = 2;
  string description = 3;
  string author_id = 4;
  repeated string document_ids = 5;
  string template_id = 6;
  string regulation_id = 7;
  map<string, string> metadata = 8;
}

// Response containing generated syllabus
message SyllabusResponse {
  bool success = 1;
  string syllabus_id = 2;
  string error_message = 3;
  string syllabus_json = 4;
  repeated string warnings = 5;
}

// Request to extract training content
message ExtractContentRequest {
  repeated string document_ids = 1;
  repeated string content_types = 2;  // "objectives", "procedures", "references", etc.
}

// Response with extracted content
message ContentResponse {
  bool success = 1;
  repeated ContentItem items = 2;
  string error_message = 3;
  map<string, double> confidence_scores = 4;
}

// Content item extracted from documents
message ContentItem {
  string content_id = 1;
  string content_type = 2;  // "objective", "procedure", "reference", etc.
  string text = 3;
  string source_document_id = 4;
  int32 page_number = 5;
  double confidence_score = 6;
  repeated string keywords = 7;
  string parent_id = 8;  // For hierarchical content
  int32 sequence_number = 9;
  map<string, string> metadata = 10;
}

// Request to generate syllabus structure
message StructureRequest {
  repeated ContentItem content_items = 1;
  string template_id = 2;
  string regulation_id = 3;
}

// Response with syllabus structure
message StructureResponse {
  bool success = 1;
  repeated StructureSection sections = 2;
  string error_message = 3;
}

// Syllabus structure section
message StructureSection {
  string section_id = 1;
  string title = 2;
  string description = 3;
  int32 order = 4;
  repeated StructureExercise exercises = 5;
  map<string, string> metadata = 6;
}

// Syllabus structure exercise
message StructureExercise {
  string exercise_id = 1;
  string title = 2;
  string description = 3;
  int32 order = 4;
  int32 duration_minutes = 5;
  string exercise_type = 6;  // "ground", "simulator", "flight", etc.
  repeated string objectives = 7;
  repeated string references = 8;
  repeated string equipment = 9;
  repeated GradingCriteria grading_criteria = 10;
  repeated string prerequisite_exercises = 11;
  map<string, string> metadata = 12;
}

// Grading criteria
message GradingCriteria {
  string criteria_id = 1;
  string name = 2;
  string description = 3;
  repeated GradeDefinition grade_definitions = 4;
  bool is_required = 5;
  map<string, string> regulation_references = 6;
}

// Grade definition
message GradeDefinition {
  int32 grade = 1;  // 1-4 scale
  string description = 2;
  bool is_passing = 3;
}

// Request to validate syllabus compliance
message ValidationRequest {
  string syllabus_json = 1;
  string regulation_id = 2;
}

// Response with validation results
message ValidationResponse {
  bool is_compliant = 1;
  repeated ComplianceIssue issues = 2;
  double compliance_percentage = 3;
  repeated RegulatoryRequirement covered_requirements = 4;
  repeated RegulatoryRequirement missing_requirements = 5;
}

// Compliance issue
message ComplianceIssue {
  string issue_id = 1;
  string requirement_id = 2;
  string requirement_name = 3;
  string element_id = 4;
  string element_type = 5;  // "section", "exercise", "criteria", etc.
  string severity = 6;  // "critical", "warning", "info"
  string description = 7;
  string suggested_fix = 8;
}

// Regulatory requirement
message RegulatoryRequirement {
  string requirement_id = 1;
  string name = 2;
  string regulation_id = 3;
  string reference = 4;
  string description = 5;
}

// Request to create/update template
message TemplateRequest {
  string template_id = 1;  // Optional for creation
  string name = 2;
  string description = 3;
  string author_id = 4;
  SyllabusTemplate template = 5;
}

// Response with template
message TemplateResponse {
  bool success = 1;
  string template_id = 2;
  string error_message = 3;
  SyllabusTemplate template = 4;
}

// Request to get template
message GetTemplateRequest {
  string template_id = 1;
}

// Request to delete template
message DeleteTemplateRequest {
  string template_id = 1;
}

// Response to delete template
message DeleteTemplateResponse {
  bool success = 1;
  string error_message = 2;
}

// Request to list templates
message ListTemplatesRequest {
  string author_id = 1;  // Optional
  int32 page = 2;
  int32 page_size = 3;
}

// Response with template list
message ListTemplatesResponse {
  bool success = 1;
  repeated TemplateSummary templates = 2;
  int32 total_count = 3;
  string error_message = 4;
}

// Template summary
message TemplateSummary {
  string template_id = 1;
  string name = 2;
  string description = 3;
  string author_id = 4;
  int64 created_at = 5;  // Milliseconds since epoch
  int64 updated_at = 6;  // Milliseconds since epoch
}

// Syllabus template
message SyllabusTemplate {
  string template_id = 1;
  string name = 2;
  string description = 3;
  string author_id = 4;
  repeated TemplateSectionSchema sections = 5;
  map<string, string> metadata = 6;
  int64 created_at = 7;  // Milliseconds since epoch
  int64 updated_at = 8;  // Milliseconds since epoch
}

// Template section schema
message TemplateSectionSchema {
  string section_id = 1;
  string title = 2;
  string description = 3;
  bool required = 4;
  int32 min_exercises = 5;
  int32 max_exercises = 6;
  repeated TemplateExerciseSchema exercise_schemas = 7;
}

// Template exercise schema
message TemplateExerciseSchema {
  string exercise_id = 1;
  string title = 2;
  string description = 3;
  bool required = 4;
  repeated string allowed_exercise_types = 5;
  int32 min_duration_minutes = 6;
  int32 max_duration_minutes = 7;
  int32 min_objectives = 8;
  int32 max_objectives = 9;
  repeated TemplateCriteriaSchema criteria_schemas = 10;
}

// Template criteria schema
message TemplateCriteriaSchema {
  string criteria_id = 1;
  string name = 2;
  string description = 3;
  bool required = 4;
  bool requires_regulation_reference = 5;
}

// Request for impact analysis
message ImpactAnalysisRequest {
  string original_syllabus_json = 1;
  string modified_syllabus_json = 2;
  string regulation_id = 3;
}

// Response with impact analysis
message ImpactAnalysisResponse {
  bool success = 1;
  bool impacts_compliance = 2;
  double compliance_change_percentage = 3;
  repeated ComplianceIssue new_issues = 4;
  repeated ComplianceIssue resolved_issues = 5;
  repeated string affected_requirements = 6;
  string summary = 7;
  string error_message = 8;
}