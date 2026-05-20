#!/bin/bash
# ================================================================
# MedCDS — Setup Script (Claude API Edition)
# Run: bash setup.sh
# ================================================================
set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  MedCDS — Clinical Decision Support          ║"
echo "║  Powered by Anthropic Claude + Free APIs     ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── Check Node.js ──────────────────────────────────────────
info "Checking Node.js..."
if ! command -v node &> /dev/null; then
  error "Node.js not found. Install from https://nodejs.org (LTS version)"
fi
NODE_VER=$(node -v | cut -c2- | cut -d. -f1)
if [ "$NODE_VER" -lt 18 ]; then
  error "Node.js 18+ required. Current: $(node -v)"
fi
success "Node.js $(node -v) detected"

# ── Check Anthropic API Key ─────────────────────────────────
info "Checking Anthropic API key..."
if grep -q "your_anthropic_api_key_here" backend/.env 2>/dev/null; then
  echo ""
  warn "⚠  ANTHROPIC_API_KEY not set in backend/.env"
  warn "   Get your free key at: https://console.anthropic.com"
  warn "   Then edit backend/.env and replace 'your_anthropic_api_key_here'"
  warn "   The app will still run but AI features will use fallback mode"
  echo ""
else
  success "Anthropic API key found"
fi

# ── Check MongoDB ──────────────────────────────────────────
info "Checking MongoDB..."
MONGO_RUNNING=false
if command -v mongod &> /dev/null; then
  success "MongoDB installed"
  if command -v mongosh &> /dev/null; then
    if mongosh --quiet --eval "db.runCommand('ping').ok" mongodb://localhost:27017 2>/dev/null | grep -q "1"; then
      success "MongoDB is running on port 27017"
      MONGO_RUNNING=true
    else
      warn "MongoDB installed but not running. Start with: sudo systemctl start mongod"
    fi
  else
    warn "mongosh not found — skipping MongoDB connection check"
    MONGO_RUNNING=true
  fi
else
  warn "MongoDB not found. Make sure MONGODB_URI in backend/.env points to a running instance."
  warn "Download: https://www.mongodb.com/try/download/community"
  warn "Or use MongoDB Atlas (free): https://www.mongodb.com/cloud/atlas"
fi

echo ""

# ── Install backend dependencies ───────────────────────────
info "Installing backend dependencies..."
cd backend
npm install --legacy-peer-deps
success "Backend dependencies installed"

mkdir -p reports logs
success "Created reports/ and logs/ directories"

# ── Seed guidelines ─────────────────────────────────────────
if [ "$MONGO_RUNNING" = true ]; then
  info "Seeding clinical guidelines into MongoDB..."
  if node src/utils/seedData.js 2>/dev/null; then
    success "Clinical guidelines seeded (WHO/ADA/NICE/ICMR rules)"
  else
    warn "Seeding failed — retry later with: cd backend && npm run seed"
  fi
else
  warn "Skipping seed — MongoDB not running. Run 'npm run seed' after starting MongoDB."
fi

cd ..

# ── Install frontend dependencies ─────────────────────────
info "Installing frontend dependencies..."
cd frontend
npm install --legacy-peer-deps
success "Frontend dependencies installed"
cd ..

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  ✅  Setup Complete!                          ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo -e "${YELLOW}REQUIRED: Add your Anthropic API key to backend/.env${NC}"
echo "  Get free key at: https://console.anthropic.com"
echo ""
echo -e "${GREEN}To start the application:${NC}"
echo ""
echo "  Terminal 1 (Backend):"
echo -e "  ${YELLOW}cd backend && npm run dev${NC}"
echo ""
echo "  Terminal 2 (Frontend):"
echo -e "  ${YELLOW}cd frontend && npm start${NC}"
echo ""
echo -e "${GREEN}Then open:${NC} http://localhost:3000"
echo ""
echo -e "${YELLOW}⚠  REMINDER:${NC} MedCDS is clinical decision support — NOT a prescription."
echo "   Always consult a doctor before acting on any recommendation."
echo ""
