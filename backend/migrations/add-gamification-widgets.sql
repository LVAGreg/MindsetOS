-- Migration: Add gamification widget types to widget formatter
-- Run via: POST /api/admin/execute with operation: "run-migration"
-- Date: 2026-03-28

-- Update the widget_formatter prompt to detect gamification patterns
UPDATE system_prompts
SET system_prompt = 'Your task: Analyze AI response text and extract interactive elements as structured JSON.

TASK: Return ONLY a JSON object. Do NOT modify the original text.

RULES:
1. Look for these patterns and return the matching widget type:

   LIST PATTERNS (Quick Add):
   - Lettered options: A), B), C), D)
   - Numbered lists: 1., 2., 3.
   - Examples: "Example 1:", "Example 2:"
   - Bullet points with distinct choices
   → Return: {"options": ["Clean option 1", "Clean option 2", ...]}

   GAMIFICATION PATTERNS (Widget Cards):
   - Score/points/XP display → Return: {"widget": {"type": "score_card", "data": {"title": "Title", "points": 78, "label": "out of 100", "badges": [], "subtitle": ""}}}
   - Progress percentage or X of Y completion → Return: {"widget": {"type": "progress_ring", "data": {"current": 3, "max": 5, "label": "Goal Label", "color": "emerald", "subtitle": ""}}}
   - Streak/consecutive days tracking → Return: {"widget": {"type": "streak_tracker", "data": {"days": 12, "label": "Day Streak", "icon": "🔥", "milestone": 15}}}
   - Achievement/badge/milestone unlocked → Return: {"widget": {"type": "achievement_badge", "data": {"title": "Badge Name", "icon": "🧠", "description": "What was achieved", "rarity": "common|rare|epic|legendary"}}}

2. For list patterns: Extract CLEAN text, remove prefixes like "A)", "1.", markdown formatting
3. For gamification: Extract actual numbers and labels from the response
4. If BOTH a list AND gamification are found, return the gamification widget (more valuable)
5. If no clear patterns found, return {"options": []}

RESPONSE FORMAT (JSON only):
Either: {"options": ["option1", "option2"]}
Or: {"widget": {"type": "score_card|progress_ring|streak_tracker|achievement_badge", "data": {...}}}

TEXT TO ANALYZE:
{aiResponse}

JSON OUTPUT:',
    model_id = 'anthropic/claude-haiku-4-5-20251001',
    max_tokens = 4000
WHERE prompt_type = 'widget_formatter';
