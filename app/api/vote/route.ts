import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function hashString(str: string) {
  return crypto.createHash('sha256').update(str).digest('hex')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { side, state, postcode, suburb, referralCode } = body

    // Validate side
    if (!side || !['parmi', 'parma'].includes(side)) {
      return NextResponse.json({ error: 'Invalid side' }, { status: 400 })
    }

    // Build session hash from IP + user agent (no PII stored raw)
    const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
    const ua = req.headers.get('user-agent') ?? 'unknown'
    const sessionHash = hashString(`${ip}:${ua}`)

    const { data, error } = await supabase
      .from('votes')
      .insert({
        side,
        state: state ?? null,
        postcode: postcode ?? null,
        suburb: suburb ?? null,
        session_hash: sessionHash,
        referral_code: referralCode ?? null,
      })
      .select('id')
      .single()

    if (error) throw error

    return NextResponse.json({ voteId: data.id }, { status: 201 })

  } catch (err) {
    console.error('Vote error:', err)
    return NextResponse.json({ error: 'Failed to record vote' }, { status: 500 })
  }
}

// Get current national split
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('v_national_split')
      .select('*')

    if (error) throw error

    return NextResponse.json({ split: data }, { status: 200 })

  } catch (err) {
    console.error('Split error:', err)
    return NextResponse.json({ error: 'Failed to fetch split' }, { status: 500 })
  }
}
