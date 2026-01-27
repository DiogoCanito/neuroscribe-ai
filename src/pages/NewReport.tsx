import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  User, 
  Plus, 
  ArrowRight,
  Calendar,
  FileText,
  Loader2
} from "lucide-react";

interface Patient {
  id: string;
  name: string;
  internal_code: string | null;
  date_of_birth: string | null;
  process_number: string | null;
}

export default function NewReport() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewPatientDialogOpen, setIsNewPatientDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [newPatientData, setNewPatientData] = useState({
    name: "",
    internal_code: "",
    date_of_birth: "",
    process_number: "",
    clinical_history: "",
  });

  useEffect(() => {
    if (user) loadPatients();
  }, [user]);

  const loadPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, name, internal_code, date_of_birth, process_number')
        .eq('user_id', user!.id)
        .eq('is_archived', false)
        .order('name', { ascending: true });

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error loading patients:', error);
      toast({ variant: "destructive", title: "Erro", description: "Erro ao carregar pacientes" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data, error } = await supabase
        .from('patients')
        .insert({
          user_id: user!.id,
          name: newPatientData.name,
          internal_code: newPatientData.internal_code || null,
          date_of_birth: newPatientData.date_of_birth || null,
          process_number: newPatientData.process_number || null,
          clinical_history: newPatientData.clinical_history || null,
        })
        .select()
        .single();

      if (error) throw error;
      
      toast({ title: "Sucesso", description: "Paciente criado com sucesso" });
      setIsNewPatientDialogOpen(false);
      navigate(`/patients/${data.id}`);
    } catch (error) {
      console.error('Error creating patient:', error);
      toast({ variant: "destructive", title: "Erro", description: "Erro ao criar paciente" });
    } finally {
      setSaving(false);
    }
  };

  const handleSelectPatient = (patientId: string) => {
    navigate(`/patients/${patientId}`);
  };

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.process_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.internal_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('pt-PT');
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-medical flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">Novo Exame</h1>
          <p className="text-muted-foreground">
            Selecione um paciente para criar um novo exame e relatório
          </p>
        </div>

        {/* Search and Create Patient */}
        <Card className="card-medical mb-6">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por nome, nº processo ou código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Dialog open={isNewPatientDialogOpen} onOpenChange={setIsNewPatientDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2 shrink-0">
                    <Plus className="w-4 h-4" />
                    Novo Paciente
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Novo Paciente</DialogTitle>
                    <DialogDescription>Criar um novo paciente para registar exames</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreatePatient} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-name">Nome *</Label>
                      <Input
                        id="new-name"
                        value={newPatientData.name}
                        onChange={(e) => setNewPatientData({ ...newPatientData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-process">Nº Processo</Label>
                        <Input
                          id="new-process"
                          value={newPatientData.process_number}
                          onChange={(e) => setNewPatientData({ ...newPatientData, process_number: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-code">Código Interno</Label>
                        <Input
                          id="new-code"
                          value={newPatientData.internal_code}
                          onChange={(e) => setNewPatientData({ ...newPatientData, internal_code: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-dob">Data de Nascimento</Label>
                      <Input
                        id="new-dob"
                        type="date"
                        value={newPatientData.date_of_birth}
                        onChange={(e) => setNewPatientData({ ...newPatientData, date_of_birth: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-history">Histórico Clínico</Label>
                      <Textarea
                        id="new-history"
                        value={newPatientData.clinical_history}
                        onChange={(e) => setNewPatientData({ ...newPatientData, clinical_history: e.target.value })}
                        rows={3}
                        placeholder="Antecedentes relevantes..."
                      />
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsNewPatientDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={saving}>
                        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Criar e Continuar
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Patients List */}
        <Card className="card-medical">
          <CardHeader>
            <CardTitle className="text-lg">Selecionar Paciente</CardTitle>
            <CardDescription>
              Escolha o paciente para criar o exame
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filteredPatients.length > 0 ? (
              <div className="space-y-2">
                {filteredPatients.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => handleSelectPatient(patient.id)}
                    className="w-full flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/30 transition-all group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {patient.name}
                        </p>
                        <div className="flex gap-3 text-xs text-muted-foreground">
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
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <User className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {searchTerm ? "Nenhum paciente encontrado" : "Nenhum paciente registado"}
                </p>
                {!searchTerm && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={() => setIsNewPatientDialogOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Criar primeiro paciente
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
