import { Helmet } from "react-helmet-async";
import AppLayout from "@/components/layout/AppLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useI18n } from "@/i18n";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const mockUsers = [
  { id: 1, email: 'student@uni.edu', role: 'student' },
  { id: 2, email: 'teacher@uni.edu', role: 'teacher' },
  { id: 3, email: 'admin@uni.edu', role: 'admin' },
];

const mockAnalyses = [
  { id: 101, user: 'student@uni.edu', plagiarism: 24, ai: 61 },
  { id: 102, user: 'student@uni.edu', plagiarism: 72, ai: 12 },
];

const Admin = () => {
  const { t } = useI18n();
  const navigate = useNavigate();

  // Protect route: redirect to login if not authenticated
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

  return (
    <AppLayout>
      <Helmet>
        <title>AcadCheck | {t('admin.title')}</title>
        <meta name="description" content="Admin dashboard" />
      </Helmet>
      <div className="grid gap-8">
        <section>
          <h2 className="text-xl font-semibold mb-3">{t('admin.users')}</h2>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockUsers.map(u => (
                  <TableRow key={u.id}>
                    <TableCell>{u.id}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.role}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
        <section>
          <h2 className="text-xl font-semibold mb-3">{t('admin.analyses')}</h2>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Plagiarism</TableHead>
                  <TableHead>AI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockAnalyses.map(a => (
                  <TableRow key={a.id}>
                    <TableCell>{a.id}</TableCell>
                    <TableCell>{a.user}</TableCell>
                    <TableCell>{a.plagiarism}%</TableCell>
                    <TableCell>{a.ai}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </AppLayout>
  );
};

export default Admin;
