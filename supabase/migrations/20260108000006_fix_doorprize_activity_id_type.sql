-- Fix activity_id foreign key reference in doorprizes table
-- The doorprizes.activity_id should reference admin_activities (UUID), not activities (bigint)

-- Step 1: Drop old foreign key constraint
alter table public.doorprizes 
    drop constraint if exists doorprizes_activity_id_fkey;

-- Step 2: Change column type from bigint to uuid  
-- Since table might be empty, we can safely alter the type
alter table public.doorprizes 
    alter column activity_id type uuid using null;

-- Step 3: Add correct foreign key constraint to admin_activities
alter table public.doorprizes
    add constraint doorprizes_activity_id_fkey 
    foreign key (activity_id) 
    references public.admin_activities(id) 
    on delete cascade;
