import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { questById } from "@/game/quests";
import { QuestPlayer } from "@/components/QuestPlayer";

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const quest = questById(id);

  if (!quest) return { title: "Quest" };

  return {
    title: quest.title,
    description: quest.goal,
    alternates: { canonical: `/quest/${quest.id}` },
  };
}

export default async function QuestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quest = questById(id);
  if (!quest) notFound();

  return <QuestPlayer quest={quest} />;
}
