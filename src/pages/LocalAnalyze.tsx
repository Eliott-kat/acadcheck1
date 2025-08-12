import { Helmet } from "react-helmet-async";
import AppLayout from "@/components/layout/AppLayout";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { analyzeText } from "@/lib/localDetector";
import { useNavigate } from "react-router-dom";

const LocalAnalyze = () => {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "txt") {
      alert("Veuillez fournir un fichier .txt pour l'analyse locale.");
      return;
    }
    const content = await file.text();
    setText(content);
  };

  const onAnalyze = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const report = analyzeText(text);
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
            <div className="text-sm text-muted-foreground">Optionnel: importer un fichier .txt</div>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="file" accept=".txt" className="hidden" onChange={(e) => e.target.files && onFile(e.target.files[0])} />
              <span className="px-3 py-2 rounded-md border bg-card">Choisir un fichier</span>
            </label>
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
