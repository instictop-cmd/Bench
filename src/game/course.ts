import { BOSSES, bossForRank } from "./bosses";
import { DEPLOY_LESSONS } from "./deploy";
import { EVAL_LESSONS } from "./eval";
import { FLOW_LESSONS } from "./flow";
import { QUESTS } from "./quests";
import { TOOL_LESSONS } from "./tool";
import { RANKS, type CourseKind, type RankId } from "./types";

export type CourseItem = {
  id: string;
  rank: RankId;
  kind: CourseKind;
  order: number;
  title: string;
  xp: number;
  href: string;
  artifact: { id: string; name: string; note: string };
};

const hrefFor = (kind: CourseKind, id: string) => {
  if (kind === "quest") return `/quest/${id}`;
  if (kind === "flow") return `/flow/${id}`;
  if (kind === "tool") return `/tool/${id}`;
  if (kind === "eval") return `/eval/${id}`;
  return `/deploy/${id}`;
};

function questItems(rank: RankId): CourseItem[] {
  return QUESTS.filter((quest) => quest.rank === rank)
    .sort((a, b) => a.order - b.order)
    .map((quest) => ({
      id: quest.id,
      rank: quest.rank,
      kind: "quest",
      order: quest.order,
      title: quest.title,
      xp: quest.xp,
      href: hrefFor("quest", quest.id),
      artifact: quest.artifact,
    }));
}

const COURSE: Record<RankId, CourseItem[]> = {
  operator: questItems("operator"),
  analyst: questItems("analyst"),
  tinkerer: FLOW_LESSONS.map((lesson) => ({
    id: lesson.id,
    rank: "tinkerer" as const,
    kind: "flow" as const,
    order: lesson.order,
    title: lesson.title,
    xp: lesson.xp,
    href: hrefFor("flow", lesson.id),
    artifact: lesson.artifact,
  })),
  integrator: TOOL_LESSONS.map((lesson) => ({
    id: lesson.id,
    rank: "integrator" as const,
    kind: "tool" as const,
    order: lesson.order,
    title: lesson.title,
    xp: lesson.xp,
    href: hrefFor("tool", lesson.id),
    artifact: lesson.artifact,
  })),
  engineer: EVAL_LESSONS.map((lesson) => ({
    id: lesson.id,
    rank: "engineer" as const,
    kind: "eval" as const,
    order: lesson.order,
    title: lesson.title,
    xp: lesson.xp,
    href: hrefFor("eval", lesson.id),
    artifact: lesson.artifact,
  })),
  architect: DEPLOY_LESSONS.map((lesson) => ({
    id: lesson.id,
    rank: "architect" as const,
    kind: "deploy" as const,
    order: lesson.order,
    title: lesson.title,
    xp: lesson.xp,
    href: hrefFor("deploy", lesson.id),
    artifact: lesson.artifact,
  })),
};

export function courseForRank(rank: RankId): CourseItem[] {
  return COURSE[rank] ?? [];
}

export function allCourseItems(): CourseItem[] {
  return RANKS.flatMap((rank) => courseForRank(rank.id));
}

export function rankBoss(rank: RankId) {
  return bossForRank(rank);
}

export function rankComplete(rank: RankId, completed: string[]): boolean {
  const items = courseForRank(rank);
  const boss = rankBoss(rank);
  return (
    items.length > 0 &&
    Boolean(boss) &&
    items.every((item) => completed.includes(item.id)) &&
    Boolean(boss && completed.includes(boss.id))
  );
}

export function rankUnlocked(rank: RankId, completed: string[]): boolean {
  const index = RANKS.findIndex((item) => item.id === rank);
  if (index <= 0) return true;
  return rankComplete(RANKS[index - 1].id, completed);
}

export function unlockReason(rank: RankId): string | null {
  const index = RANKS.findIndex((item) => item.id === rank);
  if (index <= 0) return null;
  return `finish ${RANKS[index - 1].zone} to unlock`;
}

export function nextCourseItem(
  rank: RankId,
  completed: string[],
): CourseItem | undefined {
  return courseForRank(rank).find((item) => !completed.includes(item.id));
}

export function completedArtifacts(completed: string[]) {
  const itemArtifacts = allCourseItems()
    .filter((item) => completed.includes(item.id))
    .map((item) => item.artifact);

  const bossArtifacts = BOSSES.filter((boss) =>
    completed.includes(boss.id),
  ).map((boss) => boss.artifact);

  return [...itemArtifacts, ...bossArtifacts];
}

export function courseDone(completed: string[]): boolean {
  return RANKS.every((rank) => rankComplete(rank.id, completed));
}

export function courseTotals() {
  const items = allCourseItems();
  return { lessons: items.length, bosses: BOSSES.length };
}

export function nextRankEntry(rank: RankId) {
  const index = RANKS.findIndex((item) => item.id === rank);
  const next = RANKS[index + 1];
  if (!next) {
    return {
      href: "/complete",
      label: "See the course complete →",
    };
  }
  const item = courseForRank(next.id)[0];
  if (!item) return undefined;
  return {
    href: item.href,
    label: `Enter ${next.zone} →`,
  };
}
