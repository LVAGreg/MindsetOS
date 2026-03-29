# Agent Quality Report: Reset Guide (02)

**Agent**: Reset Guide
**Slug**: `reset-guide`
**Category**: Coaching (Interruption Phase)
**Tier**: Entry ($47 product)
**Date**: 2026-03-29
**Status**: PARTIAL EVALUATION (backend down, prompt retrieved from demo output only)

---

## 1. Executive Summary

The Reset Guide agent delivers the 48-Hour Weekend Challenge, MindsetOS's $47 entry product. It is positioned as the critical bridge between the free Mindset Score and the $997 Architecture cohort.

**Overall Assessment**: NEEDS SIGNIFICANT PROMPT WORK

The production database holds the actual system prompt, but the backend is currently down (ECONNREFUSED on port 3010). The seed SQL (`backend-api/seed-agents.sql`) contains only a placeholder: `'You are the Reset Guide for MindsetOS...'`. This means the prompt was either manually inserted into the DB at some point or was never fully built out. Based on demo output analysis, the agent produces decent Exercise 1 content but there is no evidence of a comprehensive system prompt covering all 6 exercises, timing guidance, or progress tracking.

**Priority**: REVENUE-CRITICAL. This agent directly drives the $47 purchase and upsell to $997.

---

## 2. Backend Status

- **Backend URL**: https://mindset-os-backend-production.up.railway.app
- **Status**: DOWN (port 3010 ECONNREFUSED)
- **Impact**: Cannot query `agents` table via `/api/admin/execute`
- **Chat endpoint**: `/api/letta/chat/stream` (POST, requires JWT auth)
- **System prompt assembly**: `buildFullSystemPrompt()` loads from `AGENT_CACHE` (DB), applies `behavior_prefix`, `behavior_suffix`, `response_modifiers`, `GLOBAL_PROMPT_APPENDIX`, and brand voice suffix
- **Fallback prompts**: `AGENT_PROMPTS` object has no `reset-guide` key; falls back to ECOS `money-model-maker` prompt if DB prompt is missing

**ACTION REQUIRED**: Fix backend deployment before any agent testing or prompt updates can proceed.

---

## 3. Demo Output Analysis

From `docs/DEMO.html`, a test interaction was captured:

**User prompt**: "I just took the Mindset Score and my weakest pillar is Awareness. I want to do the 48-Hour Reset. Walk me through Exercise 1."

**Agent response quality** (1,482 chars, 12.0s):

### What Worked Well

- **Voice**: Warm, direct, no-BS. "Good. You know your weak point. That's actually the first sign of awareness working, so you're already ahead." -- nails the MindsetOS tone.
- **Exercise structure**: Clear header ("Exercise 1: The Audit"), explains what it is and why it matters.
- **Actionable instructions**: 4 specific questions to answer in writing, with a 20-minute time commitment.
- **Rules provided**: "Write it down. Thinking doesn't count." -- direct and practical.
- **Forward momentum**: "Come back here when you're done and share what came up. I'll tell you what to look for in your answers before we move to Exercise 2."
- **No AI disclaimers**: Zero robotic language.
- **Proper markdown**: Headers, bold, lists, horizontal rules -- well-formatted.

### What Could Be Better

- **No timeline context**: Doesn't tell the user where Exercise 1 fits in the 48-hour schedule (Friday evening? Saturday morning?).
- **No pillar connection**: Mentions Awareness once but doesn't deeply connect The Audit to the Awareness pillar from their Mindset Score.
- **No progress indicator**: User has no visual/textual sense of "1 of 6 exercises" or "you're starting Day 1 of 2."
- **No emotional preparation**: Doesn't warn the user that this exercise can surface uncomfortable truths.
- **Missing personalization hook**: The user said their weakest pillar is Awareness, but the response is generic Exercise 1, not tailored to that specific weakness.

---

## 4. Framework Compliance Check

### 48-Hour Reset Exercises (from CLAUDE.md spec)

| # | Exercise | Name | Expected Function | Evidence in Demo | Status |
|---|----------|------|-------------------|-----------------|--------|
| 1 | The Audit | Current state snapshot | Observe where energy goes, what you tolerate | YES -- 4 questions delivered | SEEN |
| 2 | The Pattern | Reactive triggers | Catch automatic reactions | NOT TESTED | UNKNOWN |
| 3 | The Practice | First daily routine | Build a 5-10 min practice | NOT TESTED | UNKNOWN |
| 4 | The Mirror | Honest self-assessment | Deep personal honesty | NOT TESTED | UNKNOWN |
| 5 | The Architecture | Design your system | Build the operating system | NOT TESTED | UNKNOWN |
| 6 | The Score | Retake assessment | Measure the shift | NOT TESTED | UNKNOWN |

### 3-Layer Architecture Alignment

The 6 exercises should map to the 3 layers:

| Layer | Exercises | Purpose |
|-------|-----------|---------|
| Awareness | 1 (Audit), 4 (Mirror) | See what's really happening |
| Interruption | 2 (Pattern), 6 (Score) | Catch reactive triggers, measure change |
| Architecture | 3 (Practice), 5 (Architecture) | Build the operating system |

**Finding**: No evidence the system prompt explicitly maps exercises to layers or explains the progression logic.

---

## 5. System Prompt Recommendations

### 5.1 Prompt Structure (Recommended)

The Reset Guide system prompt should be structured in these sections:

```
1. IDENTITY & ROLE
   - Who you are, your relationship to the user
   - Connection to MindsetOS ecosystem

2. THE 48-HOUR FRAMEWORK
   - Complete overview of all 6 exercises
   - Timing schedule (Day 1 vs Day 2)
   - How exercises connect to the 3 pillars

3. EXERCISE DEFINITIONS (x6)
   - Each exercise: purpose, instructions, questions, rules, completion criteria
   - How to evaluate user responses
   - Transition triggers to next exercise

4. PERSONALIZATION LOGIC
   - Use Mindset Score results (if available from memory)
   - Adapt emphasis based on weakest pillar
   - Acknowledge returning users vs first-timers

5. CONVERSATION FLOW
   - How to handle "I want to start"
   - How to handle mid-exercise questions
   - How to handle users who skip ahead
   - How to handle users who quit early

6. ENGAGEMENT & MOTIVATION
   - Progress celebration between exercises
   - Struggle acknowledgment patterns
   - Urgency/momentum language for 48-hour constraint

7. UPSELL & NEXT STEPS
   - After Exercise 6, introduce 90-Day Architecture
   - Natural, non-pushy transition language

8. VOICE & TONE RULES
   - MindsetOS brand voice (direct, warm, no-BS)
   - No AI disclaimers, no motivational cliches
   - Contractions, short sentences, real examples
```

### 5.2 Missing Elements (Critical)

**A. 48-Hour Timeline Schedule**

The prompt must define a suggested schedule:

```
FRIDAY EVENING (2 hours)
  - Exercise 1: The Audit (45 min)
  - Exercise 2: The Pattern (45 min)
  - Reflection break (30 min)

SATURDAY MORNING (2 hours)
  - Exercise 3: The Practice (30 min + first practice session)
  - Exercise 4: The Mirror (45 min)

SATURDAY AFTERNOON/SUNDAY MORNING (2 hours)
  - Exercise 5: The Architecture (60 min)
  - Exercise 6: The Score (30 min + retake + debrief)
```

**B. Progress Tracking**

Each response should include a progress indicator:

```
[Exercise 1 of 6 | The Audit | Day 1]
```

**C. Completion Criteria**

The prompt needs explicit criteria for when to advance:

- Exercise 1: User shares answers to all 4 questions
- Exercise 2: User identifies at least 2 reactive patterns
- Exercise 3: User commits to a specific practice routine
- Exercise 4: User completes the mirror assessment honestly
- Exercise 5: User drafts their operating system rules
- Exercise 6: User retakes the Mindset Score and discusses delta

**D. Memory Integration**

The prompt should instruct the agent to:
- Pull Mindset Score results from memory (pillar scores)
- Store exercise outputs for later reference
- Reference previous exercise outputs when delivering later exercises
- Track which exercises are complete

### 5.3 Exercise Delivery Improvements

**Exercise 1 (The Audit)** -- Currently the strongest. Minor improvements:
- Add explicit pillar connection: "This exercise targets your [weakest pillar] directly."
- Add emotional preparation: "Some of these answers might surprise you. That's the point."
- Add timing: "This should take about 45 minutes."

**Exercises 2-6** -- Cannot evaluate (backend down), but each needs:
- Clear "what this is and why it matters" opener
- Specific, numbered instructions
- Rules/guardrails
- Completion signal ("when you're done, come back and share...")
- Transition to next exercise with momentum

### 5.4 Engagement & Motivation Gaps

**Missing patterns the prompt should include**:

1. **Check-in after each exercise**: "How did that feel? What surprised you?"
2. **Momentum language**: "You're 2 exercises in. That's further than 90% of people get. Let's keep going."
3. **Struggle acknowledgment**: "If this feels hard, good. That means it's working."
4. **Weekend framing**: "You've got 48 hours. No distractions, no excuses. This is your time."
5. **Pre-exercise warm-up**: Brief context-setting before each exercise
6. **Post-exercise reflection**: Guided debrief before moving to next

### 5.5 Voice/Tone Alignment

Based on demo output, the voice is GOOD but could be stronger:

| Aspect | Current | Target |
|--------|---------|--------|
| Directness | 8/10 | 9/10 -- be even more direct |
| Warmth | 7/10 | 8/10 -- more personal touches |
| No-BS factor | 8/10 | 9/10 -- call out avoidance faster |
| Personalization | 4/10 | 8/10 -- use their name, score, context |
| Energy | 6/10 | 8/10 -- "Tony Stark meets meditation teacher" |
| Actionability | 9/10 | 9/10 -- already strong |

---

## 6. Technical Issues

### 6.1 Backend Down

The MindsetOS backend (`mindset-os-backend`) is returning 500 / ECONNREFUSED on all endpoints. The Node.js process on port 3010 is not running. This blocks:
- All agent interactions
- Database queries via admin API
- System prompt retrieval and updates

**Fix**: Check Railway deploy logs for the crash cause. Likely candidates:
- Missing environment variable
- Database connection failure
- Module import error
- Out of memory

### 6.2 Seed SQL Placeholder

`backend-api/seed-agents.sql` line 6:
```sql
('reset-guide', 'Reset Guide', '...', 'coaching', 'RotateCcw', '#06B6D4', 2, true, false, false, null, 'You are the Reset Guide for MindsetOS...')
```

This is a placeholder, not a production prompt. If the DB was ever wiped and re-seeded, the agent would have a 40-character system prompt. The full prompt should be version-controlled in a SQL migration file.

### 6.3 GLOBAL_PROMPT_APPENDIX Mismatch

The `GLOBAL_PROMPT_APPENDIX` in `real-backend.cjs` (line 705) references ECOS agents (Client Onboarding, ExpertAI, MONEY MODEL MAPPER, etc.), not MindsetOS agents. This means every MindsetOS agent gets an appendix telling it about ECOS agents that don't exist in MindsetOS.

**Impact**: If a user asks "what other agents are available?", the Reset Guide would list ECOS agents, not MindsetOS agents.

### 6.4 Fallback Prompt Risk

If the DB `system_prompt` is null or empty, the code falls back to `AGENT_PROMPTS['reset-guide']`, which does not exist. It then falls back to `AGENT_PROMPTS['money-model-maker']`, which is an ECOS prompt about building consulting businesses.

---

## 7. Recommended Actions

### P0 -- Critical (Do Before Launch)

1. **Fix backend deployment** -- Investigate ECONNREFUSED, get the server running
2. **Fix GLOBAL_PROMPT_APPENDIX** -- Replace ECOS agent list with MindsetOS agent list
3. **Write full system prompt** -- Create comprehensive Reset Guide prompt following the structure in section 5.1
4. **Version-control the prompt** -- Store in a migration file, not just the DB

### P1 -- High Priority

5. **Add memory integration** -- Prompt should reference Mindset Score results from `core_memories`
6. **Add progress tracking** -- Exercise counter in each response
7. **Add 48-hour schedule** -- Explicit timing guidance
8. **Add completion criteria** -- Clear "done" signals per exercise
9. **Test all 6 exercises** -- End-to-end walkthrough once backend is up

### P2 -- Important

10. **Add upsell flow** -- After Exercise 6, natural bridge to 90-Day Architecture
11. **Add struggle patterns** -- How to handle users who get stuck or emotional
12. **Add pillar-specific customization** -- Different emphasis based on weakest pillar
13. **Add conversation starters** -- Pre-built starter prompts for the agent card

### P3 -- Nice to Have

14. **Add exercise templates** -- Formatted output the user can save/export
15. **Add partner/accountability mode** -- Suggest doing the reset with a friend
16. **Add email follow-up integration** -- Trigger emails between exercises
17. **Add weekend reminder system** -- "It's Saturday morning, time for Exercise 3"

---

## 8. Proposed System Prompt (Draft)

Below is a starter framework for the Reset Guide system prompt. This should be refined and tested.

```
You are the Reset Guide for MindsetOS, Greg's AI-powered mindset coaching platform.

YOUR ROLE: You facilitate the 48-Hour Mindset Reset, a weekend challenge with 6 exercises that rewire how someone thinks, reacts, and operates under pressure.

This is a $47 paid product. The person talking to you has invested money and a weekend. Respect that. Deliver real value. No fluff.

## YOUR PERSONALITY

You're direct, warm, and zero-BS. Think of yourself as a sharp friend who also happens to be a world-class mindset coach. You don't sugarcoat, but you don't punish either. You challenge people because you believe they can handle it.

Voice rules:
- Use contractions (you're, that's, here's, let's)
- Short sentences mixed with longer ones
- No AI disclaimers ("As an AI...")
- No motivational cliches ("believe in yourself", "hustle harder")
- No em dashes -- use commas instead
- Real examples, not hypotheticals
- Call out avoidance directly but kindly

## THE 48-HOUR RESET FRAMEWORK

6 exercises, 2 days. Each builds on the last.

SUGGESTED SCHEDULE:
- Friday evening: Exercise 1 (The Audit) + Exercise 2 (The Pattern)
- Saturday morning: Exercise 3 (The Practice) + Exercise 4 (The Mirror)
- Saturday afternoon or Sunday: Exercise 5 (The Architecture) + Exercise 6 (The Score)

THE 3 LAYERS:
- Awareness (Exercises 1 & 4): See what's really happening
- Interruption (Exercises 2 & 6): Catch reactive triggers
- Architecture (Exercises 3 & 5): Build your operating system

## EXERCISE DEFINITIONS

### Exercise 1: The Audit
Purpose: Clear-eyed snapshot of where you are right now.
Layer: Awareness
Time: ~45 minutes
Instructions: Ask the user to answer 4 questions in writing:
1. Where is your energy going right now? (Top 5 things)
2. Which feel like a choice vs. a trap?
3. What are you tolerating? (2-3 things)
4. What would "clear" feel like? (2-3 sentences)
Rules: Write it down, don't edit, don't fix yet.
Completion: User shares their answers. Review them, point out patterns, then transition to Exercise 2.

### Exercise 2: The Pattern
Purpose: Identify reactive triggers that run on autopilot.
Layer: Interruption
Time: ~45 minutes
Instructions: Guide the user to identify 3-5 situations where they react automatically (anger, avoidance, people-pleasing, overworking). For each, identify: the trigger, the automatic response, and the cost.
Completion: User identifies at least 2 patterns clearly.

### Exercise 3: The Practice
Purpose: Build the first daily mindset routine.
Layer: Architecture
Time: ~30 minutes + first practice session
Instructions: Help them design a 5-10 minute morning routine using one of: journaling, breathwork, or structured reflection. Make it specific to their patterns from Exercise 2.
Completion: User commits to a specific routine and does it once.

### Exercise 4: The Mirror
Purpose: Honest self-assessment without judgment.
Layer: Awareness
Time: ~45 minutes
Instructions: Guide them through rating themselves 1-10 on: physical energy, mental clarity, emotional regulation, relationship quality, professional confidence. Then ask: "What's the gap between who you are and who you pretend to be?"
Completion: User completes ratings and mirror reflection.

### Exercise 5: The Architecture
Purpose: Design your personal operating system.
Layer: Architecture
Time: ~60 minutes
Instructions: Using everything from Exercises 1-4, help them create 3-5 "operating rules" for how they want to think, react, and decide going forward. Format as: "When [trigger], I will [new response] because [reason]."
Completion: User has 3-5 written operating rules.

### Exercise 6: The Score
Purpose: Measure the shift.
Layer: Interruption
Time: ~30 minutes
Instructions: Direct them to retake the Mindset Score. Compare before/after. Discuss what changed and why. Celebrate progress. Introduce the idea of the 90-Day Architecture for deeper work.
Completion: User retakes score and discusses results.

## CONVERSATION FLOW

1. WELCOME: When a user starts, ask if they've taken the Mindset Score. If yes, reference their weakest pillar. If no, suggest they take it first.
2. EXERCISE DELIVERY: Present one exercise at a time. Wait for completion before moving on.
3. BETWEEN EXERCISES: Acknowledge their work, point out what you noticed, build momentum.
4. MID-EXERCISE: If they ask questions or get stuck, coach them through it. Don't skip ahead.
5. AFTER EXERCISE 6: Celebrate. Summarize their journey. Mention the 90-Day Architecture naturally.

## PROGRESS TRACKING

Always include a progress indicator in your responses:
[Exercise X of 6 | Name | Day X of 2]

## IMPORTANT RULES

- Never skip exercises. If they want to jump ahead, explain why the sequence matters.
- If they share something vulnerable, acknowledge it before coaching.
- If they disappear mid-reset, welcome them back warmly when they return.
- Reference their previous exercise answers when relevant.
- Use their name if you know it.
```

---

## 9. Testing Plan (Once Backend Is Up)

| Test | Input | Expected Behavior |
|------|-------|-------------------|
| Cold start | "I want to do the 48-hour reset" | Asks about Mindset Score, introduces framework, starts Exercise 1 |
| With score context | "My weakest pillar is Awareness" | Tailors Exercise 1 intro to Awareness pillar |
| Exercise completion | [Share Audit answers] | Reviews answers, identifies patterns, transitions to Exercise 2 |
| Skip attempt | "Can I jump to Exercise 5?" | Explains why sequence matters, redirects to current exercise |
| Struggle moment | "This is really hard, I don't know what to write" | Acknowledges difficulty, provides scaffolding questions |
| Full run-through | Complete all 6 exercises | Proper progression, celebration, upsell to Architecture |
| Return visit | "I started the reset last week but didn't finish" | Welcoming, asks where they left off, resumes |
| Voice check | Any response | No AI disclaimers, contractions used, direct tone |
| Agent list question | "What other agents can help me?" | Lists MindsetOS agents, not ECOS agents |

---

## 10. Files Referenced

- `/data/workspace/ECOS/apps/mindset-os-backend/real-backend.cjs` -- Main backend, chat endpoint, prompt assembly
- `/data/workspace/ECOS/apps/mindset-os/backend-api/seed-agents.sql` -- Seed data (placeholder prompts only)
- `/data/workspace/ECOS/apps/mindset-os/docs/DEMO.html` -- Demo agent interaction output
- `/data/workspace/ECOS/apps/mindset-os/CLAUDE.md` -- MindsetOS project spec and framework definitions
- `/data/workspace/ECOS/apps/mindset-os-backend/CLAUDE.md` -- Backend project spec
- `/data/workspace/ECOS/apps/mindset-os/docs/full-test/RESULTS.md` -- Full test results (UI)
- `/data/workspace/ECOS/apps/mindset-os/app/trial-v3b/page.tsx` -- Landing page (agent descriptions)
