import { clerkMiddleware } from "@clerk/nextjs/server";

// Public-first: Clerk attaches auth context but does NOT force sign-in on any route.
// The app has two login paths — the existing demo/role JWT login and Clerk — and the
// client-side auth guard (src/app/(app)/layout.tsx) decides access. Calling
// auth.protect() here would lock out the JWT login flow, so we don't.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
