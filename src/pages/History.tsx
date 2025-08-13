import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import AppLayout from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Download } from "lucide-react";
type AnalysisRow = {
  id: string;
  created_at: string;
  document_name: string | null;
  storage_path: string | null;
  text_length: number | null;
  ai_score: number | null;
  plagiarism_score: number | null;
  status: string;
  language: string | null;
};

const History = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [items, setItems] = useState<AnalysisRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkLoadingId, setLinkLoadingId] = useState<string | null>(null);
  // Protéger la page
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

  // Charger l'historique
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('analyses')
        .select('id, created_at, document_name, storage_path, text_length, ai_score, plagiarism_score, status, language')
        .order('created_at', { ascending: false })
        .limit(50);
      if (mounted) {
        if (!error && data) setItems(data as AnalysisRow[]);
        setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const openDocument = async (row: AnalysisRow) => {
    if (!row.storage_path) {
      toast({
        title: "Aucun fichier",
        description: "Ce résultat provient d'un texte collé.",
      });
      return;
    }
    try {
      setLinkLoadingId(row.id);
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(row.storage_path, 60 * 60);
      if (error || !data?.signedUrl) {
        throw error || new Error('URL non disponible');
      }
      window.open(data.signedUrl, '_blank', 'noopener');
    } catch (err: any) {
      toast({
        title: 'Téléchargement impossible',
        description: err?.message ?? 'Veuillez réessayer plus tard.',
        variant: 'destructive',
      });
    } finally {
      setLinkLoadingId(null);
    }
  };

  return (
    <AppLayout>
      <Helmet>
        <title>AcadCheck | Historique des analyses</title>
        <meta name="description" content="Consultez l'historique de vos analyses de documents" />
        <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : '/history'} />
      </Helmet>
      <section className="p-6 rounded-lg border bg-card shadow-sm">
        <h1 className="text-2xl font-bold mb-1">Historique</h1>
        <p className="text-sm text-muted-foreground mb-4">Vos 50 dernières analyses.</p>
        <div className="overflow-x-auto">
          <Table>
            <TableCaption>Liste des analyses récentes</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Document</TableHead>
                <TableHead className="text-right">Longueur</TableHead>
                <TableHead className="text-right">IA %</TableHead>
                <TableHead className="text-right">Plagiat %</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6}>Chargement...</TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">Aucune analyse trouvée.</TableCell>
                </TableRow>
              ) : (
                items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{new Date(row.created_at).toLocaleString()}</TableCell>
                    <TableCell>{row.storage_path ? (
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto"
                        onClick={() => openDocument(row)}
                        disabled={linkLoadingId === row.id}
                        aria-label="Ouvrir le document"
                        title="Ouvrir le document"
                      >
                        <Download className="mr-1 h-4 w-4" />
                        {row.document_name || 'Document'}
                      </Button>
                    ) : (
                      row.document_name || 'Texte collé'
                    )}</TableCell>
                    <TableCell className="text-right">{row.text_length ?? '-'}</TableCell>
                    <TableCell className="text-right">{row.ai_score ?? 0}</TableCell>
                    <TableCell className="text-right">{row.plagiarism_score ?? 0}</TableCell>
                    <TableCell>{row.status}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </AppLayout>
  );
};

export default History;
