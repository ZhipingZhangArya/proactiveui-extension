"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignUpPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(data?.error ?? "Failed to create account");
      setLoading(false);
      return;
    }

    // Auto-login after signup
    const signInRes = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });
    setLoading(false);
    if (signInRes?.error) {
      setError("Account created, but sign-in failed. Please sign in manually.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg border border-gray-800 bg-gray-950 p-6"
      >
        <h1 className="text-2xl font-semibold">Create account</h1>
        <label className="block space-y-1">
          <span className="text-sm text-gray-400">Username</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            maxLength={32}
            pattern="[a-zA-Z0-9_\-]+"
            className="w-full rounded border border-gray-700 bg-black px-3 py-2 text-sm focus:border-white focus:outline-none"
          />
          <span className="block text-xs text-gray-600">
            Letters, numbers, _ or -. 3–32 characters.
          </span>
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-gray-400">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            maxLength={128}
            className="w-full rounded border border-gray-700 bg-black px-3 py-2 text-sm focus:border-white focus:outline-none"
          />
          <span className="block text-xs text-gray-600">
            At least 6 characters.
          </span>
        </label>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-200 disabled:opacity-60"
        >
          {loading ? "Creating..." : "Sign up"}
        </button>
        <p className="text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-white underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
