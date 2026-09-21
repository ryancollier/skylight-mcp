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
