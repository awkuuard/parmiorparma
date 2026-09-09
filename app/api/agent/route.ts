// app/api/agent/route.ts
// ============================================================
// Serves cached verdict from Supabase — zero API cost per user
// Falls back to a stored default if no cached verdict exists
// ============================================================
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const FALLBACK_VERDICT = `## The Evidence

After analysing YouGov's national survey (n=1,055), Arnott's consumer research (n=1,000), and PubWatch pricing data across 7,611 venues:

**55% of Australians say Parmi/Parmy. 34% say Parma.** Victoria is the only state where a majority (72%) say Parma. Every other state disagrees with them.

## The Verdict: **Parmi wins on numbers. Parma wins in Victoria.**

The data is unambiguous. One state vs the nation. Democracy is brutal, Melburnians.

**One-liner ruling:** *Saying "Parma" is perfectly correct — if you live in Victoria. The other 85% of Australia has outvoted you.*

*Verdict generated from verified data: YouGov 2020, Arnott's 2020, PubWatch 2026.*`

export async function GET() {
  try {
    // Fetch cached verdict from Supabase
    const { data, error } = await supabase
      .from('agent_verdicts')
      .select('verdict, created_at')
      .eq('is_active', true)
      .single()

    if (error || !data) {
      // No cached verdict yet — return fallback
      return NextResponse.json({
        verdict: FALLBACK_VERDICT,
        cached: false,
        updatedAt: null,
      })
    }

    return NextResponse.json({
      verdict: data.verdict,
      cached: true,
      updatedAt: data.created_at,
    })

  } catch (err) {
    console.error('Agent GET error:', err)
    return NextResponse.json({
      verdict: FALLBACK_VERDICT,
      cached: false,
      updatedAt: null,
    })
  }
}