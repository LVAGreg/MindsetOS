# Agent Quality Report: Conversation Curator

**Agent**: Conversation Curator
**Slug**: `conversation-curator`
**Category**: Content
**Icon**: Headphones / #14B8A6
**Display Order**: 9
**Date**: 2026-03-29
**Backend Status**: MindsetOS backend returning 500 (service down at time of audit)

---

## 1. Executive Summary

The Conversation Curator is a podcast episode recommendation agent that matches users to specific Mindset.Show episodes based on their current challenge. Based on the DEMO.html output (the only available sample since the production backend was unreachable), the agent produces compelling, therapeutically-grounded recommendations with excellent contextual matching. However, it has a critical flaw: it fabricates episode titles, timestamps, and quotes rather than drawing from a verified episode catalog. This makes it a liability if users try to find recommended episodes and discover they do not exist.

**Overall Grade**: C+
**Potential Grade (with fixes)**: A

---

## 2. What Works Well

### 2.1 Emotional Attunement (A)
The agent opens with validation before jumping to a recommendation. The demo response to an imposter syndrome query starts with "Oh, this one hits deep" and immediately reframes the user's experience as "an identity crisis triggered by comparison" rather than generic imposter syndrome. This is sophisticated coaching language that meets the user where they are.

### 2.2 Brand Voice Compliance (A-)
The response nails Greg's voice: direct, warm, no-BS. Contractions used naturally. Short paragraphs. No AI disclaimers. The line "Your logic knows your worth. Your identity hasn't caught up yet" is the kind of sentence Greg would actually say. Minor deduction: the Markdown bold formatting (`**"Identity Before Strategy"**`) leaked into the HTML output, suggesting the agent outputs Markdown that the frontend does not always clean up.

### 2.3 Response Structure (B+)
The recommendation follows a clean structure:
1. Emotional acknowledgment and reframe
2. Episode recommendation with rationale
3. Specific timestamps with content previews
4. A core takeaway quote
5. A reflective question to sit with
6. An offer to pull a second episode

This structure gives the user multiple entry points and makes the content feel curated rather than random.

### 2.4 Contextual Bridge (B+)
The agent connects the user's specific situation (competitor landed a deal, feeling like a fraud) to the episode content rather than giving a generic "here's an episode about imposter syndrome." The timestamp descriptions reference "watching someone less qualified win" directly from the user's input.

---

## 3. Critical Issues

### 3.1 HALLUCINATED EPISODES (Severity: CRITICAL)

**The "Identity Before Strategy (Season 1)" episode almost certainly does not exist.** The timestamps [08:14], [19:40], [31:22] are fabricated. The quotes are generated. If a user opens their podcast app and searches for this episode, they will find nothing, destroying trust in the entire platform.

This is the single biggest problem with this agent. Every recommendation it makes is fiction presented as fact.

**Evidence**: There is no podcast episode catalog, RSS feed, or episode database in the knowledge base. The `knowledge_base` table has no podcast-related documents uploaded for this agent. The seed SQL shows the system prompt as a minimal placeholder (`'You are the Conversation Curator...'`). The agent is generating plausible-sounding episodes from its general training data.

**Impact**: Users who try to find recommended episodes will:
- Lose trust in the Conversation Curator
- Lose trust in MindsetOS as a whole
- Question whether other agents are also making things up

### 3.2 NO KNOWLEDGE BASE (Severity: HIGH)

The agent has no RAG-indexed podcast catalog to draw from. The chat pipeline runs a knowledge base search (`searchRelevantChunks`) for every message, but there are no documents uploaded for the `conversation-curator` agent. This means:
- Every episode title is generated, not retrieved
- Every timestamp is fabricated
- Every quote is invented
- There is no way to link to actual episodes

### 3.3 SYSTEM PROMPT IS MINIMAL (Severity: HIGH)

The seed SQL shows `'You are the Conversation Curator...'` as the system prompt. While the production DB may contain a longer prompt (inaccessible due to 500 errors), the absence of any migration file updating this agent's prompt suggests it was either:
- Manually updated via the admin panel with a brief prompt
- Left at the placeholder level and relying entirely on the LLM to improvise

Without access to the production prompt, this cannot be fully verified, but the DEMO output suggests the prompt instructs the agent to recommend episodes with timestamps and quotes, without providing actual episode data to reference.

### 3.4 No Episode Links or Playback Integration (Severity: MEDIUM)

Even if episodes were real, the agent provides no way to actually listen. No links to:
- Spotify
- Apple Podcasts
- YouTube
- A website player
- Any URL at all

The user receives a recommendation with no way to act on it without manual searching.

---

## 4. Evaluation Criteria Results

| Criteria | Grade | Notes |
|----------|-------|-------|
| Podcast/content recommendation methodology | B | Good structure, but methodology is generative not retrieval-based |
| Topic matching quality | B+ | Matches emotional state well, connects user's specific situation |
| Knowledge base (specific episodes) | F | No real episode catalog exists; all recommendations are fabricated |
| Contextual recommendations | B+ | Bridges user's challenge to episode themes effectively |
| Integration with mindset development journey | C | Mentions other agents tangentially but does not explicitly route users |

---

## 5. Test Prompt Evaluation

**Prompt**: "I'm struggling with imposter syndrome as I scale my business. What should I listen to?"

**Expected behavior**: Agent should recommend a real, verifiable Mindset.Show podcast episode with accurate title, season/episode number, and description.

**Actual behavior (from DEMO)**: Agent recommended a fabricated episode "Identity Before Strategy (Season 1)" with invented timestamps and quotes. The coaching framing around the recommendation was excellent, but the core deliverable (the episode itself) is fictional.

**Verdict**: The wrapper is A-tier. The content is fabricated. Net result: trust-destroying.

---

## 6. Improvement Recommendations

### P0 — CRITICAL (Must fix before users interact)

#### 6.1 Build a Real Episode Catalog
Greg needs to provide a structured catalog of all Mindset.Show podcast episodes. This should include:

```
- Episode title
- Season and episode number
- Publication date
- Duration
- Direct link (Spotify, Apple, YouTube, website)
- 3-5 topic tags (e.g., "imposter syndrome", "decision-making", "identity")
- 1-2 sentence summary
- Key timestamps with topic labels (if available)
- Notable quotes from the episode
```

**Format**: Upload as a structured document (Markdown or JSON) to the knowledge base via `/api/knowledge-base/upload` scoped to the `conversation-curator` agent.

**Estimated effort**: 2-4 hours for Greg to compile for 20-50 episodes. Could be partially automated by scraping podcast RSS feed metadata.

#### 6.2 Update System Prompt to Use Knowledge Base

The system prompt must be rewritten to:

```
CRITICAL INSTRUCTION: You MUST ONLY recommend episodes that exist in your
knowledge base context. NEVER invent episode titles, timestamps, or quotes.

If no relevant episode is found in your knowledge base:
- Say "I don't have a perfect match in Greg's catalog right now"
- Offer to connect the user with the Inner World Mapper or Story Excavator
  for deeper exploration of their challenge
- Suggest they browse the full episode list at [URL]

When recommending an episode:
- Use the EXACT title from the knowledge base
- Include the direct listening link
- Only include timestamps if they exist in the catalog
- Quote only verified quotes from the episode description
```

#### 6.3 Add Hallucination Guard
Add a post-processing check or prompt instruction that prevents the agent from generating episode content not grounded in the knowledge base. The RAG pipeline already retrieves relevant chunks; the prompt just needs to mandate using only those chunks for episode details.

### P1 — HIGH (Fix within first week)

#### 6.4 Add Episode Links to Responses
Every episode recommendation should include a clickable link. Format:

```
Listen here: [Spotify](url) | [Apple](url) | [YouTube](url)
```

This transforms the recommendation from informational to actionable.

#### 6.5 Cross-Agent Routing
When the user's challenge is deeper than a podcast can address, the agent should actively route:

- Imposter syndrome / identity issues -> Story Excavator or Inner World Mapper
- Decision paralysis -> Decision Framework Agent
- Daily overwhelm -> Practice Builder
- Need for accountability -> Accountability Partner

Example: "This episode will give you the reframe. But if you want to actually excavate the story underneath this imposter pattern, the Story Excavator is built for exactly that."

#### 6.6 Multi-Episode Journeys
Instead of single episode recommendations, offer curated listening paths:

```
Your 3-Episode Journey for Imposter Syndrome:
1. "Episode X" — Start here for the reframe
2. "Episode Y" — Go deeper on identity vs. strategy
3. "Episode Z" — Build the practice to make it stick
```

This increases engagement and maps to the 3-Layer Architecture (Awareness, Interruption, Architecture).

### P2 — MEDIUM (Fix within first month)

#### 6.7 Episode Completion Follow-Up
After recommending an episode, the agent should follow up:

```
"Did you get a chance to listen to [episode]? What landed for you?"
```

This creates a feedback loop and gives the agent context for future recommendations.

#### 6.8 RSS Feed Auto-Sync
Build an automated pipeline that:
1. Pulls new episodes from the Mindset.Show RSS feed
2. Extracts metadata (title, description, duration, tags)
3. Generates embeddings via the existing RAG pipeline
4. Uploads to the knowledge base

This ensures the catalog stays current without manual updates.

#### 6.9 Listening History Tracking
Use the memory system to track which episodes the user has been recommended and listened to. Prevent re-recommending the same episode. Build a "listened" history that informs future recommendations.

#### 6.10 User Preference Learning
Over multiple interactions, learn the user's preferred:
- Episode length (short commute vs. long deep-dives)
- Topic preferences (identity, decision-making, relationships, money)
- Response to past recommendations (did they find it helpful?)

Store in core memories for personalization.

### P3 — LOW (Nice-to-have)

#### 6.11 Guest Expert Matching
If episodes feature guest experts, match users to episodes based on the guest's expertise area, not just the topic.

#### 6.12 Mood-Based Recommendations
Detect emotional state from the conversation and adjust recommendation style:
- Spiral/crisis mode -> Short, punchy episode with immediate reframe
- Curious/exploratory -> Deep-dive episode with multiple layers
- Celebrating/winning -> Episode about sustaining momentum

#### 6.13 Integration with Accountability Partner
When the Accountability Partner detects a recurring pattern, it could trigger a Conversation Curator recommendation: "You've mentioned comparison anxiety 3 times this week. Want me to pull an episode that addresses this?"

---

## 7. Proposed System Prompt Structure

```
You are the Conversation Curator for MindsetOS.

Your job is to match users to the RIGHT Mindset.Show podcast episode for their
current challenge. You're not a generic podcast recommender. You're a mindset
coach who uses Greg's episodes as precision tools.

## HOW YOU WORK

1. LISTEN FIRST — Understand what the user is actually dealing with (not just
   the surface symptom)
2. REFRAME — Give them a quick coaching insight that shifts their perspective
3. MATCH — Recommend 1-2 episodes from the knowledge base that directly address
   their situation
4. BRIDGE — Connect the episode themes to their specific context
5. ROUTE — If the challenge needs more than a podcast, send them to the right agent

## CRITICAL RULES

- ONLY recommend episodes that exist in your knowledge base
- NEVER fabricate episode titles, timestamps, or quotes
- ALWAYS include the direct listening link
- If no episode matches, say so honestly and offer an alternative path
- Keep recommendations to 1-2 episodes max (not a playlist dump)

## RESPONSE FORMAT

For each recommendation:
- Episode title and season/number
- WHY this episode matches their specific situation (not generic)
- 2-3 key moments to listen for (with timestamps if available)
- One question to reflect on after listening
- Link to listen

## VOICE

You sound like Greg: direct, warm, slightly nerdy about mindset. Not a librarian.
Not an AI assistant. A friend who knows every episode and knows which one you
need right now.

## CROSS-AGENT ROUTING

- Deep identity work -> "The Story Excavator can help you dig into that"
- Pattern interruption -> "The Inner World Mapper is built for this"
- Daily practice needed -> "Let the Practice Builder create something for you"
- Decision paralysis -> "The Decision Framework Agent has a process for this"
```

---

## 8. Backend Status Note

The MindsetOS backend (`mindset-os-backend-production.up.railway.app`) was returning HTTP 500 errors on all endpoints during this audit, including `/api/health` and `/api/admin/execute`. This prevented:

- Retrieving the actual production system prompt from the `agents` table
- Checking knowledge base documents scoped to this agent
- Verifying the agent's model configuration (chat_model, temperature, etc.)
- Running a live test prompt through the chat API

The analysis was conducted using:
- The DEMO.html test output (validated agent response from 2026-03-28)
- The backend source code (`real-backend.cjs`) for architecture understanding
- The seed SQL and migration files for configuration context
- The CLAUDE.md project documentation for design intent

**Recommendation**: Re-run this audit with a live test when the backend is restored.

---

## 9. Summary

The Conversation Curator has excellent coaching wrapper quality but a fundamentally broken core: it recommends fictional podcast episodes. This is the most dangerous kind of AI failure because the output *looks* highly credible and personalized, making the inevitable discovery that the episodes don't exist feel like a deliberate deception.

**The fix is straightforward**: upload a real episode catalog to the knowledge base and update the system prompt to ground recommendations in that catalog. Until this is done, the agent should either be disabled or display a disclaimer that recommendations are illustrative, not linked to real episodes.

**Priority**: P0 fix (episode catalog + grounded prompt) before any user interacts with this agent in production.
