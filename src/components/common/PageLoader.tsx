export default function PageLoader() {
  return (
    <div className="min-h-[400px] flex items-center justify-center" role="status" aria-label="Chargement en cours">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-neutral-200 border-t-neutral-900 rounded-full animate-spin mx-auto" />
        <p className="text-sm text-neutral-400 mt-3">Chargement...</p>
      </div>
    </div>
  );
}
