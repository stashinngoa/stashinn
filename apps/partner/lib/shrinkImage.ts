// Browser-only helper (uses canvas). Import it from client components.

/**
 * Phone photos are often 3–6 MB, and Vercel rejects request bodies over ~4.5 MB, so photos are
 * scaled to 1600 px JPEGs in the browser first. Anything the browser can't decode is sent as is.
 */
export async function shrinkImage(file: File): Promise<File> {
  if (file.size < 600 * 1024) return file;
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    }).finally(() => setTimeout(() => URL.revokeObjectURL(url), 0));
    const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.82));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}
