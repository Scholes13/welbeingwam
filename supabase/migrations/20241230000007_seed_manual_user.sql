-- Create a Manual User (Super Admin)
INSERT INTO public.profiles (id, username, full_name, avatar_url, access_code, is_manual)
VALUES 
(
    -1001, -- Negative ID for manual users
    'admin_wam', 
    'Super Admin', 
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin', 
    'WAM-ADMIN', 
    TRUE
)
ON CONFLICT (id) DO UPDATE SET 
    access_code = 'WAM-ADMIN',
    is_manual = TRUE;
