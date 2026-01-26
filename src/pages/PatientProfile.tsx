import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DocumentsList } from "@/components/DocumentsList";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  Calendar, 
  FileText, 
  Plus, 
  ArrowLeft,
  Image as ImageIcon,
  Edit,
  Loader2,
  ArrowRight
} from "lucide-react";

interface Patient {
  id: string;
  name: string;
  internal_code: string | null;
  date_of_birth: string | null;
  process_number: string | null;
  clinical_history: string | null;
}

interface Exam {
  id: string;
  exam_type: string;
  exam_date: string | null;
  notes: string | null;
  created_at: string;
  has_report: boolean;
  images_count: number;
}

export default function PatientProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isNewExamDialogOpen, setIsNewExamDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [editFormData, setEditFormData] = useState({
    name: "",
    internal_code: "",
    date_of_birth: "",
    process_number: "",
    clinical_history: "",
  });

  const [newExamData, setNewExamData] = useState({
    exam_type: "rmn",
    exam_date: new Date().toISOString().split('T')[0],
    notes: "",
  });

  useEffect(() => {
    if (user && id) {
      loadPatientData();
    }
  }, [user, id]);

  const loadPatientData = async () => {
    try {
      // Load patient
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .eq('user_id', user!.id)
        .single();

      if (patientError) throw patientError;
      setPatient(patientData);
      setEditFormData({
        name: patientData.name,
        internal_code: patientData.internal_code || "",
        date_of_birth: patientData.date_of_birth || "",
        process_number: patientData.process_number || "",
        clinical_history: patientData.clinical_history || "",
      });

      // Load exams
      const { data: examsData, error: examsError } = await supabase
        .from('medical_exams')
        .select('id, exam_type, exam_date, notes, created_at, report_id')
        .eq('patient_id', id)
        .eq('user_id', user!.id)
        .order('exam_date', { ascending: false });

      if (examsError) throw examsError;

      // Get images count for each exam
      const examsWithDetails = await Promise.all(
        (examsData || []).map(async (exam) => {
          // Count images (files in storage)
          // For now, we'll just set 0 as we need to implement file storage lookup
          return {
            ...exam,
            has_report: !!exam.report_id,
            images_count: 0
          };
        })
      );

      setExams(examsWithDetails);
    } catch (error) {
      console.error('Error loading patient:', error);
      toast({ variant: "destructive", title: "Erro", description: "Erro ao carregar dados do doente" });
      navigate('/patients');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('patients')
        .update({
          name: editFormData.name,
          internal_code: editFormData.internal_code || null,
          date_of_birth: editFormData.date_of_birth || null,
          process_number: editFormData.process_number || null,
          clinical_history: editFormData.clinical_history || null,
        })
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Sucesso", description: "Doente atualizado com sucesso" });
      setIsEditDialogOpen(false);
      loadPatientData();
    } catch (error) {
      console.error('Error updating patient:', error);
      toast({ variant: "destructive", title: "Erro", description: "Erro ao atualizar doente" });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data, error } = await supabase
        .from('medical_exams')
        .insert({
          user_id: user!.id,
          patient_id: id,
          exam_type: newExamData.exam_type,
          exam_date: newExamData.exam_date || null,
          notes: newExamData.notes || null,
          file_name: 'placeholder',
          file_url: 'placeholder'
        })
        .select()
        .single();

      if (error) throw error;
      
      toast({ title: "Sucesso", description: "Exame criado com sucesso" });
      setIsNewExamDialogOpen(false);
      navigate(`/exam/${data.id}`);
    } catch (error) {
      console.error('Error creating exam:', error);
      toast({ variant: "destructive", title: "Erro", description: "Erro ao criar exame" });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('pt-PT');
  };

  const calculateAge = (dateString: string | null) => {
    if (!dateString) return null;
    const today = new Date();
    const birth = new Date(dateString);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <div className="h-8 bg-muted/50 rounded animate-pulse w-48" />
          <div className="h-32 bg-muted/50 rounded-lg animate-pulse" />
          <div className="h-64 bg-muted/50 rounded-lg animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  if (!patient) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Doente não encontrado</p>
          <Link to="/patients">
            <Button variant="outline" className="mt-4">Voltar aos Doentes</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/patients')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-medical flex items-center justify-center">
              <User className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">{patient.name}</h1>
              <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
                {patient.process_number && (
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {patient.process_number}
                  </span>
                )}
                {patient.date_of_birth && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(patient.date_of_birth)}
                    {calculateAge(patient.date_of_birth) && ` (${calculateAge(patient.date_of_birth)} anos)`}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Editar Doente</DialogTitle>
                <DialogDescription>Atualize os dados do doente</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Nome *</Label>
                  <Input
                    id="edit-name"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-process">Nº Processo</Label>
                    <Input
                      id="edit-process"
                      value={editFormData.process_number}
                      onChange={(e) => setEditFormData({ ...editFormData, process_number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-code">Código Interno</Label>
                    <Input
                      id="edit-code"
                      value={editFormData.internal_code}
                      onChange={(e) => setEditFormData({ ...editFormData, internal_code: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-dob">Data de Nascimento</Label>
                  <Input
                    id="edit-dob"
                    type="date"
                    value={editFormData.date_of_birth}
                    onChange={(e) => setEditFormData({ ...editFormData, date_of_birth: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-history">Histórico Clínico</Label>
                  <Textarea
                    id="edit-history"
                    value={editFormData.clinical_history}
                    onChange={(e) => setEditFormData({ ...editFormData, clinical_history: e.target.value })}
                    rows={3}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Guardar
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Clinical History */}
      {patient.clinical_history && (
        <Card className="card-medical mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Histórico Clínico</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground">{patient.clinical_history}</p>
          </CardContent>
        </Card>
      )}

      {/* Exams Section */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Exames</h2>
        <Dialog open={isNewExamDialogOpen} onOpenChange={setIsNewExamDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Exame
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Exame</DialogTitle>
              <DialogDescription>Criar um novo exame para {patient.name}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateExam} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="exam-type">Tipo de Exame *</Label>
                <Select value={newExamData.exam_type} onValueChange={(v) => setNewExamData({ ...newExamData, exam_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rmn">RMN</SelectItem>
                    <SelectItem value="tac">TAC</SelectItem>
                    <SelectItem value="eeg">EEG</SelectItem>
                    <SelectItem value="emg">EMG</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="exam-date">Data do Exame</Label>
                <Input
                  id="exam-date"
                  type="date"
                  value={newExamData.exam_date}
                  onChange={(e) => setNewExamData({ ...newExamData, exam_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exam-notes">Observações</Label>
                <Textarea
                  id="exam-notes"
                  value={newExamData.notes}
                  onChange={(e) => setNewExamData({ ...newExamData, notes: e.target.value })}
                  rows={2}
                  placeholder="Notas iniciais sobre o exame..."
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsNewExamDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Criar e Abrir
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Exams List */}
      {exams.length > 0 ? (
        <div className="space-y-3">
          {exams.map((exam) => (
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
                          {exam.has_report && (
                            <span className="px-2 py-0.5 bg-success/10 text-success text-xs font-medium rounded">
                              Com relatório
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {formatDate(exam.exam_date)}
                        </div>
                        {exam.notes && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{exam.notes}</p>
                        )}
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
            <p className="text-muted-foreground">Nenhum exame registado para este doente</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setIsNewExamDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar primeiro exame
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Documents Section */}
      <DocumentsList patientId={id} className="mt-6" />
    </DashboardLayout>
  );
}
