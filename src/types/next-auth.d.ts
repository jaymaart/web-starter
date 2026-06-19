import type { DefaultSession } from "next-auth";

// Extend the session/user/JWT with our role field (§6 Security — RBAC).
declare module "next-auth" {
  interface User {
    role?: string;
  }
  interface Session {
    user: { role?: string } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
  }
}
