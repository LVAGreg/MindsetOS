/**
 * Cache Management Routes
 * API endpoints for embedding cache statistics and management
 */

const { getCacheStats, getCacheAnalytics, clearCache } = require('../services/embeddingService.cjs');
const { warmCacheOnStartup, refreshCache } = require('../services/cacheWarmer.cjs');

/**
 * Register cache routes
 * @param {Object} pool - PostgreSQL connection pool
 * @param {Function} authenticateToken - JWT authentication middleware
 * @param {Object} corsHeaders - CORS headers object
 */
function registerCacheRoutes(pool, authenticateToken, corsHeaders) {
  return {
    /**
     * GET /api/cache/stats
     * Get cache statistics
     */
    async getStats(req, res) {
      try {
        const stats = getCacheStats();
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          stats
        }));
      } catch (error) {
        console.error('Error getting cache stats:', error);
        res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      }
    },

    /**
     * GET /api/cache/analytics
     * Get detailed cache analytics
     */
    async getAnalytics(req, res) {
      try {
        const analytics = getCacheAnalytics();
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          analytics
        }));
      } catch (error) {
        console.error('Error getting cache analytics:', error);
        res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      }
    },

    /**
     * POST /api/cache/clear
     * Clear the embedding cache
     */
    async clearCache(req, res) {
      try {
        clearCache();
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Cache cleared successfully'
        }));
      } catch (error) {
        console.error('Error clearing cache:', error);
        res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      }
    },

    /**
     * POST /api/cache/warm
     * Manually trigger cache warming
     */
    async warmCache(req, res) {
      try {
        const result = await warmCacheOnStartup();
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: result.success,
          message: result.success
            ? `Cache warmed with ${result.memoriesLoaded} entries`
            : 'Cache warming failed',
          ...result
        }));
      } catch (error) {
        console.error('Error warming cache:', error);
        res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      }
    },

    /**
     * POST /api/cache/refresh
     * Refresh cache with latest data
     */
    async refreshCache(req, res) {
      try {
        const result = await refreshCache();
        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: result.success,
          message: result.success
            ? `Cache refreshed with ${result.memoriesLoaded} entries`
            : 'Cache refresh failed',
          ...result
        }));
      } catch (error) {
        console.error('Error refreshing cache:', error);
        res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      }
    },

    /**
     * GET /api/cache/health
     * Cache health check
     */
    async getHealth(req, res) {
      try {
        const stats = getCacheStats();
        const hitRate = parseFloat(stats.hitRate);

        const health = {
          status: 'healthy',
          enabled: stats.enabled,
          hitRate: stats.hitRate,
          size: stats.size,
          maxSize: stats.maxSize,
          warnings: []
        };

        // Health warnings
        if (!stats.enabled) {
          health.status = 'disabled';
          health.warnings.push('Cache is disabled');
        } else if (hitRate < 30) {
          health.status = 'warning';
          health.warnings.push('Low hit rate (<30%)');
        } else if (stats.size >= stats.maxSize * 0.95) {
          health.status = 'warning';
          health.warnings.push('Cache nearly full (>95%)');
        }

        res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          health
        }));
      } catch (error) {
        console.error('Error checking cache health:', error);
        res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      }
    }
  };
}

module.exports = { registerCacheRoutes };
