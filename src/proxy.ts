import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authLimiter, generalLimiter } from "@/lib/api-rate-limit";

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // NextAuth routes (session, csrf, callbacks, etc.) are called frequently by SessionProvider
  if (pathname.startsWith("/api/auth/") && !pathname.startsWith("/api/auth/register")) {
    return NextResponse.next();
  }

  const ip = getClientIp(request);

  const isAuthRoute = pathname.startsWith("/api/auth/register");
  const limiter = isAuthRoute ? authLimiter : generalLimiter;

  const { success, remaining, resetInSeconds } = limiter.check(ip);

  if (!success) {
    return NextResponse.json(
      { error: "Muitas requisições. Tente novamente mais tarde." },
      {
        status: 429,
        headers: {
          "Retry-After": String(resetInSeconds),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(resetInSeconds),
        },
      },
    );
  }

  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Remaining", String(remaining));
  response.headers.set("X-RateLimit-Reset", String(resetInSeconds));
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
