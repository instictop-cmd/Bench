import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StudioPlayer } from "@/components/StudioPlayer";
import { studioForTrack } from "@/game/studio";

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ track: string }>;
}): Promise<Metadata> {
  const { track } = await params;

  if (track !== "operator" && track !== "builder") {
    return { title: "The Studio" };
  }

  const studio = studioForTrack(track);
  if (!studio) return { title: "The Studio" };

  return {
    title: studio.title,
    description: studio.goal,
    alternates: { canonical: `/studio/${studio.track}` },
  };
}

export default async function StudioPage({
  params,
}: {
  params: Promise<{ track: string }>;
}) {
  const { track } = await params;

  if (track !== "operator" && track !== "builder") notFound();

  const studio = studioForTrack(track);
  if (!studio) notFound();

  return <StudioPlayer key={studio.id} studio={studio} />;
}
