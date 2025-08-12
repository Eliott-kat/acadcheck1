import { Helmet } from "react-helmet-async";
import AppLayout from "@/components/layout/AppLayout";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { analyzeText } from "@/lib/localDetector";
import { useNavigate } from "react-router-dom";
import { fileToText } from "@/lib/fileToText";
import { toast } from "@/components/ui/use-toast";
import { addDocumentFromFile, countDocuments, getAllDocuments } from "@/lib/corpusDB";

const LocalAnalyze = () => {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sourcesCount, setSourcesCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    countDocuments().then(setSourcesCount).catch(() => setSourcesCount(0));
  }, []);

  const onFile = async (file?: File | null) => {
    if (!file) return;
    try {
      const content = await fileToText(file);
      setText(content);
      toast({ title: "Fichier importé", description: `Texte extrait de ${file.name}` });
    } catch (err) {
      console.error(err);
      toast({ title: "Format non supporté", description: "Importez un .pdf, .docx ou .txt.", variant: "destructive" });
    }
  };

  const onAddSource = async (file?: File | null) => {
    if (!file) return;
    try {
      await addDocumentFromFile(file);
      const c = await countDocuments();
      setSourcesCount(c);
      toast({ title: "Source ajoutée", description: `${file.name} a été indexé(e) dans le corpus local.` });
    } catch (err) {
      console.error(err);
      toast({ title: "Échec ajout source", description: "Impossible d'indexer ce fichier.", variant: "destructive" });
    }
  };

  const onAnalyze = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const docs = await getAllDocuments();
      const report = analyzeText(text, { corpus: docs.map(d => ({ name: d.name, text: d.text })) });
      navigate("/report", { state: { report: { ...report, copyleaks: { matches: 0 } }, text } });
    } finally {
      setLoading(false);
    }
  };
  return (
    <AppLayout>
      <Helmet>
        <title>Analyse locale IA & plagiat | AcadCheck</title>
        <meta name="description" content="Analyse 100% locale du texte: score IA proche de GPTZero et surlignage des phrases." />
        <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : '/local-analyze'} />
      </Helmet>

      <header className="mb-6">
        <h1 className="text-3xl font-bold">Analyse locale (sans API)</h1>
        <p className="text-muted-foreground mt-1">Collez votre texte ou importez un .txt. Nous calculons un score IA (perplexité/burstiness proxy) et un indice de re-duplication interne.</p>
      </header>

      <main>
        <section className="grid gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">Optionnel: importer un fichier .pdf, .docx ou .txt</div>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={(e) => e.target.files && onFile(e.target.files[0])} />
              <span className="px-3 py-2 rounded-md border bg-card">Choisir un fichier</span>
            </label>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">Corpus local (optionnel): ajoutez des sources pour le plagiat hors ligne</div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Corpus: {sourcesCount} document(s)</span>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={(e) => e.target.files && onAddSource(e.target.files[0])} />
                <span className="px-3 py-2 rounded-md border bg-card">Ajouter au corpus</span>
              </label>
            </div>
          </div>

          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Collez votre texte ici..."
            className="min-h-[280px]"
          />

          <div className="flex gap-3">
            <Button onClick={onAnalyze} disabled={loading || !text.trim()}>{loading ? "Analyse..." : "Analyser"}</Button>
            <Button variant="outline" onClick={() => setText("")} disabled={loading}>Effacer</Button>
          </div>
        </section>
      </main>
    </AppLayout>
  );
};

export default LocalAnalyze;
