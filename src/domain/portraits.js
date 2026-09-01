export const MAX_PORTRAIT_FILE_BYTES = 15 * 1024 * 1024;
export const PORTRAIT_OUTPUT_SIZE = 720;

export function validPortraitDataUrl(value) {
  return /^data:image\/(?:jpeg|png|webp);base64,/i.test(String(value || ""));
}

export function resolveCharacterPortrait(character, avatarMap, fallback) {
  if (validPortraitDataUrl(character?.portraitDataUrl)) return character.portraitDataUrl;
  return avatarMap?.[character?.avatar] || fallback || Object.values(avatarMap || {})[0] || "";
}

export function portraitPatch({ avatar, portraitDataUrl = "" }) {
  return portraitDataUrl ? { avatar, portraitDataUrl } : { avatar, portraitDataUrl: "" };
}

export async function preparePortraitFile(file) {
  if (!file || !String(file.type).startsWith("image/")) throw new Error("Choose a PNG, JPEG, or WebP image.");
  if (file.size > MAX_PORTRAIT_FILE_BYTES) throw new Error("Portrait images must be 15 MB or smaller.");
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const candidate = new Image();
      candidate.onload = () => resolve(candidate);
      candidate.onerror = () => reject(new Error("That image could not be opened."));
      candidate.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = PORTRAIT_OUTPUT_SIZE; canvas.height = PORTRAIT_OUTPUT_SIZE;
    const context = canvas.getContext("2d");
    const crop = Math.min(image.naturalWidth, image.naturalHeight);
    const sourceX = (image.naturalWidth - crop) / 2, sourceY = (image.naturalHeight - crop) / 2;
    context.drawImage(image, sourceX, sourceY, crop, crop, 0, 0, PORTRAIT_OUTPUT_SIZE, PORTRAIT_OUTPUT_SIZE);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally { URL.revokeObjectURL(url); }
}
