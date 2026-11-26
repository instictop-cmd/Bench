import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What Bench stores, what it sends to the model, and what it never collects.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy" updated="27 November 2026">
      <LegalSection heading="Who we are">
        <p>
          Bench is an independent student project. It is a free, no-account
          learning lab. Questions about this policy:{" "}
          <a
            className="text-amber underline decoration-amber/40 underline-offset-4"
            href="mailto:instictop@gmail.com"
          >
            instictop@gmail.com
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection heading="What stays in your browser">
        <p>
          Your progress — XP, completed quests, rank, and notebook items — is
          stored in your browser&apos;s <code>localStorage</code>. It is not sent
          to us and it is not tied to an account. Clearing your site data
          removes it permanently.
        </p>
      </LegalSection>

      <LegalSection heading="What our server sees">
        <p>
          A random session cookie (<code>bench_sid</code>) so we can rate-limit
          requests. It contains no name or email. We also process your IP
          address in short-lived logs to prevent abuse.
        </p>
        <p>
          When you run an <code>ai</code> or <code>check</code> command, the
          prompt you type is sent to our model provider, Agnes AI, to generate a
          response. Do not type personal, confidential, or sensitive
          information. We do not use your prompts to train models.
        </p>
      </LegalSection>

      <LegalSection heading="Analytics">
        <p>
          We may collect aggregated page views and interaction events (for
          example, &ldquo;quest completed&rdquo;). We do not send prompt text to
          analytics. If analytics cookies are enabled, you can block them in
          your browser without losing progress.
        </p>
      </LegalSection>

      <LegalSection heading="What we do not collect">
        <p>
          No accounts, no passwords, no names, no phone numbers, and no payment
          details. We do not sell data. We do not build advertising profiles.
        </p>
      </LegalSection>

      <LegalSection heading="Retention">
        <p>
          Progress stays until you clear it. Server rate-limit counters expire
          within a day; error logs are kept briefly for debugging. Agnes AI
          processes prompts under its own privacy terms at{" "}
          <a
            className="text-amber underline decoration-amber/40 underline-offset-4"
            href="https://agnes-ai.com"
            rel="noreferrer"
            target="_blank"
          >
            agnes-ai.com
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection heading="Age">
        <p>
          Bench is intended for learners aged 13 and over. If you are under 18,
          use it with the permission of a parent, guardian, or institution.
        </p>
      </LegalSection>

      <LegalSection heading="Your choices">
        <p>
          Clear your browser&apos;s site data to delete local progress. Email us
          to ask a question, request deletion of server logs, or report content.
        </p>
      </LegalSection>

      <LegalSection heading="Changes">
        <p>
          If this policy changes materially, we will update the date at the top
          of this page and note the change on the home page.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
