# MindsetOS Backend API

Node.js backend for MindsetOS — AI-powered mindset coaching platform.

## Deployment

Deployed on Railway with:
- PostgreSQL + pgvector
- 10 AI agents
- Memory pipeline with vector similarity search
- SSE streaming for real-time chat

## Environment Variables

```
DATABASE_URL=          # Railway Postgres connection string
OPENAI_API_KEY=        # OpenAI API key
OPENROUTER_API_KEY=    # OpenRouter for multi-model support
JWT_SECRET=            # JWT signing secret
ADMIN_SECRET=          # Admin API authentication
STRIPE_SECRET_KEY=     # Stripe payments
SMTP_*=                # Email configuration
```

## Start

```bash
npm install
node real-backend.cjs
```
