-- Add status column to medical_exams table
ALTER TABLE public.medical_exams 
ADD COLUMN status text NOT NULL DEFAULT 'pending';

-- Add comment for documentation
COMMENT ON COLUMN public.medical_exams.status IS 'Exam status: pending (Pendente de Avaliação) or completed (Concluído)';