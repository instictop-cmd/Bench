import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pilotLessonById } from "@/game/pilot";
import { PilotPlayer } from "@/components/PilotPlayer";

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const lesson = pilotLessonById(id);

  if (!lesson) return { title: "Cockpit" };

  return {
    title: lesson.title,
    description: lesson.goal,
    alternates: { canonical: `/pilot/${lesson.id}` },
  };
}

export default async function PilotPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lesson = pilotLessonById(id);
  if (!lesson) notFound();

  return <PilotPlayer lesson={lesson} />;
}
