import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connectLessonById } from "@/game/connect";
import { ConnectPlayer } from "@/components/ConnectPlayer";

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const lesson = connectLessonById(id);

  if (!lesson) return { title: "Switchboard" };

  return {
    title: lesson.title,
    description: lesson.goal,
    alternates: { canonical: `/connect/${lesson.id}` },
  };
}

export default async function ConnectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lesson = connectLessonById(id);
  if (!lesson) notFound();

  return <ConnectPlayer lesson={lesson} />;
}
