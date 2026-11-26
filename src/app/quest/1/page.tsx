import type { Metadata } from "next";
import { QuestOne } from "@/components/QuestOne";

export const metadata: Metadata = {
  title: "Quest 01 — Hello, Operator",
  description:
    "Ask the same question twice, add one constraint, and learn to hear the difference. The first quest in the Library.",
  alternates: { canonical: "/quest/1" },
};

export default function QuestOnePage() {
  return <QuestOne />;
}
