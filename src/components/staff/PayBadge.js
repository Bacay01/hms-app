// "Pay before service" badge for a prescription or lab request
const STYLES = {
  PAID: "bg-white/15 text-white",
  PART: "border border-accent/50 text-red-200",
  UNPAID: "border border-accent/50 text-red-200",
};
const LABELS = { PAID: "Paid", PART: "Part-paid", UNPAID: "Unpaid" };

export default function PayBadge({ payment, cancelled }) {
  if (!payment || cancelled) return null;
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${STYLES[payment]}`}>{LABELS[payment]}</span>;
}
