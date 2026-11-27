import type { Metadata } from "next";
import { Campus } from "@/components/Campus";

export const metadata: Metadata = {
  title: "Campus",
  description:
    "Your Bench campus: six ranks, thirty lessons, six boss trials, and the notebook you fill as you learn.",
  alternates: { canonical: "/campus" },
};

export default function CampusPage() {
  return <Campus />;
}
