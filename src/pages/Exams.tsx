import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Image as ImageIcon, 
  Calendar, 
  User,
  ArrowRight,
  Plus,
  CheckCircle2,
  Clock
} from "lucide-react";

interface Exam {
  id: string;
  exam_type: string;
  exam_date: string | null;
  notes: string | null;
  created_at: string;
  status: string;
  patient: {
    id: string;
    name: string;
  };
}

export default function Exams() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (user) loadExams();
  }, [user]);

  const loadExams = async () => {
    try {
      const { data, error } = await supabase
        .from('medical_exams')
        .select(`
          id,
          exam_type,
          exam_date,
          notes,
          created_at,
          status,
          patient_id
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch patient names
      const patientIds = [...new Set(data?.map(e => e.patient_id) || [])];
      const { data: patients } = await supabase
        .from('patients')
        .select('id, name')
        .in('id', patientIds);

      const patientMap = new Map(patients?.map(p => [p.id, p]) || []);
      
      const examsWithPatients = data?.map(exam => ({
        ...exam,
        status: (exam as any).status || 'pending',
        patient: patientMap.get(exam.patient_id) || { id: exam.patient_id, name: 'Desconhecido' }
      })) || [];

      setExams(examsWithPatients);
    } catch (error) {
      console.error('Error loading exams:', error);
      toast({ variant: "destructive", title: "Erro", description: "Erro ao carregar exames" });
    } finally {
      setLoading(false);
    }
  };

  const filteredExams = exams.filter(
    (e) =>
      e.patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.exam_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Data não definida";
    return new Date(dateString).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
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
    return types[type.toLowerCase()] || type;
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
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">Exames</h1>
          <p className="text-muted-foreground">Lista de exames por paciente</p>
        </div>
        <Link to="/new-report">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Exame
          </Button>
        </Link>
      </div>

      {/* Search */}
      <Card className="card-medical mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nome do paciente ou tipo de exame..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Exams List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredExams.length > 0 ? (
        <div className="space-y-3">
          {filteredExams.map((exam) => (
            <Link key={exam.id} to={`/exam/${exam.id}`}>
              <Card className="card-medical hover:border-primary/30 transition-all group cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-accent/10 text-accent text-xs font-medium rounded">
                            {getExamTypeLabel(exam.exam_type)}
                          </span>
                          {getStatusBadge(exam.status)}
                        </div>
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {exam.patient.name}
                        </h3>
                        <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {formatDate(exam.exam_date)}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="card-medical">
          <CardContent className="py-12 text-center">
            <ImageIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">
              {searchTerm ? "Nenhum exame encontrado" : "Nenhum exame registado"}
            </p>
            {!searchTerm && (
              <Link to="/new-report">
                <Button variant="outline" size="sm" className="mt-3">
                  <Plus className="w-4 h-4 mr-2" />
                  Criar primeiro exame
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
