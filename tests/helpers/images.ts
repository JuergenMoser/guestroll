import sharp from "sharp";

/** A real JPEG, optionally carrying EXIF with a GPS position, like a phone photo. */
export async function jpeg({ width = 1200, height = 900, gps = false } = {}): Promise<Buffer> {
  const image = sharp({ create: { width, height, channels: 3, background: { r: 200, g: 120, b: 40 } } }).jpeg();
  if (!gps) return image.toBuffer();
  return image
    .withExif({
      IFD0: { Make: "TestPhone", Model: "Guestroll 1" },
      // GPS IFD is not writable through sharp's typed API: smuggle a GPS-looking tag in IFD0 instead.
      IFD3: { GPSLatitudeRef: "N", GPSLatitude: "48/1 51/1 24/1", GPSLongitudeRef: "E", GPSLongitude: "2/1 21/1 3/1" },
    })
    .toBuffer();
}

export const png = (width = 400, height = 300) =>
  sharp({ create: { width, height, channels: 4, background: { r: 10, g: 200, b: 90, alpha: 1 } } }).png().toBuffer();
