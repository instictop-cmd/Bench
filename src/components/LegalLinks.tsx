import Link from "next/link";

export function LegalLinks() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 termfont text-[14px]">
      <Link
        href="/privacy"
        className="text-dim underline decoration-edge2 underline-offset-4 hover:text-ink"
      >
        privacy
      </Link>
      <Link
        href="/terms"
        className="text-dim underline decoration-edge2 underline-offset-4 hover:text-ink"
      >
        terms
      </Link>
      <a
        href="mailto:instictop@gmail.com"
        className="text-dim underline decoration-edge2 underline-offset-4 hover:text-ink"
      >
        report
      </a>
      <span className="text-amber/90">
        Pip is an AI. It can be wrong — verify anything important.
      </span>
    </div>
  );
}
