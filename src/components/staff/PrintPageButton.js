"use client";

export default function PrintPageButton({ label = "Print" }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full bg-accent px-5 py-2 text-sm font-semibold hover:bg-accent-hover"
    >
      {label}
    </button>
  );
}
