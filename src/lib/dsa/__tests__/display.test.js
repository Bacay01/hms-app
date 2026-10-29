import { buildCallHistory, NURSE_STATION } from "@/lib/display";

const rooms = new Map([["dayo", "Room 1"], ["kunle", "Room 3"]]);
const t = (minutes) => new Date(Date.UTC(2026, 9, 29, 9, minutes)).toISOString();

describe("buildCallHistory (CircularQueue ring buffer)", () => {
  const visits = [
    { id: "a", doctorId: "dayo", queueNumber: 1, priority: "NORMAL", nurseAt: t(0), doctorAt: t(20) },
    { id: "b", doctorId: "dayo", queueNumber: 2, priority: "NORMAL", nurseAt: t(5), doctorAt: null },
    { id: "c", doctorId: "kunle", queueNumber: 1, priority: "EMERGENCY", nurseAt: t(10), doctorAt: t(12) },
  ];

  it("shows the most recent call as 'now calling'", () => {
    const { latest } = buildCallHistory(visits, rooms);
    expect(latest).toMatchObject({ number: 1, place: "Room 1" });
  });

  it("lists earlier calls newest first", () => {
    const { recent } = buildCallHistory(visits, rooms);
    expect(recent.map((c) => c.place)).toEqual(["Room 3", NURSE_STATION, NURSE_STATION, NURSE_STATION]);
  });

  it("keeps only the latest N calls (ring buffer drops the oldest)", () => {
    const { latest, recent } = buildCallHistory(visits, rooms, 2);
    expect(latest.id).toBe("a-d");
    expect(recent.map((c) => c.id)).toEqual(["c-d"]);
  });

  it("flags emergency calls", () => {
    const { recent } = buildCallHistory(visits, rooms);
    expect(recent[0].emergency).toBe(true);
  });

  it("handles a day with no calls yet", () => {
    expect(buildCallHistory([], rooms)).toEqual({ latest: null, recent: [] });
  });
});
