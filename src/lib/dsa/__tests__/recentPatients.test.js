import { recentFromViews } from "@/lib/recentPatients";

const v = (patientId, at) => ({ patientId, at });

describe("recentFromViews (LRU replay)", () => {
  it("keeps distinct patients, most recent first, with their latest view time", () => {
    const views = [v("tunde", 1), v("folake", 2), v("tunde", 3), v("amaka", 4)];
    expect(recentFromViews(views, 8)).toEqual([v("amaka", 4), v("tunde", 3), v("folake", 2)]);
  });

  it("drops the least recently viewed when over capacity", () => {
    const views = [v("a", 1), v("b", 2), v("a", 3), v("c", 4)];
    expect(recentFromViews(views, 2).map((r) => r.patientId)).toEqual(["c", "a"]);
  });
});
