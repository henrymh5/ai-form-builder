import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedFormBySlug } from "@/lib/db/repositories/public-forms";
import { EmbedFormClient } from "@/features/form-renderer/embed-form-client";

interface EmbedFormPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ transparent?: string; parent?: string }>;
}

export async function generateMetadata({ params }: EmbedFormPageProps): Promise<Metadata> {
  const { slug } = await params;
  const form = await getPublishedFormBySlug(slug);
  if (!form) return { title: "Formular nicht gefunden" };
  return { title: form.definition.metadata.title };
}

/**
 * Embed variant of the public form (plan §12) — chrome-less, transparent
 * background optional, communicates with the host page via postMessage.
 * Frame-ancestors is opened up for this route in `next.config.ts`.
 */
export default async function EmbedFormPage({ params, searchParams }: EmbedFormPageProps) {
  const { slug } = await params;
  const { transparent } = await searchParams;
  const form = await getPublishedFormBySlug(slug);
  if (!form) notFound();

  return (
    <main
      className="mx-auto min-h-screen px-4"
      style={{
        maxWidth: form.definition.theme.containerWidth,
        background: transparent === "1" ? "transparent" : undefined,
      }}
    >
      <EmbedFormClient slug={slug} definition={form.definition} />
    </main>
  );
}
