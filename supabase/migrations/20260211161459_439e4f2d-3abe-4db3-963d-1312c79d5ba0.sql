
-- Drop tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.medical_exams CASCADE;
DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public.patients CASCADE;
DROP TABLE IF EXISTS public.report_templates CASCADE;
