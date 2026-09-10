'use client'

import { useState, useEffect, useRef } from 'react'

type Side = 'parmi' | 'parma' | null
type Step = 'vote' | 'email' | 'data' | 'done'

interface StateData {
  code: string
  name: string
  side: 'parmi' | 'parma' | 'split'
  pct: number
  majority: string
  flavour: string // personality line
}

// YouGov 2020 (n=1,055) + Arnott's 2020 (n=1,000). Parmi includes Parmy.
const STATES: StateData[] = [
  { code:'VIC', name:'Victoria',          side:'parma', pct:72, majority:'Parma', flavour:'Victoria remains firmly opposed to the national consensus.' },
  { code:'SA',  name:'South Australia',   side:'parmi', pct:82, majority:'Parmi', flavour:'South Australia leads the nation in linguistic correctness.' },
  { code:'QLD', name:'Queensland',        side:'parmi', pct:66, majority:'Parmi', flavour:'Queensland is decisive. As always.' },
  { code:'NSW', name:'New South Wales',   side:'parmi', pct:55, majority:'Parmi', flavour:'NSW leans Parmi but remains internally divided.' },
  { code:'WA',  name:'Western Australia', side:'parmi', pct:51, majority:'Parmi', flavour:'WA calls it Parmi. Narrowly. Stoically.' },
  { code:'TAS', name:'Tasmania',          side:'parmi', pct:55, majority:'Parmi', flavour:'Tasmania: estimated Parmi. Data pending further investigation.' },
  { code:'ACT', name:'ACT',              side:'parmi', pct:55, majority:'Parmi', flavour:'The national capital says Parmi. Make of that what you will.' },
  { code:'NT',  name:'Northern Territory',side:'split', pct:50, majority:'Neither', flavour:'The NT prefers the full name. A dignified position.' },
]

const VARIANTS = ['Classic', 'Mexican', 'Hawaiian', 'BBQ', 'Truffle', 'Other']
const VENUE_TYPES = ['Pub', 'RSL / Club', 'Gastropub', 'Sports bar']
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// Brand colours per spec
const C = {
  paper:  '#F3EBD8',
  ink:    '#171717',
  parmi:  '#285C45',
  parma:  '#C88A32',
  red:    '#A63D32',
  parmiLight: '#EAF3EE',
  parmaLight: '#FBF0DC',
}

export default function Home() {
  const [side, setSide] = useState<Side>(null)
  const [step, setStep] = useState<Step>('vote')
  const [voteId, setVoteId] = useState<string | null>(null)
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
  const [parmiPct, setParmiPct] = useState(55)
  const [totalVotes, setTotalVotes] = useState(29454)
  const [agentText, setAgentText] = useState('')
  const [agentLoading, setAgentLoading] = useState(false)
  const [agentDone, setAgentDone] = useState(false)
  const [hoveredState, setHoveredState] = useState<StateData | null>(null)
  const [verdictDate, setVerdictDate] = useState<string | null>(null)
  const tickerRef = useRef<HTMLDivElement>(null)

  const BASELINE_PARMI = 16183
  const BASELINE_PARMA = 13271

  useEffect(() => {
    fetch('/api/vote')
      .then(r => r.json())
      .then(d => {
        if (d.split) {
          const rp = d.split.find((s: {side:string,votes:number}) => s.side === 'parmi')?.votes ?? 0
          const ra = d.split.find((s: {side:string,votes:number}) => s.side === 'parma')?.votes ?? 0
          const tp = BASELINE_PARMI + rp
          const ta = BASELINE_PARMA + ra
          const total = tp + ta
          setParmiPct(Math.round((tp / total) * 100))
          setTotalVotes(total)
        }
      })
      .catch(() => { setParmiPct(55); setTotalVotes(29454) })
  }, [])

  function validate(field: string, value: string) {
    const e = { ...errors }
    if (field === 'email') {
      if (!value || !value.includes('@') || !value.includes('.')) e.email = 'Enter a valid email address.'
      else delete e.email
    }
    if (field === 'price') {
      const n = parseFloat(value)
      if (!value || isNaN(n) || n < 5 || n > 80) e.price = 'Price should be between $5 and $80.'
      else delete e.price
    }
    if (field === 'venue') {
      if (!value.trim()) e.venue = 'Pub name is required.'
      else delete e.venue
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function castVote(s: Side) {
    if (step !== 'vote') return
    setSide(s)
    setEntries(1)
    setTotalVotes(prev => {
      const newTotal = prev + 1
      const currentParmi = Math.round((parmiPct / 100) * prev)
      const newParmi = s === 'parmi' ? currentParmi + 1 : currentParmi
      setParmiPct(Math.round((newParmi / newTotal) * 100))
      return newTotal
    })
    setStep('email')
    try {
      const res = await fetch('/api/vote', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ side: s }) })
      const data = await res.json()
      if (data.voteId) setVoteId(data.voteId)
    } catch(err) { console.error('Vote failed:', err) }
  }

  async function submitEmail() {
    if (!validate('email', email)) return
    setEntries(2)
    setStep('data')
    try {
      await fetch('/api/submit', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ email, side, voteId }) })
    } catch(err) { console.error('Email failed:', err) }
  }

  async function submitData() {
    const vOk = validate('venue', venueName)
    const pOk = validate('price', price)
    if (!vOk || !pOk) return
    setEntries(prev => prev + 3)
    setStep('done')
    try {
      await fetch('/api/submit', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ voteId, email, side, venueName, suburb, pricePaid: price, isSpecial, dayOfWeek, variant, venueType, isMemberPrice: isMember }) })
    } catch(err) { console.error('Data submit failed:', err) }
  }

  async function consultExpert() {
    if (agentLoading || agentDone) return
    setAgentLoading(true)
    setAgentText('Consulting the expert...')
    try {
      const res = await fetch('/api/agent', { method:'GET' })
      const data = await res.json()
      if (data.verdict) {
        setAgentText(data.verdict)
        setAgentDone(true)
        if (data.updatedAt) {
          setVerdictDate(new Date(data.updatedAt).toLocaleDateString('en-AU', { day:'numeric', month:'long', year:'numeric' }))
        }
      }
    } catch { setAgentText('The expert was unavailable for comment. Try again later.') }
    finally { setAgentLoading(false) }
  }

  const parmaWidth = 100 - parmiPct
  const parmiVotes = Math.round((parmiPct / 100) * totalVotes)
  const parmaVotes = totalVotes - parmiVotes

  const Rule = () => (
    <div style={{ borderTop:`1px solid ${C.ink}`, margin:'0' }} />
  )

  const ThickRule = () => (
    <div style={{ borderTop:`3px solid ${C.ink}`, margin:'0' }} />
  )

  const FaultLine = () => (
    <div style={{ display:'flex', alignItems:'center', gap:'12px', margin:'1.5rem 0', color:C.ink, fontSize:'11px', fontFamily:'serif', letterSpacing:'0.04em' }}>
      <span style={{ fontWeight:700, color:C.parmi }}>PARMI</span>
      <div style={{ flex:1, borderTop:`1px dashed ${C.ink}`, position:'relative' }}>
        <span style={{ position:'absolute', top:'-9px', left:'50%', transform:'translateX(-50%)', background:C.paper, padding:'0 8px', fontSize:'9px', letterSpacing:'0.1em', whiteSpace:'nowrap', color:'#666' }}>THE GREAT AUSTRALIAN FAULT LINE</span>
      </div>
      <span style={{ fontWeight:700, color:C.parma }}>PARMA</span>
    </div>
  )

  return (
    <>
    <style>{`
      @keyframes ticker {
        0% { transform: translateX(0); }
        100% { transform: translateX(-100%); }
      }
    `}</style>
    <main style={{ background:C.paper, minHeight:'100vh', fontFamily:'Georgia, "Times New Roman", serif', color:C.ink }}>

      {/* ── MASTHEAD ── */}
      <header style={{ borderBottom:`3px solid ${C.ink}`, padding:'0' }}>
        <div style={{ borderBottom:`1px solid ${C.ink}`, padding:'6px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:'10px', letterSpacing:'0.12em', fontFamily:'Georgia, serif' }}>EST. 2026</span>
          <span style={{ fontSize:'10px', letterSpacing:'0.12em', fontFamily:'Georgia, serif' }}>parmiorparma.au</span>
          <span style={{ fontSize:'10px', letterSpacing:'0.12em', fontFamily:'Georgia, serif' }}>{new Date().toLocaleDateString('en-AU', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</span>
        </div>
        <div style={{ padding:'20px 24px 16px', textAlign:'center', borderBottom:`1px solid ${C.ink}` }}>
          <div style={{ fontSize:'10px', letterSpacing:'0.2em', marginBottom:'8px', textTransform:'uppercase' }}>The Australian Parmi Review</div>
          <h1 style={{ fontSize:'clamp(42px, 10vw, 80px)', fontWeight:900, lineHeight:1, margin:'0 0 8px', letterSpacing:'-0.02em', fontFamily:'Georgia, serif' }}>
            PARMI
            <span style={{ display:'block', fontSize:'0.45em', fontWeight:400, fontStyle:'italic', color:'#555', letterSpacing:'0.02em' }}>— or —</span>
            PARMA?
          </h1>
          <div style={{ fontSize:'11px', letterSpacing:'0.08em', color:'#555', textTransform:'uppercase', marginTop:'4px' }}>
            A national reckoning · {totalVotes.toLocaleString()} Australians have been consulted
          </div>
        </div>
        {/* Ticker */}
        <div style={{ background:C.ink, color:C.paper, padding:'5px 0', fontSize:'11px', letterSpacing:'0.06em', overflow:'hidden', whiteSpace:'nowrap' }}>
          <div style={{
            display:'inline-block',
            animation:'ticker 30s linear infinite',
            paddingLeft:'100%'
          }}>
            <span style={{ marginRight:'64px' }}>LATEST: {parmiPct}% of the nation says PARMI ·</span>
            <span style={{ marginRight:'64px' }}>VICTORIA DISSENTS: 72% say PARMA ·</span>
            <span style={{ marginRight:'64px' }}>NATIONAL AVERAGE PARMA: $30.08 (PubWatch 2026) ·</span>
            <span style={{ marginRight:'64px' }}>WEDNESDAY IS PARMA NIGHT ·</span>
            <span style={{ marginRight:'64px' }}>PARMI INCLUDES PHONETIC VARIANT PARMY ·</span>
            <span style={{ marginRight:'64px' }}>SOURCE: YOUGOV 2020 (N=1,055) ·</span>
          </div>
        </div>
      </header>

      <div style={{ maxWidth:'720px', margin:'0 auto', padding:'0 24px' }}>

        {/* ── LEAD STORY ── */}
        <section style={{ padding:'2rem 0 1.5rem', borderBottom:`1px solid ${C.ink}` }}>
          <div style={{ textAlign:'center', marginBottom:'1.5rem' }}>
            <div style={{ fontSize:'11px', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'8px', color:'#555' }}>The national count</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:'16px', alignItems:'center' }}>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:'clamp(48px,10vw,80px)', fontWeight:900, lineHeight:1, color:C.parmi }}>{parmiPct}%</div>
                <div style={{ fontSize:'13px', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:C.parmi }}>PARMI</div>
                <div style={{ fontSize:'12px', color:'#666', marginTop:'4px' }}>{parmiVotes.toLocaleString()} votes</div>
              </div>
              <div style={{ fontSize:'20px', color:'#999', fontStyle:'italic' }}>vs</div>
              <div style={{ textAlign:'left' }}>
                <div style={{ fontSize:'clamp(48px,10vw,80px)', fontWeight:900, lineHeight:1, color:C.parma }}>{parmaWidth}%</div>
                <div style={{ fontSize:'13px', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:C.parma }}>PARMA</div>
                <div style={{ fontSize:'12px', color:'#666', marginTop:'4px' }}>{parmaVotes.toLocaleString()} votes</div>
              </div>
            </div>
          </div>

          {/* Election-style tally bar */}
          <div style={{ height:'16px', display:'flex', border:`1px solid ${C.ink}`, overflow:'hidden', marginBottom:'6px' }}>
            <div style={{ background:C.parmi, width:`${parmiPct}%`, transition:'width 0.8s ease' }} />
            <div style={{ background:C.parma, width:`${parmaWidth}%`, transition:'width 0.8s ease' }} />
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'10px', letterSpacing:'0.06em', color:'#666' }}>
            <span>Source: YouGov 2020 (n=1,055) + parmiorparma.au platform votes</span>
            <span>Parmi includes phonetic variant Parmy</span>
          </div>

          <FaultLine />

          <p style={{ textAlign:'center', fontSize:'16px', lineHeight:1.6, color:'#333', fontStyle:'italic', margin:'0' }}>
            Victoria stands almost alone. The rest of the country isn&apos;t so sure.
          </p>
        </section>

        {/* ── CAST YOUR VOTE ── */}
        <section style={{ padding:'1.5rem 0', borderBottom:`1px solid ${C.ink}` }}>
          <div style={{ fontSize:'10px', letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:'1rem', color:'#555' }}>Cast your vote · The nation demands your position</div>

          {step === 'vote' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0', border:`2px solid ${C.ink}` }}>
              <button onClick={() => castVote('parmi')} style={{
                background:'transparent', border:'none', borderRight:`2px solid ${C.ink}`,
                padding:'2rem 1rem', cursor:'pointer', textAlign:'center',
                fontFamily:'Georgia, serif', transition:'all 0.15s'
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = C.parmi; (e.currentTarget as HTMLButtonElement).style.color = C.paper }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = C.ink }}>
                <div style={{ fontSize:'36px', fontWeight:900, letterSpacing:'-0.02em' }}>PARMI</div>
                <div style={{ fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', marginTop:'6px', color:'#666' }}>The nation</div>
              </button>
              <button onClick={() => castVote('parma')} style={{
                background:'transparent', border:'none',
                padding:'2rem 1rem', cursor:'pointer', textAlign:'center',
                fontFamily:'Georgia, serif', transition:'all 0.15s'
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = C.parma; (e.currentTarget as HTMLButtonElement).style.color = C.paper }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = C.ink }}>
                <div style={{ fontSize:'36px', fontWeight:900, letterSpacing:'-0.02em' }}>PARMA</div>
                <div style={{ fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', marginTop:'6px', color:'#666' }}>Team Victoria</div>
              </button>
            </div>
          )}

          {step === 'email' && (
            <div style={{ border:`1px solid ${C.ink}`, padding:'1.5rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'1rem' }}>
                <div style={{ fontSize:'13px', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase' }}>Confirm your entry — weekly draw</div>
                <div style={{ fontSize:'11px', background:C.parmi, color:C.paper, padding:'2px 10px', letterSpacing:'0.06em' }}>+1 ENTRY</div>
              </div>
              <p style={{ fontSize:'13px', color:'#555', margin:'0 0 1rem', lineHeight:1.5 }}>
                Enter your email to go in the Friday draw. Team Parmi or Parma merch every week.
              </p>
              <input type="email" value={email}
                onChange={e => { setEmail(e.target.value); validate('email', e.target.value) }}
                placeholder="you@email.com"
                style={{ width:'100%', boxSizing:'border-box', border:`1px solid ${C.ink}`, background:C.paper, padding:'8px 12px', fontSize:'14px', fontFamily:'Georgia, serif', outline:'none', marginBottom:'8px' }} />
              {errors.email && <p style={{ color:C.red, fontSize:'12px', margin:'0 0 8px' }}>{errors.email}</p>}
              <p style={{ fontSize:'10px', color:'#888', margin:'0 0 1rem', letterSpacing:'0.04em' }}>No correspondence entered into. Unsubscribe anytime.</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:'8px' }}>
                <button onClick={submitEmail} style={{ background:C.ink, color:C.paper, border:'none', padding:'10px', cursor:'pointer', fontSize:'13px', fontFamily:'Georgia, serif', letterSpacing:'0.06em', textTransform:'uppercase' }}>
                  Confirm entry
                </button>
                <button onClick={() => setStep('data')} style={{ background:'transparent', border:`1px solid ${C.ink}`, padding:'10px 16px', cursor:'pointer', fontSize:'11px', fontFamily:'Georgia, serif', color:'#666' }}>
                  Skip
                </button>
              </div>
            </div>
          )}

          {step === 'data' && (
            <div style={{ border:`1px solid ${C.ink}`, padding:'1.5rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:'1rem' }}>
                <div style={{ fontSize:'13px', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase' }}>Submit pub data — national price index</div>
                <div style={{ fontSize:'11px', background:C.parma, color:C.paper, padding:'2px 10px', letterSpacing:'0.06em' }}>+3 ENTRIES</div>
              </div>
              <p style={{ fontSize:'13px', color:'#555', margin:'0 0 1.25rem', lineHeight:1.5 }}>
                Help us build Australia&apos;s only independent parma price index. What did your pub charge?
              </p>

              {[
                { label:'Pub name', id:'venue', type:'text', val:venueName, set:(v:string)=>setVenueName(v), ph:'The Local Hotel', field:'venue' },
                { label:'Suburb', id:'suburb', type:'text', val:suburb, set:(v:string)=>setSuburb(v), ph:'Fitzroy, VIC', field:'' },
              ].map(f => (
                <div key={f.id} style={{ marginBottom:'10px' }}>
                  <label style={{ fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', display:'block', marginBottom:'4px', color:'#555' }}>{f.label}</label>
                  <input type={f.type} value={f.val}
                    onChange={e => { f.set(e.target.value); if (f.field) validate(f.field, e.target.value) }}
                    placeholder={f.ph}
                    style={{ width:'100%', boxSizing:'border-box', border:`1px solid ${C.ink}`, background:C.paper, padding:'7px 10px', fontSize:'13px', fontFamily:'Georgia, serif', outline:'none' }} />
                  {f.field && errors[f.field] && <p style={{ color:C.red, fontSize:'11px', margin:'3px 0 0' }}>{errors[f.field]}</p>}
                </div>
              ))}

              <div style={{ marginBottom:'10px' }}>
                <label style={{ fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', display:'block', marginBottom:'4px', color:'#555' }}>Price paid</label>
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:'10px', top:'7px', fontSize:'13px', color:'#666' }}>$</span>
                  <input type="number" value={price} min="5" max="80"
                    onChange={e => { setPrice(e.target.value); validate('price', e.target.value) }}
                    placeholder="24"
                    style={{ width:'100%', boxSizing:'border-box', border:`1px solid ${C.ink}`, background:C.paper, padding:'7px 10px 7px 24px', fontSize:'13px', fontFamily:'Georgia, serif', outline:'none' }} />
                </div>
                {errors.price && <p style={{ color:C.red, fontSize:'11px', margin:'3px 0 0' }}>{errors.price}</p>}
              </div>

              {/* Pills for special, variant, venue type, day, member */}
              {[
                { label:'Special deal?', opts:['Yes — parma night','No — regular menu'], val:isSpecial, set:(v:boolean)=>setIsSpecial(v), boolMap:{'Yes — parma night':true,'No — regular menu':false} as Record<string,boolean> },
              ].map((f, i) => (
                <div key={i} style={{ marginBottom:'10px' }}>
                  <label style={{ fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', display:'block', marginBottom:'6px', color:'#555' }}>{f.label}</label>
                  <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                    {f.opts.map(o => (
                      <button key={o} onClick={() => f.set(f.boolMap[o])}
                        style={{ padding:'4px 12px', border:`1px solid ${C.ink}`, background: f.val === f.boolMap[o] ? C.ink : 'transparent', color: f.val === f.boolMap[o] ? C.paper : C.ink, fontSize:'12px', fontFamily:'Georgia, serif', cursor:'pointer' }}>
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div style={{ marginBottom:'10px' }}>
                <label style={{ fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', display:'block', marginBottom:'6px', color:'#555' }}>Day of week</label>
                <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
                  {DAYS.map(d => (
                    <button key={d} onClick={() => setDayOfWeek(d)}
                      style={{ padding:'4px 8px', border:`1px solid ${C.ink}`, background: dayOfWeek === d ? C.ink : 'transparent', color: dayOfWeek === d ? C.paper : C.ink, fontSize:'11px', fontFamily:'Georgia, serif', cursor:'pointer' }}>
                      {d.slice(0,3)}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom:'10px' }}>
                <label style={{ fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', display:'block', marginBottom:'6px', color:'#555' }}>Variant ordered</label>
                <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
                  {VARIANTS.map(v => (
                    <button key={v} onClick={() => setVariant(v)}
                      style={{ padding:'4px 10px', border:`1px solid ${C.ink}`, background: variant === v ? C.ink : 'transparent', color: variant === v ? C.paper : C.ink, fontSize:'11px', fontFamily:'Georgia, serif', cursor:'pointer' }}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom:'10px' }}>
                <label style={{ fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', display:'block', marginBottom:'6px', color:'#555' }}>Venue type</label>
                <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
                  {VENUE_TYPES.map(v => (
                    <button key={v} onClick={() => setVenueType(v)}
                      style={{ padding:'4px 10px', border:`1px solid ${C.ink}`, background: venueType === v ? C.ink : 'transparent', color: venueType === v ? C.paper : C.ink, fontSize:'11px', fontFamily:'Georgia, serif', cursor:'pointer' }}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom:'1.25rem' }}>
                <label style={{ fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', display:'block', marginBottom:'6px', color:'#555' }}>Member price?</label>
                <div style={{ display:'flex', gap:'6px' }}>
                  {[{label:'Yes — member rate', val:true},{label:'No — walk-in price', val:false}].map(o => (
                    <button key={String(o.val)} onClick={() => setIsMember(o.val)}
                      style={{ flex:1, padding:'5px 8px', border:`1px solid ${C.ink}`, background: isMember === o.val ? C.ink : 'transparent', color: isMember === o.val ? C.paper : C.ink, fontSize:'11px', fontFamily:'Georgia, serif', cursor:'pointer' }}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:'8px' }}>
                <button onClick={submitData} style={{ background:C.ink, color:C.paper, border:'none', padding:'10px', cursor:'pointer', fontSize:'13px', fontFamily:'Georgia, serif', letterSpacing:'0.06em', textTransform:'uppercase' }}>
                  Submit — earn 3× entries
                </button>
                <button onClick={() => setStep('done')} style={{ background:'transparent', border:`1px solid ${C.ink}`, padding:'10px 16px', cursor:'pointer', fontSize:'11px', fontFamily:'Georgia, serif', color:'#666' }}>
                  Skip
                </button>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div style={{ border:`2px solid ${C.ink}`, padding:'1.5rem', textAlign:'center' }}>
              <div style={{ fontSize:'11px', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:'8px', color:'#555' }}>Your position has been recorded</div>
              <div style={{ fontSize:'32px', fontWeight:900, marginBottom:'4px' }}>
                Team {side === 'parmi' ? 'Parmi' : 'Parma'}
              </div>
              <div style={{ fontSize:'13px', color:'#555', marginBottom:'1.25rem' }}>
                You are in the draw with {entries} {entries === 1 ? 'entry' : 'entries'}. Drawn every Friday.
              </div>
              <FaultLine />
              {/* Merch CTA */}
              <div style={{ border:`1px solid ${C.ink}`, padding:'1rem', display:'flex', justifyContent:'space-between', alignItems:'center', background: side === 'parmi' ? C.parmiLight : C.parmaLight }}>
                <div style={{ textAlign:'left' }}>
                  <div style={{ fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', color:'#666' }}>Rep your side</div>
                  <div style={{ fontSize:'20px', fontWeight:900, color: side === 'parmi' ? C.parmi : C.parma }}>Team {side === 'parmi' ? 'Parmi' : 'Parma'}</div>
                  <div style={{ fontSize:'11px', color:'#666', marginTop:'2px' }}>Tee · Hoodie · Stubby holder</div>
                </div>
                <button style={{ background:C.ink, color:C.paper, border:'none', padding:'10px 20px', cursor:'pointer', fontSize:'12px', fontFamily:'Georgia, serif', letterSpacing:'0.08em', textTransform:'uppercase' }}>
                  Shop ↗
                </button>
              </div>
            </div>
          )}
        </section>

        <FaultLine />

        {/* ── STATE BY STATE ── */}
        <section style={{ padding:'0 0 1.5rem', borderBottom:`1px solid ${C.ink}` }}>
          <div style={{ fontSize:'10px', letterSpacing:'0.14em', textTransform:'uppercase', marginBottom:'1rem', color:'#555' }}>The national divide — state by state</div>

          {/* Map placeholder — replace img src with generated map */}
          <div style={{ marginBottom:'1rem' }}> 
            <img src="/australia-map.png" alt="Map of Australia showing Parmi vs Parma distribution by state — Victoria ochre for Parma, all other states green for Parmi" style={{ width:'100%', display:'block' }} /> 
          </div>

          {/* State rows — electoral style */}
          <div style={{ border:`1px solid ${C.ink}` }}>
            {STATES.map((s, i) => (
              <div key={s.code}
                style={{ display:'grid', gridTemplateColumns:'60px 1fr auto', gap:'0', borderBottom: i < STATES.length - 1 ? `1px solid ${C.ink}` : 'none', cursor:'pointer', transition:'background 0.1s' }}
                onMouseEnter={() => setHoveredState(s)}
                onMouseLeave={() => setHoveredState(null)}>
                <div style={{ padding:'10px 12px', borderRight:`1px solid ${C.ink}`, fontWeight:700, fontSize:'13px', letterSpacing:'0.04em', background: s.side === 'parma' ? C.parmaLight : s.side === 'split' ? '#f5f5f5' : C.parmiLight }}>
                  {s.code}
                </div>
                <div style={{ padding:'10px 12px', borderRight:`1px solid ${C.ink}` }}>
                  <div style={{ height:'8px', background:'#e0d8c8', display:'flex', overflow:'hidden' }}>
                    <div style={{ background: s.side === 'parma' ? C.parma : C.parmi, width:`${s.side === 'parma' ? s.pct : (s.side === 'split' ? 50 : s.pct)}%`, transition:'width 0.4s' }} />
                    <div style={{ background: s.side === 'parma' ? C.parmi : C.parma, flex:1 }} />
                  </div>
                </div>
                <div style={{ padding:'10px 12px', fontSize:'12px', fontWeight:700, letterSpacing:'0.04em', color: s.side === 'parma' ? C.parma : s.side === 'split' ? '#888' : C.parmi, minWidth:'110px', textAlign:'right' }}>
                  {s.majority} {s.pct}%
                </div>
              </div>
            ))}
          </div>

          {/* Hovered state personality line */}
          {hoveredState && (
            <div style={{ border:`1px solid ${C.ink}`, borderTop:'none', padding:'10px 12px', background: hoveredState.side === 'parma' ? C.parmaLight : C.parmiLight }}>
              <span style={{ fontSize:'12px', fontStyle:'italic', color:'#555' }}>{hoveredState.name}: </span>
              <span style={{ fontSize:'12px', color:C.ink }}>{hoveredState.flavour}</span>
            </div>
          )}

          <div style={{ fontSize:'10px', color:'#888', marginTop:'8px', letterSpacing:'0.04em' }}>
            Sources: YouGov 2020 (n=1,055) · Arnott&apos;s 2020 (n=1,000) · TAS/ACT estimated
          </div>
        </section>

        <FaultLine />

        {/* ── EXPERT SECTION ── */}
        <section style={{ padding:'0 0 2rem' }}>
          <ThickRule />
          <div style={{ padding:'1rem 0 0.5rem', display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
            <div style={{ fontSize:'10px', letterSpacing:'0.14em', textTransform:'uppercase', color:'#555' }}>Special report</div>
            {verdictDate && <div style={{ fontSize:'10px', color:'#888', letterSpacing:'0.04em' }}>Verdict issued: {verdictDate}</div>}
          </div>
          <Rule />
          <div style={{ padding:'1rem 0' }}>
            <div style={{ fontSize:'22px', fontWeight:900, marginBottom:'4px', letterSpacing:'-0.01em' }}>THE EXPERT HAS BEEN CONSULTED</div>
            <div style={{ fontSize:'13px', fontStyle:'italic', color:'#555', marginBottom:'1.25rem' }}>
              Can artificial intelligence settle what 40 years of pub arguments could not?
            </div>

            {!agentDone && !agentLoading && (
              <div style={{ border:`1px solid ${C.ink}`, padding:'1.25rem', textAlign:'center' }}>
                <div style={{ fontSize:'14px', fontStyle:'italic', color:'#666', marginBottom:'1rem' }}>
                  VERDICT PENDING
                </div>
                <button onClick={consultExpert}
                  style={{ background:C.ink, color:C.paper, border:'none', padding:'10px 32px', cursor:'pointer', fontSize:'13px', fontFamily:'Georgia, serif', letterSpacing:'0.1em', textTransform:'uppercase' }}>
                  Consult the expert
                </button>
              </div>
            )}

            {agentLoading && (
              <div style={{ border:`1px solid ${C.ink}`, padding:'1.25rem' }}>
                <div style={{ fontSize:'12px', letterSpacing:'0.06em', color:'#888', textTransform:'uppercase' }}>Consulting the expert...</div>
              </div>
            )}

            {agentDone && agentText && (
              <div style={{ border:`2px solid ${C.ink}`, padding:'1.5rem', position:'relative' }}>
                <div style={{ position:'absolute', top:'-12px', left:'50%', transform:'translateX(-50%)', background:C.paper, padding:'0 12px' }}>
                  <div style={{ fontSize:'10px', letterSpacing:'0.15em', textTransform:'uppercase', fontWeight:700, border:`1px solid ${C.ink}`, padding:'2px 10px', background: C.parmi, color:C.paper }}>
                    OFFICIAL AI VERDICT
                  </div>
                </div>
                <div style={{ fontSize:'13px', lineHeight:1.8, color:C.ink, whiteSpace:'pre-line', marginTop:'8px' }}>
                  {agentText.replace(/#{1,3} /g,'').replace(/\*\*/g,'')}
                </div>
                {verdictDate && (
                  <div style={{ borderTop:`1px solid ${C.ink}`, marginTop:'1rem', paddingTop:'0.75rem', fontSize:'10px', color:'#888', letterSpacing:'0.06em', display:'flex', justifyContent:'space-between' }}>
                    <span>Updated weekly by AI research agent</span>
                    <span>Last issued: {verdictDate}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer style={{ borderTop:`3px solid ${C.ink}`, padding:'1.5rem 0', marginTop:'0' }}>
          <FaultLine />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'1rem', fontSize:'11px', color:'#666', textAlign:'center', marginTop:'1rem' }}>
            <div>
              <div style={{ fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:C.ink, marginBottom:'4px' }}>Sources</div>
              <div>YouGov 2020 (n=1,055)</div>
              <div>Arnott&apos;s 2020 (n=1,000)</div>
              <div>PubWatch 2026 (7,611 venues)</div>
            </div>
            <div>
              <div style={{ fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:C.ink, marginBottom:'4px' }}>The Australian Parmi Review</div>
              <div>Est. 2026</div>
              <div>parmiorparma.au</div>
              <div>hello@parmiorparma.au</div>
            </div>
            <div>
              <div style={{ fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:C.ink, marginBottom:'4px' }}>Methodology</div>
              <div>Parmi includes Parmy</div>
              <div>Platform votes + verified baseline</div>
              <div>AI verdict updated weekly</div>
            </div>
          </div>
          <div style={{ textAlign:'center', marginTop:'1.5rem', fontSize:'10px', color:'#aaa', letterSpacing:'0.06em' }}>
            All data used with appropriate acknowledgement. No parmas were harmed in the making of this website.
          </div>
        </footer>
      </div>
    </main>
    </>
  )
}
