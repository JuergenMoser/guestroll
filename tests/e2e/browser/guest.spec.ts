import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { admin, client, createEvent, joinAndUpload, photo } from "../helpers";

test.describe("guest page on a phone", () => {
  test("name, shutter, and the print comes out", async ({ page, baseURL }) => {
    const event = await createEvent(await admin(baseURL!), { name: "Julie & Thomas", captureMode: "camera" });
    await page.goto(`/e/${event.slug}`);
    await expect(page.getByRole("heading", { level: 1, name: "Julie & Thomas" })).toBeVisible();

    await page.getByPlaceholder("Your first name").fill("Léa");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Signed as Léa")).toBeVisible();
    await expect(page.getByText("Your photos will appear here.")).toBeVisible();

    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Take a photo" }).click();
    await (await chooser).setFiles({ name: "p.jpg", mimeType: "image/jpeg", buffer: await photo() });

    await expect(page.getByText("01", { exact: true })).toBeVisible();
    await expect(page.getByRole("list").last().getByRole("listitem")).toHaveCount(1);

    await page.reload();
    await expect(page.getByText("01", { exact: true })).toBeVisible();
    await expect(page.getByText("Your photos will appear here.")).toHaveCount(0);
  });

  test("another guest sees none of those photos", async ({ browser, baseURL }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host);
    const first = await browser.newContext();
    const firstPage = await first.newPage();
    await firstPage.goto(`/e/${event.slug}`);
    await firstPage.getByRole("button", { name: "Stay anonymous" }).click();
    const chooser = firstPage.waitForEvent("filechooser");
    await firstPage.getByRole("button", { name: "Take a photo" }).click();
    await (await chooser).setFiles({ name: "p.jpg", mimeType: "image/jpeg", buffer: await photo() });
    await expect(firstPage.getByText("01", { exact: true })).toBeVisible();

    const second = await browser.newContext();
    const secondPage = await second.newPage();
    await secondPage.goto(`/e/${event.slug}`);
    await secondPage.getByRole("button", { name: "Stay anonymous" }).click();
    await expect(secondPage.getByText("Your photos will appear here.")).toBeVisible();
    await expect(secondPage.getByText("00", { exact: true })).toBeVisible();
  });

  test("an access code guards the album", async ({ page, baseURL }) => {
    const event = await createEvent(await admin(baseURL!), { accessCode: "garden-party" });
    await page.goto(`/e/${event.slug}`);
    await expect(page.getByRole("heading", { name: "This album is private" })).toBeVisible();
    await page.getByLabel("Access code").fill("nope-nope");
    await page.getByRole("button", { name: "Enter" }).click();
    await expect(page.getByText("That code isn't right.")).toBeVisible();
    await page.getByLabel("Access code").fill("garden-party");
    await page.getByRole("button", { name: "Enter" }).click();
    await expect(page.getByRole("heading", { name: "What's your name?" })).toBeVisible();
  });

  test("the album language applies, and each guest can switch", async ({ page, baseURL }) => {
    const event = await createEvent(await admin(baseURL!), { defaultLocale: "it" });
    await page.goto(`/e/${event.slug}`);
    await expect(page.getByRole("heading", { name: "Come ti chiami?" })).toBeVisible();
    await page.getByRole("combobox").selectOption("fr");
    await expect(page.getByRole("heading", { name: "Comment tu t'appelles ?" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Comment tu t'appelles ?" })).toBeVisible();
  });

  test("the theme switch applies at once and sticks", async ({ page, baseURL }) => {
    const event = await createEvent(await admin(baseURL!));
    await page.goto(`/e/${event.slug}`);
    await page.getByRole("radio", { name: "Dark" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.getByRole("radio", { name: "System" }).click();
    await expect(page.locator("html")).not.toHaveAttribute("data-theme", /./);
  });

  test("the page fits a small phone without sideways scrolling", async ({ page, baseURL }) => {
    const event = await createEvent(await admin(baseURL!), { name: "A very long event name that should wrap nicely", captureMode: "both" });
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(`/e/${event.slug}`);
    await page.getByRole("button", { name: "Stay anonymous" }).click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("gallery link on a phone", () => {
  test("asks for the password, then shows the album", async ({ page, baseURL }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host, { name: "Linked album" });
    await joinAndUpload(await client(baseURL!), event.slug, 2);
    const { share, password } = await (await host.post(`/api/admin/events/${event.id}/shares`, { data: {} })).json();

    await page.goto(`/g/${share.token}`);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Open the album" }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Open the album" }).click();
    await expect(page.getByText("2 photos")).toBeVisible();
    await expect(page.getByRole("link", { name: "Download all photos" })).toBeVisible();
  });
});

test.describe("challenges on a phone", () => {
  test("a guest picks a challenge, shoots, and it's ticked", async ({ page, baseURL }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host, { askGuestName: false, challenges: ["The dance floor", "The cake"] });
    await page.goto(`/e/${event.slug}`);
    await expect(page.getByText("0 of 2 done")).toBeVisible();
    await page.getByRole("radio", { name: "The cake" }).click();
    await expect(page.getByText("Challenge: The cake")).toBeVisible();

    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Take a photo" }).click();
    await (await chooser).setFiles({ name: "p.jpg", mimeType: "image/jpeg", buffer: await photo() });
    await expect(page.getByText("1 of 2 done")).toBeVisible();

    const { photos } = await (await host.get(`/api/admin/events/${event.id}/photos`)).json();
    const cake = (await (await host.get(`/api/admin/events/${event.id}`)).json()).event.challenges[1];
    expect(photos[0].challengeId).toBe(cake.id);
  });
});

test.describe("guestbook on a phone", () => {
  test("a guest leaves a message, sees it, and can take it back", async ({ page, baseURL }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host, { askGuestName: false, guestbookEnabled: true });
    await page.goto(`/e/${event.slug}`);
    await page.getByPlaceholder("Write something for the hosts…").fill("What a night!");
    await page.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.getByText("Sent. Thank you!")).toBeVisible();
    await expect(page.getByText("What a night!")).toBeVisible();
    await expect(page.getByRole("button", { name: "Record a voice note" })).toBeVisible();

    const { messages } = await (await host.get(`/api/admin/events/${event.id}/messages`)).json();
    expect(messages.map((m: { text: string }) => m.text)).toEqual(["What a night!"]);

    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("What a night!")).toHaveCount(0);
  });
});

test.describe("filters and frames on a phone", () => {
  test("the photo is framed and filtered before it's sent", async ({ page, baseURL }) => {
    const host = await admin(baseURL!);
    const event = await createEvent(host, { name: "Framed", askGuestName: false, frame: "print", captureFilters: true });
    await page.goto(`/e/${event.slug}`);
    await page.getByRole("radio", { name: "Black & white" }).click();
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Take a photo" }).click();
    const red = await sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 220, g: 30, b: 30 } } }).jpeg().toBuffer();
    await (await chooser).setFiles({ name: "red.jpg", mimeType: "image/jpeg", buffer: red });
    await expect(page.getByText("01", { exact: true })).toBeVisible();

    const { photos } = await (await host.get(`/api/admin/events/${event.id}/photos`)).json();
    const stored = await host.get(`/api/media/${photos[0].id}?v=original`);
    const image = sharp(await stored.body());
    const meta = await image.metadata();
    // 800×600 plus the print border: wider, and taller still at the bottom.
    expect(meta.width).toBeGreaterThan(800);
    expect(meta.height! - 600).toBeGreaterThan(meta.width! - 800);
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    const at = (x: number, y: number) => [...data.subarray((y * info.width + x) * info.channels, (y * info.width + x) * info.channels + 3)];
    const [r, g, b] = at(Math.round(info.width / 2), Math.round(info.height * 0.4));
    expect(Math.abs(r - g) + Math.abs(g - b)).toBeLessThan(12);
    expect(at(2, 2).every((v) => v > 240)).toBe(true);
  });
});
