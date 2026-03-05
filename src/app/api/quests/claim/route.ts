import { getAuthProfileContext } from '@/utils/auth'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { checkPositiveSentiment } from '@/lib/openrouter'
import { updateUserStreak } from '@/lib/streaks'

export async function POST(request: Request) {
  try {
    const { questId, photo_url, verification_note } = await request.json()
    const context = await getAuthProfileContext()

    if (!context || !questId) {
        return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }
    const currentUserId = context.profileId

    const supabase = createSupabaseAdminClient()

    const { data: quest } = await supabase
        .from('quests')
        .select('verification_type, created_at, dimension_id, points, title')
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
            status: 'approved',
            photo_url: photo_url || null,
            verification_note: verification_note || null,
        })

    if (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }

    // Streak bonus: update streak and apply multiplier
    let streakMultiplier = 1.0
    if (quest?.dimension_id) {
      try {
        const { multiplier } = await updateUserStreak(String(currentUserId), String(quest.dimension_id))
        streakMultiplier = multiplier

        if (multiplier > 1.0 && quest.points) {
          const bonusPoints = Math.floor(quest.points * (multiplier - 1))
          if (bonusPoints > 0) {
            await supabase.from('point_adjustments').insert({
              user_id: currentUserId,
              points: bonusPoints,
              reason: `🔥 Streak bonus (${multiplier}x) for quest: ${quest.title}`,
              dimension_id: quest.dimension_id,
              admin_id: null,
            })
          }
        }
      } catch (streakErr) {
        console.error('[Claim] Streak update error (non-fatal):', streakErr)
      }
    }

    return NextResponse.json({ success: true, streakMultiplier })

  } catch (error) {
    console.error('Claim Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
