import { Helmet } from "react-helmet-async";
import { useRef } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";
import { useI18n } from "@/i18n";
import HighlightedText from "@/components/HighlightedText";
import { DocumentPreview } from "@/components/DocumentPreview";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import jsPDF from "jspdf";
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
  const file: File | undefined = location.state?.file;

  const contentRef = useRef<HTMLDivElement>(null);
  const isPDF = !!file && ((file.type && file.type.includes('pdf')) || file.name?.toLowerCase().endsWith('.pdf'));

  const handleDownloadPdf = async () => {
    const node = contentRef.current;
    if (!node) return;
    const pdf = new jsPDF('p', 'mm', 'a4');
    await pdf.html(node, {
      margin: [10, 10, 10, 10],
      autoPaging: 'text',
      html2canvas: { scale: 0.9, useCORS: true },
      callback: (doc) => doc.save('acadcheck_report.pdf'),
      x: 0,
      y: 0,
      width: pdf.internal.pageSize.getWidth() - 20,
      windowWidth: node.scrollWidth,
    } as any);
  };

  // Build highlight groups from sentence scores (adaptive thresholds)
  const sentences = report.sentences || [];
  const uniq = (arr: string[]) => Array.from(new Set((arr || []).filter(Boolean)));

  // AI: prefer >=70, else >=50, else top 10% (at least 1)
  let aiTerms = uniq(sentences.filter((s: any) => s.ai >= 70).map((s: any) => s.sentence));
  if (aiTerms.length === 0) {
    aiTerms = uniq(sentences.filter((s: any) => s.ai >= 50).map((s: any) => s.sentence));
  }
  if (aiTerms.length === 0 && sentences.length) {
    const topCount = Math.max(1, Math.ceil(sentences.length * 0.1));
    aiTerms = uniq([...sentences].sort((a: any, b: any) => b.ai - a.ai).slice(0, topCount).map((s: any) => s.sentence));
  }

  // Plagiarism: prefer >=50, else >=40, else top 10% (at least 1)
  let plgTerms = uniq(sentences.filter((s: any) => s.plagiarism >= 50).map((s: any) => s.sentence));
  if (plgTerms.length === 0) {
    plgTerms = uniq(sentences.filter((s: any) => s.plagiarism >= 40).map((s: any) => s.sentence));
  }
  if (plgTerms.length === 0 && sentences.length) {
    const topCount = Math.max(1, Math.ceil(sentences.length * 0.1));
    plgTerms = uniq([...sentences].sort((a: any, b: any) => b.plagiarism - a.plagiarism).slice(0, topCount).map((s: any) => s.sentence));
  }
  // If overall plagiarism is 0%, do not highlight any plagiarism
  if ((report?.plagiarism ?? 0) <= 0) {
    plgTerms = [];
  }

  const groups = [
    { terms: aiTerms, className: "mark-ai" },
    { terms: plgTerms, className: "mark-plagiarism" },
  ];
  return (
    <AppLayout>
      <Helmet>
        <title>AcadCheck | {t('report.title')}</title>
        <meta name="description" content="Detailed analysis report" />
      </Helmet>
      <div ref={contentRef} className="grid gap-6">
        <div className="grid md:grid-cols-4 gap-6">
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
            <h3 className="mb-2 font-semibold">Confiance</h3>
            <div className="text-3xl font-bold mb-2">{report.confidence || 0}%</div>
            <Progress value={report.confidence || 0} />
            <p className="text-xs text-muted-foreground mt-1">Fiabilité de l'analyse</p>
          </div>
          <div className="p-6 rounded-lg border bg-card shadow-sm">
            <h3 className="mb-2 font-semibold">{t('report.copyleaks')}</h3>
            <div className="text-3xl font-bold mb-2">{report.copyleaks?.matches || 0}</div>
            <p className="text-sm text-muted-foreground">Nombre d'appariements potentiels</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleDownloadPdf} variant="outline">Télécharger le PDF</Button>
          <Button onClick={() => window.print()} variant="outline">{t('report.exportPdf')}</Button>
          <Button onClick={() => downloadCsv('acadcheck_report.csv', [["Sentence","Plagiarism","AI","Source"], ...report.sentences.map((s: any) => [s.sentence, String(s.plagiarism), String(s.ai), s.source || ''])])} variant="outline">{t('report.exportCsv')}</Button>
        </div>

        {file && (
          <section className="p-6 rounded-lg border bg-card shadow-sm">
            <h3 className="font-semibold mb-3">Document analysé (aperçu fidèle)</h3>
            <DocumentPreview file={file} highlights={groups} />
          </section>
        )}

        {(!file || isPDF) && (
          <section className="p-6 rounded-lg border bg-card shadow-sm">
            <h3 className="font-semibold mb-3">{t('report.highlights')}</h3>
            <div className="prose max-w-none">
              {report.sentences.length ? (
                <HighlightedText text={text} groups={groups} />
              ) : (
                <p className="text-muted-foreground">{text}</p>
              )}
            </div>
          </section>
        )}

        {report.analysis && (
          <section className="p-6 rounded-lg border bg-card shadow-sm">
            <h3 className="font-semibold mb-4">Analyse détaillée</h3>
            <div className="grid gap-4">
              <div>
                <h4 className="font-medium mb-2">Style détecté</h4>
                <p className="text-sm bg-muted/50 p-3 rounded">{report.analysis.overallStyle}</p>
              </div>
              
              {report.analysis.suspiciousPatterns.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Patterns suspects détectés</h4>
                  <ul className="space-y-1">
                    {report.analysis.suspiciousPatterns.map((pattern: string, idx: number) => (
                      <li key={idx} className="text-sm text-orange-600 dark:text-orange-400">
                        • {pattern}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div>
                <h4 className="font-medium mb-2">Recommandations</h4>
                <ul className="space-y-1">
                  {report.analysis.recommendations.map((rec: string, idx: number) => (
                    <li key={idx} className="text-sm text-muted-foreground">
                      • {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        {report.sentences.length > 0 && (
          <section className="p-6 rounded-lg border bg-card shadow-sm">
            <h3 className="font-semibold mb-3">Analyse détaillée par phrase</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Phrase</TableHead>
                    <TableHead className="text-right">Plagiat</TableHead>
                    <TableHead className="text-right">IA</TableHead>
                    <TableHead className="text-right">Confiance</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Diversité</TableHead>
                    <TableHead className="text-right">Complexité</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.sentences.map((s: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="max-w-[400px] whitespace-pre-wrap break-words">{s.sentence}</TableCell>
                      <TableCell className="text-right">{s.plagiarism}%</TableCell>
                      <TableCell className="text-right">{s.ai}%</TableCell>
                      <TableCell className="text-right">{s.confidence || 0}%</TableCell>
                      <TableCell>{s.source || '—'}</TableCell>
                      <TableCell className="text-right">{s.features?.lexicalDiversity || 0}%</TableCell>
                      <TableCell className="text-right">{s.features?.syntacticComplexity || 0}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        )}

        <section className="p-6 rounded-lg border bg-card shadow-sm">
          <h3 className="font-semibold mb-3">Exemple de surlignage</h3>
          <article className="prose max-w-none">
            <HighlightedText
              text={"Bonjour, ceci est un exemple de texte. L'algorithme surligne les mots choisis, même avec des ponctuations!"}
              highlights={["exemple", "surligne", "ponctuations"]}
            />
          </article>
        </section>
      </div>
    </AppLayout>
  );
};

export default Report;
