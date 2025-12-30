
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ihrutobdomnagnwzwncy.supabase.co'
const supabaseServiceKey = 'sb_secret_XD21xo3c9CiF7s8qEGeKcw_WzpywRDt'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testPoints() {
    console.log('Testing Points Adjustment...')

    const adminId = '-1001' // Based on previous logs
    const targetUserId = '-1767086709186' // septian

    console.log('Target User:', targetUserId)

    const points = 10
    const reason = 'Test Script Adjustment'

    // 1. Point Adjustment
    console.log('Inserting into point_adjustments...')
    const { error: adjError } = await supabase
        .from('point_adjustments')
        .insert({
            user_id: targetUserId,
            points: points,
            reason: reason,
            admin_id: adminId
        })

    if (adjError) {
        console.error('Adjustment Error:', adjError)
        return
    } else {
        console.log('Adjustment Success!')
    }

    // 2. Notification
    console.log('Inserting into notifications...')
    const { error: notifError } = await supabase
        .from('notifications')
        .insert({
            user_id: targetUserId,
            title: 'Test Points',
            message: 'You got test points',
            type: 'success',
            is_read: false
        })

    if (notifError) {
        console.error('Notification Error:', notifError)
    } else {
        console.log('Notification Success!')
    }
}

testPoints()
