-- 1. Activities Table
create table if not exists public.admin_activities (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    activity_date date not null default current_date,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Attendance Table
create table if not exists public.attendance (
    id uuid default gen_random_uuid() primary key,
    activity_id uuid references public.admin_activities(id) on delete cascade not null,
    user_id bigint references public.profiles(id) on delete cascade not null,
    scanned_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    -- Prevent duplicate scans for same activity
    unique(activity_id, user_id)
);
