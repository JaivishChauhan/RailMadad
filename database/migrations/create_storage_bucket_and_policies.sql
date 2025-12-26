-- Create Storage Bucket and Policies for Complaint Attachments

-- 1. Create the storage bucket (if not created via UI)
-- Note: This might need to be done via the Supabase Dashboard UI instead
-- INSERT INTO storage.buckets (id, name, public) VALUES ('complaint-attachments', 'complaint-attachments', false);

-- 2. Create storage policies for complaint attachments

-- Policy for uploading files (users can upload to their own folder)
CREATE POLICY "Users can upload their own complaint files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'complaint-attachments' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Policy for viewing files (users can view their own files + officials can view all)
CREATE POLICY "Users can view their own complaint files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'complaint-attachments' AND
        (
            -- Users can view their own files
            auth.uid()::text = (storage.foldername(name))[1] 
            OR
            -- Officials can view all files
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role IN ('official', 'super_admin')
            )
        )
    );

-- Policy for updating files (users can update their own files)
CREATE POLICY "Users can update their own complaint files" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'complaint-attachments' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Policy for deleting files (users can delete their own files)
CREATE POLICY "Users can delete their own complaint files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'complaint-attachments' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- 3. Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';

-- 4. Check if the bucket exists
SELECT * FROM storage.buckets WHERE id = 'complaint-attachments';