import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Next 16 renamed the `middleware` convention to `proxy`. Edge auth instance —
// uses only the edge-safe config (§6). The `authorized` callback in
// auth.config.ts decides which routes require a session. `auth` IS NextAuth's
// edge handler; export it as the default `proxy` function.
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // Run on everything except API routes, Next internals, and static files.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
