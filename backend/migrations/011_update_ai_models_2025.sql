-- Migration: Update AI Models with 2025 Data
-- Description: Updates ai_models table with current models from OpenRouter
-- Date: 2025-01-10

-- Clear existing models to avoid conflicts
TRUNCATE TABLE ai_models RESTART IDENTITY CASCADE;

-- Insert updated AI models with 2025 pricing and specifications
INSERT INTO ai_models (model_id, model_name, provider, description, context_length, pricing_prompt, pricing_completion, metadata) VALUES

-- Anthropic Models (Claude 4.5 Series - Latest)
('anthropic/claude-sonnet-4.5', 'Claude Sonnet 4.5', 'Anthropic', 'Most advanced Claude model optimized for real-world agents and coding workflows', 1000000, 0.00000300, 0.00001500, '{"features": ["agents", "coding", "reasoning"], "release_date": "2025-01"}'),
('anthropic/claude-3.5-sonnet', 'Claude 3.5 Sonnet', 'Anthropic', 'Balanced performance and cost for general tasks', 200000, 0.00000300, 0.00001500, '{"features": ["general-purpose", "balanced"], "release_date": "2024"}'),
('anthropic/claude-3.5-haiku', 'Claude 3.5 Haiku', 'Anthropic', 'Fastest and most cost-effective Claude model', 200000, 0.00000025, 0.00000125, '{"features": ["speed", "cost-effective"], "release_date": "2024"}'),
('anthropic/claude-haiku-4.5', 'Claude Haiku 4.5', 'Anthropic', 'Latest fast and affordable model', 200000, 0.00000010, 0.00000050, '{"features": ["speed", "affordable"], "release_date": "2025"}'),

-- OpenAI Models (GPT-5 Series - Latest)
('openai/gpt-5', 'GPT-5 Pro', 'OpenAI', 'Most advanced GPT model with improvements in reasoning, math, and coding', 400000, 0.00001500, 0.00012000, '{"features": ["reasoning", "math", "coding"], "release_date": "2025-01"}'),
('openai/gpt-5-image', 'GPT-5 Image', 'OpenAI', 'Multimodal model supporting text and image generation', 400000, 0.00001000, 0.00001000, '{"features": ["multimodal", "image-generation"], "release_date": "2025-01"}'),
('openai/gpt-4o', 'GPT-4o', 'OpenAI', 'Flagship GPT-4 model with broad capabilities', 128000, 0.00000250, 0.00001000, '{"features": ["general-purpose", "reliable"], "release_date": "2024"}'),
('openai/gpt-4o-mini', 'GPT-4o Mini', 'OpenAI', 'Fast and affordable GPT-4 class model', 128000, 0.00000015, 0.00000060, '{"features": ["speed", "cost-effective"], "release_date": "2024"}'),

-- Google Models (Gemini 2.5 Series - Latest)
('google/gemini-2.5-flash', 'Gemini 2.5 Flash', 'Google', 'State-of-the-art workhorse model with excellent speed and quality', 1048576, 0.00000030, 0.00000250, '{"features": ["speed", "quality", "long-context"], "release_date": "2025-01"}'),
('google/gemini-2.0-flash-exp', 'Gemini 2.0 Flash Experimental', 'Google', 'Free experimental model for testing', 1048576, 0.00000000, 0.00000000, '{"features": ["free", "experimental"], "release_date": "2024"}'),
('google/gemini-pro-1.5', 'Gemini Pro 1.5', 'Google', 'Advanced reasoning and long context capabilities', 2097152, 0.00000125, 0.00000500, '{"features": ["reasoning", "ultra-long-context"], "release_date": "2024"}'),

-- Meta Models (Llama 3.3 Series)
('meta-llama/llama-3.3-70b-instruct', 'Llama 3.3 70B Instruct', 'Meta', 'Open-source instruction-tuned model', 128000, 0.00000020, 0.00000020, '{"features": ["open-source", "instruction-following"], "release_date": "2024"}'),
('meta-llama/llama-3.1-405b-instruct', 'Llama 3.1 405B Instruct', 'Meta', 'Largest open-source instruction model', 128000, 0.00000280, 0.00000280, '{"features": ["open-source", "large-scale"], "release_date": "2024"}'),

-- Qwen Models (Qwen3 Series - Latest)
('qwen/qwen3-max', 'Qwen3 Max', 'Qwen', 'Improved reasoning and instruction following', 256000, 0.00000120, 0.00000600, '{"features": ["reasoning", "multilingual"], "release_date": "2025"}'),
('qwen/qwen2.5-72b-instruct', 'Qwen 2.5 72B Instruct', 'Qwen', 'Strong open-source alternative', 128000, 0.00000090, 0.00000090, '{"features": ["open-source", "multilingual"], "release_date": "2024"}'),

-- Mistral Models
('mistralai/mistral-large', 'Mistral Large', 'Mistral AI', 'Flagship model with strong reasoning', 128000, 0.00000300, 0.00000900, '{"features": ["reasoning", "european"], "release_date": "2024"}'),
('mistralai/ministral-8b', 'Ministral 8B', 'Mistral AI', 'Compact and efficient model', 128000, 0.00000010, 0.00000010, '{"features": ["compact", "efficient"], "release_date": "2024"}'),

-- DeepSeek Models
('deepseek/deepseek-chat', 'DeepSeek Chat', 'DeepSeek', 'Cost-effective Chinese model with strong performance', 64000, 0.00000014, 0.00000028, '{"features": ["cost-effective", "chinese"], "release_date": "2024"}'),
('deepseek/deepseek-r1', 'DeepSeek R1', 'DeepSeek', 'Reasoning-focused model', 64000, 0.00000055, 0.00000219, '{"features": ["reasoning", "cost-effective"], "release_date": "2025"}'),

-- Perplexity Models
('perplexity/llama-3.1-sonar-large-128k-online', 'Llama 3.1 Sonar Large Online', 'Perplexity', 'Real-time online search capabilities', 128000, 0.00000100, 0.00000100, '{"features": ["online-search", "real-time"], "release_date": "2024"}'),

-- X.AI Models
('x-ai/grok-2-vision', 'Grok 2 Vision', 'X.AI', 'Multimodal model with vision capabilities', 32000, 0.00000200, 0.00001000, '{"features": ["multimodal", "vision"], "release_date": "2024"}');

-- Update the last_updated timestamp
UPDATE ai_models SET last_updated = CURRENT_TIMESTAMP;

-- Verify insertion
SELECT
  provider,
  COUNT(*) as model_count,
  MIN(pricing_prompt) as min_prompt_price,
  MAX(pricing_completion) as max_completion_price
FROM ai_models
GROUP BY provider
ORDER BY provider;

-- Show all models for verification
SELECT
  model_id,
  model_name,
  provider,
  context_length,
  pricing_prompt,
  pricing_completion,
  metadata->>'release_date' as release_date
FROM ai_models
ORDER BY provider, model_name;
