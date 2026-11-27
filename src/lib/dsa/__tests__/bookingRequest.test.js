import { parseBookingRequest, requestReference, localPhone } from "@/lib/bookingRequest";

const ctx = { today: "2026-11-27", departmentIds: ["dep-gp", "dep-paeds"] };
const good = {
  fullName: "  Adaeze   Okafor ",
  phone: "0803 123 4567",
  departmentId: "dep-gp",
  preferredDate: "2026-12-01",
  preferredTime: "MORNING",
  reason: "Follow-up",
  consent: "on",
};

describe("parseBookingRequest", () => {
  it("accepts a good request and tidies it", () => {
    expect(parseBookingRequest(good, ctx).data).toEqual({
      fullName: "Adaeze Okafor",
      phone: "+2348031234567",
      departmentId: "dep-gp",
      preferredDate: "2026-12-01",
      preferredTime: "MORNING",
      reason: "Follow-up",
    });
  });

  it("lets the department be left blank", () => {
    expect(parseBookingRequest({ ...good, departmentId: "" }, ctx).data.departmentId).toBeNull();
  });

  it("flags every bad field at once", () => {
    const { errors } = parseBookingRequest(
      { fullName: "Ada", phone: "12345", departmentId: "made-up", preferredDate: "2026-02-31", preferredTime: "NIGHT" },
      ctx
    );
    expect(Object.keys(errors).sort()).toEqual(["consent", "departmentId", "fullName", "phone", "preferredDate", "preferredTime"]);
  });

  it("keeps dates between today and 60 days ahead", () => {
    expect(parseBookingRequest({ ...good, preferredDate: "2026-11-26" }, ctx).errors.preferredDate).toMatch(/later/);
    expect(parseBookingRequest({ ...good, preferredDate: "2026-11-27" }, ctx).data).toBeDefined();
    expect(parseBookingRequest({ ...good, preferredDate: "2027-01-26" }, ctx).data).toBeDefined();
    expect(parseBookingRequest({ ...good, preferredDate: "2027-01-27" }, ctx).errors.preferredDate).toMatch(/60 days/);
  });

  it("treats a filled honeypot as spam", () => {
    expect(parseBookingRequest({ ...good, website: "http://spam" }, ctx)).toEqual({ spam: true });
  });
});

describe("helpers", () => {
  it("makes a short reference and a local phone number", () => {
    expect(requestReference("ckabc123xyz7k2m9a")).toBe("REQ-7K2M9A");
    expect(localPhone("+2348031234567")).toBe("08031234567");
  });
});
