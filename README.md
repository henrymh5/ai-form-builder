# AI Form Builder mit Claude Haiku

Eine mandantenfähige SaaS-Anwendung: Formulare per Claude Haiku generieren, im visuellen Builder bearbeiten, versioniert veröffentlichen, öffentlich ausfüllen lassen und auswerten (Antworten, Analytics, CSV-Export, Embed).

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4 · Supabase (Postgres, Auth, Storage, RLS) · `@anthropic-ai/sdk` (Claude Haiku 4.5) · Zod · React Hook Form · dnd-kit · Zustand · Vitest · Playwright.

> **Hinweis:** Diese Next.js-Version weicht in Konventionen von älteren Trainingsdaten ab (z. B. `proxy.ts` statt `middleware.ts`). Details in `AGENTS.md` und `node_modules/next/dist/docs/`.

## Architekturüberblick

```
src/
├── app/
│   ├── (auth)/              Login, Registrierung, Passwort-Reset
│   ├── (app)/               authentifizierter Bereich (Dashboard, Builder, Antworten, Analytics, Workspace)
│   ├── f/[slug]/            öffentlicher Formular-Renderer (eigenes Root-Layout)
│   ├── embed/[slug]/        Embed-Variante (iframe, postMessage)
│   └── api/
│       ├── ai/              KI-Endpunkte (Route Handler)
│       ├── forms/[id]/…     CSV-Export u. Ä.
│       └── public/forms/…   Sessions, Events, Submissions (anonymer Pfad)
├── features/                UI-Feature-Module (form-builder, form-renderer, form-responses, form-analytics, …)
└── lib/
    ├── form-schema/         kanonisches Zod-Schema + Migrationen + Domain-Validierung
    ├── logic-engine/        reine Sichtbarkeits-/Navigations-/Zyklen-Logik (kein React, kein IO)
    ├── validation/          Feldvalidierung → Zod-Laufzeitschema (Client + Server identisch)
    ├── ai/                  Anthropic-Client, Operation-Registry, Prompts
    ├── db/                  Datenzugriffsschicht (Repository-Pattern, RLS-gebundener User-Client + Service-Client)
    ├── csv/                 CSV-Serialisierung (Formel-Injection-Schutz, UTF-8-BOM)
    └── security/            Rate Limiting

supabase/migrations/         SQL-Migrationen (Schema + RLS-Policies in derselben Migration)
e2e/                         Playwright-End-to-End-Tests
```

**Kernprinzipien:**
- **Ein Formschema, ein Renderer.** Builder, Vorschau, Testmodus und öffentliches Formular nutzen exakt dieselbe `FormRenderer`-Komponente und dieselbe Validierungslogik — nie zwei Implementierungen.
- **Unveränderliche Versionen.** Veröffentlichungen werden als Snapshot in `form_versions` gespeichert (nie mutiert); Entwürfe leben getrennt als JSONB-Spalte auf `forms`. Antworten werden immer gegen ihre eigene Version gerendert.
- **RLS als harte Grenze.** Jede Tenant-Tabelle hat Row-Level-Security-Policies in derselben Migration wie die Tabelle selbst. Anonyme Formularbesucher haben keinerlei direkten Tabellenzugriff — alle öffentlichen Schreib-/Lesepfade laufen über Route Handler mit serverseitiger Validierung.
- **KI ist additiv.** Das Produkt ist ohne Claude-Integration voll funktionsfähig; die KI-Generierung ist eine zusätzliche Erstellungsart neben Vorlage/manuell.

## Lokale Entwicklung

### Voraussetzungen

- Node.js, [pnpm](https://pnpm.io/)
- Docker Desktop (für die lokale Supabase-Instanz)

### Setup

```bash
pnpm install
cp .env.example .env.local
pnpm exec supabase start   # startet lokales Postgres/Auth/Storage, druckt Keys
```

Trage die von `supabase start` ausgegebenen Werte (`API URL`, `anon key`, `service_role key`) in `.env.local` ein. Für die KI-Generierung zusätzlich einen `ANTHROPIC_API_KEY` eintragen (optional — der Rest der App funktioniert ohne).

```bash
pnpm dev
```

Öffne [http://localhost:3000](http://localhost:3000).

### Tests

```bash
pnpm typecheck
pnpm lint
pnpm test              # Unit/Component-Tests (Vitest)
pnpm test:integration  # RLS-/DB-Integrationstests (braucht laufendes lokales Supabase)
pnpm test:e2e          # Playwright End-to-End (baut + startet die App selbst)
```

### Datenbank zurücksetzen / Migrationen anwenden

```bash
pnpm exec supabase db reset
```

Wendet alle Migrationen unter `supabase/migrations/` frisch an.

## Deployment

Vercel (App) + Supabase Cloud (DB). Produktions-Migrationen über `pnpm exec supabase db push` gegen das verlinkte Projekt; Umgebungsvariablen entsprechend `.env.example` in den Vercel-Projekteinstellungen setzen.
