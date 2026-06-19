import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username" },
        password: { label: "Password", type: "password" },
      },
      // DEMO ONLY — compares to env vars. Replace with a real user lookup and a
      // hashed-password check. For end users prefer magic links (§6 Security):
      // short-lived one-time tokens, with a Redis JTI dedup to block replay.
      authorize(credentials) {
        const expectedUser = process.env.ADMIN_USER;
        const expectedPass = process.env.ADMIN_PASSWORD;
        if (
          expectedUser &&
          expectedPass &&
          credentials?.username === expectedUser &&
          credentials?.password === expectedPass
        ) {
          return { id: "admin", name: "Admin", role: "admin" };
        }
        return null;
      },
    }),
  ],
});
