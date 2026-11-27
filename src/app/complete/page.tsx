import type { Metadata } from "next";
import { CourseComplete } from "@/components/CourseComplete";

export const metadata: Metadata = {
  title: "Course complete",
  description:
    "Six ranks, thirty lessons, six trials. The Bench course is complete.",
  alternates: { canonical: "/complete" },
};

export default function CompletePage() {
  return <CourseComplete />;
}
