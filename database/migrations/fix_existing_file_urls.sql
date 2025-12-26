-- Fix existing file URLs in complaint_attachments table
-- This query will help identify and fix file URLs that might be causing issues

-- 1. Check current file URLs to see what format they're in
SELECT 
    id,
    complaint_id,
    file_name,
    file_url,
    CASE 
        WHEN file_url LIKE 'http%' THEN 'Full URL'
        WHEN file_url LIKE '%/%' THEN 'File Path'
        ELSE 'Unknown Format'
    END as url_type
FROM public.complaint_attachments
ORDER BY created_at DESC;

-- 2. Convert existing full URLs to file paths for private bucket access
UPDATE public.complaint_attachments 
SET file_url = REGEXP_REPLACE(
    file_url, 
    'https://ephpyjtxtokxzqgjjljd\.supabase\.co/storage/v1/object/public/complaint-attachments/', 
    ''
)
WHERE file_url LIKE 'https://ephpyjtxtokxzqgjjljd.supabase.co/storage/v1/object/public/complaint-attachments/%';

-- 3. Check the results after update (if you ran the update)
-- SELECT id, complaint_id, file_name, file_url FROM public.complaint_attachments ORDER BY created_at DESC;