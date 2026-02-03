-- Add RLS policies for medical-files storage bucket

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'medical-files' 
  AND (storage.foldername(name))[1] = 'temp'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow authenticated users to upload reports to their own folder
CREATE POLICY "Users can upload reports to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'medical-files' 
  AND (storage.foldername(name))[1] = 'reports'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow authenticated users to read their own files
CREATE POLICY "Users can read own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'medical-files' 
  AND (
    ((storage.foldername(name))[1] = 'temp' AND (storage.foldername(name))[2] = auth.uid()::text)
    OR
    ((storage.foldername(name))[1] = 'reports' AND (storage.foldername(name))[2] = auth.uid()::text)
  )
);

-- Allow authenticated users to delete their own temp files
CREATE POLICY "Users can delete own temp files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'medical-files' 
  AND (storage.foldername(name))[1] = 'temp'
  AND (storage.foldername(name))[2] = auth.uid()::text
);