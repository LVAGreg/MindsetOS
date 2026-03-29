/**
 * Embedding Cache Service
 * LRU cache for embeddings with TTL, compression, and memory-efficient storage
 * Inspired by OpenWebUI's caching approach
 */

const crypto = require('crypto');
const zlib = require('zlib');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

// Configuration from environment
const CACHE_ENABLED = process.env.EMBEDDING_CACHE_ENABLED !== 'false'; // Default: true
const CACHE_SIZE = parseInt(process.env.EMBEDDING_CACHE_SIZE || '10000', 10);
const CACHE_TTL = parseInt(process.env.EMBEDDING_CACHE_TTL || '86400', 10) * 1000; // Convert seconds to ms
const CACHE_COMPRESS = process.env.EMBEDDING_CACHE_COMPRESS === 'true'; // Default: false

/**
 * LRU Cache Node
 */
class CacheNode {
  constructor(key, value, compressed = false) {
    this.key = key;
    this.value = value;
    this.compressed = compressed;
    this.timestamp = Date.now();
    this.accessCount = 1;
    this.prev = null;
    this.next = null;
  }

  isExpired() {
    return Date.now() - this.timestamp > CACHE_TTL;
  }

  getAge() {
    return Date.now() - this.timestamp;
  }
}

/**
 * LRU Cache Implementation
 */
class EmbeddingCache {
  constructor(maxSize = CACHE_SIZE) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.head = null; // Most recently used
    this.tail = null; // Least recently used

    // Statistics
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      compressionSavings: 0,
      totalSize: 0,
      startTime: Date.now()
    };

    // Start periodic cleanup
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Every minute

    console.log(`📦 Embedding Cache initialized: size=${maxSize}, TTL=${CACHE_TTL}ms, compress=${CACHE_COMPRESS}`);
  }

  /**
   * Generate cache key from text content
   */
  static generateKey(text, model = 'default') {
    const hash = crypto.createHash('sha256');
    hash.update(`${model}:${text}`);
    return hash.digest('hex');
  }

  /**
   * Compress embedding vector
   */
  async compress(embedding) {
    if (!CACHE_COMPRESS) return embedding;

    try {
      const buffer = Buffer.from(JSON.stringify(embedding));
      const compressed = await gzip(buffer);

      this.stats.compressionSavings += (buffer.length - compressed.length);

      return compressed;
    } catch (error) {
      console.error('Compression failed:', error);
      return embedding;
    }
  }

  /**
   * Decompress embedding vector
   */
  async decompress(compressed) {
    if (!CACHE_COMPRESS) return compressed;

    try {
      if (Buffer.isBuffer(compressed)) {
        const decompressed = await gunzip(compressed);
        return JSON.parse(decompressed.toString());
      }
      return compressed; // Already decompressed
    } catch (error) {
      console.error('Decompression failed:', error);
      return compressed;
    }
  }

  /**
   * Move node to head (most recently used)
   */
  moveToHead(node) {
    if (node === this.head) return;

    // Remove from current position
    if (node.prev) node.prev.next = node.next;
    if (node.next) node.next.prev = node.prev;
    if (node === this.tail) this.tail = node.prev;

    // Move to head
    node.prev = null;
    node.next = this.head;
    if (this.head) this.head.prev = node;
    this.head = node;

    // Set tail if this is the first node
    if (!this.tail) this.tail = node;
  }

  /**
   * Remove tail (least recently used)
   */
  removeTail() {
    if (!this.tail) return null;

    const removed = this.tail;
    this.cache.delete(removed.key);
    this.stats.evictions++;

    if (this.tail.prev) {
      this.tail = this.tail.prev;
      this.tail.next = null;
    } else {
      this.head = null;
      this.tail = null;
    }

    return removed;
  }

  /**
   * Get embedding from cache
   */
  async get(text, model = 'default') {
    if (!CACHE_ENABLED) return null;

    const key = EmbeddingCache.generateKey(text, model);
    const node = this.cache.get(key);

    if (!node) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (node.isExpired()) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Move to head (most recently used)
    node.accessCount++;
    this.moveToHead(node);
    this.stats.hits++;

    // Decompress if needed
    const embedding = await this.decompress(node.value);

    return embedding;
  }

  /**
   * Set embedding in cache
   */
  async set(text, embedding, model = 'default') {
    if (!CACHE_ENABLED) return;

    const key = EmbeddingCache.generateKey(text, model);

    // Check if already exists
    if (this.cache.has(key)) {
      const node = this.cache.get(key);
      node.value = await this.compress(embedding);
      node.timestamp = Date.now();
      node.compressed = CACHE_COMPRESS;
      this.moveToHead(node);
      return;
    }

    // Compress if enabled
    const value = await this.compress(embedding);

    // Create new node
    const node = new CacheNode(key, value, CACHE_COMPRESS);
    this.cache.set(key, node);
    this.moveToHead(node);

    // Evict if over size
    if (this.cache.size > this.maxSize) {
      this.removeTail();
    }

    // Update size stats
    this.updateSizeStats();
  }

  /**
   * Check if embedding exists in cache
   */
  has(text, model = 'default') {
    if (!CACHE_ENABLED) return false;

    const key = EmbeddingCache.generateKey(text, model);
    const node = this.cache.get(key);

    return node && !node.isExpired();
  }

  /**
   * Clear entire cache
   */
  clear() {
    this.cache.clear();
    this.head = null;
    this.tail = null;
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.evictions = 0;
    this.stats.compressionSavings = 0;
    this.stats.totalSize = 0;
    console.log('🗑️  Embedding cache cleared');
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    if (!CACHE_ENABLED) return;

    let removed = 0;
    const keysToRemove = [];

    for (const [key, node] of this.cache.entries()) {
      if (node.isExpired()) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      const node = this.cache.get(key);
      this.cache.delete(key);

      // Remove from linked list
      if (node.prev) node.prev.next = node.next;
      if (node.next) node.next.prev = node.prev;
      if (node === this.head) this.head = node.next;
      if (node === this.tail) this.tail = node.prev;

      removed++;
    }

    if (removed > 0) {
      console.log(`🧹 Cleaned up ${removed} expired cache entries`);
      this.updateSizeStats();
    }
  }

  /**
   * Update size statistics
   */
  updateSizeStats() {
    let totalSize = 0;

    for (const node of this.cache.values()) {
      if (Buffer.isBuffer(node.value)) {
        totalSize += node.value.length;
      } else if (Array.isArray(node.value)) {
        totalSize += node.value.length * 8; // Approximate 8 bytes per float
      }
    }

    this.stats.totalSize = totalSize;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
    const uptime = Date.now() - this.stats.startTime;

    return {
      enabled: CACHE_ENABLED,
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: hitRate.toFixed(2) + '%',
      evictions: this.stats.evictions,
      compressionEnabled: CACHE_COMPRESS,
      compressionSavings: this.formatBytes(this.stats.compressionSavings),
      totalSize: this.formatBytes(this.stats.totalSize),
      uptime: this.formatUptime(uptime),
      ttl: CACHE_TTL / 1000 + 's'
    };
  }

  /**
   * Get detailed cache analytics
   */
  getAnalytics() {
    const stats = this.getStats();
    const entries = [];

    for (const [key, node] of this.cache.entries()) {
      entries.push({
        key: key.substring(0, 16) + '...',
        age: this.formatUptime(node.getAge()),
        accessCount: node.accessCount,
        compressed: node.compressed,
        expired: node.isExpired()
      });
    }

    // Sort by access count (most frequently accessed first)
    entries.sort((a, b) => b.accessCount - a.accessCount);

    return {
      ...stats,
      topEntries: entries.slice(0, 10)
    };
  }

  /**
   * Format bytes for display
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Format uptime for display
   */
  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Warm cache with common queries
   */
  async warm(entries) {
    if (!CACHE_ENABLED) return;

    console.log(`🔥 Warming cache with ${entries.length} entries...`);
    let warmed = 0;

    for (const { text, embedding, model } of entries) {
      if (text && embedding) {
        await this.set(text, embedding, model);
        warmed++;
      }
    }

    console.log(`✅ Cache warmed with ${warmed} entries`);
  }

  /**
   * Cleanup on shutdown
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
    console.log('🛑 Embedding cache destroyed');
  }
}

// Create singleton instance
const embeddingCache = new EmbeddingCache();

// Cleanup on process exit
process.on('SIGINT', () => {
  embeddingCache.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  embeddingCache.destroy();
  process.exit(0);
});

module.exports = {
  embeddingCache,
  EmbeddingCache
};
