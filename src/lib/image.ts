/**
 * Downscale an image file to a JPEG/PNG data URL within a max dimension.
 * Keeps the mock's localStorage small (photos embedded as data URLs add up).
 */
export async function fileToDownscaledDataUrl(
  file: File,
  maxDim = 1400,
  quality = 0.82
): Promise<string> {
  const dataUrl = await readAsDataUrl(file);
  // SVGs / tiny files: keep as-is.
  if (file.type === "image/svg+xml") return dataUrl;

  const img = await loadImage(dataUrl);
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  if (scale >= 1 && file.size < 400 * 1024) return dataUrl;

  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  const hasAlpha = file.type === "image/png";
  return canvas.toDataURL(
    hasAlpha ? "image/png" : "image/jpeg",
    hasAlpha ? undefined : quality
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image."));
    img.src = src;
  });
}
