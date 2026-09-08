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
    const {
      voteId,
      email,
      side,
      venueName,
      venueGoogleId,
      suburb,
      state,
      postcode,
      pricePaid,
      isSpecial,
      dayOfWeek,
      mealTime,
      variant,
      includesDrink,
      drinkType,
      venueType,
      isMemberPrice,
    } = body

    // ── Step 1: Register entrant (email capture) ──────────
    let entrantId: string | null = null

    if (email) {
      const emailHash = hashString(email.toLowerCase().trim())

      // Dedup check
      const { data: existing } = await supabase
        .from('entrants')
        .select('id, entries')
        .eq('email_hash', emailHash)
        .maybeSingle()

      if (existing) {
        entrantId = existing.id
        // Add entry for this vote
        await supabase
          .from('entrants')
          .update({ entries: existing.entries + 1 })
          .eq('id', existing.id)
      } else {
        const weekNumber = getISOWeek(new Date())
        const { data: newEntrant, error: entrantError } = await supabase
          .from('entrants')
          .insert({
            email,
            email_hash: emailHash,
            vote_id: voteId ?? null,
            side: side ?? null,
            entries: 1,
            draw_week: weekNumber,
          })
          .select('id')
          .single()

        if (entrantError) throw entrantError
        entrantId = newEntrant.id
      }
    }

    // ── Step 2: Pub data submission ───────────────────────
    let submissionId: string | null = null

    if (venueName && pricePaid) {
      const price = parseFloat(pricePaid)
      if (isNaN(price) || price < 5 || price > 80) {
        return NextResponse.json({ error: 'Price must be between $5 and $80' }, { status: 400 })
      }

      const { data: submission, error: subError } = await supabase
        .from('pub_submissions')
        .insert({
          entrant_id: entrantId,
          vote_id: voteId ?? null,
          venue_name: venueName,
          venue_google_id: venueGoogleId ?? null,
          suburb: suburb ?? null,
          state: state ?? null,
          postcode: postcode ?? null,
          price_paid: price,
          is_special: isSpecial ?? null,
          day_of_week: dayOfWeek?.toLowerCase() ?? null,
          meal_time: mealTime ?? null,
          variant: variant?.toLowerCase() ?? null,
          includes_drink: includesDrink ?? false,
          drink_type: drinkType ?? null,
          venue_type: venueType?.toLowerCase().replace(' / ', '_').replace(' ', '_') ?? null,
          is_member_price: isMemberPrice ?? null,
        })
        .select('id')
        .single()

      if (subError) throw subError
      submissionId = submission.id

      // Award 3 bonus entries if we have an entrant
      if (entrantId) {
        await supabase.rpc('add_draw_entries', {
          entrant_uuid: entrantId,
          entry_count: 3,
        })
      }
    }

    return NextResponse.json({
      success: true,
      entrantId,
      submissionId,
      entriesAwarded: entrantId ? (venueName && pricePaid ? 4 : 1) : 0,
    }, { status: 201 })

  } catch (err) {
    console.error('Submit error:', err)
    return NextResponse.json({ error: 'Submission failed' }, { status: 500 })
  }
}

function getISOWeek(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}
