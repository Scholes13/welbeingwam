const fs = require('fs');
const path = require('path');

const adminDir = path.resolve(__dirname, '..', 'src', 'app', 'api', 'admin');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;

    // Fix remaining cookieStore references - replace with getAuthUser pattern
    // Pattern: const userId = cookieStore.get('strava_athlete_id')?.value
    content = content.replace(
        /const (?:userId|currentUserId) = cookieStore\.get\('strava_athlete_id'\)\?\.value\r?\n/g,
        ''
    );

    // Replace remaining cookie-based auth checks with verifyAdminPermission
    // Pattern: if (!userId) { return ...401 }
    content = content.replace(
        /\s*if \(!(?:userId|currentUserId)\) \{\s*\n\s*return NextResponse\.json\(\{ error: '(?:Unauthorized|Not authenticated)' \}, \{ status: 401 \}\)\s*\n\s*\}\s*\n/g,
        '\n'
    );

    // Fix remaining createClient references
    content = content.replace(
        /const supabase = createClient\(\s*\n?\s*process\.env\.NEXT_PUBLIC_SUPABASE_URL!,\s*\n?\s*process\.env\.SUPABASE_SERVICE_ROLE_KEY!\s*\n?\s*\)/g,
        'const supabase = createSupabaseAdminClient()'
    );

    // Fix verifyAdminPermission calls that still pass old args
    content = content.replace(
        /await verifyAdminPermission\(supabase, (?:userId|currentUserId), '([^']+)'\)/g,
        "await verifyAdminPermission('$1')"
    );

    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log(`Fixed: ${path.relative(path.resolve(__dirname, '..'), filePath)}`);
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

// Also fix the two survey routes
const extraFiles = [
    path.resolve(__dirname, '..', 'src', 'app', 'api', 'surveys', '[id]', 'route.ts'),
    path.resolve(__dirname, '..', 'src', 'app', 'api', 'survey', 'route.ts'),
];
extraFiles.forEach(f => {
    if (fs.existsSync(f)) {
        let content = fs.readFileSync(f, 'utf-8');
        content = content.replace(
            /import { createClient } from '@supabase\/supabase-js'/g,
            "import { createSupabaseAdminClient } from '@/lib/supabase/server'"
        );
        content = content.replace(
            /const supabase = createClient\(\s*\n?\s*process\.env\.NEXT_PUBLIC_SUPABASE_URL!,\s*\n?\s*process\.env\.SUPABASE_SERVICE_ROLE_KEY!\s*\n?\s*\)/g,
            'const supabase = createSupabaseAdminClient()'
        );
        fs.writeFileSync(f, content);
        console.log(`Fixed: ${path.relative(path.resolve(__dirname, '..'), f)}`);
    }
});

console.log('\nDone!');
