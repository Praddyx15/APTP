-- TimescaleDB Schema for Advanced Pilot Training Platform
-- This schema implements efficient time-series data storage with automated
-- partitioning, continuous aggregation, and data retention policies.

-- Extensions & Setup
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
CREATE EXTENSION IF NOT EXISTS postgis CASCADE;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create role-based permissions
CREATE ROLE app_readonly;
CREATE ROLE app_readwrite;
CREATE ROLE app_admin;

GRANT app_readonly TO app_readwrite;
GRANT app_readwrite TO app_admin;

-- Main Tables

-- Users and Authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    organization_id UUID NOT NULL,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    subscription_tier VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    settings JSONB DEFAULT '{}'::JSONB,
    max_users INTEGER DEFAULT 10
);

CREATE TABLE auth_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    device_info JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    CONSTRAINT unique_active_token UNIQUE (user_id, token_hash, revoked)
);

-- Syllabus and Training Content
CREATE TABLE syllabi (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft', -- draft, active, archived
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    metadata JSONB DEFAULT '{}'::JSONB,
    parent_syllabus_id UUID REFERENCES syllabi(id)
);

CREATE TABLE modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    syllabus_id UUID NOT NULL REFERENCES syllabi(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    sequence_number INTEGER NOT NULL,
    estimated_duration INTEGER, -- in minutes
    prerequisites JSONB DEFAULT '[]'::JSONB,
    learning_objectives JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    sequence_number INTEGER NOT NULL,
    estimated_duration INTEGER, -- in minutes
    content_type VARCHAR(50) NOT NULL, -- theory, practical, simulation, assessment
    content JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    sequence_number INTEGER NOT NULL,
    difficulty_level INTEGER, -- 1-5
    equipment_required JSONB DEFAULT '[]'::JSONB,
    instructions TEXT,
    evaluation_criteria JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Documents and Resources
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_path VARCHAR(1024),
    file_size BIGINT,
    file_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active', -- active, archived, processing
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    version VARCHAR(50),
    parent_document_id UUID REFERENCES documents(id),
    extracted_text TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    tags TEXT[]
);

CREATE TABLE document_syllabus_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    syllabus_id UUID NOT NULL REFERENCES syllabi(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (document_id, syllabus_id)
);

-- Trainees and Training Records
CREATE TABLE trainees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    status VARCHAR(50) DEFAULT 'active', -- active, on-leave, graduated, withdrawn
    enrollment_date TIMESTAMPTZ NOT NULL,
    expected_completion_date TIMESTAMPTZ,
    actual_completion_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    profile_data JSONB DEFAULT '{}'::JSONB
);

CREATE TABLE trainee_syllabus_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trainee_id UUID NOT NULL REFERENCES trainees(id) ON DELETE CASCADE,
    syllabus_id UUID NOT NULL REFERENCES syllabi(id) ON DELETE CASCADE,
    assigned_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expected_completion_date TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'assigned', -- assigned, in-progress, completed, failed
    instructor_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (trainee_id, syllabus_id)
);

CREATE TABLE trainee_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trainee_id UUID NOT NULL REFERENCES trainees(id) ON DELETE CASCADE,
    syllabus_id UUID NOT NULL REFERENCES syllabi(id) ON DELETE CASCADE,
    module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL, -- not-started, in-progress, completed, failed
    start_time TIMESTAMPTZ,
    completion_time TIMESTAMPTZ,
    time_spent INTEGER, -- in seconds
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (trainee_id, syllabus_id, module_id, lesson_id, exercise_id)
);

-- Assessments and Evaluations
CREATE TABLE assessment_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assessment_type VARCHAR(50) NOT NULL, -- practical, written, simulation
    competency_areas JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    version VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active' -- draft, active, archived
);

CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES assessment_templates(id),
    trainee_id UUID NOT NULL REFERENCES trainees(id) ON DELETE CASCADE,
    assessor_id UUID REFERENCES users(id),
    syllabus_id UUID REFERENCES syllabi(id),
    module_id UUID REFERENCES modules(id),
    lesson_id UUID REFERENCES lessons(id),
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, in-progress, completed, cancelled
    scheduled_time TIMESTAMPTZ,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    location VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE assessment_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    competency_area VARCHAR(255) NOT NULL,
    score INTEGER NOT NULL, -- 1-4 scale
    comments TEXT,
    evidence JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (assessment_id, competency_area)
);

-- Scheduling
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL, -- instructor, simulator, aircraft, classroom
    description TEXT,
    capacity INTEGER,
    status VARCHAR(50) DEFAULT 'available', -- available, maintenance, reserved, inactive
    location JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::JSONB
);

CREATE TABLE schedule_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    resource_id UUID REFERENCES resources(id),
    trainee_id UUID REFERENCES trainees(id),
    instructor_id UUID REFERENCES users(id),
    syllabus_id UUID REFERENCES syllabi(id),
    module_id UUID REFERENCES modules(id),
    lesson_id UUID REFERENCES lessons(id),
    assessment_id UUID REFERENCES assessments(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, in-progress, completed, cancelled
    recurrence_rule TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    location VARCHAR(255),
    metadata JSONB DEFAULT '{}'::JSONB
);

-- Collaboration and Communication
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES users(id),
    receiver_id UUID REFERENCES users(id),
    group_id UUID, -- For group messages
    content TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    attachment_path VARCHAR(1024),
    message_type VARCHAR(50) DEFAULT 'direct', -- direct, group, system
    parent_message_id UUID REFERENCES messages(id)
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    related_resource_type VARCHAR(100),
    related_resource_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    action_url VARCHAR(1024)
);

-- Audit and Security
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSONB,
    status VARCHAR(50) -- success, failure, error
);

CREATE TABLE encrypted_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    encrypted_value BYTEA NOT NULL,
    encryption_method VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (entity_type, entity_id, field_name)
);

-- TimescaleDB Hypertables for Time-Series Data

-- Flight telemetry data
CREATE TABLE flight_telemetry (
    time TIMESTAMPTZ NOT NULL,
    flight_id UUID NOT NULL,
    trainee_id UUID NOT NULL,
    aircraft_id VARCHAR(100) NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    altitude DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    airspeed DOUBLE PRECISION,
    vertical_speed DOUBLE PRECISION,
    roll DOUBLE PRECISION,
    pitch DOUBLE PRECISION,
    yaw DOUBLE PRECISION,
    g_force DOUBLE PRECISION,
    engine_parameters JSONB,
    system_statuses JSONB,
    weather_conditions JSONB,
    control_inputs JSONB
);

-- Convert to hypertable
SELECT create_hypertable('flight_telemetry', 'time',
                         chunk_time_interval => INTERVAL '1 hour');

-- Simulator session data
CREATE TABLE simulator_telemetry (
    time TIMESTAMPTZ NOT NULL,
    session_id UUID NOT NULL,
    trainee_id UUID NOT NULL,
    simulator_id VARCHAR(100) NOT NULL,
    scenario_id VARCHAR(100),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    altitude DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    airspeed DOUBLE PRECISION,
    vertical_speed DOUBLE PRECISION,
    roll DOUBLE PRECISION,
    pitch DOUBLE PRECISION,
    yaw DOUBLE PRECISION,
    g_force DOUBLE PRECISION,
    engine_parameters JSONB,
    system_statuses JSONB,
    weather_conditions JSONB,
    control_inputs JSONB,
    system_alerts JSONB,
    instructor_annotations JSONB
);

-- Convert to hypertable
SELECT create_hypertable('simulator_telemetry', 'time',
                         chunk_time_interval => INTERVAL '1 hour');

-- Biometric data from trainees
CREATE TABLE biometric_data (
    time TIMESTAMPTZ NOT NULL,
    trainee_id UUID NOT NULL,
    session_id UUID NOT NULL,
    heart_rate INTEGER,
    blood_pressure JSONB,
    eye_tracking JSONB,
    stress_level DOUBLE PRECISION,
    attention_score DOUBLE PRECISION,
    fatigue_indicators JSONB,
    reaction_time DOUBLE PRECISION
);

-- Convert to hypertable
SELECT create_hypertable('biometric_data', 'time',
                         chunk_time_interval => INTERVAL '1 hour');

-- System performance metrics
CREATE TABLE system_metrics (
    time TIMESTAMPTZ NOT NULL,
    server_id VARCHAR(100) NOT NULL,
    cpu_usage DOUBLE PRECISION,
    memory_usage DOUBLE PRECISION,
    disk_usage DOUBLE PRECISION,
    network_traffic DOUBLE PRECISION,
    active_users INTEGER,
    response_time DOUBLE PRECISION,
    error_count INTEGER,
    service_status JSONB
);

-- Convert to hypertable
SELECT create_hypertable('system_metrics', 'time',
                         chunk_time_interval => INTERVAL '1 hour');

-- Continuous Aggregates for Analytics
-- Create hourly aggregates for flight telemetry
CREATE MATERIALIZED VIEW flight_telemetry_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    flight_id,
    trainee_id,
    aircraft_id,
    AVG(altitude) AS avg_altitude,
    AVG(airspeed) AS avg_airspeed,
    AVG(g_force) AS avg_g_force,
    MIN(altitude) AS min_altitude,
    MAX(altitude) AS max_altitude,
    MIN(airspeed) AS min_airspeed,
    MAX(airspeed) AS max_airspeed,
    MIN(g_force) AS min_g_force,
    MAX(g_force) AS max_g_force
FROM flight_telemetry
GROUP BY bucket, flight_id, trainee_id, aircraft_id;

-- Add refresh policy (refresh every 1 hour)
SELECT add_continuous_aggregate_policy('flight_telemetry_hourly',
    start_offset => INTERVAL '3 days',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');

-- Create daily aggregates for simulator sessions
CREATE MATERIALIZED VIEW simulator_telemetry_daily
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', time) AS bucket,
    trainee_id,
    simulator_id,
    scenario_id,
    COUNT(DISTINCT session_id) AS session_count,
    AVG(airspeed) AS avg_airspeed,
    AVG(altitude) AS avg_altitude,
    MIN(airspeed) AS min_airspeed,
    MAX(airspeed) AS max_airspeed
FROM simulator_telemetry
GROUP BY bucket, trainee_id, simulator_id, scenario_id;

-- Add refresh policy (refresh every day)
SELECT add_continuous_aggregate_policy('simulator_telemetry_daily',
    start_offset => INTERVAL '30 days',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 day');

-- Create hourly aggregates for biometric data
CREATE MATERIALIZED VIEW biometric_data_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    trainee_id,
    session_id,
    AVG(heart_rate) AS avg_heart_rate,
    AVG(stress_level) AS avg_stress_level,
    AVG(attention_score) AS avg_attention_score,
    AVG(reaction_time) AS avg_reaction_time,
    MIN(heart_rate) AS min_heart_rate,
    MAX(heart_rate) AS max_heart_rate
FROM biometric_data
GROUP BY bucket, trainee_id, session_id;

-- Add refresh policy (refresh every hour)
SELECT add_continuous_aggregate_policy('biometric_data_hourly',
    start_offset => INTERVAL '7 days',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');

-- Create daily system performance aggregates
CREATE MATERIALIZED VIEW system_metrics_daily
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', time) AS bucket,
    server_id,
    AVG(cpu_usage) AS avg_cpu_usage,
    MAX(cpu_usage) AS max_cpu_usage,
    AVG(memory_usage) AS avg_memory_usage,
    MAX(memory_usage) AS max_memory_usage,
    AVG(response_time) AS avg_response_time,
    MAX(response_time) AS max_response_time,
    SUM(error_count) AS total_errors,
    MAX(active_users) AS peak_users
FROM system_metrics
GROUP BY bucket, server_id;

-- Add refresh policy (refresh every day)
SELECT add_continuous_aggregate_policy('system_metrics_daily',
    start_offset => INTERVAL '30 days',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 day');

-- Retention Policies
-- Keep detailed flight telemetry for 30 days, then drop
SELECT add_retention_policy('flight_telemetry', INTERVAL '30 days');

-- Keep detailed simulator telemetry for 60 days, then drop
SELECT add_retention_policy('simulator_telemetry', INTERVAL '60 days');

-- Keep detailed biometric data for 90 days, then drop
SELECT add_retention_policy('biometric_data', INTERVAL '90 days');

-- Keep detailed system metrics for 14 days, then drop
SELECT add_retention_policy('system_metrics', INTERVAL '14 days');

-- Note: Continuous aggregates will still retain the aggregated historical data
-- even after the detailed data is dropped by the retention policy

-- Compression Policies
-- Enable compression for flight telemetry after 3 days
ALTER TABLE flight_telemetry SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'flight_id, trainee_id, aircraft_id'
);

SELECT add_compression_policy('flight_telemetry', INTERVAL '3 days');

-- Enable compression for simulator telemetry after 7 days
ALTER TABLE simulator_telemetry SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'session_id, trainee_id, simulator_id'
);

SELECT add_compression_policy('simulator_telemetry', INTERVAL '7 days');

-- Enable compression for biometric data after 7 days
ALTER TABLE biometric_data SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'trainee_id, session_id'
);

SELECT add_compression_policy('biometric_data', INTERVAL '7 days');

-- Enable compression for system metrics after 1 day
ALTER TABLE system_metrics SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'server_id'
);

SELECT add_compression_policy('system_metrics', INTERVAL '1 day');

-- Create indexes for performance
-- Flight telemetry indexes
CREATE INDEX idx_flight_telemetry_trainee_time 
ON flight_telemetry (trainee_id, time DESC);

CREATE INDEX idx_flight_telemetry_flight_time 
ON flight_telemetry (flight_id, time DESC);

-- Simulator telemetry indexes
CREATE INDEX idx_simulator_telemetry_trainee_time 
ON simulator_telemetry (trainee_id, time DESC);

CREATE INDEX idx_simulator_telemetry_session_time 
ON simulator_telemetry (session_id, time DESC);

-- Biometric data indexes
CREATE INDEX idx_biometric_data_trainee_time 
ON biometric_data (trainee_id, time DESC);

CREATE INDEX idx_biometric_data_session_time 
ON biometric_data (session_id, time DESC);

-- System metrics indexes
CREATE INDEX idx_system_metrics_server_time 
ON system_metrics (server_id, time DESC);

-- Grant appropriate permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_readonly;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_readwrite;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_readwrite;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_admin;
