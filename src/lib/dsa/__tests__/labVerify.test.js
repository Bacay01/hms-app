import { canVerify } from "@/lib/labWorklist";

describe("canVerify (two-person rule)", () => {
  it("lets a different scientist verify", () => {
    expect(canVerify({ status: "RESULTED", resultedById: "laide", userId: "kemi" })).toBeNull();
  });

  it("refuses the scientist who entered the results", () => {
    expect(canVerify({ status: "RESULTED", resultedById: "laide", userId: "laide" })).toMatch(/another scientist/);
  });

  it("only verifies results that are awaiting verification", () => {
    expect(canVerify({ status: "IN_PROGRESS", resultedById: "laide", userId: "kemi" })).toMatch(/awaiting verification/);
    expect(canVerify({ status: "COMPLETED", resultedById: "laide", userId: "kemi" })).toMatch(/awaiting verification/);
  });
});
