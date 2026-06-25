const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export function parseDurationToSeconds(value: string): number {
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d+)([smhd])?$/i);
  if (!match) {
    const asNumber = Number(trimmed);
    if (Number.isFinite(asNumber) && asNumber > 0) return asNumber;
    throw new Error(`Invalid duration: ${value}`);
  }

  const amount = Number(match[1]);
  const unit = (match[2] || "s").toLowerCase();
  const ms = UNIT_MS[unit];
  if (!ms) throw new Error(`Invalid duration unit: ${unit}`);
  return Math.floor((amount * ms) / 1000);
}
