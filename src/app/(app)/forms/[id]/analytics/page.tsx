import Link from "next/link";
import { notFound } from "next/navigation";
import { getForm } from "@/lib/db/repositories/forms";
import { getFormVersion } from "@/lib/db/repositories/form-versions";
import {
  getAnalyticsOverview,
  getAnalyticsFunnel,
  getQuestionAnalytics,
} from "@/lib/db/repositories/analytics";
import { OverviewCards } from "@/features/form-analytics/overview-cards";
import { FunnelChart } from "@/features/form-analytics/funnel-chart";
import { QuestionAnalyticsList } from "@/features/form-analytics/question-analytics-list";
import { Card } from "@/components/ui/card";

interface AnalyticsPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Analytics (plan §13): Overview, Funnel, and per-question breakdown,
 * computed on-demand — no rollup table needed at this scale. Labels are
 * resolved against the current published version; historical answers from
 * earlier versions still count toward the numbers, just rendered under the
 * latest version's question wording.
 */
export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const { id } = await params;
  const form = await getForm(id);
  if (!form) notFound();

  if (!form.publishedVersionId) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <Link href={`/forms/${id}`} className="text-text-secondary hover:text-text-primary text-sm">
          ← {form.title}
        </Link>
        <h1 className="text-text-primary text-2xl font-semibold">Analytics</h1>
        <Card className="py-12 text-center">
          <p className="text-text-primary text-sm font-medium">
            Noch keine veröffentlichte Version
          </p>
          <p className="text-text-secondary mt-1 text-sm">
            Analytics stehen zur Verfügung, sobald das Formular veröffentlicht wurde.
          </p>
        </Card>
      </div>
    );
  }

  const version = await getFormVersion(form.publishedVersionId);
  if (!version) notFound();

  const [overview, funnel, questions] = await Promise.all([
    getAnalyticsOverview(id),
    getAnalyticsFunnel(id, version.definition),
    getQuestionAnalytics(id, version.definition),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <Link href={`/forms/${id}`} className="text-text-secondary hover:text-text-primary text-sm">
          ← {form.title}
        </Link>
        <h1 className="text-text-primary text-2xl font-semibold">Analytics</h1>
      </div>

      <OverviewCards overview={overview} />
      <FunnelChart steps={funnel} />
      <QuestionAnalyticsList questions={questions} />
    </div>
  );
}
