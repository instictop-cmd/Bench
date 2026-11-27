import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { flowLessonById } from "@/game/flow";
import { FlowPlayer } from "@/components/FlowPlayer";

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const lesson = flowLessonById(id);

  if (!lesson) return { title: "Workshop" };

  return {
    title: lesson.title,
    description: lesson.goal,
    alternates: { canonical: `/flow/${lesson.id}` },
  };
}

export default async function FlowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lesson = flowLessonById(id);
  if (!lesson) notFound();

  return <FlowPlayer lesson={lesson} />;
}
