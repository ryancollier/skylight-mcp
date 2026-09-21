import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createList, updateList } from "../src/api/endpoints/lists.js";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const minimalListResponse = {
  data: {
    id: "1",
    type: "list",
    attributes: { label: "Rewards Menu", kind: "to_do" },
  },
};

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

describe("createList", () => {
  it("sends a flat request body, matching the real API (not JSON:API-wrapped)", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body));
      return jsonResponse(200, minimalListResponse);
    });
    vi.stubGlobal("fetch", fetchMock);

    await createList("Rewards Menu", "to_do", "purple");

    expect(capturedBody).toEqual({
      label: "Rewards Menu",
      kind: "to_do",
      color: "purple",
    });
  });
});

describe("updateList", () => {
  it("sends a flat request body for updates too", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body));
      return jsonResponse(200, minimalListResponse);
    });
    vi.stubGlobal("fetch", fetchMock);

    await updateList("1", { label: "New label" });

    expect(capturedBody).toEqual({ label: "New label" });
  });
});
