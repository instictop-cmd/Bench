import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { toolLessonById } from "@/game/tool";
import { ToolPlayer } from "@/components/ToolPlayer";

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const lesson = toolLessonById(id);

  if (!lesson) return { title: "Server Room" };

  return {
    title: lesson.title,
    description: lesson.goal,
    alternates: { canonical: `/tool/${lesson.id}` },
  };
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lesson = toolLessonById(id);
  if (!lesson) notFound();

  return <ToolPlayer lesson={lesson} />;
}
