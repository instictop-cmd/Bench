import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { bossById } from "@/game/bosses";
import { BossPlayer } from "@/components/BossPlayer";

export const instant = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const boss = bossById(id);

  if (!boss) return { title: "Boss trial" };

  return {
    title: boss.title,
    description: boss.goal,
    alternates: { canonical: `/boss/${boss.id}` },
  };
}

export default async function BossPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const boss = bossById(id);
  if (!boss) notFound();

  return <BossPlayer boss={boss} />;
}
