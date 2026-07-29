import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedFormBySlug } from "@/lib/db/repositories/public-forms";
import { PublicFormClient } from "@/features/form-renderer/public-form-client";

interface PublicFormPageProps {
  params: Promise<{ slug: string }>;
}

/** Individual metadata + Open Graph tags per form (plan §15). */
export async function generateMetadata({ params }: PublicFormPageProps): Promise<Metadata> {
  const { slug } = await params;
  const form = await getPublishedFormBySlug(slug);
  if (!form) return { title: "Formular nicht gefunden" };

  const { title, description } = form.definition.metadata;
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
  };
}

/** Public form URL — `/f/[slug]` (plan §15). Renders the same FormRenderer used in the builder, in `mode="public"`. */
export default async function PublicFormPage({ params }: PublicFormPageProps) {
  const { slug } = await params;
  const form = await getPublishedFormBySlug(slug);
  if (!form) notFound();

  return (
    <main
      className="mx-auto min-h-screen px-4"
      style={{ maxWidth: form.definition.theme.containerWidth }}
    >
      <PublicFormClient slug={slug} definition={form.definition} />
    </main>
  );
}
