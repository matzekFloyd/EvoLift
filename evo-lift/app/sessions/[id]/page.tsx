type SessionDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SessionDetailPage({ params }: SessionDetailPageProps) {
  const { id } = await params;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 py-12 sm:px-6 sm:py-16">
      <section className="panel p-5">
        <h1 className="text-xl font-semibold">Workout session detail</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Detail view placeholder for session <span className="font-medium">{id}</span>.
        </p>
      </section>
    </main>
  );
}
