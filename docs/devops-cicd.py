# /.github/workflows/backend-ci.yml
name: Backend CI

on:
  push:
    branches: [ main, develop ]
    paths:
      - 'backend/**'
      - '.github/workflows/backend-ci.yml'
  pull_request:
    branches: [ main, develop ]
    paths:
      - 'backend/**'
      - '.github/workflows/backend-ci.yml'

jobs:
  build-and-test-cpp:
    runs-on: ubuntu-latest
    container: gcc:latest

    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_USER: postgres
          POSTGRES_DB: pilot_training_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v3

    - name: Install dependencies
      run: |
        apt-get update
        apt-get install -y cmake build-essential libssl-dev zlib1g-dev libpq-dev
        apt-get install -y libgtest-dev libbenchmark-dev
        cd /usr/src/googletest
        cmake .
        make
        cp -a lib/. /usr/lib/

    - name: Configure CMake
      working-directory: ${{github.workspace}}/backend
      run: |
        mkdir -p build
        cd build
        cmake ..

    - name: Build
      working-directory: ${{github.workspace}}/backend/build
      run: make -j$(nproc)

    - name: Run tests
      working-directory: ${{github.workspace}}/backend/build
      run: |
        ctest --verbose
        ./tests/unit_tests
        ./tests/integration_tests

    - name: Run benchmarks
      working-directory: ${{github.workspace}}/backend/build
      run: ./tests/performance_benchmarks --benchmark_out=benchmark_results.json

    - name: Upload benchmark results
      uses: actions/upload-artifact@v3
      with:
        name: benchmark-results
        path: ${{github.workspace}}/backend/build/benchmark_results.json

  build-and-test-python:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.10'
        
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install pytest pytest-cov
        pip install -r backend/python/requirements.txt
        
    - name: Run tests
      working-directory: ${{github.workspace}}/backend
      run: |
        python -m pytest python/tests/ --cov=python --cov-report=xml
        
    - name: Upload coverage report
      uses: codecov/codecov-action@v3
      with:
        file: ${{github.workspace}}/backend/coverage.xml

  docker-build:
    needs: [build-and-test-cpp, build-and-test-python]
    runs-on: ubuntu-latest
    if: github.event_name != 'pull_request'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
      
    - name: Login to Container Registry
      uses: docker/login-action@v2
      with:
        registry: ghcr.io
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
        
    - name: Build and push backend image
      uses: docker/build-push-action@v4
      with:
        context: ./backend
        push: true
        tags: |
          ghcr.io/${{ github.repository }}/backend:latest
          ghcr.io/${{ github.repository }}/backend:${{ github.sha }}
        cache-from: type=gha
        cache-to: type=gha,mode=max

# /.github/workflows/frontend-ci.yml
name: Frontend CI

on:
  push:
    branches: [ main, develop ]
    paths:
      - 'frontend/**'
      - '.github/workflows/frontend-ci.yml'
  pull_request:
    branches: [ main, develop ]
    paths:
      - 'frontend/**'
      - '.github/workflows/frontend-ci.yml'

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json
        
    - name: Install dependencies
      working-directory: ${{github.workspace}}/frontend
      run: npm ci
      
    - name: Lint
      working-directory: ${{github.workspace}}/frontend
      run: npm run lint
      
    - name: Build
      working-directory: ${{github.workspace}}/frontend
      run: npm run build
      
    - name: Test
      working-directory: ${{github.workspace}}/frontend
      run: npm test -- --coverage
      
    - name: Upload coverage report
      uses: codecov/codecov-action@v3
      with:
        directory: ${{github.workspace}}/frontend/coverage

  e2e-tests:
    runs-on: ubuntu-latest
    needs: lint-and-test
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json
        
    - name: Install dependencies
      working-directory: ${{github.workspace}}/frontend
      run: npm ci
      
    - name: Cypress run
      uses: cypress-io/github-action@v5
      with:
        working-directory: frontend
        build: npm run build
        start: npm start
        wait-on: 'http://localhost:3000'
        
    - name: Upload screenshots
      uses: actions/upload-artifact@v3
      if: failure()
      with:
        name: cypress-screenshots
        path: frontend/cypress/screenshots

  deploy-vercel:
    runs-on: ubuntu-latest
    needs: e2e-tests
    if: github.ref == 'refs/heads/main' && github.event_name != 'pull_request'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v25
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
        vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
        working-directory: ./frontend
        vercel-args: '--prod'

# /backend/Dockerfile
FROM gcc:latest as builder

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    cmake \
    build-essential \
    libssl-dev \
    zlib1g-dev \
    libpq-dev \
    python3 \
    python3-pip \
    python3-dev

# Copy C++ source code
COPY . .

# Build C++ components
RUN mkdir -p build && \
    cd build && \
    cmake .. && \
    make -j$(nproc)

# Install Python dependencies
WORKDIR /app/python
RUN pip3 install --no-cache-dir -r requirements.txt

# Second stage: Runtime image
FROM debian:bullseye-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libssl1.1 \
    libpq5 \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Copy built artifacts from builder stage
COPY --from=builder /app/build/bin /app/bin
COPY --from=builder /app/python /app/python

# Set environment variables
ENV PYTHONPATH=/app

# Set working directory
WORKDIR /app

# Start the service
CMD ["/app/bin/pilot_training_platform"]

# /frontend/.dockerignore
node_modules
.next
out
.git
.github
cypress
coverage
.env*

# /frontend/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Second stage: Runtime image
FROM node:18-alpine

WORKDIR /app

# Copy built application
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Set environment variables
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]

# /docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:13
    restart: always
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - app-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: always
    depends_on:
      - postgres
    environment:
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_USER=${DB_USER}
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=${DB_NAME}
      - API_KEY=${API_KEY}
      - JWT_SECRET=${JWT_SECRET}
    ports:
      - "8080:8080"
    networks:
      - app-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    restart: always
    depends_on:
      - backend
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8080
    ports:
      - "3000:3000"
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  postgres-data:
