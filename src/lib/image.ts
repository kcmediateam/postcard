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

/**
 * Resize a data-URL image to EXACTLY targetW × targetH WITHOUT cropping any of
 * the design (contain-fit). To avoid white bars when the art's ratio doesn't
 * exactly match the target, any thin edge gap is filled with a zoomed
 * (cover-fit) copy of the same art behind it, so it still looks full-bleed.
 * Makes any reasonable upload meet Lob's strict size/ratio requirement.
 */
export async function fitImageToExactDataUrl(
  dataUrl: string,
  targetW: number,
  targetH: number,
  quality = 0.92
): Promise<string> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, targetW, targetH);

  // Background: cover-fit (fills the canvas, slightly zoomed) so edges blend.
  const cover = Math.max(targetW / img.width, targetH / img.height);
  const cw = img.width * cover;
  const ch = img.height * cover;
  ctx.drawImage(img, (targetW - cw) / 2, (targetH - ch) / 2, cw, ch);

  // Foreground: contain-fit (the WHOLE design, nothing cropped), centered.
  const contain = Math.min(targetW / img.width, targetH / img.height);
  const fw = img.width * contain;
  const fh = img.height * contain;
  ctx.drawImage(img, (targetW - fw) / 2, (targetH - fh) / 2, fw, fh);

  return canvas.toDataURL("image/jpeg", quality);
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
