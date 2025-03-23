version: '3.8'

services:
  # Core backend service
  backend-server:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    volumes:
      - ./:/app
      - backend-data:/var/lib/backend
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/aptplatform
      - REDIS_URL=redis://redis:6379/0
      - JWT_SECRET=development_secret_key_replace_in_production
      - LOG_LEVEL=debug
      - ENVIRONMENT=development
    depends_on:
      - postgres
      - redis
      - document-intelligence
      - predictive-analytics
    restart: unless-stopped
    networks:
      - apt-network

  # Document processing microservice
  document-intelligence:
    build:
      context: ../microservices/document-intelligence
      dockerfile: Dockerfile
    ports:
      - "8001:8000"
    volumes:
      - ../microservices/document-intelligence:/app
      - document-data:/var/lib/document-service
    environment:
      - MODEL_PATH=/app/models
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/aptplatform
      - REDIS_URL=redis://redis:6379/1
      - LOG_LEVEL=debug
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    networks:
      - apt-network

  # Predictive analytics microservice
  predictive-analytics:
    build:
      context: ../microservices/predictive-analytics
      dockerfile: Dockerfile
    ports:
      - "8002:8000"
    volumes:
      - ../microservices/predictive-analytics:/app
      - analytics-data:/var/lib/analytics-service
    environment:
      - MODEL_PATH=/app/models
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/aptplatform
      - REDIS_URL=redis://redis:6379/2
      - LOG_LEVEL=debug
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    networks:
      - apt-network

  # Adaptive learning microservice
  adaptive-learning:
    build:
      context: ../microservices/adaptive-learning
      dockerfile: Dockerfile
    ports:
      - "8003:8000"
    volumes:
      - ../microservices/adaptive-learning:/app
      - learning-data:/var/lib/learning-service
    environment:
      - MODEL_PATH=/app/models
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/aptplatform
      - REDIS_URL=redis://redis:6379/3
      - LOG_LEVEL=debug
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    networks:
      - apt-network

  # Gamification microservice
  gamification:
    build:
      context: ../microservices/gamification
      dockerfile: Dockerfile
    ports:
      - "8004:8000"
    volumes:
      - ../microservices/gamification:/app
      - gamification-data:/var/lib/gamification-service
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/aptplatform
      - REDIS_URL=redis://redis:6379/4
      - LOG_LEVEL=debug
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    networks:
      - apt-network

  # Database
  postgres:
    image: timescale/timescaledb:latest-pg14
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=aptplatform
    restart: unless-stopped
    networks:
      - apt-network
    command: ["postgres", "-c", "shared_preload_libraries=timescaledb", "-c", "max_connections=200"]

  # Cache and message broker
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped
    networks:
      - apt-network
    command: ["redis-server", "--appendonly", "yes"]
    
  # Search engine for document indexing
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.7.0
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    restart: unless-stopped
    networks:
      - apt-network

volumes:
  postgres-data:
  redis-data:
  elasticsearch-data:
  backend-data:
  document-data:
  analytics-data:
  learning-data:
  gamification-data:

networks:
  apt-network:
    driver: bridge