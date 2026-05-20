require('dotenv').config();
require('express-async-errors');

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const compression = require('compression');
const morgan     = require('morgan');
const path       = require('path');
const fs         = require('fs');

const connectDB     = require('./config/database');
const logger        = require('./utils/logger');   // also creates logs/ and reports/ dirs
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');
const errorHandler  = require('./middleware/errorHandler');

// Routes
const authRoutes       = require('./routes/auth');
const patientRoutes    = require('./routes/patient');
const assessmentRoutes = require('./routes/assessment');
const reportRoutes     = require('./routes/report');
const drugRoutes       = require('./routes/drug');
const guidelineRoutes  = require('./routes/guideline');

const app = express();

// ── Database ─────────────────────────────────────────────
connectDB();

// ── Security ─────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false })); // disabled CSP for dev friendliness
app.use(compression());

// CORS — allow frontend in dev and production
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:80',
  'http://localhost',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, Postman, mobile apps)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      return cb(null, true);
    }
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));  // compact dev logging

// ── Static: PDF reports ───────────────────────────────────
const reportsDir = process.env.PDF_OUTPUT_DIR || path.join(__dirname, '../reports');
if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
app.use('/reports', express.static(reportsDir));

// ── Rate Limiting ─────────────────────────────────────────
app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// ── Routes ────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/patient',    patientRoutes);
app.use('/api/assessment', assessmentRoutes);
app.use('/api/report',     reportRoutes);
app.use('/api/drug',       drugRoutes);
app.use('/api/guideline',  guidelineRoutes);

// ── Health Check ──────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({ status: 'OK', timestamp: new Date().toISOString(), version: '1.0.0' })
);

// ── 404 ───────────────────────────────────────────────────
app.use((_req, res) =>
  res.status(404).json({ success: false, message: 'Route not found' })
);

// ── Global Error Handler ──────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  logger.info(`✅ MedCDS API running → http://localhost:${PORT}`);
  logger.info(`   Environment : ${process.env.NODE_ENV || 'development'}`);
  logger.info(`   MongoDB     : ${process.env.MONGODB_URI}`);
  logger.info(`   Reports dir : ${reportsDir}`);
});

module.exports = app;
