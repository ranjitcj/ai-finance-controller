export function KpiCard({
  label,
  value,
  loading = false,
}: {
  label: string;
  value: string | number;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </div>
      {loading ? (
        <div className="mt-2 h-7 w-16 animate-pulse rounded bg-gray-200" />
      ) : (
        <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
      )}
    </div>
  );
}