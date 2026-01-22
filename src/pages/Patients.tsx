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
  Plus, 
  Search, 
  Users, 
  Calendar, 
  FileText,
  MoreVertical,
  Edit,
  Archive,
  Loader2,
  ChevronRight
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Patient {
  id: string;
  name: string;
  internal_code: string | null;
  date_of_birth: string | null;
  process_number: string | null;
  clinical_history: string | null;
  created_at: string;
  reports_count?: number;
}

export default function Patients() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    internal_code: "",
    date_of_birth: "",
    process_number: "",
    clinical_history: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) loadPatients();
  }, [user]);

  const loadPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error loading patients:', error);
      toast({ variant: "destructive", title: "Erro", description: "Erro ao carregar doentes" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingPatient) {
        const { error } = await supabase
          .from('patients')
          .update({
            name: formData.name,
            internal_code: formData.internal_code || null,
            date_of_birth: formData.date_of_birth || null,
            process_number: formData.process_number || null,
            clinical_history: formData.clinical_history || null,
          })
          .eq('id', editingPatient.id);

        if (error) throw error;
        toast({ title: "Sucesso", description: "Doente atualizado com sucesso" });
      } else {
        const { error } = await supabase
          .from('patients')
          .insert({
            user_id: user!.id,
            name: formData.name,
            internal_code: formData.internal_code || null,
            date_of_birth: formData.date_of_birth || null,
            process_number: formData.process_number || null,
            clinical_history: formData.clinical_history || null,
          });

        if (error) throw error;
        toast({ title: "Sucesso", description: "Doente adicionado com sucesso" });
      }

      setIsDialogOpen(false);
      resetForm();
      loadPatients();
    } catch (error) {
      console.error('Error saving patient:', error);
      toast({ variant: "destructive", title: "Erro", description: "Erro ao guardar doente" });
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (patient: Patient) => {
    try {
      const { error } = await supabase
        .from('patients')
        .update({ is_archived: true })
        .eq('id', patient.id);

      if (error) throw error;
      toast({ title: "Sucesso", description: "Doente arquivado" });
      loadPatients();
    } catch (error) {
      console.error('Error archiving patient:', error);
      toast({ variant: "destructive", title: "Erro", description: "Erro ao arquivar doente" });
    }
  };

  const openEditDialog = (patient: Patient) => {
    setEditingPatient(patient);
    setFormData({
      name: patient.name,
      internal_code: patient.internal_code || "",
      date_of_birth: patient.date_of_birth || "",
      process_number: patient.process_number || "",
      clinical_history: patient.clinical_history || "",
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingPatient(null);
    setFormData({
      name: "",
      internal_code: "",
      date_of_birth: "",
      process_number: "",
      clinical_history: "",
    });
  };

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.process_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.internal_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  return (
    <DashboardLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">Doentes</h1>
          <p className="text-muted-foreground">Gestão de registos de doentes</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Doente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingPatient ? "Editar Doente" : "Novo Doente"}</DialogTitle>
              <DialogDescription>
                {editingPatient ? "Atualize os dados do doente" : "Preencha os dados do novo doente"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="process_number">Nº Processo</Label>
                  <Input
                    id="process_number"
                    value={formData.process_number}
                    onChange={(e) => setFormData({ ...formData, process_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="internal_code">Código Interno</Label>
                  <Input
                    id="internal_code"
                    value={formData.internal_code}
                    onChange={(e) => setFormData({ ...formData, internal_code: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Data de Nascimento</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinical_history">Histórico Clínico</Label>
                <Textarea
                  id="clinical_history"
                  value={formData.clinical_history}
                  onChange={(e) => setFormData({ ...formData, clinical_history: e.target.value })}
                  rows={3}
                  placeholder="Antecedentes relevantes..."
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingPatient ? "Guardar" : "Criar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card className="card-medical mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por nome, nº processo ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Patients List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredPatients.length > 0 ? (
        <div className="space-y-3">
          {filteredPatients.map((patient) => (
            <Card 
              key={patient.id} 
              className="card-medical hover:border-primary/30 transition-all cursor-pointer group"
              onClick={() => navigate(`/patients/${patient.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{patient.name}</h3>
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
                      {patient.clinical_history && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {patient.clinical_history}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(patient); }}>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleArchive(patient); }} className="text-destructive">
                          <Archive className="w-4 h-4 mr-2" />
                          Arquivar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="card-medical">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">
              {searchTerm ? "Nenhum doente encontrado" : "Nenhum doente registado"}
            </p>
            {!searchTerm && (
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar primeiro doente
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
