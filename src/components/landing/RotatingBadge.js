// Circular rotating text built with CSS transforms only (no SVG)
const TEXT = "BOOK A VISIT • BOOK A VISIT • ";

export default function RotatingBadge() {
  const chars = TEXT.split("");
  const step = 360 / chars.length;

  return (
    <a
      href="#book"
      aria-label="Book a visit"
      className="relative grid size-28 place-items-center rounded-full border border-white/15 bg-black/50 backdrop-blur-md transition-colors hover:bg-black/60"
    >
      <span className="absolute inset-0 animate-spin-slow" aria-hidden="true">
        {chars.map((char, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-0 h-1/2 whitespace-pre pt-2.5 text-[10px] font-medium text-white/80"
            style={{
              transform: `translateX(-50%) rotate(${i * step}deg)`,
              transformOrigin: "50% 100%",
            }}
          >
            {char}
          </span>
        ))}
      </span>
      <span className="text-sm font-bold tracking-tight text-white">ÌH</span>
    </a>
  );
}
