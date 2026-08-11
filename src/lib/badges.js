// Badge tier based on number of confirmed collabs.
export function badgeFor(count) {
  const n = count || 0;
  if (n >= 20) return "📀 Elite";
  if (n >= 10) return "💿 Pro";
  if (n >= 5) return "✧ Rising";
  if (n >= 3) return "⊹ Intermediate";
  return "Fresh";
}
