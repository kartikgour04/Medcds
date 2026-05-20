const NodeCache = require('node-cache');
const logger = require('./logger');

// Always-available in-process cache (no external dependency)
const localCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

let redisClient = null;

const initRedis = async () => {
  if (!process.env.REDIS_URL) return; // Redis is fully optional
  try {
    // Dynamic require — won't crash if 'redis' package not installed
    let redis;
    try { redis = require('redis'); } catch (_) {
      logger.info('redis package not installed — using in-memory cache only');
      return;
    }
    redisClient = redis.createClient({ url: process.env.REDIS_URL });
    redisClient.on('error', (err) => {
      logger.warn(`Redis error, falling back to in-memory cache: ${err.message}`);
      redisClient = null;
    });
    await redisClient.connect();
    logger.info('Redis cache connected');
  } catch (err) {
    logger.warn(`Redis unavailable — using in-memory cache: ${err.message}`);
    redisClient = null;
  }
};

const cache = {
  async get(key) {
    try {
      if (redisClient) {
        const val = await redisClient.get(key);
        return val ? JSON.parse(val) : null;
      }
      const v = localCache.get(key);
      return v === undefined ? null : v;
    } catch {
      return null;
    }
  },

  async set(key, value, ttl = 300) {
    try {
      if (redisClient) {
        await redisClient.setEx(key, ttl, JSON.stringify(value));
      } else {
        localCache.set(key, value, ttl);
      }
    } catch {}
  },

  async del(key) {
    try {
      if (redisClient) await redisClient.del(key);
      else localCache.del(key);
    } catch {}
  },

  async wrap(key, fn, ttl = 300) {
    const cached = await this.get(key);
    if (cached !== null) return cached;
    const result = await fn();
    await this.set(key, result, ttl);
    return result;
  },
};

// Init async — never blocks startup
initRedis().catch(() => {});

module.exports = cache;
