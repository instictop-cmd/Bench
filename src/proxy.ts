import { NextResponse, type NextRequest } from "next/server";
import {
  createSession,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  verifySession,
} from "@/lib/session";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Content-Security-Policy":
    "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
};

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const current = request.cookies.get(SESSION_COOKIE)?.value;
  const valid = await verifySession(current);

  if (!valid) {
    response.cookies.set(SESSION_COOKIE, await createSession(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
  }

  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(name, value);
  }

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  if (
    request.nextUrl.pathname.startsWith("/api/") ||
    (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production")
  ) {
    response.headers.set("X-Robots-Tag", "noindex");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.svg|opengraph-image).*)"],
};
