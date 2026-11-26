export type RateResult = {
  ok: boolean;
  remaining: number;
  reset: number;
};

export interface RateLimiter {
  consume(key: string, limit: number, windowMs: number): Promise<RateResult>;
}

class MemoryLimiter implements RateLimiter {
  private hits = new Map<string, { count: number; reset: number }>();

  async consume(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<RateResult> {
    const now = Date.now();

    if (this.hits.size > 2_000) {
      for (const [entryKey, entry] of this.hits) {
        if (entry.reset < now) this.hits.delete(entryKey);
      }
    }

    const entry = this.hits.get(key);
    if (!entry || entry.reset < now) {
      const reset = now + windowMs;
      this.hits.set(key, { count: 1, reset });
      return { ok: true, remaining: limit - 1, reset };
    }

    entry.count += 1;
    return {
      ok: entry.count <= limit,
      remaining: Math.max(0, limit - entry.count),
      reset: entry.reset,
    };
  }
}

class RedisLimiter implements RateLimiter {
  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  async consume(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<RateResult> {
    const res = await fetch(`${this.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["PEXPIRE", key, String(windowMs), "NX"],
        ["PTTL", key],
      ]),
      cache: "no-store",
    });

    if (!res.ok) throw new Error(`redis ${res.status}`);

    const data = (await res.json()) as Array<{ result: number }>;
    const count = Number(data[0]?.result ?? 1);
    const ttl = Number(data[2]?.result ?? windowMs);

    return {
      ok: count <= limit,
      remaining: Math.max(0, limit - count),
      reset: Date.now() + (ttl > 0 ? ttl : windowMs),
    };
  }
}

let limiter: RateLimiter | null = null;

export function getLimiter(): RateLimiter {
  if (limiter) return limiter;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    limiter = new RedisLimiter(url, token);
    return limiter;
  }

  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN missing; using per-instance memory",
    );
  }

  limiter = new MemoryLimiter();
  return limiter;
}
