#!/bin/bash
# ============================================================
# MedCDS — Diagnostic Script
# Run: bash diagnose.sh
# This tells you exactly why login/register is failing
# ============================================================

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
ok()   { echo -e "${GREEN}  ✓${NC} $1"; }
fail() { echo -e "${RED}  ✗${NC} $1"; }
warn() { echo -e "${YELLOW}  !${NC} $1"; }
info() { echo -e "${BLUE}  →${NC} $1"; }

ISSUES=0

echo ""
echo "MedCDS Diagnostic"
echo "================="
echo ""

# 1. Node.js
echo "[ Node.js ]"
if command -v node &>/dev/null; then
  V=$(node -v | cut -c2- | cut -d. -f1)
  if [ "$V" -ge 18 ]; then ok "Node.js $(node -v)"; else fail "Node.js too old ($(node -v)) — need 18+"; ISSUES=$((ISSUES+1)); fi
else
  fail "Node.js not installed"; ISSUES=$((ISSUES+1))
fi
echo ""

# 2. backend/.env exists and has key fields
echo "[ backend/.env ]"
ENV="backend/.env"
if [ ! -f "$ENV" ]; then
  fail ".env not found — copy backend/.env.example to backend/.env"; ISSUES=$((ISSUES+1))
else
  ok ".env file exists"
  MONGO=$(grep "^MONGODB_URI=" "$ENV" | cut -d= -f2-)
  JWT=$(grep "^JWT_SECRET=" "$ENV" | cut -d= -f2-)
  ANTHROPIC=$(grep "^ANTHROPIC_API_KEY=" "$ENV" | cut -d= -f2-)

  if [ -z "$MONGO" ]; then
    fail "MONGODB_URI not set in .env"; ISSUES=$((ISSUES+1))
  else
    ok "MONGODB_URI = $MONGO"
  fi

  if [ -z "$JWT" ]; then
    fail "JWT_SECRET not set in .env"; ISSUES=$((ISSUES+1))
  else
    ok "JWT_SECRET is set"
  fi

  if [ -z "$ANTHROPIC" ] || [ "$ANTHROPIC" = "your_anthropic_api_key_here" ]; then
    warn "ANTHROPIC_API_KEY not set — AI features will use fallback mode (app still works)"
  else
    ok "ANTHROPIC_API_KEY is set"
  fi
fi
echo ""

# 3. MongoDB
echo "[ MongoDB ]"
if command -v mongod &>/dev/null; then
  ok "mongod installed"
else
  warn "mongod not found locally"
  info "If using Atlas, that's fine — just make sure MONGODB_URI is your Atlas connection string"
fi

if command -v mongosh &>/dev/null; then
  if mongosh --quiet --eval "db.runCommand('ping').ok" mongodb://localhost:27017 2>/dev/null | grep -q "1"; then
    ok "MongoDB is RUNNING on localhost:27017"
  else
    fail "MongoDB is NOT running on localhost:27017"
    info "Start it with:  sudo systemctl start mongod"
    info "OR use Atlas:   https://cloud.mongodb.com (free tier)"
    ISSUES=$((ISSUES+1))
  fi
elif command -v mongo &>/dev/null; then
  if mongo --quiet --eval "db.runCommand('ping').ok" 2>/dev/null | grep -q "1"; then
    ok "MongoDB is RUNNING"
  else
    fail "MongoDB is NOT running"; ISSUES=$((ISSUES+1))
    info "Start with: sudo systemctl start mongod"
  fi
else
  warn "mongosh not installed — cannot verify MongoDB status"
  info "If you set an Atlas URI, skip this step"
fi
echo ""

# 4. Backend dependencies
echo "[ Backend dependencies ]"
if [ -d "backend/node_modules" ]; then
  ok "node_modules exists"
  for pkg in express mongoose bcryptjs jsonwebtoken express-async-errors axios; do
    if [ -d "backend/node_modules/$pkg" ]; then
      ok "$pkg installed"
    else
      fail "$pkg MISSING — run: cd backend && npm install --legacy-peer-deps"; ISSUES=$((ISSUES+1))
    fi
  done
else
  fail "node_modules missing — run: cd backend && npm install --legacy-peer-deps"; ISSUES=$((ISSUES+1))
fi
echo ""

# 5. Backend port test
echo "[ Backend server ]"
if curl -s --max-time 3 http://localhost:5000/health 2>/dev/null | grep -q "OK"; then
  ok "Backend is RUNNING on port 5000"
else
  fail "Backend is NOT running on port 5000"
  info "Start with: cd backend && npm run dev"
  ISSUES=$((ISSUES+1))
fi
echo ""

# 6. Frontend
echo "[ Frontend ]"
if [ -d "frontend/node_modules" ]; then
  ok "Frontend node_modules exists"
else
  fail "Frontend node_modules missing — run: cd frontend && npm install --legacy-peer-deps"; ISSUES=$((ISSUES+1))
fi

if curl -s --max-time 3 http://localhost:3000 2>/dev/null | grep -q "html"; then
  ok "Frontend is RUNNING on port 3000"
else
  fail "Frontend is NOT running on port 3000"
  info "Start with: cd frontend && npm start"
  ISSUES=$((ISSUES+1))
fi
echo ""

# Summary
echo "==============================="
if [ "$ISSUES" -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed! Open http://localhost:3000${NC}"
else
  echo -e "${RED}❌ Found $ISSUES issue(s) — fix the ✗ items above${NC}"
  echo ""
  echo "Most common fix for login failing:"
  echo -e "  ${YELLOW}1. Make sure MongoDB is running${NC}"
  echo -e "  ${YELLOW}2. Make sure backend is running on port 5000${NC}"
  echo -e "  ${YELLOW}3. Make sure backend/.env has MONGODB_URI and JWT_SECRET${NC}"
fi
echo ""
