import { Router } from 'express';

const router = Router();

// API v1 routes will be added here
router.get('/', (_req, res) => {
  res.json({
    message: 'ECOS API v1',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      agents: '/api/agents',
      chat: '/api/chat',
      memory: '/api/memory',
      admin: '/api/admin',
      analytics: '/api/analytics',
    },
  });
});

// TODO: Add route imports
// import authRoutes from './auth.routes.js';
// import agentRoutes from './agent.routes.js';
// import chatRoutes from './chat.routes.js';
// import memoryRoutes from './memory.routes.js';
// import adminRoutes from './admin.routes.js';
// import analyticsRoutes from './analytics.routes.js';

// router.use('/auth', authRoutes);
// router.use('/agents', agentRoutes);
// router.use('/chat', chatRoutes);
// router.use('/memory', memoryRoutes);
// router.use('/admin', adminRoutes);
// router.use('/analytics', analyticsRoutes);

export default router;
