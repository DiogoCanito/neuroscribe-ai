-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  specialty TEXT DEFAULT 'Neurologia',
  role TEXT NOT NULL DEFAULT 'medico',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create patients table
CREATE TABLE public.patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  internal_code TEXT,
  date_of_birth DATE,
  process_number TEXT,
  clinical_history TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create report_templates table
CREATE TABLE public.report_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  structure JSONB NOT NULL DEFAULT '{}',
  terminology JSONB DEFAULT '{}',
  is_system BOOLEAN NOT NULL DEFAULT false,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reports table
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.report_templates(id),
  title TEXT NOT NULL,
  consultation_reason TEXT,
  clinical_history TEXT,
  neurological_exam TEXT,
  complementary_exams TEXT,
  diagnosis TEXT,
  therapeutic_plan TEXT,
  observations TEXT,
  audio_url TEXT,
  transcription TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create medical_exams table
CREATE TABLE public.medical_exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  report_id UUID REFERENCES public.reports(id) ON DELETE SET NULL,
  exam_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  notes TEXT,
  exam_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_exams ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Patients policies
CREATE POLICY "Users can view own patients" ON public.patients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own patients" ON public.patients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own patients" ON public.patients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own patients" ON public.patients FOR DELETE USING (auth.uid() = user_id);

-- Report templates policies
CREATE POLICY "Users can view system templates" ON public.report_templates FOR SELECT USING (is_system = true OR auth.uid() = user_id);
CREATE POLICY "Users can create own templates" ON public.report_templates FOR INSERT WITH CHECK (auth.uid() = user_id AND is_system = false);
CREATE POLICY "Users can update own templates" ON public.report_templates FOR UPDATE USING (auth.uid() = user_id AND is_system = false);
CREATE POLICY "Users can delete own templates" ON public.report_templates FOR DELETE USING (auth.uid() = user_id AND is_system = false);

-- Reports policies
CREATE POLICY "Users can view own reports" ON public.reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reports" ON public.reports FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reports" ON public.reports FOR DELETE USING (auth.uid() = user_id);

-- Medical exams policies
CREATE POLICY "Users can view own exams" ON public.medical_exams FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own exams" ON public.medical_exams FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own exams" ON public.medical_exams FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own exams" ON public.medical_exams FOR DELETE USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default report templates
INSERT INTO public.report_templates (name, description, structure, is_system) VALUES
('Consulta Neurológica Geral', 'Modelo padrão para consulta neurológica geral', '{"sections": ["identification", "reason", "history", "exam", "complementary", "diagnosis", "plan", "observations"]}', true),
('AVC', 'Modelo específico para Acidente Vascular Cerebral', '{"sections": ["identification", "reason", "history", "exam", "complementary", "diagnosis", "plan", "observations"], "focus": "vascular"}', true),
('Epilepsia', 'Modelo específico para casos de epilepsia', '{"sections": ["identification", "reason", "history", "exam", "complementary", "diagnosis", "plan", "observations"], "focus": "seizures"}', true),
('Demência', 'Modelo específico para avaliação de demência', '{"sections": ["identification", "reason", "history", "exam", "complementary", "diagnosis", "plan", "observations"], "focus": "cognitive"}', true),
('Cefaleias', 'Modelo específico para cefaleias e enxaquecas', '{"sections": ["identification", "reason", "history", "exam", "complementary", "diagnosis", "plan", "observations"], "focus": "headache"}', true);

-- Create storage bucket for medical files
INSERT INTO storage.buckets (id, name, public) VALUES ('medical-files', 'medical-files', false);

-- Storage policies
CREATE POLICY "Users can view own medical files" ON storage.objects FOR SELECT USING (bucket_id = 'medical-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload own medical files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'medical-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update own medical files" ON storage.objects FOR UPDATE USING (bucket_id = 'medical-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own medical files" ON storage.objects FOR DELETE USING (bucket_id = 'medical-files' AND auth.uid()::text = (storage.foldername(name))[1]);