-- RailMadad Supabase Database Schema
-- Generated on August 17, 2025

-- Note: JWT secret is automatically managed by Supabase
-- No need to set it manually

-- Create custom types
CREATE TYPE user_role AS ENUM ('passenger', 'official', 'super_admin');
CREATE TYPE complaint_status AS ENUM ('pending', 'in_progress', 'resolved', 'closed', 'escalated', 'withdrawn');
CREATE TYPE complaint_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE complaint_area AS ENUM ('TRAIN', 'STATION');

-- Profiles table (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    role user_role NOT NULL DEFAULT 'passenger',
    full_name TEXT,
    phone TEXT,
    employee_id TEXT, -- For railway officials
    department TEXT, -- For railway officials
    station_code TEXT, -- For station officials
    zone TEXT, -- Railway zone for officials
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Complaints table
CREATE TABLE public.complaints (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    complaint_area complaint_area NOT NULL,
    
    -- Train/Journey details
    train_number TEXT,
    train_name TEXT,
    pnr TEXT,
    coach_number TEXT,
    seat_number TEXT,
    journey_date DATE,
    
    -- Station details
    station_code TEXT,
    station_name TEXT,
    
    -- Incident details
    incident_date DATE NOT NULL,
    incident_time TIME,
    location TEXT,
    
    -- Complaint categorization
    complaint_type TEXT NOT NULL, -- Security, Cleanliness, Medical, etc.
    complaint_subtype TEXT NOT NULL,
    
    -- Content
    description TEXT NOT NULL,
    source TEXT DEFAULT 'manual', -- 'manual', 'chatbot', 'function_call'
    
    -- Status and priority
    status complaint_status DEFAULT 'pending',
    priority complaint_priority DEFAULT 'medium',
    
    -- Assignment
    assigned_to UUID REFERENCES public.profiles(id),
    assigned_at TIMESTAMP WITH TIME ZONE,
    
    -- Resolution
    resolution_notes TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Complaint attachments table
CREATE TABLE public.complaint_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    complaint_id UUID REFERENCES public.complaints(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL, -- Supabase Storage URL
    file_type TEXT NOT NULL, -- image/jpeg, audio/webm, etc.
    file_size INTEGER,
    uploaded_by UUID REFERENCES public.profiles(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Complaint updates/comments table
CREATE TABLE public.complaint_updates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    complaint_id UUID REFERENCES public.complaints(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    update_type TEXT NOT NULL DEFAULT 'comment', -- comment, status_change, assignment
    content TEXT NOT NULL,
    old_value TEXT, -- For tracking status/assignment changes
    new_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Railway stations reference table (for validation)
CREATE TABLE public.railway_stations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    station_code TEXT UNIQUE NOT NULL,
    station_name TEXT NOT NULL,
    state TEXT,
    zone TEXT,
    division TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Railway trains reference table (for validation)
CREATE TABLE public.railway_trains (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    train_number TEXT UNIQUE NOT NULL,
    train_name TEXT NOT NULL,
    train_type TEXT,
    source_station TEXT,
    destination_station TEXT,
    zone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Complaint categories reference table
CREATE TABLE public.complaint_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    area complaint_area NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(area, category, subcategory)
);

-- Create indexes for better performance
CREATE INDEX idx_complaints_user_id ON public.complaints(user_id);
CREATE INDEX idx_complaints_status ON public.complaints(status);
CREATE INDEX idx_complaints_area ON public.complaints(complaint_area);
CREATE INDEX idx_complaints_assigned_to ON public.complaints(assigned_to);
CREATE INDEX idx_complaints_created_at ON public.complaints(created_at);
CREATE INDEX idx_complaints_incident_date ON public.complaints(incident_date);
CREATE INDEX idx_complaints_train_number ON public.complaints(train_number);
CREATE INDEX idx_complaints_station_code ON public.complaints(station_code);

CREATE INDEX idx_complaint_attachments_complaint_id ON public.complaint_attachments(complaint_id);
CREATE INDEX idx_complaint_updates_complaint_id ON public.complaint_updates(complaint_id);

CREATE INDEX idx_railway_stations_code ON public.railway_stations(station_code);
CREATE INDEX idx_railway_stations_name ON public.railway_stations(station_name);
CREATE INDEX idx_railway_trains_number ON public.railway_trains(train_number);
CREATE INDEX idx_railway_trains_name ON public.railway_trains(train_name);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_complaints_updated_at BEFORE UPDATE ON public.complaints FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security Policies

-- Profiles RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Avoid recursive reference to profiles in profiles' own policy (causes 42P17)
-- Check the caller's role from JWT metadata instead.
-- Note: We accept either user_metadata.role or app_metadata.role to support different provisioning flows.
CREATE POLICY "Officials can view all profiles" ON public.profiles
        FOR SELECT USING (
                (
                    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('official','super_admin')
                ) OR (
                    (auth.jwt() -> 'app_metadata'  ->> 'role') IN ('official','super_admin')
                )
        );

-- Complaints RLS
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own complaints" ON public.complaints
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own complaints" ON public.complaints
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending complaints" ON public.complaints
    FOR UPDATE USING (
        auth.uid() = user_id AND 
        status = 'pending'
    );

CREATE POLICY "Officials can view all complaints" ON public.complaints
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'official'
        )
    );

-- Complaint attachments RLS
ALTER TABLE public.complaint_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments of their complaints" ON public.complaint_attachments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.complaints 
            WHERE id = complaint_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can upload attachments to their complaints" ON public.complaint_attachments
    FOR INSERT WITH CHECK (
        uploaded_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.complaints 
            WHERE id = complaint_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Officials can view all attachments" ON public.complaint_attachments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'official'
        )
    );

-- Complaint updates RLS
ALTER TABLE public.complaint_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view updates on their complaints" ON public.complaint_updates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.complaints 
            WHERE id = complaint_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can add updates to their complaints" ON public.complaint_updates
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.complaints 
            WHERE id = complaint_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Officials can view and add all updates" ON public.complaint_updates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'official'
        )
    );

-- Reference tables RLS (read-only for all authenticated users)
ALTER TABLE public.railway_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.railway_trains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read railway stations" ON public.railway_stations
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can read railway trains" ON public.railway_trains
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Anyone can read complaint categories" ON public.complaint_categories
    FOR SELECT USING (auth.role() = 'authenticated');

-- Insert initial complaint categories based on your complaintData.ts
INSERT INTO public.complaint_categories (area, category, subcategory, description) VALUES
-- TRAIN categories
('TRAIN', 'Security', 'Theft', 'Theft of passenger belongings'),
('TRAIN', 'Security', 'Harassment', 'Physical or verbal harassment'),
('TRAIN', 'Security', 'Fighting', 'Physical altercations between passengers'),
('TRAIN', 'Security', 'Unauthorized vendor', 'Vendors without proper authorization'),
('TRAIN', 'Security', 'Smoking', 'Smoking in non-smoking areas'),
('TRAIN', 'Security', 'Dacoity / Robbery', 'Armed robbery or dacoity'),
('TRAIN', 'Security', 'Others', 'Other security-related issues'),

('TRAIN', 'Medical Assistance', 'Passenger illness', 'Medical emergency of passenger'),
('TRAIN', 'Medical Assistance', 'Doctor not available at coaching', 'Medical professional unavailable'),
('TRAIN', 'Medical Assistance', 'First-aid box not available', 'Missing or empty first-aid supplies'),
('TRAIN', 'Medical Assistance', 'Others', 'Other medical assistance issues'),

('TRAIN', 'Electrical', 'Fan', 'Ceiling fan malfunction'),
('TRAIN', 'Electrical', 'Lights', 'Light fixture problems'),
('TRAIN', 'Electrical', 'Air conditioning', 'AC not working or poor cooling'),
('TRAIN', 'Electrical', 'Mobile charging point', 'Charging ports not working'),
('TRAIN', 'Electrical', 'Others', 'Other electrical issues'),

('TRAIN', 'Coach - Cleanliness', 'Coach', 'General coach cleanliness'),
('TRAIN', 'Coach - Cleanliness', 'Toilet', 'Toilet cleanliness and maintenance'),
('TRAIN', 'Coach - Cleanliness', 'Washbasin', 'Washbasin cleanliness'),
('TRAIN', 'Coach - Cleanliness', 'Others', 'Other cleanliness issues'),

('TRAIN', 'Water Availability', 'Toilet', 'Water not available in toilets'),
('TRAIN', 'Water Availability', 'Washbasin', 'Water not available in washbasins'),
('TRAIN', 'Water Availability', 'Coach', 'General water availability issues'),
('TRAIN', 'Water Availability', 'Others', 'Other water-related issues'),

('TRAIN', 'Punctuality', 'Late running', 'Train running behind schedule'),
('TRAIN', 'Punctuality', 'Others', 'Other punctuality issues'),

('TRAIN', 'Water Quality', 'Toilet', 'Poor water quality in toilets'),
('TRAIN', 'Water Quality', 'Washbasin', 'Poor water quality in washbasins'),
('TRAIN', 'Water Quality', 'Coach', 'Poor drinking water quality'),
('TRAIN', 'Water Quality', 'Others', 'Other water quality issues'),

('TRAIN', 'Staff Behaviour', 'TTE', 'Traveling Ticket Examiner behavior'),
('TRAIN', 'Staff Behaviour', 'Guard', 'Guard behavior issues'),
('TRAIN', 'Staff Behaviour', 'Conductor', 'Conductor behavior problems'),
('TRAIN', 'Staff Behaviour', 'Others', 'Other staff behavior issues'),

('TRAIN', 'Corruption / Bribery', 'TTE', 'Corruption involving TTE'),
('TRAIN', 'Corruption / Bribery', 'Guard', 'Corruption involving Guard'),
('TRAIN', 'Corruption / Bribery', 'Conductor', 'Corruption involving Conductor'),
('TRAIN', 'Corruption / Bribery', 'Others', 'Other corruption/bribery issues'),

-- STATION categories  
('STATION', 'Cleanliness', 'Waiting Hall', 'Waiting area cleanliness'),
('STATION', 'Cleanliness', 'Toilet', 'Station toilet cleanliness'),
('STATION', 'Cleanliness', 'Platform', 'Platform cleanliness'),
('STATION', 'Cleanliness', 'Others', 'Other station cleanliness issues'),

('STATION', 'Water Availability', 'Waiting Hall', 'Water not available in waiting areas'),
('STATION', 'Water Availability', 'Toilet', 'Water not available in toilets'),
('STATION', 'Water Availability', 'Platform', 'Water not available on platforms'),
('STATION', 'Water Availability', 'Others', 'Other water availability issues'),

('STATION', 'Electrical', 'Waiting Hall', 'Electrical issues in waiting areas'),
('STATION', 'Electrical', 'Platform', 'Platform electrical problems'),
('STATION', 'Electrical', 'Others', 'Other electrical issues'),

('STATION', 'Divyangjan Facilities', 'Toilet', 'Accessible toilet facilities'),
('STATION', 'Divyangjan Facilities', 'Lift', 'Elevator/lift accessibility'),
('STATION', 'Divyangjan Facilities', 'Others', 'Other accessibility issues'),

('STATION', 'Facilities for Women with Special needs', 'Baby food', 'Baby food facilities'),
('STATION', 'Facilities for Women with Special needs', 'Others', 'Other women-specific facilities'),

('STATION', 'Security', 'Theft', 'Theft at station premises'),
('STATION', 'Security', 'Harassment', 'Harassment at station'),
('STATION', 'Security', 'Others', 'Other security issues'),

('STATION', 'Bed Roll', 'Bedding', 'Bedroll quality and availability'),
('STATION', 'Bed Roll', 'Others', 'Other bedroll issues'),

('STATION', 'Catering & Vending Services', 'Food Stall', 'Food stall issues'),
('STATION', 'Catering & Vending Services', 'Tea Stall', 'Tea stall problems'),
('STATION', 'Catering & Vending Services', 'Water Stall', 'Water vendor issues'),
('STATION', 'Catering & Vending Services', 'Others', 'Other catering issues'),

('STATION', 'Staff Behaviour', 'Booking staff', 'Ticket booking staff behavior'),
('STATION', 'Staff Behaviour', 'Others', 'Other staff behavior issues'),

('STATION', 'Corruption / Bribery', 'Booking staff', 'Corruption in ticket booking'),
('STATION', 'Corruption / Bribery', 'Others', 'Other corruption/bribery issues');

-- Create function to handle profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, role, full_name)
    VALUES (NEW.id, 'passenger', NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create Storage buckets for complaint attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('complaint-attachments', 'complaint-attachments', false);

-- Storage RLS for complaint attachments
CREATE POLICY "Users can upload their own complaint files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'complaint-attachments' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own complaint files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'complaint-attachments' AND
        (
            auth.uid()::text = (storage.foldername(name))[1] OR
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role = 'official'
            )
        )
    );

-- End of schema
