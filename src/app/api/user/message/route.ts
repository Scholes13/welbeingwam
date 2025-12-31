import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { checkPositiveSentiment } from '@/lib/openrouter'

// Points reward for replying to positive message
const REPLY_REWARD_POINTS = 10

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const senderId = cookieStore.get('strava_athlete_id')?.value

  if (!senderId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { targetUserId, message, isReply = false } = await request.json()

  if (!targetUserId || !message) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
      // Save the message
      const { error } = await supabase.from('notifications').insert({
          user_id: targetUserId,
          sender_id: senderId,
          message: message,
          type: 'message',
          title: 'New Message',
          is_reply: isReply
      })

      if (error) throw error

      // If this is a REPLY, check if bonus should be awarded
      if (isReply) {
          console.log('[Reply] Checking if eligible for bonus...')
          
          // First, check if user already got a bonus today (prevent duplicates)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          
          const { data: existingBonus } = await supabase
              .from('notifications')
              .select('id')
              .eq('user_id', senderId)
              .eq('type', 'reward')
              .ilike('message', '%membalas pesan positif%')
              .gte('created_at', today.toISOString())
              .limit(1)
          
          if (existingBonus && existingBonus.length > 0) {
              console.log('[Reply] User already got bonus today, skipping...')
              return NextResponse.json({ success: true })
          }
          
          // Get the last POSITIVE message FROM targetUser TO senderId
          const { data: originalMessages } = await supabase
              .from('notifications')
              .select('id, message, sender_id, bonus_claimed')
              .eq('sender_id', targetUserId)
              .eq('user_id', senderId)
              .eq('type', 'message')
              .eq('is_reply', false)
              .eq('bonus_claimed', false)
              .order('created_at', { ascending: false })
              .limit(1)
          
          if (originalMessages && originalMessages.length > 0) {
              const originalMessage = originalMessages[0]
              console.log('[Reply] Found original message:', originalMessage.message.substring(0, 50))
              
              // Check if original message was positive
              const sentiment = await checkPositiveSentiment(originalMessage.message)
              
              if (sentiment.isPositive) {
                  console.log('[Reply] Original message was POSITIVE! Awarding points...')
                  
                  // Mark ALL messages from this sender as bonus_claimed (prevent future duplicates)
                  await supabase
                      .from('notifications')
                      .update({ bonus_claimed: true })
                      .eq('sender_id', targetUserId)
                      .eq('user_id', senderId)
                      .eq('type', 'message')
                      .eq('is_reply', false)
                  
                  // Award points
                  const { data: profile } = await supabase
                      .from('profiles')
                      .select('points')
                      .eq('id', senderId)
                      .single()
                  
                  if (profile) {
                      await supabase
                          .from('profiles')
                          .update({ points: (profile.points || 0) + REPLY_REWARD_POINTS })
                          .eq('id', senderId)
                  }
                  
                  console.log(`[Reply] Awarded ${REPLY_REWARD_POINTS} points to user ${senderId}`)
                  
                  // Send notification
                  await supabase.from('notifications').insert({
                      user_id: senderId,
                      message: `🎉 Kamu mendapat +${REPLY_REWARD_POINTS} poin karena membalas pesan positif!`,
                      type: 'reward',
                      title: 'Bonus Points!'
                  })
                  
                  return NextResponse.json({ 
                      success: true, 
                      bonusPoints: REPLY_REWARD_POINTS,
                      message: `Pesan terkirim! +${REPLY_REWARD_POINTS} bonus points! 🎉`
                  })
              }
          }
      }

      return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Message Error:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
