import { auth } from "@/auth";

export interface CurrentUser {
  id: string;
  name: string;
  role: "WRITER" | "REVIEWER";
}

/**
 * Returns the current user from the Auth.js session, or `null` if
 * the caller is unauthenticated.
 *
 * **Dev-only bypass:** when `PROACTIVEUI_DEV_BYPASS_AUTH=1` is set (and
 * `NODE_ENV !== "production"`), returns a synthetic guest user so the
 * app is demoable before the Postgres database is provisioned. Once the
 * real database is wired up, drop the env var and auth works normally.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (session?.user?.id) {
    return {
      id: session.user.id,
      name: session.user.name ?? "user",
      role: (session.user.role as "WRITER" | "REVIEWER") ?? "WRITER",
    };
  }

  if (
    process.env.NODE_ENV !== "production" &&
    process.env.PROACTIVEUI_DEV_BYPASS_AUTH === "1"
  ) {
    return { id: "dev-guest", name: "dev-guest", role: "WRITER" };
  }

  return null;
}
