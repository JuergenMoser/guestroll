import type { Locale } from "@/lib/constants";
import { mailMessages, type MailMessages } from "./messages";

/**
 * Email rendering: one layout, table-based with inline styles (what mail
 * clients actually support), always with a plain-text twin. Pure functions:
 * every value that reaches the HTML is escaped here.
 */

export interface RenderedMail {
  subject: string;
  html: string;
  text: string;
}

const esc = (s: string) => s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[c]!);

function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}

const HEX = /^#[0-9a-f]{6}$/i;

interface Block {
  title: string;
  paragraphs: string[];
  rows?: [string, string][];
  list?: string[];
  cta?: { label: string; url: string };
  /** A value the reader must copy (the gallery password): shown in its own box. */
  secret?: { label: string; value: string };
  notes?: string[];
}

function layout(block: Block, opts: { app: string; accent: string; footer: string }): { html: string; text: string } {
  const accent = HEX.test(opts.accent) ? opts.accent : "#ffc72c";
  const p = (s: string) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.55;color:#45484c">${esc(s)}</p>`;
  const rows = block.rows?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;border-top:1px solid #dadcd6">${block.rows
        .map(
          ([k, v]) =>
            `<tr><td style="padding:10px 0;border-bottom:1px solid #dadcd6;font-size:15px;color:#63676b">${esc(k)}</td><td align="right" style="padding:10px 0;border-bottom:1px solid #dadcd6;font-size:17px;font-weight:600;color:#1a1b1d">${esc(v)}</td></tr>`,
        )
        .join("")}</table>`
    : "";
  const list = block.list?.length
    ? `<ul style="margin:0 0 16px;padding-left:20px;color:#45484c;font-size:15px;line-height:1.6">${block.list.map((li) => `<li>${esc(li)}</li>`).join("")}</ul>`
    : "";
  const cta = block.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px"><tr><td style="border-radius:10px;background:${accent}"><a href="${esc(block.cta.url)}" style="display:inline-block;padding:13px 22px;font-size:16px;font-weight:600;color:#1a1b1d;text-decoration:none">${esc(block.cta.label)}</a></td></tr></table>`
    : "";
  const secret = block.secret
    ? `<p style="margin:0 0 6px;font-size:14px;color:#63676b">${esc(block.secret.label)}</p><p style="margin:0 0 18px;padding:12px 14px;border-radius:10px;background:#f2f3f0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:20px;letter-spacing:1px;color:#1a1b1d">${esc(block.secret.value)}</p>`
    : "";
  const notes = (block.notes ?? []).map((n) => `<p style="margin:0 0 8px;font-size:14px;line-height:1.5;color:#63676b">${esc(n)}</p>`).join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(block.title)}</title></head>
<body style="margin:0;padding:0;background:#f2f3f0;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f3f0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;border-top:8px solid ${accent}">
<tr><td style="padding:28px 28px 8px;font-size:15px;font-weight:700;color:#1a1b1d">${esc(opts.app)}</td></tr>
<tr><td style="padding:8px 28px 24px">
<h1 style="margin:0 0 16px;font-size:26px;line-height:1.15;color:#1a1b1d">${esc(block.title)}</h1>
${block.paragraphs.map(p).join("")}${rows}${list}${cta}${secret}${notes}
</td></tr></table>
<p style="margin:18px 0 0;font-size:12px;color:#9a9ea2">${esc(opts.footer)}</p>
</td></tr></table></body></html>`;

  const text = [
    block.title,
    "",
    ...block.paragraphs,
    ...(block.rows?.length ? ["", ...block.rows.map(([k, v]) => `${k}: ${v}`)] : []),
    ...(block.list?.length ? ["", ...block.list.map((li) => `- ${li}`)] : []),
    ...(block.cta ? ["", `${block.cta.label}: ${block.cta.url}`] : []),
    ...(block.secret ? ["", `${block.secret.label} ${block.secret.value}`] : []),
    ...(block.notes?.length ? ["", ...block.notes] : []),
    "",
    "--",
    opts.footer,
  ].join("\n");

  return { html, text };
}

interface Common {
  app: string;
  locale: Locale;
}

function make(m: MailMessages, c: Common, subject: string, block: Block, accent = "#ffc72c"): RenderedMail {
  return { subject, ...layout(block, { app: c.app, accent, footer: fill(m.footer, { app: c.app }) }) };
}

export function testMail(c: Common): RenderedMail {
  const m = mailMessages[c.locale];
  return make(m, c, fill(m.test.subject, { app: c.app }), { title: m.test.title, paragraphs: [fill(m.test.body, { app: c.app })] });
}

export function galleryMail(
  c: Common & { event: string; accent: string; url: string; password: string | null; expiresAt: number | null; downloads: boolean },
): RenderedMail {
  const m = mailMessages[c.locale];
  const date = c.expiresAt ? new Intl.DateTimeFormat(c.locale, { dateStyle: "long" }).format(new Date(c.expiresAt)) : null;
  return make(
    m,
    c,
    fill(m.gallery.subject, { event: c.event }),
    {
      title: fill(m.gallery.title, { event: c.event }),
      paragraphs: [m.gallery.body],
      cta: { label: m.gallery.cta, url: c.url },
      secret: c.password ? { label: m.gallery.password, value: c.password } : undefined,
      notes: [
        ...(c.password ? [] : [m.gallery.passwordFromHosts]),
        ...(date ? [fill(m.gallery.expires, { date })] : []),
        ...(c.downloads ? [m.gallery.downloads] : []),
      ],
    },
    c.accent,
  );
}

export function summaryMail(
  c: Common & {
    event: string;
    accent: string;
    url: string;
    photos: number;
    guests: number;
    pending: number;
    views: number;
    topGuests: { name: string; photos: number }[];
    galleryRecipients: number;
    gallery?: { url: string; password: string };
    messages?: number;
  },
): RenderedMail {
  const m = mailMessages[c.locale];
  const top = c.topGuests.filter((g) => g.name).slice(0, 3);
  return make(
    m,
    c,
    fill(m.summary.subject, { event: c.event }),
    {
      title: fill(m.summary.title, { event: c.event }),
      paragraphs: [m.summary.body],
      rows: [
        [m.summary.photos, String(c.photos)],
        [m.summary.guests, String(c.guests)],
        [m.summary.views, String(c.views)],
        ...(c.pending ? ([[m.summary.pending, String(c.pending)]] as [string, string][]) : []),
        ...(c.messages ? ([[m.summary.messages, String(c.messages)]] as [string, string][]) : []),
      ],
      list: top.length ? top.map((g) => `${g.name}: ${g.photos}`) : undefined,
      cta: { label: m.summary.cta, url: c.url },
      secret: c.gallery ? { label: fill(m.summary.galleryPassword, { url: c.gallery.url }), value: c.gallery.password } : undefined,
      notes: c.galleryRecipients ? [fill(m.summary.galleryLink, { count: c.galleryRecipients })] : [],
    },
    c.accent,
  );
}

export function pendingMail(c: Common & { event: string; accent: string; url: string; count: number }): RenderedMail {
  const m = mailMessages[c.locale];
  return make(
    m,
    c,
    fill(m.pending.subject, { event: c.event, count: c.count }),
    { title: fill(m.pending.title, { count: c.count }), paragraphs: [fill(m.pending.body, { event: c.event })], cta: { label: m.pending.cta, url: c.url } },
    c.accent,
  );
}

export function failedLoginsMail(c: Common & { url: string; count: number }): RenderedMail {
  const m = mailMessages[c.locale];
  return make(m, c, fill(m.failedLogins.subject, { app: c.app, count: c.count }), {
    title: m.failedLogins.title,
    paragraphs: [fill(m.failedLogins.body, { count: c.count })],
    cta: { label: m.failedLogins.cta, url: c.url },
  });
}

export function storageMail(c: Common & { url: string; percent: number; free: string }): RenderedMail {
  const m = mailMessages[c.locale];
  return make(m, c, fill(m.storage.subject, { app: c.app, percent: c.percent }), {
    title: m.storage.title,
    paragraphs: [fill(m.storage.body, { percent: c.percent, free: c.free })],
    cta: { label: m.storage.cta, url: c.url },
  });
}

export function purgeMail(c: Common & { event: string; accent: string; url: string; date: string }): RenderedMail {
  const m = mailMessages[c.locale];
  return make(
    m,
    c,
    fill(m.purge.subject, { event: c.event, date: c.date }),
    { title: fill(m.purge.title, { date: c.date }), paragraphs: [fill(m.purge.body, { event: c.event })], cta: { label: m.purge.cta, url: c.url } },
    c.accent,
  );
}

export function backupFailedMail(c: Common & { url: string; error: string }): RenderedMail {
  const m = mailMessages[c.locale];
  return make(m, c, fill(m.backupFailed.subject, { app: c.app }), {
    title: m.backupFailed.title,
    paragraphs: [m.backupFailed.body],
    notes: [c.error],
    cta: { label: m.backupFailed.cta, url: c.url },
  });
}
