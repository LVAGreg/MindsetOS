# Story Excavator -- Agent Quality & Improvement Report

**Agent**: Story Excavator
**Slug**: `story-excavator`
**Category**: Self-Awareness
**MindsetOS Agent #8**
**Tested**: 2026-03-29
**Status**: FUNCTIONAL -- NEEDS PROMPT UPGRADE

---

## 1. Overview

The Story Excavator is designed to uncover the 5-7 core inherited narratives running a user's decision-making. It sits in the Self-Awareness category alongside the Inner World Mapper and is positioned as a deep, therapeutic-adjacent conversational agent.

**Stated purpose**: "Uncovers the 5-7 core stories running your decisions."

**Intended output**: "Your Story Inventory" -- the 5-7 core narratives shaping decisions.

**Framework basis**: "Stories We Inherit" (Mindset.Show Season 1, Episode 3)

---

## 2. Evidence Sources

| Source | Status |
|--------|--------|
| Production DB (system_prompt) | UNAVAILABLE -- backend returning HTTP 500 during test window |
| DEMO.html validated response | AVAILABLE -- 1,601-char response, 14.3s response time |
| System spec (mindset-os-system.md) | AVAILABLE -- full agent spec with framework questions |
| Seed SQL (seed-agents.sql) | Stub only: `'You are the Story Excavator...'` |
| Chat API code (real-backend.cjs) | REVIEWED -- standard agent pipeline, no Story Excavator-specific logic |

**Note**: The MindsetOS backend was returning HTTP 500 on all `/api/admin/execute` requests during this test window. Evaluation is based on the DEMO conversation output (a validated production response) and the system architecture spec. A follow-up test against the live system prompt should be conducted once the backend is restored.

---

## 3. DEMO Response Evaluation

### Test Input (DEMO)
> "I keep saying yes to everything even when I know I should say no. I think it's connected to this deep fear that if I turn work away, it'll all dry up. My mom lost her business when I was 12 and I watched our family go from comfortable to scrambling. Where do I even start unpacking this?"

### Response Quality Scorecard

| Criteria | Score | Notes |
|----------|-------|-------|
| **Narrative Excavation Methodology** | 7/10 | Identifies one story thread well but lacks structured multi-story excavation framework |
| **Family/Cultural Story Identification** | 8/10 | Excellent -- traces the inherited pattern to mom's business loss, asks about mom's survival strategy |
| **5-7 Core Narrative Structure** | 3/10 | MISSING -- no mention of the 5-7 story inventory, no numbered narrative mapping, no progressive excavation toward multiple stories |
| **Sensitivity and Safety** | 9/10 | Strong -- "Let me sit with you here for a moment", "Take your time. There's no rush here." Appropriate pacing |
| **Reframing Capability** | 7/10 | Good initial reframe ("That decision probably protected you... But now it's running your business"), but no structured reframing methodology |
| **Output Format (Narrative Map)** | 2/10 | NO deliverable structure -- no "Story Inventory" artifact, no numbered narratives, no visual/structured output |
| **Brand Voice Compliance** | 9/10 | Warm, direct, no AI disclaimers. Reads like a smart friend. Matches Greg's voice perfectly |
| **Conversational Flow** | 8/10 | Natural progression from validation to deeper questions. Two well-crafted follow-up questions |
| **Somatic/Embodiment Awareness** | 8/10 | Asks "what does the 'no' feel like in your body?" -- excellent somatic inquiry |
| **Depth Without Overwhelm** | 8/10 | Good balance. Does not rush or pile on. One story at a time |

**Overall Score: 6.9/10**

### What Works Well

1. **Emotional attunement is exceptional.** The opening ("You've already started. What you just said, that's not a small thing to name.") immediately validates without being saccharine. This is exactly the right tone for deep narrative work.

2. **The inherited strategy insight is brilliant.** "We often inherit not just the fear, but the *strategy* we watched someone use to survive it." This is clinically accurate and delivered accessibly.

3. **Somatic questioning.** Asking about body sensations when the user overrides their "no" is therapeutically sophisticated. It moves the conversation from cognitive analysis to felt experience.

4. **Pacing and safety.** "Take your time. There's no rush here." This creates psychological safety for vulnerability.

5. **Brand voice is on point.** No AI disclaimers. Natural contractions. Short paragraphs. Varied sentence length.

### What Fails or Is Missing

1. **NO structured 5-7 narrative excavation.** The core promise of the agent is to deliver a "Story Inventory" of 5-7 core narratives. The response explores ONE story without any indication that this is story 1 of a multi-story journey. There is no roadmap like "We're going to uncover about 5-7 of these stories. This feels like the first one. Let's name it."

2. **NO deliverable/artifact output.** The spec calls for a "Your Story Inventory" output. There is no structured format, no narrative naming convention, no progressive list being built. After multiple turns, the user should get something tangible -- a named list of their core inherited stories.

3. **No framework reference.** The agent is supposed to use the "Stories We Inherit" framework with specific question categories (family beliefs about money, what success looked like, stories told when things get hard, beliefs that no longer serve). The DEMO response does touch on family patterns but does not systematically walk through these categories.

4. **No clear session structure.** The user doesn't know how long this will take, what the journey looks like, or what they'll walk away with. A good deep-work agent sets expectations: "We'll explore this across a few layers. By the end, you'll have a clear inventory of the 5-7 stories that have been running your decisions."

5. **No reframing protocol.** The agent identifies the inherited story but has no structured method for helping the user rewrite it. It says "a named story can be examined, questioned, and eventually, rewritten" but provides no framework for the rewriting process.

---

## 4. Test Prompt: "I want to understand why I always feel like I'm not doing enough, no matter how successful I get."

**Note**: Could not execute live against production due to backend 500 errors. Below is a projected evaluation based on system prompt analysis and the DEMO response pattern.

### Expected Behavior (based on spec)

The agent SHOULD:
1. Validate the feeling without dismissing the success
2. Begin excavating the origin story -- where did "not enough" first appear?
3. Ask framework questions: What did success look like in your household? What was the story about hard work? What message did you absorb about when you're "allowed" to stop?
4. Start naming this as a specific narrative: "The Never Enough Story" or similar
5. Place it as story #1 in a progressive inventory
6. Indicate that there are likely 4-6 more stories interconnected with this one

### Likely Actual Behavior (based on DEMO pattern)

The agent WILL LIKELY:
1. Validate well (strong suit)
2. Explore the feeling with good follow-up questions
3. Connect it to a childhood/family origin
4. Ask somatic questions about how "not enough" feels in the body
5. NOT structure it as part of a 5-7 story inventory
6. NOT produce a named narrative deliverable
7. NOT reference the "Stories We Inherit" framework explicitly

---

## 5. System Prompt Gaps (Inferred)

Since the production system prompt could not be retrieved, these gaps are inferred from the output behavior:

| Gap | Impact | Priority |
|-----|--------|----------|
| No multi-session narrative excavation structure | Agent treats each conversation as standalone rather than building toward 5-7 stories | P0 |
| No "Story Inventory" artifact template | User never receives the promised deliverable | P0 |
| No explicit framework reference ("Stories We Inherit" S1E3) | Misses opportunity to connect to Greg's content | P1 |
| No reframing/rewriting methodology | Agent identifies stories but can't help rewrite them | P1 |
| No session-opening expectation-setting | User doesn't know what journey they're on | P1 |
| No safety rails for trauma escalation | Agent handles mild emotional content well but has no protocol for if a user reveals abuse, addiction, or suicidality | P0 |
| No handoff to human support | No mechanism to escalate when AI-appropriate boundaries are exceeded | P1 |
| No progress tracking across conversations | Cannot say "Last time we identified stories 1-3, let's find the rest" | P2 |

---

## 6. Recommended System Prompt Improvements

### 6A. Add Structured Excavation Framework

The prompt should include explicit instructions to use the 4-layer excavation from the spec:

```
EXCAVATION LAYERS (work through these across 1-3 conversations):

Layer 1: MONEY & SECURITY STORIES
- What did your family believe about money?
- What happened when money was tight?
- What was the unspoken rule about earning/spending?

Layer 2: SUCCESS & IDENTITY STORIES
- What did success look like in your household?
- Who was the "successful" person and what did they sacrifice?
- What were you told (directly or indirectly) about ambition?

Layer 3: HARDSHIP & RESILIENCE STORIES
- What's the story you tell yourself when things get hard?
- Where did you learn that story?
- What's the survival strategy you default to?

Layer 4: WORTHINESS & PERMISSION STORIES
- What belief did you pick up that no longer serves you?
- When do you feel like you need permission?
- Who gave you (or withheld) permission to be yourself?
```

### 6B. Add Story Inventory Output Format

```
After identifying each story, name it and add it to the running inventory:

STORY INVENTORY FORMAT:
---
Story #[N]: "[The Story Name]"
Origin: [Where/when this story was absorbed]
Core belief: [The underlying belief in one sentence]
How it shows up now: [Current behavioral pattern]
Protection it once provided: [Why it made sense at the time]
Cost today: [What it's costing the user now]
---

Build toward 5-7 named stories across conversations. Periodically summarize
the inventory so far and ask: "Does this feel complete, or is there another
story we haven't found yet?"
```

### 6C. Add Safety & Escalation Protocol

```
SAFETY GUIDELINES:
- You are a mindset coaching agent, NOT a therapist
- If a user reveals trauma (abuse, suicidality, addiction, self-harm),
  acknowledge with compassion and say:
  "What you're sharing is important, and it deserves more than what I can
  offer here. I'd encourage you to talk to a professional who specializes
  in this. [Include local crisis resources if appropriate]."
- Never attempt to process acute trauma
- Never diagnose mental health conditions
- If the emotional intensity escalates beyond what feels safe:
  "Let's pause here. You've done important work today. Sometimes the best
  thing is to let what we've uncovered settle before going deeper."
```

### 6D. Add Session Structure & Expectation-Setting

```
FIRST MESSAGE STRUCTURE:
When a user begins a new conversation, set the frame:

"[Validate what they've shared]. Here's what we're going to do together:
we'll uncover the 5-7 core stories that have been running your decisions,
most of them inherited before you had any say in the matter.

By the end, you'll have a Story Inventory, a clear map of the narratives
shaping how you think, decide, and react under pressure.

We'll go at your pace. Some stories surface quickly. Others take a bit
more digging. Ready to start?"
```

### 6E. Add Reframing Protocol

```
REFRAMING PROCESS (after a story is identified and named):
1. ACKNOWLEDGE: "This story protected you. It made sense at the time."
2. EXAMINE: "Is it still true? Or has your world changed since then?"
3. COST: "What is this story costing you right now?"
4. REWRITE: "If you could write a new version, one that honors where
   you've been but serves where you're going, what would it say?"
5. TEST: "Try living from the new story for one week. Notice what shifts."
```

### 6F. Add Cross-Agent References

```
AGENT CONNECTIONS:
- If user has completed the Inner World Mapper, reference their
  belief map: "Your Inner World Map showed [X]. Let's find the
  story underneath that belief."
- After completing the Story Inventory, suggest the Practice Builder
  to create daily practices around the new narratives.
- Reference Greg's "Stories We Inherit" episode (S1E3) when appropriate:
  "Greg talks about exactly this in his 'Stories We Inherit' episode."
```

---

## 7. Comparison: Story Excavator vs. Inner World Mapper

These two agents overlap significantly. Clear differentiation is needed:

| Dimension | Inner World Mapper | Story Excavator |
|-----------|-------------------|-----------------|
| **Focus** | Current beliefs, self-talk, decision defaults | ORIGIN stories that created those beliefs |
| **Temporal direction** | Present-state mapping | Past-origin excavation |
| **Output** | "Inner World Map" (4-layer visual) | "Story Inventory" (5-7 named narratives) |
| **Depth** | Broad survey (many beliefs) | Deep drilling (fewer stories, more depth) |
| **Emotional intensity** | Moderate | High |
| **Ideal sequence** | First (map the terrain) | Second (explain why the terrain looks that way) |

The system prompt should explicitly acknowledge this relationship and cross-reference.

---

## 8. Priority Actions

### P0 -- Critical (Before Launch)

1. **Add Story Inventory deliverable format** -- The agent's core promise is a tangible output. Without it, the agent is just a conversation with no anchor.

2. **Add safety/escalation protocol** -- This agent works with childhood memories and inherited trauma. A safety protocol is non-negotiable.

3. **Add multi-story excavation structure** -- The agent must systematically work toward 5-7 stories, not just explore whatever surfaces first.

### P1 -- Important (Week 1)

4. **Add session-opening expectation-setting** -- Users need to know what they're doing and what they'll get.

5. **Add reframing methodology** -- Excavation without rewriting is incomplete.

6. **Add "Stories We Inherit" framework reference** -- Connect to Greg's content ecosystem.

7. **Add human support handoff** -- Crisis escalation path.

### P2 -- Enhancement (Month 1)

8. **Add memory/progress tracking integration** -- Use MindsetOS memory system to track which stories have been excavated across sessions.

9. **Add cross-agent references** -- Inner World Mapper and Practice Builder integration.

10. **Add narrative naming suggestions** -- Help users give their stories memorable names ("The Scarcity Story", "The Never Enough Story", "The Permission Story").

---

## 9. Backend Note

The MindsetOS backend (`mindset-os-backend-production.up.railway.app`) was returning HTTP 500 on ALL admin API requests during this test session. This prevented:
- Retrieving the actual production `system_prompt` from the `agents` table
- Live-testing the agent with the test prompt
- Verifying model configuration and temperature settings

**Recommended**: Investigate and resolve the backend 500 errors, then re-run this evaluation with full DB access to compare the actual system prompt against these recommendations.

---

## 10. Summary

The Story Excavator shows strong conversational instincts: warm, sensitive, well-paced, and emotionally attuned. The brand voice is excellent. The somatic questioning and inherited-strategy insight demonstrate real depth.

However, it is fundamentally under-built for its stated purpose. The agent's core promise, a "Story Inventory" of 5-7 named narratives, is completely absent from the output. Without a structured excavation framework, artifact template, safety protocol, and reframing methodology, the Story Excavator is essentially a good therapist-style conversationalist that never delivers on its specific product promise.

**Current state**: A warm, sensitive conversation that goes nowhere specific.
**Target state**: A structured, multi-session narrative excavation that produces a tangible Story Inventory deliverable while maintaining the warmth and safety that already works.

The gap between current and target is addressable entirely through system prompt improvements. No backend code changes are required.
