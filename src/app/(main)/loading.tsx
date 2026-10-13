export default function Loading() {
  return (
    <div className="container-page py-10">
      <div className="card p-12 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
        <p className="text-stone-500 mt-4 text-sm">در حال بارگذاری…</p>
      </div>
    </div>
  );
}
