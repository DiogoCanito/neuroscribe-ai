import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VoiceDictation } from "@/components/VoiceDictation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  Image as ImageIcon, 
  FileText,
  Upload,
  Loader2,
  X,
  Save,
  Trash2,
  CheckCircle2,
  Clock
} from "lucide-react";

interface Exam {
  id: string;
  exam_type: string;
  exam_date: string | null;
  notes: string | null;
  file_name: string;
  file_url: string;
  report_id: string | null;
  status: string;
}

interface Patient {
  id: string;
  name: string;
  date_of_birth: string | null;
  clinical_history: string | null;
}

interface Report {
  id: string;
  title: string;
  transcription: string | null;
  consultation_reason: string | null;
  neurological_exam: string | null;
  complementary_exams: string | null;
  diagnosis: string | null;
  therapeutic_plan: string | null;
  observations: string | null;
  status: string;
}

interface ExamImage {
  name: string;
  url: string;
}

export default function ExamDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [exam, setExam] = useState<Exam | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [images, setImages] = useState<ExamImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("images");

  const [examFormData, setExamFormData] = useState({
    exam_type: "",
    exam_date: "",
    notes: "",
    status: "pending",
  });

  const [reportFormData, setReportFormData] = useState({
    transcription: "",
    consultation_reason: "",
    neurological_exam: "",
    complementary_exams: "",
    diagnosis: "",
    therapeutic_plan: "",
    observations: "",
  });

  useEffect(() => {
    if (user && id) {
      loadExamData();
    }
  }, [user, id]);

  const loadExamData = async () => {
    try {
      // Load exam
      const { data: examData, error: examError } = await supabase
        .from('medical_exams')
        .select('*')
        .eq('id', id)
        .eq('user_id', user!.id)
        .single();

      if (examError) throw examError;
      setExam({ ...examData, status: (examData as any).status || 'pending' });
      setExamFormData({
        exam_type: examData.exam_type,
        exam_date: examData.exam_date || "",
        notes: examData.notes || "",
        status: (examData as any).status || "pending",
      });

      // Load patient
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('id, name, date_of_birth, clinical_history')
        .eq('id', examData.patient_id)
        .single();

      if (patientError) throw patientError;
      setPatient(patientData);

      // Load report if exists
      if (examData.report_id) {
        const { data: reportData } = await supabase
          .from('reports')
          .select('*')
          .eq('id', examData.report_id)
          .single();

        if (reportData) {
          setReport(reportData);
          setReportFormData({
            transcription: reportData.transcription || "",
            consultation_reason: reportData.consultation_reason || "",
            neurological_exam: reportData.neurological_exam || "",
            complementary_exams: reportData.complementary_exams || "",
            diagnosis: reportData.diagnosis || "",
            therapeutic_plan: reportData.therapeutic_plan || "",
            observations: reportData.observations || "",
          });
        }
      }

      // Load images from storage
      await loadImages(id);
    } catch (error) {
      console.error('Error loading exam:', error);
      toast({ variant: "destructive", title: "Erro", description: "Erro ao carregar exame" });
      navigate('/exams');
    } finally {
      setLoading(false);
    }
  };

  const loadImages = async (examId: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('medical-files')
        .list(`${user!.id}/${examId}`);

      if (error) {
        console.error('Error loading images:', error);
        return;
      }

      const imageFiles = await Promise.all(
        (data || []).map(async (file) => {
          const { data: urlData } = await supabase.storage
            .from('medical-files')
            .createSignedUrl(`${user!.id}/${examId}/${file.name}`, 3600);
          
          return {
            name: file.name,
            url: urlData?.signedUrl || ''
          };
        })
      );

      setImages(imageFiles.filter(img => img.url));
    } catch (error) {
      console.error('Error loading images:', error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${user!.id}/${id}/${fileName}`;

        const { error } = await supabase.storage
          .from('medical-files')
          .upload(filePath, file);

        if (error) throw error;
      }

      toast({ title: "Sucesso", description: "Imagens carregadas com sucesso" });
      await loadImages(id!);
    } catch (error) {
      console.error('Error uploading images:', error);
      toast({ variant: "destructive", title: "Erro", description: "Erro ao carregar imagens" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteImage = async (imageName: string) => {
    try {
      const { error } = await supabase.storage
        .from('medical-files')
        .remove([`${user!.id}/${id}/${imageName}`]);

      if (error) throw error;
      
      setImages(images.filter(img => img.name !== imageName));
      toast({ title: "Sucesso", description: "Imagem removida" });
    } catch (error) {
      console.error('Error deleting image:', error);
      toast({ variant: "destructive", title: "Erro", description: "Erro ao remover imagem" });
    }
  };

  const handleSaveExam = async () => {
    setSaving(true);
    try {
      const { error } = await (supabase
        .from('medical_exams')
        .update({
          exam_type: examFormData.exam_type,
          exam_date: examFormData.exam_date || null,
          notes: examFormData.notes || null,
          status: examFormData.status,
        } as any)
        .eq('id', id));

      if (error) throw error;
      setExam(prev => prev ? { ...prev, status: examFormData.status } : prev);
      toast({ title: "Sucesso", description: "Exame atualizado" });
    } catch (error) {
      console.error('Error saving exam:', error);
      toast({ variant: "destructive", title: "Erro", description: "Erro ao guardar exame" });
    } finally {
      setSaving(false);
    }
  };

  const handleMarkCompleted = async () => {
    setSaving(true);
    try {
      const newStatus = examFormData.status === 'completed' ? 'pending' : 'completed';
      const { error } = await (supabase
        .from('medical_exams')
        .update({ status: newStatus } as any)
        .eq('id', id));

      if (error) throw error;
      setExamFormData(prev => ({ ...prev, status: newStatus }));
      setExam(prev => prev ? { ...prev, status: newStatus } : prev);
      toast({ 
        title: "Sucesso", 
        description: newStatus === 'completed' ? "Exame marcado como concluído" : "Exame revertido para pendente" 
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({ variant: "destructive", title: "Erro", description: "Erro ao atualizar estado" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveReport = async () => {
    setSaving(true);
    try {
      if (report) {
        // Update existing report
        const { error } = await supabase
          .from('reports')
          .update({
            transcription: reportFormData.transcription || null,
            consultation_reason: reportFormData.consultation_reason || null,
            neurological_exam: reportFormData.neurological_exam || null,
            complementary_exams: reportFormData.complementary_exams || null,
            diagnosis: reportFormData.diagnosis || null,
            therapeutic_plan: reportFormData.therapeutic_plan || null,
            observations: reportFormData.observations || null,
          })
          .eq('id', report.id);

        if (error) throw error;
      } else {
        // Create new report
        const { data: newReport, error: reportError } = await supabase
          .from('reports')
          .insert({
            user_id: user!.id,
            patient_id: patient!.id,
            title: `Relatório - ${getExamTypeLabel(exam!.exam_type)} - ${formatDate(exam!.exam_date)}`,
            transcription: reportFormData.transcription || null,
            consultation_reason: reportFormData.consultation_reason || null,
            neurological_exam: reportFormData.neurological_exam || null,
            complementary_exams: reportFormData.complementary_exams || null,
            diagnosis: reportFormData.diagnosis || null,
            therapeutic_plan: reportFormData.therapeutic_plan || null,
            observations: reportFormData.observations || null,
            status: 'draft'
          })
          .select()
          .single();

        if (reportError) throw reportError;

        // Link report to exam
        const { error: examUpdateError } = await supabase
          .from('medical_exams')
          .update({ report_id: newReport.id })
          .eq('id', id);

        if (examUpdateError) throw examUpdateError;

        setReport(newReport);
      }

      toast({ title: "Sucesso", description: "Relatório guardado" });
    } catch (error) {
      console.error('Error saving report:', error);
      toast({ variant: "destructive", title: "Erro", description: "Erro ao guardar relatório" });
    } finally {
      setSaving(false);
    }
  };

  const handleReportGenerated = (generatedReport: any) => {
    setReportFormData({
      ...reportFormData,
      consultation_reason: generatedReport.consultation_reason || "",
      neurological_exam: generatedReport.exam_findings || "",
      diagnosis: generatedReport.diagnosis || "",
      therapeutic_plan: generatedReport.therapeutic_plan || "",
      observations: generatedReport.observations || "",
    });
    setActiveTab("report");
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('pt-PT');
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

  if (!exam || !patient) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Exame não encontrado</p>
          <Link to="/exams">
            <Button variant="outline" className="mt-4">Voltar aos Exames</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/patients/${patient.id}`)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar à Lista de Doentes
        </Button>
        
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-accent/10 text-accent text-sm font-medium rounded-lg">
                {getExamTypeLabel(exam.exam_type)}
              </span>
              {exam.status === 'completed' ? (
                <span className="flex items-center gap-1 px-2 py-1 bg-success/10 text-success text-xs font-medium rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Concluído
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-1 bg-warning/10 text-warning text-xs font-medium rounded-full">
                  <Clock className="w-3 h-3" />
                  Pendente
                </span>
              )}
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
              Exame de {patient.name}
            </h1>
            <div className="flex items-center gap-1 mt-1 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              {formatDate(exam.exam_date)}
            </div>
          </div>
          
          {/* Exam Info Form */}
          <Card className="card-medical w-full lg:w-auto lg:min-w-[300px]">
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Tipo</Label>
                  <Select value={examFormData.exam_type} onValueChange={(v) => setExamFormData({ ...examFormData, exam_type: v })}>
                    <SelectTrigger className="h-9">
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
                <div className="space-y-1">
                  <Label className="text-xs">Data</Label>
                  <Input
                    type="date"
                    value={examFormData.exam_date}
                    onChange={(e) => setExamFormData({ ...examFormData, exam_date: e.target.value })}
                    className="h-9"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Notas</Label>
                <Input
                  value={examFormData.notes}
                  onChange={(e) => setExamFormData({ ...examFormData, notes: e.target.value })}
                  placeholder="Observações sobre o exame..."
                  className="h-9"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveExam} disabled={saving} size="sm" className="flex-1">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Guardar
                </Button>
                <Button 
                  onClick={handleMarkCompleted} 
                  disabled={saving} 
                  size="sm" 
                  variant={exam.status === 'completed' ? 'outline' : 'default'}
                  className={exam.status === 'completed' ? '' : 'bg-success hover:bg-success/90'}
                >
                  {exam.status === 'completed' ? (
                    <>
                      <Clock className="w-4 h-4 mr-1" />
                      Pendente
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Concluir
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="images" className="gap-2">
            <ImageIcon className="w-4 h-4" />
            Imagens
          </TabsTrigger>
          <TabsTrigger value="dictation" className="gap-2">
            <FileText className="w-4 h-4" />
            Ditado
          </TabsTrigger>
          <TabsTrigger value="report" className="gap-2">
            <FileText className="w-4 h-4" />
            Relatório
          </TabsTrigger>
        </TabsList>

        {/* Images Tab */}
        <TabsContent value="images">
          <Card className="card-medical">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Imagens do Exame</CardTitle>
                  <CardDescription>Imagens médicas associadas a este exame</CardDescription>
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    {uploading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Carregar Imagens
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {images.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image.url}
                        alt={image.name}
                        className="w-full h-40 object-cover rounded-lg border"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                        onClick={() => handleDeleteImage(image.name)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ImageIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">Nenhuma imagem carregada</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Carregar primeira imagem
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dictation Tab */}
        <TabsContent value="dictation">
          <VoiceDictation
            patientInfo={{
              name: patient.name,
              dateOfBirth: patient.date_of_birth || undefined,
              clinicalHistory: patient.clinical_history || undefined,
            }}
            examType={getExamTypeLabel(exam.exam_type)}
            onReportGenerated={handleReportGenerated}
            existingTranscription={reportFormData.transcription}
          />
        </TabsContent>

        {/* Report Tab */}
        <TabsContent value="report">
          <Card className="card-medical">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Relatório Clínico</CardTitle>
                  <CardDescription>
                    {report ? `Estado: ${report.status === 'draft' ? 'Rascunho' : report.status}` : 'Novo relatório'}
                  </CardDescription>
                </div>
                <Button onClick={handleSaveReport} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Guardar Relatório
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Transcrição Original</Label>
                <Textarea
                  value={reportFormData.transcription}
                  onChange={(e) => setReportFormData({ ...reportFormData, transcription: e.target.value })}
                  rows={3}
                  placeholder="Transcrição do ditado..."
                  className="text-sm"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Motivo da Consulta/Exame</Label>
                  <Textarea
                    value={reportFormData.consultation_reason}
                    onChange={(e) => setReportFormData({ ...reportFormData, consultation_reason: e.target.value })}
                    rows={4}
                    placeholder="Motivo que levou à realização do exame..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Achados do Exame Neurológico</Label>
                  <Textarea
                    value={reportFormData.neurological_exam}
                    onChange={(e) => setReportFormData({ ...reportFormData, neurological_exam: e.target.value })}
                    rows={4}
                    placeholder="Resultados e achados..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Exames Complementares</Label>
                  <Textarea
                    value={reportFormData.complementary_exams}
                    onChange={(e) => setReportFormData({ ...reportFormData, complementary_exams: e.target.value })}
                    rows={4}
                    placeholder="Outros exames realizados..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Diagnóstico/Impressão</Label>
                  <Textarea
                    value={reportFormData.diagnosis}
                    onChange={(e) => setReportFormData({ ...reportFormData, diagnosis: e.target.value })}
                    rows={4}
                    placeholder="Diagnóstico ou impressão clínica..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Plano Terapêutico</Label>
                  <Textarea
                    value={reportFormData.therapeutic_plan}
                    onChange={(e) => setReportFormData({ ...reportFormData, therapeutic_plan: e.target.value })}
                    rows={4}
                    placeholder="Recomendações e tratamento..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={reportFormData.observations}
                    onChange={(e) => setReportFormData({ ...reportFormData, observations: e.target.value })}
                    rows={4}
                    placeholder="Notas adicionais..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
