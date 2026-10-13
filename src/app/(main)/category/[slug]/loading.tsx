export default function Loading() {
  return (
    <div className="container-page py-8">
      <div className="rounded-2xl border border-gray-100 bg-stone-50 px-6 py-7 md:px-8 md:py-9 mb-8">
        <div className="h-4 w-40 rounded bg-stone-200 mb-5" />
        <div className="h-8 w-64 max-w-full rounded bg-stone-200 mb-4" />
        <div className="h-4 w-full max-w-3xl rounded bg-stone-200 mb-2" />
        <div className="h-4 w-2/3 max-w-2xl rounded bg-stone-200" />
      </div>

      <div className="border-t border-gray-200 mb-6" />

      <div className="flex items-center justify-between gap-3 mb-5 pb-3 border-b border-gray-200">
        <div className="h-4 w-24 rounded bg-stone-200" />
        <div className="h-9 w-36 rounded-full bg-stone-200" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card overflow-hidden">
            <div className="h-48 bg-stone-100" />
            <div className="p-5 space-y-3">
              <div className="h-3 w-20 rounded bg-stone-200" />
              <div className="h-4 w-full rounded bg-stone-200" />
              <div className="h-4 w-2/3 rounded bg-stone-200" />
              <div className="h-9 w-full rounded-full bg-stone-200 mt-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
