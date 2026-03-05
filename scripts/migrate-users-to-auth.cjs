const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually load .env.local
try {
    const envPath = path.resolve(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
        const envConfig = fs.readFileSync(envPath, 'utf8');
        envConfig.split('\n').forEach(line => {
            const [key, ...values] = line.split('=');
            if (key && values.length > 0) {
                process.env[key.trim()] = values.join('=').trim().replace(/(^"|"$)/g, '');
            }
        });
    }
} catch (e) {
    console.warn('Could not load .env.local');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing env vars. Ensure .env.local has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function migrateUsers() {
    console.log('Starting user migration...');
    console.log(`URL: ${supabaseUrl}`);

    // 0. Refresh Schema Cache Hack
    try { await supabase.from('profiles').select('count', { count: 'exact', head: true }); } catch (e) { }

    // 1. Fetch all profiles
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*');

    if (error) {
        console.error('Error fetching profiles:', error);
        return;
    }

    console.log(`Found ${profiles.length} profiles.`);

    // Prepare full user list for lookup efficiently (cached once)
    let allAuthUsers = [];
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (!listError && users) {
        allAuthUsers = users;
        console.log(`Cached ${allAuthUsers.length} existing auth users for lookup.`);
    }

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const profile of profiles) {
        const { id, username, password, full_name, avatar_url, auth_user_id } = profile;
        const targetEmail = `${username}@werkudara.com`;
        const legacyEmail = `${username}@wam.local`;

        if (!username) {
            skipped++;
            continue;
        }

        // Check if ID is UUID for reuse
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        const targetId = isUuid ? id : undefined;

        try {
            let authUser;

            // Strategy: Check existing users first to avoid "already registered" error noise
            // Look for exact email match OR legacy email match
            let existingUser = allAuthUsers.find(u => u.email === targetEmail);

            if (!existingUser) {
                existingUser = allAuthUsers.find(u => u.email === legacyEmail);
                if (existingUser) {
                    console.log(`Found legacy user: ${legacyEmail}. Upgrading to ${targetEmail}...`);
                    const { data: updatedUser, error: upgradeError } = await supabase.auth.admin.updateUserById(existingUser.id, {
                        email: targetEmail,
                        email_confirm: true,
                        user_metadata: { username, full_name: full_name || username, avatar_url }
                    });

                    if (upgradeError) {
                        console.error(`Failed to upgrade email: ${upgradeError.message}`);
                    } else {
                        console.log(`Successfully upgraded email for ${username}`);
                        existingUser = updatedUser.user;
                    }
                }
            }

            if (existingUser) {
                authUser = existingUser;
                // console.log(`User ${username} already exists (ID: ${authUser.id}). Linking...`);
            } else {
                // Create New
                const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                    id: targetId,
                    email: targetEmail,
                    password: password || 'welbeing123',
                    email_confirm: true,
                    user_metadata: { username, full_name: full_name || username, avatar_url }
                });

                if (createError) {
                    if (createError.message.toLowerCase().includes('already been registered')) {
                        // Should not happen if listUsers cached correctly, but just in case
                        console.log(`User ${username} reported duplicate by API. Skipping creation.`);
                        skipped++;
                        continue;
                    } else {
                        throw createError;
                    }
                } else {
                    authUser = newUser.user;
                    // Add to local cache for future dup checks if needed
                    allAuthUsers.push(authUser);
                }
            }

            if (authUser) {
                // Only update if auth_user_id is missing or different
                if (auth_user_id !== authUser.id) {
                    const { error: updateError } = await supabase
                        .from('profiles')
                        .update({ auth_user_id: authUser.id })
                        .eq('id', id);

                    if (updateError) {
                        console.error(`Failed to link profile ${username}:`, updateError.message);
                        errors++;
                    } else {
                        console.log(`Linked ${username} -> Auth ID: ${authUser.id}`);
                        migrated++;
                    }
                } else {
                    // Already linked correctly
                    // console.log(`Profile ${username} already linked.`);
                    skipped++;
                }
            }

        } catch (err) {
            console.error(`Failed to process ${username}:`, err.message);
            errors++;
        }
    }

    console.log('\nMigration Summary:');
    console.log(`Total: ${profiles.length}`);
    console.log(`Linked/Migrated: ${migrated}`);
    console.log(`Skipped (Already Done): ${skipped}`);
    console.log(`Errors: ${errors}`);
}

migrateUsers();
