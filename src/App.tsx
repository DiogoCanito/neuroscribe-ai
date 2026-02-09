import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import ReportEditor from "./pages/ReportEditor";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { supabase } from "@/integrations/supabase/client";
import { useTemplateStore } from "@/stores/templateStore";
import { useEditorStore } from "@/stores/editorStore";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children, user }: { children: React.ReactNode; user: User | null }) {
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  return <>{children}</>;
}

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const initializeForUser = useTemplateStore((state) => state.initializeForUser);
  const setReportStylePreferences = useEditorStore((state) => state.setReportStylePreferences);
  
  const loadStylePreferences = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('report_style_preferences')
        .eq('user_id', userId)
        .single();
      if (data && (data as any).report_style_preferences) {
        setReportStylePreferences((data as any).report_style_preferences);
      }
    } catch (err) {
      console.warn('Could not load style preferences:', err);
    }
  };
  
  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        
        // Defer Supabase calls to avoid deadlock
        setTimeout(() => {
          initializeForUser(session?.user?.id ?? null);
          if (session?.user?.id) loadStylePreferences(session.user.id);
        }, 0);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      initializeForUser(session?.user?.id ?? null);
      if (session?.user?.id) loadStylePreferences(session.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [initializeForUser]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
        <Route 
          path="/" 
          element={
            <ProtectedRoute user={user}>
              <ReportEditor />
            </ProtectedRoute>
          } 
        />
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
