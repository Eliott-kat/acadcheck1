import { Helmet } from "react-helmet-async";
import AppLayout from "@/components/layout/AppLayout";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";
import { useI18n } from "@/i18n";

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map(r => r.map(v => '"' + v.split('"').join('""') + '"').join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const Report = () => {
  const { t } = useI18n();
  const location = useLocation() as { state?: any };
  const report = location.state?.report || { plagiarism: 0, aiScore: 0, sentences: [], copyleaks: { matches: 0 } };
  const text = location.state?.text || '';

  return (
    <AppLayout>
      <Helmet>
        <title>AcadCheck | {t('report.title')}</title>
        <meta name="description" content="Detailed analysis report" />
      </Helmet>
      <div className="grid gap-6">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-6 rounded-lg border bg-card shadow-sm">
            <h3 className="mb-2 font-semibold">{t('report.plagiarism')}</h3>
            <div className="text-3xl font-bold mb-2">{report.plagiarism}%</div>
            <Progress value={report.plagiarism} />
          </div>
          <div className="p-6 rounded-lg border bg-card shadow-sm">
            <h3 className="mb-2 font-semibold">{t('report.ai')}</h3>
            <div className="text-3xl font-bold mb-2">{report.aiScore}%</div>
            <Progress value={report.aiScore} />
          </div>
          <div className="p-6 rounded-lg border bg-card shadow-sm">
            <h3 className="mb-2 font-semibold">{t('report.copyleaks')}</h3>
            <div className="text-3xl font-bold mb-2">{report.copyleaks?.matches || 0}</div>
            <p className="text-sm text-muted-foreground">Nombre d'appariements potentiels</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={() => window.print()} variant="outline">{t('report.exportPdf')}</Button>
          <Button onClick={() => downloadCsv('acadcheck_report.csv', [["Sentence","Plagiarism","AI","Source"], ...report.sentences.map((s: any) => [s.sentence, String(s.plagiarism), String(s.ai), s.source || ''])])} variant="outline">{t('report.exportCsv')}</Button>
        </div>

        <section className="p-6 rounded-lg border bg-card shadow-sm">
          <h3 className="font-semibold mb-3">{t('report.highlights')}</h3>
          <div className="prose max-w-none">
            {report.sentences.length ? (
              <p>
                {report.sentences.map((s: any, i: number) => (
                  <span key={i} className="px-1 rounded-sm" style={{ backgroundColor: `hsl(${s.plagiarism > 60 ? '0 84% 60% / 0.15' : s.ai > 60 ? '48 96% 53% / 0.15' : '221 83% 53% / 0.09'})` }}>
                    {s.sentence} {" "}
                  </span>
                ))}
              </p>
            ) : (
              <p className="text-muted-foreground">{text}</p>
            )}
          </div>
        </section>
      </div>
    </AppLayout>
  );
};

export default Report;
