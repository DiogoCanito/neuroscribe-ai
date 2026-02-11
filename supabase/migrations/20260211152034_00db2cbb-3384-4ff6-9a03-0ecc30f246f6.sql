
-- Add tracking columns to completed_reports for profile statistics
ALTER TABLE public.completed_reports 
  ADD COLUMN processing_time_ms integer DEFAULT NULL,
  ADD COLUMN reprocess_count integer NOT NULL DEFAULT 0,
  ADD COLUMN used_verification boolean NOT NULL DEFAULT false,
  ADD COLUMN used_dark_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN used_voice_commands boolean NOT NULL DEFAULT false;
