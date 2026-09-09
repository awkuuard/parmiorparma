// app/api/agent/cron/route.ts
// ============================================================
// Vercel cron job — runs the agent and caches the verdict
// Schedule: every Tuesday at 10am AEST (00:00 UTC Tuesday)
// Add to vercel.json:
// {
//   "crons": [{
//     "path": "/api/agent/cron",
//     "schedule": "0 0 * * 2"
//   }]
// }
// ============================================================
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SYSTEM_PROMPT = `You are a no-nonsense Australian pub culture expert and linguistic referee.
Your job is to definitively settle the "Parmi vs Parma" debate once and for all.

METHODOLOGY NOTE: "Parmi" and "Parmy" are the same word phonetically — combined into one camp below.

VERIFIED BASELINE DATA:
National (YouGov 2020, n=1,055): 55% Parmi/Parmy vs 34% Parma vs 11% other
- Victoria: 72% PARMA — the only state with a Parma majority
- SA: 82% Parmi/Parmy | QLD: 66% | NSW: 55% | WA: 51%
- NT: 50% use full name "Parmigiana" (Arnott's 2020)
Victorian Premier Daniel Andrews declared "Parma" in 2018.
AHA Victoria uses "Parma" in all official communications.

PRICING (PubWatch 2026, 7,611 venues):
National avg regular: $30.08 | SA highest $31.07 | NT lowest $29.49
Parma night specials: $20 anchor price, Tue/Wed dominant nights

Use web search for any additional current evidence. Do NOT contradict the verified data above.

Deliver a verdict that is:
- Definitive and confident — pick a winner
- Genuinely funny in an Australian way
- Under 150 words
- Uses markdown (## headers, **bold**)
- Structured as: ## THE EVIDENCE → ## THE VERDICT → **ONE-LINER RULING**

Do not hedge. Pick a winner.`

export async function GET(req: NextRequest) {
  // Verify this is called by Vercel cron or an authorised admin
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  try {
    console.log('Agent cron: running verdict generation...')

    // Call Claude API with web search
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: 'Research the Parmi vs Parma debate using the verified baseline and any current web evidence. Deliver your definitive verdict.',
        }],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Anthropic API error:', data)
      return NextResponse.json({ error: 'API call failed' }, { status: 500 })
    }

    const verdict = data.content
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { type: string; text: string }) => b.text)
      .join('\n')
      .trim()

    if (!verdict) {
      return NextResponse.json({ error: 'Empty verdict returned' }, { status: 500 })
    }

    // Hash the prompt so we can detect if it changes between runs
    const promptHash = crypto.createHash('sha256').update(SYSTEM_PROMPT).digest('hex').slice(0, 16)

    // Store in Supabase — atomically swaps active verdict
    const { data: result, error } = await supabase
      .rpc('set_active_verdict', {
        new_verdict: verdict,
        trigger_type: 'cron',
        phash: promptHash,
      })

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Failed to cache verdict' }, { status: 500 })
    }

    console.log(`Agent cron: verdict cached successfully (id: ${result})`)

    return NextResponse.json({
      success: true,
      verdictId: result,
      previewLength: verdict.length,
      preview: verdict.slice(0, 100) + '...',
    })

  } catch (err) {
    console.error('Cron error:', err)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}