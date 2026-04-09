import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AppCopyrightFooter } from "@/components/layout/AppCopyrightFooter";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-muted">
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold">404</h1>
          <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
          <a href="/" className="text-primary underline hover:text-primary/90">
            Return to Home
          </a>
        </div>
      </div>
      <div className="shrink-0 border-t border-border/50 bg-background/80 py-5">
        <AppCopyrightFooter />
      </div>
    </div>
  );
};

export default NotFound;
