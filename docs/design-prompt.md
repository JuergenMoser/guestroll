# Design prompt

The brief used to design Guestroll's interface, written as a prompt so it can be
handed to a designer, or to an AI assistant, when the UI evolves. It exists
because the first version looked like every generated app: near-black
background, one bright accent, a serif headline, tiny monospaced uppercase
labels above every heading, middle dots between metadata, identical rounded
cards. Nothing about it said "party photos".

Paste everything below the line.

---

You are redesigning the interface of **Guestroll**, a self-hosted web app for
events. Guests at a wedding or a birthday scan a QR code on their table, their
phone's camera opens, and every photo they take lands in the hosts' private
album. Hosts manage events, moderate photos, print QR codes and project a live
slideshow from an admin area.

## Who uses it, and where

- **Guests**: on a phone, standing, one hand holding a drink, in a dim and loud
  room, often tipsy, never willing to read instructions. They visit once,
  for about twenty seconds per photo. Any hesitation means a lost photo.
- **Hosts**: on a laptop, the week before the event (setup) and the day after
  (sorting, downloading). Calm, careful, need to trust the tool with memories.

## Ground the look in the subject

Take the visual language from the world of party photography, not from SaaS
dashboards:

- the **disposable camera** passed around the tables: a chunky colored body, a
  big shutter button, a little window counting the exposures left;
- the **photo-lab print**: white border, a date stamp in the corner, prints
  piling up in an envelope;
- the **contact sheet** where the hosts pick their favorites.

Use these as structure, not as decoration: the exposure counter *is* the upload
quota, the white border *is* how a sent photo is shown, the contact sheet *is*
the moderation grid. Don't add skeuomorphic textures, fake film grain or
plastic gloss.

## Constraints

- Light interface on a cool, neutral paper. No cream (#F4F1EA family), no
  near-black page background (the live wall, shown on a projector, is the one
  black screen).
- Each event has its own accent color, chosen by the hosts. The design must
  work with any of them: yellow, navy, pale pink. Compute readable text on top
  of it instead of assuming white.
- Two typefaces at most, both with character, neither of the usual defaults
  (Inter, Geist, Roboto, a high-contrast display serif). A rounded, slightly
  quirky grotesque fits the subject: it should feel like a party, not a bank.
- Sentence case everywhere. No uppercase tracked-out labels, no monospaced
  labels, no "eyebrow" text above headings unless it carries information the
  heading doesn't.
- No middle dots joining metadata, no arrows appended to buttons, no emoji as
  illustration, no gradients, no blurred color blobs, no glass effects.
- Cards only where content is a separable object (an event, a photo). Settings
  are a form, not a pile of cards. Radii follow hierarchy: large for the camera
  body, small for inputs, zero for photos (prints have square corners).
- One memorable element, everything else quiet: the guest page's camera body
  with its shutter and exposure counter.
- Motion only in answer to an action: the shutter press, a print sliding into
  the strip once sent. No entrance animations on load.

## Guest page, top to bottom

1. The event's name, large, set like the label printed on a disposable camera.
   Its date in the small type of a print's date stamp.
2. The camera body in the event color: shutter button, and the exposure
   counter showing how many photos are left (or how many were sent when
   there's no limit).
3. Under it, the guest's own prints, newest first, white borders, square
   corners, a pending mark when moderation is on. A line saying only the hosts
   and the guest can see them.

Error and empty states give direction in one sentence ("Uploads closed at
midnight. Thanks for the photos."), never an apology.

## Admin

Quiet and dense, like a lab's order desk: clear tables, aligned numbers, labels
next to fields, primary action in the event color only when an event is in
context. The photos tab reads like a contact sheet: tight grid, selection with
a thick outline and a count, bulk actions in a bar that appears on selection.

## Copy

Plain verbs, the user's words: "Take a photo", "Download all photos",
"Close uploads". A button keeps its name through the flow ("Save design" →
"Design saved"). Translate meaning, not words, in French, Italian and Spanish.

## Quality floor

Responsive from 320 px, thumb-reachable shutter, visible keyboard focus,
`prefers-reduced-motion` respected, 4.5:1 text contrast including on the event
color, 44 px touch targets on the guest page.
