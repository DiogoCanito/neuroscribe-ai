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
  CheckCircle2,
  Clock
} from "lucide-react";

interface DashboardStats {
  totalPatients: number;
  totalExams: number;
  completedExams: number;
  pendingExams: number;
  recentExams: Array<{
    id: string;
    exam_type: string;
    patient_name: string;
    exam_date: string | null;
    status: string;
  }>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    totalExams: 0,
    completedExams: 0,
    pendingExams: 0,
    recentExams: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      // Load counts - using any to bypass type checking for new status column
      const patientsRes = await supabase
        .from('patients')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('is_archived', false);

      const examsRes = await supabase
        .from('medical_exams')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id);

      const completedRes = await (supabase
        .from('medical_exams')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id) as any)
        .eq('status', 'completed');

      const pendingRes = await (supabase
        .from('medical_exams')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user!.id) as any)
        .eq('status', 'pending');

      const recentExamsRes = await (supabase
        .from('medical_exams')
        .select('id, exam_type, exam_date, status, patient_id')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(5) as any);

      // Get patient names for recent exams
      const examsData = recentExamsRes.data as any[] || [];
      const patientIds = examsData.map((e) => e.patient_id);
      let patientsMap: Record<string, string> = {};
      
      if (patientIds.length > 0) {
        const { data: patientsData } = await supabase
          .from('patients')
          .select('id, name')
          .in('id', patientIds);
        
        patientsData?.forEach((p) => {
          patientsMap[p.id] = p.name;
        });
      }

      setStats({
        totalPatients: patientsRes.count || 0,
        totalExams: examsRes.count || 0,
        completedExams: completedRes.count || 0,
        pendingExams: pendingRes.count || 0,
        recentExams: examsData.map((e) => ({
          id: e.id,
          exam_type: e.exam_type,
          patient_name: patientsMap[e.patient_id] || 'N/A',
          exam_date: e.exam_date,
          status: e.status || 'pending',
        })),
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getExamTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'rmn': 'RMN',
      'tac': 'TAC',
      'eeg': 'EEG',
      'emg': 'EMG',
      'outros': 'Outros'
    };
    return types[type?.toLowerCase()] || type;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'completed') {
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-success/10 text-success text-xs font-medium rounded-full">
          <CheckCircle2 className="w-3 h-3" />
          Concluído
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 px-2 py-1 bg-warning/10 text-warning text-xs font-medium rounded-full">
        <Clock className="w-3 h-3" />
        Pendente
      </span>
    );
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
                <p className="font-semibold text-foreground">Novo Paciente</p>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="card-medical">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Pacientes</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {loading ? '-' : stats.totalPatients}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Pacientes ativos</p>
          </CardContent>
        </Card>

        <Card className="card-medical">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Exames</p>
                <p className="text-3xl font-bold text-foreground mt-1">
                  {loading ? '-' : stats.totalExams}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <Image className="w-6 h-6 text-accent" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Exames registados</p>
          </CardContent>
        </Card>

        <Card className="card-medical">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Concluídos</p>
                <p className="text-3xl font-bold text-success mt-1">
                  {loading ? '-' : stats.completedExams}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-success" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Exames com relatório</p>
          </CardContent>
        </Card>

        <Card className="card-medical">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
                <p className="text-3xl font-bold text-warning mt-1">
                  {loading ? '-' : stats.pendingExams}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-warning" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Aguardam avaliação</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Exams */}
      <Card className="card-medical">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-lg">Exames Recentes</CardTitle>
            <CardDescription>Últimos exames registados</CardDescription>
          </div>
          <Link to="/exams">
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
          ) : stats.recentExams.length > 0 ? (
            <div className="space-y-3">
              {stats.recentExams.map((exam) => (
                <Link
                  key={exam.id}
                  to={`/exam/${exam.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <Image className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {getExamTypeLabel(exam.exam_type)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {exam.patient_name} • {formatDate(exam.exam_date)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(exam.status)}
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Image className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum exame criado ainda</p>
              <Link to="/new-report">
                <Button variant="outline" size="sm" className="mt-3">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar primeiro exame
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
