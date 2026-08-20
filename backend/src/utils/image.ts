export const IMAGE_MEDIA_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

export const getImageFileInfo = (
  url: string,
): { mediaType: string; ext: string } => {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.split(".").pop()?.toLowerCase();
    const mediaType = ext ? IMAGE_MEDIA_TYPES[ext] : undefined;
    if (ext && mediaType) return { mediaType, ext };
  } catch (error) {
    console.warn("Failed to parse image media type from URL:", url, error);
  }
  return { mediaType: "image/png", ext: "png" };
};
