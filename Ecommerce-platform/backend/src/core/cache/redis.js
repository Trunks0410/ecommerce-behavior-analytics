import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL;
const redisClient = redisUrl ? createClient({ url: redisUrl }) : null;

// In-memory TTL cache fallback khi chưa cài/chạy Redis (giới hạn tối đa 150 keys ~ 3MB RAM)
const MAX_MEMORY_CACHE_KEYS = 150;
const memoryCache = new Map();

const getMemoryCache = (key) => {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  try {
    return JSON.parse(entry.json);
  } catch {
    memoryCache.delete(key);
    return null;
  }
};

const setMemoryCache = (key, value, ttlSeconds) => {
  if (memoryCache.size >= MAX_MEMORY_CACHE_KEYS) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey !== undefined) memoryCache.delete(oldestKey);
  }
  try {
    memoryCache.set(key, {
      json: JSON.stringify(value),
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  } catch {
    // Ignore unserializable values
  }
};

redisClient?.on("error", (error) => {
  console.error("Redis client error:", error.message);
});

export const initializeRedis = () => {
  if (!redisClient) {
    console.info("In-memory cache enabled (REDIS_URL is not configured).");
    return;
  }

  redisClient
    .connect()
    .then(() => console.info("Redis cache connected successfully."))
    .catch((error) => {
      console.error("Failed to connect to Redis; cache reads will use the database:", error.message);
    });
};

export const getOrSetCache = async (key, loadValue, ttlSeconds = 60) => {
  const cacheKey = `ecommerce:${key}`;

  if (!redisClient?.isReady) {
    const memHit = getMemoryCache(cacheKey);
    if (memHit !== null) {
      return memHit;
    }
    const value = await loadValue();
    setMemoryCache(cacheKey, value, ttlSeconds);
    return value;
  }

  let cachedValue;

  try {
    cachedValue = await redisClient.get(cacheKey);
  } catch (error) {
    console.error("Redis cache read failed:", error.message);
    return loadValue();
  }

  if (cachedValue !== null) {
    try {
      return JSON.parse(cachedValue);
    } catch (error) {
      console.error("Redis cache value is invalid JSON:", error.message);
    }
  }

  const value = await loadValue();

  try {
    await redisClient.set(cacheKey, JSON.stringify(value), { EX: ttlSeconds });
  } catch (error) {
    console.error("Redis cache write failed:", error.message);
  }

  return value;
};
