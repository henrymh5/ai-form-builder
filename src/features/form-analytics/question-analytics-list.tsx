import { Card, CardTitle } from "@/components/ui/card";
import type { QuestionAnalytics } from "@/lib/db/repositories/analytics";

/** Per-question breakdown (plan §13 "Fragenanalyse"): answer/skip rate + most common answers. */
export function QuestionAnalyticsList({ questions }: { questions: QuestionAnalytics[] }) {
  return (
    <Card className="space-y-4">
      <CardTitle>Fragenanalyse</CardTitle>
      {questions.length === 0 ? (
        <p className="text-text-secondary text-sm">Keine Fragen vorhanden.</p>
      ) : (
        <div className="space-y-4">
          {questions.map((question) => (
            <div
              key={question.fieldId}
              className="border-border border-b pb-4 last:border-0 last:pb-0"
            >
              <p className="text-text-primary text-sm font-medium">{question.label}</p>
              <p className="text-text-secondary text-xs">
                {question.answerCount} Antworten · {Math.round(question.skipRate * 100)}%
                übersprungen
              </p>
              {question.topAnswers.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {question.topAnswers.map((answer) => (
                    <li
                      key={answer.label}
                      className="text-text-secondary flex justify-between text-xs"
                    >
                      <span>{answer.label}</span>
                      <span>{answer.count}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
