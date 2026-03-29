# MindsetOS Backend API

Backend server for MindsetOS. Contains the API server, routes, services, and database migrations.

## Setup
```bash
npm install
node real-backend.cjs
```

## Environment Variables
- DATABASE_URL — PostgreSQL connection string
- OPENAI_API_KEY — OpenAI API key
- OPENROUTER_API_KEY — OpenRouter API key  
- JWT_SECRET — JWT signing secret
- ADMIN_SECRET — Admin API secret
- CORS_ORIGIN — Allowed frontend origin
- PORT — Server port (default 3001)

## Deployment
Deployed on Railway: https://mindset-os-backend-production.up.railway.app

