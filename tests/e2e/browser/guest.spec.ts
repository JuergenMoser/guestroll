import { expect, test } from "@playwright/test";
import { admin, createEvent, photo } from "../helpers";

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

    await expect(page.getByText("01")).toBeVisible();
    await expect(page.getByRole("list").last().getByRole("listitem")).toHaveCount(1);

    await page.reload();
    await expect(page.getByText("01")).toBeVisible();
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
    await expect(firstPage.getByText("01")).toBeVisible();

    const second = await browser.newContext();
    const secondPage = await second.newPage();
    await secondPage.goto(`/e/${event.slug}`);
    await secondPage.getByRole("button", { name: "Stay anonymous" }).click();
    await expect(secondPage.getByText("Your photos will appear here.")).toBeVisible();
    await expect(secondPage.getByText("00")).toBeVisible();
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
