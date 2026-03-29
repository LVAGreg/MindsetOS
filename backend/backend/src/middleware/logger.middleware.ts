import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export const loggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();

  // Log request
  logger.info(`→ ${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;

    logger.info(`← ${req.method} ${req.path} ${res.statusCode}`, {
      duration: `${duration}ms`,
      contentLength: res.get('content-length'),
    });
  });

  next();
};
