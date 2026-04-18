export default function Home() {
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
        <div className="pt-6">
          <span className="inline-block rounded-full border border-gray-700 px-4 py-1 text-sm text-gray-400">
            Web version — coming soon
          </span>
        </div>
      </div>
    </main>
  );
}
