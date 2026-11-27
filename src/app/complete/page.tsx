import type { Metadata } from "next";
import { CourseComplete } from "@/components/CourseComplete";

export const metadata: Metadata = {
  title: "Course complete",
  description:
    "Nine ranks, forty-five lessons, nine trials, and both studios. The Bench course is complete.",
  alternates: { canonical: "/complete" },
};

export default function CompletePage() {
  return <CourseComplete />;
}
