import type { ImageMetadata } from 'astro';

// Alle Bilder, die über den Editor hochgeladen werden, landen in src/assets/uploads.
// Die Datendateien speichern den Pfad als Text, z. B. "/src/assets/uploads/pizza.webp".
const uploads = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/uploads/**/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP}',
  { eager: true },
);

export function upload(path: string | undefined): ImageMetadata | undefined {
  if (!path) return undefined;
  const key = path.startsWith('/') ? path : `/${path}`;
  const found = uploads[key];
  if (!found) console.warn(`[rondisach] Bild nicht gefunden: ${path}`);
  return found?.default;
}
