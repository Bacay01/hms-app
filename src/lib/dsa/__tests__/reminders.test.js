import { withRetry } from "@/lib/retry";
import { buildReminderMessage, maskPhone, normalizeNgPhone } from "@/lib/reminderText";

const noSleep = () => Promise.resolve();

describe("withRetry (exponential backoff)", () => {
  it("succeeds after transient failures", async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls++;
        if (calls < 3) throw new Error("network");
        return "sent";
      },
      { attempts: 3, sleep: noSleep }
    );
    expect(result).toBe("sent");
    expect(calls).toBe(3);
  });

  it("gives up after the last attempt and throws the last error", async () => {
    await expect(withRetry(async () => { throw new Error("down"); }, { attempts: 3, sleep: noSleep })).rejects.toThrow("down");
  });

  it("doubles the wait between attempts", async () => {
    const waits = [];
    await withRetry(async () => { throw new Error("x"); }, { attempts: 3, baseDelayMs: 300, sleep: async (ms) => waits.push(ms) }).catch(() => {});
    expect(waits).toEqual([300, 600]);
  });
});

describe("phone numbers", () => {
  it("normalises Nigerian mobile numbers to +234", () => {
    expect(normalizeNgPhone("0803 000 0002")).toBe("+2348030000002");
    expect(normalizeNgPhone("2348030000002")).toBe("+2348030000002");
    expect(normalizeNgPhone("+2348030000002")).toBe("+2348030000002");
  });

  it("rejects numbers that can't receive an SMS, and masks the rest", () => {
    expect(normalizeNgPhone("12345")).toBeNull();
    expect(normalizeNgPhone("")).toBeNull();
    expect(maskPhone("+2348030000002")).toBe("+2348030***002");
  });
});

describe("buildReminderMessage", () => {
  it("says who, when and where — short enough for one SMS", () => {
    const text = buildReminderMessage({
      firstName: "Tunde",
      doctorLastName: "Okafor",
      room: "Room 3",
      scheduledAt: "2026-11-03T09:00:00Z", // 10:00 in Lagos
      hospitalName: "Ìlera Health",
    });
    expect(text).toContain("Tunde");
    expect(text).toContain("Dr Okafor");
    expect(text).toContain("10:00");
    expect(text).toContain("Room 3");
    expect(text.length).toBeLessThanOrEqual(160);
  });
});
