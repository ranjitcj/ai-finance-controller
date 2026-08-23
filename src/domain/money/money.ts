export function normalizeAmount(value: string): string {
  const trimmed = value.trim();

  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(trimmed);

  if (!match) {
    throw new Error("Amount must be a valid decimal amount");
  }

  const sign = match[1] ?? "";
  const whole = match[2] ?? "0";
  const decimal = (match[3] ?? "").padEnd(2, "0");

  return `${sign}${whole.replace(/^0+(?=\d)/, "")}.${decimal}`;
}
