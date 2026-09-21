import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createChore, getChores } from "../src/api/endpoints/chores.js";

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

  it("forces start_time to null for routine chores, even if a startTime was passed", async () => {
    // Skylight rejects routine:true whenever start_time is present ("routine
    // must be blank") — a routine's time comes entirely from BYHOUR.
    let capturedBody: Record<string, unknown> | undefined;
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body));
      return jsonResponse(200, minimalChoreResponse);
    });
    vi.stubGlobal("fetch", fetchMock);

    await createChore({
      summary: "Morning: brush teeth and hair",
      start: "2026-09-21",
      startTime: "07:00", // caller-supplied, should be ignored/nulled for routines
      categoryId: "cat-1",
      recurring: true,
      recurrenceSet: "RRULE:FREQ=DAILY;INTERVAL=1;BYHOUR=6",
      routine: true,
    });

    expect(capturedBody?.start_time).toBeNull();
  });

  it("still honors an explicit startTime for a non-routine chore", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body));
      return jsonResponse(200, minimalChoreResponse);
    });
    vi.stubGlobal("fetch", fetchMock);

    await createChore({
      summary: "Pick up bedroom floor",
      start: "2026-09-21",
      startTime: "16:30",
      categoryId: "cat-1",
      recurring: true,
      recurrenceSet: "RRULE:FREQ=DAILY",
    });

    expect(capturedBody?.start_time).toBe("16:30");
  });

  it("sends up_for_grabs:true and no category fields when creating an unassigned chore", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body));
      return jsonResponse(200, minimalChoreResponse);
    });
    vi.stubGlobal("fetch", fetchMock);

    await createChore({
      summary: "Help cook dinner",
      start: "2026-09-21",
      recurring: true,
      recurrenceSet: "RRULE:FREQ=WEEKLY",
      rewardPoints: 6,
      upForGrabs: true,
    });

    expect(capturedBody?.up_for_grabs).toBe(true);
    expect(capturedBody?.category_id).toBeUndefined();
    expect(capturedBody?.category_ids).toBeUndefined();
  });

  it("omits up_for_grabs when not specified (backward compatible)", async () => {
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

    expect(capturedBody?.up_for_grabs).toBeUndefined();
  });
});

describe("getChores", () => {
  it("requests include_up_for_grabs so unassigned chores aren't silently excluded", async () => {
    let capturedUrl: string | undefined;
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      capturedUrl = typeof input === "string" ? input : input.toString();
      return jsonResponse(200, { data: [] });
    });
    vi.stubGlobal("fetch", fetchMock);

    await getChores({ includeUpForGrabs: true });

    expect(capturedUrl).toContain("include_up_for_grabs=true");
  });
});
