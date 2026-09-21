import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { createList, updateList } from "../src/api/endpoints/lists.js";
import { registerListTools } from "../src/tools/lists.js";

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

/**
 * Minimal fake McpServer that parses input through each tool's actual Zod
 * shape before invoking the handler — same as the real SDK, and where
 * z.default() applies. Calling a captured handler with raw args directly
 * would silently skip every default.
 */
function captureTools() {
  const tools = new Map<string, { shape: z.ZodRawShape; handler: (args: Record<string, unknown>) => Promise<unknown> }>();
  const server = {
    tool: (name: string, ..._rest: unknown[]) => {
      const shape = _rest[_rest.length - 2] as z.ZodRawShape;
      const handler = _rest[_rest.length - 1] as (args: Record<string, unknown>) => Promise<unknown>;
      tools.set(name, { shape, handler });
    },
  };
  registerListTools(server as never);

  return {
    call: (name: string, args: Record<string, unknown>) => {
      const tool = tools.get(name);
      if (!tool) throw new Error(`Tool "${name}" was not registered`);
      const parsed = z.object(tool.shape).parse(args);
      return tool.handler(parsed);
    },
  };
}

describe("create_list tool", () => {
  it("resolves a color name to hex before calling the API", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/colors")) {
        return jsonResponse(200, { data: [{ hex: "#6B4EFF", name: "purple" }] });
      }
      capturedBody = JSON.parse(String(init?.body));
      return jsonResponse(200, minimalListResponse);
    });
    vi.stubGlobal("fetch", fetchMock);

    const tools = captureTools();
    await tools.call("create_list", { label: "Rewards Menu", kind: "to_do", color: "purple" });

    expect(capturedBody?.color).toBe("#6B4EFF");
  });

  it("picks a default color automatically when omitted", async () => {
    let capturedBody: Record<string, unknown> | undefined;
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/api/colors")) {
        return jsonResponse(200, { data: [{ hex: "#6B4EFF", name: "purple" }] });
      }
      capturedBody = JSON.parse(String(init?.body));
      return jsonResponse(200, minimalListResponse);
    });
    vi.stubGlobal("fetch", fetchMock);

    const tools = captureTools();
    await tools.call("create_list", { label: "Team Goal", kind: "to_do" });

    expect(capturedBody?.color).toBe("#6B4EFF");
  });
});
