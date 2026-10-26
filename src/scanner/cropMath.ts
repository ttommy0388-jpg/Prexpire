// Maps the scanning frame on screen to the matching region of a captured photo.
//
// The camera preview fills its view with "cover" scaling: the photo is scaled until it covers
// the view and the overflow is cut off equally on both sides. Undoing that scaling gives the
// part of the photo that sits behind the frame. No React Native imports, so it runs in tests.

export type Size = { width: number; height: number };
export type Rect = { x: number; y: number; width: number; height: number };

// `pad` grows the crop by that fraction of the frame on each side, so text that pokes
// slightly outside the brackets (or a small preview/photo mismatch) is still read.
export function cropForFrame(view: Size, frame: Rect, photo: Size, pad = 0.12): Rect | null {
  if (view.width <= 0 || view.height <= 0 || photo.width <= 0 || photo.height <= 0) return null;
  // A photo in the other orientation means rotation was not applied; the caller reads the whole photo.
  if (view.width > view.height !== photo.width > photo.height && Math.abs(view.width - view.height) > 1) return null;

  const scale = Math.max(view.width / photo.width, view.height / photo.height);
  const offsetX = (photo.width * scale - view.width) / 2;
  const offsetY = (photo.height * scale - view.height) / 2;

  const px = frame.width * pad;
  const py = frame.height * pad;
  const x0 = Math.max(0, (frame.x - px + offsetX) / scale);
  const y0 = Math.max(0, (frame.y - py + offsetY) / scale);
  const x1 = Math.min(photo.width, (frame.x + frame.width + px + offsetX) / scale);
  const y1 = Math.min(photo.height, (frame.y + frame.height + py + offsetY) / scale);
  if (x1 - x0 < 8 || y1 - y0 < 8) return null;
  return { x: Math.round(x0), y: Math.round(y0), width: Math.floor(x1 - x0), height: Math.floor(y1 - y0) };
}
