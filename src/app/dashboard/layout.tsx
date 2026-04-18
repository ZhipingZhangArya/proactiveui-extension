import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-gray-800 px-6 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          ProactiveUI
        </Link>
        <UserButton />
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
