import { Helmet } from "react-helmet-async";
import AppLayout from "@/components/layout/AppLayout";
import { useI18n } from "@/i18n";

const NotFound = () => {
  const { t } = useI18n();
  return (
    <AppLayout>
      <Helmet>
        <title>AcadCheck | {t('notFound.title')}</title>
      </Helmet>
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">{t('notFound.title')}</h1>
          <p className="text-xl text-muted-foreground mb-4">{t('notFound.p')}</p>
          <a href="/" className="text-primary underline-offset-4 hover:underline">
            {t('notFound.back')}
          </a>
        </div>
      </div>
    </AppLayout>
  );
};

export default NotFound;
