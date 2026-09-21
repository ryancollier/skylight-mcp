import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getColors, resolveListColor } from "../src/api/endpoints/misc.js";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  process.env.SKYLIGHT_TOKEN = "test-token";
  process.env.SKYLIGHT_AUTH_TYPE = "bearer";
  process.env.SKYLIGHT_FRAME_ID = "frame-1";
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete process.env.SKYLIGHT_TOKEN;
  delete process.env.SKYLIGHT_AUTH_TYPE;
  delete process.env.SKYLIGHT_FRAME_ID;
});

describe("getColors", () => {
  it("parses the real flat response shape ({ hex, name }, no JSON:API wrapper)", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(200, { data: [{ hex: "#6B4EFF", name: "purple" }] })
    );
    vi.stubGlobal("fetch", fetchMock);

    const colors = await getColors();

    expect(colors).toEqual([{ hex: "#6B4EFF", name: "purple" }]);
  });
});

describe("resolveListColor", () => {
  const stubColors = () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(200, {
        data: [
          { hex: "#6B4EFF", name: "purple" },
          { hex: "#1E90FF", name: "blue" },
        ],
      })
    );
    vi.stubGlobal("fetch", fetchMock);
  };

  it("passes through an already-hex value unchanged", async () => {
    stubColors();
    expect(await resolveListColor("#1E90FF")).toBe("#1E90FF");
  });

  it("resolves a color name (case-insensitive) to its hex value", async () => {
    stubColors();
    expect(await resolveListColor("Blue")).toBe("#1E90FF");
  });

  it("falls back to the first available color when omitted, since the live API requires one", async () => {
    stubColors();
    expect(await resolveListColor(undefined)).toBe("#6B4EFF");
  });

  it("throws a helpful error for an unrecognized color name", async () => {
    stubColors();
    await expect(resolveListColor("chartreuse")).rejects.toThrow(/purple, blue/);
  });
});
