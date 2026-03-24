import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { env } from "@/lib/env";

const authRoutes = ["/login", "/signup"];

export async function proxy(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: env.AUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
  });

  const isAuthenticated = Boolean(token);
  const { pathname } = request.nextUrl;
  const isAuthRoute = authRoutes.includes(pathname);

  if (!isAuthenticated && !isAuthRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/upload/:path*", "/analysis/:path*", "/interviews/:path*", "/history/:path*", "/profile/:path*", "/login", "/signup"],
};
