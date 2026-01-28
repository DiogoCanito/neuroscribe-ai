import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ReportEditor from "./pages/ReportEditor";
import NotFound from "./pages/NotFound";
import { supabase } from "@/integrations/supabase/client";
import { useTemplateStore } from "@/stores/templateStore";

const queryClient = new QueryClient();

function AppContent() {
  const initializeForUser = useTemplateStore((state) => state.initializeForUser);
  
  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Defer to avoid Supabase deadlock
        setTimeout(() => {
          initializeForUser(session?.user?.id ?? null);
        }, 0);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      initializeForUser(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, [initializeForUser]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ReportEditor />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppContent />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
