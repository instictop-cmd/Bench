import type { MetadataRoute } from "next";

const base =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://bench-sepia.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    { path: "", priority: 1, changeFrequency: "weekly" as const },
    { path: "/play", priority: 0.9, changeFrequency: "monthly" as const },
    { path: "/campus", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/quest/op-01", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/quest/an-01", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/boss/op-boss", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/boss/an-boss", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/flow/fl-01", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/flow/fl-02", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/flow/fl-03", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/flow/fl-04", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/flow/fl-05", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/boss/ru-boss", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/privacy", priority: 0.2, changeFrequency: "yearly" as const },
    { path: "/terms", priority: 0.2, changeFrequency: "yearly" as const },
  ].map(({ path, priority, changeFrequency }) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
