import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getColors } from "../src/api/endpoints/misc.js";

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
