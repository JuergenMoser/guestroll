import { expect, test, type Page } from "@playwright/test";
import { ADMIN_PASSWORD, admin, client, createEvent, joinAndUpload } from "../helpers";

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
