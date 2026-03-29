/**
 * Core Memory Processor
 *
 * Automatically extracts and saves structured JSON data to user profiles.
 * Handles core_memories table updates, validation, conflict resolution, and audit trails.
 *
 * Reference: ENHANCED_ONBOARDING_AND_BRAND_VOICE_SPEC.md (Phase 2, Section 2.2)
 */

/**
 * Extract structured data from agent response
 * Looks for <STRUCTURED_DATA> tags or JSON blocks
 */
function extractStructuredData(responseText) {
  try {
    console.log(`🔍 [MEMORY_EXTRACT] Attempting extraction from ${responseText.length} char response`);

    // Look for <STRUCTURED_DATA> tags
    const structuredMatch = responseText.match(/<STRUCTURED_DATA>([\s\S]*?)<\/STRUCTURED_DATA>/);

    if (structuredMatch) {
      console.log('✅ [MEMORY_EXTRACT] Found <STRUCTURED_DATA> tags');
      const jsonStr = structuredMatch[1].trim();
      return JSON.parse(jsonStr);
    }
    console.log('ℹ️  [MEMORY_EXTRACT] No <STRUCTURED_DATA> tags found');

    // Alternative: Look for ```json code blocks
    const jsonBlockMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);

    if (jsonBlockMatch) {
      console.log('✅ [MEMORY_EXTRACT] Found ```json code block');
      const jsonStr = jsonBlockMatch[1].trim();
      return JSON.parse(jsonStr);
    }
    console.log('ℹ️  [MEMORY_EXTRACT] No ```json code block found');

    // Alternative: Look for any JSON object that might be at the end
    const lines = responseText.split('\n');
    const lastJsonMatch = responseText.match(/\{[\s\S]*"(?:user_insights|memory_updates|onboarding_data)"[\s\S]*\}$/);

    if (lastJsonMatch) {
      console.log('✅ [MEMORY_EXTRACT] Found JSON object with memory fields');
      return JSON.parse(lastJsonMatch[0]);
    }
    console.log('ℹ️  [MEMORY_EXTRACT] No JSON object with memory fields found');

    return null;
  } catch (error) {
    console.error('❌ [CORE_MEMORY] Failed to extract structured data:', error.message);
    console.error('❌ [CORE_MEMORY] Response text preview:', responseText.substring(0, 500));
    return null;
  }
}

/**
 * Validate core memory data structure
 * Ensures data types and required fields are correct
 */
function validateCoreMemoryData(data) {
  const errors = [];
  const validatedData = {};

  // Validate string fields
  const stringFields = [
    'full_name', 'company_name', 'business_outcome', 'target_clients',
    'client_results', 'core_method', 'service_description', 'pricing_model',
    'delivery_timeline', 'revenue_range', 'growth_goals'
  ];

  for (const field of stringFields) {
    if (data[field] !== undefined) {
      if (typeof data[field] === 'string') {
        validatedData[field] = data[field].trim();
      } else {
        errors.push(`${field} must be a string`);
      }
    }
  }

  // Validate array fields
  const arrayFields = ['client_problems', 'frameworks', 'biggest_challenges'];

  for (const field of arrayFields) {
    if (data[field] !== undefined) {
      if (Array.isArray(data[field])) {
        validatedData[field] = data[field].filter(item => typeof item === 'string' && item.trim());
      } else if (typeof data[field] === 'string') {
        // Convert string to single-item array
        validatedData[field] = [data[field].trim()];
      } else {
        errors.push(`${field} must be an array or string`);
      }
    }
  }

  return { validatedData, errors, isValid: errors.length === 0 };
}

/**
 * Process memory updates from agent response
 * Main entry point for automatic profile updates
 */
async function processMemoryUpdates(pool, userId, agentId, conversationId, responseText) {
  try {
    console.log('🧠 [CORE_MEMORY] Processing memory updates...');

    // Extract structured data
    const structuredData = extractStructuredData(responseText);

    if (!structuredData) {
      console.log('ℹ️  [CORE_MEMORY] No structured data found in response');
      return { success: false, reason: 'no_structured_data' };
    }

    console.log('✅ [CORE_MEMORY] Structured data extracted:', JSON.stringify(structuredData, null, 2));

    // Extract core memory updates from various possible formats
    let coreMemoryData = null;

    if (structuredData.onboarding_data) {
      coreMemoryData = structuredData.onboarding_data;
    } else if (structuredData.user_insights) {
      coreMemoryData = structuredData.user_insights;
    } else if (structuredData.memory_updates && structuredData.memory_updates.core_memories) {
      coreMemoryData = structuredData.memory_updates.core_memories;
    } else if (structuredData.core_memories) {
      coreMemoryData = structuredData.core_memories;
    }

    if (!coreMemoryData || Object.keys(coreMemoryData).length === 0) {
      console.log('ℹ️  [CORE_MEMORY] No core memory data in structured response');
      return { success: false, reason: 'no_core_memory_data' };
    }

    // Validate data structure
    const validation = validateCoreMemoryData(coreMemoryData);

    if (!validation.isValid) {
      console.error('❌ [CORE_MEMORY] Validation errors:', validation.errors);
      return {
        success: false,
        reason: 'validation_failed',
        errors: validation.errors
      };
    }

    const validatedData = validation.validatedData;

    // Check if core_memories record exists for user
    const existingResult = await pool.query(
      'SELECT * FROM core_memories WHERE user_id = $1',
      [userId]
    );

    let result;
    const changedFields = [];

    if (existingResult.rows.length === 0) {
      // Create new core_memories record
      console.log('📝 [CORE_MEMORY] Creating new core memories record');

      const fields = Object.keys(validatedData);
      const values = Object.values(validatedData);
      const placeholders = values.map((_, i) => `$${i + 2}`).join(', ');

      const query = `
        INSERT INTO core_memories (user_id, ${fields.join(', ')})
        VALUES ($1, ${placeholders})
        RETURNING *
      `;

      result = await pool.query(query, [userId, ...values]);

      // Log all fields as new
      for (const field of fields) {
        changedFields.push({ field, oldValue: null, newValue: validatedData[field] });
      }

      console.log(`✅ [CORE_MEMORY] Created core memories with ${fields.length} fields`);
    } else {
      // Update existing record
      console.log('🔄 [CORE_MEMORY] Updating existing core memories');

      const existing = existingResult.rows[0];
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 2;

      // Compare and update only changed fields
      for (const [field, newValue] of Object.entries(validatedData)) {
        const oldValue = existing[field];

        // Handle array comparison
        const isArray = Array.isArray(newValue);
        const oldValueStr = isArray ? JSON.stringify(oldValue || []) : oldValue;
        const newValueStr = isArray ? JSON.stringify(newValue) : newValue;

        if (oldValueStr !== newValueStr) {
          updateFields.push(`${field} = $${paramIndex}`);
          updateValues.push(newValue);
          paramIndex++;

          changedFields.push({
            field,
            oldValue: oldValue,
            newValue: newValue
          });
        }
      }

      if (updateFields.length === 0) {
        console.log('ℹ️  [CORE_MEMORY] No changes detected');
        return {
          success: true,
          reason: 'no_changes',
          recordId: existing.id
        };
      }

      const query = `
        UPDATE core_memories
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE user_id = $1
        RETURNING *
      `;

      result = await pool.query(query, [userId, ...updateValues]);

      console.log(`✅ [CORE_MEMORY] Updated ${updateFields.length} fields`);
    }

    const coreMemoryRecord = result.rows[0];

    // Create audit log entries for all changes
    if (changedFields.length > 0) {
      await Promise.all(changedFields.map(change =>
        pool.query(`
          INSERT INTO core_memory_audit_log (
            user_id, core_memory_id, field_name, old_value, new_value,
            source, agent_id, conversation_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          userId,
          coreMemoryRecord.id,
          change.field,
          typeof change.oldValue === 'object' ? JSON.stringify(change.oldValue) : change.oldValue,
          typeof change.newValue === 'object' ? JSON.stringify(change.newValue) : change.newValue,
          'agent',
          agentId,
          conversationId
        ])
      ));

      console.log(`📊 [CORE_MEMORY] Created ${changedFields.length} audit log entries`);
    }

    return {
      success: true,
      recordId: coreMemoryRecord.id,
      changedFields: changedFields.length,
      changes: changedFields.map(c => c.field)
    };

  } catch (error) {
    console.error('❌ [CORE_MEMORY] Error processing memory updates:', error);
    return {
      success: false,
      reason: 'processing_error',
      error: error.message
    };
  }
}

/**
 * Get core memories for a user with audit trail
 */
async function getCoreMemoriesWithHistory(pool, userId, includeAuditLog = false) {
  try {
    // Get core memories
    const memoryResult = await pool.query(
      'SELECT * FROM core_memories WHERE user_id = $1',
      [userId]
    );

    if (memoryResult.rows.length === 0) {
      return { coreMemories: null, auditLog: [] };
    }

    const coreMemories = memoryResult.rows[0];

    // Get audit log if requested
    let auditLog = [];
    if (includeAuditLog) {
      const auditResult = await pool.query(`
        SELECT
          al.*,
          a.name as agent_name
        FROM core_memory_audit_log al
        LEFT JOIN agents a ON al.agent_id = a.id
        WHERE al.user_id = $1
        ORDER BY al.changed_at DESC
        LIMIT 50
      `, [userId]);

      auditLog = auditResult.rows;
    }

    return { coreMemories, auditLog };
  } catch (error) {
    console.error('❌ [CORE_MEMORY] Error fetching core memories:', error);
    throw error;
  }
}

/**
 * Update core memories manually (user editing profile)
 */
async function updateCoreMemoriesManual(pool, userId, updates) {
  try {
    // Validate updates
    const validation = validateCoreMemoryData(updates);

    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors
      };
    }

    const validatedData = validation.validatedData;

    // Check if record exists
    const existingResult = await pool.query(
      'SELECT * FROM core_memories WHERE user_id = $1',
      [userId]
    );

    let result;
    const changedFields = [];

    if (existingResult.rows.length === 0) {
      // Create new record
      const fields = Object.keys(validatedData);
      const values = Object.values(validatedData);
      const placeholders = values.map((_, i) => `$${i + 2}`).join(', ');

      const query = `
        INSERT INTO core_memories (user_id, ${fields.join(', ')})
        VALUES ($1, ${placeholders})
        RETURNING *
      `;

      result = await pool.query(query, [userId, ...values]);

      for (const field of fields) {
        changedFields.push({ field, oldValue: null, newValue: validatedData[field] });
      }
    } else {
      // Update existing record
      const existing = existingResult.rows[0];
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 2;

      for (const [field, newValue] of Object.entries(validatedData)) {
        const oldValue = existing[field];
        const isArray = Array.isArray(newValue);
        const oldValueStr = isArray ? JSON.stringify(oldValue || []) : oldValue;
        const newValueStr = isArray ? JSON.stringify(newValue) : newValue;

        if (oldValueStr !== newValueStr) {
          updateFields.push(`${field} = $${paramIndex}`);
          updateValues.push(newValue);
          paramIndex++;
          changedFields.push({ field, oldValue, newValue });
        }
      }

      if (updateFields.length === 0) {
        return {
          success: true,
          reason: 'no_changes',
          recordId: existing.id
        };
      }

      const query = `
        UPDATE core_memories
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE user_id = $1
        RETURNING *
      `;

      result = await pool.query(query, [userId, ...updateValues]);
    }

    const coreMemoryRecord = result.rows[0];

    // Create audit log entries (source: manual)
    if (changedFields.length > 0) {
      await Promise.all(changedFields.map(change =>
        pool.query(`
          INSERT INTO core_memory_audit_log (
            user_id, core_memory_id, field_name, old_value, new_value, source
          ) VALUES ($1, $2, $3, $4, $5, 'manual')
        `, [
          userId,
          coreMemoryRecord.id,
          change.field,
          typeof change.oldValue === 'object' ? JSON.stringify(change.oldValue) : change.oldValue,
          typeof change.newValue === 'object' ? JSON.stringify(change.newValue) : change.newValue
        ])
      ));
    }

    return {
      success: true,
      recordId: coreMemoryRecord.id,
      changedFields: changedFields.length,
      coreMemories: coreMemoryRecord
    };

  } catch (error) {
    console.error('❌ [CORE_MEMORY] Error updating core memories:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  extractStructuredData,
  validateCoreMemoryData,
  processMemoryUpdates,
  getCoreMemoriesWithHistory,
  updateCoreMemoriesManual
};
