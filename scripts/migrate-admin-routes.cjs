const fs = require('fs');
const path = require('path');

const adminDir = path.resolve(__dirname, '..', 'src', 'app', 'api', 'admin');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;

    // Fix: remove any duplicate/broken import lines from previous attempt
    // Remove old imports that were partially replaced
    content = content.replace(/import { verifyAdminPermission } from '@\/utils\/auth'\nimport { createSupabaseAdminClient } from '@\/lib\/supabase\/server'\n/g, '');

    // Remove original old imports
    content = content.replace(/import { createClient } from '@supabase\/supabase-js'\r?\n/g, '');
    content = content.replace(/import { cookies } from 'next\/headers'\r?\n/g, '');

    // Remove duplicate verifyAdminPermission import if exists
    content = content.replace(/import { verifyAdminPermission } from '@\/utils\/auth'\r?\n/g, '');

    // Remove leading whitespace/newlines
    content = content.replace(/^\s*\n/, '');

    // Add correct imports at the top
    const newImports = `import { verifyAdminPermission } from '@/utils/auth'\nimport { createSupabaseAdminClient } from '@/lib/supabase/server'\n`;
    content = newImports + content;

    // Replace createClient patterns
    content = content.replace(/const supabase = createClient\(\s*\n?\s*process\.env\.NEXT_PUBLIC_SUPABASE_URL!,\s*\n?\s*process\.env\.SUPABASE_SERVICE_ROLE_KEY!\s*\n?\s*\)/g, 'const supabase = createSupabaseAdminClient()');

    // Replace cookie-based auth patterns
    // Pattern 1: cookieStore + strava_athlete_id (used in GET/POST functions)
    content = content.replace(/const cookieStore = await cookies\(\)\s*\n\s*const currentUserId = cookieStore\.get\('strava_athlete_id'\)\?\.value\s*\n\s*\n\s*if \(!currentUserId\) \{\s*\n\s*return NextResponse\.json\(\{ error: '(?:Unauthorized|Not authenticated)' \}, \{ status: 401 \}\)\s*\n\s*\}/g,
        `const { authorized } = await verifyAdminPermission('admin')
    if (!authorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }`);

    // Pattern 2: simpler cookieStore pattern (no braces check block)
    content = content.replace(/const cookieStore = await cookies\(\)\s*\n\s*const currentUserId = cookieStore\.get\('strava_athlete_id'\)\?\.value\s*\n\s*\n\s*if \(!currentUserId\) \{\s*\n\s*return NextResponse\.json\(\{ error: 'Unauthorized' \}, \{ status: 401 \}\)\s*\n\s*\}/g,
        `const { authorized } = await verifyAdminPermission('admin')
    if (!authorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }`);

    // Replace verifyAdminPermission calls that pass supabase and currentUserId
    content = content.replace(/await verifyAdminPermission\(supabase, currentUserId, '([^']+)'\)/g, "await verifyAdminPermission('$1')");

    // Remove remaining standalone cookie reads
    content = content.replace(/\s*const cookieStore = await cookies\(\)\s*\n\s*const currentUserId = cookieStore\.get\('strava_athlete_id'\)\?\.value\s*\n/g, '\n');

    // Simple cookie store patterns
    content = content.replace(/\s*const cookieStore = await cookies\(\)\s*\n/g, '\n');
    content = content.replace(/const currentUserId = cookieStore\.get\('strava_athlete_id'\)\?\.value\s*\n/g, '');

    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated: ${path.relative(__dirname, filePath)}`);
    } else {
        console.log(`No changes: ${path.relative(__dirname, filePath)}`);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            walkDir(filePath);
        } else if (file === 'route.ts') {
            processFile(filePath);
        }
    });
}

walkDir(adminDir);
console.log('\nDone!');
