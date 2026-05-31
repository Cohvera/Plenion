export function formatDate(date: Date | string | null | undefined) {
  if (!date) {
    return "No date";
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(date));
}

export function formatRequestNumber(count: number) {
  const year = new Date().getFullYear();
  return `QR-${year}-${String(count + 1).padStart(4, "0")}`;
}
