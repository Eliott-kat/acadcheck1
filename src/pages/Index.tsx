import { Helmet } from "react-helmet-async";
import AppLayout from "@/components/layout/AppLayout";
import heroImage from "@/assets/hero-acadcheck.jpg";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useI18n } from "@/i18n";

const Index = () => {
  const { t } = useI18n();
  return (
    <AppLayout>
      <Helmet>
        <title>{t("meta.title")}</title>
        <meta name="description" content={t("meta.desc")} />
      </Helmet>
      <section className="grid md:grid-cols-2 gap-8 items-center">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            {t("hero.h1")}
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            {t("hero.p")}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/register"><Button variant="hero" size="lg">{t("hero.ctaPrimary")}</Button></Link>
            <Link to="/dashboard"><Button variant="outline" size="lg">{t("hero.ctaSecondary")}</Button></Link>
          </div>
        </div>
        <div className="relative">
          <img src={heroImage} alt="AcadCheck hero - plagiarism and AI detection" loading="lazy" className="w-full h-auto rounded-lg border shadow-md" />
        </div>
      </section>

      <section className="mt-16 grid sm:grid-cols-3 gap-6">
        <article className="p-6 rounded-lg border bg-card shadow-sm">
          <h3 className="font-semibold mb-2">Plagiat</h3>
          <p className="text-sm text-muted-foreground">Détection via Copyleaks et comparaison interne.</p>
        </article>
        <article className="p-6 rounded-lg border bg-card shadow-sm">
          <h3 className="font-semibold mb-2">Texte IA</h3>
          <p className="text-sm text-muted-foreground">Score de probabilité avec surlignage phrase par phrase.</p>
        </article>
        <article className="p-6 rounded-lg border bg-card shadow-sm">
          <h3 className="font-semibold mb-2">Rapports</h3>
          <p className="text-sm text-muted-foreground">Rapport détaillé, export PDF/CSV, historique par utilisateur.</p>
        </article>
      </section>
    </AppLayout>
  );
};

export default Index;
