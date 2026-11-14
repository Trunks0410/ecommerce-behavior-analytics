import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL;
const redisClient = redisUrl ? createClient({ url: redisUrl }) : null;

redisClient?.on("error", (error) => {
  console.error("Redis client error:", error.message);
});

export const initializeRedis = () => {
  if (!redisClient) {
    console.info("Redis cache is disabled because REDIS_URL is not configured.");
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
  if (!redisClient?.isReady) {
    return loadValue();
  }

  const cacheKey = `ecommerce:${key}`;
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
