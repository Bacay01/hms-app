import Link from "next/link";

export default function PharmacyTabs({ active }) {
  const tab = (href, label, key) => (
    <Link
      href={href}
      className={`rounded-full px-4 py-1.5 text-sm ${active === key ? "bg-white/15 text-white" : "border border-white/15 text-white/70 hover:bg-white/10"}`}
    >
      {label}
    </Link>
  );
  return (
    <div className="flex gap-2">
      {tab("/pharmacy", "Prescriptions", "queue")}
      {tab("/pharmacy/stock", "Stock", "stock")}
    </div>
  );
}
