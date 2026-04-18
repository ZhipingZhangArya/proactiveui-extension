import { NextResponse } from "next/server";
import { auth } from "@/auth";

const DEV_BYPASS =
  process.env.NODE_ENV !== "production" &&
  process.env.PROACTIVEUI_DEV_BYPASS_AUTH === "1";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isProtectedPage = pathname.startsWith("/dashboard");
  const isProtectedApi =
    pathname.startsWith("/api/") && !pathname.startsWith("/api/auth/"); // auth routes must stay public

  const needsAuth = isProtectedPage || isProtectedApi;

  if (needsAuth && !req.auth && !DEV_BYPASS) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
