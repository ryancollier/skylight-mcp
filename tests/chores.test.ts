import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createChore, getChores, updateChore, updateChoreTemplate } from "../src/api/endpoints/chores.js";

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

  it("sends emoji_icon in the request body when provided", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body));
      return jsonResponse(200, minimalChoreResponse);
    });
    vi.stubGlobal("fetch", fetchMock);

    await createChore({
      summary: "Brush teeth and hair",
      start: "2026-09-21",
      categoryId: "cat-1",
      emojiIcon: "🪥",
    });

    expect(capturedBody?.emoji_icon).toBe("🪥");
  });

  it("sends emoji_icon as null when not provided (backward compatible)", async () => {
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

    expect(capturedBody?.emoji_icon).toBeNull();
  });
});

describe("updateChore", () => {
  it("sends emoji_icon in the JSON:API attributes when provided", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body));
      return jsonResponse(200, { data: minimalChoreResponse.data[0] });
    });
    vi.stubGlobal("fetch", fetchMock);

    await updateChore("1", { emojiIcon: "🛏️" });

    const data = capturedBody?.data as { attributes?: Record<string, unknown> } | undefined;
    expect(data?.attributes?.emoji_icon).toBe("🛏️");
  });

  it("omits emoji_icon entirely when not specified (backward compatible)", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body));
      return jsonResponse(200, { data: minimalChoreResponse.data[0] });
    });
    vi.stubGlobal("fetch", fetchMock);

    await updateChore("1", { summary: "New name" });

    const data = capturedBody?.data as { attributes?: Record<string, unknown> } | undefined;
    expect(data?.attributes && "emoji_icon" in data.attributes).toBe(false);
  });
});

describe("updateChoreTemplate", () => {
  it("sends emoji_icon in the flat PATCH body when provided, for the whole recurring series", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body));
      return jsonResponse(200, { data: minimalChoreResponse.data[0] });
    });
    vi.stubGlobal("fetch", fetchMock);

    await updateChoreTemplate("1", { emoji_icon: "📖" });

    expect(capturedBody?.emoji_icon).toBe("📖");
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
