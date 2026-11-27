import type { MetadataRoute } from "next";
import { BOSSES } from "@/game/bosses";
import { DEPLOY_LESSONS } from "@/game/deploy";
import { EVAL_LESSONS } from "@/game/eval";
import { FLOW_LESSONS } from "@/game/flow";
import { QUESTS } from "@/game/quests";
import { TOOL_LESSONS } from "@/game/tool";

const base =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://bench-sepia.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const lessons = [
    ...QUESTS.map((quest) => `/quest/${quest.id}`),
    ...FLOW_LESSONS.map((lesson) => `/flow/${lesson.id}`),
    ...TOOL_LESSONS.map((lesson) => `/tool/${lesson.id}`),
    ...EVAL_LESSONS.map((lesson) => `/eval/${lesson.id}`),
    ...DEPLOY_LESSONS.map((lesson) => `/deploy/${lesson.id}`),
  ];

  const bosses = BOSSES.map((boss) => `/boss/${boss.id}`);

  return [
    { path: "", priority: 1, changeFrequency: "weekly" as const },
    { path: "/play", priority: 0.9, changeFrequency: "monthly" as const },
    { path: "/campus", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/complete", priority: 0.5, changeFrequency: "monthly" as const },
    ...lessons.map((path) => ({
      path,
      priority: 0.7,
      changeFrequency: "monthly" as const,
    })),
    ...bosses.map((path) => ({
      path,
      priority: 0.6,
      changeFrequency: "monthly" as const,
    })),
    { path: "/privacy", priority: 0.2, changeFrequency: "yearly" as const },
    { path: "/terms", priority: 0.2, changeFrequency: "yearly" as const },
  ].map(({ path, priority, changeFrequency }) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
