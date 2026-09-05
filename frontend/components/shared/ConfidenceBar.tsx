export function ConfidenceBar({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) {
    return <span className="text-gray-400">—</span>;
  }
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-gray-100">
        <div
          className="h-1.5 rounded-full bg-emerald-500"
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs text-gray-600">{value}%</span>
    </div>
  );
}