import { formatHour, formatDays, summariseSchedule, initials } from "@/lib/landing";

describe("homepage helpers", () => {
  it("formats hours the way people say them", () => {
    expect(formatHour("08:00")).toBe("8am");
    expect(formatHour("12:00")).toBe("12pm");
    expect(formatHour("15:30")).toBe("3:30pm");
    expect(formatHour("00:00")).toBe("12am");
  });

  it("turns runs of days into ranges", () => {
    expect(formatDays([1, 2, 3, 4, 5])).toBe("Mon–Fri");
    expect(formatDays([5, 1, 3])).toBe("Mon, Wed, Fri");
    expect(formatDays([1, 2, 4, 5, 6])).toBe("Mon, Tue, Thu–Sat");
  });

  it("groups days that share the same hours", () => {
    const s = (d, a, b) => ({ dayOfWeek: d, startTime: a, endTime: b });
    expect(summariseSchedule([s(1, "08:00", "16:00"), s(2, "08:00", "16:00"), s(3, "08:00", "16:00"), s(6, "09:00", "13:00")]))
      .toEqual(["Mon–Wed · 8am–4pm", "Sat · 9am–1pm"]);
    expect(summariseSchedule([])).toEqual([]);
  });

  it("makes initials", () => {
    expect(initials("amaka", "Obi")).toBe("AO");
  });
});
