import Link from "next/link";

export default function NotFound() {
  return (
    <div className="crt min-h-screen">
      <div className="relative z-10 mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-4 py-10">
        <div className="pixel-panel pixel-panel--lit w-full p-6 sm:p-8">
          <p className="kicker">bench · 404</p>
          <h1 className="pxfont mt-4 text-[18px] leading-[1.6] text-ink">
            THIS DOOR IS DARK
          </h1>
          <p className="termfont mt-4 text-[20px] leading-[1.35] text-dim">
            There is no room here. The lab is back the way you came.
          </p>
          <Link href="/" className="pixel-btn mt-6 inline-flex">
            Back to the lab
          </Link>
        </div>
      </div>
    </div>
  );
}
