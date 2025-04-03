#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        Testing Authentication for All Sample Users        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}\n"

test_login() {
  username=$1
  password=$2
  description=$3
  
  echo -e "🔐 Testing login for ${BLUE}$description${NC} ($username)..."
  
  response=$(curl -s -X POST -H "Content-Type: application/json" \
    -d "{\"username\":\"$username\",\"password\":\"$password\"}" \
    http://localhost:5000/api/login)
  
  if [[ $response == *"id"* ]]; then
    role=$(echo $response | grep -o '"role":"[^"]*' | cut -d'"' -f4)
    org=$(echo $response | grep -o '"organizationType":"[^"]*' | cut -d'"' -f4)
    email=$(echo $response | grep -o '"email":"[^"]*' | cut -d'"' -f4)
    
    echo -e "  ${GREEN}✓ Login successful${NC}"
    echo -e "  Role: ${CYAN}$role${NC}"
    echo -e "  Organization: ${PURPLE}$org${NC}"
    echo -e "  Email: ${YELLOW}$email${NC}"
    echo ""
  else
    error=$(echo $response | grep -o '"message":"[^"]*' | cut -d'"' -f4)
    echo -e "  ${RED}✗ Login failed${NC}"
    echo -e "  Error: ${RED}$error${NC}"
    echo ""
  fi
}

# Admin user
test_login "admin" "Admin@123" "Admin User"

# ATO instructor
test_login "ato_airline" "ATO@airline123" "ATO Instructor"

# Airline student
test_login "student" "Student@123" "Airline Student"

# Second airline student
test_login "student2" "Student@123" "Second Airline Student"

# ATO instructor (second)
test_login "airline2" "ATO@airline123" "ATO Instructor (second)"

# ATO examiner
test_login "examiner" "Examiner@123" "ATO Examiner"

# Airline instructor
test_login "airline" "Airline@123" "Airline Instructor"

# ATO student
test_login "atostudent" "Student@123" "ATO Student"

echo -e "${BLUE}Testing completed!${NC}"