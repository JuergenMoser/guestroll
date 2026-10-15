import { describe, expect, it } from "vitest";
import { mailMessages } from "@/lib/mail/messages";
import { galleryMail, pendingMail, summaryMail, testMail } from "@/lib/mail/templates";

function keys(node: object, prefix = ""): string[] {
  return Object.entries(node).flatMap(([k, v]) => (typeof v === "string" ? [`${prefix}${k}`] : keys(v, `${prefix}${k}.`)));
}

const gallery = (over: Partial<Parameters<typeof galleryMail>[0]> = {}) =>
  galleryMail({
    app: "Guestroll",
    locale: "en",
    event: "Julie & Thomas",
    accent: "#ffc72c",
    url: "https://photos.example.com/g/abc",
    password: "k7mq-x2pd-a9fe-wr3c",
    expiresAt: Date.UTC(2026, 9, 29),
    downloads: true,
    ...over,
  });

describe("email templates", () => {
  it("has the same keys in every language", () => {
    for (const locale of Object.keys(mailMessages) as (keyof typeof mailMessages)[]) {
      expect(keys(mailMessages[locale]).sort(), locale).toEqual(keys(mailMessages.en).sort());
    }
  });

  it("escapes every value that reaches the HTML", () => {
    const mail = gallery({ event: '<img src=x onerror="alert(1)">', url: 'https://x.test/"><script>' });
    expect(mail.html).not.toContain("<img src=x");
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });

  it("refuses an accent color that isn't a strict hex", () => {
    expect(gallery({ accent: "red;background:url(x)" }).html).not.toContain("red;background");
  });

  it("always has a plain-text twin with the link and the password", () => {
    const { text, subject } = gallery();
    expect(subject).toBe("The photos of Julie & Thomas are here");
    expect(text).toContain("https://photos.example.com/g/abc");
    expect(text).toContain("k7mq-x2pd-a9fe-wr3c");
    expect(text).toContain("October 29, 2026");
  });

  it("tells guests to ask the hosts when the password isn't in the email", () => {
    const { text } = gallery({ password: null });
    expect(text).toContain("The hosts will give you the password.");
    expect(text).not.toContain("Password:");
  });

  it("speaks the recipient's language", () => {
    expect(gallery({ locale: "fr" }).subject).toBe("Les photos de « Julie & Thomas » sont là");
    expect(testMail({ app: "Guestroll", locale: "it" }).subject).toBe("Guestroll: e-mail di prova");
    expect(pendingMail({ app: "G", locale: "es", event: "E", accent: "#000000", url: "u", count: 3 }).subject).toBe("E: 3 fotos pendientes de aprobación");
  });

  it("summarises the event with its figures and top photographers", () => {
    const { text } = summaryMail({
      app: "Guestroll",
      locale: "en",
      event: "Party",
      accent: "#ffc72c",
      url: "https://x.test/admin/events/1",
      photos: 120,
      guests: 31,
      pending: 4,
      views: 212,
      topGuests: [{ name: "Léa", photos: 18 }, { name: "", photos: 9 }],
      galleryRecipients: 12,
    });
    expect(text).toContain("Photos: 120");
    expect(text).toContain("Waiting for approval: 4");
    expect(text).toContain("- Léa: 18");
    expect(text).not.toContain("- : 9");
    expect(text).toContain("Guests who received a gallery link: 12.");
  });
});
