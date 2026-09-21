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
  // Live verification against a real frame found that Skylight rejects
  // "this" and "this_and_following" with a 400 ("you must have a valid
  // value for apply_to") — only "all" is confirmed to work. A prior fix
  // here defaulted applyTo to "this" assuming it was valid; it wasn't, so
  // there's no safe default to inject. Omitting applyTo now sends no
  // apply_to param at all, same as before any of this — the correct
  // behavior for a non-recurring chore, and an honest "unsupported" state
  // for per-occurrence deletion of a recurring one rather than a silent
  // wrong guess.
  it("sends no apply_to param when omitted, since no value is safe to assume as a default", async () => {
    let capturedUrl: string | undefined;
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      capturedUrl = typeof input === "string" ? input : input.toString();
      return new Response("", { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const tools = captureTools();
    await tools.call("delete_chore", { choreId: "123" });

    expect(capturedUrl).not.toContain("apply_to");
  });

  it("honors an explicit applyTo:'all', the only confirmed-working value", async () => {
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

  it("rejects 'this' and 'this_and_following' at the schema level, since Skylight rejects them live", () => {
    const tools = captureTools();
    expect(() =>
      // @ts-expect-error — intentionally invalid per the narrowed enum
      tools.call("delete_chore", { choreId: "123", applyTo: "this" })
    ).toThrow();
  });
});
