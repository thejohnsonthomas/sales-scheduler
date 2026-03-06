import { LRUCache } from 'lru-cache';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const cache = new LRUCache<string, { slots: unknown[]; timestamp: number }>({
  max: 500,
  ttl: CACHE_TTL_MS,
});

export function getCacheKey(
  aeId: string,
  segmentId: string,
  regionId: string,
  startDate: string,
  endDate: string,
  duration: number
): string {
  return `avail:${aeId}:${segmentId}:${regionId}:${startDate}:${endDate}:${duration}`;
}

export function getCachedSlots(key: string): unknown[] | null {
  const cached = cache.get(key);
  if (!cached) return null;
  return cached.slots;
}

export function setCachedSlots(key: string, slots: unknown[]): void {
  cache.set(key, { slots, timestamp: Date.now() });
}

export function invalidateAvailability(aeId?: string, segmentId?: string, regionId?: string): void {
  if (!aeId && !segmentId && !regionId) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (aeId && key.includes(aeId)) cache.delete(key);
    else if (segmentId && key.includes(segmentId)) cache.delete(key);
    else if (regionId && key.includes(regionId)) cache.delete(key);
  }
}
