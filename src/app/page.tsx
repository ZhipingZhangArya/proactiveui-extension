import Link from "next/link";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/auth/SignOutButton";

export default async function Home() {
  const session = await auth();
  const signedIn = Boolean(session?.user);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl space-y-6 text-center">
        <h1 className="text-5xl font-bold tracking-tight">ProactiveUI</h1>
        <p className="text-xl text-gray-400">
          Intent-Aware Writing and Analysis Co-Pilot
        </p>
        <p className="text-gray-500">
          Turn planning text into in-place AI actions. The document is the
          interface.
        </p>

        <div className="flex items-center justify-center gap-4 pt-6">
          {signedIn ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-200"
              >
                Go to dashboard
              </Link>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link
                href="/sign-in"
                className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-200"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-md border border-gray-700 px-4 py-2 text-sm font-medium text-gray-200 hover:bg-gray-900"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
