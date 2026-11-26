import type { Metadata } from "next";
import { Prologue } from "@/components/Prologue";

export const metadata: Metadata = {
  title: "Prologue",
  description:
    "Wake a dormant machine called Pip, run your first AI command, and catch it in a confident lie. Four minutes, no signup.",
  alternates: { canonical: "/play" },
};

export default function PlayPage() {
  return <Prologue />;
}
