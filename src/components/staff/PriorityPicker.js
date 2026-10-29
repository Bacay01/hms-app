import { PRIORITIES } from "@/lib/queue";

const HINTS = {
  EMERGENCY: "Life-threatening: chest pain, breathing difficulty, heavy bleeding, convulsions",
  URGENT: "Needs attention soon: high fever, severe pain, very young baby",
  NORMAL: "Routine visit, follow-up, mild symptoms",
};

export default function PriorityPicker({ defaultValue = "NORMAL" }) {
  return (
    <fieldset>
      <legend className="mb-1.5 block text-xs font-medium text-white/75">Priority</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {PRIORITIES.map((p) => (
          <label
            key={p.value}
            className="flex cursor-pointer gap-2 rounded-xl border border-white/15 bg-black/30 p-3 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent/15"
          >
            <input
              type="radio"
              name="priority"
              value={p.value}
              defaultChecked={p.value === defaultValue}
              className="mt-0.5 accent-[#e5262a]"
            />
            <span>
              <span className="block font-medium">{p.label}</span>
              <span className="block text-[11px] leading-snug text-white/50">{HINTS[p.value]}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
