import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";

// Minimal credentials login. The server action calls signIn and redirects to the
// gated area on success. Swap for your real auth UI / magic-link flow.
export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <form
        action={async (formData) => {
          "use server";
          await signIn("credentials", {
            username: formData.get("username"),
            password: formData.get("password"),
            redirectTo: "/admin",
          });
        }}
        className="mt-6 space-y-4"
      >
        <input
          name="username"
          placeholder="Username"
          className="w-full rounded-md border border-neutral-300 px-3 py-2"
          required
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          className="w-full rounded-md border border-neutral-300 px-3 py-2"
          required
        />
        <Button type="submit" className="w-full">
          Sign in
        </Button>
      </form>
    </main>
  );
}
