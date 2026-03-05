/**
 * OpenRouter API Service with Fallback
 * Automatically switches between 4 API keys when rate limited
 */

const API_KEYS = [
    process.env.OPENROUTER_API_KEY_1,
    process.env.OPENROUTER_API_KEY_2,
    process.env.OPENROUTER_API_KEY_3,
    process.env.OPENROUTER_API_KEY_4,
].filter(Boolean) as string[]

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const MODEL = 'google/gemini-2.0-flash-001'

interface OpenRouterResponse {
    choices: {
        message: {
            content: string
        }
    }[]
}

async function callOpenRouter(apiKey: string, messages: { role: string, content: string }[]): Promise<string> {
    const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://wam25.vercel.app',
            'X-Title': 'WLM Wellbeing App'
        },
        body: JSON.stringify({
            model: MODEL,
            messages,
            max_tokens: 50,
            temperature: 0.1
        })
    })

    if (response.status === 429) {
        throw new Error('RATE_LIMITED')
    }

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API Error: ${response.status} - ${errorText}`)
    }

    const data: OpenRouterResponse = await response.json()
    return data.choices[0]?.message?.content || ''
}

/**
 * Call OpenRouter with automatic fallback across API keys
 */
export async function callWithFallback(messages: { role: string, content: string }[]): Promise<string> {
    let lastError: Error | null = null

    for (let i = 0; i < API_KEYS.length; i++) {
        const apiKey = API_KEYS[i]
        try {
            console.log(`[OpenRouter] Trying API key #${i + 1}`)
            const result = await callOpenRouter(apiKey, messages)
            console.log(`[OpenRouter] Success with API key #${i + 1}`)
            return result
        } catch (error: any) {
            console.log(`[OpenRouter] API key #${i + 1} failed: ${error.message}`)
            lastError = error
            
            // Only continue to next key if rate limited
            if (error.message !== 'RATE_LIMITED') {
                throw error
            }
        }
    }

    throw lastError || new Error('All API keys exhausted')
}

/**
 * Check if a message has positive/encouraging sentiment
 * Returns: { isPositive: boolean, reason: string }
 */
export async function checkPositiveSentiment(message: string): Promise<{ isPositive: boolean, reason: string }> {
    const systemPrompt = `You are a sentiment analyzer. Analyze if the message is positive, encouraging, or supportive.
Reply with exactly one word: "POSITIVE" or "NEGATIVE".
- POSITIVE: Messages with encouragement, support, kindness, motivation, gratitude, compliments
- NEGATIVE: Messages with negativity, insults, complaints, rudeness, hostility

Only reply with one word.`

    try {
        const response = await callWithFallback([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
        ])

        const result = response.trim().toUpperCase()
        const isPositive = result.includes('POSITIVE')

        return {
            isPositive,
            reason: isPositive ? 'Message is positive and encouraging' : 'Message does not appear to be positive'
        }
    } catch (error: any) {
        console.error('[Sentiment] Error:', error.message)
        // On error, allow the message (fail-open for better UX)
        return {
            isPositive: true,
            reason: 'Sentiment check unavailable, message allowed'
        }
    }
}
