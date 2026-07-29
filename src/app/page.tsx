import Link from "next/link";
import { Sparkles, MousePointerClick, GitBranch, BarChart3, Share2, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const FEATURES = [
  {
    icon: Sparkles,
    title: "KI-Generierung",
    description: "Formular aus einer kurzen Beschreibung erzeugen lassen (Claude Haiku).",
  },
  {
    icon: MousePointerClick,
    title: "Visueller Builder",
    description: "Felder per Drag-and-drop anordnen, Eigenschaften und Validierung anpassen.",
  },
  {
    icon: GitBranch,
    title: "Bedingte Logik",
    description: "Fragen und Seiten abhängig von vorherigen Antworten ein- oder ausblenden.",
  },
  {
    icon: Share2,
    title: "Veröffentlichen & Einbetten",
    description: "Versionierte öffentliche Formulare, teilbar per Link oder iframe-Embed.",
  },
  {
    icon: BarChart3,
    title: "Antworten & Analytics",
    description: "Eingereichte Antworten durchsehen, Funnel und Fragenanalyse einsehen.",
  },
  {
    icon: FileDown,
    title: "CSV-Export",
    description: "Antworten als CSV herunterladen, sicher gegen Formel-Injection.",
  },
] as const;

export default function Home() {
  return (
    <div className="bg-background flex flex-1 flex-col items-center px-6 py-16">
      <div className="w-full max-w-3xl space-y-12 text-center">
        <div className="space-y-4">
          <h1 className="text-text-primary text-3xl font-semibold sm:text-4xl">Form Creator</h1>
          <p className="text-text-secondary mx-auto max-w-xl text-base">
            Formulare per KI-Beschreibung, Vorlage oder manuell erstellen — im visuellen Builder
            bearbeiten, veröffentlichen und auswerten.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button asChild variant="primary" size="lg">
              <Link href="/register">Kostenlos ausprobieren</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/login">Anmelden</Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 text-left sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="flex items-start gap-3">
              <div className="bg-primary-subtle text-primary-text mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md">
                <Icon className="size-5" aria-hidden="true" />
              </div>
              <div>
                <CardTitle>{title}</CardTitle>
                <CardDescription className="mt-1">{description}</CardDescription>
              </div>
            </Card>
          ))}
        </div>

        <div className="border-border bg-surface-subtle mx-auto max-w-xl space-y-2 rounded-lg border p-4 text-left">
          <Badge variant="neutral">Portfolio-Projekt</Badge>
          <p className="text-text-secondary text-sm">
            Dies ist ein persönliches Portfolio-Projekt ohne kommerzielle Absicht. Es dient
            ausschließlich der Demonstration technischer Fähigkeiten und wird nicht als Produkt
            angeboten oder betrieben.
          </p>
        </div>

        <Link
          href="/dev/tokens"
          className="text-primary-text hover:text-primary-hover inline-block text-sm font-medium underline underline-offset-4"
        >
          Design-Token-Übersicht ansehen
        </Link>

        <div className="space-y-2 text-left">
          <h2 className="text-text-primary text-lg font-semibold">Embed-Test</h2>
          <p className="text-text-secondary text-sm">
            Direkter iframe-Embed von <code>/embed/anfrage-f-r-werbeagentur-ms4qbfmm</code> — zum
            Testen, ob das eingebettete Ausfüllen fehlerfrei funktioniert.
          </p>
          <iframe
            src="/embed/anfrage-f-r-werbeagentur-ms4qbfmm"
            title="Embed-Test: Anfrage für Werbeagentur"
            className="border-border w-full rounded-lg border"
            style={{ height: 600 }}
          />
        </div>
      </div>
    </div>
  );
}
