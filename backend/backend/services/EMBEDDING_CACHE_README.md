# Embedding Cache System

## Overview

The Embedding Cache System provides intelligent LRU (Least Recently Used) caching for vector embeddings, dramatically reducing API calls and improving response times for memory retrieval in ECOS.

Inspired by OpenWebUI's caching approach, this implementation offers:
- **LRU eviction policy** for optimal memory usage
- **TTL (Time To Live)** support for cache freshness
- **Optional compression** to reduce memory footprint
- **Automatic cache warming** on startup
- **Real-time statistics** and health monitoring

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Embedding Service                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  1. Check Cache (embeddingCache.get())              │    │
│  │     ↓ HIT → Return cached embedding (instant)        │    │
│  │     ↓ MISS → Continue to generation                 │    │
│  │                                                       │    │
│  │  2. Generate Embedding (Ollama/OpenAI)              │    │
│  │     ↓                                                │    │
│  │  3. Store in Cache (embeddingCache.set())           │    │
│  │     ↓                                                │    │
│  │  4. Return embedding                                 │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    LRU Cache Structure                       │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │  HEAD    │ ←→ │  NODE 2  │ ←→ │  TAIL    │              │
│  │(Most     │    │          │    │(Least    │              │
│  │ Recent)  │    │          │    │ Recent)  │              │
│  └──────────┘    └──────────┘    └──────────┘              │
│       ↑               ↑               ↑                      │
│       │               │               │                      │
│  ┌────┴───────────────┴───────────────┴────┐               │
│  │         Map (key → CacheNode)            │               │
│  └──────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

## Files

### Core Components

1. **`embeddingCache.cjs`** - LRU cache implementation
   - Cache node structure with timestamps and access counts
   - LRU eviction policy
   - Optional gzip compression
   - Periodic cleanup of expired entries
   - Statistics tracking

2. **`embeddingService.cjs`** - Enhanced embedding service
   - Cache-first lookup
   - Automatic cache storage
   - Provider fallback (Ollama → OpenAI)
   - Cache statistics export

3. **`cacheWarmer.cjs`** - Cache warming utility
   - Loads frequent memories on startup
   - Pre-generates embeddings for common queries
   - Periodic refresh capability

4. **`cache.cjs`** (routes) - API endpoints
   - GET `/api/cache/stats` - Cache statistics
   - GET `/api/cache/analytics` - Detailed analytics
   - GET `/api/cache/health` - Health check
   - POST `/api/cache/clear` - Clear cache
   - POST `/api/cache/warm` - Manual warming
   - POST `/api/cache/refresh` - Refresh with latest data

## Configuration

### Environment Variables

Add to `/backend/.env`:

```bash
# Embedding Cache Configuration
EMBEDDING_CACHE_ENABLED=true        # Enable/disable cache
EMBEDDING_CACHE_SIZE=10000          # Maximum entries (default: 10,000)
EMBEDDING_CACHE_TTL=86400           # Time to live in seconds (default: 24h)
EMBEDDING_CACHE_COMPRESS=false      # Enable gzip compression
```

### Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `EMBEDDING_CACHE_ENABLED` | `true` | Master switch for caching |
| `EMBEDDING_CACHE_SIZE` | `10000` | Maximum cache entries |
| `EMBEDDING_CACHE_TTL` | `86400` | Cache entry lifetime (seconds) |
| `EMBEDDING_CACHE_COMPRESS` | `false` | Enable gzip compression |

## Performance Metrics

### Cache Hit Rate Formula

```javascript
hitRate = (hits / (hits + misses)) * 100
```

**Target**: 60-80% hit rate for optimal performance

### Memory Usage Estimates

**Without Compression**:
- Each embedding: ~1,536 floats × 8 bytes = 12KB
- 10,000 entries ≈ 120MB
- SHA-256 keys: ~32 bytes each
- Metadata overhead: ~100 bytes per entry
- **Total**: ~125MB for 10,000 entries

**With Compression** (GZIP):
- Compression ratio: ~3-4x for float arrays
- Each embedding: ~3-4KB compressed
- 10,000 entries ≈ 35-40MB
- **Total**: ~40MB for 10,000 entries
- **Savings**: ~70% memory reduction

### Performance Improvement Projections

Based on typical ECOS usage patterns:

**Scenario 1: Repeated Memory Queries**
- Without cache: ~200-500ms per embedding (API call)
- With cache: ~0.1-1ms (in-memory lookup)
- **Speedup**: 200-5000x faster

**Scenario 2: Conversation Retrieval**
- Typical conversation: 20 memory lookups
- Without cache: 4-10 seconds
- With cache (80% hit rate): 0.8-2 seconds
- **Speedup**: 5-8x faster

**Scenario 3: Daily API Cost Reduction**
- Typical user: 100 embedding requests/day
- Hit rate: 70%
- API calls saved: 70/day per user
- **Cost savings**: 70% reduction in embedding API costs

## API Endpoints

### GET /api/cache/stats

Get current cache statistics.

**Response**:
```json
{
  "success": true,
  "stats": {
    "enabled": true,
    "size": 1247,
    "maxSize": 10000,
    "hits": 8523,
    "misses": 2341,
    "hitRate": "78.44%",
    "evictions": 12,
    "compressionEnabled": false,
    "compressionSavings": "0 Bytes",
    "totalSize": "14.8 MB",
    "uptime": "2h 34m",
    "ttl": "86400s"
  }
}
```

### GET /api/cache/analytics

Get detailed cache analytics with top entries.

**Response**:
```json
{
  "success": true,
  "analytics": {
    "enabled": true,
    "size": 1247,
    "hitRate": "78.44%",
    "topEntries": [
      {
        "key": "a7f3c2d8e9b1f...",
        "age": "1h 23m",
        "accessCount": 45,
        "compressed": false,
        "expired": false
      }
    ]
  }
}
```

### GET /api/cache/health

Check cache health status.

**Response**:
```json
{
  "success": true,
  "health": {
    "status": "healthy",
    "enabled": true,
    "hitRate": "78.44%",
    "size": 1247,
    "maxSize": 10000,
    "warnings": []
  }
}
```

**Health Statuses**:
- `healthy` - Cache operating normally
- `warning` - Low hit rate (<30%) or nearly full (>95%)
- `disabled` - Cache disabled

### POST /api/cache/clear

Clear all cache entries.

**Response**:
```json
{
  "success": true,
  "message": "Cache cleared successfully"
}
```

### POST /api/cache/warm

Manually trigger cache warming.

**Response**:
```json
{
  "success": true,
  "message": "Cache warmed with 156 entries",
  "memoriesLoaded": 156
}
```

### POST /api/cache/refresh

Refresh cache with latest frequent memories.

**Response**:
```json
{
  "success": true,
  "message": "Cache refreshed with 189 entries",
  "memoriesLoaded": 189
}
```

## Usage Examples

### Basic Usage (Automatic)

The cache is transparent to existing code:

```javascript
const { generateEmbedding } = require('./services/embeddingService.cjs');

// Cache is automatically checked and updated
const embedding = await generateEmbedding('User query text');
// First call: MISS → generates embedding → stores in cache
// Second call: HIT → returns cached embedding instantly
```

### Manual Cache Management

```javascript
const {
  getCacheStats,
  getCacheAnalytics,
  clearCache,
  warmCache
} = require('./services/embeddingService.cjs');

// Get statistics
const stats = getCacheStats();
console.log('Hit rate:', stats.hitRate);

// Get detailed analytics
const analytics = getCacheAnalytics();
console.log('Top entries:', analytics.topEntries);

// Clear cache
clearCache();

// Warm cache with custom entries
await warmCache([
  { text: 'Common query 1', embedding: [...], model: 'nomic-embed-text' },
  { text: 'Common query 2', embedding: [...], model: 'nomic-embed-text' }
]);
```

### Cache Warming on Startup

The cache automatically warms on server startup:

```javascript
// In real-backend.cjs server.listen() callback
const { warmCacheOnStartup } = require('./backend/services/cacheWarmer.cjs');
const result = await warmCacheOnStartup();
console.log(`Cache warmed with ${result.memoriesLoaded} entries`);
```

## Cache Warming Strategy

### Startup Warming

1. **Load Recent Memories** (100 most recent with embeddings)
   - Queries `agent_memories` table
   - Orders by `last_accessed DESC, created_at DESC`
   - Pre-loads embeddings for instant retrieval

2. **Common Queries** (future enhancement)
   - Track most frequent user queries
   - Pre-generate embeddings for common patterns

### Periodic Refresh

Schedule daily cache refresh:

```javascript
// Example: Daily refresh at 3 AM
const schedule = require('node-schedule');
const { refreshCache } = require('./backend/services/cacheWarmer.cjs');

schedule.scheduleJob('0 3 * * *', async () => {
  console.log('Running daily cache refresh...');
  await refreshCache();
});
```

## Testing Recommendations

### 1. Unit Tests

```javascript
// Test cache hit/miss behavior
describe('EmbeddingCache', () => {
  it('should return null on cache miss', async () => {
    const result = await embeddingCache.get('nonexistent text');
    expect(result).toBeNull();
  });

  it('should return cached embedding on hit', async () => {
    const text = 'test query';
    const embedding = [0.1, 0.2, 0.3];
    await embeddingCache.set(text, embedding);
    const cached = await embeddingCache.get(text);
    expect(cached).toEqual(embedding);
  });

  it('should evict LRU entry when full', async () => {
    // Fill cache to max size
    // Add one more entry
    // Verify least recently used was evicted
  });
});
```

### 2. Integration Tests

```javascript
// Test end-to-end caching
describe('Embedding Service with Cache', () => {
  it('should use cache for repeated queries', async () => {
    const text = 'repeated query';

    // First call - should miss cache
    const start1 = Date.now();
    const embedding1 = await generateEmbedding(text);
    const time1 = Date.now() - start1;

    // Second call - should hit cache
    const start2 = Date.now();
    const embedding2 = await generateEmbedding(text);
    const time2 = Date.now() - start2;

    expect(embedding1).toEqual(embedding2);
    expect(time2).toBeLessThan(time1 / 10); // 10x faster
  });
});
```

### 3. Load Tests

```javascript
// Test cache performance under load
describe('Cache Performance', () => {
  it('should maintain >60% hit rate under load', async () => {
    const queries = generateTestQueries(1000); // Mix of repeated and unique

    for (const query of queries) {
      await generateEmbedding(query);
    }

    const stats = getCacheStats();
    const hitRate = parseFloat(stats.hitRate);
    expect(hitRate).toBeGreaterThan(60);
  });
});
```

### 4. Memory Tests

```javascript
// Test memory bounds
describe('Cache Memory Management', () => {
  it('should not exceed max size', async () => {
    // Add maxSize + 100 entries
    for (let i = 0; i < 10100; i++) {
      await embeddingCache.set(`query-${i}`, generateRandomEmbedding());
    }

    const stats = getCacheStats();
    expect(stats.size).toBeLessThanOrEqual(10000);
  });
});
```

## Monitoring Dashboard (Future Enhancement)

Create a real-time monitoring dashboard:

```javascript
// Example: Real-time cache metrics
GET /api/cache/metrics
{
  "current": {
    "hitRate": "78.44%",
    "size": 1247,
    "memoryUsage": "14.8 MB"
  },
  "history": {
    "last1h": { "hitRate": "76.2%", "requests": 532 },
    "last24h": { "hitRate": "74.8%", "requests": 8523 }
  },
  "trends": {
    "hitRateTrend": "increasing",
    "evictionRate": "stable"
  }
}
```

## Troubleshooting

### Low Hit Rate (<30%)

**Symptoms**: Cache statistics show <30% hit rate

**Causes**:
- Queries are mostly unique (not repeated)
- TTL too short for query patterns
- Cache size too small for working set

**Solutions**:
1. Increase cache size: `EMBEDDING_CACHE_SIZE=20000`
2. Increase TTL: `EMBEDDING_CACHE_TTL=172800` (48 hours)
3. Review query patterns to identify optimization opportunities

### High Memory Usage

**Symptoms**: Server memory usage higher than expected

**Causes**:
- Cache size too large for available memory
- Compression disabled

**Solutions**:
1. Enable compression: `EMBEDDING_CACHE_COMPRESS=true`
2. Reduce cache size: `EMBEDDING_CACHE_SIZE=5000`
3. Monitor memory usage: `GET /api/cache/stats`

### Cache Not Working

**Symptoms**: Hit rate always 0% or cache disabled

**Causes**:
- Cache disabled in environment
- Cache initialization failed

**Solutions**:
1. Check: `EMBEDDING_CACHE_ENABLED=true` in `.env`
2. Verify no startup errors in logs
3. Test: `GET /api/cache/health`

## Future Enhancements

1. **Redis Backend** - Distributed caching across multiple servers
2. **Semantic Similarity Caching** - Cache similar queries (not just exact matches)
3. **Adaptive TTL** - Adjust TTL based on access patterns
4. **Cache Preloading** - ML-based prediction of likely queries
5. **Persistent Cache** - Survive server restarts
6. **Cache Sharding** - Scale beyond single-server limits

## Performance Benchmarks

### Before Cache Implementation

| Operation | Time | API Calls |
|-----------|------|-----------|
| Single embedding | 200-500ms | 1 |
| 100 embeddings | 20-50s | 100 |
| Conversation retrieval (20 memories) | 4-10s | 20 |
| Daily API cost (100 req/user) | - | 100 |

### After Cache Implementation (70% hit rate)

| Operation | Time | API Calls | Speedup |
|-----------|------|-----------|---------|
| Single embedding (hit) | 0.1-1ms | 0 | 200-5000x |
| Single embedding (miss) | 200-500ms | 1 | 1x |
| 100 embeddings | 6-15s | 30 | 3.3x |
| Conversation retrieval | 0.8-2s | 6 | 5-8x |
| Daily API cost | - | 30 | 70% reduction |

## Conclusion

The Embedding Cache System provides significant performance improvements and cost reductions for ECOS memory retrieval. With proper configuration and monitoring, it can achieve 60-80% hit rates, reducing API costs by 70% and improving response times by 5-8x for typical operations.

For questions or issues, refer to the troubleshooting section or check server logs for cache-related warnings.
