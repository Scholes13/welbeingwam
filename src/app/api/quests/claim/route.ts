import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { checkPositiveSentiment } from '@/lib/openrouter'

export async function POST(request: Request) {
  try {
    const { questId } = await request.json()
    const cookieStore = await cookies()
    const currentUserId = cookieStore.get('strava_athlete_id')?.value

    if (!currentUserId || !questId) {
        return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: quest } = await supabase
        .from('quests')
        .select('verification_type, created_at')
        .eq('id', questId)
        .single()

    if (quest?.verification_type === 'instagram_username') {
        const { data: profile } = await supabase
            .from('profiles')
            .select('instagram_username')
            .eq('id', currentUserId)
            .single()
        
        if (!profile?.instagram_username) {
            return NextResponse.json({ error: 'Please connect your Instagram username in Profile first.' }, { status: 400 })
        }
    } else if (quest?.verification_type === 'positive_message') {
        // POSITIVE MESSAGE QUEST: Check if user sent a POSITIVE message after quest was created
        // 1. Get messages sent by user after quest creation
        const { data: messages, error } = await supabase
            .from('notifications')
            .select('id, message')
            .eq('sender_id', currentUserId)
            .eq('type', 'message')
            .eq('is_reply', false) // Only Send, not Reply
            .gte('created_at', quest.created_at)
            .order('created_at', { ascending: false })
            .limit(5) // Check up to 5 most recent messages
        
        if (error) {
             console.error('Message fetch error:', error)
             return NextResponse.json({ error: 'Failed to verify messages' }, { status: 500 })
        }

        if (!messages || messages.length === 0) {
             return NextResponse.json({ error: 'Kamu perlu mengirim pesan ke teman dulu! (via Scan QR)' }, { status: 400 })
        }

        // 2. Check if ANY of the messages is positive
        console.log('[Claim] Checking sentiment for', messages.length, 'messages...')
        
        let foundPositive = false
        for (const msg of messages) {
            const sentiment = await checkPositiveSentiment(msg.message)
            console.log(`[Claim] Message "${msg.message.substring(0, 30)}..." => ${sentiment.isPositive ? 'POSITIVE' : 'NEGATIVE'}`)
            
            if (sentiment.isPositive) {
                foundPositive = true
                break // Found a positive message, no need to check more
            }
        }

        if (!foundPositive) {
            return NextResponse.json({ 
                error: 'Pesan kamu belum cukup positif. Yuk kirim pesan semangat/motivasi ke temanmu! 💪',
            }, { status: 400 })
        }
        
        console.log('[Claim] Positive message found! Quest can be claimed.')
    }

    // Check if already claimed
    const { data: existing } = await supabase
        .from('user_quests')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('quest_id', questId)
        .single()
    
    if (existing) {
         return NextResponse.json({ error: 'Already claimed' }, { status: 400 })
    }

    // Claim Quest
    const { error } = await supabase
        .from('user_quests')
        .insert({
            user_id: currentUserId,
            quest_id: questId,
            status: 'approved'
        })

    if (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Claim Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
