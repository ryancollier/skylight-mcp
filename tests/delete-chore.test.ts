import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { registerChoreTools } from "../src/tools/chores.js";

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

/**
 * Minimal fake McpServer that captures each tool's Zod shape + handler, and
 * parses input through the shape first — same as the real SDK does, which is
 * where z.default() actually gets applied. Calling the handler directly with
 * raw args (skipping the parse step) would silently skip every default.
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
  registerChoreTools(server as never);

  return {
    call: (name: string, args: Record<string, unknown>) => {
      const tool = tools.get(name);
      if (!tool) throw new Error(`Tool "${name}" was not registered`);
      const parsed = z.object(tool.shape).parse(args);
      return tool.handler(parsed);
    },
  };
}

describe("delete_chore tool", () => {
  it("defaults applyTo to 'this' when omitted, matching its documented default", async () => {
    let capturedUrl: string | undefined;
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      capturedUrl = typeof input === "string" ? input : input.toString();
      return new Response("", { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const tools = captureTools();
    await tools.call("delete_chore", { choreId: "123" });

    expect(capturedUrl).toContain("apply_to=this");
  });

  it("still honors an explicit applyTo value", async () => {
    let capturedUrl: string | undefined;
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      capturedUrl = typeof input === "string" ? input : input.toString();
      return new Response("", { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const tools = captureTools();
    await tools.call("delete_chore", { choreId: "123", applyTo: "all" });

    expect(capturedUrl).toContain("apply_to=all");
  });
});
