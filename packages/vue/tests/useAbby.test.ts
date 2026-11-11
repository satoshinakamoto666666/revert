import { describe, it, expect, vi } from "vitest";
import { createAbby } from "../src/index";

vi.mock("@tryabby/core", () => {
  return {
    createAbbyInstance: (cfg: any) => {
      const state = {
        tests: { hero: { variant: "B" } },
        flags: { darkMode: { value: true }, betaCheckout: { value: false } },
        remoteConfig: { maxItems: { value: 25 }, welcomeBanner: { value: "Hello Vue!" } },
      };
      return {
        init: () => state,
        getProjectData: () => state,
        loadProjectData: async () => state,
        subscribe: () => () => {},
        getTestVariant: (t: string) => (state.tests as any)[t]?.variant ?? "A",
        getFeatureFlag: (f: string) => (state.flags as any)[f]?.value ?? false,
        getRemoteConfig: (k: string) => (state.remoteConfig as any)[k]?.value,
        onAct: vi.fn(async () => {}),
        getVariants: () => ["A", "B"],
        updateUserProperties: vi.fn(),
      };
    },
  };
});

describe("@tryabby/vue integration (#68)", () => {
  const abby = createAbby({
    projectId: "proj_vue_123",
    currentEnvironment: "production",
    tests: {
      hero: { variants: ["A", "B"] as const },
    },
    flags: ["darkMode", "betaCheckout"] as const,
    remoteConfig: {
      maxItems: "number",
      welcomeBanner: "string",
    },
  } as any);

  it("useAbby returns the active variant and onAct handler", async () => {
    const { variant, onAct } = abby.useAbby("hero");
    expect(variant.value).toBe("B");
    await onAct();
    expect(abby.__abby__.onAct).toHaveBeenCalledWith("hero");
  });

  it("useAbby supports variant lookup object mapping", () => {
    const { variant } = abby.useAbby("hero", {
      A: "Control Header",
      B: "challenger-header",
    });
    expect(variant.value).toBe("challenger-header");
  });

  it("useFeatureFlag returns reactive boolean flag values", () => {
    expect(abby.useFeatureFlag("darkMode").value).toBe(true);
    expect(abby.useFeatureFlag("betaCheckout").value).toBe(false);
  });

  it("useRemoteConfig returns typed remote configuration values", () => {
    expect(abby.useRemoteConfig("maxItems").value).toBe(25);
    expect(abby.useRemoteConfig("welcomeBanner").value).toBe("Hello Vue!");
  });
});
