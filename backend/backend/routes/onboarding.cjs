/**
 * Onboarding Routes Module
 * Handles user onboarding flow and core memories management
 * Phase 1.1 of Enhanced Onboarding & Brand Voice System
 */

const { extractCoreMemoriesStructured, saveCoreMemories } = require('../services/onboardingStructuredService.cjs');

/**
 * Helper function to parse JSON body from request
 */
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

/**
 * Helper function to convert string to PostgreSQL array
 * Handles comma-separated strings or already-array values
 */
function toPostgresArray(value) {
  if (!value) return null;
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    // Split by comma and trim whitespace
    return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
  }
  return null;
}

/**
 * Register onboarding-related routes
 * @param {Object} pool - PostgreSQL connection pool
 * @param {Function} authenticateToken - JWT authentication middleware
 * @param {Object} corsHeaders - CORS headers object
 */
function registerOnboardingRoutes(pool, authenticateToken, corsHeaders) {
  return {
    /**
     * GET /api/onboarding/status
     * Get onboarding status for current user
     */
    async getOnboardingStatus(req, res) {
      const authResult = await authenticateToken(req);
      if (!authResult.authenticated) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: authResult.error }));
        return;
      }

      try {
        const userId = authResult.user.id;

        // Support client-scoped onboarding
        const url = new URL(req.url, `http://${req.headers.host}`);
        const clientProfileId = url.searchParams.get('clientProfileId') || null;

        // Get or create onboarding status
        let statusResult = await pool.query(
          `SELECT onboarding_completed, onboarding_started_at, onboarding_completed_at,
                  current_step, total_steps, created_at
           FROM user_onboarding_status
           WHERE user_id = $1 ${clientProfileId ? 'AND client_profile_id = $2' : 'AND client_profile_id IS NULL'}`,
          clientProfileId ? [userId, clientProfileId] : [userId]
        );

        // If no record exists, create one
        if (statusResult.rows.length === 0) {
          statusResult = await pool.query(
            `INSERT INTO user_onboarding_status (user_id, client_profile_id, onboarding_started_at, current_step, total_steps)
             VALUES ($1, $2, NOW(), 1, 11)
             RETURNING onboarding_completed, onboarding_started_at, onboarding_completed_at,
                       current_step, total_steps, created_at`,
            [userId, clientProfileId]
          );
        }

        const status = statusResult.rows[0];

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          completed: status.onboarding_completed,
          currentStep: status.current_step,
          totalSteps: status.total_steps,
          startedAt: status.onboarding_started_at,
          completedAt: status.onboarding_completed_at
        }));
      } catch (error) {
        console.error('❌ Error fetching onboarding status:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to fetch onboarding status' }));
      }
    },

    /**
     * POST /api/onboarding/update
     * Update onboarding progress
     */
    async updateOnboardingProgress(req, res) {
      const authResult = await authenticateToken(req);
      if (!authResult.authenticated) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: authResult.error }));
        return;
      }

      try {
        const userId = authResult.user.id;
        const body = await parseBody(req);
        const { step, questionId, answer } = body;

        // Update current step
        await pool.query(
          `UPDATE user_onboarding_status
           SET current_step = $1, updated_at = NOW()
           WHERE user_id = $2`,
          [step, userId]
        );

        // Store the answer if provided (you can add a separate table for answers if needed)
        // For now, we'll just acknowledge the update

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          currentStep: step,
          message: 'Onboarding progress updated'
        }));
      } catch (error) {
        console.error('❌ Error updating onboarding progress:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to update onboarding progress' }));
      }
    },

    /**
     * POST /api/onboarding/complete
     * Complete onboarding and save core memories
     */
    async completeOnboarding(req, res) {
      const authResult = await authenticateToken(req);
      if (!authResult.authenticated) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: authResult.error }));
        return;
      }

      let transactionStarted = false;
      try {
        const userId = authResult.user.id;
        const body = await parseBody(req);
        const { coreMemories } = body;

        console.log(`🔵 [TRANSACTION START] User ${userId} completing onboarding`);
        console.log(`🔵 [DATA RECEIVED] coreMemories:`, JSON.stringify(coreMemories, null, 2));

        // Begin transaction
        await pool.query('BEGIN');
        transactionStarted = true;
        console.log(`🟢 [TRANSACTION] BEGIN executed successfully`);

        // Mark onboarding as complete
        console.log(`🔵 [SQL] Updating user_onboarding_status for user ${userId}`);
        const updateStatusResult = await pool.query(
          `UPDATE user_onboarding_status
           SET onboarding_completed = true,
               onboarding_completed_at = NOW(),
               current_step = total_steps,
               updated_at = NOW()
           WHERE user_id = $1
           RETURNING id, onboarding_completed`,
          [userId]
        );
        console.log(`🟢 [SQL] user_onboarding_status updated: ${updateStatusResult.rowCount} rows affected`);
        console.log(`🟢 [SQL] Returned data:`, updateStatusResult.rows[0]);

        // If no record was updated, INSERT a new one
        if (updateStatusResult.rowCount === 0) {
          console.log(`⚠️ [SQL] No user_onboarding_status record found, creating new one`);
          const insertStatusResult = await pool.query(
            `INSERT INTO user_onboarding_status
             (user_id, onboarding_completed, onboarding_completed_at, onboarding_started_at, current_step, total_steps)
             VALUES ($1, true, NOW(), NOW(), 11, 11)
             RETURNING id, onboarding_completed`,
            [userId]
          );
          console.log(`🟢 [SQL] user_onboarding_status inserted: ${insertStatusResult.rowCount} rows affected`);
          console.log(`🟢 [SQL] New status ID:`, insertStatusResult.rows[0]);
        }

        // Insert or update core memories
        if (coreMemories) {
          const {
            full_name, company_name, business_outcome,
            target_clients, client_problems, client_results,
            core_method, frameworks,
            service_description, pricing_model, delivery_timeline,
            revenue_range, growth_goals, biggest_challenges
          } = coreMemories;

          // Convert string fields to arrays for PostgreSQL array columns
          const client_problems_array = toPostgresArray(client_problems);
          const frameworks_array = toPostgresArray(frameworks);
          const biggest_challenges_array = toPostgresArray(biggest_challenges);

          console.log(`🔵 [ARRAY CONVERSION] client_problems: "${client_problems}" → [${client_problems_array?.join(', ')}]`);
          console.log(`🔵 [ARRAY CONVERSION] frameworks: "${frameworks}" → [${frameworks_array?.join(', ')}]`);
          console.log(`🔵 [ARRAY CONVERSION] biggest_challenges: "${biggest_challenges}" → [${biggest_challenges_array?.join(', ')}]`);

          // Check if core memories exist
          console.log(`🔵 [SQL] Checking if core_memories exists for user ${userId}`);
          const existingMemories = await pool.query(
            'SELECT id FROM core_memories WHERE user_id = $1',
            [userId]
          );
          console.log(`🟢 [SQL] Existing core_memories found: ${existingMemories.rows.length} records`);

          if (existingMemories.rows.length > 0) {
            // Update existing
            console.log(`🔵 [SQL] Updating existing core_memories for user ${userId}`);
            const updateMemoriesResult = await pool.query(
              `UPDATE core_memories
               SET full_name = $1, company_name = $2, business_outcome = $3,
                   target_clients = $4, client_problems = $5, client_results = $6,
                   core_method = $7, frameworks = $8,
                   service_description = $9, pricing_model = $10, delivery_timeline = $11,
                   revenue_range = $12, growth_goals = $13, biggest_challenges = $14,
                   updated_at = NOW()
               WHERE user_id = $15
               RETURNING id`,
              [full_name, company_name, business_outcome,
               target_clients, client_problems_array, client_results,
               core_method, frameworks_array,
               service_description, pricing_model, delivery_timeline,
               revenue_range, growth_goals, biggest_challenges_array,
               userId]
            );
            console.log(`🟢 [SQL] core_memories updated: ${updateMemoriesResult.rowCount} rows affected`);
            console.log(`🟢 [SQL] Returned memory ID:`, updateMemoriesResult.rows[0]);
          } else {
            // Insert new
            console.log(`🔵 [SQL] Inserting new core_memories for user ${userId}`);
            console.log(`🔵 [SQL] Insert values:`, {
              userId,
              full_name,
              company_name,
              business_outcome,
              target_clients,
              client_problems_array,
              client_results,
              core_method,
              frameworks_array,
              service_description,
              pricing_model,
              delivery_timeline,
              revenue_range,
              growth_goals,
              biggest_challenges_array
            });
            const insertMemoriesResult = await pool.query(
              `INSERT INTO core_memories
               (user_id, full_name, company_name, business_outcome,
                target_clients, client_problems, client_results,
                core_method, frameworks,
                service_description, pricing_model, delivery_timeline,
                revenue_range, growth_goals, biggest_challenges)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
               RETURNING id`,
              [userId, full_name, company_name, business_outcome,
               target_clients, client_problems_array, client_results,
               core_method, frameworks_array,
               service_description, pricing_model, delivery_timeline,
               revenue_range, growth_goals, biggest_challenges_array]
            );
            console.log(`🟢 [SQL] core_memories inserted: ${insertMemoriesResult.rowCount} rows affected`);
            console.log(`🟢 [SQL] New memory ID:`, insertMemoriesResult.rows[0]);
          }
        } else {
          console.log(`⚠️ [WARNING] No coreMemories data provided in request`);
        }

        // Verify data before commit
        console.log(`🔵 [VERIFY] Checking records exist before COMMIT`);
        const verifyStatus = await pool.query(
          'SELECT onboarding_completed FROM user_onboarding_status WHERE user_id = $1',
          [userId]
        );
        const verifyMemories = await pool.query(
          'SELECT id FROM core_memories WHERE user_id = $1',
          [userId]
        );
        console.log(`🟢 [VERIFY] user_onboarding_status: ${verifyStatus.rows.length} records, completed=${verifyStatus.rows[0]?.onboarding_completed}`);
        console.log(`🟢 [VERIFY] core_memories: ${verifyMemories.rows.length} records`);

        // Commit transaction
        console.log(`🔵 [TRANSACTION] Attempting COMMIT`);
        await pool.query('COMMIT');
        console.log(`🟢 [TRANSACTION] COMMIT successful`);

        console.log(`✅ User ${userId} completed onboarding`);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          message: 'Onboarding completed successfully',
          completed: true
        }));
      } catch (error) {
        // Rollback on error
        if (transactionStarted) {
          console.error(`🔴 [TRANSACTION] ROLLBACK initiated due to error`);
          await pool.query('ROLLBACK');
          console.error(`🔴 [TRANSACTION] ROLLBACK completed`);
        }
        console.error('❌ Error completing onboarding:', error);
        console.error('❌ Error name:', error.name);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error detail:', error.detail);
        console.error('❌ Error constraint:', error.constraint);
        console.error('❌ Error stack:', error.stack);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({
          error: 'Failed to complete onboarding',
          details: error.message,
          code: error.code
        }));
      }
    },

    /**
     * POST /api/onboarding/complete-structured
     * Complete onboarding using OpenRouter's structured outputs
     * Uses native JSON schema enforcement for guaranteed format
     * Body: { conversationSummary: string, conversationHistory?: Array }
     */
    async completeOnboardingStructured(req, res) {
      const authResult = await authenticateToken(req);
      if (!authResult.authenticated) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: authResult.error }));
        return;
      }

      try {
        const userId = authResult.user.id;
        const body = await parseBody(req);
        const { conversationSummary, conversationHistory = [] } = body;

        // Validation
        if (!conversationSummary || conversationSummary.trim().length === 0) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({
            error: 'Missing required field: conversationSummary'
          }));
          return;
        }

        console.log(`🎨 [STRUCTURED] Extracting core memories for user ${userId}`);

        // Extract using OpenRouter's structured outputs
        const extractionResult = await extractCoreMemoriesStructured(conversationSummary, conversationHistory);

        if (!extractionResult.success) {
          res.writeHead(500, corsHeaders);
          res.end(JSON.stringify({
            error: 'Failed to extract core memories',
            details: extractionResult.error
          }));
          return;
        }

        // Save to database
        const saveResult = await saveCoreMemories(pool, userId, extractionResult.data);

        if (!saveResult.success) {
          res.writeHead(500, corsHeaders);
          res.end(JSON.stringify({
            error: 'Failed to save core memories',
            details: saveResult.error
          }));
          return;
        }

        console.log(`✅ [STRUCTURED] Onboarding ${saveResult.action} for user ${userId}`);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          action: saveResult.action,
          completed: true,
          coreMemories: saveResult.coreMemories,
          extraction: extractionResult.data,
          usage: extractionResult.usage,
          message: `Onboarding completed successfully using structured outputs`
        }));

      } catch (error) {
        console.error('❌ [STRUCTURED] Error in completeOnboardingStructured:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({
          error: 'Failed to complete onboarding',
          details: error.message
        }));
      }
    },

    /**
     * GET /api/profile/core-memories
     * Get core memories (user profile)
     */
    async getCoreMemories(req, res) {
      const authResult = await authenticateToken(req);
      if (!authResult.authenticated) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: authResult.error }));
        return;
      }

      try {
        const userId = authResult.user.id;

        const result = await pool.query(
          `SELECT full_name as "fullName", company_name as "companyName",
                  business_outcome as "businessOutcome", target_clients as "targetClients",
                  client_problems as "clientProblems", client_results as "clientResults",
                  core_method as "coreMethod", frameworks,
                  service_description as "serviceDescription", pricing_model as "pricingModel",
                  delivery_timeline as "deliveryTimeline", revenue_range as "revenueRange",
                  growth_goals as "growthGoals", biggest_challenges as "biggestChallenges",
                  created_at as "createdAt", updated_at as "updatedAt"
           FROM core_memories
           WHERE user_id = $1`,
          [userId]
        );

        if (result.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'Core memories not found' }));
          return;
        }

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify(result.rows[0]));
      } catch (error) {
        console.error('❌ Error fetching core memories:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to fetch core memories' }));
      }
    },

    /**
     * PUT /api/profile/core-memories
     * Update core memories (user profile)
     */
    async updateCoreMemories(req, res) {
      const authResult = await authenticateToken(req);
      if (!authResult.authenticated) {
        res.writeHead(401, corsHeaders);
        res.end(JSON.stringify({ error: authResult.error }));
        return;
      }

      try {
        const userId = authResult.user.id;
        const body = await parseBody(req);

        const {
          fullName, companyName, businessOutcome,
          targetClients, clientProblems, clientResults,
          coreMethod, frameworks,
          serviceDescription, pricingModel, deliveryTimeline,
          revenueRange, growthGoals, biggestChallenges
        } = body;

        const result = await pool.query(
          `UPDATE core_memories
           SET full_name = $1, company_name = $2, business_outcome = $3,
               target_clients = $4, client_problems = $5, client_results = $6,
               core_method = $7, frameworks = $8,
               service_description = $9, pricing_model = $10, delivery_timeline = $11,
               revenue_range = $12, growth_goals = $13, biggest_challenges = $14,
               updated_at = NOW()
           WHERE user_id = $15
           RETURNING full_name as "fullName", company_name as "companyName",
                     business_outcome as "businessOutcome", target_clients as "targetClients",
                     client_problems as "clientProblems", client_results as "clientResults",
                     core_method as "coreMethod", frameworks,
                     service_description as "serviceDescription", pricing_model as "pricingModel",
                     delivery_timeline as "deliveryTimeline", revenue_range as "revenueRange",
                     growth_goals as "growthGoals", biggest_challenges as "biggestChallenges"`,
          [fullName, companyName, businessOutcome,
           targetClients, clientProblems, clientResults,
           coreMethod, frameworks,
           serviceDescription, pricingModel, deliveryTimeline,
           revenueRange, growthGoals, biggestChallenges,
           userId]
        );

        if (result.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'Core memories not found' }));
          return;
        }

        console.log(`✅ Updated core memories for user ${userId}`);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          coreMemories: result.rows[0]
        }));
      } catch (error) {
        console.error('❌ Error updating core memories:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to update core memories' }));
      }
    }
  };
}

module.exports = { registerOnboardingRoutes };
