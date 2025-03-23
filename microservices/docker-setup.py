# Dockerfile
FROM ubuntu:22.04 AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    libssl-dev \
    libpq-dev \
    libboost-all-dev \
    libjsoncpp-dev \
    uuid-dev \
    zlib1g-dev \
    pkg-config \
    libspdlog-dev \
    python3-dev \
    python3-pip \
    python3-venv \
    wget \
    curl

# Install Drogon framework
WORKDIR /tmp
RUN git clone https://github.com/drogonframework/drogon
WORKDIR /tmp/drogon
RUN git checkout v1.8.3 && \
    mkdir build && \
    cd build && \
    cmake .. && \
    make -j$(nproc) && \
    make install

# Install nlohmann_json
WORKDIR /tmp
RUN git clone https://github.com/nlohmann/json.git
WORKDIR /tmp/json
RUN git checkout v3.11.2 && \
    mkdir build && \
    cd build && \
    cmake .. && \
    make -j$(nproc) && \
    make install

# Set up application
WORKDIR /app
COPY . /app/

# Build C++ components
RUN mkdir -p /app/build
WORKDIR /app/build
RUN cmake .. && \
    make -j$(nproc)

# Set up Python environment
WORKDIR /app
RUN python3 -m venv /app/venv
ENV PATH="/app/venv/bin:$PATH"
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# Final stage with runtime dependencies
FROM ubuntu:22.04

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libssl-dev \
    libpq-dev \
    libboost-system-dev \
    libboost-filesystem-dev \
    libjsoncpp-dev \
    uuid-runtime \
    zlib1g \
    python3 \
    python3-venv \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

# Copy built binaries and Python environment
COPY --from=builder /app/build/aptp_server /usr/local/bin/
COPY --from=builder /app/venv /app/venv
COPY --from=builder /app/ai-modules /app/ai-modules
COPY --from=builder /app/config /app/config
COPY --from=builder /app/public /app/public

# Set up environment
ENV PATH="/app/venv/bin:$PATH"
ENV PYTHONPATH=/app
WORKDIR /app

# Expose port
EXPOSE 8080

# Command to run the server
CMD ["aptp_server"]

# docker-compose.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: aptp_server
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - APTP_DB_HOST=postgres
      - APTP_DB_PORT=5432
      - APTP_DB_USER=aptp_user
      - APTP_DB_PASSWORD=aptp_password
      - APTP_DB_NAME=aptp_db
      - APTP_LOG_LEVEL=info
      - APTP_API_PORT=8080
      - APTP_API_HOST=0.0.0.0
      - APTP_ENABLE_SSL=false
      - APTP_JWT_SECRET=change_this_to_a_secure_secret
    volumes:
      - ./data:/app/data
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    depends_on:
      - postgres
      - redis

  postgres:
    image: timescale/timescaledb:latest-pg13
    container_name: aptp_postgres
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=aptp_user
      - POSTGRES_PASSWORD=aptp_password
      - POSTGRES_DB=aptp_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./sql/init.sql:/docker-entrypoint-initdb.d/init.sql

  redis:
    image: redis:6-alpine
    container_name: aptp_redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:

# requirements.txt
# Core dependencies
numpy>=1.20.0
pandas>=1.3.0
scikit-learn>=1.0.0
matplotlib>=3.4.0
seaborn>=0.11.0

# NLP and document processing
nltk>=3.6.0
beautifulsoup4>=4.9.0
requests>=2.25.0
PyPDF2>=2.0.0
python-docx>=0.8.10
openpyxl>=3.0.7
pytesseract>=0.3.8
Pillow>=8.2.0

# Deep learning
torch>=1.9.0
transformers>=4.8.0
tensorflow>=2.5.0

# Time series analysis and forecasting
prophet>=1.0.0
statsmodels>=0.12.0
xgboost>=1.4.0

# Web and API 
flask>=2.0.0
gunicorn>=20.1.0
pyjwt>=2.1.0

# Database
psycopg2-binary>=2.9.0
sqlalchemy>=1.4.0
redis>=3.5.3

# Utilities
tqdm>=4.61.0
pyyaml>=5.4.0
schedule>=1.1.0

# sql/init.sql
-- Initialize database for Advanced Pilot Training Platform

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create schema
CREATE SCHEMA IF NOT EXISTS aptp;

-- Set search path
SET search_path TO aptp, public;

-- User management tables
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(512) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active',
    metadata JSONB
);

CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
    role_id VARCHAR(36) REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

-- Document management tables
CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_path VARCHAR(512),
    file_type VARCHAR(50),
    file_size BIGINT,
    owner_id VARCHAR(36) REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    content_text TEXT,
    metadata JSONB
);

CREATE TABLE IF NOT EXISTS document_analysis (
    id VARCHAR(36) PRIMARY KEY,
    document_id VARCHAR(36) REFERENCES documents(id) ON DELETE CASCADE,
    analysis_type VARCHAR(50),
    analysis_result JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Syllabus management tables
CREATE TABLE IF NOT EXISTS syllabus (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(36) REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'draft',
    metadata JSONB
);

CREATE TABLE IF NOT EXISTS modules (
    id VARCHAR(36) PRIMARY KEY,
    syllabus_id VARCHAR(36) REFERENCES syllabus(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    sequence_number INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

CREATE TABLE IF NOT EXISTS lessons (
    id VARCHAR(36) PRIMARY KEY,
    module_id VARCHAR(36) REFERENCES modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    sequence_number INTEGER,
    duration_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

CREATE TABLE IF NOT EXISTS learning_objectives (
    id VARCHAR(36) PRIMARY KEY,
    lesson_id VARCHAR(36) REFERENCES lessons(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    competency_level VARCHAR(50),
    sequence_number INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- Assessment tables
CREATE TABLE IF NOT EXISTS assessment_forms (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    syllabus_id VARCHAR(36) REFERENCES syllabus(id),
    module_id VARCHAR(36) REFERENCES modules(id),
    lesson_id VARCHAR(36) REFERENCES lessons(id),
    criteria JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(36) REFERENCES users(id),
    metadata JSONB
);

CREATE TABLE IF NOT EXISTS assessments (
    id VARCHAR(36) PRIMARY KEY,
    form_id VARCHAR(36) REFERENCES assessment_forms(id),
    trainee_id VARCHAR(36) REFERENCES users(id),
    instructor_id VARCHAR(36) REFERENCES users(id),
    status VARCHAR(20),
    scheduled_time TIMESTAMP WITH TIME ZONE,
    start_time TIMESTAMP WITH TIME ZONE,
    completion_time TIMESTAMP WITH TIME ZONE,
    grades JSONB,
    feedback JSONB,
    attached_media JSONB,
    biometric_data JSONB,
    trainee_signature JSONB,
    instructor_signature JSONB,
    metadata JSONB
);

-- Scheduler tables
CREATE TABLE IF NOT EXISTS scheduled_sessions (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    location_id VARCHAR(36),
    syllabus_id VARCHAR(36) REFERENCES syllabus(id),
    module_id VARCHAR(36) REFERENCES modules(id),
    lesson_id VARCHAR(36) REFERENCES lessons(id),
    instructor_ids JSONB,
    trainee_ids JSONB,
    resource_ids JSONB,
    status VARCHAR(20),
    previous_session_id VARCHAR(36),
    next_session_id VARCHAR(36),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

CREATE TABLE IF NOT EXISTS resource_availability (
    id VARCHAR(36) PRIMARY KEY,
    resource_id VARCHAR(36),
    resource_type VARCHAR(50),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    is_available BOOLEAN,
    restriction_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- Analytics tables
CREATE TABLE IF NOT EXISTS analytics_metrics (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type INTEGER,
    data_type INTEGER,
    unit VARCHAR(50),
    formula TEXT,
    aggregation_method VARCHAR(50),
    time_aggregation INTEGER,
    category INTEGER,
    is_real_time BOOLEAN,
    is_visible BOOLEAN,
    related_metrics JSONB,
    tags JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

CREATE TABLE IF NOT EXISTS analytics_data (
    id VARCHAR(36),
    metric_id VARCHAR(36) REFERENCES analytics_metrics(id),
    dimension_id VARCHAR(36),
    entity_id VARCHAR(36),
    entity_type VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    value DOUBLE PRECISION,
    tags JSONB,
    metadata JSONB
);

-- Make analytics_data a hypertable
SELECT create_hypertable('analytics_data', 'timestamp');

-- Compliance tables
CREATE TABLE IF NOT EXISTS compliance_requirements (
    id VARCHAR(36) PRIMARY KEY,
    framework INTEGER,
    custom_framework VARCHAR(100),
    section_id VARCHAR(100),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    tags JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

CREATE TABLE IF NOT EXISTS compliance_assessments (
    id VARCHAR(36) PRIMARY KEY,
    requirement_id VARCHAR(36) REFERENCES compliance_requirements(id),
    resource_type VARCHAR(50),
    resource_id VARCHAR(36),
    status INTEGER,
    assessor_id VARCHAR(36) REFERENCES users(id),
    assessment_date TIMESTAMP WITH TIME ZONE,
    justification TEXT,
    evidence_ids JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

-- Create views
CREATE OR REPLACE VIEW active_courses AS
SELECT 
    s.id AS syllabus_id,
    s.title AS syllabus_title,
    s.description,
    s.version,
    s.status,
    COUNT(DISTINCT m.id) AS module_count,
    COUNT(DISTINCT l.id) AS lesson_count,
    COUNT(DISTINCT lo.id) AS objective_count
FROM 
    syllabus s
    LEFT JOIN modules m ON s.id = m.syllabus_id
    LEFT JOIN lessons l ON m.id = l.module_id
    LEFT JOIN learning_objectives lo ON l.id = lo.lesson_id
WHERE 
    s.status = 'active'
GROUP BY 
    s.id, s.title, s.description, s.version, s.status;

CREATE OR REPLACE VIEW trainee_performance AS
SELECT 
    a.trainee_id,
    u.first_name || ' ' || u.last_name AS trainee_name,
    af.syllabus_id,
    s.title AS syllabus_title,
    COUNT(a.id) AS assessment_count,
    AVG((a.grades->>'average_score')::float) AS average_score,
    MIN(a.completion_time) AS first_assessment,
    MAX(a.completion_time) AS latest_assessment
FROM 
    assessments a
    JOIN users u ON a.trainee_id = u.id
    JOIN assessment_forms af ON a.form_id = af.id
    JOIN syllabus s ON af.syllabus_id = s.id
WHERE 
    a.status = 'completed'
GROUP BY 
    a.trainee_id, trainee_name, af.syllabus_id, s.title;

-- Create indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_documents_owner_id ON documents(owner_id);
CREATE INDEX idx_documents_title ON documents(title);
CREATE INDEX idx_modules_syllabus_id ON modules(syllabus_id);
CREATE INDEX idx_lessons_module_id ON lessons(module_id);
CREATE INDEX idx_learning_objectives_lesson_id ON learning_objectives(lesson_id);
CREATE INDEX idx_assessments_trainee_id ON assessments(trainee_id);
CREATE INDEX idx_assessments_instructor_id ON assessments(instructor_id);
CREATE INDEX idx_scheduled_sessions_start_time ON scheduled_sessions(start_time);
CREATE INDEX idx_analytics_data_metric_id_timestamp ON analytics_data(metric_id, timestamp);

-- Insert initial roles
INSERT INTO roles (id, name, description, permissions)
VALUES 
    ('role-admin', 'Administrator', 'Full system administration access', '["*"]'),
    ('role-instructor', 'Instructor', 'Access to teaching and assessment features', '["DocumentView", "DocumentCreate", "SyllabusView", "AssessmentView", "AssessmentCreate", "AssessmentGrade", "AnalyticsView"]'),
    ('role-trainee', 'Trainee', 'Limited access for students', '["DocumentView", "SyllabusView", "AnalyticsView"]'),
    ('role-scheduler', 'Scheduler', 'Access to scheduling features', '["SyllabusView", "DocumentView", "SchedulerView", "SchedulerCreate", "SchedulerEdit"]')
ON CONFLICT (name) DO NOTHING;

-- Insert admin user (password: admin123 - change in production!)
INSERT INTO users (id, username, email, password_hash, first_name, last_name, status)
VALUES (
    'user-admin',
    'admin',
    'admin@example.com',
    -- This is a placeholder hash, replace with a proper bcrypt hash in production
    '$2a$12$K8GpYeWkOx0hJusA9RzQP.LzcwoCfHL3Z.Ae6QOmGGJRnyYqG1DIW',
    'System',
    'Administrator',
    'active'
)
ON CONFLICT (username) DO NOTHING;

-- Assign admin role to admin user
INSERT INTO user_roles (user_id, role_id)
VALUES ('user-admin', 'role-admin')
ON CONFLICT (user_id, role_id) DO NOTHING;
