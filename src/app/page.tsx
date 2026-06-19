import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Web Starter</h1>
      <p className="mt-3 text-neutral-600">
        A Next.js starter pre-wired to the Engineering Standards baseline:
        strict TypeScript, security headers, lazy/graceful clients, a Zod-validated
        API boundary, fire-and-forget pipelines, and the third-party integration shape.
      </p>

      <ul className="mt-6 space-y-2 text-sm text-neutral-700">
        <li>
          <code className="rounded bg-neutral-100 px-1.5 py-0.5">src/lib/</code> —
          the brain: db, redis, email, alerts, rate-limit, integration wrapper.
        </li>
        <li>
          <code className="rounded bg-neutral-100 px-1.5 py-0.5">
            src/app/api/contact/route.ts
          </code>{" "}
          — the flagship example route.
        </li>
        <li>
          <code className="rounded bg-neutral-100 px-1.5 py-0.5">
            docs/ENGINEERING-STANDARDS.md
          </code>{" "}
          — the standard this scaffold implements.
        </li>
      </ul>

      <div className="mt-8 flex gap-3">
        <Button>Primary</Button>
        <Button variant="outline">Outline</Button>
      </div>
    </main>
  );
}
