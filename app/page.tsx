export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-sm font-medium tracking-wide text-foreground-subtle uppercase">
        Phase 1
      </p>
      <h1 className="text-3xl font-semibold text-foreground">
        Portfolio scaffold is up
      </h1>
      <p className="max-w-md text-foreground-muted">
        Sections, projects, and content arrive in a later phase — driven by
        the database, not new frontend code.
      </p>
    </main>
  );
}
