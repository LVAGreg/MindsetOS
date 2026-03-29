# JSON Suffix Optimization for Memory Extraction

**Implementation Date**: 2025-11-12
**Phase**: 2.1 of Enhanced Onboarding & Brand Voice System
**Status**: ✅ Backend Implementation Complete

---

## 📋 Overview

This implementation adds JSON suffix optimization to ECOS agents, enabling automatic extraction of structured data from agent responses for memory and profile updates. The system uses `<STRUCTURED_DATA>` tags to embed JSON in agent responses, which is then parsed and used to update user profiles, core memories, and insights.

---

## 🎯 Key Features

1. **Automatic JSON Extraction**: Parse `<STRUCTURED_DATA>` blocks from agent responses
2. **Memory Updates**: Automatically update user memories based on agent insights
3. **Core Memories**: Update onboarding data (target_clients, business_outcome, etc.)
4. **User Insights**: Store key facts, goals, preferences, and challenges
5. **Clean Responses**: Remove JSON tags before displaying to users
6. **Backward Compatible**: Works with existing agents without breaking changes

---

## 📁 Files Created/Modified

### Database Migrations

1. **`/database/migrations/022_add_behavior_suffix_column.sql`**
   - Adds `behavior_suffix` column to agents table (idempotent)
   - Sets default memory extraction suffix for client-onboarding agent
   - Includes comments explaining column purpose

2. **`/database/migrations/023_update_client_onboarding_suffix.sql`**
   - Updates client-onboarding agent with comprehensive JSON suffix
   - Includes full schema for onboarding_data, user_insights, memory_updates
   - Adds instructions for progressive information extraction

### Backend Utilities

3. **`/backend/utils/jsonExtractor.cjs`**
   - `extractStructuredData(responseText)` - Extract JSON from `<STRUCTURED_DATA>` tags
   - `removeStructuredDataTags(responseText)` - Clean response for user display
   - `validateStructuredData(data)` - Validate JSON structure
   - `extractOnboardingData(data)` - Extract onboarding fields
   - `extractMemoryUpdates(data)` - Extract memory operations
   - `extractUserInsights(data)` - Extract insights
   - `processResponse(responseText)` - Complete processing pipeline

### Backend Services

4. **`/backend/services/memoryExtractionService.cjs`**
   - `processMemoryExtraction()` - Main orchestration function
   - `updateCoreMemories()` - Update core_memories table with onboarding data
   - `applyMemoryUpdates()` - Apply add/update operations to memories
   - `storeUserInsights()` - Store insights as memory entries

### Route Enhancements

5. **`/backend/routes/chat-enhanced.cjs`**
   - Enhanced version of chat.cjs with JSON extraction
   - Integrates `processMemoryExtraction()` after AI responses
   - Cleans responses with `removeStructuredDataTags()` before display
   - Maintains backward compatibility with existing functionality

### Templates

6. **`/backend/templates/memory-extraction-suffix.txt`**
   - Default suffix template for agents
   - Complete JSON schema with examples
   - Instructions for AI models on how to format structured data

---

## 🔧 How It Works

### 1. Agent Response Generation

The agent generates a response with embedded JSON:

```
Here's what I understand about your business...

[Conversational response to user]

<STRUCTURED_DATA>
{
  "onboarding_data": {
    "full_name": "Sarah Miles",
    "target_clients": "HR Directors in construction firms",
    "business_outcome": "Help companies reduce turnover by 40%"
  },
  "user_insights": {
    "key_facts": ["Has 10 years experience in HR consulting"],
    "goals": ["Scale to $50k/month revenue"],
    "challenges": ["Inconsistent lead flow"]
  }
}
</STRUCTURED_DATA>
```

### 2. Response Processing

The chat endpoint processes the response:

```javascript
// Extract structured data
const result = processResponse(aiResponse);

// Clean response for user display
const cleanedResponse = removeStructuredDataTags(aiResponse);

// Process structured data in background
processMemoryExtraction(aiResponse, userId, agentId, conversationId, pool);

// Return cleaned response to user
return cleanedResponse;
```

### 3. Memory Updates

The memory extraction service updates the database:

```javascript
// Update core_memories table
await updateCoreMemories(userId, result.onboardingData, pool);

// Apply memory updates (add/update operations)
await applyMemoryUpdates(userId, agentId, conversationId, result.memoryUpdates, pool);

// Store user insights as memory entries
await storeUserInsights(userId, agentId, conversationId, result.userInsights, pool);
```

---

## 📊 JSON Schema

### Complete Schema

```json
{
  "user_insights": {
    "key_facts": ["string", "string"],
    "preferences": {"key": "value"},
    "goals": ["string", "string"],
    "challenges": ["string", "string"]
  },
  "memory_updates": {
    "add": [
      {
        "type": "fact|goal|pain_point|strategy|preference|decision",
        "content": "string",
        "category": "business_info|insight|general"
      }
    ],
    "update": [
      {
        "field": "target_clients|business_outcome|etc",
        "value": "string"
      }
    ]
  },
  "onboarding_data": {
    "full_name": "string",
    "company_name": "string",
    "business_outcome": "string",
    "target_clients": "string",
    "client_problems": ["string", "string", "string"],
    "client_results": "string",
    "core_method": "string",
    "frameworks": ["string", "string"],
    "service_description": "string",
    "pricing_model": "string",
    "delivery_timeline": "string",
    "revenue_range": "string",
    "growth_goals": "string",
    "biggest_challenges": ["string", "string", "string"]
  }
}
```

### Field Mappings

**user_insights** → `memories` table with category='insight'
**memory_updates.add** → `memories` table with specified type
**memory_updates.update** → `core_memories` table field updates
**onboarding_data** → `core_memories` table UPSERT

---

## 🚀 Usage

### 1. Run Database Migrations

```bash
# In psql or via migration script
psql -U postgres -d ecos -f database/migrations/022_add_behavior_suffix_column.sql
psql -U postgres -d ecos -f database/migrations/023_update_client_onboarding_suffix.sql
```

### 2. Verify Agent Configuration

```sql
SELECT id, name, LEFT(behavior_suffix, 100) as suffix_preview
FROM agents
WHERE behavior_suffix IS NOT NULL;
```

### 3. Test with Client Onboarding Agent

1. Start a conversation with client-onboarding agent
2. Provide business information (name, target clients, etc.)
3. Check that core_memories table is populated
4. Verify memories table has insights entries

### 4. Integration with Existing Chat Routes

**Option A: Replace existing chat.cjs** (if no customizations)
```bash
cp backend/routes/chat-enhanced.cjs backend/routes/chat.cjs
```

**Option B: Manual integration** (if chat.cjs has customizations)
- Copy the JSON extraction logic from chat-enhanced.cjs
- Add imports for `processMemoryExtraction` and `removeStructuredDataTags`
- Insert cleanup and extraction calls after AI response generation

---

## 🔍 Testing

### Unit Tests

```javascript
const { extractStructuredData, removeStructuredDataTags } = require('./utils/jsonExtractor.cjs');

// Test extraction
const response = `Hello! <STRUCTURED_DATA>{"test": "data"}</STRUCTURED_DATA>`;
const data = extractStructuredData(response); // Returns {test: "data"}
const cleaned = removeStructuredDataTags(response); // Returns "Hello!"
```

### Integration Tests

1. **Test onboarding data extraction**
   - Send message with business info to client-onboarding agent
   - Verify core_memories table updated
   - Check that all fields are correctly populated

2. **Test memory updates**
   - Send message that should trigger memory addition
   - Verify memories table has new entries
   - Check importance_score and category fields

3. **Test user insights**
   - Send message with goals/challenges
   - Verify memories table has insight entries
   - Check that memory_type is set correctly

### Manual Testing

```bash
# 1. Start backend
cd /home/equalsfiveai/ECOS
node real-backend.cjs

# 2. Send test message via API
curl -X POST http://localhost:3000/api/letta/chat/stream \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "client-onboarding",
    "message": "I help HR directors in construction firms reduce turnover",
    "messages": []
  }'

# 3. Check database
psql -U postgres -d ecos -c "SELECT * FROM core_memories WHERE user_id='YOUR_USER_ID';"
psql -U postgres -d ecos -c "SELECT * FROM memories WHERE user_id='YOUR_USER_ID' ORDER BY created_at DESC LIMIT 5;"
```

---

## 📈 Performance Considerations

### Token Usage

- **Suffix Length**: ~600 tokens (added to every agent request)
- **JSON Response**: ~200-500 tokens (varies by data extracted)
- **Total Overhead**: ~800-1100 tokens per extraction-enabled conversation

### Optimization Strategies

1. **Selective Activation**: Only enable suffix for agents that need memory extraction
2. **Progressive Extraction**: Extract data across multiple turns instead of all at once
3. **Compression**: Use shorter field names and compact JSON formatting
4. **Caching**: Store extracted data to avoid redundant extractions

### Database Impact

- **Write Operations**: 1-10 INSERTs per extracted response
- **Query Overhead**: Minimal (UPSERT operations with indexes)
- **Storage**: ~1-5KB per extraction (JSON + memory entries)

---

## 🔒 Security Considerations

1. **Input Validation**: All extracted JSON is validated before database insertion
2. **SQL Injection Protection**: Parameterized queries prevent SQL injection
3. **Data Privacy**: Structured data is hidden from user-facing responses
4. **Error Handling**: Extraction failures don't break conversation flow

---

## 🛠️ Troubleshooting

### Issue: No structured data extracted

**Symptoms**: Agent responses don't populate core_memories
**Causes**:
- Agent doesn't have behavior_suffix set
- JSON formatting is invalid
- Agent model doesn't follow instructions

**Solutions**:
```sql
-- Check if suffix is set
SELECT id, behavior_suffix FROM agents WHERE id='client-onboarding';

-- Update suffix if missing
UPDATE agents SET behavior_suffix = '[SUFFIX TEXT]' WHERE id='client-onboarding';
```

### Issue: Invalid JSON format

**Symptoms**: Console shows "Failed to extract structured data"
**Causes**:
- AI generated malformed JSON
- Missing closing tags
- Syntax errors in JSON

**Solutions**:
- Check console logs for parsing errors
- Add more explicit JSON formatting instructions to suffix
- Use a more capable AI model (e.g., GPT-4 instead of GPT-3.5)

### Issue: Memory updates not applying

**Symptoms**: Database not updating despite valid JSON
**Causes**:
- Field names don't match core_memories schema
- User ID mismatch
- Database permissions

**Solutions**:
```javascript
// Enable debug logging
console.log('Extracted data:', extractedData);
console.log('User ID:', userId);
console.log('Onboarding data:', extractOnboardingData(extractedData));
```

---

## 📚 API Reference

### jsonExtractor.cjs

```javascript
/**
 * Extract structured JSON data from agent response
 * @param {string} responseText - Full AI response text
 * @returns {object|null} - Parsed JSON object or null
 */
extractStructuredData(responseText)

/**
 * Remove structured data tags from response
 * @param {string} responseText - Full AI response text
 * @returns {string} - Cleaned response
 */
removeStructuredDataTags(responseText)

/**
 * Process response and return categorized results
 * @param {string} responseText - Full AI response text
 * @returns {object} - Processing results
 */
processResponse(responseText)
```

### memoryExtractionService.cjs

```javascript
/**
 * Process agent response for structured data and update memories
 * @param {string} responseText - Full AI response text
 * @param {string} userId - User ID
 * @param {string} agentId - Agent ID
 * @param {string} conversationId - Conversation ID
 * @param {object} pool - PostgreSQL connection pool
 * @returns {Promise<object>} - Processing result
 */
processMemoryExtraction(responseText, userId, agentId, conversationId, pool)

/**
 * Update core memories table with onboarding data
 * @param {string} userId - User ID
 * @param {object} onboardingData - Extracted onboarding data
 * @param {object} pool - PostgreSQL connection pool
 */
updateCoreMemories(userId, onboardingData, pool)

/**
 * Apply memory updates (add/update operations)
 * @param {string} userId - User ID
 * @param {string} agentId - Agent ID
 * @param {string} conversationId - Conversation ID
 * @param {object} memoryUpdates - Memory update operations
 * @param {object} pool - PostgreSQL connection pool
 */
applyMemoryUpdates(userId, agentId, conversationId, memoryUpdates, pool)
```

---

## 🎯 Next Steps

### Phase 2.2: Brand Voice System
- [ ] Create brand voice analyzer agent
- [ ] Implement brand voice suffix generation
- [ ] Add brand voice application to content agents

### Phase 2.3: Frontend Integration
- [ ] Add CoreMemoriesEditor component
- [ ] Create memory review/approval UI
- [ ] Build onboarding progress tracker

### Phase 3: Testing & Optimization
- [ ] Comprehensive integration tests
- [ ] Performance benchmarking
- [ ] User acceptance testing
- [ ] Production deployment

---

## 📝 Change Log

### 2025-11-12 - Initial Implementation
- Created database migrations for behavior_suffix column
- Implemented JSON extraction utilities
- Created memory extraction service
- Enhanced chat routes with extraction logic
- Updated client-onboarding agent with JSON suffix
- Created comprehensive documentation

---

## 📞 Support

For questions or issues:
1. Check console logs for extraction errors
2. Verify database schema matches specification
3. Test with simple JSON structures first
4. Review ENHANCED_ONBOARDING_AND_BRAND_VOICE_SPEC.md for context

---

**Version**: 1.0
**Last Updated**: 2025-11-12
**Status**: ✅ Ready for Testing
