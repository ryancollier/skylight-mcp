import { getClient } from "../client.js";

export interface AvatarResource {
  type: "avatar";
  id: string;
  attributes: {
    name?: string;
    url?: string;
    [key: string]: unknown;
  };
}

/**
 * Unlike most Skylight resources, /api/colors returns plain objects — no
 * JSON:API type/id/attributes wrapper.
 */
export interface ColorResource {
  name?: string;
  hex?: string;
}

interface AvatarsResponse {
  data: AvatarResource[];
}

interface ColorsResponse {
  data: ColorResource[];
}

/**
 * Get available avatar options
 */
export async function getAvatars(): Promise<AvatarResource[]> {
  const client = getClient();
  const response = await client.get<AvatarsResponse>("/api/avatars");
  return response.data;
}

/**
 * Get available color options
 */
export async function getColors(): Promise<ColorResource[]> {
  const client = getClient();
  const response = await client.get<ColorsResponse>("/api/colors");
  return response.data;
}

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

/**
 * Resolve a color parameter that may be a hex value already, a color name
 * from get_colors (e.g. "purple" — the lists API only accepts hex, not these
 * friendly names), or omitted (Skylight's lists API requires a color despite
 * documenting it as optional, so this falls back to the first available one).
 * Throws with the list of valid names if a given name isn't recognized.
 */
export async function resolveListColor(color: string | undefined): Promise<string> {
  if (color && HEX_COLOR_PATTERN.test(color)) {
    return color;
  }

  const colors = await getColors();

  if (color) {
    const match = colors.find((c) => c.name?.toLowerCase() === color.toLowerCase());
    if (!match?.hex) {
      const names = colors.map((c) => c.name).filter(Boolean).join(", ");
      throw new Error(`Unknown color "${color}". Valid colors: ${names || "none found"}`);
    }
    return match.hex;
  }

  const fallback = colors.find((c) => c.hex);
  if (!fallback?.hex) {
    throw new Error("No colors available from the Skylight API to use as a default.");
  }
  return fallback.hex;
}
