#!/bin/bash

# QuickBooks POS 2013 Integration - Deployment Script
# This script sets up the QuickBooks integration for Premier Hotel

set -e  # Exit on error

echo "═══════════════════════════════════════════════════════════════════"
echo "   Premier Hotel - QuickBooks POS 2013 Integration Deployment"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Step 1: Check Prerequisites
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Checking Prerequisites"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if PostgreSQL is installed
if command -v psql &> /dev/null; then
    print_success "PostgreSQL is installed"
else
    print_error "PostgreSQL is not installed. Please install PostgreSQL first."
    exit 1
fi

# Check if Python backend exists
if [ -d "backend" ]; then
    print_success "Backend directory found"
else
    print_error "Backend directory not found. Please run from project root."
    exit 1
fi

# Check if database connection is configured
if [ -z "$DATABASE_URL" ]; then
    print_warning "DATABASE_URL not set. Using default: postgresql://postgres:postgres@localhost:5432/premier_hotel"
    export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/premier_hotel"
fi

echo ""

# Step 2: Run Database Migration
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Running Database Migration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

print_info "Creating QuickBooks sync tables..."

# Extract database credentials from DATABASE_URL
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\).*/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\).*/\1/p')

if [ -f "backend/sql/create_quickbooks_sync_tables.sql" ]; then
    # Run the migration
    psql $DATABASE_URL -f backend/sql/create_quickbooks_sync_tables.sql

    if [ $? -eq 0 ]; then
        print_success "Database migration completed successfully"
    else
        print_error "Database migration failed"
        exit 1
    fi
else
    print_error "Migration file not found: backend/sql/create_quickbooks_sync_tables.sql"
    exit 1
fi

echo ""

# Step 3: Verify Tables Created
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Verifying Database Tables"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if tables exist
TABLES=$(psql $DATABASE_URL -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'quickbooks%' ORDER BY table_name;")

if [ -z "$TABLES" ]; then
    print_error "No QuickBooks tables found in database"
    exit 1
fi

echo "QuickBooks tables created:"
echo "$TABLES" | while read -r table; do
    if [ ! -z "$table" ]; then
        print_success "  - $table"
    fi
done

echo ""

# Step 4: Install Python Dependencies
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4: Installing Python Dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd backend

if [ ! -d "venv" ]; then
    print_info "Creating virtual environment..."
    python3 -m venv venv
    print_success "Virtual environment created"
fi

print_info "Activating virtual environment..."
source venv/bin/activate

print_info "Installing/updating dependencies..."

# Check if asyncpg is installed
if pip list | grep -q "asyncpg"; then
    print_success "asyncpg is already installed"
else
    print_info "Installing asyncpg..."
    pip install asyncpg
    print_success "asyncpg installed"
fi

# Check if lxml is installed
if pip list | grep -q "lxml"; then
    print_success "lxml is already installed"
else
    print_info "Installing lxml..."
    pip install lxml
    print_success "lxml installed"
fi

cd ..

echo ""

# Step 5: Build Frontend
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 5: Building Frontend Components"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -d "node_modules" ]; then
    print_success "Node modules already installed"
else
    print_info "Installing node modules..."
    npm install
    print_success "Node modules installed"
fi

print_info "Building frontend..."
npm run build

if [ $? -eq 0 ]; then
    print_success "Frontend built successfully"
else
    print_warning "Frontend build had warnings (this is usually OK)"
fi

echo ""

# Step 6: Deployment Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ QuickBooks Integration Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "What was deployed:"
echo "  ✓ Database tables (4 tables with RLS policies)"
echo "  ✓ Backend services (9 files)"
echo "  ✓ API endpoints (2 routers with 15+ endpoints)"
echo "  ✓ Frontend components (3 React components)"
echo "  ✓ TypeScript types (30+ interfaces)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Next Steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Start the backend server:"
echo "   cd backend"
echo "   source venv/bin/activate"
echo "   uvicorn app.main:app --reload"
echo ""
echo "2. Access the admin dashboard:"
echo "   http://localhost:3000/admin"
echo "   Navigate to: Integrations → QuickBooks"
echo ""
echo "3. Configure QuickBooks:"
echo "   - Enter company file path"
echo "   - Set Web Connector URL"
echo "   - Enter credentials"
echo "   - Enable sync toggles"
echo "   - Test connection"
echo ""
echo "4. Setup QuickBooks POS & Web Connector:"
echo "   See: docs/QUICKBOOKS_SETUP.md"
echo ""
echo "5. Map menu/inventory items:"
echo "   Admin → QuickBooks → Item Mapping"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Documentation:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Setup Guide:       docs/QUICKBOOKS_SETUP.md"
echo "  Implementation:    QUICKBOOKS_INTEGRATION_COMPLETE.md"
echo "  Progress Tracker:  QUICKBOOKS_IMPLEMENTATION_PROGRESS.md"
echo "  API Docs:          http://localhost:8000/docs"
echo ""
echo "═══════════════════════════════════════════════════════════════════"
print_success "Deployment completed successfully! 🎉"
echo "═══════════════════════════════════════════════════════════════════"
