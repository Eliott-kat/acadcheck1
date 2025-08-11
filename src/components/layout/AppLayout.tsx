import { Helmet } from "react-helmet-async";
import Navbar from "./Navbar";
import { PropsWithChildren } from "react";

const AppLayout = ({ children }: PropsWithChildren) => {
  return (
    <div className="min-h-screen flex flex-col bg-spotlight">
      <Helmet>
        <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : '/'} />
      </Helmet>
      <Navbar />
      <main className="flex-1">
        <div className="container py-8">
          {children}
        </div>
      </main>
      <footer className="border-t">
        <div className="container py-6 text-sm text-muted-foreground">
          © {new Date().getFullYear()} AcadCheck — All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default AppLayout;
