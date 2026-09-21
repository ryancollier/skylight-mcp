import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createChore } from "../src/api/endpoints/chores.js";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const minimalChoreResponse = {
  data: [
    {
      id: "1",
      type: "chore",
      attributes: { summary: "test", start: "2026-09-21", status: "pending" },
    },
  ],
};

beforeEach(() => {
  // Manual-token auth avoids the OAuth login flow entirely for these tests.
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

describe("createChore", () => {
  it("sends routine:true in the request body so the chore displays as a Routine", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body));
      return jsonResponse(200, minimalChoreResponse);
    });
    vi.stubGlobal("fetch", fetchMock);

    await createChore({
      summary: "Morning: brush teeth and hair",
      start: "2026-09-21",
      categoryId: "cat-1",
      recurring: true,
      recurrenceSet: "RRULE:FREQ=DAILY;INTERVAL=1;BYHOUR=6",
      rewardPoints: 1,
      routine: true,
    });

    expect(capturedBody?.routine).toBe(true);
  });

  it("omits routine from the request body when not specified (backward compatible)", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body));
      return jsonResponse(200, minimalChoreResponse);
    });
    vi.stubGlobal("fetch", fetchMock);

    await createChore({
      summary: "Empty the dishwasher",
      start: "2026-09-21",
      categoryId: "cat-1",
    });

    expect(capturedBody?.routine).toBeUndefined();
  });
});
