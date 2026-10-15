/** How the live wall looks. Stored as JSON on the event, read through `parseWallStyle`. */
export interface WallStyle {
  /** `single`: one print at a time. `mosaic`: the newest big, the previous ones around it. `grid`: a contact sheet of the latest. */
  layout: "single" | "mosaic" | "grid";
  slideSeconds: number;
  showNames: boolean;
  showChallenges: boolean;
  /** The guest QR code in a corner, so the room keeps joining. */
  showQr: boolean;
  favoritesOnly: boolean;
  /** Approved guestbook text messages, between photos or along the bottom. */
  showMessages: boolean;
}

export const WALL_LAYOUTS = ["single", "mosaic", "grid"] as const;

export const DEFAULT_WALL: WallStyle = {
  layout: "single",
  slideSeconds: 6,
  showNames: true,
  showChallenges: true,
  showQr: false,
  favoritesOnly: false,
  showMessages: false,
};

/** Never throws: unknown or missing values fall back to the defaults. */
export function parseWallStyle(value: unknown): WallStyle {
  const v = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
  const bool = (key: keyof WallStyle) => (typeof v[key] === "boolean" ? (v[key] as boolean) : (DEFAULT_WALL[key] as boolean));
  const seconds = typeof v.slideSeconds === "number" && Number.isFinite(v.slideSeconds) ? Math.round(v.slideSeconds) : DEFAULT_WALL.slideSeconds;
  return {
    layout: (WALL_LAYOUTS as readonly unknown[]).includes(v.layout) ? (v.layout as WallStyle["layout"]) : DEFAULT_WALL.layout,
    slideSeconds: Math.min(Math.max(seconds, 3), 30),
    showNames: bool("showNames"),
    showChallenges: bool("showChallenges"),
    showQr: bool("showQr"),
    favoritesOnly: bool("favoritesOnly"),
    showMessages: bool("showMessages"),
  };
}

export function readWallStyle(json: string | null | undefined): WallStyle {
  try {
    return parseWallStyle(json ? JSON.parse(json) : null);
  } catch {
    return DEFAULT_WALL;
  }
}
