import { toCsv } from "@/lib/csv";

describe("toCsv formula-injection guard", () => {
  it("turns formulas into plain text", () => {
    expect(toCsv(["Name"], [["=HYPERLINK(\"http://x\")"]])).toBe('Name\r\n"\'=HYPERLINK(""http://x"")"');
    expect(toCsv(["A"], [["@SUM(A1)"], ["+1+2"]])).toBe("A\r\n'@SUM(A1)\r\n'+1+2");
  });

  it("leaves real numbers alone, negative ones too", () => {
    expect(toCsv(["Amount"], [[-500], ["-12.5"], [2000]])).toBe("Amount\r\n-500\r\n-12.5\r\n2000");
  });
});
