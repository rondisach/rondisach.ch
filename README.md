# rondisach.ch

Website von rondisach Pizza Catering, gebaut mit [Astro](https://astro.build).

## Lokal starten

```bash
npm install
npm run dev
```

Dann im Browser http://localhost:4321 öffnen.

## Inhalte ändern

- **Ohne Code:** über den Editor auf https://app.pagescms.org (Login mit GitHub). Konfiguration: `.pages.yml`.
- **Direkt in den Dateien:** Texte und Preise liegen in `src/data/*.json`, Event-Alben in `src/content/impressionen/*.md`, Bilder in `src/assets/uploads/`.

## Veröffentlichen

Jede Änderung auf `main` wird über GitHub Actions (`.github/workflows/deploy.yml`) automatisch gebaut und auf GitHub Pages veröffentlicht.
Einmalig nötig: Repo → Settings → Pages → Source auf „GitHub Actions“ stellen.
