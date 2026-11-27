import { BOSSES, bossForRank } from "./bosses";
import { CONNECT_LESSONS } from "./connect";
import { DEPLOY_LESSONS } from "./deploy";
import { EVAL_LESSONS } from "./eval";
import { FLOW_LESSONS } from "./flow";
import { PILOT_LESSONS } from "./pilot";
import { QUESTS } from "./quests";
import { REQUEST_LESSONS } from "./request";
import { STUDIOS, type Studio, type StudioTrack } from "./studio";
import { TOOL_LESSONS } from "./tool";
import { RANKS, type CourseKind, type RankId } from "./types";

export type CourseItem = {
  id: string;
  rank?: RankId;
  kind: CourseKind;
  order: number;
  title: string;
  xp: number;
  href: string;
  artifact: { id: string; name: string; note: string };
};

export type StudioItem = CourseItem & {
  track: StudioTrack;
  studio: Studio;
};

const hrefFor = (kind: CourseKind, id: string) => {
  if (kind === "quest") return `/quest/${id}`;
  if (kind === "flow") return `/flow/${id}`;
  if (kind === "tool") return `/tool/${id}`;
  if (kind === "eval") return `/eval/${id}`;
  if (kind === "deploy") return `/deploy/${id}`;
  if (kind === "connect") return `/connect/${id}`;
  if (kind === "request") return `/request/${id}`;
  return `/pilot/${id}`;
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
  connector: CONNECT_LESSONS.map((lesson) => ({
    id: lesson.id,
    rank: "connector" as const,
    kind: "connect" as const,
    order: lesson.order,
    title: lesson.title,
    xp: lesson.xp,
    href: hrefFor("connect", lesson.id),
    artifact: lesson.artifact,
  })),
  caller: REQUEST_LESSONS.map((lesson) => ({
    id: lesson.id,
    rank: "caller" as const,
    kind: "request" as const,
    order: lesson.order,
    title: lesson.title,
    xp: lesson.xp,
    href: hrefFor("request", lesson.id),
    artifact: lesson.artifact,
  })),
  pilot: PILOT_LESSONS.map((lesson) => ({
    id: lesson.id,
    rank: "pilot" as const,
    kind: "operate" as const,
    order: lesson.order,
    title: lesson.title,
    xp: lesson.xp,
    href: hrefFor("operate", lesson.id),
    artifact: lesson.artifact,
  })),
};

const STUDIO_ITEMS: StudioItem[] = STUDIOS.map((studio) => ({
  id: studio.id,
  kind: "studio" as const,
  order: studio.track === "operator" ? 1 : 2,
  title: studio.title,
  xp: studio.xp,
  href: studio.href,
  artifact: studio.artifact,
  track: studio.track,
  studio,
}));

export function courseForRank(rank: RankId): CourseItem[] {
  return COURSE[rank] ?? [];
}

export function allCourseItems(): CourseItem[] {
  return RANKS.flatMap((rank) => courseForRank(rank.id));
}

export function allStudioItems(): StudioItem[] {
  return STUDIO_ITEMS;
}

export function studioForTrackItem(track: StudioTrack): StudioItem | undefined {
  return STUDIO_ITEMS.find((item) => item.track === track);
}

export function studioUnlocked(
  track: StudioTrack,
  completed: string[],
): boolean {
  if (track === "operator") return rankComplete("caller", completed);
  return rankComplete("pilot", completed);
}

export function studioComplete(
  track: StudioTrack,
  completed: string[],
): boolean {
  const studio = STUDIOS.find((item) => item.track === track);
  return studio ? completed.includes(studio.id) : false;
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

  const studioArtifacts = STUDIO_ITEMS.filter((item) =>
    completed.includes(item.id),
  ).map((item) => item.artifact);

  const bossArtifacts = BOSSES.filter((boss) =>
    completed.includes(boss.id),
  ).map((boss) => boss.artifact);

  return [...itemArtifacts, ...studioArtifacts, ...bossArtifacts];
}

export function courseDone(completed: string[]): boolean {
  return (
    RANKS.every((rank) => rankComplete(rank.id, completed)) &&
    STUDIOS.every((studio) => completed.includes(studio.id))
  );
}

export function courseTotals() {
  const items = allCourseItems();
  return {
    lessons: items.length,
    bosses: BOSSES.length,
    studios: STUDIOS.length,
  };
}

export function nextRankEntry(rank: RankId) {
  const index = RANKS.findIndex((item) => item.id === rank);
  const next = RANKS[index + 1];

  if (!next) {
    const studio = studioForTrackItem("builder");
    return {
      href: studio?.href ?? "/complete",
      label: "Enter The Builder Studio →",
    };
  }

  if (rank === "caller") {
    return {
      href: "/campus",
      label: "Choose your Studio →",
    };
  }

  const item = courseForRank(next.id)[0];
  if (!item) return undefined;
  return {
    href: item.href,
    label: `Enter ${next.zone} →`,
  };
}
