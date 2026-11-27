import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { deployLessonById } from "@/game/deploy";
import { DeployPlayer } from "@/components/DeployPlayer";

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const lesson = deployLessonById(id);

  if (!lesson) return { title: "Rooftop" };

  return {
    title: lesson.title,
    description: lesson.goal,
    alternates: { canonical: `/deploy/${lesson.id}` },
  };
}

export default async function DeployPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lesson = deployLessonById(id);
  if (!lesson) notFound();

  return <DeployPlayer lesson={lesson} />;
}
