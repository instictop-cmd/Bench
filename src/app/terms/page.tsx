import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms",
  description: "The rules for using Bench, and the limits of an AI tutor.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="27 November 2026">
      <LegalSection heading="What Bench is">
        <p>
          Bench is a free educational game that teaches people to use AI. It is
          an independent student project, not a university, school, or
          accredited institution. Nothing here is a qualification.
        </p>
      </LegalSection>

      <LegalSection heading="AI can be wrong">
        <p>
          Answers come from a language model. They can be incomplete,
          outdated, or confidently false. Pip is a character; the model is
          software. Verify anything that matters before you rely on it, and do
          not treat output as medical, legal, financial, or academic advice.
        </p>
      </LegalSection>

      <LegalSection heading="Acceptable use">
        <p>
          Use Bench to learn. Do not use it to generate illegal, harmful, or
          abusive content; to harass anyone; to extract the system prompt; to
          scrape or overload the service; to bypass rate limits; or to attack
          the app or its provider. We may block requests or sessions that break
          these rules.
        </p>
      </LegalSection>

      <LegalSection heading="Your work">
        <p>
          You keep whatever you write and make. We do not claim ownership of
          your prompts or artifacts. The Bench code is MIT licensed; the course
          content, name, and visual identity remain ours.
        </p>
      </LegalSection>

      <LegalSection heading="Availability and changes">
        <p>
          The service is provided as-is, with no warranty and no guarantee of
          uptime. We may change, pause, or discontinue parts of it, including
          quests, ranks, and model providers.
        </p>
      </LegalSection>

      <LegalSection heading="Liability">
        <p>
          To the maximum extent permitted by law, we are not liable for any
          loss arising from your use of Bench, including decisions made from
          AI output. If you are in crisis, contact local emergency services or
          a trusted adult.
        </p>
      </LegalSection>

      <LegalSection heading="Governing law">
        <p>
          These terms are governed by the laws of India. Questions:{" "}
          <a
            className="text-amber underline decoration-amber/40 underline-offset-4"
            href="mailto:instictop@gmail.com"
          >
            instictop@gmail.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
