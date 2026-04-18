"use client";

import { signOut } from "next-auth/react";

export function SignOutButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className={
        className ??
        "rounded-md border border-gray-700 px-3 py-1.5 text-sm text-gray-200 hover:bg-gray-900"
      }
    >
      Sign out
    </button>
  );
}
