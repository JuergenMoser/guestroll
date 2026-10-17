import fs from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { ADMIN_PASSWORD, admin, client, createEvent, joinAndUpload, photo, signIn as signInApi, uniqueSuffix } from "../helpers";

async function signIn(page: Page) {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test.describe("admin in a browser", () => {
  test("a wrong password is refused with a clear message", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Wrong password.")).toBeVisible();
  });

  test("creating an event leads to its QR code", async ({ page }) => {
    await signIn(page);
    await page.getByRole("link", { name: "New event" }).click();
    await page.getByLabel("Event name").fill("Browser-made party");
    await page.getByRole("button", { name: "Create event" }).click();
    await expect(page).toHaveURL(/tab=share/);
    await expect(page.getByRole("heading", { level: 1, name: "Browser-made party" })).toBeVisible();
    await expect(page.getByRole("img", { name: /\/e\/browser-made-party-/ })).toBeVisible();
  });

  test("the event list pages and searches", async ({ page, baseURL }) => {
    const api = await admin(baseURL!);
    const tag = `Paged${uniqueSuffix(5)}`;
    for (let i = 0; i < 22; i++) await createEvent(api, { name: `${tag} ${String(i).padStart(2, "0")}` });
    await signIn(page);
    await page.goto("/admin/events");
    const pages = page.getByRole("navigation", { name: "Pages" });
    await expect(pages).toContainText("Page 1 of");
    await pages.getByRole("link", { name: "Next" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(pages).toContainText("Page 2 of");

    // Typing narrows the list without a submit, and starts again from page 1.
    await page.getByRole("searchbox", { name: "Search events" }).fill(`${tag} 0`);
    await expect(page).toHaveURL(new RegExp(`q=${tag}`));
    await expect(page).not.toHaveURL(/page=2/);
    await expect(page.getByRole("link", { name: new RegExp(tag) })).toHaveCount(10);
    await page.getByRole("searchbox", { name: "Search events" }).fill(`${tag} nothing`);
    await expect(page.getByText(`No event named like “${tag} nothing”.`)).toBeVisible();
  });

  test("the QR designer saves a preset", async ({ page, baseURL }) => {
    const event = await createEvent(await admin(baseURL!));
    await signIn(page);
    await page.goto(`/admin/events/${event.id}?tab=share`);
    const save = page.getByRole("button", { name: "Save", exact: true });
    await expect(save).toBeDisabled();
    await page.getByRole("button", { name: "Soft", exact: true }).click();
    await expect(page.getByText("Unsaved changes")).toBeVisible();
    await save.click();
    await expect(save).toBeDisabled();
    await page.reload();
    await expect(page.getByRole("radio", { name: "Round", exact: true })).toHaveAttribute("aria-checked", "true");
  });

  test("pending photos are approved from the contact sheet", async ({ page, baseURL }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host, { moderation: "pre" });
    await joinAndUpload(await client(baseURL!), event.slug, 2);
    await signIn(page);
    await page.goto(`/admin/events/${event.id}`);
    await expect(page.getByRole("tab", { name: "Pending" })).toHaveAttribute("aria-selected", "true");
    await page.getByRole("button", { name: "Select all" }).click();
    await expect(page.getByText("2 selected")).toBeVisible();
    await page.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText("No photos here.")).toBeVisible();
    await page.getByRole("tab", { name: "Visible" }).click();
    await expect(page.locator("ul[role=list] li")).toHaveCount(2);
  });

  test("a pending video is approved only once watched", async ({ page, baseURL }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host, { moderation: "pre", allowVideos: true });
    const guest = await client(baseURL!);
    await guest.post(`/api/e/${event.slug}/join`);
    const poster = await photo();
    const clip = fs.readFileSync(path.join(__dirname, "../../fixtures/clip.webm"));
    const sent = await guest.post(`/api/e/${event.slug}/photos`, {
      headers: { "Content-Type": "application/vnd.guestroll.video", "X-Poster-Bytes": String(poster.length) },
      data: Buffer.concat([poster, clip]),
    });
    expect(sent.status()).toBe(201);

    await signIn(page);
    await page.goto(`/admin/events/${event.id}`);
    await page.getByRole("button", { name: "Select all" }).click();
    await page.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText("1 video(s) not approved")).toBeVisible();
    await expect(page.locator("ul[role=list] li")).toHaveCount(1);

    await page.getByRole("button", { name: "Watch the video" }).click();
    await expect(page.locator("video")).toHaveAttribute("src", /v=play/);
    await page.getByRole("button", { name: "Close" }).click();
    // Still selected: what couldn't be approved stays picked for the next try.
    await page.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText("No photos here.")).toBeVisible();
  });

  test("the live wall shows a visible photo with its author", async ({ page, baseURL }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host);
    const guest = await client(baseURL!);
    await guest.post(`/api/e/${event.slug}/join`);
    await guest.post(`/api/e/${event.slug}/guest`, { data: { name: "Nora" } });
    await joinAndUpload(guest, event.slug, 1);
    await signIn(page);
    await page.goto(`/admin/events/${event.id}/wall`);
    await expect(page.getByText("by Nora")).toBeVisible({ timeout: 15_000 });
  });

  test("event settings save and the danger zone needs the exact name", async ({ page, baseURL }) => {
    const event = await createEvent(await admin(baseURL!), { name: "Delete me" });
    await signIn(page);
    await page.goto(`/admin/events/${event.id}?tab=settings`);
    await page.getByLabel("Welcome message").fill("Hello there");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Saved")).toBeVisible();
    const remove = page.getByRole("button", { name: "Delete this event and all its photos" });
    await expect(remove).toBeDisabled();
    await page.getByLabel("Type the event name to confirm").fill("Delete me");
    await remove.click();
    await expect(page).toHaveURL(/\/admin\/events$/);
    await expect(page.getByText("Delete me")).toHaveCount(0);
  });
});

test.describe("live wall", () => {
  test("shows the new photo in a mosaic, with the QR code, and follows setting changes", async ({ page, baseURL }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host, { name: "Wall party", wallStyle: { layout: "mosaic", showQr: true } });
    await joinAndUpload(await client(baseURL!), event.slug, 2);
    await signIn(page);
    await page.goto(`/admin/events/${event.id}/wall`);
    await expect(page.getByText("Wall party")).toBeVisible();
    await expect(page.getByText("Scan to add your photos")).toBeVisible();
    await expect(page.getByRole("listitem")).toHaveCount(2);

    const saved = await host.patch(`/api/admin/events/${event.id}`, { data: { wallStyle: { layout: "grid", slideSeconds: 1000, showQr: false } } });
    expect((await saved.json()).event.wallStyle).toMatchObject({ layout: "grid", slideSeconds: 30, showQr: false });
  });
});

test.describe("slideshow video", () => {
  test("renders an MP4 of the album in the browser and downloads it", async ({ page, baseURL }) => {
    test.setTimeout(120_000);
    const host = await admin(baseURL!);
    const event = await createEvent(host, { name: "Video night", eventDate: "2026-10-17" });
    await joinAndUpload(await client(baseURL!), event.slug, 2);
    await signIn(page);
    await page.goto(`/admin/events/${event.id}?tab=share`);
    await page.getByLabel("Seconds per step").first().fill("2");
    const download = page.waitForEvent("download", { timeout: 110_000 });
    await page.getByRole("button", { name: "Create the video" }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe("video-night.mp4");
    const bytes = await (await import("node:fs/promises")).readFile((await file.path())!);
    expect(bytes.subarray(4, 8).toString()).toBe("ftyp");
    expect(bytes.includes(Buffer.from("moov"))).toBe(true);
    expect(bytes.length).toBeGreaterThan(20_000);
    await expect(page.getByText("Done: the video was downloaded.")).toBeVisible();
  });
});

test.describe("two-step sign-in", () => {
  test("asks for the code after the password", async ({ page, baseURL }) => {
    const { hotp, base32Decode } = await import("../../../src/lib/auth/totp");
    const owner = await admin(baseURL!);
    const username = `ui${Date.now()}`;
    const { password } = await (await owner.post("/api/admin/accounts", { data: { username, role: "owner" } })).json();
    const api = await signInApi(baseURL!, username, password);
    const { secret } = await (await api.post("/api/admin/me/two-factor", { data: { action: "start", password } })).json();
    await api.post("/api/admin/me/two-factor", { data: { action: "confirm", code: hotp(base32Decode(secret), Math.floor(Date.now() / 30_000)) } });

    await page.goto("/admin/login");
    await page.getByLabel("Username").fill(username);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.getByLabel("Code").fill("000000");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Wrong or expired code.")).toBeVisible();
    await page.getByLabel("Code").fill(hotp(base32Decode(secret), Math.floor(Date.now() / 30_000) + 1));
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });
});
