import "server-only";
import fsp from "node:fs/promises";
import { createAccount, getAccountByUsername, hashPassword } from "@/lib/accounts";
import { bootstrapAdmin } from "@/lib/auth/admin";
import { config } from "@/lib/config";
import { closeDb, getDb } from "@/lib/db/client";
import { events as eventsTable } from "@/lib/db/schema";
import { createEvent, updateEvent } from "@/lib/events";
import { processPhoto } from "@/lib/images/process";
import { insertMessage } from "@/lib/messages";
import { insertPhoto, setFavorite } from "@/lib/photos";
import { newId } from "@/lib/security/ids";
import { createShareLink } from "@/lib/shares";
import { storage } from "@/lib/storage";
import { writePhotoFiles } from "@/lib/storage/files";
import { demoPhoto } from "./photos";

/** Shown on the login page and in the demo banner: the demo is meant to be entered. */
export const DEMO_USERNAME = "demo";
export const DEMO_PASSWORD = "guestroll-demo";
export const DEMO_GALLERY_PASSWORD = "demo-gallery";

const GUESTS = ["Camille", "Léa", "Hugo", "Nora", "Marco", "Sofia", "Tom", "Inès", null];
const MESSAGES = [
  "What a beautiful day, thank you for having us!",
  "The cake was unreal. Congratulations to you both!",
  "Best dance floor of the year. See you at the next one!",
  "Merci pour cette soirée magique !",
];

async function addPhotos(eventId: string, count: number, offset: number, challengeIds: string[] = []) {
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const processed = await processPhoto(await demoPhoto(offset + i));
    const id = newId();
    await writePhotoFiles(eventId, id, processed.files);
    const guest = GUESTS[(offset + i) % GUESTS.length];
    insertPhoto({
      id,
      eventId,
      guestId: `demo-guest-${(offset + i) % GUESTS.length}`,
      guestName: guest,
      width: processed.width,
      height: processed.height,
      bytes: processed.files.original.length,
      status: i % 9 === 4 ? "pending" : "visible",
      challengeId: challengeIds.length && i % 2 === 0 ? challengeIds[i % challengeIds.length] : null,
    });
    ids.push(id);
  }
  return ids;
}

/** A believable instance: three events with photos, challenges, a guestbook, favorites and a gallery link. */
export async function seedDemo(): Promise<void> {
  bootstrapAdmin();
  if (!getAccountByUsername(DEMO_USERNAME)) {
    createAccount({ username: DEMO_USERNAME, name: "Demo host", email: null, role: "owner", eventIds: [], passwordHash: hashPassword(DEMO_PASSWORD) });
  }
  const today = new Date().toISOString().slice(0, 10);

  const wedding = createEvent({
    name: "Julie & Thomas",
    description: "Share your favourite moments of the night!",
    eventDate: today,
    accentColor: "#ffc72c",
    askGuestName: true,
    guestbookEnabled: true,
    captureFilters: true,
    frame: "print",
    challenges: JSON.stringify([
      { id: "dancefl0", label: "The dance floor" },
      { id: "cakecake", label: "The cake" },
      { id: "strangr2", label: "The couple with a stranger" },
      { id: "laughxx3", label: "A big laugh" },
    ]),
    wallStyle: JSON.stringify({ layout: "mosaic", showQr: true, showMessages: true, slideSeconds: 5 }),
  });
  const weddingPhotos = await addPhotos(wedding.id, 24, 0, ["dancefl0", "cakecake", "strangr2", "laughxx3"]);
  setFavorite(weddingPhotos.filter((_, i) => i % 4 === 0), wedding.id, true);
  MESSAGES.forEach((text, i) =>
    insertMessage({ id: newId(), eventId: wedding.id, guestId: `demo-guest-${i}`, guestName: GUESTS[i], text, audioExt: null, audioBytes: null, audioSeconds: null, status: "visible" }),
  );
  createShareLink({ eventId: wedding.id, password: DEMO_GALLERY_PASSWORD, label: "Family", allowDownload: true, expiresAt: null });

  const birthday = createEvent({ name: "Léa turns 30", description: "Bring your best smile.", accentColor: "#f97316", moderation: "pre" });
  await addPhotos(birthday.id, 10, 30);

  const conference = createEvent({ name: "Open Source Summit", description: "Photos of talks and hallway chats.", accentColor: "#336699", captureMode: "both" });
  await addPhotos(conference.id, 8, 50);
  updateEvent(conference.id, { uploadsOpen: true });
}

/**
 * Puts the demo back to its starting point: the database and every file go,
 * then the seed runs again. Visitors' changes last until the next reset.
 */
export async function resetDemo(): Promise<void> {
  const ids = getDb().select({ id: eventsTable.id }).from(eventsTable).all();
  for (const { id } of ids) await storage().deletePrefix(id).catch(() => {});
  closeDb();
  for (const suffix of ["", "-wal", "-shm"]) await fsp.rm(`${config.dbFile}${suffix}`, { force: true });
  // A fresh database: accounts, settings and the bootstrap all start over.
  const { forgetBootstrap } = await import("@/lib/auth/admin");
  forgetBootstrap();
  getDb();
  await seedDemo();
}
