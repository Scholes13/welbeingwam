
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const envPath = path.resolve(__dirname, '.env.local')
const envConfig = fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .reduce((acc, line) => {
        const [key, val] = line.split('=')
        if (key && val) acc[key.trim()] = val.trim()
        return acc
    }, {})

const supabaseUrl = envConfig['NEXT_PUBLIC_SUPABASE_URL']
const supabaseKey = envConfig['SUPABASE_SERVICE_ROLE_KEY']

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
    const { data, error } = await supabase
        .from('activities')
        .select('*')
        .limit(1)

    // This just gets column names. I need types.
    // Supabase-js doesn't give types easily via select.
    // I will infer fail/success by running an insert with large number.
    // OR I can use rpc if I had one.
    // Actually, I'll just try to change it to BIGINT via SQL migration.
    if (error) console.error(error)
    else console.log('Columns:', Object.keys(data[0] || {}))
}

checkSchema()
