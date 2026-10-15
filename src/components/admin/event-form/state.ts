import type { AdminEvent } from "@/lib/events";
import type { Challenge } from "@/lib/challenges";
import type { Frame } from "@/lib/effects";
import type { CaptureMode, Locale } from "@/lib/constants";

/** Form values as the inputs hold them (strings for dates), converted by `toRequestBody`. */
export interface EventFormState {
  name: string;
  description: string;
  eventDate: string;
  accentColor: string;
  accessCode: string;
  removeCode: boolean;
  uploadsOpen: boolean;
  uploadsCloseAt: string;
  moderation: "post" | "pre";
  captureMode: CaptureMode;
  askGuestName: boolean;
  maxPhotosPerGuest: number;
  defaultLocale: Locale | "";
  collectGuestEmails: boolean;
  notifyAdminSummary: boolean;
  emailGuestsGallery: boolean;
  galleryLinkDays: number;
  galleryLinkDownload: boolean;
  galleryMailIncludesPassword: boolean;
  galleryLinkFavorites: boolean;
  guestbookEnabled: boolean;
  guestbookVoice: boolean;
  guestbookInGallery: boolean;
  captureFilters: boolean;
  frame: Frame;
  /** New rows have an empty id: the server assigns one. */
  challenges: Challenge[];
}

export type SetField = <K extends keyof EventFormState>(key: K, value: EventFormState[K]) => void;

export interface SectionProps {
  form: EventFormState;
  set: SetField;
  errors: Record<string, string>;
}

// <input type="datetime-local"> works in local time without a zone suffix.
function toLocalInput(ms: number | null): string {
  if (!ms) return "";
  const d = new Date(ms);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function initialState(event?: AdminEvent): EventFormState {
  return {
    name: event?.name ?? "",
    description: event?.description ?? "",
    eventDate: event?.eventDate ?? "",
    accentColor: event?.accentColor ?? "#ffc72c",
    accessCode: "",
    removeCode: false,
    uploadsOpen: event?.uploadsOpen ?? true,
    uploadsCloseAt: toLocalInput(event?.uploadsCloseAt ?? null),
    moderation: event?.moderation ?? "post",
    captureMode: event?.captureMode ?? "camera",
    askGuestName: event?.askGuestName ?? true,
    maxPhotosPerGuest: event?.maxPhotosPerGuest ?? 0,
    defaultLocale: event?.defaultLocale ?? "",
    collectGuestEmails: event?.collectGuestEmails ?? false,
    notifyAdminSummary: event?.notifyAdminSummary ?? true,
    emailGuestsGallery: event?.emailGuestsGallery ?? false,
    galleryLinkDays: event?.galleryLinkDays ?? 30,
    galleryLinkDownload: event?.galleryLinkDownload ?? true,
    galleryMailIncludesPassword: event?.galleryMailIncludesPassword ?? true,
    galleryLinkFavorites: event?.galleryLinkFavorites ?? false,
    challenges: event?.challenges ?? [],
    guestbookEnabled: event?.guestbookEnabled ?? false,
    guestbookVoice: event?.guestbookVoice ?? true,
    guestbookInGallery: event?.guestbookInGallery ?? false,
    captureFilters: event?.captureFilters ?? false,
    frame: event?.frame ?? "none",
  };
}

/** Empty strings become `null` (cleared), and the access code is only sent when it changes. */
export function toRequestBody(form: EventFormState): Record<string, unknown> {
  const { accessCode, removeCode, uploadsCloseAt, eventDate, defaultLocale, ...rest } = form;
  const body: Record<string, unknown> = {
    ...rest,
    defaultLocale: defaultLocale || null,
    eventDate: eventDate || null,
    uploadsCloseAt: uploadsCloseAt ? new Date(uploadsCloseAt).getTime() : null,
    challenges: rest.challenges.filter((c) => c.label.trim()),
  };
  if (removeCode) body.accessCode = null;
  else if (accessCode) body.accessCode = accessCode;
  return body;
}
