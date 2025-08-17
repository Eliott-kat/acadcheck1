import { Helmet } from "react-helmet-async";
import { useRef, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";
import { useI18n } from "@/i18n";
import { DocumentViewer } from "@/components/DocumentViewer";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { exportReportToPDF } from "@/lib/exportPdf";

const Report = () => {
  const { t } = useI18n();
  const location = useLocation();
  const report = location.state?.report || { plagiarism: 0, aiScore: 0, sentences: [] };
  const text = location.state?.text || '';
  const file: File | undefined = location.state?.file;

  const contentRef = useRef<HTMLDivElement>(null);
  const isPDF = !!file && ((file.type && file.type.includes('pdf')) || file.name?.toLowerCase().endsWith('.pdf'));
  const [selectedSentence, setSelectedSentence] = useState<{ sentence: string; page?: number } | null>(null);
  const [pdfPage, setPdfPage] = useState<number | undefined>(undefined);

  const handleDownloadPdf = async () => {
    await exportReportToPDF(".grid.gap-6", "acadcheck_report.pdf");
  };

  const sentences = report.sentences || [];
  const uniq = (arr: string[]) => Array.from(new Set((arr || []).filter(Boolean)));

  let aiTerms = uniq(sentences.filter((s) => s.ai >= 70).map((s) => s.sentence));
  if (aiTerms.length === 0) {
  aiTerms = uniq(sentences.filter((s) => s.ai >= 50).map((s) => s.sentence));
  }
  if (aiTerms.length === 0 && sentences.length) {
    const topCount = Math.max(1, Math.ceil(sentences.length * 0.1));
  aiTerms = uniq([...sentences].sort((a, b) => b.ai - a.ai).slice(0, topCount).map((s) => s.sentence));
  }

  let plgTerms = uniq(sentences.filter((s) => s.plagiarism >= 50).map((s) => s.sentence));
  if (plgTerms.length === 0) {
  plgTerms = uniq(sentences.filter((s) => s.plagiarism >= 40).map((s) => s.sentence));
  }
  if (plgTerms.length === 0 && sentences.length) {
    const topCount = Math.max(1, Math.ceil(sentences.length * 0.1));
  plgTerms = uniq([...sentences].sort((a, b) => b.plagiarism - a.plagiarism).slice(0, topCount).map((s) => s.sentence));
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
            <h3 className="mb-2 font-semibold">{t('report.confidence')}</h3>
            <div className="text-3xl font-bold mb-2">{report.confidence || 0}%</div>
            <Progress value={report.confidence || 0} />
            <p className="text-xs text-muted-foreground mt-1">Analysis reliability</p>
          </div>

        </div>


        <div className="flex gap-3">
          <Button onClick={handleDownloadPdf} variant="outline">Export PDF</Button>
        </div>


  {/* Afficher l'aperçu fidèle uniquement pour les PDF */}
  {file && (
    <section className="p-6 rounded-lg border bg-card shadow-sm">
      <h3 className="font-semibold mb-3">{t('report.highlights')}</h3>
      <DocumentViewer file={file} highlights={groups} mode="full" page={isPDF && pdfPage ? pdfPage : undefined} />
      {/* Affichage contextuel si la page n'est pas connue */}
      <Dialog open={isPDF && selectedSentence && !selectedSentence.page} onOpenChange={open => { if (!open) setSelectedSentence(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detected sentence</DialogTitle>
            <DialogDescription>
              <span className="text-base font-medium">{selectedSentence?.sentence}</span>
              <div className="text-xs text-muted-foreground mt-2">Page number not available for this sentence.</div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
      {/* Navigation par page + zone dédiée si la page est connue */}
      {isPDF && selectedSentence && selectedSentence.page && (
        <div className="my-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-900 rounded">
          <div className="font-semibold mb-1">Phrase détectée :</div>
          <div className="text-base">{selectedSentence.sentence}</div>
          <div className="text-xs mt-1">Page {selectedSentence.page}</div>
        </div>
      )}
    </section>
  )}

        {(!file || isPDF) && (
          <section className="p-6 rounded-lg border bg-card shadow-sm">
            <h3 className="font-semibold mb-3">{t('report.highlights')}</h3>
            <div className="prose max-w-none">
              {report.sentences.length ? (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <Table className="min-w-full text-sm">
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="font-semibold text-gray-700 uppercase tracking-wider">Sentence</TableHead>
                        <TableHead className="text-right font-semibold text-gray-700 uppercase tracking-wider">Plagiarism</TableHead>
                        <TableHead className="text-right font-semibold text-gray-700 uppercase tracking-wider">AI</TableHead>
                        <TableHead className="text-right font-semibold text-gray-700 uppercase tracking-wider">{t('report.confidence')}</TableHead>
                        <TableHead className="font-semibold text-gray-700 uppercase tracking-wider">Source</TableHead>
                        <TableHead className="text-right font-semibold text-gray-700 uppercase tracking-wider">Complexity</TableHead>
                        <TableHead className="text-right font-semibold text-gray-700 uppercase tracking-wider">Perplexity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.sentences
                        .filter((s: any) => s.plagiarism >= 30 || s.ai >= 50)
                        .sort((a: any, b: any) => Math.max(b.plagiarism, b.ai) - Math.max(a.plagiarism, a.ai))
                        .map((s: any, idx: number) => (
                          <TableRow
                            key={idx}
                            className="cursor-pointer hover:bg-primary/10"
                            onClick={() => {
                              setSelectedSentence({ sentence: s.sentence, page: s.page });
                              if (isPDF && s.page) setPdfPage(s.page);
                              if (!isPDF) {
                                const el = document.querySelector(`[data-sentence="${encodeURIComponent(s.sentence)}"]`);
                                if (el) {
                                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  el.classList.add('ring-2', 'ring-primary');
                                  setTimeout(() => el.classList.remove('ring-2', 'ring-primary'), 1600);
                                }
                              }
                            }}
                          >
                            <TableCell className="max-w-[300px] whitespace-pre-wrap break-words">{s.sentence}</TableCell>
                            <TableCell className="text-right">{s.plagiarism}%</TableCell>
                            <TableCell className="text-right">{s.ai}%</TableCell>
                            <TableCell className="text-right">{s.confidence || 0}%</TableCell>
                            <TableCell>{s.source || '—'}</TableCell>
                            <TableCell className="text-right">{s.features?.syntacticComplexity || 0}%</TableCell>
                            <TableCell className="text-right">{s.features?.perplexity?.toFixed(1) || '—'}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-muted-foreground">No sentences found.</div>
              )}
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
};

export default Report;
