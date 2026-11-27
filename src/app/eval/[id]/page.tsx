import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { evalLessonById } from "@/game/eval";
import { EvalPlayer } from "@/components/EvalPlayer";

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const lesson = evalLessonById(id);

  if (!lesson) return { title: "Observatory" };

  return {
    title: lesson.title,
    description: lesson.goal,
    alternates: { canonical: `/eval/${lesson.id}` },
  };
}

export default async function EvalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lesson = evalLessonById(id);
  if (!lesson) notFound();

  return <EvalPlayer lesson={lesson} />;
}
