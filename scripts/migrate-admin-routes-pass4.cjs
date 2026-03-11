const fs = require('fs');
const path = require('path');

const apiDir = path.resolve(__dirname, '..', 'src', 'app', 'api', 'admin');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;
    const relPath = path.relative(path.resolve(__dirname, '..'), filePath);

    // Fix 1: Remove duplicate verifyAdminPermission blocks
    // Pattern: Two consecutive verifyAdminPermission calls in same function block
    // Keep only the one with the specific permission (not 'admin')

    // Fix 2: Remove the generic "admin" check if followed by a more specific one
    content = content.replace(
        /const \{ authorized \} = await verifyAdminPermission\('admin'\)\n\s*if \(!authorized\) \{\n\s*return NextResponse\.json\(\{ error: 'Unauthorized' \}, \{ status: 401 \}\)\n\s*\}\r?\n\s*\n\s*const supabase = createSupabaseAdminClient\(\)\r?\n\s*\n\s*const \{ authorized \} = await verifyAdminPermission\('([^']+)'\)/g,
        "const { authorized } = await verifyAdminPermission('$1')\n    if (!authorized) {\n        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })\n    }\n\n    const supabase = createSupabaseAdminClient()\n    // Permission verified: $1"
    );

    // Fix 3: Remove old admin check patterns that use accessCode and sessionId
    content = content.replace(
        /\s*let isAdmin = false\s*\n\s*\n\s*if \(accessCode\) \{\s*\n\s*const \{ data: adminUser \} = await supabase\.from\('profiles'\)\.select\('username'\)\.eq\('access_code', accessCode\)\.single\(\)\s*\n\s*if \(adminUser\?\.username === 'admin_wam'\) isAdmin = true\s*\n\s*\}\s*\n\s*\n\s*if \(!isAdmin && sessionId\) \{\s*\n\s*const \{ data: adminUser \} = await supabase\.from\('profiles'\)\.select\('username'\)\.eq\('id', sessionId\)\.single\(\)\s*\n\s*if \(adminUser\?\.username === 'admin_wam'\) isAdmin = true\s*\n\s*\}\s*\n\s*\n\s*if \(!isAdmin\) \{\s*\n\s*return NextResponse\.json\(\{ error: 'Unauthorized' \}, \{ status: 401 \}\)\s*\n\s*\}/g,
        ''
    );

    // Fix 4: Remove remaining standalone `let isAdmin` patterns
    content = content.replace(
        /\s*let isAdmin = false\s*\n\s*if \(sessionId\) \{\s*\n\s*const \{ data: adminUser \} = await supabase\.from\('profiles'\)\.select\('username'\)\.eq\('id', sessionId\)\.single\(\)\s*\n\s*if \(adminUser\?\.username === 'admin_wam'\) isAdmin = true\s*\n\s*\}\s*\n\s*if \(accessCode\) \{\s*\n\s*const \{ data: adminUser \} = await supabase\.from\('profiles'\)\.select\('username'\)\.eq\('access_code', accessCode\)\.single\(\)\s*\n\s*if \(adminUser\?\.username === 'admin_wam'\) isAdmin = true\s*\n\s*\}\s*\n\s*\n\s*if \(!isAdmin\) \{\s*\n\s*return NextResponse\.json\(\{ error: 'Unauthorized' \}, \{ status: 401 \}\)\s*\n\s*\}/g,
        ''
    );

    // Fix 5: Replace remaining userId and currentUserId with verifyAdminPermission
    // Don't do this for files that have already been properly migrated

    // Fix 6: Remove remaining standalone old admin checks like:
    // const { data: profile } = await supabase.from('profiles')...eq('id', userId)...if (profile?.username !== 'admin_wam')
    content = content.replace(
        /\s*\/\/\s*\d*\.?\s*Verify Admin\s*(?:Status)?\s*\n\s*const \{ data: profile \} = await supabase\n?\s*\.from\('profiles'\)\n?\s*\.select\('username'\)\n?\s*\.eq\('id', (?:userId|currentUserId)\)\n?\s*\.single\(\)\r?\n\s*\n\s*if \(profile\?\.username !== 'admin_wam'\) \{\s*\n\s*return NextResponse\.json\(\{ error: 'Forbidden' \}, \{ status: 403 \}\)\s*\n\s*\}/g,
        ''
    );

    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log(`Fixed: ${relPath}`);
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

walkDir(apiDir);
console.log('\nDone!');
