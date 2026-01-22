import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Users, 
  FileText, 
  Mic, 
  Image, 
  Plus, 
  ArrowRight,
  Activity,
  Calendar,
  TrendingUp
} from "lucide-react";

interface DashboardStats {
  totalPatients: number;
  totalReports: number;
  totalExams: number;
  recentReports: Array<{
    id: string;
    title: string;
    patient_name: string;
    created_at: string;
    status: string;
  }>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    totalReports: 0,
    totalExams: 0,
    recentReports: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      const [patientsRes, reportsRes, examsRes] = await Promise.all([
        supabase
          .from('patients')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user!.id)
          .eq('is_archived', false),
        supabase
          .from('reports')
          .select('id, title, created_at, status, patients(name)')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('medical_exams')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user!.id),
      ]);

      setStats({
        totalPatients: patientsRes.count || 0,
        totalReports: reportsRes.data?.length || 0,
        totalExams: examsRes.count || 0,
        recentReports: reportsRes.data?.map((r: any) => ({
          id: r.id,
          title: r.title,
          patient_name: r.patients?.name || 'N/A',
          created_at: r.created_at,
          status: r.status,
        })) || [],
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <span className="badge-status badge-draft">Rascunho</span>;
      case 'validated':
        return <span className="badge-status badge-validated">Validado</span>;
      case 'locked':
        return <span className="badge-status badge-locked">Bloqueado</span>;
      default:
        return <span className="badge-status badge-draft">{status}</span>;
    }
  };

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral da sua atividade clínica</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link to="/new-report">
          <Card className="card-medical group cursor-pointer hover:border-primary/50 transition-all">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="w-12 h-12 rounded-xl bg-gradient-medical flex items-center justify-center group-hover:scale-105 transition-transform">
                <Mic className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Novo Relatório</p>
                <p className="text-sm text-muted-foreground">Ditado por voz</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/patients">
          <Card className="card-medical group cursor-pointer hover:border-primary/50 transition-all">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Plus className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Novo Doente</p>
                <p className="text-sm text-muted-foreground">Adicionar registo</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/search">
          <Card className="card-medical group cursor-pointer hover:border-primary/50 transition-all">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Activity className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Pesquisa</p>
                <p className="text-sm text-muted-foreground">Busca global</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="card-medical">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Doentes</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {loading ? '-' : stats.totalPatients}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-xs text-success">
              <TrendingUp className="w-3 h-3" />
              <span>Ativos</span>
            </div>
          </CardContent>
        </Card>

        <Card className="card-medical">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Relatórios</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {loading ? '-' : stats.totalReports}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-accent" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>Últimos 30 dias</span>
            </div>
          </CardContent>
        </Card>

        <Card className="card-medical">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Exames</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {loading ? '-' : stats.totalExams}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <Image className="w-6 h-6 text-warning" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>Carregados</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Reports */}
      <Card className="card-medical">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-lg">Relatórios Recentes</CardTitle>
            <CardDescription>Últimos relatórios criados</CardDescription>
          </div>
          <Link to="/reports">
            <Button variant="ghost" size="sm" className="gap-1">
              Ver todos
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : stats.recentReports.length > 0 ? (
            <div className="space-y-3">
              {stats.recentReports.map((report) => (
                <Link
                  key={report.id}
                  to={`/reports/${report.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {report.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {report.patient_name} • {formatDate(report.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(report.status)}
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum relatório criado ainda</p>
              <Link to="/new-report">
                <Button variant="outline" size="sm" className="mt-3">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar primeiro relatório
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
