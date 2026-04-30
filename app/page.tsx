'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import ParticleWave from './components/ParticleWave'

// ─── TYPES ────────────────────────────────
interface Appointment { id: string; name: string; phone: string; email: string; service: string; date: string; time: string; note: string; status: string }

// ─── CONSTANTS ────────────────────────────
const RADNO: Record<number,{disp:string;od:string;do:string}|null> = {
  1:{disp:'9:00 – 20:00',od:'09:00',do:'19:30'},
  2:{disp:'9:00 – 20:00',od:'09:00',do:'19:30'},
  3:{disp:'9:00 – 20:00',od:'09:00',do:'19:30'},
  4:{disp:'9:00 – 20:00',od:'09:00',do:'19:30'},
  5:{disp:'9:00 – 20:00',od:'09:00',do:'19:30'},
  6:{disp:'9:00 – 16:00',od:'09:00',do:'15:30'},
  0:null,
}
const DAY_NAMES = ['Nedjelja','Ponedjeljak','Utorak','Srijeda','Četvrtak','Petak','Subota']
const MONTH_NAMES = ['Siječanj','Veljača','Ožujak','Travanj','Svibanj','Lipanj','Srpanj','Kolovoz','Rujan','Listopad','Studeni','Prosinac']

const SERVICES = [
  { label:'Usluge', title:'Oblikuj', img:'/photos/bob-highlights.jpg', desc:'Od modernih šišanja do bezvremenih klasika — svaki rez je statement koji odražava tebe. Ženske i muške frizure.' },
  { label:'Usluge', title:'Osvjetli', img:'/photos/red-waves.jpg', desc:'Vibrantna boja, nježni pramenovi, balayage ili ombre — tvoja vizija, naša strast.' },
  { label:'Usluge', title:'Unaprijedi', img:'/photos/straight-brown.jpg', desc:'Keratin tretmani, brazilsko ravnanje, regeneracija — svilenkasta kosa koja traje tjednima.' },
  { label:'Usluge', title:'Uzdigni', img:'/photos/dark-waves-long.jpg', desc:'Solarij, svečane frizure, vjenčanja — za sve posebne trenutke, ljepše nego ikad.' },
]

const GALLERY = [
  { img:'/photos/red-waves.jpg', title:'Vibrantna Crvena', price:'Boja kose' },
  { img:'/photos/bob-highlights.jpg', title:'Bob s Pramenovima', price:'Šišanje' },
  { img:'/photos/blonde-waves.jpg', title:'Plavi Valovi', price:'Boja & valovi' },
  { img:'/photos/dark-waves-long.jpg', title:'Dugačka Tamna', price:'Valovi' },
  { img:'/photos/dark-black-waves.jpg', title:'Crna & Valovita', price:'Styling' },
  { img:'/photos/straight-blonde.jpg', title:'Ravna Plava', price:'Keratin' },
  { img:'/photos/straight-brown.jpg', title:'Smeđi Keratin', price:'Tretman' },
  { img:'/photos/chocolate-waves.jpg', title:'Čokoladni Valovi', price:'Boja & valovi' },
]

const TESTI = [
  { img:'/photos/dark-waves-long.jpg', quote:'Kod Anite se uvijek osjećam kao kod kuće. Frizura savršena, ozračje toplo — jedino mjesto gdje mi je stvarno drago doći!', author:'Maja K.' },
  { img:'/photos/blonde-waves.jpg', quote:'Balayage koji sam dobila je bio bolji nego na Pinterestu. Anita je pravi umjetnik — zna točno što ti odgovara.', author:'Petra L.' },
  { img:'/photos/bob-highlights.jpg', quote:'Solarij je bonus koji sam otkrila nedavno, a ostala sam vjerna klijentici zbog izvrsnog šišanja i boje!', author:'Sandra M.' },
]

function getSlotsForDay(dow: number): string[] {
  const r = RADNO[dow]; if (!r) return []
  const all: string[] = []
  let h = +r.od.split(':')[0], m = +r.od.split(':')[1]
  const [eh, em] = r.do.split(':').map(Number)
  while (h < eh || (h === eh && m <= em)) {
    all.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
    m += 30; if (m >= 60) { m -= 60; h++ }
  }
  return all
}

// ─── MAIN ─────────────────────────────────
export default function FensiPage() {
  const loaderRef = useRef<HTMLDivElement>(null)
  const loaderWordRef = useRef<HTMLSpanElement>(null)
  const loaderSubRef = useRef<HTMLDivElement>(null)
  const loaderBarRef = useRef<HTMLDivElement>(null)
  const curDotRef = useRef<HTMLDivElement>(null)
  const curRingRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const galRef = useRef<HTMLDivElement>(null)

  // Hero
  const [heroLoaded, setHeroLoaded] = useState(false)
  const [heroPhotoIdx, setHeroPhotoIdx] = useState(0)
  // Services
  const [srvIdx, setSrvIdx] = useState(0)
  // Testimonials
  const [testiIdx, setTestiIdx] = useState(0)
  // Nav
  const [navSolid, setNavSolid] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  // Calendar
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [selDate, setSelDate] = useState<string|null>(null)
  const [selTime, setSelTime] = useState<string|null>(null)
  const [takenSlots, setTakenSlots] = useState<Record<string,string[]>>({})
  const [slots, setSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  // Form
  const [form, setForm] = useState({name:'',phone:'',email:'',service:'',note:''})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitMsg, setSubmitMsg] = useState('')
  // Admin
  const [adminOpen, setAdminOpen] = useState(false)
  const [adminPass, setAdminPass] = useState('')
  const [adminKey, setAdminKey] = useState('')
  const [adminAppts, setAdminAppts] = useState<Appointment[]>([])
  const [adminTab, setAdminTab] = useState('today')
  const [adminErr, setAdminErr] = useState(false)

  // ── GSAP + LENIS ──────────────────────
  useEffect(() => {
    let lenis: any
    const init = async () => {
      const { gsap } = await import('gsap')
      const { ScrollTrigger } = await import('gsap/ScrollTrigger')
      const { default: Lenis } = await import('@studio-freight/lenis')
      gsap.registerPlugin(ScrollTrigger)

      // LOADER
      const tl = gsap.timeline({
        onComplete: () => {
          gsap.to(loaderRef.current, {
            yPercent: -100, duration: .8, ease: 'power3.inOut',
            onComplete: () => { if(loaderRef.current) loaderRef.current.style.display='none'; setHeroLoaded(true); const t=setInterval(()=>setHeroPhotoIdx(i=>(i+1)%3),4500); return ()=>clearInterval(t) }
          })
          initAnims(gsap, ScrollTrigger)
        }
      })
      tl.to(loaderBarRef.current, { width:'100%', duration:1.1, ease:'power2.inOut' })
        .to(loaderWordRef.current, { y:0, duration:.65, ease:'power3.out' }, '-=.5')
        .to(loaderSubRef.current, { opacity:1, duration:.5 }, '-=.3')
        .to({}, { duration:.7 })

      // LENIS
      lenis = new Lenis({ lerp: 0.07, wheelMultiplier: 0.85 })
      lenis.on('scroll', ScrollTrigger.update)
      gsap.ticker.add((t: number) => lenis.raf(t*1000))
      gsap.ticker.lagSmoothing(0)
      lenis.on('scroll', ({ progress }: { progress:number }) => {
        if (progressRef.current) progressRef.current.style.width = (progress*100)+'%'
        setNavSolid(window.scrollY > 60)
      })
    }

    const initAnims = (gsap: any, ScrollTrigger: any) => {
      // Scroll reveals
      document.querySelectorAll('[data-r]').forEach(el => {
        const d = el.getAttribute('data-r')
        gsap.fromTo(el,
          { opacity:0, y:d==='up'?55:0, x:d==='left'?-45:d==='right'?45:0 },
          { opacity:1, y:0, x:0, duration:.9, ease:'power3.out', delay:+(el.getAttribute('data-d')||0)*.12,
            scrollTrigger:{ trigger:el, start:'top 88%' } }
        )
      })

      // About image clip reveal
      document.querySelectorAll('[data-clip]').forEach(el => {
        gsap.fromTo(el,
          { clipPath:'inset(0 100% 0 0)' },
          { clipPath:'inset(0 0% 0 0)', duration:1.1, ease:'power3.inOut',
            scrollTrigger:{ trigger:el, start:'top 85%' } }
        )
      })

      // Gallery drag
      const galEl = galRef.current
      if (galEl) {
        let down=false, sx=0, sl=0, vel=0, lx=0, raf=0
        galEl.addEventListener('mousedown', e=>{ down=true; galEl.style.cursor='grabbing'; sx=e.pageX; sl=galEl.scrollLeft; vel=0; cancelAnimationFrame(raf) })
        document.addEventListener('mouseup', ()=>{
          if(!down)return; down=false; galEl.style.cursor='grab'
          const decay=()=>{ galEl.scrollLeft+=vel; vel*=.9; if(Math.abs(vel)>.5)raf=requestAnimationFrame(decay) }
          decay()
        })
        galEl.addEventListener('mousemove', e=>{ if(!down)return; e.preventDefault(); galEl.scrollLeft=sl-(e.pageX-sx); vel=lx-e.pageX; lx=e.pageX })
      }

      // Magnetic book buttons
      document.querySelectorAll('.book-btn').forEach(el => {
        const btn = el as HTMLElement
        btn.addEventListener('mousemove', e => {
          const r = btn.getBoundingClientRect()
          const x = e.clientX-r.left-r.width/2, y = e.clientY-r.top-r.height/2
          gsap.to(btn, { x:x*.2, y:y*.2, duration:.4, ease:'power2.out' })
        })
        btn.addEventListener('mouseleave', () => gsap.to(btn, { x:0, y:0, duration:.5, ease:'elastic.out(1,.5)' }))
      })
    }

    init()
    return () => { lenis?.destroy() }
  }, [])

  // Custom cursor
  useEffect(() => {
    let cx=0,cy=0,rx=0,ry=0,raf=0
    const dot=curDotRef.current, ring=curRingRef.current
    const mv=(e:MouseEvent)=>{ cx=e.clientX; cy=e.clientY }
    const lerp=(a:number,b:number,n:number)=>a+(b-a)*n
    const run=()=>{ if(dot){dot.style.left=cx+'px';dot.style.top=cy+'px'};rx=lerp(rx,cx,.1);ry=lerp(ry,cy,.1);if(ring){ring.style.left=rx+'px';ring.style.top=ry+'px'};raf=requestAnimationFrame(run) }
    const enter=()=>document.body.classList.add('cur-hover')
    const leave=()=>document.body.classList.remove('cur-hover')
    document.addEventListener('mousemove',mv)
    document.querySelectorAll('a,button,.gal-item,.book-btn,.srv-nav').forEach(el=>{el.addEventListener('mouseenter',enter);el.addEventListener('mouseleave',leave)})
    run()
    return()=>{ document.removeEventListener('mousemove',mv); cancelAnimationFrame(raf) }
  },[])

  // Testi auto-rotate
  useEffect(()=>{
    const t=setInterval(()=>setTestiIdx(i=>(i+1)%TESTI.length),7000)
    return()=>clearInterval(t)
  },[])

  // Service slide out handler
  const goPrev = () => setSrvIdx(i => (i-1+SERVICES.length)%SERVICES.length)
  const goNext = () => setSrvIdx(i => (i+1)%SERVICES.length)

  // Calendar
  const getSlots = useCallback(async(d:string)=>{
    if(takenSlots[d]!==undefined) return takenSlots[d]
    try{const r=await fetch(`/api/appointments?view=slots&date=${d}`);const data=await r.json();const s=data.slots||[];setTakenSlots(p=>({...p,[d]:s}));return s}catch{return[]}
  },[takenSlots])

  const handleSelectDate = async(ds:string)=>{
    setSelDate(ds);setSelTime(null);setSlotsLoading(true)
    const[y,m,d]=ds.split('-').map(Number);const dw=new Date(y,m-1,d).getDay()
    if(!RADNO[dw]){setSlots([]);setSlotsLoading(false);return}
    const taken=await getSlots(ds)
    const now=new Date();const todStr=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
    const isToday=ds===todStr;const nowM=now.getHours()*60+now.getMinutes()+30
    const dayS=getSlotsForDay(dw)
    const avail=isToday?dayS.filter(s=>{const[sh,sm]=s.split(':').map(Number);return sh*60+sm>nowM}):dayS
    setSlots(avail.map(s=>taken.includes(s)?`taken:${s}`:s));setSlotsLoading(false)
  }

  const calDays=()=>{
    const first=new Date(calYear,calMonth,1);const startDow=(first.getDay()+6)%7
    const total=new Date(calYear,calMonth+1,0).getDate();const today=new Date()
    const days=[]
    for(let i=0;i<startDow;i++) days.push({empty:true,d:0,ds:'',past:false,isToday:false,closed:false,selected:false})
    for(let d=1;d<=total;d++){
      const dt=new Date(calYear,calMonth,d)
      const past=dt<new Date(today.getFullYear(),today.getMonth(),today.getDate())
      const isT=dt.toDateString()===today.toDateString()
      const ds=`${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
      const dw=dt.getDay()
      days.push({empty:false,d,ds,past,isToday:isT,closed:!RADNO[dw],selected:ds===selDate})
    }
    return days
  }

  const submitBooking=async()=>{
    if(!form.name||!form.phone||!form.service)return alert('Ispunite ime, telefon i uslugu.')
    if(!selDate||!selTime)return alert('Odaberite datum i termin.')
    setSubmitting(true)
    try{
      const r=await fetch('/api/appointments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,date:selDate,time:selTime})})
      const data=await r.json();if(!r.ok)throw new Error(data.error)
      setTakenSlots(p=>({...p,[selDate]:[...(p[selDate]||[]),selTime]}))
      const[y,m,d]=selDate.split('-').map(Number);const lbl=new Date(y,m-1,d).toLocaleDateString('hr-HR',{weekday:'long',day:'numeric',month:'long'})
      setSubmitMsg(`${form.name}, vidimo se ${lbl} u ${selTime}. ✦`);setSubmitted(true)
    }catch(e:any){alert(e.message)};setSubmitting(false)
  }

  const adminAuth=async()=>{
    setAdminErr(false)
    try{const r=await fetch('/api/appointments',{headers:{'x-admin-key':adminPass}});if(!r.ok)throw new Error();const data=await r.json();setAdminAppts(data.appointments||[]);setAdminKey(adminPass)}catch{setAdminErr(true)}
  }
  const confirmAppt=async(id:string)=>{
    await fetch(`/api/appointments?id=${id}`,{method:'PATCH',headers:{'x-admin-key':adminKey}})
    setAdminAppts(p=>p.map(a=>a.id===id?{...a,status:'confirmed'}:a))
  }
  const deleteAppt=async(id:string,date:string,time:string)=>{
    if(!confirm(`Otkazati ${date} u ${time}?`))return
    await fetch(`/api/appointments?id=${id}`,{method:'DELETE',headers:{'x-admin-key':adminKey}})
    setAdminAppts(p=>p.filter(a=>a.id!==id))
  }

  const todayStr=new Date().toISOString().split('T')[0]
  const filteredAppts=adminTab==='pending'?adminAppts.filter(a=>a.status==='pending'):adminTab==='today'?adminAppts.filter(a=>a.date===todayStr):adminTab==='upcoming'?adminAppts.filter(a=>a.date>=todayStr).slice(0,30):adminAppts
  const pendingCount=adminAppts.filter(a=>a.status==='pending').length

  // Typography helpers
  const J = (size: string, w=600, extra='') => `font-family:'Josefin Sans',sans-serif;font-size:${size};font-weight:${w};text-transform:uppercase;letter-spacing:0;${extra}`
  const I = (size: string, extra='') => `font-family:'Inter',sans-serif;font-size:${size};${extra}`

  return (
    <>
      {/* Custom cursor */}
      <div ref={curDotRef} className="cursor-dot" />
      <div ref={curRingRef} className="cursor-ring" />
      <div ref={progressRef} id="progress" />

      {/* ══ LOADER ══════════════════════════════ */}
      <div ref={loaderRef} className="loader">
        <div className="loader-word">
          <span ref={loaderWordRef} className="loader-word-inner">Beauty Mess</span>
        </div>
        <div ref={loaderSubRef} className="loader-sub">frizerski salon · zagreb</div>
        <div ref={loaderBarRef} className="loader-bar" />
      </div>



      {/* ══ HERO — identical to SR template ════ */}
      <section style={{position:'relative',width:'100%',height:'100dvh',minHeight:'640px',overflow:'hidden',background:'var(--plum)'}}>

        {/* woman-hero.png — exact template positioning:
            width: 961.95px in 1254px = 76.7%, left: 146px = 11.6%
            Full height, centered cover, no filter (PNG preserves look) */}
        <div style={{
          position:'absolute',
          top:0, bottom:0,
          left:'11.6%',         /* template: 146px / 1254px */
          right:0,              /* extends to right edge */
          zIndex:0,
        }}>
          <Image
            src="/photos/woman-hero.png"
            alt="Fensi Salon"
            fill
            style={{objectFit:'cover', objectPosition:'50% 50%'}}
            priority
            sizes="88vw"
          />
        </div>

        {/* GRADIENTS — template exact:
            - Bottom: transparent→solid (template: 297px of 891px ≈ 33% from bottom)
            - Left 33%: solid→transparent (matches template sr7-shp left overlay) */}
        <div style={{position:'absolute',bottom:0,left:0,right:0,height:'33%',zIndex:1,
          background:'linear-gradient(rgba(21,2,24,0) 0%, rgba(21,2,24,1) 100%)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:0,left:0,right:0,height:'33%',zIndex:1,
          background:'linear-gradient(rgba(21,2,24,0) 0%, rgba(21,2,24,1) 100%)',pointerEvents:'none'}}/>

        {/* PARTICLE WAVE — SR7 tp-particlewave recreation, z-index:2 like template */}
        <ParticleWave />

        {/* FIXED NAV — template: logo left, two-col links right */}
        <div style={{
          position:'fixed',top:0,left:0,right:0,zIndex:200,
          display:'flex',justifyContent:'space-between',alignItems:'flex-start',
          padding: navSolid ? '1rem 5%' : '2.2rem 5%',
          background: navSolid ? 'rgba(21,2,24,.95)' : 'transparent',
          backdropFilter: navSolid ? 'blur(20px)' : 'none',
          borderBottom: navSolid ? '1px solid rgba(239,215,202,.07)' : 'none',
          transition:'all .45s ease',
        }}>
          {/* Logo */}
          <a href="#" style={{fontFamily:"'Josefin Sans'",fontSize:'1.25rem',fontWeight:600,textTransform:'uppercase',letterSpacing:'3px',color:'var(--cream)',textDecoration:'none'}}>Beauty Mess</a>
          {/* Desktop: two-col vertical nav (exact template) */}
          <div className="hidden md:flex" style={{gap:'2.5rem',alignItems:'flex-start'}}>
            <div style={{display:'flex',flexDirection:'column',gap:0}}>
              {[['o salonu','#osalonu'],['usluge','#usluge'],['rezervacija','#rezervacija']].map(([l,h])=>(
                <a key={l} href={h} style={{fontFamily:"'Josefin Sans'",fontSize:'.68rem',fontWeight:600,textTransform:'uppercase',letterSpacing:'1px',color:'rgba(239,215,202,.55)',lineHeight:'2.2',textDecoration:'none',transition:'color .2s'}}
                  onMouseEnter={e=>(e.target as HTMLElement).style.color='var(--cream)'}
                  onMouseLeave={e=>(e.target as HTMLElement).style.color='rgba(239,215,202,.55)'}>{l}</a>
              ))}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:0}}>
              {[['galerija','#galerija'],['recenzije','#testimonials'],['kontakt','#kontakt']].map(([l,h])=>(
                <a key={l} href={h} style={{fontFamily:"'Josefin Sans'",fontSize:'.68rem',fontWeight:600,textTransform:'uppercase',letterSpacing:'1px',color:'rgba(239,215,202,.55)',lineHeight:'2.2',textDecoration:'none',transition:'color .2s'}}
                  onMouseEnter={e=>(e.target as HTMLElement).style.color='var(--cream)'}
                  onMouseLeave={e=>(e.target as HTMLElement).style.color='rgba(239,215,202,.55)'}>{l}</a>
              ))}
            </div>
          </div>
          {/* Mobile burger */}
          <button className="md:hidden" style={{background:'none',border:'none',cursor:'pointer',display:'flex',flexDirection:'column',gap:'5px',padding:'.3rem'}} onClick={()=>setDrawerOpen(o=>!o)}>
            <span style={{display:'block',width:'22px',height:'1px',background:'rgba(239,215,202,.8)',transition:'all .3s',transform:drawerOpen?'translateY(6px) rotate(45deg)':'none'}}/>
            <span style={{display:'block',width:'22px',height:'1px',background:'rgba(239,215,202,.8)',transition:'all .3s',opacity:drawerOpen?0:1}}/>
            <span style={{display:'block',width:'22px',height:'1px',background:'rgba(239,215,202,.8)',transition:'all .3s',transform:drawerOpen?'translateY(-6px) rotate(-45deg)':'none'}}/>
          </button>
        </div>
        {/* Mobile drawer */}
        {drawerOpen&&(
          <div style={{position:'fixed',inset:0,zIndex:199,background:'rgba(21,2,24,.85)',backdropFilter:'blur(8px)'}} onClick={()=>setDrawerOpen(false)}>
            <div style={{position:'absolute',right:0,top:0,bottom:0,width:'280px',background:'#1e0428',padding:'5rem 2rem 3rem'}} onClick={e=>e.stopPropagation()}>
              {[['O salonu','#osalonu'],['Usluge','#usluge'],['Galerija','#galerija'],['Rezervacija','#rezervacija'],['Kontakt','#kontakt']].map(([l,h])=>(
                <a key={l} href={h} onClick={()=>setDrawerOpen(false)} style={{display:'block',padding:'.85rem 0',fontFamily:"'Josefin Sans'",fontSize:'.68rem',fontWeight:600,letterSpacing:'1px',textTransform:'uppercase',color:'rgba(239,215,202,.5)',borderBottom:'1px solid rgba(239,215,202,.06)',textDecoration:'none'}}>{l}</a>
              ))}
            </div>
          </div>
        )}

        {/* BOTTOM CONTENT — two-column like template (66.67% left, 33.33% right) */}
        <div style={{position:'absolute',bottom:0,left:0,right:0,zIndex:2,padding:'0 5% 5% 5%',display:'grid',gridTemplateColumns:'66.667% 33.333%',alignItems:'flex-end',gap:0}}>

          {/* LEFT COL: "Beauty Beyond" equivalent — huge headline + scroll down */}
          <div>
            {/* Main headline — clip reveal from -95px (exact template animation) */}
            <h1 style={{fontFamily:"'Josefin Sans'",fontWeight:600,lineHeight:1,textTransform:'uppercase',letterSpacing:0,color:'var(--cream)',margin:0}}>
              {/* "Beauty Beyond" = our "Ljepota Izvan" on line 1 */}
              <span style={{overflow:'hidden',display:'block'}}>
                <span style={{display:'block',transform:heroLoaded?'translateY(0)':'translateY(-95px)',opacity:heroLoaded?1:0,transition:'transform .7s .25s cubic-bezier(.16,1,.3,1),opacity .5s .25s',fontSize:'clamp(3.8rem,9vw,7.5rem)',lineHeight:1}}>
                  Ljepota Izvan
                </span>
              </span>
              {/* Second line = "Granica" */}
              <span style={{overflow:'hidden',display:'block'}}>
                <span style={{display:'block',transform:heroLoaded?'translateY(0)':'translateY(-95px)',opacity:heroLoaded?1:0,transition:'transform .7s .38s cubic-bezier(.16,1,.3,1),opacity .5s .38s',fontSize:'clamp(3.8rem,9vw,7.5rem)',lineHeight:1}}>
                  Granica
                </span>
              </span>
            </h1>

            {/* "scroll down" — inline with title, like template */}
            <div style={{overflow:'hidden',marginTop:'.8rem'}}>
              <span style={{display:'block',fontFamily:"'Josefin Sans'",fontSize:'.78rem',fontWeight:400,textTransform:'uppercase',letterSpacing:'2px',color:'rgba(239,215,202,.5)',transform:heroLoaded?'translateY(0)':'translateY(-40px)',opacity:heroLoaded?1:0,transition:'transform .6s .6s cubic-bezier(.16,1,.3,1),opacity .4s .6s'}}>
                scroll down
              </span>
            </div>
          </div>

          {/* RIGHT COL: subtitle + "book today" button (bottom-aligned, right-align) */}
          <div style={{textAlign:'right',display:'flex',flexDirection:'column',justifyContent:'flex-end',paddingBottom:'.5rem',gap:'1.2rem'}}>
            {/* Subtitle lines — each in clip wrap */}
            <div>
              <div style={{overflow:'hidden'}}>
                <p style={{fontFamily:"'Inter'",fontSize:'1rem',letterSpacing:'1px',color:'var(--cream)',lineHeight:'1.7',transform:heroLoaded?'translateY(0)':'translateY(-30px)',opacity:heroLoaded?1:0,transition:'transform .6s .7s cubic-bezier(.16,1,.3,1),opacity .5s .7s'}}>
                  Zajedno stvaramo nešto izvanredno!
                </p>
              </div>
              <div style={{overflow:'hidden'}}>
                <p style={{fontFamily:"'Inter'",fontSize:'.95rem',letterSpacing:'1px',color:'rgba(239,215,202,.6)',lineHeight:'1.7',transform:heroLoaded?'translateY(0)':'translateY(-30px)',opacity:heroLoaded?1:0,transition:'transform .6s .82s cubic-bezier(.16,1,.3,1),opacity .5s .82s'}}>
                  Frizura koja govori o tebi.
                </p>
              </div>
            </div>
            {/* "book today" button with diagonal arrow — exact template style */}
            <div style={{overflow:'hidden',display:'flex',justifyContent:'flex-end'}}>
              <button
                className="book-btn"
                style={{transform:heroLoaded?'translateY(0)':'translateY(-42px)',opacity:heroLoaded?1:0,transition:'transform .6s .95s cubic-bezier(.16,1,.3,1),opacity .5s .95s'}}
                onClick={()=>document.getElementById('rezervacija')?.scrollIntoView({behavior:'smooth'})}
              >
                rezerviraj danas <span className="barrow">↗</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile: simplified layout */}
        <style>{`
          @media(max-width:767px){
            .hero-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </section>

      {/* ══ ABOUT ═══════════════════════════════ */}
      <section id="osalonu" style={{background:'var(--plum)',padding:'10rem 5% 10rem 6%'}}>
        <div className="md:grid" style={{gridTemplateColumns:'50% 50%',gap:'0',display:'grid',minHeight:'700px'}}>
          {/* LEFT: image + text */}
          <div style={{paddingRight:'3rem'}}>
            <div data-clip style={{width:'100%',height:'400px',overflow:'hidden',position:'relative',marginBottom:'3rem'}}>
              <Image src="/photos/dark-black-waves.jpg" alt="O salonu" fill style={{objectFit:'cover',objectPosition:'center 20%'}} sizes="40vw"/>
            </div>

            <div data-r="up" style={{fontFamily:"'Josefin Sans'",fontSize:'.82rem',fontWeight:400,textTransform:'uppercase',letterSpacing:'2px',color:'rgba(239,215,202,.5)',lineHeight:'4',display:'block'}} data-d="1">
              Beauty Mess
            </div>

            <div className="clip-wrap" data-r="up" data-d="2">
              <h2 style={{fontFamily:"'Josefin Sans'",fontSize:'clamp(2.2rem,5vw,4rem)',fontWeight:600,textTransform:'uppercase',letterSpacing:0,lineHeight:1.05,color:'var(--cream)',marginBottom:'1.2rem'}}>
                Srce Kvarta
              </h2>
            </div>

            <p data-r="up" data-d="3" style={{fontFamily:"'Inter'",fontSize:'1rem',letterSpacing:'1px',color:'rgba(239,215,202,.6)',lineHeight:'1.75',maxWidth:'420px',marginBottom:'2rem'}}>
              U Beauty Messu se ne dolazi samo po frizuru — dolazi se jer se tu osjećaš dobrodošlom. Anita i tim rade s ljubavlju, a ugodna atmosfera i pažnja prema svakom detalju govore sami za sebe.
            </p>

            <div data-r="up" data-d="4" style={{display:'flex',gap:'1rem',alignItems:'center'}}>
              <a href="https://www.facebook.com/p/Frizerski-salon-Beauty-mess-100057421630219/" target="_blank"
                style={{fontFamily:"'Josefin Sans'",fontSize:'.8rem',letterSpacing:'2px',textTransform:'uppercase',color:'rgba(239,215,202,.55)',padding:'0 1rem',textDecoration:'none',transition:'color .2s'}}
                onMouseEnter={e=>(e.target as HTMLElement).style.color='var(--cream)'}
                onMouseLeave={e=>(e.target as HTMLElement).style.color='rgba(239,215,202,.55)'}
              >Facebook</a>
              <span style={{color:'rgba(239,215,202,.2)'}}>·</span>
              <a href="tel:+38598554037"
                style={{fontFamily:"'Josefin Sans'",fontSize:'.8rem',letterSpacing:'2px',textTransform:'uppercase',color:'rgba(239,215,202,.55)',padding:'0 1rem',textDecoration:'none',transition:'color .2s'}}
                onMouseEnter={e=>(e.target as HTMLElement).style.color='var(--cream)'}
                onMouseLeave={e=>(e.target as HTMLElement).style.color='rgba(239,215,202,.55)'}
              >098 554 037</a>
            </div>
          </div>

          {/* RIGHT: taller image (950px in template) */}
          <div data-clip style={{position:'relative',minHeight:'700px',overflow:'hidden'}}>
            <Image src="/photos/bob-highlights.jpg" alt="Fensi radovi" fill style={{objectFit:'cover',objectPosition:'center 10%'}} sizes="40vw"/>
          </div>
        </div>
      </section>

      {/* ══ SERVICES TITLE ══════════════════════ */}
      <section style={{background:'var(--plum)',padding:'3rem 5% 1rem'}}>
        <div data-r="up" style={{textAlign:'right'}}>
          <h2 style={{fontFamily:"'Josefin Sans'",fontSize:'clamp(2rem,7vw,5.5rem)',fontWeight:600,textTransform:'uppercase',letterSpacing:0,color:'var(--cream)',lineHeight:1}}>
            Kosa kao Forma Umjetnosti
          </h2>
        </div>
        <div data-r="up" data-d="1" style={{textAlign:'right',marginTop:'.5rem'}}>
          <p style={{fontFamily:"'Inter'",fontSize:'1rem',letterSpacing:'1px',color:'rgba(239,215,202,.6)',lineHeight:'1.6'}}>
            Naše usluge osmišljene su da pretvore tvoju kosu u remek-djelo
          </p>
        </div>
      </section>

      {/* ══ SERVICES SLIDES ════════════════════ */}
      <section id="usluge" style={{background:'var(--plum)',position:'relative'}}>
        {SERVICES.map((s, i) => (
          <div key={s.title} className={`srv-slide ${i===srvIdx?'active':''}`} style={{display:i===srvIdx?'block':'none',position:'relative',minHeight:'90vh',overflow:'hidden'}}>
            <Image src={s.img} alt={s.title} fill style={{objectFit:'cover',objectPosition:'center 20%'}} sizes="100vw"/>
            <div className="srv-gradient-bottom"/>
            <div className="srv-gradient-left"/>

            <div className="srv-content">
              <div className="srv-label"><span className="srv-label-inner">{s.label}</span></div>
              <div className="srv-title"><span className="srv-title-inner">{s.title}</span></div>
              <div className="srv-desc"><span className="srv-desc-inner">{s.desc}</span></div>
            </div>

            {/* Prev/Next controls */}
            <div style={{position:'absolute',bottom:'8%',right:'5%',display:'flex',alignItems:'center',gap:'2rem',zIndex:10}}>
              <button className="srv-nav book-btn" onClick={goPrev}>prev</button>
              <span style={{fontFamily:"'Josefin Sans'",fontSize:'.9rem',fontWeight:600,letterSpacing:'1px',color:'var(--cream)'}}>
                {i+1} / {SERVICES.length}
              </span>
              <button className="srv-nav book-btn" onClick={goNext}>
                rezerviraj <span className="barrow">↗</span>
              </button>
              <button className="srv-nav" style={{background:'none',border:'none',cursor:'pointer',fontFamily:"'Josefin Sans'",fontSize:'.9rem',fontWeight:600,letterSpacing:'1px',color:'rgba(239,215,202,.6)',textTransform:'uppercase'}} onClick={goNext}>next</button>
            </div>
          </div>
        ))}
      </section>

      {/* ══ GALLERY TITLE ══════════════════════ */}
      <section style={{background:'var(--plum)',padding:'6rem 5% 2rem'}}>
        <div data-r="up" style={{textAlign:'right'}}>
          <p style={{fontFamily:"'Josefin Sans'",fontSize:'.82rem',fontWeight:400,textTransform:'uppercase',letterSpacing:'2px',color:'rgba(239,215,202,.5)',marginBottom:'.3rem'}}>
            Inspiriraj se
          </p>
          <h2 style={{fontFamily:"'Josefin Sans'",fontSize:'clamp(2rem,7vw,5.5rem)',fontWeight:600,textTransform:'uppercase',letterSpacing:0,color:'var(--cream)',lineHeight:1}}>
            Savršenstvo u Stilu
          </h2>
        </div>
        <div data-r="up" data-d="1" style={{textAlign:'right',marginTop:'.5rem'}}>
          <p style={{fontFamily:"'Inter'",fontSize:'1rem',letterSpacing:'1px',color:'rgba(239,215,202,.6)'}}>
            Istraži portfolio transformacija.
          </p>
        </div>
      </section>

      {/* ══ GALLERY CAROUSEL ═══════════════════ */}
      <section id="galerija" style={{background:'var(--plum)',paddingBottom:'4rem'}}>
        {/* Side gradients like template */}
        <div style={{position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:0,left:0,bottom:0,width:'120px',background:'linear-gradient(270deg,rgba(21,2,24,0) 0%,rgba(21,2,24,.7) 100%)',zIndex:3,pointerEvents:'none'}}/>
          <div style={{position:'absolute',top:0,right:0,bottom:0,width:'120px',background:'linear-gradient(270deg,rgba(21,2,24,.7) 0%,rgba(21,2,24,0) 100%)',zIndex:3,pointerEvents:'none'}}/>
          <div ref={galRef} className="drag-scroll" style={{display:'flex',overflowX:'auto',gap:0}}>
            {GALLERY.map((g,i)=>(
              <div key={g.img+i} className="gal-item" style={{width:'clamp(300px,40vw,560px)',height:'clamp(420px,55vw,700px)',flexShrink:0}}>
                <Image src={g.img} alt={g.title} fill style={{objectFit:'cover',objectPosition:'center 15%'}} sizes="40vw"/>
                {/* Bottom gradient like template: rgba(21,2,24,0) → rgba(21,2,24,0.5) */}
                <div style={{position:'absolute',bottom:0,left:0,right:0,height:'35%',background:'linear-gradient(rgba(21,2,24,0) 0%,rgba(21,2,24,.6) 100%)',pointerEvents:'none'}}/>
                <div className="gal-bottom">
                  <div>
                    <div className="gal-title"><span className="gal-title-inner">{g.title}</span></div>
                    <div className="gal-price"><span className="gal-price-inner">{g.price}</span></div>
                  </div>
                  <div className="gal-cta">
                    <span className="gal-cta-inner">
                      dobij ovaj look
                      <span className="gal-arrow">↗</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ TESTIMONIALS TITLE ══════════════════ */}
      <section style={{background:'var(--plum)',padding:'6rem 5% 0'}}>
        <div data-r="up">
          <h2 style={{fontFamily:"'Josefin Sans'",fontSize:'clamp(2rem,7vw,5rem)',fontWeight:600,textTransform:'uppercase',letterSpacing:0,color:'var(--cream)',lineHeight:1}}>
            Povjerenje Počinje Ovdje
          </h2>
        </div>
        <div data-r="up" data-d="1" style={{marginTop:'.3rem',marginLeft:'1rem'}}>
          <p style={{fontFamily:"'Inter'",fontSize:'1rem',letterSpacing:'1px',color:'rgba(239,215,202,.5)',lineHeight:'2.5'}}>
            Svaka klijentica ima svoju priču. Evo što dijele o iskustvu s nama
          </p>
        </div>
      </section>

      {/* ══ TESTIMONIALS BODY ═══════════════════ */}
      <section style={{background:'var(--plum)',padding:'2rem 0 0'}}>
        <div style={{display:'grid',gridTemplateColumns:'50% 50%'}}>
          {/* LEFT: hair photo */}
          <div style={{position:'relative',height:'clamp(400px,60vw,800px)',overflow:'hidden'}}>
            <Image
              src={TESTI[testiIdx].img} alt="Testimonial"
              fill style={{objectFit:'cover',objectPosition:'center 15%',transition:'opacity .5s'}}
              sizes="50vw"
            />
            <div style={{position:'absolute',top:0,left:0,right:0,height:'35%',background:'linear-gradient(rgba(21,2,24,1) 0%,rgba(21,2,24,0) 100%)'}}/>
            <div style={{position:'absolute',bottom:0,left:0,right:0,height:'25%',background:'linear-gradient(rgba(21,2,24,0) 0%,rgba(21,2,24,1) 100%)'}}/>
          </div>

          {/* RIGHT: quote + author + nav */}
          <div style={{background:'rgba(21,2,24,.92)',display:'flex',flexDirection:'column',justifyContent:'flex-end',padding:'3rem 5% 4rem'}}>
            {/* Large quote mark */}
            <div style={{fontFamily:"'Inter'",fontSize:'clamp(5rem,8vw,8rem)',color:'rgba(239,215,202,.12)',lineHeight:1,marginBottom:'1rem'}}>"</div>
            {/* Quote */}
            <p style={{fontFamily:"'Inter'",fontSize:'clamp(1rem,2vw,1.35rem)',letterSpacing:'1px',color:'rgba(239,215,202,.55)',lineHeight:'1.75',marginBottom:'2rem',maxWidth:'480px'}}>
              {TESTI[testiIdx].quote}
            </p>
            {/* Author */}
            <p style={{fontFamily:"'Inter'",fontSize:'1.1rem',letterSpacing:'1px',color:'var(--cream)',marginBottom:'1.5rem'}}>
              {TESTI[testiIdx].author}
            </p>
            {/* Nav: N of 3 · prev · next */}
            <div style={{display:'flex',alignItems:'center',gap:'1.5rem'}}>
              <span style={{fontFamily:"'Josefin Sans'",fontSize:'.9rem',fontWeight:600,letterSpacing:'1px',textTransform:'uppercase',color:'var(--cream)'}}>
                {testiIdx+1} of {TESTI.length}
              </span>
              <button onClick={()=>setTestiIdx(i=>(i-1+TESTI.length)%TESTI.length)} style={{background:'none',border:'none',cursor:'pointer',fontFamily:"'Josefin Sans'",fontSize:'.9rem',fontWeight:600,letterSpacing:'1px',textTransform:'uppercase',color:'rgba(239,215,202,.55)'}}>prev</button>
              <button onClick={()=>setTestiIdx(i=>(i+1)%TESTI.length)} style={{background:'none',border:'none',cursor:'pointer',fontFamily:"'Josefin Sans'",fontSize:'.9rem',fontWeight:600,letterSpacing:'1px',textTransform:'uppercase',color:'rgba(239,215,202,.55)'}}>next</button>
            </div>
          </div>
        </div>
      </section>

      {/* ══ RADNO VRIJEME ═══════════════════════ */}
      <section style={{background:'var(--plum)',padding:'7rem 5% 5rem 6%'}}>
        <div data-r="up" style={{marginBottom:'1rem'}}>
          <p style={{fontFamily:"'Josefin Sans'",fontSize:'.82rem',fontWeight:400,textTransform:'uppercase',letterSpacing:'2px',color:'rgba(239,215,202,.5)',marginBottom:'.5rem'}}>radno vrijeme</p>
          <h2 style={{fontFamily:"'Josefin Sans'",fontSize:'clamp(2.5rem,6vw,4.5rem)',fontWeight:600,textTransform:'uppercase',letterSpacing:0,color:'var(--cream)',lineHeight:1}}>
            Kad Smo Tu Za Tebe
          </h2>
        </div>
        <div style={{maxWidth:'500px',marginTop:'2.5rem'}} data-r="up" data-d="1">
          {[1,2,3,4,5,6,0].map(d=>{
            const r=RADNO[d];const isT=d===new Date().getDay()
            return(
              <div key={d} style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',padding:'.85rem 0',borderBottom:'1px solid rgba(239,215,202,.07)',borderTop:d===1?'1px solid rgba(239,215,202,.07)':'none'}}>
                <span style={{fontFamily:"'Josefin Sans'",fontSize:'.8rem',fontWeight:400,textTransform:'uppercase',letterSpacing:'1px',color:isT?'var(--cream)':'rgba(239,215,202,.5)'}}>
                  {DAY_NAMES[d]}{isT&&<span style={{display:'inline-block',width:'5px',height:'5px',borderRadius:'50%',background:'var(--cream)',marginLeft:'.5rem',verticalAlign:'middle'}}/>}
                </span>
                <span style={{fontFamily:"'Inter'",fontSize:'.95rem',color:isT?'var(--cream)':r?'rgba(239,215,202,.7)':'rgba(239,215,202,.2)',fontStyle:r?'normal':'italic'}}>
                  {r?r.disp:'Zatvoreno'}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      {/* ══ REZERVACIJA ════════════════════════ */}
      <section id="rezervacija" style={{background:'var(--plum2)',padding:'6rem 5% 8rem 6%'}}>
        <div data-r="up">
          <p style={{fontFamily:"'Josefin Sans'",fontSize:'.82rem',fontWeight:400,textTransform:'uppercase',letterSpacing:'2px',color:'rgba(239,215,202,.5)',marginBottom:'.5rem'}}>online rezervacija</p>
          <h2 style={{fontFamily:"'Josefin Sans'",fontSize:'clamp(2.5rem,6vw,4.5rem)',fontWeight:600,textTransform:'uppercase',letterSpacing:0,color:'var(--cream)',lineHeight:1,marginBottom:'.5rem'}}>
            Rezerviraj Termin
          </h2>
          <p style={{fontFamily:"'Inter'",fontSize:'1rem',letterSpacing:'1px',color:'rgba(239,215,202,.5)',marginBottom:'3rem'}}>kod Anite i tima — odaberi datum, upiši se i čekaj potvrdu.</p>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'2rem',alignItems:'start'}}>
          {/* Calendar — compact */}
          <div data-r="left" style={{background:'rgba(239,215,202,.03)',border:'1px solid rgba(239,215,202,.07)',padding:'1.2rem'}}>
            {/* Month nav */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'.8rem'}}>
              <button onClick={()=>{setCalMonth(m=>{if(m===0){setCalYear(y=>y-1);return 11}return m-1})}} style={{background:'none',border:'none',color:'rgba(239,215,202,.5)',cursor:'pointer',fontSize:'1rem',padding:'0 .4rem',lineHeight:1}}>‹</button>
              <span style={{fontFamily:"'Josefin Sans'",fontSize:'.78rem',fontWeight:600,textTransform:'uppercase',letterSpacing:'1px',color:'var(--cream)'}}>{MONTH_NAMES[calMonth].substring(0,3)} {calYear}</span>
              <button onClick={()=>{setCalMonth(m=>{if(m===11){setCalYear(y=>y+1);return 0}return m+1})}} style={{background:'none',border:'none',color:'rgba(239,215,202,.5)',cursor:'pointer',fontSize:'1rem',padding:'0 .4rem',lineHeight:1}}>›</button>
            </div>
            {/* Day names */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'1px',marginBottom:'2px'}}>
              {['P','U','S','Č','P','S','N'].map((d,i)=><div key={i} style={{textAlign:'center',fontFamily:"'Josefin Sans'",fontSize:'.55rem',letterSpacing:'.5px',textTransform:'uppercase',color:'rgba(239,215,202,.2)',padding:'.2rem 0'}}>{d}</div>)}
            </div>
            {/* Days grid — more compact */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'1px'}}>
              {calDays().map((day,i)=>(
                <div key={i} onClick={()=>!day.empty&&!day.past&&!day.closed&&handleSelectDate(day.ds)}
                  style={{aspectRatio:'1',display:'flex',alignItems:'center',justifyContent:'center',borderRadius:'50%',fontSize:'.72rem',cursor:day.empty||day.past||day.closed?'default':'pointer',color:day.selected?'var(--plum)':day.isToday?'var(--cream)':'rgba(239,215,202,.4)',background:day.selected?'var(--cream)':day.isToday?'rgba(239,215,202,.12)':'transparent',opacity:day.past||day.closed?0.18:1,fontWeight:day.isToday?600:400,minHeight:'26px',transition:'all .15s',textDecoration:day.closed&&!day.empty&&!day.past?'line-through':'none'}}
                >
                  {day.empty?'':day.d}
                </div>
              ))}
            </div>
            {/* Slots */}
            {selDate&&(
              <div style={{marginTop:'.9rem',borderTop:'1px solid rgba(239,215,202,.06)',paddingTop:'.8rem'}}>
                <div style={{fontFamily:"'Josefin Sans'",fontSize:'.55rem',letterSpacing:'2px',textTransform:'uppercase',color:'rgba(239,215,202,.3)',marginBottom:'.5rem'}}>termini — {selDate}</div>
                {slotsLoading?<p style={{fontFamily:"'Inter'",fontSize:'.75rem',color:'rgba(239,215,202,.3)'}}>...</p>:(
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'2px'}}>
                    {slots.length===0?<p style={{fontSize:'.7rem',color:'rgba(239,215,202,.25)',gridColumn:'1/-1',textAlign:'center'}}>Nema slobodnih</p>:
                      slots.map(s=>{const tk=s.startsWith('taken:');const t=tk?s.replace('taken:',''):s;return(
                        <button key={s} onClick={()=>!tk&&setSelTime(t)}
                          style={{background:selTime===t?'var(--cream)':tk?'transparent':'rgba(239,215,202,.04)',border:`1px solid ${selTime===t?'var(--cream)':tk?'rgba(239,215,202,.05)':'rgba(239,215,202,.1)'}`,padding:'.35rem .2rem',textAlign:'center',fontSize:'.68rem',fontFamily:"'Josefin Sans'",letterSpacing:'.3px',cursor:tk?'not-allowed':'pointer',color:selTime===t?'var(--plum)':tk?'rgba(239,215,202,.15)':'rgba(239,215,202,.6)',textDecoration:tk?'line-through':'none',transition:'all .15s'}}>{t}</button>
                      )})
                    }
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Form */}
          <div data-r="right">
            {!submitted?(
              <div style={{background:'rgba(239,215,202,.03)',border:'1px solid rgba(239,215,202,.07)',padding:'2rem'}}>
                <h3 style={{fontFamily:"'Josefin Sans'",fontSize:'1.2rem',fontWeight:600,textTransform:'uppercase',letterSpacing:'1px',color:'var(--cream)',marginBottom:'.3rem'}}>Rezerviraj Termin</h3>
                <p style={{fontFamily:"'Inter'",fontSize:'.85rem',color:'rgba(239,215,202,.4)',marginBottom:'1.5rem'}}>Ispuni podatke i potvrdi.</p>
                {selDate&&selTime&&<div style={{fontFamily:"'Josefin Sans'",fontSize:'.75rem',letterSpacing:'1px',textTransform:'uppercase',color:'var(--cream)',background:'rgba(239,215,202,.06)',border:'1px solid rgba(239,215,202,.1)',padding:'.4rem .8rem',marginBottom:'.9rem'}}>✦ {selDate} u {selTime}</div>}
                {[{label:'Ime i prezime *',key:'name',type:'text',ph:'Ana Horvat'},{label:'Telefon *',key:'phone',type:'tel',ph:'091 234 5678'},{label:'Email',key:'email',type:'email',ph:'ana@email.com'}].map(f=>(
                  <div key={f.key} style={{marginBottom:'.85rem'}}>
                    <label style={{display:'block',fontFamily:"'Josefin Sans'",fontSize:'.58rem',letterSpacing:'2px',textTransform:'uppercase',color:'rgba(239,215,202,.3)',marginBottom:'.4rem'}}>{f.label}</label>
                    <input type={f.type} placeholder={f.ph} value={(form as any)[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}
                      style={{width:'100%',background:'rgba(239,215,202,.04)',border:'1px solid rgba(239,215,202,.08)',padding:'.78rem 1rem',color:'var(--cream)',fontFamily:"'Inter'",fontSize:'.88rem',outline:'none'}}
                      onFocus={e=>e.target.style.borderColor='rgba(239,215,202,.25)'} onBlur={e=>e.target.style.borderColor='rgba(239,215,202,.08)'}/>
                  </div>
                ))}
                <div style={{marginBottom:'.85rem'}}>
                  <label style={{display:'block',fontFamily:"'Josefin Sans'",fontSize:'.58rem',letterSpacing:'2px',textTransform:'uppercase',color:'rgba(239,215,202,.3)',marginBottom:'.4rem'}}>Usluga *</label>
                  <select value={form.service} onChange={e=>setForm(p=>({...p,service:e.target.value}))}
                    style={{width:'100%',background:'rgba(239,215,202,.04)',border:'1px solid rgba(239,215,202,.08)',padding:'.78rem 1rem',color:form.service?'var(--cream)':'rgba(239,215,202,.3)',fontFamily:"'Inter'",fontSize:'.88rem',outline:'none',appearance:'none'}}>
                    <option value="">— Odaberi uslugu —</option>
                    {['Šišanje & feniranje','Bojanje kose (cijela boja)','Osvježavanje korijena','Pramenovi / Balayage','Trajna ondulacija','Keratin tretman','Ravnanje kose','Svečana / svatovska frizura','Konzultacija'].map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
                <div style={{marginBottom:'.85rem'}}>
                  <label style={{display:'block',fontFamily:"'Josefin Sans'",fontSize:'.58rem',letterSpacing:'2px',textTransform:'uppercase',color:'rgba(239,215,202,.3)',marginBottom:'.4rem'}}>Napomena</label>
                  <textarea placeholder="Posebni zahtjevi..." rows={3} value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))}
                    style={{width:'100%',background:'rgba(239,215,202,.04)',border:'1px solid rgba(239,215,202,.08)',padding:'.78rem 1rem',color:'var(--cream)',fontFamily:"'Inter'",fontSize:'.88rem',outline:'none',resize:'none'}}/>
                </div>
                <button onClick={submitBooking} disabled={submitting}
                  style={{width:'100%',background:'var(--cream)',color:'var(--plum)',border:'none',padding:'.9rem',fontFamily:"'Josefin Sans'",fontSize:'.78rem',fontWeight:600,letterSpacing:'2px',textTransform:'uppercase',cursor:'pointer',opacity:submitting?.4:1,transition:'opacity .2s'}}>
                  {submitting?'Rezerviram...':'Potvrdi Rezervaciju'}
                </button>
              </div>
            ):(
              <div style={{background:'rgba(239,215,202,.03)',border:'1px solid rgba(239,215,202,.07)',padding:'4rem 2rem',textAlign:'center'}}>
                <div style={{fontFamily:"'Josefin Sans'",fontSize:'2rem',color:'var(--cream)',marginBottom:'.8rem'}}>✦</div>
                <h4 style={{fontFamily:"'Josefin Sans'",fontSize:'1.3rem',fontWeight:600,textTransform:'uppercase',letterSpacing:'1px',color:'var(--cream)',marginBottom:'.5rem'}}>Rezervacija Zaprimljena!</h4>
                <p style={{fontFamily:"'Inter'",fontSize:'.9rem',color:'rgba(239,215,202,.5)',marginBottom:'1.5rem'}}>{submitMsg}</p>
                <button onClick={()=>{setSubmitted(false);setSelDate(null);setSelTime(null);setForm({name:'',phone:'',email:'',service:'',note:''})}}
                  style={{background:'none',border:'1px solid rgba(239,215,202,.15)',color:'rgba(239,215,202,.5)',padding:'.6rem 1.5rem',fontFamily:"'Josefin Sans'",fontSize:'.65rem',letterSpacing:'2px',textTransform:'uppercase',cursor:'pointer'}}>
                  Nova Rezervacija
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ══ CONTACT / FOOTER ════════════════════ */}
      <section id="kontakt" style={{background:'var(--plum)'}}>
        {/* Big CTA — matching template "your perfect look awaits" */}
        <div style={{padding:'6rem 5% 0',backgroundImage:'url(/photos/dark-black-waves.jpg)',backgroundSize:'cover',backgroundPosition:'center 20%',position:'relative',minHeight:'300px'}}>
          <div style={{position:'absolute',inset:0,background:'rgba(21,2,24,.7)'}}/>
          <div style={{position:'relative',zIndex:1}}>
            <h2 style={{fontFamily:"'Josefin Sans'",fontSize:'clamp(2.5rem,7vw,6rem)',fontWeight:600,textTransform:'uppercase',letterSpacing:0,color:'var(--cream)',lineHeight:1,textAlign:'right',marginBottom:'.5rem'}}>
              Tvoj Savršen Look Čeka
            </h2>
            <p style={{fontFamily:"'Inter'",fontSize:'1rem',letterSpacing:'1px',color:'rgba(239,215,202,.5)',textAlign:'right',marginBottom:'3rem'}}>
              Iskusi artizam, kreativnost i salon gdje se osjećaš kao kod kuće
            </p>
            <div style={{display:'flex',justifyContent:'flex-end'}}>
              <button className="book-btn" onClick={()=>document.getElementById('rezervacija')?.scrollIntoView({behavior:'smooth'})}>
                rezerviraj danas <span className="barrow">↗</span>
              </button>
            </div>
          </div>
          {/* Spacer */}
          <div style={{height:'200px'}}/>
        </div>

        {/* Info row — matching template 4-column layout */}
        <div style={{padding:'3rem 5% 5rem 6%',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'3rem'}}>
          {/* Logo */}
          <div>
            <div style={{fontFamily:"'Josefin Sans'",fontSize:'1.6rem',fontWeight:600,textTransform:'uppercase',letterSpacing:'3px',color:'var(--cream)',marginBottom:'1rem'}}>Beauty Mess</div>
          </div>
          {/* Address + Contact */}
          <div>
            <p style={{fontFamily:"'Josefin Sans'",fontSize:'.72rem',fontWeight:400,textTransform:'uppercase',letterSpacing:'2px',color:'rgba(239,215,202,.5)',marginBottom:'.5rem'}}>adresa</p>
            <p style={{fontFamily:"'Inter'",fontSize:'1rem',letterSpacing:'1px',color:'var(--cream)',lineHeight:'1.6',marginBottom:'1.2rem'}}>Ul. Brune Bušića 9, L-22<br/>Zagreb — Središće</p>
            <p style={{fontFamily:"'Josefin Sans'",fontSize:'.72rem',textTransform:'uppercase',letterSpacing:'2px',color:'rgba(239,215,202,.5)',marginBottom:'.3rem'}}>telefon</p>
            <a href="tel:+38598554037" style={{fontFamily:"'Inter'",fontSize:'1rem',letterSpacing:'1px',color:'var(--cream)',textDecoration:'none'}}>098 554 037</a>
            <br/><br/>
            <p style={{fontFamily:"'Josefin Sans'",fontSize:'.72rem',textTransform:'uppercase',letterSpacing:'2px',color:'rgba(239,215,202,.5)',marginBottom:'.3rem'}}>email</p>
            <a href="mailto:beautymess@gmail.com" style={{fontFamily:"'Inter'",fontSize:'1rem',letterSpacing:'1px',color:'var(--cream)',textDecoration:'none'}}>beautymess@gmail.com</a>
          </div>
          {/* Hours */}
          <div>
            <p style={{fontFamily:"'Josefin Sans'",fontSize:'.72rem',textTransform:'uppercase',letterSpacing:'2px',color:'rgba(239,215,202,.5)',marginBottom:'.5rem'}}>radno vrijeme</p>
            {[{label:'Pon – Pet',time:'9:00 – 20:00'},{label:'Subota',time:'9:00 – 16:00'},{label:'Nedjelja',time:'Zatvoreno'}].map(r=>(
              <div key={r.label} style={{display:'flex',gap:'1rem',marginBottom:'.3rem'}}>
                <span style={{fontFamily:"'Inter'",fontSize:'.9rem',letterSpacing:'1px',color:'rgba(239,215,202,.55)',minWidth:'120px'}}>{r.label}</span>
                <span style={{fontFamily:"'Inter'",fontSize:'.9rem',letterSpacing:'1px',color:'var(--cream)'}}>{r.time}</span>
              </div>
            ))}
          </div>
          {/* Social + Book */}
          <div>
            <p style={{fontFamily:"'Josefin Sans'",fontSize:'.72rem',textTransform:'uppercase',letterSpacing:'2px',color:'rgba(239,215,202,.5)',marginBottom:'.5rem'}}>prati nas</p>
            <div style={{display:'flex',gap:'1.5rem',marginBottom:'2rem'}}>
              <a href="https://www.facebook.com/p/Frizerski-salon-Beauty-mess-100057421630219/" target="_blank"
                style={{fontFamily:"'Josefin Sans'",fontSize:'.8rem',letterSpacing:'2px',textTransform:'uppercase',color:'rgba(239,215,202,.55)',textDecoration:'none',transition:'color .2s'}}
                onMouseEnter={e=>(e.target as HTMLElement).style.color='var(--cream)'}
                onMouseLeave={e=>(e.target as HTMLElement).style.color='rgba(239,215,202,.55)'}
              >Facebook</a>
            </div>
            <button className="book-btn" onClick={()=>document.getElementById('rezervacija')?.scrollIntoView({behavior:'smooth'})}>
              rezerviraj <span className="barrow">↗</span>
            </button>
          </div>
        </div>
      </section>

      {/* ══ FAB + ADMIN BTN ═════════════════════ */}
      <a href="tel:+38598554037" style={{position:'fixed',bottom:'max(1.5rem,env(safe-area-inset-bottom,1.5rem))',right:'1.5rem',background:'var(--cream)',color:'var(--plum)',width:'50px',height:'50px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.1rem',zIndex:90,textDecoration:'none',animation:'fabFloat 3s ease-in-out infinite',boxShadow:'0 6px 24px rgba(239,215,202,.15)'}}>📞</a>
      <button onClick={()=>setAdminOpen(true)} style={{position:'fixed',bottom:'max(1.5rem,env(safe-area-inset-bottom,1.5rem))',left:'1.5rem',background:'rgba(21,2,24,.8)',color:'rgba(239,215,202,.35)',width:'38px',height:'38px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.8rem',zIndex:90,border:'1px solid rgba(239,215,202,.08)',backdropFilter:'blur(10px)',cursor:'pointer'}}>⚙️</button>

      {/* ══ ADMIN PANEL ══════════════════════════ */}
      {adminOpen&&(
        <div style={{position:'fixed',inset:0,zIndex:500,background:'rgba(21,2,24,.8)',backdropFilter:'blur(16px)',overflowY:'auto'}} onClick={e=>e.target===e.currentTarget&&setAdminOpen(false)}>
          <div style={{maxWidth:'780px',margin:'1.5rem auto',background:'#1e0428',border:'1px solid rgba(239,215,202,.08)'}}>
            <div style={{padding:'1.3rem 1.6rem',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid rgba(239,215,202,.06)'}}>
              <h2 style={{fontFamily:"'Josefin Sans'",fontSize:'1.1rem',fontWeight:600,textTransform:'uppercase',letterSpacing:'2px',color:'var(--cream)'}}>Admin · Fensi</h2>
              <button onClick={()=>setAdminOpen(false)} style={{background:'none',border:'1px solid rgba(239,215,202,.1)',color:'rgba(239,215,202,.4)',width:'30px',height:'30px',borderRadius:'50%',cursor:'pointer'}}>✕</button>
            </div>
            <div style={{padding:'1.5rem 1.6rem'}}>
              {!adminKey?(
                <div>
                  <h3 style={{fontFamily:"'Josefin Sans'",fontSize:'.9rem',fontWeight:600,textTransform:'uppercase',letterSpacing:'2px',color:'var(--cream)',marginBottom:'1rem'}}>Prijava vlasnice</h3>
                  <input type="password" placeholder="••••••••" value={adminPass} onChange={e=>setAdminPass(e.target.value)} onKeyDown={e=>e.key==='Enter'&&adminAuth()}
                    style={{width:'100%',background:'rgba(239,215,202,.04)',border:'1px solid rgba(239,215,202,.08)',padding:'.78rem 1rem',color:'var(--cream)',fontFamily:"'Inter'",fontSize:'.88rem',outline:'none',marginBottom:'.6rem'}}/>
                  {adminErr&&<p style={{color:'#ff7777',fontFamily:"'Inter'",fontSize:'.78rem',marginBottom:'.5rem'}}>Pogrešna lozinka</p>}
                  <button onClick={adminAuth} style={{width:'100%',background:'var(--cream)',color:'var(--plum)',border:'none',padding:'.78rem',fontFamily:"'Josefin Sans'",fontSize:'.72rem',fontWeight:600,letterSpacing:'2px',textTransform:'uppercase',cursor:'pointer'}}>Prijavi se</button>
                </div>
              ):(
                <div>
                  <div style={{display:'flex',borderBottom:'1px solid rgba(239,215,202,.06)',marginBottom:'1rem'}}>
                    {['pending','today','upcoming','all'].map((t,i)=>(
                      <button key={t} onClick={()=>setAdminTab(t)} style={{background:'none',border:'none',borderBottom:`2px solid ${adminTab===t?'var(--cream)':'transparent'}`,padding:'.6rem .9rem',fontFamily:"'Josefin Sans'",fontSize:'.62rem',letterSpacing:'1.5px',textTransform:'uppercase',color:adminTab===t?'var(--cream)':'rgba(239,215,202,.3)',cursor:'pointer'}}>
                        {['čekanje','danas','nadolazeći','svi'][i]}{t==='pending'&&pendingCount>0&&<span style={{background:'var(--cream)',color:'var(--plum)',borderRadius:'50%',width:'16px',height:'16px',fontSize:'.58rem',fontWeight:600,display:'inline-flex',alignItems:'center',justifyContent:'center',marginLeft:'.35rem',verticalAlign:'middle'}}>{pendingCount}</span>}
                      </button>
                    ))}
                  </div>
                  {filteredAppts.length===0?<div style={{textAlign:'center',padding:'2rem',color:'rgba(239,215,202,.25)',fontFamily:"'Inter'",fontStyle:'italic'}}>Nema termina</div>:
                    filteredAppts.map(a=>(
                      <div key={a.id} style={{background:'rgba(239,215,202,.03)',border:`1px solid ${a.status==='pending'?'rgba(239,215,202,.15)':'rgba(239,215,202,.05)'}`,borderLeft:a.status==='pending'?'2px solid var(--cream)':'1px solid rgba(239,215,202,.05)',padding:'1rem 1.2rem',marginBottom:'.5rem',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'1rem'}}>
                        <div>
                          <div style={{fontFamily:"'Josefin Sans'",fontSize:'.85rem',fontWeight:600,letterSpacing:'.5px',color:'var(--cream)',marginBottom:'.12rem',textTransform:'uppercase'}}>{a.name}<span style={{fontSize:'.58rem',letterSpacing:'1px',textTransform:'uppercase',padding:'.12rem .45rem',background:a.status==='pending'?'rgba(239,215,202,.08)':'rgba(239,215,202,.04)',color:'rgba(239,215,202,.5)',marginLeft:'.35rem'}}>{a.status==='pending'?'čeka':'ok'}</span></div>
                          <div style={{fontFamily:"'Inter'",fontSize:'.72rem',color:'rgba(239,215,202,.35)'}}>📞 {a.phone}{a.email?` · ${a.email}`:''}</div>
                          <div style={{fontFamily:"'Josefin Sans'",fontSize:'.65rem',letterSpacing:'1px',textTransform:'uppercase',background:'rgba(239,215,202,.06)',color:'rgba(239,215,202,.6)',padding:'.12rem .5rem',display:'inline-block',marginTop:'.22rem'}}>{a.service}</div>
                        </div>
                        <div style={{textAlign:'right'}}>
                          <div style={{fontFamily:"'Josefin Sans'",fontSize:'1rem',fontWeight:600,color:'var(--cream)'}}>{a.time}</div>
                          <div style={{fontFamily:"'Inter'",fontSize:'.65rem',color:'rgba(239,215,202,.25)'}}>{a.date}</div>
                          {a.status==='pending'&&<button onClick={()=>confirmAppt(a.id)} style={{background:'none',border:'1px solid rgba(239,215,202,.2)',color:'rgba(239,215,202,.6)',padding:'.25rem .5rem',fontFamily:"'Josefin Sans'",fontSize:'.62rem',letterSpacing:'1px',textTransform:'uppercase',cursor:'pointer',display:'block',marginTop:'.22rem'}}>✓ Potvrdi</button>}
                          <button onClick={()=>deleteAppt(a.id,a.date,a.time)} style={{background:'none',border:'1px solid rgba(239,215,202,.08)',color:'rgba(239,215,202,.25)',padding:'.25rem .5rem',fontFamily:"'Josefin Sans'",fontSize:'.62rem',letterSpacing:'1px',textTransform:'uppercase',cursor:'pointer',display:'block',marginTop:'.22rem'}}>✕ Odbij</button>
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fabFloat { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-5px); } }
        .md\\:grid-cols-2 { grid-template-columns: 1fr 1fr; }
        @media(min-width:768px) { .hidden { display: none !important; } .md\\:inline-flex { display: inline-flex !important; } .md\\:flex { display: flex !important; } }
        @media(max-width:767px) { .hidden { display: block; } }
      `}</style>
    </>
  )
}
