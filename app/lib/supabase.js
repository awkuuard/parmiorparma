// ============================================================
// PARMI OR PARMA — Supabase client library
// /src/lib/supabase.js
// ============================================================
// Install: npm install @supabase/supabase-js
// Env vars needed in .env.local:
//   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
//   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (server-side only)
// ============================================================

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// ── Public client (browser-safe, respects RLS) ─────────────
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// ── Server client (service role — admin/API routes only) ───
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ── Helpers ─────────────────────────────────────────────────

function hashString(str) {
  return crypto.createHash('sha256').update(str).digest('hex')
}

// Cast a vote
export async function castVote({ side, state, postcode, suburb, sessionId, referralCode }) {
  const { data, error } = await supabase
    .from('votes')
    .insert({
      side,
      state: state ?? null,
      postcode: postcode ?? null,
      suburb: suburb ?? null,
      session_hash: hashString(sessionId),
      referral_code: referralCode ?? null,
    })
    .select('id')
    .single()

  if (error) throw error
  return data.id // voteId — pass to next steps
}

// Register draw entrant
export async function registerEntrant({ email, voteId, side }) {
  const emailHash = hashString(email.toLowerCase().trim())
  const weekNumber = getISOWeek(new Date())

  // Check for existing entrant (dedup by email hash)
  const { data: existing } = await supabase
    .from('entrants')
    .select('id, entries')
    .eq('email_hash', emailHash)
    .maybeSingle()

  if (existing) {
    // Already entered — just add the entry for this vote
    await supabase
      .from('entrants')
      .update({ entries: existing.entries + 1 })
      .eq('id', existing.id)
    return existing.id
  }

  const { data, error } = await supabase
    .from('entrants')
    .insert({
      email,
      email_hash: emailHash,
      vote_id: voteId,
      side,
      entries: 1,
      draw_week: weekNumber,
    })
    .select('id')
    .single()

  if (error) throw error
  return data.id
}

// Submit pub data (awards 3 bonus entries)
export async function submitPubData({
  entrantId,
  voteId,
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
}) {
  // Soft validation
  const price = parseFloat(pricePaid)
  if (isNaN(price) || price < 5 || price > 80) {
    throw new Error('Price must be between $5 and $80')
  }

  const { error } = await supabase
    .from('pub_submissions')
    .insert({
      entrant_id: entrantId,
      vote_id: voteId,
      venue_name: venueName,
      venue_google_id: venueGoogleId ?? null,
      suburb: suburb ?? null,
      state: state ?? null,
      postcode: postcode ?? null,
      price_paid: price,
      is_special: isSpecial ?? null,
      day_of_week: dayOfWeek?.toLowerCase() ?? null,
      meal_time: mealTime ?? null,
      variant: variant ?? null,
      includes_drink: includesDrink ?? false,
      drink_type: drinkType ?? null,
      venue_type: venueType ?? null,
      is_member_price: isMemberPrice ?? null,
    })

  if (error) throw error

  // Award 3 bonus entries
  await supabase.rpc('add_draw_entries', {
    entrant_uuid: entrantId,
    entry_count: 3,
  })
}

// ── Data reads (for front-end display) ──────────────────────

export async function getNationalSplit() {
  const { data, error } = await supabase.from('v_national_split').select('*')
  if (error) throw error
  return data // [{ side: 'parmi', votes: 1234, pct: 52.1 }, ...]
}

export async function getStateSplit() {
  const { data, error } = await supabase.from('v_state_split').select('*')
  if (error) throw error
  return data
}

export async function getPriceIndex() {
  const { data, error } = await supabase.from('v_price_index').select('*')
  if (error) throw error
  return data
}

export async function getSpecialDays() {
  const { data, error } = await supabase.from('v_special_days').select('*')
  if (error) throw error
  return data
}

export async function getVariantPopularity() {
  const { data, error } = await supabase.from('v_variant_popularity').select('*')
  if (error) throw error
  return data
}

// Venue autocomplete (Google Places passthrough)
export async function searchVenues(query) {
  if (query.length < 3) return []
  const { data, error } = await supabase
    .from('pub_submissions')
    .select('venue_name, suburb, state, venue_google_id')
    .ilike('venue_name', `%${query}%`)
    .limit(8)
  if (error) throw error
  // Deduplicate by google_id
  const seen = new Set()
  return data.filter(v => {
    const key = v.venue_google_id || v.venue_name
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ── Referral tracking ────────────────────────────────────────
export async function trackReferral({ referrerEntrantId, referredEntrantId }) {
  const { error } = await supabase
    .from('referrals')
    .insert({
      referrer_entrant_id: referrerEntrantId,
      referred_entrant_id: referredEntrantId,
      bonus_entry_awarded: false,
    })
  if (error) throw error

  // Award referrer a bonus entry
  await supabase.rpc('add_draw_entries', {
    entrant_uuid: referrerEntrantId,
    entry_count: 1,
  })
}

// ── Utility ──────────────────────────────────────────────────
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}