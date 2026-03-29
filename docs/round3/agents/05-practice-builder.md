# MindsetOS Practice Builder Agent -- Quality Evaluation & Improvement Report

**Agent**: Practice Builder (`practice-builder`)
**Category**: Coaching
**Icon**: Dumbbell / Accent: #10B981
**Tested**: 2026-03-29
**Backend**: https://mindset-os-backend-production.up.railway.app (DOWN at time of test -- 500 on all endpoints)
**Data Source**: DEMO.html verified agent response + backend source code analysis

---

## Test Status

**BACKEND OFFLINE** -- The MindsetOS backend returned HTTP 500 on all endpoints during testing, including `/api/health`, `/api/admin/execute`, and the root URL (which served the frontend Next.js app instead). Live agent testing was not possible. This evaluation is based on:

1. The verified agent response in `DEMO.html` (a real prior test run, 27.8s response, 4,133 chars, marked PASS)
2. Backend source code analysis of the chat pipeline (`real-backend.cjs`)
3. The global prompt appendix that gets injected into every agent prompt
4. MindsetOS CLAUDE.md specifications and framework documentation

---

## Test Prompt Used (from DEMO.html)

> "My weakest pillar is Awareness. I have about 10 minutes in the morning before the kids wake up and maybe 5 minutes before bed. I need a daily mindset routine that fits into my real life, not some fantasy schedule. What would you build for me?"

---

## Evaluation Criteria & Scores

### 1. Personalization (asks about schedule, preferences, goals?)

**Score: 7/10 -- GOOD but not conversational**

**Strengths:**
- Respects the exact time constraints provided (10 min morning, 5 min evening)
- Targets the stated weak pillar (Awareness) directly
- Acknowledges "real life, not fantasy" constraint with contextual cues ("Before the kids wake up. Coffee optional, phone face-down mandatory.")
- Adds a zero-cost midday check-in attached to existing habits (smart design)

**Weaknesses:**
- Does NOT ask any clarifying questions before building the routine. A real coaching interaction should probe: What have you tried before? What tends to derail you? Are you a journaler or a mental-only person? Morning person or dragging yourself up?
- Delivers a complete prescriptive routine on first message instead of co-creating
- Assumes journaling/writing is accessible (some people hate writing)
- No mention of the user's business type, stress triggers, or life context beyond kids

**Recommendation:** The agent should ask 2-3 discovery questions BEFORE outputting a full routine. The current behavior feels like a template engine, not a personal coach. First response should gather context, second response should deliver the tailored practice.

---

### 2. Routine Structure (5-10 min, practical, doable)

**Score: 9/10 -- EXCELLENT**

**Strengths:**
- Morning block is exactly 10 minutes with minute-by-minute breakdown (1-2, 3-5, 6-8, 9-10)
- Evening block is exactly 5 minutes with 3 sub-exercises
- Midday check-in requires zero extra time (attached to existing transition moment)
- Total daily time: ~16 minutes (10 + 1 + 5), respects the stated budget
- Each exercise has a clear prompt question -- no ambiguity about what to DO
- Practical anchors: "phone face-down mandatory", "before you pick up your phone"

**Weaknesses:**
- The 10-min morning block has 4 exercises, which might feel rushed for someone new to mindfulness
- No explicit "minimum viable version" for bad days (e.g., "if you only have 3 minutes, do just the Body Scan and One Thing")

**Recommendation:** Add a "bare minimum" fallback for days when the full routine isn't possible. Real life means some mornings the kids wake up early.

---

### 3. Exercise Variety

**Score: 8/10 -- STRONG**

**Strengths:**
- Mix of modalities: body awareness (Body Scan), cognitive (One Thing Intention), pattern recognition (Pattern Check), linguistic anchoring (Awareness Word)
- Evening exercises complement morning ones (Recap mirrors Intention, Awareness Win reinforces Pattern Check, Tomorrow's Seed sets up next morning)
- The midday check-in is a different modality entirely -- a micro-pause, not a structured exercise
- Exercises progress from passive (noticing) to active (naming, setting intention)

**Weaknesses:**
- All exercises are introspective/reflective. No physical or somatic exercises (breathwork, movement, posture check)
- No social/relational exercises (e.g., "notice one conversation where you're reacting today")
- The routine is very cognitive -- could benefit from one embodied practice

**Recommendation:** Include at least one breathwork or body-based element. Even "3 intentional breaths" before the Body Scan would add variety and ground the practice physically.

---

### 4. Progressive Difficulty

**Score: 8/10 -- STRONG**

**Strengths:**
- Includes a 4-week progression plan:
  - Week 1: Just show up (habit formation)
  - Week 2: Add journaling depth
  - Week 3: Connect patterns to business decisions
  - Week 4: Teach it to someone (Feynman technique)
- Progression is realistic -- starts with "even if it feels awkward" (normalizes discomfort)
- The "teach it" step at Week 4 is genuinely advanced and effective for consolidation

**Weaknesses:**
- No guidance for Week 5+. What happens after the initial 4 weeks? The user is left without a next step
- No mention of when/how to adjust the routine as skills develop (e.g., extending the Body Scan, adding new prompts)
- The progression only adds to the routine, never evolves it. By Week 4 you're doing more, not differently
- No integration with the MindsetOS 3-Layer Architecture (Awareness -> Interruption -> Architecture) which would be a natural progression path

**Recommendation:** Add a "Month 2 and beyond" section that transitions from Awareness-focused exercises to Interruption and Architecture layers. This would naturally upsell the 90-Day Architecture Coach program.

---

### 5. Integration with Other MindsetOS Tools

**Score: 4/10 -- WEAK (CRITICAL ISSUE)**

**Strengths:**
- The demo response uses MindsetOS philosophical language ("Mindset is a practice, not a personality. You build it deliberately, like a muscle.")
- References business outcomes (leading clients, catching bad decisions) which connects to the target audience

**Critical Issues:**

**ISSUE 1: GLOBAL_PROMPT_APPENDIX CONTAINS ECOS AGENT NAMES**

The `GLOBAL_PROMPT_APPENDIX` in `real-backend.cjs` (line 705-773) is injected into EVERY agent's system prompt, including Practice Builder. This appendix contains:

```
## ECOS Available Agents (CRITICAL - DO NOT HALLUCINATE)
The ACTUAL agents available in ECOS are:
1. **Client Onboarding** - Sets up your ECOS profile
2. **ExpertAI** - Your main AI assistant
3. **MONEY MODEL MAPPER (5in30)** - Build your business foundation
...
```

This means the Practice Builder agent is explicitly instructed to reference ECOS agents (Client Onboarding, ExpertAI, Money Model Mapper, etc.) instead of MindsetOS agents (Mindset Score, Reset Guide, Architecture Coach, etc.). This is a **P0 contamination bug** that affects every MindsetOS agent.

**ISSUE 2: OpenRouter X-Title Headers Say "ECOS Platform"**

All AI API calls use `'X-Title': 'ECOS Platform'` (lines 3387, 3466, 3753, 4680), not "MindsetOS".

**ISSUE 3: Cross-Agent Context Uses ECOS Language**

Line 8308 contains: `"PREVIOUS WORK WITH OTHER ECOS AGENTS"` -- when MindsetOS users switch between agents, the context injection frame is ECOS-branded.

**ISSUE 4: No Cross-Agent Referrals in Demo Response**

The Practice Builder response does not suggest:
- Taking the Mindset Score first (to baseline which pillar to focus on)
- Using the Accountability Partner for daily streak tracking
- Doing the 48-Hour Reset as a deeper dive
- Using the Inner World Mapper to understand underlying patterns

These would be natural hand-offs that increase platform engagement and guide users through the product ladder.

**ISSUE 5: No Product Ladder Upsell**

The 4-week progression ends without directing users toward the 90-Day Mindset Architecture ($997) or the 48-Hour Reset ($47) as logical next steps.

---

## Brand Voice Assessment

**Score: 8/10 -- STRONG**

**Strengths:**
- Direct, practical tone ("Sit down. Close your eyes.")
- Good use of short sentences mixed with explanatory ones
- Uses contractions naturally ("You can't lead your day if you don't know where you're starting from")
- Addresses the user as "you" throughout
- No AI disclaimers or robotic hedging
- The closing is punchy: "Start tomorrow morning. Ten minutes. One question. That's it."

**Weaknesses:**
- The title format "YOUR DAILY AWARENESS PRACTICE, Mindset Builder" uses a format name tag that feels templated
- Some sections are slightly too long/explanatory for the "coffee chat" voice (the "WHY AWARENESS FIRST" section runs 4 sentences when 2 would land harder)
- Missing the slightly nerdy/sharp personality edge. Reads more like a wellness app than "Tony Stark meets a meditation teacher"

**Note:** The GLOBAL_PROMPT_APPENDIX has a punctuation rule banning em dashes ("Never use em dashes") but the demo response title uses one ("YOUR DAILY AWARENESS PRACTICE -- Mindset Builder"). The agent may be inconsistently following this rule, or the demo predates it.

---

## Summary of Findings

| Criteria | Score | Status |
|----------|-------|--------|
| Personalization | 7/10 | GOOD -- delivers without asking, needs discovery phase |
| Routine Structure | 9/10 | EXCELLENT -- minute-by-minute, practical, time-respecting |
| Exercise Variety | 8/10 | STRONG -- cognitive variety, missing somatic/physical |
| Progressive Difficulty | 8/10 | STRONG -- 4-week plan, missing long-term progression |
| MindsetOS Integration | 4/10 | WEAK -- ECOS contamination, no cross-agent referrals |
| Brand Voice | 8/10 | STRONG -- natural and direct, slightly templated |
| **Overall** | **7.3/10** | **GOOD with critical integration bugs** |

---

## Priority Improvements

### P0 -- CRITICAL (Blocks MindsetOS identity)

1. **Replace GLOBAL_PROMPT_APPENDIX with MindsetOS agent list**
   - File: `real-backend.cjs` lines 705-773
   - Replace all ECOS agent references with MindsetOS agents (Mindset Score, Reset Guide, Architecture Coach, Inner World Mapper, Practice Builder, Decision Framework, Accountability Partner, Story Excavator, Conversation Curator, Launch Companion)
   - Replace "ECOS" references with "MindsetOS"
   - Replace "Rana" references with "Greg"
   - This affects ALL 10 agents, not just Practice Builder

2. **Fix X-Title headers in OpenRouter calls**
   - Lines 3387, 3466, 3753, 4123, 4680
   - Change `'X-Title': 'ECOS Platform'` to `'X-Title': 'MindsetOS Platform'`

3. **Fix cross-agent context framing**
   - Line 8308: Change "PREVIOUS WORK WITH OTHER ECOS AGENTS" to "PREVIOUS WORK WITH OTHER MINDSETOS AGENTS"

### P1 -- HIGH (Agent quality)

4. **Add discovery phase to Practice Builder prompt**
   - System prompt should instruct the agent to ask 2-3 intake questions before building a routine:
     - What's your current morning/evening situation? (time, environment, household)
     - Have you tried any practices before? What stuck, what didn't?
     - Do you prefer writing, mental exercises, movement, or breathing?
   - Only build the full routine after gathering context

5. **Add cross-agent referrals to Practice Builder prompt**
   - After delivering a routine, suggest: "Want to baseline your pillars first? Try the Mindset Score."
   - After the 4-week plan: "Ready to go deeper? The 90-Day Architecture cohort builds on everything you've started here."
   - When patterns surface: "The Inner World Mapper can help you dig into why that pattern keeps showing up."

### P2 -- MEDIUM (Routine quality)

6. **Add breathwork/somatic element**
   - Include at least one physical exercise (3-breath anchor, posture check, or 30-second movement)
   - Adds variety and grounds the practice for people who aren't naturally introspective

7. **Add "minimum viable practice" fallback**
   - Include a 3-minute emergency version for disrupted mornings
   - Shows the agent understands real life has unpredictable days

8. **Extend progression beyond Week 4**
   - Add Month 2+: transition from Awareness to Interruption layer exercises
   - Add Month 3+: transition to Architecture layer (designing responses, not just noticing)
   - This maps directly to the MindsetOS 3-Layer Architecture framework

### P3 -- LOW (Polish)

9. **Sharpen brand voice**
   - Add more personality to exercise descriptions (the "Tony Stark meets meditation teacher" energy is underrepresented)
   - Tighten the "WHY AWARENESS FIRST" section to 2 punchy sentences

10. **Add tracking mechanism**
    - Suggest a simple tracking method (streak marks, simple journal, or using the Accountability Partner agent)
    - Connects the practice to measurable progress

---

## Backend Health Issue

**The MindsetOS backend (mindset-os-backend-production.up.railway.app) returned HTTP 500 on all endpoints during this test.** This prevented:
- Querying the production database for the actual `system_prompt` content
- Live-testing the agent with the test prompt
- Verifying what model the agent is currently using
- Checking if the agent has any behavior_prefix, behavior_suffix, or response_modifiers configured

**Action Required:** Investigate and restore the MindsetOS backend service on Railway before proceeding with agent prompt improvements.

---

## Recommended System Prompt Structure (for when DB access is restored)

When the backend is accessible, the Practice Builder system prompt should follow this structure:

```
IDENTITY: Practice Builder for MindsetOS
PURPOSE: Creates personalized 5-10 minute daily mindset routines

PHASE 1 - DISCOVERY (First message):
- Ask about time availability (morning, midday, evening)
- Ask about past practice experience (what stuck, what didn't)
- Ask about preference: writing, thinking, breathing, movement
- Ask about their Mindset Score results (if they've taken it)

PHASE 2 - BUILD (After gathering context):
- Design minute-by-minute routine fitting their stated constraints
- Mix exercise types (cognitive, somatic, reflective)
- Include a "bare minimum" 3-minute fallback
- Tie exercises to their weakest pillar(s)

PHASE 3 - PROGRESSION:
- Week 1-2: Habit formation (just show up)
- Week 3-4: Deepen and connect to business decisions
- Month 2: Transition from Awareness to Interruption exercises
- Month 3: Introduce Architecture layer
- Suggest 90-Day Architecture Coach for structured support

CROSS-AGENT REFERRALS:
- Mindset Score: baseline assessment
- Accountability Partner: streak tracking
- Inner World Mapper: pattern deep-dive
- Reset Guide: intensive weekend reset
```

---

**Report by**: Claude Agent (code analysis + DEMO.html evaluation)
**Next step**: Restore backend, query actual system_prompt, and implement P0 fixes before any agent-level changes
