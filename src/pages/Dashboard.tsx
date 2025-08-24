import { Helmet } from "react-helmet-async";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { analyzeText } from "@/lib/localDetector";
import { toast } from "@/components/ui/use-toast";
import { fileToText } from "@/lib/fileToText";
import { DocumentViewer } from "@/components/DocumentViewer";
import { getAllDocuments } from "@/lib/corpusDB";

const Dashboard = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [pasted, setPasted] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const onFile = async (file?: File | null) => {
    if (!file) return;
    setSelectedFile(file);
    try {
      //const content = await fileToText(file);
      //setPasted(content);
      toast({ title: "File imported", description: `Text extracted from ${file.name}` });
    } catch (e) {
      toast({ title: "Unsupported format", description: "Please import a .pdf, .docx or .txt file.", variant: "destructive" });
    }
  };

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate('/login');
    };
    check();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate('/login');
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const onAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    let text = pasted.trim();

    // Si un fichier est sélectionné, extraire son texte
    if (selectedFile) {
      try {
        text = await fileToText(selectedFile);
      } catch (err) {
        toast({
          title: "Unsupported format",
          description: "Please import a .pdf, .docx or .txt file.",
          variant: "destructive"
        });
        return;
      }
    }

    if (!text) {
      toast({
        title: "Text required",
        description: "Paste some text or import a .pdf, .docx or .txt file for a 100% offline local analysis."
      });
      return;
    }

    setLoading(true);
    try {
      const docs = await getAllDocuments();
      const report = await analyzeText(text, {
        corpus: docs.map(d => ({ name: d.name, text: d.text })),
        useML: true
      });

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const uid = session?.user?.id;
        if (uid) {
          let storagePath: string | null = null;

          if (selectedFile) {
            const fileName = `${uid}/${Date.now()}_${selectedFile.name}`;
            const { error: uploadError } = await supabase.storage
              .from('documents')
              .upload(fileName, selectedFile);

            if (!uploadError) {
              storagePath = fileName;
            }
          }

          const { data: analysis } = await supabase.from('analyses').insert({
            user_id: uid,
            text_length: text.length,
            ai_score: Math.round(report.aiScore ?? 0),
            plagiarism_score: Math.round(report.plagiarism ?? 0),
            document_name: selectedFile?.name ?? null,
            storage_path: storagePath,
            language: 'en',
            status: 'completed'
          }).select().single();

          if (analysis && report.sentences) {
            const sentences = report.sentences.map((sentence, idx) => ({
              analysis_id: analysis.id,
              idx,
              text: sentence.sentence,
              ai: Math.round(sentence.ai ?? 0),
              plagiarism: Math.round(sentence.plagiarism ?? 0),
              source_url: sentence.source || null
            }));

            await supabase.from('analysis_sentences').insert(sentences);
          }
        }
      } catch (err) {
        // Ignore
      }

      toast({
        title: "Analysis complete",
        description: `AI Score: ${report.aiScore}% | Plagiarism: ${report.plagiarism}% | Confidence: ${report.confidence}%`
      });

      navigate('/report', { state: { report, text, file: selectedFile } });
    } catch (error) {
      toast({
        title: "Analysis error",
        description: "An error occurred during analysis",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <Helmet>
        <title>AcadCheck | {t('nav.dashboard')}</title>
        <meta name="description" content="Upload and analyze documents" />
      </Helmet>
      <div className="grid gap-6 lg:grid-cols-2 items-start">
        <section className="p-6 rounded-lg border bg-card shadow-sm">
          <h1 className="text-2xl font-bold mb-1">{t('dashboard.title')}</h1>
          <p className="text-sm text-muted-foreground mb-4">{t('dashboard.subtitle')}</p>
          <form onSubmit={onAnalyze} className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".pdf,.docx,.txt"
                aria-label={t('dashboard.upload')}
                onChange={(e) => e.target.files && onFile(e.target.files[0])}
              />
              <span className="text-muted-foreground text-sm">{t('dashboard.or')}</span>
              <Button type="submit" variant="hero" disabled={loading}>
                {loading ? "Analyzing..." : t('dashboard.analyze')}
              </Button>
            </div>
            {/* Affiche le textarea seulement si aucun fichier n'est sélectionné */}
            {!selectedFile && (
              <Textarea
                value={pasted}
                onChange={e => setPasted(e.target.value)}
                placeholder={t('dashboard.paste')}
                rows={10}
                className="w-full mt-2"
              />
            )}
          </form>
          {/* Aperçu du document affiché EN DEHORS du formulaire */}
          {selectedFile && (
            <div className="mt-2">
              <h3 className="text-sm font-medium mb-2">Document preview</h3>
              <div className="border rounded-md bg-card overflow-hidden">
                <DocumentViewer file={selectedFile} mode="full" />
              </div>
            </div>
          )}
        </section>
        <section className="p-6 rounded-lg border bg-card shadow-sm">
          <h2 className="font-semibold mb-2">{t("help.title")}</h2>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            <li>{t("help.edge")}</li>
            <li>{t("help.local")}</li>
            <li>{t("help.supabase")}</li>
          </ul>
        </section>
      </div>
    </AppLayout>
  );
};

export default Dashboard;