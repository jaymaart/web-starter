import { auth } from "@/auth";

// Gated by middleware (§6) — only reachable with a session. Read the role here
// for finer-grained checks.
export default async function AdminPage() {
  const session = await auth();
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <p className="mt-2 text-neutral-600">
        Signed in as {session?.user?.name ?? "unknown"} (role:{" "}
        {session?.user?.role ?? "n/a"}).
      </p>
    </main>
  );
}
