import { logMetric } from "../src/lib/utils/logger";

describe("logMetric", () => {
  test("emite uma linha JSON estruturada com type=METRIC e os campos informados", () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    logMetric("codegen", { tableCount: 3, durationMs: 42 });

    expect(spy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.type).toBe("METRIC");
    expect(parsed.event).toBe("codegen");
    expect(parsed.tableCount).toBe(3);
    expect(parsed.durationMs).toBe(42);
    expect(typeof parsed.timestamp).toBe("string");

    spy.mockRestore();
  });

  test("funciona sem dados extras", () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    logMetric("extract");
    const parsed = JSON.parse(spy.mock.calls[0][0] as string);
    expect(parsed.event).toBe("extract");
    spy.mockRestore();
  });
});
