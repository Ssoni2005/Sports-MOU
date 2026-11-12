export const flameLogoUrl = new URL("./flame-logo.png", import.meta.url);

export function pngAsset(bytes, alt) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {bytes, alt, width:view.getUint32(16), height:view.getUint32(20)};
}

export function sponsorLogoAsset(dataUrl) {
  const bytes = Uint8Array.from(atob(dataUrl.slice("data:image/png;base64,".length)), char => char.charCodeAt(0));
  return pngAsset(bytes, "Sponsor logo");
}

const maxFileSize = 8 * 1024 * 1024;
export async function prepareSponsorLogo(file) {
  if (file.size > maxFileSize) throw new Error("Choose an image of 8 MB or less.");
  const mimeTypes = ["image/png", "image/jpeg", "image/webp"];
  if (!mimeTypes.includes(file.type)) throw new Error("Choose a PNG, JPEG or WebP image.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 480 / image.naturalWidth, 160 / image.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}
