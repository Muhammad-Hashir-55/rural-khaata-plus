import { describe, expect, it } from "vitest";
import { parseScannedLedger } from "@/lib/parseScannedLedger";

describe("parseScannedLedger", () => {
  it("maps signed amount-only lines to the latest detected customer name", () => {
    const text = ["Ali", "+200", "-25", "+400"].join("\n");
    const rows = parseScannedLedger(text);

    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ name: "Ali", amount: 200, type: "credit" });
    expect(rows[1]).toMatchObject({ name: "Ali", amount: 25, type: "debit" });
    expect(rows[2]).toMatchObject({ name: "Ali", amount: 400, type: "credit" });
  });

  it("ignores amount lines until a valid name is seen", () => {
    const text = ["-50", "+100", "A", "B", "Bilal", "+300"].join("\n");
    const rows = parseScannedLedger(text);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: "Bilal", amount: 300, type: "credit" });
  });

  it("does not replace a valid current name with short OCR fragments on amount lines", () => {
    const text = ["Ali", "oA +200", "SE -25"].join("\n");
    const rows = parseScannedLedger(text);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ name: "Ali", amount: 200, type: "credit" });
    expect(rows[1]).toMatchObject({ name: "Ali", amount: 25, type: "debit" });
  });
});