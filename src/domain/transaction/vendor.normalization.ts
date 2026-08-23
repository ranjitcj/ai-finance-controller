export function normalizeVendor(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ");
}
