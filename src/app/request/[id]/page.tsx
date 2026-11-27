import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requestLessonById } from "@/game/request";
import { RequestPlayer } from "@/components/RequestPlayer";

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const lesson = requestLessonById(id);

  if (!lesson) return { title: "The Exchange" };

  return {
    title: lesson.title,
    description: lesson.goal,
    alternates: { canonical: `/request/${lesson.id}` },
  };
}

export default async function RequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lesson = requestLessonById(id);
  if (!lesson) notFound();

  return <RequestPlayer key={lesson.id} lesson={lesson} />;
}
