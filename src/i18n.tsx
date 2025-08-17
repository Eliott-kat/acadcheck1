import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "acad_lang";

const dict = {
  fr: {
    meta: {
      title: "AcadCheck | Détection de plagiat et IA",
  desc: "Analysez vos documents: détection de plagiat, détection de texte IA, rapports détaillés.",
    },
    hero: {
      h1: "Détectez plagiat et textes IA, avec précision",
      p: "AcadCheck analyse vos PDF, DOCX et TXT pour repérer le plagiat et le contenu généré par IA.",
      ctaPrimary: "Commencer maintenant",
      ctaSecondary: "Voir le tableau de bord",
    },
    nav: { home: "Accueil", dashboard: "Tableau de bord", admin: "Admin", history: "Historique" },
    help: {
      title: "Aide",
      edge: "Les fichiers seront envoyés à une fonction Edge pour analyse avancée.",
      local: "Le texte collé déclenche une analyse locale 100% hors ligne.",
      supabase: "Historique et rôles à connecter via Supabase."
    },
    home: {
      plagiarismTitle: "Plagiat",
      plagiarismDesc: "Détection par comparaison interne.",
      aiTitle: "Texte IA",
      aiDesc: "Score de probabilité avec surlignage phrase par phrase.",
      reportsTitle: "Rapports",
      reportsDesc: "Rapport détaillé, export PDF/CSV, historique par utilisateur."
    },
    auth: {
      login: "Connexion",
      register: "Inscription",
      success: "Connecté",
      checkEmail: "Vérifiez votre email pour confirmer.",
      noAccount: "Pas de compte ?",
      haveAccount: "Déjà un compte ?",
      logout: "Déconnexion",
    },
    dashboard: {
      title: "Soumettre un document",
      subtitle: "PDF, DOCX, TXT — ou collez du texte pour un essai rapide",
      upload: "Choisir un fichier",
      or: "ou",
      analyze: "Analyser",
      paste: "Coller du texte ici...",
    },
    report: {
      title: "Rapport d'analyse",
  plagiarism: "Plagiat",
  ai: "Score IA",
  confidence: "Confiance",
      exportPdf: "Exporter en PDF",
      exportCsv: "Exporter en CSV",

      highlights: "Surlignage des phrases détectées",
    },
    admin: { title: "Administration", users: "Utilisateurs", analyses: "Analyses" },
    notFound: { title: "404", p: "Page introuvable", back: "Retour à l'accueil" },
    common: { loading: "Chargement..." },
  },
  en: {
    meta: {
      title: "AcadCheck | Plagiarism & AI Detection",
  desc: "Analyze documents: plagiarism, AI text detection, detailed reports.",
    },
    hero: {
      h1: "Detect plagiarism and AI-written text, accurately",
      p: "AcadCheck analyzes your PDFs, DOCX and TXT to spot plagiarism and AI-generated content.",
      ctaPrimary: "Get started",
      ctaSecondary: "Open dashboard",
    },
    nav: { home: "Home", dashboard: "Dashboard", admin: "Admin", history: "History" },
    help: {
      title: "Help",
      edge: "Files will be sent to an Edge function for advanced analysis.",
      local: "Pasted text triggers a 100% offline local analysis.",
      supabase: "History and roles to be connected via Supabase."
    },
    home: {
      plagiarismTitle: "Plagiarism",
      plagiarismDesc: "Detection by internal comparison.",
      aiTitle: "AI Text",
      aiDesc: "Probability score with sentence-by-sentence highlighting.",
      reportsTitle: "Reports",
      reportsDesc: "Detailed report, PDF/CSV export, user history."
    },
    auth: {
      login: "Login",
      register: "Register",
      success: "Logged in",
      checkEmail: "Check your email to confirm.",
      noAccount: "No account?",
      haveAccount: "Already have an account?",
      logout: "Logout",
    },
    dashboard: {
      title: "Submit a document",
  subtitle: "PDF, DOCX, TXT — or paste text for a quick try",
      upload: "Choose a file",
      or: "or",
      analyze: "Analyze",
      paste: "Paste text here...",
    },
    report: {
      title: "Analysis report",
  plagiarism: "Plagiarism",
  ai: "AI Score",
  confidence: "Confidence",
      exportPdf: "Export PDF",
      exportCsv: "Export CSV",

      highlights: "Highlighted detected sentences",
    },
    admin: { title: "Administration", users: "Users", analyses: "Analyses" },
    notFound: { title: "404", p: "Page not found", back: "Back home" },
    common: { loading: "Loading..." },
  },
};

type Lang = keyof typeof dict;

type Ctx = { lang: Lang; t: (key: string) => string; toggleLanguage: () => void };

const I18nContext = createContext<Ctx | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored === 'fr' || stored === 'en') return stored as Lang;
    return 'en';
  });

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, lang);
  }, [lang]);

  const toggleLanguage = useCallback(() => setLang(l => (l === 'fr' ? 'en' : 'fr')), []);

  const t = useCallback((key: string) => {
    const parts = key.split('.');
    // @ts-ignore
    return parts.reduce((acc, k) => (acc && acc[k] != null ? acc[k] : ''), dict[lang]) || '';
  }, [lang]);

  const value = useMemo(() => ({ lang, t, toggleLanguage }), [lang, t, toggleLanguage]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
};
