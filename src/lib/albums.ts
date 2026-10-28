export interface Album {
  slug: string;
  title: string;
  date?: string;
  guests?: number;
  description?: string;
  photos: { image: string; alt?: string }[];
}

const files = import.meta.glob<{ frontmatter: Omit<Album, 'slug'> }>('/src/content/impressionen/*.md', {
  eager: true,
});

export const albums: Album[] = Object.entries(files)
  .map(([path, mod]) => ({
    ...mod.frontmatter,
    photos: mod.frontmatter.photos ?? [],
    slug: path.split('/').pop()!.replace(/\.md$/, ''),
  }))
  // Neueste Anlässe zuerst, Alben ohne Datum am Schluss.
  .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

export function formatMonth(date?: string): string | undefined {
  if (!date) return undefined;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString('de-CH', { month: 'long', year: 'numeric' });
}
