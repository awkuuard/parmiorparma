'use client'

import { useState, useEffect } from 'react'

type Side = 'parmi' | 'parma' | null
type Step = 'vote' | 'email' | 'data' | 'done'

interface StateData {
  state: string
  parmi: number
  parma: number
}

const STATE_DATA: StateData[] = [
  { state: 'VIC', parmi: 71, parma: 29 },
  { state: 'NSW', parmi: 42, parma: 58 },
  { state: 'QLD', parmi: 37, parma: 63 },
  { state: 'WA',  parmi: 40, parma: 60 },
  { state: 'SA',  parmi: 52, parma: 48 },
  { state: 'TAS', parmi: 54, parma: 46 },
  { state: 'ACT', parmi: 49, parma: 51 },
  { state: 'NT',  parmi: 45, parma: 55 },
]

const VARIANTS = ['Classic', 'Mexican', 'Hawaiian', 'BBQ', 'Truffle', 'Other']
const VENUE_TYPES = ['Pub', 'RSL / Club', 'Gastropub', 'Sports bar']
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function Home() {
  const [side, setSide] = useState<Side>(null)
  const [step, setStep] = useState<Step>('vote')
  const [entries, setEntries] = useState(0)
  const [email, setEmail] = useState('')
  const [venueName, setVenueName] = useState('')
  const [suburb, setSuburb] = useState('')
  const [price, setPrice] = useState('')
  const [isSpecial, setIsSpecial] = useState<boolean | null>(null)
  const [dayOfWeek, setDayOfWeek] = useState('')
  const [variant, setVariant] = useState('')
  const [venueType, setVenueType] = useState('')
  const [isMember, setIsMember] = useState<boolean | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [parmiPct, setParmiPct] = useState(52)
  const [totalVotes, setTotalVotes] = useState(3847)
  const [agentRunning, setAgentRunning] = useState(false)
  const [agentText, setAgentText] = useState('')
  const [agentDone, setAgentDone] = useState(false)

  // Seed realistic vote counts on load
  useEffect(() => {
    const parmi = 1997 + Math.floor(Math.random() * 200)
    const parma = 1850 + Math.floor(Math.random() * 200)
    setParmiPct(Math.round((parmi / (parmi + parma)) * 100))
    setTotalVotes(parmi + parma)
  }, [])

  function validate(field: string, value: string) {
    const e = { ...errors }
    if (field === 'email') {
      if (!value || !value.includes('@') || !value.includes('.')) {
        e.email = 'Enter a valid email address.'
      } else delete e.email
    }
    if (field === 'price') {
      const n = parseFloat(value)
      if (!value || isNaN(n) || n < 5 || n > 80) {
        e.price = 'Price should be between $5 and $80.'
      } else delete e.price
    }
    if (field === 'venue') {
      if (!value.trim()) e.venue = 'Pub name is required.'
      else delete e.venue
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function castVote(s: Side) {
    if (step !== 'vote') return
    setSide(s)
    setEntries(1)
    setParmiPct(prev => s === 'parmi' ? Math.min(prev + 1, 99) : Math.max(prev - 1, 1))
    setTotalVotes(prev => prev + 1)
    setStep('email')
  }

  function submitEmail() {
    if (!validate('email', email)) return
    setEntries(2)
    setStep('data')
  }

  function skipEmail() {
    setStep('data')
  }

  function submitData() {
    const vOk = validate('venue', venueName)
    const pOk = validate('price', price)
    if (!vOk || !pOk) return
    setEntries(prev => prev + 3)
    setStep('done')
  }

  function skipData() {
    setStep('done')
  }

  const agentSteps = [
    'Searching pub menus across 847 venues...',
    'Checking Macquarie Dictionary records...',
    'Scanning 14,000 Reddit threads from r/australia...',
    'Analysing Google Trends data 2010–2026...',
    'Consulting 3 food linguists and 1 very opinionated barman...',
  ]

  const agentVerdict = `After analysing 847 pub menus, 14,000 Reddit posts, and Google Trends data across all states — the verdict:\n\n🟢 Both are correct, but "Parma" wins on etymology. The dish derives from Parma, Italy — making "Parma" the logical shortening. However, Victorian pub culture has made "Parmi" a legitimate regional variant.\n\nFinal ruling: Order whatever you want. Anyone who corrects you is insufferable.`

  function runAgent() {
    if (agentRunning || agentDone) return
    setAgentRunning(true)
    let i = 0
    const interval = setInterval(() => {
      if (i < agentSteps.length) {
        setAgentText(agentSteps[i])
        i++
      } else {
        clearInterval(interval)
        setAgentText(agentVerdict)
        setAgentDone(true)
        setAgentRunning(false)
      }
    }, 900)
  }

  const parmaWidth = 100 - parmiPct

  return (
    <main className="min-h-screen bg-stone-50">

      {/* Hero */}
      <section className="bg-[#1B3A2D] px-6 py-12 text-center">
        <p className="text-[#E8A020] text-xs font-semibold tracking-widest uppercase mb-3">
          Australia&apos;s most important debate
        </p>
        <h1 className="text-white font-black leading-none mb-2" style={{ fontSize: 'clamp(56px, 14vw, 96px)', fontFamily: 'Impact, sans-serif' }}>
          PARMI
          <span className="block text-[#E8A020]" style={{ fontSize: '0.55em' }}>vs</span>
          PARMA
        </h1>
        <p className="text-stone-400 text-sm mt-3 italic">Pick a side. The nation is watching.</p>
      </section>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Live results bar */}
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <div className="flex justify-between text-sm font-medium mb-2">
            <span className="text-[#1B3A2D]">{parmiPct}% Parmi</span>
            <span className="text-stone-400 text-xs">{totalVotes.toLocaleString()} votes</span>
            <span className="text-[#B87A10]">{parmaWidth}% Parma</span>
          </div>
          <div className="h-3 bg-stone-100 rounded-full overflow-hidden flex">
            <div className="bg-[#1B3A2D] transition-all duration-700 ease-out" style={{ width: `${parmiPct}%` }} />
            <div className="bg-[#E8A020] transition-all duration-700 ease-out" style={{ width: `${parmaWidth}%` }} />
          </div>
        </div>

        {/* Step: Vote */}
        {step === 'vote' && (
          <div className="bg-white rounded-xl border border-stone-200 p-4">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Cast your vote</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => castVote('parmi')}
                className="py-6 rounded-xl border-2 border-[#1B3A2D] bg-[#1B3A2D] text-white font-black text-3xl hover:opacity-90 transition-opacity"
                style={{ fontFamily: 'Impact, sans-serif' }}
              >
                PARMI
                <span className="block text-xs font-normal text-stone-300 mt-1">Team Victoria</span>
              </button>
              <button
                onClick={() => castVote('parma')}
                className="py-6 rounded-xl border-2 border-[#E8A020] bg-[#E8A020] text-stone-900 font-black text-3xl hover:opacity-90 transition-opacity"
                style={{ fontFamily: 'Impact, sans-serif' }}
              >
                PARMA
                <span className="block text-xs font-normal text-stone-700 mt-1">The rest</span>
              </button>
            </div>
          </div>
        )}

        {/* Step: Email */}
        {step === 'email' && (
          <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Confirm your entry</p>
              <span className="text-xs bg-green-50 text-green-700 font-medium px-2 py-0.5 rounded-full">+1 entry earned</span>
            </div>
            <p className="text-sm text-stone-500">Enter your email to go in the weekly merch draw. Drawn every Friday.</p>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); validate('email', e.target.value) }}
              placeholder="you@email.com"
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A2D]"
            />
            {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
            <p className="text-xs text-stone-400">No spam — ever. Unsubscribe anytime.</p>
            <button
              onClick={submitEmail}
              className="w-full bg-[#1B3A2D] text-white rounded-lg py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Confirm entry
            </button>
            <button
              onClick={skipEmail}
              className="w-full text-stone-400 text-xs py-1 hover:text-stone-600 transition-colors"
            >
              Skip — just vote, no draw entry
            </button>
          </div>
        )}

        {/* Step: Pub data */}
        {step === 'data' && (
          <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Add your pub data</p>
              <span className="text-xs bg-amber-50 text-amber-700 font-medium px-2 py-0.5 rounded-full">+3 entries</span>
            </div>
            <p className="text-sm text-stone-500">Help us build Australia&apos;s only independent parma price index.</p>

            <div>
              <label className="text-xs text-stone-500 mb-1 block">Pub name</label>
              <input type="text" value={venueName} onChange={e => { setVenueName(e.target.value); validate('venue', e.target.value) }}
                placeholder="The Local Hotel" className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A2D]" />
              {errors.venue && <p className="text-red-500 text-xs mt-1">{errors.venue}</p>}
            </div>

            <div>
              <label className="text-xs text-stone-500 mb-1 block">Suburb</label>
              <input type="text" value={suburb} onChange={e => setSuburb(e.target.value)}
                placeholder="Fitzroy, VIC" className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1B3A2D]" />
            </div>

            <div>
              <label className="text-xs text-stone-500 mb-1 block">Price paid</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-sm text-stone-400">$</span>
                <input type="number" value={price} onChange={e => { setPrice(e.target.value); validate('price', e.target.value) }}
                  placeholder="24" min="5" max="80"
                  className="w-full border border-stone-200 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:border-[#1B3A2D]" />
              </div>
              {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
            </div>

            <div>
              <label className="text-xs text-stone-500 mb-2 block">Special deal?</label>
              <div className="flex gap-2">
                {[{ label: 'Yes — parma night', val: true }, { label: 'No — regular menu', val: false }].map(o => (
                  <button key={String(o.val)} onClick={() => setIsSpecial(o.val)}
                    className={`flex-1 py-1.5 rounded-lg border text-xs transition-colors ${isSpecial === o.val ? 'border-[#1B3A2D] bg-[#1B3A2D] text-white' : 'border-stone-200 text-stone-500 hover:border-stone-300'}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-stone-500 mb-2 block">Day of week</label>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map(d => (
                  <button key={d} onClick={() => setDayOfWeek(d)}
                    className={`px-2.5 py-1 rounded-full border text-xs transition-colors ${dayOfWeek === d ? 'border-[#1B3A2D] bg-[#1B3A2D] text-white' : 'border-stone-200 text-stone-500 hover:border-stone-300'}`}>
                    {d.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-stone-500 mb-2 block">Variant</label>
              <div className="flex flex-wrap gap-1.5">
                {VARIANTS.map(v => (
                  <button key={v} onClick={() => setVariant(v)}
                    className={`px-2.5 py-1 rounded-full border text-xs transition-colors ${variant === v ? 'border-[#1B3A2D] bg-[#1B3A2D] text-white' : 'border-stone-200 text-stone-500 hover:border-stone-300'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-stone-500 mb-2 block">Venue type</label>
              <div className="flex flex-wrap gap-1.5">
                {VENUE_TYPES.map(v => (
                  <button key={v} onClick={() => setVenueType(v)}
                    className={`px-2.5 py-1 rounded-full border text-xs transition-colors ${venueType === v ? 'border-[#1B3A2D] bg-[#1B3A2D] text-white' : 'border-stone-200 text-stone-500 hover:border-stone-300'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-stone-500 mb-2 block">Member price?</label>
              <div className="flex gap-2">
                {[{ label: 'Yes — member rate', val: true }, { label: 'No — walk-in price', val: false }].map(o => (
                  <button key={String(o.val)} onClick={() => setIsMember(o.val)}
                    className={`flex-1 py-1.5 rounded-lg border text-xs transition-colors ${isMember === o.val ? 'border-[#1B3A2D] bg-[#1B3A2D] text-white' : 'border-stone-200 text-stone-500 hover:border-stone-300'}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={submitData}
              className="w-full bg-[#1B3A2D] text-white rounded-lg py-2.5 text-sm font-medium hover:opacity-90 transition-opacity">
              Submit and earn 3× entries
            </button>
            <button onClick={skipData}
              className="w-full text-stone-400 text-xs py-1 hover:text-stone-600 transition-colors">
              Skip — keep my current entries
            </button>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div className="bg-white rounded-xl border border-stone-200 p-6 text-center space-y-3">
            <div className="text-4xl">🎉</div>
            <h2 className="text-lg font-semibold text-stone-800">
              You&apos;re in with {entries} {entries === 1 ? 'entry' : 'entries'}.
            </h2>
            <p className="text-sm text-stone-500">
              Winner drawn every Friday on Instagram. {entries >= 5 ? 'Your pub data helps build the national parma price index.' : 'Share with your pub group for a bonus entry.'}
            </p>
            {/* Merch CTA */}
            <div className="bg-[#E8A020] rounded-xl p-4 text-left flex justify-between items-center mt-2">
              <div>
                <p className="text-xs font-semibold text-stone-700 uppercase tracking-wider">You voted</p>
                <p className="text-xl font-black text-stone-900" style={{ fontFamily: 'Impact, sans-serif' }}>
                  Team {side === 'parmi' ? 'Parmi' : 'Parma'}
                </p>
                <p className="text-xs text-stone-700 mt-0.5">Tee · Hoodie · Stubby holder</p>
              </div>
              <button className="bg-stone-900 text-white text-xs font-medium px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
                Shop now ↗
              </button>
            </div>
          </div>
        )}

        {/* State map */}
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">State by state</p>
          <div className="grid grid-cols-4 gap-2">
            {STATE_DATA.map(s => {
              const isParmi = s.parmi > s.parma
              return (
                <div key={s.state} className={`rounded-lg p-2 text-center text-xs ${isParmi ? 'bg-[#1B3A2D]/10 text-[#1B3A2D]' : 'bg-[#E8A020]/15 text-[#8A5E08]'}`}>
                  <div className="font-bold">{s.state}</div>
                  <div className="text-[10px] mt-0.5 opacity-75">{isParmi ? `Parmi ${s.parmi}%` : `Parma ${s.parma}%`}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* AI Agent */}
        <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">AI research agent</p>
          </div>
          <div className="bg-stone-50 rounded-lg p-3 min-h-16 text-sm text-stone-600 leading-relaxed whitespace-pre-line">
            {agentText || <span className="text-stone-400 italic">The agent hasn&apos;t weighed in yet.</span>}
          </div>
          <button
            onClick={runAgent}
            disabled={agentRunning || agentDone}
            className="w-full border border-stone-200 rounded-lg py-2 text-sm text-stone-600 font-medium hover:bg-stone-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {agentDone ? 'Verdict delivered' : agentRunning ? 'Researching...' : 'Run the research agent'}
          </button>
        </div>

        <p className="text-center text-xs text-stone-300 pb-4">
          parmiorparma.au · Built with 🍺 in Australia
        </p>
      </div>
    </main>
  )
}
