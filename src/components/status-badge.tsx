import clsx from "clsx";

const tones = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  blue: "bg-sky-50 text-sky-800 ring-sky-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  green: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  red: "bg-red-50 text-red-800 ring-red-200"
};

export function StatusBadge({
  label,
  tone = "neutral"
}: {
  label: string;
  tone?: keyof typeof tones;
}) {
  return (
    <span className={clsx("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1", tones[tone])}>
      {label}
    </span>
  );
}
