import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const panelSource = readFileSync(
  fileURLToPath(new URL("../panel/panel.js", import.meta.url)),
  "utf8",
);

/**
 * The panel is a browser IIFE, so its helpers are not importable. Pull the
 * named function declarations out of the source and evaluate them in isolation.
 */
function loadPanelFunctions<T extends Record<string, unknown>>(names: string[]): T {
  const parts: string[] = [];
  for (const name of names) {
    const start = panelSource.indexOf(`function ${name}(`);
    if (start === -1) throw new Error(`panel.js has no function ${name}`);
    let depth = 0;
    let index = panelSource.indexOf("{", start);
    const bodyStart = index;
    for (; index < panelSource.length; index += 1) {
      const char = panelSource[index];
      if (char === "{") depth += 1;
      else if (char === "}") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    if (depth !== 0) throw new Error(`unbalanced braces in ${name}`);
    parts.push(panelSource.slice(start, index + 1));
    void bodyStart;
  }
  const factory = new Function(
    `${parts.join("\n")}\nreturn { ${names.join(", ")} };`,
  ) as () => T;
  return factory();
}

// The engine emits interpolated telemetry with `at` in UTC ("Z") form, while
// the scenario script writes its steps with an explicit -03:00 offset. Both
// must render as Sao Paulo wall time on the operator's log.
describe("panel simulated-time labels", () => {
  const { simTimeLabel, simDateTimeLabel } = loadPanelFunctions<{
    simTimeLabel: (iso: unknown) => string;
    simDateTimeLabel: (iso: unknown) => string;
  }>(["spTimeParts", "simTimeLabel", "simDateTimeLabel"]);

  it("renders a -03:00 scenario stamp as its Sao Paulo wall time", () => {
    expect(simTimeLabel("2026-09-13T22:40:00-03:00")).toBe("22:40:00");
  });

  it("renders a UTC engine stamp converted to Sao Paulo, not as raw UTC", () => {
    // 2026-09-14T01:46:40Z is 22:46:40 on 13/09 in Sao Paulo.
    expect(simTimeLabel("2026-09-14T01:46:40.000Z")).toBe("22:46:40");
  });

  it("keeps a full recorded telemetry burst monotonically increasing", () => {
    const recorded = [
      "2026-09-13T22:40:00-03:00",
      "2026-09-14T01:46:40.000Z",
      "2026-09-14T01:53:20.000Z",
      "2026-09-13T23:00:00-03:00",
      "2026-09-14T02:06:40.000Z",
    ];
    const labels = recorded.map((iso) => simTimeLabel(iso));
    const sorted = [...labels].sort();
    expect(labels).toEqual(sorted);
  });

  it("renders the date part of a UTC stamp in Sao Paulo terms", () => {
    expect(simDateTimeLabel("2026-09-14T01:46:40.000Z")).toBe("13/09 22:46:40");
  });

  it("falls back for non-string input", () => {
    expect(simTimeLabel(undefined)).toBe("--:--");
    expect(simDateTimeLabel(undefined)).toBe("—");
  });
});
