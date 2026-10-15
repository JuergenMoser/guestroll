import { expect, test } from "@playwright/test";
import { admin, createEvent } from "../helpers";

// Chromium's fake camera: a test pattern instead of a real device, and no permission prompt.
test.use({ launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] }, permissions: ["camera"] });

test.describe("photo booth on a tablet", () => {
  test("a tap, a countdown, and the photo is in the album", async ({ page, baseURL, browserName }) => {
    test.skip(browserName !== "chromium", "the fake camera is a Chromium flag");
    const host = await admin(baseURL!);
    const event = await createEvent(host, { frame: "print" });
    const { boothKey } = await (await host.post(`/api/admin/events/${event.id}/booth`)).json();

    await page.goto(`/e/${event.slug}/booth?key=${boothKey}`);
    const shutter = page.getByRole("button", { name: "Take a photo" });
    await expect(shutter).toBeVisible();
    await shutter.click();
    await expect(page.getByText("In the album!")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Photos: 1")).toBeVisible();

    const photos = (await (await host.get(`/api/admin/events/${event.id}/photos`)).json()).photos;
    expect(photos).toHaveLength(1);
    expect(photos[0].guestName).toBeNull();
  });
});
