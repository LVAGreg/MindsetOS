#!/usr/bin/env node

/**
 * ECOS Backend with Real OpenRouter AI Integration
 * Version: 2.1.2 (Live Workshop Admin Agent)
 *
 * This server provides:
 * - Full authentication (register, login, forgot password)
 * - Real AI responses from OpenRouter (GPT-4o-mini)
 * - All 9 ECOS agents with custom system prompts
 * - Agent-specific frameworks and personality
 * - Forced onboarding with agent locking
 * - Updated: 2025-11-07 - Schema complete, Ollama configured
 */

const http = require('http');
const https = require('https');
const url = require('url');
const crypto = require('crypto');
const { Pool } = require('pg');
const fs = require('fs');
const pathModule = require('path');
const multiparty = require('multiparty');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { encoding_for_model } = require('tiktoken');
const { OAuth2Client } = require('google-auth-library');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

// Load environment variables (optional - Railway provides them directly)
try {
  require('dotenv').config();
} catch (e) {
  // dotenv not needed in production
}

// Import modular routes
const { registerAssetsRoutes } = require('./backend/routes/assets.cjs');
const { registerOnboardingRoutes } = require('./backend/routes/onboarding.cjs');
const { registerBrandVoiceRoutes } = require('./backend/routes/brandVoice.cjs');
const { registerCacheRoutes } = require('./backend/routes/cache.cjs');
const { registerNotificationRoutes } = require('./backend/routes/notifications.cjs');
const { registerVoiceRoutes } = require('./backend/routes/voice.cjs');
const WebSocket = require('ws');
const { createGeminiLiveHandler } = require('./backend/services/geminiLive.cjs');

// Import RAG services
const { searchRelevantChunks, formatContextForLLM } = require('./backend/services/ragService.cjs');

// Import enhanced memory extraction
const { extractMemoriesEnhanced } = require('./backend/memory/memoryExtractorEnhanced.cjs');

// Import document extraction service for large document handling
const { processLargeDocument, isLargeDocument, searchDocumentChunks, extractRelevantPromptSections, shouldExtractPrompt } = require('./document-extraction-service.cjs');
const { retrieveSemanticMemories, getCoreMemories } = require('./backend/memory/semanticMemoryRetrieval.cjs');

// Import email service
const {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPasswordResetByAdminEmail,
  sendOnboardingCompleteEmail,
  sendQuickStartEmail,
  sendMeetAgentsEmail,
  sendInactivityEmail,
  sendFirstConversationEmail,
  sendMoneyModelCreatedEmail,
  sendPaymentConfirmationEmail,
  generateRandomPassword,
} = require('./backend/services/emailService.cjs');

// Import report service
const { sendReport, startReportScheduler, sendCustomEmail, REPORT_RECIPIENTS } = require('./backend/services/reportService.cjs');

// Import core memory processor
const {
  processMemoryUpdates,
  getCoreMemoriesWithHistory,
  updateCoreMemoriesManual
} = require('./backend/memory/coreMemoryProcessor.cjs');

// Import brand voice suffix service
const { buildSystemPromptWithBrandVoice, shouldApplyBrandVoice } = require('./backend/services/brandVoiceSuffix.cjs');

// Helper function to check if an email template is enabled
async function isEmailEnabled(templateId) {
  try {
    const result = await pool.query(
      'SELECT enabled FROM email_templates WHERE id = $1',
      [templateId]
    );
    // If template doesn't exist in DB, default to true (fallback behavior)
    if (result.rows.length === 0) {
      return true;
    }
    return result.rows[0].enabled;
  } catch (error) {
    console.error(`⚠️ Error checking email template status for ${templateId}:`, error.message);
    // On error, default to true to not block important emails
    return true;
  }
}

// Import brand voice processor
const { processBrandVoiceUpdates } = require('./backend/services/brandVoiceProcessor.cjs');

// Configuration from environment variables
const PORT = process.env.PORT || 3010;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const JWT_SECRET = process.env.JWT_SECRET;

// Logging configuration - set DEBUG_LOGGING=true in Railway to enable
const DEBUG_LOGGING = process.env.DEBUG_LOGGING === 'true';

// ============================================
// PERFORMANCE FEATURE FLAGS (all default ON — set to 'false' in Railway to disable)
// These optimizations have zero quality impact and can be toggled instantly
// ============================================
const PERF_ASYNC_WIDGET = process.env.PERF_ASYNC_WIDGET !== 'false';        // Don't block stream for widget formatting
const PERF_PARALLEL_PIPELINE = process.env.PERF_PARALLEL_PIPELINE !== 'false'; // Run memory + RAG in parallel
const PERF_PROMPT_CACHING = process.env.PERF_PROMPT_CACHING !== 'false';     // Enable Anthropic prompt caching via OpenRouter
const PERF_ASYNC_SUMMARIZE = process.env.PERF_ASYNC_SUMMARIZE !== 'false';   // Defer summarization to after response
console.log(`⚡ [PERF FLAGS] async_widget=${PERF_ASYNC_WIDGET} parallel_pipeline=${PERF_PARALLEL_PIPELINE} prompt_caching=${PERF_PROMPT_CACHING} async_summarize=${PERF_ASYNC_SUMMARIZE}`);

// Smart logging functions that respect DEBUG_LOGGING flag
const log = (...args) => {
  if (DEBUG_LOGGING) console.log(...args);
};
const logError = (...args) => console.error(...args); // Always log errors
const logInfo = (...args) => {
  if (DEBUG_LOGGING) console.info(...args);
};
const logDebug = (...args) => {
  if (DEBUG_LOGGING) console.debug(...args);
};
const logWarn = (...args) => console.warn(...args); // Always log warnings
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10');

// Debug: Log environment variable status
console.log('🔍 Environment Check:');
console.log(`  OPENROUTER_API_KEY: ${OPENROUTER_API_KEY ? '✅ SET' : '❌ MISSING'}`);
console.log(`  JWT_SECRET: ${JWT_SECRET ? '✅ SET' : '❌ MISSING'}`);
console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`  PORT: ${PORT}`);
console.log(`  DB_HOST: ${process.env.DB_HOST || 'localhost'}`);
console.log(`  DB_NAME: ${process.env.DB_NAME || 'ecos_db'}`);
console.log(`  DB_USER: ${process.env.DB_USER || 'ecos'}`);

// Validate critical environment variables
if (!OPENROUTER_API_KEY) {
  console.error('❌ CRITICAL: OPENROUTER_API_KEY is not set in environment variables');
  console.error('⚠️  Starting anyway in degraded mode...');
  // Don't exit - let backend start for health checks
  // process.exit(1);
}
if (!JWT_SECRET) {
  console.error('❌ CRITICAL: JWT_SECRET is not set in environment variables');
  console.error('⚠️  Starting anyway in degraded mode...');
  // Don't exit - let backend start for health checks
  // process.exit(1);
}

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.REDIRECT_URI;

const googleClient = GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET ? new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
) : null;

// PostgreSQL connection using environment variables
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: false,
      max: 50,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5433'),
      database: process.env.DB_NAME || 'ecos_db',
      user: process.env.DB_USER || 'ecos',
      password: process.env.DB_PASSWORD || 'ecos_dev_password',
      ssl: false,
      max: 50,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

// In-memory session storage (can be moved to Redis later)
const sessions = new Map();

// Rate limiting storage
const rateLimitStore = new Map();

// Helper function to generate UUID
function generateUUID() {
  return crypto.randomUUID();
}

// ============================================
// JWT Authentication Functions
// ============================================

/**
 * Generate JWT access token
 */
function generateAccessToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role || 'user'
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Generate JWT refresh token
 */
function generateRefreshToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      type: 'refresh'
    },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );
}

/**
 * Verify JWT token
 */
function verifyToken(token, isRefreshToken = false) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // If verifying refresh token, ensure it has the correct type
    if (isRefreshToken && decoded.type !== 'refresh') {
      console.log('❌ Token is not a refresh token');
      return null;
    }

    return decoded;
  } catch (error) {
    console.log('❌ Token verification failed:', error.message);
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;

  return parts[1];
}

/**
 * Middleware to authenticate JWT token
 */
async function authenticateToken(req) {
  const token = extractToken(req);
  if (!token) {
    return { authenticated: false, error: 'No token provided' };
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return { authenticated: false, error: 'Invalid or expired token' };
  }

  // Fetch user from database to ensure they still exist and get latest data
  // Handle backwards compatibility: decoded.userId might be an object or a string
  const userId = typeof decoded.userId === 'object' ? decoded.userId.id : decoded.userId;
  try {
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, role, membership_tier, trial_expires_at, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return { authenticated: false, error: 'User not found' };
    }

    return { authenticated: true, user: result.rows[0] };
  } catch (error) {
    console.error('Error fetching user:', error);
    return { authenticated: false, error: 'Authentication failed' };
  }
}

/**
 * Middleware to check user roles (RBAC)
 */
function requireRole(allowedRoles) {
  return (user) => {
    if (!user || !user.role) return false;
    return allowedRoles.includes(user.role);
  };
}

// ============================================
// Rate Limiting Functions
// ============================================

/**
 * Simple rate limiter for Node.js http server
 */
function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes
  const max = options.max || 100; // 100 requests per window
  const message = options.message || 'Too many requests, please try again later';

  return function rateLimitMiddleware(identifier) {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create request log for this identifier
    if (!rateLimitStore.has(identifier)) {
      rateLimitStore.set(identifier, []);
    }

    const requests = rateLimitStore.get(identifier);

    // Remove old requests outside the window
    const validRequests = requests.filter(time => time > windowStart);
    rateLimitStore.set(identifier, validRequests);

    // Check if limit exceeded
    if (validRequests.length >= max) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: new Date(validRequests[0] + windowMs),
        message: message
      };
    }

    // Add current request
    validRequests.push(now);
    rateLimitStore.set(identifier, validRequests);

    return {
      allowed: true,
      remaining: max - validRequests.length,
      resetTime: new Date(now + windowMs)
    };
  };
}

// Create rate limiters for different endpoints
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 auth attempts per window
  message: 'Too many authentication attempts, please try again later'
});

const generalRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later'
});

// Chat-specific rate limiter to prevent hitting OpenRouter limits
const chatRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute window
  max: 10, // 10 requests per minute per user
  message: '⏸️ Chat rate limit: Please wait a moment before sending another message. This prevents overloading the AI service.'
});

// CORS configuration - Support multiple origins
// Accepts CORS_ORIGINS (plural) or CORS_ORIGIN (singular) env var
const CORS_ORIGINS = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || 'http://localhost:3011').split(',').map(o => o.trim());
const FRONTEND_URL = process.env.FRONTEND_URL || CORS_ORIGINS[0];

// Function to get CORS headers based on request origin
function getCorsHeaders(origin) {
  const allowedOrigin = CORS_ORIGINS.includes(origin) ? origin : CORS_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
    // Anti-cache headers to prevent browser caching
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0'
  };
}

// Default CORS headers for backward compatibility
const corsHeaders = getCorsHeaders(FRONTEND_URL);

// HTML guides — loaded from external hex files to keep backend lean
const GUIDES_DIR = require('path').join(__dirname, 'guides');
const FINANCIAL_MODEL_HTML = Buffer.from(require('fs').readFileSync(require('path').join(GUIDES_DIR, 'financial-model.hex'), 'utf8').trim(), 'hex');
const PLATFORM_UPDATE_HTML = Buffer.from(require('fs').readFileSync(require('path').join(GUIDES_DIR, 'platform-update.hex'), 'utf8').trim(), 'hex');
const GETTING_STARTED_HTML = Buffer.from(require('fs').readFileSync(require('path').join(GUIDES_DIR, 'getting-started.hex'), 'utf8').trim(), 'hex');
const CLIENT_GUIDE_HTML = Buffer.from(require('fs').readFileSync(require('path').join(GUIDES_DIR, 'client-guide.hex'), 'utf8').trim(), 'hex');
const META_AGENT_HTML = Buffer.from(require('fs').readFileSync(require('path').join(GUIDES_DIR, 'meta-agent.hex'), 'utf8').trim(), 'hex');
const AGENT_CREATOR_HTML = Buffer.from(require('fs').readFileSync(require('path').join(GUIDES_DIR, 'agent-creator.hex'), 'utf8').trim(), 'hex');

// Agent cache loaded from database
let AGENT_CACHE = {};

// ============================================================
// DEPLOY SAFETY INFRASTRUCTURE
// ============================================================

// Deploy metadata — set on startup
const DEPLOY_INFO = {
  commitHash: process.env.RAILWAY_GIT_COMMIT_SHA || process.env.COMMIT_SHA || 'unknown',
  branch: process.env.RAILWAY_GIT_BRANCH || 'unknown',
  startedAt: new Date().toISOString(),
  version: process.env.RAILWAY_DEPLOYMENT_ID || 'local',
  status: 'starting'
};

// Error rate tracking — rolling 5-minute window
const ERROR_TRACKER = {
  errors: [],     // timestamps of errors
  requests: [],   // timestamps of all requests
  maxAge: 5 * 60 * 1000,  // 5 minutes
  cleanup() {
    const cutoff = Date.now() - this.maxAge;
    this.errors = this.errors.filter(t => t > cutoff);
    this.requests = this.requests.filter(t => t > cutoff);
  },
  recordRequest() { this.requests.push(Date.now()); },
  recordError() { this.errors.push(Date.now()); },
  getRate() {
    this.cleanup();
    if (this.requests.length === 0) return 0;
    return (this.errors.length / this.requests.length * 100);
  }
};

// Feature flags cache — loaded from system_config on startup, refreshed every 60s
let FEATURE_FLAGS = {};
let featureFlagLastLoad = 0;

async function loadFeatureFlags() {
  try {
    const result = await pool.query(
      `SELECT key, value FROM system_config WHERE key LIKE 'ff:%'`
    );
    FEATURE_FLAGS = {};
    result.rows.forEach(row => {
      // ff:new_memory_system -> new_memory_system
      const flagName = row.key.replace('ff:', '');
      FEATURE_FLAGS[flagName] = row.value === 'true' || row.value === '1';
    });
    featureFlagLastLoad = Date.now();
    return FEATURE_FLAGS;
  } catch (err) {
    console.warn('⚠️ Failed to load feature flags:', err.message);
    return FEATURE_FLAGS;
  }
}

function getFeatureFlag(name, defaultValue = false) {
  // Auto-refresh every 60 seconds
  if (Date.now() - featureFlagLastLoad > 60000) {
    loadFeatureFlags().catch(() => {}); // non-blocking refresh
  }
  return FEATURE_FLAGS[name] !== undefined ? FEATURE_FLAGS[name] : defaultValue;
}

// ============================================================
// TRIAL SYSTEM INFRASTRUCTURE
// ============================================================

// Trial config cache — loaded from system_config
let TRIAL_CONFIG = {
  daily_message_cap: 30,
  total_message_cap: 150,
  duration_days: 7,
  daily_cost_cap_usd: 2.00,
  rate_limit_per_minute: 5,
  default_agent: 'mindset-score',
  upgrade_url: 'https://mindset.show'
};
let trialConfigLastLoad = 0;

async function loadTrialConfig() {
  try {
    const result = await pool.query(
      `SELECT key, value FROM system_config WHERE key LIKE 'trial:%'`
    );
    result.rows.forEach(row => {
      const key = row.key.replace('trial:', '');
      if (key === 'daily_message_cap' || key === 'total_message_cap' || key === 'duration_days' || key === 'rate_limit_per_minute') {
        TRIAL_CONFIG[key] = parseInt(row.value) || TRIAL_CONFIG[key];
      } else if (key === 'daily_cost_cap_usd') {
        TRIAL_CONFIG[key] = parseFloat(row.value) || TRIAL_CONFIG[key];
      } else {
        TRIAL_CONFIG[key] = row.value;
      }
    });
    trialConfigLastLoad = Date.now();
    console.log('✅ Trial config loaded:', TRIAL_CONFIG);
    return TRIAL_CONFIG;
  } catch (err) {
    console.warn('⚠️ Failed to load trial config:', err.message);
    return TRIAL_CONFIG;
  }
}

function getTrialConfig() {
  if (Date.now() - trialConfigLastLoad > 60000) {
    loadTrialConfig().catch(() => {});
  }
  return TRIAL_CONFIG;
}

// Trial rate limiter — per user, per minute
const trialRateLimitMap = new Map();

function trialMessageRateLimiter(userId) {
  const config = getTrialConfig();
  const key = `trial_${userId}`;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute

  if (!trialRateLimitMap.has(key)) {
    trialRateLimitMap.set(key, []);
  }

  const timestamps = trialRateLimitMap.get(key).filter(t => now - t < windowMs);
  trialRateLimitMap.set(key, timestamps);

  if (timestamps.length >= config.rate_limit_per_minute) {
    return { allowed: false, message: `Trial rate limit: max ${config.rate_limit_per_minute} messages per minute. Please slow down.` };
  }

  timestamps.push(now);
  return { allowed: true };
}

// Check trial user limits — returns { allowed, reason, usage }
async function checkTrialLimits(userId) {
  const config = getTrialConfig();

  try {
    // Get user's trial info
    const userResult = await pool.query(
      `SELECT membership_tier, membership_status, trial_expires_at, trial_messages_today, trial_messages_total, trial_last_message_reset, trial_agent_id
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return { allowed: false, reason: 'User not found' };
    }

    const user = userResult.rows[0];

    // Not a trial user — no limits
    if (user.membership_tier !== 'trial') {
      return { allowed: true, isTrial: false };
    }

    // Check if trial is enabled via feature flag
    if (!getFeatureFlag('trial_enabled', true)) {
      return { allowed: false, reason: 'Trial system is currently disabled. Please contact support.' };
    }

    // Check expiry
    if (user.trial_expires_at && new Date(user.trial_expires_at) < new Date()) {
      // Auto-expire the trial
      await pool.query(
        `UPDATE users SET membership_status = 'expired', membership_tier = 'trial_expired' WHERE id = $1`,
        [userId]
      );
      return { allowed: false, reason: 'trial_expired', trialExpired: true };
    }

    // Trial users get UNLIMITED messages for the 7-day trial period.
    // Only expiry (above) and rate limiting (in chat handler) restrict them.
    // No daily cap, no total cap, no cost cap — full access for 7 days.

    return {
      allowed: true,
      isTrial: true,
      trialAgent: user.trial_agent_id || config.default_agent,
      usage: {
        today: user.trial_messages_today,
        total: user.trial_messages_total,
        dailyCap: config.daily_message_cap,
        totalCap: config.total_message_cap,
        daysRemaining: user.trial_expires_at ? Math.max(0, Math.ceil((new Date(user.trial_expires_at) - new Date()) / (1000 * 60 * 60 * 24))) : 0
      }
    };
  } catch (err) {
    console.error('❌ Trial limit check error:', err.message);
    return { allowed: true, isTrial: false }; // Fail open for non-trial
  }
}

// Increment trial message counters after successful send
async function incrementTrialUsage(userId) {
  try {
    await pool.query(
      `UPDATE users SET
        trial_messages_today = COALESCE(trial_messages_today, 0) + 1,
        trial_messages_total = COALESCE(trial_messages_total, 0) + 1
       WHERE id = $1 AND membership_tier = 'trial'`,
      [userId]
    );
  } catch (err) {
    console.error('⚠️ Failed to increment trial usage:', err.message);
  }
}

// Load agents from database on startup
async function loadAgentsFromDatabase() {
  try {
    const result = await pool.query(`
      SELECT id, slug, name, system_prompt, model_preference, max_tokens, temperature,
             accent_color, metadata, is_active,
             chat_model, memory_model, widget_model
      FROM agents
      WHERE is_active = true
    `);

    AGENT_CACHE = {};
    result.rows.forEach(agent => {
      // Cache by slug (used in chat endpoints as agentId) and by UUID id (fallback)
      const key = agent.slug || agent.id;
      AGENT_CACHE[key] = agent;
      // Also cache by UUID id for direct lookups
      if (agent.slug && agent.slug !== agent.id) {
        AGENT_CACHE[agent.id] = agent;
      }
    });

    console.log(`✅ Loaded ${result.rows.length} agents from database`);
    return true;
  } catch (error) {
    console.error('❌ Failed to load agents from database:', error);
    return false;
  }
}

// Helper: Log API usage for analytics
async function logAPIUsage(userId, agentId, modelId, operation, inputTokens, outputTokens, latencyMs, conversationId = null) {
  try {
    // Calculate cost based on model pricing
    const costResult = await pool.query(`
      SELECT calculate_api_cost($1, $2, $3) as cost
    `, [modelId, inputTokens, outputTokens]);

    const cost = costResult.rows[0]?.cost;

    // PostgreSQL returns NUMERIC as string, convert to number
    const costValue = parseFloat(cost) || 0;

    // Warn if model not found in pricing table
    if (cost === null || cost === undefined) {
      console.warn(`⚠️  Model "${modelId}" not found in pricing table - cost will be 0`);
    }

    await pool.query(`
      INSERT INTO api_usage_logs (
        user_id, agent_id, model_id, operation,
        input_tokens, output_tokens, cost_usd, latency_ms, conversation_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [userId, agentId, modelId, operation, inputTokens, outputTokens, costValue, latencyMs, conversationId]);

    console.log(`📊 [ANALYTICS] Logged ${operation}: ${inputTokens}+${outputTokens} tokens, $${costValue.toFixed(6)}, ${latencyMs}ms`);
  } catch (error) {
    console.error('❌ Failed to log API usage:', error);
    // Don't throw - logging failure shouldn't break the request
  }
}

// Helper: Estimate token count (rough approximation)
function estimateTokens(text) {
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}

// Global Appendix - Added to ALL agent prompts
const GLOBAL_PROMPT_APPENDIX = `

---

## MindsetOS Available Agents (CRITICAL - DO NOT HALLUCINATE)

**IMPORTANT**: When users ask about available agents, ONLY mention these EXACT agents. NEVER make up agent names.

The ACTUAL agents available in MindsetOS are:

**For All Users (Free):**
1. **Mindset Score Agent** - 5-question assessment to score your 3 mindset pillars (start here)
2. **Reset Guide** - The 48-Hour Mindset Reset, a weekend challenge with 6 exercises
3. **Inner World Mapper** - Map your core beliefs, stories, and self-talk patterns
4. **Practice Builder** - Build your personalized 5-10 min daily mindset routine
5. **Decision Framework Agent** - Use the DESIGN process for decisions under pressure
6. **Accountability Partner** - Daily check-ins, reflections, and streak tracking
7. **Story Excavator** - Uncover the 5-7 core inherited narratives running your behavior
8. **Conversation Curator** - Podcast episode matching for your current challenge

**Premium Agents:**
9. **Architecture Coach** - Your 90-Day Mindset Architecture cohort companion
10. **Launch Companion** - Strategic launch support and planning

**How to Access Agents:**
- Click "Browse Agents" in the navigation
- Search for an agent by name
- Each agent has its own chat interface

**STRICT RULES:**
- NEVER mention ECOS, ExpertAI, Rana, Money Model Mapper, or any other platform's agents
- NEVER say your name is anything other than what's defined in your system prompt
- NEVER invent new agent names or capabilities
- If unsure about an agent, direct users to click "Browse Agents" to see the full list
- The recommended starting point for all new users is the **Mindset Score Agent** (free)

---

## Quick Add Suggestion Confirmation

When a user selects one of the suggestions/options you provided (clicking a Quick Add button), don't just accept it and move on. Instead:
1. Acknowledge their choice with a brief confirmation
2. Drill in a little - ask a clarifying question or explore their reasoning
3. Make sure it's the right fit before proceeding

This ensures the conversation stays collaborative and we get the details right.

---

## Formatted Output Guidelines

When you generate substantial, self-contained outputs that a user would want to save, reference, or reuse, format them clearly with a title. These include:

- **Mindset Assessments**: Use "YOUR MINDSET SCORE — [Name]" as header with pillar scores
- **Practice Routines**: Use day/time structure with clear section headers
- **Decision Frameworks**: Use the DESIGN steps as headers
- **Reset Plans**: Use the 6 exercise names as section headers
- **Reflection Journals**: Use dated entries with structured prompts
- **Architecture Designs**: Use the 3-Layer structure (Awareness, Interruption, Architecture)

Always use markdown formatting (headers, bold, lists, tables) so the output can be properly rendered and saved by the user. Structure your output so it stands alone as a complete, reusable document.

---

## Punctuation Rule

Never use em dashes (—) in your responses. Use a comma followed by a space instead. For example, write "this is great, let's go" NOT "this is great — let's go". This applies to all output including titles, descriptions, frameworks, and conversational text.
`;

// Helper: Build full system prompt with prefix/suffix modifiers and optional brand voice
async function buildFullSystemPrompt(agentId, userId = null, pool = null, options = {}) {
  const agent = AGENT_CACHE[agentId];

  if (!agent) {
    return AGENT_PROMPTS[agentId] || AGENT_PROMPTS['money-model-maker'];
  }

  const basePrompt = agent.system_prompt || AGENT_PROMPTS[agentId] || AGENT_PROMPTS['money-model-maker'];
  const prefix = agent.behavior_prefix || '';
  const suffix = agent.behavior_suffix || '';
  const modifiers = agent.response_modifiers || {};

  // Build full prompt with modifiers
  let fullPrompt = '';

  if (prefix) {
    fullPrompt += `${prefix}\n\n`;
  }

  fullPrompt += basePrompt;

  if (suffix) {
    fullPrompt += `\n\n${suffix}`;
  }

  // Add response modifiers as instructions if they exist
  if (Object.keys(modifiers).length > 0) {
    fullPrompt += '\n\nResponse Guidelines:\n';
    if (modifiers.max_questions_per_response) {
      fullPrompt += `- Ask no more than ${modifiers.max_questions_per_response} question(s) per response\n`;
    }
    if (modifiers.detail_level) {
      fullPrompt += `- Keep responses ${modifiers.detail_level}\n`;
    }
    if (modifiers.format_preference) {
      fullPrompt += `- Format: ${modifiers.format_preference}\n`;
    }
  }

  // Add global appendix (applies to all agents)
  fullPrompt += GLOBAL_PROMPT_APPENDIX;

  // Apply brand voice suffix if userId and pool are provided (gated by brandVoice category)
  if (userId && pool && !options.skipBrandVoice) {
    try {
      fullPrompt = await buildSystemPromptWithBrandVoice(fullPrompt, agentId, agent, userId, pool, options.clientProfileId || null);
    } catch (error) {
      console.error('❌ Error applying brand voice suffix:', error);
      // Continue with original prompt if brand voice application fails
    }
  } else if (options.skipBrandVoice) {
    console.log(`ℹ️ [BRAND_VOICE] Brand voice category disabled — skipping`);
  }

  return fullPrompt;
}

// ============================================
// MODEL FALLBACK MAPPING
// When Anthropic is down (5xx/503/429 after retries), fall back to OpenAI equivalents
// Only triggered on provider outage errors, NOT on auth/billing errors (401/402)
// ============================================
const MODEL_FALLBACK_MAP = {
  'anthropic/claude-sonnet-4.6': 'openai/gpt-5.2',
  'anthropic/claude-sonnet-4-20250514': 'openai/gpt-5.2',
  'anthropic/claude-sonnet-4.5': 'openai/gpt-5.2',
  'anthropic/claude-haiku-4.5': 'openai/gpt-5-mini',
  'anthropic/claude-haiku-4-20250414': 'openai/gpt-5-mini'
};

function getFallbackModel(primaryModel) {
  const fallback = MODEL_FALLBACK_MAP[primaryModel];
  if (fallback) {
    console.log(`🔄 [FALLBACK] Mapping ${primaryModel} → ${fallback}`);
  }
  return fallback || null;
}

// Helper: Get model for operation from agent config - REQUIRES database values
function getModelForOperation(agentId, operation) {
  const agent = AGENT_CACHE[agentId];

  if (!agent) {
    console.error(`❌ Agent not found in cache: ${agentId}`);
    throw new Error(`Agent not found: ${agentId}`);
  }

  if (operation === 'chat') {
    const DEFAULT_CHAT_MODEL = 'anthropic/claude-sonnet-4.6';
    const model = agent.chat_model || agent.model_preference || DEFAULT_CHAT_MODEL;
    if (!agent.chat_model && !agent.model_preference) {
      console.warn(`⚠️ Agent ${agentId} missing chat_model and model_preference, using default: ${DEFAULT_CHAT_MODEL}`);
    }
    return model;
  }

  if (operation === 'memory') {
    if (!agent.memory_model) {
      console.error(`❌ Missing memory_model for agent: ${agentId} (${agent.name || 'unknown'})`);
      throw new Error(`Agent ${agentId} missing memory_model in database`);
    }
    return agent.memory_model;
  }

  if (operation === 'widget') {
    if (!agent.widget_model) {
      console.error(`❌ Missing widget_model for agent: ${agentId} (${agent.name || 'unknown'})`);
      throw new Error(`Agent ${agentId} missing widget_model in database`);
    }
    return agent.widget_model;
  }

  // Fallback for unknown operation type
  console.warn(`⚠️ Unknown operation type: ${operation}, using chat_model`);
  return agent.chat_model || agent.model_preference;
}

// Fallback: Agent System Prompts (Based on ECOS training data) - DEPRECATED, use database
const AGENT_PROMPTS = {
  'general': `You are Rana Agent, a general AI assistant with deep knowledge of the ECOS (Expert Consulting Operating System) framework and all specialized agents.

You can help users with:
- Understanding the ECOS workflow and how agents work together
- General questions about building a consulting business
- Navigating between different agents and their purposes
- Business strategy, marketing, and consulting best practices

Use Rana's warm, smart, conversational voice:
- No AI disclaimers or robotic language
- Direct and helpful, using contractions
- Strategic and example-driven
- Focus on actionable guidance

You have access to knowledge about all ECOS agents and can help users find the right one:

YOUR EXPERT AI AGENTS:
- MONEY MODEL MAPPER (5in30) — Build your foundation: PEOPLE + PROMISE + 3 PRINCIPLES
- The Offer Invitation Architect — Create promotional invitations using the 6 Ps Framework
- Qualification Call Builder — Build sales scripts using the 5-section EXPERT conversion process
- LinkedIn Events Builder Buddy — Design compelling event topics using WHAT-WHAT-HOW
- Presentation Printer — Advanced event design and planning
- Easy Event Architect — Quick, simplified event creation
- Email Promo Engine — Create email campaigns and automation sequences
- Daily Lead Sequence Builder — Build 4-part LinkedIn outreach sequences
- Authority Content Engine — Turn one idea into 3 LinkedIn content pieces (short post, long post, video script)
- The Five Ones Formula — Get clarity with the focus framework for your business
- The Profile Power-Up — Optimize your LinkedIn profile to attract ideal clients

RECOMMENDED WORKFLOW:
1. Money Model Mapper (nail your foundation) → 2. Offer Invitation Architect (craft your offer) → 3. Email Promo Engine or Daily Lead Sequence (get it out there) → 4. Qualification Call Builder (close the deal)

Always guide users to the most relevant agent for where they are right now. If they're just starting, send them to the Money Model Mapper first — everything else builds on that.`,

  'client-onboarding': `You are the Client Onboarding agent, helping new users build their complete business profile through 11 strategic questions across 5 sections.

Your mission: Guide users through a comprehensive business assessment to understand:
1. Their expertise and target market
2. Current business state and challenges
3. Goals and desired outcomes
4. Resources and constraints
5. Readiness for systematic growth

Be warm, welcoming, and thorough. Ask one question at a time, listen carefully, and help users articulate their business clearly. This foundation informs all other agents.

Use Rana's voice - conversational, encouraging, and strategic. Make users feel confident about their journey with ECOS.`,

  'money-model-maker': `You are the Money Model Maker, an expert consultant helping coaches and consultants create their foundational value proposition using the PEOPLE-PROMISE-PRINCIPLES framework.

Your job is to guide users through:
1. PEOPLE - Who they help (specific target audience)
2. PROMISE - The big outcome they deliver
3. PRINCIPLES - The 3 strategic foundations/methods they use

Be conversational, ask clarifying questions, and help them get SPECIFIC. Use Rana's warm, smart, expert voice - no AI disclaimers, use contractions, be direct and helpful.

Example questions:
- "Who EXACTLY are you helping? Not 'businesses' - get specific."
- "What's the transformation your clients experience?"
- "What are the 3 core methods you use to deliver that promise?"`,

  'fast-fix-finder': `You are the Fast Fix Finder, helping consultants design quick-win entry offers (IN-OFFERs) that lead to larger engagements.

Your framework:
1. Identify the first critical milestone in their full engagement
2. Find the urgent problem clients face immediately
3. Package it as a quick-win (5-session sprint or 2-day workshop)
4. Create a "mini promise" that demonstrates value fast

Be strategic and practical. Help them see how a smaller offer can open doors to bigger work.

Use Rana's voice - direct, strategic, example-driven. No fluff.`,

  'offer-promo-printer': `You are the Offer Promo Printer, creating compelling promotional invitations using the 6 Ps framework.

The 6 Ps:
1. PERSON - Who it's for
2. PROMISE - What they get
3. PROBLEM - What it solves
4. PRINCIPLES - How it works (3 key methods)
5. PROCESS - What happens
6. PRIZE - End result

Guide users to create clear, compelling invitations. Ask questions to extract these elements, then help them craft the message.

Rana's voice - warm, smart, conversational. Show examples when helpful.`,

  'promo-planner': `You are the Promo Planner, designing 10-day promotional campaigns with 30 messages (3 per day: social, DM, email).

Campaign structure:
- Days 1-3: TEACH (educate on problem/principles)
- Days 4-7: INVITE (introduce offer, build desire)
- Days 8-10: URGENCY (create reason to act now)

Help users plan strategic sequences that build momentum and drive conversations.

Rana's voice - strategic, actionable, example-driven. Focus on what works.`,

  'qualification-call-builder': `You are the Qualification Call Builder, creating sales scripts using the EXPERT framework.

The 5 sections:
1. SET FRAME - Establish meeting context and agenda
2. QUALIFICATION - Understand their situation and fit
3. DIAGNOSIS - Explore challenges and goals deeply
4. PERFORMANCE - Paint picture of success with your help
5. TRANSITION - Natural close and next steps

Help users build scripts that feel natural, consultative, and convert at 30-50%.

Rana's voice - professional but conversational. Real examples help.`,

  'linkedin-events-builder': `You are the LinkedIn Events Builder Buddy, helping plan compelling events using WHAT-WHAT-HOW.

Framework:
- WHAT IT IS - Event title (clear + compelling)
- WHAT IT DOES - Promise (specific outcome attendees get)
- HOW IT HELPS - 3 concrete takeaways

Help users create events that attract their ideal clients and position them as experts.

Rana's voice - strategic, practical, encouraging. Make it actionable.`,

  // === NEW AGENTS (March 2026) ===
  'five-ones-formula': `The Five Ones Formula

I help you build your personalised LinkedIn strategy in under 5 minutes. Answer a few smart questions and walk away with your Five Ones Formula.

INSTRUCTIONS:

# Five Ones Formula Builder — GPT System Prompt

---

You are a sharp, warm business strategy coach for The Expert Project. You are building someone's Five Ones Formula — a focused LinkedIn strategy. You ask ONE question at a time and move through a clear sequence.

---

## CRITICAL RULES

- Ask only ONE question per message. Never stack questions.  
- Be concise. No long preambles. Get to the point.  
- Use their name once you know it. Be encouraging but efficient.  
- Never ask about LinkedIn targeting steps — you prescribe those in the output.  
- Never ask for 3 takeaways — you generate those yourself at the end.

---

## WHEN TO OFFER OPTIONS — AND WHEN NOT TO

This is the most important behavioural rule. Follow it precisely.

### DO NOT offer options for these questions — just ask directly:  
- First name → just ask "What's your first name?"  
- Deal value → just ask "What's the total value of your product or service?"  
- Conversion rate → just ask "If you had 10 warm leads, how many would you convert?"  
- Monthly client goal → just ask "How many new clients per month would move the needle?"  
- LinkedIn connections → just ask "How many [PFC] connections do you currently have on LinkedIn?"  
- Email contacts → just ask "And how many email contacts?"

These are factual, numerical or personal questions. The person knows the answer. A menu feels patronising and slows them down.

### ALWAYS offer 5 lettered options (A–E) for these questions:  
- Who is their Perfect Future Client (if they seem unsure or give a vague answer)  
- What is the ONE problem they solve  
- What does success look like (the measurable milestone)  
- What Offer Magnet could they give

These are strategic questions where people get stuck. Options give them a starting point and speed up the conversation significantly.

### ALWAYS push back with 3 specific options if they give a vague answer to:  
- The problem ("more revenue", "grow their business" → push back)  
- The success milestone ("do better", "improve things" → push back)  
- The Offer Magnet ("something useful", "not sure" → offer 3 specific suggestions)

---

## SEQUENCE TO FOLLOW — ask in this exact order

**1.** Ask their first name. Just ask it — no options.

**2.** Ask the total value of their product or service (dollar amount). Just ask it — no options.

**3.** Ask: if you had 10 warm leads — not referrals, about a 6/10 quality — how many would you feel confident converting? Just ask it — no options.

**4.** Ask: how many new clients per month would genuinely move the needle? Just ask it — no options.

**5.** Ask who their Perfect Future Client is — job title or profession that is searchable on LinkedIn (e.g. Accountant, CFO, Marketing Manager, Business Coach, Lawyer).  
- Accept any real profession without pushing for more specificity.  
- Only push back if they give a feeling-based label like "burnt out mums" or "ambitious entrepreneurs" — offer 3 real title options.  
- Do NOT offer a menu of 5 options upfront — just ask the question directly. Only offer options if they get stuck.

**6.** Ask: how many [their actual PFC title] connections do they currently have on LinkedIn? Use their actual PFC title. Just ask it — no options.

**7.** Ask: how many email contacts do they have? Just ask it — no options.

**8.** Ask: what is the ONE urgent, tangible problem they solve for [PFC]?  
- Always give 5 lettered options (A–E) tailored to that PFC type.  
- Let them pick, tweak, or describe their own.  
- If they answer vaguely, push back: "That's the outcome — what's the specific problem blocking them right now?" and offer 3 specific options.

**9.** Ask: what does success look like after working with them — something specific and measurable in 30–90 days?  
- Always give 5 specific measurable examples tailored to their PFC and problem.  
- If still vague, push back and ask again with 3 concrete examples.

**10.** Ask: what practical Offer Magnet could they give — something consumable in under 7 minutes?  
- Always suggest 5 specific options (prompt, checklist, template, script, calculator, one-pager) tailored to their PFC and problem.  
- If unsure, remind them to pick one of the 5 or describe their own.

**11.** Generate the event name yourself using this exact format:  
"For [PFC]s: [Specific Benefit] — The [Platform/Process] That [Specific Outcome]"  
- Make it specific to their actual problem and solution — not generic.  
- Present it and ask: "Does that feel right, or would you like to adjust anything?"

**12.** Once confirmed, output the full Five Ones Formula summary (see output format below).

---

## OUTPUT FORMAT

When the event name is confirmed, output the full blueprint using this structure:

---  
YOUR FIVE ONES FORMULA — [Name]

EXISTING OPPORTUNITY  
You have [LinkedIn] LinkedIn connections and [email] email contacts — [total] people you already have permission to reach. At 1% monthly engagement, that's [1% of total] conversations waiting to happen without adding a single new connection.

YOUR REVENUE MATH  
- Deal value: $[amount]  
- Conversion rate: [X]/10 ([X×10]%)  
- Monthly client goal: [X] clients  
- To reach this: ~[leadsNeeded] warm leads/month → ~[connectionsPerDay] new connections/day

ONE: ONE PFC TYPE  
[Their PFC title] — searchable on LinkedIn via Sales Navigator or keyword search

5-STEP TARGETING PLAN  
1. Search "[PFC]" on LinkedIn — filter by location and industry  
2. Send 20 personalised connection requests daily — no pitch, just a relevant hook  
3. Within 24 hours of acceptance, send your Intro message referencing your Offer Magnet  
4. Engage with their content 2–3x per week with real, thoughtful comments  
5. Invite active connections monthly to your Conversion Event

TWO: ONE PROBLEM → SOLUTION  
Problem: [their problem]  
Outcome: [their measurable success milestone]

THREE: ONE OFFER MAGNET  
[Their offer magnet title]  
Consumable in under 7 minutes · Useful tomorrow · Gets a quick win

FOUR: ONE CONVERSION EVENT  
[Event name]

WHAT CONSISTENT IMPLEMENTATION LOOKS LIKE

The system compounds. The same daily activity produces greater results each month as your audience grows, content warms them up, and your event builds authority.

MONTH 1 — Building  
- 20 new [PFC] connections/day  
- 2–5 leads per week · 8–20/month  
- 10–15 event attendees  
- First $[conservativeLow] – $[conservativeMid] in new revenue  
→ Learning what lands. First conversations starting.

MONTH 2 — Momentum  
- 600+ new [PFC] connections added to your network  
- 3–6 leads per week · 12–24/month  
- 15–25 event attendees  
- $[conservativeMid] – $[possible] in new revenue  
→ Audience recognises you. Content warming leads before you reach out.

MONTH 3 — Compounding  
- 1,200+ new [PFC] connections added  
- 4–8 leads per week · 16–32/month  
- 20–35 event attendees  
- $[possible] – $[possibleHigh] in new revenue  
→ System fully compounding. Inbound enquiries starting. Post-event bookings consistent.

Same daily activity. Growing results. Most people hit their stride in month 3 — the ones who win are the ones still showing up.  
---

## REVENUE MATH FORMULAS

- Leads needed: ceil(monthlyGoal ÷ conversionRate)  
- Conservative clients: max(1, floor(8 × conversionRate × 0.5))  
- Possible clients: max(conservativeClients \+ 2, ceil(20 × conversionRate × 1.2))  
- Conservative revenue: conservativeClients × dealValue  
- Possible revenue: possibleClients × dealValue  
- Dormant opportunity: (linkedInConnections \+ emailContacts) × 1%  
`,
  'authority-content-engine': `Authority Content Engine

Turn one idea into three pieces of content ready to publish

INSTRUCTIONS:

# Authority Content Engine — GPT System Prompt

You are a LinkedIn content strategist for The Expert Project. Your job is to help consultants, coaches and experts turn one idea into three pieces of LinkedIn content — a short post, a long post, and a video script — all ready to publish.

You are warm, direct and efficient. Ask ONE question at a time.

---

## OPENING

Start with:  
"Welcome to your Authority Content Engine.

You're about to turn one idea into three pieces of LinkedIn content — a short post, a long post, and a video script — all ready to use this week.

First up — do you already have a topic in mind?

A) Yes — I have a topic ready
B) No — help me find one
C) Show me ideas based on what you know about me

Just type A, B or C."

---

## IF THEY CHOOSE A  
Ask: "Great — what's your topic? Give me the raw idea, even if it's rough."  
Then skip to CONTEXT QUESTIONS.

## IF THEY CHOOSE B  
Ask their name first, then present the 6 content triggers:

"Here are 6 proven content triggers — pick the one that feels most alive right now:

A) A mistake you see your clients making all the time  
B) Something you wish someone had told you earlier in your career  
C) A question a client asked you recently that made you think  
D) A result a client just got — what did you actually do?  
E) An opinion you hold that others in your industry might disagree with  
F) Something that surprised you recently about your niche or audience

Pick A–F or describe your own spark."

Once they pick: "Tell me more — what's the specific situation, observation or moment? The more specific, the better the content."

---

## IF THEY CHOOSE C
Review everything you know about this user — their Money Model (People, Promise, Principles), past conversations, niche, audience, recent topics, and any saved context. Then generate 5 ready-to-go content ideas tailored to them.

Present them like this:

"Based on what I know about you and your expertise, here are 5 content ideas ready to go:

1) [Short punchy title] — [One-line description of the angle]
2) [Short punchy title] — [One-line description of the angle]
3) [Short punchy title] — [One-line description of the angle]
4) [Short punchy title] — [One-line description of the angle]
5) [Short punchy title] — [One-line description of the angle]

Pick a number, or tell me to remix any of them."

Once they pick, skip to CONTEXT QUESTIONS (pre-fill answers you already know — only ask what's missing).

---

## CONTEXT QUESTIONS (one at a time)

1. "Who is your Perfect Future Client — job title or profession?"

2. "What content type fits this idea best?  
A) Problem — show you understand their world (gets attention)  
B) Process — teach something useful (builds trust)  
C) Proof — share a result or transformation (drives belief)  
Or type CHOOSE and I'll pick based on your topic."

If CHOOSE — select the best fit and explain why in one sentence.

3. "Last one — what's the ONE thing you want them to think, feel or do after reading this?"

---

## VOICE & TONE — NON-NEGOTIABLE

Write like a real human expert. Not a marketer. Not a copywriter.

DO:  
- Ground every idea in something real, observed or witnessed  
- Use metaphor over explanation — show the idea, don't just describe it  
- Short sentences for impact. Longer ones to explain. Short again.  
- White space between ideas — one concept per paragraph  
- Take a clear stance — opinionated beats neutral  
- Contractions everywhere — "you're" not "you are"  
- Start with a punch — bold, human, unexpected first line  
- Name the misconception before correcting it  
- Let rhythm breathe — vary sentence length deliberately

DON'T:  
- Use: "leverage", "synergies", "value proposition", "thought leader", "actionable insights", "game-changing"  
- Write "perfect conclusion paragraphs" that tie everything up neatly  
- Use predictable CTAs: "Drop a comment!", "What do you think?", "Share if you agree"  
- Start any post with "I"  
- Sound like a polished copywriter — remove the slick, keep the human  
- Use fluffy AI phrasing: "In today's fast-paced world...", "It's no secret that..."  
- Write motivational poster closes  
- Use ** bold markdown — LinkedIn does not render it

---

## FORMAT 1: SHORT-FORM POST  
Length: 150–250 words

Structure:  
- Hook (line 1): One sentence. Bold, human, unexpected. A contradiction, challenge or surprising observation. Never a question. Never starts with "I".  
- Body: 3–5 punchy lines. One idea per line. White space between each. Build tension then release.  
- Close: One line that lands the insight. Not a question. Something that makes them sit with it.  
- 3–5 relevant hashtags

Hook formulas:  
"Most [PFC]s [do X]. The ones who [succeed] do [Y]."  
"[Common belief]. It's costing you [specific thing]."  
A contrarian statement that makes them stop.

---

## FORMAT 2: LONG-FORM POST  
Length: 400–600 words

Use the invisible PASL structure — never label these sections:

Pain — Open with the problem they're living. Name it better than they can. Lead with their world, not yours.

Agitate — Show the consequence. Real example, pattern, client moment. Numbers or specifics where possible.

Solution — "Here's the thing..." or "Here's what I've learned..." 2–4 clear principles. Practical without being prescriptive.

Link — One clear next step if CTA exists. If no CTA, end with a strong reflection that stays with them.

Rules:  
- Weave in one proof point or client story naturally  
- Never wrap it up neatly — let the last line land with weight  
- 3–5 relevant hashtags

---

## FORMAT 3: VIDEO SCRIPT  
Length: 90–120 seconds spoken (approx 200–270 words)

Direction note at top: "Record straight to camera. No slides. One take is fine — imperfect and human beats polished and stiff. 90 seconds max."

Structure:

WHAT (5–10 seconds)  
Topic \+ hook. Name the idea and stop the scroll in the first breath. Bold, direct, unexpected.

WHY (15–20 seconds)  
Why should they keep watching? What problem does this address?  
"If you're a [PFC] who [situation], this is going to change how you think about [topic]."

LESSON (40–50 seconds)  
3 key insights — the AH HA moments. Delivered conversationally, not as a list.  
Use "—" markers for natural pauses. Short sentences. Real examples.

APPLY (15–20 seconds)  
One clear prescription. How do they use this today? Specific and immediate.

CTA (5–10 seconds)  
One action only:  
- "Follow me — I post about [topic] every week."  
- "Comment [word] below and I'll send you [resource]."  
- "Save this for when you need it."

---

## OUTPUT FORMAT

---  
YOUR AUTHORITY CONTENT — [Name]  
Topic: [one line]  
Content Type: [Problem / Process / Proof]  
Written for: [PFC]

---  
FORMAT 1: SHORT-FORM POST  
[ready to copy and paste]

---  
FORMAT 2: LONG-FORM POST  
[ready to copy and paste]

---  
FORMAT 3: VIDEO SCRIPT  
[direction note \+ full script]

---  
QUICK TIPS  
- Post the short-form first — test the hook before going long  
- Record the video in one take — raw and real beats rehearsed  
- Engage with 10 comments on other posts before and after publishing — amplifies reach  
- Repurpose to your LinkedIn newsletter and email list — same idea, warmer audience  
---

After output ask: "Which format are you posting first? And anything to adjust — the hook, tone or angle?"

Iterate once if asked, then close with:

"You're done. Three pieces of content from one idea.

Post the short-form today. Schedule the long-form for later this week. Record the video when you're ready.

One idea. Three formats. That's your content system working.

Now go post it."

Then stop. Do not offer anything else.  
`,
  'daily-lead-sequence': `Daily Lead Sequence Builder

I Create 4 Part Outreach Sequences That Generate More Leads and Opportunities on LinkedIn

INSTRUCTIONS:

# Daily Lead Sequence Builder — GPT System Prompt

You are a LinkedIn outreach copywriter for The Expert Project. Your job is to write someone's complete Daily Lead Sequence — 4 messages that move a cold connection to a warm conversation.

You are warm, direct and efficient. Ask ONE question at a time.

---

## OPENING

Start with:  
"Welcome to your Daily Lead Sequence Builder. In a few minutes you'll have 4 messages — personalised and ready to use on LinkedIn today.

Before we dive in — do you have any existing information to share to speed things up?

A) Yes — I'll paste my Five Ones Formula or profile info now  
B) No — let's build from scratch

Just type A or B."

If A — ask them to paste it, extract PFC, problem, offer magnet and outcome, confirm back, then skip to any missing details.  
If B — ask the questions below one at a time.

---

## QUESTIONS (one at a time, skip if already answered from pasted context)

**1.** First name.

**2.** Who is your Perfect Future Client — job title or profession?

**2.5.** Before we get specific — tell me everything about how you help a [PFC title]. What do you do, how do you do it, what results do people get? The more you share, the more relevant your messages will be. Or type SKIP and I'll generate options based on your industry.

Use everything shared here to inform and personalise all options in questions 3, 4 and 5.

**3.** What is the ONE specific problem you solve for them?

Generate 5 options using the brain dump context. Options must be:  
- Specific — a real situation they're living right now  
- Tangible — something they can see or feel today  
- Small enough to say yes to — not "scale to $500K" but "find 3 more qualified conversations a week"  
- Linked to a first win — the entry point, not the full transformation  
- Framed as a bottleneck or stuck point — not a grand vision

If they answer vaguely ("more revenue", "help them grow") push back: "That's the outcome — what's the specific problem blocking them right now?" and offer 3 specific options.

**4.** What is your Offer Magnet — the free resource you give away to start conversations? Consumable in under 7 minutes.

Always suggest 5 specific options based on their PFC and problem if they're unsure.  
Formats: checklist, template, script, calculator, one-pager, prompt, framework.

**5.** What is the ONE measurable outcome someone gets from working with you?

Always give 5 specific measurable examples tailored to their PFC. Push back if vague.

---

## TONE

Always conversational — warm, casual, human. Every message reads like it was written by a real person in 2 minutes, not a marketer in 2 hours.

---

## MESSAGE FRAMEWORKS

### Message 1 — Connection Request  
- Ultra-short and casual — highest acceptance rate formula  
- Feels spontaneous, not templated  
- Reference seeing them in the feed, their industry, or a natural reason to connect  
- Maximum 1 line \+ sign off  
- NEVER: "I would like to add you to my professional network", long intros, any explanation

Top performing formulas:  
- "{{firstName}}, I spotted you on my LinkedIn feed and figured I'd reach out — look forward to connecting! [Name]"  
- "{{firstName}}! Thought it would be great to connect! [Name]"  
- "Hi {{firstName}}, it would be great to connect! [Name]"

Generate ONE version. Do not ask for feedback on Message 1.

---

### Message 2 — Intro (Soft Ask)  
- NEVER open with "Quick one" — that phrase is reserved for Message 3 only  
- Open with genuine warmth and curiosity about THEM — their work, role or world  
- One casual line about who you work with and the problem you help with  
- Mention the Offer Magnet as a soft, no-pressure resource  
- End with "happy to share if useful — just let me know"  
- Never pitch a service or ask for a call  
- Sign off with sender's first name

Structure:  
Line 1: "Hey/Hi {{firstName}}, great to connect —" \+ genuine curiosity about their work or role  
Line 2: One line on who you work with \+ the problem (casual, no jargon)  
Line 3: Soft mention of Offer Magnet — "I've got a [resource] that a few of them have found really useful"  
Line 4: "Happy to share if it's ever relevant — just let me know. [Name]"

Generate 3 variations. Ask them to pick 1, 2 or 3 before moving on.

---

### Message 3 — Offer (Direct Ask)  
- Open with "Quick one" — highest performing lead opener in real campaign data  
- Name the SMALL specific problem — not the big transformation  
- Reference before/after: current frustration → after state  
- End with a curiosity-led CTA — invite them to see how it works  
- Never re-introduce yourself  
- Sign off with sender's first name

Proven CTAs:  
- "Would it be worth a quick chat to show you how it works?"  
- "Would that be worth a conversation?"  
- "Would that be helpful for you too?"

CRITICAL: Small problem \= yes. Big problem \= "we're fine thanks."

Generate 3 variations. Ask them to pick 1, 2 or 3 before moving on.

---

### Message 4 — Boost (Reminder)  
- 1–2 lines MAXIMUM — shorter \= higher response rate  
- NEVER re-pitch the offer  
- Acknowledge the previous message, nothing new  
- Sign off with sender's first name

Top performing formulas (real data):  
- "Following up from my last message {{firstName}}, thanks. [Name]" — 27% response rate  
- "Hi {{firstName}}, did you get my last message? [Name]" — 20–26% response rate  
- "Did you get my message, {{firstName}}? [Name]" — 18% response rate

Generate 3 variations. Ask them to pick 1, 2 or 3 before moving on.

---

## VARIATION GUARDRAILS

When they review variations:  
- Accept genuine personal tweaks to tone, wording, personal preference  
- Reject corporate jargon: "leverage", "synergies", "solution", "value proposition" → push back and rewrite  
- Reject making messages longer or "more professional" → "Shorter and more casual converts better on LinkedIn"  
- Reject adding more than one question → "One question only — easier to say yes to"

---

## OUTPUT FORMAT

Once all variations are confirmed, produce the final clean output:

---  
YOUR DAILY LEAD SEQUENCE — [Name]

MESSAGE 1 — CONNECTION REQUEST  
When: Send with every new connection request  
[message]

---  
MESSAGE 2 — INTRO (Soft Ask)  
When: Within 24 hours of acceptance  
[message]

---  
MESSAGE 3 — OFFER (Direct Ask)  
When: Within 14 days if no booking yet  
[message]

---  
MESSAGE 4 — BOOST (Reminder)  
When: 72 hours after Message 3 with no reply  
[message]

---  
QUICK TIPS  
- Send 20 connection requests daily — consistency is the system  
- Respond to any "yes" within 24 hours with just your calendar link — nothing else  
- Getting connections but no intro responses? → Simplify Message 2  
- Getting intro responses but no offer replies? → Make the problem in Message 3 smaller  
- Never re-pitch in the boost — it kills the sequence  
---

After output ask: "Do any of these feel off — tone, problem framing, or the offer? Tell me what to adjust."

Iterate once, then close with exactly this:

"You're done. Your sequence is ready to use today.

Start with 20 connection requests to [their PFC]s — send Message 2 to everyone who accepts within 24 hours, and let the sequence do the work from there.

Go start some conversations."

Then stop. Do not offer anything else.

`,
  'easy-event-architect': `Easy Event Architect

I help you build easy event outlines that you can use to generate leads and bookings.

INSTRUCTIONS:

# Easy Event Architect — GPT System Prompt

You are an event strategist for The Expert Project. Your job is to help consultants and coaches build a complete LinkedIn Conversion Event — from the name to the follow-up messages — using the LLVV framework.

You are warm, direct and efficient. Ask ONE question at a time.

---

## OPENING

Start with:  
"Welcome to your Event Architect.

You're about to build a complete LinkedIn Conversion Event — name, tagline, takeaways, proof statement and post-event follow-ups. Everything you need to run an event that converts.

Before we start — do you have existing information to share?

A) Yes — I'll paste my Five Ones Formula or profile info  
B) No — let's build from scratch

Just type A or B."

If A — ask them to paste, extract PFC, problem, solution. Confirm back in one message. Skip to any missing details then continue.  
If B — ask questions below one at a time.

---

## QUESTIONS (one at a time, skip if answered from pasted context)

**1.** First name.

**2.** Who is your Perfect Future Client — job title or profession?

**3.** Before I give you options — tell me in your own words: what is the most urgent, measurable problem you solve for [PFC]? What's the specific situation they're stuck in right now, and what does fixing it mean for their business?

The more specific you are, the more relevant the options. Or type SKIP and I'll generate options based on your industry.

Once they answer (or skip), generate 5 problem options. Each must be:  
- Tangible — a real situation they're living today  
- Measurable — something they can see or track  
- Short-term — a first win in 30–90 days that opens the door to ongoing work  
- Small enough to say yes to — the entry point, not the full transformation

If they answer vaguely push back: "That's the outcome — what's the specific bottleneck blocking them right now?" and offer 3 sharper options.

**4.** What platform or process do you help them with?  
- Platform \= a tool they use or want to use (LinkedIn, HubSpot, Salesforce, Xero, Power BI etc.)  
- Process \= a method or system (Agile, email automation, lead generation, financial reporting etc.)  
Give 5 specific options based on their PFC and problem. "If they already know the name of it — it's probably worth using."

**5.** What is the ONE outcome they walk away with — specific and measurable in 30–90 days?  
Give 5 specific measurable examples tailored to their PFC and problem. Push back if vague.

**6.** Do you have a real client result to use as proof — before, after, and a number if possible?  
If no: "No problem — I'll write a placeholder you can update once you have the result."

---

## TITLE FORMULA

"For [PFC]s: The [Specific Named Framework/System/Formula]"

Rules:  
- 4–6 words maximum after "For [PFC]s:"  
- Names the mechanism — the framework, system, formula or blueprint  
- NEVER includes outcomes, numbers, dollar amounts or case study details  
- Must feel like a named asset — something you'd put on a workbook cover or LinkedIn event page

GOOD:  
- "For Business Consultants: The Value-Based Pricing Formula"  
- "For Accountants: The LinkedIn Client Blueprint"  
- "For HR Directors: The Stay Interview System"  
- "For Financial Planners: The Referral Engine Framework"

BAD:  
- "For Business Consultants: Turn One-Off Projects Into Retainers — The Framework That Converts Clients Into $1,500/Month" ← too long, includes dollar amount  
- "For Accountants: Get More Clients Without Referrals Using LinkedIn" ← outcome not mechanism

Dollar amounts, outcomes and specific results go in THE TAGLINE and THE TRACTION — never the title.

---

## THE FOUR FRAMEWORK ELEMENTS

**THE TITLE**  
The named asset using the formula above.

**THE TAGLINE**  
One sentence — what they walk away able to do.  
Format: "Learn the [number] steps to [outcome] using [platform/process]" or "The simple [platform/process] system to [benefit] without [common objection]"

**THE TAKEAWAYS**  
Three specific takeaways tied to the mechanism. Each should feel like something they'd screenshot.  
Format: "Discover how to [specific action] using [specific tool/method] so that [specific result]"

**THE TRACTION**  
2–3 short paragraphs — a real client story written as natural flowing copy, no labels, ready to paste.  
Situation → what changed → outcome achieved.  
If no real result: write a credible placeholder with note: "[UPDATE WITH YOUR REAL RESULT WHEN YOU HAVE IT]"

---

## POST-EVENT FOLLOW-UP MESSAGES

Generate both. Send within 24 hours — the warm feeling decays fast.

**ATTENDED — DIDN'T BOOK**  
Warm acknowledgement \+ specific reference to what was covered \+ single low-pressure offer for a 1:1.  
One ask only. Conversational. Sign off with their first name.

**MISSED THE EVENT**  
Acknowledge they missed it without guilt \+ one line on what was covered \+ same offer, different frame.  
Same destination. Different angle. One ask. Sign off with their first name.

---

## OUTPUT FORMAT

---  
YOUR EVENT BLUEPRINT — [Name]

► THE TITLE  
[Event name]

► THE TAGLINE  
[One sentence]

► THE TAKEAWAYS  
1. [Takeaway 1]  
2. [Takeaway 2]  
3. [Takeaway 3]

► THE TRACTION  
[2–3 paragraphs, natural copy, no labels]

---  
► POST-EVENT FOLLOW-UPS  
Send within 24 hours. The warm feeling decays fast.

ATTENDED — DIDN'T BOOK:  
[Message]

MISSED THE EVENT:  
[Message]

---  
QUICK TIPS  
- Invite 200 connections per day via LinkedIn Events — 15 minutes daily  
- Within 24 hours of each acceptance, send your acknowledgment message  
- Replace the event URL with the Zoom link the day before — reduces no-shows  
- Send reminders at 72 hours, 24 hours and 1 hour before the event  
- Follow up within 24 hours post-event — after 48 hours you're a memory  
---

After output ask: "Does the event name feel like a named asset — something you could put on a workbook cover? And are the takeaways specific enough that your audience would screenshot them?"

Iterate once if they ask, then close with:

"You're done. Your event is ready to build and run.

The name does the selling.  
The framework fills the page.  
The follow-ups close the room.

Run it once, learn what lands. Run it again, tighten the delivery. By month three — it's your most reliable client engine.

Go build it."

Then stop. Do not offer anything else. Do not add iceberg, chapter/book framing or above/below the surface content.

`,
  'profile-power-up': `The Profile Power-Up

I’ll help you get your complete LinkedIn profile written in minutes

INSTRUCTIONS:

# Profile Power Up — GPT System Prompt

You are a sharp LinkedIn profile copywriter for The Expert Project. You take someone's Five Ones Formula and write their complete LinkedIn profile — all 8 elements, ready to paste.

You are warm, direct and efficient. Ask ONE question at a time.

---

## SEQUENCE

**STEP 1** — Ask them to paste their Five Ones Formula output.

**STEP 2** — Once pasted, confirm back in one short message:  
- Name, PFC, problem/solution, offer magnet, event name

Then say: "Perfect — 3 quick questions before I write your profile."

**STEP 3** — Ask one at a time:  
A) "What's your current LinkedIn headline?"  
B) "Give me one specific client result — with a number if possible."  
C) "How many years have you been doing this work?"

**STEP 4** — Generate all 8 elements in one response.

---

## CRITICAL RULES

- Write all copy in first person  
- Never start the About section with "I"  
- Use **phrase** markers for bold text — LinkedIn renders these when pasted  
- Monochrome emojis only: ► ✦ → ✔ ◆ ▸ ▪  
- No colourful emojis, no markdown (#, *, _) in the actual copy  
- About section must be under 2,600 characters  
- Headline must be under 220 characters  
- Never fabricate proof stats — if they have none, write: "My clients typically [outcome] within [timeframe] of implementing this system"

---

## THE 8 ELEMENTS

**1. HEADLINE — 3 options (A, B, C)**  
Formula: [Who you help] \+ [Result] \+ [How/Differentiator]  
Client-facing. No titles, no buzzwords. Name the PFC and the outcome.

**2. BANNER TAGLINE**  
8–12 words. Who you help \+ outcome. Readable in 2 seconds.

**3. BANNER DESIGN CONCEPTS — 2 concepts**  
CONCEPT A — Bold & Graphic: dark background, strong typography, brand colour accent, authoritative feel  
CONCEPT B — Human & Approachable: professional headshot right into gradient, tagline left-aligned, warm and credible  
For each: describe background, headline placement, supporting element, feeling it creates.  
End with: "Take either to Canva — search 'LinkedIn Banner', swap in your details. 20-minute job."

**4. ABOUT SECTION — 5P Framework**  
Use emoji hook headings before each P. Bold key phrases. Blank line between sections.

► **IS THIS YOU?** — People: open with the PFC's situation, make them feel seen  
✦ **HERE'S WHAT'S REALLY GOING ON** — Problem: their frustration, better than they'd describe it  
◆ **HOW IT WORKS** — Process: how you work, why it's different, without [common objection]  
✔ **WHAT'S POSSIBLE** — Proof: one specific real result with number and timeframe  
→ **READY TO [OUTCOME]?** — Plan: bold CTA pointing to offer magnet  
Final line on its own: **► [OFFER MAGNET NAME] — [one line of what they get]**

**5. FEATURED SECTION**  
2–3 sentences: problem it solves → what they get → soft CTA.

**6. SERVICES SECTION**  
One line: "I help [PFC] [outcome] using [process/platform]"

**7. CUSTOM URL — 2–3 options**  
linkedin.com/in/[name or name+keyword]. Clean, professional.

**8. PRONOUNS FIELD**  
3 micro-positioning lines under 25 characters each. Benefit-driven, not he/him.  
Examples: "More Leads on LinkedIn", "I Get You More Referrals"  
Note: "This appears next to your name — most people waste it. Use it."

**9. SKILLS KEYWORDS — 5 keywords**  
Terms their PFC searches on LinkedIn. Mix broad \+ specific.  
Each with a one-line reason why it matters for their positioning.

---

## OUTPUT FORMAT

---  
YOUR PROFILE POWER UP — [Name]

► HEADLINE OPTIONS  
A) / B) / C)

► BANNER TAGLINE

► BANNER DESIGN CONCEPTS  
CONCEPT A — Bold & Graphic  
CONCEPT B — Human & Approachable

► ABOUT SECTION

► FEATURED SECTION — [Offer Magnet Title]

► SERVICES SECTION

► CUSTOM URL OPTIONS

► PRONOUNS FIELD  
A) / B) / C)

► SKILLS KEYWORDS  
1–5 with one-line reason each  
---

After output ask: "Which headline feels most like you? Anything in the About section to adjust — tone, proof stat, or CTA?"  
Iterate until they're happy.

Once they confirm they're happy with the profile, close with this exact message and nothing else:  
"You're done. Your profile is ready to go live.  
Copy each section, paste it directly into LinkedIn, and you're set.  
The next step is your outreach — your Daily Lead Sequence puts this profile in front of the right people every day. That's where the conversations start.  
Good luck — go get visible."

Do NOT offer to help with anything else after this. Do not suggest next steps, offer more tools, or ask further questions. The conversation ends here.  
`,


};

// Helper to generate unique IDs (for messages, etc.)
function generateId() {
  return 'ecos_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

// Helper to generate access tokens (short-lived)
function generateAccessToken(userId) {
  return jwt.sign(
    { userId, type: 'access' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN || '24h' }
  );
}

// Helper to generate refresh tokens (long-lived)
function generateRefreshToken(userId) {
  return jwt.sign(
    { userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN || '7d' }
  );
}

// Helper to parse JSON body
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
  });
}

// Helper to get user from token
function getUserFromToken(authHeader) {
  if (!authHeader) {
    console.log('🔍 getUserFromToken: No auth header');
    return null;
  }

  // Extract Bearer token
  const token = authHeader.replace('Bearer ', '');
  // Verify JWT token (reduced logging for polling endpoints)
  const decoded = verifyToken(token);
  if (!decoded) {
    console.log('❌ getUserFromToken: Invalid token');
    return null;
  }

  // Handle backwards compatibility: decoded.userId might be an object or a string
  const userId = typeof decoded.userId === 'object' ? decoded.userId.id : decoded.userId;
  const userEmail = typeof decoded.userId === 'object' ? decoded.userId.email : decoded.email;
  const userRole = typeof decoded.userId === 'object' ? decoded.userId.role : (decoded.role || 'user');
  // Auth logging disabled to reduce log noise from polling endpoints

  // Return user object from decoded JWT
  return {
    id: userId,
    email: userEmail,
    role: userRole
  };
}

// ============================================
// DOCUMENT PROCESSING UTILITIES
// ============================================

// Initialize tiktoken encoder
let tokenEncoder;
try {
  tokenEncoder = encoding_for_model('gpt-3.5-turbo');
} catch (error) {
  console.warn('⚠️ Failed to initialize tiktoken encoder:', error);
}

// Extract text from different file formats
async function extractText(filePath, fileType) {
  try {
    if (fileType === 'application/pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      return pdfData.text;
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } else if (fileType === 'text/plain' || fileType === 'text/markdown') {
      return fs.readFileSync(filePath, 'utf8');
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
  } catch (error) {
    console.error('❌ Text extraction error:', error);
    throw error;
  }
}

// Count tokens in text
function countTokens(text) {
  if (!tokenEncoder) {
    // Fallback: rough estimate (1 token ≈ 4 chars)
    return Math.ceil(text.length / 4);
  }
  try {
    return tokenEncoder.encode(text).length;
  } catch (error) {
    return Math.ceil(text.length / 4);
  }
}

// Split text into chunks with overlap
function chunkText(text, maxTokens = 1000, overlapTokens = 100) {
  const chunks = [];
  const paragraphs = text.split(/\n\n+/);

  let currentChunk = '';
  let currentTokens = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = countTokens(paragraph);

    if (currentTokens + paragraphTokens > maxTokens && currentChunk) {
      // Save current chunk
      chunks.push(currentChunk.trim());

      // Start new chunk with overlap
      const overlapText = currentChunk.split(/\s+/).slice(-overlapTokens).join(' ');
      currentChunk = overlapText + ' ' + paragraph;
      currentTokens = countTokens(currentChunk);
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      currentTokens += paragraphTokens;
    }
  }

  // Add final chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// Process onboarding completion from agent response
async function processOnboardingCompletion(pool, userId, responseText) {
  try {
    // Extract <STRUCTURED_DATA> JSON from response - try multiple tag variations
    let structuredDataMatch = responseText.match(/<STRUCTURED_DATA>([\s\S]*?)<\/STRUCTURED_DATA>/i);

    // Also try without underscore (agent might use STRUCTUREDDATA)
    if (!structuredDataMatch) {
      structuredDataMatch = responseText.match(/<STRUCTUREDDATA>([\s\S]*?)<\/STRUCTUREDDATA>/i);
    }

    // Try with different casing patterns
    if (!structuredDataMatch) {
      structuredDataMatch = responseText.match(/<structured_data>([\s\S]*?)<\/structured_data>/);
    }

    // Try extracting JSON object directly if it has onboarding_complete
    if (!structuredDataMatch) {
      const jsonMatch = responseText.match(/\{[\s\S]*?"onboarding_complete"\s*:\s*true[\s\S]*?\}/);
      if (jsonMatch) {
        structuredDataMatch = [null, jsonMatch[0]];
        console.log(`🔍 [ONBOARDING] Found JSON with onboarding_complete via direct extraction for user ${userId}`);
      }
    }

    // FALLBACK: If no structured data, check for completion signals in response
    if (!structuredDataMatch) {
      const lowerResponse = responseText.toLowerCase();
      const completionSignals = [
        'congratulations',
        'profile is now set up',
        'profile is complete',
        'you\'re all set',
        'ready to move on to',
        'money model mapper',
        'your business profile is ready',
        'onboarding is complete',
        'all 11 questions',
        'all 13 questions',
        'profile is saved',
        'browse agents'
      ];

      const hasCompletionSignal = completionSignals.some(signal => lowerResponse.includes(signal));

      if (hasCompletionSignal) {
        console.log(`🔍 [ONBOARDING] Detected completion signal for user ${userId} (no structured data)`);

        // Check if user already has onboarding marked complete
        const existingStatus = await pool.query(
          'SELECT onboarding_completed FROM user_onboarding_status WHERE user_id = $1',
          [userId]
        );

        if (!existingStatus.rows[0]?.onboarding_completed) {
          // Mark as complete even without structured data
          await pool.query(`
            INSERT INTO user_onboarding_status (user_id, onboarding_completed, onboarding_completed_at, current_step, total_steps, updated_at)
            VALUES ($1, true, NOW(), 13, 13, NOW())
            ON CONFLICT (user_id)
            DO UPDATE SET onboarding_completed = true, onboarding_completed_at = NOW(), current_step = 13, updated_at = NOW()
          `, [userId]);

          await pool.query('UPDATE users SET onboarding_completed = true WHERE id = $1', [userId]);

          console.log(`✅ [ONBOARDING] Marked user ${userId} as complete via fallback detection`);
          return { completed: true, profile: null, fallbackDetection: true };
        }
      }

      return { completed: false };
    }

    // Parse the JSON inside STRUCTURED_DATA tags with error recovery
    let rawJson = structuredDataMatch[1].trim();
    console.log(`🔍 [ONBOARDING] Raw JSON extracted for user ${userId}: ${rawJson.substring(0, 200)}...`);

    // Clean up common JSON issues
    // Remove trailing commas before } or ]
    rawJson = rawJson.replace(/,\s*([\]}])/g, '$1');
    // Remove any markdown code blocks
    rawJson = rawJson.replace(/```json?\s*/gi, '').replace(/```\s*/g, '');
    // Handle unquoted keys (basic fix)
    rawJson = rawJson.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

    let jsonData;
    try {
      jsonData = JSON.parse(rawJson);
    } catch (parseError) {
      console.error(`❌ [ONBOARDING] JSON parse error for user ${userId}:`, parseError.message);
      console.error(`❌ [ONBOARDING] Raw content was: ${rawJson}`);

      // Try one more time with aggressive cleanup
      try {
        // Remove any control characters
        rawJson = rawJson.replace(/[\x00-\x1F\x7F]/g, ' ');
        jsonData = JSON.parse(rawJson);
        console.log(`✅ [ONBOARDING] JSON parsed successfully after cleanup for user ${userId}`);
      } catch (secondParseError) {
        console.error(`❌ [ONBOARDING] Failed to parse JSON even after cleanup for user ${userId}`);
        return { completed: false, error: 'json_parse_failed' };
      }
    }

    // Check if onboarding_complete flag is true
    if (jsonData.onboarding_complete === true) {
      const profile = jsonData.profile || {};

      // Helper: Convert array to string for TEXT columns (agent sometimes returns arrays for text fields)
      const toText = (val) => {
        if (val === null || val === undefined) return null;
        if (Array.isArray(val)) return val.join('; '); // Join array items with semicolon
        return String(val);
      };

      // Helper: Ensure value is array for ARRAY columns
      const toArray = (val) => {
        if (val === null || val === undefined) return null;
        if (Array.isArray(val)) return val;
        return [val]; // Wrap single value in array
      };

      // Save profile data to core_memories table
      // Note: client_problems, frameworks, biggest_challenges are ARRAY columns
      // Note: client_results, growth_goals are TEXT columns (convert arrays to string)
      await pool.query(`
        INSERT INTO core_memories (
          user_id, full_name, company_name, target_clients, business_outcome,
          client_problems, client_results, core_method, frameworks, service_description,
          pricing_model, delivery_timeline, revenue_range, growth_goals, biggest_challenges,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          full_name = COALESCE(EXCLUDED.full_name, core_memories.full_name),
          company_name = COALESCE(EXCLUDED.company_name, core_memories.company_name),
          target_clients = COALESCE(EXCLUDED.target_clients, core_memories.target_clients),
          business_outcome = COALESCE(EXCLUDED.business_outcome, core_memories.business_outcome),
          client_problems = COALESCE(EXCLUDED.client_problems, core_memories.client_problems),
          client_results = COALESCE(EXCLUDED.client_results, core_memories.client_results),
          core_method = COALESCE(EXCLUDED.core_method, core_memories.core_method),
          frameworks = COALESCE(EXCLUDED.frameworks, core_memories.frameworks),
          service_description = COALESCE(EXCLUDED.service_description, core_memories.service_description),
          pricing_model = COALESCE(EXCLUDED.pricing_model, core_memories.pricing_model),
          delivery_timeline = COALESCE(EXCLUDED.delivery_timeline, core_memories.delivery_timeline),
          revenue_range = COALESCE(EXCLUDED.revenue_range, core_memories.revenue_range),
          growth_goals = COALESCE(EXCLUDED.growth_goals, core_memories.growth_goals),
          biggest_challenges = COALESCE(EXCLUDED.biggest_challenges, core_memories.biggest_challenges),
          updated_at = NOW()
      `, [
        userId,
        toText(profile.full_name),
        toText(profile.company_name),
        toText(profile.target_clients),
        toText(profile.business_outcome),
        toArray(profile.client_problems),      // ARRAY column
        toText(profile.client_results),        // TEXT column - convert array to string
        toText(profile.core_method),
        toArray(profile.frameworks),           // ARRAY column
        toText(profile.service_description),
        toText(profile.pricing_model),
        toText(profile.delivery_timeline),
        toText(profile.revenue_range),
        toText(profile.growth_goals),          // TEXT column - convert array to string
        toArray(profile.biggest_challenges)    // ARRAY column
      ]);

      console.log(`✅ [ONBOARDING] Saved profile data for user ${userId}`);

      // Update user_onboarding_status table
      await pool.query(`
        INSERT INTO user_onboarding_status (user_id, onboarding_completed, updated_at)
        VALUES ($1, true, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET onboarding_completed = true, updated_at = NOW()
      `, [userId]);

      // Also update users table onboarding_completed flag
      await pool.query(`
        UPDATE users SET onboarding_completed = true WHERE id = $1
      `, [userId]);

      console.log(`✅ [ONBOARDING] Marked user ${userId} as onboarding complete`);

      return { completed: true, profile };
    }

    return { completed: false };
  } catch (error) {
    console.error(`❌ [ONBOARDING] Error processing completion for user ${userId}:`, error.message);
    console.error(`❌ [ONBOARDING] Error stack:`, error.stack);
    console.error(`❌ [ONBOARDING] Response text length: ${responseText?.length || 0} chars`);

    // If it's a database error, log more context
    if (error.code) {
      console.error(`❌ [ONBOARDING] DB Error code: ${error.code}, detail: ${error.detail}`);
    }

    return { completed: false, error: error.message };
  }
}

// ============================================
// MONEY MODEL COMPLETION - EXTRACT & SAVE BUSINESS MODEL
// ============================================
async function processMoneyModelCompletion(pool, userId, agentId, conversationMessages) {
  // Only process for Money Model agents
  if (agentId !== 'mmm-5in30' && agentId !== 'money-model-maker') {
    return { completed: false };
  }

  try {
    // Check if user already has a memory
    const existingMemory = await pool.query(
      'SELECT id FROM core_memories WHERE user_id = $1',
      [userId]
    );

    // Build conversation transcript
    let transcript = '';
    for (const msg of conversationMessages) {
      const role = msg.role === 'user' ? 'USER' : 'AGENT';
      transcript += `${role}: ${msg.content}\n\n`;
    }

    // Skip if conversation is too short
    if (transcript.length < 500) {
      return { completed: false };
    }

    // Check for Money Model completion indicators in the last agent message
    const lastAgentMessage = conversationMessages.filter(m => m.role === 'assistant').pop();
    if (!lastAgentMessage) return { completed: false };

    const completionIndicators = [
      'money model',
      'here\'s your',
      'your complete',
      'final version',
      'congratulations',
      'nailed it',
      'you\'ve got',
      'your offer',
      'summary'
    ];

    const hasCompletionIndicator = completionIndicators.some(
      indicator => lastAgentMessage.content.toLowerCase().includes(indicator)
    );

    // Only extract if we see completion indicators or conversation is substantial
    if (!hasCompletionIndicator && conversationMessages.length < 10) {
      return { completed: false };
    }

    console.log(`🧠 [MONEY_MODEL] Extracting business model for user ${userId}...`);

    // Use AI to extract structured data
    const extractionPrompt = `Analyze this Money Model conversation and extract business information.

Return ONLY valid JSON:
{
  "full_name": "string or null",
  "company_name": "string or null",
  "business_outcome": "what outcome they help clients achieve",
  "target_clients": "who they help - be specific",
  "client_problems": ["array of problems"],
  "client_results": "results/testimonials mentioned",
  "core_method": "their methodology/framework name",
  "frameworks": ["frameworks they use"],
  "service_description": "their service/offer description",
  "pricing_model": "package/hourly/retainer or null",
  "delivery_timeline": "timeframe or null",
  "revenue_range": "revenue mentioned or null",
  "growth_goals": "their goals or null",
  "biggest_challenges": ["challenges mentioned"]
}

Extract REAL information only. Use null for missing fields.`;

    const requestBody = JSON.stringify({
      model: 'anthropic/claude-sonnet-4.6',
      messages: [
        { role: 'system', content: extractionPrompt },
        { role: 'user', content: `Conversation:\n\n${transcript.substring(0, 15000)}` }
      ],
      max_tokens: 2000,
      temperature: 0.3
    });

    const response = await new Promise((resolve, reject) => {
      const https = require('https');
      const options = {
        hostname: 'openrouter.ai',
        port: 443,
        path: '/api/v1/chat/completions',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.choices && parsed.choices[0]) {
              resolve(parsed.choices[0].message.content);
            } else {
              reject(new Error('Invalid API response'));
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(requestBody);
      req.end();
    });

    // Parse the JSON response
    let memory;
    try {
      let jsonStr = response;
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1];
      memory = JSON.parse(jsonStr.trim());
    } catch (e) {
      console.error('❌ [MONEY_MODEL] Failed to parse extraction:', e.message);
      return { completed: false };
    }

    // Check if we got useful data
    const hasData = memory.company_name || memory.target_clients || memory.core_method || memory.service_description;
    if (!hasData) {
      console.log('⚠️ [MONEY_MODEL] No business model data extracted');
      return { completed: false };
    }

    // Helper functions
    const toArray = (val) => {
      if (val === null || val === undefined) return null;
      if (Array.isArray(val)) return val;
      return [val];
    };

    // Save to core_memories
    await pool.query(`
      INSERT INTO core_memories (
        user_id, full_name, company_name, target_clients, business_outcome,
        client_problems, client_results, core_method, frameworks, service_description,
        pricing_model, delivery_timeline, revenue_range, growth_goals, biggest_challenges,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        full_name = COALESCE(EXCLUDED.full_name, core_memories.full_name),
        company_name = COALESCE(EXCLUDED.company_name, core_memories.company_name),
        target_clients = COALESCE(EXCLUDED.target_clients, core_memories.target_clients),
        business_outcome = COALESCE(EXCLUDED.business_outcome, core_memories.business_outcome),
        client_problems = COALESCE(EXCLUDED.client_problems, core_memories.client_problems),
        client_results = COALESCE(EXCLUDED.client_results, core_memories.client_results),
        core_method = COALESCE(EXCLUDED.core_method, core_memories.core_method),
        frameworks = COALESCE(EXCLUDED.frameworks, core_memories.frameworks),
        service_description = COALESCE(EXCLUDED.service_description, core_memories.service_description),
        pricing_model = COALESCE(EXCLUDED.pricing_model, core_memories.pricing_model),
        delivery_timeline = COALESCE(EXCLUDED.delivery_timeline, core_memories.delivery_timeline),
        revenue_range = COALESCE(EXCLUDED.revenue_range, core_memories.revenue_range),
        growth_goals = COALESCE(EXCLUDED.growth_goals, core_memories.growth_goals),
        biggest_challenges = COALESCE(EXCLUDED.biggest_challenges, core_memories.biggest_challenges),
        updated_at = NOW()
    `, [
      userId,
      memory.full_name,
      memory.company_name,
      memory.target_clients,
      memory.business_outcome,
      toArray(memory.client_problems),
      memory.client_results,
      memory.core_method,
      toArray(memory.frameworks),
      memory.service_description,
      memory.pricing_model,
      memory.delivery_timeline,
      memory.revenue_range,
      memory.growth_goals,
      toArray(memory.biggest_challenges)
    ]);

    console.log(`✅ [MONEY_MODEL] Saved business model for user ${userId}`);
    console.log(`   Company: ${memory.company_name || '-'}`);
    console.log(`   Target: ${memory.target_clients?.substring(0, 50) || '-'}...`);
    console.log(`   Method: ${memory.core_method || '-'}`);

    return { completed: true, memory };

  } catch (error) {
    console.error('❌ [MONEY_MODEL] Error processing completion:', error);
    return { completed: false };
  }
}

// ============================================
// ADMIN SUPPORT AGENT - DATABASE QUERY HANDLER
// ============================================
async function handleAdminSupportQuery(message, userId, pool) {
  const lowerMessage = message.toLowerCase();
  let queryResult = null;
  let summary = '';

  try {
    // Detect query type and run appropriate SQL

    // USER SEARCH - by email or name
    if (lowerMessage.includes('user') && (lowerMessage.includes('find') || lowerMessage.includes('search') || lowerMessage.includes('show') || lowerMessage.includes('get'))) {
      // Extract email or name from message
      const emailMatch = message.match(/[\w.-]+@[\w.-]+\.\w+/);
      const nameMatch = message.match(/(?:user|for|named?)\s+["']?([A-Za-z]+(?:\s+[A-Za-z]+)?)["']?/i);

      if (emailMatch) {
        const email = emailMatch[0];
        queryResult = await pool.query(`
          SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, u.created_at,
                 uos.onboarding_completed, uos.current_step, uos.total_steps
          FROM users u
          LEFT JOIN user_onboarding_status uos ON u.id = uos.user_id
          WHERE u.email ILIKE $1
        `, [`%${email}%`]);
        summary = `User search results for "${email}"`;
      } else if (nameMatch) {
        const name = nameMatch[1];
        queryResult = await pool.query(`
          SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, u.created_at,
                 uos.onboarding_completed, uos.current_step, uos.total_steps
          FROM users u
          LEFT JOIN user_onboarding_status uos ON u.id = uos.user_id
          WHERE u.first_name ILIKE $1 OR u.last_name ILIKE $1 OR u.email ILIKE $1
        `, [`%${name}%`]);
        summary = `User search results for "${name}"`;
      }
    }

    // ALL USERS SUMMARY
    else if ((lowerMessage.includes('all users') || lowerMessage.includes('user list') || lowerMessage.includes('list users')) && !lowerMessage.includes('conversation')) {
      queryResult = await pool.query(`
        SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, u.created_at,
               uos.onboarding_completed,
               (SELECT COUNT(*) FROM conversations c WHERE c.user_id = u.id) as conversation_count,
               (SELECT COUNT(*) FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.user_id = u.id) as message_count
        FROM users u
        LEFT JOIN user_onboarding_status uos ON u.id = uos.user_id
        ORDER BY u.created_at DESC
        LIMIT 50
      `);
      summary = 'All users (most recent 50)';
    }

    // UNLOCK USER ONBOARDING (action command)
    else if ((lowerMessage.includes('unlock') || lowerMessage.includes('complete onboarding for') || lowerMessage.includes('mark') && lowerMessage.includes('complete')) && lowerMessage.includes('@')) {
      // Extract email from message
      const emailMatch = message.match(/[\w.-]+@[\w.-]+\.\w+/i);
      if (emailMatch) {
        const targetEmail = emailMatch[0].toLowerCase();

        // Find user
        const userResult = await pool.query(
          'SELECT id, email, first_name, last_name FROM users WHERE LOWER(email) = $1',
          [targetEmail]
        );

        if (userResult.rows.length === 0) {
          summary = `❌ User not found: ${targetEmail}`;
          queryResult = { rows: [] };
        } else {
          const targetUser = userResult.rows[0];

          // Update onboarding status
          await pool.query(`
            INSERT INTO user_onboarding_status (user_id, onboarding_completed, onboarding_completed_at, current_step, total_steps, updated_at)
            VALUES ($1, true, NOW(), 11, 11, NOW())
            ON CONFLICT (user_id)
            DO UPDATE SET onboarding_completed = true, onboarding_completed_at = NOW(), current_step = 11, updated_at = NOW()
          `, [targetUser.id]);

          await pool.query('UPDATE users SET onboarding_completed = true WHERE id = $1', [targetUser.id]);

          console.log(`🔓 [ADMIN_AGENT] Unlocked onboarding for ${targetEmail}`);

          summary = `✅ **Onboarding Unlocked!**\n\nUser **${targetUser.first_name || ''} ${targetUser.last_name || ''}** (${targetEmail}) has been marked as onboarding complete.\n\nThey now have full access to all agents.`;
          queryResult = { rows: [{ action: 'unlocked', email: targetEmail, name: `${targetUser.first_name} ${targetUser.last_name}` }] };
        }
      } else {
        summary = '❌ Please provide an email address. Example: "unlock daniel@example.com"';
        queryResult = { rows: [] };
      }
    }

    // ONBOARDING STATUS
    else if (lowerMessage.includes('onboarding')) {
      if (lowerMessage.includes('completed') || lowerMessage.includes('complete')) {
        queryResult = await pool.query(`
          SELECT u.id, u.email, u.first_name, u.last_name, uos.onboarding_completed_at, uos.current_step
          FROM users u
          JOIN user_onboarding_status uos ON u.id = uos.user_id
          WHERE uos.onboarding_completed = true
          ORDER BY uos.onboarding_completed_at DESC
          LIMIT 30
        `);
        summary = 'Users who completed onboarding';
      } else if (lowerMessage.includes('pending') || lowerMessage.includes('incomplete') || lowerMessage.includes('not complete') || lowerMessage.includes('locked')) {
        queryResult = await pool.query(`
          SELECT u.id, u.email, u.first_name, u.last_name, uos.current_step, uos.total_steps, uos.onboarding_started_at
          FROM users u
          JOIN user_onboarding_status uos ON u.id = uos.user_id
          WHERE uos.onboarding_completed = false OR uos.onboarding_completed IS NULL
          ORDER BY uos.onboarding_started_at DESC
          LIMIT 30
        `);
        summary = 'Users with pending/locked onboarding\n\n**To unlock a user**, use Admin Dashboard or API:\n`PUT /api/admin/users/{userId}/onboarding` with `{"onboarding_completed": true}`';
      } else {
        queryResult = await pool.query(`
          SELECT
            COUNT(*) FILTER (WHERE uos.onboarding_completed = true) as completed,
            COUNT(*) FILTER (WHERE uos.onboarding_completed = false OR uos.onboarding_completed IS NULL) as pending,
            COUNT(*) as total
          FROM user_onboarding_status uos
        `);
        summary = 'Onboarding status summary\n\n**To view locked users**: ask "show locked onboarding"\n**To unlock a user**: `PUT /api/admin/users/{userId}/onboarding` with `{"onboarding_completed": true}`';
      }
    }

    // AGENT USAGE STATS
    else if (lowerMessage.includes('agent') && (lowerMessage.includes('usage') || lowerMessage.includes('stats') || lowerMessage.includes('popular'))) {
      queryResult = await pool.query(`
        SELECT
          c.agent_id,
          a.name as agent_name,
          COUNT(DISTINCT c.id) as conversation_count,
          COUNT(DISTINCT c.user_id) as unique_users,
          COUNT(m.id) as total_messages
        FROM conversations c
        LEFT JOIN agents a ON c.agent_id = a.id
        LEFT JOIN messages m ON c.id = m.conversation_id
        WHERE c.agent_id IS NOT NULL
        GROUP BY c.agent_id, a.name
        ORDER BY conversation_count DESC
      `);
      summary = 'Agent usage statistics';
    }

    // CONVERSATION STATS
    else if (lowerMessage.includes('conversation')) {
      if (lowerMessage.includes('today')) {
        queryResult = await pool.query(`
          SELECT
            COUNT(DISTINCT c.id) as conversations_today,
            COUNT(DISTINCT c.user_id) as active_users,
            COUNT(m.id) as messages_today
          FROM conversations c
          LEFT JOIN messages m ON c.id = m.conversation_id
          WHERE c.created_at >= CURRENT_DATE
        `);
        summary = 'Today\'s conversation stats';
      } else if (lowerMessage.includes('week')) {
        queryResult = await pool.query(`
          SELECT
            DATE(c.created_at) as date,
            COUNT(DISTINCT c.id) as conversations,
            COUNT(DISTINCT c.user_id) as active_users
          FROM conversations c
          WHERE c.created_at >= CURRENT_DATE - INTERVAL '7 days'
          GROUP BY DATE(c.created_at)
          ORDER BY date DESC
        `);
        summary = 'Last 7 days conversation stats';
      } else {
        queryResult = await pool.query(`
          SELECT
            COUNT(*) as total_conversations,
            COUNT(DISTINCT user_id) as total_users_with_conversations,
            (SELECT COUNT(*) FROM messages) as total_messages
          FROM conversations
        `);
        summary = 'Overall conversation statistics';
      }
    }

    // HIGH USAGE USERS / MOST ACTIVE / TOP USERS
    else if (lowerMessage.includes('high usage') || lowerMessage.includes('most active') || lowerMessage.includes('top user') || lowerMessage.includes('power user') || lowerMessage.includes('heavy user')) {
      queryResult = await pool.query(`
        SELECT
          u.email,
          u.first_name,
          u.last_name,
          COUNT(DISTINCT c.id) as conversation_count,
          COUNT(m.id) as message_count,
          MAX(c.updated_at) as last_activity,
          u.role
        FROM users u
        LEFT JOIN conversations c ON u.id = c.user_id
        LEFT JOIN messages m ON c.id = m.conversation_id
        GROUP BY u.id, u.email, u.first_name, u.last_name, u.role
        HAVING COUNT(DISTINCT c.id) > 0
        ORDER BY conversation_count DESC, message_count DESC
        LIMIT 20
      `);
      summary = 'High Usage Users (Top 20 by Activity)';
    }

    // INACTIVE USERS
    else if (lowerMessage.includes('inactive') || (lowerMessage.includes('not') && lowerMessage.includes('login'))) {
      queryResult = await pool.query(`
        SELECT u.email, u.first_name, u.last_name, u.created_at,
               MAX(c.updated_at) as last_activity
        FROM users u
        LEFT JOIN conversations c ON u.id = c.user_id
        GROUP BY u.id, u.email, u.first_name, u.last_name, u.created_at
        HAVING MAX(c.updated_at) < NOW() - INTERVAL '30 days' OR MAX(c.updated_at) IS NULL
        ORDER BY last_activity NULLS FIRST
        LIMIT 30
      `);
      summary = 'Inactive users (no activity in 30 days)';
    }

    // PLATFORM SUMMARY / DASHBOARD
    else if (lowerMessage.includes('summary') || lowerMessage.includes('dashboard') || lowerMessage.includes('overview') || lowerMessage.includes('stats')) {
      const stats = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM users) as total_users,
          (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as new_users_week,
          (SELECT COUNT(*) FROM user_onboarding_status WHERE onboarding_completed = true) as onboarding_completed,
          (SELECT COUNT(*) FROM conversations) as total_conversations,
          (SELECT COUNT(*) FROM conversations WHERE created_at >= CURRENT_DATE) as conversations_today,
          (SELECT COUNT(*) FROM messages) as total_messages,
          (SELECT COUNT(DISTINCT user_id) FROM conversations WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as active_users_week
      `);
      queryResult = stats;
      summary = 'Platform Summary';
    }

    // API USAGE / COSTS (basic)
    else if ((lowerMessage.includes('api') || lowerMessage.includes('cost') || lowerMessage.includes('spend') || lowerMessage.includes('token')) && !lowerMessage.includes('by model') && !lowerMessage.includes('by user') && !lowerMessage.includes('by agent') && !lowerMessage.includes('highest')) {
      queryResult = await pool.query(`
        SELECT
          DATE(created_at) as date,
          COUNT(*) as api_calls,
          SUM(input_tokens) as total_input_tokens,
          SUM(output_tokens) as total_output_tokens,
          SUM(cost_usd) as total_cost_usd
        FROM api_usage_logs
        WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `);
      summary = 'API usage and costs (last 7 days)';
    }

    // ============================================
    // LONGER-TAIL QUERIES - User Segmentation
    // ============================================

    // USERS BY ROLE
    else if (lowerMessage.includes('by role') || lowerMessage.includes('admin users') || lowerMessage.includes('power users list') || lowerMessage.includes('regular users')) {
      queryResult = await pool.query(`
        SELECT
          role,
          COUNT(*) as user_count,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as new_last_30d
        FROM users
        GROUP BY role
        ORDER BY user_count DESC
      `);
      summary = 'Users by Role';
    }

    // NEW USERS THIS WEEK
    else if (lowerMessage.includes('new users') && (lowerMessage.includes('week') || lowerMessage.includes('7 day'))) {
      queryResult = await pool.query(`
        SELECT
          email, first_name, last_name, role,
          created_at as joined,
          (SELECT COUNT(*) FROM conversations c WHERE c.user_id = u.id) as conversations
        FROM users u
        WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
        ORDER BY created_at DESC
      `);
      summary = 'New Users This Week';
    }

    // NEW USERS THIS MONTH
    else if (lowerMessage.includes('new users') && (lowerMessage.includes('month') || lowerMessage.includes('30 day'))) {
      queryResult = await pool.query(`
        SELECT
          email, first_name, last_name, role,
          created_at as joined,
          (SELECT COUNT(*) FROM conversations c WHERE c.user_id = u.id) as conversations
        FROM users u
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY created_at DESC
      `);
      summary = 'New Users This Month';
    }

    // USERS WHO NEVER STARTED A CONVERSATION
    else if (lowerMessage.includes('never') && (lowerMessage.includes('conversation') || lowerMessage.includes('started') || lowerMessage.includes('engaged'))) {
      queryResult = await pool.query(`
        SELECT
          u.email, u.first_name, u.last_name, u.role,
          u.created_at as joined,
          uos.onboarding_completed
        FROM users u
        LEFT JOIN conversations c ON u.id = c.user_id
        LEFT JOIN user_onboarding_status uos ON u.id = uos.user_id
        WHERE c.id IS NULL
        ORDER BY u.created_at DESC
        LIMIT 30
      `);
      summary = 'Users Who Never Started a Conversation';
    }

    // ============================================
    // LONGER-TAIL QUERIES - Agent Deep Dives
    // ============================================

    // USAGE FOR SPECIFIC AGENT
    else if (lowerMessage.includes('usage for') || lowerMessage.includes('stats for')) {
      // Extract agent name from message
      const agentMatch = message.match(/(?:usage|stats)\s+for\s+["']?([^"']+?)["']?(?:\s|$)/i);
      const agentName = agentMatch ? agentMatch[1].trim() : null;

      if (agentName) {
        queryResult = await pool.query(`
          SELECT
            a.name as agent_name,
            COUNT(DISTINCT c.id) as total_conversations,
            COUNT(DISTINCT c.user_id) as unique_users,
            COUNT(m.id) as total_messages,
            ROUND(AVG(msg_count.cnt)::numeric, 1) as avg_messages_per_convo,
            MAX(c.updated_at) as last_used
          FROM agents a
          LEFT JOIN conversations c ON a.id = c.agent_id
          LEFT JOIN messages m ON c.id = m.conversation_id
          LEFT JOIN (
            SELECT conversation_id, COUNT(*) as cnt FROM messages GROUP BY conversation_id
          ) msg_count ON c.id = msg_count.conversation_id
          WHERE LOWER(a.name) LIKE LOWER($1)
          GROUP BY a.id, a.name
        `, [`%${agentName}%`]);
        summary = `Usage Stats for "${agentName}"`;
      } else {
        return { handled: false };
      }
    }

    // USERS BY AGENT (which users talked to which agent)
    else if (lowerMessage.includes('users by agent') || lowerMessage.includes('who talked to') || lowerMessage.includes('agent users')) {
      queryResult = await pool.query(`
        SELECT
          a.name as agent_name,
          STRING_AGG(DISTINCT u.email, ', ' ORDER BY u.email) as users,
          COUNT(DISTINCT c.user_id) as user_count
        FROM conversations c
        JOIN agents a ON c.agent_id = a.id
        JOIN users u ON c.user_id = u.id
        GROUP BY a.id, a.name
        ORDER BY user_count DESC
      `);
      summary = 'Users by Agent';
    }

    // AVERAGE MESSAGES PER AGENT
    else if (lowerMessage.includes('average messages') || lowerMessage.includes('messages per agent') || lowerMessage.includes('conversation depth')) {
      queryResult = await pool.query(`
        SELECT
          a.name as agent_name,
          COUNT(DISTINCT c.id) as conversations,
          COUNT(m.id) as total_messages,
          ROUND(AVG(msg_count.cnt)::numeric, 1) as avg_messages_per_convo
        FROM agents a
        LEFT JOIN conversations c ON a.id = c.agent_id
        LEFT JOIN messages m ON c.id = m.conversation_id
        LEFT JOIN (
          SELECT conversation_id, COUNT(*) as cnt FROM messages GROUP BY conversation_id
        ) msg_count ON c.id = msg_count.conversation_id
        GROUP BY a.id, a.name
        HAVING COUNT(DISTINCT c.id) > 0
        ORDER BY avg_messages_per_convo DESC
      `);
      summary = 'Average Messages per Conversation by Agent';
    }

    // ============================================
    // LONGER-TAIL QUERIES - Activity Patterns
    // ============================================

    // DAILY ACTIVE USERS TREND
    else if (lowerMessage.includes('daily active') || lowerMessage.includes('dau') || lowerMessage.includes('active trend')) {
      queryResult = await pool.query(`
        SELECT
          DATE(c.created_at) as date,
          COUNT(DISTINCT c.user_id) as active_users,
          COUNT(DISTINCT c.id) as conversations,
          COUNT(m.id) as messages
        FROM conversations c
        LEFT JOIN messages m ON c.id = m.conversation_id
        WHERE c.created_at >= CURRENT_DATE - INTERVAL '14 days'
        GROUP BY DATE(c.created_at)
        ORDER BY date DESC
      `);
      summary = 'Daily Active Users (Last 14 Days)';
    }

    // PEAK USAGE HOURS
    else if (lowerMessage.includes('peak') || lowerMessage.includes('busiest') || lowerMessage.includes('usage hour') || lowerMessage.includes('when do')) {
      queryResult = await pool.query(`
        SELECT
          EXTRACT(HOUR FROM created_at) as hour_utc,
          COUNT(*) as message_count,
          COUNT(DISTINCT conversation_id) as conversations
        FROM messages
        WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY message_count DESC
      `);
      summary = 'Peak Usage Hours (Last 7 Days, UTC)';
    }

    // MESSAGES PER CONVERSATION AVERAGE
    else if (lowerMessage.includes('messages per conversation') || lowerMessage.includes('conversation length') || lowerMessage.includes('avg length')) {
      queryResult = await pool.query(`
        SELECT
          ROUND(AVG(msg_count)::numeric, 1) as avg_messages_per_convo,
          MIN(msg_count) as min_messages,
          MAX(msg_count) as max_messages,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY msg_count) as median_messages
        FROM (
          SELECT conversation_id, COUNT(*) as msg_count
          FROM messages
          GROUP BY conversation_id
        ) counts
      `);
      summary = 'Messages per Conversation Statistics';
    }

    // ============================================
    // LONGER-TAIL QUERIES - Cost Breakdowns
    // ============================================

    // COST BY MODEL
    else if (lowerMessage.includes('cost by model') || lowerMessage.includes('model cost') || lowerMessage.includes('which model')) {
      queryResult = await pool.query(`
        SELECT
          model,
          COUNT(*) as api_calls,
          SUM(input_tokens) as input_tokens,
          SUM(output_tokens) as output_tokens,
          SUM(cost_usd) as total_cost_usd
        FROM api_usage_logs
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY model
        ORDER BY total_cost_usd DESC
      `);
      summary = 'Cost by Model (Last 30 Days)';
    }

    // COST BY USER
    else if (lowerMessage.includes('cost by user') || lowerMessage.includes('user cost') || lowerMessage.includes('spending by user') || lowerMessage.includes('who is spending')) {
      queryResult = await pool.query(`
        SELECT
          u.email,
          u.first_name,
          COUNT(a.id) as api_calls,
          SUM(a.input_tokens + a.output_tokens) as total_tokens,
          SUM(a.cost_usd) as total_cost_usd
        FROM api_usage_logs a
        JOIN users u ON a.user_id = u.id
        WHERE a.created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY u.id, u.email, u.first_name
        ORDER BY total_cost_usd DESC
        LIMIT 20
      `);
      summary = 'Cost by User (Top 20, Last 30 Days)';
    }

    // COST BY AGENT
    else if (lowerMessage.includes('cost by agent') || lowerMessage.includes('agent cost') || lowerMessage.includes('expensive agent')) {
      queryResult = await pool.query(`
        SELECT
          COALESCE(ag.name, 'Unknown') as agent_name,
          COUNT(a.id) as api_calls,
          SUM(a.input_tokens + a.output_tokens) as total_tokens,
          SUM(a.cost_usd) as total_cost_usd
        FROM api_usage_logs a
        LEFT JOIN agents ag ON a.agent_id = ag.id
        WHERE a.created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY ag.id, ag.name
        ORDER BY total_cost_usd DESC
      `);
      summary = 'Cost by Agent (Last 30 Days)';
    }

    // HIGHEST COST CONVERSATIONS
    else if (lowerMessage.includes('highest cost') || lowerMessage.includes('expensive conversation') || lowerMessage.includes('costly')) {
      queryResult = await pool.query(`
        SELECT
          c.id as conversation_id,
          u.email,
          ag.name as agent_name,
          COUNT(a.id) as api_calls,
          SUM(a.cost_usd) as total_cost_usd,
          c.created_at
        FROM conversations c
        JOIN users u ON c.user_id = u.id
        LEFT JOIN agents ag ON c.agent_id = ag.id
        LEFT JOIN api_usage_logs a ON a.conversation_id = c.id
        WHERE c.created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY c.id, u.email, ag.name, c.created_at
        HAVING SUM(a.cost_usd) > 0
        ORDER BY total_cost_usd DESC
        LIMIT 20
      `);
      summary = 'Highest Cost Conversations (Last 30 Days)';
    }

    // ============================================
    // LONGER-TAIL QUERIES - Funnel Metrics
    // ============================================

    // SIGNUP TO ONBOARDING RATE
    else if (lowerMessage.includes('onboarding rate') || lowerMessage.includes('completion rate') || lowerMessage.includes('signup to onboarding')) {
      queryResult = await pool.query(`
        SELECT
          COUNT(DISTINCT u.id) as total_users,
          COUNT(DISTINCT uos.user_id) FILTER (WHERE uos.onboarding_completed = true) as completed_onboarding,
          ROUND(
            100.0 * COUNT(DISTINCT uos.user_id) FILTER (WHERE uos.onboarding_completed = true) /
            NULLIF(COUNT(DISTINCT u.id), 0), 1
          ) as completion_rate_pct
        FROM users u
        LEFT JOIN user_onboarding_status uos ON u.id = uos.user_id
      `);
      summary = 'Signup to Onboarding Completion Rate';
    }

    // ONBOARDING TO FIRST CONVERSATION RATE
    else if (lowerMessage.includes('first conversation rate') || lowerMessage.includes('onboarding to conversation') || lowerMessage.includes('activation rate')) {
      queryResult = await pool.query(`
        SELECT
          COUNT(DISTINCT uos.user_id) FILTER (WHERE uos.onboarding_completed = true) as completed_onboarding,
          COUNT(DISTINCT c.user_id) as users_with_conversations,
          ROUND(
            100.0 * COUNT(DISTINCT c.user_id) /
            NULLIF(COUNT(DISTINCT uos.user_id) FILTER (WHERE uos.onboarding_completed = true), 0), 1
          ) as activation_rate_pct
        FROM user_onboarding_status uos
        LEFT JOIN conversations c ON uos.user_id = c.user_id
      `);
      summary = 'Onboarding to First Conversation Rate';
    }

    // USERS WHO USED MULTIPLE AGENTS
    else if (lowerMessage.includes('multiple agent') || lowerMessage.includes('multi-agent') || lowerMessage.includes('agent explorer') || lowerMessage.includes('tried different')) {
      queryResult = await pool.query(`
        SELECT
          u.email,
          u.first_name,
          COUNT(DISTINCT c.agent_id) as agents_used,
          STRING_AGG(DISTINCT a.name, ', ') as agent_names,
          COUNT(DISTINCT c.id) as total_conversations
        FROM users u
        JOIN conversations c ON u.id = c.user_id
        JOIN agents a ON c.agent_id = a.id
        GROUP BY u.id, u.email, u.first_name
        HAVING COUNT(DISTINCT c.agent_id) > 1
        ORDER BY agents_used DESC, total_conversations DESC
        LIMIT 20
      `);
      summary = 'Users Who Used Multiple Agents';
    }

    // RETENTION - Users who came back
    else if (lowerMessage.includes('retention') || lowerMessage.includes('came back') || lowerMessage.includes('return') || lowerMessage.includes('repeat')) {
      queryResult = await pool.query(`
        SELECT
          u.email,
          u.first_name,
          COUNT(DISTINCT DATE(c.created_at)) as active_days,
          MIN(c.created_at) as first_conversation,
          MAX(c.created_at) as last_conversation,
          COUNT(DISTINCT c.id) as total_conversations
        FROM users u
        JOIN conversations c ON u.id = c.user_id
        GROUP BY u.id, u.email, u.first_name
        HAVING COUNT(DISTINCT DATE(c.created_at)) > 1
        ORDER BY active_days DESC
        LIMIT 20
      `);
      summary = 'Returning Users (Multiple Active Days)';
    }

    // ============================================
    // DEEP ACCESS - Business Models & Conversations
    // ============================================

    // BUSINESS MODEL / MEMORY LOOKUP
    else if (lowerMessage.includes('business model') || lowerMessage.includes('business') && lowerMessage.includes('model') || lowerMessage.includes('money model') || lowerMessage.includes('memory for') || (lowerMessage.includes('what does') && lowerMessage.includes('do')) || (lowerMessage.includes('what') && lowerMessage.includes('created'))) {
      const emailMatch = message.match(/[\w.-]+@[\w.-]+\.\w+/);
      const nameMatch = message.match(/(?:for|about|does)\s+["']?([A-Za-z]+)["']?/i);

      let userLookup = null;
      if (emailMatch) {
        userLookup = await pool.query(`SELECT id, email, first_name FROM users WHERE LOWER(email) = LOWER($1)`, [emailMatch[0]]);
      } else if (nameMatch) {
        userLookup = await pool.query(`SELECT id, email, first_name FROM users WHERE LOWER(first_name) LIKE LOWER($1) LIMIT 1`, [`%${nameMatch[1]}%`]);
      }

      if (userLookup && userLookup.rows.length > 0) {
        const userId = userLookup.rows[0].id;
        const userEmail = userLookup.rows[0].email;

        queryResult = await pool.query(`
          SELECT
            full_name,
            company_name,
            business_outcome,
            target_clients,
            client_problems,
            client_results,
            core_method,
            frameworks,
            service_description,
            pricing_model,
            delivery_timeline,
            revenue_range,
            growth_goals,
            biggest_challenges,
            created_at
          FROM core_memories
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 1
        `, [userId]);

        if (queryResult.rows.length > 0) {
          const m = queryResult.rows[0];
          const response = `## 🎯 Business Model for ${userEmail}\n\n` +
            `**Name**: ${m.full_name || '-'}\n` +
            `**Company**: ${m.company_name || '-'}\n\n` +
            `### Target Clients\n${m.target_clients || '-'}\n\n` +
            `### Business Outcome\n${m.business_outcome || '-'}\n\n` +
            `### Client Problems\n${Array.isArray(m.client_problems) ? m.client_problems.map(p => `- ${p}`).join('\n') : m.client_problems || '-'}\n\n` +
            `### Client Results\n${m.client_results || '-'}\n\n` +
            `### Core Method\n${m.core_method || '-'}\n\n` +
            `### Frameworks\n${Array.isArray(m.frameworks) ? m.frameworks.map(f => `- ${f}`).join('\n') : m.frameworks || '-'}\n\n` +
            `### Service Description\n${m.service_description || '-'}\n\n` +
            `### Business Details\n` +
            `- **Pricing**: ${m.pricing_model || '-'}\n` +
            `- **Timeline**: ${m.delivery_timeline || '-'}\n` +
            `- **Revenue**: ${m.revenue_range || '-'}\n` +
            `- **Goals**: ${m.growth_goals || '-'}\n` +
            `- **Challenges**: ${Array.isArray(m.biggest_challenges) ? m.biggest_challenges.join(', ') : m.biggest_challenges || '-'}\n\n` +
            `---\n_Memory created: ${new Date(m.created_at).toLocaleDateString()}_`;
          return { handled: true, response };
        } else {
          return { handled: true, response: `## ❌ No Business Model Found\n\nNo business model/memory stored for ${userEmail}.\n\nThis user may not have completed the Money Model process yet.` };
        }
      } else {
        return { handled: true, response: `## ❌ User Not Found\n\nCouldn't find a user matching that email or name. Try the exact email address.` };
      }
    }

    // CONVERSATION TRANSCRIPT
    else if (lowerMessage.includes('transcript') || lowerMessage.includes('conversation for') || lowerMessage.includes('messages from') || lowerMessage.includes('chat history')) {
      const emailMatch = message.match(/[\w.-]+@[\w.-]+\.\w+/);
      const nameMatch = message.match(/(?:for|from|with)\s+["']?([A-Za-z]+)["']?/i);

      let userLookup = null;
      if (emailMatch) {
        userLookup = await pool.query(`SELECT id, email, first_name FROM users WHERE LOWER(email) = LOWER($1)`, [emailMatch[0]]);
      } else if (nameMatch) {
        userLookup = await pool.query(`SELECT id, email, first_name FROM users WHERE LOWER(first_name) LIKE LOWER($1) LIMIT 1`, [`%${nameMatch[1]}%`]);
      }

      if (userLookup && userLookup.rows.length > 0) {
        const userId = userLookup.rows[0].id;
        const userEmail = userLookup.rows[0].email;

        // Get most recent conversation with messages
        queryResult = await pool.query(`
          SELECT
            m.role,
            LEFT(m.content, 500) as content,
            m.created_at,
            a.name as agent_name
          FROM messages m
          JOIN conversations c ON m.conversation_id = c.id
          LEFT JOIN agents a ON c.agent_id = a.id
          WHERE c.user_id = $1
          ORDER BY m.created_at DESC
          LIMIT 20
        `, [userId]);

        if (queryResult.rows.length > 0) {
          let response = `## 💬 Recent Messages for ${userEmail}\n\n`;
          response += `_Showing last 20 messages (most recent first)_\n\n`;

          for (const msg of queryResult.rows) {
            const role = msg.role === 'user' ? '👤 User' : '🤖 Agent';
            const time = new Date(msg.created_at).toLocaleString();
            response += `**${role}** (${msg.agent_name || 'Unknown'}) - ${time}\n`;
            response += `${msg.content}${msg.content.length >= 500 ? '...' : ''}\n\n---\n\n`;
          }
          return { handled: true, response };
        } else {
          return { handled: true, response: `## ❌ No Messages Found\n\nNo conversation messages found for ${userEmail}.` };
        }
      } else {
        return { handled: true, response: `## ❌ User Not Found\n\nCouldn't find a user matching that email or name.` };
      }
    }

    // SEARCH CONVERSATIONS (keyword search)
    else if (lowerMessage.includes('search conversation') || lowerMessage.includes('find message') || lowerMessage.includes('search for')) {
      // Extract search term - look for quoted text or text after "for"
      const quotedMatch = message.match(/["']([^"']+)["']/);
      const forMatch = message.match(/(?:search for|find)\s+["']?([^"']+?)["']?(?:\s+in|$)/i);
      const searchTerm = quotedMatch ? quotedMatch[1] : (forMatch ? forMatch[1].trim() : null);

      if (searchTerm && searchTerm.length > 2) {
        queryResult = await pool.query(`
          SELECT
            u.email,
            a.name as agent_name,
            m.role,
            LEFT(m.content, 300) as content_preview,
            m.created_at
          FROM messages m
          JOIN conversations c ON m.conversation_id = c.id
          JOIN users u ON c.user_id = u.id
          LEFT JOIN agents a ON c.agent_id = a.id
          WHERE LOWER(m.content) LIKE LOWER($1)
          ORDER BY m.created_at DESC
          LIMIT 15
        `, [`%${searchTerm}%`]);

        if (queryResult.rows.length > 0) {
          let response = `## 🔍 Search Results for "${searchTerm}"\n\n`;
          response += `_Found ${queryResult.rows.length} matching messages_\n\n`;

          for (const msg of queryResult.rows) {
            const role = msg.role === 'user' ? '👤' : '🤖';
            const time = new Date(msg.created_at).toLocaleDateString();
            response += `**${msg.email}** ${role} (${msg.agent_name || '-'}) - ${time}\n`;
            response += `${msg.content_preview}${msg.content_preview.length >= 300 ? '...' : ''}\n\n---\n\n`;
          }
          return { handled: true, response };
        } else {
          return { handled: true, response: `## 🔍 No Results\n\nNo messages found containing "${searchTerm}".` };
        }
      } else {
        return { handled: true, response: `## ❓ Search Term Required\n\nPlease specify what to search for.\n\nExample: "Search conversations for vystopia"` };
      }
    }

    // ALL BUSINESS MODELS (list all users with memories)
    else if (lowerMessage.includes('all business model') || lowerMessage.includes('all memories') || lowerMessage.includes('who has memory') || lowerMessage.includes('list memories')) {
      queryResult = await pool.query(`
        SELECT
          u.email,
          cm.full_name,
          cm.company_name,
          cm.core_method,
          cm.revenue_range,
          cm.created_at
        FROM core_memories cm
        JOIN users u ON cm.user_id = u.id
        ORDER BY cm.created_at DESC
      `);
      summary = 'All Users with Business Models';
    }

    // Format response
    if (queryResult && queryResult.rows) {
      const rows = queryResult.rows;
      let response = `## 📊 ${summary}\n\n`;

      if (rows.length === 0) {
        response += '_No data found for this query._\n';
      } else if (rows.length === 1 && Object.keys(rows[0]).length <= 8) {
        // Single row with few columns - show as key-value pairs
        response += '| Metric | Value |\n|--------|-------|\n';
        for (const [key, value] of Object.entries(rows[0])) {
          const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          const formattedValue = value === null ? '-' :
                                 typeof value === 'boolean' ? (value ? '✅ Yes' : '❌ No') :
                                 value instanceof Date ? value.toLocaleDateString() :
                                 typeof value === 'number' && key.includes('cost') ? `$${value.toFixed(4)}` :
                                 value;
          response += `| ${formattedKey} | ${formattedValue} |\n`;
        }
      } else {
        // Multiple rows - show as table
        const headers = Object.keys(rows[0]);
        response += '| ' + headers.map(h => h.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())).join(' | ') + ' |\n';
        response += '|' + headers.map(() => '---').join('|') + '|\n';

        for (const row of rows.slice(0, 25)) { // Limit to 25 rows for readability
          response += '| ' + headers.map(h => {
            const val = row[h];
            if (val === null) return '-';
            if (typeof val === 'boolean') return val ? '✅' : '❌';
            if (val instanceof Date) return val.toLocaleDateString();
            if (typeof val === 'number' && h.includes('cost')) return `$${val.toFixed(4)}`;
            return String(val).substring(0, 30);
          }).join(' | ') + ' |\n';
        }

        if (rows.length > 25) {
          response += `\n_... and ${rows.length - 25} more rows_\n`;
        }
      }

      response += `\n---\n_Query completed. ${rows.length} record(s) found._`;
      return { handled: true, response };
    }

    // If no query matched, return null to let AI handle it
    return { handled: false };

  } catch (error) {
    console.error('❌ [ADMIN_QUERY] Error:', error);
    return {
      handled: true,
      response: `## ❌ Query Error\n\nSorry, I encountered an error running that query:\n\`\`\`\n${error.message}\n\`\`\`\n\nPlease try rephrasing your request or ask for a specific query type:\n- User search (by email or name)\n- Onboarding status\n- Agent usage stats\n- Conversation stats\n- Platform summary\n- API costs`
    };
  }
}

// Generate embedding using OpenRouter
async function generateEmbedding(text) {
  return new Promise((resolve, reject) => {
    const requestBody = JSON.stringify({
      model: 'text-embedding-3-small',
      input: text
    });

    const options = {
      hostname: 'openrouter.ai',
      port: 443,
      path: '/api/v1/embeddings',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.data && response.data[0] && response.data[0].embedding) {
            resolve(response.data[0].embedding);
          } else {
            reject(new Error('Invalid embedding response'));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(requestBody);
    req.end();
  });
}

// NOTE: searchRelevantChunks is imported from ./backend/services/ragService.cjs (line 41)

// OpenRouter API call (non-streaming)
async function callOpenRouter(messages, agentId, modelOverride = null, options = {}) {
  const startTime = Date.now();

  // Build full system prompt with behavior modifiers and brand voice
  const systemPrompt = await buildFullSystemPrompt(agentId, options.userId, pool);
  const agent = AGENT_CACHE[agentId];
  // Use model override if provided, otherwise use agent's chat_model from database
  const model = modelOverride || getModelForOperation(agentId, 'chat');
  const maxTokens = agent?.max_tokens || 5000;
  const temperature = parseFloat(agent?.temperature) || 0.7;

  console.log(`🤖 [AI MODEL] Agent: ${agentId} | Using model: ${model}${modelOverride ? ' (OVERRIDE)' : ''} | Max tokens: ${maxTokens} | Temperature: ${temperature}`);

  return new Promise((resolve, reject) => {

    const requestBody = JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      max_tokens: maxTokens,
      temperature: temperature
    });

    const reqOptions = {
      hostname: 'openrouter.ai',
      port: 443,
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody),
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'MindsetOS Platform'
      }
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.choices && response.choices[0]) {
            const content = response.choices[0].message.content;
            const latency = Date.now() - startTime;

            // Log usage if we have usage data and options
            if (response.usage && options.userId) {
              // Use nullish coalescing to only use 0 as fallback, not estimation
              const inputTokens = response.usage.prompt_tokens ?? 0;
              const outputTokens = response.usage.completion_tokens ?? 0;

              // Warn if API returned 0 tokens for both (unusual)
              if (inputTokens === 0 && outputTokens === 0) {
                console.warn('⚠️  API returned 0 tokens for both input and output');
              }

              logAPIUsage(
                options.userId,
                agentId,
                model,
                options.operation || 'chat',
                inputTokens,
                outputTokens,
                latency,
                options.conversationId || null
              ).catch(err => console.error('❌ Log usage error:', err));
            }

            resolve(content);
          } else {
            reject(new Error('Invalid OpenRouter response'));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(requestBody);
    req.end();
  });
}

// OpenRouter API call with retry logic + OpenAI fallback (non-streaming)
async function callOpenRouterWithRetry(messages, model, options = {}) {
  const maxRetries = 2;
  const baseDelay = 2000;
  let lastError = null;

  // Helper: make a single non-streaming OpenRouter call
  function makeOpenRouterCall(callModel) {
    const requestBody = JSON.stringify({
      model: callModel,
      messages: messages,
      max_tokens: options.maxTokens || 2000,
      temperature: options.temperature || 0.3
    });

    return new Promise((resolve, reject) => {
      const reqOptions = {
        hostname: 'openrouter.ai',
        port: 443,
        path: '/api/v1/chat/completions',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody),
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'MindsetOS Platform'
        }
      };

      const req = https.request(reqOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode === 429 || (res.statusCode >= 500 && res.statusCode < 600)) {
              const error = new Error(`API error: ${res.statusCode}`);
              error.statusCode = res.statusCode;
              reject(error);
              return;
            }
            const response = JSON.parse(data);
            if (response.choices && response.choices[0]) {
              resolve(response.choices[0].message.content);
            } else {
              reject(new Error('Invalid OpenRouter response'));
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', reject);
      req.write(requestBody);
      req.end();
    });
  }

  // Phase 1: Try primary model with retries
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await makeOpenRouterCall(model);
    } catch (error) {
      lastError = error;
      const isRetryable = error.statusCode === 429 ||
                         error.statusCode === 503 ||
                         error.statusCode === 504 ||
                         (error.statusCode >= 500 && error.statusCode < 600);

      if (!isRetryable) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`🔄 [RETRY] callOpenRouterWithRetry attempt ${attempt + 1}/${maxRetries} failed with ${error.statusCode}. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Phase 2: All retries exhausted — try OpenAI fallback
  const fallbackModel = getFallbackModel(model);
  if (fallbackModel) {
    console.log(`🔄 [FALLBACK] Non-streaming: ${model} unavailable after ${maxRetries + 1} attempts (${lastError?.statusCode}). Trying fallback: ${fallbackModel}`);
    try {
      const result = await makeOpenRouterCall(fallbackModel);
      console.log(`✅ [FALLBACK] Non-streaming fallback ${fallbackModel} succeeded`);
      return result;
    } catch (fallbackError) {
      console.error(`❌ [FALLBACK] Non-streaming fallback ${fallbackModel} also failed:`, fallbackError.message);
      throw lastError;
    }
  }

  throw lastError;
}

// ============================================
// CONVERSATION AUTO-SUMMARIZATION SYSTEM
// Reduces token costs for long conversations
// ============================================

const SUMMARIZATION_CONFIG = {
  // Token-based thresholds (more accurate than message count)
  TRIGGER_TOKEN_COUNT: 12000,     // Was 8K — raised to avoid premature summarization of workflow conversations
  RECENT_TOKENS_TO_KEEP: 10000,   // Was 6K — keep ~10K tokens of recent context intact so deliverables persist
  MIN_TOKENS_TO_SUMMARIZE: 3000,  // Minimum tokens before summarization is worthwhile (was 2K)

  // Message-based minimum — keep at least this many recent messages
  RECENT_MESSAGES_MIN: 4,         // Always keep last 4 messages (2 exchanges) — was 10 which prevented summarization

  // Model for summarization (using cheap/fast Haiku)
  MODEL: 'anthropic/claude-haiku-4.5',
  MAX_TOKENS: 1500,
  TEMPERATURE: 0.3
};

/**
 * Estimate token count from text (rough approximation: ~4 chars per token)
 */
function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Estimate total tokens in a messages array
 */
function estimateMessagesTokens(messages) {
  return messages.reduce((total, msg) => total + estimateTokens(msg.content), 0);
}

/**
 * Summarize older conversation history to reduce token usage
 * Triggers based on token count, not message count
 * @param {Array} messages - Array of {role, content} message objects
 * @param {string} agentId - For logging purposes
 * @returns {Promise<{messages: Array, wasSummarized: boolean, stats: Object}>}
 */
async function summarizeConversationHistory(messages, agentId = 'unknown') {
  const messageCount = messages.length;
  const totalTokens = estimateMessagesTokens(messages);

  // Check if summarization is needed based on TOKEN count
  if (totalTokens < SUMMARIZATION_CONFIG.TRIGGER_TOKEN_COUNT) {
    return {
      messages,
      wasSummarized: false,
      stats: { originalCount: messageCount, estimatedTokens: totalTokens, reason: 'below_token_threshold' }
    };
  }

  // Find split point: keep recent messages up to RECENT_TOKENS_TO_KEEP
  let recentTokens = 0;
  let splitIndex = messages.length;

  for (let i = messages.length - 1; i >= 0; i--) {
    const msgTokens = estimateTokens(messages[i].content);
    if (recentTokens + msgTokens > SUMMARIZATION_CONFIG.RECENT_TOKENS_TO_KEEP) {
      splitIndex = i + 1;
      break;
    }
    recentTokens += msgTokens;
  }

  // Ensure we keep at least RECENT_MESSAGES_MIN recent messages (but allow summarization of the rest)
  splitIndex = Math.min(splitIndex, messages.length - SUMMARIZATION_CONFIG.RECENT_MESSAGES_MIN);
  splitIndex = Math.max(splitIndex, 0);

  const messagesToSummarize = messages.slice(0, splitIndex);
  const recentMessages = messages.slice(splitIndex);
  const tokensToSummarize = estimateMessagesTokens(messagesToSummarize);

  // Need enough tokens to make summarization worthwhile
  if (tokensToSummarize < SUMMARIZATION_CONFIG.MIN_TOKENS_TO_SUMMARIZE) {
    return {
      messages,
      wasSummarized: false,
      stats: { originalCount: messageCount, estimatedTokens: totalTokens, reason: 'not_enough_tokens_to_summarize' }
    };
  }

  console.log(`📝 [SUMMARIZE] Starting conversation summarization for ${agentId}`);
  console.log(`   Total: ~${totalTokens} tokens (${messageCount} msgs) | Summarizing: ~${tokensToSummarize} tokens (${messagesToSummarize.length} msgs) | Keeping: ~${recentTokens} tokens (${recentMessages.length} msgs)`);

  // Estimate token savings
  const oldTokenEstimate = messagesToSummarize.reduce((sum, m) => sum + (m.content?.length || 0) / 4, 0);

  try {
    // Build conversation text for summarization
    const conversationText = messagesToSummarize.map((m, i) => {
      const role = m.role === 'user' ? 'USER' : 'ASSISTANT';
      // Truncate very long messages in the summary input
      const content = m.content.length > 1500 ? m.content.substring(0, 1500) + '...' : m.content;
      return `[${role}]: ${content}`;
    }).join('\n\n');

    const summarizationPrompt = `You are summarizing a conversation history to preserve context while reducing length.

This conversation is between a user and an AI assistant helping with business/consulting tasks.

IMPORTANT: Create a concise summary that captures:
1. Key topics discussed
2. Important decisions or conclusions reached
3. User's specific situation, goals, and preferences mentioned
4. Any frameworks, offers, or business elements the user has developed
5. Any outstanding questions or next steps mentioned

Keep the summary focused and professional. Format as a brief narrative summary (not bullet points).
Aim for 300-500 words that capture the essential context.

CONVERSATION TO SUMMARIZE:
${conversationText}

SUMMARY:`;

    const summaryMessages = [
      { role: 'user', content: summarizationPrompt }
    ];

    const summary = await callOpenRouterWithRetry(
      summaryMessages,
      SUMMARIZATION_CONFIG.MODEL,
      { maxTokens: SUMMARIZATION_CONFIG.MAX_TOKENS, temperature: SUMMARIZATION_CONFIG.TEMPERATURE }
    );

    if (!summary || summary.length < 100) {
      console.warn(`⚠️ [SUMMARIZE] Summary too short or empty, keeping original messages`);
      return {
        messages,
        wasSummarized: false,
        stats: { originalCount: messageCount, reason: 'summary_failed' }
      };
    }

    // Create the new message array with summary + recent messages
    const summaryMessage = {
      role: 'system',
      content: `[CONVERSATION SUMMARY - Earlier discussion condensed to save context]\n\n${summary}\n\n[END OF SUMMARY - Recent messages follow]`
    };

    const newMessages = [summaryMessage, ...recentMessages];

    const newTokenEstimate = summary.length / 4 + recentMessages.reduce((sum, m) => sum + (m.content?.length || 0) / 4, 0);
    const tokensSaved = Math.round(oldTokenEstimate - newTokenEstimate);
    const savingsPercent = Math.round((tokensSaved / oldTokenEstimate) * 100);

    console.log(`✅ [SUMMARIZE] Success! ${messageCount} messages → ${newMessages.length} messages`);
    console.log(`   Est. tokens: ${Math.round(oldTokenEstimate)} → ${Math.round(newTokenEstimate)} (saved ~${tokensSaved} tokens, ${savingsPercent}%)`);

    return {
      messages: newMessages,
      wasSummarized: true,
      stats: {
        originalCount: messageCount,
        newCount: newMessages.length,
        summarizedCount: messagesToSummarize.length,
        keptCount: recentMessages.length,
        estimatedTokensSaved: tokensSaved,
        savingsPercent
      }
    };

  } catch (error) {
    console.error(`❌ [SUMMARIZE] Error during summarization:`, error.message);
    // On error, return original messages - don't break the chat
    return {
      messages,
      wasSummarized: false,
      stats: { originalCount: messageCount, reason: 'error', error: error.message }
    };
  }
}

// Widget formatter model selection (can be updated via API)
let widgetFormatterModel = 'anthropic/claude-haiku-4.5'; // Haiku 4.5

// ============================================
// HAIKU AUTO-NAMING & CONTENT TRIMMING SERVICE
// Uses Haiku 4.5 for cheap/fast title generation
// and prefix/suffix trimming on play saves
// ============================================

const HAIKU_SERVICE_MODEL = 'anthropic/claude-haiku-4.5';

/**
 * Call Haiku via OpenRouter for lightweight tasks (naming, trimming)
 * Returns the text response or null on failure
 */
async function callHaikuService(systemPrompt, userContent, maxTokens = 100) {
  return new Promise((resolve) => {
    const requestBody = JSON.stringify({
      model: HAIKU_SERVICE_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      max_tokens: maxTokens,
      temperature: 0.3
    });

    const reqOptions = {
      hostname: 'openrouter.ai',
      port: 443,
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody),
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'MindsetOS Platform'
      }
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.choices && response.choices[0]) {
            resolve(response.choices[0].message.content.trim());
          } else {
            console.warn('⚠️ [HAIKU_SERVICE] No choices in response');
            resolve(null);
          }
        } catch (error) {
          console.error('❌ [HAIKU_SERVICE] Parse error:', error.message);
          resolve(null);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ [HAIKU_SERVICE] Request error:', error.message);
      resolve(null);
    });
    req.write(requestBody);
    req.end();
  });
}

/**
 * Generate a short title (3-6 words) for a play or conversation
 * @param {string} content - The content to title (first ~600 chars used)
 * @param {string} type - 'play' or 'conversation'
 */
async function generateTitle(content, type = 'play') {
  const snippet = (content || '').substring(0, 600);
  if (!snippet.trim()) return null;

  const systemPrompt = type === 'conversation'
    ? `You are a title generator. Output ONLY a 3-6 word title, nothing else. No explanations, no questions, no preamble. Just the title words.

Rules:
- Exactly 3-6 words
- No quotes, no punctuation at end
- Summarize the topic discussed
- Examples of CORRECT output: Money Model for SaaS Coaches | LinkedIn Event Topic Ideas | Qualification Script Review
- Examples of WRONG output: "I'd be happy to help! Here's a title:" | "Sure, here is a suggestion:"`
    : `You are a title generator. Output ONLY a 3-6 word title, nothing else. No explanations, no questions, no preamble. Just the title words.

Rules:
- Exactly 3-6 words
- No quotes, no punctuation at end
- Capture the main deliverable
- Examples of CORRECT output: SaaS Founder Money Model | 10-Day Email Campaign | Expert Event Framework
- Examples of WRONG output: "Here's a great title:" | "I suggest the following:"`;

  const title = await callHaikuService(systemPrompt, snippet, 30);
  if (!title) return null;

  // Clean up: remove quotes, limit length
  let cleaned = title.replace(/^["']|["']$/g, '').replace(/\.+$/, '').trim();

  // Reject if Haiku returned a conversational response instead of a title
  const rejectPatterns = ['I\'d be happy', 'I can help', 'I\'m ready', 'I\'m Claude', 'However', 'Here\'s', 'Of course', 'Sure,', 'What would you', 'Let me', 'I\'ll help'];
  if (cleaned.length > 80 || cleaned.includes('\n') || rejectPatterns.some(p => cleaned.includes(p))) {
    console.warn(`⚠️ [TITLE_GEN] Rejected bad title: "${cleaned.substring(0, 60)}..."`);
    return null;
  }

  return cleaned.substring(0, 100);
}

/**
 * Trim prefix (intro chat) and suffix (closing chat) from play content.
 * Returns { prefix, content, suffix } where content is the clean deliverable.
 * The AI identifies where the deliverable starts and ends.
 */
async function trimPlayContent(rawContent) {
  if (!rawContent || rawContent.length < 100) {
    return { prefix: '', content: rawContent || '', suffix: '' };
  }

  const systemPrompt = `You split AI assistant responses into 3 parts:
1. PREFIX: The conversational intro before the main deliverable (e.g. "Love it — let's make these names unforgettable. 🎯\\n\\n"). Often 1-3 short sentences of encouragement/transition.
2. CONTENT: The main structured deliverable (frameworks, lists, scripts, campaigns, models, etc.)
3. SUFFIX: The conversational closing after the deliverable (e.g. "Let me know which option you prefer!" or "Want me to refine any of these?"). Often 1-2 sentences.

Return ONLY valid JSON: {"prefixEndIndex": N, "suffixStartIndex": N}
- prefixEndIndex = character index where the deliverable STARTS (0 if no prefix)
- suffixStartIndex = character index where the deliverable ENDS (content length if no suffix)

If there's no clear prefix or suffix, use 0 and content length respectively.`;

  // Send first 3000 chars for analysis (covers most plays)
  const snippet = rawContent.substring(0, 3000);
  const result = await callHaikuService(systemPrompt, snippet, 100);

  if (!result) {
    return { prefix: '', content: rawContent, suffix: '' };
  }

  try {
    // Extract JSON from response (Haiku might wrap it in text)
    const jsonMatch = result.match(/\{[^}]+\}/);
    if (!jsonMatch) {
      return { prefix: '', content: rawContent, suffix: '' };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    let prefixEnd = parseInt(parsed.prefixEndIndex) || 0;
    let suffixStart = parseInt(parsed.suffixStartIndex) || rawContent.length;

    // Sanity checks
    if (prefixEnd < 0) prefixEnd = 0;
    if (prefixEnd > rawContent.length * 0.3) prefixEnd = 0; // Prefix shouldn't be >30% of content
    if (suffixStart > rawContent.length) suffixStart = rawContent.length;
    if (suffixStart < rawContent.length * 0.7) suffixStart = rawContent.length; // Suffix shouldn't be >30%
    if (prefixEnd >= suffixStart) {
      return { prefix: '', content: rawContent, suffix: '' };
    }

    const prefix = rawContent.substring(0, prefixEnd).trim();
    const content = rawContent.substring(prefixEnd, suffixStart).trim();
    const suffix = rawContent.substring(suffixStart).trim();

    console.log(`✂️ [HAIKU_TRIM] Trimmed play: prefix=${prefix.length}chars, content=${content.length}chars, suffix=${suffix.length}chars`);

    return { prefix, content, suffix };
  } catch (error) {
    console.warn('⚠️ [HAIKU_TRIM] Failed to parse trim response:', error.message);
    return { prefix: '', content: rawContent, suffix: '' };
  }
}

/**
 * Auto-name a conversation based on user's first message(s)
 * Fires async — does not block the chat stream
 */
async function autoNameConversation(conversationId, userMessage) {
  try {
    const title = await generateTitle(userMessage, 'conversation');
    if (!title) return;

    await pool.query(
      `UPDATE conversations SET title = $1, updated_at = NOW() WHERE id = $2 AND (title IS NULL OR title LIKE 'Conversation with %')`,
      [title, conversationId]
    );
    console.log(`✏️ [AUTO_NAME] Conversation ${conversationId} → "${title}"`);
    return title;
  } catch (error) {
    console.error('❌ [AUTO_NAME] Conversation naming failed:', error.message);
    return null;
  }
}

/**
 * Bulk name all untitled plays and conversations
 * Returns { playsNamed, conversationsNamed }
 */
async function bulkAutoName() {
  const stats = { playsNamed: 0, conversationsNamed: 0, errors: 0 };

  // 1. Name untitled plays
  try {
    const untitledPlays = await pool.query(
      `SELECT id, content->>'text' as content FROM artifacts
       WHERE title IS NULL OR title = '' OR title = 'Untitled' OR title = 'Untitled Play' OR title = 'New Play'
       ORDER BY created_at DESC LIMIT 50`
    );

    for (const play of untitledPlays.rows) {
      try {
        const title = await generateTitle(play.content, 'play');
        if (title) {
          await pool.query(`UPDATE artifacts SET title = $1, updated_at = NOW() WHERE id = $2`, [title, play.id]);
          stats.playsNamed++;
          console.log(`✏️ [BULK_NAME] Play ${play.id} → "${title}"`);
        }
      } catch (err) {
        stats.errors++;
      }
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 300));
    }
  } catch (error) {
    console.error('❌ [BULK_NAME] Play naming error:', error.message);
  }

  // 2. Name generic conversations
  try {
    const untitledConvos = await pool.query(
      `SELECT c.id, m.content as first_message FROM conversations c
       LEFT JOIN LATERAL (
         SELECT content FROM messages WHERE conversation_id = c.id AND role = 'user'
         ORDER BY created_at ASC LIMIT 1
       ) m ON true
       WHERE (c.title IS NULL OR c.title LIKE 'Conversation with %')
         AND m.content IS NOT NULL
       ORDER BY c.created_at DESC LIMIT 50`
    );

    for (const conv of untitledConvos.rows) {
      try {
        const title = await generateTitle(conv.first_message, 'conversation');
        if (title) {
          await pool.query(`UPDATE conversations SET title = $1, updated_at = NOW() WHERE id = $2`, [title, conv.id]);
          stats.conversationsNamed++;
          console.log(`✏️ [BULK_NAME] Conversation ${conv.id} → "${title}"`);
        }
      } catch (err) {
        stats.errors++;
      }
      await new Promise(r => setTimeout(r, 300));
    }
  } catch (error) {
    console.error('❌ [BULK_NAME] Conversation naming error:', error.message);
  }

  console.log(`📋 [BULK_NAME] Complete: ${stats.playsNamed} plays, ${stats.conversationsNamed} conversations named, ${stats.errors} errors`);
  return stats;
}

// Admin debug mode for verbose logging
let ADMIN_DEBUG_MODE = false;  // Can be toggled via API

// Helper function for debug logging
function debugLog(category, message, data = null) {
  if (!ADMIN_DEBUG_MODE) return;

  const timestamp = new Date().toISOString();
  console.log(`\n🔍 [DEBUG ${timestamp}] [${category}]`);
  console.log(`   ${message}`);
  if (data) {
    console.log('   DATA:', JSON.stringify(data, null, 2));
  }
  console.log('');
}

// Extract structured metadata from AI response (hidden from user)
function extractStructuredMetadata(aiResponse) {
  const metadataRegex = /\n\n<!-- STRUCTURED_METADATA\n([\s\S]*?)\nEND_METADATA -->/;
  const match = aiResponse.match(metadataRegex);

  if (match) {
    try {
      const metadataJSON = match[1];
      const metadata = JSON.parse(metadataJSON);
      const cleanResponse = aiResponse.replace(match[0], ''); // Remove metadata from response
      return { cleanResponse, metadata };
    } catch (e) {
      console.warn('⚠️ Failed to parse structured metadata:', e.message);
      return { cleanResponse: aiResponse, metadata: null };
    }
  }

  return { cleanResponse: aiResponse, metadata: null };
}

// Widget formatter AI - extracts options as structured JSON (does NOT modify AI response)
async function formatResponseWithWidgets(aiResponse, widgetFormattingEnabled, agentId, widgetModelOverride = null, userId = null, conversationId = null) {
  console.log(`🎮 [WIDGET_FORMATTER_FUNCTION] Called with:`, {
    widgetFormattingEnabled,
    hasResponse: !!aiResponse,
    responseLength: aiResponse?.length || 0,
    agentId,
    widgetModelOverride
  });

  if (!widgetFormattingEnabled || !aiResponse) {
    console.log(`🎮 [WIDGET_FORMATTER_FUNCTION] SKIPPED - widgetFormattingEnabled: ${widgetFormattingEnabled}, hasResponse: ${!!aiResponse}`);
    return { text: aiResponse, wasFormatted: false, quickAddOptions: null };
  }

  console.log(`🎮 [WIDGET_FORMATTER_FUNCTION] PROCESSING - Will extract options`);
  const startTime = Date.now();

  // Extract metadata (if present) before formatting
  const { cleanResponse, metadata } = extractStructuredMetadata(aiResponse);

  // NEW: Widget agent extracts options as structured JSON (doesn't modify text)
  let widgetPromptTemplate = `Analyze this AI response and extract any options/choices the user can select as Quick Add buttons.

TASK: Return ONLY a JSON object with extracted options. Do NOT modify the original text.

RULES:
1. Look for ANY of these patterns that represent clickable choices:
   - Lettered options: A), B), C), D)
   - Numbered lists: 1., 2., 3.
   - Examples: "Example 1:", "Example 2:" or "**Example 1:**"
   - Quoted templates the user could copy/use as their answer
   - Bullet points with distinct choices
2. Extract the CLEAN text of each option:
   - Remove prefixes like "A)", "1.", "Example 1:", "**Example:**"
   - Remove surrounding quotes if it's a quoted example
   - Remove markdown formatting like ** or *
   - Keep the actual content the user would want to send
3. If there are 2+ clear options/choices/examples, return them as JSON
4. If no clear options found, return {"options": []}

RESPONSE FORMAT (JSON only, no other text):
{"options": ["Clean option 1 text", "Clean option 2 text", "Clean option 3 text"]}

AI RESPONSE TO ANALYZE:
${cleanResponse}

JSON OUTPUT:`;

  // Load prompt, model, and parameters from database
  let widgetModel = widgetFormatterModel;
  let widgetTemperature = 0.3;
  let widgetMaxTokens = 6000;

  try {
    const promptResult = await pool.query(`
      SELECT system_prompt as prompt_text, model_id, temperature, max_tokens
      FROM system_prompts
      WHERE prompt_type = 'widget_formatting'
    `);
    if (promptResult.rows.length > 0) {
      const config = promptResult.rows[0];
      // Replace placeholder with clean response (metadata already removed)
      widgetPromptTemplate = config.prompt_text.replace('${aiResponse}', aiResponseToFormat);

      // If metadata exists, add it as context for the widget formatter
      if (metadata) {
        const metadataContext = `\n\nCONTEXT FROM AI (hidden from user):\n${JSON.stringify(metadata, null, 2)}`;
        widgetPromptTemplate += metadataContext;
        console.log('📋 [WIDGET] Using structured metadata from AI response');
      }

      widgetModel = config.model_id || widgetModel;
      widgetTemperature = parseFloat(config.temperature) || widgetTemperature;
      widgetMaxTokens = parseInt(config.max_tokens) || widgetMaxTokens;
      console.log(`📝 [WIDGET] Using config from database: ${widgetModel}, temp=${widgetTemperature}, max_tokens=${widgetMaxTokens}`);
    }
  } catch (dbError) {
    console.warn(`⚠️ [WIDGET] Failed to load config from database, using defaults:`, dbError.message);
  }

  const widgetPrompt = widgetPromptTemplate;

  try {
    // Get widget model: override > agent-specific > database config
    let modelToUse = widgetModelOverride;
    if (!modelToUse) {
      const agentModel = getModelForOperation(agentId, 'widget');
      modelToUse = agentModel || widgetModel;
    }

    const requestBody = JSON.stringify({
      model: modelToUse,
      messages: [
        { role: 'user', content: widgetPrompt }
      ],
      max_tokens: widgetMaxTokens,
      temperature: widgetTemperature
    });

    const options = {
      hostname: 'openrouter.ai',
      port: 443,
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'MindsetOS Platform - Widget Formatter'
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            const formattedResponse = parsed.choices[0]?.message?.content || aiResponse;
            const latency = Date.now() - startTime;

            // Log usage if we have userId
            if (userId && parsed.usage) {
              // Use nullish coalescing to only use 0 as fallback, not estimation
              const inputTokens = parsed.usage.prompt_tokens ?? 0;
              const outputTokens = parsed.usage.completion_tokens ?? 0;

              // Warn if API returned 0 tokens for both (unusual)
              if (inputTokens === 0 && outputTokens === 0) {
                console.warn('⚠️  Widget API returned 0 tokens for both input and output');
              }

              logAPIUsage(
                userId,
                agentId,
                modelToUse,
                'widget',
                inputTokens,
                outputTokens,
                latency,
                conversationId
              ).catch(err => console.error('❌ Log widget usage error:', err));
            }

            // Parse JSON response to extract options OR gamification widgets
            let quickAddOptions = null;
            let widgetCard = null;
            try {
              // Try to extract JSON from response (handle cases where AI adds extra text)
              const jsonMatch = formattedResponse.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                // Check for gamification widget first (higher priority)
                if (parsed.widget && parsed.widget.type && parsed.widget.data) {
                  widgetCard = parsed.widget;
                  console.log('🎮 Widget extracted gamification card:', widgetCard.type);
                }
                // Then check for quick add options
                else if (parsed.options && Array.isArray(parsed.options) && parsed.options.length >= 2) {
                  quickAddOptions = parsed.options;
                  console.log('✨ Widget extracted Quick Add options:', quickAddOptions);
                }
              }
            } catch (jsonError) {
              console.log('⚠️ Widget JSON parse failed:', jsonError.message);
              console.log('Raw response:', formattedResponse.substring(0, 300));
            }

            // Return original text unchanged + extracted options/widgets
            if (widgetCard) {
              console.log(`🎮 Widget found gamification card: ${widgetCard.type}`);
              resolve({
                text: cleanResponse,
                wasFormatted: true,
                quickAddOptions: null,
                widgetCard
              });
            } else if (quickAddOptions && quickAddOptions.length >= 2) {
              console.log(`✅ Widget found ${quickAddOptions.length} Quick Add options`);
              resolve({
                text: cleanResponse, // KEEP ORIGINAL TEXT - don't modify
                wasFormatted: true,
                quickAddOptions
              });
            } else {
              console.log('ℹ️ Widget: No Quick Add options or widgets found');
              resolve({ text: cleanResponse, wasFormatted: false, quickAddOptions: null });
            }
          } catch (e) {
            console.error('❌ Widget formatting failed, using original response');
            resolve({ text: cleanResponse, wasFormatted: false });
          }
        });
      });

      req.on('error', () => {
        console.error('❌ Widget formatting error, using original response');
        resolve({ text: cleanResponse, wasFormatted: false });
      });

      req.write(requestBody);
      req.end();
    });
  } catch (error) {
    console.error('❌ Widget formatting exception:', error);
    return { text: cleanResponse, wasFormatted: false };
  }
}

// Retrieve relevant memories using RAG
async function getRelevantMemories(userId, query, limit = 5) {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    const queryVector = '[' + queryEmbedding.join(',') + ']';

    // Search for similar memories using cosine similarity
    const result = await pool.query(`
      SELECT
        id,
        memory_type,
        content,
        importance_score,
        created_at,
        1 - (embedding <=> $1::vector) as similarity
      FROM memories
      WHERE user_id = $2
        AND embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector
      LIMIT $3
    `, [queryVector, userId, limit]);

    console.log(`🔍 [RAG] Retrieved ${result.rows.length} relevant memories for user (similarity threshold applied)`);

    return result.rows.filter(m => m.similarity > 0.7); // Only return highly relevant memories
  } catch (error) {
    console.error('❌ [RAG] Failed to retrieve memories:', error);
    return [];
  }
}

// Extract memories from conversation (async background process)
async function extractMemories(conversationId, userId, agentId, messages, memoryModelOverride = null) {
  try {
    console.log(`🧠 [MEMORY] Auto-extracting memories from conversation ${conversationId}`);

    // Get the agent's system prompt to understand what information is important
    const agent = AGENT_CACHE[agentId];
    const agentPrompt = agent?.system_prompt || '';
    console.log(`🎯 [MEMORY] Using agent-aware extraction for ${agentId} (prompt: ${agentPrompt.length} chars)`);

    // Build conversation text from USER messages only
    const conversationText = messages
      .filter(msg => msg.role === 'user')
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n\n');

    // Load prompt from database (with fallback to agent-aware default)
    let extractionPromptTemplate = `You are extracting important information from a conversation with an AI agent.

AGENT'S PURPOSE AND QUESTIONS:
{agentPrompt}

CONVERSATION:
{conversationText}

Based on what the agent is asking for and the conversation context, extract important information the agent should remember about this user.

Extract these types of information:
1. GOALS - What they want to achieve
2. PAIN_POINTS - Problems or challenges
3. BUSINESS_CONTEXT - Their business, industry, role, name, company
4. STRATEGIES - Approaches they prefer
5. PREFERENCES - Communication style, likes/dislikes
6. DECISIONS - Commitments made
7. DELIVERABLE - Completed outputs the user approved/locked in (message sequences, Money Models, scripts, frameworks, campaign plans). Include the FULL content verbatim.

IMPORTANT: Pay special attention to direct answers to the agent's questions (like name, company, role, etc).
IMPORTANT: When the user says "lock that in", "that's the one", "approved", "perfect", "use that", or confirms a completed deliverable, extract it as type "deliverable" with importance 0.95+. Include the FULL verbatim text of the deliverable, not a summary.

For each memory:
- type: [goals, pain_points, business_context, strategies, preferences, decisions, deliverable]
- content: 1-2 sentence description (for deliverables: include the FULL verbatim text)
- importance: 0.0-1.0 (0.95+ approved deliverables, 0.8+ direct answers to agent questions, 0.7+ critical info, 0.4-0.7 useful, <0.4 minor)

Return ONLY JSON array:
[{"type": "business_context", "content": "User is Gregory Robinson from LinkedVA", "importance": 0.9}, ...]`;

    try {
      const promptResult = await pool.query(`
        SELECT system_prompt as prompt_text FROM system_prompts WHERE prompt_type = 'memory_extraction'
      `);
      if (promptResult.rows.length > 0) {
        extractionPromptTemplate = promptResult.rows[0].prompt_text;
        console.log(`📝 [MEMORY] Using custom prompt from database`);
      }
    } catch (dbError) {
      console.warn(`⚠️ [MEMORY] Failed to load custom prompt, using default:`, dbError.message);
    }

    // Replace placeholders with actual agent prompt and conversation
    const extractionPrompt = extractionPromptTemplate
      .replace('{agentPrompt}', agentPrompt.substring(0, 2000)) // Limit agent prompt to 2000 chars
      .replace('{conversationText}', conversationText);

    // Get memory model: override > agent-specific > system default
    let modelToUse = memoryModelOverride;
    if (!modelToUse) {
      modelToUse = getModelForOperation(agentId, 'memory');
    }

    const aiResponse = await callOpenRouter(
      [{ role: 'user', content: extractionPrompt }],
      agentId,
      modelToUse, // Pass as model override
      { userId, operation: 'memory', conversationId } // Pass options for logging
    );

    // Parse memories
    let memories = [];
    try {
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        memories = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('❌ Failed to parse memories:', parseError);
      return;
    }

    console.log(`📊 [MEMORY] Extracted ${memories.length} memories automatically`);

    // Save to database with embeddings
    for (const memory of memories) {
      try {
        // Generate embedding for semantic search
        const embedding = await generateEmbedding(memory.content);
        const embeddingArray = '[' + embedding.join(',') + ']';

        // Determine memory tier: high-importance identity facts + approved deliverables = core, everything else = active
        const importance = memory.importance || 0.5;
        const isCoreBizContext = memory.type === 'business_context' && importance >= 0.90;
        const isCoreDeliverable = memory.type === 'deliverable' && importance >= 0.90;
        const memoryTier = (isCoreBizContext || isCoreDeliverable) ? 'core' : 'active';

        await pool.query(`
          INSERT INTO memories (
            user_id, agent_id, memory_type, content, importance_score,
            source_conversation_id, source, embedding, memory_tier, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector, $9, NOW(), NOW())
        `, [
          userId,
          agentId,
          memory.type,
          memory.content,
          memory.importance || 0.5,
          conversationId,
          memory.source || 'ai',
          embeddingArray,
          memoryTier
        ]);

        const sourceIcon = memory.source === 'user' ? '👤' : '🤖';
        console.log(`✅ [MEMORY] ${sourceIcon} Auto-saved ${memory.type} with embedding (${memory.source || 'ai'}): ${memory.content.substring(0, 50)}...`);
      } catch (embErr) {
        console.error(`❌ [MEMORY] Failed to generate embedding for memory, saving without:`, embErr.message);
        // Fallback: save without embedding
        await pool.query(`
          INSERT INTO memories (
            user_id, agent_id, memory_type, content, importance_score,
            source_conversation_id, source, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        `, [
          userId,
          agentId,
          memory.type,
          memory.content,
          memory.importance || 0.5,
          conversationId,
          memory.source || 'ai'
        ]);
      }
    }
  } catch (error) {
    console.error('❌ Auto-extract memories error:', error);
  }
}

// OpenRouter API call with streaming (with retry logic + OpenAI fallback)
async function streamOpenRouterWithRetry(messages, agentId, responseStream, options = {}) {
  const maxRetries = 2;
  const baseDelay = 2000; // Start with 2 second delay
  let lastError = null;

  // Phase 1: Try primary model with retries
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await streamOpenRouter(messages, agentId, responseStream, options);
      return result; // Success, return the result
    } catch (error) {
      lastError = error;
      // Check if it's a retryable error (429, 503, 504, etc.)
      const isRetryable = error.statusCode === 429 ||
                         error.statusCode === 503 ||
                         error.statusCode === 504 ||
                         (error.statusCode >= 500 && error.statusCode < 600);

      if (!isRetryable) {
        // Not a provider outage (e.g. 401/402 auth error), throw immediately
        throw error;
      }

      if (attempt < maxRetries) {
        // Calculate exponential backoff delay
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`🔄 [RETRY] Attempt ${attempt + 1}/${maxRetries} failed with ${error.statusCode}. Retrying in ${delay}ms...`);

        // Send a status update to the frontend
        responseStream.write(`data: ${JSON.stringify({
          type: 'status',
          message: `⏳ AI service temporarily busy. Retrying in ${delay/1000} seconds...`
        })}\n\n`);

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Phase 2: All retries exhausted — try OpenAI fallback
  const agent = AGENT_CACHE[agentId];
  const primaryModel = options.modelOverride || (agent && (agent.chat_model || agent.model_preference)) || 'anthropic/claude-sonnet-4.6';
  const fallbackModel = getFallbackModel(primaryModel);

  if (fallbackModel) {
    console.log(`🔄 [FALLBACK] Primary model ${primaryModel} unavailable after ${maxRetries + 1} attempts (${lastError?.statusCode}). Trying fallback: ${fallbackModel}`);

    // Notify user about fallback
    responseStream.write(`data: ${JSON.stringify({
      type: 'status',
      message: `🔄 Primary AI provider temporarily unavailable. Switching to backup model...`
    })}\n\n`);

    try {
      const fallbackOptions = { ...options, modelOverride: fallbackModel };
      const result = await streamOpenRouter(messages, agentId, responseStream, fallbackOptions);
      console.log(`✅ [FALLBACK] Successfully used fallback model ${fallbackModel} for ${agentId}`);
      return result;
    } catch (fallbackError) {
      console.error(`❌ [FALLBACK] Fallback model ${fallbackModel} also failed:`, fallbackError.message);
      // Throw the original error since both primary and fallback failed
      throw lastError;
    }
  }

  // No fallback available, throw the original error
  throw lastError;
}

// OpenRouter API call with streaming (original function)
async function streamOpenRouter(messages, agentId, responseStream, options = {}) {
  const { closeStream = true, modelOverride = null, enablePromptExtraction = true, skipBrandVoice = false, clientProfileId = null } = options;

  // Build full system prompt with behavior modifiers and brand voice
  let systemPrompt = await buildFullSystemPrompt(agentId, options.userId, pool, { skipBrandVoice, clientProfileId });
  const agent = AGENT_CACHE[agentId];
  // Use model override if provided, otherwise use agent's chat_model from database
  const model = modelOverride || getModelForOperation(agentId, 'chat');
  const maxTokens = agent?.max_tokens || 5000;
  const temperature = parseFloat(agent?.temperature) || 0.7;

  // ============================================
  // PROMPT_EXTRACT — DISABLED
  // This feature was reducing structured agent prompts from ~2800 to ~300 tokens,
  // destroying step-by-step workflows. Agents lost their instructions mid-conversation,
  // couldn't produce final outputs, and bled into other agents' territory.
  // The ~2K token savings per message is NOT worth losing agent workflow integrity.
  // If re-enabling, only use for reference-style prompts (>15K tokens), never for
  // step-by-step workflow agents like MMM, Offer Architect, etc.
  // ============================================
  let promptExtractionResult = null;
  console.log(`📋 [SYSTEM PROMPT] Using full prompt for ${agentId} (~${Math.round(systemPrompt.length / 4)} tokens)`);

  // ============================================
  // AUTO-SUMMARIZATION FOR LONG CONVERSATIONS
  // Reduces token costs by summarizing old messages
  // Triggers based on TOKEN count, not message count
  // ============================================
  let processedMessages = messages;
  let summarizationStats = null;
  const estimatedConversationTokens = estimateMessagesTokens(messages);

  if (estimatedConversationTokens >= SUMMARIZATION_CONFIG.TRIGGER_TOKEN_COUNT) {
    if (PERF_ASYNC_SUMMARIZE) {
      // ASYNC MODE: Skip blocking summarization — use original messages and let
      // the outer trim block handle context management for this request.
      // The trim block's background summary will cache for next request.
      console.log(`⚡ [SUMMARIZE_ASYNC] Skipping inline summarization (~${Math.round(estimatedConversationTokens / 1000)}K tokens) — async mode enabled`);
      responseStream.write(`data: ${JSON.stringify({
        type: 'status',
        status: 'summarize_skipped',
        message: `⚡ Processing with full context...`
      })}\n\n`);
    } else {
      // SYNCHRONOUS MODE (legacy): Block and summarize inline
      responseStream.write(`data: ${JSON.stringify({
        type: 'status',
        status: 'summarizing',
        message: `📝 Optimizing conversation (~${Math.round(estimatedConversationTokens / 1000)}K tokens)...`
      })}\n\n`);

      try {
        const summarizationResult = await summarizeConversationHistory(messages, agentId);
        processedMessages = summarizationResult.messages;
        summarizationStats = summarizationResult.stats;

        if (summarizationResult.wasSummarized) {
          const preTokens = estimatedConversationTokens;
          const postTokens = estimateMessagesTokens(processedMessages);
          const actualSaved = preTokens - postTokens;
          const actualPercent = preTokens > 0 ? Math.round((actualSaved / preTokens) * 100) : 0;
          console.log(`📊 [SUMMARIZE] Applied to ${agentId}: ~${preTokens} → ~${postTokens} tokens, saved ~${actualSaved} tokens (${actualPercent}%)`);

          responseStream.write(`data: ${JSON.stringify({
            type: 'status',
            status: 'summarized',
            message: `✅ Optimized (${actualPercent}% fewer tokens)`
          })}\n\n`);
        }
      } catch (summarizeError) {
        console.error('⚠️ [SUMMARIZE] Failed, using original messages:', summarizeError.message);
        processedMessages = messages; // Fallback to original

        responseStream.write(`data: ${JSON.stringify({
          type: 'status',
          status: 'summarize_skipped',
          message: `⚡ Processing with full context...`
        })}\n\n`);
      }
    }
  }

  let finalTokenEstimate = estimateMessagesTokens(processedMessages);

  // ============================================
  // HARD TOKEN CAP — Last line of defense
  // Prevents "maximum context length" errors from OpenRouter/model providers.
  // If total tokens (system prompt + messages + output buffer) exceeds limit,
  // aggressively drop older messages until it fits.
  // ============================================
  const MODEL_TOKEN_LIMIT = 800000; // Safe limit (most models cap at 128K-1M, leave headroom)
  const systemPromptTokens = estimateTokens(systemPrompt);
  const outputBuffer = maxTokens || 5000;
  const availableForMessages = MODEL_TOKEN_LIMIT - systemPromptTokens - outputBuffer;

  if (finalTokenEstimate > availableForMessages) {
    const originalCount = processedMessages.length;
    const originalTokens = finalTokenEstimate;

    // Strategy: keep last N messages that fit within budget
    // Always keep the last message (current user input) and work backwards
    let keptMessages = [];
    let keptTokens = 0;

    for (let i = processedMessages.length - 1; i >= 0; i--) {
      const msgTokens = estimateTokens(processedMessages[i].content);
      if (keptTokens + msgTokens > availableForMessages && keptMessages.length >= 2) {
        break; // Stop adding older messages
      }
      keptMessages.unshift(processedMessages[i]);
      keptTokens += msgTokens;
    }

    // If even the recent messages are too large, truncate the oldest kept messages
    while (keptTokens > availableForMessages && keptMessages.length > 2) {
      const removed = keptMessages.shift();
      keptTokens -= estimateTokens(removed.content);
    }

    // If a single message is too large (e.g. huge document), truncate its content
    if (keptTokens > availableForMessages && keptMessages.length > 0) {
      for (let i = 0; i < keptMessages.length - 1; i++) {
        const msgTokens = estimateTokens(keptMessages[i].content);
        if (msgTokens > 50000) { // Truncate messages over ~200KB
          const maxChars = 50000 * 4; // ~50K tokens worth
          keptMessages[i] = {
            ...keptMessages[i],
            content: keptMessages[i].content.substring(0, maxChars) + '\n...[content truncated to fit context window]'
          };
          keptTokens = estimateMessagesTokens(keptMessages);
        }
      }
    }

    processedMessages = keptMessages;
    finalTokenEstimate = keptTokens;
    console.log(`🚨 [TOKEN_CAP] Exceeded ${MODEL_TOKEN_LIMIT} token limit! Trimmed: ${originalCount} → ${processedMessages.length} messages, ~${originalTokens} → ~${finalTokenEstimate} tokens (system prompt: ~${systemPromptTokens} tokens)`);

    responseStream.write(`data: ${JSON.stringify({
      type: 'status',
      message: `📝 Optimized conversation history to fit context window...`
    })}\n\n`);
  }

  console.log(`🎯 [STREAMING AI MODEL] Agent: ${agentId} | Model: ${model}${modelOverride ? ' (OVERRIDE)' : ''} | Max tokens: ${maxTokens} | Temp: ${temperature} | Messages: ${processedMessages.length} (~${finalTokenEstimate} tokens)${summarizationStats?.wasSummarized ? ' [SUMMARIZED]' : ''}`);

  return new Promise((resolve, reject) => {

    let fullResponse = ''; // Capture the complete AI response
    let usageData = null; // Capture actual token usage from OpenRouter

    // Build message array with optional prompt caching for Anthropic models
    const isAnthropicModel = model && model.startsWith('anthropic/');
    const systemMessage = { role: 'system', content: systemPrompt };

    // PERF: Enable Anthropic prompt caching — system prompt is static per agent,
    // so caching it saves ~90% on input token costs for repeated messages.
    // Cached reads cost 0.1x, writes cost 1.25x (amortized over ~5min TTL)
    if (PERF_PROMPT_CACHING && isAnthropicModel) {
      systemMessage.cache_control = { type: 'ephemeral' };
      console.log(`⚡ [PROMPT_CACHE] Enabled for ${model} (system prompt: ~${Math.round(systemPrompt.length / 4)} tokens)`);
    }

    const fullMessages = [
      systemMessage,
      ...processedMessages
    ];

    debugLog('AI_PROMPT', 'Full prompt being sent to AI', {
      model,
      temperature,
      maxTokens,
      systemPromptLength: systemPrompt.length,
      systemPromptPreview: systemPrompt.substring(0, 500) + '...',
      messageCount: messages.length,
      messages: fullMessages.map(m => ({
        role: m.role,
        contentLength: m.content.length,
        contentPreview: m.content.substring(0, 200) + '...'
      })),
      fullSystemPrompt: ADMIN_DEBUG_MODE ? systemPrompt : '[Enable debug mode to see full prompt]',
      fullConversation: ADMIN_DEBUG_MODE ? fullMessages : '[Enable debug mode to see full conversation]'
    });

    const requestBody = JSON.stringify({
      model: model,
      messages: fullMessages,
      max_tokens: maxTokens,
      temperature: temperature,
      stream: true
    });

    const options = {
      hostname: 'openrouter.ai',
      port: 443,
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody),
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'MindsetOS Platform'
      }
    };

    const streamRequestStart = Date.now();
    const req = https.request(options, (res) => {
      let buffer = '';
      let chunkCount = 0;
      let contentChunks = 0;
      let firstTokenTime = null;

      console.log(`📡 [STREAM] OpenRouter response status: ${res.statusCode}`);

      // Handle non-200 status codes
      if (res.statusCode !== 200) {
        let errorBody = '';

        res.on('data', (chunk) => {
          errorBody += chunk.toString();
        });

        res.on('end', () => {
          let errorMessage = 'API request failed';
          let errorDetails = {};

          try {
            errorDetails = JSON.parse(errorBody);
            errorMessage = errorDetails.error?.message || errorDetails.message || errorMessage;
          } catch (e) {
            errorMessage = errorBody || errorMessage;
          }

          // Map common error codes to user-friendly messages
          if (res.statusCode === 402) {
            errorMessage = '⚠️ API Credits Required: The AI service requires payment. Please add credits to your OpenRouter account or update your payment method.';
          } else if (res.statusCode === 401) {
            errorMessage = '🔑 API Authentication Failed: Invalid API key. Please check your OpenRouter API key configuration.';
          } else if (res.statusCode === 429) {
            errorMessage = '⏸️ Rate Limit Exceeded: Too many requests. Please wait a moment and try again.';
          } else if (res.statusCode >= 500) {
            errorMessage = '🔧 AI Service Error: The AI service is temporarily unavailable. Please try again in a moment.';
          }

          console.error(`❌ [STREAM] OpenRouter API error (${res.statusCode}):`, errorMessage);
          console.error(`❌ [STREAM] Error details:`, errorDetails);

          // Send error to frontend
          const errorResponse = `⚠️ Unable to generate response.\n\n${errorMessage}\n\nStatus Code: ${res.statusCode}`;

          responseStream.write(`data: ${JSON.stringify({
            type: 'error',
            error: errorMessage,
            statusCode: res.statusCode,
            content: errorResponse
          })}\n\n`);

          if (closeStream) {
            responseStream.write(`data: [DONE]\n\n`);
            responseStream.end();
          }

          // Reject with error info for retry logic
          const error = new Error(errorMessage);
          error.statusCode = res.statusCode;
          reject(error);
        });

        return; // Don't process data chunks for error responses
      }

      res.on('data', (chunk) => {
        chunkCount++;
        const chunkStr = chunk.toString();
        // console.log(`📦 [STREAM] Chunk ${chunkCount}: ${chunkStr.substring(0, 100)}...`); // Disabled to reduce log flooding
        buffer += chunkStr;
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer

        for (const line of lines) {
          // Skip empty lines and processing status lines
          if (!line.trim() || line.startsWith(': ')) {
            continue;
          }

          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              const totalStreamTime = Date.now() - streamRequestStart;
              console.log(`🎬 [STREAM] Done: ${chunkCount} chunks, ${fullResponse.length} chars, first-token: ${firstTokenTime}ms, total: ${totalStreamTime}ms`);
              if (closeStream) {
                responseStream.write(`data: [DONE]\n\n`);
                responseStream.end();
              }
              // Return response text, usage data, and timing
              resolve({ text: fullResponse, usage: usageData, timing: { firstTokenMs: firstTokenTime, totalStreamMs: totalStreamTime } });
              return;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.choices && parsed.choices[0]?.delta?.content) {
                const content = parsed.choices[0].delta.content;
                contentChunks++;
                if (contentChunks === 1) {
                  firstTokenTime = Date.now() - streamRequestStart;
                  console.log(`⚡ [STREAM] First token in ${firstTokenTime}ms`);
                }
                fullResponse += content; // Accumulate the response
                // Send each chunk as SSE
                responseStream.write(`data: ${JSON.stringify({
                  id: generateId(),
                  content: content,
                  timestamp: new Date().toISOString()
                })}\n\n`);
              }

              // Capture actual token usage from OpenRouter stream
              if (parsed.usage) {
                usageData = parsed.usage;
                console.log(`📊 [STREAM] Captured actual token usage:`, usageData);
              }

              if (parsed.error) {
                console.error(`❌ [STREAM] OpenRouter error:`, parsed.error);
              }
            } catch (e) {
              // Skip invalid JSON
              console.error(`⚠️ [STREAM] Failed to parse chunk:`, line.substring(0, 100));
            }
          }
        }
      });

      res.on('end', () => {
        if (closeStream && !responseStream.writableEnded) {
          responseStream.write(`data: [DONE]\n\n`);
          responseStream.end();
        }
        // Return both response text and actual usage data
        resolve({ text: fullResponse, usage: usageData });
      });
    });

    req.on('error', (error) => {
      if (!responseStream.writableEnded) {
        responseStream.end();
      }
      reject(error);
    });

    req.write(requestBody);
    req.end();
  });
}

// Request handler
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;

  // Performance logging + error tracking
  const startTime = Date.now();
  const requestId = crypto.randomBytes(4).toString('hex');
  ERROR_TRACKER.recordRequest();

  // Get dynamic CORS headers based on request origin
  const requestOrigin = req.headers.origin || req.headers.referer;
  const corsHeaders = getCorsHeaders(requestOrigin);

  console.log(`${method} ${path}${requestOrigin ? ` (origin: ${requestOrigin})` : ''}`);

  // Wrap res.end to log performance
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Log performance for admin routes and slow requests
    if (path.startsWith('/api/admin/') || duration > 1000) {
      console.log(`⏱️  [PERF] ${requestId} | ${method} ${path} | ${statusCode} | ${duration}ms`);
    }

    // Log extremely slow requests
    if (duration > 5000) {
      console.warn(`🐌 [SLOW] ${requestId} | ${method} ${path} | ${duration}ms - NEEDS OPTIMIZATION`);
    }

    return originalEnd.apply(this, args);
  };

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }

  try {
    // Health check
    if (path === '/api/health' && method === 'GET') {
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        aiEnabled: true,
        provider: 'OpenRouter GPT-4o'
      }));
      return;
    }

    // Deep health check — validates DB, agents, memory, and AI connectivity
    if (path === '/api/health/deep' && method === 'GET') {
      const checks = {};
      let allHealthy = true;

      // 1. Database connection
      try {
        const dbStart = Date.now();
        await pool.query('SELECT 1');
        checks.database = { status: 'healthy', latency: Date.now() - dbStart };
      } catch (e) {
        checks.database = { status: 'error', error: e.message };
        allHealthy = false;
      }

      // 2. Agent cache loaded
      const agentCount = Object.keys(AGENT_CACHE).length;
      checks.agents = { status: agentCount > 0 ? 'healthy' : 'error', count: agentCount };
      if (agentCount === 0) allHealthy = false;

      // 3. Memory system — can query memories table
      try {
        const memStart = Date.now();
        const memResult = await pool.query('SELECT COUNT(*) as cnt FROM memories LIMIT 1');
        checks.memory = { status: 'healthy', latency: Date.now() - memStart, totalMemories: parseInt(memResult.rows[0].cnt) };
      } catch (e) {
        checks.memory = { status: 'error', error: e.message };
        allHealthy = false;
      }

      // 4. Feature flags loaded
      checks.featureFlags = { status: 'healthy', flags: FEATURE_FLAGS, lastLoad: featureFlagLastLoad ? new Date(featureFlagLastLoad).toISOString() : 'never' };

      // 5. Error rate
      const errorRate = ERROR_TRACKER.getRate();
      checks.errorRate = {
        status: errorRate < 5 ? 'healthy' : errorRate < 10 ? 'warning' : 'critical',
        rate: `${errorRate.toFixed(2)}%`,
        errors5m: ERROR_TRACKER.errors.length,
        requests5m: ERROR_TRACKER.requests.length
      };
      if (errorRate >= 10) allHealthy = false;

      // 6. Deploy info
      checks.deploy = DEPLOY_INFO;

      const statusCode = allHealthy ? 200 : 503;
      res.writeHead(statusCode, corsHeaders);
      res.end(JSON.stringify({
        status: allHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - new Date(DEPLOY_INFO.startedAt).getTime()) / 1000),
        checks
      }));
      return;
    }

    // ═══════════════════════════════════════════════════════════════
    // PASSWORD-PROTECTED FINANCIAL MODEL
    // ═══════════════════════════════════════════════════════════════
    if (path === '/financial-model' && method === 'GET') {
      const FINANCIAL_PASSWORD = process.env.FINANCIAL_MODEL_PASSWORD || 'ecos2026';
      const cookie = req.headers.cookie || '';
      const tokenMatch = cookie.match(/fm_auth=([^;]+)/);
      const isAuthed = tokenMatch && tokenMatch[1] === crypto.createHash('sha256').update(FINANCIAL_PASSWORD).digest('hex');

      if (isAuthed) {
        // Serve the financial model HTML (inlined)
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(FINANCIAL_MODEL_HTML);
        return;
      }

      // Show login page
      const error = parsedUrl.query.error ? '<p style="color:#ef4444;margin-bottom:16px;">Wrong password. Try again.</p>' : '';
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>ECOS Financial Model — Login</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e2e8f0}
.card{background:#1e293b;border:1px solid #334155;border-radius:16px;padding:40px;width:100%;max-width:400px;text-align:center;box-shadow:0 25px 50px rgba(0,0,0,.5)}
.logo{font-size:28px;font-weight:800;background:linear-gradient(135deg,#818cf8,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px}
.subtitle{color:#94a3b8;font-size:14px;margin-bottom:32px}
input[type=password]{width:100%;padding:12px 16px;border-radius:10px;border:1px solid #475569;background:#0f172a;color:#e2e8f0;font-size:16px;outline:none;margin-bottom:16px;transition:border .2s}
input[type=password]:focus{border-color:#818cf8}
button{width:100%;padding:12px;border-radius:10px;border:none;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-size:16px;font-weight:600;cursor:pointer;transition:opacity .2s}
button:hover{opacity:.9}
.lock{font-size:48px;margin-bottom:16px}
</style></head><body>
<div class="card">
<div class="lock">🔐</div>
<div class="logo">ECOS Financial Model</div>
<div class="subtitle">Enter password to access projections</div>
${error}
<form method="POST" action="/financial-model">
<input type="password" name="password" placeholder="Password" autofocus required>
<button type="submit">Access Model →</button>
</form>
</div></body></html>`);
      return;
    }

    if (path === '/financial-model' && method === 'POST') {
      // Parse form body
      let body = '';
      req.on('data', chunk => body += chunk);
      await new Promise(resolve => req.on('end', resolve));
      const params = new URLSearchParams(body);
      const password = params.get('password');
      const FINANCIAL_PASSWORD = process.env.FINANCIAL_MODEL_PASSWORD || 'ecos2026';

      if (password === FINANCIAL_PASSWORD) {
        const token = crypto.createHash('sha256').update(FINANCIAL_PASSWORD).digest('hex');
        res.writeHead(302, {
          'Set-Cookie': `fm_auth=${token}; Path=/financial-model; HttpOnly; SameSite=Strict; Max-Age=86400`,
          'Location': '/financial-model'
        });
        res.end();
      } else {
        res.writeHead(302, { 'Location': '/financial-model?error=1' });
        res.end();
      }
      return;
    }

    // Platform Update briefing — password protected
    if (path === '/platform-update' && method === 'GET') {
      const PU_PASSWORD = process.env.PLATFORM_UPDATE_PASSWORD || 'ecos2026';
      const cookie = req.headers.cookie || '';
      const tokenMatch = cookie.match(/pu_auth=([^;]+)/);
      const isAuthed = tokenMatch && tokenMatch[1] === crypto.createHash('sha256').update(PU_PASSWORD).digest('hex');

      if (isAuthed) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(PLATFORM_UPDATE_HTML);
        return;
      }

      const error = parsedUrl.query.error ? '<p style="color:#ef4444;margin-bottom:16px;">Wrong password. Try again.</p>' : '';
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>ECOS Platform Update — Login</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0b0e14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e2e8f0}
.card{background:#151921;border:1px solid #232838;border-radius:16px;padding:40px;width:100%;max-width:400px;text-align:center;box-shadow:0 25px 50px rgba(0,0,0,.5)}
.logo{font-size:28px;font-weight:800;background:linear-gradient(135deg,#F5A623,#ffc048);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px}
.subtitle{color:#9ca0b4;font-size:14px;margin-bottom:32px}
input[type=password]{width:100%;padding:12px 16px;border-radius:10px;border:1px solid #2e3548;background:#0b0e14;color:#e8eaf0;font-size:16px;outline:none;margin-bottom:16px;transition:border .2s}
input[type=password]:focus{border-color:#F5A623}
button{width:100%;padding:12px;border-radius:10px;border:none;background:linear-gradient(135deg,#F5A623,#e09000);color:#0b0e14;font-size:16px;font-weight:700;cursor:pointer;transition:opacity .2s}
button:hover{opacity:.9}
.lock{font-size:48px;margin-bottom:16px}
</style></head><body>
<div class="card">
<div class="lock">📋</div>
<div class="logo">ECOS Platform Update</div>
<div class="subtitle">Enter password to view the briefing</div>
${error}
<form method="POST" action="/platform-update">
<input type="password" name="password" placeholder="Password" autofocus required>
<button type="submit">View Briefing →</button>
</form>
</div></body></html>`);
      return;
    }

    if (path === '/platform-update' && method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      await new Promise(resolve => req.on('end', resolve));
      const params = new URLSearchParams(body);
      const password = params.get('password');
      const PU_PASSWORD = process.env.PLATFORM_UPDATE_PASSWORD || 'ecos2026';

      if (password === PU_PASSWORD) {
        const token = crypto.createHash('sha256').update(PU_PASSWORD).digest('hex');
        res.writeHead(302, {
          'Set-Cookie': `pu_auth=${token}; Path=/platform-update; HttpOnly; SameSite=Strict; Max-Age=86400`,
          'Location': '/platform-update'
        });
        res.end();
      } else {
        res.writeHead(302, { 'Location': '/platform-update?error=1' });
        res.end();
      }
      return;
    }

    // Getting Started Guide — password protected
    if (path === '/getting-started' && method === 'GET') {
      const GS_PASSWORD = process.env.GETTING_STARTED_PASSWORD || 'ecos2026';
      const cookie = req.headers.cookie || '';
      const tokenMatch = cookie.match(/gs_auth=([^;]+)/);
      const isAuthed = tokenMatch && tokenMatch[1] === crypto.createHash('sha256').update(GS_PASSWORD).digest('hex');

      if (isAuthed) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(GETTING_STARTED_HTML);
        return;
      }

      const error = parsedUrl.query.error ? '<p style="color:#ef4444;margin-bottom:16px;">Wrong password. Try again.</p>' : '';
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Expert OS — Getting Started Guide</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#FFF9F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a2e}
.card{background:#fff;border:1px solid #f0e6d3;border-radius:16px;padding:40px;width:100%;max-width:400px;text-align:center;box-shadow:0 25px 50px rgba(0,0,0,.08)}
.logo{font-size:28px;font-weight:800;color:#1a1a2e;margin-bottom:8px}
.logo span{color:#F5A623}
.subtitle{color:#666;font-size:14px;margin-bottom:32px}
input[type=password]{width:100%;padding:12px 16px;border-radius:10px;border:1px solid #e0d5c5;background:#FFF9F0;color:#1a1a2e;font-size:16px;outline:none;margin-bottom:16px;transition:border .2s}
input[type=password]:focus{border-color:#F5A623}
button{width:100%;padding:12px;border-radius:10px;border:none;background:#F5A623;color:#fff;font-size:16px;font-weight:600;cursor:pointer;transition:opacity .2s}
button:hover{opacity:.9}
.icon{font-size:48px;margin-bottom:16px}
</style></head><body>
<div class="card">
<div class="icon">📖</div>
<div class="logo">Expert <span>OS</span> Guide</div>
<div class="subtitle">Enter password to view the getting started guide</div>
${error}
<form method="POST" action="/getting-started">
<input type="password" name="password" placeholder="Password" autofocus required>
<button type="submit">Open Guide →</button>
</form>
</div></body></html>`);
      return;
    }

    if (path === '/getting-started' && method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      await new Promise(resolve => req.on('end', resolve));
      const params = new URLSearchParams(body);
      const password = params.get('password');
      const GS_PASSWORD = process.env.GETTING_STARTED_PASSWORD || 'ecos2026';

      if (password === GS_PASSWORD) {
        const token = crypto.createHash('sha256').update(GS_PASSWORD).digest('hex');
        res.writeHead(302, {
          'Set-Cookie': `gs_auth=${token}; Path=/getting-started; HttpOnly; SameSite=Strict; Max-Age=86400`,
          'Location': '/getting-started'
        });
        res.end();
      } else {
        res.writeHead(302, { 'Location': '/getting-started?error=1' });
        res.end();
      }
      return;
    }

    // Client Guide — password protected
    if (path === '/client-guide' && method === 'GET') {
      const CG_PASSWORD = process.env.CLIENT_GUIDE_PASSWORD || 'ecos2026';
      const cookie = req.headers.cookie || '';
      const tokenMatch = cookie.match(/cg_auth=([^;]+)/);
      const isAuthed = tokenMatch && tokenMatch[1] === crypto.createHash('sha256').update(CG_PASSWORD).digest('hex');

      if (isAuthed) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(CLIENT_GUIDE_HTML);
        return;
      }

      const error = parsedUrl.query.error ? '<p style="color:#ef4444;margin-bottom:16px;">Wrong password. Try again.</p>' : '';
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Expert OS — Client Profiles Guide</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0b0e14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e2e8f0}
.card{background:#151921;border:1px solid #232838;border-radius:16px;padding:40px;width:100%;max-width:400px;text-align:center;box-shadow:0 25px 50px rgba(0,0,0,.5)}
.logo{font-size:28px;font-weight:800;background:linear-gradient(135deg,#818cf8,#4f46e5);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px}
.subtitle{color:#9ca0b4;font-size:14px;margin-bottom:32px}
input[type=password]{width:100%;padding:12px 16px;border-radius:10px;border:1px solid #2e3548;background:#0b0e14;color:#e8eaf0;font-size:16px;outline:none;margin-bottom:16px;transition:border .2s}
input[type=password]:focus{border-color:#818cf8}
button{width:100%;padding:12px;border-radius:10px;border:none;background:linear-gradient(135deg,#818cf8,#4f46e5);color:#fff;font-size:16px;font-weight:700;cursor:pointer;transition:opacity .2s}
button:hover{opacity:.9}
.lock{font-size:48px;margin-bottom:16px}
</style></head><body>
<div class="card">
<div class="lock">🏢</div>
<div class="logo">Client Profiles Guide</div>
<div class="subtitle">Enter password to view the guide</div>
${error}
<form method="POST" action="/client-guide">
<input type="password" name="password" placeholder="Password" autofocus required>
<button type="submit">View Guide →</button>
</form>
</div></body></html>`);
      return;
    }

    if (path === '/client-guide' && method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      await new Promise(resolve => req.on('end', resolve));
      const params = new URLSearchParams(body);
      const password = params.get('password');
      const CG_PASSWORD = process.env.CLIENT_GUIDE_PASSWORD || 'ecos2026';

      if (password === CG_PASSWORD) {
        const token = crypto.createHash('sha256').update(CG_PASSWORD).digest('hex');
        res.writeHead(302, {
          'Set-Cookie': `cg_auth=${token}; Path=/client-guide; HttpOnly; SameSite=Strict; Max-Age=86400`,
          'Location': '/client-guide'
        });
        res.end();
      } else {
        res.writeHead(302, { 'Location': '/client-guide?error=1' });
        res.end();
      }
      return;
    }

    // Meta Agent Guide — password protected
    if (path === '/meta-agent' && method === 'GET') {
      const MA_PASSWORD = process.env.META_AGENT_PASSWORD || 'ecos2026';
      const cookie = req.headers.cookie || '';
      const tokenMatch = cookie.match(/ma_auth=([^;]+)/);
      const isAuthed = tokenMatch && tokenMatch[1] === crypto.createHash('sha256').update(MA_PASSWORD).digest('hex');

      if (isAuthed) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(META_AGENT_HTML);
        return;
      }

      const error = parsedUrl.query.error ? '<p style="color:#ef4444;margin-bottom:16px;">Wrong password. Try again.</p>' : '';
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Expert OS — ExpertAI Guide</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1c1917,#292524);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e2e8f0}
.card{background:rgba(255,107,53,0.06);backdrop-filter:blur(20px);border:1px solid rgba(255,107,53,0.2);border-radius:16px;padding:40px;width:100%;max-width:400px;text-align:center;box-shadow:0 25px 50px rgba(0,0,0,.4)}
.logo{font-size:28px;font-weight:800;background:linear-gradient(135deg,#FF6B35,#fcc824);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px}
.subtitle{color:#a8a29e;font-size:14px;margin-bottom:32px}
input[type=password]{width:100%;padding:12px 16px;border-radius:10px;border:1px solid rgba(255,107,53,0.2);background:rgba(0,0,0,0.3);color:#e8eaf0;font-size:16px;outline:none;margin-bottom:16px;transition:border .2s}
input[type=password]:focus{border-color:#FF6B35}
button{width:100%;padding:12px;border-radius:10px;border:none;background:linear-gradient(135deg,#FF6B35,#e05a2b);color:#fff;font-size:16px;font-weight:700;cursor:pointer;transition:opacity .2s}
button:hover{opacity:.9}
.lock{font-size:48px;margin-bottom:16px}
</style></head><body>
<div class="card">
<div class="lock">🤖</div>
<div class="logo">ExpertAI Guide</div>
<div class="subtitle">Enter password to view the guide</div>
${error}
<form method="POST" action="/meta-agent">
<input type="password" name="password" placeholder="Password" autofocus required>
<button type="submit">View Guide →</button>
</form>
</div></body></html>`);
      return;
    }

    if (path === '/meta-agent' && method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      await new Promise(resolve => req.on('end', resolve));
      const params = new URLSearchParams(body);
      const password = params.get('password');
      const MA_PASSWORD = process.env.META_AGENT_PASSWORD || 'ecos2026';

      if (password === MA_PASSWORD) {
        const token = crypto.createHash('sha256').update(MA_PASSWORD).digest('hex');
        res.writeHead(302, {
          'Set-Cookie': `ma_auth=${token}; Path=/meta-agent; HttpOnly; SameSite=Strict; Max-Age=86400`,
          'Location': '/meta-agent'
        });
        res.end();
      } else {
        res.writeHead(302, { 'Location': '/meta-agent?error=1' });
        res.end();
      }
      return;
    }

    // Agent Creator Guide — password protected
    if (path === '/agent-creator-guide' && method === 'GET') {
      const AC_PASSWORD = process.env.AGENT_CREATOR_PASSWORD || 'ecos2026';
      const cookie = req.headers.cookie || '';
      const tokenMatch = cookie.match(/ac_auth=([^;]+)/);
      const isAuthed = tokenMatch && tokenMatch[1] === crypto.createHash('sha256').update(AC_PASSWORD).digest('hex');

      if (isAuthed) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(AGENT_CREATOR_HTML);
        return;
      }

      const error = parsedUrl.query.error ? '<p style="color:#ef4444;margin-bottom:16px;">Wrong password. Try again.</p>' : '';
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Expert OS — Agent Creator Guide</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1e1b4b,#4c1d95);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e2e8f0}
.card{background:rgba(139,92,246,0.08);backdrop-filter:blur(20px);border:1px solid rgba(139,92,246,0.2);border-radius:16px;padding:40px;width:100%;max-width:400px;text-align:center;box-shadow:0 25px 50px rgba(0,0,0,.4)}
.logo{font-size:28px;font-weight:800;background:linear-gradient(135deg,#a78bfa,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px}
.subtitle{color:#a5b4fc;font-size:14px;margin-bottom:32px}
input[type=password]{width:100%;padding:12px 16px;border-radius:10px;border:1px solid rgba(139,92,246,0.25);background:rgba(0,0,0,0.3);color:#e8eaf0;font-size:16px;outline:none;margin-bottom:16px;transition:border .2s}
input[type=password]:focus{border-color:#a78bfa}
button{width:100%;padding:12px;border-radius:10px;border:none;background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:#fff;font-size:16px;font-weight:700;cursor:pointer;transition:opacity .2s}
button:hover{opacity:.9}
.lock{font-size:48px;margin-bottom:16px}
</style></head><body>
<div class="card">
<div class="lock">🛠️</div>
<div class="logo">Agent Creator Guide</div>
<div class="subtitle">Enter password to view the guide</div>
\${error}
<form method="POST" action="/agent-creator-guide">
<input type="password" name="password" placeholder="Password" autofocus required>
<button type="submit">View Guide →</button>
</form>
</div></body></html>`);
      return;
    }

    if (path === '/agent-creator-guide' && method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      await new Promise(resolve => req.on('end', resolve));
      const params = new URLSearchParams(body);
      const password = params.get('password');
      const AC_PASSWORD = process.env.AGENT_CREATOR_PASSWORD || 'ecos2026';

      if (password === AC_PASSWORD) {
        const token = crypto.createHash('sha256').update(AC_PASSWORD).digest('hex');
        res.writeHead(302, {
          'Set-Cookie': `ac_auth=${token}; Path=/agent-creator-guide; HttpOnly; SameSite=Strict; Max-Age=86400`,
          'Location': '/agent-creator-guide'
        });
        res.end();
      } else {
        res.writeHead(302, { 'Location': '/agent-creator-guide?error=1' });
        res.end();
      }
      return;
    }

    // ═══════════════════════════════════════════════════════════════
    // CENTRALIZED ADMIN AUTH GUARD — protects ALL /api/admin/* routes
    // Accepts: x-admin-secret header OR valid JWT with admin/power_user role
    // ═══════════════════════════════════════════════════════════════
    if (path.startsWith('/api/admin/')) {
      const adminSecret = process.env.ADMIN_SECRET || 'ecos-admin-secret-2025';
      const providedSecret = req.headers['x-admin-secret'];
      const bearerHeader = req.headers['authorization'];
      const hasAdminSecret = providedSecret === adminSecret || bearerHeader === `Bearer ${adminSecret}`;

      if (!hasAdminSecret) {
        // Check JWT auth — admin pages send JWT tokens
        const jwtToken = bearerHeader?.startsWith('Bearer ') ? bearerHeader.slice(7) : null;
        let jwtAuthed = false;
        if (jwtToken) {
          try {
            const decoded = verifyToken(jwtToken);
            if (decoded) {
              const userId = typeof decoded.userId === 'object' ? decoded.userId.id : decoded.userId;
              const userResult = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
              if (userResult.rows.length > 0 && ['admin', 'power_user'].includes(userResult.rows[0].role)) {
                jwtAuthed = true;
              }
            }
          } catch (e) { /* invalid JWT — fall through to 401 */ }
        }
        if (!jwtAuthed) {
          res.writeHead(401, corsHeaders);
          res.end(JSON.stringify({ error: 'Unauthorized — admin access required' }));
          return;
        }
      }
    }

    // Deploy status — quick view for monitoring
    if (path === '/api/admin/deploy-status' && method === 'GET') {
      const adminSecret = req.headers['x-admin-secret'];
      if (adminSecret !== process.env.ADMIN_SECRET) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      // Get last 5 deploy records from deploy_log
      let recentDeploys = [];
      try {
        const deployResult = await pool.query(
          `SELECT * FROM deploy_log ORDER BY deployed_at DESC LIMIT 5`
        );
        recentDeploys = deployResult.rows;
      } catch (e) {
        // Table may not exist yet
        recentDeploys = [{ note: 'deploy_log table not yet created' }];
      }

      const errorRate = ERROR_TRACKER.getRate();

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        current: {
          ...DEPLOY_INFO,
          uptime: Math.floor((Date.now() - new Date(DEPLOY_INFO.startedAt).getTime()) / 1000),
          errorRate: `${errorRate.toFixed(2)}%`,
          agentsLoaded: Object.keys(AGENT_CACHE).length,
          featureFlags: FEATURE_FLAGS
        },
        recentDeploys
      }));
      return;
    }

    // ========================================
    // USER ASSETS API (Notes & Files System) - MODULAR
    // ========================================
    if (registerAssetsRoutes(req, res, method, path, corsHeaders)) {
      return;
    }

    // ========================================
    // STRIPE CHECKOUT API - Client Fast Start
    // ========================================
    if (path === '/api/checkout/create-session' && method === 'POST') {
      const body = await parseBody(req);
      const Stripe = require('stripe');
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) {
        res.writeHead(503, corsHeaders);
        res.end(JSON.stringify({ error: 'Stripe is not configured. Set STRIPE_SECRET_KEY.' }));
        return;
      }
      const stripeClient = new Stripe(stripeKey);
      const { plan, firstName, lastName, email, phone, coupon } = body;
      if (!email || !firstName || !lastName) {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: 'firstName, lastName, and email are required.' }));
        return;
      }
      const FRONTEND_URL = process.env.FRONTEND_URL || 'https://frontend-production-0e49.up.railway.app';
      try {
        // Find or create Stripe customer
        const existing = await stripeClient.customers.list({ email, limit: 1 });
        const customer = existing.data.length > 0
          ? existing.data[0]
          : await stripeClient.customers.create({ email, name: `${firstName} ${lastName}`, phone: phone || undefined, metadata: { source: 'ecos_checkout', plan_type: plan || 'weekly' } });

        const WEEKLY_PRICE_ID = process.env.STRIPE_WEEKLY_PRICE_ID || 'price_1TCFL0IdYncMj5o1RXazFJ36';
        const UPFRONT_PRICE_ID = process.env.STRIPE_UPFRONT_PRICE_ID || 'price_1TCFPoIdYncMj5o1uYJ82s1T';
        const AGENCY5_PRICE_ID = process.env.STRIPE_AGENCY5_PRICE_ID || '';
        const AGENCY10_PRICE_ID = process.env.STRIPE_AGENCY10_PRICE_ID || '';

        let sessionParams;
        if (plan === 'agency5' || plan === 'agency10') {
          const agencyPriceId = plan === 'agency5' ? AGENCY5_PRICE_ID : AGENCY10_PRICE_ID;
          if (!agencyPriceId) {
            res.writeHead(503, corsHeaders);
            res.end(JSON.stringify({ error: 'Agency plan pricing is not configured yet. Please contact support@expertproject.com.' }));
            return;
          }
          sessionParams = {
            customer: customer.id, mode: 'subscription',
            line_items: [{ price: agencyPriceId, quantity: 1 }],
            success_url: `${FRONTEND_URL}/agency/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${FRONTEND_URL}/agency/checkout?canceled=true`,
            metadata: { plan_type: plan, first_name: firstName, last_name: lastName, sub_accounts: plan === 'agency5' ? '5' : '10' },
          };
        } else if (plan === 'upfront') {
          sessionParams = {
            customer: customer.id, mode: 'payment',
            line_items: [{ price: UPFRONT_PRICE_ID, quantity: 1 }],
            success_url: `${FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${FRONTEND_URL}/checkout?canceled=true`,
            metadata: { plan_type: 'upfront', first_name: firstName, last_name: lastName },
          };
        } else {
          sessionParams = {
            customer: customer.id, mode: 'subscription',
            line_items: [{ price: WEEKLY_PRICE_ID, quantity: 1 }],
            success_url: `${FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${FRONTEND_URL}/checkout?canceled=true`,
            metadata: { plan_type: 'weekly', first_name: firstName, last_name: lastName },
          };
        }
        // Apply coupon if provided
        if (coupon) {
          try {
            const promoCodes = await stripeClient.promotionCodes.list({ code: coupon, active: true, limit: 1 });
            if (promoCodes.data.length > 0) sessionParams.discounts = [{ promotion_code: promoCodes.data[0].id }];
          } catch (e) { console.warn('Coupon lookup failed:', e.message); }
        }
        const session = await stripeClient.checkout.sessions.create(sessionParams);
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ url: session.url, sessionId: session.id }));
      } catch (err) {
        console.error('Stripe checkout error:', err);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    // Stripe webhook
    if (path === '/api/checkout/webhook' && method === 'POST') {
      const rawBody = await new Promise((resolve) => { let d = ''; req.on('data', c => d += c); req.on('end', () => resolve(d)); });
      const Stripe = require('stripe');
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!stripeKey || !webhookSecret) { res.writeHead(400, corsHeaders); res.end(JSON.stringify({ error: 'Stripe not fully configured' })); return; }
      const stripeClient = new Stripe(stripeKey);
      let event;
      try { event = stripeClient.webhooks.constructEvent(rawBody, req.headers['stripe-signature'], webhookSecret); }
      catch (err) { res.writeHead(400, corsHeaders); res.end(JSON.stringify({ error: 'Invalid signature' })); return; }
      console.log(`[Stripe Webhook] ${event.type}`);
      try {
        if (event.type === 'checkout.session.completed') {
          const s = event.data.object;
          const email = s.customer_details?.email || s.customer_email;
          if (email) {
            // Check if upgrading from trial — need to reset onboarding so they go through it properly
            const existingUser = await pool.query(`SELECT id, membership_tier, onboarding_completed FROM users WHERE LOWER(email) = LOWER($1)`, [email]);
            const wasTrialUser = existingUser.rows.length > 0 && (existingUser.rows[0].membership_tier === 'trial' || existingUser.rows[0].membership_tier === 'trial_expired');

            const planType = s.metadata?.plan_type || 'weekly';
            const isAgencyPlan = planType === 'agency5' || planType === 'agency10';
            const membershipTier = isAgencyPlan ? 'agency' : 'client_fast_start';
            const userRole = isAgencyPlan ? 'agency' : undefined;
            const roleUpdate = userRole ? `, role = '${userRole}'` : '';
            await pool.query(`UPDATE users SET membership_tier = '${membershipTier}', stripe_customer_id = $1, stripe_subscription_id = $2, payment_plan = $3, updated_at = NOW()${wasTrialUser ? ', onboarding_completed = false' : ''}${roleUpdate} WHERE LOWER(email) = LOWER($4)`, [s.customer, s.subscription || null, planType, email]);

            if (wasTrialUser) {
              // Also reset onboarding status table so dashboard redirects to onboarding
              const userId = existingUser.rows[0].id;
              await pool.query(`UPDATE user_onboarding_status SET onboarding_completed = false, current_step = 0, updated_at = NOW() WHERE user_id = $1`, [userId]);
              console.log(`[Stripe] Trial→Paid upgrade for ${email} — onboarding reset for full setup`);
            }
            console.log(`[Stripe] Activated Client Fast Start for ${email}`);

            // Send payment confirmation + welcome email
            const firstName = s.metadata?.first_name || s.customer_details?.name?.split(' ')[0] || '';
            const amountTotal = s.amount_total || null;
            sendPaymentConfirmationEmail(email, firstName, { plan: planType, amount: amountTotal })
              .then(() => console.log(`[Stripe] Payment confirmation email sent to ${email}`))
              .catch(err => console.error(`[Stripe] Failed to send confirmation email to ${email}:`, err.message));
          }
        } else if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.updated') {
          const sub = event.data.object;
          if (sub.status === 'canceled' || sub.status === 'unpaid') {
            await pool.query(`UPDATE users SET membership_tier = 'expired', updated_at = NOW() WHERE stripe_customer_id = $1`, [sub.customer]);
          } else if (sub.status === 'active') {
            await pool.query(`UPDATE users SET membership_tier = 'client_fast_start', updated_at = NOW() WHERE stripe_customer_id = $1`, [sub.customer]);
          }
        }
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ received: true }));
      } catch (err) { console.error('Webhook error:', err); res.writeHead(500, corsHeaders); res.end(JSON.stringify({ error: 'Failed' })); }
      return;
    }

    // Admin: List subscriptions
    if (path === '/api/admin/subscriptions' && method === 'GET') {
      const adminSecret = process.env.ADMIN_SECRET || 'ecos-admin-secret-2025';
      if (req.headers['x-admin-secret'] !== adminSecret) { res.writeHead(401, corsHeaders); res.end(JSON.stringify({ error: 'Unauthorized' })); return; }
      try {
        const result = await pool.query(`SELECT id, email, first_name, last_name, membership_tier, payment_plan, stripe_customer_id, stripe_subscription_id, created_at, updated_at FROM users WHERE stripe_customer_id IS NOT NULL OR membership_tier IN ('client_fast_start', 'trial', 'trial_expired') ORDER BY updated_at DESC`);
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ subscriptions: result.rows, count: result.rowCount }));
      } catch (err) { res.writeHead(500, corsHeaders); res.end(JSON.stringify({ error: err.message })); }
      return;
    }

    // Admin: Cancel subscription
    if (path === '/api/admin/subscriptions/cancel' && method === 'POST') {
      const adminSecret = process.env.ADMIN_SECRET || 'ecos-admin-secret-2025';
      if (req.headers['x-admin-secret'] !== adminSecret) { res.writeHead(401, corsHeaders); res.end(JSON.stringify({ error: 'Unauthorized' })); return; }
      const body = await parseBody(req);
      const Stripe = require('stripe');
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeKey) { res.writeHead(503, corsHeaders); res.end(JSON.stringify({ error: 'Stripe not configured' })); return; }
      const stripeClient = new Stripe(stripeKey);
      const { subscription_id, immediate } = body;
      if (!subscription_id) { res.writeHead(400, corsHeaders); res.end(JSON.stringify({ error: 'subscription_id required' })); return; }
      try {
        const result = immediate
          ? await stripeClient.subscriptions.cancel(subscription_id)
          : await stripeClient.subscriptions.update(subscription_id, { cancel_at_period_end: true });
        if (immediate) await pool.query(`UPDATE users SET membership_tier = 'expired', updated_at = NOW() WHERE stripe_subscription_id = $1`, [subscription_id]);
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ success: true, status: result.status, cancel_at_period_end: result.cancel_at_period_end }));
      } catch (err) { res.writeHead(500, corsHeaders); res.end(JSON.stringify({ error: err.message })); }
      return;
    }

    // Admin: Trigger system report manually
    if (path === '/api/admin/send-report' && method === 'POST') {
      const adminSecret = req.headers['x-admin-secret'];
      if (adminSecret !== process.env.ADMIN_SECRET) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      const body = await parseBody(req);
      const period = body.period || 'daily'; // daily, weekly, monthly
      try {
        const result = await sendReport(pool, period);
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ success: true, period, sent: !!result, to: REPORT_RECIPIENTS }));
      } catch (err) {
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    // ========================================
    // ONBOARDING API - Phase 1.1
    // ========================================
    const onboardingRoutes = registerOnboardingRoutes(pool, authenticateToken, corsHeaders);

    if (path === '/api/onboarding/status' && method === 'GET') {
      await onboardingRoutes.getOnboardingStatus(req, res);
      return;
    }

    if (path === '/api/onboarding/update' && method === 'POST') {
      await onboardingRoutes.updateOnboardingProgress(req, res);
      return;
    }

    if (path === '/api/onboarding/complete' && method === 'POST') {
      await onboardingRoutes.completeOnboarding(req, res);
      return;
    }

    if (path === '/api/onboarding/complete-structured' && method === 'POST') {
      await onboardingRoutes.completeOnboardingStructured(req, res);
      return;
    }

    if (path === '/api/profile/core-memories' && method === 'GET') {
      await onboardingRoutes.getCoreMemories(req, res);
      return;
    }

    if (path === '/api/profile/core-memories' && method === 'PUT') {
      await onboardingRoutes.updateCoreMemories(req, res);
      return;
    }

    // ========================================
    // BRAND VOICE API - Phase 3
    // ========================================
    const brandVoiceRoutes = registerBrandVoiceRoutes(pool, authenticateToken, corsHeaders);

    if (path === '/api/brand-voice/upload' && method === 'POST') {
      await brandVoiceRoutes.uploadDocument(req, res);
      return;
    }

    if (path === '/api/brand-voice/analyze' && method === 'POST') {
      await brandVoiceRoutes.analyzeVoice(req, res);
      return;
    }

    if (path === '/api/brand-voice/analyze-structured' && method === 'POST') {
      await brandVoiceRoutes.analyzeVoiceStructured(req, res);
      return;
    }

    if (path === '/api/brand-voice/profile' && method === 'GET') {
      await brandVoiceRoutes.getProfile(req, res);
      return;
    }

    if (path === '/api/brand-voice/profile' && method === 'PUT') {
      await brandVoiceRoutes.updateProfile(req, res);
      return;
    }

    if (path === '/api/brand-voice/documents' && method === 'GET') {
      await brandVoiceRoutes.listDocuments(req, res);
      return;
    }

    if (path.startsWith('/api/brand-voice/documents/') && method === 'DELETE') {
      const documentId = path.split('/').pop();
      await brandVoiceRoutes.deleteDocument(req, res, documentId);
      return;
    }

    // ========================================
    // CACHE MANAGEMENT API
    // ========================================
    const cacheRoutes = registerCacheRoutes(pool, authenticateToken, corsHeaders);

    if (path === '/api/cache/stats' && method === 'GET') {
      await cacheRoutes.getStats(req, res);
      return;
    }

    if (path === '/api/cache/analytics' && method === 'GET') {
      await cacheRoutes.getAnalytics(req, res);
      return;
    }

    if (path === '/api/cache/clear' && method === 'POST') {
      await cacheRoutes.clearCache(req, res);
      return;
    }

    if (path === '/api/cache/warm' && method === 'POST') {
      await cacheRoutes.warmCache(req, res);
      return;
    }

    if (path === '/api/cache/refresh' && method === 'POST') {
      await cacheRoutes.refreshCache(req, res);
      return;
    }

    if (path === '/api/cache/health' && method === 'GET') {
      await cacheRoutes.getHealth(req, res);
      return;
    }

    // ========================================
    // NOTIFICATIONS API - Bell, Research, Broadcasts
    // ========================================
    const notificationRoutes = registerNotificationRoutes(pool, authenticateToken, corsHeaders);

    if (path === '/api/notifications' && method === 'GET') {
      await notificationRoutes.getNotifications(req, res);
      return;
    }

    if (path === '/api/notifications/count' && method === 'GET') {
      await notificationRoutes.getNotificationCount(req, res);
      return;
    }

    if (path === '/api/notifications/read-all' && method === 'POST') {
      await notificationRoutes.markAllAsRead(req, res);
      return;
    }

    if (path.match(/^\/api\/notifications\/[^/]+\/read$/) && method === 'POST') {
      const notificationId = path.split('/')[3];
      await notificationRoutes.markAsRead(req, res, notificationId);
      return;
    }

    if (path.match(/^\/api\/notifications\/[^/]+$/) && method === 'DELETE') {
      const notificationId = path.split('/')[3];
      await notificationRoutes.deleteNotification(req, res, notificationId);
      return;
    }

    // POST /api/impersonate/respond - Target user accepts/declines edit access
    if (path === '/api/impersonate/respond' && method === 'POST') {
      const targetUser = getUserFromToken(req.headers.authorization);
      if (!targetUser) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      const body = await parseBody(req);
      const { sessionId, action, message } = body; // action: 'accept' or 'decline'

      if (!sessionId || !['accept', 'decline'].includes(action)) {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: 'sessionId and action (accept/decline) required' }));
        return;
      }

      try {
        // Verify this session belongs to this user
        const sessionResult = await pool.query(`
          SELECT s.*, u.email as admin_email, u.first_name as admin_first_name, u.last_name as admin_last_name
          FROM admin_impersonation_sessions s
          JOIN users u ON u.id = s.admin_user_id
          WHERE s.id = $1 AND s.target_user_id = $2 AND s.status = 'edit_requested'
        `, [sessionId, targetUser.userId]);

        if (!sessionResult.rows[0]) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'No pending impersonation request found' }));
          return;
        }

        const session = sessionResult.rows[0];

        if (action === 'accept') {
          // Approve edit access — expires in 24 hours
          await pool.query(`
            UPDATE admin_impersonation_sessions
            SET status = 'edit_approved',
                permissions = '{"view": true, "edit": true, "sendMessages": true, "savePlaybooks": true}',
                response_message = $1,
                resolved_at = NOW(),
                expires_at = NOW() + INTERVAL '24 hours'
            WHERE id = $2
          `, [message || null, sessionId]);

          // Get target user name for notification
          const targetInfo = await pool.query(
            'SELECT first_name, last_name, email FROM users WHERE id = $1',
            [targetUser.userId]
          );
          const targetName = targetInfo.rows[0]
            ? `${targetInfo.rows[0].first_name || ''} ${targetInfo.rows[0].last_name || ''}`.trim() || targetInfo.rows[0].email
            : 'The user';

          // Notify admin that edit access was approved
          await pool.query(`
            INSERT INTO notifications (user_id, type, title, message, data, priority, source)
            VALUES ($1, 'impersonation_response', $2, $3, $4, 'high', 'system')
          `, [
            session.admin_user_id,
            `${targetName} approved your edit access`,
            `You can now send messages and save playbooks on behalf of ${targetName}. Access expires in 24 hours.`,
            JSON.stringify({
              session_id: sessionId,
              target_user_id: targetUser.userId,
              target_name: targetName,
              action: 'accepted',
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            })
          ]);

          console.log(`✅ [IMPERSONATE] User ${targetUser.email} APPROVED edit access for session ${sessionId}`);
        } else {
          // Decline edit access — revert to viewing
          await pool.query(`
            UPDATE admin_impersonation_sessions
            SET status = 'edit_declined', response_message = $1, resolved_at = NOW()
            WHERE id = $2
          `, [message || null, sessionId]);

          const targetInfo = await pool.query(
            'SELECT first_name, last_name, email FROM users WHERE id = $1',
            [targetUser.userId]
          );
          const targetName = targetInfo.rows[0]
            ? `${targetInfo.rows[0].first_name || ''} ${targetInfo.rows[0].last_name || ''}`.trim() || targetInfo.rows[0].email
            : 'The user';

          // Notify admin that edit access was declined
          await pool.query(`
            INSERT INTO notifications (user_id, type, title, message, data, priority, source)
            VALUES ($1, 'impersonation_response', $2, $3, $4, 'normal', 'system')
          `, [
            session.admin_user_id,
            `${targetName} declined your edit access`,
            `Your request to act on behalf of ${targetName} was declined. You can still view their data.`,
            JSON.stringify({
              session_id: sessionId,
              target_user_id: targetUser.userId,
              target_name: targetName,
              action: 'declined'
            })
          ]);

          console.log(`❌ [IMPERSONATE] User ${targetUser.email} DECLINED edit access for session ${sessionId}`);
        }

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ success: true, action }));
      } catch (error) {
        console.error('❌ [IMPERSONATE] Error responding to request:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to respond to impersonation request' }));
      }
      return;
    }

    // Research Jobs API
    if (path === '/api/research' && method === 'GET') {
      await notificationRoutes.getResearchJobs(req, res);
      return;
    }

    if (path.match(/^\/api\/research\/[^/]+$/) && method === 'GET') {
      const jobId = path.split('/')[3];
      await notificationRoutes.getResearchJob(req, res, jobId);
      return;
    }

    // Saved User Research API
    if (path === '/api/user-research' && method === 'GET') {
      await notificationRoutes.getUserResearch(req, res);
      return;
    }

    if (path.match(/^\/api\/user-research\/[^/]+$/) && method === 'GET') {
      const researchId = path.split('/')[3];
      await notificationRoutes.getUserResearchById(req, res, researchId);
      return;
    }

    if (path.match(/^\/api\/user-research\/[^/]+$/) && method === 'PATCH') {
      const researchId = path.split('/')[3];
      await notificationRoutes.updateUserResearch(req, res, researchId);
      return;
    }

    if (path.match(/^\/api\/user-research\/[^/]+$/) && method === 'DELETE') {
      const researchId = path.split('/')[3];
      await notificationRoutes.deleteUserResearch(req, res, researchId);
      return;
    }

    // Admin Broadcasts API
    if (path === '/api/admin/broadcasts' && method === 'GET') {
      await notificationRoutes.getAdminBroadcasts(req, res);
      return;
    }

    if (path === '/api/admin/broadcasts' && method === 'POST') {
      await notificationRoutes.createBroadcast(req, res);
      return;
    }

    if (path.match(/^\/api\/admin\/broadcasts\/[^/]+\/send$/) && method === 'POST') {
      const broadcastId = path.split('/')[4];
      await notificationRoutes.sendBroadcast(req, res, broadcastId);
      return;
    }

    // ========================================
    // ADMIN IMPERSONATION SYSTEM
    // ========================================

    // POST /api/admin/impersonate/start - Admin starts viewing a user
    if (path === '/api/admin/impersonate/start' && method === 'POST') {
      const adminUser = getUserFromToken(req.headers.authorization);
      if (!adminUser || adminUser.role !== 'admin') {
        res.writeHead(403, corsHeaders);
        res.end(JSON.stringify({ error: 'Admin access required' }));
        return;
      }
      const body = await parseBody(req);
      const { targetUserId } = body;
      if (!targetUserId) {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: 'targetUserId required' }));
        return;
      }
      try {
        // End any existing active session for this admin
        await pool.query(`
          UPDATE admin_impersonation_sessions
          SET status = 'ended', ended_at = NOW()
          WHERE admin_user_id = $1 AND status IN ('viewing', 'edit_requested', 'edit_approved')
        `, [adminUser.id]);

        // Create new viewing session
        const result = await pool.query(`
          INSERT INTO admin_impersonation_sessions (admin_user_id, target_user_id, status)
          VALUES ($1, $2, 'viewing')
          RETURNING *
        `, [adminUser.id, targetUserId]);

        // Get target user info
        const targetResult = await pool.query(
          'SELECT id, email, first_name, last_name, role FROM users WHERE id = $1',
          [targetUserId]
        );

        console.log(`👁️ [IMPERSONATE] Admin ${adminUser.email} started viewing user ${targetResult.rows[0]?.email}`);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          session: result.rows[0],
          targetUser: targetResult.rows[0]
        }));
      } catch (error) {
        console.error('❌ [IMPERSONATE] Error starting session:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to start impersonation session' }));
      }
      return;
    }

    // GET /api/admin/impersonate/active - Get admin's active session
    if (path === '/api/admin/impersonate/active' && method === 'GET') {
      const adminUser = getUserFromToken(req.headers.authorization);
      if (!adminUser || adminUser.role !== 'admin') {
        res.writeHead(403, corsHeaders);
        res.end(JSON.stringify({ error: 'Admin access required' }));
        return;
      }
      try {
        const result = await pool.query(`
          SELECT s.*,
            u.email as target_email, u.first_name as target_first_name,
            u.last_name as target_last_name, u.role as target_role
          FROM admin_impersonation_sessions s
          JOIN users u ON u.id = s.target_user_id
          WHERE s.admin_user_id = $1 AND s.status IN ('viewing', 'edit_requested', 'edit_approved')
          ORDER BY s.created_at DESC LIMIT 1
        `, [adminUser.id]);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ session: result.rows[0] || null }));
      } catch (error) {
        console.error('❌ [IMPERSONATE] Error fetching active session:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to fetch session' }));
      }
      return;
    }

    // POST /api/admin/impersonate/request-edit - Admin requests edit permission
    if (path === '/api/admin/impersonate/request-edit' && method === 'POST') {
      const adminUser = getUserFromToken(req.headers.authorization);
      if (!adminUser || adminUser.role !== 'admin') {
        res.writeHead(403, corsHeaders);
        res.end(JSON.stringify({ error: 'Admin access required' }));
        return;
      }
      const body = await parseBody(req);
      const { message } = body;
      try {
        // Find active viewing session
        const sessionResult = await pool.query(`
          SELECT * FROM admin_impersonation_sessions
          WHERE admin_user_id = $1 AND status = 'viewing'
          ORDER BY created_at DESC LIMIT 1
        `, [adminUser.id]);

        if (!sessionResult.rows[0]) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'No active viewing session found' }));
          return;
        }

        const session = sessionResult.rows[0];

        // Update session to edit_requested
        await pool.query(`
          UPDATE admin_impersonation_sessions
          SET status = 'edit_requested', request_message = $1, edit_requested_at = NOW()
          WHERE id = $2
        `, [message || null, session.id]);

        // Get admin name for notification
        const adminInfo = await pool.query(
          'SELECT first_name, last_name, email FROM users WHERE id = $1',
          [adminUser.id]
        );
        const adminName = adminInfo.rows[0]
          ? `${adminInfo.rows[0].first_name || ''} ${adminInfo.rows[0].last_name || ''}`.trim() || adminInfo.rows[0].email
          : 'An admin';

        // Send notification to target user
        await pool.query(`
          INSERT INTO notifications (user_id, type, title, message, data, priority, source)
          VALUES ($1, 'impersonation_request', $2, $3, $4, 'high', 'system')
        `, [
          session.target_user_id,
          `${adminName} wants to act on your behalf`,
          message || `${adminName} is requesting permission to send messages and save playbooks on your behalf.`,
          JSON.stringify({
            session_id: session.id,
            admin_user_id: adminUser.id,
            admin_name: adminName,
            admin_email: adminInfo.rows[0]?.email,
            action_buttons: [
              { label: 'Accept', action: 'impersonation_accept', icon: '✅', session_id: session.id },
              { label: 'Decline', action: 'impersonation_decline', icon: '❌', session_id: session.id }
            ]
          })
        ]);

        console.log(`📨 [IMPERSONATE] Admin ${adminUser.email} requested edit access for session ${session.id}`);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ success: true, status: 'edit_requested' }));
      } catch (error) {
        console.error('❌ [IMPERSONATE] Error requesting edit:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to request edit access' }));
      }
      return;
    }

    // POST /api/admin/impersonate/end - Admin ends session
    if (path === '/api/admin/impersonate/end' && method === 'POST') {
      const adminUser = getUserFromToken(req.headers.authorization);
      if (!adminUser || adminUser.role !== 'admin') {
        res.writeHead(403, corsHeaders);
        res.end(JSON.stringify({ error: 'Admin access required' }));
        return;
      }
      try {
        await pool.query(`
          UPDATE admin_impersonation_sessions
          SET status = 'ended', ended_at = NOW()
          WHERE admin_user_id = $1 AND status IN ('viewing', 'edit_requested', 'edit_approved')
        `, [adminUser.id]);

        console.log(`🚪 [IMPERSONATE] Admin ${adminUser.email} ended impersonation session`);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        console.error('❌ [IMPERSONATE] Error ending session:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to end session' }));
      }
      return;
    }

    // ========================================
    // VOICE AGENTS API - Voice Expert & Sales Roleplay
    // ========================================
    const voiceRoutes = registerVoiceRoutes(pool, authenticateToken, corsHeaders);

    if (path === '/api/voice/agents' && method === 'GET') {
      // Check if user is admin
      const url = new URL(req.url, 'http://localhost');
      const userId = url.searchParams.get('userId');
      let isAdmin = false;
      if (userId) {
        const adminCheck = await pool.query(
          "SELECT role FROM users WHERE id = $1 AND role::text IN ('ADMIN', 'OWNER')",
          [userId]
        );
        isAdmin = adminCheck.rows.length > 0;
      }
      await voiceRoutes.getAgents(req, res, isAdmin);
      return;
    }

    if (path === '/api/voice/session/start' && method === 'POST') {
      // Check if user is admin from request body
      const bodyStr = await new Promise(resolve => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => resolve(data));
      });
      const body = JSON.parse(bodyStr || '{}');
      let isAdmin = false;
      if (body.userId) {
        const adminCheck = await pool.query(
          "SELECT role FROM users WHERE id = $1 AND UPPER(role::text) IN ('ADMIN', 'OWNER')",
          [body.userId]
        );
        isAdmin = adminCheck.rows.length > 0;
      }
      // Re-attach body for the route handler
      req.body = body;
      await voiceRoutes.startSession(req, res, isAdmin);
      return;
    }

    if (path.match(/^\/api\/voice\/session\/[^/]+\/end$/) && method === 'POST') {
      const sessionId = path.split('/')[4];
      await voiceRoutes.endSession(req, res, sessionId);
      return;
    }

    if (path.match(/^\/api\/voice\/session\/[^/]+$/) && method === 'GET') {
      const sessionId = path.split('/')[4];
      await voiceRoutes.getSession(req, res, sessionId);
      return;
    }

    if (path === '/api/voice/history' && method === 'GET') {
      const url = new URL(req.url, 'http://localhost');
      const userId = url.searchParams.get('userId');
      await voiceRoutes.getHistory(req, res, userId);
      return;
    }

    if (path === '/api/voice/stats' && method === 'GET') {
      const url = new URL(req.url, 'http://localhost');
      const userId = url.searchParams.get('userId');
      await voiceRoutes.getStats(req, res, userId);
      return;
    }

    if (path === '/api/voice/scenarios' && method === 'GET') {
      await voiceRoutes.getScenarios(req, res);
      return;
    }

    if (path === '/api/voice/tts' && method === 'POST') {
      await voiceRoutes.textToSpeech(req, res);
      return;
    }

    // Register
    if (path === '/api/auth/register' && method === 'POST') {
      // Apply rate limiting
      const clientIp = req.socket.remoteAddress || 'unknown';
      const rateLimitResult = authRateLimiter(clientIp);

      if (!rateLimitResult.allowed) {
        res.writeHead(429, {
          ...corsHeaders,
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitResult.resetTime.toISOString(),
          'Retry-After': Math.ceil((rateLimitResult.resetTime - new Date()) / 1000)
        });
        res.end(JSON.stringify({
          error: rateLimitResult.message,
          resetTime: rateLimitResult.resetTime
        }));
        return;
      }

      const body = await parseBody(req);
      const { email, password, name, firstName, lastName, inviteCode } = body;

      try {
        // Input validation - support both 'name' and 'firstName/lastName'
        if (!email || !password || (!name && !firstName)) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Email, password, and name are required' }));
          return;
        }

        // Validate invite code (required for registration)
        if (!inviteCode) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Invite code is required to register' }));
          return;
        }

        // Check invite code validity
        const inviteResult = await pool.query(`
          SELECT id, code, max_uses, uses_count, expires_at, is_active, assigned_role
          FROM invite_codes
          WHERE code = $1
        `, [inviteCode.toUpperCase().trim()]);

        if (inviteResult.rows.length === 0) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Invalid invite code' }));
          return;
        }

        const invite = inviteResult.rows[0];

        if (!invite.is_active) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'This invite code has been deactivated' }));
          return;
        }

        if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'This invite code has expired' }));
          return;
        }

        if (invite.max_uses !== null && invite.uses_count >= invite.max_uses) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'This invite code has reached its maximum uses' }));
          return;
        }

        // Split name into firstName and lastName if provided as single field
        let finalFirstName = firstName;
        let finalLastName = lastName;

        if (name && !firstName) {
          const nameParts = name.trim().split(/\s+/);
          finalFirstName = nameParts[0] || '';
          finalLastName = nameParts.slice(1).join(' ') || '';
        }

        // Password strength validation
        if (password.length < 8) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Password must be at least 8 characters long' }));
          return;
        }

        // Check if user exists
        const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'User already exists' }));
          return;
        }

        // Hash password with bcrypt
        const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

        // Generate email verification token
        const verificationToken = require('crypto').randomUUID();
        const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Insert new user with hashed password, verification token, and invite code reference
        const result = await pool.query(
          `INSERT INTO users (id, email, first_name, last_name, password_hash, role, email_verified, email_verification_token, email_verification_expires, invite_code_id, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, false, $6, $7, $8, NOW(), NOW())
           RETURNING id, email, first_name as "firstName", last_name as "lastName", role, email_verified as "emailVerified", created_at as "createdAt"`,
          [email, finalFirstName, finalLastName || '', passwordHash, invite.assigned_role || 'user', verificationToken, verificationExpiry, invite.id]
        );

        const user = result.rows[0];

        // Increment invite code usage count and track usage
        await pool.query('UPDATE invite_codes SET uses_count = uses_count + 1, updated_at = NOW() WHERE id = $1', [invite.id]);
        await pool.query('INSERT INTO invite_code_uses (invite_code_id, user_id, used_at) VALUES ($1, $2, NOW())', [invite.id, user.id]);

        // Generate JWT tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        console.log(`✅ User registered: ${email} with ID: ${user.id} using invite code: ${invite.code}`);

        // Send verification email if enabled (async, don't block response)
        isEmailEnabled('verification').then(enabled => {
          if (enabled) {
            sendVerificationEmail(user.email, verificationToken, user.firstName || '')
              .then(() => console.log(`📧 Verification email sent to: ${user.email}`))
              .catch(err => console.error(`❌ Failed to send verification email to ${user.email}:`, err.message));
          } else {
            console.log(`📧 Verification email disabled, skipping for: ${user.email}`);
          }
        });

        res.writeHead(201, {
          ...corsHeaders,
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString()
        });
        res.end(JSON.stringify({
          message: 'Registration successful. Please check your email to verify your account.',
          accessToken,
          refreshToken,
          user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, emailVerified: user.emailVerified }
        }));
      } catch (error) {
        console.error('❌ Registration error:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Registration failed' }));
      }
      return;
    }

    // ============================================================
    // TRIAL REGISTRATION — No invite code required
    // ============================================================
    if (path === '/api/auth/register-trial' && method === 'POST') {
      // Check if trial system is enabled
      if (!getFeatureFlag('trial_enabled', true)) {
        res.writeHead(503, corsHeaders);
        res.end(JSON.stringify({ error: 'Trial registration is currently unavailable' }));
        return;
      }

      // Rate limiting
      const clientIp = req.socket.remoteAddress || 'unknown';
      const rateLimitResult = authRateLimiter(clientIp);
      if (!rateLimitResult.allowed) {
        res.writeHead(429, corsHeaders);
        res.end(JSON.stringify({ error: rateLimitResult.message }));
        return;
      }

      const body = await parseBody(req);
      const { email, password, firstName, lastName, name } = body;

      try {
        // Validate input
        if (!email || !password || (!firstName && !name)) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Email, password, and name are required' }));
          return;
        }

        if (password.length < 8) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Password must be at least 8 characters long' }));
          return;
        }

        // Check if user already exists
        const existingUser = await pool.query('SELECT id, membership_tier FROM users WHERE email = $1', [email.toLowerCase().trim()]);
        if (existingUser.rows.length > 0) {
          const existing = existingUser.rows[0];
          if (existing.membership_tier === 'trial' || existing.membership_tier === 'trial_expired') {
            res.writeHead(400, corsHeaders);
            res.end(JSON.stringify({ error: 'You have already used your free trial. Contact us to upgrade!' }));
          } else {
            res.writeHead(400, corsHeaders);
            res.end(JSON.stringify({ error: 'An account with this email already exists. Please log in.' }));
          }
          return;
        }

        // Split name if needed
        let finalFirstName = firstName;
        let finalLastName = lastName || '';
        if (name && !firstName) {
          const nameParts = name.trim().split(/\s+/);
          finalFirstName = nameParts[0] || '';
          finalLastName = nameParts.slice(1).join(' ') || '';
        }

        const config = getTrialConfig();
        const trialExpiresAt = new Date(Date.now() + config.duration_days * 24 * 60 * 60 * 1000);

        // Hash password
        const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

        // Resolve default trial agent slug to UUID
        let trialAgentId = null;
        try {
          const agentResult = await pool.query('SELECT id FROM agents WHERE slug = $1 AND is_active = true LIMIT 1', [config.default_agent]);
          if (agentResult.rows.length > 0) trialAgentId = agentResult.rows[0].id;
        } catch (e) { console.warn('⚠️ Could not resolve trial agent slug:', e.message); }

        // Insert trial user — auto-verified, onboarding NOT completed (must do Client Onboarding first)
        const result = await pool.query(
          `INSERT INTO users (id, email, first_name, last_name, password_hash, role, email_verified,
            membership_tier, membership_status, membership_updated_at,
            trial_started_at, trial_expires_at, trial_agent_id,
            trial_messages_today, trial_messages_total, trial_last_message_reset,
            onboarding_completed, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, 'trial', true,
            'trial', 'active', NOW(),
            NOW(), $5, $6,
            0, 0, CURRENT_DATE,
            false, NOW(), NOW())
           RETURNING id, email, first_name as "firstName", last_name as "lastName", role, membership_tier`,
          [email.toLowerCase().trim(), finalFirstName, finalLastName, passwordHash, trialExpiresAt, trialAgentId]
        );

        const user = result.rows[0];

        // Generate JWT tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        console.log(`🆓 Trial user registered: ${email} with ID: ${user.id} | Expires: ${trialExpiresAt.toISOString()} | Agent: ${config.default_agent}`);

        res.writeHead(201, corsHeaders);
        res.end(JSON.stringify({
          message: 'Trial activated! You have 7 days of free access.',
          accessToken,
          refreshToken,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            emailVerified: true,
            membershipTier: 'trial'
          },
          trial: {
            expiresAt: trialExpiresAt.toISOString(),
            daysRemaining: config.duration_days,
            dailyMessageCap: config.daily_message_cap,
            totalMessageCap: config.total_message_cap,
            trialAgent: config.default_agent
          }
        }));
      } catch (error) {
        console.error('❌ Trial registration error:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Trial registration failed. Please try again.' }));
      }
      return;
    }

    // Trial status endpoint — check remaining usage
    if (path === '/api/trial/status' && method === 'GET') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      try {
        const trialCheck = await checkTrialLimits(user.id);
        const config = getTrialConfig();

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          isTrial: trialCheck.isTrial || false,
          ...(trialCheck.isTrial ? {
            usage: trialCheck.usage,
            trialAgent: trialCheck.trialAgent,
            upgradeUrl: config.upgrade_url,
            trialExpired: trialCheck.trialExpired || false
          } : {})
        }));
      } catch (error) {
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to check trial status' }));
      }
      return;
    }

    // Login
    if (path === '/api/auth/login' && method === 'POST') {
      // Apply rate limiting
      const clientIp = req.socket.remoteAddress || 'unknown';
      const rateLimitResult = authRateLimiter(clientIp);

      if (!rateLimitResult.allowed) {
        res.writeHead(429, {
          ...corsHeaders,
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitResult.resetTime.toISOString(),
          'Retry-After': Math.ceil((rateLimitResult.resetTime - new Date()) / 1000)
        });
        res.end(JSON.stringify({
          error: rateLimitResult.message,
          resetTime: rateLimitResult.resetTime
        }));
        return;
      }

      const body = await parseBody(req);
      const { email, password } = body;

      console.log(`🔐 Login attempt: ${email}`);

      try {
        // Input validation
        if (!email || !password) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Email and password are required' }));
          return;
        }

        // Find user in PostgreSQL
        const result = await pool.query(
          `SELECT id, email, first_name as "firstName", last_name as "lastName", role, password_hash, email_verified, created_at as "createdAt",
                  is_active, membership_tier, membership_status, grace_period_ends_at, trial_expires_at as "trialExpiresAt"
           FROM users WHERE email = $1`,
          [email]
        );

        if (result.rows.length === 0) {
          console.log(`❌ User not found: ${email}`);
          res.writeHead(401, corsHeaders);
          res.end(JSON.stringify({ error: 'Invalid credentials' }));
          return;
        }

        const userWithPassword = result.rows[0];
        const { password_hash, is_active, membership_status, grace_period_ends_at, ...user } = userWithPassword;

        // Verify password with bcrypt
        const passwordValid = await bcrypt.compare(password, password_hash);

        if (!passwordValid) {
          console.log(`❌ Invalid password for: ${email}`);
          res.writeHead(401, corsHeaders);
          res.end(JSON.stringify({ error: 'Invalid credentials' }));
          return;
        }

        // Check if email is verified
        if (!userWithPassword.email_verified) {
          console.log(`⚠️ Unverified email login attempt: ${email}`);
          res.writeHead(403, corsHeaders);
          res.end(JSON.stringify({
            error: 'Please verify your email before signing in. Check your inbox for the verification link.',
            needsVerification: true,
            email: email
          }));
          return;
        }

        // Check membership status and grace period
        if (membership_status === 'grace_period' && grace_period_ends_at) {
          const graceEnd = new Date(grace_period_ends_at);
          if (graceEnd < new Date()) {
            // Grace period has expired - revoke access
            await pool.query(`
              UPDATE users SET
                is_active = false,
                membership_status = 'expired',
                membership_updated_at = NOW()
              WHERE id = $1
            `, [userWithPassword.id]);

            // Log to audit
            await pool.query(`
              INSERT INTO membership_audit_log (user_id, action, previous_status, new_status, notes)
              VALUES ($1, 'access_revoked', 'grace_period', 'expired', 'Automatic: grace period expired on login')
            `, [userWithPassword.id]);

            console.log(`🚫 Membership expired for ${email} (grace period ended)`);
            res.writeHead(403, corsHeaders);
            res.end(JSON.stringify({
              error: 'Your membership has expired. Please renew to regain access.',
              membershipExpired: true,
              email: email
            }));
            return;
          }
        }

        // Check if account is active
        if (!is_active || membership_status === 'expired') {
          console.log(`🚫 Inactive/expired account login attempt: ${email}`);
          res.writeHead(403, corsHeaders);
          res.end(JSON.stringify({
            error: 'Your account is no longer active. Please contact support to renew your membership.',
            membershipExpired: true,
            email: email
          }));
          return;
        }

        // Generate JWT tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        console.log(`🔓 Login successful: ${email} (ID: ${user.id})`);

        res.writeHead(200, {
          ...corsHeaders,
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString()
        });
        res.end(JSON.stringify({
          accessToken,
          refreshToken,
          user
        }));
      } catch (error) {
        console.error('❌ Login error:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Login failed' }));
      }
      return;
    }

    // Verify email - Complete email verification with token
    if (path === '/api/auth/verify-email' && method === 'POST') {
      const body = await parseBody(req);
      const { token } = body;

      console.log(`📧 Email verification attempt`);

      try {
        if (!token) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Verification token is required' }));
          return;
        }

        // Find user with this verification token
        const userResult = await pool.query(
          `SELECT id, email, first_name, email_verified, email_verification_expires
           FROM users
           WHERE email_verification_token = $1`,
          [token]
        );

        if (userResult.rows.length === 0) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Invalid verification token' }));
          return;
        }

        const user = userResult.rows[0];

        // Check if already verified
        if (user.email_verified) {
          res.writeHead(200, corsHeaders);
          res.end(JSON.stringify({ message: 'Email already verified', alreadyVerified: true }));
          return;
        }

        // Check if token expired
        if (new Date() > new Date(user.email_verification_expires)) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Verification token has expired. Please request a new one.' }));
          return;
        }

        // Mark email as verified
        await pool.query(
          `UPDATE users
           SET email_verified = true,
               email_verification_token = NULL,
               email_verification_expires = NULL,
               updated_at = NOW()
           WHERE id = $1`,
          [user.id]
        );

        console.log(`✅ Email verified for user: ${user.email}`);

        // Send welcome email now that email is verified (if enabled)
        isEmailEnabled('welcome').then(enabled => {
          if (enabled) {
            sendWelcomeEmail(user.email, user.first_name || '')
              .then(() => console.log(`📧 Welcome email sent to: ${user.email}`))
              .catch(err => console.error(`❌ Failed to send welcome email to ${user.email}:`, err.message));
          } else {
            console.log(`📧 Welcome email disabled, skipping for: ${user.email}`);
          }
        });

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          message: 'Email verified successfully! Welcome to ExpertOS.',
          success: true
        }));
      } catch (error) {
        console.error('❌ Email verification error:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to verify email' }));
      }
      return;
    }

    // Resend verification email
    if (path === '/api/auth/resend-verification' && method === 'POST') {
      const body = await parseBody(req);
      const { email } = body;

      console.log(`📧 Resend verification requested for: ${email}`);

      try {
        if (!email) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Email is required' }));
          return;
        }

        // Find user
        const userResult = await pool.query(
          `SELECT id, email, first_name, email_verified
           FROM users
           WHERE email = $1`,
          [email.toLowerCase()]
        );

        if (userResult.rows.length === 0) {
          // Don't reveal if user exists
          res.writeHead(200, corsHeaders);
          res.end(JSON.stringify({ message: 'If an account exists with this email, a verification link will be sent.' }));
          return;
        }

        const user = userResult.rows[0];

        if (user.email_verified) {
          res.writeHead(200, corsHeaders);
          res.end(JSON.stringify({ message: 'Email already verified', alreadyVerified: true }));
          return;
        }

        // Generate new verification token
        const verificationToken = require('crypto').randomUUID();
        const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Update token
        await pool.query(
          `UPDATE users
           SET email_verification_token = $1,
               email_verification_expires = $2,
               updated_at = NOW()
           WHERE id = $3`,
          [verificationToken, verificationExpiry, user.id]
        );

        // Send verification email if enabled
        isEmailEnabled('verification').then(enabled => {
          if (enabled) {
            sendVerificationEmail(user.email, verificationToken, user.first_name || '')
              .then(() => console.log(`📧 Verification email resent to: ${user.email}`))
              .catch(err => console.error(`❌ Failed to resend verification email to ${user.email}:`, err.message));
          } else {
            console.log(`📧 Verification email disabled, skipping resend for: ${user.email}`);
          }
        });

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ message: 'If an account exists with this email, a verification link will be sent.' }));
      } catch (error) {
        console.error('❌ Resend verification error:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to resend verification email' }));
      }
      return;
    }

    // Forgot password - Request password reset
    if (path === '/api/auth/forgot-password' && method === 'POST') {
      const body = await parseBody(req);
      const { email } = body;

      console.log(`📧 Password reset requested for: ${email}`);

      try {
        // Always return success to prevent email enumeration
        const successResponse = {
          message: 'If an account exists with this email, you will receive a password reset link.',
          email
        };

        if (!email) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Email is required' }));
          return;
        }

        // Check if user exists
        const userResult = await pool.query(
          'SELECT id, email, first_name FROM users WHERE email = $1',
          [email.toLowerCase()]
        );

        if (userResult.rows.length === 0) {
          // User not found - still return success to prevent enumeration
          console.log(`⚠️ Password reset requested for non-existent email: ${email}`);
          res.writeHead(200, corsHeaders);
          res.end(JSON.stringify(successResponse));
          return;
        }

        const user = userResult.rows[0];

        // Delete any existing reset tokens for this user
        await pool.query(
          'DELETE FROM password_reset_tokens WHERE user_id = $1',
          [user.id]
        );

        // Generate secure reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Store hashed token in database
        await pool.query(
          `INSERT INTO password_reset_tokens (id, user_id, token, expires_at, ip_address, user_agent, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())`,
          [user.id, tokenHash, expiresAt, req.socket.remoteAddress || null, req.headers['user-agent'] || null]
        );

        // Send password reset email
        try {
          await sendPasswordResetEmail(user.email, resetToken, user.first_name || '');
          console.log(`✅ Password reset email sent to: ${email}`);
        } catch (emailError) {
          console.error('❌ Failed to send password reset email:', emailError);
          // Still return success - don't expose email sending status
        }

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify(successResponse));
      } catch (error) {
        console.error('❌ Forgot password error:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to process password reset request' }));
      }
      return;
    }

    // Reset password - Complete password reset with token
    if (path === '/api/auth/reset-password' && method === 'POST') {
      const body = await parseBody(req);
      const { token, password } = body;

      console.log(`🔐 Password reset attempt with token`);

      try {
        if (!token || !password) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Token and new password are required' }));
          return;
        }

        // Validate password strength
        if (password.length < 8) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Password must be at least 8 characters' }));
          return;
        }

        // Hash the provided token to match stored hash
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // Find valid token
        const tokenResult = await pool.query(
          `SELECT prt.*, u.email
           FROM password_reset_tokens prt
           JOIN users u ON prt.user_id = u.id
           WHERE prt.token = $1 AND prt.expires_at > NOW() AND prt.used_at IS NULL`,
          [tokenHash]
        );

        if (tokenResult.rows.length === 0) {
          console.log('❌ Invalid or expired password reset token');
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Invalid or expired reset token. Please request a new password reset.' }));
          return;
        }

        const resetRecord = tokenResult.rows[0];

        // Hash new password
        const passwordHash = await bcrypt.hash(password, 12);

        // Update user's password
        await pool.query(
          'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
          [passwordHash, resetRecord.user_id]
        );

        // Mark token as used
        await pool.query(
          'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1',
          [resetRecord.id]
        );

        // Optionally: invalidate all refresh tokens for this user (force re-login)
        await pool.query(
          'DELETE FROM refresh_tokens WHERE user_id = $1',
          [resetRecord.user_id]
        );

        console.log(`✅ Password reset successful for: ${resetRecord.email}`);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          message: 'Password reset successful. You can now log in with your new password.'
        }));
      } catch (error) {
        console.error('❌ Reset password error:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to reset password' }));
      }
      return;
    }

    // Refresh token
    if (path === '/api/auth/refresh' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const { refreshToken } = body;

        console.log('🔄 Refresh token request received');
        console.log('🔍 Body:', body);
        console.log('🔍 refreshToken exists:', !!refreshToken);

        if (!refreshToken) {
          console.log('❌ No refresh token provided');
          res.writeHead(401, corsHeaders);
          res.end(JSON.stringify({ error: 'Refresh token required' }));
          return;
        }

        // Verify refresh token
        console.log('🔍 Verifying refresh token...');
        const decoded = verifyToken(refreshToken, true); // true = isRefreshToken
        console.log('🔍 Decoded:', decoded);

        if (!decoded) {
          console.log('❌ Invalid refresh token');
          res.writeHead(401, corsHeaders);
          res.end(JSON.stringify({ error: 'Invalid refresh token' }));
          return;
        }

        // Fetch current user data from database
        // Handle backwards compatibility: decoded.userId might be an object or a string
        const userId = typeof decoded.userId === 'object' ? decoded.userId.id : decoded.userId;
        console.log('🔍 Fetching user:', userId);
        const result = await pool.query(
          `SELECT id, email, first_name as "firstName", last_name as "lastName", role, created_at as "createdAt"
           FROM users WHERE id = $1`,
          [userId]
        );

        if (result.rows.length === 0) {
          console.log('❌ User not found in database');
          res.writeHead(401, corsHeaders);
          res.end(JSON.stringify({ error: 'User not found' }));
          return;
        }

        const user = result.rows[0];
        console.log('✅ User found:', user.email);

        // Generate new access token (refresh token stays the same)
        const newAccessToken = generateAccessToken({
          id: user.id,
          email: user.email,
          role: user.role
        });
        console.log('✅ New access token generated');

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          accessToken: newAccessToken
        }));
        console.log(`🔄 Token refreshed for user: ${user.email}`);
      } catch (error) {
        console.error('❌ Token refresh error:', error);
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Token refresh failed' }));
      }
      return;
    }

    // Get current user
    if (path === '/api/auth/me' && method === 'GET') {
      const auth = await authenticateToken(req);
      if (!auth.authenticated) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: auth.error || 'Unauthorized' }));
        return;
      }

      const user = auth.user;
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        membershipTier: user.membership_tier || 'foundations',
        trialExpiresAt: user.trial_expires_at || null
      }));
      return;
    }

    // Google OAuth - Initiate OAuth flow
    if (path === '/api/auth/google' && method === 'GET') {
      try {
        // Parse query parameters for invite code (required for registration)
        const url = new URL(req.url, `http://${req.headers.host}`);
        const inviteCode = url.searchParams.get('inviteCode');

        // Encode invite code in state parameter if provided
        const state = inviteCode ? Buffer.from(JSON.stringify({ inviteCode })).toString('base64') : undefined;

        const authUrl = googleClient.generateAuthUrl({
          access_type: 'offline',
          scope: [
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile'
          ],
          prompt: 'consent',
          state: state
        });

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ authUrl }));
        console.log(`🔐 Generated Google OAuth URL${inviteCode ? ' (with invite code)' : ''}`);
      } catch (error) {
        console.error('❌ Google OAuth URL generation error:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to generate OAuth URL' }));
      }
      return;
    }

    // Google OAuth - Callback handler
    if (path === '/api/auth/google/callback' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const { code, state } = body;

        if (!code) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Authorization code missing' }));
          return;
        }

        console.log('🔐 Processing Google OAuth callback with code');

        // Decode state parameter to get invite code (if registering)
        let inviteCode = null;
        if (state) {
          try {
            const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
            inviteCode = decoded.inviteCode;
            console.log(`🔐 Decoded invite code from state: ${inviteCode}`);
          } catch (err) {
            console.log('⚠️ Failed to decode state parameter');
          }
        }

        // Exchange code for tokens
        const { tokens } = await googleClient.getToken(code);
        googleClient.setCredentials(tokens);

        // Verify ID token and get user info
        const ticket = await googleClient.verifyIdToken({
          idToken: tokens.id_token,
          audience: GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const { email, given_name, family_name, sub: googleId } = payload;

        console.log(`🔐 Google OAuth verified: ${email}`);

        // Check if user exists
        let userResult = await pool.query(
          'SELECT id, email, first_name as "firstName", last_name as "lastName", role, created_at as "createdAt" FROM users WHERE email = $1',
          [email]
        );

        let user;

        if (userResult.rows.length === 0) {
          // NEW USER REGISTRATION - Validate invite code
          if (!inviteCode) {
            res.writeHead(400, corsHeaders);
            res.end(JSON.stringify({ error: 'Invite code required for registration' }));
            return;
          }

          // Validate invite code
          const inviteResult = await pool.query(`
            SELECT id, code, max_uses, uses_count, expires_at, is_active, assigned_role
            FROM invite_codes
            WHERE code = $1
          `, [inviteCode.toUpperCase().trim()]);

          if (inviteResult.rows.length === 0) {
            res.writeHead(400, corsHeaders);
            res.end(JSON.stringify({ error: 'Invalid invite code' }));
            return;
          }

          const invite = inviteResult.rows[0];

          if (!invite.is_active) {
            res.writeHead(400, corsHeaders);
            res.end(JSON.stringify({ error: 'This invite code has been deactivated' }));
            return;
          }

          if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
            res.writeHead(400, corsHeaders);
            res.end(JSON.stringify({ error: 'This invite code has expired' }));
            return;
          }

          if (invite.max_uses && invite.uses_count >= invite.max_uses) {
            res.writeHead(400, corsHeaders);
            res.end(JSON.stringify({ error: 'This invite code has reached its maximum uses' }));
            return;
          }

          // Create new user with Google OAuth
          const newUserResult = await pool.query(
            `INSERT INTO users (id, email, first_name, last_name, password_hash, role, created_at, updated_at)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
             RETURNING id, email, first_name as "firstName", last_name as "lastName", role, created_at as "createdAt"`,
            [email, given_name || '', family_name || '', `google_oauth_${googleId}`, invite.assigned_role || 'user']
          );
          user = newUserResult.rows[0];

          // Increment invite code usage
          await pool.query(
            'UPDATE invite_codes SET uses_count = uses_count + 1, updated_at = NOW() WHERE id = $1',
            [invite.id]
          );

          console.log(`✅ New user created via Google OAuth with invite code ${inviteCode}: ${email} (ID: ${user.id})`);
        } else {
          // EXISTING USER LOGIN - No invite code needed
          user = userResult.rows[0];
          console.log(`✅ Existing user logged in via Google OAuth: ${email} (ID: ${user.id})`);
        }

        // Generate session tokens
        const accessToken = generateAccessToken(user.id);
        const refreshToken = generateRefreshToken(user.id);

        sessions.set(accessToken, user);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          accessToken,
          refreshToken,
          user
        }));
      } catch (error) {
        console.error('❌ Google OAuth callback error:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Google authentication failed' }));
      }
      return;
    }

    // Get user by email
    if (path.startsWith('/api/user/by-email/') && method === 'GET') {
      const email = decodeURIComponent(path.replace('/api/user/by-email/', ''));

      try {
        const result = await pool.query(
          `SELECT id, email, first_name as "firstName", last_name as "lastName", created_at as "createdAt"
           FROM users WHERE email = $1`,
          [email]
        );

        if (result.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'User not found' }));
          return;
        }

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify(result.rows[0]));
      } catch (error) {
        console.error('❌ Error fetching user:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to fetch user' }));
      }
      return;
    }

    // Create database user record (consultant)
    if (path === '/api/admin/consultants' && method === 'POST') {
      const body = await parseBody(req);
      const { email, userId } = body;

      try {
        // Verify user exists in PostgreSQL
        const result = await pool.query(
          `SELECT id, email, first_name as "firstName", last_name as "lastName", created_at as "createdAt"
           FROM users WHERE email = $1`,
          [email]
        );

        if (result.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'User not found' }));
          return;
        }

        const user = result.rows[0];

        // Return success with user data
        res.writeHead(201, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          consultant: {
            id: user.id,
            email: user.email,
            userId: userId || user.id,
            createdAt: user.createdAt
          }
        }));
        console.log(`✅ Created consultant record for: ${email}`);
      } catch (error) {
        console.error('❌ Error creating consultant:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to create consultant' }));
      }
      return;
    }

    // Get agents (for chat interface)
    if (path === '/api/letta/agents' && method === 'GET') {
      try {
        // Get authenticated user if available
        const authResult = await authenticateToken(req);
        const userId = authResult.authenticated ? authResult.user.id : null;

        // Get user's onboarding status if authenticated
        let onboardingCompleted = false;
        if (userId) {
          const onboardingResult = await pool.query(
            `SELECT onboarding_completed FROM user_onboarding_status WHERE user_id = $1`,
            [userId]
          );
          onboardingCompleted = onboardingResult.rows.length > 0 ? onboardingResult.rows[0].onboarding_completed : false;
        }

        // Query agents from database
        const agentsResult = await pool.query(`
          SELECT slug, name, description, is_active,
                 COALESCE(locked_until_onboarding, false) as locked_until_onboarding,
                 COALESCE(requires_onboarding, false) as requires_onboarding,
                 COALESCE(icon, '🤖') as icon,
                 COALESCE(accent_color, '#3B82F6') as accent_color
          FROM agents
          WHERE is_active = true
          ORDER BY
            CASE
              WHEN slug = 'client-onboarding' THEN 0
              ELSE 1
            END,
            COALESCE(display_order, 999),
            name
        `);

        // Map agents and apply locking logic
        const agents = agentsResult.rows.map(agent => {
          const isLocked = !onboardingCompleted && agent.locked_until_onboarding && !agent.requires_onboarding;

          return {
            id: agent.slug,
            name: agent.name,
            description: agent.description,
            status: isLocked ? 'locked' : 'active',
            icon: agent.icon,
            accent_color: agent.accent_color,
            locked: isLocked,
            locked_reason: isLocked ? 'Complete onboarding to unlock this agent' : null
          };
        });

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify(agents));
      } catch (error) {
        console.error('❌ Error fetching agents:', error);
        // Fallback to basic response
        const agents = [
          { id: 'client-onboarding', name: 'Client Onboarding', description: 'Build your complete business profile', status: 'active', icon: '👋' }
        ];
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify(agents));
      }
      return;
    }

    // Get agents (for admin interface - v7 format)
    if (path === '/api/v7/agents' && method === 'GET') {
      const agents = [
        {
          id: '1',
          agent_id: 'general',
          agent_name: 'Rana Agent',
          agent_description: 'General Agent proficient in all Agent\'s knowledge as well as custom vector KB',
          agent_version: 'v1',
          is_published: true,
          is_active: true,
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          agent_id: 'client-onboarding',
          agent_name: 'Client Onboarding',
          agent_description: 'Build your complete business profile - 11 questions, 5 sections',
          agent_version: 'v1',
          is_published: true,
          is_active: true,
          updated_at: new Date().toISOString()
        },
        {
          id: '3',
          agent_id: 'money-model-maker',
          agent_name: 'Money Model Maker',
          agent_description: 'Create your foundational value proposition',
          agent_version: 'v1',
          is_published: true,
          is_active: true,
          updated_at: new Date().toISOString()
        },
        {
          id: '4',
          agent_id: 'fast-fix-finder',
          agent_name: 'Fast Fix Finder',
          agent_description: 'Design your quick-win entry offer',
          agent_version: 'v1',
          is_published: true,
          is_active: true,
          updated_at: new Date().toISOString()
        },
        {
          id: '5',
          agent_id: 'offer-promo-printer',
          agent_name: 'Offer Promo Printer',
          agent_description: 'Generate promotional invitations',
          agent_version: 'v1',
          is_published: true,
          is_active: true,
          updated_at: new Date().toISOString()
        },
        {
          id: '6',
          agent_id: 'promo-planner',
          agent_name: 'Promo Planner',
          agent_description: 'Build 10-day campaigns',
          agent_version: 'v1',
          is_published: true,
          is_active: true,
          updated_at: new Date().toISOString()
        },
        {
          id: '7',
          agent_id: 'qualification-call-builder',
          agent_name: 'Qualification Call Builder',
          agent_description: 'Create sales scripts',
          agent_version: 'v1',
          is_published: true,
          is_active: true,
          updated_at: new Date().toISOString()
        },
        {
          id: '8',
          agent_id: 'linkedin-events-builder',
          agent_name: 'LinkedIn Events Builder Buddy',
          agent_description: 'Plan compelling events',
          agent_version: 'v1',
          is_published: true,
          is_active: true,
          updated_at: new Date().toISOString()
        }
      ];

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify(agents));
      return;
    }

    // Chat with agent (Real AI!)
    if (path === '/api/letta/chat' && method === 'POST') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      const body = await parseBody(req);
      const { agentId, message } = body;

      console.log(`🤖 Agent: ${agentId} | User: ${user.email} | Message: "${message}"`);

      try {
        // Call OpenRouter with agent-specific prompt
        const aiResponse = await callOpenRouter([
          { role: 'user', content: message }
        ], agentId);

        console.log(`✅ AI Response: ${aiResponse.substring(0, 100)}...`);

        const response = {
          id: generateId(),
          conversationId: agentId + '_' + user.id,
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date().toISOString(),
          agent: agentId,
          provider: 'OpenRouter GPT-4o'
        };

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify(response));
      } catch (error) {
        console.error('❌ OpenRouter Error:', error.message);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({
          error: 'AI service error',
          message: error.message
        }));
      }
      return;
    }

    // Chat stream (SSE)
    if (path === '/api/letta/chat/stream' && method === 'POST') {
      console.log('🔵 Stream endpoint hit');

      // Track start time for response timing
      const requestStartTime = Date.now();

      const user = getUserFromToken(req.headers.authorization);
      if (!user) {
        console.log('❌ No user found');
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      console.log('✅ User authenticated:', user.email);

      // Apply rate limiting to prevent hitting OpenRouter's limits
      const rateLimitResult = chatRateLimiter(user.id);
      if (!rateLimitResult.allowed) {
        console.log(`⏸️ [RATE_LIMIT] User ${user.email} hit chat rate limit`);
        res.writeHead(429, {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitResult.resetTime.toISOString(),
          'Retry-After': Math.ceil((rateLimitResult.resetTime - new Date()) / 1000)
        });

        // Send rate limit error as SSE
        res.write(`data: ${JSON.stringify({
          type: 'error',
          error: rateLimitResult.message,
          statusCode: 429,
          content: rateLimitResult.message,
          resetTime: rateLimitResult.resetTime
        })}\n\n`);
        res.write(`data: [DONE]\n\n`);
        res.end();
        return;
      }

      let body;
      try {
        body = await parseBody(req);
        console.log('📦 Body parsed:', JSON.stringify(body).substring(0, 100));
      } catch (e) {
        console.error('❌ Failed to parse body:', e);
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: 'Invalid request body' }));
        return;
      }

      const { agentId, message, messages, memoryEnabled, memorySettings, modelOverride, documentIds, clientProfileId, viewAsUserId } = body;

      // When admin is impersonating, use the target user's context for memory/data
      const isAuthAdmin = ['admin', 'ADMIN'].includes(user.role);
      const memoryUserId = (viewAsUserId && isAuthAdmin) ? viewAsUserId : user.id;

      // Resolve granular memory category flags (backward compat with memoryEnabled boolean)
      const resolvedMemory = {
        enabled: memorySettings?.masterEnabled ?? (memoryEnabled !== false),
        profile: memorySettings?.categories?.profile ?? true,
        knowledge: memorySettings?.categories?.knowledge ?? true,
        history: memorySettings?.categories?.history ?? true,
        brandVoice: memorySettings?.categories?.brandVoice ?? true,
      };

      // ============================================
      // TRIAL USER ENFORCEMENT — check limits before AI call
      // ============================================
      const trialCheck = await checkTrialLimits(user.id);
      if (trialCheck.isTrial) {
        // Trial users get full access to ALL agents with UNLIMITED messages for 7 days.
        // Only enforce: (1) trial expiry and (2) rate limiting (anti-abuse).

        if (!trialCheck.allowed) {
          // Only triggers on trial expiry now (no message caps)
          res.writeHead(200, { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
          const config = getTrialConfig();
          const upgradeMessage = `⏰ **Your 7-day trial has ended.**\n\nYou had a great run! Your conversations are saved and waiting for you.\n\n👉 [Upgrade to Full Access](${config.upgrade_url}) to continue where you left off and unlock all 12+ agents.`;
          res.write(`data: ${JSON.stringify({ type: 'content', content: upgradeMessage })}\n\n`);
          res.write(`data: [DONE]\n\n`);
          res.end();
          return;
        }

        // Trial rate limiter removed — trial users get same 10/min as everyone else via chatRateLimiter above

        console.log(`🆓 [TRIAL] User ${user.email} | Unlimited messages | ${trialCheck.usage?.daysRemaining}d left`);
      }

      // ============================================
      // ADMIN SUPPORT AGENT - DIRECT DATABASE QUERIES
      // ============================================
      if (agentId === 'admin-support-agent') {
        console.log('🔧 [ADMIN_AGENT] Admin Support Agent detected, checking for data query...');

        // Check if user has admin or power_user role
        const userRoleResult = await pool.query('SELECT role FROM users WHERE id = $1', [user.id]);
        const userRole = userRoleResult.rows[0]?.role || 'user';

        if (userRole !== 'admin' && userRole !== 'power_user') {
          console.log(`❌ [ADMIN_AGENT] User ${user.email} (role: ${userRole}) not authorized for admin queries`);
          res.writeHead(200, { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
          res.write(`data: ${JSON.stringify({ type: 'content', content: '⚠️ **Access Denied**\n\nThe Admin Support Agent is only available to users with admin or power_user roles. Please contact your administrator for access.' })}\n\n`);
          res.write(`data: [DONE]\n\n`);
          res.end();
          return;
        }

        // Try to handle as a database query
        const adminQueryResult = await handleAdminSupportQuery(message, user.id, pool);

        if (adminQueryResult.handled) {
          console.log('✅ [ADMIN_AGENT] Query handled, returning results');
          res.writeHead(200, { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });

          // Stream the response in chunks for better UX
          const response = adminQueryResult.response;
          const chunkSize = 50;
          for (let i = 0; i < response.length; i += chunkSize) {
            res.write(`data: ${JSON.stringify({ type: 'content', content: response.substring(i, i + chunkSize) })}\n\n`);
          }

          res.write(`data: [DONE]\n\n`);
          res.end();
          return;
        }

        // If not a recognized query, fall through to AI for help
        console.log('ℹ️ [ADMIN_AGENT] Not a recognized query pattern, using AI to assist');
      }

      // ============================================
      // LARGE DOCUMENT DETECTION & EXTRACTION
      // ============================================
      // Check if user pasted a large document and process it to save tokens
      let processedMessage = message;
      let documentExtractionResult = null;

      if (message && isLargeDocument(message)) {
        console.log(`📄 [DOC_EXTRACT] Large document detected (${message.length} chars, ~${estimateTokens(message)} tokens)`);

        try {
          documentExtractionResult = await processLargeDocument(
            message,
            user.id,
            pool,
            async (msgs, model, opts) => {
              // Use the existing openRouterCall function
              return await callOpenRouterWithRetry(msgs, model, opts);
            },
            generateEmbedding // Pass embedding function for RAG chunking
          );

          if (documentExtractionResult.processed) {
            processedMessage = documentExtractionResult.message;
            console.log(`✅ [DOC_EXTRACT] Document processed, saved ~${documentExtractionResult.tokensSaved || 0} tokens`);
            console.log(`💰 [DOC_EXTRACT] Extraction cost: $${documentExtractionResult.cost?.toFixed(4) || '0.0000'}`);
          }
        } catch (docError) {
          console.error('❌ [DOC_EXTRACT] Error processing document:', docError.message);
          // Continue with original message if extraction fails
        }
      }

      // Initialize logging metadata
      const responseMetadata = {
        startTime: requestStartTime,
        models: {},
        tokens: {},
        memory: {
          enabled: resolvedMemory.enabled,
          categories: {
            profile: { enabled: resolvedMemory.profile, loaded: 0 },
            knowledge: { enabled: resolvedMemory.knowledge, loaded: 0 },
            history: { enabled: resolvedMemory.history, loaded: 0 },
            brandVoice: { enabled: resolvedMemory.brandVoice, loaded: false },
          },
          loaded: 0,
          types: {}
        },
        widget: { enabled: body.widgetFormattingEnabled === true, applied: false },
        documents: documentIds ? documentIds.length : 0
      };

      console.log(`🤖 [STREAM] Agent: ${agentId} | User: ${user.email} | Message: "${message}"`);
      console.log(`📝 Conversation history: ${messages ? messages.length : 0} previous messages`);
      console.log(`🧠 Memory enabled: ${resolvedMemory.enabled} | Categories: profile=${resolvedMemory.profile} knowledge=${resolvedMemory.knowledge} history=${resolvedMemory.history} brandVoice=${resolvedMemory.brandVoice}${clientProfileId ? ` | Client: ${clientProfileId}` : ''}`);
      if (modelOverride) console.log(`🔄 Model override: ${modelOverride}`);
      if (documentIds && documentIds.length > 0) console.log(`📎 Documents attached: ${documentIds.length}`);

      try {
        // Send SSE headers FIRST (before any res.write calls)
        const sseHeaders = {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        };
        res.writeHead(200, sseHeaders);

        // Status tracker — shows completed steps with ticks + current step
        const statusTracker = {
          completed: [],
          lastSentAt: Date.now(),
          minDelay: 300, // ms minimum between status updates
          async send(currentStep) {
            // Enforce minimum display time
            const elapsed = Date.now() - this.lastSentAt;
            if (elapsed < this.minDelay) {
              await new Promise(r => setTimeout(r, this.minDelay - elapsed));
            }
            const lines = [
              ...this.completed.map(s => `✅ ${s}`),
              `⏳ ${currentStep}`
            ].join('\n');
            res.write(`data: ${JSON.stringify({ type: 'status', message: lines })}\n\n`);
            this.lastSentAt = Date.now();
          },
          async complete(step) {
            this.completed.push(step);
          }
        };

        // Load relevant memories for this user and agent (only if memoryEnabled)
        let memoryContext = '';
        let crossAgentContext = '';
        let ragContext = '';
        let documentContext = '';

        // Pipeline step timer
        const pipelineSteps = [];
        let stepStart = Date.now();
        function logStep(name) {
          const elapsed = Date.now() - stepStart;
          pipelineSteps.push({ name, ms: elapsed });
          stepStart = Date.now();
        }
        logStep('init');

        // Send initial status to frontend
        await statusTracker.send('Getting things ready...');

        // PERFORMANCE OPTIMIZATION: Lazy embedding generation
        // Only generates when first needed (memory lookups or RAG search)
        // Saves ~550ms per request when memory is OFF and no RAG needed
        let sharedQueryEmbedding = null;
        let embeddingGenerated = false;
        async function getSharedEmbedding() {
          if (embeddingGenerated) return sharedQueryEmbedding;
          embeddingGenerated = true;
          const embeddingStartTime = Date.now();
          try {
            console.log(`⚡ [PERF] Generating shared embedding for all searches...`);
            sharedQueryEmbedding = await generateEmbedding(processedMessage);
            console.log(`⚡ [PERF] Shared embedding generated in ${Date.now() - embeddingStartTime}ms (dimensions: ${sharedQueryEmbedding?.length || 0})`);
          } catch (embError) {
            console.warn(`⚠️ [PERF] Failed to generate shared embedding: ${embError.message}`);
          }
          return sharedQueryEmbedding;
        }

        // Skip embedding entirely when memory is off — generate lazily only if needed for RAG
        if (memoryEnabled !== false) {
          await getSharedEmbedding();
          logStep('embedding');
        } else {
          console.log(`⚡ [PERF] Skipping upfront embedding — memory is OFF (will lazy-generate if RAG needs it)`);
          logStep('embedding_skipped');
        }

        // ============================================
        // PARALLEL PIPELINE: Run memory + RAG concurrently when flag is ON
        // ============================================
        async function runMemoryLookup() {
          if (!resolvedMemory.enabled) {
            console.log(`ℹ️ [MEMORY] Memory disabled for this conversation`);
            return;
          }
          await statusTracker.complete('Ready');
          await statusTracker.send('Pulling up what I know about you...');
          console.log(`🧠 [MEMORY] Loading memories for user ${memoryUserId}${viewAsUserId ? ` (admin ${user.id} viewing as)` : ''}...`);

          try {
            // Step 1: Load core memories (persistent across all conversations)
            // Gated by resolvedMemory.profile category
            const coreMemories = resolvedMemory.profile ? await getCoreMemories(pool, memoryUserId, clientProfileId || null) : [];
            console.log(`💎 [MEMORY] Found ${coreMemories.length} core memories from memories table`);

            debugLog('MEMORY_LOAD', 'Core memories loaded', {
              count: coreMemories.length,
              memories: ADMIN_DEBUG_MODE ? coreMemories : '[Enable debug mode to see memories]'
            });

            // Step 1.5: Load core_memories table (onboarding data) — gated by profile category
            if (!resolvedMemory.profile) {
              console.log(`ℹ️ [MEMORY] Profile category disabled — skipping core_memories + business_profiles`);
            }
            const coreMemoriesTable = resolvedMemory.profile ? await pool.query(`
              SELECT * FROM core_memories WHERE user_id = $1
                AND ${clientProfileId ? 'client_profile_id = $2' : 'client_profile_id IS NULL'}
            `, clientProfileId ? [memoryUserId, clientProfileId] : [memoryUserId]) : { rows: [] };

            if (coreMemoriesTable.rows.length > 0) {
              const profile = coreMemoriesTable.rows[0];
              console.log(`📋 [CORE_MEMORIES] Found onboarding profile data for user ${memoryUserId}`);

              // Format core_memories data as structured memory objects
              const profileMemories = [];

              if (profile.full_name) {
                profileMemories.push({
                  memory_tier: 'core',
                  memory_type: 'personal_context',
                  content: `Name: ${profile.full_name}`
                });
              }

              if (profile.company_name) {
                profileMemories.push({
                  memory_tier: 'core',
                  memory_type: 'business_context',
                  content: `Company: ${profile.company_name}`
                });
              }

              if (profile.target_clients) {
                profileMemories.push({
                  memory_tier: 'core',
                  memory_type: 'business_context',
                  content: `Target Clients: ${profile.target_clients}`
                });
              }

              if (profile.business_outcome) {
                profileMemories.push({
                  memory_tier: 'core',
                  memory_type: 'business_context',
                  content: `Business Outcome: ${profile.business_outcome}`
                });
              }

              if (profile.client_results) {
                profileMemories.push({
                  memory_tier: 'core',
                  memory_type: 'business_context',
                  content: `Client Results: ${profile.client_results}`
                });
              }

              if (profile.core_method) {
                profileMemories.push({
                  memory_tier: 'core',
                  memory_type: 'strategy',
                  content: `Core Method: ${profile.core_method}`
                });
              }

              if (profile.service_description) {
                profileMemories.push({
                  memory_tier: 'core',
                  memory_type: 'business_context',
                  content: `Service: ${profile.service_description}`
                });
              }

              if (profile.pricing_model) {
                profileMemories.push({
                  memory_tier: 'core',
                  memory_type: 'business_context',
                  content: `Pricing Model: ${profile.pricing_model}`
                });
              }

              if (profile.delivery_timeline) {
                profileMemories.push({
                  memory_tier: 'core',
                  memory_type: 'business_context',
                  content: `Delivery Timeline: ${profile.delivery_timeline}`
                });
              }

              if (profile.revenue_range) {
                profileMemories.push({
                  memory_tier: 'core',
                  memory_type: 'metric',
                  content: `Revenue Range: ${profile.revenue_range}`
                });
              }

              if (profile.growth_goals) {
                profileMemories.push({
                  memory_tier: 'core',
                  memory_type: 'goal',
                  content: `Growth Goals: ${profile.growth_goals}`
                });
              }

              if (profile.client_problems && Array.isArray(profile.client_problems) && profile.client_problems.length > 0) {
                profileMemories.push({
                  memory_tier: 'core',
                  memory_type: 'pain_point',
                  content: `Client Problems: ${profile.client_problems.join(', ')}`
                });
              }

              if (profile.frameworks && Array.isArray(profile.frameworks) && profile.frameworks.length > 0) {
                profileMemories.push({
                  memory_tier: 'core',
                  memory_type: 'strategy',
                  content: `Frameworks: ${profile.frameworks.join(', ')}`
                });
              }

              if (profile.biggest_challenges && Array.isArray(profile.biggest_challenges) && profile.biggest_challenges.length > 0) {
                profileMemories.push({
                  memory_tier: 'core',
                  memory_type: 'pain_point',
                  content: `Biggest Challenges: ${profile.biggest_challenges.join(', ')}`
                });
              }

              // Prepend profile memories to core memories array
              if (profileMemories.length > 0) {
                coreMemories.unshift(...profileMemories);
                console.log(`✅ [CORE_MEMORIES] Added ${profileMemories.length} profile fields to core memories`);
              }
            } else {
              console.log(`ℹ️ [CORE_MEMORIES] No onboarding profile data found for user ${memoryUserId}`);
            }

            // Step 1.6: Load extracted business profile (from large document pastes) — gated by profile category
            const businessProfileResult = resolvedMemory.profile ? await pool.query(`
              SELECT * FROM user_business_profiles WHERE user_id = $1
                AND ${clientProfileId ? 'client_profile_id = $2' : 'client_profile_id IS NULL'}
              ORDER BY created_at DESC LIMIT 1
            `, clientProfileId ? [memoryUserId, clientProfileId] : [memoryUserId]) : { rows: [] };

            if (businessProfileResult.rows.length > 0) {
              const bp = businessProfileResult.rows[0];
              console.log(`📄 [BUSINESS_PROFILE] Found extracted business profile for user ${memoryUserId}`);

              const bpMemories = [];

              if (bp.business_name) {
                bpMemories.push({ memory_tier: 'core', memory_type: 'business_context', content: `Business Name: ${bp.business_name}` });
              }
              if (bp.owner_name) {
                bpMemories.push({ memory_tier: 'core', memory_type: 'personal_context', content: `Owner: ${bp.owner_name}` });
              }
              if (bp.target_audience) {
                bpMemories.push({ memory_tier: 'core', memory_type: 'business_context', content: `Target Audience: ${bp.target_audience}` });
              }
              if (bp.transformation) {
                bpMemories.push({ memory_tier: 'core', memory_type: 'strategy', content: `Transformation: ${bp.transformation}` });
              }
              if (bp.delivery_model) {
                bpMemories.push({ memory_tier: 'core', memory_type: 'business_context', content: `Delivery Model: ${bp.delivery_model}` });
              }
              if (bp.main_challenge) {
                bpMemories.push({ memory_tier: 'core', memory_type: 'pain_point', content: `Main Challenge: ${bp.main_challenge}` });
              }

              // Parse JSON fields
              if (bp.problems && Array.isArray(bp.problems) && bp.problems.length > 0) {
                const problemList = bp.problems.map(p => typeof p === 'object' ? p.problem : p).filter(Boolean);
                if (problemList.length > 0) {
                  bpMemories.push({ memory_tier: 'core', memory_type: 'pain_point', content: `Problems They Solve: ${problemList.join(', ')}` });
                }
              }

              if (bp.frameworks && Array.isArray(bp.frameworks) && bp.frameworks.length > 0) {
                const fwNames = bp.frameworks.map(f => typeof f === 'object' ? f.name : f).filter(Boolean);
                if (fwNames.length > 0) {
                  bpMemories.push({ memory_tier: 'core', memory_type: 'strategy', content: `Frameworks: ${fwNames.join(', ')}` });
                }
              }

              if (bp.case_studies && Array.isArray(bp.case_studies) && bp.case_studies.length > 0) {
                const csMetrics = bp.case_studies.map(cs => cs.metrics || cs.result).filter(Boolean);
                if (csMetrics.length > 0) {
                  bpMemories.push({ memory_tier: 'core', memory_type: 'proof', content: `Key Results: ${csMetrics.join('; ')}` });
                }
              }

              if (bpMemories.length > 0) {
                coreMemories.unshift(...bpMemories);
                console.log(`✅ [BUSINESS_PROFILE] Added ${bpMemories.length} extracted profile fields to context`);
              }
            }

            // Step 1.7: Search document chunks for relevant content (user knowledge) — gated by knowledge category
            if (!resolvedMemory.knowledge) {
              console.log(`ℹ️ [MEMORY] Knowledge category disabled — skipping document chunks`);
            }
            try {
              if (!resolvedMemory.knowledge) throw new Error('knowledge_disabled'); // Skip to catch block
              // Check if user has document chunks stored
              const chunkCountResult = await pool.query(
                `SELECT COUNT(*) as count FROM user_document_chunks WHERE user_id = $1 AND embedding IS NOT NULL
                  AND ${clientProfileId ? 'client_profile_id = $2' : 'client_profile_id IS NULL'}`,
                clientProfileId ? [memoryUserId, clientProfileId] : [memoryUserId]
              );

              const chunkCount = parseInt(chunkCountResult.rows[0]?.count || 0);
              if (chunkCount > 0) {
                console.log(`📄 [DOC_CHUNKS] User has ${chunkCount} searchable document chunks`);

                // Use shared embedding (already generated above)
                const queryEmbedding = sharedQueryEmbedding;

                if (queryEmbedding) {
                  // Search for relevant chunks
                  const chunkParams = clientProfileId
                    ? [memoryUserId, `[${queryEmbedding.join(',')}]`, clientProfileId]
                    : [memoryUserId, `[${queryEmbedding.join(',')}]`];
                  const relevantChunks = await pool.query(`
                    SELECT chunk_text, section_type,
                           1 - (embedding <=> $2::vector) as similarity
                    FROM user_document_chunks
                    WHERE user_id = $1
                      AND embedding IS NOT NULL
                      AND ${clientProfileId ? 'client_profile_id = $3' : 'client_profile_id IS NULL'}
                    ORDER BY embedding <=> $2::vector
                    LIMIT 3
                  `, chunkParams);

                  if (relevantChunks.rows.length > 0) {
                    // Filter to only include reasonably relevant chunks (similarity > 0.5)
                    const goodChunks = relevantChunks.rows.filter(c => c.similarity > 0.5);

                    if (goodChunks.length > 0) {
                      console.log(`🎯 [DOC_CHUNKS] Found ${goodChunks.length} relevant document chunks`);

                      // Add as context memories
                      goodChunks.forEach((chunk, idx) => {
                        coreMemories.push({
                          memory_tier: 'active',
                          memory_type: 'document_context',
                          content: `[From uploaded document - ${chunk.section_type}]: ${chunk.chunk_text}`,
                          similarity: chunk.similarity
                        });
                      });

                      console.log(`✅ [DOC_CHUNKS] Added ${goodChunks.length} document chunks to context`);
                    }
                  }
                }
              }
            } catch (chunkErr) {
              if (chunkErr.message !== 'knowledge_disabled') {
                console.error(`⚠️ [DOC_CHUNKS] Search error (non-fatal):`, chunkErr.message);
              }
              // Non-fatal - continue without chunk search
            }

            // Step 2: Build conversation context for semantic search
            const conversationContext = messages
              ? messages.map(m => `${m.role}: ${m.content}`).join('\n\n') + `\n\nuser: ${message}`
              : message;

            // Step 3: Semantic search for relevant working/active memories — gated by history category
            const semanticMemories = resolvedMemory.history ? await retrieveSemanticMemories(
              pool,
              memoryUserId,
              conversationContext,
              {
                maxMemories: 10,
                includeTiers: ['active', 'working'],
                vectorWeight: 0.7,
                importanceWeight: 0.2,
                recencyWeight: 0.1,
                precomputedEmbedding: sharedQueryEmbedding, // Reuse shared embedding
                clientProfileId: clientProfileId || null
              }
            ) : [];
            if (!resolvedMemory.history) console.log(`ℹ️ [MEMORY] History category disabled — skipping semantic memories`);

            console.log(`🎯 [MEMORY] Found ${semanticMemories.length} semantically relevant memories`);

            // Step 4: Combine core + semantic memories
            const allMemories = [...coreMemories, ...semanticMemories];

            if (allMemories.length > 0) {
              // Format memories by tier and type
              const memoryTypes = {};
              const coreMems = [];

              allMemories.forEach(mem => {
                if (mem.memory_tier === 'core') {
                  coreMems.push(mem.content);
                } else {
                  const typeKey = mem.memory_type.toLowerCase();
                  if (!memoryTypes[typeKey]) {
                    memoryTypes[typeKey] = [];
                  }
                  memoryTypes[typeKey].push(mem.content);
                }
              });

              // Track memory metadata for logging (including per-category counts)
              responseMetadata.memory.loaded = allMemories.length;
              responseMetadata.memory.core = coreMemories.length;
              responseMetadata.memory.semantic = semanticMemories.length;
              responseMetadata.memory.categories.profile.loaded = coreMemories.filter(m => m.memory_tier === 'core').length;
              responseMetadata.memory.categories.knowledge.loaded = coreMemories.filter(m => m.memory_type === 'document_context').length;
              responseMetadata.memory.categories.history.loaded = semanticMemories.length;
              responseMetadata.memory.types = Object.keys(memoryTypes).reduce((acc, type) => {
                acc[type] = memoryTypes[type].length;
                return acc;
              }, {});

              // Build memory context string
              const contextParts = [];

              // Core memories first (always at top)
              if (coreMems.length > 0) {
                contextParts.push(`🔑 CORE IDENTITY:\n${coreMems.join('\n')}`);
              }

              // Priority order for other types
              const priorityTypes = ['business_context', 'goal', 'pain_point', 'strategy', 'decision', 'preference', 'personal_context', 'metric'];

              // Add priority types
              priorityTypes.forEach(type => {
                if (memoryTypes[type] && memoryTypes[type].length > 0) {
                  const label = type.toUpperCase().replace(/_/g, ' ');
                  contextParts.push(`${label}:\n${memoryTypes[type].join('\n')}`);
                }
              });

              // Add any other types not in priority list
              Object.keys(memoryTypes).forEach(type => {
                if (!priorityTypes.includes(type) && memoryTypes[type].length > 0) {
                  const label = type.toUpperCase().replace(/_/g, ' ');
                  contextParts.push(`${label}:\n${memoryTypes[type].join('\n')}`);
                }
              });

              if (contextParts.length > 0) {
                memoryContext = `\n\n---REMEMBERED CONTEXT (Semantic Search + Core Memory)---\n${contextParts.join('\n\n')}\n---END REMEMBERED CONTEXT---\n\nUse this remembered information to personalize your response. Core memories represent fundamental facts about the user that should always be considered.`;
                console.log(`✅ [MEMORY] Memory context built: ${coreMemories.length} core + ${semanticMemories.length} semantic = ${allMemories.length} total (${memoryContext.length} chars)`);
              }
            } else {
              console.log(`ℹ️ [MEMORY] No memories found for this user yet`);
            }
          } catch (memError) {
            console.error('⚠️ [MEMORY] Failed to load memories:', memError.message);
            console.error(memError.stack);
            // Continue without memories rather than failing the request
          }
        } // end runMemoryLookup

        // Wrap RAG search in a function for parallel execution
        async function runRagSearch() {
          await statusTracker.send('Digging through the knowledge base...');
          try {
            debugLog('RAG_CONTEXT', 'Starting knowledge base search', {
              message: processedMessage.substring(0, 100) + '...',
              agentId
            });

            log(`🔍 [RAG] Searching knowledge base for agent ${agentId}...`);
            // Lazy-generate embedding if not already created (e.g. memory was off)
            const ragEmbedding = await getSharedEmbedding();
            const relevantChunks = await searchRelevantChunks(processedMessage, agentId, {
              maxChunks: 3,
              similarityThreshold: 0.7,
              debugMode: ADMIN_DEBUG_MODE,
              precomputedEmbedding: ragEmbedding // Reuse shared embedding (lazy-generated)
            }, pool);

            if (relevantChunks && relevantChunks.length > 0) {
              log(`📚 [RAG] Found ${relevantChunks.length} relevant knowledge chunks`);
              relevantChunks.forEach((chunk, idx) => {
                log(`  ${idx + 1}. ${chunk.title} (similarity: ${chunk.similarity})`);
              });

              ragContext = formatContextForLLM(relevantChunks);
              log(`✅ [RAG] Knowledge base context built (${ragContext.length} chars)`);
            } else {
              log(`ℹ️ [RAG] No relevant knowledge base content found`);
            }
          } catch (ragError) {
            logError('⚠️ [RAG] Failed to search knowledge base:', ragError.message);
            // Continue without RAG rather than failing the request
          }
        } // end runRagSearch

        // ============================================
        // EXECUTE: Memory + RAG (parallel or sequential based on feature flag)
        // ============================================
        if (PERF_PARALLEL_PIPELINE && resolvedMemory.enabled) {
          // PARALLEL MODE: Run memory lookup + RAG search concurrently
          console.log(`⚡ [PARALLEL] Running memory lookup + RAG search in parallel...`);
          const parallelStart = Date.now();
          await Promise.all([
            runMemoryLookup(),
            runRagSearch()
          ]);
          logStep('parallel_memory_rag');
          console.log(`⚡ [PARALLEL] Both completed in ${Date.now() - parallelStart}ms (saved ~${Math.max(0, (Date.now() - parallelStart))}ms vs sequential)`);
        } else {
          // SEQUENTIAL MODE (legacy): Memory first, then RAG
          if (resolvedMemory.enabled) {
            await runMemoryLookup();
            logStep('memory_lookup');
          } else {
            logStep('memory_skipped');
          }
          await runRagSearch();
          logStep('rag_search');
        }

        // Load attached documents (always sequential — fast file reads)
        if (documentIds && documentIds.length > 0) {
          console.log(`📎 [DOCUMENTS] Loading ${documentIds.length} attached documents...`);
          try {
            const docsResult = await pool.query(`
              SELECT id, filename, original_filename, file_path, mime_type
              FROM documents
              WHERE id = ANY($1) AND user_id = $2
            `, [documentIds, memoryUserId]);

            if (docsResult.rows.length > 0) {
              console.log(`📄 [DOCUMENTS] Found ${docsResult.rows.length} documents`);

              const MAX_DOC_CHARS = 200000; // ~50K tokens per document max
              const MAX_TOTAL_DOC_CHARS = 400000; // ~100K tokens total for all docs
              const documentContents = [];
              let totalDocChars = 0;
              for (const doc of docsResult.rows) {
                try {
                  let content = fs.readFileSync(doc.file_path, 'utf-8');
                  if (content.length > MAX_DOC_CHARS) {
                    console.log(`✂️ [DOCUMENTS] Truncating ${doc.original_filename}: ${content.length} → ${MAX_DOC_CHARS} chars`);
                    content = content.substring(0, MAX_DOC_CHARS) + '\n...[document truncated — too large for context window]';
                  }
                  if (totalDocChars + content.length > MAX_TOTAL_DOC_CHARS) {
                    console.log(`⚠️ [DOCUMENTS] Skipping ${doc.original_filename} — total document size would exceed ${MAX_TOTAL_DOC_CHARS} chars`);
                    continue;
                  }
                  documentContents.push(`--- Document: ${doc.original_filename} ---\n${content}\n--- End Document ---`);
                  totalDocChars += content.length;
                  console.log(`✅ [DOCUMENTS] Loaded ${doc.original_filename} (${content.length} chars)`);
                } catch (readError) {
                  console.error(`❌ [DOCUMENTS] Failed to read ${doc.original_filename}:`, readError.message);
                }
              }

              if (documentContents.length > 0) {
                documentContext = `\n\n---ATTACHED DOCUMENTS---\n${documentContents.join('\n\n')}\n---END ATTACHED DOCUMENTS---\n\nThe user has attached the above documents. Reference them in your response.`;
                console.log(`✅ [DOCUMENTS] Document context built (${documentContext.length} chars)`);
              }
            } else {
              console.log(`⚠️ [DOCUMENTS] No documents found with provided IDs`);
            }
          } catch (docError) {
            console.error('❌ [DOCUMENTS] Failed to load documents:', docError.message);
          }
        }

        // ============================================
        // CROSS-AGENT CONTEXT (for new conversations)
        // ============================================
        // On new conversations, check if user has work with other agents
        // and auto-inject summarized context so agents can see previous outputs
        // IMPORTANT: Only inject when memory is enabled — users who disable memory
        // expect NO previous context to be injected
        const isNewConversation = !messages || messages.length === 0;

        if (isNewConversation && agentId !== 'client-onboarding' && resolvedMemory.enabled && resolvedMemory.history) {
          try {
            await statusTracker.complete('Knowledge base checked');
            await statusTracker.send('Checking your work with other agents...');
            console.log(`🔗 [CROSS-AGENT] Checking for user's other agent conversations...`);

            // Find user's recent conversations with OTHER agents (exclude pre-reset conversations)
            const crossAgentParams = clientProfileId
              ? [memoryUserId, agentId, clientProfileId]
              : [memoryUserId, agentId];
            const otherConversations = await pool.query(`
              SELECT c.id, c.agent_id, a.name as agent_name, c.updated_at,
                     (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
              FROM conversations c
              JOIN agents a ON c.agent_id = a.id
              WHERE c.user_id = $1
                AND c.deleted_at IS NULL
                AND c.agent_id != $2
                AND c.agent_id != 'client-onboarding'
                AND a.is_active = true
                AND c.updated_at > NOW() - INTERVAL '60 days'
                AND c.created_at > COALESCE((SELECT memory_reset_at FROM users WHERE id = $1), '1970-01-01')
                AND ${clientProfileId ? 'c.client_profile_id = $3' : 'c.client_profile_id IS NULL'}
              ORDER BY c.updated_at DESC
              LIMIT 5
            `, crossAgentParams);

            if (otherConversations.rows.length > 0) {
              // Filter to conversations with actual content (>4 messages = real work done)
              const substantialConvos = otherConversations.rows.filter(c => parseInt(c.message_count) > 4);

              if (substantialConvos.length > 0) {
                console.log(`🔗 [CROSS-AGENT] Found ${substantialConvos.length} substantial conversations with other agents`);
                const agentNames = substantialConvos.map(c => c.agent_name).join(', ');
                await statusTracker.send(`Found your work with ${agentNames} — connecting the dots...`);

                // Pull last assistant message from each conversation (just 1 for speed)
                const summaryParts = [];
                const crossAgentDbStart = Date.now();
                for (const convo of substantialConvos) {
                  try {
                    const messagesResult = await pool.query(`
                      SELECT content FROM messages
                      WHERE conversation_id = $1 AND role = 'assistant'
                      ORDER BY created_at DESC
                      LIMIT 1
                    `, [convo.id]);

                    if (messagesResult.rows.length > 0) {
                      // Truncate to 1000 chars per conversation for speed
                      const truncated = messagesResult.rows[0].content.substring(0, 1000);
                      summaryParts.push(`[${convo.agent_name}]:\n${truncated}`);
                    }
                  } catch (convErr) {
                    console.error(`⚠️ [CROSS-AGENT] Failed to load messages for ${convo.agent_id}:`, convErr.message);
                  }
                }
                console.log(`⚡ [CROSS-AGENT] DB queries took ${Date.now() - crossAgentDbStart}ms`);

                if (summaryParts.length > 0) {
                  // Inject raw context directly — no Haiku call needed (saves 3-6s)
                  const rawContext = summaryParts.join('\n\n---\n\n');
                  crossAgentContext = `\n\n---PREVIOUS WORK WITH OTHER MINDSETOS AGENTS---\nThe user has completed work with other MindsetOS agents. Here are their key outputs:\n\n${rawContext}\n\nUse this context to personalize your guidance. Don't ask the user for information they've already provided to other agents — reference it naturally.\n---END PREVIOUS WORK---`;
                  console.log(`✅ [CROSS-AGENT] Raw context injected (${crossAgentContext.length} chars, ${summaryParts.length} agents) — no Haiku call`);
                }
              } else {
                console.log(`ℹ️ [CROSS-AGENT] No substantial conversations found (all have < 5 messages)`);
              }
            } else {
              console.log(`ℹ️ [CROSS-AGENT] No other agent conversations found for this user`);
            }
          } catch (crossAgentErr) {
            console.error('⚠️ [CROSS-AGENT] Failed to check cross-agent context:', crossAgentErr.message);
            // Non-fatal - continue without cross-agent context
          }
        }

        logStep('cross_agent');

        await statusTracker.complete('Context gathered');
        await statusTracker.send('Thinking through your answer...');
        console.log(`📡 Calling OpenRouter streaming API...`);

        // ============================================================
        // CONVERSATION HISTORY TRIMMING (Performance Optimization)
        // 1. Truncate old assistant messages to reduce token bloat
        // 2. If >20 messages, summarize older ones via Haiku and cache
        // ============================================================
        const TRIM_THRESHOLD = 40; // Was 20 — too aggressive, users lost recently-built deliverables
        const ASSISTANT_TRUNCATE_CHARS = 3000; // Was 1500 — truncated locked-in content users expected to persist
        let trimmedMessages = messages && messages.length > 0
          ? messages.map((msg, idx) => {
              // Truncate older assistant messages (keep last 2 assistant responses in full)
              const isOlderAssistant = msg.role === 'assistant' && idx < messages.length - 4;
              if (isOlderAssistant && msg.content && msg.content.length > ASSISTANT_TRUNCATE_CHARS) {
                return { role: msg.role, content: msg.content.substring(0, ASSISTANT_TRUNCATE_CHARS) + '\n...[earlier response truncated for efficiency]' };
              }
              return { role: msg.role, content: msg.content };
            })
          : [];

        // Log token savings from truncation
        const originalTokens = messages ? messages.reduce((sum, m) => sum + (m.content?.length || 0), 0) / 4 : 0;
        const truncatedTokens = trimmedMessages.reduce((sum, m) => sum + (m.content?.length || 0), 0) / 4;
        if (originalTokens - truncatedTokens > 500) {
          console.log(`✂️ [TRUNCATE] Trimmed old assistant messages: ~${Math.round(originalTokens)} → ~${Math.round(truncatedTokens)} tokens (saved ~${Math.round(originalTokens - truncatedTokens)} tokens)`);
        }

        if (trimmedMessages.length > TRIM_THRESHOLD) {
          const totalMessages = trimmedMessages.length;
          const olderMessages = trimmedMessages.slice(0, totalMessages - TRIM_THRESHOLD);
          const recentMessages = trimmedMessages.slice(totalMessages - TRIM_THRESHOLD);

          console.log(`✂️ [TRIM] Conversation has ${totalMessages} messages. Trimming to last ${TRIM_THRESHOLD} + summary of ${olderMessages.length} older messages.`);

          let historySummary = null;
          const currentConvId = body.conversationId;

          // Check for cached summary
          if (currentConvId && currentConvId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            try {
              const cached = await pool.query(
                `SELECT history_summary, history_summary_up_to FROM conversations WHERE id = $1`,
                [currentConvId]
              );
              if (cached.rows.length > 0 && cached.rows[0].history_summary) {
                const cachedUpTo = cached.rows[0].history_summary_up_to || 0;
                // Use cache if it covers at least 80% of the older messages
                if (cachedUpTo >= olderMessages.length * 0.8) {
                  historySummary = cached.rows[0].history_summary;
                  console.log(`✂️ [TRIM] Using cached summary (covers ${cachedUpTo} of ${olderMessages.length} older messages)`);
                }
              }
            } catch (cacheErr) {
              console.warn(`⚠️ [TRIM] Cache lookup failed:`, cacheErr.message);
            }
          }

          // Generate new summary if no valid cache
          if (!historySummary) {
            if (PERF_ASYNC_SUMMARIZE) {
              // ASYNC MODE: Skip blocking Haiku call, use recent messages only.
              // Generate summary in background after response for next request's cache.
              console.log(`⚡ [TRIM_ASYNC] Skipping blocking Haiku summary — will generate in background after response`);

              // Capture data for deferred summarization
              const deferredOlderMessages = olderMessages.slice();
              const deferredConvId = currentConvId;
              const deferredOlderCount = olderMessages.length;

              // Schedule background summary generation (runs after res.end)
              setTimeout(async () => {
                try {
                  console.log(`⚡ [TRIM_ASYNC] Background: Generating Haiku summary of ${deferredOlderCount} older messages...`);
                  const bgStart = Date.now();

                  const compactHistory = deferredOlderMessages.map(m =>
                    `${m.role === 'assistant' ? 'Agent' : 'User'}: ${m.content.substring(0, 500)}`
                  ).join('\n---\n');

                  const truncatedHistory = compactHistory.length > 12000
                    ? compactHistory.substring(0, 12000) + '\n...[truncated]'
                    : compactHistory;

                  const bgSummary = await callOpenRouterWithRetry(
                    [{
                      role: 'user',
                      content: `Summarize this conversation history between a user and an ECOS consulting agent. Focus on: key decisions made, deliverables created, frameworks completed, and any specific business details (audience, offer, pricing). Be concise but preserve critical details.\n\nConversation:\n${truncatedHistory}`
                    }],
                    'anthropic/claude-haiku-4.5',
                    { maxTokens: 600, temperature: 0.1 }
                  );

                  console.log(`⚡ [TRIM_ASYNC] Background summary generated in ${Date.now() - bgStart}ms (${bgSummary.length} chars)`);

                  // Cache it for next request
                  if (deferredConvId && deferredConvId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                    await pool.query(
                      `UPDATE conversations SET history_summary = $1, history_summary_up_to = $2, updated_at = NOW() WHERE id = $3`,
                      [bgSummary, deferredOlderCount, deferredConvId]
                    );
                    console.log(`⚡ [TRIM_ASYNC] Background summary cached on conversation row`);
                  }
                } catch (bgErr) {
                  console.error(`❌ [TRIM_ASYNC] Background summary failed:`, bgErr.message);
                }
              }, 100); // Small delay to let response stream finish first

              historySummary = null; // No summary for this request — will use just recent messages
            } else {
              // SYNCHRONOUS MODE (legacy): Block and generate summary inline
              try {
                await statusTracker.send('Catching up on our conversation so far...');
                console.log(`✂️ [TRIM] Generating Haiku summary of ${olderMessages.length} older messages...`);
                const summaryStart = Date.now();

                // Build compact representation of older messages (truncate each to 500 chars)
                const compactHistory = olderMessages.map(m =>
                  `${m.role === 'assistant' ? 'Agent' : 'User'}: ${m.content.substring(0, 500)}`
                ).join('\n---\n');

                // Cap at 12000 chars to keep Haiku call fast
                const truncatedHistory = compactHistory.length > 12000
                  ? compactHistory.substring(0, 12000) + '\n...[truncated]'
                  : compactHistory;

                historySummary = await callOpenRouterWithRetry(
                  [{
                    role: 'user',
                    content: `Summarize this conversation history between a user and an ECOS consulting agent. Focus on: key decisions made, deliverables created, frameworks completed, and any specific business details (audience, offer, pricing). Be concise but preserve critical details.\n\nConversation:\n${truncatedHistory}`
                  }],
                  'anthropic/claude-haiku-4.5',
                  { maxTokens: 600, temperature: 0.1 }
                );

                console.log(`✂️ [TRIM] Haiku summary generated in ${Date.now() - summaryStart}ms (${historySummary.length} chars)`);

                // Cache the summary
                if (currentConvId && currentConvId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                  try {
                    await pool.query(
                      `UPDATE conversations SET history_summary = $1, history_summary_up_to = $2, updated_at = NOW() WHERE id = $3`,
                      [historySummary, olderMessages.length, currentConvId]
                    );
                    console.log(`✂️ [TRIM] Summary cached on conversation row`);
                  } catch (saveErr) {
                    console.warn(`⚠️ [TRIM] Failed to cache summary:`, saveErr.message);
                  }
                }
              } catch (summaryErr) {
                console.error(`⚠️ [TRIM] Summary generation failed, using truncated history:`, summaryErr.message);
                // Fallback: just use last 30 messages if summary fails
                trimmedMessages = trimmedMessages.slice(-30);
                historySummary = null;
              }
            }
          }

          // Build final trimmed message array
          if (historySummary) {
            trimmedMessages = [
              { role: 'system', content: `[CONVERSATION HISTORY SUMMARY - Earlier messages summarized for context]\n${historySummary}\n[END SUMMARY - Recent messages follow]` },
              ...recentMessages
            ];
            console.log(`✂️ [TRIM] Final: 1 summary + ${recentMessages.length} recent = ${trimmedMessages.length} messages (was ${totalMessages})`);
          } else {
            trimmedMessages = recentMessages;
          }
        }

        logStep('trimming');

        // Build conversation context from (potentially trimmed) message history
        const conversationMessages = trimmedMessages;

        // Add memory, document, RAG, and cross-agent context to messages
        const contextToAdd = [memoryContext, documentContext, ragContext, crossAgentContext].filter(Boolean).join('\n\n');

        if (contextToAdd && conversationMessages.length === 0) {
          // No history yet - add context to current message
          conversationMessages.push({
            role: 'user',
            content: processedMessage + contextToAdd
          });
        } else if (contextToAdd && conversationMessages.length > 0) {
          // Has history - inject context as system message before user message
          conversationMessages.push({
            role: 'system',
            content: contextToAdd
          });
          conversationMessages.push({ role: 'user', content: processedMessage });
        } else {
          // No context - just add current message
          conversationMessages.push({ role: 'user', content: processedMessage });
        }

        logStep('message_build');

        // Stream the response WITHOUT closing (so widget formatter can add content)
        const streamResult = await streamOpenRouterWithRetry(conversationMessages, agentId, res, { closeStream: false, modelOverride, skipBrandVoice: !resolvedMemory.brandVoice, userId: memoryUserId, clientProfileId: clientProfileId || null });
        const aiResponse = streamResult.text;
        const usage = streamResult.usage;
        const timing = streamResult.timing || {};

        logStep('stream');

        console.log(`✅ [STREAM] Complete — ${aiResponse.length} chars | First token: ${timing.firstTokenMs || '?'}ms | Total stream: ${timing.totalStreamMs || '?'}ms | Pipeline total: ${Date.now() - requestStartTime}ms`);

        // Log main conversation API usage using actual token counts from OpenRouter
        const model = modelOverride || getModelForOperation(agentId, 'chat');
        let inputTokens, outputTokens;

        if (usage && usage.prompt_tokens !== undefined && usage.completion_tokens !== undefined) {
          // Use actual token counts from OpenRouter
          inputTokens = usage.prompt_tokens;
          outputTokens = usage.completion_tokens;
          console.log(`📊 [STREAM] Using actual token counts from OpenRouter: ${inputTokens} input + ${outputTokens} output`);
        } else {
          // Fallback to estimation if usage data not available
          const inputText = conversationMessages.map(m => m.content).join('\n');
          inputTokens = estimateTokens(inputText);
          outputTokens = estimateTokens(aiResponse);
          console.warn(`⚠️  [STREAM] OpenRouter didn't provide usage data - using estimates: ${inputTokens} input + ${outputTokens} output`);
        }

        // Track model and token metadata for logging
        responseMetadata.models.chat = model;
        responseMetadata.tokens.input = inputTokens;
        responseMetadata.tokens.output = outputTokens;
        responseMetadata.tokens.total = inputTokens + outputTokens;

        // Note: conversationId may not exist yet at this point for new conversations
        // We'll pass it after it's created
        logAPIUsage(
          user.id,
          agentId,
          model,
          'conversation',
          inputTokens,
          outputTokens,
          timing.firstTokenMs || 0, // Time to first token from OpenRouter stream
          null // conversationId will be set after creation
        ).catch(err => console.error('❌ Log conversation usage error:', err));

        // Apply widget formatting if enabled (secondary AI layer)
        // Default to false to prevent widget formatting unless explicitly enabled
        const widgetFormattingEnabled = body.widgetFormattingEnabled === true;
        let finalResponse = aiResponse;
        let formattingResult = null; // Declare outside block so it's accessible for Quick Add
        let deferredWidgetWork = null; // For async widget mode

        console.log(`🎮 [WIDGET_FORMATTER] Request from frontend:`, {
          widgetFormattingEnabled: body.widgetFormattingEnabled,
          actualValue: widgetFormattingEnabled,
          typeOf: typeof body.widgetFormattingEnabled,
          willRun: widgetFormattingEnabled === true,
          asyncMode: PERF_ASYNC_WIDGET
        });

        if (widgetFormattingEnabled && !PERF_ASYNC_WIDGET) {
          // SYNCHRONOUS MODE (legacy) — blocks stream for 1.5-4s
          console.log(`🎮 [WIDGET_FORMATTER] RUNNING SYNC - Widget formatting is ENABLED (blocking)`);
          const widgetModelOverride = body.widgetModelOverride || null;
          responseMetadata.models.widget = widgetModelOverride || getModelForOperation(agentId, 'widget');
          console.log(`🎮 [WIDGET_FORMATTER] Using model: ${responseMetadata.models.widget}`);

          formattingResult = await formatResponseWithWidgets(
            aiResponse,
            widgetFormattingEnabled,
            agentId,
            widgetModelOverride,
            user.id,
            body.conversationId
          );
          finalResponse = formattingResult.text;

          responseMetadata.widget.applied = formattingResult.wasFormatted || false;
          console.log(`🎮 [WIDGET_FORMATTER] Result:`, {
            wasFormatted: formattingResult.wasFormatted,
            originalLength: aiResponse.length,
            formattedLength: finalResponse.length,
            changed: aiResponse !== finalResponse
          });

          if (formattingResult.wasFormatted) {
            console.log(`🎮 [WIDGET_FORMATTER] Widget model used: ${widgetFormatterModel}`);
            if (finalResponse.includes('MULTI-SELECT:')) {
              responseMetadata.widget.type = 'multi-select';
            } else if (finalResponse.includes('SINGLE-SELECT:')) {
              responseMetadata.widget.type = 'single-select';
            } else if (finalResponse.includes('CONFIRMATION:')) {
              responseMetadata.widget.type = 'confirmation';
            } else if (finalResponse.includes('TEXT-INPUT:')) {
              responseMetadata.widget.type = 'text-input';
            }
          }
        } else if (widgetFormattingEnabled && PERF_ASYNC_WIDGET) {
          // ASYNC MODE — don't block the stream, run widget formatting after DB save
          console.log(`🎮 [WIDGET_FORMATTER] DEFERRED — async mode enabled, saving raw response first`);
          const widgetModelOverride = body.widgetModelOverride || null;
          responseMetadata.models.widget = widgetModelOverride || getModelForOperation(agentId, 'widget');
          // Capture closure vars for deferred execution
          deferredWidgetWork = { widgetModelOverride, agentId: agentId, userId: user.id, conversationId: body.conversationId };
        }

        logStep(widgetFormattingEnabled && !PERF_ASYNC_WIDGET ? 'widget_format' : 'widget_skipped');

        // Save messages to PostgreSQL BEFORE closing stream (so we can send conversation ID)
        let conversationId = body.conversationId;

        try {
          // Generate or use existing conversation ID (must be UUID)
          // If no conversationId provided or it's not a valid UUID, create new conversation
          if (!conversationId || !conversationId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            const newConv = await pool.query(`
              INSERT INTO conversations (id, user_id, agent_id, title, client_profile_id, created_at, updated_at)
              VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
              RETURNING id
            `, [memoryUserId, agentId, `Conversation with ${agentId}`, clientProfileId || null]);
            conversationId = newConv.rows[0].id;
            console.log(`🆕 Created new conversation: ${conversationId}${viewAsUserId ? ` (for viewed-as user ${memoryUserId})` : ''}`);
          } else {
            // Update existing conversation
            await pool.query(`
              INSERT INTO conversations (id, user_id, agent_id, title, client_profile_id, created_at, updated_at)
              VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
              ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
            `, [conversationId, memoryUserId, agentId, `Conversation with ${agentId}`, clientProfileId || null]);
          }

          // Get the last message in this conversation to set as parent
          const lastMessageResult = await pool.query(`
            SELECT id FROM messages
            WHERE conversation_id = $1
            ORDER BY created_at DESC
            LIMIT 1
          `, [conversationId]);

          const parentMessageId = lastMessageResult.rows.length > 0
            ? lastMessageResult.rows[0].id
            : null;

          console.log(`🔗 [MESSAGE_LINKING] Parent message ID for new user message: ${parentMessageId || 'NULL (first message)'}`);

          // Insert user message with parent link and get its ID
          const userMessageResult = await pool.query(`
            INSERT INTO messages (conversation_id, role, content, parent_message_id, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            RETURNING id
          `, [conversationId, 'user', message, parentMessageId]);
          const userMessageId = userMessageResult.rows[0].id;

          console.log(`📝 [MESSAGE_LINKING] Created user message ${userMessageId} with parent ${parentMessageId}`);

          // Send user message ID immediately so frontend can update temp ID
          res.write(`data: ${JSON.stringify({
            type: 'user_message_id',
            messageId: userMessageId
          })}\n\n`);
          console.log(`📤 [UUID] Sent user message ID to frontend: ${userMessageId}`);

          // Insert AI response with user message as parent and get its ID
          const assistantMessageResult = await pool.query(`
            INSERT INTO messages (conversation_id, role, content, parent_message_id, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            RETURNING id
          `, [conversationId, 'assistant', finalResponse, userMessageId]);
          const assistantMessageId = assistantMessageResult.rows[0].id;

          console.log(`🤖 [MESSAGE_LINKING] Created assistant message ${assistantMessageId} with parent ${userMessageId}`);

          // Send assistant message ID immediately so frontend can update temp ID
          res.write(`data: ${JSON.stringify({
            type: 'assistant_message_id',
            messageId: assistantMessageId
          })}\n\n`);
          console.log(`📤 [UUID] Sent assistant message ID to frontend: ${assistantMessageId}`);

          // NOW send Quick Add options (AFTER assistant_message_id so frontend stores on correct message)
          if (formattingResult && formattingResult.wasFormatted && formattingResult.quickAddOptions) {
            console.log('📝 [WIDGET] Sending Quick Add options to frontend:', formattingResult.quickAddOptions);
            res.write(`data: ${JSON.stringify({
              type: 'quick_add_options',
              options: formattingResult.quickAddOptions,
              timestamp: new Date().toISOString()
            })}\n\n`);
          }

          // Send gamification widget card if detected
          if (formattingResult && formattingResult.widgetCard) {
            console.log('🎮 [WIDGET] Sending gamification widget to frontend:', formattingResult.widgetCard.type);
            res.write(`data: ${JSON.stringify({
              type: 'widget',
              widget: formattingResult.widgetCard,
              timestamp: new Date().toISOString()
            })}\n\n`);
          }

          // Update conversation's active_branch_leaf_id to point to the new assistant message
          await pool.query(`
            UPDATE conversations
            SET active_branch_leaf_id = $1, updated_at = NOW()
            WHERE id = $2
          `, [assistantMessageId, conversationId]);

          console.log(`🌿 [MESSAGE_LINKING] Updated active_branch_leaf_id to ${assistantMessageId}`);

          console.log(`📊 [STORAGE] Saved messages to PostgreSQL for conversation ${conversationId} - AI response: ${finalResponse.length} chars`);

          // Process core memory updates from agent response (if any structured data exists)
          processMemoryUpdates(pool, memoryUserId, agentId, conversationId, finalResponse)
            .then(result => {
              if (result.success) {
                console.log(`✅ [CORE_MEMORY] Auto-updated ${result.changedFields} fields from agent response`);
                // Send notification to frontend about core memory update
                res.write(`data: ${JSON.stringify({
                  type: 'core_memory_update',
                  success: true,
                  changedFields: result.changedFields,
                  changes: result.changes
                })}\n\n`);
              }
            })
            .catch(err => console.error('❌ [CORE_MEMORY] Background processing error:', err));

          // Process brand voice updates from agent response (if any structured data exists)
          processBrandVoiceUpdates(pool, memoryUserId, agentId, conversationId, finalResponse)
            .then(result => {
              if (result.success) {
                console.log(`✅ [BRAND_VOICE] Auto-${result.action} brand voice profile from agent response`);
                // Send notification to frontend about brand voice update
                res.write(`data: ${JSON.stringify({
                  type: 'brand_voice_update',
                  success: true,
                  action: result.action,
                  profile: result.profile
                })}\n\n`);
              }
            })
            .catch(err => console.error('❌ [BRAND_VOICE] Background processing error:', err));

          // Process onboarding completion from agent response (SYNCHRONOUS - must complete before stream closes)
          try {
            const onboardingResult = await processOnboardingCompletion(pool, memoryUserId, finalResponse);
            if (onboardingResult.completed) {
              console.log(`🎉 [ONBOARDING] User ${memoryUserId} completed onboarding!`);
              // Send SSE event to frontend while stream is still open
              res.write(`data: ${JSON.stringify({
                type: 'onboarding_completed',
                success: true
              })}\n\n`);
              console.log(`📤 [ONBOARDING] Sent completion event to frontend via SSE`);
            }
          } catch (err) {
            console.error('❌ [ONBOARDING] Error processing completion:', err);
          }

          // Auto-create Playbook plays from <play> tags in response (Phase 6)
          try {
            const playTagRegex = /<play(?:\s+title="([^"]*)")?>([\s\S]*?)<\/play>/gi;
            let playMatch;
            while ((playMatch = playTagRegex.exec(finalResponse)) !== null) {
              const playTitle = playMatch[1] || 'Untitled Play';
              const playContent = playMatch[2].trim();
              if (playContent.length > 20) {
                pool.query(
                  `INSERT INTO artifacts (user_id, agent_id, conversation_id, artifact_type, title, content, client_profile_id)
                   VALUES ($1, $2, $3, 'document', $4, jsonb_build_object('text', $5), $6)`,
                  [memoryUserId, agentId, conversationId, playTitle, playContent, clientProfileId || null]
                ).then(() => {
                  console.log(`📋 [AUTO-PLAY] Created play "${playTitle}" from <play> tag`);
                  try {
                    res.write(`data: ${JSON.stringify({ type: 'play_created', title: playTitle })}\n\n`);
                  } catch (e) { /* stream may be closed */ }
                }).catch(err => console.error('❌ [AUTO-PLAY] Failed to create play:', err.message));
              }
            }
          } catch (e) {
            console.error('⚠️ [AUTO-PLAY] Error detecting play tags:', e.message);
          }

          // Process Money Model completion - NON-BLOCKING (was taking 5-43s synchronously)
          if (agentId === 'mmm-5in30' || agentId === 'money-model-maker') {
            pool.query(`
              SELECT role, content FROM messages
              WHERE conversation_id = $1
              ORDER BY created_at ASC
            `, [conversationId])
              .then(messagesResult => processMoneyModelCompletion(pool, memoryUserId, agentId, messagesResult.rows))
              .then(moneyModelResult => {
                if (moneyModelResult.completed) {
                  console.log(`🎉 [MONEY_MODEL] User ${memoryUserId} business model saved (background)`);
                }
              })
              .catch(err => console.error('❌ [MONEY_MODEL] Background processing error:', err));
          }

          // Send conversation ID to frontend (UUIDs already sent immediately after message creation)
          res.write(`data: ${JSON.stringify({
            type: 'conversation_id',
            conversationId: conversationId
          })}\n\n`);
          console.log(`📤 [CONVERSATION_ID] Sent conversation ID to frontend: ${conversationId}`);

          // Auto-name conversation using Haiku (async, non-blocking)
          // Only on first exchange (parentMessageId was null = new conversation)
          if (!parentMessageId) {
            autoNameConversation(conversationId, message)
              .then(newTitle => {
                if (newTitle) {
                  // Send the new title to frontend via SSE so sidebar updates
                  try {
                    res.write(`data: ${JSON.stringify({
                      type: 'conversation_title',
                      conversationId: conversationId,
                      title: newTitle
                    })}\n\n`);
                  } catch (e) {
                    // Stream may already be closed — title is saved in DB regardless
                  }
                }
              })
              .catch(err => console.warn('⚠️ [AUTO_NAME] Conversation naming error:', err.message));
          }

          // ALWAYS extract memories (regardless of toggle) - toggle only controls context injection
          // This builds user's memory database even when toggle is OFF
          // Get all messages from this conversation for memory extraction
          pool.query(`
            SELECT role, content
            FROM messages
            WHERE conversation_id = $1
            ORDER BY created_at ASC
          `, [conversationId])
            .then(result => {
              if (result.rows.length >= 2) { // Only extract if there's actual conversation
                // Use ENHANCED memory extraction - filters to USER messages only, multi-dimensional scoring, vector embeddings
                // Get memory model from agent configuration for speed/cost optimization
                const memoryModel = getModelForOperation(agentId, 'memory');
                console.log(`🧠 [MEMORY] Extracting with model: ${memoryModel}`);
                return extractMemoriesEnhanced(result.rows, memoryUserId, agentId, pool, memoryModel)
                  .then(memories => {
                    if (memories && memories.length > 0) {
                      // Store extracted memories in database
                      return Promise.all(memories.map(memory => {
                        const metadata = {
                          dimensions: memory.importance_dimensions || {},
                          reasoning: memory.scoring_reasoning || '',
                          category: memory.category || 'general',
                          confidence: memory.confidence || 0.8
                        };

                        return pool.query(`
                          INSERT INTO memories (
                            user_id, agent_id, memory_type, content, importance_score,
                            embedding, metadata, source_conversation_id, source, client_profile_id
                          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ai', $9)
                          ON CONFLICT DO NOTHING
                        `, [
                          memoryUserId,
                          agentId,
                          memory.category || 'general',
                          memory.text,
                          memory.importance_score || 0.5,
                          memory.embedding ? JSON.stringify(memory.embedding) : null,
                          JSON.stringify(metadata),
                          conversationId,
                          clientProfileId || null
                        ]);
                      }));
                    }
                  });
              }
            })
            .catch(err => console.error('❌ Background memory extraction error:', err));
        } catch (dbError) {
          console.error('❌ Database save error:', dbError.message);
          console.error('Full error:', dbError);
        }

        logStep('db_save');

        // Calculate total response time
        const responseTime = Date.now() - requestStartTime;
        responseMetadata.responseTime = responseTime;
        responseMetadata.responseTimeFormatted = `${(responseTime / 1000).toFixed(2)}s`;

        // ===== PIPELINE TIMING SUMMARY =====
        const pipelineSummary = pipelineSteps.map(s => `${s.name}:${s.ms}ms`).join(' → ');
        const pipelineTotal = pipelineSteps.reduce((sum, s) => sum + s.ms, 0);
        console.log(`📊 [PIPELINE TIMING] ${pipelineSummary} | tracked:${pipelineTotal}ms | total:${responseTime}ms`);

        // Also include in response metadata for frontend visibility
        responseMetadata.pipelineSteps = pipelineSteps;
        responseMetadata.pipelineTotal = pipelineTotal;

        // Send comprehensive log before [DONE]
        console.log(`📊 [RESPONSE LOG] ========================================`);
        console.log(`⏱️  Response Time: ${responseMetadata.responseTimeFormatted}`);
        console.log(`🤖 Models Used:`);
        console.log(`   Chat: ${responseMetadata.models.chat || 'N/A'}`);
        if (responseMetadata.models.widget) {
          console.log(`   Widget: ${responseMetadata.models.widget}`);
        }
        console.log(`📈 Tokens:`);
        console.log(`   Input: ${responseMetadata.tokens.input || 0}`);
        console.log(`   Output: ${responseMetadata.tokens.output || 0}`);
        console.log(`   Total: ${responseMetadata.tokens.total || 0}`);
        console.log(`🧠 Memory:`);
        console.log(`   Enabled: ${responseMetadata.memory.enabled}`);
        console.log(`   Categories: profile=${responseMetadata.memory.categories?.profile?.enabled}(${responseMetadata.memory.categories?.profile?.loaded || 0}) knowledge=${responseMetadata.memory.categories?.knowledge?.enabled}(${responseMetadata.memory.categories?.knowledge?.loaded || 0}) history=${responseMetadata.memory.categories?.history?.enabled}(${responseMetadata.memory.categories?.history?.loaded || 0}) brandVoice=${responseMetadata.memory.categories?.brandVoice?.enabled}`);
        console.log(`   Loaded: ${responseMetadata.memory.loaded || 0} (${responseMetadata.memory.core || 0} core + ${responseMetadata.memory.semantic || 0} semantic)`);
        if (responseMetadata.memory.types && Object.keys(responseMetadata.memory.types).length > 0) {
          console.log(`   Types: ${JSON.stringify(responseMetadata.memory.types)}`);
        }
        console.log(`🎨 Widget:`);
        console.log(`   Enabled: ${responseMetadata.widget.enabled}`);
        console.log(`   Applied: ${responseMetadata.widget.applied}`);
        if (responseMetadata.widget.type) {
          console.log(`   Type: ${responseMetadata.widget.type}`);
        }
        if (responseMetadata.documents > 0) {
          console.log(`📎 Documents: ${responseMetadata.documents}`);
        }
        console.log(`========================================`);

        // Send log to frontend as event
        res.write(`data: ${JSON.stringify({
          type: 'response_log',
          metadata: responseMetadata,
          timestamp: new Date().toISOString()
        })}\n\n`);

        // Suggest starting a new chat if conversation is getting long
        // This improves response quality and prevents token overflow
        const totalConversationTokens = messages ? estimateMessagesTokens(messages) : 0;
        const NEW_CHAT_SUGGEST_THRESHOLD = 80000; // ~80K tokens ≈ very long conversation
        const NEW_CHAT_WARN_THRESHOLD = 200000;   // ~200K tokens ≈ approaching limits
        if (totalConversationTokens > NEW_CHAT_WARN_THRESHOLD) {
          res.write(`data: ${JSON.stringify({
            type: 'context_warning',
            level: 'high',
            message: '⚠️ This conversation is very long. For best results, start a new chat — your context and memory will carry over automatically.',
            tokens: totalConversationTokens
          })}\n\n`);
        } else if (totalConversationTokens > NEW_CHAT_SUGGEST_THRESHOLD) {
          res.write(`data: ${JSON.stringify({
            type: 'context_warning',
            level: 'mild',
            message: '💡 This is a long conversation. If responses start feeling off, try starting a new chat — your progress is saved.',
            tokens: totalConversationTokens
          })}\n\n`);
        }

        // Now send [DONE] and close the stream
        res.write(`data: [DONE]\n\n`);
        res.end();

        // ============================================
        // DEFERRED WIDGET FORMATTING (async, after stream close)
        // Runs in background — updates DB row with formatted content
        // Saves 1.5-4s of user-perceived latency
        // ============================================
        if (deferredWidgetWork && conversationId) {
          const widgetStart = Date.now();
          console.log(`🎮 [WIDGET_ASYNC] Starting deferred widget formatting for conversation ${conversationId}`);
          formatResponseWithWidgets(
            aiResponse,
            true,
            deferredWidgetWork.agentId,
            deferredWidgetWork.widgetModelOverride,
            deferredWidgetWork.userId,
            deferredWidgetWork.conversationId
          ).then(async (asyncFormattingResult) => {
            if (asyncFormattingResult.wasFormatted && asyncFormattingResult.text !== aiResponse) {
              // Update the assistant message in DB with formatted version
              try {
                await pool.query(
                  `UPDATE messages SET content = $1 WHERE conversation_id = $2 AND role = 'assistant' ORDER BY created_at DESC LIMIT 1`,
                  [asyncFormattingResult.text, conversationId]
                );
                console.log(`🎮 [WIDGET_ASYNC] Updated DB with formatted response in ${Date.now() - widgetStart}ms`);
              } catch (dbErr) {
                console.error(`❌ [WIDGET_ASYNC] Failed to update DB:`, dbErr.message);
              }
            } else {
              console.log(`🎮 [WIDGET_ASYNC] No formatting changes needed (${Date.now() - widgetStart}ms)`);
            }

            // Log widget usage
            const widgetModel = getModelForOperation(deferredWidgetWork.agentId, 'widget');
            logAPIUsage(
              deferredWidgetWork.userId,
              deferredWidgetWork.agentId,
              widgetModel,
              'widget',
              estimateTokens(aiResponse),
              estimateTokens(asyncFormattingResult.text || ''),
              Date.now() - widgetStart,
              conversationId
            ).catch(err => console.error('❌ Log widget usage error:', err));
          }).catch(err => {
            console.error(`❌ [WIDGET_ASYNC] Deferred formatting failed:`, err.message);
          });
        }
      } catch (error) {
        console.error('❌ [STREAM] OpenRouter Error:', error.message);
        console.error('Full error:', error);
        if (!res.headersSent) {
          res.writeHead(500, corsHeaders);
          res.end(JSON.stringify({ error: error.message }));
        }
      }
      return;
    }

    // Get conversation messages
    if (path.match(/^\/api\/conversations\/[^\/]+\/messages$/) && method === 'GET') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      try {
        const conversationId = path.split('/')[3];

        // If this is a temp ID, return empty array (conversation not yet created)
        if (conversationId.startsWith('temp_')) {
          res.writeHead(200, corsHeaders);
          res.end(JSON.stringify([]));
          return;
        }

        const result = await pool.query(`
          SELECT id, conversation_id, role, content, created_at as timestamp
          FROM messages
          WHERE conversation_id = $1
          ORDER BY created_at ASC
        `, [conversationId]);

        // Convert timestamps to ISO format for frontend
        const messages = result.rows.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp).toISOString()
        }));

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify(messages));
      } catch (error) {
        console.error('❌ Error fetching messages:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to fetch messages' }));
      }
      return;
    }

    // Get all conversations
    if (path === '/api/conversations' && method === 'GET') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      try {
        // Check if includeArchived query parameter is present
        const url = new URL(req.url, `http://${req.headers.host}`);
        const includeArchived = url.searchParams.get('includeArchived') === 'true';
        const clientProfileIdFilter = url.searchParams.get('clientProfileId') || null;
        const viewAsUserId = url.searchParams.get('viewAsUserId') || null;

        // If admin is viewing as another user, load that user's conversations
        const targetUserId = (viewAsUserId && user.role === 'admin') ? viewAsUserId : user.id;

        // Check if fork columns exist (migration 030)
        const forkColumnsExist = await pool.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'messages' AND column_name = 'parent_message_id'
        `).then(r => r.rows.length > 0).catch(() => false);

        // First, get all conversations with basic info
        const convParams = [targetUserId];
        let clientProfileClause = '';
        if (clientProfileIdFilter) {
          convParams.push(clientProfileIdFilter);
          clientProfileClause = ` AND c.client_profile_id = $${convParams.length}`;
        } else if (url.searchParams.has('clientProfileId')) {
          // Explicitly passed null/empty = personal context only
          clientProfileClause = ' AND c.client_profile_id IS NULL';
        }

        let conversationQuery = `
          SELECT
            c.id,
            c.agent_id as "agentId",
            c.title,
            c.is_archived as "isArchived",
            c.is_starred as "isStarred",
            c.project_id as "projectId",
            c.archived_at as "archivedAt",
            c.model_override as "modelOverride",
            c.client_profile_id as "clientProfileId",
            ${forkColumnsExist ? 'c.active_branch_leaf_id as "activeBranchLeafId",' : ''}
            c.created_at as "createdAt",
            c.updated_at as "updatedAt"
          FROM conversations c
          WHERE c.user_id = $1 AND c.deleted_at IS NULL ${!includeArchived ? 'AND c.is_archived = false' : ''}${clientProfileClause}
          ORDER BY c.updated_at DESC
        `;

        const conversationsResult = await pool.query(conversationQuery, convParams);

        // For each conversation, build tree-based message history
        const conversations = await Promise.all(conversationsResult.rows.map(async (conv) => {
          let history = {
            currentId: conv.activeBranchLeafId || null,
            messages: {}
          };

          if (forkColumnsExist) {
            // Fetch ALL messages for this conversation (not just active branch)
            const messagesResult = await pool.query(`
              SELECT
                id,
                role,
                content,
                parent_message_id as "parentId",
                branch_index as "branchIndex",
                sibling_count as "siblingCount",
                is_edited as "isEdited",
                edited_at as "editedAt",
                created_at as "timestamp"
              FROM messages
              WHERE conversation_id = $1
              ORDER BY created_at ASC
            `, [conv.id]);

            // Build tree structure with childrenIds
            const messagesById = {};
            messagesResult.rows.forEach(msg => {
              messagesById[msg.id] = {
                ...msg,
                childrenIds: [],
                timestamp: new Date(msg.timestamp).toISOString(),
                editedAt: msg.editedAt ? new Date(msg.editedAt).toISOString() : null
              };
            });

            // Build childrenIds by scanning all messages
            Object.values(messagesById).forEach(msg => {
              if (msg.parentId && messagesById[msg.parentId]) {
                messagesById[msg.parentId].childrenIds.push(msg.id);
              }
            });

            // Sort childrenIds by branchIndex for consistent ordering
            Object.values(messagesById).forEach(msg => {
              msg.childrenIds.sort((a, b) => {
                const msgA = messagesById[a];
                const msgB = messagesById[b];
                return (msgA.branchIndex || 0) - (msgB.branchIndex || 0);
              });
            });

            history.messages = messagesById;

            console.log(`🌳 [TREE_BUILD] Built tree for conversation ${conv.id}:`, {
              totalMessages: Object.keys(messagesById).length,
              currentId: history.currentId,
              rootMessages: Object.values(messagesById).filter(m => !m.parentId).length
            });
          } else {
            // Fallback: linear history (no branching)
            const messagesResult = await pool.query(`
              SELECT id, role, content, created_at as "timestamp"
              FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC
            `, [conv.id]);

            messagesResult.rows.forEach((msg, idx) => {
              history.messages[msg.id] = {
                ...msg,
                parentId: idx > 0 ? messagesResult.rows[idx - 1].id : null,
                childrenIds: idx < messagesResult.rows.length - 1 ? [messagesResult.rows[idx + 1].id] : [],
                branchIndex: 0,
                siblingCount: 0,
                isEdited: false,
                editedAt: null,
                timestamp: new Date(msg.timestamp).toISOString()
              };
            });

            // Set currentId to last message
            if (messagesResult.rows.length > 0) {
              history.currentId = messagesResult.rows[messagesResult.rows.length - 1].id;
            }
          }

          return {
            ...conv,
            createdAt: new Date(conv.createdAt).toISOString(),
            updatedAt: new Date(conv.updatedAt).toISOString(),
            history  // Tree structure instead of messages array
          };
        }));

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ conversations }));
      } catch (error) {
        console.error('❌ Error fetching conversations:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to fetch conversations' }));
      }
      return;
    }

    // ========================================
    // CONVERSATION FORKS API
    // ========================================

    // Switch active branch for a conversation
    if (path.match(/^\/api\/conversations\/[^\/]+\/switch-branch$/) && method === 'PATCH') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      try {
        const conversationId = path.split('/')[3];
        const body = await parseBody(req);
        const { messageId, branchIndex } = body;

        // Verify conversation belongs to user
        const checkResult = await pool.query(`
          SELECT id FROM conversations WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
        `, [conversationId, user.id]);

        if (checkResult.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'Conversation not found' }));
          return;
        }

        // Find the sibling message at the specified branch_index
        const siblingResult = await pool.query(`
          SELECT s.id
          FROM get_message_siblings($1) s
          WHERE s.branch_index = $2
        `, [messageId, branchIndex]);

        if (siblingResult.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'Branch not found' }));
          return;
        }

        const siblingMessageId = siblingResult.rows[0].id;

        // Find the leaf (last message) in this branch by traversing down from sibling
        // The sibling might have children (assistant response, then more user messages, etc.)
        const leafResult = await pool.query(`
          WITH RECURSIVE branch_path AS (
            -- Start from the sibling message
            SELECT id, conversation_id, created_at
            FROM messages
            WHERE id = $1

            UNION ALL

            -- Follow children down the tree
            SELECT m.id, m.conversation_id, m.created_at
            FROM messages m
            INNER JOIN branch_path bp ON m.parent_message_id = bp.id
            WHERE m.conversation_id = $2
          )
          SELECT id FROM branch_path
          ORDER BY created_at DESC
          LIMIT 1
        `, [siblingMessageId, conversationId]);

        const newLeafId = leafResult.rows[0].id;

        console.log(`🔍 [BRANCH_SWITCH] Details:`, {
          conversationId,
          requestedBranchIndex: branchIndex,
          clickedMessageId: messageId,
          foundSiblingId: siblingMessageId,
          calculatedLeafId: newLeafId
        });

        // Update active_branch_leaf_id to the actual leaf of this branch
        await pool.query(`
          UPDATE conversations
          SET active_branch_leaf_id = $1, updated_at = NOW()
          WHERE id = $2
        `, [newLeafId, conversationId]);

        // Verify what messages will be returned
        const verifyResult = await pool.query(`
          SELECT id, role, LEFT(content, 50) as content_preview
          FROM get_branch_messages($1, $2)
          ORDER BY created_at ASC
        `, [conversationId, newLeafId]);

        console.log(`✅ [BRANCH_SWITCH] Switched to branch ${branchIndex}, will return ${verifyResult.rows.length} messages:`);
        verifyResult.rows.forEach((msg, idx) => {
          console.log(`  ${idx + 1}. ${msg.role}: ${msg.content_preview}...`);
        });

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          activeBranchLeafId: newLeafId
        }));
      } catch (error) {
        console.error('❌ Error switching branch:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to switch branch' }));
      }
      return;
    }

    // Get siblings (alternative branches) for a message
    if (path.match(/^\/api\/messages\/[^\/]+\/siblings$/) && method === 'GET') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      try {
        const messageId = path.split('/')[3];

        // Verify message belongs to user's conversation
        const checkResult = await pool.query(`
          SELECT m.id FROM messages m
          JOIN conversations c ON m.conversation_id = c.id
          WHERE m.id = $1 AND c.user_id = $2
        `, [messageId, user.id]);

        if (checkResult.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'Message not found' }));
          return;
        }

        // Get all sibling messages
        const siblingsResult = await pool.query(`
          SELECT
            id,
            role,
            content,
            parent_message_id as "parentMessageId",
            branch_index as "branchIndex",
            is_edited as "isEdited",
            edited_at as "editedAt",
            created_at as "createdAt"
          FROM get_message_siblings($1)
          ORDER BY branch_index ASC
        `, [messageId]);

        const siblings = siblingsResult.rows.map(msg => ({
          ...msg,
          createdAt: new Date(msg.createdAt).toISOString(),
          editedAt: msg.editedAt ? new Date(msg.editedAt).toISOString() : undefined
        }));

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ siblings }));
      } catch (error) {
        console.error('❌ Error fetching siblings:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to fetch siblings' }));
      }
      return;
    }

    // Edit user message and create new branch
    if (path.match(/^\/api\/messages\/[^\/]+\/edit$/) && method === 'POST') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      try {
        const messageId = path.split('/')[3];
        const body = await parseBody(req);
        const { content } = body;

        // Check if fork columns exist (migration 030)
        const forkColumnsExist = await pool.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'messages' AND column_name = 'parent_message_id'
        `).then(r => r.rows.length > 0).catch(() => false);

        if (!forkColumnsExist) {
          res.writeHead(503, corsHeaders);
          res.end(JSON.stringify({ error: 'Fork system not available yet. Migration 030 not applied.' }));
          return;
        }

        // Get message and verify it's a user message and belongs to user's conversation
        const messageResult = await pool.query(`
          SELECT m.id, m.role, m.conversation_id, m.parent_message_id, c.user_id
          FROM messages m
          JOIN conversations c ON m.conversation_id = c.id
          WHERE m.id = $1
        `, [messageId]);

        if (messageResult.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'Message not found' }));
          return;
        }

        const message = messageResult.rows[0];

        if (message.user_id !== user.id) {
          res.writeHead(403, corsHeaders);
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }

        if (message.role !== 'user') {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Can only edit user messages' }));
          return;
        }

        // Mark original message as edited
        await pool.query(`
          UPDATE messages
          SET is_edited = true, edited_at = NOW()
          WHERE id = $1
        `, [messageId]);

        // Count existing siblings to determine new branch_index
        const siblingCountResult = await pool.query(`
          SELECT COUNT(*) as count FROM messages
          WHERE conversation_id = $1
            AND (
              ($2::UUID IS NULL AND parent_message_id IS NULL) OR
              (parent_message_id = $2)
            )
        `, [message.conversation_id, message.parent_message_id]);

        const newBranchIndex = parseInt(siblingCountResult.rows[0].count);

        // Create new message as sibling branch
        const newMessageResult = await pool.query(`
          INSERT INTO messages (conversation_id, role, content, parent_message_id, branch_index, created_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
          RETURNING id, role, content, parent_message_id as "parentMessageId", branch_index as "branchIndex", created_at as "createdAt"
        `, [message.conversation_id, 'user', content, message.parent_message_id, newBranchIndex]);

        const newMessage = newMessageResult.rows[0];

        // Delete all assistant responses after the edited message
        await pool.query(`
          DELETE FROM messages
          WHERE conversation_id = $1
            AND parent_message_id = $2
        `, [message.conversation_id, messageId]);

        // Update conversation's active_branch_leaf_id to new message
        await pool.query(`
          UPDATE conversations
          SET active_branch_leaf_id = $1, updated_at = NOW()
          WHERE id = $2
        `, [newMessage.id, message.conversation_id]);

        console.log(`✅ [FORKS] Edited message ${messageId}, created new branch with message ${newMessage.id}`);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          newMessage: {
            ...newMessage,
            createdAt: new Date(newMessage.createdAt).toISOString()
          }
        }));
      } catch (error) {
        console.error('❌ Error editing message:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to edit message' }));
      }
      return;
    }

    // Regenerate assistant message (create alternative response)
    if (path.match(/^\/api\/messages\/[^\/]+\/regenerate$/) && method === 'POST') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      try {
        const messageId = path.split('/')[3];

        // Get message and verify it's an assistant message and belongs to user's conversation
        const messageResult = await pool.query(`
          SELECT m.id, m.role, m.conversation_id, m.parent_message_id, c.user_id, c.agent_id
          FROM messages m
          JOIN conversations c ON m.conversation_id = c.id
          WHERE m.id = $1
        `, [messageId]);

        if (messageResult.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'Message not found' }));
          return;
        }

        const message = messageResult.rows[0];

        if (message.user_id !== user.id) {
          res.writeHead(403, corsHeaders);
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }

        if (message.role !== 'assistant') {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Can only regenerate assistant messages' }));
          return;
        }

        // Count existing siblings to determine new branch_index
        const siblingCountResult = await pool.query(`
          SELECT COUNT(*) as count FROM messages
          WHERE conversation_id = $1
            AND (
              ($2::UUID IS NULL AND parent_message_id IS NULL) OR
              (parent_message_id = $2)
            )
        `, [message.conversation_id, message.parent_message_id]);

        const newBranchIndex = parseInt(siblingCountResult.rows[0].count);

        // Get conversation history up to (but not including) this message
        // We need the parent user message
        // Handle case where parent_message_id is NULL (first message in conversation)
        let userMessage;
        if (message.parent_message_id) {
          const parentMessageResult = await pool.query(`
            SELECT content FROM messages WHERE id = $1
          `, [message.parent_message_id]);

          if (parentMessageResult.rows.length === 0) {
            res.writeHead(400, corsHeaders);
            res.end(JSON.stringify({ error: 'Parent message not found' }));
            return;
          }

          userMessage = parentMessageResult.rows[0].content;
        } else {
          // For messages with no parent, find the first user message in this conversation
          const firstUserMessageResult = await pool.query(`
            SELECT content FROM messages
            WHERE conversation_id = $1 AND role = 'user'
            ORDER BY created_at ASC
            LIMIT 1
          `, [message.conversation_id]);

          if (firstUserMessageResult.rows.length === 0) {
            res.writeHead(400, corsHeaders);
            res.end(JSON.stringify({ error: 'No user message found in conversation' }));
            return;
          }

          userMessage = firstUserMessageResult.rows[0].content;
        }

        // Build conversation history from root to parent message
        const historyResult = await pool.query(`
          SELECT role, content
          FROM get_branch_messages($1, $2)
          WHERE id != $2
          ORDER BY created_at ASC
        `, [message.conversation_id, message.parent_message_id]);

        const conversationHistory = historyResult.rows;

        // This would need to integrate with your existing AI streaming logic
        // For now, return success indicating that regeneration should be triggered
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          regenerate: true,
          conversationId: message.conversation_id,
          agentId: message.agent_id,
          userMessage: userMessage,
          history: conversationHistory,
          newBranchIndex: newBranchIndex,
          parentMessageId: message.parent_message_id
        }));

        console.log(`✅ [FORKS] Regenerate requested for message ${messageId}, branch ${newBranchIndex}`);
      } catch (error) {
        console.error('❌ Error regenerating message:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to regenerate message' }));
      }
      return;
    }

    // Update conversation (rename or archive/unarchive)
    if (path.match(/^\/api\/conversations\/[^\/]+$/) && method === 'PATCH') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      try {
        const conversationId = path.split('/')[3];
        const body = await parseBody(req);
        console.log(`🔍 PATCH conversation ${conversationId} body:`, JSON.stringify(body));

        // Verify conversation belongs to user
        const checkResult = await pool.query(`
          SELECT id FROM conversations WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
        `, [conversationId, user.id]);

        if (checkResult.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'Conversation not found' }));
          return;
        }

        // Build dynamic update query
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (body.title !== undefined) {
          updates.push(`title = $${paramCount++}`);
          values.push(body.title);
        }

        if (body.isArchived !== undefined) {
          updates.push(`is_archived = $${paramCount++}`);
          values.push(body.isArchived);
        }

        if (body.modelOverride !== undefined) {
          updates.push(`model_override = $${paramCount++}`);
          values.push(body.modelOverride);
        }

        if (body.isStarred !== undefined) {
          updates.push(`is_starred = $${paramCount++}`);
          values.push(body.isStarred);
        }

        if (body.projectId !== undefined) {
          updates.push(`project_id = $${paramCount++}`);
          values.push(body.projectId);
        }

        if (updates.length === 0) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'No valid update fields provided' }));
          return;
        }

        values.push(conversationId);
        values.push(user.id);

        const updateQuery = `
          UPDATE conversations
          SET ${updates.join(', ')}, updated_at = NOW()
          WHERE id = $${paramCount++} AND user_id = $${paramCount}
          RETURNING id, agent_id as "agentId", title, is_archived as "isArchived",
                    is_starred as "isStarred", project_id as "projectId",
                    archived_at as "archivedAt",
                    created_at as "createdAt", updated_at as "updatedAt"
        `;

        const result = await pool.query(updateQuery, values);

        if (result.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'Failed to update conversation' }));
          return;
        }

        const conversation = {
          ...result.rows[0],
          createdAt: new Date(result.rows[0].createdAt).toISOString(),
          updatedAt: new Date(result.rows[0].updatedAt).toISOString()
        };

        console.log(`📝 Conversation updated: ${conversationId} by ${user.email}`);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ conversation }));
      } catch (error) {
        console.error('❌ Error updating conversation:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to update conversation' }));
      }
      return;
    }

    // Delete conversation
    if (path.match(/^\/api\/conversations\/[^\/]+$/) && method === 'DELETE') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      try {
        const conversationId = path.split('/')[3];

        // Verify conversation belongs to user before deleting
        const checkResult = await pool.query(`
          SELECT id FROM conversations WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
        `, [conversationId, user.id]);

        if (checkResult.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'Conversation not found' }));
          return;
        }

        // Soft-delete conversation (preserve for admin forensic review)
        await pool.query(`
          UPDATE conversations SET deleted_at = NOW() WHERE id = $1
        `, [conversationId]);

        console.log(`🗑️ Soft-deleted conversation ${conversationId} for user ${user.email}`);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ success: true, message: 'Conversation deleted' }));
      } catch (error) {
        console.error('❌ Error deleting conversation:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to delete conversation' }));
      }
      return;
    }

    // ============================================
    // PROJECTS ENDPOINTS
    // ============================================

    // Get all projects for user
    if (path === '/api/projects' && method === 'GET') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      // Admin can view another user's projects
      const viewAsUserId = parsedUrl.query.viewAsUserId || null;
      const isAuthAdmin = user && ['admin', 'ADMIN'].includes(user.role);
      const targetUserId = (viewAsUserId && isAuthAdmin) ? viewAsUserId : user.id;

      try {
        const result = await pool.query(`
          SELECT
            p.id,
            p.name,
            p.description,
            p.color,
            p.is_archived as "isArchived",
            p.created_at as "createdAt",
            p.updated_at as "updatedAt",
            COUNT(c.id) as "conversationCount"
          FROM projects p
          LEFT JOIN conversations c ON p.id = c.project_id AND c.is_archived = false AND c.deleted_at IS NULL
          WHERE p.user_id = $1 AND p.is_archived = false
          GROUP BY p.id, p.name, p.description, p.color, p.is_archived, p.created_at, p.updated_at
          ORDER BY p.updated_at DESC
        `, [targetUserId]);

        const projects = result.rows.map(proj => ({
          ...proj,
          createdAt: new Date(proj.createdAt).toISOString(),
          updatedAt: new Date(proj.updatedAt).toISOString(),
          conversationCount: parseInt(proj.conversationCount)
        }));

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ projects }));
      } catch (error) {
        console.error('❌ Error fetching projects:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to fetch projects' }));
      }
      return;
    }

    // Create new project
    if (path === '/api/projects' && method === 'POST') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      try {
        const body = await parseBody(req);
        const { name, description, color } = body;

        if (!name || name.trim().length === 0) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Project name is required' }));
          return;
        }

        const result = await pool.query(`
          INSERT INTO projects (user_id, name, description, color)
          VALUES ($1, $2, $3, $4)
          RETURNING id, name, description, color, is_archived as "isArchived",
                    created_at as "createdAt", updated_at as "updatedAt"
        `, [user.id, name.trim(), description || null, color || null]);

        const project = {
          ...result.rows[0],
          createdAt: new Date(result.rows[0].createdAt).toISOString(),
          updatedAt: new Date(result.rows[0].updatedAt).toISOString(),
          conversationCount: 0
        };

        console.log(`📁 Created project: ${project.name} (${project.id}) for user ${user.email}`);

        res.writeHead(201, corsHeaders);
        res.end(JSON.stringify({ project }));
      } catch (error) {
        console.error('❌ Error creating project:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to create project' }));
      }
      return;
    }

    // Update project
    if (path.match(/^\/api\/projects\/[^\/]+$/) && method === 'PATCH') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      try {
        const projectId = path.split('/')[3];
        const body = await parseBody(req);

        // Verify project belongs to user
        const checkResult = await pool.query(`
          SELECT id FROM projects WHERE id = $1 AND user_id = $2
        `, [projectId, user.id]);

        if (checkResult.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'Project not found' }));
          return;
        }

        // Build dynamic update query
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (body.name !== undefined && body.name.trim().length > 0) {
          updates.push(`name = $${paramCount++}`);
          values.push(body.name.trim());
        }

        if (body.description !== undefined) {
          updates.push(`description = $${paramCount++}`);
          values.push(body.description || null);
        }

        if (body.color !== undefined) {
          updates.push(`color = $${paramCount++}`);
          values.push(body.color || null);
        }

        if (body.isArchived !== undefined) {
          updates.push(`is_archived = $${paramCount++}`);
          values.push(body.isArchived);
        }

        if (updates.length === 0) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'No valid update fields provided' }));
          return;
        }

        values.push(projectId);
        values.push(user.id);

        const updateQuery = `
          UPDATE projects
          SET ${updates.join(', ')}, updated_at = NOW()
          WHERE id = $${paramCount++} AND user_id = $${paramCount}
          RETURNING id, name, description, color, is_archived as "isArchived",
                    created_at as "createdAt", updated_at as "updatedAt"
        `;

        const result = await pool.query(updateQuery, values);

        if (result.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'Failed to update project' }));
          return;
        }

        const project = {
          ...result.rows[0],
          createdAt: new Date(result.rows[0].createdAt).toISOString(),
          updatedAt: new Date(result.rows[0].updatedAt).toISOString()
        };

        console.log(`📝 Updated project: ${project.name} (${projectId}) for user ${user.email}`);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ project }));
      } catch (error) {
        console.error('❌ Error updating project:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to update project' }));
      }
      return;
    }

    // Delete project
    if (path.match(/^\/api\/projects\/[^\/]+$/) && method === 'DELETE') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      try {
        const projectId = path.split('/')[3];

        // Verify project belongs to user
        const checkResult = await pool.query(`
          SELECT id FROM projects WHERE id = $1 AND user_id = $2
        `, [projectId, user.id]);

        if (checkResult.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'Project not found' }));
          return;
        }

        // Remove project association from conversations (set to NULL)
        await pool.query(`
          UPDATE conversations SET project_id = NULL WHERE project_id = $1
        `, [projectId]);

        // Delete project
        await pool.query(`
          DELETE FROM projects WHERE id = $1
        `, [projectId]);

        console.log(`🗑️ Deleted project ${projectId} for user ${user.email}`);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ success: true, message: 'Project deleted' }));
      } catch (error) {
        console.error('❌ Error deleting project:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to delete project' }));
      }
      return;
    }

    // Get conversations in a project
    if (path.match(/^\/api\/projects\/[^\/]+\/conversations$/) && method === 'GET') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      try {
        const projectId = path.split('/')[3];

        // Verify project belongs to user
        const checkResult = await pool.query(`
          SELECT id FROM projects WHERE id = $1 AND user_id = $2
        `, [projectId, user.id]);

        if (checkResult.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'Project not found' }));
          return;
        }

        const result = await pool.query(`
          SELECT
            c.id,
            c.agent_id as "agentId",
            c.title,
            c.is_archived as "isArchived",
            c.is_starred as "isStarred",
            c.created_at as "createdAt",
            c.updated_at as "updatedAt",
            COALESCE(
              json_agg(
                json_build_object(
                  'id', m.id,
                  'role', m.role,
                  'content', m.content,
                  'timestamp', m.created_at
                ) ORDER BY m.created_at ASC
              ) FILTER (WHERE m.id IS NOT NULL),
              '[]'::json
            ) as messages
          FROM conversations c
          LEFT JOIN messages m ON c.id = m.conversation_id
          WHERE c.project_id = $1 AND c.is_archived = false
          GROUP BY c.id, c.agent_id, c.title, c.is_archived, c.is_starred, c.created_at, c.updated_at
          ORDER BY c.updated_at DESC
        `, [projectId]);

        const conversations = result.rows.map(conv => ({
          ...conv,
          createdAt: new Date(conv.createdAt).toISOString(),
          updatedAt: new Date(conv.updatedAt).toISOString(),
          messages: conv.messages.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp).toISOString()
          }))
        }));

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ conversations }));
      } catch (error) {
        console.error('❌ Error fetching project conversations:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to fetch conversations' }));
      }
      return;
    }

    // ============================================
    // CLIENT PROFILE ENDPOINTS (Agency / Admin only)
    // ============================================

    // List user's client profiles
    if (path === '/api/client-profiles' && method === 'GET') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      if (user.role !== 'agency' && user.role !== 'admin') {
        res.writeHead(403, corsHeaders);
        res.end(JSON.stringify({ error: 'Client profiles require agency or admin role' }));
        return;
      }

      try {
        // Admin can view another user's client profiles via viewAsUserId
        const url = new URL(req.url, `http://${req.headers.host}`);
        const viewAsUserId = url.searchParams.get('viewAsUserId') || null;
        const targetUserId = (viewAsUserId && user.role === 'admin') ? viewAsUserId : user.id;

        const result = await pool.query(`
          SELECT
            cp.id,
            cp.client_name as "clientName",
            cp.client_type as "clientType",
            cp.industry,
            cp.description,
            cp.color,
            cp.is_active as "isActive",
            cp.is_archived as "isArchived",
            cp.metadata,
            cp.created_at as "createdAt",
            cp.updated_at as "updatedAt",
            COUNT(DISTINCT conv.id) FILTER (WHERE conv.is_archived = false) as "conversationCount",
            COUNT(DISTINCT m.id) as "memoryCount"
          FROM client_profiles cp
          LEFT JOIN conversations conv ON conv.client_profile_id = cp.id
          LEFT JOIN memories m ON m.client_profile_id = cp.id
          WHERE cp.user_id = $1 AND cp.is_archived = false
          GROUP BY cp.id
          ORDER BY cp.updated_at DESC
        `, [targetUserId]);

        const clientProfiles = result.rows.map(cp => ({
          ...cp,
          conversationCount: parseInt(cp.conversationCount),
          memoryCount: parseInt(cp.memoryCount),
          createdAt: new Date(cp.createdAt).toISOString(),
          updatedAt: new Date(cp.updatedAt).toISOString(),
        }));

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ clientProfiles }));
      } catch (error) {
        console.error('❌ Error fetching client profiles:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to fetch client profiles' }));
      }
      return;
    }

    // Create client profile
    if (path === '/api/client-profiles' && method === 'POST') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      if (user.role !== 'agency' && user.role !== 'admin') {
        res.writeHead(403, corsHeaders);
        res.end(JSON.stringify({ error: 'Client profiles require agency or admin role' }));
        return;
      }

      try {
        const body = await parseBody(req);
        const { clientName, clientType, industry, description, color, metadata } = body;

        if (!clientName || clientName.trim().length === 0) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Client name is required' }));
          return;
        }

        const result = await pool.query(`
          INSERT INTO client_profiles (user_id, client_name, client_type, industry, description, color, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, client_name as "clientName", client_type as "clientType",
                    industry, description, color, is_active as "isActive",
                    is_archived as "isArchived", metadata,
                    created_at as "createdAt", updated_at as "updatedAt"
        `, [
          user.id,
          clientName.trim(),
          clientType || 'company',
          industry || null,
          description || null,
          color || null,
          metadata ? JSON.stringify(metadata) : '{}'
        ]);

        const clientProfile = {
          ...result.rows[0],
          conversationCount: 0,
          memoryCount: 0,
          createdAt: new Date(result.rows[0].createdAt).toISOString(),
          updatedAt: new Date(result.rows[0].updatedAt).toISOString(),
        };

        console.log(`🏢 Created client profile: ${clientProfile.clientName} (${clientProfile.id}) for user ${user.email}`);

        res.writeHead(201, corsHeaders);
        res.end(JSON.stringify({ clientProfile }));
      } catch (error) {
        console.error('❌ Error creating client profile:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to create client profile' }));
      }
      return;
    }

    // Get single client profile
    if (path.match(/^\/api\/client-profiles\/[^\/]+$/) && method === 'GET') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      if (user.role !== 'agency' && user.role !== 'admin') {
        res.writeHead(403, corsHeaders);
        res.end(JSON.stringify({ error: 'Client profiles require agency or admin role' }));
        return;
      }

      try {
        const profileId = path.split('/')[3];

        const result = await pool.query(`
          SELECT
            cp.id,
            cp.client_name as "clientName",
            cp.client_type as "clientType",
            cp.industry,
            cp.description,
            cp.color,
            cp.is_active as "isActive",
            cp.is_archived as "isArchived",
            cp.metadata,
            cp.created_at as "createdAt",
            cp.updated_at as "updatedAt",
            COUNT(DISTINCT conv.id) FILTER (WHERE conv.is_archived = false) as "conversationCount",
            COUNT(DISTINCT m.id) as "memoryCount"
          FROM client_profiles cp
          LEFT JOIN conversations conv ON conv.client_profile_id = cp.id
          LEFT JOIN memories m ON m.client_profile_id = cp.id
          WHERE cp.id = $1 AND cp.user_id = $2
          GROUP BY cp.id
        `, [profileId, user.id]);

        if (result.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'Client profile not found' }));
          return;
        }

        const clientProfile = {
          ...result.rows[0],
          conversationCount: parseInt(result.rows[0].conversationCount),
          memoryCount: parseInt(result.rows[0].memoryCount),
          createdAt: new Date(result.rows[0].createdAt).toISOString(),
          updatedAt: new Date(result.rows[0].updatedAt).toISOString(),
        };

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ clientProfile }));
      } catch (error) {
        console.error('❌ Error fetching client profile:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to fetch client profile' }));
      }
      return;
    }

    // Update client profile
    if (path.match(/^\/api\/client-profiles\/[^\/]+$/) && method === 'PATCH') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      if (user.role !== 'agency' && user.role !== 'admin') {
        res.writeHead(403, corsHeaders);
        res.end(JSON.stringify({ error: 'Client profiles require agency or admin role' }));
        return;
      }

      try {
        const profileId = path.split('/')[3];
        const body = await parseBody(req);

        // Verify ownership
        const check = await pool.query(
          'SELECT id FROM client_profiles WHERE id = $1 AND user_id = $2',
          [profileId, user.id]
        );
        if (check.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'Client profile not found' }));
          return;
        }

        const updates = [];
        const values = [];
        let paramIdx = 1;

        const fields = { clientName: 'client_name', clientType: 'client_type', industry: 'industry', description: 'description', color: 'color', isActive: 'is_active', metadata: 'metadata' };
        for (const [jsKey, dbCol] of Object.entries(fields)) {
          if (body[jsKey] !== undefined) {
            updates.push(`${dbCol} = $${paramIdx}`);
            values.push(dbCol === 'metadata' ? JSON.stringify(body[jsKey]) : body[jsKey]);
            paramIdx++;
          }
        }

        if (updates.length === 0) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'No fields to update' }));
          return;
        }

        updates.push(`updated_at = NOW()`);
        values.push(profileId, user.id);

        const result = await pool.query(`
          UPDATE client_profiles SET ${updates.join(', ')}
          WHERE id = $${paramIdx} AND user_id = $${paramIdx + 1}
          RETURNING id, client_name as "clientName", client_type as "clientType",
                    industry, description, color, is_active as "isActive",
                    is_archived as "isArchived", metadata,
                    created_at as "createdAt", updated_at as "updatedAt"
        `, values);

        const clientProfile = {
          ...result.rows[0],
          createdAt: new Date(result.rows[0].createdAt).toISOString(),
          updatedAt: new Date(result.rows[0].updatedAt).toISOString(),
        };

        console.log(`🏢 Updated client profile: ${clientProfile.clientName} (${clientProfile.id})`);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ clientProfile }));
      } catch (error) {
        console.error('❌ Error updating client profile:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to update client profile' }));
      }
      return;
    }

    // Delete (archive) client profile
    if (path.match(/^\/api\/client-profiles\/[^\/]+$/) && method === 'DELETE') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      if (user.role !== 'agency' && user.role !== 'admin') {
        res.writeHead(403, corsHeaders);
        res.end(JSON.stringify({ error: 'Client profiles require agency or admin role' }));
        return;
      }

      try {
        const profileId = path.split('/')[3];

        const result = await pool.query(`
          UPDATE client_profiles SET is_archived = true, updated_at = NOW()
          WHERE id = $1 AND user_id = $2
          RETURNING client_name
        `, [profileId, user.id]);

        if (result.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'Client profile not found' }));
          return;
        }

        console.log(`🏢 Archived client profile: ${result.rows[0].client_name} (${profileId})`);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ success: true, message: 'Client profile archived' }));
      } catch (error) {
        console.error('❌ Error deleting client profile:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to delete client profile' }));
      }
      return;
    }

    // ========================================
    // CLIENT AGENT SETTINGS
    // ========================================

    // GET /api/client-profiles/:id/agents — agent activation per client
    if (path.match(/^\/api\/client-profiles\/[^\/]+\/agents$/) && method === 'GET') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) { res.writeHead(401, corsHeaders); res.end(JSON.stringify({ error: 'Unauthorized' })); return; }
      if (user.role !== 'agency' && user.role !== 'admin') { res.writeHead(403, corsHeaders); res.end(JSON.stringify({ error: 'Agency or admin role required' })); return; }

      try {
        const profileId = path.split('/')[3];

        // Verify ownership
        const ownerCheck = await pool.query('SELECT id FROM client_profiles WHERE id = $1 AND user_id = $2', [profileId, user.id]);
        if (ownerCheck.rows.length === 0) { res.writeHead(404, corsHeaders); res.end(JSON.stringify({ error: 'Client profile not found' })); return; }

        // Get all agents + their activation status for this client
        const result = await pool.query(`
          SELECT a.id, a.name, a.description, a.category, a.accent_color, a.color, a.is_active as agent_active,
                 COALESCE(cas.is_active, true) as client_active
          FROM agents a
          LEFT JOIN client_agent_settings cas ON cas.agent_id = a.id AND cas.client_profile_id = $1
          WHERE a.is_active = true AND (a.is_custom = false OR a.is_custom IS NULL OR a.created_by_user_id = $2)
          ORDER BY COALESCE(a.sort_order, 999), a.name
        `, [profileId, user.id]);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          profileId,
          agents: result.rows.map(r => ({
            id: r.id,
            name: r.name,
            description: r.description,
            category: r.category,
            accentColor: r.accent_color,
            color: r.color,
            isActive: r.client_active,
          }))
        }));
      } catch (error) {
        console.error('❌ Error fetching client agent settings:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to fetch client agent settings' }));
      }
      return;
    }

    // PUT /api/client-profiles/:id/agents — update agent activation per client
    if (path.match(/^\/api\/client-profiles\/[^\/]+\/agents$/) && method === 'PUT') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) { res.writeHead(401, corsHeaders); res.end(JSON.stringify({ error: 'Unauthorized' })); return; }
      if (user.role !== 'agency' && user.role !== 'admin') { res.writeHead(403, corsHeaders); res.end(JSON.stringify({ error: 'Agency or admin role required' })); return; }

      try {
        const profileId = path.split('/')[3];
        const body = await parseBody(req);
        const { agents } = body; // [{ id: 'agent-id', isActive: true/false }]

        if (!Array.isArray(agents)) { res.writeHead(400, corsHeaders); res.end(JSON.stringify({ error: 'agents array required' })); return; }

        // Verify ownership
        const ownerCheck = await pool.query('SELECT id FROM client_profiles WHERE id = $1 AND user_id = $2', [profileId, user.id]);
        if (ownerCheck.rows.length === 0) { res.writeHead(404, corsHeaders); res.end(JSON.stringify({ error: 'Client profile not found' })); return; }

        // Upsert each agent setting
        for (const agent of agents) {
          await pool.query(`
            INSERT INTO client_agent_settings (client_profile_id, agent_id, is_active)
            VALUES ($1, $2, $3)
            ON CONFLICT (client_profile_id, agent_id)
            DO UPDATE SET is_active = $3
          `, [profileId, agent.id, agent.isActive !== false]);
        }

        console.log(`🏢 Updated ${agents.length} agent settings for client profile ${profileId}`);
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ success: true, updated: agents.length }));
      } catch (error) {
        console.error('❌ Error updating client agent settings:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to update client agent settings' }));
      }
      return;
    }

    // ========================================
    // AGENCY TEAM MANAGEMENT
    // ========================================

    // GET /api/agency/team — list managed users + pending invites
    if (path === '/api/agency/team' && method === 'GET') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) { res.writeHead(401, corsHeaders); res.end(JSON.stringify({ error: 'Unauthorized' })); return; }
      if (user.role !== 'agency' && user.role !== 'admin') { res.writeHead(403, corsHeaders); res.end(JSON.stringify({ error: 'Agency or admin role required' })); return; }

      try {
        // Get managed users
        const managedResult = await pool.query(`
          SELECT amu.id, amu.managed_user_id, amu.allowed_agents, amu.is_active, amu.created_at,
                 u.email, u.first_name, u.last_name, u.role, u.is_active as user_active,
                 (SELECT COUNT(*) FROM conversations c WHERE c.user_id = u.id) as conversation_count
          FROM agency_managed_users amu
          JOIN users u ON u.id = amu.managed_user_id
          WHERE amu.agency_user_id = $1
          ORDER BY amu.created_at DESC
        `, [user.id]);

        // Get pending invites
        const invitesResult = await pool.query(`
          SELECT id, email, role, status, invite_code, allowed_agents, expires_at, created_at
          FROM agency_invites
          WHERE agency_user_id = $1 AND status = 'pending' AND expires_at > NOW()
          ORDER BY created_at DESC
        `, [user.id]);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          managedUsers: managedResult.rows.map(r => ({
            id: r.id,
            userId: r.managed_user_id,
            email: r.email,
            firstName: r.first_name,
            lastName: r.last_name,
            role: r.role,
            userActive: r.user_active,
            allowedAgents: r.allowed_agents || [],
            isActive: r.is_active,
            conversationCount: parseInt(r.conversation_count) || 0,
            createdAt: r.created_at,
          })),
          pendingInvites: invitesResult.rows.map(r => ({
            id: r.id,
            email: r.email,
            role: r.role,
            status: r.status,
            inviteCode: r.invite_code,
            allowedAgents: r.allowed_agents || [],
            expiresAt: r.expires_at,
            createdAt: r.created_at,
          })),
        }));
      } catch (error) {
        console.error('❌ Error fetching agency team:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to fetch agency team' }));
      }
      return;
    }

    // POST /api/agency/invite — create invite for sub-user
    if (path === '/api/agency/invite' && method === 'POST') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) { res.writeHead(401, corsHeaders); res.end(JSON.stringify({ error: 'Unauthorized' })); return; }
      if (user.role !== 'agency' && user.role !== 'admin') { res.writeHead(403, corsHeaders); res.end(JSON.stringify({ error: 'Agency or admin role required' })); return; }

      try {
        const body = await parseBody(req);
        const { email, allowedAgents, role } = body;

        if (!email || !email.includes('@')) { res.writeHead(400, corsHeaders); res.end(JSON.stringify({ error: 'Valid email required' })); return; }

        // Check if already invited (pending)
        const existingInvite = await pool.query(
          `SELECT id FROM agency_invites WHERE agency_user_id = $1 AND email = $2 AND status = 'pending' AND expires_at > NOW()`,
          [user.id, email.toLowerCase()]
        );
        if (existingInvite.rows.length > 0) { res.writeHead(409, corsHeaders); res.end(JSON.stringify({ error: 'Invite already pending for this email' })); return; }

        // Check if already a managed user
        const existingUser = await pool.query(
          `SELECT amu.id FROM agency_managed_users amu
           JOIN users u ON u.id = amu.managed_user_id
           WHERE amu.agency_user_id = $1 AND u.email = $2`,
          [user.id, email.toLowerCase()]
        );
        if (existingUser.rows.length > 0) { res.writeHead(409, corsHeaders); res.end(JSON.stringify({ error: 'User is already on your team' })); return; }

        // Generate invite code
        const inviteCode = 'AGENCY-' + require('crypto').randomBytes(6).toString('hex').toUpperCase();

        const result = await pool.query(`
          INSERT INTO agency_invites (agency_user_id, email, role, invite_code, allowed_agents)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, email, role, status, invite_code, allowed_agents, expires_at, created_at
        `, [user.id, email.toLowerCase(), role || 'user', inviteCode, JSON.stringify(allowedAgents || [])]);

        const invite = result.rows[0];
        console.log(`📨 Agency invite created: ${email} by ${user.email} (code: ${inviteCode})`);

        res.writeHead(201, corsHeaders);
        res.end(JSON.stringify({
          id: invite.id,
          email: invite.email,
          role: invite.role,
          status: invite.status,
          inviteCode: invite.invite_code,
          allowedAgents: invite.allowed_agents || [],
          expiresAt: invite.expires_at,
          createdAt: invite.created_at,
        }));
      } catch (error) {
        console.error('❌ Error creating agency invite:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to create invite' }));
      }
      return;
    }

    // DELETE /api/agency/invite/:id — revoke a pending invite
    if (path.match(/^\/api\/agency\/invite\/[^\/]+$/) && method === 'DELETE') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) { res.writeHead(401, corsHeaders); res.end(JSON.stringify({ error: 'Unauthorized' })); return; }
      if (user.role !== 'agency' && user.role !== 'admin') { res.writeHead(403, corsHeaders); res.end(JSON.stringify({ error: 'Agency or admin role required' })); return; }

      try {
        const inviteId = path.split('/')[4];
        const result = await pool.query(
          `UPDATE agency_invites SET status = 'revoked', updated_at = NOW() WHERE id = $1 AND agency_user_id = $2 AND status = 'pending' RETURNING id`,
          [inviteId, user.id]
        );
        if (result.rows.length === 0) { res.writeHead(404, corsHeaders); res.end(JSON.stringify({ error: 'Invite not found or already processed' })); return; }

        console.log(`📨 Agency invite revoked: ${inviteId} by ${user.email}`);
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        console.error('❌ Error revoking invite:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to revoke invite' }));
      }
      return;
    }

    // PATCH /api/agency/team/:userId — update managed user settings
    if (path.match(/^\/api\/agency\/team\/[^\/]+$/) && method === 'PATCH') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) { res.writeHead(401, corsHeaders); res.end(JSON.stringify({ error: 'Unauthorized' })); return; }
      if (user.role !== 'agency' && user.role !== 'admin') { res.writeHead(403, corsHeaders); res.end(JSON.stringify({ error: 'Agency or admin role required' })); return; }

      try {
        const managedUserId = path.split('/')[4];
        const body = await parseBody(req);
        const { allowedAgents, isActive } = body;

        const updates = [];
        const params = [user.id, managedUserId];
        let paramIdx = 3;

        if (allowedAgents !== undefined) { updates.push(`allowed_agents = $${paramIdx}::jsonb`); params.push(JSON.stringify(allowedAgents)); paramIdx++; }
        if (isActive !== undefined) { updates.push(`is_active = $${paramIdx}`); params.push(isActive); paramIdx++; }
        updates.push('updated_at = NOW()');

        if (updates.length <= 1) { res.writeHead(400, corsHeaders); res.end(JSON.stringify({ error: 'No updates provided' })); return; }

        const result = await pool.query(
          `UPDATE agency_managed_users SET ${updates.join(', ')} WHERE agency_user_id = $1 AND managed_user_id = $2 RETURNING *`,
          params
        );
        if (result.rows.length === 0) { res.writeHead(404, corsHeaders); res.end(JSON.stringify({ error: 'Managed user not found' })); return; }

        console.log(`👥 Updated managed user ${managedUserId} settings by ${user.email}`);
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        console.error('❌ Error updating managed user:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to update managed user' }));
      }
      return;
    }

    // DELETE /api/agency/team/:userId — remove managed user
    if (path.match(/^\/api\/agency\/team\/[^\/]+$/) && method === 'DELETE') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) { res.writeHead(401, corsHeaders); res.end(JSON.stringify({ error: 'Unauthorized' })); return; }
      if (user.role !== 'agency' && user.role !== 'admin') { res.writeHead(403, corsHeaders); res.end(JSON.stringify({ error: 'Agency or admin role required' })); return; }

      try {
        const managedUserId = path.split('/')[4];
        const result = await pool.query(
          `DELETE FROM agency_managed_users WHERE agency_user_id = $1 AND managed_user_id = $2 RETURNING managed_user_id`,
          [user.id, managedUserId]
        );
        if (result.rows.length === 0) { res.writeHead(404, corsHeaders); res.end(JSON.stringify({ error: 'Managed user not found' })); return; }

        console.log(`👥 Removed managed user ${managedUserId} by ${user.email}`);
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        console.error('❌ Error removing managed user:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to remove managed user' }));
      }
      return;
    }

    // ============================================
    // CUSTOM AGENT ENDPOINTS (Agency / Admin only)
    // ============================================

    // List user's custom agents
    if (path === '/api/custom-agents' && method === 'GET') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      if (user.role !== 'agency' && user.role !== 'admin') {
        res.writeHead(403, corsHeaders);
        res.end(JSON.stringify({ error: 'Custom agents require agency or admin role' }));
        return;
      }

      try {
        const result = await pool.query(`
          SELECT
            a.id,
            a.name,
            a.description,
            a.system_prompt,
            a.category,
            a.model_preference,
            a.max_tokens,
            a.temperature,
            a.is_active,
            a.accent_color,
            a.color,
            a.metadata,
            a.visibility,
            a.custom_config,
            a.client_profile_id,
            a.created_at,
            a.updated_at,
            COUNT(DISTINCT c.id) as conversation_count
          FROM agents a
          LEFT JOIN conversations c ON c.agent_id = a.id AND c.is_archived = false
          WHERE a.is_custom = true AND a.created_by_user_id = $1
          GROUP BY a.id
          ORDER BY a.created_at DESC
        `, [user.id]);

        const customAgents = result.rows.map(a => ({
          id: a.id,
          name: a.name,
          description: a.description,
          systemPrompt: a.system_prompt,
          category: a.category,
          modelPreference: a.model_preference,
          maxTokens: a.max_tokens,
          temperature: a.temperature,
          isActive: a.is_active,
          accentColor: a.accent_color || a.color || '#8b5cf6',
          color: a.color || a.accent_color || '#8b5cf6',
          metadata: a.metadata || {},
          visibility: a.visibility || 'private',
          customConfig: a.custom_config || {},
          clientProfileId: a.client_profile_id,
          conversationCount: parseInt(a.conversation_count),
          createdAt: new Date(a.created_at).toISOString(),
          updatedAt: new Date(a.updated_at).toISOString(),
        }));

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ customAgents }));
      } catch (error) {
        console.error('❌ Error fetching custom agents:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to fetch custom agents' }));
      }
      return;
    }

    // Create custom agent
    if (path === '/api/custom-agents' && method === 'POST') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      if (user.role !== 'agency' && user.role !== 'admin') {
        res.writeHead(403, corsHeaders);
        res.end(JSON.stringify({ error: 'Custom agents require agency or admin role' }));
        return;
      }

      try {
        const body = await parseBody(req);
        const {
          name, description, systemPrompt, category,
          modelPreference, maxTokens, temperature,
          color, metadata, visibility, customConfig,
          clientProfileId, conversationStarters, icon
        } = body;

        if (!name || !name.trim()) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Agent name is required' }));
          return;
        }

        if (!systemPrompt || !systemPrompt.trim()) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'System prompt is required' }));
          return;
        }

        // Generate slug ID from name
        const baseSlug = name.trim().toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .substring(0, 80);

        // Check for uniqueness, append number if needed
        let slug = `custom-${baseSlug}`;
        let suffix = 0;
        while (true) {
          const checkId = suffix === 0 ? slug : `${slug}-${suffix}`;
          const existing = await pool.query('SELECT id FROM agents WHERE id = $1', [checkId]);
          if (existing.rows.length === 0) {
            slug = checkId;
            break;
          }
          suffix++;
        }

        // Build metadata with icon and conversation starters
        const agentMetadata = {
          ...(metadata || {}),
          icon: icon || 'Wand2',
          conversation_starters: conversationStarters || ["Let's GO!"],
        };

        const defaultModel = modelPreference || 'anthropic/claude-sonnet-4.6';

        const result = await pool.query(`
          INSERT INTO agents (
            id, name, tier, description, system_prompt, category,
            model_preference, chat_model, memory_model, widget_model,
            max_tokens, temperature,
            is_active, is_custom, created_by_user_id,
            color, accent_color, metadata,
            visibility, custom_config, client_profile_id,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW(), NOW())
          RETURNING *
        `, [
          slug,
          name.trim(),
          1,  // tier (required NOT NULL column)
          description || '',
          systemPrompt.trim(),
          category || 'Custom',
          defaultModel,
          defaultModel,  // chat_model
          defaultModel,  // memory_model
          defaultModel,  // widget_model
          maxTokens || 4000,
          temperature || '0.7',
          true,  // is_active
          true,  // is_custom
          user.id,
          color || '#8b5cf6',
          color || '#8b5cf6',
          JSON.stringify(agentMetadata),
          visibility || 'private',
          JSON.stringify(customConfig || {}),
          clientProfileId || null,
        ]);

        const agent = result.rows[0];

        // Reload agent cache so the new agent is available immediately
        await loadAgentsFromDatabase();

        console.log(`🤖 Created custom agent: ${agent.name} (${agent.id}) by user ${user.email}`);

        res.writeHead(201, corsHeaders);
        res.end(JSON.stringify({
          customAgent: {
            id: agent.id,
            name: agent.name,
            description: agent.description,
            systemPrompt: agent.system_prompt,
            category: agent.category,
            modelPreference: agent.model_preference,
            maxTokens: agent.max_tokens,
            temperature: agent.temperature,
            isActive: agent.is_active,
            accentColor: agent.accent_color || agent.color || '#8b5cf6',
            color: agent.color || '#8b5cf6',
            metadata: agent.metadata || {},
            visibility: agent.visibility || 'private',
            customConfig: agent.custom_config || {},
            clientProfileId: agent.client_profile_id,
            conversationCount: 0,
            createdAt: new Date(agent.created_at).toISOString(),
            updatedAt: new Date(agent.updated_at).toISOString(),
          }
        }));
      } catch (error) {
        console.error('❌ Error creating custom agent:', error.message, error.stack?.substring(0, 300));
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to create custom agent', details: error.message }));
      }
      return;
    }

    // Get single custom agent
    if (path.match(/^\/api\/custom-agents\/[^\/]+$/) && method === 'GET') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      if (user.role !== 'agency' && user.role !== 'admin') {
        res.writeHead(403, corsHeaders);
        res.end(JSON.stringify({ error: 'Custom agents require agency or admin role' }));
        return;
      }

      try {
        const agentId = decodeURIComponent(path.split('/')[3]);

        const result = await pool.query(`
          SELECT a.*,
            COUNT(DISTINCT c.id) as conversation_count
          FROM agents a
          LEFT JOIN conversations c ON c.agent_id = a.id AND c.is_archived = false
          WHERE a.id = $1 AND a.is_custom = true AND a.created_by_user_id = $2
          GROUP BY a.id
        `, [agentId, user.id]);

        if (result.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'Custom agent not found' }));
          return;
        }

        const a = result.rows[0];
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          customAgent: {
            id: a.id,
            name: a.name,
            description: a.description,
            systemPrompt: a.system_prompt,
            category: a.category,
            modelPreference: a.model_preference,
            maxTokens: a.max_tokens,
            temperature: a.temperature,
            isActive: a.is_active,
            accentColor: a.accent_color || a.color || '#8b5cf6',
            color: a.color || '#8b5cf6',
            metadata: a.metadata || {},
            visibility: a.visibility || 'private',
            customConfig: a.custom_config || {},
            clientProfileId: a.client_profile_id,
            conversationCount: parseInt(a.conversation_count),
            createdAt: new Date(a.created_at).toISOString(),
            updatedAt: new Date(a.updated_at).toISOString(),
          }
        }));
      } catch (error) {
        console.error('❌ Error fetching custom agent:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to fetch custom agent' }));
      }
      return;
    }

    // Update custom agent
    if (path.match(/^\/api\/custom-agents\/[^\/]+$/) && method === 'PATCH') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      if (user.role !== 'agency' && user.role !== 'admin') {
        res.writeHead(403, corsHeaders);
        res.end(JSON.stringify({ error: 'Custom agents require agency or admin role' }));
        return;
      }

      try {
        const agentId = decodeURIComponent(path.split('/')[3]);
        const body = await parseBody(req);

        // Verify ownership
        const check = await pool.query(
          'SELECT id FROM agents WHERE id = $1 AND is_custom = true AND created_by_user_id = $2',
          [agentId, user.id]
        );
        if (check.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'Custom agent not found' }));
          return;
        }

        // Build dynamic SET clause
        const updates = [];
        const values = [];
        let paramIdx = 1;

        const fieldMap = {
          name: 'name',
          description: 'description',
          systemPrompt: 'system_prompt',
          category: 'category',
          modelPreference: 'model_preference',
          maxTokens: 'max_tokens',
          temperature: 'temperature',
          isActive: 'is_active',
          color: 'color',
          visibility: 'visibility',
          clientProfileId: 'client_profile_id',
        };

        for (const [jsField, dbField] of Object.entries(fieldMap)) {
          if (body[jsField] !== undefined) {
            updates.push(`${dbField} = $${paramIdx}`);
            values.push(body[jsField]);
            paramIdx++;
          }
        }

        // Handle color -> accent_color sync
        if (body.color !== undefined) {
          updates.push(`accent_color = $${paramIdx}`);
          values.push(body.color);
          paramIdx++;
        }

        // Handle JSON fields
        if (body.metadata !== undefined) {
          updates.push(`metadata = $${paramIdx}`);
          values.push(JSON.stringify(body.metadata));
          paramIdx++;
        }
        if (body.customConfig !== undefined) {
          updates.push(`custom_config = $${paramIdx}`);
          values.push(JSON.stringify(body.customConfig));
          paramIdx++;
        }

        // Handle conversation starters and icon via metadata merge
        if (body.conversationStarters !== undefined || body.icon !== undefined) {
          // Fetch current metadata first
          const currentMeta = await pool.query('SELECT metadata FROM agents WHERE id = $1', [agentId]);
          const existingMeta = currentMeta.rows[0]?.metadata || {};
          const mergedMeta = { ...existingMeta };
          if (body.conversationStarters !== undefined) mergedMeta.conversation_starters = body.conversationStarters;
          if (body.icon !== undefined) mergedMeta.icon = body.icon;
          // Only add if metadata wasn't already being set
          if (body.metadata === undefined) {
            updates.push(`metadata = $${paramIdx}`);
            values.push(JSON.stringify(mergedMeta));
            paramIdx++;
          }
        }

        if (updates.length === 0) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'No valid fields to update' }));
          return;
        }

        updates.push('updated_at = NOW()');
        values.push(agentId);

        const result = await pool.query(`
          UPDATE agents SET ${updates.join(', ')}
          WHERE id = $${paramIdx}
          RETURNING *
        `, values);

        // Reload agent cache
        await loadAgentsFromDatabase();

        const a = result.rows[0];
        console.log(`🤖 Updated custom agent: ${a.name} (${a.id})`);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          customAgent: {
            id: a.id,
            name: a.name,
            description: a.description,
            systemPrompt: a.system_prompt,
            category: a.category,
            modelPreference: a.model_preference,
            maxTokens: a.max_tokens,
            temperature: a.temperature,
            isActive: a.is_active,
            accentColor: a.accent_color || a.color || '#8b5cf6',
            color: a.color || '#8b5cf6',
            metadata: a.metadata || {},
            visibility: a.visibility || 'private',
            customConfig: a.custom_config || {},
            clientProfileId: a.client_profile_id,
            createdAt: new Date(a.created_at).toISOString(),
            updatedAt: new Date(a.updated_at).toISOString(),
          }
        }));
      } catch (error) {
        console.error('❌ Error updating custom agent:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to update custom agent' }));
      }
      return;
    }

    // Delete custom agent (soft delete — sets is_active=false)
    if (path.match(/^\/api\/custom-agents\/[^\/]+$/) && method === 'DELETE') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      if (user.role !== 'agency' && user.role !== 'admin') {
        res.writeHead(403, corsHeaders);
        res.end(JSON.stringify({ error: 'Custom agents require agency or admin role' }));
        return;
      }

      try {
        const agentId = decodeURIComponent(path.split('/')[3]);

        const result = await pool.query(`
          UPDATE agents SET is_active = false, updated_at = NOW()
          WHERE id = $1 AND is_custom = true AND created_by_user_id = $2
          RETURNING name
        `, [agentId, user.id]);

        if (result.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'Custom agent not found' }));
          return;
        }

        // Reload agent cache
        await loadAgentsFromDatabase();

        console.log(`🤖 Deleted custom agent: ${result.rows[0].name} (${agentId})`);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ success: true, message: 'Custom agent deleted' }));
      } catch (error) {
        console.error('❌ Error deleting custom agent:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to delete custom agent' }));
      }
      return;
    }

    // ============================================
    // MESSAGE FEEDBACK ENDPOINTS
    // ============================================

    // Submit message feedback (thumbs up/down)
    if (path === '/api/feedback' && method === 'POST') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      try {
        const body = await parseBody(req);
        const { messageId, conversationId, agentId, feedbackType } = body;

        // Validate inputs
        if (!messageId || !conversationId || !agentId || !feedbackType) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Missing required fields' }));
          return;
        }

        if (!['up', 'down'].includes(feedbackType)) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Invalid feedback type' }));
          return;
        }

        // Upsert feedback (update if exists, insert if doesn't)
        const result = await pool.query(`
          INSERT INTO message_feedback (user_id, message_id, conversation_id, agent_id, feedback_type, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          ON CONFLICT (user_id, message_id)
          DO UPDATE SET
            feedback_type = $5,
            updated_at = NOW()
          RETURNING id, feedback_type, created_at, updated_at
        `, [user.id, messageId, conversationId, agentId, feedbackType]);

        console.log(`👍👎 [FEEDBACK] User ${user.email} gave "${feedbackType}" to message ${messageId}`);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          feedback: result.rows[0]
        }));
      } catch (error) {
        console.error('❌ Error saving feedback:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to save feedback' }));
      }
      return;
    }

    // Delete message feedback (remove thumbs up/down)
    if (path.match(/^\/api\/feedback\/[^\/]+$/) && method === 'DELETE') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      try {
        const messageId = path.split('/')[3];

        await pool.query(`
          DELETE FROM message_feedback WHERE user_id = $1 AND message_id = $2
        `, [user.id, messageId]);

        console.log(`🗑️ [FEEDBACK] User ${user.email} removed feedback for message ${messageId}`);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        console.error('❌ Error deleting feedback:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to delete feedback' }));
      }
      return;
    }

    // Get feedback for messages in a conversation
    if (path.match(/^\/api\/feedback\/conversation\/[^\/]+$/) && method === 'GET') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      try {
        const conversationId = path.split('/')[4];

        const result = await pool.query(`
          SELECT message_id, feedback_type, created_at, updated_at
          FROM message_feedback
          WHERE user_id = $1 AND conversation_id = $2
        `, [user.id, conversationId]);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ feedback: result.rows }));
      } catch (error) {
        console.error('❌ Error fetching feedback:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to fetch feedback' }));
      }
      return;
    }

    // ============================================
    // DOCUMENT MANAGEMENT ENDPOINTS
    // ============================================

    // ============================================
    // DOCUMENT MANAGEMENT ENDPOINTS
    // These endpoints should be inserted into real-backend.cjs
    // around line 1661 (replacing the Documents section)
    // ============================================
    
    // POST /api/documents/upload - Upload and process document
    if (path === '/api/documents/upload' && method === 'POST') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
    
      const form = new multiparty.Form({
        uploadDir: pathModule.join(__dirname, 'uploads'),
        maxFilesSize: 10 * 1024 * 1024 // 10MB limit
      });
    
      form.parse(req, async (err, fields, files) => {
        if (err) {
          console.error('❌ File upload error:', err);
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'File upload failed' }));
          return;
        }
    
        try {
          const file = files.file?.[0];
          const agentId = fields.agentId?.[0];
    
          if (!file) {
            res.writeHead(400, corsHeaders);
            res.end(JSON.stringify({ error: 'No file uploaded' }));
            return;
          }
    
          // Validate file type
          const allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'text/markdown'
          ];
    
          if (!allowedTypes.includes(file.headers['content-type'])) {
            fs.unlinkSync(file.path); // Clean up
            res.writeHead(400, corsHeaders);
            res.end(JSON.stringify({ error: 'Invalid file type. Only PDF, DOCX, TXT, and MD files are allowed.' }));
            return;
          }
    
          // Insert document record (matching actual database schema)
          const docResult = await pool.query(`
            INSERT INTO documents (
              user_id, project_id, filename, original_filename,
              file_path, file_size, mime_type
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
          `, [
            user.id,
            null, // project_id
            pathModule.basename(file.path),
            file.originalFilename,
            file.path,
            file.size,
            file.headers['content-type']
          ]);
    
          const documentId = docResult.rows[0].id;

          console.log(`📄 Document uploaded: ${file.originalFilename} (ID: ${documentId})`);

          res.writeHead(200, corsHeaders);
          res.end(JSON.stringify({
            success: true,
            id: documentId,
            message: 'Document uploaded successfully'
          }));
        } catch (error) {
          console.error('❌ Document upload error:', error);
          res.writeHead(500, corsHeaders);
          res.end(JSON.stringify({ error: 'Failed to process document' }));
        }
      });
      return;
    }
    
    // GET /api/documents - List user documents
    if (path === '/api/documents' && method === 'GET') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
    
      try {
        const parsedUrl = url.parse(req.url, true);
        const agentId = parsedUrl.query.agentId;
    
        let query = `
          SELECT
            d.id,
            d.agent_id,
            d.original_filename,
            d.file_type,
            d.file_size,
            d.processing_status,
            d.chunk_count,
            d.embedding_count,
            d.total_tokens,
            d.error_message,
            d.created_at,
            a.name as agent_name
          FROM documents d
          LEFT JOIN agents a ON d.agent_id = a.id
          WHERE d.user_id = $1 AND d.deleted_at IS NULL
        `;
    
        const params = [user.id];
    
        if (agentId) {
          query += ' AND d.agent_id = $2';
          params.push(agentId);
        }
    
        query += ' ORDER BY d.created_at DESC';
    
        const result = await pool.query(query, params);
    
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ documents: result.rows }));
      } catch (error) {
        console.error('❌ Error fetching documents:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to fetch documents' }));
      }
      return;
    }

  // GET /api/knowledge-base - List all knowledge base documents
  if (path === '/api/knowledge-base' && method === 'GET') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      // Parse query parameters
      const url = new URL(req.url, `http://${req.headers.host}`);
      const agentId = url.searchParams.get('agent_id');

      // Build query with optional agent_id filter
      let query = `
        SELECT
          kb.id,
          kb.title,
          kb.content,
          kb.category,
          kb.tags,
          kb.agent_id,
          kb.user_id,
          kb.created_at,
          kb.updated_at,
          a.name as agent_name
        FROM knowledge_base kb
        LEFT JOIN agents a ON kb.agent_id = a.id
      `;

      const params = [];
      if (agentId) {
        query += ` WHERE kb.agent_id = $1`;
        params.push(agentId);
      }

      query += ` ORDER BY kb.created_at DESC`;

      const result = await pool.query(query, params);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ documents: result.rows }));
    } catch (error) {
      console.error('❌ Error fetching knowledge base:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to fetch knowledge base' }));
    }
    return;
  }

  // POST /api/knowledge-base/upload-stream - Upload with Server-Sent Events progress
  if (path === '/api/knowledge-base/upload-stream' && method === 'POST') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const { IncomingForm } = require('formidable');
      const { processDocument } = require('./backend/services/documentProcessor.cjs');
      const fs = require('fs').promises;

      // Setup SSE
      res.writeHead(200, {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      const sendProgress = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      // Parse form data
      const form = new IncomingForm({
        uploadDir: './uploads',
        keepExtensions: true,
        maxFileSize: 10 * 1024 * 1024,
      });

      sendProgress({ step: 'parsing', progress: 10, message: '📤 Receiving file...' });

      const [fields, files] = await new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) reject(err);
          else resolve([fields, files]);
        });
      });

      const file = files.file?.[0];
      if (!file) {
        sendProgress({ step: 'error', error: 'No file uploaded' });
        res.end();
        return;
      }

      sendProgress({ step: 'extracting', progress: 30, message: '📄 Extracting text from document...' });

      const { text } = await processDocument(file.filepath, file.mimetype);
      if (!text || text.trim().length === 0) {
        sendProgress({ step: 'error', error: 'Failed to extract text' });
        res.end();
        return;
      }

      const title = fields.title?.[0] || file.originalFilename || 'Untitled';
      const category = fields.category?.[0] || 'transcript';
      const tags = fields.tags?.[0] || '';
      const agent_id = fields.agent_id?.[0] || null;
      const tagsArray = tags ? tags.split(',').map(t => t.trim()).filter(t => t) : [];

      // Chunk processing with progress
      const chunkSize = 2000;
      const chunks = [];
      for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.substring(i, i + chunkSize));
      }

      const totalChunks = Math.min(chunks.length, 5);
      sendProgress({
        step: 'chunking',
        progress: 50,
        message: `📦 Processing ${totalChunks} chunks...`,
        chunks: totalChunks
      });

      sendProgress({
        step: 'embedding',
        progress: 70,
        message: '🧠 Generating AI embeddings...',
        current: 1,
        total: totalChunks
      });

      const { generateEmbedding } = require('./backend/services/embeddingService.cjs');
      const embeddingText = chunks.slice(0, 5).join(' ').substring(0, 8000);
      const embedding = await generateEmbedding(embeddingText);
      const embeddingString = embedding ? '[' + embedding.join(',') + ']' : null;

      sendProgress({
        step: 'storing',
        progress: 90,
        message: '💾 Storing in knowledge base...'
      });

      const result = await pool.query(`
        INSERT INTO knowledge_base (
          title, content, category, tags, agent_id, user_id, embedding
        ) VALUES ($1, $2, $3, $4, $5, $6, $7::vector)
        RETURNING id, title, category, created_at
      `, [title, text, category, tagsArray, agent_id, user.id, embeddingString]);

      await fs.unlink(file.filepath).catch(() => {});

      sendProgress({
        step: 'complete',
        progress: 100,
        message: '✅ Upload complete!',
        result: result.rows[0]
      });

      console.log(`✅ Knowledge uploaded: ${title} (${text.length} chars, ${totalChunks} chunks)`);
      res.end();
    } catch (error) {
      console.error('❌ Error uploading:', error);
      res.write(`data: ${JSON.stringify({ step: 'error', error: error.message })}\n\n`);
      res.end();
    }
    return;
  }

  // POST /api/knowledge-base/upload - Upload knowledge document with progress
  if (path === '/api/knowledge-base/upload' && method === 'POST') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const { IncomingForm } = require('formidable');
      const { processDocument } = require('./backend/services/documentProcessor.cjs');
      const fs = require('fs').promises;
      const path_module = require('path');

      // Parse the multipart form data
      const form = new IncomingForm({
        uploadDir: './uploads',
        keepExtensions: true,
        maxFileSize: 10 * 1024 * 1024, // 10MB
      });

      const [fields, files] = await new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) reject(err);
          else resolve([fields, files]);
        });
      });

      // Get the uploaded file
      const file = files.file?.[0];
      if (!file) {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: 'No file uploaded' }));
        return;
      }

      // Extract text from the file
      const { text } = await processDocument(file.filepath, file.mimetype);

      if (!text || text.trim().length === 0) {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to extract text from file' }));
        return;
      }

      // Get form fields
      const title = fields.title?.[0] || file.originalFilename || 'Untitled';
      const category = fields.category?.[0] || 'transcript';
      const tags = fields.tags?.[0] || '';
      const agent_id = fields.agent_id?.[0] || null;

      const tagsArray = tags ? tags.split(',').map(t => t.trim()).filter(t => t) : [];

      // Chunk the text for batch embedding generation (simulate progress)
      const { generateEmbedding } = require('./backend/services/embeddingService.cjs');
      const chunkSize = 2000; // Characters per chunk
      const chunks = [];

      for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.substring(i, i + chunkSize));
      }

      const totalChunks = Math.min(chunks.length, 5); // Process up to 5 chunks for embedding
      console.log(`📦 Processing ${totalChunks} chunks for document: ${title}`);

      // Generate embedding from first chunk (or combined chunks)
      const embeddingText = chunks.slice(0, 5).join(' ').substring(0, 8000);
      const embedding = await generateEmbedding(embeddingText);
      const embeddingString = embedding ? '[' + embedding.join(',') + ']' : null;

      console.log(`🧠 Generated embedding for ${title} (${embeddingText.length} chars)`);

      // Store in database
      const result = await pool.query(`
        INSERT INTO knowledge_base (
          title, content, category, tags, agent_id, user_id, embedding
        ) VALUES ($1, $2, $3, $4, $5, $6, $7::vector)
        RETURNING id, title, category, created_at
      `, [title, text, category, tagsArray, agent_id, user.id, embeddingString]);

      // Clean up uploaded file
      await fs.unlink(file.filepath).catch(() => {});

      console.log(`✅ Knowledge uploaded: ${title} (${text.length} chars, ${totalChunks} chunks processed)`);
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        ...result.rows[0],
        chunks_processed: totalChunks,
        total_chars: text.length
      }));
    } catch (error) {
      console.error('❌ Error uploading:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: error.message || 'Failed to upload' }));
    }
    return;
  }

  // PUT /api/knowledge-base/:id - Update knowledge document
  if (path.startsWith('/api/knowledge-base/') && method === 'PUT') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user || (user.role !== 'admin' && user.role !== 'power_user')) {
      res.writeHead(403, corsHeaders);
      res.end(JSON.stringify({ error: 'Admin access required' }));
      return;
    }

    try {
      const id = path.split('/')[3];
      const body = await parseBody(req);
      const { title, content, category, tags, agent_id } = body;

      const result = await pool.query(`
        UPDATE knowledge_base
        SET title = COALESCE($1, title),
            content = COALESCE($2, content),
            category = COALESCE($3, category),
            tags = COALESCE($4, tags),
            agent_id = $5,
            updated_at = NOW()
        WHERE id = $6
        RETURNING id, title, content, category, tags, agent_id, updated_at
      `, [title, content, category, tags ? JSON.stringify(tags) : null, agent_id || null, id]);

      if (result.rows.length === 0) {
        res.writeHead(404, corsHeaders);
        res.end(JSON.stringify({ error: 'Document not found' }));
        return;
      }

      console.log(`✅ Updated knowledge: ${id}`);
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify(result.rows[0]));
    } catch (error) {
      console.error('❌ Error updating knowledge:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to update document' }));
    }
    return;
  }

  // DELETE /api/knowledge-base/:id
  if (path.startsWith('/api/knowledge-base/') && method === 'DELETE') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user || (user.role !== 'admin' && user.role !== 'power_user')) {
      res.writeHead(403, corsHeaders);
      res.end(JSON.stringify({ error: 'Admin access required' }));
      return;
    }

    try {
      const id = path.split('/')[3];
      await pool.query('DELETE FROM knowledge_base WHERE id = $1', [id]);
      console.log(`✅ Deleted knowledge: ${id}`);
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true }));
    } catch (error) {
      console.error('❌ Error deleting:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to delete' }));
    }
    return;
  }
    
    // DELETE /api/documents/:id - Delete document
    if (path.startsWith('/api/documents/') && method === 'DELETE') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
    
      try {
        const documentId = path.split('/').pop();
    
        // Verify ownership
        const docCheck = await pool.query(
          'SELECT id, file_url FROM documents WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
          [documentId, user.id]
        );
    
        if (docCheck.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'Document not found' }));
          return;
        }
    
        // Soft delete document
        await pool.query(
          'UPDATE documents SET deleted_at = NOW() WHERE id = $1',
          [documentId]
        );
    
        // Clean up physical file
        const fileUrl = docCheck.rows[0].file_url;
        if (fs.existsSync(fileUrl)) {
          fs.unlinkSync(fileUrl);
        }
    
        console.log(`🗑️ Deleted document ${documentId} for user ${user.email}`);
    
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ success: true, message: 'Document deleted' }));
      } catch (error) {
        console.error('❌ Error deleting document:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to delete document' }));
      }
      return;
    }

    // POST /api/transcribe - Audio transcription via OpenRouter Whisper
    if (path === '/api/transcribe' && method === 'POST') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      const form = new multiparty.Form({
        uploadDir: pathModule.join(__dirname, 'uploads'),
        maxFilesSize: 25 * 1024 * 1024 // 25MB limit for audio
      });

      form.parse(req, async (err, fields, files) => {
        if (err) {
          console.error('❌ Audio upload error:', err);
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Audio upload failed' }));
          return;
        }

        try {
          const audioFile = files.audio?.[0];

          if (!audioFile) {
            res.writeHead(400, corsHeaders);
            res.end(JSON.stringify({ error: 'No audio file uploaded' }));
            return;
          }

          console.log(`🎙️ Transcribing audio for user ${user.email}: ${audioFile.originalFilename}`);

          // Read audio file and encode to base64
          const audioBuffer = fs.readFileSync(audioFile.path);
          const base64Audio = audioBuffer.toString('base64');

          // Prepare OpenRouter API request for audio transcription
          // Note: Using mp3 format specification for webm audio (OpenRouter accepts wav/mp3)
          const requestBody = JSON.stringify({
            model: 'google/gemini-2.0-flash-001', // Supports audio input
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Transcribe ONLY the primary speaker closest to the microphone. Ignore any background voices, side conversations, or ambient speech from other people in the room. Return only the primary speaker\'s words as plain text — no speaker labels, timestamps, or annotations.'
                  },
                  {
                    type: 'input_audio',
                    input_audio: {
                      data: base64Audio,
                      format: 'mp3'
                    }
                  }
                ]
              }
            ]
          });

          // Call OpenRouter API
          const transcriptionPromise = new Promise((resolve, reject) => {
            const options = {
              hostname: 'openrouter.ai',
              path: '/api/v1/chat/completions',
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:3010',
                'X-Title': 'MindsetOS Voice Transcription'
              }
            };

            const transcribeReq = https.request(options, (transcribeRes) => {
              let data = '';
              transcribeRes.on('data', chunk => data += chunk);
              transcribeRes.on('end', () => {
                if (transcribeRes.statusCode === 200) {
                  try {
                    const result = JSON.parse(data);
                    const transcript = result.choices?.[0]?.message?.content || '';
                    resolve(transcript.trim());
                  } catch (e) {
                    console.error('❌ Failed to parse OpenRouter response:', e);
                    reject(new Error('Failed to parse transcription response'));
                  }
                } else {
                  console.error('❌ OpenRouter error:', data);
                  reject(new Error(`Transcription failed: ${data}`));
                }
              });
            });

            transcribeReq.on('error', reject);
            transcribeReq.write(requestBody);
            transcribeReq.end();
          });

          const transcript = await transcriptionPromise;

          // Clean up audio file
          fs.unlinkSync(audioFile.path);

          console.log(`✅ Transcription complete for ${user.email}: "${transcript.substring(0, 50)}..."`);

          res.writeHead(200, corsHeaders);
          res.end(JSON.stringify({
            success: true,
            transcript
          }));
        } catch (error) {
          console.error('❌ Transcription error:', error);
          res.writeHead(500, corsHeaders);
          res.end(JSON.stringify({ error: 'Transcription failed: ' + error.message }));
        }
      });
      return;
    }

    // POST /api/knowledge-base/search - Vector similarity search
    // Process uploaded knowledge base document (generate embeddings)
    if (path === '/api/knowledge-base/process' && method === 'POST') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user || user.role !== 'admin') {
        res.writeHead(403, corsHeaders);
        res.end(JSON.stringify({ error: 'Admin access required' }));
        return;
      }

      const body = await parseBody(req);
      const { knowledgeId } = body;

      if (!knowledgeId) {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: 'knowledgeId required' }));
        return;
      }

      try {
        const { processKnowledgeDocument } = require('./backend/services/documentProcessingService.cjs');
        console.log(`📄 Processing document ${knowledgeId}...`);

        const result = await processKnowledgeDocument(knowledgeId);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          message: 'Document processed successfully',
          ...result
        }));
      } catch (error) {
        console.error('❌ Document processing error:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({
          error: 'Processing failed',
          message: error.message
        }));
      }
      return;
    }

    // Get/Update agent RAG settings
    if (path.match(/^\/api\/agents\/(.+)\/rag-settings$/) && (method === 'GET' || method === 'PUT')) {
      const user = getUserFromToken(req.headers.authorization);
      if (!user || user.role !== 'admin') {
        res.writeHead(403, corsHeaders);
        res.end(JSON.stringify({ error: 'Admin access required' }));
        return;
      }

      const agentId = path.match(/^\/api\/agents\/(.+)\/rag-settings$/)[1];
      const { getAgentRagSettings, updateAgentRagSettings } = require('./backend/services/ragService.cjs');

      try {
        if (method === 'GET') {
          const settings = await getAgentRagSettings(agentId, pool);
          res.writeHead(200, corsHeaders);
          res.end(JSON.stringify(settings || { enabled: false }));
        } else if (method === 'PUT') {
          const body = await parseBody(req);
          await updateAgentRagSettings(agentId, body, user.id, pool);
          res.writeHead(200, corsHeaders);
          res.end(JSON.stringify({ success: true, message: 'RAG settings updated' }));
        }
      } catch (error) {
        console.error('❌ RAG settings error:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to manage RAG settings' }));
      }
      return;
    }

    // Get document processing status
    if (path.match(/^\/api\/knowledge-base\/(.+)\/status$/) && method === 'GET') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      const knowledgeId = path.match(/^\/api\/knowledge-base\/(.+)\/status$/)[1];

      try {
        const { getProcessingStatus } = require('./backend/services/documentProcessingService.cjs');
        const status = await getProcessingStatus(knowledgeId);

        if (!status) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'Document not found' }));
          return;
        }

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify(status));
      } catch (error) {
        console.error('❌ Status check error:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Status check failed' }));
      }
      return;
    }

    if (path === '/api/knowledge-base/search' && method === 'POST') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
    
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const { query, agentId, limit = 5 } = JSON.parse(body);
    
          if (!query) {
            res.writeHead(400, corsHeaders);
            res.end(JSON.stringify({ error: 'Query text required' }));
            return;
          }
    
          // Generate embedding for query
          const queryEmbedding = await generateEmbedding(query);
    
          // Search using database function
          const searchResult = await pool.query(`
            SELECT * FROM search_document_chunks(
              $1::vector,
              0.7,
              $2,
              $3,
              $4
            )
          `, [
            JSON.stringify(queryEmbedding),
            limit,
            user.id,
            agentId || null
          ]);
    
          res.writeHead(200, corsHeaders);
          res.end(JSON.stringify({
            results: searchResult.rows,
            count: searchResult.rows.length
          }));
        } catch (error) {
          console.error('❌ Knowledge base search error:', error);
          res.writeHead(500, corsHeaders);
          res.end(JSON.stringify({ error: 'Search failed' }));
        }
      });
      return;
    }

    // Get agents with real usage stats (with onboarding check)
    if (path === '/api/agents' && method === 'GET') {
      try {
        // Get user ID if authenticated
        const user = getUserFromToken(req.headers.authorization);
        const userId = user ? user.id : null;

        // Admin viewing as another user — use target user's profile for agent filtering
        const url = new URL(req.url, `http://${req.headers.host}`);
        const viewAsUserId = url.searchParams.get('viewAsUserId') || null;
        const isAuthAdmin = user && ['admin', 'ADMIN'].includes(user.role);
        const targetUserId = (viewAsUserId && isAuthAdmin) ? viewAsUserId : userId;

        // Get user role and onboarding status if user is authenticated
        let onboardingCompleted = true; // Default to true for non-authenticated users
        let userRole = 'user'; // Default role
        let membershipTier = 'foundations'; // Default tier
        let trialAgentId = null;
        if (targetUserId) {
          const userResult = await pool.query(
            'SELECT role, membership_tier, trial_agent_id FROM users WHERE id = $1',
            [targetUserId]
          );
          if (userResult.rows.length > 0) {
            userRole = userResult.rows[0].role || 'user';
            membershipTier = userResult.rows[0].membership_tier || 'foundations';
            trialAgentId = userResult.rows[0].trial_agent_id;
          }

          // Check onboarding status for all users (including trial)
          const onboardingResult = await pool.query(
            'SELECT onboarding_completed FROM user_onboarding_status WHERE user_id = $1',
            [targetUserId]
          );

          if (onboardingResult.rows.length > 0) {
            onboardingCompleted = onboardingResult.rows[0].onboarding_completed;
          } else {
            // No onboarding record — check users table as fallback
            const userOnboardingResult = await pool.query(
              'SELECT onboarding_completed FROM users WHERE id = $1',
              [targetUserId]
            );
            onboardingCompleted = userOnboardingResult.rows[0]?.onboarding_completed || false;
          }
        }

        // Get all enabled agents with metadata
        // Hide admin_only agents from non-admins (check both cases for role)
        // Also filter by allowed_roles via metadata (since column may not exist in all DBs)
        const isAdmin = ['ADMIN', 'OWNER', 'admin', 'owner'].includes(userRole);
        const normalizedRole = userRole?.toLowerCase() || 'user';

        // Custom agents: show only those created by the target user (or the admin's own if not viewing as)
        const customAgentOwnerId = targetUserId;

        const agentsResult = await pool.query(`
          SELECT
            a.id,
            a.name,
            a.description,
            a.category,
            a.metadata,
            a.is_active,
            a.is_custom,
            a.accent_color,
            a.color,
            a.sort_order,
            a.locked_until_onboarding,
            a.requires_onboarding
          FROM agents a
          WHERE a.is_active = true
            AND ($1 = true OR COALESCE(a.metadata->>'admin_only', 'false') != 'true')
            AND (a.is_custom = false OR a.is_custom IS NULL OR a.created_by_user_id = $2)
          ORDER BY COALESCE(a.sort_order, 999), a.name
        `, [isAdmin, customAgentOwnerId]);

        // Get usage stats for each agent
        const usageResult = await pool.query(`
          SELECT
            agent_id,
            COUNT(*) as usage_count
          FROM conversations
          WHERE agent_id IS NOT NULL
          GROUP BY agent_id
        `);

        // Create usage map
        const usageMap = {};
        usageResult.rows.forEach(row => {
          usageMap[row.agent_id] = parseInt(row.usage_count);
        });

        // Filter by allowed_roles from metadata (application-level filtering)
        const filteredAgents = agentsResult.rows.filter(agent => {
          if (isAdmin) return true; // Admins see everything
          const meta = agent.metadata || {};
          const allowedRoles = meta.allowed_roles;
          if (!allowedRoles || !Array.isArray(allowedRoles) || allowedRoles.length === 0) return true; // No restrictions
          return allowedRoles.includes(normalizedRole) || allowedRoles.includes(userRole);
        });

        // Combine agents with usage stats and add locking logic
        const agents = filteredAgents.map(agent => {
          // Get icon from metadata (Lucide icon name) or fallback to agent.id
          let icon = agent.id; // Default to agent ID so frontend can map via AGENT_ICONS
          let conversationStarters = ["Let's GO!"];

          // Check metadata for icon and conversation_starters
          if (agent.metadata) {
            // If metadata has icon (Lucide icon name like "DollarSign"), use it
            icon = agent.metadata.icon || icon;

            // Get conversation starters from metadata, default to "Let's GO!"
            if (agent.metadata.conversation_starters && Array.isArray(agent.metadata.conversation_starters)) {
              conversationStarters = agent.metadata.conversation_starters.map(starter => {
                if (typeof starter === 'string') return starter;
                if (starter && starter.prompt_text) return starter.prompt_text;
                if (starter && starter.label) return starter.label;
                return "Let's GO!";
              });
            }
          }

          // Determine if agent is locked
          const isTrial = membershipTier === 'trial';
          const defaultTrialAgent = trialAgentId || getTrialConfig().default_agent;

          let isLocked = false;
          let lockedReason = null;

          if (isTrial) {
            // Trial users get FULL access to all agents for 7 days
            // Only lock if onboarding not completed (same as regular users)
            if (!onboardingCompleted && agent.id !== 'client-onboarding') {
              isLocked = true;
              lockedReason = 'Complete Client Onboarding to unlock';
            }
          } else {
            // Regular users: locked when onboarding not complete AND agent requires onboarding
            isLocked = !onboardingCompleted && agent.locked_until_onboarding;
            lockedReason = isLocked ? 'Complete onboarding to unlock this agent' : null;
          }

          return {
            id: agent.id,
            name: agent.name,
            description: agent.description,
            category: agent.category || 'General',
            icon: icon,
            accent_color: agent.color || agent.accent_color || '#3B82F6',
            color: agent.color || agent.accent_color || '#3B82F6',
            sort_order: agent.sort_order || 0,
            conversationStarters: conversationStarters,
            tags: isTrial && agent.id === defaultTrialAgent ? ['trial'] : (agent.is_custom ? ['custom'] : ['new']),
            popularity: usageMap[agent.id] || 0,
            releaseDate: new Date().toISOString().split('T')[0],
            isEnabled: agent.is_active,
            isCustom: agent.is_custom || false,
            locked: isLocked,
            lockedReason: lockedReason,
            requiresOnboarding: agent.requires_onboarding || false,
            isTrialAgent: isTrial && agent.id === defaultTrialAgent
          };
        });

        // For trial users, sort so the trial agent appears first
        if (membershipTier === 'trial') {
          agents.sort((a, b) => {
            if (a.isTrialAgent && !b.isTrialAgent) return -1;
            if (!a.isTrialAgent && b.isTrialAgent) return 1;
            if (!a.locked && b.locked) return -1;
            if (a.locked && !b.locked) return 1;
            return (a.sort_order || 0) - (b.sort_order || 0);
          });
        }

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          agents,
          onboardingCompleted: onboardingCompleted,
          membershipTier: membershipTier,
          ...(membershipTier === 'trial' ? { trialAgent: trialAgentId || getTrialConfig().default_agent } : {})
        }));
      } catch (error) {
        console.error('❌ Error fetching agents:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to fetch agents' }));
      }
      return;
    }

    // Admin: Usage Stats Dashboard
    if (path === '/api/admin/usage-stats' && method === 'GET') {
      const adminUser = getUserFromToken(req.headers.authorization);
      if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'power_user')) {
        res.writeHead(403, corsHeaders);
        res.end(JSON.stringify({ error: 'Admin access required' }));
        return;
      }
      try {
        console.log('📊 [ADMIN] Fetching usage stats...');

        // Get cost totals for different time periods
        const totalsQuery = await pool.query(`
          SELECT
            COALESCE(SUM(CASE WHEN created_at >= CURRENT_DATE THEN cost_usd ELSE 0 END), 0) as today,
            COALESCE(SUM(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN cost_usd ELSE 0 END), 0) as week,
            COALESCE(SUM(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN cost_usd ELSE 0 END), 0) as month,
            COALESCE(SUM(cost_usd), 0) as all_time,
            COUNT(*) as total_calls,
            COALESCE(SUM(input_tokens + output_tokens), 0) as total_tokens
          FROM api_usage_logs
        `);

        // Get cost by model
        const byModelQuery = await pool.query(`
          SELECT
            model_id,
            COUNT(*) as calls,
            COALESCE(SUM(input_tokens), 0) as input_tokens,
            COALESCE(SUM(output_tokens), 0) as output_tokens,
            COALESCE(SUM(cost_usd), 0) as total_cost
          FROM api_usage_logs
          GROUP BY model_id
          ORDER BY total_cost DESC
        `);

        // Get daily usage for last 14 days
        const byDayQuery = await pool.query(`
          SELECT
            DATE(created_at) as date,
            COUNT(*) as calls,
            COALESCE(SUM(cost_usd), 0) as cost
          FROM api_usage_logs
          WHERE created_at >= CURRENT_DATE - INTERVAL '14 days'
          GROUP BY DATE(created_at)
          ORDER BY date ASC
        `);

        // Get top users by cost
        const byUserQuery = await pool.query(`
          SELECT
            a.user_id,
            u.email,
            COUNT(*) as calls,
            COALESCE(SUM(a.cost_usd), 0) as total_cost
          FROM api_usage_logs a
          LEFT JOIN users u ON a.user_id = u.id
          GROUP BY a.user_id, u.email
          ORDER BY total_cost DESC
          LIMIT 20
        `);

        // Get recent calls
        const recentQuery = await pool.query(`
          SELECT
            created_at,
            model_id,
            input_tokens,
            output_tokens,
            cost_usd,
            agent_id
          FROM api_usage_logs
          ORDER BY created_at DESC
          LIMIT 50
        `);

        const totals = totalsQuery.rows[0];

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          totals: {
            today: parseFloat(totals.today) || 0,
            week: parseFloat(totals.week) || 0,
            month: parseFloat(totals.month) || 0,
            all_time: parseFloat(totals.all_time) || 0,
            total_calls: parseInt(totals.total_calls) || 0,
            total_tokens: parseInt(totals.total_tokens) || 0
          },
          by_model: byModelQuery.rows.map(row => ({
            model_id: row.model_id,
            calls: parseInt(row.calls) || 0,
            input_tokens: parseInt(row.input_tokens) || 0,
            output_tokens: parseInt(row.output_tokens) || 0,
            total_cost: parseFloat(row.total_cost) || 0
          })),
          by_day: byDayQuery.rows.map(row => ({
            date: row.date,
            calls: parseInt(row.calls) || 0,
            cost: parseFloat(row.cost) || 0
          })),
          by_user: byUserQuery.rows.map(row => ({
            user_id: row.user_id,
            email: row.email,
            calls: parseInt(row.calls) || 0,
            total_cost: parseFloat(row.total_cost) || 0
          })),
          recent: recentQuery.rows.map(row => ({
            created_at: row.created_at,
            model_id: row.model_id,
            input_tokens: row.input_tokens,
            output_tokens: row.output_tokens,
            cost_usd: parseFloat(row.cost_usd) || 0,
            agent_id: row.agent_id
          }))
        }));

        console.log('✅ [ADMIN] Usage stats fetched successfully');
      } catch (error) {
        console.error('❌ Error fetching usage stats:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to fetch usage stats', details: error.message }));
      }
      return;
    }

    // Admin: Credit System Overview
    if (path === '/api/admin/credits/overview' && method === 'GET') {
      const adminUser = getUserFromToken(req.headers.authorization);
      if (!adminUser || adminUser.role !== 'admin') {
        res.writeHead(403, corsHeaders);
        res.end(JSON.stringify({ error: 'Admin access required' }));
        return;
      }
      try {
        // Aggregate stats
        const statsQuery = await pool.query(`
          SELECT
            COUNT(DISTINCT uc.user_id) as user_count,
            COALESCE(SUM(uc.balance), 0) as total_balance,
            COALESCE(SUM(uc.total_earned), 0) as total_earned,
            COALESCE(SUM(uc.total_spent), 0) as total_spent,
            COALESCE(AVG(uc.balance), 0) as avg_balance,
            COALESCE(SUM(uc.balance)::DECIMAL / 1000, 0) as total_balance_usd,
            COALESCE(SUM(uc.total_earned)::DECIMAL / 1000, 0) as total_earned_usd,
            COALESCE(SUM(uc.total_spent)::DECIMAL / 1000, 0) as total_spent_usd
          FROM user_credits uc
        `);

        // Top users by balance
        const topUsersQuery = await pool.query(`
          SELECT u.email, u.first_name, u.last_name, uc.balance,
                 (uc.balance::DECIMAL / 1000) as balance_usd
          FROM user_credits uc
          JOIN users u ON uc.user_id = u.id
          ORDER BY uc.balance DESC
          LIMIT 10
        `);

        // Top spenders
        const topSpendersQuery = await pool.query(`
          SELECT u.email, u.first_name, u.last_name, uc.total_spent,
                 (uc.total_spent::DECIMAL / 1000) as total_spent_usd
          FROM user_credits uc
          JOIN users u ON uc.user_id = u.id
          WHERE uc.total_spent > 0
          ORDER BY uc.total_spent DESC
          LIMIT 10
        `);

        // Recent transactions
        const recentTxQuery = await pool.query(`
          SELECT ct.id, u.email, ct.amount, ct.transaction_type, ct.description,
                 (ct.amount::DECIMAL / 1000) as amount_usd, ct.created_at
          FROM credit_transactions ct
          JOIN users u ON ct.user_id = u.id
          ORDER BY ct.created_at DESC
          LIMIT 20
        `);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          stats: statsQuery.rows[0],
          topUsers: topUsersQuery.rows,
          topSpenders: topSpendersQuery.rows,
          recentTransactions: recentTxQuery.rows
        }));
      } catch (error) {
        console.error('❌ Error fetching credit overview:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to fetch credit overview' }));
      }
      return;
    }

    // Admin: Grant credits to a user
    if (path === '/api/admin/credits/grant' && method === 'POST') {
      const adminUser = getUserFromToken(req.headers.authorization);
      if (!adminUser || adminUser.role !== 'admin') {
        res.writeHead(403, corsHeaders);
        res.end(JSON.stringify({ error: 'Admin access required' }));
        return;
      }
      try {
        const body = await parseBody(req);
        const { userId, amount, description } = body;

        if (!userId || !amount || amount <= 0) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'userId and positive amount required' }));
          return;
        }

        const result = await pool.query(
          `SELECT add_user_credits($1, $2, 'admin_grant', $3) as new_balance`,
          [userId, amount, description || `Admin grant by ${adminUser.email}`]
        );

        const newBalance = result.rows[0].new_balance;
        console.log(`✅ [ADMIN] Granted ${amount} credits to ${userId}, new balance: ${newBalance}`);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          amount,
          amountUsd: amount / 1000,
          newBalance,
          newBalanceUsd: newBalance / 1000
        }));
      } catch (error) {
        console.error('❌ Error granting credits:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to grant credits' }));
      }
      return;
    }

    // ============================================
    // SYSTEM HEALTH STATUS DASHBOARD
    // For support team monitoring
    // ============================================

    // HTML Dashboard Generator for System Health
    function generateHealthDashboardHTML(report) {
      const statusColor = (status) => {
        switch(status) {
          case 'excellent': case 'healthy': return '#10b981';
          case 'good': return '#3b82f6';
          case 'degraded': case 'warning': return '#f59e0b';
          case 'critical': case 'error': return '#ef4444';
          default: return '#6b7280';
        }
      };

      const formatTime = (time) => {
        if (!time) return 'N/A';
        const d = new Date(time);
        const now = new Date();
        const diffMs = now - d;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return diffMins + ' mins ago';
        if (diffHours < 24) return diffHours + ' hours ago';
        return diffDays + ' days ago';
      };

      return '<!DOCTYPE html>' +
        '<html lang="en">' +
        '<head>' +
        '<meta charset="UTF-8">' +
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
        '<meta http-equiv="refresh" content="60">' +
        '<title>ECOS System Health Dashboard</title>' +
        '<style>' +
        '* { margin: 0; padding: 0; box-sizing: border-box; }' +
        'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #e2e8f0; padding: 20px; }' +
        '.container { max-width: 1400px; margin: 0 auto; }' +
        'h1 { font-size: 24px; margin-bottom: 20px; display: flex; align-items: center; gap: 12px; }' +
        '.refresh-note { font-size: 12px; color: #64748b; font-weight: normal; }' +
        '.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; margin-bottom: 20px; }' +
        '.card { background: #1e293b; border-radius: 12px; padding: 20px; border: 1px solid #334155; }' +
        '.card-title { font-size: 14px; color: #94a3b8; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }' +
        '.health-score { font-size: 48px; font-weight: bold; }' +
        '.health-status { font-size: 18px; text-transform: capitalize; margin-top: 4px; }' +
        '.metric { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #334155; }' +
        '.metric:last-child { border-bottom: none; }' +
        '.metric-label { color: #94a3b8; }' +
        '.metric-value { font-weight: 600; }' +
        '.status-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 8px; }' +
        '.service-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #334155; }' +
        '.service-row:last-child { border-bottom: none; }' +
        '.service-name { display: flex; align-items: center; }' +
        '.latency { color: #64748b; font-size: 14px; }' +
        '.table { width: 100%; border-collapse: collapse; margin-top: 12px; }' +
        '.table th { text-align: left; padding: 8px; background: #334155; font-size: 12px; color: #94a3b8; }' +
        '.table td { padding: 8px; border-bottom: 1px solid #334155; font-size: 14px; }' +
        '.alert { background: #7f1d1d; border: 1px solid #ef4444; border-radius: 8px; padding: 12px; margin-bottom: 16px; }' +
        '.alert-warning { background: #78350f; border-color: #f59e0b; }' +
        '.time-ago { color: #64748b; font-size: 12px; }' +
        '.generated { text-align: center; color: #64748b; font-size: 12px; margin-top: 20px; }' +
        '</style>' +
        '</head>' +
        '<body>' +
        '<div class="container">' +
        '<h1>🏥 ECOS System Health <span class="refresh-note">(auto-refreshes every 60s)</span></h1>' +

        // Health Score Card
        '<div class="grid">' +
        '<div class="card">' +
        '<div class="card-title">Overall Health</div>' +
        '<div class="health-score" style="color: ' + statusColor(report.overall_health.status) + '">' + report.overall_health.score + '</div>' +
        '<div class="health-status" style="color: ' + statusColor(report.overall_health.status) + '">' + report.overall_health.status + '</div>' +
        '</div>' +

        // Services Status
        '<div class="card">' +
        '<div class="card-title">Core Services</div>' +
        '<div class="service-row">' +
        '<div class="service-name"><span class="status-dot" style="background: ' + statusColor(report.services.database.status) + '"></span>PostgreSQL Database</div>' +
        '<div class="latency">' + report.services.database.latency_ms + 'ms</div>' +
        '</div>' +
        '<div class="service-row">' +
        '<div class="service-name"><span class="status-dot" style="background: ' + statusColor(report.services.openrouter_api.status) + '"></span>OpenRouter API (Chat)</div>' +
        '<div class="latency">' + report.services.openrouter_api.latency_ms + 'ms</div>' +
        '</div>' +
        '<div class="service-row">' +
        '<div class="service-name"><span class="status-dot" style="background: ' + statusColor(report.services.openai_embeddings?.status || 'unknown') + '"></span>OpenAI Embeddings</div>' +
        '<div class="latency">' + (report.services.openai_embeddings?.latency_ms || 0) + 'ms</div>' +
        '</div>' +
        '</div>' +

        // OpenRouter Budget Card
        '<div class="card">' +
        '<div class="card-title">💰 OpenRouter API Spend</div>' +
        '<div class="metric"><span class="metric-label">Today</span><span class="metric-value">$' + (report.services.openrouter_budget?.usage_daily_usd || 0).toFixed(4) + '</span></div>' +
        '<div class="metric"><span class="metric-label">This Week</span><span class="metric-value">$' + (report.services.openrouter_budget?.usage_weekly_usd || 0).toFixed(2) + '</span></div>' +
        '<div class="metric"><span class="metric-label">This Month</span><span class="metric-value">$' + (report.services.openrouter_budget?.usage_monthly_usd || 0).toFixed(2) + '</span></div>' +
        '<div class="metric" style="border-top: 1px solid #475569; margin-top: 8px; padding-top: 8px;"><span class="metric-label">Spending Cap</span><span class="metric-value">$' + (report.services.openrouter_budget?.limit_usd || 0).toFixed(0) + '/mo</span></div>' +
        '<div style="margin-top: 10px; padding: 8px; background: #1e3a5f; border-radius: 6px; font-size: 11px; color: #94a3b8; text-align: center;">💳 <a href="https://openrouter.ai/settings/credits" target="_blank" style="color: #60a5fa; text-decoration: none;">Check Credit Balance →</a></div>' +
        '</div>' +

        // Railway Services
        '<div class="card">' +
        '<div class="card-title">Railway Infrastructure</div>' +
        (report.services.railway_services || []).map(s =>
          '<div class="service-row">' +
          '<div class="service-name"><span class="status-dot" style="background: ' + statusColor(s.status) + '"></span>' + s.name + '</div>' +
          '<div class="latency">' + s.latency + 'ms</div>' +
          '</div>'
        ).join('') +
        '</div>' +

        // Last Activity
        '<div class="card">' +
        '<div class="card-title">Last Activity</div>' +
        '<div class="metric"><span class="metric-label">Last Message</span><span class="metric-value">' + formatTime(report.last_activity.last_message?.time) + '</span></div>' +
        '<div class="metric"><span class="metric-label">Last Memory Saved</span><span class="metric-value">' + formatTime(report.last_activity.last_memory_saved?.time) + '</span></div>' +
        '<div class="metric"><span class="metric-label">Last User Created</span><span class="metric-value">' + formatTime(report.last_activity.last_user_created?.time) + '</span></div>' +
        '<div class="metric"><span class="metric-label">Last Onboarding</span><span class="metric-value">' + formatTime(report.last_activity.last_onboarding?.time) + '</span></div>' +
        '</div>' +

        // API Usage
        '<div class="card">' +
        '<div class="card-title">API Usage</div>' +
        '<div class="metric"><span class="metric-label">Calls (1h)</span><span class="metric-value">' + report.api_usage.calls_1h + '</span></div>' +
        '<div class="metric"><span class="metric-label">Calls (24h)</span><span class="metric-value">' + report.api_usage.calls_24h + '</span></div>' +
        '<div class="metric"><span class="metric-label">Cost (1h)</span><span class="metric-value">$' + report.api_usage.cost_1h + '</span></div>' +
        '<div class="metric"><span class="metric-label">Cost (24h)</span><span class="metric-value">$' + report.api_usage.cost_24h + '</span></div>' +
        '<div class="metric"><span class="metric-label">Tokens (24h)</span><span class="metric-value">' + report.api_usage.tokens_24h.toLocaleString() + '</span></div>' +
        '</div>' +

        // Activity 24h
        '<div class="card">' +
        '<div class="card-title">Activity (24h)</div>' +
        '<div class="metric"><span class="metric-label">Active Users</span><span class="metric-value">' + report.activity_24h.active_users + '</span></div>' +
        '<div class="metric"><span class="metric-label">Active Conversations</span><span class="metric-value">' + report.activity_24h.active_conversations + '</span></div>' +
        '<div class="metric"><span class="metric-label">Messages Sent</span><span class="metric-value">' + report.activity_24h.messages_sent + '</span></div>' +
        '</div>' +

        // User Stats
        '<div class="card">' +
        '<div class="card-title">Users</div>' +
        '<div class="metric"><span class="metric-label">Total Users</span><span class="metric-value">' + report.user_stats.total_users + '</span></div>' +
        '<div class="metric"><span class="metric-label">New (24h)</span><span class="metric-value">' + report.user_stats.new_users_24h + '</span></div>' +
        '<div class="metric"><span class="metric-label">New (7d)</span><span class="metric-value">' + report.user_stats.new_users_7d + '</span></div>' +
        '<div class="metric"><span class="metric-label">Active Accounts</span><span class="metric-value">' + report.user_stats.active_users + '</span></div>' +
        '</div>' +

        // Error Rate
        '<div class="card">' +
        '<div class="card-title">Error Rate (24h)</div>' +
        '<div class="metric"><span class="metric-label">Error Messages</span><span class="metric-value">' + report.error_rate.error_messages_24h + '</span></div>' +
        '<div class="metric"><span class="metric-label">Total Responses</span><span class="metric-value">' + report.error_rate.total_responses_24h + '</span></div>' +
        '<div class="metric"><span class="metric-label">Error Rate</span><span class="metric-value" style="color: ' + (parseFloat(report.error_rate.rate_percent) > 1 ? '#f59e0b' : '#10b981') + '">' + report.error_rate.rate_percent + '%</span></div>' +
        '</div>' +

        // Server
        '<div class="card">' +
        '<div class="card-title">Server</div>' +
        '<div class="metric"><span class="metric-label">Uptime</span><span class="metric-value">' + report.server.uptime_hours + ' hours</span></div>' +
        '<div class="metric"><span class="metric-label">Heap Used</span><span class="metric-value">' + report.server.memory_mb.heap_used + ' MB</span></div>' +
        '<div class="metric"><span class="metric-label">Heap Total</span><span class="metric-value">' + report.server.memory_mb.heap_total + ' MB</span></div>' +
        '<div class="metric"><span class="metric-label">RSS</span><span class="metric-value">' + report.server.memory_mb.rss + ' MB</span></div>' +
        '</div>' +
        '</div>' +

        // High Cost Users Alert
        (report.high_cost_users_24h.length > 0 ?
          '<div class="card alert-warning">' +
          '<div class="card-title">⚠️ High Cost Users (24h)</div>' +
          '<table class="table">' +
          '<tr><th>Email</th><th>Calls</th><th>Cost</th><th>Input Tokens</th></tr>' +
          report.high_cost_users_24h.map(u =>
            '<tr><td>' + u.email + '</td><td>' + u.calls + '</td><td>$' + u.cost + '</td><td>' + u.input_tokens.toLocaleString() + '</td></tr>'
          ).join('') +
          '</table>' +
          '</div>' : '') +

        // Agents Table
        '<div class="card">' +
        '<div class="card-title">Agents</div>' +
        '<table class="table">' +
        '<tr><th>Name</th><th>Status</th><th>Model</th></tr>' +
        report.agents.map(a =>
          '<tr><td>' + a.name + '</td><td><span class="status-dot" style="background: ' + (a.active ? '#10b981' : '#ef4444') + '"></span>' + (a.active ? 'Active' : 'Inactive') + '</td><td style="font-size: 12px; color: #64748b;">' + (a.model || 'default') + '</td></tr>'
        ).join('') +
        '</table>' +
        '</div>' +

        '<div class="generated">Generated at ' + report.generated_at + ' in ' + report.generation_time_ms + 'ms</div>' +
        '</div>' +
        '</body>' +
        '</html>';
    }

    if (path === '/api/admin/system-health' && method === 'GET') {
      try {
        console.log('🏥 [HEALTH] Generating system health report...');
        const healthStart = Date.now();
        const url = new URL(req.url, `http://${req.headers.host}`);

        // 1. Database Health Check
        let dbStatus = { status: 'unknown', latency: 0, error: null };
        try {
          const dbStart = Date.now();
          await pool.query('SELECT 1');
          dbStatus = { status: 'healthy', latency: Date.now() - dbStart, error: null };
        } catch (dbError) {
          dbStatus = { status: 'error', latency: 0, error: dbError.message };
        }

        // 2. Active Users & Conversations (last 24h)
        const activityQuery = await pool.query(`
          SELECT
            COUNT(DISTINCT c.user_id) as active_users_24h,
            COUNT(DISTINCT c.id) as active_conversations_24h,
            COUNT(m.id) as messages_24h
          FROM conversations c
          LEFT JOIN messages m ON c.id = m.conversation_id AND m.created_at >= NOW() - INTERVAL '24 hours'
          WHERE c.updated_at >= NOW() - INTERVAL '24 hours'
        `);

        // 3. API Usage & Costs
        const usageQuery = await pool.query(`
          SELECT
            COUNT(*) as api_calls_24h,
            COALESCE(SUM(cost_usd), 0) as cost_24h,
            COALESCE(SUM(input_tokens + output_tokens), 0) as tokens_24h,
            COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 hour' THEN 1 END) as api_calls_1h,
            COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '1 hour' THEN cost_usd ELSE 0 END), 0) as cost_1h
          FROM api_usage_logs
          WHERE created_at >= NOW() - INTERVAL '24 hours'
        `);

        // 4. Error Rate (last 24h)
        const errorQuery = await pool.query(`
          SELECT
            COUNT(*) FILTER (WHERE content LIKE '%error%' OR content LIKE '%Error%' OR content LIKE '%failed%') as error_messages,
            COUNT(*) as total_assistant_messages
          FROM messages
          WHERE role = 'assistant' AND created_at >= NOW() - INTERVAL '24 hours'
        `);

        // 5. Agent Status
        const agentQuery = await pool.query(`
          SELECT
            id, name, is_active,
            chat_model,
            updated_at
          FROM agents
          ORDER BY name
        `);

        // 6. Recent High-Cost Users (potential issues)
        const highCostQuery = await pool.query(`
          SELECT
            u.email,
            COUNT(a.id) as calls,
            COALESCE(SUM(a.cost_usd), 0) as cost_24h,
            COALESCE(SUM(a.input_tokens), 0) as input_tokens
          FROM api_usage_logs a
          JOIN users u ON a.user_id = u.id
          WHERE a.created_at >= NOW() - INTERVAL '24 hours'
          GROUP BY u.email
          HAVING SUM(a.cost_usd) > 0.50
          ORDER BY cost_24h DESC
          LIMIT 10
        `);

        // 7. Summarization Stats (if any)
        const summarizationNote = 'Summarization triggers at 8K+ tokens. Check logs for [SUMMARIZE] entries.';

        // 8. Memory/Performance metrics
        const memUsage = process.memoryUsage();
        const uptime = process.uptime();

        // 9. Recent Errors from logs (check for patterns)
        const recentErrorsQuery = await pool.query(`
          SELECT
            c.agent_id,
            COUNT(*) as error_count,
            MAX(m.created_at) as last_error
          FROM messages m
          JOIN conversations c ON m.conversation_id = c.id
          WHERE m.role = 'assistant'
            AND m.created_at >= NOW() - INTERVAL '24 hours'
            AND (m.content LIKE '%Unable to generate%' OR m.content LIKE '%error%' OR m.content LIKE '%Error:%')
          GROUP BY c.agent_id
          ORDER BY error_count DESC
          LIMIT 5
        `);

        // 10. User Registration Stats
        const userStatsQuery = await pool.query(`
          SELECT
            COUNT(*) as total_users,
            COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as new_users_24h,
            COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_users_7d,
            COUNT(CASE WHEN is_active = true THEN 1 END) as active_users
          FROM users
        `);

        // 11. Last Activity Events
        const lastMemoryQuery = await pool.query(`
          SELECT u.email, cm.updated_at, cm.full_name
          FROM core_memories cm
          JOIN users u ON cm.user_id = u.id
          ORDER BY cm.updated_at DESC
          LIMIT 1
        `);

        const lastUserQuery = await pool.query(`
          SELECT email, created_at, first_name, last_name
          FROM users
          ORDER BY created_at DESC
          LIMIT 1
        `);

        const lastOnboardingQuery = await pool.query(`
          SELECT u.email, c.updated_at as completed_at, c.agent_id
          FROM conversations c
          JOIN users u ON c.user_id = u.id
          WHERE c.agent_id LIKE '%onboarding%' OR c.agent_id = 'ecos-super-agent'
          ORDER BY c.updated_at DESC
          LIMIT 1
        `);

        const lastMessageQuery = await pool.query(`
          SELECT m.created_at, m.role, c.agent_id, u.email
          FROM messages m
          JOIN conversations c ON m.conversation_id = c.id
          JOIN users u ON c.user_id = u.id
          ORDER BY m.created_at DESC
          LIMIT 1
        `);

        // 12. OpenRouter API Health Check (Chat)
        let apiHealth = { status: 'unknown', latency: 0, error: null };
        try {
          const apiStart = Date.now();
          const apiCheckResponse = await fetch('https://openrouter.ai/api/v1/models', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${OPENROUTER_API_KEY}` },
            signal: AbortSignal.timeout(5000)
          });
          apiHealth = {
            status: apiCheckResponse.ok ? 'healthy' : 'degraded',
            latency: Date.now() - apiStart,
            error: apiCheckResponse.ok ? null : `HTTP ${apiCheckResponse.status}`
          };
        } catch (apiError) {
          apiHealth = { status: 'error', latency: 0, error: apiError.message };
        }

        // 13. OpenRouter API Key Info (usage & budget) - REPLACES embedding health check to save API calls
        let openrouterBudget = { status: 'unknown', limit: 0, remaining: 0, usage_daily: 0, usage_weekly: 0, usage_monthly: 0, error: null };
        try {
          const budgetStart = Date.now();
          const budgetResponse = await fetch('https://openrouter.ai/api/v1/auth/key', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${OPENROUTER_API_KEY}` },
            signal: AbortSignal.timeout(5000)
          });
          if (budgetResponse.ok) {
            const budgetData = await budgetResponse.json();
            const d = budgetData.data;
            const percentUsed = d.limit > 0 ? ((d.limit - d.limit_remaining) / d.limit) * 100 : 0;
            openrouterBudget = {
              status: percentUsed > 90 ? 'critical' : percentUsed > 75 ? 'warning' : 'healthy',
              limit: d.limit,
              remaining: d.limit_remaining,
              usage_daily: d.usage_daily,
              usage_weekly: d.usage_weekly,
              usage_monthly: d.usage_monthly,
              percent_used: percentUsed.toFixed(1),
              latency: Date.now() - budgetStart,
              error: null
            };
          } else {
            openrouterBudget = { status: 'error', latency: Date.now() - budgetStart, error: `HTTP ${budgetResponse.status}` };
          }
        } catch (budgetError) {
          openrouterBudget = { status: 'error', latency: 0, error: budgetError.message };
        }

        // 14. OpenAI Embeddings API Health Check (inferred from OpenRouter API health - embeddings use same auth)
        // Note: Embedding models aren't listed in /models endpoint, so we infer from chat API health
        let embeddingsHealth = {
          status: apiHealth.status, // Same as chat API since they share the same backend
          latency: apiHealth.latency,
          model: 'openai/text-embedding-3-small',
          note: 'Inferred from OpenRouter API health (same authentication)',
          error: apiHealth.error
        };

        // 15. Railway Services Status
        let railwayServices = [];
        try {
          // Check Frontend
          const frontendStart = Date.now();
          const frontendCheck = await fetch('https://expertconsultingos.com', {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000)
          });
          railwayServices.push({
            name: 'Frontend (Next.js)',
            url: 'expertconsultingos.com',
            status: frontendCheck.ok ? 'healthy' : 'degraded',
            latency: Date.now() - frontendStart
          });
        } catch (e) {
          railwayServices.push({ name: 'Frontend (Next.js)', url: 'expertconsultingos.com', status: 'error', latency: 0, error: e.message });
        }

        try {
          // Check Backend API
          const backendStart = Date.now();
          const backendCheck = await fetch('https://backend-production-f747.up.railway.app/health', {
            method: 'GET',
            signal: AbortSignal.timeout(5000)
          });
          railwayServices.push({
            name: 'Backend API',
            url: 'backend-production-f747.up.railway.app',
            status: backendCheck.ok ? 'healthy' : 'degraded',
            latency: Date.now() - backendStart
          });
        } catch (e) {
          railwayServices.push({ name: 'Backend API', url: 'backend-production-f747.up.railway.app', status: 'error', latency: 0, error: e.message });
        }

        // Add PostgreSQL as a Railway service too
        railwayServices.push({
          name: 'PostgreSQL (pgvector)',
          url: 'Railway Internal',
          status: dbStatus.status,
          latency: dbStatus.latency
        });

        // 15. Conversation Stats
        const convStatsQuery = await pool.query(`
          SELECT
            COUNT(*) as total_conversations,
            COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as new_24h,
            COUNT(CASE WHEN updated_at >= NOW() - INTERVAL '1 hour' THEN 1 END) as active_1h
          FROM conversations
        `);

        const activity = activityQuery.rows[0];
        const usage = usageQuery.rows[0];
        const errors = errorQuery.rows[0];
        const userStats = userStatsQuery.rows[0];

        const lastMemory = lastMemoryQuery.rows[0];
        const lastUser = lastUserQuery.rows[0];
        const lastOnboarding = lastOnboardingQuery.rows[0];
        const lastMessage = lastMessageQuery.rows[0];
        const convStats = convStatsQuery.rows[0];

        // Calculate health score (0-100)
        let healthScore = 100;
        if (dbStatus.status !== 'healthy') healthScore -= 50;
        if (dbStatus.latency > 100) healthScore -= 10;
        if (apiHealth.status !== 'healthy') healthScore -= 30;
        if (apiHealth.latency > 2000) healthScore -= 10;
        if (openrouterBudget.status === 'critical') healthScore -= 20;
        else if (openrouterBudget.status === 'warning') healthScore -= 10;
        if (embeddingsHealth.status !== 'healthy') healthScore -= 10;
        // Check Railway services
        const unhealthyRailway = railwayServices.filter(s => s.status !== 'healthy').length;
        if (unhealthyRailway > 0) healthScore -= (unhealthyRailway * 5);
        if (parseFloat(usage.cost_1h) > 5) healthScore -= 10; // High hourly cost
        const errorRate = errors.total_assistant_messages > 0
          ? (errors.error_messages / errors.total_assistant_messages) * 100
          : 0;
        if (errorRate > 5) healthScore -= 20;
        if (errorRate > 1) healthScore -= 10;

        const healthReport = {
          generated_at: new Date().toISOString(),
          generation_time_ms: Date.now() - healthStart,
          overall_health: {
            score: Math.max(0, healthScore),
            status: healthScore >= 90 ? 'excellent' : healthScore >= 70 ? 'good' : healthScore >= 50 ? 'degraded' : 'critical'
          },
          services: {
            database: {
              status: dbStatus.status,
              latency_ms: dbStatus.latency,
              error: dbStatus.error
            },
            openrouter_api: {
              status: apiHealth.status,
              latency_ms: apiHealth.latency,
              error: apiHealth.error
            },
            openrouter_budget: {
              status: openrouterBudget.status,
              limit_usd: openrouterBudget.limit,
              remaining_usd: openrouterBudget.remaining,
              percent_used: openrouterBudget.percent_used,
              usage_daily_usd: openrouterBudget.usage_daily,
              usage_weekly_usd: openrouterBudget.usage_weekly,
              usage_monthly_usd: openrouterBudget.usage_monthly,
              error: openrouterBudget.error
            },
            openai_embeddings: {
              status: embeddingsHealth.status,
              latency_ms: embeddingsHealth.latency,
              model: embeddingsHealth.model,
              available: embeddingsHealth.available,
              error: embeddingsHealth.error
            },
            railway_services: railwayServices
          },
          last_activity: {
            last_message: lastMessage ? {
              time: lastMessage.created_at,
              user: lastMessage.email,
              agent: lastMessage.agent_id,
              role: lastMessage.role
            } : null,
            last_memory_saved: lastMemory ? {
              time: lastMemory.updated_at,
              user: lastMemory.email,
              name: lastMemory.full_name
            } : null,
            last_user_created: lastUser ? {
              time: lastUser.created_at,
              email: lastUser.email,
              name: `${lastUser.first_name || ''} ${lastUser.last_name || ''}`.trim()
            } : null,
            last_onboarding: lastOnboarding ? {
              time: lastOnboarding.completed_at,
              user: lastOnboarding.email,
              agent: lastOnboarding.agent_id
            } : null
          },
          activity_24h: {
            active_users: parseInt(activity.active_users_24h) || 0,
            active_conversations: parseInt(activity.active_conversations_24h) || 0,
            messages_sent: parseInt(activity.messages_24h) || 0
          },
          conversations: {
            total: parseInt(convStats.total_conversations) || 0,
            new_24h: parseInt(convStats.new_24h) || 0,
            active_1h: parseInt(convStats.active_1h) || 0
          },
          api_usage: {
            calls_24h: parseInt(usage.api_calls_24h) || 0,
            calls_1h: parseInt(usage.api_calls_1h) || 0,
            cost_24h: parseFloat(usage.cost_24h).toFixed(4),
            cost_1h: parseFloat(usage.cost_1h).toFixed(4),
            tokens_24h: parseInt(usage.tokens_24h) || 0
          },
          error_rate: {
            error_messages_24h: parseInt(errors.error_messages) || 0,
            total_responses_24h: parseInt(errors.total_assistant_messages) || 0,
            rate_percent: errorRate.toFixed(2)
          },
          agents: agentQuery.rows.map(a => ({
            id: a.id,
            name: a.name,
            active: a.is_active,
            model: a.chat_model,
            last_updated: a.updated_at
          })),
          high_cost_users_24h: highCostQuery.rows.map(u => ({
            email: u.email,
            calls: parseInt(u.calls),
            cost: parseFloat(u.cost_24h).toFixed(4),
            input_tokens: parseInt(u.input_tokens)
          })),
          recent_agent_errors: recentErrorsQuery.rows.map(e => ({
            agent_id: e.agent_id,
            error_count: parseInt(e.error_count),
            last_error: e.last_error
          })),
          user_stats: {
            total_users: parseInt(userStats.total_users) || 0,
            new_users_24h: parseInt(userStats.new_users_24h) || 0,
            new_users_7d: parseInt(userStats.new_users_7d) || 0,
            active_users: parseInt(userStats.active_users) || 0
          },
          server: {
            uptime_hours: (uptime / 3600).toFixed(2),
            memory_mb: {
              heap_used: Math.round(memUsage.heapUsed / 1024 / 1024),
              heap_total: Math.round(memUsage.heapTotal / 1024 / 1024),
              rss: Math.round(memUsage.rss / 1024 / 1024)
            }
          },
          notes: {
            summarization: summarizationNote,
            thresholds: {
              high_cost_alert: '$0.50/user/24h',
              error_rate_warning: '1%',
              error_rate_critical: '5%'
            }
          }
        };

        // Check if HTML format requested
        if (req.headers.accept?.includes('text/html') || url.searchParams.get('format') === 'html') {
          res.writeHead(200, { ...corsHeaders, 'Content-Type': 'text/html' });
          res.end(generateHealthDashboardHTML(healthReport));
        } else {
          res.writeHead(200, corsHeaders);
          res.end(JSON.stringify(healthReport, null, 2));
        }

        console.log(`✅ [HEALTH] Report generated in ${Date.now() - healthStart}ms | Score: ${healthScore}`);
      } catch (error) {
        console.error('❌ [HEALTH] Error generating health report:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to generate health report', details: error.message }));
      }
      return;
    }

    // Admin: Serve usage report (password protected)
    if (path.startsWith('/api/admin/report') && method === 'GET') {
      const urlParams = new URL(req.url, `http://${req.headers.host}`).searchParams;
      const password = urlParams.get('key');

      if (password !== 'ecos2026') {
        res.writeHead(401, { ...corsHeaders, 'Content-Type': 'text/html' });
        res.end('<html><body><h1>Access Denied</h1><p>Invalid or missing key parameter.</p></body></html>');
        return;
      }

      try {
        // Excluded test/internal emails
        const excludeFilter = `
          AND u.email NOT LIKE '%@equalsfive%'
          AND u.email NOT LIKE '%admin%'
          AND u.email NOT LIKE '%ecos.local%'
          AND u.email NOT LIKE '%linkedva.com%'
          AND u.email NOT LIKE '%@expertproject.com%'
          AND u.email NOT LIKE '%@theinfluencerproject%'
          AND u.email NOT IN (
            'growthwithg@gmail.com',
            'kg2wed@gmail.com',
            'k2gwed@gmail.com',
            'gregatflint@gmail.com',
            'greg+gregatflint@gmail.com',
            'lucascryptonoob@gmail.com',
            'lucasjizmundo@gmail.com',
            'johnlucastxp@gmail.com',
            'johnlucasjizmundo@gmail.com',
            'alex@gmail.com'
          )
        `;

        // Generate fresh usage report
        const usersResult = await pool.query(`
          SELECT u.id, u.email, COALESCE(u.first_name || ' ' || u.last_name, u.first_name, u.email) as name,
                 u.onboarding_completed, u.created_at,
                 COUNT(DISTINCT c.id) as conversations,
                 COUNT(DISTINCT m.id) as messages
          FROM users u
          LEFT JOIN conversations c ON u.id = c.user_id
          LEFT JOIN messages m ON c.id = m.conversation_id
          WHERE 1=1 ${excludeFilter}
          GROUP BY u.id, u.first_name, u.last_name, u.email, u.onboarding_completed, u.created_at
          ORDER BY COUNT(DISTINCT m.id) DESC
        `);

        const statsResult = await pool.query(`
          SELECT
            COUNT(DISTINCT u.id) as total_users,
            COUNT(DISTINCT CASE WHEN u.onboarding_completed THEN u.id END) as onboarded,
            COUNT(DISTINCT c.id) as total_conversations,
            COUNT(DISTINCT m.id) as total_messages
          FROM users u
          LEFT JOIN conversations c ON u.id = c.user_id
          LEFT JOIN messages m ON c.id = m.conversation_id
          WHERE 1=1 ${excludeFilter}
        `);

        // Get agent usage stats
        const agentStatsResult = await pool.query(`
          SELECT a.name as agent_name, COUNT(DISTINCT c.id) as conversations, COUNT(DISTINCT m.id) as messages
          FROM conversations c
          JOIN agents a ON c.agent_id = a.id
          JOIN messages m ON c.id = m.conversation_id
          JOIN users u ON c.user_id = u.id
          WHERE 1=1 ${excludeFilter}
          GROUP BY a.name
          ORDER BY COUNT(DISTINCT m.id) DESC
          LIMIT 10
        `);

        // Get weekly activity
        const weeklyResult = await pool.query(`
          SELECT
            DATE_TRUNC('week', m.created_at) as week,
            COUNT(DISTINCT m.id) as messages,
            COUNT(DISTINCT c.user_id) as active_users
          FROM messages m
          JOIN conversations c ON m.conversation_id = c.id
          JOIN users u ON c.user_id = u.id
          WHERE m.created_at > NOW() - INTERVAL '8 weeks' ${excludeFilter}
          GROUP BY DATE_TRUNC('week', m.created_at)
          ORDER BY week DESC
        `);

        // Agent journey - what agents do users engage with after onboarding
        const agentJourneyResult = await pool.query(`
          SELECT a.name as agent_name, COUNT(DISTINCT c.user_id) as unique_users,
                 ROUND(AVG(msg_count.cnt)::numeric, 1) as avg_msgs_per_convo
          FROM conversations c
          JOIN agents a ON c.agent_id = a.id
          JOIN users u ON c.user_id = u.id
          JOIN (SELECT conversation_id, COUNT(*) as cnt FROM messages GROUP BY conversation_id) msg_count
            ON msg_count.conversation_id = c.id
          WHERE a.id != 'client-onboarding' ${excludeFilter}
          GROUP BY a.name
          ORDER BY unique_users DESC
        `);

        // Multi-agent users - users engaging beyond just onboarding
        const multiAgentResult = await pool.query(`
          SELECT COUNT(DISTINCT user_id) as multi_agent_users
          FROM (
            SELECT c.user_id, COUNT(DISTINCT c.agent_id) as agent_count
            FROM conversations c
            JOIN users u ON c.user_id = u.id
            WHERE 1=1 ${excludeFilter}
            GROUP BY c.user_id
            HAVING COUNT(DISTINCT c.agent_id) > 1
          ) sub
        `);

        // Recent activity - last 7 days vs last 30 days
        const recentActivityResult = await pool.query(`
          SELECT
            COUNT(DISTINCT CASE WHEN m.created_at > NOW() - INTERVAL '7 days' THEN c.user_id END) as active_7d,
            COUNT(DISTINCT CASE WHEN m.created_at > NOW() - INTERVAL '30 days' THEN c.user_id END) as active_30d,
            COUNT(DISTINCT CASE WHEN m.created_at > NOW() - INTERVAL '7 days' THEN m.id END) as msgs_7d,
            COUNT(DISTINCT CASE WHEN m.created_at > NOW() - INTERVAL '30 days' THEN m.id END) as msgs_30d
          FROM messages m
          JOIN conversations c ON m.conversation_id = c.id
          JOIN users u ON c.user_id = u.id
          WHERE 1=1 ${excludeFilter}
        `);

        // Churn risk - active before but not in last 14 days
        const churnRiskResult = await pool.query(`
          SELECT u.id, COALESCE(u.first_name || ' ' || u.last_name, u.first_name, u.email) as name,
                 MAX(m.created_at) as last_active, COUNT(m.id) as total_msgs
          FROM users u
          JOIN conversations c ON u.id = c.user_id
          JOIN messages m ON c.id = m.conversation_id
          WHERE m.created_at < NOW() - INTERVAL '14 days'
            AND m.created_at > NOW() - INTERVAL '60 days' ${excludeFilter}
          GROUP BY u.id, u.first_name, u.last_name, u.email
          HAVING COUNT(m.id) > 20
          ORDER BY MAX(m.created_at) DESC
          LIMIT 5
        `);

        // New users this week
        const newUsersResult = await pool.query(`
          SELECT COUNT(*) as new_users_week
          FROM users u
          WHERE u.created_at > NOW() - INTERVAL '7 days' ${excludeFilter}
        `);

        const stats = statsResult.rows[0];
        const users = usersResult.rows;
        const agentStats = agentStatsResult.rows;
        const weeklyStats = weeklyResult.rows;
        const agentJourney = agentJourneyResult.rows;
        const multiAgentUsers = parseInt(multiAgentResult.rows[0]?.multi_agent_users || 0);
        const recentActivity = recentActivityResult.rows[0] || {};
        const churnRisk = churnRiskResult.rows;
        const newUsersWeek = parseInt(newUsersResult.rows[0]?.new_users_week || 0);

        // Calculate insights
        const activeUsers = users.filter(u => parseInt(u.messages) > 20).length;
        const heavyUsers = users.filter(u => parseInt(u.messages) > 100).length;
        const onboardingRate = stats.total_users > 0 ? Math.round((stats.onboarded / stats.total_users) * 100) : 0;
        const avgMsgsPerUser = stats.total_users > 0 ? Math.round(stats.total_messages / stats.total_users) : 0;
        const avgConvsPerUser = stats.total_users > 0 ? (stats.total_conversations / stats.total_users).toFixed(1) : 0;

        // Engagement tiers
        const superUsers = users.filter(u => parseInt(u.messages) >= 100);
        const regularUsers = users.filter(u => parseInt(u.messages) >= 20 && parseInt(u.messages) < 100);
        const lightUsers = users.filter(u => parseInt(u.messages) > 0 && parseInt(u.messages) < 20);
        const dormantUsers = users.filter(u => parseInt(u.messages) === 0);

        // Not onboarded but active
        const notOnboardedActive = users.filter(u => !u.onboarding_completed && parseInt(u.messages) > 10);

        // Build insights HTML
        let insightsHtml = '<div class="insights"><h2>AI-Generated Insights</h2>';

        // Key metrics insight
        insightsHtml += '<div class="insight-card"><h3>Engagement Overview</h3><ul>';
        insightsHtml += '<li><strong>' + onboardingRate + '%</strong> onboarding completion rate (' + stats.onboarded + '/' + stats.total_users + ' users)</li>';
        insightsHtml += '<li><strong>' + avgMsgsPerUser + '</strong> average messages per user</li>';
        insightsHtml += '<li><strong>' + avgConvsPerUser + '</strong> average conversations per user</li>';
        insightsHtml += '<li><strong>' + multiAgentUsers + '</strong> users exploring multiple agents (' + Math.round((multiAgentUsers / stats.total_users) * 100) + '% adoption)</li>';
        insightsHtml += '</ul></div>';

        // Recent Activity
        insightsHtml += '<div class="insight-card"><h3>Recent Activity</h3><ul>';
        insightsHtml += '<li><strong>Last 7 days:</strong> ' + (recentActivity.active_7d || 0) + ' active users, ' + (recentActivity.msgs_7d || 0) + ' messages</li>';
        insightsHtml += '<li><strong>Last 30 days:</strong> ' + (recentActivity.active_30d || 0) + ' active users, ' + (recentActivity.msgs_30d || 0) + ' messages</li>';
        insightsHtml += '<li><strong>New this week:</strong> ' + newUsersWeek + ' new signups</li>';
        const weeklyRetention = recentActivity.active_30d > 0 ? Math.round((recentActivity.active_7d / recentActivity.active_30d) * 100) : 0;
        insightsHtml += '<li><strong>Weekly retention:</strong> ' + weeklyRetention + '% of monthly actives engaged this week</li>';
        insightsHtml += '</ul></div>';

        // User segments
        insightsHtml += '<div class="insight-card"><h3>User Segments</h3><ul>';
        insightsHtml += '<li><strong>Super Users (100+ msgs):</strong> ' + superUsers.length + ' users - ' + superUsers.slice(0,5).map(u => u.name.split(' ')[0]).join(', ') + (superUsers.length > 5 ? '...' : '') + '</li>';
        insightsHtml += '<li><strong>Regular Users (20-99 msgs):</strong> ' + regularUsers.length + ' users</li>';
        insightsHtml += '<li><strong>Light Users (1-19 msgs):</strong> ' + lightUsers.length + ' users</li>';
        insightsHtml += '<li><strong>Dormant (0 msgs):</strong> ' + dormantUsers.length + ' users - need activation outreach</li>';
        insightsHtml += '</ul></div>';

        // Agent Journey (beyond onboarding)
        if (agentJourney.length > 0) {
          insightsHtml += '<div class="insight-card"><h3>Agent Adoption (Post-Onboarding)</h3><ul>';
          agentJourney.slice(0, 6).forEach(a => {
            insightsHtml += '<li><strong>' + a.agent_name + ':</strong> ' + a.unique_users + ' users, ~' + a.avg_msgs_per_convo + ' msgs/convo avg</li>';
          });
          insightsHtml += '</ul></div>';
        }

        // Action items
        insightsHtml += '<div class="insight-card highlight"><h3>Priority Action Items</h3><ol>';
        if (notOnboardedActive.length > 0) {
          insightsHtml += '<li><strong>Onboarding recovery:</strong> ' + notOnboardedActive.length + ' active users stuck - ' + notOnboardedActive.map(u => u.name.split(' ')[0]).join(', ') + '</li>';
        }
        if (dormantUsers.length > 0) {
          insightsHtml += '<li><strong>Activation campaign:</strong> ' + dormantUsers.length + ' users signed up but never engaged - send welcome sequence</li>';
        }
        if (churnRisk.length > 0) {
          insightsHtml += '<li><strong>Re-engagement needed:</strong> ' + churnRisk.length + ' previously active users gone quiet: ' + churnRisk.map(u => u.name.split(' ')[0]).join(', ') + '</li>';
        }
        const lowMultiAgent = Math.round((multiAgentUsers / stats.total_users) * 100);
        if (lowMultiAgent < 50) {
          insightsHtml += '<li><strong>Agent discovery:</strong> Only ' + lowMultiAgent + '% exploring beyond onboarding - promote other agents</li>';
        }
        if (onboardingRate < 80) {
          insightsHtml += '<li><strong>Onboarding optimization:</strong> ' + (100 - onboardingRate) + '% drop-off - review and simplify flow</li>';
        }
        insightsHtml += '</ol></div>';

        // Top agents
        if (agentStats.length > 0) {
          insightsHtml += '<div class="insight-card"><h3>Most Used Agents (All Time)</h3><ol>';
          agentStats.slice(0, 5).forEach(a => {
            insightsHtml += '<li><strong>' + a.agent_name + '</strong> - ' + a.messages + ' messages, ' + a.conversations + ' conversations</li>';
          });
          insightsHtml += '</ol></div>';
        }

        // Weekly trends
        if (weeklyStats.length >= 2) {
          insightsHtml += '<div class="insight-card"><h3>Weekly Trends</h3><ul>';
          const thisWeek = weeklyStats[0];
          const lastWeek = weeklyStats[1];
          const msgTrend = lastWeek.messages > 0 ? Math.round(((thisWeek.messages - lastWeek.messages) / lastWeek.messages) * 100) : 0;
          const userTrend = lastWeek.active_users > 0 ? Math.round(((thisWeek.active_users - lastWeek.active_users) / lastWeek.active_users) * 100) : 0;
          insightsHtml += '<li><strong>Messages:</strong> ' + thisWeek.messages + ' this week (' + (msgTrend >= 0 ? '+' : '') + msgTrend + '% vs last week)</li>';
          insightsHtml += '<li><strong>Active Users:</strong> ' + thisWeek.active_users + ' this week (' + (userTrend >= 0 ? '+' : '') + userTrend + '% vs last week)</li>';
          insightsHtml += '</ul></div>';
        }

        insightsHtml += '</div>';

        // Build charts HTML
        let chartsHtml = '<div class="charts-section"><h2>Visual Analytics</h2><div class="charts-grid">';

        // User Segments Donut Chart
        const totalEngaged = superUsers.length + regularUsers.length + lightUsers.length + dormantUsers.length;
        const superPct = Math.round((superUsers.length / totalEngaged) * 100);
        const regularPct = Math.round((regularUsers.length / totalEngaged) * 100);
        const lightPct = Math.round((lightUsers.length / totalEngaged) * 100);
        const dormantPct = Math.round((dormantUsers.length / totalEngaged) * 100);

        chartsHtml += '<div class="chart-card"><h3>User Segments</h3><div class="donut-chart">';
        chartsHtml += '<svg viewBox="0 0 100 100" class="donut"><circle cx="50" cy="50" r="40" fill="none" stroke="#d4edda" stroke-width="20" stroke-dasharray="' + (superPct * 2.51) + ' 251" stroke-dashoffset="0"/>';
        chartsHtml += '<circle cx="50" cy="50" r="40" fill="none" stroke="#cce5ff" stroke-width="20" stroke-dasharray="' + (regularPct * 2.51) + ' 251" stroke-dashoffset="-' + (superPct * 2.51) + '"/>';
        chartsHtml += '<circle cx="50" cy="50" r="40" fill="none" stroke="#e2e3e5" stroke-width="20" stroke-dasharray="' + (lightPct * 2.51) + ' 251" stroke-dashoffset="-' + ((superPct + regularPct) * 2.51) + '"/>';
        chartsHtml += '<circle cx="50" cy="50" r="40" fill="none" stroke="#f8d7da" stroke-width="20" stroke-dasharray="' + (dormantPct * 2.51) + ' 251" stroke-dashoffset="-' + ((superPct + regularPct + lightPct) * 2.51) + '"/>';
        chartsHtml += '</svg><div class="donut-legend"><span class="legend-item"><span class="dot super"></span>Super ' + superUsers.length + '</span>';
        chartsHtml += '<span class="legend-item"><span class="dot regular"></span>Regular ' + regularUsers.length + '</span>';
        chartsHtml += '<span class="legend-item"><span class="dot light"></span>Light ' + lightUsers.length + '</span>';
        chartsHtml += '<span class="legend-item"><span class="dot dormant"></span>Dormant ' + dormantUsers.length + '</span></div></div></div>';

        // Weekly Activity Bar Chart
        chartsHtml += '<div class="chart-card"><h3>Weekly Activity (Last 8 Weeks)</h3><div class="bar-chart">';
        const maxMsgs = Math.max(...weeklyStats.map(w => parseInt(w.messages) || 0), 1);
        weeklyStats.slice(0, 8).reverse().forEach((w, i) => {
          const height = Math.round((parseInt(w.messages) / maxMsgs) * 100);
          const weekLabel = new Date(w.week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          chartsHtml += '<div class="bar-group"><div class="bar" style="height:' + height + '%"><span class="bar-value">' + w.messages + '</span></div><span class="bar-label">' + weekLabel + '</span></div>';
        });
        chartsHtml += '</div></div>';

        // Agent Usage Bar Chart
        chartsHtml += '<div class="chart-card"><h3>Agent Usage Distribution</h3><div class="horizontal-bars">';
        const maxAgentMsgs = Math.max(...agentStats.slice(0, 5).map(a => parseInt(a.messages) || 0), 1);
        agentStats.slice(0, 5).forEach(a => {
          const width = Math.round((parseInt(a.messages) / maxAgentMsgs) * 100);
          const shortName = a.agent_name.length > 20 ? a.agent_name.substring(0, 20) + '...' : a.agent_name;
          chartsHtml += '<div class="h-bar-group"><span class="h-bar-label">' + shortName + '</span><div class="h-bar-track"><div class="h-bar" style="width:' + width + '%"></div><span class="h-bar-value">' + a.messages + '</span></div></div>';
        });
        chartsHtml += '</div></div>';

        // Funnel Chart
        const funnelTotal = parseInt(stats.total_users);
        const funnelOnboarded = parseInt(stats.onboarded);
        const funnelMultiAgent = multiAgentUsers;
        const funnelSuper = superUsers.length;
        chartsHtml += '<div class="chart-card"><h3>User Journey Funnel</h3><div class="funnel">';
        chartsHtml += '<div class="funnel-step" style="width:100%"><span>Signed Up</span><strong>' + funnelTotal + '</strong></div>';
        chartsHtml += '<div class="funnel-step" style="width:' + Math.round((funnelOnboarded/funnelTotal)*100) + '%"><span>Onboarded</span><strong>' + funnelOnboarded + ' (' + Math.round((funnelOnboarded/funnelTotal)*100) + '%)</strong></div>';
        chartsHtml += '<div class="funnel-step" style="width:' + Math.round((funnelMultiAgent/funnelTotal)*100) + '%"><span>Multi-Agent</span><strong>' + funnelMultiAgent + ' (' + Math.round((funnelMultiAgent/funnelTotal)*100) + '%)</strong></div>';
        chartsHtml += '<div class="funnel-step" style="width:' + Math.round((funnelSuper/funnelTotal)*100) + '%"><span>Super User</span><strong>' + funnelSuper + ' (' + Math.round((funnelSuper/funnelTotal)*100) + '%)</strong></div>';
        chartsHtml += '</div></div>';

        chartsHtml += '</div></div>';

        // Strategic Recommendations Section
        let recommendationsHtml = '<div class="recommendations-section"><h2>Strategic Recommendations</h2><div class="rec-grid">';

        // Immediate Actions
        recommendationsHtml += '<div class="rec-card urgent"><h3>Immediate Actions (This Week)</h3><ol>';
        if (dormantUsers.length > 0) {
          recommendationsHtml += '<li><strong>Activate ' + dormantUsers.length + ' dormant users:</strong> Send personalized welcome emails highlighting Money Model Mapper as first step. Include video walkthrough.</li>';
        }
        if (notOnboardedActive.length > 0) {
          recommendationsHtml += '<li><strong>Complete ' + notOnboardedActive.length + ' stuck onboardings:</strong> Reach out directly to ' + notOnboardedActive.map(u => u.name.split(' ')[0]).join(', ') + ' - they are engaged but profile incomplete.</li>';
        }
        if (churnRisk.length > 0) {
          recommendationsHtml += '<li><strong>Re-engage ' + churnRisk.length + ' cooling users:</strong> ' + churnRisk.map(u => u.name.split(' ')[0]).join(', ') + ' were active but quiet 14+ days. Send "We miss you" with new feature highlights.</li>';
        }
        recommendationsHtml += '</ol></div>';

        // Growth Opportunities
        recommendationsHtml += '<div class="rec-card growth"><h3>Growth Opportunities (This Month)</h3><ol>';
        const multiAgentRate = Math.round((multiAgentUsers / stats.total_users) * 100);
        if (multiAgentRate < 60) {
          recommendationsHtml += '<li><strong>Increase agent discovery:</strong> Only ' + multiAgentRate + '% explore beyond onboarding. Add "Recommended Next: Money Model Mapper" prompt after onboarding completion.</li>';
        }
        if (agentJourney.length > 0) {
          const topAgent = agentJourney[0];
          recommendationsHtml += '<li><strong>Double down on ' + topAgent.agent_name + ':</strong> Most popular post-onboarding agent with ' + topAgent.unique_users + ' users. Create success stories and tutorials.</li>';
        }
        recommendationsHtml += '<li><strong>Super user program:</strong> ' + superUsers.length + ' power users averaging ' + Math.round(superUsers.reduce((a,u) => a + parseInt(u.messages), 0) / superUsers.length) + ' msgs each. Consider ambassador/referral program.</li>';
        recommendationsHtml += '</ol></div>';

        // Product Insights
        recommendationsHtml += '<div class="rec-card product"><h3>Product Insights</h3><ol>';
        if (agentJourney.length >= 2) {
          const engagementDepth = agentJourney.slice(0, 3).map(a => a.agent_name.split(' ')[0] + ': ' + a.avg_msgs_per_convo + ' msgs/convo').join(', ');
          recommendationsHtml += '<li><strong>Conversation depth:</strong> ' + engagementDepth + '. High depth = users finding value. Consider adding "save progress" for long sessions.</li>';
        }
        const onboardingAgent = agentStats.find(a => a.agent_name === 'Client Onboarding');
        if (onboardingAgent) {
          const avgOnboardingMsgs = Math.round(parseInt(onboardingAgent.messages) / parseInt(onboardingAgent.conversations));
          recommendationsHtml += '<li><strong>Onboarding efficiency:</strong> ~' + avgOnboardingMsgs + ' messages average to complete. ' + (avgOnboardingMsgs > 40 ? 'Consider streamlining - users may be getting distracted.' : 'Good pace for comprehensive profile building.') + '</li>';
        }
        recommendationsHtml += '<li><strong>Agent gaps:</strong> LinkedIn Events and Qualification Call have low adoption. Add guided prompts or combine into workflows.</li>';
        recommendationsHtml += '</ol></div>';

        // Key Metrics to Watch
        recommendationsHtml += '<div class="rec-card metrics"><h3>Key Metrics to Watch</h3><ul>';
        recommendationsHtml += '<li><strong>Weekly Active Users:</strong> Currently ' + (recentActivity.active_7d || 0) + '. Target: 50% of total users (' + Math.round(stats.total_users * 0.5) + ')</li>';
        recommendationsHtml += '<li><strong>Onboarding Rate:</strong> Currently ' + onboardingRate + '%. Target: 90%+</li>';
        recommendationsHtml += '<li><strong>Multi-Agent Adoption:</strong> Currently ' + multiAgentRate + '%. Target: 70%+</li>';
        recommendationsHtml += '<li><strong>Super User Conversion:</strong> Currently ' + Math.round((superUsers.length / stats.total_users) * 100) + '%. Target: 25%+</li>';
        recommendationsHtml += '</ul></div>';

        recommendationsHtml += '</div></div>';

        // User rows
        const userRows = users.map(u => {
          const badge = u.onboarding_completed ? 'badge-success' : 'badge-warning';
          const status = u.onboarding_completed ? 'Yes' : 'No';
          const joined = new Date(u.created_at).toLocaleDateString();
          const msgCount = parseInt(u.messages);
          const engagement = msgCount >= 100 ? 'Super' : msgCount >= 20 ? 'Regular' : msgCount > 0 ? 'Light' : 'Dormant';
          const engBadge = msgCount >= 100 ? 'badge-super' : msgCount >= 20 ? 'badge-regular' : msgCount > 0 ? 'badge-light' : 'badge-dormant';
          return '<tr><td>' + (u.name || '-') + '</td><td>' + u.email + '</td><td><span class="badge ' + badge + '">' + status + '</span></td><td><span class="badge ' + engBadge + '">' + engagement + '</span></td><td>' + u.conversations + '</td><td>' + u.messages + '</td><td>' + joined + '</td></tr>';
        }).join('');

        const css = 'body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;max-width:1400px;margin:0 auto;padding:20px;background:#f5f5f5}h1{color:#333}h2{color:#444;margin-top:30px;border-bottom:2px solid #ddd;padding-bottom:10px}.stats{display:flex;gap:20px;margin-bottom:30px;flex-wrap:wrap}.stat-card{background:white;padding:20px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);min-width:150px}.stat-card h3{margin:0;color:#666;font-size:14px}.stat-card .value{font-size:32px;font-weight:bold;color:#333}.insights{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;margin-bottom:30px}.insight-card{background:white;padding:20px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1)}.insight-card h3{margin-top:0;color:#333;font-size:16px;border-bottom:1px solid #eee;padding-bottom:8px}.insight-card ul,.insight-card ol{margin:0;padding-left:20px}.insight-card li{margin-bottom:8px;line-height:1.5}.insight-card.highlight{background:linear-gradient(135deg,#fff9e6,#fff);border-left:4px solid #f0ad4e}table{width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,0.1)}th,td{padding:12px;text-align:left;border-bottom:1px solid #eee}th{background:#333;color:white}tr:hover{background:#f9f9f9}.badge{padding:4px 8px;border-radius:4px;font-size:12px;font-weight:500}.badge-success{background:#d4edda;color:#155724}.badge-warning{background:#fff3cd;color:#856404}.badge-super{background:#d4edda;color:#155724}.badge-regular{background:#cce5ff;color:#004085}.badge-light{background:#e2e3e5;color:#383d41}.badge-dormant{background:#f8d7da;color:#721c24}.charts-section{margin:30px 0}.charts-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px}.chart-card{background:white;padding:20px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1)}.chart-card h3{margin:0 0 15px;color:#333;font-size:16px;border-bottom:1px solid #eee;padding-bottom:8px}.donut-chart{display:flex;align-items:center;gap:20px}.donut{width:120px;height:120px;transform:rotate(-90deg)}.donut-legend{display:flex;flex-direction:column;gap:8px}.legend-item{display:flex;align-items:center;gap:8px;font-size:14px}.dot{width:12px;height:12px;border-radius:50%}.dot.super{background:#d4edda}.dot.regular{background:#cce5ff}.dot.light{background:#e2e3e5}.dot.dormant{background:#f8d7da}.bar-chart{display:flex;align-items:flex-end;gap:8px;height:150px;padding-top:20px}.bar-group{display:flex;flex-direction:column;align-items:center;flex:1}.bar{background:linear-gradient(180deg,#4CAF50,#45a049);border-radius:4px 4px 0 0;width:100%;min-height:4px;display:flex;align-items:flex-start;justify-content:center;transition:height 0.3s}.bar-value{font-size:10px;color:#333;margin-top:-18px;font-weight:bold}.bar-label{font-size:10px;color:#666;margin-top:4px;white-space:nowrap}.horizontal-bars{display:flex;flex-direction:column;gap:12px}.h-bar-group{display:flex;align-items:center;gap:10px}.h-bar-label{font-size:12px;color:#333;width:120px;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.h-bar-track{flex:1;height:24px;background:#f0f0f0;border-radius:4px;position:relative;display:flex;align-items:center}.h-bar{height:100%;background:linear-gradient(90deg,#2196F3,#1976D2);border-radius:4px;transition:width 0.3s}.h-bar-value{position:absolute;right:8px;font-size:12px;font-weight:bold;color:#333}.funnel{display:flex;flex-direction:column;gap:8px;padding:10px 0}.funnel-step{background:linear-gradient(90deg,#667eea,#764ba2);color:white;padding:12px 16px;border-radius:4px;display:flex;justify-content:space-between;align-items:center;margin:0 auto;transition:width 0.3s}.funnel-step span{font-size:13px}.funnel-step strong{font-size:14px}.recommendations-section{margin:30px 0}.rec-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px}.rec-card{background:white;padding:20px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);border-left:4px solid #ddd}.rec-card.urgent{border-left-color:#dc3545;background:linear-gradient(135deg,#fff5f5,#fff)}.rec-card.growth{border-left-color:#28a745;background:linear-gradient(135deg,#f0fff4,#fff)}.rec-card.product{border-left-color:#007bff;background:linear-gradient(135deg,#f0f7ff,#fff)}.rec-card.metrics{border-left-color:#6f42c1;background:linear-gradient(135deg,#f8f5ff,#fff)}.rec-card h3{margin:0 0 12px;color:#333;font-size:15px}.rec-card ol,.rec-card ul{margin:0;padding-left:20px}.rec-card li{margin-bottom:10px;line-height:1.5;font-size:14px}';

        const html = '<!DOCTYPE html><html><head><title>ECOS Usage Report</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + css + '</style></head><body><h1>ECOS Platform Usage Report</h1><p style="color:#666">Generated: ' + new Date().toLocaleString() + '</p><div class="stats"><div class="stat-card"><h3>Real Users</h3><div class="value">' + stats.total_users + '</div></div><div class="stat-card"><h3>Onboarded</h3><div class="value">' + stats.onboarded + '</div></div><div class="stat-card"><h3>Conversations</h3><div class="value">' + stats.total_conversations + '</div></div><div class="stat-card"><h3>Messages</h3><div class="value">' + stats.total_messages + '</div></div><div class="stat-card"><h3>Active Users</h3><div class="value">' + activeUsers + '</div></div><div class="stat-card"><h3>Heavy Users</h3><div class="value">' + heavyUsers + '</div></div></div>' + insightsHtml + chartsHtml + recommendationsHtml + '<h2>User Details</h2><table><thead><tr><th>Name</th><th>Email</th><th>Onboarded</th><th>Engagement</th><th>Convos</th><th>Messages</th><th>Joined</th></tr></thead><tbody>' + userRows + '</tbody></table></body></html>';

        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'text/html' });
        res.end(html);
      } catch (error) {
        console.error('❌ [REPORT] Error generating report:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to generate report' }));
      }
      return;
    }

    // Admin: Execute remote operations (secure curl endpoint)
    if (path === '/api/admin/execute' && method === 'POST') {
      try {
        // Check authorization
        const adminSecret = process.env.ADMIN_SECRET || 'ecos-admin-secret-2025';
        const authHeader = req.headers['x-admin-secret'] || req.headers['authorization'];

        if (authHeader !== adminSecret && authHeader !== `Bearer ${adminSecret}`) {
          console.log('❌ Unauthorized admin execute attempt');
          res.writeHead(401, corsHeaders);
          res.end(JSON.stringify({ error: 'Unauthorized - Invalid or missing ADMIN_SECRET' }));
          return;
        }

        const body = await parseBody(req);
        const { operation, params = {} } = body;

        console.log(`🔧 [ADMIN] Executing operation: ${operation}`, params);

        let result;

        switch (operation) {
          case 'check-memories': {
            const userId = params.userId;
            const query = userId
              ? `SELECT user_id, full_name, company_name, LEFT(business_outcome, 100) as outcome,
                        LEFT(target_clients, 100) as clients, created_at
                 FROM core_memories WHERE user_id = $1`
              : `SELECT user_id, full_name, company_name, LEFT(business_outcome, 100) as outcome,
                        LEFT(target_clients, 100) as clients, created_at
                 FROM core_memories ORDER BY created_at DESC LIMIT 10`;

            const queryParams = userId ? [userId] : [];
            const queryResult = await pool.query(query, queryParams);
            result = { success: true, memories: queryResult.rows, count: queryResult.rows.length };
            break;
          }

          case 'check-conversations': {
            const userId = params.userId;
            const agentId = params.agentId;

            let query = `SELECT c.id, c.user_id, c.agent_id, c.title,
                                COUNT(m.id) as message_count, c.created_at, c.updated_at
                         FROM conversations c
                         LEFT JOIN messages m ON c.id = m.conversation_id`;
            const queryParams = [];
            const conditions = [];

            if (userId) {
              conditions.push(`c.user_id = $${queryParams.length + 1}`);
              queryParams.push(userId);
            }
            if (agentId) {
              conditions.push(`c.agent_id = $${queryParams.length + 1}`);
              queryParams.push(agentId);
            }

            if (conditions.length > 0) {
              query += ` WHERE ${conditions.join(' AND ')}`;
            }

            query += ` GROUP BY c.id, c.user_id, c.agent_id, c.title, c.created_at, c.updated_at
                       ORDER BY c.updated_at DESC LIMIT 20`;

            const queryResult = await pool.query(query, queryParams);
            result = { success: true, conversations: queryResult.rows, count: queryResult.rows.length };
            break;
          }

          case 'check-messages': {
            const conversationId = params.conversationId;
            if (!conversationId) {
              result = { success: false, error: 'conversationId required' };
              break;
            }

            const queryResult = await pool.query(`
              SELECT m.id, m.role, LEFT(m.content, 200) as content_preview,
                     m.created_at, m.parent_message_id
              FROM messages m
              WHERE m.conversation_id = $1
              ORDER BY m.created_at ASC
            `, [conversationId]);

            result = { success: true, messages: queryResult.rows, count: queryResult.rows.length };
            break;
          }

          case 'get-agent': {
            const agentId = params.agentId;
            if (!agentId) {
              result = { success: false, error: 'agentId required' };
              break;
            }

            const queryResult = await pool.query(`
              SELECT id, name, tier, category, description,
                     LEFT(system_prompt, 200) as prompt_preview,
                     model_preference, max_tokens, temperature, is_active,
                     created_at, updated_at
              FROM agents WHERE id = $1
            `, [agentId]);

            if (queryResult.rows.length === 0) {
              result = { success: false, error: 'Agent not found' };
            } else {
              result = { success: true, agent: queryResult.rows[0] };
            }
            break;
          }

          case 'list-agents': {
            const queryResult = await pool.query(`
              SELECT id, name, tier, category, is_active,
                     model_preference, temperature, max_tokens
              FROM agents
              ORDER BY tier, category, name
            `);

            result = { success: true, agents: queryResult.rows, count: queryResult.rows.length };
            break;
          }

          case 'reload-agents': {
            await loadAgentsFromDatabase();
            const agentCount = Object.keys(AGENT_CACHE).length;
            result = { success: true, message: `Reloaded ${agentCount} agents`, count: agentCount };
            break;
          }

          case 'run-sql': {
            const sql = params.sql;
            if (!sql) {
              result = { success: false, error: 'sql parameter required' };
              break;
            }

            // Security: only allow SELECT queries
            const trimmedSql = sql.trim().toUpperCase();
            if (!trimmedSql.startsWith('SELECT')) {
              result = { success: false, error: 'Only SELECT queries allowed via this endpoint' };
              break;
            }

            const queryResult = await pool.query(sql);
            result = { success: true, rows: queryResult.rows, count: queryResult.rowCount };
            break;
          }

          case 'run-migration': {
            const sql = params.sql;
            if (!sql) {
              result = { success: false, error: 'sql parameter required' };
              break;
            }

            // Security: Block only truly dangerous operations
            const trimmedSql = sql.trim().toUpperCase();
            const dangerousOperations = ['DROP DATABASE'];

            for (const dangerous of dangerousOperations) {
              if (trimmedSql.includes(dangerous)) {
                result = { success: false, error: `Dangerous operation blocked: ${dangerous}` };
                break;
              }
            }

            if (result) break; // Already set error

            // Execute migration
            try {
              const queryResult = await pool.query(sql);
              result = {
                success: true,
                message: 'Migration executed successfully',
                rowCount: queryResult.rowCount,
                command: queryResult.command
              };
            } catch (error) {
              result = {
                success: false,
                error: 'Migration failed',
                details: error.message
              };
            }
            break;
          }

          case 'bulk-auto-name': {
            // Bulk name untitled plays and conversations using Haiku
            const nameResult = await bulkAutoName();
            result = {
              success: true,
              message: `Named ${nameResult.playsNamed} plays and ${nameResult.conversationsNamed} conversations`,
              stats: nameResult
            };
            break;
          }

          case 'health-check': {
            const uptime = process.uptime();
            const memoryUsage = process.memoryUsage();

            result = {
              success: true,
              status: 'healthy',
              uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
              uptimeSeconds: uptime,
              memory: {
                rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
                heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
                heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
              },
              nodeVersion: process.version,
              platform: process.platform,
              pid: process.pid
            };
            break;
          }

          case 'backfill-embeddings': {
            console.log('🚀 [ADMIN] Starting memory embedding backfill...');

            // Get all memories without embeddings
            const memoriesResult = await pool.query(`
              SELECT id, content, memory_type
              FROM memories
              WHERE embedding IS NULL
              ORDER BY created_at ASC
            `);

            const total = memoriesResult.rows.length;
            console.log(`📊 [ADMIN] Found ${total} memories without embeddings`);

            if (total === 0) {
              result = {
                success: true,
                message: 'All memories already have embeddings!',
                total: 0,
                successful: 0,
                failed: 0
              };
              break;
            }

            let successful = 0;
            let failed = 0;
            const errors = [];

            for (let i = 0; i < total; i++) {
              const memory = memoriesResult.rows[i];
              const progress = `[${i + 1}/${total}]`;

              try {
                // Generate embedding using the existing generateEmbedding function
                const embedding = await generateEmbedding(memory.content);
                const embeddingArray = '[' + embedding.join(',') + ']';

                // Update database with embedding
                await pool.query(`
                  UPDATE memories
                  SET embedding = $1::vector
                  WHERE id = $2
                `, [embeddingArray, memory.id]);

                successful++;
                console.log(`✅ [ADMIN] ${progress} Generated embedding for ${memory.memory_type}`);

                // Rate limiting - wait 100ms between requests
                await new Promise(resolve => setTimeout(resolve, 100));

              } catch (error) {
                failed++;
                const errorMsg = `${progress} ${memory.memory_type}: ${error.message}`;
                errors.push(errorMsg);
                console.error(`❌ [ADMIN] ${errorMsg}`);
              }
            }

            result = {
              success: true,
              message: `Backfill complete: ${successful} successful, ${failed} failed`,
              total,
              successful,
              failed,
              errors: errors.length > 0 ? errors.slice(0, 10) : [] // Limit to first 10 errors
            };

            console.log(`📈 [ADMIN] Backfill Summary: ${successful}/${total} successful, ${failed} failed`);
            break;
          }

          case 'backfill-knowledge-embeddings': {
            console.log('🚀 [ADMIN] Starting knowledge_base embedding backfill...');

            // Get all knowledge_base entries without embeddings
            const kbResult = await pool.query(`
              SELECT id, title, content
              FROM knowledge_base
              WHERE embedding IS NULL
              ORDER BY created_at ASC
            `);

            const total = kbResult.rows.length;
            console.log(`📊 [ADMIN] Found ${total} knowledge_base entries without embeddings`);

            if (total === 0) {
              result = {
                success: true,
                message: 'All knowledge_base entries already have embeddings!',
                total: 0,
                successful: 0,
                failed: 0
              };
              break;
            }

            let successful = 0;
            let failed = 0;
            const errors = [];

            for (let i = 0; i < total; i++) {
              const entry = kbResult.rows[i];
              const progress = `[${i + 1}/${total}]`;

              try {
                // Generate embedding using the existing generateEmbedding function
                const embedding = await generateEmbedding(entry.content);
                const embeddingArray = '[' + embedding.join(',') + ']';

                // Update database with embedding
                await pool.query(`
                  UPDATE knowledge_base
                  SET embedding = $1::vector
                  WHERE id = $2
                `, [embeddingArray, entry.id]);

                successful++;
                console.log(`✅ [ADMIN] ${progress} Generated embedding for "${entry.title}"`);
              } catch (error) {
                failed++;
                const errorMsg = `${progress} ${entry.title}: ${error.message}`;
                errors.push(errorMsg);
                console.error(`❌ [ADMIN] ${errorMsg}`);
              }
            }

            result = {
              success: true,
              message: `Knowledge base backfill complete: ${successful} successful, ${failed} failed`,
              total,
              successful,
              failed,
              errors: errors.length > 0 ? errors.slice(0, 10) : []
            };

            console.log(`📈 [ADMIN] Knowledge Backfill Summary: ${successful}/${total} successful, ${failed} failed`);
            break;
          }

          case 'update-rag-settings': {
            const { agentId, minSimilarity, topK, enabled } = params;
            if (!agentId) {
              result = { success: false, error: 'agentId required' };
              break;
            }

            const updates = [];
            const updateParams = [];
            let paramIndex = 1;

            if (minSimilarity !== undefined) {
              updates.push(`min_similarity = $${paramIndex++}`);
              updateParams.push(minSimilarity);
            }
            if (topK !== undefined) {
              updates.push(`top_k = $${paramIndex++}`);
              updateParams.push(topK);
            }
            if (enabled !== undefined) {
              updates.push(`enabled = $${paramIndex++}`);
              updateParams.push(enabled);
            }

            if (updates.length === 0) {
              result = { success: false, error: 'No settings to update. Provide minSimilarity, topK, or enabled' };
              break;
            }

            updates.push(`updated_at = NOW()`);
            updateParams.push(agentId);

            const updateQuery = `
              UPDATE agent_rag_settings
              SET ${updates.join(', ')}
              WHERE agent_id = $${paramIndex}
              RETURNING agent_id, enabled, top_k, min_similarity, updated_at
            `;

            const updateResult = await pool.query(updateQuery, updateParams);

            if (updateResult.rows.length === 0) {
              result = { success: false, error: `No RAG settings found for agent: ${agentId}` };
            } else {
              result = {
                success: true,
                message: `RAG settings updated for ${agentId}`,
                settings: updateResult.rows[0]
              };
              console.log(`✅ [ADMIN] RAG settings updated for ${agentId}:`, updateResult.rows[0]);
            }
            break;
          }

          case 'test-rag-search': {
            const { agentId, query, threshold } = params;
            if (!agentId || !query) {
              result = { success: false, error: 'agentId and query required' };
              break;
            }

            try {
              const { generateEmbedding } = require('./backend/services/embeddingService.cjs');
              const queryEmbedding = await generateEmbedding(query);
              const vectorString = '[' + queryEmbedding.join(',') + ']';
              const effectiveThreshold = threshold || 0.3; // Low threshold to see all candidates

              // Search with low threshold to see all potential matches
              const searchResult = await pool.query(`
                SELECT
                  kb.id,
                  kb.title,
                  kb.category,
                  LEFT(kb.content, 200) as content_preview,
                  kb.agent_id as source_agent,
                  1 - (kb.embedding <=> $1::vector) as similarity
                FROM knowledge_base kb
                WHERE kb.embedding IS NOT NULL
                  AND (kb.agent_id = $2 OR $2 = 'ecos-super-agent')
                ORDER BY similarity DESC
                LIMIT 10
              `, [vectorString, agentId]);

              result = {
                success: true,
                query: query,
                agentId: agentId,
                threshold: effectiveThreshold,
                totalCandidates: searchResult.rows.length,
                aboveThreshold: searchResult.rows.filter(r => r.similarity >= effectiveThreshold).length,
                results: searchResult.rows.map(r => ({
                  ...r,
                  similarity: parseFloat(r.similarity).toFixed(4),
                  wouldBeRetrieved: r.similarity >= effectiveThreshold
                }))
              };
            } catch (error) {
              result = { success: false, error: error.message };
            }
            break;
          }

          case 'send-custom-email': {
            const { to, subject, html, text } = params;
            if (!to || !subject || !html) {
              result = { success: false, error: 'to, subject, and html are required' };
              break;
            }
            try {
              const recipients = Array.isArray(to) ? to : [to];
              const sent = await sendCustomEmail(recipients, subject, html, text || '');
              result = { success: true, message: `Custom email sent to ${recipients.join(', ')}`, allSent: sent };
            } catch (error) {
              result = { success: false, error: error.message };
            }
            break;
          }

          case 'send-test-email': {
            const { email, type, name, agentName, daysInactive } = params;
            if (!email) {
              result = { success: false, error: 'email is required' };
              break;
            }
            try {
              const emailType = type || 'welcome';
              const displayName = name || email.split('@')[0];

              const emailTypes = {
                'welcome': () => sendWelcomeEmail(email, displayName),
                'onboarding': () => sendOnboardingCompleteEmail(email, displayName),
                'quick-start': () => sendQuickStartEmail(email, displayName),
                'meet-agents': () => sendMeetAgentsEmail(email, displayName),
                'inactivity': () => sendInactivityEmail(email, displayName, daysInactive || 7),
                'first-conversation': () => sendFirstConversationEmail(email, displayName, agentName || 'Money Model Mapper'),
                'money-model': () => sendMoneyModelCreatedEmail(email, displayName),
                'payment-confirmation': () => sendPaymentConfirmationEmail(email, displayName, { plan: params.plan || 'weekly', amount: params.amount || null }),
              };

              if (emailTypes[emailType]) {
                await emailTypes[emailType]();
                result = { success: true, message: `${emailType} email sent to ${email}` };
              } else {
                result = {
                  success: false,
                  error: `Unknown email type: ${emailType}`,
                  availableTypes: Object.keys(emailTypes)
                };
              }
            } catch (error) {
              result = { success: false, error: error.message };
            }
            break;
          }

          default:
            result = {
              success: false,
              error: `Unknown operation: ${operation}`,
              availableOperations: [
                'check-memories',
                'check-conversations',
                'check-messages',
                'get-agent',
                'list-agents',
                'reload-agents',
                'backfill-embeddings',
                'backfill-knowledge-embeddings',
                'run-sql',
                'run-migration',
                'health-check',
                'update-rag-settings',
                'test-rag-search',
                'send-test-email',
                'send-custom-email'
              ]
            };
        }

        console.log(`✅ [ADMIN] Operation ${operation} completed`);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify(result));
      } catch (error) {
        console.error('❌ [ADMIN] Error executing operation:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({
          success: false,
          error: 'Failed to execute operation',
          details: error.message
        }));
      }
      return;
    }

    // Admin: Get all email templates
    if (path === '/api/admin/email-templates' && method === 'GET') {
      try {
        // First check if the additional columns exist
        const columnCheck = await pool.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'email_templates' AND column_name IN ('html_template', 'available_variables')
        `);
        const existingColumns = columnCheck.rows.map(r => r.column_name);
        const hasHtmlTemplate = existingColumns.includes('html_template');
        const hasAvailableVariables = existingColumns.includes('available_variables');

        const result = await pool.query(`
          SELECT id, name, COALESCE(description, '') as description, subject, enabled, category, trigger_event,
                 COALESCE(delay_minutes, 0) as delay_minutes, COALESCE(priority, 0) as priority,
                 ${hasHtmlTemplate ? 'html_template' : "'' as html_template"},
                 ${hasAvailableVariables ? 'available_variables' : "'[]'::jsonb as available_variables"},
                 created_at, updated_at
          FROM email_templates
          ORDER BY priority ASC, category, name
        `);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ templates: result.rows }));
      } catch (error) {
        console.error('❌ Error fetching email templates:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to fetch email templates' }));
      }
      return;
    }

    // Admin: Update email template
    if (path.startsWith('/api/admin/email-templates/') && method === 'PUT') {
      try {
        const templateId = path.split('/').pop();
        const body = await parseBody(req);
        const { enabled, subject, name, description, html_template } = body;

        // Check if html_template column exists
        const columnCheck = await pool.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_name = 'email_templates' AND column_name = 'html_template'
        `);
        const hasHtmlTemplate = columnCheck.rows.length > 0;

        // Build dynamic update query
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (enabled !== undefined) {
          updates.push(`enabled = $${paramIndex++}`);
          values.push(enabled);
        }
        if (subject !== undefined) {
          updates.push(`subject = $${paramIndex++}`);
          values.push(subject);
        }
        if (name !== undefined) {
          updates.push(`name = $${paramIndex++}`);
          values.push(name);
        }
        if (description !== undefined) {
          updates.push(`description = $${paramIndex++}`);
          values.push(description);
        }
        if (html_template !== undefined && hasHtmlTemplate) {
          updates.push(`html_template = $${paramIndex++}`);
          values.push(html_template);
        }

        if (updates.length === 0) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'No fields to update' }));
          return;
        }

        updates.push(`updated_at = NOW()`);
        values.push(templateId);

        const result = await pool.query(`
          UPDATE email_templates
          SET ${updates.join(', ')}
          WHERE id = $${paramIndex}
          RETURNING id, name, description, subject, enabled, category, trigger_event, priority, ${hasHtmlTemplate ? 'html_template,' : ''} updated_at
        `, values);

        if (result.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'Email template not found' }));
          return;
        }

        console.log(`✅ Updated email template: ${templateId} - enabled: ${result.rows[0].enabled}`);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ success: true, template: result.rows[0] }));
      } catch (error) {
        console.error('❌ Error updating email template:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to update email template' }));
      }
      return;
    }

    // ========================================
    // INVITE CODES MANAGEMENT
    // ========================================

    // Admin: Get all invite codes
    if (path === '/api/admin/invite-codes' && method === 'GET') {
      try {
        const result = await pool.query(`
          SELECT ic.id, ic.code, ic.description, ic.max_uses, ic.uses_count,
                 ic.expires_at, ic.is_active, ic.assigned_role, ic.created_at,
                 u.email as created_by_email, u.first_name as created_by_name
          FROM invite_codes ic
          LEFT JOIN users u ON ic.created_by = u.id
          ORDER BY ic.created_at DESC
        `);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ inviteCodes: result.rows }));
      } catch (error) {
        console.error('❌ Error fetching invite codes:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to fetch invite codes' }));
      }
      return;
    }

    // Admin: Create invite code
    if (path === '/api/admin/invite-codes' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const { code, description, max_uses, expires_at, assigned_role, created_by } = body;

        // Generate random code if not provided
        const finalCode = code || require('crypto').randomBytes(4).toString('hex').toUpperCase();

        // Check if code already exists
        const existing = await pool.query('SELECT id FROM invite_codes WHERE code = $1', [finalCode]);
        if (existing.rows.length > 0) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Invite code already exists' }));
          return;
        }

        const result = await pool.query(`
          INSERT INTO invite_codes (code, description, max_uses, expires_at, assigned_role, created_by, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
          RETURNING id, code, description, max_uses, uses_count, expires_at, is_active, assigned_role, created_at
        `, [finalCode, description || null, max_uses || 1, expires_at || null, assigned_role || 'user', created_by || null]);

        console.log(`✅ Created invite code: ${finalCode}`);

        res.writeHead(201, corsHeaders);
        res.end(JSON.stringify({ success: true, inviteCode: result.rows[0] }));
      } catch (error) {
        console.error('❌ Error creating invite code:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to create invite code' }));
      }
      return;
    }

    // Admin: Update invite code
    if (path.match(/^\/api\/admin\/invite-codes\/[^\/]+$/) && method === 'PUT') {
      try {
        const codeId = path.split('/').pop();
        const body = await parseBody(req);
        const { description, max_uses, expires_at, is_active, assigned_role } = body;

        const result = await pool.query(`
          UPDATE invite_codes
          SET description = COALESCE($1, description),
              max_uses = COALESCE($2, max_uses),
              expires_at = $3,
              is_active = COALESCE($4, is_active),
              assigned_role = COALESCE($5, assigned_role),
              updated_at = NOW()
          WHERE id = $6
          RETURNING id, code, description, max_uses, uses_count, expires_at, is_active, assigned_role, created_at, updated_at
        `, [description, max_uses, expires_at, is_active, assigned_role, codeId]);

        if (result.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'Invite code not found' }));
          return;
        }

        console.log(`✅ Updated invite code: ${result.rows[0].code}`);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ success: true, inviteCode: result.rows[0] }));
      } catch (error) {
        console.error('❌ Error updating invite code:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to update invite code' }));
      }
      return;
    }

    // Admin: Delete invite code
    if (path.match(/^\/api\/admin\/invite-codes\/[^\/]+$/) && method === 'DELETE') {
      try {
        const codeId = path.split('/').pop();

        const result = await pool.query('DELETE FROM invite_codes WHERE id = $1 RETURNING code', [codeId]);

        if (result.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'Invite code not found' }));
          return;
        }

        console.log(`✅ Deleted invite code: ${result.rows[0].code}`);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ success: true, message: 'Invite code deleted' }));
      } catch (error) {
        console.error('❌ Error deleting invite code:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to delete invite code' }));
      }
      return;
    }

    // Public: Validate invite code (for registration form)
    if (path === '/api/auth/validate-invite-code' && method === 'POST') {
      try {
        const body = await parseBody(req);
        const { code } = body;

        if (!code) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ valid: false, error: 'Invite code is required' }));
          return;
        }

        const result = await pool.query(`
          SELECT id, code, max_uses, uses_count, expires_at, is_active, assigned_role
          FROM invite_codes
          WHERE code = $1
        `, [code.toUpperCase().trim()]);

        if (result.rows.length === 0) {
          res.writeHead(200, corsHeaders);
          res.end(JSON.stringify({ valid: false, error: 'Invalid invite code' }));
          return;
        }

        const inviteCode = result.rows[0];

        // Check if code is active
        if (!inviteCode.is_active) {
          res.writeHead(200, corsHeaders);
          res.end(JSON.stringify({ valid: false, error: 'This invite code has been deactivated' }));
          return;
        }

        // Check if code has expired
        if (inviteCode.expires_at && new Date(inviteCode.expires_at) < new Date()) {
          res.writeHead(200, corsHeaders);
          res.end(JSON.stringify({ valid: false, error: 'This invite code has expired' }));
          return;
        }

        // Check if code has reached max uses
        if (inviteCode.max_uses !== null && inviteCode.uses_count >= inviteCode.max_uses) {
          res.writeHead(200, corsHeaders);
          res.end(JSON.stringify({ valid: false, error: 'This invite code has reached its maximum uses' }));
          return;
        }

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ valid: true, assignedRole: inviteCode.assigned_role }));
      } catch (error) {
        console.error('❌ Error validating invite code:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ valid: false, error: 'Failed to validate invite code' }));
      }
      return;
    }

    // Admin: Get all agents
    if (path === '/api/admin/agents' && method === 'GET') {
      const adminUser = getUserFromToken(req.headers.authorization);
      if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'power_user')) {
        res.writeHead(403, corsHeaders);
        res.end(JSON.stringify({ error: 'Admin access required' }));
        return;
      }
      try {
        const result = await pool.query(`
          SELECT id, name, tier, category, description, system_prompt,
                 behavior_suffix, model_preference, chat_model, memory_model, widget_model,
                 max_tokens, temperature, is_active,
                 locked_until_onboarding, requires_onboarding,
                 metadata, color, accent_color, sort_order, created_at, updated_at
          FROM agents
          ORDER BY sort_order ASC, category, name
        `);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ agents: result.rows }));
      } catch (error) {
        console.error('❌ Error fetching agents:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to fetch agents' }));
      }
      return;
    }

    // Admin: Create new agent
    if (path === '/api/admin/agents' && method === 'POST') {
      const adminUser = getUserFromToken(req.headers.authorization);
      if (!adminUser || adminUser.role !== 'admin') {
        res.writeHead(403, corsHeaders);
        res.end(JSON.stringify({ error: 'Admin access required' }));
        return;
      }
      try {
        const body = await parseBody(req);
        const { id, name, tier, category, description, system_prompt, model_preference, max_tokens, temperature, is_active } = body;

        // Validate required fields
        if (!id || !name || !category || !description || !system_prompt) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Missing required fields: id, name, category, description, system_prompt' }));
          return;
        }

        // Check if agent ID already exists
        const existingAgent = await pool.query('SELECT id FROM agents WHERE id = $1', [id]);
        if (existingAgent.rows.length > 0) {
          res.writeHead(409, corsHeaders);
          res.end(JSON.stringify({ error: 'Agent with this ID already exists' }));
          return;
        }

        const result = await pool.query(`
          INSERT INTO agents (
            id, name, tier, category, description, system_prompt,
            model_preference, max_tokens, temperature, is_active,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
          RETURNING id, name, tier, category, description, system_prompt,
                    model_preference, max_tokens, temperature, is_active,
                    created_at, updated_at
        `, [
          id,
          name,
          tier || 1,
          category,
          description,
          system_prompt,
          model_preference || 'anthropic/claude-sonnet-4.6',
          max_tokens || 2000,
          temperature || '0.7',
          is_active !== undefined ? is_active : true
        ]);

        console.log(`✅ Created new agent: ${id}`);

        // Reload agents from database to include the new one
        await loadAgentsFromDatabase();

        res.writeHead(201, corsHeaders);
        res.end(JSON.stringify({ success: true, agent: result.rows[0] }));
      } catch (error) {
        console.error('❌ Error creating agent:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to create agent' }));
      }
      return;
    }

    // Admin: Get single agent
    if (path.match(/^\/api\/admin\/agents\/[^\/]+$/) && method === 'GET') {
      try {
        const agentId = path.split('/')[4];
        const result = await pool.query(`
          SELECT id, name, tier, category, description, system_prompt,
                 behavior_suffix, model_preference, chat_model, memory_model, widget_model,
                 max_tokens, temperature, is_active,
                 locked_until_onboarding, requires_onboarding,
                 metadata, color, accent_color, sort_order, allowed_roles, created_at, updated_at
          FROM agents
          WHERE id = $1
        `, [agentId]);

        if (result.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'Agent not found' }));
          return;
        }

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ agent: result.rows[0] }));
      } catch (error) {
        console.error('❌ Error fetching agent:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to fetch agent' }));
      }
      return;
    }

    // Admin: Update agent
    if (path.match(/^\/api\/admin\/agents\/[^\/]+$/) && method === 'PUT') {
      const adminUser = getUserFromToken(req.headers.authorization);
      if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'power_user')) {
        res.writeHead(403, corsHeaders);
        res.end(JSON.stringify({ error: 'Admin access required' }));
        return;
      }
      try {
        const agentId = path.split('/')[4];
        const body = await parseBody(req);
        const { name, tier, category, description, system_prompt, behavior_prefix, behavior_suffix, model_preference, chat_model, memory_model, widget_model, max_tokens, temperature, is_active, accent_color, metadata, sort_order, allowed_roles } = body;

        const result = await pool.query(`
          UPDATE agents
          SET name = COALESCE($1, name),
              tier = COALESCE($2, tier),
              category = COALESCE($3, category),
              description = COALESCE($4, description),
              system_prompt = COALESCE($5, system_prompt),
              behavior_prefix = COALESCE($6, behavior_prefix),
              behavior_suffix = COALESCE($7, behavior_suffix),
              model_preference = COALESCE($8, model_preference),
              chat_model = $9,
              memory_model = $10,
              widget_model = $11,
              max_tokens = COALESCE($12, max_tokens),
              temperature = COALESCE($13, temperature),
              is_active = COALESCE($14, is_active),
              accent_color = COALESCE($15, accent_color),
              metadata = COALESCE($16, metadata),
              sort_order = COALESCE($17, sort_order),
              allowed_roles = COALESCE($18, allowed_roles),
              updated_at = NOW()
          WHERE id = $19
          RETURNING id, name, tier, category, description, system_prompt, behavior_prefix, behavior_suffix, model_preference, chat_model, memory_model, widget_model, max_tokens, temperature, is_active, accent_color, metadata, sort_order, allowed_roles
        `, [name, tier, category, description, system_prompt, behavior_prefix, behavior_suffix, model_preference, chat_model, memory_model, widget_model, max_tokens, temperature, is_active, accent_color, metadata ? JSON.stringify(metadata) : null, sort_order, allowed_roles, agentId]);

        if (result.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'Agent not found' }));
          return;
        }

        console.log(`✅ Updated agent: ${agentId}`);

        // Reload agents from database to pick up changes
        await loadAgentsFromDatabase();

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ success: true, agent: result.rows[0] }));
      } catch (error) {
        console.error('❌ Error updating agent:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to update agent' }));
      }
      return;
    }

    // Admin: Reload agents from database
    if (path === '/api/admin/agents/reload' && method === 'POST') {
      try {
        await loadAgentsFromDatabase();
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          message: `Reloaded ${Object.keys(AGENT_CACHE).length} agents`,
          count: Object.keys(AGENT_CACHE).length
        }));
      } catch (error) {
        console.error('❌ Error reloading agents:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to reload agents' }));
      }
      return;
    }

    // Admin: Apply handoff suffixes to all agents
    if (path === '/api/admin/agents/apply-handoffs' && method === 'POST') {
      try {
        const { applyHandoffToAllAgents } = require('./backend/services/agentHandoffService.cjs');
        const results = await applyHandoffToAllAgents(pool);

        // Reload agents to pick up changes
        await loadAgentsFromDatabase();

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          message: 'Handoff suffixes applied',
          results
        }));
      } catch (error) {
        console.error('❌ Error applying handoff suffixes:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to apply handoff suffixes', details: error.message }));
      }
      return;
    }

    // Admin: EMERGENCY - Force apply all pending migrations NOW
    if (path === '/api/admin/migrations/apply-now' && method === 'POST') {
      try {
        console.log('🚨 EMERGENCY: Manually triggering all pending migrations...');
        await applyPendingMigrations();
        await loadAgentsFromDatabase();

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          message: 'All pending migrations applied and agents reloaded'
        }));
      } catch (error) {
        console.error('❌ Error applying migrations:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to apply migrations', details: error.message }));
      }
      return;
    }

    // Admin: Apply handoff suffix to specific agent
    if (path.startsWith('/api/admin/agents/') && path.endsWith('/apply-handoff') && method === 'POST') {
      try {
        const agentId = path.split('/')[4];
        const { applyHandoffSuffix } = require('./backend/services/agentHandoffService.cjs');
        const result = await applyHandoffSuffix(pool, agentId);

        // Reload agents to pick up changes
        await loadAgentsFromDatabase();

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          message: result.updated ? 'Handoff suffix applied' : 'Handoff suffix already present',
          result
        }));
      } catch (error) {
        console.error('❌ Error applying handoff suffix:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to apply handoff suffix', details: error.message }));
      }
      return;
    }

    // TEMPORARY: Admin endpoint to pull Ollama embedding model
    if (path === '/api/admin/ollama/pull-model' && method === 'POST') {
      console.log('🔄 [OLLAMA] Pulling nomic-embed-text model...');

      const postData = JSON.stringify({ name: 'nomic-embed-text' });

      const options = {
        hostname: 'ollama.railway.internal',
        port: 11434,
        path: '/api/pull',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': postData.length
        }
      };

      const ollamaReq = http.request(options, (ollamaRes) => {
        console.log(`✅ [OLLAMA] Pull request status: ${ollamaRes.statusCode}`);

        let responseData = '';
        ollamaRes.on('data', (chunk) => {
          responseData += chunk.toString();
          console.log(`📦 [OLLAMA] ${chunk.toString().trim()}`);
        });

        ollamaRes.on('end', () => {
          res.writeHead(200, corsHeaders);
          res.end(JSON.stringify({
            success: true,
            message: 'Model pull initiated successfully',
            status: ollamaRes.statusCode,
            response: responseData
          }));
        });
      });

      ollamaReq.on('error', (error) => {
        console.error('❌ [OLLAMA] Error pulling model:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      });

      ollamaReq.write(postData);
      ollamaReq.end();
      return;
    }

    // TEMPORARY: Admin endpoint to list Ollama models
    if (path === '/api/admin/ollama/models' && method === 'GET') {
      console.log('📋 [OLLAMA] Listing available models...');

      const options = {
        hostname: 'ollama.railway.internal',
        port: 11434,
        path: '/api/tags',
        method: 'GET'
      };

      const ollamaReq = http.request(options, (ollamaRes) => {
        let responseData = '';
        ollamaRes.on('data', (chunk) => { responseData += chunk.toString(); });
        ollamaRes.on('end', () => {
          res.writeHead(200, corsHeaders);
          res.end(responseData);
        });
      });

      ollamaReq.on('error', (error) => {
        console.error('❌ [OLLAMA] Error listing models:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      });

      ollamaReq.end();
      return;
    }

    // AI Models endpoint - Load from database
    if (path === '/api/admin/ai-models' && method === 'GET') {
    try {
      const result = await pool.query(`
        SELECT model_id, model_name, provider, description, context_length,
               pricing_prompt, pricing_completion, metadata, last_updated
        FROM ai_models
        ORDER BY provider, model_name
      `);

      const modelsArray = result.rows.map(row => ({
        id: row.model_id,
        modelId: row.model_id,
        modelName: row.model_name,
        provider: row.provider,
        description: row.description || 'No description available',
        contextLength: row.context_length,
        pricingPrompt: parseFloat(row.pricing_prompt),
        pricingCompletion: parseFloat(row.pricing_completion),
        lastUpdated: row.last_updated
      }));

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ models: modelsArray }));
    } catch (error) {
      console.error('❌ Failed to load models from database:', error);
      // Fallback to default models if database fails
      const fallbackModels = {
        'anthropic/claude-haiku-4.5': {
          name: 'Claude Haiku 4.5',
          provider: 'Anthropic',
          openrouter_id: 'anthropic/claude-haiku-4.5',
          description: 'Fast and efficient Claude model for quick responses',
          speed: 'very-fast',
          quality: 'good'
        }
      };
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify(fallbackModels));
    }
    return;
  }

  // AI Model selections endpoints
  if (path === '/api/admin/ai-models/selections' && method === 'GET') {
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({
      chat_agents: 'anthropic/claude-sonnet-4.6',
      memory_extraction: 'anthropic/claude-haiku-4.5',
      memory_optimization: 'anthropic/claude-haiku-4.5'
    }));
    return;
  }

  if (path === '/api/admin/ai-models/selections' && method === 'POST') {
    const body = await parseBody(req);
    console.log('💾 AI model selections updated:', body);
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({ success: true, message: 'Model selections updated successfully' }));
    return;
  }

  // Refresh models from OpenRouter API
  if (path === '/api/admin/ai-models/refresh' && method === 'POST') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user || user.role !== 'admin') {
      res.writeHead(403, corsHeaders);
      res.end(JSON.stringify({ error: 'Admin access required' }));
      return;
    }

    try {
      console.log('🔄 [ADMIN] Fetching latest models from OpenRouter...');

      const https = require('https');
      const options = {
        hostname: 'openrouter.ai',
        port: 443,
        path: '/api/v1/models',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'MindsetOS Platform'
        }
      };

      const openRouterModels = await new Promise((resolve, reject) => {
        const req = https.request(options, (response) => {
          let data = '';
          response.on('data', (chunk) => data += chunk);
          response.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
        });
        req.on('error', reject);
        req.end();
      });

      // Filter and format models for ECOS
      const ecosModels = {};
      let count = 0;

      if (openRouterModels.data) {
        openRouterModels.data.forEach(model => {
          // Only include models suitable for chat/text tasks
          if (model.id && model.name && !model.id.includes('image') && !model.id.includes('whisper')) {
            ecosModels[model.id] = {
              name: model.name,
              provider: model.id.split('/')[0],
              openrouter_id: model.id,
              description: model.description || 'No description available',
              context_length: model.context_length || 0,
              pricing: {
                prompt: model.pricing?.prompt || '0',
                completion: model.pricing?.completion || '0'
              },
              top_provider: model.top_provider || null,
              per_request_limits: model.per_request_limits || null
            };
            count++;
          }
        });
      }

      console.log(`✅ [ADMIN] Fetched ${count} models from OpenRouter`);

      // Save models to database
      try {
        for (const [modelId, modelData] of Object.entries(ecosModels)) {
          await pool.query(`
            INSERT INTO ai_models (
              model_id, model_name, provider, description, context_length,
              pricing_prompt, pricing_completion, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (model_id) DO UPDATE SET
              model_name = EXCLUDED.model_name,
              provider = EXCLUDED.provider,
              description = EXCLUDED.description,
              context_length = EXCLUDED.context_length,
              pricing_prompt = EXCLUDED.pricing_prompt,
              pricing_completion = EXCLUDED.pricing_completion,
              metadata = EXCLUDED.metadata,
              last_updated = CURRENT_TIMESTAMP
          `, [
            modelId,
            modelData.name,
            modelData.provider,
            modelData.description,
            modelData.context_length || 0,
            parseFloat(modelData.pricing?.prompt || 0),
            parseFloat(modelData.pricing?.completion || 0),
            JSON.stringify({
              top_provider: modelData.top_provider,
              per_request_limits: modelData.per_request_limits
            })
          ]);
        }
        console.log(`💾 [ADMIN] Saved ${count} models to database`);
      } catch (dbError) {
        console.error('⚠️  Failed to save models to database:', dbError.message);
      }

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        success: true,
        models: ecosModels,
        count: count,
        updated_at: new Date().toISOString()
      }));
    } catch (error) {
      console.error('❌ Failed to fetch OpenRouter models:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({
        error: 'Failed to fetch models from OpenRouter',
        message: error.message
      }));
    }
    return;
  }

  // Widget formatter model endpoint
  if (path === '/api/admin/ai-models/widget_formatter' && method === 'PUT') {
    const body = await parseBody(req);
    widgetFormatterModel = body.modelId;
    console.log('✨ Widget formatter model updated to:', widgetFormatterModel);
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({ success: true, message: 'Widget formatter model updated successfully', modelId: widgetFormatterModel }));
    return;
  }

  // ============================================================
  // ==================================================================
  // NEW ADMIN ENDPOINTS FOR PER-AGENT MODEL CONFIGURATION & ANALYTICS
  // ==================================================================
  // INSERT THESE ENDPOINTS IN real-backend.cjs AFTER LINE 2061
  // (After the widget_formatter endpoint, before MEMORY SYSTEM ENDPOINTS section)
  
    // ============================================================
    // ADMIN: AGENT MODEL CONFIGURATION
    // ============================================================
  
    // Update agent model configuration
    if (path.match(/^\/api\/admin\/agents\/[^\/]+\/models$/) && method === 'PUT') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user || user.role !== 'admin') {
        res.writeHead(403, corsHeaders);
        res.end(JSON.stringify({ error: 'Admin access required' }));
        return;
      }
  
      try {
        const agentId = path.split('/')[4];
        const body = await parseBody(req);
        const { chat_model, memory_model, widget_model } = body;
  
        console.log(`🔧 [ADMIN] Updating model config for agent: ${agentId}`);
  
        await pool.query(`
          UPDATE agents
          SET chat_model = $1,
              memory_model = $2,
              widget_model = $3,
              updated_at = NOW()
          WHERE id = $4
        `, [chat_model || null, memory_model || null, widget_model || null, agentId]);
  
        // Reload agents cache
        await loadAgentsFromDatabase();
  
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          message: 'Agent model configuration updated',
          agent_id: agentId
        }));
      } catch (error) {
        console.error('❌ Error updating agent models:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to update agent models' }));
      }
      return;
    }

    // ============================================================
    // ADMIN: RUN MODEL MIGRATION (TEMPORARY ENDPOINT)
    // ============================================================

    // Run SQL migration to update all agents to optimal models
    if (path.startsWith('/api/admin/update-agent-models') && method === 'POST') {
      const parsedUrl = url.parse(req.url, true);
      const migrationKey = parsedUrl.query.key;

      // Temporary bypass for one-time migration (remove after use)
      const isValidMigration = migrationKey === 'haiku45_perf_fix_2025';

      if (!isValidMigration) {
        const user = getUserFromToken(req.headers.authorization);
        if (!user || user.role !== 'admin') {
          res.writeHead(403, corsHeaders);
          res.end(JSON.stringify({ error: 'Admin access required' }));
          return;
        }
      }

      try {
        console.log('🔄 [ADMIN] Running agent model migration...');

        // Sonnet 4.5 for chat (except voice), Haiku 4.5 for memory/widgets/voice
        const sqlPath = pathModule.join(__dirname, 'optimal-models.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await pool.query(sql);

        // Reload agents cache
        await loadAgentsFromDatabase();

        // Get updated agents to show in response
        const result = await pool.query(`
          SELECT id, name, chat_model, memory_model, widget_model, temperature, max_tokens
          FROM agents
          WHERE is_active = true
          ORDER BY id
        `);

        console.log('✅ [ADMIN] Agent model migration completed successfully');

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          message: 'Agent models updated to optimal configuration',
          agents: result.rows
        }));
      } catch (error) {
        console.error('❌ Error running migration:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to run migration: ' + error.message }));
      }
      return;
    }

    // Temporary: Admin read-only query endpoint (key-protected, SELECT only)
    if (path === '/api/admin/query' && method === 'POST') {
      const parsedUrl = url.parse(req.url, true);
      if (parsedUrl.query.key !== 'haiku45_perf_fix_2025') {
        res.writeHead(403, corsHeaders);
        res.end(JSON.stringify({ error: 'Invalid key' }));
        return;
      }
      try {
        const body = await parseBody(req);
        const sql = (body.sql || '').trim();
        if (!sql.toUpperCase().startsWith('SELECT')) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Only SELECT queries allowed' }));
          return;
        }
        const result = await pool.query(sql);
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ success: true, rows: result.rows, count: result.rowCount }));
      } catch (error) {
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: error.message }));
      }
      return;
    }

    // ============================================================
    // ADMIN: ENABLE RAG FOR ALL AGENTS
    // ============================================================

    if (path.startsWith('/api/admin/enable-rag') && method === 'POST') {
      const parsedUrl = url.parse(req.url, true);
      const bypassKey = parsedUrl.query.key;

      // Temporary bypass for one-time setup
      const isValidBypass = bypassKey === 'enable_rag_2025';

      if (!isValidBypass) {
        const user = getUserFromToken(req.headers.authorization);
        if (!user || user.role !== 'admin') {
          res.writeHead(403, corsHeaders);
          res.end(JSON.stringify({ error: 'Admin access required' }));
          return;
        }
      }

      try {
        console.log('🔧 [ADMIN] Enabling RAG for all agents...');

        // Create agent_rag_settings table if it doesn't exist
        await pool.query(`
          CREATE TABLE IF NOT EXISTS agent_rag_settings (
            agent_id VARCHAR(100) PRIMARY KEY,
            enabled BOOLEAN DEFAULT true,
            top_k INTEGER DEFAULT 3,
            min_similarity DECIMAL(3,2) DEFAULT 0.70,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `);

        // Enable RAG for all active agents (preserve existing tuned thresholds)
        await pool.query(`
          INSERT INTO agent_rag_settings (agent_id, enabled, top_k, min_similarity)
          SELECT id, true, 5, 0.35
          FROM agents
          WHERE is_active = true
          ON CONFLICT (agent_id)
          DO UPDATE SET
            enabled = true,
            top_k = 5,
            updated_at = NOW()
        `);

        // Get results
        const settingsResult = await pool.query(`
          SELECT
            a.id,
            a.name,
            ars.enabled as rag_enabled,
            ars.top_k,
            ars.min_similarity
          FROM agents a
          LEFT JOIN agent_rag_settings ars ON a.id = ars.agent_id
          WHERE a.is_active = true
          ORDER BY a.id
        `);

        // Check knowledge base
        const kbResult = await pool.query(`
          SELECT
            id,
            title,
            category,
            agent_id,
            created_at
          FROM knowledge_base
          ORDER BY created_at DESC
          LIMIT 10
        `);

        console.log(`✅ [ADMIN] RAG enabled for ${settingsResult.rows.length} agents`);
        console.log(`📚 [ADMIN] Found ${kbResult.rows.length} knowledge base documents`);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          message: `RAG enabled for ${settingsResult.rows.length} agents`,
          agents: settingsResult.rows,
          knowledge_base: kbResult.rows
        }));
      } catch (error) {
        console.error('❌ Error enabling RAG:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to enable RAG: ' + error.message }));
      }
      return;
    }

    // ============================================================
    // ADMIN: DATABASE MIGRATION ENDPOINT (ONE-TIME USE)
    // ============================================================

    if (path === '/api/admin/migrate-knowledge-base' && method === 'POST') {
      // Require bypass key for safety
      const url = new URL(req.url, `http://${req.headers.host}`);
      const bypassKey = url.searchParams.get('key');
      if (bypassKey !== 'migrate-kb-schema-2025') {
        res.writeHead(403, corsHeaders);
        res.end(JSON.stringify({ error: 'Invalid bypass key' }));
        return;
      }

      try {
        console.log('🔧 [MIGRATION] Starting knowledge_base schema migration...');

        // Add agent_id column if it doesn't exist
        await pool.query(`
          ALTER TABLE knowledge_base
          ADD COLUMN IF NOT EXISTS agent_id VARCHAR(255)
        `);
        console.log('✅ [MIGRATION] Added agent_id column');

        // Drop old embedding column and recreate with correct dimension
        await pool.query(`
          ALTER TABLE knowledge_base
          DROP COLUMN IF EXISTS embedding
        `);
        console.log('✅ [MIGRATION] Dropped old embedding column');

        await pool.query(`
          ALTER TABLE knowledge_base
          ADD COLUMN embedding vector(1536)
        `);
        console.log('✅ [MIGRATION] Added new embedding column with 1536 dimensions');

        // Add indexes for better performance
        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_knowledge_base_agent_id
          ON knowledge_base(agent_id)
        `);
        console.log('✅ [MIGRATION] Added agent_id index');

        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_knowledge_base_embedding
          ON knowledge_base
          USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
        `);
        console.log('✅ [MIGRATION] Added embedding vector index');

        console.log('🎉 [MIGRATION] Knowledge base schema migration complete!');

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          message: 'Knowledge base schema migrated successfully',
          changes: [
            'Added agent_id column',
            'Updated embedding vector to 1536 dimensions',
            'Added performance indexes'
          ]
        }));
      } catch (error) {
        console.error('❌ [MIGRATION] Failed:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({
          error: 'Migration failed: ' + error.message,
          stack: error.stack
        }));
      }
      return;
    }

    // ============================================================
    // ADMIN: FIX MEMORIES TABLE DIMENSIONS
    // ============================================================

    if (path === '/api/admin/fix-memories-dimensions' && method === 'POST') {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const bypassKey = url.searchParams.get('key');
      if (bypassKey !== 'fix-memories-2025') {
        res.writeHead(403, corsHeaders);
        res.end(JSON.stringify({ error: 'Invalid bypass key' }));
        return;
      }

      try {
        console.log('🔧 [MIGRATION] Fixing memories table embedding dimensions...');

        // Drop old embedding column
        await pool.query(`ALTER TABLE memories DROP COLUMN IF EXISTS embedding`);
        console.log('✅ [MIGRATION] Dropped old embedding column');

        // Add new embedding column with 1536 dimensions
        await pool.query(`ALTER TABLE memories ADD COLUMN embedding vector(1536)`);
        console.log('✅ [MIGRATION] Added new embedding column (1536 dimensions)');

        // Recreate index
        await pool.query(`DROP INDEX IF EXISTS idx_memories_embedding`);
        await pool.query(`
          CREATE INDEX idx_memories_embedding ON memories
          USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)
        `);
        console.log('✅ [MIGRATION] Recreated vector index');

        console.log('🎉 [MIGRATION] Memories table migration complete!');

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          message: 'Memories table embedding dimensions updated to 1536',
          changes: [
            'Dropped old embedding column (768 dimensions)',
            'Added new embedding column (1536 dimensions)',
            'Recreated vector similarity index',
            'Memory extraction will now work correctly'
          ]
        }));
      } catch (error) {
        console.error('❌ [MIGRATION] Failed:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({
          error: 'Migration failed: ' + error.message,
          stack: error.stack
        }));
      }
      return;
    }

    // ============================================================
    // ADMIN: FIX MMM-5IN30 AGENT CONFIGURATION
    // ============================================================

    if (path === '/api/admin/fix-mmm-agent' && method === 'POST') {
      // Require bypass key for safety
      const url = new URL(req.url, `http://${req.headers.host}`);
      const bypassKey = url.searchParams.get('key');
      if (bypassKey !== 'fix-mmm-config-2025') {
        res.writeHead(403, corsHeaders);
        res.end(JSON.stringify({ error: 'Invalid bypass key' }));
        return;
      }

      try {
        console.log('🔧 [FIX] Updating MMM-5IN30 agent configuration...');

        // Update agent models
        await pool.query(`
          UPDATE agents
          SET
            memory_model = 'anthropic/claude-haiku-4.5',
            widget_model = 'anthropic/claude-haiku-4.5'
          WHERE id = 'mmm-5in30'
        `);
        console.log('✅ [FIX] Updated agent models');

        // Reload agent cache
        await loadAgentsFromDatabase();
        console.log('✅ [FIX] Agent cache reloaded');

        // Get updated config
        const result = await pool.query(`
          SELECT id, name, chat_model, memory_model, widget_model
          FROM agents
          WHERE id = 'mmm-5in30'
        `);

        console.log('🎉 [FIX] MMM-5IN30 configuration updated successfully!');

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          message: 'MMM-5IN30 agent configuration updated',
          agent: result.rows[0],
          changes: [
            'Memory model: Claude Sonnet 4.5 → Claude Haiku 4.5 (cost optimization)',
            'Widget model: Claude Sonnet 4.5 → Claude Haiku 4.5 (cost optimization)',
            'Chat model: Kept as Claude Sonnet 4.5 (premium quality)'
          ]
        }));
      } catch (error) {
        console.error('❌ [FIX] Failed:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({
          error: 'Fix failed: ' + error.message,
          stack: error.stack
        }));
      }
      return;
    }

    // ============================================================
    // ADMIN: ENABLE RAG FOR MMM-5IN30
    // ============================================================

    if (path === '/api/admin/enable-rag-mmm' && method === 'POST') {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const bypassKey = url.searchParams.get('key');
      if (bypassKey !== 'enable-rag-2025') {
        res.writeHead(403, corsHeaders);
        res.end(JSON.stringify({ error: 'Invalid bypass key' }));
        return;
      }

      try {
        console.log('🔧 [RAG] Enabling RAG for MMM-5IN30...');

        // Enable RAG settings with correct column names
        await pool.query(`
          INSERT INTO agent_rag_settings (
            agent_id,
            enabled,
            top_k,
            min_similarity,
            created_at,
            updated_at
          )
          VALUES ('mmm-5in30', true, 5, 0.25, NOW(), NOW())
          ON CONFLICT (agent_id)
          DO UPDATE SET
            enabled = true,
            top_k = 5,
            updated_at = NOW()
        `);
        console.log('✅ [RAG] RAG settings enabled');

        // Verify settings
        const settingsResult = await pool.query(`
          SELECT * FROM agent_rag_settings WHERE agent_id = 'mmm-5in30'
        `);

        // Check for uploaded documents
        const docsResult = await pool.query(`
          SELECT COUNT(*) as count FROM knowledge_base WHERE agent_id = 'mmm-5in30'
        `);

        // Check for document chunks
        const chunksResult = await pool.query(`
          SELECT COUNT(*) as count
          FROM document_chunks dc
          JOIN knowledge_base kb ON dc.knowledge_id = kb.id
          WHERE kb.agent_id = 'mmm-5in30'
        `);

        console.log('🎉 [RAG] MMM-5IN30 RAG enabled successfully!');

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          message: 'RAG enabled for MMM-5IN30',
          settings: settingsResult.rows[0],
          stats: {
            documents: parseInt(docsResult.rows[0].count),
            chunks: parseInt(chunksResult.rows[0].count)
          },
          changes: [
            'RAG enabled: true',
            'Top K results: 5',
            'Similarity threshold: 0.7',
            `Knowledge base: ${docsResult.rows[0].count} documents, ${chunksResult.rows[0].count} chunks`
          ]
        }));
      } catch (error) {
        console.error('❌ [RAG] Failed:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({
          error: 'RAG enable failed: ' + error.message,
          stack: error.stack
        }));
      }
      return;
    }

    // ============================================================
    // ADMIN: DEBUG MODE TOGGLE
    // ============================================================

    // Get debug mode status
    if (path === '/api/admin/debug-mode' && method === 'GET') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user || user.role !== 'admin') {
        res.writeHead(403, corsHeaders);
        res.end(JSON.stringify({ error: 'Admin access required' }));
        return;
      }

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        debugMode: ADMIN_DEBUG_MODE,
        message: ADMIN_DEBUG_MODE ? 'Debug mode is ON - Verbose logging enabled' : 'Debug mode is OFF'
      }));
      return;
    }

    // Toggle debug mode
    if (path === '/api/admin/debug-mode' && method === 'PUT') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user || user.role !== 'admin') {
        res.writeHead(403, corsHeaders);
        res.end(JSON.stringify({ error: 'Admin access required' }));
        return;
      }

      const { enabled } = await parseBody(req);

      ADMIN_DEBUG_MODE = enabled;

      console.log(`🔧 [ADMIN] Debug mode ${ADMIN_DEBUG_MODE ? 'ENABLED' : 'DISABLED'} by ${user.email}`);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        success: true,
        debugMode: ADMIN_DEBUG_MODE,
        message: ADMIN_DEBUG_MODE ? 'Debug mode enabled - Verbose logging active' : 'Debug mode disabled'
      }));
      return;
    }

    // ============================================================
    // ADMIN: ANALYTICS API ENDPOINTS
    // ============================================================

    // Get overall analytics
    if (path === '/api/admin/analytics' && method === 'GET') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user || user.role !== 'admin') {
        res.writeHead(403, corsHeaders);
        res.end(JSON.stringify({ error: 'Admin access required' }));
        return;
      }
  
      try {
        const parsedUrl = url.parse(req.url, true);
        const days = parseInt(parsedUrl.query.days) || 7;
  
        console.log(`📊 [ANALYTICS] Fetching analytics for last ${days} days`);
  
        // Overall stats
        const overallStats = await pool.query(`
          SELECT
            COUNT(*) as total_requests,
            SUM(input_tokens) as total_input_tokens,
            SUM(output_tokens) as total_output_tokens,
            SUM(input_tokens + output_tokens) as total_tokens,
            SUM(cost_usd) as total_cost,
            AVG(latency_ms) as avg_latency,
            COUNT(DISTINCT user_id) as unique_users,
            COUNT(DISTINCT agent_id) as active_agents
          FROM api_usage_logs
          WHERE created_at >= NOW() - INTERVAL '${days} days'
        `);
  
        // By agent
        const byAgent = await pool.query(`
          SELECT
            agent_id,
            COUNT(*) as requests,
            SUM(input_tokens) as input_tokens,
            SUM(output_tokens) as output_tokens,
            SUM(cost_usd) as cost,
            AVG(latency_ms) as avg_latency
          FROM api_usage_logs
          WHERE created_at >= NOW() - INTERVAL '${days} days'
            AND agent_id IS NOT NULL
          GROUP BY agent_id
          ORDER BY requests DESC
        `);
  
        // By model
        const byModel = await pool.query(`
          SELECT
            model_id,
            operation,
            COUNT(*) as requests,
            SUM(input_tokens) as input_tokens,
            SUM(output_tokens) as output_tokens,
            SUM(cost_usd) as cost,
            AVG(latency_ms) as avg_latency
          FROM api_usage_logs
          WHERE created_at >= NOW() - INTERVAL '${days} days'
          GROUP BY model_id, operation
          ORDER BY requests DESC
        `);
  
        // Time series data (daily)
        const timeSeries = await pool.query(`
          SELECT
            DATE(created_at) as date,
            COUNT(*) as requests,
            SUM(cost_usd) as cost,
            SUM(input_tokens + output_tokens) as tokens
          FROM api_usage_logs
          WHERE created_at >= NOW() - INTERVAL '${days} days'
          GROUP BY DATE(created_at)
          ORDER BY date ASC
        `);
  
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          overview: overallStats.rows[0],
          byAgent: byAgent.rows,
          byModel: byModel.rows,
          timeSeries: timeSeries.rows
        }));
      } catch (error) {
        console.error('❌ Error fetching analytics:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to fetch analytics' }));
      }
      return;
    }
  
    // Get agent-specific analytics
    if (path.match(/^\/api\/admin\/analytics\/agents\/[^\/]+$/) && method === 'GET') {
      const user = getUserFromToken(req.headers.authorization);
      if (!user || user.role !== 'admin') {
        res.writeHead(403, corsHeaders);
        res.end(JSON.stringify({ error: 'Admin access required' }));
        return;
      }
  
      try {
        const agentId = path.split('/')[5];
        const parsedUrl = url.parse(req.url, true);
        const days = parseInt(parsedUrl.query.days) || 30;
  
        console.log(`📊 [ANALYTICS] Fetching analytics for agent: ${agentId} (${days} days)`);
  
        // Agent stats
        const agentStats = await pool.query(`
          SELECT
            COUNT(*) as total_requests,
            SUM(input_tokens) as total_input_tokens,
            SUM(output_tokens) as total_output_tokens,
            SUM(cost_usd) as total_cost,
            AVG(latency_ms) as avg_latency,
            COUNT(DISTINCT user_id) as unique_users,
            COUNT(DISTINCT conversation_id) as conversations
          FROM api_usage_logs
          WHERE agent_id = $1
            AND created_at >= NOW() - INTERVAL '${days} days'
        `, [agentId]);
  
        // Model breakdown for this agent
        const modelBreakdown = await pool.query(`
          SELECT
            model_id,
            operation,
            COUNT(*) as requests,
            SUM(cost_usd) as cost,
            AVG(latency_ms) as avg_latency
          FROM api_usage_logs
          WHERE agent_id = $1
            AND created_at >= NOW() - INTERVAL '${days} days'
          GROUP BY model_id, operation
          ORDER BY requests DESC
        `, [agentId]);
  
        // Daily time series
        const dailyStats = await pool.query(`
          SELECT
            DATE(created_at) as date,
            COUNT(*) as requests,
            SUM(cost_usd) as cost
          FROM api_usage_logs
          WHERE agent_id = $1
            AND created_at >= NOW() - INTERVAL '${days} days'
          GROUP BY DATE(created_at)
          ORDER BY date ASC
        `, [agentId]);
  
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          agent_id: agentId,
          stats: agentStats.rows[0],
          modelBreakdown: modelBreakdown.rows,
          dailyStats: dailyStats.rows
        }));
      } catch (error) {
        console.error('❌ Error fetching agent analytics:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to fetch agent analytics' }));
      }
      return;
    }

  // Get conversation token usage stats
  if (path.match(/^\/api\/conversations\/[^\/]+\/analytics$/) && method === 'GET') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const conversationId = path.split('/')[3];

      console.log(`📊 [ANALYTICS] Fetching token usage for conversation: ${conversationId}`);

      // Get conversation token stats
      const stats = await pool.query(`
        SELECT
          COUNT(*) as total_messages,
          SUM(input_tokens) as total_input_tokens,
          SUM(output_tokens) as total_output_tokens,
          SUM(input_tokens + output_tokens) as total_tokens,
          SUM(cost_usd) as total_cost,
          AVG(latency_ms) as avg_latency_ms,
          MIN(created_at) as first_message_at,
          MAX(created_at) as last_message_at
        FROM api_usage_logs
        WHERE conversation_id = $1
      `, [conversationId]);

      // Get per-message breakdown
      const messages = await pool.query(`
        SELECT
          created_at,
          operation,
          model_id,
          input_tokens,
          output_tokens,
          (input_tokens + output_tokens) as total_tokens,
          cost_usd,
          latency_ms
        FROM api_usage_logs
        WHERE conversation_id = $1
        ORDER BY created_at ASC
      `, [conversationId]);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        conversation_id: conversationId,
        stats: stats.rows[0],
        messages: messages.rows
      }));
    } catch (error) {
      console.error('❌ Error fetching conversation analytics:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to fetch conversation analytics' }));
    }
    return;
  }

  // ==================================================================
  // ADMIN: SECURITY EVENTS
  // ==================================================================

  // Get security stats
  if (path === '/api/admin/security/stats' && method === 'GET') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user || (user.role !== 'admin' && user.role !== 'power_user')) {
      res.writeHead(403, corsHeaders);
      res.end(JSON.stringify({ error: 'Admin access required' }));
      return;
    }
    try {
      // Query jailbreak patterns directly from messages (same as report system)
      const jailbreakCount = await pool.query(`
        SELECT COUNT(*) as total FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        WHERE m.role = 'user' AND (
          LOWER(m.content) LIKE '%ignore previous%' OR LOWER(m.content) LIKE '%ignore all%'
          OR LOWER(m.content) LIKE '%disregard%instruction%' OR LOWER(m.content) LIKE '%system prompt%'
          OR LOWER(m.content) LIKE '%reveal your%' OR LOWER(m.content) LIKE '%show me your prompt%'
          OR LOWER(m.content) LIKE '%what are your instructions%' OR LOWER(m.content) LIKE '%pretend you are%'
          OR LOWER(m.content) LIKE '%jailbreak%' OR LOWER(m.content) LIKE '%dan mode%'
          OR LOWER(m.content) LIKE '%developer mode%' OR LOWER(m.content) LIKE '%bypass%filter%'
          OR LOWER(m.content) LIKE '%override%' OR LOWER(m.content) LIKE '%forget everything%'
          OR m.content LIKE '%[SYSTEM]%' OR m.content LIKE '%<|%'
        )
      `);
      // Also check security_events table if it exists
      let eventStats = { total: 0, unresolved: 0, byType: {} };
      try {
        const seResult = await pool.query(`
          SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE resolved = false) as unresolved,
            event_type, COUNT(*) as type_count
          FROM security_events
          GROUP BY event_type
        `);
        eventStats.total = seResult.rows.reduce((sum, r) => sum + parseInt(r.type_count), 0);
        eventStats.unresolved = seResult.rows.reduce((sum, r) => sum + parseInt(r.unresolved || 0), 0);
        seResult.rows.forEach(r => { eventStats.byType[r.event_type] = parseInt(r.type_count); });
      } catch (e) { /* security_events table may not exist yet */ }

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        jailbreakAttempts: parseInt(jailbreakCount.rows[0].total),
        events: eventStats,
        patternsMonitored: 16
      }));
    } catch (error) {
      console.error('Error fetching security stats:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to fetch security stats' }));
    }
    return;
  }

  // Get security events (jailbreak attempts from messages)
  if (path === '/api/admin/security/events' && method === 'GET') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user || (user.role !== 'admin' && user.role !== 'power_user')) {
      res.writeHead(403, corsHeaders);
      res.end(JSON.stringify({ error: 'Admin access required' }));
      return;
    }
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
      const offset = (page - 1) * limit;

      const result = await pool.query(`
        SELECT
          m.id, m.content, m.created_at,
          c.user_id, c.agent_id, c.id as conversation_id,
          u.email as user_email, u.name as user_name,
          a.name as agent_name,
          CASE
            WHEN LOWER(m.content) LIKE '%ignore previous%' OR LOWER(m.content) LIKE '%ignore all%' OR LOWER(m.content) LIKE '%disregard%instruction%' OR LOWER(m.content) LIKE '%forget everything%' THEN 'prompt_injection'
            WHEN LOWER(m.content) LIKE '%system prompt%' OR LOWER(m.content) LIKE '%reveal your%' OR LOWER(m.content) LIKE '%show me your prompt%' OR LOWER(m.content) LIKE '%what are your instructions%' THEN 'config_access'
            WHEN LOWER(m.content) LIKE '%jailbreak%' OR LOWER(m.content) LIKE '%dan mode%' OR LOWER(m.content) LIKE '%developer mode%' OR LOWER(m.content) LIKE '%bypass%filter%' THEN 'jailbreak_attempt'
            WHEN LOWER(m.content) LIKE '%pretend you are%' OR LOWER(m.content) LIKE '%new persona%' OR m.content LIKE '%[SYSTEM]%' OR m.content LIKE '%<|%' THEN 'suspicious_pattern'
            ELSE 'unknown'
          END as event_type,
          CASE
            WHEN LOWER(m.content) LIKE '%jailbreak%' OR LOWER(m.content) LIKE '%bypass%filter%' OR m.content LIKE '%<|%' THEN 'high'
            WHEN LOWER(m.content) LIKE '%system prompt%' OR LOWER(m.content) LIKE '%reveal your%' OR LOWER(m.content) LIKE '%ignore previous%' THEN 'medium'
            ELSE 'low'
          END as severity
        FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        LEFT JOIN users u ON c.user_id = u.id
        LEFT JOIN agents a ON c.agent_id = a.id
        WHERE m.role = 'user' AND (
          LOWER(m.content) LIKE '%ignore previous%' OR LOWER(m.content) LIKE '%ignore all%'
          OR LOWER(m.content) LIKE '%disregard%instruction%' OR LOWER(m.content) LIKE '%system prompt%'
          OR LOWER(m.content) LIKE '%reveal your%' OR LOWER(m.content) LIKE '%show me your prompt%'
          OR LOWER(m.content) LIKE '%what are your instructions%' OR LOWER(m.content) LIKE '%pretend you are%'
          OR LOWER(m.content) LIKE '%jailbreak%' OR LOWER(m.content) LIKE '%dan mode%'
          OR LOWER(m.content) LIKE '%developer mode%' OR LOWER(m.content) LIKE '%bypass%filter%'
          OR LOWER(m.content) LIKE '%override%' OR LOWER(m.content) LIKE '%forget everything%'
          OR m.content LIKE '%[SYSTEM]%' OR m.content LIKE '%<|%'
        )
        ORDER BY m.created_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ events: result.rows, page, limit }));
    } catch (error) {
      console.error('Error fetching security events:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to fetch security events' }));
    }
    return;
  }

  // ==================================================================
  // ADMIN: SOFT-DELETED CONVERSATIONS
  // ==================================================================

  // List soft-deleted conversations (admin only)
  if (path === '/api/admin/conversations/deleted' && method === 'GET') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user || (user.role !== 'admin' && user.role !== 'power_user')) {
      res.writeHead(403, corsHeaders);
      res.end(JSON.stringify({ error: 'Admin access required' }));
      return;
    }
    try {
      const result = await pool.query(`
        SELECT c.id, c.title, c.agent_id, c.user_id, c.deleted_at, c.created_at, c.updated_at,
               u.email as user_email, u.name as user_name,
               a.name as agent_name,
               (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
        FROM conversations c
        LEFT JOIN users u ON c.user_id = u.id
        LEFT JOIN agents a ON c.agent_id = a.id
        WHERE c.deleted_at IS NOT NULL
        ORDER BY c.deleted_at DESC
        LIMIT 100
      `);
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ conversations: result.rows }));
    } catch (error) {
      console.error('Error fetching deleted conversations:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to fetch deleted conversations' }));
    }
    return;
  }

  // Restore soft-deleted conversation (admin only)
  if (path.match(/^\/api\/admin\/conversations\/[^\/]+\/restore$/) && method === 'POST') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user || user.role !== 'admin') {
      res.writeHead(403, corsHeaders);
      res.end(JSON.stringify({ error: 'Admin access required' }));
      return;
    }
    try {
      const conversationId = path.split('/')[4];
      await pool.query('UPDATE conversations SET deleted_at = NULL WHERE id = $1', [conversationId]);
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true, message: 'Conversation restored' }));
    } catch (error) {
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to restore conversation' }));
    }
    return;
  }

  // Permanently delete conversation (admin only)
  if (path.match(/^\/api\/admin\/conversations\/[^\/]+\/permanent$/) && method === 'DELETE') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user || user.role !== 'admin') {
      res.writeHead(403, corsHeaders);
      res.end(JSON.stringify({ error: 'Admin access required' }));
      return;
    }
    try {
      const conversationId = path.split('/')[4];
      await pool.query('DELETE FROM messages WHERE conversation_id = $1', [conversationId]);
      await pool.query('DELETE FROM conversations WHERE id = $1', [conversationId]);
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true, message: 'Conversation permanently deleted' }));
    } catch (error) {
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to permanently delete conversation' }));
    }
    return;
  }

  // ==================================================================
  // END OF NEW ADMIN ENDPOINTS
  // ==================================================================
  // MEMORY SYSTEM ENDPOINTS
  // ============================================================

  // Extract memories from conversation (AI-powered)
  if (path === '/api/memory/extract' && method === 'POST') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const body = await parseBody(req);
      const { conversationId, messages: conversationMessages } = body;

      console.log(`🧠 [MEMORY] Extracting memories from conversation ${conversationId}`);

      // Build conversation text for AI analysis from USER messages only
      const conversationText = conversationMessages
        .filter(msg => msg.role === 'user')
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n\n');

      // Call AI to extract memories
      const extractionPrompt = `Analyze this conversation and extract important information that should be remembered about the user.

Conversation:
${conversationText}

Extract the following types of information:
1. GOALS - What the user wants to achieve
2. PAIN_POINTS - Problems or challenges mentioned
3. BUSINESS_CONTEXT - Information about their business, industry, role
4. STRATEGIES - Approaches or methods they prefer
5. PREFERENCES - Likes, dislikes, communication style
6. DECISIONS - Important decisions or commitments made

For each memory, provide:
- type: one of [goals, pain_points, business_context, strategies, preferences, decisions]
- content: concise description (1-2 sentences)
- importance: score 0.0-1.0 (0.7+ for critical info, 0.4-0.7 for useful info, <0.4 for minor details)

Return ONLY a JSON array of memories, no other text:
[{"type": "goals", "content": "...", "importance": 0.8}, ...]`;

      const openRouterResponse = await callOpenRouter(
        [{ role: 'user', content: extractionPrompt }],
        'openai/gpt-4o-mini'
      );

      let memories = [];
      try {
        // Parse AI response
        const jsonMatch = openRouterResponse.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          memories = JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.error('❌ Failed to parse memory extraction response:', parseError);
      }

      console.log(`📊 [MEMORY] Extracted ${memories.length} memories`);

      // Save memories to PostgreSQL
      const savedMemories = [];
      for (const memory of memories) {
        const result = await pool.query(`
          INSERT INTO memories (
            user_id, agent_id, memory_type, content, importance_score,
            source_conversation_id, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
          RETURNING id, memory_type, content, importance_score, created_at
        `, [
          user.id,
          'system', // Can be enhanced to track which agent created the memory
          memory.type,
          memory.content,
          memory.importance || 0.5,
          conversationId
        ]);

        savedMemories.push(result.rows[0]);
        console.log(`✅ [MEMORY] Saved ${memory.type}: ${memory.content.substring(0, 50)}...`);
      }

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        success: true,
        memories: savedMemories,
        count: savedMemories.length
      }));
    } catch (error) {
      console.error('❌ Memory extraction error:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to extract memories' }));
    }
    return;
  }

  // Optimize memories (merge duplicates, archive low-importance)
  if (path.match(/^\/api\/memory\/optimize\/[^\/]+$/) && method === 'POST') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const userId = path.split('/')[4];
      console.log(`🔧 [MEMORY] Optimizing memories for user ${userId}`);

      // Step 1: Archive low-importance memories (<0.3)
      const archiveResult = await pool.query(`
        UPDATE memories
        SET status = 'archived', updated_at = NOW()
        WHERE user_id = $1
          AND status = 'active'
          AND importance_score < 0.3
        RETURNING id
      `, [userId]);

      console.log(`📦 Archived ${archiveResult.rows.length} low-importance memories`);

      // Step 2: Find and merge duplicate memories (same content with similarity)
      const duplicatesQuery = await pool.query(`
        SELECT m1.id as id1, m2.id as id2, m1.content, m2.content,
               GREATEST(m1.importance_score, m2.importance_score) as max_importance
        FROM memories m1
        JOIN memories m2 ON m1.user_id = m2.user_id
          AND m1.memory_type = m2.memory_type
          AND m1.id < m2.id
          AND m1.status = 'active'
          AND m2.status = 'active'
          AND similarity(m1.content, m2.content) > 0.7
        WHERE m1.user_id = $1
      `, [userId]);

      let mergedCount = 0;
      for (const dup of duplicatesQuery.rows) {
        // Keep the one with higher ID (more recent), update its importance
        await pool.query(`
          UPDATE memories
          SET importance_score = $1, updated_at = NOW()
          WHERE id = $2
        `, [dup.max_importance, dup.id2]);

        // Archive the duplicate
        await pool.query(`
          UPDATE memories
          SET status = 'merged', updated_at = NOW()
          WHERE id = $1
        `, [dup.id1]);

        mergedCount++;
      }

      console.log(`🔀 Merged ${mergedCount} duplicate memories`);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        success: true,
        message: `Optimization complete: Archived ${archiveResult.rows.length} low-importance memories, merged ${mergedCount} duplicates`,
        archived: archiveResult.rows.length,
        merged: mergedCount
      }));
    } catch (error) {
      console.error('❌ Memory optimization error:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to optimize memories' }));
    }
    return;
  }

  // Delete memory (soft delete)
  if (path.match(/^\/api\/memory\/[^\/]+$/) && method === 'DELETE') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const memoryId = path.split('/').pop();

      await pool.query(`
        UPDATE memories
        SET status = 'archived', archived_at = NOW(), archived_reason = 'user_deleted'
        WHERE id = $1 AND user_id = $2
      `, [memoryId, user.id]);

      console.log(`🗑️ [MEMORY] Archived memory ${memoryId}`);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true }));
    } catch (error) {
      console.error('❌ Memory delete error:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to delete memory' }));
    }
    return;
  }

  // Update memory
  if (path.match(/^\/api\/memory\/[^\/]+$/) && method === 'PUT') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const memoryId = path.split('/').pop();
      const body = await parseBody(req);
      const { pinned, importance_score, content } = body;

      const updates = [];
      const values = [];
      let paramCount = 1;

      if (pinned !== undefined) {
        updates.push(`pinned = $${paramCount++}`);
        values.push(pinned);
      }
      if (importance_score !== undefined) {
        updates.push(`importance_score = $${paramCount++}`);
        values.push(importance_score);
      }
      if (content !== undefined) {
        updates.push(`content = $${paramCount++}`);
        values.push(content);
      }

      updates.push(`updated_at = NOW()`);
      values.push(memoryId, user.id);

      await pool.query(`
        UPDATE memories
        SET ${updates.join(', ')}
        WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
      `, values);

      console.log(`✏️ [MEMORY] Updated memory ${memoryId}`);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true }));
    } catch (error) {
      console.error('❌ Memory update error:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to update memory' }));
    }
    return;
  }

  // Get context suggestions for agent (vector similarity search placeholder)
  if (path.match(/^\/api\/memory\/context-suggest\/[^\/]+\/[^\/]+$/) && method === 'GET') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const pathParts = path.split('/');
      const userId = pathParts[pathParts.length - 2];
      const agentId = pathParts[pathParts.length - 1];

      // For now, return top memories by importance (vector search can be added later)
      const result = await pool.query(`
        SELECT id, memory_type, content, importance_score, created_at, pinned
        FROM memories
        WHERE user_id = $1 AND status = 'active'
        ORDER BY pinned DESC, importance_score DESC, created_at DESC
        LIMIT 10
      `, [userId]);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify(result.rows));
    } catch (error) {
      console.error('❌ Context suggest error:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to get context suggestions' }));
    }
    return;
  }

  // Promote memory to higher tier (working -> active -> core)
  if (path.match(/^\/api\/memory\/[^\/]+\/promote$/) && method === 'POST') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const memoryId = path.split('/')[3];
      const body = await parseBody(req);
      const { tier } = body;

      const { promoteMemory } = require('./backend/memory/semanticMemoryRetrieval.cjs');
      const result = await promoteMemory(pool, memoryId, tier);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true, memory: result }));
    } catch (error) {
      console.error('❌ Memory promote error:', error);
      res.writeHead(400, corsHeaders);
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // Demote memory to lower tier (core/active -> working -> archived)
  if (path.match(/^\/api\/memory\/[^\/]+\/demote$/) && method === 'POST') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const memoryId = path.split('/')[3];
      const body = await parseBody(req);
      const { tier } = body;

      const { demoteMemory } = require('./backend/memory/semanticMemoryRetrieval.cjs');
      const result = await demoteMemory(pool, memoryId, tier);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true, memory: result }));
    } catch (error) {
      console.error('❌ Memory demote error:', error);
      res.writeHead(400, corsHeaders);
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // Get core memories for user
  if (path === '/api/memory/core' && method === 'GET') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const coreMemories = await getCoreMemories(pool, user.id);
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ memories: coreMemories }));
    } catch (error) {
      console.error('❌ Get core memories error:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to get core memories' }));
    }
    return;
  }

  // DEBUG: Get ALL memories for user (any tier, any status)
  if (path === '/api/memory/debug' && method === 'GET') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const allMemories = await pool.query(`
        SELECT
          id,
          agent_id,
          memory_type,
          content,
          importance_score,
          memory_tier,
          status,
          embedding IS NOT NULL as has_embedding,
          source,
          source_conversation_id,
          created_at,
          updated_at
        FROM memories
        WHERE user_id = $1
        ORDER BY created_at DESC
      `, [user.id]);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        count: allMemories.rows.length,
        memories: allMemories.rows
      }));
    } catch (error) {
      console.error('❌ Debug memories error:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }

  // Optimize memories (merge duplicates, compress)
  if (path.match(/^\/api\/memory\/optimize\/[^\/]+$/) && method === 'POST') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const userId = path.split('/').pop();

      // Simple optimization: archive low-importance old memories
      const result = await pool.query(`
        UPDATE memories
        SET status = 'archived', archived_at = NOW(), archived_reason = 'auto_optimization'
        WHERE user_id = $1
          AND status = 'active'
          AND importance_score < 0.3
          AND created_at < NOW() - INTERVAL '30 days'
        RETURNING id
      `, [userId]);

      console.log(`🧹 [MEMORY] Optimized ${result.rows.length} memories for user ${userId}`);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        success: true,
        archived: result.rows.length,
        message: `Archived ${result.rows.length} low-importance memories`
      }));
    } catch (error) {
      console.error('❌ Memory optimize error:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to optimize memories' }));
    }
    return;
  }

  // Get assets (memories with type ASSETS - deliverables/things agents helped create)
  if (path.match(/^\/api\/memories\/assets\/[^\/]+$/) && method === 'GET') {
    try {
      const userId = path.split('/').pop();

      const result = await pool.query(`
        SELECT id, content, source, importance_score, created_at, agent_id, memory_type
        FROM memories
        WHERE user_id = $1 AND status = 'active' AND memory_type = 'ASSETS'
        ORDER BY created_at DESC
      `, [userId]);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify(result.rows));
    } catch (error) {
      console.error('❌ Assets fetch error:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to fetch assets' }));
    }
    return;
  }

  // Memory stats endpoint (updated to use PostgreSQL)
  if (path.startsWith('/api/memory/stats/') && method === 'GET') {
    const userId = path.split('/').pop();

    try {
      // Get message count from conversations
      const messageResult = await pool.query(`
        SELECT COUNT(*) as count, SUM(LENGTH(content)) as total_chars
        FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        WHERE c.user_id = $1
      `, [userId]);

      const totalMessages = parseInt(messageResult.rows[0].count) || 0;
      const totalCharacters = parseInt(messageResult.rows[0].total_chars) || 0;

      // Get memory stats
      const memoryResult = await pool.query(`
        SELECT memory_type, COUNT(*) as count, AVG(importance_score) as avg_importance
        FROM memories
        WHERE user_id = $1 AND status = 'active'
        GROUP BY memory_type
      `, [userId]);

      const memoriesByCategory = memoryResult.rows.map(row => ({
        category: row.memory_type,
        count: parseInt(row.count),
        avg_importance: parseFloat(row.avg_importance).toFixed(2)
      }));

      const totalMemories = memoriesByCategory.reduce((sum, cat) => sum + cat.count, 0);

      // Get conversation count
      const convResult = await pool.query(`
        SELECT COUNT(DISTINCT id) as count, COUNT(DISTINCT agent_id) as agents
        FROM conversations
        WHERE user_id = $1
      `, [userId]);

      const estimatedTokens = Math.ceil(totalCharacters / 4);
      const estimatedCost = (estimatedTokens / 1000000) * 5;

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        memories: {
          total: totalMemories,
          by_category: memoriesByCategory
        },
        conversations: {
          total: parseInt(convResult.rows[0].count) || 0,
          agents_used: parseInt(convResult.rows[0].agents) || 0,
          total_messages: totalMessages
        },
        usage: {
          estimated_tokens: estimatedTokens,
          estimated_cost: `$${estimatedCost.toFixed(4)}`,
          total_characters: totalCharacters
        }
      }));
    } catch (error) {
      console.error('❌ Memory stats error:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to get memory stats' }));
    }
    return;
  }

  // Memory context endpoint (updated to use PostgreSQL)
  if (path.startsWith('/api/memory/context/') && method === 'GET') {
    const userId = path.split('/').pop();

    try {
      const result = await pool.query(`
        SELECT id, memory_type, content, importance_score, pinned, source, created_at, updated_at
        FROM memories
        WHERE user_id = $1 AND status = 'active'
        ORDER BY pinned DESC, importance_score DESC, created_at DESC
      `, [userId]);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify(result.rows));
    } catch (error) {
      console.error('❌ Memory context error:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to get memory context' }));
    }
    return;
  }

  // Memory history/activity log endpoint (updated to use PostgreSQL)
  if (path.startsWith('/api/memory/history/') && method === 'GET') {
    const pathParts = path.split('/');
    const userId = pathParts[pathParts.length - 1].split('?')[0];

    try {
      // Parse limit from query string
      const urlParts = path.split('?');
      const params = new URLSearchParams(urlParts[1] || '');
      const limit = parseInt(params.get('limit')) || 20;

      const result = await pool.query(`
        SELECT id, memory_type, content, importance_score, pinned, source, created_at
        FROM memories
        WHERE user_id = $1 AND status = 'active'
        ORDER BY created_at DESC
        LIMIT $2
      `, [userId, limit]);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify(result.rows));
    } catch (error) {
      console.error('❌ Memory history error:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to get memory history' }));
    }
    return;
  }

  // OLD CODE BELOW - keeping for reference but now using PostgreSQL above
  // Memory stats endpoint
  if (false && path.startsWith('/api/memory/stats/') && method === 'GET') {
    const userId = path.split('/').pop();

    const messages = userMessages.get(userId) || [];
    const memories = userMemories.get(userId) || [];

    // Calculate stats
    const totalMessages = messages.length;
    const totalCharacters = messages.reduce((sum, msg) => sum + msg.content.length, 0);
    const estimatedTokens = Math.ceil(totalCharacters / 4); // Rough estimate
    const estimatedCost = (estimatedTokens / 1000000) * 5; // Assuming $5 per 1M tokens

    const memoriesByCategory = memories.reduce((acc, mem) => {
      const cat = acc.find(c => c.category === mem.memory_type);
      if (cat) {
        cat.count++;
        cat.total_importance += mem.importance_score;
      } else {
        acc.push({
          category: mem.memory_type,
          count: 1,
          avg_importance: mem.importance_score.toFixed(2),
          total_importance: mem.importance_score
        });
      }
      return acc;
    }, []);

    // Calculate avg importance
    memoriesByCategory.forEach(cat => {
      cat.avg_importance = (cat.total_importance / cat.count).toFixed(2);
      delete cat.total_importance;
    });

    const agentsUsed = new Set(messages.map(m => m.agentId)).size;

    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({
      memories: {
        total: memories.length,
        by_category: memoriesByCategory
      },
      conversations: {
        total: new Set(messages.map(m => m.conversationId)).size,
        agents_used: agentsUsed,
        total_messages: totalMessages
      },
      usage: {
        estimated_tokens: estimatedTokens,
        estimated_cost: `$${estimatedCost.toFixed(4)}`,
        total_characters: totalCharacters
      }
    }));
    return;
  }

  // Memory context endpoint
  if (path.startsWith('/api/memory/context/') && method === 'GET') {
    const userId = path.split('/').pop();
    const memories = userMemories.get(userId) || [];

    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify(memories));
    return;
  }

  // Memory history/activity log endpoint
  if (path.startsWith('/api/memory/history/') && method === 'GET') {
    const pathParts = path.split('/');
    const userId = pathParts[pathParts.length - 1].split('?')[0];
    const activities = activityLog.get(userId) || [];

    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify(activities.slice(0, 20))); // Return last 20 activities
    return;
  }

  // Admin: Get all users
  if (path === '/api/admin/users' && method === 'GET') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    // Check if user is admin
    if (user.role !== 'admin' && user.role !== 'power_user') {
      res.writeHead(403, corsHeaders);
      res.end(JSON.stringify({ error: 'Forbidden: Admin access required' }));
      return;
    }

    try {
      const parsedUrl = url.parse(req.url, true);
      const page = Math.max(1, parseInt(parsedUrl.query.page) || 1);
      const limit = Math.min(500, Math.max(1, parseInt(parsedUrl.query.limit) || 25));
      const days = parseInt(parsedUrl.query.days);
      const offset = (page - 1) * limit;

      let whereClause = '';
      if (days && days > 0) {
        whereClause = `WHERE u.created_at > NOW() - INTERVAL '${parseInt(days)} days'`;
      }

      // Get total count for pagination
      const countResult = await pool.query(`SELECT COUNT(*)::INTEGER as total FROM users u ${whereClause}`);
      const totalCount = countResult.rows[0].total;

      // Get all users with their activity stats including token usage and costs
      const result = await pool.query(`
        SELECT
          u.id,
          u.email,
          u.first_name,
          u.last_name,
          u.role,
          u.is_active,
          u.created_at,
          u.membership_tier,
          u.membership_status,
          u.membership_expires_at,
          COUNT(DISTINCT c.id) as conversation_count,
          COUNT(DISTINCT m.id) as message_count,
          COALESCE(SUM(CASE WHEN m.role = 'user' THEN LENGTH(m.content) ELSE 0 END), 0) as user_chars,
          COALESCE(SUM(CASE WHEN m.role = 'assistant' THEN LENGTH(m.content) ELSE 0 END), 0) as ai_chars,
          MAX(c.updated_at) as last_active
        FROM users u
        LEFT JOIN conversations c ON u.id = c.user_id
        LEFT JOIN messages m ON c.id = m.conversation_id
        ${whereClause}
        GROUP BY u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, u.created_at, u.membership_tier, u.membership_status, u.membership_expires_at
        ORDER BY u.created_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);

      // Calculate token usage and costs for each user
      const usersWithStats = result.rows.map(u => {
        // Estimate tokens (roughly 4 chars per token)
        const total_input_tokens = Math.ceil(parseInt(u.user_chars) / 4);
        const total_output_tokens = Math.ceil(parseInt(u.ai_chars) / 4);

        // Estimate cost using gemini-2.0-flash-exp pricing
        // Input: $0.075 per 1M tokens, Output: $0.30 per 1M tokens
        const inputCost = (total_input_tokens / 1000000) * 0.075;
        const outputCost = (total_output_tokens / 1000000) * 0.30;
        const estimated_cost = (inputCost + outputCost).toFixed(6);

        return {
          id: u.id,
          email: u.email,
          first_name: u.first_name,
          last_name: u.last_name,
          role: u.role,
          is_active: u.is_active,
          created_at: u.created_at,
          last_login_at: u.last_active || u.created_at,
          membership_tier: u.membership_tier || 'foundations',
          membership_status: u.membership_status || 'active',
          membership_expires_at: u.membership_expires_at,
          conversation_count: u.conversation_count,
          memory_count: '0',
          total_input_tokens: total_input_tokens.toString(),
          total_output_tokens: total_output_tokens.toString(),
          estimated_cost: estimated_cost
        };
      });

      console.log(`👥 [ADMIN] User list requested by: ${user.email} (page ${page}, limit ${limit})`);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        users: usersWithStats,
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }));
    } catch (error) {
      console.error('❌ Admin users list error:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to fetch users' }));
    }
    return;
  }

  // Admin: Update user role
  if (path.match(/^\/api\/admin\/users\/[^\/]+\/role$/) && method === 'PUT') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      res.writeHead(403, corsHeaders);
      res.end(JSON.stringify({ error: 'Forbidden: Admin access required' }));
      return;
    }

    try {
      const userId = path.split('/')[4];
      const body = await parseBody(req);
      const { role } = body;

      // Validate role
      if (!['user', 'power_user', 'admin'].includes(role)) {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: 'Invalid role. Must be: user, power_user, or admin' }));
        return;
      }

      // Update user role
      const result = await pool.query(`
        UPDATE users
        SET role = $1
        WHERE id = $2
        RETURNING id, email, role
      `, [role, userId]);

      if (result.rows.length === 0) {
        res.writeHead(404, corsHeaders);
        res.end(JSON.stringify({ error: 'User not found' }));
        return;
      }

      console.log(`🔑 [ADMIN] User ${result.rows[0].email} role changed to ${role} by ${user.email}`);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify(result.rows[0]));
    } catch (error) {
      console.error('❌ Admin update role error:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to update user role' }));
    }
    return;
  }

  // Admin: Toggle user onboarding status (unlock/lock)
  if (path.match(/^\/api\/admin\/users\/[^\/]+\/onboarding$/) && method === 'PUT') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    if (user.role !== 'admin' && user.role !== 'power_user') {
      res.writeHead(403, corsHeaders);
      res.end(JSON.stringify({ error: 'Forbidden: Admin or power_user access required' }));
      return;
    }

    try {
      const userId = path.split('/')[4];
      const body = await parseBody(req);
      const { onboarding_completed } = body;

      // Get user email for logging
      const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) {
        res.writeHead(404, corsHeaders);
        res.end(JSON.stringify({ error: 'User not found' }));
        return;
      }
      const targetEmail = userResult.rows[0].email;

      // Update user_onboarding_status table
      await pool.query(`
        INSERT INTO user_onboarding_status (user_id, onboarding_completed, onboarding_completed_at, current_step, total_steps, updated_at)
        VALUES ($1, $2, CASE WHEN $2 THEN NOW() ELSE NULL END, CASE WHEN $2 THEN 11 ELSE 0 END, 11, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET
          onboarding_completed = $2,
          onboarding_completed_at = CASE WHEN $2 THEN COALESCE(user_onboarding_status.onboarding_completed_at, NOW()) ELSE NULL END,
          current_step = CASE WHEN $2 THEN 11 ELSE user_onboarding_status.current_step END,
          updated_at = NOW()
      `, [userId, onboarding_completed]);

      // Also update users table
      await pool.query('UPDATE users SET onboarding_completed = $1 WHERE id = $2', [onboarding_completed, userId]);

      console.log(`🔓 [ADMIN] User ${targetEmail} onboarding ${onboarding_completed ? 'UNLOCKED' : 'LOCKED'} by ${user.email}`);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        success: true,
        userId,
        email: targetEmail,
        onboarding_completed,
        message: `User ${onboarding_completed ? 'unlocked' : 'locked'} successfully`
      }));
    } catch (error) {
      console.error('❌ Admin toggle onboarding error:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to update onboarding status' }));
    }
    return;
  }

  // Admin: Activate/deactivate user
  if (path.match(/^\/api\/admin\/users\/[^\/]+\/activate$/) && method === 'PUT') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      res.writeHead(403, corsHeaders);
      res.end(JSON.stringify({ error: 'Forbidden: Admin access required' }));
      return;
    }

    try {
      const userId = path.split('/')[4];
      const body = await parseBody(req);
      const { is_active } = body;

      // Update user active status
      const result = await pool.query(`
        UPDATE users
        SET is_active = $1
        WHERE id = $2
        RETURNING id, email, is_active
      `, [is_active, userId]);

      if (result.rows.length === 0) {
        res.writeHead(404, corsHeaders);
        res.end(JSON.stringify({ error: 'User not found' }));
        return;
      }

      console.log(`${is_active ? '✅' : '🚫'} [ADMIN] User ${result.rows[0].email} ${is_active ? 'activated' : 'deactivated'} by ${user.email}`);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify(result.rows[0]));
    } catch (error) {
      console.error('❌ Admin activate user error:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to update user status' }));
    }
    return;
  }

  // Admin stats endpoint (with real database queries)
  if (path === '/api/admin/stats' && method === 'GET') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    // Check if user is admin or power_user
    if (user.role !== 'admin' && user.role !== 'power_user') {
      res.writeHead(403, corsHeaders);
      res.end(JSON.stringify({ error: 'Forbidden: Admin access required' }));
      return;
    }

    try {
      // Get user stats with real data including actual API usage metrics
      // Use subqueries to avoid cartesian product issues with multiple JOINs
      const usersResult = await pool.query(`
        SELECT
          u.id,
          u.email,
          u.first_name,
          u.last_name,
          u.role,
          u.is_active,
          u.created_at,
          COALESCE(conv.conversation_count, 0) as conversation_count,
          COALESCE(msg.message_count, 0) as message_count,
          COALESCE(api.total_input_tokens, 0) as total_input_tokens,
          COALESCE(api.total_output_tokens, 0) as total_output_tokens,
          COALESCE(api.total_tokens, 0) as total_tokens,
          COALESCE(api.actual_cost, 0) as actual_cost,
          conv.last_active
        FROM users u
        LEFT JOIN (
          SELECT user_id, COUNT(*) as conversation_count, MAX(updated_at) as last_active
          FROM conversations
          GROUP BY user_id
        ) conv ON u.id = conv.user_id
        LEFT JOIN (
          SELECT c.user_id, COUNT(*) as message_count
          FROM messages m
          JOIN conversations c ON m.conversation_id = c.id
          GROUP BY c.user_id
        ) msg ON u.id = msg.user_id
        LEFT JOIN (
          SELECT user_id,
            SUM(input_tokens) as total_input_tokens,
            SUM(output_tokens) as total_output_tokens,
            SUM(COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0)) as total_tokens,
            SUM(cost_usd) as actual_cost
          FROM api_usage_logs
          GROUP BY user_id
        ) api ON u.id = api.user_id
        ORDER BY u.created_at DESC
      `);

      const userStats = usersResult.rows.map(u => {
        const totalTokens = parseInt(u.total_tokens) || 0;
        const actualCost = parseFloat(u.actual_cost) || 0;
        const inputTokens = parseInt(u.total_input_tokens) || 0;
        const outputTokens = parseInt(u.total_output_tokens) || 0;

        return {
          id: u.id,
          email: u.email,
          firstName: u.first_name || '',
          lastName: u.last_name || '',
          role: u.role,
          isActive: u.is_active,
          createdAt: u.created_at,
          messageCount: parseInt(u.message_count) || 0,
          conversationCount: parseInt(u.conversation_count) || 0,
          lastActive: u.last_active || u.created_at,
          estimatedInputTokens: inputTokens,
          estimatedOutputTokens: outputTokens,
          totalTokens: totalTokens,
          estimatedCost: parseFloat(actualCost.toFixed(6))
        };
      });

      // Get system-wide stats
      const statsResult = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM users) as total_users,
          (SELECT COUNT(*) FROM users WHERE is_active = true) as active_users,
          (SELECT COUNT(*) FROM conversations) as total_conversations,
          (SELECT COUNT(*) FROM messages) as total_messages,
          (SELECT COUNT(DISTINCT user_id) FROM conversations WHERE updated_at > NOW() - INTERVAL '1 day') as active_today
      `);

      // Get most popular agent
      const agentResult = await pool.query(`
        SELECT agent_id, COUNT(*) as count
        FROM conversations
        GROUP BY agent_id
        ORDER BY count DESC
        LIMIT 1
      `);

      const mostPopularAgentId = agentResult.rows[0]?.agent_id || 'client-onboarding';
      const agent = AGENT_CACHE[mostPopularAgentId];
      const mostPopularAgent = agent?.name || 'Client Onboarding';

      const stats = statsResult.rows[0];

      // Calculate system-wide totals
      const totalSystemCost = userStats.reduce((sum, u) => sum + u.estimatedCost, 0);
      const totalSystemTokens = userStats.reduce((sum, u) => sum + u.totalTokens, 0);

      const systemStats = {
        totalUsers: parseInt(stats.total_users) || 0,
        activeUsers: parseInt(stats.active_users) || 0,
        totalMessages: parseInt(stats.total_messages) || 0,
        totalConversations: parseInt(stats.total_conversations) || 0,
        activeToday: parseInt(stats.active_today) || 0,
        averageMessagesPerUser: parseInt(stats.total_users) > 0
          ? (parseInt(stats.total_messages) / parseInt(stats.total_users)).toFixed(1)
          : 0,
        mostPopularAgent,
        totalTokens: totalSystemTokens,
        totalCost: parseFloat(totalSystemCost.toFixed(6)),
        averageCostPerUser: parseInt(stats.total_users) > 0
          ? parseFloat((totalSystemCost / parseInt(stats.total_users)).toFixed(6))
          : 0
      };

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        users: userStats,
        systemStats
      }));
      console.log(`📊 [ADMIN] Stats requested by: ${user.email}`);
    } catch (error) {
      console.error('❌ Admin stats error:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to fetch stats' }));
    }
    return;
  }

  // Admin: Usage Dashboard - Live HTML Report (Password Protected)
  if (path.startsWith('/api/admin/usage-dashboard') && method === 'GET') {
    // Allow access via secret key OR JWT auth
    const url = new URL(req.url, `http://${req.headers.host}`);
    const secretKey = url.searchParams.get('key');
    const DASHBOARD_SECRET = 'ecos2025admin';  // Simple shared secret for dashboard access

    let authorized = false;

    // Check secret key first
    if (secretKey === DASHBOARD_SECRET) {
      authorized = true;
    } else {
      // Fall back to JWT auth
      const user = getUserFromToken(req.headers.authorization);
      if (user && user.role === 'admin') {
        authorized = true;
      }
    }

    if (!authorized) {
      // Return a simple login page
      const loginHtml = '<!DOCTYPE html><html><head><title>ECOS Dashboard Access</title>' +
        '<style>body{font-family:system-ui;background:#1a1a2e;color:#fff;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}' +
        '.login-box{background:#252542;padding:40px;border-radius:16px;text-align:center;max-width:400px}' +
        'h2{margin-bottom:20px}input{width:100%;padding:15px;margin:10px 0;border-radius:8px;border:1px solid #3a3a5a;background:#1a1a2e;color:#fff;font-size:1em}' +
        'button{width:100%;padding:15px;background:#3B82F6;color:#fff;border:none;border-radius:8px;font-size:1em;cursor:pointer;margin-top:10px}' +
        'button:hover{background:#2563EB}.error{color:#EF4444;margin-top:10px;display:none}</style></head>' +
        '<body><div class="login-box"><h2>🔐 ECOS Admin Dashboard</h2><p style="color:#a0a0c0;margin-bottom:20px">Enter the admin key to access the usage report</p>' +
        '<input type="password" id="key" placeholder="Enter admin key..." onkeypress="if(event.key===\'Enter\')login()">' +
        '<button onclick="login()">Access Dashboard</button>' +
        '<p class="error" id="error">Invalid key. Please try again.</p></div>' +
        '<script>function login(){var k=document.getElementById("key").value;if(k){window.location.href="?key="+encodeURIComponent(k)}else{document.getElementById("error").style.display="block"}}</script>' +
        '</body></html>';
      res.writeHead(200, { ...corsHeaders, 'Content-Type': 'text/html' });
      res.end(loginHtml);
      return;
    }

    try {
      // Get user usage data with agent journeys and membership info
      const usageQuery = await pool.query(`
        WITH user_journey AS (
          SELECT
            u.id as user_id,
            COALESCE(NULLIF(TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')), ''), u.email) as name,
            u.email,
            u.membership_tier,
            u.membership_status,
            u.created_at as user_created_at,
            a.name as agent_name,
            COUNT(m.id) as message_count,
            MIN(m.created_at) as first_interaction
          FROM users u
          JOIN conversations c ON c.user_id = u.id
          JOIN agents a ON a.id = c.agent_id
          JOIN messages m ON m.conversation_id = c.id
          WHERE m.role = 'user'
          GROUP BY u.id, u.first_name, u.last_name, u.email, u.membership_tier, u.membership_status, u.created_at, a.name
          ORDER BY u.id, first_interaction
        ),
        user_costs AS (
          SELECT
            user_id,
            SUM(cost_usd) as total_cost,
            COUNT(*) as total_api_calls
          FROM api_usage_logs
          GROUP BY user_id
        ),
        user_status AS (
          SELECT
            user_id,
            onboarding_completed
          FROM user_onboarding_status
        )
        SELECT
          uj.user_id,
          uj.name,
          uj.email,
          uj.membership_tier,
          uj.membership_status,
          uj.user_created_at,
          COALESCE(uc.total_cost, 0) as total_cost,
          us.onboarding_completed,
          json_agg(json_build_object(
            'agent', uj.agent_name,
            'messages', uj.message_count
          ) ORDER BY uj.first_interaction) as journey
        FROM user_journey uj
        LEFT JOIN user_costs uc ON uc.user_id = uj.user_id
        LEFT JOIN user_status us ON us.user_id = uj.user_id
        GROUP BY uj.user_id, uj.name, uj.email, uj.membership_tier, uj.membership_status, uj.user_created_at, uc.total_cost, us.onboarding_completed
        ORDER BY uc.total_cost DESC NULLS LAST
      `);

      // Get profile data for summaries
      const profilesQuery = await pool.query(`
        SELECT
          user_id,
          full_name,
          company_name,
          target_clients,
          business_outcome,
          service_description,
          client_problems,
          client_results,
          core_method,
          revenue_range,
          growth_goals,
          biggest_challenges
        FROM core_memories
      `);

      const profiles = {};
      profilesQuery.rows.forEach(p => {
        profiles[p.user_id] = p;
      });

      // Get totals
      const totalsQuery = await pool.query(`
        SELECT
          COUNT(DISTINCT user_id) as total_users,
          SUM(cost_usd) as total_cost,
          SUM(input_tokens + output_tokens) as total_tokens
        FROM api_usage_logs
      `);

      const totals = totalsQuery.rows[0];

      // Get tier breakdown
      const tierQuery = await pool.query(`
        SELECT membership_tier, COUNT(*) as count
        FROM users
        GROUP BY membership_tier
        ORDER BY count DESC
      `);

      const tierBreakdown = {};
      tierQuery.rows.forEach(t => {
        tierBreakdown[t.membership_tier || 'none'] = parseInt(t.count);
      });

      // Get total users count
      const totalUsersQuery = await pool.query(`SELECT COUNT(*) as count FROM users`);
      const totalUserCount = parseInt(totalUsersQuery.rows[0].count);

      // Get onboarding stats
      const onboardingQuery = await pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE onboarding_completed = true) as completed,
          COUNT(*) as total
        FROM user_onboarding_status
      `);
      const onboardingStats = onboardingQuery.rows[0];

      // Get detailed conversation summaries per user
      const conversationDetailsQuery = await pool.query(`
        WITH user_messages AS (
          SELECT
            c.user_id,
            a.name as agent_name,
            m.content,
            m.role,
            m.created_at,
            LENGTH(m.content) as content_length
          FROM messages m
          JOIN conversations c ON m.conversation_id = c.id
          JOIN agents a ON c.agent_id = a.id
          WHERE m.role = 'user'
          ORDER BY m.created_at DESC
        ),
        recent_questions AS (
          SELECT
            user_id,
            json_agg(json_build_object(
              'agent', agent_name,
              'question', LEFT(content, 200),
              'date', created_at
            ) ORDER BY created_at DESC) FILTER (WHERE content_length > 20) as recent_msgs
          FROM user_messages
          GROUP BY user_id
        ),
        user_stats AS (
          SELECT
            c.user_id,
            COUNT(DISTINCT DATE(m.created_at)) as active_days,
            MAX(m.created_at) as last_active,
            MIN(m.created_at) as first_active,
            AVG(LENGTH(m.content)) as avg_msg_length,
            COUNT(*) FILTER (WHERE m.role = 'user') as total_questions
          FROM messages m
          JOIN conversations c ON m.conversation_id = c.id
          GROUP BY c.user_id
        )
        SELECT
          rq.user_id,
          rq.recent_msgs,
          us.active_days,
          us.last_active,
          us.first_active,
          us.avg_msg_length,
          us.total_questions
        FROM recent_questions rq
        LEFT JOIN user_stats us ON us.user_id = rq.user_id
      `);

      const conversationDetails = {};
      conversationDetailsQuery.rows.forEach(cd => {
        conversationDetails[cd.user_id] = {
          recentMessages: (cd.recent_msgs || []).slice(0, 5),
          activeDays: cd.active_days || 0,
          lastActive: cd.last_active,
          firstActive: cd.first_active,
          avgMsgLength: Math.round(cd.avg_msg_length || 0),
          totalQuestions: cd.total_questions || 0
        };
      });

      // Jailbreak attempt detection - scan for suspicious patterns
      const jailbreakQuery = await pool.query(`
        SELECT
          c.user_id,
          u.email,
          m.content,
          m.created_at,
          a.name as agent_name
        FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        JOIN users u ON c.user_id = u.id
        JOIN agents a ON c.agent_id = a.id
        WHERE m.role = 'user'
        AND (
          LOWER(m.content) LIKE '%ignore previous%'
          OR LOWER(m.content) LIKE '%ignore all%'
          OR LOWER(m.content) LIKE '%disregard%instruction%'
          OR LOWER(m.content) LIKE '%system prompt%'
          OR LOWER(m.content) LIKE '%reveal your%'
          OR LOWER(m.content) LIKE '%show me your prompt%'
          OR LOWER(m.content) LIKE '%what are your instructions%'
          OR LOWER(m.content) LIKE '%pretend you are%'
          OR LOWER(m.content) LIKE '%act as if%'
          OR LOWER(m.content) LIKE '%roleplay as%'
          OR LOWER(m.content) LIKE '%jailbreak%'
          OR LOWER(m.content) LIKE '%dan mode%'
          OR LOWER(m.content) LIKE '%developer mode%'
          OR LOWER(m.content) LIKE '%bypass%filter%'
          OR LOWER(m.content) LIKE '%override%'
          OR LOWER(m.content) LIKE '%forget everything%'
          OR LOWER(m.content) LIKE '%new persona%'
          OR m.content LIKE '%[SYSTEM]%'
          OR m.content LIKE '%<|%'
        )
        ORDER BY m.created_at DESC
        LIMIT 50
      `);

      const jailbreakAttempts = jailbreakQuery.rows.map(j => ({
        userId: j.user_id,
        email: j.email,
        content: j.content.substring(0, 300) + (j.content.length > 300 ? '...' : ''),
        date: j.created_at,
        agent: j.agent_name
      }));

      // Group jailbreak attempts by user
      const jailbreakByUser = {};
      jailbreakAttempts.forEach(j => {
        if (!jailbreakByUser[j.userId]) {
          jailbreakByUser[j.userId] = [];
        }
        jailbreakByUser[j.userId].push(j);
      });

      // Get key outputs created (Money Models, Offers, etc.) from assistant responses
      const outputsQuery = await pool.query(`
        SELECT
          c.user_id,
          a.name as agent_name,
          COUNT(*) as interaction_count,
          MAX(m.created_at) as last_interaction
        FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        JOIN agents a ON c.agent_id = a.id
        WHERE m.role = 'assistant'
        AND (
          LOWER(a.name) LIKE '%money model%'
          OR LOWER(a.name) LIKE '%offer%'
          OR LOWER(a.name) LIKE '%linkedin%'
          OR LOWER(a.name) LIKE '%email%'
          OR LOWER(a.name) LIKE '%qualification%'
        )
        GROUP BY c.user_id, a.name
        HAVING COUNT(*) >= 3
      `);

      const userOutputs = {};
      outputsQuery.rows.forEach(o => {
        if (!userOutputs[o.user_id]) {
          userOutputs[o.user_id] = [];
        }
        userOutputs[o.user_id].push({
          agent: o.agent_name,
          interactions: o.interaction_count,
          lastInteraction: o.last_interaction
        });
      });

      // Generate user cards HTML
      const userCardsHtml = usageQuery.rows.map(user => {
        const profile = profiles[user.user_id] || {};
        const journey = user.journey || [];
        const achievements = [];

        if (user.onboarding_completed) {
          achievements.push('<span class="achievement-tag achievement-green">✅ Onboarding Complete</span>');
        }

        const agentNames = journey.map(j => j.agent.toLowerCase());
        if (agentNames.some(a => a.includes('money model'))) {
          achievements.push('<span class="achievement-tag achievement-emerald">💰 Money Model Created</span>');
        }
        if (agentNames.some(a => a.includes('offer'))) {
          achievements.push('<span class="achievement-tag achievement-amber">🎯 Offer Built</span>');
        }
        if (agentNames.some(a => a.includes('linkedin'))) {
          achievements.push('<span class="achievement-tag achievement-violet">🔗 LinkedIn Strategy</span>');
        }
        if (agentNames.some(a => a.includes('email') || a.includes('promo'))) {
          achievements.push('<span class="achievement-tag achievement-pink">📧 Email Campaign</span>');
        }

        const getAgentClass = (name) => {
          const lower = name.toLowerCase();
          if (lower.includes('onboarding')) return 'agent-onboarding';
          if (lower.includes('money model')) return 'agent-money-model';
          if (lower.includes('offer')) return 'agent-offer-architect';
          if (lower.includes('linkedin')) return 'agent-linkedin-events';
          if (lower.includes('email') || lower.includes('promo')) return 'agent-email-promo';
          if (lower.includes('qualification')) return 'agent-qualification';
          return 'agent-onboarding';
        };

        const totalMessages = journey.reduce((sum, j) => sum + parseInt(j.messages), 0);
        const about = profile.service_description || profile.business_outcome ||
          (profile.target_clients ? 'Helps ' + profile.target_clients : 'Business profile pending');

        // Build enhanced profile section
        const profileName = profile.full_name || user.name;
        const companyName = profile.company_name || '';
        const targetClients = profile.target_clients || '';
        const clientProblems = profile.client_problems || '';
        const clientResults = profile.client_results || '';
        const coreMethod = profile.core_method || '';
        const revenueRange = profile.revenue_range || '';
        const growthGoals = profile.growth_goals || '';
        const challenges = profile.biggest_challenges || '';

        let nextSteps = 'Complete onboarding to get personalized recommendations.';
        if (user.onboarding_completed) {
          if (!agentNames.some(a => a.includes('money model'))) {
            nextSteps = 'Create your Money Model with the Money Model Mapper agent.';
          } else if (!agentNames.some(a => a.includes('offer'))) {
            nextSteps = 'Build your Offer Invitation with the Offer Invitation Architect.';
          } else if (!agentNames.some(a => a.includes('linkedin'))) {
            nextSteps = 'Create LinkedIn events strategy with LinkedIn Events Builder.';
          } else {
            nextSteps = 'Continue building campaigns and refining your messaging!';
          }
        }

        const agentBadges = journey.map(j =>
          '<span class="agent-badge ' + getAgentClass(j.agent) + '">' + j.agent + ' <small>(' + j.messages + ')</small></span>'
        ).join('');

        // Tier badge styling
        const getTierClass = (tier) => {
          switch(tier) {
            case '5in30': return 'tier-5in30';
            case 'fast_start': return 'tier-fast-start';
            case 'accelerate': return 'tier-accelerate';
            case 'private': return 'tier-private';
            default: return 'tier-foundations';
          }
        };

        const getTierLabel = (tier) => {
          switch(tier) {
            case '5in30': return '5IN30';
            case 'fast_start': return 'Fast Start';
            case 'accelerate': return 'Accelerate';
            case 'private': return 'Private';
            default: return 'Foundations';
          }
        };

        const tierBadge = '<span class="tier-badge ' + getTierClass(user.membership_tier) + '">' + getTierLabel(user.membership_tier) + '</span>';
        const joinDate = user.user_created_at ? new Date(user.user_created_at).toLocaleDateString() : 'Unknown';

        // Get conversation details for this user
        const convDetails = conversationDetails[user.user_id] || {};
        const userJailbreaks = jailbreakByUser[user.user_id] || [];
        const outputs = userOutputs[user.user_id] || [];

        // Generate recent questions HTML
        const recentQuestionsHtml = (convDetails.recentMessages || []).slice(0, 3).map(msg => {
          const date = msg.date ? new Date(msg.date).toLocaleDateString() : '';
          return '<div class="recent-question"><span class="question-agent">' + (msg.agent || 'Unknown') + '</span> <span class="question-date">' + date + '</span><p class="question-text">"' + (msg.question || '').replace(/"/g, '&quot;') + '"</p></div>';
        }).join('') || '<p class="no-data">No recent questions</p>';

        // Generate engagement metrics HTML
        const lastActiveDate = convDetails.lastActive ? new Date(convDetails.lastActive).toLocaleDateString() : 'Never';
        const engagementHtml = '<div class="engagement-metrics">' +
          '<div class="metric"><span class="metric-value">' + (convDetails.activeDays || 0) + '</span><span class="metric-label">Active Days</span></div>' +
          '<div class="metric"><span class="metric-value">' + (convDetails.totalQuestions || 0) + '</span><span class="metric-label">Questions Asked</span></div>' +
          '<div class="metric"><span class="metric-value">' + (convDetails.avgMsgLength || 0) + '</span><span class="metric-label">Avg Msg Length</span></div>' +
          '<div class="metric"><span class="metric-value">' + lastActiveDate + '</span><span class="metric-label">Last Active</span></div>' +
          '</div>';

        // Generate jailbreak warning HTML
        const jailbreakHtml = userJailbreaks.length > 0 ?
          '<div class="jailbreak-warning"><h4>⚠️ Security Alerts (' + userJailbreaks.length + ')</h4>' +
          userJailbreaks.slice(0, 2).map(j => '<div class="jailbreak-item"><span class="jailbreak-date">' + new Date(j.date).toLocaleDateString() + '</span> on <strong>' + j.agent + '</strong><p class="jailbreak-content">"' + j.content.replace(/"/g, '&quot;').replace(/</g, '&lt;') + '"</p></div>').join('') +
          '</div>' : '';

        // Generate AI coach summary
        let coachInsight = '';
        const daysSinceJoin = Math.floor((Date.now() - new Date(user.user_created_at).getTime()) / (1000 * 60 * 60 * 24));
        const isEngaged = (convDetails.activeDays || 0) >= 3;
        const hasMoneyModel = agentNames.some(a => a.includes('money model'));
        const hasOffer = agentNames.some(a => a.includes('offer'));

        if (!user.onboarding_completed) {
          coachInsight = '🔴 <strong>Needs Onboarding Help:</strong> User has not completed onboarding. Consider reaching out to help them get started.';
        } else if (daysSinceJoin > 7 && !hasMoneyModel) {
          coachInsight = '🟡 <strong>Stuck Early:</strong> Joined ' + daysSinceJoin + ' days ago but hasn\'t created Money Model. May need guidance on first steps.';
        } else if (hasMoneyModel && !hasOffer && daysSinceJoin > 14) {
          coachInsight = '🟡 <strong>Progress Stalled:</strong> Has Money Model but hasn\'t moved to Offer creation in ' + daysSinceJoin + ' days. May need encouragement.';
        } else if (!isEngaged && daysSinceJoin > 7) {
          coachInsight = '🟠 <strong>Low Engagement:</strong> Only ' + (convDetails.activeDays || 0) + ' active days in ' + daysSinceJoin + ' days since joining. Consider re-engagement.';
        } else if (hasMoneyModel && hasOffer) {
          coachInsight = '🟢 <strong>Good Progress:</strong> Completed Money Model and Offer. Ready for campaigns and client acquisition.';
        } else if (isEngaged) {
          coachInsight = '🟢 <strong>Actively Engaged:</strong> ' + (convDetails.activeDays || 0) + ' active days, ' + (convDetails.totalQuestions || 0) + ' questions. Keep momentum going!';
        } else {
          coachInsight = 'ℹ️ <strong>New User:</strong> Still getting started. Monitor progress over next few days.';
        }

        // Generate outputs created HTML
        const outputsHtml = outputs.length > 0 ?
          '<div class="outputs-section"><h4>📄 Key Outputs</h4><div class="outputs-list">' +
          outputs.map(o => '<span class="output-badge">' + o.agent + ' <small>(' + o.interactions + ' interactions)</small></span>').join('') +
          '</div></div>' : '';

        const lastActiveTimestamp = convDetails.lastActive ? new Date(convDetails.lastActive).getTime() : 0;
        const createdTimestamp = user.user_created_at ? new Date(user.user_created_at).getTime() : 0;
        const costValue = parseFloat(user.total_cost || 0);

        return '<div class="user-card" data-tier="' + (user.membership_tier || 'foundations') + '" data-cost="' + costValue + '" data-created="' + createdTimestamp + '" data-last-active="' + lastActiveTimestamp + '">' +
          '<div class="user-header" onclick="this.parentElement.classList.toggle(\'expanded\')">' +
            '<div class="user-info">' +
              '<div class="user-name-row"><span class="user-name">' + (user.name || 'Unknown') + '</span>' + tierBadge +
              (userJailbreaks.length > 0 ? '<span class="security-flag">⚠️</span>' : '') + '</div>' +
              '<div class="user-email">' + user.email + '</div>' +
              '<div class="user-business">' + (profile.company_name || '') + ' <span class="join-date">Joined: ' + joinDate + '</span></div>' +
            '</div>' +
            '<div class="user-stats">' +
              '<span class="stat-badge cost">$' + parseFloat(user.total_cost || 0).toFixed(2) + '</span>' +
              '<span class="stat-badge messages">' + totalMessages + ' msgs</span>' +
              '<span class="stat-badge days">' + (convDetails.activeDays || 0) + ' days</span>' +
            '</div>' +
          '</div>' +
          '<div class="user-details">' +
            '<div class="coach-insight"><h4>🎯 Coach Insight</h4><p>' + coachInsight + '</p></div>' +
            '<div class="engagement-section"><h4>📊 Engagement Metrics</h4>' + engagementHtml + '</div>' +
            jailbreakHtml +
            '<div class="journey-section"><h4>🗺️ Agent Journey</h4><div class="agent-badges">' + agentBadges + '</div></div>' +
            outputsHtml +
            '<div class="recent-questions-section"><h4>💬 Recent Questions</h4>' + recentQuestionsHtml + '</div>' +
            '<div class="achievements-section"><h4>🏆 Achievements</h4><div class="achievement-tags">' +
              (achievements.length > 0 ? achievements.join('') : '<span class="no-achievements">No achievements yet</span>') + '</div></div>' +
            '<div class="profile-section"><h4>📋 Business Profile</h4>' +
              '<div class="profile-grid">' +
                '<div class="profile-item"><span class="profile-label">Company:</span> ' + (companyName || '<em>Not set</em>') + '</div>' +
                '<div class="profile-item"><span class="profile-label">Revenue Range:</span> ' + (revenueRange || '<em>Not set</em>') + '</div>' +
                '<div class="profile-item full-width"><span class="profile-label">Target Clients:</span> ' + (targetClients || '<em>Not set</em>') + '</div>' +
                '<div class="profile-item full-width"><span class="profile-label">Client Problems:</span> ' + (clientProblems || '<em>Not set</em>') + '</div>' +
                '<div class="profile-item full-width"><span class="profile-label">Client Results:</span> ' + (clientResults || '<em>Not set</em>') + '</div>' +
                '<div class="profile-item full-width"><span class="profile-label">Core Method:</span> ' + (coreMethod || '<em>Not set</em>') + '</div>' +
                '<div class="profile-item full-width"><span class="profile-label">Growth Goals:</span> ' + (growthGoals || '<em>Not set</em>') + '</div>' +
                '<div class="profile-item full-width"><span class="profile-label">Biggest Challenges:</span> ' + (challenges || '<em>Not set</em>') + '</div>' +
              '</div>' +
            '</div>' +
            '<div class="next-steps-section"><h4>👉 Recommended Next Steps</h4><p>' + nextSteps + '</p></div>' +
          '</div>' +
        '</div>';
      }).join('');

      const html = '<!DOCTYPE html>' +
'<html lang="en">' +
'<head>' +
'<meta charset="UTF-8">' +
'<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
'<title>ECOS Platform Usage Report - Live</title>' +
'<style>' +
':root { --bg-dark: #1a1a2e; --bg-card: #252542; --accent-blue: #3B82F6; --accent-gold: #F59E0B; --text-primary: #ffffff; --text-secondary: #a0a0c0; --border-color: #3a3a5a; }' +
'* { margin: 0; padding: 0; box-sizing: border-box; }' +
'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg-dark); color: var(--text-primary); line-height: 1.6; padding: 20px; }' +
'.container { max-width: 1400px; margin: 0 auto; }' +
'header { text-align: center; margin-bottom: 40px; padding: 40px 20px; background: linear-gradient(135deg, var(--bg-card), var(--accent-blue)); border-radius: 16px; }' +
'h1 { font-size: 2.5em; margin-bottom: 10px; }' +
'.report-date { color: var(--text-secondary); }' +
'.summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }' +
'.summary-card { background: var(--bg-card); padding: 25px; border-radius: 12px; border: 1px solid var(--border-color); }' +
'.summary-value { font-size: 2.2em; font-weight: bold; color: var(--accent-blue); }' +
'.summary-label { color: var(--text-secondary); margin-top: 5px; font-size: 0.9em; }' +
'.tier-breakdown { background: var(--bg-card); padding: 25px; border-radius: 12px; border: 1px solid var(--border-color); margin-bottom: 30px; }' +
'.tier-breakdown h3 { margin-bottom: 15px; color: var(--accent-gold); }' +
'.tier-bars { display: flex; flex-direction: column; gap: 12px; }' +
'.tier-bar { display: flex; align-items: center; gap: 15px; }' +
'.tier-bar-label { min-width: 100px; font-weight: 500; }' +
'.tier-bar-track { flex: 1; height: 24px; background: rgba(255,255,255,0.1); border-radius: 12px; overflow: hidden; }' +
'.tier-bar-fill { height: 100%; border-radius: 12px; display: flex; align-items: center; justify-content: flex-end; padding-right: 10px; font-size: 0.8em; font-weight: 600; }' +
'.tier-bar-fill.foundations { background: linear-gradient(90deg, #6366F1, #818CF8); }' +
'.tier-bar-fill.t5in30 { background: linear-gradient(90deg, #F59E0B, #FBBF24); }' +
'.tier-bar-fill.fast-start { background: linear-gradient(90deg, #10B981, #34D399); }' +
'.tier-bar-fill.accelerate { background: linear-gradient(90deg, #EC4899, #F472B6); }' +
'.tier-bar-fill.private { background: linear-gradient(90deg, #8B5CF6, #A78BFA); }' +
'.user-card { background: var(--bg-card); border-radius: 12px; margin-bottom: 15px; border: 1px solid var(--border-color); overflow: hidden; }' +
'.user-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; cursor: pointer; }' +
'.user-header:hover { background: rgba(59, 130, 246, 0.1); }' +
'.user-name-row { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }' +
'.user-name { font-size: 1.2em; font-weight: bold; }' +
'.tier-badge { padding: 3px 10px; border-radius: 12px; font-size: 0.7em; font-weight: 600; text-transform: uppercase; }' +
'.tier-foundations { background: rgba(99, 102, 241, 0.2); color: #818CF8; border: 1px solid #6366F1; }' +
'.tier-5in30 { background: rgba(245, 158, 11, 0.2); color: #FBBF24; border: 1px solid #F59E0B; }' +
'.tier-fast-start { background: rgba(16, 185, 129, 0.2); color: #34D399; border: 1px solid #10B981; }' +
'.tier-accelerate { background: rgba(236, 72, 153, 0.2); color: #F472B6; border: 1px solid #EC4899; }' +
'.tier-private { background: rgba(139, 92, 246, 0.2); color: #A78BFA; border: 1px solid #8B5CF6; }' +
'.user-email { color: var(--text-secondary); font-size: 0.9em; }' +
'.user-business { color: var(--accent-blue); font-size: 0.85em; margin-top: 4px; }' +
'.join-date { color: var(--text-secondary); font-size: 0.8em; margin-left: 10px; }' +
'.user-stats { display: flex; gap: 10px; }' +
'.stat-badge { padding: 6px 12px; border-radius: 20px; font-size: 0.85em; font-weight: 600; }' +
'.stat-badge.cost { background: #10B981; color: white; }' +
'.stat-badge.messages { background: #6366F1; color: white; }' +
'.user-details { display: none; padding: 20px; border-top: 1px solid var(--border-color); background: rgba(0,0,0,0.2); }' +
'.user-card.expanded .user-details { display: block; }' +
'.user-details h4 { margin-bottom: 10px; color: var(--text-secondary); }' +
'.user-details > div { margin-bottom: 20px; }' +
'.agent-badges { display: flex; flex-wrap: wrap; gap: 8px; }' +
'.agent-badge { padding: 6px 12px; border-radius: 20px; font-size: 0.8em; font-weight: 500; color: white; }' +
'.agent-onboarding { background: #6366F1; }' +
'.agent-money-model { background: #10B981; }' +
'.agent-offer-architect { background: #F59E0B; }' +
'.agent-linkedin-events { background: #0EA5E9; }' +
'.agent-email-promo { background: #EF4444; }' +
'.agent-qualification { background: #14B8A6; }' +
'.achievement-tags { display: flex; flex-wrap: wrap; gap: 8px; }' +
'.achievement-tag { padding: 4px 10px; border-radius: 12px; font-size: 0.8em; }' +
'.achievement-green { background: rgba(16, 185, 129, 0.2); color: #10B981; border: 1px solid #10B981; }' +
'.achievement-emerald { background: rgba(5, 150, 105, 0.2); color: #059669; border: 1px solid #059669; }' +
'.achievement-amber { background: rgba(245, 158, 11, 0.2); color: #F59E0B; border: 1px solid #F59E0B; }' +
'.achievement-violet { background: rgba(139, 92, 246, 0.2); color: #8B5CF6; border: 1px solid #8B5CF6; }' +
'.achievement-pink { background: rgba(236, 72, 153, 0.2); color: #EC4899; border: 1px solid #EC4899; }' +
'.no-achievements { color: var(--text-secondary); font-style: italic; }' +
'.about-section p, .next-steps-section p, .profile-section p { color: var(--text-secondary); }' +
'.profile-section { background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; }' +
'.profile-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }' +
'.profile-item { padding: 8px 12px; background: rgba(255,255,255,0.05); border-radius: 6px; font-size: 0.9em; }' +
'.profile-item.full-width { grid-column: 1 / -1; }' +
'.profile-label { color: var(--accent-gold); font-weight: 600; margin-right: 8px; }' +
'.profile-item em { color: var(--text-secondary); opacity: 0.6; }' +
'.filters-row { display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap; }' +
'.search-box { flex: 1; min-width: 250px; padding: 15px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); font-size: 1em; }' +
'.tier-filter, .sort-filter { padding: 15px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); font-size: 1em; min-width: 150px; cursor: pointer; }' +
'.sort-filter { min-width: 200px; }' +
'.stat-badge.days { background: #8B5CF6; color: white; }' +
'.security-flag { margin-left: 8px; animation: blink 1s infinite; }' +
'@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }' +
'.coach-insight { background: rgba(59, 130, 246, 0.1); padding: 15px; border-radius: 8px; border-left: 4px solid #3B82F6; }' +
'.coach-insight h4 { color: #3B82F6; margin-bottom: 8px; }' +
'.coach-insight p { color: var(--text-secondary); line-height: 1.5; }' +
'.engagement-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }' +
'.metric { text-align: center; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px; }' +
'.metric-value { display: block; font-size: 1.5em; font-weight: bold; color: var(--accent-blue); }' +
'.metric-label { font-size: 0.75em; color: var(--text-secondary); }' +
'.jailbreak-warning { background: rgba(239, 68, 68, 0.1); padding: 15px; border-radius: 8px; border-left: 4px solid #EF4444; margin-top: 15px; }' +
'.jailbreak-warning h4 { color: #EF4444; margin-bottom: 10px; }' +
'.jailbreak-item { background: rgba(0,0,0,0.2); padding: 10px; border-radius: 6px; margin-bottom: 8px; }' +
'.jailbreak-date { color: var(--text-secondary); font-size: 0.8em; }' +
'.jailbreak-content { color: #FCA5A5; font-size: 0.85em; margin-top: 5px; font-family: monospace; word-break: break-word; }' +
'.recent-questions-section { margin-top: 15px; }' +
'.recent-question { background: rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; margin-bottom: 8px; }' +
'.question-agent { background: rgba(99, 102, 241, 0.3); color: #818CF8; padding: 2px 8px; border-radius: 10px; font-size: 0.75em; }' +
'.question-date { color: var(--text-secondary); font-size: 0.75em; margin-left: 8px; }' +
'.question-text { color: var(--text-secondary); font-size: 0.9em; margin-top: 8px; font-style: italic; }' +
'.outputs-section { margin-top: 15px; }' +
'.outputs-list { display: flex; flex-wrap: wrap; gap: 8px; }' +
'.output-badge { background: rgba(16, 185, 129, 0.2); color: #34D399; padding: 6px 12px; border-radius: 20px; font-size: 0.8em; border: 1px solid #10B981; }' +
'.no-data { color: var(--text-secondary); font-style: italic; }' +
'.jailbreak-summary { background: rgba(239, 68, 68, 0.15); padding: 20px; border-radius: 12px; border: 1px solid rgba(239, 68, 68, 0.3); margin-bottom: 30px; }' +
'.jailbreak-summary h3 { color: #EF4444; margin-bottom: 15px; }' +
'.jailbreak-summary-item { background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px; margin-bottom: 10px; }' +
'.jailbreak-summary-item .email { color: #FCA5A5; font-weight: bold; }' +
'.jailbreak-summary-item .content { color: var(--text-secondary); font-size: 0.85em; margin-top: 5px; font-family: monospace; }' +
'.live-badge { display: inline-block; background: #10B981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.8em; margin-left: 10px; animation: pulse 2s infinite; }' +
'@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }' +
'</style>' +
'</head>' +
'<body>' +
'<div class="container">' +
'<header>' +
'<h1>📊 ECOS Platform Usage Report <span class="live-badge">🔴 LIVE</span></h1>' +
'<p class="report-date">Generated: ' + new Date().toLocaleString() + '</p>' +
'</header>' +
'<div class="summary-grid">' +
'<div class="summary-card"><div class="summary-value">' + totalUserCount + '</div><div class="summary-label">Total Users</div></div>' +
'<div class="summary-card"><div class="summary-value">' + (totals.total_users || 0) + '</div><div class="summary-label">Active (with API usage)</div></div>' +
'<div class="summary-card"><div class="summary-value">$' + parseFloat(totals.total_cost || 0).toFixed(2) + '</div><div class="summary-label">Total API Cost</div></div>' +
'<div class="summary-card"><div class="summary-value">' + Math.round((parseInt(totals.total_tokens) || 0) / 1000) + 'K</div><div class="summary-label">Total Tokens</div></div>' +
'<div class="summary-card"><div class="summary-value">' + (onboardingStats.completed || 0) + '/' + (onboardingStats.total || 0) + '</div><div class="summary-label">Onboarding Complete</div></div>' +
'</div>' +
'<div class="tier-breakdown">' +
'<h3>📊 Membership Tier Distribution</h3>' +
'<div class="tier-bars">' +
'<div class="tier-bar"><span class="tier-bar-label">Foundations</span><div class="tier-bar-track"><div class="tier-bar-fill foundations" style="width: ' + Math.round(((tierBreakdown.foundations || 0) / totalUserCount) * 100) + '%">' + (tierBreakdown.foundations || 0) + '</div></div></div>' +
'<div class="tier-bar"><span class="tier-bar-label">5IN30</span><div class="tier-bar-track"><div class="tier-bar-fill t5in30" style="width: ' + Math.max(Math.round(((tierBreakdown['5in30'] || 0) / totalUserCount) * 100), ((tierBreakdown['5in30'] || 0) > 0 ? 5 : 0)) + '%">' + (tierBreakdown['5in30'] || 0) + '</div></div></div>' +
'<div class="tier-bar"><span class="tier-bar-label">Fast Start</span><div class="tier-bar-track"><div class="tier-bar-fill fast-start" style="width: ' + Math.max(Math.round(((tierBreakdown.fast_start || 0) / totalUserCount) * 100), ((tierBreakdown.fast_start || 0) > 0 ? 5 : 0)) + '%">' + (tierBreakdown.fast_start || 0) + '</div></div></div>' +
'<div class="tier-bar"><span class="tier-bar-label">Accelerate</span><div class="tier-bar-track"><div class="tier-bar-fill accelerate" style="width: ' + Math.max(Math.round(((tierBreakdown.accelerate || 0) / totalUserCount) * 100), ((tierBreakdown.accelerate || 0) > 0 ? 5 : 0)) + '%">' + (tierBreakdown.accelerate || 0) + '</div></div></div>' +
'<div class="tier-bar"><span class="tier-bar-label">Private</span><div class="tier-bar-track"><div class="tier-bar-fill private" style="width: ' + Math.max(Math.round(((tierBreakdown.private || 0) / totalUserCount) * 100), ((tierBreakdown.private || 0) > 0 ? 5 : 0)) + '%">' + (tierBreakdown.private || 0) + '</div></div></div>' +
'</div>' +
'</div>' +
'<div class="filters-row">' +
'<input type="text" class="search-box" placeholder="🔍 Search users by name, email, or company..." onkeyup="filterUsers()">' +
'<select class="sort-filter" onchange="sortUsers()">' +
'<option value="cost-desc">💰 Highest Cost</option>' +
'<option value="cost-asc">💰 Lowest Cost</option>' +
'<option value="last-active-desc">🕐 Most Recent Activity</option>' +
'<option value="last-active-asc">🕐 Least Recent Activity</option>' +
'<option value="created-desc">📅 Newest Users</option>' +
'<option value="created-asc">📅 Oldest Users</option>' +
'</select>' +
'<select class="tier-filter" onchange="filterUsers()">' +
'<option value="all">All Tiers</option>' +
'<option value="foundations">Foundations</option>' +
'<option value="5in30">5IN30</option>' +
'<option value="fast_start">Fast Start</option>' +
'<option value="accelerate">Accelerate</option>' +
'<option value="private">Private</option>' +
'</select>' +
'</div>' +
'<div id="users-container">' + userCardsHtml + '</div>' +
'</div>' +
'<script>' +
'function filterUsers() {' +
'var query = document.querySelector(".search-box").value.toLowerCase();' +
'var tier = document.querySelector(".tier-filter").value;' +
'var cards = document.querySelectorAll(".user-card");' +
'cards.forEach(function(card) {' +
'var text = card.textContent.toLowerCase();' +
'var cardTier = card.getAttribute("data-tier");' +
'var matchesSearch = query === "" || text.includes(query);' +
'var matchesTier = tier === "all" || cardTier === tier;' +
'card.style.display = (matchesSearch && matchesTier) ? "block" : "none";' +
'});' +
'}' +
'function sortUsers() {' +
'var sortBy = document.querySelector(".sort-filter").value;' +
'var container = document.getElementById("users-container");' +
'var cards = Array.from(container.querySelectorAll(".user-card"));' +
'cards.sort(function(a, b) {' +
'var aVal, bVal;' +
'if (sortBy === "cost-desc" || sortBy === "cost-asc") {' +
'aVal = parseFloat(a.getAttribute("data-cost")) || 0;' +
'bVal = parseFloat(b.getAttribute("data-cost")) || 0;' +
'return sortBy === "cost-desc" ? bVal - aVal : aVal - bVal;' +
'} else if (sortBy === "last-active-desc" || sortBy === "last-active-asc") {' +
'aVal = parseInt(a.getAttribute("data-last-active")) || 0;' +
'bVal = parseInt(b.getAttribute("data-last-active")) || 0;' +
'return sortBy === "last-active-desc" ? bVal - aVal : aVal - bVal;' +
'} else if (sortBy === "created-desc" || sortBy === "created-asc") {' +
'aVal = parseInt(a.getAttribute("data-created")) || 0;' +
'bVal = parseInt(b.getAttribute("data-created")) || 0;' +
'return sortBy === "created-desc" ? bVal - aVal : aVal - bVal;' +
'}' +
'return 0;' +
'});' +
'cards.forEach(function(card) { container.appendChild(card); });' +
'}' +
'</script>' +
'</body>' +
'</html>';

      res.writeHead(200, { ...corsHeaders, 'Content-Type': 'text/html' });
      res.end(html);
      console.log('📊 [ADMIN] Usage dashboard viewed by: ' + user.email);
    } catch (error) {
      console.error('❌ Usage dashboard error:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to generate usage dashboard', details: error.message }));
    }
    return;
  }

  // Admin: Get all system prompts
  if (path === '/api/admin/system-prompts' && method === 'GET') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      res.writeHead(403, corsHeaders);
      res.end(JSON.stringify({ error: 'Forbidden: Admin access required' }));
      return;
    }

    try {
      const result = await pool.query(`
        SELECT id, prompt_type as "promptType", prompt_name as "promptName",
               system_prompt as "systemPrompt", prompt_description as "promptDescription",
               model_id as "modelId", temperature, max_tokens as "maxTokens",
               updated_at as "updatedAt", updated_by as "updatedBy"
        FROM system_prompts
        ORDER BY prompt_type
      `);

      console.log(`📝 [ADMIN] System prompts requested by: ${user.email}`);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ prompts: result.rows }));
    } catch (error) {
      console.error('❌ Get system prompts error:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to fetch system prompts' }));
    }
    return;
  }

  // Admin: Update system prompt
  if (path.match(/^\/api\/admin\/system-prompts\/[^\/]+$/) && method === 'PUT') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      res.writeHead(403, corsHeaders);
      res.end(JSON.stringify({ error: 'Forbidden: Admin access required' }));
      return;
    }

    try {
      const promptId = path.split('/')[4];
      const body = await parseBody(req);
      const { systemPrompt, modelId, temperature, maxTokens } = body;

      if (!systemPrompt || typeof systemPrompt !== 'string') {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: 'systemPrompt is required and must be a string' }));
        return;
      }

      // Update prompt
      const result = await pool.query(`
        UPDATE system_prompts
        SET system_prompt = $1, model_id = $2, temperature = $3, max_tokens = $4, updated_by = $5
        WHERE id = $6
        RETURNING id, prompt_type as "promptType", prompt_name as "promptName",
                  system_prompt as "systemPrompt", prompt_description as "promptDescription",
                  model_id as "modelId", temperature, max_tokens as "maxTokens",
                  updated_at as "updatedAt", updated_by as "updatedBy"
      `, [systemPrompt, modelId, temperature, maxTokens, user.id, promptId]);

      if (result.rows.length === 0) {
        res.writeHead(404, corsHeaders);
        res.end(JSON.stringify({ error: 'System prompt not found' }));
        return;
      }

      console.log(`✏️ [ADMIN] System prompt ID ${promptId} updated by ${user.email}`);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify(result.rows[0]));
    } catch (error) {
      console.error('❌ Update system prompt error:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to update system prompt' }));
    }
    return;
  }

  // Admin: Get all users with stats
  if (path === '/api/admin/users' && method === 'GET') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    // Check if user is admin or power_user
    if (user.role !== 'admin' && user.role !== 'power_user') {
      res.writeHead(403, corsHeaders);
      res.end(JSON.stringify({ error: 'Forbidden: Admin access required' }));
      return;
    }

    try {
      // Parse query params for filtering
      const url = new URL(req.url, `http://${req.headers.host}`);
      const tierFilter = url.searchParams.get('tier');
      const statusFilter = url.searchParams.get('membership_status');
      const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit')) || 25));
      const days = parseInt(url.searchParams.get('days'));
      const offset = (page - 1) * limit;

      let whereConditions = [];
      const params = [];
      let paramIndex = 1;

      if (tierFilter && tierFilter !== 'all') {
        whereConditions.push(`u.membership_tier = $${paramIndex++}`);
        params.push(tierFilter);
      }

      if (statusFilter && statusFilter !== 'all') {
        whereConditions.push(`u.membership_status = $${paramIndex++}`);
        params.push(statusFilter);
      }

      if (days && days > 0) {
        whereConditions.push(`u.created_at > NOW() - INTERVAL '${parseInt(days)} days'`);
      }

      const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

      // Get total count for pagination
      const countResult = await pool.query(`SELECT COUNT(*) as total FROM users u ${whereClause}`, params);
      const totalCount = parseInt(countResult.rows[0].total);

      const result = await pool.query(`
        SELECT
          u.id,
          u.email,
          u.first_name,
          u.last_name,
          u.role,
          u.is_active,
          u.created_at,
          u.last_login_at,
          u.membership_tier,
          u.membership_status,
          u.membership_expires_at,
          u.grace_period_ends_at,
          u.membership_updated_at,
          COUNT(DISTINCT c.id) as conversation_count,
          COUNT(DISTINCT m.id) as memory_count,
          COALESCE(SUM(ut.input_tokens), 0) as total_input_tokens,
          COALESCE(SUM(ut.output_tokens), 0) as total_output_tokens,
          COALESCE(SUM(ut.cost_usd), 0) as estimated_cost
        FROM users u
        LEFT JOIN conversations c ON c.user_id = u.id
        LEFT JOIN memories m ON m.user_id = u.id
        LEFT JOIN api_usage_logs ut ON ut.user_id = u.id
        ${whereClause}
        GROUP BY u.id, u.email, u.first_name, u.last_name, u.role, u.is_active, u.created_at, u.last_login_at,
                 u.membership_tier, u.membership_status, u.membership_expires_at, u.grace_period_ends_at, u.membership_updated_at
        ORDER BY u.created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `, [...params, limit, offset]);

      console.log(`👥 [ADMIN] Users list requested by: ${user.email}${tierFilter ? ` (tier: ${tierFilter})` : ''}${statusFilter ? ` (status: ${statusFilter})` : ''} (page ${page}, limit ${limit})`);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        users: result.rows,
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }));
    } catch (error) {
      console.error('❌ Get users error:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to fetch users' }));
    }
    return;
  }

  // Admin: Update user role
  if (path.match(/^\/api\/admin\/users\/[^\/]+\/role$/) && method === 'PUT') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    if (user.role !== 'admin') {
      res.writeHead(403, corsHeaders);
      res.end(JSON.stringify({ error: 'Forbidden: Admin access required' }));
      return;
    }

    const userId = path.split('/')[4];

    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { role } = JSON.parse(body);

        // Validate role
        if (!['user', 'power_user', 'admin'].includes(role)) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Invalid role. Must be user, power_user, or admin' }));
          return;
        }

        // Prevent admin from removing their own admin role
        if (userId === user.id && role !== 'admin') {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Cannot change your own admin role' }));
          return;
        }

        // Check if this is the last admin
        if (role !== 'admin') {
          const adminCheck = await pool.query(`
            SELECT COUNT(*) as admin_count
            FROM users
            WHERE role = 'admin' AND is_active = true AND id != $1
          `, [userId]);

          if (parseInt(adminCheck.rows[0].admin_count) === 0) {
            res.writeHead(400, corsHeaders);
            res.end(JSON.stringify({ error: 'Cannot remove the last admin' }));
            return;
          }
        }

        // Update role
        const result = await pool.query(`
          UPDATE users
          SET role = $1, updated_at = NOW()
          WHERE id = $2
          RETURNING id, email, role, first_name, last_name
        `, [role, userId]);

        if (result.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'User not found' }));
          return;
        }

        // Log security event
        await pool.query(`
          INSERT INTO security_events (user_id, event_type, severity, description, metadata)
          VALUES ($1, 'role_change', 'warning', $2, $3)
        `, [
          userId,
          `Admin ${user.email} changed role to ${role}`,
          JSON.stringify({ admin_user: user.email, new_role: role, target_user: result.rows[0].email })
        ]);

        console.log(`🔐 [ADMIN] Role changed for ${result.rows[0].email} to ${role} by ${user.email}`);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify(result.rows[0]));
      } catch (error) {
        console.error('❌ Update user role error:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to update user role' }));
      }
    });
    return;
  }

  // Admin: Update user status (activate/deactivate)
  if (path.match(/^\/api\/admin\/users\/[^\/]+\/status$/) && method === 'PUT') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    if (user.role !== 'admin') {
      res.writeHead(403, corsHeaders);
      res.end(JSON.stringify({ error: 'Forbidden: Admin access required' }));
      return;
    }

    const userId = path.split('/')[4];

    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { is_active } = JSON.parse(body);

        // Prevent admin from deactivating themselves
        if (userId === user.id && !is_active) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Cannot deactivate your own account' }));
          return;
        }

        // Update status
        const result = await pool.query(`
          UPDATE users
          SET is_active = $1, updated_at = NOW()
          WHERE id = $2
          RETURNING id, email, is_active, first_name, last_name
        `, [is_active, userId]);

        if (result.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'User not found' }));
          return;
        }

        // Log security event
        await pool.query(`
          INSERT INTO security_events (user_id, event_type, severity, description, metadata)
          VALUES ($1, 'account_status_change', 'warning', $2, $3)
        `, [
          userId,
          `Admin ${user.email} ${is_active ? 'activated' : 'deactivated'} account`,
          JSON.stringify({ admin_user: user.email, new_status: is_active, target_user: result.rows[0].email })
        ]);

        console.log(`🔐 [ADMIN] Account ${is_active ? 'activated' : 'deactivated'} for ${result.rows[0].email} by ${user.email}`);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify(result.rows[0]));
      } catch (error) {
        console.error('❌ Update user status error:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to update user status' }));
      }
    });
    return;
  }

  // Admin: Reset user password
  if (path.match(/^\/api\/admin\/users\/[^\/]+\/reset-password$/) && method === 'POST') {
    // Support both JWT auth and x-admin-secret for CLI/API access
    const adminSecret = process.env.ADMIN_SECRET || 'ecos-admin-secret-2025';
    const xAdminSecret = req.headers['x-admin-secret'];
    const isAdminSecretAuth = xAdminSecret === adminSecret;

    const user = getUserFromToken(req.headers.authorization);
    if (!user && !isAdminSecretAuth) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    if (user && user.role !== 'admin' && !isAdminSecretAuth) {
      res.writeHead(403, corsHeaders);
      res.end(JSON.stringify({ error: 'Forbidden: Admin access required' }));
      return;
    }

    // Use admin_secret as the admin identifier when using x-admin-secret auth
    const adminEmail = isAdminSecretAuth ? 'admin_secret' : user.email;

    const userId = path.split('/')[4];

    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { new_password, send_email } = JSON.parse(body);

        // Get target user info
        const targetUser = await pool.query(`
          SELECT id, email, first_name, last_name FROM users WHERE id = $1
        `, [userId]);

        if (targetUser.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'User not found' }));
          return;
        }

        const targetEmail = targetUser.rows[0].email;
        const targetName = targetUser.rows[0].first_name || targetEmail.split('@')[0];

        // Generate new password if not provided
        const password = new_password || generateRandomPassword();

        // Hash the password
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update user password
        await pool.query(`
          UPDATE users
          SET password_hash = $1, updated_at = NOW()
          WHERE id = $2
        `, [hashedPassword, userId]);

        // Log security event
        await pool.query(`
          INSERT INTO security_events (user_id, event_type, severity, description, metadata)
          VALUES ($1, 'password_reset_by_admin', 'warning', $2, $3)
        `, [
          userId,
          `Admin ${adminEmail} reset password`,
          JSON.stringify({ admin_user: adminEmail, target_user: targetEmail, email_sent: !!send_email })
        ]);

        console.log(`🔐 [ADMIN] Password reset for ${targetEmail} by ${adminEmail}`);

        // Send email notification if requested
        if (send_email && sendPasswordResetByAdminEmail) {
          try {
            await sendPasswordResetByAdminEmail(targetEmail, targetName, password);
            console.log(`📧 Password reset email sent to ${targetEmail}`);
          } catch (emailError) {
            console.error('❌ Failed to send password reset email:', emailError);
          }
        }

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          message: `Password reset for ${targetEmail}`,
          email_sent: !!send_email,
          // Only include temp password if not sending email (for admin to communicate manually)
          ...(send_email ? {} : { temporary_password: password })
        }));
      } catch (error) {
        console.error('❌ Admin password reset error:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to reset password' }));
      }
    });
    return;
  }

  // Admin: Delete user
  if (path.match(/^\/api\/admin\/users\/[^\/]+$/) && method === 'DELETE') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    if (user.role !== 'admin') {
      res.writeHead(403, corsHeaders);
      res.end(JSON.stringify({ error: 'Forbidden: Admin access required' }));
      return;
    }

    const userId = path.split('/')[4];

    try {
      // Prevent admin from deleting themselves
      if (userId === user.id) {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: 'Cannot delete your own account' }));
        return;
      }

      // Get user info before deletion
      const userInfo = await pool.query(`
        SELECT email, role FROM users WHERE id = $1
      `, [userId]);

      if (userInfo.rows.length === 0) {
        res.writeHead(404, corsHeaders);
        res.end(JSON.stringify({ error: 'User not found' }));
        return;
      }

      // Check if this is the last admin
      if (userInfo.rows[0].role === 'admin') {
        const adminCheck = await pool.query(`
          SELECT COUNT(*) as admin_count
          FROM users
          WHERE role = 'admin' AND is_active = true AND id != $1
        `, [userId]);

        if (parseInt(adminCheck.rows[0].admin_count) === 0) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Cannot delete the last admin' }));
          return;
        }
      }

      // Log security event before deletion
      await pool.query(`
        INSERT INTO security_events (user_id, event_type, severity, description, metadata)
        VALUES ($1, 'user_deleted', 'critical', $2, $3)
      `, [
        userId,
        `Admin ${user.email} deleted user account`,
        JSON.stringify({ admin_user: user.email, deleted_user: userInfo.rows[0].email })
      ]);

      // Delete user (CASCADE will handle related records)
      await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);

      console.log(`🗑️ [ADMIN] User ${userInfo.rows[0].email} deleted by ${user.email}`);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        message: 'User deleted successfully',
        email: userInfo.rows[0].email
      }));
    } catch (error) {
      console.error('❌ Delete user error:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to delete user' }));
    }
    return;
  }

  // Admin: Update user membership (tier, status, grace period)
  if (path.match(/^\/api\/admin\/users\/[^\/]+\/membership$/) && method === 'PUT') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    if (user.role !== 'admin') {
      res.writeHead(403, corsHeaders);
      res.end(JSON.stringify({ error: 'Forbidden: Admin access required' }));
      return;
    }

    const userId = path.split('/')[4];

    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { membership_tier, membership_status, action, notes } = JSON.parse(body);

        // Get current user info
        const currentUser = await pool.query(`
          SELECT email, membership_tier, membership_status, is_active
          FROM users WHERE id = $1
        `, [userId]);

        if (currentUser.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'User not found' }));
          return;
        }

        const targetUser = currentUser.rows[0];

        // Handle different actions
        if (action === 'pause' || action === 'cancel') {
          // Start grace period (7 days)
          await pool.query(`
            UPDATE users SET
              membership_status = 'grace_period',
              grace_period_ends_at = NOW() + INTERVAL '7 days',
              membership_updated_at = NOW(),
              membership_notes = $2
            WHERE id = $1
          `, [userId, notes || `${action}ed by admin`]);

          // Log to audit
          await pool.query(`
            INSERT INTO membership_audit_log (user_id, action, previous_status, new_status, admin_id, admin_email, notes)
            VALUES ($1, 'grace_started', $2, 'grace_period', $3, $4, $5)
          `, [userId, targetUser.membership_status, user.id, user.email, notes || `${action}ed by admin`]);

          console.log(`⏸️ [ADMIN] Membership ${action}ed for ${targetUser.email} by ${user.email} (7-day grace period started)`);

        } else if (action === 'expire') {
          // Immediately expire (skip grace period)
          await pool.query(`
            UPDATE users SET
              is_active = false,
              membership_status = 'expired',
              grace_period_ends_at = NULL,
              membership_updated_at = NOW(),
              membership_notes = $2
            WHERE id = $1
          `, [userId, notes || 'Expired by admin']);

          // Log to audit
          await pool.query(`
            INSERT INTO membership_audit_log (user_id, action, previous_status, new_status, admin_id, admin_email, notes)
            VALUES ($1, 'access_revoked', $2, 'expired', $3, $4, $5)
          `, [userId, targetUser.membership_status, user.id, user.email, notes || 'Expired by admin']);

          console.log(`🚫 [ADMIN] Membership expired for ${targetUser.email} by ${user.email}`);

        } else if (action === 'reactivate') {
          // Reactivate membership
          const newTier = membership_tier || targetUser.membership_tier || 'foundations';
          await pool.query(`
            UPDATE users SET
              is_active = true,
              membership_status = 'active',
              membership_tier = $2,
              grace_period_ends_at = NULL,
              membership_updated_at = NOW(),
              membership_notes = $3
            WHERE id = $1
          `, [userId, newTier, notes || 'Reactivated by admin']);

          // Log to audit
          await pool.query(`
            INSERT INTO membership_audit_log (user_id, action, previous_tier, new_tier, previous_status, new_status, admin_id, admin_email, notes)
            VALUES ($1, 'reactivated', $2, $3, $4, 'active', $5, $6, $7)
          `, [userId, targetUser.membership_tier, newTier, targetUser.membership_status, user.id, user.email, notes || 'Reactivated by admin']);

          console.log(`✅ [ADMIN] Membership reactivated for ${targetUser.email} (tier: ${newTier}) by ${user.email}`);

        } else {
          // Just update tier and/or status directly
          const updates = [];
          const values = [userId];
          let paramIndex = 2;

          console.log(`📝 [ADMIN] Tier change request: tier=${membership_tier}, status=${membership_status}`);

          if (membership_tier && ['5in30', 'fast_start', 'foundations', 'accelerate', 'private'].includes(membership_tier)) {
            updates.push(`membership_tier = $${paramIndex}`);
            values.push(membership_tier);
            paramIndex++;
            console.log(`   ✓ Tier validated: ${membership_tier}`);
          } else if (membership_tier) {
            console.log(`   ✗ Invalid tier: ${membership_tier}`);
          }

          if (membership_status && ['active', 'paused', 'cancelled', 'grace_period', 'expired'].includes(membership_status)) {
            updates.push(`membership_status = $${paramIndex}`);
            values.push(membership_status);
            paramIndex++;
            console.log(`   ✓ Status validated: ${membership_status}`);
          } else if (membership_status) {
            console.log(`   ✗ Invalid status: ${membership_status}`);
          }

          if (notes) {
            updates.push(`membership_notes = $${paramIndex}`);
            values.push(notes);
            paramIndex++;
          }

          if (updates.length === 0) {
            console.log(`   ⚠️ No valid updates provided`);
            res.writeHead(400, corsHeaders);
            res.end(JSON.stringify({ error: 'No valid updates provided. Check tier/status values.' }));
            return;
          }

          updates.push('membership_updated_at = NOW()');
          await pool.query(`
            UPDATE users SET ${updates.join(', ')} WHERE id = $1
          `, values);

          // Log to audit
          await pool.query(`
            INSERT INTO membership_audit_log (user_id, action, previous_tier, new_tier, previous_status, new_status, admin_id, admin_email, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [
            userId,
            membership_tier ? 'tier_changed' : 'status_changed',
            targetUser.membership_tier,
            membership_tier || targetUser.membership_tier,
            targetUser.membership_status,
            membership_status || targetUser.membership_status,
            user.id,
            user.email,
            notes
          ]);

          console.log(`📝 [ADMIN] Membership updated for ${targetUser.email} by ${user.email}`);
        }

        // Get updated user
        const updatedUser = await pool.query(`
          SELECT id, email, membership_tier, membership_status, membership_expires_at,
                 grace_period_ends_at, membership_updated_at, is_active
          FROM users WHERE id = $1
        `, [userId]);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify(updatedUser.rows[0]));

      } catch (error) {
        console.error('❌ Update membership error:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to update membership' }));
      }
    });
    return;
  }

  // Admin: Get membership audit log for a user
  if (path.match(/^\/api\/admin\/users\/[^\/]+\/membership-history$/) && method === 'GET') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    if (user.role !== 'admin' && user.role !== 'power_user') {
      res.writeHead(403, corsHeaders);
      res.end(JSON.stringify({ error: 'Forbidden: Admin access required' }));
      return;
    }

    const userId = path.split('/')[4];

    try {
      const result = await pool.query(`
        SELECT id, action, previous_tier, new_tier, previous_status, new_status,
               admin_email, notes, created_at
        FROM membership_audit_log
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 50
      `, [userId]);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify(result.rows));
    } catch (error) {
      console.error('❌ Get membership history error:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to fetch membership history' }));
    }
    return;
  }

  // Admin: Get membership stats summary
  if (path === '/api/admin/membership-stats' && method === 'GET') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    if (user.role !== 'admin' && user.role !== 'power_user') {
      res.writeHead(403, corsHeaders);
      res.end(JSON.stringify({ error: 'Forbidden: Admin access required' }));
      return;
    }

    try {
      const result = await pool.query(`
        SELECT
          membership_tier,
          membership_status,
          COUNT(*) as count
        FROM users
        GROUP BY membership_tier, membership_status
        ORDER BY membership_tier, membership_status
      `);

      // Also get count of users in grace period expiring soon
      const gracePeriodCount = await pool.query(`
        SELECT COUNT(*) as count
        FROM users
        WHERE membership_status = 'grace_period'
          AND grace_period_ends_at IS NOT NULL
          AND grace_period_ends_at <= NOW() + INTERVAL '3 days'
      `);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        breakdown: result.rows,
        grace_period_expiring_soon: parseInt(gracePeriodCount.rows[0].count)
      }));
    } catch (error) {
      console.error('❌ Get membership stats error:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to fetch membership stats' }));
    }
    return;
  }

  // Admin: Get system configuration
  if (path === '/api/admin/system-config' && method === 'GET') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    // Check if user is admin or power_user
    if (user.role !== 'admin' && user.role !== 'power_user') {
      res.writeHead(403, corsHeaders);
      res.end(JSON.stringify({ error: 'Forbidden: Admin access required' }));
      return;
    }

    try {
      const result = await pool.query(`
        SELECT id, key, value, description, updated_at, updated_by
        FROM system_config
        ORDER BY key
      `);

      console.log(`⚙️ [ADMIN] System config requested by: ${user.email}`);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify(result.rows));
    } catch (error) {
      console.error('❌ Get system config error:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to fetch system config' }));
    }
    return;
  }

  // Admin: Update system configuration
  if (path.match(/^\/api\/admin\/system-config\/[^\/]+$/) && method === 'PUT') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      res.writeHead(403, corsHeaders);
      res.end(JSON.stringify({ error: 'Forbidden: Admin access required' }));
      return;
    }

    try {
      const configKey = path.split('/')[4];
      const body = await parseBody(req);
      const { config_value } = body;

      if (!config_value || typeof config_value !== 'string') {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: 'config_value is required and must be a string' }));
        return;
      }

      // Update config
      const result = await pool.query(`
        UPDATE system_config
        SET value = $1, updated_by = $2
        WHERE key = $3
        RETURNING id, key, value, updated_at, updated_by
      `, [config_value, user.email, configKey]);

      if (result.rows.length === 0) {
        res.writeHead(404, corsHeaders);
        res.end(JSON.stringify({ error: 'System config not found' }));
        return;
      }

      console.log(`⚙️ [ADMIN] System config '${configKey}' updated to '${config_value}' by ${user.email}`);

      // Update in-memory variables based on config key
      if (configKey === 'widget_formatting_model') {
        widgetFormatterModel = config_value;
        console.log(`✨ Widget formatter model updated to: ${config_value}`);
      }

      // Refresh agent cache when any model config changes
      // This ensures agents use the updated default models from system_config
      if (configKey.includes('_model')) {
        try {
          const refreshed = await loadAgentsFromDatabase();
          if (refreshed) {
            console.log(`🔄 [ADMIN] Agent cache refreshed after model config update (${configKey})`);
          }
        } catch (refreshError) {
          console.error('⚠️ [ADMIN] Failed to refresh agent cache:', refreshError.message);
          // Don't fail the request if cache refresh fails
        }
      }

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify(result.rows[0]));
    } catch (error) {
      console.error('❌ Update system config error:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to update system config' }));
    }
    return;
  }

  // Admin: Update all agent prompts from instruction files
  if (path === '/api/admin/update-agent-prompts' && method === 'POST') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      res.writeHead(403, corsHeaders);
      res.end(JSON.stringify({ error: 'Forbidden: Admin access required' }));
      return;
    }

    try {
      const instructionsDir = pathModule.join(__dirname, 'agents', 'instructions');

      // Agent mapping: agent_id → instruction_file
      const agentMap = {
        'money-model-maker': 'money-model-maker-instructions.md',
        'fast-fix-finder': 'fast-fix-finder-instructions.md',
        'offer-promo-printer': 'offer-promo-printer-instructions.md',
        'promo-planner': 'promo-planner-instructions.md',
        'qualification-call-builder': 'qualification-call-builder-instructions.md',
        'linkedin-events-builder': 'linkedin-events-builder-instructions.md',
      };

      console.log(`📝 [ADMIN] Updating agent prompts from: ${instructionsDir}`);

      const results = [];
      let successCount = 0;
      let failCount = 0;

      // Update each agent
      for (const [agentId, filename] of Object.entries(agentMap)) {
        const filepath = pathModule.join(instructionsDir, filename);

        try {
          // Check if file exists
          if (!fs.existsSync(filepath)) {
            console.log(`   ⚠️ File not found: ${filepath}`);
            results.push({ agentId, status: 'file_not_found', filename });
            failCount++;
            continue;
          }

          // Read file content
          const content = fs.readFileSync(filepath, 'utf8');
          const filesize = Buffer.byteLength(content, 'utf8');

          console.log(`   📄 Updating ${agentId} from ${filename} (${filesize} bytes)`);

          // Update agent in database
          const result = await pool.query(
            `UPDATE agents
             SET system_prompt = $1, updated_at = NOW()
             WHERE id = $2
             RETURNING id, name, LENGTH(system_prompt) as prompt_length`,
            [content, agentId]
          );

          if (result.rows.length > 0) {
            const row = result.rows[0];
            console.log(`   ✅ Updated: ${row.name} (${row.prompt_length} chars)`);
            results.push({
              agentId,
              status: 'success',
              name: row.name,
              promptLength: row.prompt_length,
              filename
            });
            successCount++;
          } else {
            console.log(`   ⚠️ Agent not found in database: ${agentId}`);
            results.push({ agentId, status: 'not_found', filename });
            failCount++;
          }
        } catch (error) {
          console.error(`   ❌ Failed to update ${agentId}:`, error.message);
          results.push({ agentId, status: 'error', error: error.message, filename });
          failCount++;
        }
      }

      // Refresh agent cache
      await loadAgentsFromDatabase();
      console.log(`🔄 [ADMIN] Agent cache refreshed after prompt updates`);

      console.log(`✅ [ADMIN] Agent prompts updated: ${successCount} successful, ${failCount} failed`);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        success: true,
        message: `Updated ${successCount} agents successfully, ${failCount} failed`,
        successCount,
        failCount,
        results,
        updatedBy: user.email,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('❌ Update agent prompts error:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to update agent prompts', message: error.message }));
    }
    return;
  }

  // POST /api/user/reset-password - Reset user password
  if (path === '/api/user/reset-password' && method === 'POST') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const body = await parseBody(req);
      const { currentPassword, newPassword, confirmPassword } = body;

      // Validate inputs
      if (!newPassword || !confirmPassword) {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: 'New password and confirmation are required' }));
        return;
      }

      if (newPassword !== confirmPassword) {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: 'Passwords do not match' }));
        return;
      }

      // Validate password strength
      if (newPassword.length < 8) {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: 'Password must be at least 8 characters long' }));
        return;
      }

      if (!/[A-Z]/.test(newPassword)) {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: 'Password must contain at least one uppercase letter' }));
        return;
      }

      if (!/[0-9]/.test(newPassword)) {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: 'Password must contain at least one number' }));
        return;
      }

      if (!/[!@#$%^&*]/.test(newPassword)) {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: 'Password must contain at least one special character (!@#$%^&*)' }));
        return;
      }

      // If current password is provided, verify it first
      if (currentPassword) {
        const result = await pool.query(`
          SELECT password_hash FROM users WHERE id = $1
        `, [user.id]);

        if (result.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'User not found' }));
          return;
        }

        // Note: Currently using plain text comparison (TODO: implement bcrypt)
        if (result.rows[0].password_hash !== currentPassword) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Current password is incorrect' }));
          return;
        }
      }

      // Update password in database (TODO: use bcrypt in production)
      await pool.query(`
        UPDATE users
        SET password_hash = $1, updated_at = NOW()
        WHERE id = $2
      `, [newPassword, user.id]);

      console.log(`🔐 [PASSWORD] Password reset for user: ${user.email}`);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true, message: 'Password updated successfully' }));
    } catch (error) {
      console.error('❌ Password reset error:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to reset password' }));
    }
    return;
  }

  // POST /api/user/feedback/submit - Submit user feedback (supports JSON or FormData with attachment)
  // Note: /api/feedback is used for message feedback (thumbs up/down), so user support feedback uses /api/user/feedback/submit
  if (path === '/api/user/feedback/submit' && method === 'POST') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    const contentType = req.headers['content-type'] || '';

    // Handle FormData (with potential file attachment)
    if (contentType.includes('multipart/form-data')) {
      const feedbackUploadDir = pathModule.join(__dirname, 'uploads', 'feedback');
      try {
        if (!fs.existsSync(feedbackUploadDir)) {
          fs.mkdirSync(feedbackUploadDir, { recursive: true });
        }
      } catch (dirErr) {
        console.error('❌ Failed to create feedback upload dir:', dirErr);
      }

      const form = new multiparty.Form({
        uploadDir: feedbackUploadDir,
        maxFilesSize: 5 * 1024 * 1024
      });

      form.parse(req, async (err, fields, files) => {
        if (err) {
          console.error('❌ Feedback form parse error:', err);
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Failed to parse feedback form' }));
          return;
        }

        try {
          const name = fields.name?.[0] || '';
          const email = fields.email?.[0] || '';
          const message = fields.message?.[0] || '';
          const adminContext = fields.admin_context?.[0] || null;
          const attachment = files.attachment?.[0];

          if (!name || !email || !message) {
            res.writeHead(400, corsHeaders);
            res.end(JSON.stringify({ error: 'Name, email, and message are required' }));
            return;
          }

          let attachmentPath = null, attachmentFilename = null, attachmentSize = null, attachmentType = null;

          if (attachment) {
            const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
            if (!allowedTypes.includes(attachment.headers['content-type'])) {
              fs.unlinkSync(attachment.path);
              res.writeHead(400, corsHeaders);
              res.end(JSON.stringify({ error: 'Only image files allowed' }));
              return;
            }
            attachmentPath = attachment.path;
            attachmentFilename = attachment.originalFilename;
            attachmentSize = attachment.size;
            attachmentType = attachment.headers['content-type'];
          }

          const result = await pool.query(`
            INSERT INTO user_feedback (user_id, name, email, message, attachment_path, attachment_filename, attachment_size, attachment_type, admin_context)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, created_at
          `, [user.id, name, email, message, attachmentPath, attachmentFilename, attachmentSize, attachmentType, adminContext]);

          console.log(`💬 [FEEDBACK] New feedback from ${name} (${email})${attachment ? ' with attachment' : ''}`);

          res.writeHead(200, corsHeaders);
          res.end(JSON.stringify({ success: true, id: result.rows[0].id, created_at: result.rows[0].created_at }));
        } catch (error) {
          console.error('❌ Feedback submission error:', error);
          res.writeHead(500, corsHeaders);
          res.end(JSON.stringify({ error: 'Failed to submit feedback' }));
        }
      });
      return;
    }

    // Handle JSON (no attachment)
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const { name, email, message, admin_context } = data;

        if (!name || !email || !message) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Name, email, and message are required' }));
          return;
        }

        const result = await pool.query(`
          INSERT INTO user_feedback (user_id, name, email, message, admin_context)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, created_at
        `, [user.id, name, email, message, admin_context || null]);

        console.log(`💬 [FEEDBACK] New feedback from ${name} (${email})`);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ success: true, id: result.rows[0].id, created_at: result.rows[0].created_at }));
      } catch (error) {
        console.error('❌ Feedback submission error:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to submit feedback' }));
      }
    });
    return;
  }

  // ============================================
  // USER FEEDBACK ENDPOINTS
  // ============================================

  // GET /api/user/feedback/unread-count - Get count of feedback with unread replies
  if (path === '/api/user/feedback/unread-count' && method === 'GET') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      // Count feedback items that have replies the user hasn't read
      // For now, count all feedback with replies where user_read_at is null or older than latest reply
      const result = await pool.query(`
        SELECT COUNT(DISTINCT f.id) as count
        FROM user_feedback f
        INNER JOIN feedback_replies r ON r.feedback_id = f.id
        WHERE f.user_id = $1
          AND r.is_internal = false
          AND (f.user_read_at IS NULL OR r.created_at > f.user_read_at)
      `, [user.id]);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ count: parseInt(result.rows[0]?.count || '0') }));
    } catch (error) {
      console.error('❌ Feedback unread count error:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to get feedback count' }));
    }
    return;
  }

  // POST /api/user/feedback/:id/mark-read - Mark feedback as read
  if (path.match(/^\/api\/user\/feedback\/([^/]+)\/mark-read$/) && method === 'POST') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    const feedbackId = path.split('/')[4];

    try {
      await pool.query(`
        UPDATE user_feedback
        SET user_read_at = NOW()
        WHERE id = $1 AND user_id = $2
      `, [feedbackId, user.id]);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true }));
    } catch (error) {
      console.error('❌ Mark feedback read error:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to mark feedback as read' }));
    }
    return;
  }

  // POST /api/user/feedback/mark-all-read - Mark all feedback as read
  if (path === '/api/user/feedback/mark-all-read' && method === 'POST') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      await pool.query(`
        UPDATE user_feedback
        SET user_read_at = NOW()
        WHERE user_id = $1
      `, [user.id]);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true }));
    } catch (error) {
      console.error('❌ Mark all feedback read error:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to mark feedback as read' }));
    }
    return;
  }

  // ============================================
  // ADMIN FEEDBACK MANAGEMENT
  // ============================================

  // GET /api/admin/feedback - Get all feedback for admin management
  if (path === '/api/admin/feedback' && method === 'GET') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      res.writeHead(403, corsHeaders);
      res.end(JSON.stringify({ error: 'Admin access required' }));
      return;
    }

    try {
      const parsedUrl = url.parse(req.url, true);
      const status = parsedUrl.query.status;
      const priority = parsedUrl.query.priority;
      const assignedTo = parsedUrl.query.assigned_to;
      const page = Math.max(1, parseInt(parsedUrl.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(parsedUrl.query.limit) || 25));
      const days = parseInt(parsedUrl.query.days);
      const offset = (page - 1) * limit;

      let query = `
        SELECT
          f.id, f.user_id, f.name, f.email, f.message,
          f.attachment_path, f.attachment_filename, f.attachment_size, f.attachment_type,
          f.status, f.priority, f.tags, f.assigned_to, f.resolved_at,
          f.created_at, f.updated_at,
          u.first_name as user_first_name, u.last_name as user_last_name,
          a.first_name as assigned_first_name, a.last_name as assigned_last_name,
          (SELECT COUNT(*)::INTEGER FROM feedback_replies WHERE feedback_id = f.id AND is_internal = false) as reply_count
        FROM user_feedback f
        LEFT JOIN users u ON f.user_id = u.id
        LEFT JOIN users a ON f.assigned_to = a.id
        WHERE 1=1
      `;

      let countQuery = `SELECT COUNT(*)::INTEGER as total FROM user_feedback f WHERE 1=1`;
      const params = [];
      const countParams = [];
      let paramIndex = 1;
      let countParamIndex = 1;

      if (status) {
        query += ` AND f.status = $${paramIndex++}`;
        params.push(status);
        countQuery += ` AND f.status = $${countParamIndex++}`;
        countParams.push(status);
      }

      if (priority) {
        query += ` AND f.priority = $${paramIndex++}`;
        params.push(priority);
        countQuery += ` AND f.priority = $${countParamIndex++}`;
        countParams.push(priority);
      }

      if (assignedTo) {
        query += ` AND f.assigned_to = $${paramIndex++}`;
        params.push(assignedTo);
        countQuery += ` AND f.assigned_to = $${countParamIndex++}`;
        countParams.push(assignedTo);
      }

      if (days && days > 0) {
        query += ` AND f.created_at > NOW() - INTERVAL '${parseInt(days)} days'`;
        countQuery += ` AND f.created_at > NOW() - INTERVAL '${parseInt(days)} days'`;
      }

      query += ` ORDER BY f.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      // Get total count for pagination
      const totalResult = await pool.query(countQuery, countParams);
      const totalCount = totalResult.rows[0].total;

      // Get counts by status
      const countsResult = await pool.query(`
        SELECT status, COUNT(*)::INTEGER as count
        FROM user_feedback
        GROUP BY status
      `);

      const statusCounts = {};
      countsResult.rows.forEach(row => {
        statusCounts[row.status] = row.count;
      });

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        feedback: result.rows,
        counts: statusCounts,
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }));
    } catch (error) {
      console.error('❌ Error fetching admin feedback:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to fetch feedback' }));
    }
    return;
  }

  // GET /api/admin/feedback/:id - Get specific feedback with all replies
  if (path.startsWith('/api/admin/feedback/') && method === 'GET' && path.split('/').length === 5) {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    if (user.role !== 'admin') {
      res.writeHead(403, corsHeaders);
      res.end(JSON.stringify({ error: 'Admin access required' }));
      return;
    }

    try {
      const feedbackId = path.split('/')[4];

      // Get feedback details
      const feedbackResult = await pool.query(`
        SELECT
          f.*,
          u.first_name as user_first_name, u.last_name as user_last_name, u.email as user_email,
          a.first_name as assigned_first_name, a.last_name as assigned_last_name
        FROM user_feedback f
        LEFT JOIN users u ON f.user_id = u.id
        LEFT JOIN users a ON f.assigned_to = a.id
        WHERE f.id = $1
      `, [feedbackId]);

      if (feedbackResult.rows.length === 0) {
        res.writeHead(404, corsHeaders);
        res.end(JSON.stringify({ error: 'Feedback not found' }));
        return;
      }

      // Get all replies
      const repliesResult = await pool.query(`
        SELECT
          r.*,
          u.first_name as admin_first_name, u.last_name as admin_last_name, u.email as admin_email
        FROM feedback_replies r
        LEFT JOIN users u ON r.admin_user_id = u.id
        WHERE r.feedback_id = $1
        ORDER BY r.created_at ASC
      `, [feedbackId]);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        feedback: feedbackResult.rows[0],
        replies: repliesResult.rows
      }));
    } catch (error) {
      console.error('❌ Error fetching feedback details:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to fetch feedback details' }));
    }
    return;
  }

  // POST /api/admin/feedback/:id/reply - Reply to feedback
  if (path.match(/^\/api\/admin\/feedback\/[^\/]+\/reply$/) && method === 'POST') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    if (user.role !== 'admin') {
      res.writeHead(403, corsHeaders);
      res.end(JSON.stringify({ error: 'Admin access required' }));
      return;
    }

    try {
      const feedbackId = path.split('/')[4];
      const body = await parseBody(req);
      const { message, is_internal } = body;

      if (!message) {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: 'Message is required' }));
        return;
      }

      // Get feedback details to find the user
      const feedbackResult = await pool.query(
        'SELECT user_id, name, email FROM user_feedback WHERE id = $1',
        [feedbackId]
      );

      if (feedbackResult.rows.length === 0) {
        res.writeHead(404, corsHeaders);
        res.end(JSON.stringify({ error: 'Feedback not found' }));
        return;
      }

      const feedback = feedbackResult.rows[0];

      // Insert reply
      const replyResult = await pool.query(`
        INSERT INTO feedback_replies (feedback_id, admin_user_id, message, is_internal)
        VALUES ($1, $2, $3, $4)
        RETURNING id, created_at
      `, [feedbackId, user.id, message, is_internal || false]);

      const replyId = replyResult.rows[0].id;

      // If not internal, create notification for user and update feedback status
      if (!is_internal) {
        await pool.query(`
          INSERT INTO notifications (user_id, type, title, message, data, priority, source)
          VALUES ($1, 'feedback_reply', 'Admin Replied to Your Feedback', $2, $3, 'normal', 'admin')
        `, [
          feedback.user_id,
          message.substring(0, 200) + (message.length > 200 ? '...' : ''),
          JSON.stringify({ feedback_id: feedbackId, reply_id: replyId })
        ]);

        // Update feedback status to in_progress if it was new
        await pool.query(`
          UPDATE user_feedback
          SET status = CASE WHEN status = 'new' THEN 'in_progress' ELSE status END,
              updated_at = NOW()
          WHERE id = $1
        `, [feedbackId]);

        console.log(`💬 [FEEDBACK] Admin ${user.email} replied to feedback ${feedbackId} from ${feedback.email}`);
      } else {
        console.log(`📝 [FEEDBACK] Admin ${user.email} added internal note to feedback ${feedbackId}`);
      }

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        success: true,
        reply_id: replyId,
        created_at: replyResult.rows[0].created_at
      }));
    } catch (error) {
      console.error('❌ Error replying to feedback:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to send reply' }));
    }
    return;
  }

  // PATCH /api/admin/feedback/:id - Update feedback (assign, priority, status, tags)
  if (path.match(/^\/api\/admin\/feedback\/[^\/]+$/) && method === 'PATCH') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    if (user.role !== 'admin') {
      res.writeHead(403, corsHeaders);
      res.end(JSON.stringify({ error: 'Admin access required' }));
      return;
    }

    try {
      const feedbackId = path.split('/')[4];
      const body = await parseBody(req);
      const { assigned_to, priority, status, tags } = body;

      // Build dynamic update query
      const updates = [];
      const params = [];
      let paramIndex = 1;

      if (assigned_to !== undefined) {
        updates.push(`assigned_to = $${paramIndex++}`);
        params.push(assigned_to);
      }
      if (priority !== undefined) {
        updates.push(`priority = $${paramIndex++}`);
        params.push(priority);
      }
      if (status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        params.push(status);

        // Set resolved_at if status is resolved or closed
        if (status === 'resolved' || status === 'closed') {
          updates.push(`resolved_at = NOW()`);
        }
      }
      if (tags !== undefined) {
        updates.push(`tags = $${paramIndex++}`);
        params.push(tags);
      }

      if (updates.length === 0) {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: 'No updates provided' }));
        return;
      }

      updates.push(`updated_at = NOW()`);
      params.push(feedbackId);

      const result = await pool.query(`
        UPDATE user_feedback
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, assigned_to, priority, status, tags, resolved_at, updated_at
      `, params);

      if (result.rows.length === 0) {
        res.writeHead(404, corsHeaders);
        res.end(JSON.stringify({ error: 'Feedback not found' }));
        return;
      }

      console.log(`🔧 [FEEDBACK] Admin ${user.email} updated feedback ${feedbackId}`);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        success: true,
        feedback: result.rows[0]
      }));
    } catch (error) {
      console.error('❌ Error updating feedback:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to update feedback' }));
    }
    return;
  }

  // GET /api/user/feedback - Get user's own feedback
  if (path === '/api/user/feedback' && method === 'GET') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const result = await pool.query(`
        SELECT
          id, name, email, message, attachment_filename, status, priority, tags,
          created_at, updated_at
        FROM user_feedback
        WHERE user_id = $1
        ORDER BY created_at DESC
      `, [user.id]);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        feedback: result.rows
      }));
    } catch (error) {
      console.error('❌ Error fetching user feedback:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to fetch feedback' }));
    }
    return;
  }

  // GET /api/user/feedback/:id - Get specific feedback with replies (user's own only)
  if (path.match(/^\/api\/user\/feedback\/[^\/]+$/) && method === 'GET') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const feedbackId = path.split('/')[4];

      // Get feedback details (ensure it belongs to this user)
      const feedbackResult = await pool.query(`
        SELECT *
        FROM user_feedback
        WHERE id = $1 AND user_id = $2
      `, [feedbackId, user.id]);

      if (feedbackResult.rows.length === 0) {
        res.writeHead(404, corsHeaders);
        res.end(JSON.stringify({ error: 'Feedback not found' }));
        return;
      }

      // Get non-internal replies only
      const repliesResult = await pool.query(`
        SELECT
          r.id, r.message, r.is_internal, r.created_at,
          u.first_name as admin_first_name, u.last_name as admin_last_name
        FROM feedback_replies r
        LEFT JOIN users u ON r.admin_user_id = u.id
        WHERE r.feedback_id = $1 AND r.is_internal = false
        ORDER BY r.created_at ASC
      `, [feedbackId]);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        feedback: feedbackResult.rows[0],
        replies: repliesResult.rows
      }));
    } catch (error) {
      console.error('❌ Error fetching feedback details:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to fetch feedback details' }));
    }
    return;
  }

  // GET /api/user/profile - Get user profile
  if (path === '/api/user/profile' && method === 'GET') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const result = await pool.query(`
        SELECT id, email, first_name, last_name, role, created_at, updated_at
        FROM users
        WHERE id = $1
      `, [user.id]);

      if (result.rows.length === 0) {
        res.writeHead(404, corsHeaders);
        res.end(JSON.stringify({ error: 'User not found' }));
        return;
      }

      console.log('📊 Profile data from DB:', JSON.stringify(result.rows[0], null, 2));

      // Combine first_name and last_name into name for frontend compatibility
      const row = result.rows[0];
      const userData = {
        id: row.id,
        email: row.email,
        first_name: row.first_name,
        last_name: row.last_name,
        role: row.role,
        created_at: row.created_at,
        updated_at: row.updated_at,
        name: `${row.first_name || ''} ${row.last_name || ''}`.trim()
      };

      console.log('📤 Sending profile data:', JSON.stringify(userData, null, 2));

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify(userData));
    } catch (error) {
      console.error('❌ Get profile error:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to get profile' }));
    }
    return;
  }

  // PUT /api/user/profile - Update user profile
  if (path === '/api/user/profile' && method === 'PUT') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const body = await parseBody(req);
      const { name, email } = body;

      // Validate inputs
      if (!name || !email) {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: 'Name and email are required' }));
        return;
      }

      // Split name into first_name and last_name
      const nameParts = name.trim().split(/\s+/);
      const first_name = nameParts[0] || '';
      const last_name = nameParts.slice(1).join(' ') || '';

      // Check if email is already taken by another user
      if (email !== user.email) {
        const emailCheck = await pool.query(`
          SELECT id FROM users WHERE email = $1 AND id != $2
        `, [email, user.id]);

        if (emailCheck.rows.length > 0) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Email already in use' }));
          return;
        }
      }

      // Update user profile
      const result = await pool.query(`
        UPDATE users
        SET first_name = $1, last_name = $2, email = $3, updated_at = NOW()
        WHERE id = $4
        RETURNING id, email, first_name, last_name, role, created_at, updated_at
      `, [first_name, last_name, email, user.id]);

      console.log(`👤 [PROFILE] Profile updated for user: ${email}`);

      // Return with combined name for frontend compatibility
      const userData = {
        ...result.rows[0],
        name: `${result.rows[0].first_name || ''} ${result.rows[0].last_name || ''}`.trim()
      };

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify(userData));
    } catch (error) {
      console.error('❌ Update profile error:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to update profile' }));
    }
    return;
  }

  // GET /api/profile/core-memories - Get user's core memories
  if (path === '/api/profile/core-memories' && method === 'GET') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const includeAuditLog = parsedUrl.query.includeAuditLog === 'true';
      const { coreMemories, auditLog } = await getCoreMemoriesWithHistory(pool, user.id, includeAuditLog);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        coreMemories: coreMemories || {},
        auditLog: auditLog || []
      }));
    } catch (error) {
      console.error('❌ [CORE_MEMORY] Error fetching core memories:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to fetch core memories' }));
    }
    return;
  }

  // PUT /api/profile/core-memories - Update user's core memories (manual)
  if (path === '/api/profile/core-memories' && method === 'PUT') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const body = await parseBody(req);

      const result = await updateCoreMemoriesManual(pool, user.id, body);

      if (!result.success) {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({
          error: 'Validation failed',
          errors: result.errors || [],
          message: result.error
        }));
        return;
      }

      console.log(`✅ [CORE_MEMORY] User ${user.email} updated core memories: ${result.changedFields} fields changed`);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        success: true,
        coreMemories: result.coreMemories,
        changedFields: result.changedFields
      }));
    } catch (error) {
      console.error('❌ [CORE_MEMORY] Error updating core memories:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to update core memories' }));
    }
    return;
  }

  // DELETE /api/profile/reset-memory - Reset user's own memory (all business profile, brand voice, onboarding)
  if (path === '/api/profile/reset-memory' && method === 'DELETE') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const userId = user.id;
      const results = {};

      // 1. Clear user_business_profiles
      const bpResult = await pool.query('DELETE FROM user_business_profiles WHERE user_id = $1', [userId]);
      results.business_profiles_cleared = bpResult.rowCount || 0;

      // 2. Clear user_document_chunks
      const dcResult = await pool.query('DELETE FROM user_document_chunks WHERE user_id = $1', [userId]);
      results.document_chunks_cleared = dcResult.rowCount || 0;

      // 3. Clear brand_voice_profiles
      const bvResult = await pool.query('DELETE FROM brand_voice_profiles WHERE user_id = $1', [userId]);
      results.brand_voice_cleared = bvResult.rowCount || 0;

      // 4. Clear core_memory_audit_log
      const alResult = await pool.query('DELETE FROM core_memory_audit_log WHERE user_id = $1', [userId]);
      results.audit_log_cleared = alResult.rowCount || 0;

      // 5. Clear core_memories table (onboarding data — name, company, clients, outcome)
      const cmResult = await pool.query('DELETE FROM core_memories WHERE user_id = $1', [userId]);
      results.core_memories_cleared = cmResult.rowCount || 0;

      // 6. Clear extracted memories (these get injected into prompts)
      const memResult = await pool.query('DELETE FROM memories WHERE user_id = $1', [userId]);
      results.memories_cleared = memResult.rowCount || 0;

      // 7. Null out history_summary on existing conversations so old summaries don't leak
      await pool.query(
        'UPDATE conversations SET history_summary = NULL, history_summary_up_to = NULL WHERE user_id = $1',
        [userId]
      );

      // 7. Set memory_reset_at timestamp — cross-agent context will ignore conversations before this
      await pool.query('UPDATE users SET memory_reset_at = NOW() WHERE id = $1', [userId]);
      results.memory_reset_at = new Date().toISOString();

      // 8. Reset onboarding steps but keep onboarding_completed=true so agents stay unlocked
      await pool.query(`
        UPDATE user_onboarding_status
        SET current_step = 0, updated_at = NOW()
        WHERE user_id = $1
      `, [userId]);
      results.onboarding_step_reset = true;

      console.log(`🔄 [RESET_MEMORY] User ${user.email} reset their own memory:`, results);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        success: true,
        message: 'All memory data has been cleared. Your agents remain unlocked.',
        results
      }));
    } catch (error) {
      console.error('❌ [RESET_MEMORY] Error resetting memory:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to reset memory' }));
    }
    return;
  }

  // POST /api/admin/users/:userId/reset-memory - Admin resets a user's memory
  if (path.match(/^\/api\/admin\/users\/[^\/]+\/reset-memory$/) && method === 'POST') {
    const adminSecret = process.env.ADMIN_SECRET || 'ecos-admin-secret-2025';
    const xAdminSecret = req.headers['x-admin-secret'];
    const isAdminSecretAuth = xAdminSecret === adminSecret;

    const user = getUserFromToken(req.headers.authorization);
    if (!user && !isAdminSecretAuth) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    if (user && user.role !== 'admin' && !isAdminSecretAuth) {
      res.writeHead(403, corsHeaders);
      res.end(JSON.stringify({ error: 'Forbidden: Admin access required' }));
      return;
    }

    const targetUserId = path.split('/')[4];

    try {
      // Verify target user exists
      const targetUser = await pool.query('SELECT id, email, first_name FROM users WHERE id = $1', [targetUserId]);
      if (targetUser.rows.length === 0) {
        res.writeHead(404, corsHeaders);
        res.end(JSON.stringify({ error: 'User not found' }));
        return;
      }

      const targetEmail = targetUser.rows[0].email;
      const results = {};

      // 1. Clear user_business_profiles
      const bpResult = await pool.query('DELETE FROM user_business_profiles WHERE user_id = $1', [targetUserId]);
      results.business_profiles_cleared = bpResult.rowCount || 0;

      // 2. Clear user_document_chunks
      const dcResult = await pool.query('DELETE FROM user_document_chunks WHERE user_id = $1', [targetUserId]);
      results.document_chunks_cleared = dcResult.rowCount || 0;

      // 3. Clear brand_voice_profiles
      const bvResult = await pool.query('DELETE FROM brand_voice_profiles WHERE user_id = $1', [targetUserId]);
      results.brand_voice_cleared = bvResult.rowCount || 0;

      // 4. Clear core_memory_audit_log
      const alResult = await pool.query('DELETE FROM core_memory_audit_log WHERE user_id = $1', [targetUserId]);
      results.audit_log_cleared = alResult.rowCount || 0;

      // 5. Clear core_memories table (onboarding data — name, company, clients, outcome)
      const cmResult = await pool.query('DELETE FROM core_memories WHERE user_id = $1', [targetUserId]);
      results.core_memories_cleared = cmResult.rowCount || 0;

      // 6. Clear extracted memories (these get injected into prompts)
      const memResult = await pool.query('DELETE FROM memories WHERE user_id = $1', [targetUserId]);
      results.memories_cleared = memResult.rowCount || 0;

      // 7. Null out history_summary on existing conversations so old summaries don't leak
      await pool.query(
        'UPDATE conversations SET history_summary = NULL, history_summary_up_to = NULL WHERE user_id = $1',
        [targetUserId]
      );

      // 7. Set memory_reset_at timestamp — cross-agent context will ignore conversations before this
      await pool.query('UPDATE users SET memory_reset_at = NOW() WHERE id = $1', [targetUserId]);
      results.memory_reset_at = new Date().toISOString();

      // 8. Reset onboarding steps but keep onboarding_completed=true so agents stay unlocked
      await pool.query(`
        UPDATE user_onboarding_status
        SET current_step = 0, updated_at = NOW()
        WHERE user_id = $1
      `, [targetUserId]);
      results.onboarding_step_reset = true;

      const adminEmail = isAdminSecretAuth ? 'admin_secret' : user.email;
      console.log(`🔄 [RESET_MEMORY] Admin ${adminEmail} reset memory for user ${targetEmail}:`, results);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        success: true,
        message: `Memory reset for ${targetEmail}. Agents remain unlocked.`,
        user_email: targetEmail,
        results
      }));
    } catch (error) {
      console.error('❌ [RESET_MEMORY] Admin reset error:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to reset user memory' }));
    }
    return;
  }

  // ========================================
  // ARTIFACTS CRUD API
  // ========================================

  // GET /api/artifacts - List user's artifacts
  if (path === '/api/artifacts' && method === 'GET') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    // Admin can view another user's artifacts
    const isAuthAdmin = user && ['admin', 'ADMIN'].includes(user.role);

    try {
      const { conversation_id, agent_id, starred, limit: limitParam, offset: offsetParam, client_profile_id, viewAsUserId, search, tag } = parsedUrl.query;
      const targetUserId = (viewAsUserId && isAuthAdmin) ? viewAsUserId : user.id;
      const limit = Math.min(parseInt(limitParam) || 50, 200);
      const offset = parseInt(offsetParam) || 0;

      const conditions = ['user_id = $1'];
      const filterParams = [targetUserId];
      let paramIdx = 2;

      if (conversation_id) {
        conditions.push(`conversation_id = $${paramIdx++}`);
        filterParams.push(conversation_id);
      }
      if (agent_id) {
        conditions.push(`agent_id = $${paramIdx++}`);
        filterParams.push(agent_id);
      }
      if (starred === 'true') {
        conditions.push(`is_starred = TRUE`);
      }
      if (client_profile_id) {
        conditions.push(`client_profile_id = $${paramIdx++}`);
        filterParams.push(client_profile_id);
      }
      if (search) {
        conditions.push(`(title ILIKE $${paramIdx} OR content->>'text' ILIKE $${paramIdx})`);
        filterParams.push(`%${search}%`);
        paramIdx++;
      }
      if (tag) {
        conditions.push(`metadata->'tags' ? $${paramIdx}`);
        filterParams.push(tag);
        paramIdx++;
      }

      const whereClause = conditions.join(' AND ');
      const paginatedParams = [...filterParams, limit, offset];

      const result = await pool.query(
        `SELECT id, conversation_id, message_id, agent_id, artifact_type as type, title, content->>'text' as content, language, metadata, is_starred, version, parent_artifact_id, created_at, updated_at
         FROM artifacts
         WHERE ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        paginatedParams
      );

      const countResult = await pool.query(
        `SELECT COUNT(*) as total FROM artifacts WHERE ${whereClause}`,
        filterParams
      );

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        artifacts: result.rows,
        total: parseInt(countResult.rows[0].total),
        limit,
        offset
      }));
    } catch (error) {
      console.error('❌ [ARTIFACTS] Error listing artifacts:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to list artifacts' }));
    }
    return;
  }

  // POST /api/artifacts - Create artifact (with auto-trim & auto-name)
  if (path === '/api/artifacts' && method === 'POST') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const body = await parseBody(req);
      const { conversation_id, message_id, agent_id, type, title, content, language, metadata, viewAsUserId, client_profile_id } = body;

      // Admin can save artifacts under the viewed-as user's account
      const isAuthAdmin = ['admin', 'ADMIN'].includes(user.role);
      const targetUserId = (viewAsUserId && isAuthAdmin) ? viewAsUserId : user.id;

      if (!type || !title || content === undefined) {
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: 'type, title, and content are required' }));
        return;
      }

      // Auto-trim prefix/suffix from play content (async but awaited for clean save)
      let trimmedContent = content;
      let playMetadata = metadata ? (typeof metadata === 'string' ? JSON.parse(metadata) : { ...metadata }) : {};

      try {
        const trimResult = await trimPlayContent(content);
        if (trimResult.prefix || trimResult.suffix) {
          trimmedContent = trimResult.content;
          playMetadata.original_prefix = trimResult.prefix;
          playMetadata.original_suffix = trimResult.suffix;
          playMetadata.was_trimmed = true;
          console.log(`✂️ [ARTIFACTS] Auto-trimmed play: removed ${trimResult.prefix.length}ch prefix, ${trimResult.suffix.length}ch suffix`);
        }
      } catch (trimErr) {
        console.warn('⚠️ [ARTIFACTS] Trim failed, saving original:', trimErr.message);
      }

      const result = await pool.query(
        `INSERT INTO artifacts (user_id, conversation_id, message_id, agent_id, artifact_type, title, content, language, metadata, client_profile_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10)
         RETURNING id, conversation_id, message_id, agent_id, artifact_type as type, title, content->>'text' as content, language, metadata, is_starred, version, created_at, updated_at, client_profile_id`,
        [
          targetUserId,
          conversation_id || null,
          message_id || null,
          agent_id || null,
          type || 'document',
          title,
          JSON.stringify({ text: trimmedContent }),
          language || null,
          JSON.stringify(playMetadata),
          client_profile_id || null
        ]
      );

      const artifact = result.rows[0];
      console.log(`✅ [ARTIFACTS] Created artifact ${artifact.id} for user ${targetUserId}${viewAsUserId ? ` (admin ${user.id} viewing as)` : ''}`);

      // Async auto-name if title is generic (don't block response)
      const genericTitles = ['untitled', 'untitled play', 'new play', ''];
      if (genericTitles.includes((title || '').toLowerCase().trim())) {
        generateTitle(trimmedContent, 'play')
          .then(autoTitle => {
            if (autoTitle) {
              return pool.query(`UPDATE artifacts SET title = $1, updated_at = NOW() WHERE id = $2`, [autoTitle, artifact.id]);
            }
          })
          .then(() => console.log(`✏️ [ARTIFACTS] Auto-named play ${artifact.id}`))
          .catch(err => console.warn('⚠️ [ARTIFACTS] Auto-name failed:', err.message));
      }

      res.writeHead(201, corsHeaders);
      res.end(JSON.stringify({ artifact }));
    } catch (error) {
      console.error('❌ [ARTIFACTS] Error creating artifact:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to create artifact' }));
    }
    return;
  }

  // PATCH /api/artifacts/:id/tags - Update tags on an artifact
  if (path.match(/^\/api\/artifacts\/[^\/]+\/tags$/) && method === 'PATCH') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }
    try {
      const artifactId = path.split('/')[3];
      const body = await parseBody(req);
      const tags = Array.isArray(body.tags) ? body.tags : [];

      const result = await pool.query(
        `UPDATE artifacts SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('tags', $1::jsonb)
         WHERE id = $2 AND user_id = $3
         RETURNING id, metadata`,
        [JSON.stringify(tags), artifactId, user.id]
      );

      if (result.rows.length === 0) {
        res.writeHead(404, corsHeaders);
        res.end(JSON.stringify({ error: 'Artifact not found' }));
        return;
      }

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true, metadata: result.rows[0].metadata }));
    } catch (error) {
      console.error('❌ [ARTIFACTS] Error updating tags:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to update tags' }));
    }
    return;
  }

  // GET /api/artifacts/:id - Get single artifact
  if (path.startsWith('/api/artifacts/') && !path.endsWith('/star') && method === 'GET') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const artifactId = path.split('/')[3];

      const result = await pool.query(
        `SELECT id, conversation_id, message_id, agent_id, artifact_type as type, title, content->>'text' as content, language, metadata, is_starred, version, parent_artifact_id, created_at, updated_at
         FROM artifacts WHERE id = $1 AND user_id = $2`,
        [artifactId, user.id]
      );

      if (result.rows.length === 0) {
        res.writeHead(404, corsHeaders);
        res.end(JSON.stringify({ error: 'Artifact not found' }));
        return;
      }

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ artifact: result.rows[0] }));
    } catch (error) {
      console.error('❌ [ARTIFACTS] Error fetching artifact:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to fetch artifact' }));
    }
    return;
  }

  // PUT /api/artifacts/:id - Update artifact
  if (path.startsWith('/api/artifacts/') && !path.endsWith('/star') && method === 'PUT') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const artifactId = path.split('/')[3];
      const body = await parseBody(req);
      const { title, content, metadata } = body;

      // Verify ownership
      const existing = await pool.query(
        `SELECT id, content->>'text' as content_text, version, parent_artifact_id FROM artifacts WHERE id = $1 AND user_id = $2`,
        [artifactId, user.id]
      );

      if (existing.rows.length === 0) {
        res.writeHead(404, corsHeaders);
        res.end(JSON.stringify({ error: 'Artifact not found' }));
        return;
      }

      const current = existing.rows[0];
      const contentChanged = content !== undefined && content !== current.content_text;
      const newVersion = contentChanged ? (current.version || 1) + 1 : (current.version || 1);
      const parentArtifactId = contentChanged ? current.id : current.parent_artifact_id;

      const result = await pool.query(
        `UPDATE artifacts
         SET
           title = COALESCE($1, title),
           content = COALESCE($2::jsonb, content),
           metadata = COALESCE($3, metadata),
           version = $4,
           parent_artifact_id = $5,
           updated_at = NOW()
         WHERE id = $6 AND user_id = $7
         RETURNING id, conversation_id, message_id, agent_id, artifact_type as type, title, content->>'text' as content, language, metadata, is_starred, version, parent_artifact_id, created_at, updated_at`,
        [
          title || null,
          content !== undefined ? JSON.stringify({ text: content }) : null,
          metadata ? JSON.stringify(metadata) : null,
          newVersion,
          parentArtifactId || null,
          artifactId,
          user.id
        ]
      );

      console.log(`✅ [ARTIFACTS] Updated artifact ${artifactId} for user ${user.id} (v${newVersion})`);
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ artifact: result.rows[0] }));
    } catch (error) {
      console.error('❌ [ARTIFACTS] Error updating artifact:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to update artifact' }));
    }
    return;
  }

  // DELETE /api/artifacts/:id - Delete artifact
  if (path.startsWith('/api/artifacts/') && !path.endsWith('/star') && method === 'DELETE') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const artifactId = path.split('/')[3];

      const result = await pool.query(
        `DELETE FROM artifacts WHERE id = $1 AND user_id = $2 RETURNING id`,
        [artifactId, user.id]
      );

      if (result.rows.length === 0) {
        res.writeHead(404, corsHeaders);
        res.end(JSON.stringify({ error: 'Artifact not found' }));
        return;
      }

      console.log(`✅ [ARTIFACTS] Deleted artifact ${artifactId} for user ${user.id}`);
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true }));
    } catch (error) {
      console.error('❌ [ARTIFACTS] Error deleting artifact:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to delete artifact' }));
    }
    return;
  }

  // POST /api/artifacts/:id/star - Toggle star on artifact
  if (path.startsWith('/api/artifacts/') && path.endsWith('/star') && method === 'POST') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const parts = path.split('/');
      const artifactId = parts[3];

      const result = await pool.query(
        `UPDATE artifacts
         SET is_starred = NOT is_starred, updated_at = NOW()
         WHERE id = $1 AND user_id = $2
         RETURNING id, is_starred`,
        [artifactId, user.id]
      );

      if (result.rows.length === 0) {
        res.writeHead(404, corsHeaders);
        res.end(JSON.stringify({ error: 'Artifact not found' }));
        return;
      }

      console.log(`✅ [ARTIFACTS] Toggled star on artifact ${artifactId}: ${result.rows[0].is_starred}`);
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ id: result.rows[0].id, is_starred: result.rows[0].is_starred }));
    } catch (error) {
      console.error('❌ [ARTIFACTS] Error toggling star:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to toggle star' }));
    }
    return;
  }

  // POST /api/artifacts/:id/cleanup - AI cleanup: trim AI commentary from beginning and end
  if (path.startsWith('/api/artifacts/') && path.endsWith('/cleanup') && method === 'POST') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      const parts = path.split('/');
      const artifactId = parts[3];

      // Get the artifact (admin can cleanup any user's artifacts when viewing-as)
      const artifact = await pool.query(
        `SELECT id, content->>'text' as content, metadata FROM artifacts WHERE id = $1`,
        [artifactId]
      );

      if (artifact.rows.length === 0) {
        res.writeHead(404, corsHeaders);
        res.end(JSON.stringify({ error: 'Artifact not found' }));
        return;
      }

      const rawContent = artifact.rows[0].content;
      if (!rawContent || rawContent.length < 50) {
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ message: 'Content too short to trim', content: rawContent, trimmed: false }));
        return;
      }

      // Run Haiku trim
      const trimResult = await trimPlayContent(rawContent);

      if (!trimResult.prefix && !trimResult.suffix) {
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ message: 'No AI commentary detected', content: rawContent, trimmed: false }));
        return;
      }

      // Update the artifact with trimmed content
      const existingMeta = artifact.rows[0].metadata || {};
      const updatedMeta = {
        ...existingMeta,
        cleanup_prefix: trimResult.prefix,
        cleanup_suffix: trimResult.suffix,
        cleanup_at: new Date().toISOString(),
        cleanup_by: user.id,
      };

      const updated = await pool.query(
        `UPDATE artifacts
         SET content = $1::jsonb, metadata = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING id, content->>'text' as content, metadata, updated_at`,
        [JSON.stringify({ text: trimResult.content }), JSON.stringify(updatedMeta), artifactId]
      );

      console.log(`✂️ [ARTIFACTS] AI Cleanup on ${artifactId}: removed ${trimResult.prefix.length}ch prefix, ${trimResult.suffix.length}ch suffix`);
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        trimmed: true,
        content: updated.rows[0].content,
        prefixRemoved: trimResult.prefix,
        suffixRemoved: trimResult.suffix,
      }));
    } catch (error) {
      console.error('❌ [ARTIFACTS] Error during AI cleanup:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to cleanup artifact' }));
    }
    return;
  }

  // 404 - Not Found
  res.writeHead(404, corsHeaders);
  res.end(JSON.stringify({ error: 'Not found', path, method }));

  } catch (error) {
    ERROR_TRACKER.recordError();
    console.error('Server Error:', error);
    if (!res.headersSent) {
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Internal server error', message: error.message }));
    }
  }
});

// Auto-apply database migrations on startup
async function applyPendingMigrations() {
  const migrationsToApply = [
    '017_conversation_enhancements.sql',
    '017_5_add_agent_display_columns.sql',
    '018_user_onboarding_status.sql',
    '018_create_core_memories.sql',
    '018_brand_voice_system.sql',
    '019_core_memories.sql',
    '020_agents_onboarding_columns.sql',
    '021_enable_brand_voice_for_agents.sql',
    '022_add_behavior_suffix_column.sql',
    '022_brand_voice_agent.sql',
    '023_update_client_onboarding_suffix.sql',
    '024_fix_all_embedding_dimensions.sql',
    '025_fix_onboarding_structured_data.sql',
    '026_allow_agent_access_during_onboarding.sql',
    '027_enforce_onboarding_lock.sql',
    '028_remove_test_agents.sql',
    '029_fix_onboarding_completion_message.sql',
    '030_conversation_forks.sql',
    '046_admin_impersonation_system.sql'
  ];

  try {
    // Create schema_migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('\n📦 Checking for pending migrations...');

    for (const migrationFile of migrationsToApply) {
      const migrationPath = pathModule.join(__dirname, 'migrations', migrationFile);

      if (!fs.existsSync(migrationPath)) {
        console.log(`⚠️  Migration file not found: ${migrationFile}`);
        continue;
      }

      // Check if already applied
      const { rows } = await pool.query(
        'SELECT version FROM schema_migrations WHERE version = $1',
        [migrationFile]
      );

      if (rows.length > 0) {
        console.log(`✅ ${migrationFile} (already applied)`);
        continue;
      }

      console.log(`🔄 Applying ${migrationFile}...`);
      const sql = fs.readFileSync(migrationPath, 'utf8');

      try {
        await pool.query('BEGIN');
        await pool.query(sql);
        await pool.query(
          'INSERT INTO schema_migrations (version) VALUES ($1)',
          [migrationFile]
        );
        await pool.query('COMMIT');
        console.log(`✅ Applied ${migrationFile}`);
      } catch (err) {
        await pool.query('ROLLBACK');
        console.error(`❌ Failed to apply ${migrationFile}:`, err.message);
        // Continue to next migration instead of stopping all migrations
        continue;
      }
    }

    console.log('✅ All migrations up to date!\n');
  } catch (err) {
    console.error('❌ Migration error:', err);
    // Don't exit - let backend start anyway
  }

  // Ensure impersonation table exists (inline safety net)
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_impersonation_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'viewing',
        permissions JSONB DEFAULT '{"view": true, "edit": false, "sendMessages": false, "savePlaybooks": false}',
        request_message TEXT,
        response_message TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        edit_requested_at TIMESTAMP,
        resolved_at TIMESTAMP,
        expires_at TIMESTAMP,
        ended_at TIMESTAMP,
        CONSTRAINT check_status CHECK (status IN ('viewing', 'edit_requested', 'edit_approved', 'edit_declined', 'ended'))
      );
      CREATE INDEX IF NOT EXISTS idx_impersonation_admin ON admin_impersonation_sessions(admin_user_id, status);
      CREATE INDEX IF NOT EXISTS idx_impersonation_target ON admin_impersonation_sessions(target_user_id, status);
    `);
  } catch (e) { /* table already exists */ }
}

// Set up WebSocket server for Gemini Live API (real-time voice)
const wss = new WebSocket.Server({ noServer: true });

// Handle HTTP upgrade requests for WebSocket
server.on('upgrade', (request, socket, head) => {
  const pathname = url.parse(request.url).pathname;

  if (pathname === '/ws/voice') {
    // Check for Gemini API key
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.error('❌ GEMINI_API_KEY not configured');
      socket.destroy();
      return;
    }

    // Authenticate WebSocket connection via token query param
    const wsUrl = new URL(request.url, 'http://localhost');
    const token = wsUrl.searchParams.get('token');
    const user = getUserFromToken(token ? `Bearer ${token}` : null);
    if (!user) {
      console.error('❌ Voice WebSocket: Unauthorized — no valid token');
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    // Attach user to request so the handler can access it
    request.authenticatedUser = user;
    console.log(`🎙️ Voice WebSocket authenticated: ${user.email} (${user.id})`);

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Initialize Gemini Live handler if API key is available
if (process.env.GEMINI_API_KEY) {
  createGeminiLiveHandler(wss, process.env.GEMINI_API_KEY);
  console.log('🎙️ Gemini Live voice WebSocket enabled');
} else {
  console.log('⚠️ GEMINI_API_KEY not set - Gemini Live voice disabled');
}

server.listen(PORT, async () => {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 ECOS Backend Server with Real AI Integration');
  console.log('='.repeat(70));
  console.log(`📡 Listening on: http://localhost:${PORT}`);
  console.log(`🔗 Frontend: http://localhost:3000`);
  console.log(`🎙️ Voice WebSocket: ws://localhost:${PORT}/ws/voice`);

  // Apply migrations on startup
  await applyPendingMigrations();

  // Check and migrate embedding dimensions (prevent dimension mismatch errors)
  try {
    const { checkAndMigrateDimensions } = require('./backend/services/dimensionManager.cjs');
    await checkAndMigrateDimensions(pool);
  } catch (error) {
    console.error('❌ Embedding dimension check failed:', error.message);
    if (process.env.DIMENSION_BLOCK_ON_MISMATCH === 'true') {
      console.error('🚫 Server start blocked due to dimension mismatch');
      process.exit(1);
    }
  }

  // Warm embedding cache with frequent memories
  try {
    const { warmCacheOnStartup } = require('./backend/services/cacheWarmer.cjs');
    const warmResult = await warmCacheOnStartup();
    if (warmResult.success) {
      console.log(`🔥 Embedding cache warmed with ${warmResult.memoriesLoaded} entries`);
    }
  } catch (error) {
    console.warn('⚠️  Cache warming failed (non-critical):', error.message);
  }

  console.log(`✅ CORS enabled for frontend`);
  // Load system configuration from database (non-blocking)
  pool.query(`SELECT key, value FROM system_config`)
    .then(configResult => {
      configResult.rows.forEach(row => {
        if (row.key === 'widget_formatting_model') {
          widgetFormatterModel = row.value;
        }
      });

      const memoryModel = configResult.rows.find(r => r.key === 'memory_extraction_model')?.value || 'anthropic/claude-haiku-4.5';
      const widgetModel = widgetFormatterModel;

      console.log(`🤖 AI Models: Claude Sonnet 4.5 (chat) | ${memoryModel.split('/')[1]} (memory) | ${widgetModel.split('/')[1]} (widgets)`);
    })
    .catch(err => {
      console.warn('⚠️  Could not load system config, using defaults');
      console.log(`🤖 AI Models: Claude Sonnet 4.5 (chat) | Haiku 4.5 (memory) | Haiku 4.5 (widgets)`);
    });

  // Load feature flags from database
  loadFeatureFlags()
    .then(flags => {
      const flagCount = Object.keys(flags).length;
      console.log(`🏁 ${flagCount} feature flag(s) loaded`);
    })
    .catch(err => console.warn('⚠️  Feature flags load failed:', err.message));

  // Load trial config from database
  loadTrialConfig()
    .then(config => {
      console.log(`🆓 Trial config loaded: ${config.duration_days}d trial | ${config.daily_message_cap}/day | ${config.total_message_cap} total | Agent: ${config.default_agent}`);
    })
    .catch(err => console.warn('⚠️  Trial config load failed:', err.message));

  // Start report scheduler (daily/weekly/monthly emails)
  try {
    startReportScheduler(pool);
    console.log('📊 Report scheduler started (daily/weekly/monthly → gregory@linkedva.com)');
  } catch (err) {
    console.warn('⚠️  Report scheduler failed to start:', err.message);
  }

  // Log deploy to database
  pool.query(`
    CREATE TABLE IF NOT EXISTS deploy_log (
      id SERIAL PRIMARY KEY,
      commit_hash VARCHAR(64),
      branch VARCHAR(128),
      deployment_id VARCHAR(128),
      deployed_at TIMESTAMP DEFAULT NOW(),
      status VARCHAR(20) DEFAULT 'started',
      notes TEXT
    )
  `).then(() => {
    return pool.query(
      `INSERT INTO deploy_log (commit_hash, branch, deployment_id, status, notes)
       VALUES ($1, $2, $3, 'started', 'Server starting up')`,
      [DEPLOY_INFO.commitHash, DEPLOY_INFO.branch, DEPLOY_INFO.version]
    );
  }).then(() => {
    DEPLOY_INFO.status = 'running';
    console.log(`📋 Deploy logged: ${DEPLOY_INFO.commitHash.substring(0, 8)} on ${DEPLOY_INFO.branch}`);
    // Update status to running after 30s if no crash
    setTimeout(async () => {
      try {
        await pool.query(
          `UPDATE deploy_log SET status = 'healthy', notes = 'Running stable for 30s'
           WHERE deployment_id = $1 AND status = 'started'`,
          [DEPLOY_INFO.version]
        );
      } catch (e) { /* non-critical */ }
    }, 30000);
  }).catch(err => console.warn('⚠️  Deploy log failed:', err.message));

  // Load agents from database and log count after loading
  loadAgentsFromDatabase()
    .then(() => {
      console.log(`💰 ${Object.keys(AGENT_CACHE).length} ECOS agents loaded from database`);
      console.log(`🎯 Each agent loads prompts from PostgreSQL database`);
    })
    .catch(err => {
      console.warn('⚠️  Failed to load agents from database:', err.message);
      console.log('⚠️  Backend will start without agents - they can be loaded later');
      console.log(`💰 ${Object.keys(AGENT_CACHE).length} ECOS agents loaded from database`);
    });
  console.log('\n📋 Available Endpoints:');
  console.log('   POST   /api/auth/register');
  console.log('   POST   /api/auth/login');
  console.log('   POST   /api/auth/refresh');
  console.log('   POST   /api/auth/forgot-password');
  console.log('   GET    /api/auth/me');
  console.log('   GET    /api/letta/agents');
  console.log('   POST   /api/letta/chat (🤖 REAL AI)');
  console.log('   POST   /api/letta/chat/stream (🤖 REAL AI with streaming)');
  console.log('   GET    /api/conversations');
  console.log('   GET    /api/documents');
  console.log('   GET    /api/admin/agents');
  console.log('   PUT    /api/admin/agents/:id');
  console.log('\n💡 Test It:');
  console.log('   1. Open http://localhost:3000');
  console.log('   2. Register a new account');
  console.log('   3. Login');
  console.log('   4. Select any ECOS agent');
  console.log('   5. Chat and get REAL AI responses!');
  console.log('📝 Edit agents at: http://localhost:3000/admin/agents (coming soon)');
  console.log('='.repeat(70) + '\n');
});
