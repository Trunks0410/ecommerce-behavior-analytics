# Ecommerce backend

## Redis cache

The backend uses Redis to cache product listing, featured/newest/best-selling/
most-viewed/similar-product, and category read results for 60 seconds. Product
detail responses are not cached because viewing a detail page updates its view
count. If Redis is unavailable, the backend logs the cache error and reads from
the database instead.

Set `REDIS_URL` in the backend environment to enable caching, for example:

```env
REDIS_URL=redis://127.0.0.1:6379
```

Start a Redis server locally (for example, `docker run --name ecommerce-redis -p 6379:6379 -d redis:7-alpine`) before starting the backend. Leaving `REDIS_URL` unset disables Redis caching.
