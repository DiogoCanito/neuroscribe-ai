-- Create completed_reports table for storing finalized reports
CREATE TABLE public.completed_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  template_id TEXT,
  template_name TEXT NOT NULL,
  report_content TEXT NOT NULL,
  audio_url TEXT,
  audio_duration INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.completed_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own completed reports" 
ON public.completed_reports 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own completed reports" 
ON public.completed_reports 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own completed reports" 
ON public.completed_reports 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_completed_reports_user_id ON public.completed_reports(user_id);
CREATE INDEX idx_completed_reports_created_at ON public.completed_reports(created_at DESC);