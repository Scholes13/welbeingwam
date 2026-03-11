const fs = require('fs');
const path = require('path');

const files = [
    'admin/surveys/questions/delete/route.ts',
    'admin/surveys/delete/route.ts',
    'admin/rewards/update/route.ts',
    'admin/rewards/list/route.ts',
    'admin/rewards/delete/route.ts',
    'admin/rewards/create/route.ts',
    'admin/quests/delete/route.ts',
];

const apiDir = path.resolve(__dirname, '..', 'src', 'app', 'api');

files.forEach(file => {
    const filePath = path.join(apiDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');

    // Remove the entire cookieStore-based admin check block
    // Pattern: accessCode + sessionId + isAdmin check block
    content = content.replace(
        /\s*const accessCode = cookieStore\.get\('manual_access_code'\)\?\.value\s*\n\s*const sessionId = cookieStore\.get\('strava_athlete_id'\)\?\.value\s*\n\s*\n\s*let isAdmin = false\s*\n\s*\n\s*if \(accessCode\) \{\s*\n\s*const \{ data: adminUser \} = await supabase\.from\('profiles'\)\.select\('username'\)\.eq\('access_code', accessCode\)\.single\(\)\s*\n\s*if \(adminUser\?\.username === 'admin_wam'\) isAdmin = true\s*\n\s*\}\s*\n\s*\n\s*if \(!isAdmin && sessionId\) \{\s*\n\s*const \{ data: adminUser \} = await supabase\.from\('profiles'\)\.select\('username'\)\.eq\('id', sessionId\)\.single\(\)\s*\n\s*if \(adminUser\?\.username === 'admin_wam'\) isAdmin = true\s*\n\s*\}\s*\n\s*\n\s*if \(!isAdmin\) \{\s*\n\s*return NextResponse\.json\(\{ error: 'Unauthorized' \}, \{ status: 401 \}\)\s*\n\s*\}/g,
        '\n    const { authorized } = await verifyAdminPermission(\'admin\')\n    if (!authorized) {\n        return NextResponse.json({ error: \'Unauthorized\' }, { status: 401 })\n    }'
    );

    // Also handle the reversed order (sessionId before accessCode)
    content = content.replace(
        /\s*const sessionId = cookieStore\.get\('strava_athlete_id'\)\?\.value\s*\n\s*const accessCode = cookieStore\.get\('manual_access_code'\)\?\.value\s*\n\s*\n\s*let isAdmin = false\s*\n\s*\n\s*if \(accessCode\) \{\s*\n\s*const \{ data: adminUser \} = await supabase\.from\('profiles'\)\.select\('username'\)\.eq\('access_code', accessCode\)\.single\(\)\s*\n\s*if \(adminUser\?\.username === 'admin_wam'\) isAdmin = true\s*\n\s*\}\s*\n\s*\n\s*if \(!isAdmin && sessionId\) \{\s*\n\s*const \{ data: adminUser \} = await supabase\.from\('profiles'\)\.select\('username'\)\.eq\('id', sessionId\)\.single\(\)\s*\n\s*if \(adminUser\?\.username === 'admin_wam'\) isAdmin = true\s*\n\s*\}\s*\n\s*\n\s*if \(!isAdmin\) \{\s*\n\s*return NextResponse\.json\(\{ error: 'Unauthorized' \}, \{ status: 401 \}\)\s*\n\s*\}/g,
        '\n    const { authorized } = await verifyAdminPermission(\'admin\')\n    if (!authorized) {\n        return NextResponse.json({ error: \'Unauthorized\' }, { status: 401 })\n    }'
    );

    // Clean up any remaining cookieStore references
    content = content.replace(/const accessCode = cookieStore\.get\('manual_access_code'\)\?\.value\r?\n/g, '');
    content = content.replace(/const sessionId = cookieStore\.get\('strava_athlete_id'\)\?\.value\r?\n/g, '');

    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${file}`);
});

console.log('\nDone!');
