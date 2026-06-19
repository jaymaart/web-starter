import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config (§6 Security). No Node-only imports here, so it can run
 * inside middleware. Real providers (which do user lookups) are added in auth.ts,
 * which runs in the Node runtime.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  callbacks: {
    // Route gate used by middleware. Protect /admin; allow everything else.
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtected = nextUrl.pathname.startsWith("/admin");
      return isProtected ? isLoggedIn : true;
    },
    jwt({ token, user }) {
      if (user) token.role = user.role ?? "user";
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = typeof token.role === "string" ? token.role : "user";
      }
      return session;
    },
  },
  providers: [], // added in auth.ts
} satisfies NextAuthConfig;
