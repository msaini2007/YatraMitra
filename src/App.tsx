import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, TouchEvent as ReactTouchEvent } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import {
  ArrowLeft, ArrowRight, CalendarDays, Check, ChevronDown,
  CircleUserRound, Clock3, Compass, Heart, Hotel, Languages, LocateFixed,
  MapPin, Menu, MessageCircle, Play, Pause, Search, Download, Printer,
  ChevronUp, ExternalLink, LoaderCircle, AlertTriangle,
  ShieldCheck, ShoppingBag, Sparkles, Star, Ticket, UserPlus, Users, Utensils,
  X, Volume2, Route as RouteIcon, Share2, Trash2, Plus, Send,
  LogIn, LogOut, Grid3X3, List, Landmark, Mountain,
  Eye, Globe2
} from 'lucide-react'
import { buddyProfiles, destinations, experiences, hotels, type Destination } from './data'
import { getImageRecord, type ImageRecord } from './imageData'
import { localizedContent, translate, type Language } from './i18n'
import {
  buildItineraryDays, createBudget, fetchDrivingRoute, formatDuration,
  formatINR, getKnownCityPoint, getPlannerCities, getTripDays, getVisitDuration,
  ACCOMMODATION_PREFERENCES, PLANNER_PREFERENCES, rescheduleExistingDays, selectPlannerDestinations,
  TRANSPORT_MODES, TRAVEL_PACES, TRAVEL_TYPES, validatePlannerForm,
} from './planner'
import type { ItineraryDay, PlannerForm, PlannerTrip, PlannedVisit, RoadRoute } from './planner'
import './App.css'

type Toast = { id: number; text: string }

const LanguageContext = createContext<{ language: Language; setLanguage: (language: Language) => void }>({
  language: 'English',
  setLanguage: () => undefined,
})

function useI18n() {
  const { language, setLanguage } = useContext(LanguageContext)
  return { language, setLanguage, t: (text: string) => translate(language, text) }
}

function localizedDestination(d: Destination, language: Language): Destination {
  return {
    ...d,
    category: localizedContent(language, 'destinations', d.id, 'category', d.category),
    description: localizedContent(language, 'destinations', d.id, 'description', d.description),
    history: localizedContent(language, 'destinations', d.id, 'history', d.history),
    architecture: localizedContent(language, 'destinations', d.id, 'architecture', d.architecture),
    culture: localizedContent(language, 'destinations', d.id, 'culture', d.culture),
    closed: localizedContent(language, 'destinations', d.id, 'closed', d.closed),
  }
}

function localizedExperience<T extends { id: string; name: string; category: string; description: string }>(experience: T, language: Language): T {
  return {
    ...experience,
    name: localizedContent(language, 'experiences', experience.id, 'name', experience.name),
    category: localizedContent(language, 'experiences', experience.id, 'category', experience.category),
    description: localizedContent(language, 'experiences', experience.id, 'description', experience.description),
  }
}

function useStored<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    const sync = (event: Event) => {
      setValue((event as CustomEvent<T>).detail)
    }
    window.addEventListener(`ym-storage-${key}`, sync)
    return () => window.removeEventListener(`ym-storage-${key}`, sync)
  }, [key])
  const update = (next: T) => {
    setValue(next)
    localStorage.setItem(key, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent(`ym-storage-${key}`, {detail: next}))
  }
  return [value, update] as const
}

function Brand() {
  const { t } = useI18n()
  return (
    <Link className="brand" to="/" aria-label={t('YatraMitra home')}>
      <span className="brand-mark"><Landmark size={22} /></span>
      <span>
        <strong>Yatra<span>Mitra</span></strong>
        <small>{t('Explore • Connect • Travel')}</small>
      </span>
    </Link>
  )
}

function AssetImage({ record, className = '', label, kind, showCredit = true }: { record: ImageRecord; className?: string; label?: string; kind?: 'food' | 'hotel' | 'person' | 'shopping'; showCredit?: boolean }) {
  const { language, t } = useI18n()
  const [failedSource, setFailedSource] = useState<string | null>(null)
  const [loadedSource, setLoadedSource] = useState<string | null>(null)
  const sourceKey = `${record.destination_id}:${record.image_url ?? ''}`
  const failed = failedSource === sourceKey
  const loaded = loadedSource === sourceKey
  const displayLabel = label ?? record.destination_id.replace(/-/g, ' ')
  const imageAlt = language === 'हिन्दी' ? displayLabel : record.alt_text
  const PlaceholderIcon = kind === 'food'
    ? Utensils
    : kind === 'hotel'
      ? Hotel
      : kind === 'person'
        ? CircleUserRound
        : kind === 'shopping'
          ? ShoppingBag
          : Landmark
  const attribution = [record.author, record.license].filter(Boolean).join(' · ')
  const creditLabel = [record.source_name, record.author, record.license].filter(Boolean).join(' · ')
  if (!record.is_verified || !record.image_url || failed) {
    return (
      <div className={`asset-placeholder ${kind === 'food' ? 'food-placeholder' : ''} ${className}`} role="img" aria-label={imageAlt}>
        <PlaceholderIcon size={26} />
        <strong>{displayLabel}</strong>
        <small>{t(failed ? 'Photo failed to load' : kind === 'food' ? 'Dish photo unavailable' : 'Photo not verified')}</small>
      </div>
    )
  }
  return (
    <div className={`asset-photo ${className} ${loaded ? 'asset-image-loaded' : 'asset-image-loading'}`}>
      {!loaded && <span className="asset-loading-placeholder" role="status">{t('Loading photo…')}</span>}
      <img src={record.image_url} alt={imageAlt} loading={className.split(' ').includes('hero-image') ? 'eager' : 'lazy'} decoding="async" fetchPriority={className.split(' ').includes('hero-image') ? 'high' : 'auto'} onLoad={() => setLoadedSource(sourceKey)} onError={() => setFailedSource(sourceKey)} />
      {showCredit && creditLabel && <span className="asset-credit" title={[record.source_url, attribution].filter(Boolean).join(' — ') || undefined}>{creditLabel}</span>}
    </div>
  )
}

function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [storedLanguage, setLanguage] = useStored('ym-language', 'English')
  const language: Language = storedLanguage === 'हिन्दी' ? 'हिन्दी' : 'English'
  const [user, setUser] = useStored<{name:string;email:string}|null>('ym-user', null)
  const [toast, setToast] = useState<Toast | null>(null)
  const navigate = useNavigate()
  const t = (text: string) => translate(language, text)

  useEffect(() => {
    if (storedLanguage !== language) setLanguage(language)
  }, [language, setLanguage, storedLanguage])

  useEffect(() => {
    document.documentElement.lang = language === 'हिन्दी' ? 'hi' : 'en'
    document.title = translate(language,'YatraMitra — Explore Rajasthan, Travel Smarter')
  }, [language])

  const notify = (text: string) => {
    setToast({ id: Date.now(), text })
    window.setTimeout(() => setToast(null), 2800)
  }

  const logout = () => {
    setUser(null)
    notify(t('You have been signed out'))
    navigate('/')
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage: (value) => setLanguage(value) }}>
    <div className="app-shell">
      <a className="skip-link" href="#main-content">{t('Skip to content')}</a>
      <header className="topbar">
        <div className="nav-wrap">
          <Brand />
          <button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label={t('Toggle navigation')} aria-expanded={menuOpen}>
            {menuOpen ? <X /> : <Menu />}
          </button>
          <nav className={menuOpen ? 'nav-links open' : 'nav-links'} aria-label={t('Main navigation')}>
            <Link to="/" onClick={() => setMenuOpen(false)}>{t('Home')}</Link>
            <Link to="/explore" onClick={() => setMenuOpen(false)}>{t('Explore')}</Link>
            <Link to="/planner" onClick={() => setMenuOpen(false)}>{t('Smart Trip Planner')}</Link>
            <Link to="/buddies" onClick={() => setMenuOpen(false)}>{t('Travel Buddy')}</Link>
            <Link to="/experiences" onClick={() => setMenuOpen(false)}>{t('Local Experiences')}</Link>
          </nav>
          <div className="nav-actions">
            <label className="language-select">
              <Languages size={16} />
              <select aria-label={t('Display language')} value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
                <option>English</option><option>हिन्दी</option>
              </select>
              <ChevronDown size={14} />
            </label>
            {user ? (
              <button className="profile-button" onClick={() => navigate('/profile')}><CircleUserRound size={17} /> {user.name.split(' ')[0]}</button>
            ) : (
              <button className="login-button" onClick={() => navigate('/login')}><LogIn size={16} /> {t('Login')}</button>
            )}
          </div>
        </div>
      </header>

      <main id="main-content">
        <Routes>
          <Route path="/" element={<Home notify={notify} />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/destination/:id" element={<DestinationDetails notify={notify} />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/planner" element={<TripPlanner notify={notify} />} />
          <Route path="/buddies" element={<TravelBuddies notify={notify} />} />
          <Route path="/experiences" element={<LocalExperiences />} />
          <Route path="/hotels" element={<HotelsPage />} />
          <Route path="/about" element={<InformationPage page="about" />} />
          <Route path="/privacy" element={<InformationPage page="privacy" />} />
          <Route path="/terms" element={<InformationPage page="terms" />} />
          <Route path="/feedback" element={<FeedbackPage notify={notify} />} />
          <Route path="/login" element={<AuthPage mode="login" notify={notify} />} />
          <Route path="/signup" element={<AuthPage mode="signup" notify={notify} />} />
          <Route path="/forgot" element={<AuthPage mode="forgot" notify={notify} />} />
          <Route path="/profile" element={user ? <Profile user={user} logout={logout} notify={notify} /> : <Navigate to="/login" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <Footer />
      {toast && <div className="toast" key={toast.id}><Check size={18} /> {toast.text}</div>}
    </div>
    </LanguageContext.Provider>
  )
}

function Home({ notify }: { notify: (text:string)=>void }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [date, setDate] = useState('')
  const [travellers, setTravellers] = useState('2')
  const [today] = useState(() => new Date().toISOString().slice(0, 10))
  const [saved, setSaved] = useStored<string[]>('ym-saved-destinations', [])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const query = new URLSearchParams()
    if (search.trim()) query.set('destination', search.trim())
    if (date) query.set('date', date)
    query.set('travelers', travellers)
    navigate(`/planner?${query.toString()}`)
  }

  const categories = [
    { name:'Historical Places', icon:Landmark, color:'#C95D2D' },
    { name:'Forts & Palaces', icon:Compass, color:'#A6532B' },
    { name:'Religious Places', icon:Sparkles, color:'#D3A64D' },
    { name:'Lakes & Nature', icon:Mountain, color:'#4F7D76' },
    { name:'Local Food', icon:Utensils, color:'#C56B3D' },
    { name:'Shopping & Handicrafts', icon:ShoppingBag, color:'#7A6A50' },
    { name:'Hidden Gems', icon:Eye, color:'#58658A' },
  ]

  return (
    <>
      <section className="hero-section">
        <AssetImage record={getImageRecord('hawa-mahal')} className="hero-image" showCredit={false} />
        <div className="hero-overlay" />
        <div className="hero-content">
          <div className="eyebrow"><MapPin size={16} /> {t('Rajasthan, India')}</div>
          <h1>{t('Discover Rajasthan')}<br /><em>{t('Like Never Before')}</em></h1>
          <p>{t('Your smart companion for heritage, culture, food and unforgettable journeys.')}</p>
          <form className="search-box" onSubmit={submit}>
            <label><span>{t('Where to?')}</span><div><MapPin size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t('Search a destination')} list="home-destinations" /><datalist id="home-destinations">{[...new Set(destinations.flatMap((destination) => [destination.city, destination.name]))].map((name) => <option value={name} key={name}/>)}</datalist></div></label>
            <label><span>{t('Travel date')}</span><div><CalendarDays size={18}/><input type="date" aria-label={t('Travel date')} min={today} value={date} onChange={e=>setDate(e.target.value)} /></div></label>
            <label><span>{t('Travellers')}</span><div><Users size={18}/><select aria-label={t('Travellers')} value={travellers} onChange={e=>setTravellers(e.target.value)}><option value="1">{t('1 Guest')}</option><option value="2">{t('2 Guests')}</option><option value="3">{t('3 Guests')}</option><option value="4">{t('4 Guests')}</option><option value="5">{t('5+ Guests')}</option></select></div></label>
            <button type="submit"><Search size={19}/> {t('Search')}</button>
          </form>
          <Link className="hero-plan-link" to="/planner">{t('Open the trip planner')} <ArrowRight size={15}/></Link>
        </div>
      </section>

      <section className="section popular-section">
        <div className="section-heading"><div><span className="kicker">{t('EXPLORE RAJASTHAN')}</span><h2>{t('Popular Destinations')}</h2></div><Link to="/explore" className="text-link">{t('View all')} <ArrowRight size={16}/></Link></div>
        <div className="destination-strip">
          {destinations.slice(0,6).map((d,i)=>(
            <article className={`destination-card ${i===0?'tall':''}`} key={d.id}>
              <Link className="destination-card-link" to={`/destination/${d.id}`} aria-label={`${d.name}, ${d.city}`}>
                <AssetImage record={d.image} showCredit={false} />
                <div className="card-shade"/>
                <div className="destination-card-info"><span>{d.city}</span><h3>{d.name}</h3><p><Star size={14} fill="currentColor"/> {d.rating} <b>•</b> {t(d.duration)}</p></div>
              </Link>
              <button className="save-float" onClick={()=>{const wasSaved=saved.includes(d.id);setSaved(wasSaved?saved.filter((id)=>id!==d.id):[...saved,d.id]);notify(t(wasSaved?'Removed from saved destinations':'Saved destination'))}} aria-pressed={saved.includes(d.id)} aria-label={`${t(saved.includes(d.id)?'Remove saved destination':'Save destination')}: ${d.name}`}><Heart size={18} fill={saved.includes(d.id)?'currentColor':'none'}/></button>
            </article>
          ))}
        </div>
      </section>

      <section className="section category-section">
        <div className="section-heading centered"><div><span className="kicker">{t('FIND YOUR EXPERIENCE')}</span><h2>{t('Explore by Category')}</h2></div></div>
        <div className="category-grid">
          {categories.map(({name,icon:Icon,color})=>(
            <Link className="category-card" to={`/explore?category=${encodeURIComponent(name==='Local Food'?'Food':name)}`} key={name}>
              <span style={{background:`${color}16`, color}}><Icon size={28}/></span>
              <strong>{t(name)}</strong>
              <ArrowRight size={17}/>
            </Link>
          ))}
        </div>
      </section>

      <section className="experience-feature">
        <div className="section-heading"><div><span className="kicker">{t('CURATED FOR YOU')}</span><h2>{t('Featured Experiences')}</h2></div><Link to="/experiences" className="text-link">{t('Explore experiences')} <ArrowRight size={16}/></Link></div>
        <div className="feature-grid">
          {[
            ['Desert Safari','Jaisalmer','sam-sand-dunes','Adventure'],
            ['Traditional Rajasthani Food','Jaipur','dal-baati-churma','Food'],
            ['Cultural Festivals','Across Rajasthan','cultural-festivals','Culture'],
          ].map(([title,city,imageId,tag])=>(
            <Link className="feature-card" to="/experiences" key={title}>
              <AssetImage record={getImageRecord(imageId)} label={title} kind={tag === 'Food' ? 'food' : undefined} showCredit={tag === 'Food'} />
              <span className="feature-tag">{t(tag)}</span>
              <div><h3>{title}</h3><p><MapPin size={14}/>{city}</p></div>
            </Link>
          ))}
        </div>
      </section>

      <section className="smart-section">
        <div className="smart-copy"><span className="kicker light">{t('YOUR SMART TRAVEL COMPANION')}</span><h2>{t('Everything you need,')}<br/>{t('beautifully connected.')}</h2></div>
        <div className="smart-cards">
          <Link to="/explore"><span><Landmark/></span><div><strong>{t('Destination & Heritage Details')}</strong><p>{t('Explore destination histories, cultural details and visitor information.')}</p></div></Link>
          <Link to="/planner"><span><Sparkles/></span><div><strong>{t('Personalized Planner')}</strong><p>{t('Build a practical itinerary around your interests.')}</p></div></Link>
          <Link to="/buddies"><span><Users/></span><div><strong>{t('Travel Buddy')}</strong><p>{t('Meet compatible travellers before your journey.')}</p></div></Link>
          <Link to="/map"><span><Languages/></span><div><strong>{t('Multilingual Guides')}</strong><p>{t('Explore heritage in English or Hindi.')}</p></div></Link>
        </div>
      </section>
    </>
  )
}

function Explore() {
  const { t } = useI18n()
  const params = new URLSearchParams(window.location.search)
  const [query,setQuery] = useState(params.get('q') || '')
  const [category,setCategory] = useState(params.get('category') || 'All')
  const [sort,setSort] = useState('Popularity')
  const [view,setView] = useState<'grid'|'list'>('grid')
  const [budget,setBudget] = useState('All')

  const filtered = useMemo(()=>{
    let result = destinations.filter(d=>{
      const matchesQuery = `${d.name} ${d.city} ${d.category}`.toLowerCase().includes(query.toLowerCase())
      const matchesCategory = category==='All'||d.category===category
      const matchesBudget = budget==='All'||(budget==='Free'&&d.ticket===0)||(budget==='Under ₹200'&&d.ticket<=200)||(budget==='Over ₹200'&&d.ticket>200)
      return matchesQuery&&matchesCategory&&matchesBudget
    })
    if(sort==='Rating') result=[...result].sort((a,b)=>b.rating-a.rating)
    if(sort==='Visiting time') result=[...result].sort((a,b)=>parseInt(a.duration)-parseInt(b.duration))
    return result
  },[query,category,budget,sort])

  return (
    <div className="page">
      <div className="page-hero compact"><div><span className="kicker">{t('DISCOVER RAJASTHAN')}</span><h1>{t('Explore Destinations')}</h1></div></div>
      <div className="container">
        <div className="explore-toolbar">
          <div className="search-inline"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t('Search city, destination or category')}/></div>
          <select aria-label={t('Category')} value={category} onChange={e=>setCategory(e.target.value)}><option value="All">{t('All')}</option><option value="Forts & Palaces">{t('Forts & Palaces')}</option><option value="Historical Places">{t('Historical Places')}</option><option value="Religious Places">{t('Religious Places')}</option><option value="Lakes & Nature">{t('Lakes & Nature')}</option></select>
          <select aria-label={t('Budget')} value={budget} onChange={e=>setBudget(e.target.value)}><option value="All">{t('All')}</option><option value="Free">{t('Free')}</option><option value="Under ₹200">{t('Under ₹200')}</option><option value="Over ₹200">{t('Over ₹200')}</option></select>
          <select aria-label={t('Sort by')} value={sort} onChange={e=>setSort(e.target.value)}><option value="Popularity">{t('Popularity')}</option><option value="Rating">{t('Rating')}</option><option value="Visiting time">{t('Visiting time')}</option></select>
          <div className="view-toggle"><button className={view==='grid'?'active':''} onClick={()=>setView('grid')}><Grid3X3 size={17}/></button><button className={view==='list'?'active':''} onClick={()=>setView('list')}><List size={18}/></button></div>
        </div>
        <div className="results-meta"><strong>{filtered.length}</strong> {t('destinations found')}</div>
        <div className={view==='grid'?'explore-grid':'explore-list'}>
          {filtered.map(d=><DestinationCard d={d} key={d.id} list={view==='list'}/>)}
        </div>
        {filtered.length===0&&<div className="empty-state"><Compass size={42}/><h3>{t('No destinations found')}</h3><p>{t('Try another search or clear one of the filters.')}</p><button onClick={()=>{setQuery('');setCategory('All');setBudget('All')}}>{t('Clear filters')}</button></div>}
      </div>
    </div>
  )
}

function DestinationCard({d,list=false}:{d:Destination;list?:boolean}) {
  const { language, t } = useI18n()
  const localized=localizedDestination(d,language)
  const [saved,setSaved]=useStored<string[]>('ym-saved-destinations',[])
  const isSaved=saved.includes(d.id)
  const toggle=()=>setSaved(isSaved?saved.filter(id=>id!==d.id):[...saved,d.id])
  return (
    <article className={list?'destination-card-list':'destination-card-full'}>
      <div className="dc-image"><Link className="destination-image-link" to={`/destination/${localized.id}`} aria-label={`${t('View Details')}: ${localized.name}`}><AssetImage record={localized.image} showCredit={false}/></Link><button type="button" onClick={toggle} className={isSaved?'saved':''} aria-pressed={isSaved} aria-label={`${t(isSaved?'Remove saved destination':'Save destination')}: ${localized.name}`}><Heart size={17} fill={isSaved?'currentColor':'none'}/></button></div>
      <div className="dc-content">
        <div className="dc-top"><span className="category-pill">{t(localized.category)}</span><span className="rating"><Star size={14} fill="currentColor"/>{localized.rating}</span></div>
        <h3><Link to={`/destination/${localized.id}`}>{localized.name}</Link></h3><p className="location"><MapPin size={14}/>{localized.city}, {t('Rajasthan, India')}</p>
        <p className="dc-description">{localized.description}</p>
        <div className="dc-meta"><span><Ticket size={15}/>{localized.ticket===0?t('Free'):`₹${localized.ticket}`}</span><span><Clock3 size={15}/>{t(localized.hours)}</span></div>
        <div className="dc-actions"><Link className="primary-small" to={`/destination/${localized.id}`}>{t('View Details')}</Link><a className="map-action" href={`https://www.google.com/maps/search/?api=1&query=${localized.lat},${localized.lng}`} target="_blank" rel="noreferrer"><MapPin size={15}/> {t('Map')}</a></div>
      </div>
    </article>
  )
}

function DestinationDetails({notify}:{notify:(text:string)=>void}) {
  const { language, t } = useI18n()
  const {id}=useParams()
  const foundDestination=destinations.find(item=>item.id===id)
  const d=localizedDestination(foundDestination??destinations[0], language)
  const [saved,setSaved]=useStored<string[]>('ym-saved-destinations',[])
  const isSaved=saved.includes(d.id)
  const [audioState,setAudioState]=useState<'idle'|'playing'|'paused'>('idle')
  const [previewOpen,setPreviewOpen]=useState(false)
  const narrationRef=useRef<SpeechSynthesisUtterance|null>(null)
  const previewTriggerRef=useRef<HTMLButtonElement|null>(null)
  const previewCloseRef=useRef<HTMLButtonElement|null>(null)
  const nearbyDestinations=destinations.filter((destination)=>destination.city===d.city&&destination.id!==d.id)

  useEffect(()=>()=>{window.speechSynthesis?.cancel()},[id])
  useEffect(()=>{
    if(!previewOpen)return
    const previousOverflow=document.body.style.overflow
    const previewTrigger=previewTriggerRef.current
    const closeOnEscape=(event:KeyboardEvent)=>{if(event.key==='Escape')setPreviewOpen(false)}
    document.body.style.overflow='hidden'
    document.addEventListener('keydown',closeOnEscape)
    previewCloseRef.current?.focus()
    return ()=>{document.body.style.overflow=previousOverflow;document.removeEventListener('keydown',closeOnEscape);previewTrigger?.focus()}
  },[previewOpen])

  const playNarration=()=>{
    if(!('speechSynthesis' in window)){notify(t('Audio narration is not supported by this browser'));return}
    if(audioState==='paused'&&narrationRef.current){window.speechSynthesis.resume();setAudioState('playing');return}
    if(audioState==='playing'){window.speechSynthesis.pause();setAudioState('paused');return}
    const utterance=new SpeechSynthesisUtterance(`${d.name}. ${d.history} ${d.architecture} ${d.culture}`)
    utterance.lang=language==='हिन्दी'?'hi-IN':'en-IN'
    utterance.onend=()=>{narrationRef.current=null;setAudioState('idle')}
    utterance.onerror=()=>{narrationRef.current=null;setAudioState('idle')}
    narrationRef.current=utterance
    window.speechSynthesis.speak(utterance)
    setAudioState('playing')
  }

  const stopNarration=()=>{
    window.speechSynthesis?.cancel()
    narrationRef.current=null
    setAudioState('idle')
  }

  if(!foundDestination)return <NotFound/>

  return (
    <div className="page destination-page">
      <div className="detail-hero">
        <AssetImage record={d.image} className="detail-hero-image" showCredit={false}/>
        <div className="detail-hero-shade"/>
        <div className="container"><Link className="back-link" to="/explore"><ArrowLeft size={16}/> {t('Back to explore')}</Link><div className="detail-hero-copy"><span>{t(d.category)}</span><h1>{d.name}</h1><p><MapPin size={16}/>{d.city}, {t('Rajasthan, India')} <b>•</b> <Star size={16} fill="currentColor"/> {d.rating}</p></div></div>
      </div>
      <div className="container detail-layout">
        <article className="detail-main">
          <div className="detail-actions">
            <button className={isSaved?'saved':''} onClick={()=>{setSaved(isSaved?saved.filter(x=>x!==d.id):[...saved,d.id]);notify(t(isSaved?'Removed from saved destinations':'Saved destination'))}}><Heart size={17} fill={isSaved?'currentColor':'none'}/> {t(isSaved?'Saved':'Save')}</button>
            <Link to="/map"><MapPin size={17}/> {t('View on map')}</Link>
            <button onClick={()=>{navigator.clipboard?.writeText(window.location.href);notify(t('Destination link copied'))}}><Share2 size={17}/> {t('Share')}</button>
          </div>
          <section><h2>{language === 'हिन्दी' ? `${d.name} का परिचय` : `${t('About')} ${d.name}`}</h2><p>{d.history}</p></section>
          <section className="detail-two-col"><div><h3>{t('Architecture')}</h3><p>{d.architecture}</p></div><div><h3>{t('Cultural Importance')}</h3><p>{d.culture}</p></div></section>
          <section className="detail-two-col"><div><h3>{t('Best time to visit')}</h3><p>{t('October to March is generally more comfortable for sightseeing across Rajasthan. Check a current forecast and venue notices before travel.')}</p></div><div><h3>{t('Visitor tips')}</h3><p>{t('Opening hours, weekly closures and sample ticket prices may change. Confirm with the venue, follow posted access and photography rules, and carry water and sun protection.')}</p></div></section>
          <section><h2>{t('Nearby attractions')}</h2>{nearbyDestinations.length?<ul className="nearby-destinations">{nearbyDestinations.map((destination)=><li key={destination.id}><Link to={`/destination/${destination.id}`}>{localizedContent(language,'destinations',destination.id,'name',destination.name)}</Link><span>{destination.city}</span></li>)}</ul>:<p>{t('No other listed attractions in this city.')}</p>}</section>
          <section className="gallery"><h2>{t('Photography')}</h2><p>{t('One verified photograph is available for this listing; a multi-photo gallery is not available yet.')}</p><button ref={previewTriggerRef} type="button" className="destination-photo-preview" aria-label={`${t('Preview photo')}: ${d.name}`} onClick={()=>setPreviewOpen(true)}><AssetImage record={d.image} showCredit={false}/></button>{d.image.source_url&&<p className="photo-source-link">{t('Photo source')}: <a href={d.image.source_url} target="_blank" rel="noreferrer">{d.image.source_name}</a>{d.image.author&&<> · {d.image.author}</>}{d.image.license&&<> · {d.image.license_url?<a href={d.image.license_url} target="_blank" rel="noreferrer">{d.image.license}</a>:d.image.license}</>}</p>}</section>
        </article>
        <aside className="detail-aside">
          <div className="info-card"><h3>{t('Visitor Information')}</h3><div><span><Clock3/>{t('Sample hours')}</span><strong>{t(d.hours)}</strong></div><div><span><CalendarDays/>{t('Closure notes')}</span><strong>{t(d.closed)}</strong></div><div><span><Ticket/>{t('Sample Indian ticket')}</span><strong>{d.ticket===0?t('Free (verify)'):`₹${d.ticket} ${t('(verify)')}`}</strong></div><div><span><Globe2/>{t('Foreign ticket')}</span><strong>{d.foreignTicket !== undefined ? `₹${d.foreignTicket} ${t('(verify)')}` : t('Not available; verify')}</strong></div><div><span><Ticket/>{t('Booking information')}</span><strong>{t('No official booking integration; confirm directly with the venue.')}</strong></div><div><span><MapPin/>{t('Transport distance')}</span><strong>{t('Not verified; check directions in Google Maps.')}</strong></div><div><span><Clock3/>{t('Visit duration')}</span><strong>{t(d.duration)} {t('suggested')}</strong></div></div>
          <div className="audio-card"><div className="audio-head"><span><Volume2 size={19}/></span><div><strong>{t('Audio Guide')}</strong><small>{language === 'हिन्दी' ? 'हिन्दी वर्णन · डेमो' : 'English narration · Demo'}</small></div></div><div className="audio-controls"><button aria-label={t(audioState==='playing'?'Pause narration':'Play narration')} onClick={playNarration}>{audioState==='playing'?<Pause size={18}/>:<Play size={18}/>} {t(audioState==='playing'?'Pause':audioState==='paused'?'Resume narration':'Play narration')}</button><button type="button" aria-label={t('Stop narration')} onClick={stopNarration} disabled={audioState==='idle'}><X size={16}/>{t('Stop')}</button></div></div>
          <a className="destination-map-link" href={`https://www.google.com/maps/search/?api=1&query=${d.lat},${d.lng}`} target="_blank" rel="noreferrer"><MapPin size={16}/> {t('Open location in Google Maps')} <ExternalLink size={14}/></a>
        </aside>
      </div>
      {previewOpen&&<div className="experience-lightbox" role="presentation" onClick={(event)=>{if(event.target===event.currentTarget)setPreviewOpen(false)}}><div className="lightbox-dialog destination-lightbox" role="dialog" aria-modal="true" aria-label={`${t('Image preview')}: ${d.name}`}><button ref={previewCloseRef} type="button" className="lightbox-close" onClick={()=>setPreviewOpen(false)} aria-label={t('Close image preview')}><X/></button><div className="lightbox-image-wrap"><AssetImage record={d.image} label={d.name} className="lightbox-image"/></div><div className="lightbox-caption"><h2>{d.name}</h2><p>{t('Verified destination photograph')}</p></div></div></div>}
    </div>
  )
}

type MapPlace = {
  id: string
  name: string
  city: string
  lat: number
  lng: number
  image: ImageRecord
  type: 'Attractions'|'Hotels'|'Food'|'Shopping'
  destinationId?: string
  approximate: boolean
  detail: string
}

function MapFocus({point}:{point:[number,number]}) {
  const map=useMap()
  useEffect(()=>{map.setView(point,Math.max(map.getZoom(),10))},[map,point])
  return null
}

function MapPage() {
  const { t } = useI18n()
  const [filter,setFilter]=useState<MapPlace['type']>('Attractions')
  const [query,setQuery]=useState('')
  const [selectedId,setSelectedId]=useState('hawa-mahal')
  const [userLocation,setUserLocation]=useState<[number,number]|null>(null)
  const [locationMessage,setLocationMessage]=useState('')
  const allPlaces=useMemo<MapPlace[]>(()=>[
    ...destinations.map((destination)=>({id:destination.id,name:destination.name,city:destination.city,lat:destination.lat,lng:destination.lng,image:destination.image,type:'Attractions' as const,destinationId:destination.id,approximate:false,detail:destination.description})),
    ...hotels.flatMap((hotel)=>{const point=getKnownCityPoint(hotel.city);return point?[{id:hotel.id,name:hotel.name,city:hotel.city,lat:point.lat,lng:point.lng,image:hotel.image,type:'Hotels' as const,approximate:true,detail:'Sample hotel listing; the pin marks an approximate city centre, not the property address.'}]:[]}),
    ...experiences.flatMap((experience)=>{const point=getKnownCityPoint(experience.city);return point?[{id:experience.id,name:experience.name,city:experience.city,lat:point.lat,lng:point.lng,image:experience.image,type:experience.type==='Food'?'Food' as const:'Shopping' as const,approximate:true,detail:'Local food or craft suggestion; the pin marks an approximate city centre, not a verified vendor.'}]:[]}),
  ],[])
  const filteredPlaces=allPlaces.filter((place)=>place.type===filter&&`${place.name} ${place.city}`.toLowerCase().includes(query.toLowerCase()))
  const selected=filteredPlaces.find((place)=>place.id===selectedId)??filteredPlaces[0]
  const selectedPoint:[number,number]=selected?[selected.lat,selected.lng]:[26.9124,75.7873]
  const directionsUrl=selected?`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${selected.lat},${selected.lng}`)}`:''
  const locate=()=>{
    if(!navigator.geolocation){setLocationMessage(t('Location is not available in this browser.'));return}
    navigator.geolocation.getCurrentPosition(
      (position)=>{setUserLocation([position.coords.latitude,position.coords.longitude]);setLocationMessage(t('Your location is shown only in this browser session.'))},
      ()=>setLocationMessage(t('Location permission was denied or could not be determined.')),
      {enableHighAccuracy:false,timeout:10000,maximumAge:60000},
    )
  }
  return (
    <div className="map-page">
      <div className="map-sidebar">
        <h1 className="visually-hidden">{t('Explore Rajasthan on the map')}</h1>
        <div className="map-search"><Search size={17}/><input aria-label={t('Search Rajasthan')} value={query} onChange={(event)=>setQuery(event.target.value)} placeholder={t('Search Rajasthan')}/></div>
        <div className="map-filter">{(['Attractions','Hotels','Food','Shopping'] as const).map((type)=><button key={type} className={filter===type?'active':''} onClick={()=>{setFilter(type);setSelectedId('')}} aria-pressed={filter===type}>{type==='Attractions'?<Landmark/>:type==='Hotels'?<Hotel/>:type==='Food'?<Utensils/>:<ShoppingBag/>}{t(type)}</button>)}</div>
        <div className="map-results"><p>{filteredPlaces.length} {t('places found')}</p>
          {filteredPlaces.map((place)=>(
            <button className={selected?.id===place.id?'map-place selected':'map-place'} key={place.id} onClick={()=>setSelectedId(place.id)} aria-pressed={selected?.id===place.id}>
              <AssetImage record={place.image} kind={place.type==='Food'?'food':place.type==='Hotels'?'hotel':place.type==='Shopping'?'shopping':undefined} showCredit={false}/>
              <div><strong>{place.name}</strong><span><MapPin size={12}/>{place.city}</span>{place.approximate&&<small>{t('Approximate city location')}</small>}</div>
            </button>
          ))}
          {!filteredPlaces.length&&<p className="map-empty">{t('No matching places found.')}</p>}
        </div>
      </div>
      <div className="leaflet-wrap">
        <MapContainer className="discovery-leaflet" center={selectedPoint} zoom={7} scrollWheelZoom>
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
          {selected&&<MapFocus point={selectedPoint}/>}
          {filteredPlaces.map((place)=><CircleMarker key={place.id} center={[place.lat,place.lng]} radius={selected?.id===place.id?9:6} pathOptions={{color:'#fff',weight:2,fillColor:place.type==='Attractions'?'#d96b27':'#25345b',fillOpacity:.9}} eventHandlers={{click:()=>setSelectedId(place.id)}}><Popup><strong>{place.name}</strong><br/>{place.city}{place.approximate&&<><br/>{t('Approximate city location')}</>}</Popup></CircleMarker>)}
          {userLocation&&<CircleMarker center={userLocation} radius={8} pathOptions={{color:'#fff',weight:2,fillColor:'#237a57',fillOpacity:1}}><Popup>{t('Your location')}</Popup></CircleMarker>}
        </MapContainer>
        {selected&&<div className="map-selected-card"><AssetImage record={selected.image} showCredit={false}/><div><strong>{selected.name}</strong><span>{selected.city} · {selected.type==='Attractions'?t('Verified attraction coordinates'):t('Approximate city location')}</span><small>{selected.detail}</small><div>{selected.destinationId&&<Link to={`/destination/${selected.destinationId}`}>{t('View details')} <ArrowRight size={13}/></Link>}<a href={directionsUrl} target="_blank" rel="noreferrer">{t('Get directions')} <ExternalLink size={12}/></a></div></div></div>}
        <button className="location-button" onClick={locate}><LocateFixed size={18}/> {t('My location')}</button>
        {locationMessage&&<div className="map-location-message" role="status">{locationMessage}</div>}
        <div className="map-demo-note">{t('OpenStreetMap demo · Sample location data')}</div>
      </div>
    </div>
  )
}

function getSchedulePeriod(time: string) {
  const hour = Number(time.slice(0, 2))
  return hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening'
}

let plannerTripSequence = 0

function initialPlannerForm(): PlannerForm {
  const params=new URLSearchParams(window.location.search)
  const requestedDestination=params.get('destination')?.trim()
  const matchingDestinations=requestedDestination
    ? destinations.filter((destination)=>destination.city.toLowerCase()===requestedDestination.toLowerCase()||destination.name.toLowerCase()===requestedDestination.toLowerCase()||destination.name.toLowerCase().includes(requestedDestination.toLowerCase()))
    : []
  const requestedCities=[...new Set(matchingDestinations.map((destination)=>destination.city))]
  const start = new Date()
  start.setDate(start.getDate() + 7)
  const requestedDate=params.get('date')??''
  if(/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)&&!Number.isNaN(Date.parse(`${requestedDate}T00:00:00`)))start.setTime(new Date(`${requestedDate}T00:00:00`).getTime())
  const end = new Date(start)
  end.setDate(end.getDate() + 2)
  const dateValue = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  const requestedTravelers=Number(params.get('travelers'))
  return {
    origin: 'Jaipur',
    cities: requestedDestination ? requestedCities : ['Jaipur'],
    startDate: dateValue(start),
    endDate: dateValue(end),
    travelers: Number.isInteger(requestedTravelers)&&requestedTravelers>=1&&requestedTravelers<=20?requestedTravelers:2,
    budget: 25000,
    preferences: ['Forts and palaces', 'Historical places', 'Local food'],
    travelType: 'Family',
    pace: 'Balanced',
    transport: 'Bus',
    accommodation: 'Budget',
  }
}

function isPlannerTrip(value: unknown): value is PlannerTrip {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return typeof record.id === 'string'
    && typeof record.title === 'string'
    && Array.isArray(record.days)
    && typeof record.form === 'object'
    && record.form !== null
}

type LegacySavedTrip = {
  id: string | number
  title: string
  data: Record<string, unknown>
  created?: string
}

function isLegacySavedTrip(value: unknown): value is LegacySavedTrip {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (typeof record.id === 'string' || typeof record.id === 'number')
    && typeof record.title === 'string'
    && typeof record.data === 'object'
    && record.data !== null
}

function sameStoredTripId(value: unknown, id: string) {
  if (!value || typeof value !== 'object' || !('id' in value)) return false
  return String(value.id) === id
}

function convertLegacyTripForm(data: Record<string, unknown>): PlannerForm {
  const fallback = initialPlannerForm()
  const knownCities = getPlannerCities(destinations)
  const legacyCity = typeof data.to === 'string' ? data.to : ''
  const cities = knownCities.includes(legacyCity) ? [legacyCity] : fallback.cities
  const validDate = (value: unknown): value is string =>
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  const startDate = validDate(data.start) ? data.start : fallback.startDate
  const legacyDays = Number.parseInt(String(data.days ?? ''), 10)
  const endDate = validDate(data.end)
    ? data.end
    : (() => {
      const end = new Date(`${startDate}T00:00:00`)
      end.setDate(end.getDate() + Math.max(1, Math.min(30, Number.isFinite(legacyDays) ? legacyDays : 3)) - 1)
      const year = end.getFullYear()
      const month = String(end.getMonth() + 1).padStart(2, '0')
      const day = String(end.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    })()
  const category = String(data.category ?? '').toLowerCase()
  const travelType: PlannerForm['travelType'] = category.includes('solo')
    ? 'Solo'
    : category.includes('couple')
      ? 'Couple'
      : category.includes('friend') || category.includes('student')
        ? 'Friends'
        : 'Family'
  const transport = String(data.transport ?? '').toLowerCase()
  const interests = Array.isArray(data.interests) ? data.interests.map(String) : []
  const interestMap: Record<string, string> = {
    history: 'Historical places',
    adventure: 'Adventure',
    shopping: 'Shopping',
    food: 'Local food',
    'religious places': 'Religious places',
    nature: 'Lakes and nature',
    culture: 'Cultural experiences',
  }
  const travellers = Number.parseInt(String(data.travellers ?? ''), 10)
  const budget = Number(data.budget)
  return {
    origin: typeof data.from === 'string' && data.from.trim() ? data.from : fallback.origin,
    cities,
    startDate,
    endDate,
    travelers: Number.isInteger(travellers) && travellers > 0 && travellers <= 20 ? travellers : 2,
    budget: Number.isFinite(budget) && budget >= 0 ? budget : fallback.budget,
    preferences: [...new Set(interests.map((interest) => interestMap[interest.toLowerCase()]).filter((interest): interest is string => Boolean(interest)))],
    travelType,
    pace: 'Balanced',
    transport: transport.includes('car') || transport.includes('private')
      ? 'Private car'
      : transport.includes('taxi') || transport.includes('cab')
        ? 'Taxi'
        : transport.includes('train')
          ? 'Train'
          : 'Bus',
    accommodation: 'Budget',
  }
}

function routeDescription(route: RoadRoute | null, form: PlannerForm) {
  if (!route) {
    return form.transport === 'Bus' || form.transport === 'Train'
      ? 'Driving routes are not shown for bus or train trips. Map pins remain available; use the directions link for current transit options.'
      : 'No reliable driving route was returned. Map pins remain visible, but no distance or travel time is estimated.'
  }
  const originNote = route.origin
    ? ' The starting point uses approximate city-centre coordinates, not a live location.'
    : ' Custom starting locations are not geocoded; this route covers the selected attractions only.'
  return `OpenStreetMap driving route: ${route.distanceKm.toFixed(0)} km, about ${formatDuration(route.durationMinutes)} without live traffic.${originNote}`
}

function PlannerMapBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (!points.length) return
    if (points.length === 1) map.setView(points[0], 12)
    else map.fitBounds(points, { padding: [28, 28] })
  }, [map, points])
  return null
}

function PlannerRouteMap({ days, route }: { days: ItineraryDay[]; route: RoadRoute | null }) {
  const { t } = useI18n()
  const visits = useMemo(() => days.flatMap((day) => day.visits), [days])
  const places = useMemo<[number, number][]>(
    () => visits.map((visit) => [visit.lat, visit.lng]),
    [visits],
  )
  const allPoints = useMemo<[number, number][]>(
    () => [
      ...(route?.origin ? [[route.origin.lat, route.origin.lng] as [number, number]] : []),
      ...places,
    ],
    [places, route],
  )
  const fitPoints = useMemo<[number, number][]>(
    () => [
      ...allPoints,
      ...(route?.geometry.length ? [route.geometry[0], route.geometry[route.geometry.length - 1]] : []),
    ],
    [allPoints, route],
  )
  const center: [number, number] = allPoints[0] ?? [26.9124, 75.7873]
  return (
    <MapContainer className="planner-leaflet" center={center} zoom={7} scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <PlannerMapBounds points={fitPoints}/>
      {route && route.geometry.length > 1 && <Polyline positions={route.geometry} pathOptions={{color:'#df7a37',weight:5,opacity:0.82}}/>}
      {route?.origin && (
        <CircleMarker center={[route.origin.lat, route.origin.lng]} radius={8} pathOptions={{color:'#25345b',fillColor:'#25345b',fillOpacity:1}}>
          <Popup>{route.origin.name}</Popup>
        </CircleMarker>
      )}
      {visits.map((visit, index) => (
        <CircleMarker key={`${visit.id}-${index}`} center={[visit.lat, visit.lng]} radius={8} pathOptions={{color:'#fff',weight:2,fillColor:'#df7a37',fillOpacity:1}}>
          <Popup>
            <strong>{visit.name}</strong><br/>
            {visit.city} · {t('DAY')} {days.find((day) => day.visits.some((item) => item.id === visit.id))?.dayNumber}
            <br/><a href={`https://www.google.com/maps/search/?api=1&query=${visit.lat},${visit.lng}`} target="_blank" rel="noreferrer">{t('Open in Google Maps')}</a>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}

function TripPlanner({notify}:{notify:(text:string)=>void}) {
  const { language, t } = useI18n()
  const [form, setForm] = useState<PlannerForm>(initialPlannerForm)
  const [plan, setPlan] = useState<PlannerTrip | null>(null)
  const [storedTrips, setStoredTrips] = useStored<unknown[]>('ym-itineraries', [])
  const [user] = useStored<{name:string;email:string}|null>('ym-user', null)
  const [formError, setFormError] = useState('')
  const [storageError, setStorageError] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRefreshingRoute, setIsRefreshingRoute] = useState(false)
  const [addSelections, setAddSelections] = useState<Record<number, string>>({})
  const [savedTripNotice, setSavedTripNotice] = useState('')
  const requestSequence = useRef(0)
  const cityOptions = getPlannerCities(destinations)
  const tripDays = getTripDays(form.startDate, form.endDate)
  const validSavedTrips = storedTrips.filter(isPlannerTrip)
  const legacySavedTrips = storedTrips.filter(isLegacySavedTrip)
  const planIsStale = Boolean(plan && JSON.stringify(plan.form) !== JSON.stringify(form))
  const currentBudget = useMemo(
    () => plan ? createBudget(form, plan.days, plan.route, hotels) : null,
    [form, plan],
  )

  function updateField<Key extends keyof PlannerForm>(key: Key, value: PlannerForm[Key]) {
    setForm((current) => ({...current, [key]: value}))
    setFormError('')
    setSavedTripNotice('')
  }

  function toggleCity(city: string) {
    setForm((current) => ({
      ...current,
      cities: current.cities.includes(city)
        ? current.cities.filter((selected) => selected !== city)
        : [...current.cities, city],
    }))
    setFormError('')
    setSavedTripNotice('')
  }

  function togglePreference(preference: string) {
    setForm((current) => ({
      ...current,
      preferences: current.preferences.includes(preference)
        ? current.preferences.filter((selected) => selected !== preference)
        : [...current.preferences, preference],
    }))
    setFormError('')
    setSavedTripNotice('')
  }

  async function generateItinerary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSavedTripNotice('')
    const error = validatePlannerForm(form, tripDays)
    if (error) {
      setFormError(t(error))
      return
    }
    const requestId = ++requestSequence.current
    setIsGenerating(true)
    setFormError('')
    let route: RoadRoute | null = null
    let routeMessage = ''
    const candidates = selectPlannerDestinations(form, destinations, hotels)
    if (!candidates.length) {
      setFormError(t('No listed attractions matched these cities. Select another destination and try again.'))
      setIsGenerating(false)
      return
    }
    if (form.transport === 'Private car' || form.transport === 'Taxi') {
      setIsRefreshingRoute(true)
      try {
        route = await fetchDrivingRoute(form.origin, candidates)
        routeMessage = route
          ? routeDescription(route, form)
          : 'The routing service needs at least two mapped locations. Map pins remain available; no route time or distance is shown.'
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'Unknown routing error.'
        routeMessage = `Driving route unavailable: ${detail} The itinerary is still usable; route distance and time are not estimated.`
      } finally {
        setIsRefreshingRoute(false)
      }
    } else {
      routeMessage = routeDescription(null, form)
    }
    if (requestId !== requestSequence.current) return
    const savedForm: PlannerForm = {
      ...form,
      cities: [...form.cities],
      preferences: [...form.preferences],
    }
    let activeRoute = route
    let activeRouteMessage = routeMessage
    let days = buildItineraryDays(savedForm, candidates, activeRoute)
    const scheduledIds = new Set(days.flatMap((day) => day.visits.map((visit) => visit.id)))
    if (activeRoute && scheduledIds.size !== candidates.length) {
      const scheduledStops = days.flatMap((day) => day.visits)
        .map((visit) => destinations.find((destination) => destination.id === visit.id))
        .filter((destination): destination is Destination => Boolean(destination))
      setIsRefreshingRoute(true)
      try {
        activeRoute = await fetchDrivingRoute(savedForm.origin, scheduledStops)
        if (activeRoute) {
          days = buildItineraryDays(savedForm, scheduledStops, activeRoute)
          activeRouteMessage = routeDescription(activeRoute, savedForm)
        } else {
          activeRouteMessage = 'The route service could not map the final scheduled stops. Map pins remain visible; no route distance or travel time is shown.'
          days = buildItineraryDays(savedForm, scheduledStops, null)
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'Unknown routing error.'
        activeRoute = null
        activeRouteMessage = `Driving route unavailable for the final scheduled stops: ${detail} No route distance or travel time is shown.`
        days = buildItineraryDays(savedForm, scheduledStops, null)
      } finally {
        setIsRefreshingRoute(false)
      }
    }
    if (requestId !== requestSequence.current) return
    const title = `${savedForm.cities.join(' + ')} · ${tripDays} day${tripDays === 1 ? '' : 's'}`
    const id = typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${++plannerTripSequence}`
    const expenses = createBudget(savedForm, days, activeRoute, hotels)
    setPlan({
      id,
      title,
      userId: user?.email ? `demo:${user.email.toLowerCase()}` : null,
      form: savedForm,
      days,
      route:activeRoute,
      routeMessage:activeRouteMessage,
      createdAt: new Date().toISOString(),
      estimatedExpenses: expenses,
    })
    notify(t('Your personalized itinerary is ready'))
    window.setTimeout(() => document.getElementById('planner-result')?.scrollIntoView({behavior:'smooth',block:'start'}), 0)
    setIsGenerating(false)
  }

  function updatePlanDays(nextDays: ItineraryDay[]) {
    if (!plan) return
    const requestId = ++requestSequence.current
    const snapshotForm = plan.form
    const baseDays = rescheduleExistingDays(nextDays, null)
    const canRoute = snapshotForm.transport === 'Private car' || snapshotForm.transport === 'Taxi'
    const basePlan: PlannerTrip = {
      ...plan,
      form: snapshotForm,
      days: baseDays,
      route: null,
      routeMessage: canRoute
        ? t('Refreshing the driving route after your itinerary edit…')
        : routeDescription(null, snapshotForm),
      estimatedExpenses: createBudget(snapshotForm, baseDays, null, hotels),
    }
    setPlan(basePlan)
    setSavedTripNotice('')
    if (!canRoute) return
    setIsRefreshingRoute(true)
    const changedStops = baseDays.flatMap((day) =>
      day.visits.map((visit) => destinations.find((destination) => destination.id === visit.id)).filter((destination): destination is Destination => Boolean(destination)),
    )
    void fetchDrivingRoute(snapshotForm.origin, changedStops).then((route) => {
      if (requestId !== requestSequence.current) return
      const days = rescheduleExistingDays(baseDays, route)
      setPlan((current) => current?.id === basePlan.id
        ? {
          ...current,
          days,
          route,
          routeMessage: route
            ? routeDescription(route, snapshotForm)
            : t('No reliable driving route was returned after this edit. Map pins remain visible; no distance or travel time is estimated.'),
          estimatedExpenses: createBudget(snapshotForm, days, route, hotels),
        }
        : current)
    }).catch((error: unknown) => {
      if (requestId !== requestSequence.current) return
      const detail = error instanceof Error ? error.message : 'Unknown routing error.'
      setPlan((current) => current?.id === basePlan.id
        ? {...current, route: null, routeMessage:`Driving route unavailable after this edit: ${detail} No route distance or travel time is shown.`}
        : current)
    }).finally(() => {
      if (requestId === requestSequence.current) setIsRefreshingRoute(false)
    })
  }

  function moveVisit(dayIndex: number, visitIndex: number, direction: -1 | 1) {
    if (!plan) return
    const nextDays = plan.days.map((day, index) => {
      if (index !== dayIndex) return day
      const visits = [...day.visits]
      const nextIndex = visitIndex + direction
      if (nextIndex < 0 || nextIndex >= visits.length) return day
      ;[visits[visitIndex], visits[nextIndex]] = [visits[nextIndex], visits[visitIndex]]
      return {...day, visits}
    })
    updatePlanDays(nextDays)
  }

  function removeVisit(dayIndex: number, visitId: string) {
    if (!plan) return
    updatePlanDays(plan.days.map((day, index) =>
      index === dayIndex ? {...day, visits:day.visits.filter((visit) => visit.id !== visitId)} : day,
    ))
  }

  function regenerateDay(dayIndex: number) {
    if (!plan) return
    const day = plan.days[dayIndex]
    if (!day) return
    const existingElsewhere = new Set(plan.days.flatMap((current, index) =>
      index === dayIndex ? [] : current.visits.map((visit) => visit.id),
    ))
    const currentDayIds = new Set(day.visits.map((visit) => visit.id))
    const cityForm = {...plan.form, cities:[day.city]}
    const preferred = selectPlannerDestinations(cityForm, destinations, hotels)
      .filter((destination) => !currentDayIds.has(destination.id))
    const remaining = destinations
      .filter((destination) => destination.city === day.city
        && !currentDayIds.has(destination.id))
      .sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id))
    const unplanned = [...preferred, ...remaining]
      .filter((destination, index, list) => !existingElsewhere.has(destination.id)
        && list.findIndex((item) => item.id === destination.id) === index)
    const scheduledElsewhere = [...preferred, ...remaining]
      .filter((destination, index, list) => existingElsewhere.has(destination.id)
        && list.findIndex((item) => item.id === destination.id) === index)
    const alternatives = [...unplanned, ...scheduledElsewhere]
    if (!alternatives.length) {
      notify(t(`No alternative listed attractions are available for ${day.city}.`))
      return
    }
    const visitCount = Math.min(Math.max(1, day.visits.length), alternatives.length)
    const replacementVisits = alternatives.slice(0, visitCount).map((destination) => ({
      ...destination,
      arrival: '09:00',
      departure: '11:00',
      visitMinutes: getVisitDuration(destination, plan.form.pace, plan.form.travelType),
      travelMinutes: null,
      travelDistanceKm: null,
    }))
    const movedIdsByDay = new Map<number, Set<string>>()
    const displacedVisitsByDay = new Map<number, PlannedVisit[]>()
    replacementVisits.forEach((replacement, index) => {
      const sourceDayIndex = plan.days.findIndex((current, sourceIndex) =>
        sourceIndex !== dayIndex
        && current.city === day.city
        && current.visits.some((visit) => visit.id === replacement.id),
      )
      const displacedVisit = day.visits[index]
      if (sourceDayIndex < 0 || !displacedVisit) return
      const movedIds = movedIdsByDay.get(sourceDayIndex) ?? new Set<string>()
      movedIds.add(replacement.id)
      movedIdsByDay.set(sourceDayIndex, movedIds)
      const displaced = displacedVisitsByDay.get(sourceDayIndex) ?? []
      displaced.push(displacedVisit)
      displacedVisitsByDay.set(sourceDayIndex, displaced)
    })
    updatePlanDays(plan.days.map((current, index) => {
      if (index === dayIndex) return {...current, visits:replacementVisits}
      const movedIds = movedIdsByDay.get(index)
      const displaced = displacedVisitsByDay.get(index) ?? []
      return movedIds || displaced.length
        ? {...current, visits:[...current.visits.filter((visit) => !movedIds?.has(visit.id)), ...displaced]}
        : current
    }))
    notify(t(`Day ${day.dayNumber} regenerated${movedIdsByDay.size ? ' by swapping attractions with another day' : ''}.`))
  }

  function addVisit(dayIndex: number) {
    if (!plan) return
    const destinationId = addSelections[dayIndex]
    const destination = destinations.find((item) => item.id === destinationId)
    const day = plan.days[dayIndex]
    if (!destination || !day || destination.city !== day.city) return
    const visit: PlannedVisit = {
      ...destination,
      arrival: '09:00',
      departure: '11:00',
      visitMinutes: getVisitDuration(destination, plan.form.pace, plan.form.travelType),
      travelMinutes: null,
      travelDistanceKm: null,
    }
    updatePlanDays(plan.days.map((current, index) =>
      index === dayIndex ? {...current, visits:[...current.visits, visit]} : current,
    ))
    setAddSelections((current) => ({...current, [dayIndex]:''}))
  }

  function saveTrip() {
    if (!plan || !currentBudget || planIsStale) return
    const trip = {...plan, form, estimatedExpenses:currentBudget}
    try {
      setStoredTrips([trip, ...storedTrips.filter((item) => !sameStoredTripId(item, trip.id))])
      setStorageError('')
      setSavedTripNotice(t('Trip saved on this device. No live bookings or ticket reservations were made.'))
      notify(t('Trip saved'))
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Browser storage is unavailable.'
      setStorageError(t(`Could not save this trip: ${detail}`))
    }
  }

  function loadSavedTrip(trip: PlannerTrip) {
    const savedForm: PlannerForm = {
      ...initialPlannerForm(),
      ...trip.form,
      accommodation: trip.form.accommodation ?? 'Budget',
    }
    setForm(savedForm)
    setPlan({...trip, form: savedForm})
    setFormError('')
    setStorageError('')
    setSavedTripNotice(t('Saved trip loaded.'))
  }

  function loadLegacyTrip(trip: LegacySavedTrip) {
    setForm(convertLegacyTripForm(trip.data))
    setPlan(null)
    setFormError('')
    setStorageError('')
    setSavedTripNotice(t('Earlier trip details loaded. Generate a new itinerary to view and edit its schedule.'))
  }

  function deleteSavedTrip(id: string) {
    try {
      setStoredTrips(storedTrips.filter((trip) => !sameStoredTripId(trip, id)))
      setStorageError('')
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Browser storage is unavailable.'
      setStorageError(t(`Could not remove this saved trip: ${detail}`))
    }
  }

  function downloadTrip() {
    if (!plan || !currentBudget || planIsStale) return
    const file = new Blob([JSON.stringify({...plan, form, estimatedExpenses:currentBudget}, null, 2)], {type:'application/json'})
    const url = URL.createObjectURL(file)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'yatramitra-itinerary.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const allPlannedIds = new Set(plan?.days.flatMap((day) => day.visits.map((visit) => visit.id)) ?? [])
  const plannedVisits = plan?.days.flatMap((day) => day.visits) ?? []
  const googleDirectionsUrl = plan && plannedVisits.length
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(form.origin)}&destination=${encodeURIComponent(plannedVisits[plannedVisits.length - 1].name + ', ' + plannedVisits[plannedVisits.length - 1].city)}&waypoints=${encodeURIComponent(plannedVisits.slice(0, -1).map((visit) => `${visit.name}, ${visit.city}`).join('|'))}&travelmode=${form.transport === 'Bus' || form.transport === 'Train' ? 'transit' : 'driving'}`
    : ''
  const osmDirectionsUrl = plan?.route && plannedVisits.length > 1
    ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${[
      ...(plan.route.origin ? [`${plan.route.origin.lat},${plan.route.origin.lng}`] : []),
      ...plannedVisits.map((visit) => `${visit.lat},${visit.lng}`),
    ].join(';')}`
    : ''
  const tripNights = Math.max(0, (plan?.days.length ?? 0) - 1)
  const tripRooms = Math.ceil(form.travelers / 2)

  return (
    <div className="page planner-page">
      <div className="planner-head"><div><span className="kicker">{t('SMART TRIP PLANNER')}</span><h1>{t('Plan your Rajasthan journey')}</h1><p>{t('Build a day-wise plan around your dates, destinations, budget and interests.')}</p></div><div className="planner-badge"><Sparkles size={20}/><span><strong>{t('Personalized itinerary')}</strong><small>{t('Estimates only · no bookings')}</small></span></div></div>
      <div className="container planner-layout">
        <aside className="planner-form-card">
          <h2>{t('Trip details')}</h2>
          <form onSubmit={generateItinerary}>
            <label>{t('Starting location')}
              <input aria-label={t('Starting location')} list="planner-origin-options" value={form.origin} onChange={(event) => updateField('origin', event.target.value)} placeholder={t('City or starting area')} required/>
              <datalist id="planner-origin-options">{['Delhi', ...cityOptions].map((city) => <option value={city} key={city}/>)}</datalist>
            </label>
            <fieldset>
              <legend>{t('Rajasthan destinations')}</legend>
              <p className="planner-field-hint">{t('Choose one or more cities; dates determine the number of itinerary days.')}</p>
              <div className="interest-chips planner-city-chips">
                {cityOptions.map((city) => (
                  <button type="button" key={city} aria-pressed={form.cities.includes(city)} className={form.cities.includes(city)?'active':''} onClick={() => toggleCity(city)}>
                    {form.cities.includes(city) && <Check size={13}/>} {city}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="form-grid">
              <label>{t('Travel start date')}<input aria-label={t('Travel start date')} type="date" value={form.startDate} onChange={(event) => updateField('startDate', event.target.value)} required/></label>
              <label>{t('Travel end date')}<input aria-label={t('Travel end date')} type="date" value={form.endDate} onChange={(event) => updateField('endDate', event.target.value)} required/></label>
            </div>
            <p className="planner-derived-days">{tripDays > 0 ? t(`${tripDays} itinerary day${tripDays === 1 ? '' : 's'} from selected dates`) : t('Choose a valid date range')}</p>
            <div className="form-grid">
              <label>{t('Travellers')}<input aria-label={t('Travellers')} type="number" min="1" max="20" step="1" value={form.travelers} onChange={(event) => updateField('travelers', Number(event.target.value))} required/></label>
              <label>{t('Budget (INR)')}<input aria-label={t('Budget (INR)')} type="number" min="0" step="500" value={form.budget} onChange={(event) => updateField('budget', Number(event.target.value))} required/></label>
            </div>
            <h3 className="planner-section-label">{t('Travel preferences')}</h3>
            <fieldset>
              <legend>{t('Interests')}</legend>
              <div className="interest-chips">
                {PLANNER_PREFERENCES.map((preference) => (
                  <button type="button" key={preference} aria-pressed={form.preferences.includes(preference)} className={form.preferences.includes(preference)?'active':''} onClick={() => togglePreference(preference)}>
                    {form.preferences.includes(preference) && <Check size={13}/>} {t(preference)}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="form-grid">
              <label>{t('Travel type')}<select aria-label={t('Travel type')} value={form.travelType} onChange={(event) => updateField('travelType', event.target.value as PlannerForm['travelType'])}>{TRAVEL_TYPES.map((type) => <option key={type} value={type}>{t(type)}</option>)}</select></label>
              <label>{t('Travel pace')}<select aria-label={t('Travel pace')} value={form.pace} onChange={(event) => updateField('pace', event.target.value as PlannerForm['pace'])}>{TRAVEL_PACES.map((pace) => <option key={pace} value={pace}>{t(pace)}</option>)}</select></label>
            </div>
            <label>{t('Preferred transportation')}<select aria-label={t('Preferred transportation')} value={form.transport} onChange={(event) => updateField('transport', event.target.value as PlannerForm['transport'])}>{TRANSPORT_MODES.map((mode) => <option key={mode} value={mode}>{t(mode)}</option>)}</select></label>
            <label>{t('Accommodation preference')}<select aria-label={t('Accommodation preference')} value={form.accommodation} onChange={(event) => updateField('accommodation', event.target.value as PlannerForm['accommodation'])}>{ACCOMMODATION_PREFERENCES.map((preference) => <option key={preference} value={preference}>{t(preference)}</option>)}</select></label>
            {formError && <p className="planner-error" role="alert"><AlertTriangle size={15}/>{formError}</p>}
            <button className="generate-button" type="submit" disabled={isGenerating}>
              {isGenerating ? <LoaderCircle className="planner-spinner" size={18}/> : <Sparkles size={18}/>}
              {isGenerating ? t('Building your itinerary…') : plan ? t('Regenerate / update trip') : t('Generate My Trip')}
            </button>
          </form>
        </aside>
        <section className="itinerary-result" id="planner-result" aria-live="polite">
          {!plan ? (
            <div className="planner-empty"><div className="route-illustration"><span/><RouteIcon size={48}/><span/></div><h2>{t('Your itinerary will appear here')}</h2><p>{t('Set your trip details and generate a personalized, editable schedule.')}</p></div>
          ) : (
            <>
              <div className="itinerary-header planner-itinerary-header">
                <div><span>{t('SMART ITINERARY')}</span><h2>{language === 'हिन्दी' ? `${form.cities.join(' + ')} · ${plan.days.length} दिन` : plan.title}</h2><p>{form.startDate} {t('to')} {form.endDate} · {form.travelers} {t(form.travelers === 1 ? 'traveller' : 'travellers')} · {t(form.travelType)} · {t(form.pace)} · {t(form.accommodation)} {t('stays')}</p></div>
                <div className="planner-header-actions">
                  <button onClick={saveTrip} disabled={planIsStale}><Heart size={16}/> {t('Save trip')}</button>
                  <button onClick={() => window.print()} disabled={planIsStale}><Printer size={16}/> {t('Print')}</button>
                  <button onClick={downloadTrip} disabled={planIsStale}><Download size={16}/> {t('Download')}</button>
                </div>
              </div>
              {planIsStale && <p className="planner-stale-note" role="status">{t('Trip inputs changed. Regenerate to synchronize attraction selection, dates and saved trip details.')}</p>}
              {savedTripNotice && <p className="planner-success-note" role="status">{savedTripNotice}</p>}
              {storageError && <p className="planner-error" role="alert"><AlertTriangle size={15}/>{storageError}</p>}
              <div className="planner-disclaimer"><AlertTriangle size={16}/><span>{t('Opening hours, ticket prices, sample hotel listings and cost figures are planning estimates, not live information. Confirm directly with venues and providers. No availability or booking is claimed.')}</span></div>
              {plan.routeMessage && <div className="planner-route-status"><RouteIcon size={16}/><span>{t(plan.routeMessage)}</span>{isRefreshingRoute && <LoaderCircle className="planner-spinner" size={15}/>}</div>}

              <section className="planner-overview">
                <div className="planner-section-heading"><div><span>{t('TRIP DETAILS')}</span><h3>{t('Trip overview')}</h3></div></div>
                <div className="planner-overview-grid">
                  <article><span>{t('Trip name')}</span><strong>{language === 'हिन्दी' ? `${form.cities.join(' + ')} · ${plan.days.length} दिन` : plan.title}</strong></article>
                  <article><span>{t('Starting location')}</span><strong>{form.origin}</strong></article>
                  <article><span>{t('Destination cities')}</span><strong>{form.cities.join(' · ') || t('None selected')}</strong></article>
                  <article><span>{t('Travel dates')}</span><strong>{form.startDate} – {form.endDate}</strong><small>{plan.days.length} {t(plan.days.length === 1 ? 'day' : 'days')} · {tripNights} {t(tripNights === 1 ? 'night' : 'nights')}</small></article>
                  <article><span>{t('Travellers & travel type')}</span><strong>{form.travelers} · {t(form.travelType)}</strong><small>{t(form.pace)} {t('pace')}</small></article>
                  <article><span>{t('Interests')}</span><strong>{form.preferences.map((preference)=>t(preference)).join(' · ') || t('No preferences selected')}</strong></article>
                  <article><span>{t('Routed road distance')}</span><strong>{plan.route ? `${plan.route.distanceKm.toFixed(1)} ${t('km')} ${t('(estimate)')}` : form.transport === 'Bus' || form.transport === 'Train' ? t('Not requested') : t('Unavailable')}</strong><small>{t(plan.route ? 'OSRM road route; not live traffic.' : form.transport === 'Bus' || form.transport === 'Train' ? 'Transit distance is not provided or inferred.' : 'No reliable driving route returned; no distance is inferred.')}</small></article>
                  <article><span>{t('Routed driving time')}</span><strong>{plan.route ? `${t(formatDuration(plan.route.durationMinutes))} ${t('(estimate)')}` : form.transport === 'Bus' || form.transport === 'Train' ? t('Not requested') : t('Unavailable')}</strong><small>{t(plan.route ? 'Route estimate only; actual times vary.' : 'Transit schedules and live journey times are not connected.')}</small></article>
                  <article><span>{t('Transport & stay plan')}</span><strong>{t(form.transport)} · {t(form.accommodation)}</strong><small>{tripNights} {t(tripNights === 1 ? 'night' : 'nights')} · {tripRooms} {t('estimated rooms')}; {t('accommodation rates are samples.')}</small></article>
                  <article><span>{t('Estimated group budget')}</span><strong>{currentBudget ? formatINR(currentBudget.total) : t('Unavailable')}</strong><small>{currentBudget ? `${formatINR(currentBudget.perPerson)} ${t('per person')} · ${formatINR(currentBudget.perDay)} ${t('per day')}` : t('Complete trip details to calculate.')}</small></article>
                </div>
              </section>

              <div className="planner-itinerary-days">
                {plan.days.map((day, dayIndex) => {
                  const dayFoods = experiences.filter((item) => item.type === 'Food' && item.city === day.city)
                  const dayShopping = experiences.filter((item) => item.type === 'Shopping' && item.city === day.city)
                  const available = destinations.filter((destination) => destination.city === day.city && !allPlannedIds.has(destination.id))
                  const dateLabel = new Intl.DateTimeFormat(language === 'हिन्दी' ? 'hi-IN' : 'en-IN', {weekday:'short',day:'numeric',month:'short'}).format(new Date(`${day.date}T12:00:00`))
                  const schedulePeriods = ['Morning', 'Afternoon', 'Evening'].map((period) => ({
                    name: period,
                    visits: day.visits.filter((visit) => getSchedulePeriod(visit.arrival) === period),
                  }))
                  const dayRoutedDistance = day.visits.reduce((total, visit) => total + (visit.travelDistanceKm ?? 0), 0)
                  const dayRoutedMinutes = day.visits.reduce((total, visit) => total + (visit.travelMinutes ?? 0), 0)
                  return (
                    <article className="planner-day-card" key={`${day.date}-${day.city}`}>
                      <header className="planner-day-heading">
                        <div className="day-number">{t('DAY')} {day.dayNumber}<small>{dateLabel}</small></div>
                        <div><span className="planner-day-city">{day.city}</span><p>{day.visits.length ? t(`${day.visits.length} attraction${day.visits.length === 1 ? '' : 's'} planned`) : t('Open / transfer time')}</p></div>
                        <button className="planner-regenerate-day" type="button" onClick={() => regenerateDay(dayIndex)}><Sparkles size={14}/> {t('Regenerate day')}</button>
                      </header>
                      <p className="planner-day-travel-summary">
                        <RouteIcon size={14}/> {t('Daily travel')}: {plan.route
                          ? dayRoutedDistance > 0
                            ? `${dayRoutedDistance.toFixed(1)} ${t('km')} · ${t(formatDuration(dayRoutedMinutes))} ${t('routed driving estimate')}`
                            : t('No routed road legs assigned to this day.')
                          : t('No reliable road distance or travel time is available for this transport mode.')}
                        {' '}{t('Recommended transport')}: {t(form.transport)}; {t('confirm current services and fares.')}
                      </p>
                      {day.visits.length === 0 && <p className="planner-day-empty">{t(day.note ?? 'Keep this day flexible for travel, meals or rest.')}</p>}
                      <div className="planner-day-periods">
                      {schedulePeriods.map((period) => (
                        <section className="planner-period" key={period.name}>
                          <h4>{t(period.name)}</h4>
                          {!period.visits.length && <p className="planner-period-empty">{t('Keep this period open for meals, travel or rest.')}</p>}
                          {period.visits.map((visit) => {
                            const visitIndex = day.visits.findIndex((item) => item.id === visit.id)
                            const localizedVisit=localizedDestination(visit,language)
                            return (
                        <section className="planner-visit" key={`${visit.id}-${visitIndex}`}>
                          <div className="planner-visit-image"><AssetImage record={localizedVisit.image} label={localizedVisit.name} showCredit={false}/></div>
                          <div className="planner-visit-details">
                            <div className="planner-visit-time">{visit.arrival} – {visit.departure}</div>
                            <h3>{localizedVisit.name}</h3>
                            <p><MapPin size={13}/>{visit.city}, {t('Rajasthan')} · {visit.coordinates} · {t(localizedVisit.category)}</p>
                            <p className="planner-visit-description">{localizedVisit.description}</p>
                            <p className="planner-visit-significance"><strong>{t('History & cultural significance:')}</strong> {localizedVisit.history} {localizedVisit.culture}</p>
                            <details className="planner-visit-architecture"><summary>{t('Architecture and visitor context')}</summary><p>{localizedVisit.architecture}</p><p>{t(localizedVisit.closed)}. {t('Follow current site notices, access rules and photography restrictions.')}</p></details>
                            <div className="planner-visit-facts">
                              <span><Clock3 size={13}/>{t(formatDuration(visit.visitMinutes))} {t('suggested')}</span>
                              <span><Ticket size={13}/>{visit.ticket === 0 ? t('Sample ticket: free; verify') : `${t('Sample ticket:')} ${formatINR(visit.ticket)} ${t('/ person; verify')}`}</span>
                              {visit.travelDistanceKm !== null && visit.travelMinutes !== null && (visit.travelDistanceKm > 0 || visit.travelMinutes > 0) && <span><RouteIcon size={13}/>{visit.travelDistanceKm.toFixed(1)} {t('km')} · {t(formatDuration(visit.travelMinutes))} {t('routed drive')}</span>}
                            </div>
                            <small className="planner-hours">{t('Sample hours:')} {t(visit.hours)}. {t('Weekly closure:')} {t(localizedVisit.closed)}. {t('Timings are unverified; confirm with the venue before travel.')}</small>
                            <div className="planner-visit-actions">
                              <button type="button" aria-label={`${t('Move')} ${localizedVisit.name} ${t('earlier')}`} disabled={visitIndex === 0} onClick={() => moveVisit(dayIndex, visitIndex, -1)}><ChevronUp size={15}/> {t('Earlier')}</button>
                              <button type="button" aria-label={`${t('Move')} ${localizedVisit.name} ${t('later')}`} disabled={visitIndex === day.visits.length - 1} onClick={() => moveVisit(dayIndex, visitIndex, 1)}><ChevronDown size={15}/> {t('Later')}</button>
                              <button type="button" onClick={() => removeVisit(dayIndex, visit.id)}><Trash2 size={14}/> {t('Remove')}</button>
                              <a href={`https://www.google.com/maps/search/?api=1&query=${visit.lat},${visit.lng}`} target="_blank" rel="noreferrer"><ExternalLink size={13}/> Google Maps</a>
                              <Link to={`/destination/${visit.id}`}><Landmark size={13}/> {t('Full destination guide')}</Link>
                            </div>
                          </div>
                        </section>
                            )
                          })}
                        </section>
                      ))}
                      </div>
                      {day.note && day.visits.length > 0 && <p className="planner-day-empty">{t(day.note)}</p>}
                      <div className="planner-day-resources">
                        <section><h4><Hotel size={15}/> {t('Stay suggestion')}</h4>
                          <p>{t(form.accommodation)} {t('accommodation planning estimate. Demo hotel names and rates are not live listings or booking availability.')}</p>
                          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`hotels in ${day.city}, Rajasthan`)}`} target="_blank" rel="noreferrer">{t('Search nearby stays')} <ExternalLink size={12}/></a>
                        </section>
                        <section><h4><Utensils size={15}/> {t('Meals & local food')}</h4>
                          <p>{dayFoods.length ? t(`Food ideas: ${dayFoods.slice(0, 3).map((item) => item.name).join(' · ')}. These are dish recommendations, not verified restaurant listings.`) : t('Explore regional food after checking local menus and opening hours.')}</p>
                          <div className="planner-meal-links">{['Breakfast', 'Lunch', 'Dinner'].map((meal) => (
                            <a key={meal} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${meal.toLowerCase()} restaurants in ${day.city}, Rajasthan`)}`} target="_blank" rel="noreferrer">{t(meal)} <ExternalLink size={11}/></a>
                          ))}</div>
                        </section>
                        {form.preferences.includes('Shopping') && dayShopping.length > 0 && (
                          <section><h4><ShoppingBag size={15}/> {t('Shopping ideas')}</h4><p>{dayShopping.slice(0, 2).map((item) => item.name).join(' · ')}</p><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`handicraft markets in ${day.city}, Rajasthan`)}`} target="_blank" rel="noreferrer">{t('Find local markets')} <ExternalLink size={12}/></a></section>
                        )}
                      </div>
                      <div className="planner-add-row">
                        <select
                          aria-label={`${t('Choose an attraction to add to day')} ${day.dayNumber}`}
                          value={addSelections[dayIndex] ?? ''}
                          onChange={(event) => setAddSelections((current) => ({...current,[dayIndex]:event.target.value}))}
                          disabled={!available.length}
                        >
                          <option value="">{available.length ? t(`Add another ${day.city} attraction`) : t('No more listed attractions in this city')}</option>
                          {available.map((destination) => <option key={destination.id} value={destination.id}>{destination.name}</option>)}
                        </select>
                        <button type="button" onClick={() => addVisit(dayIndex)} disabled={!addSelections[dayIndex] || !available.length}><Plus size={15}/> {t('Add')}</button>
                      </div>
                    </article>
                  )
                })}
              </div>

              <section className="planner-map-section">
                <div className="planner-section-heading"><div><span>{t('INTERACTIVE MAP')}</span><h3>{t('Stops and route')}</h3></div>
                  {googleDirectionsUrl && <a href={googleDirectionsUrl} target="_blank" rel="noreferrer">{t('Open directions')} <ExternalLink size={13}/></a>}
                </div>
                <PlannerRouteMap days={plan.days} route={plan.route}/>
                <p className="planner-map-caption">{t('Map tiles © OpenStreetMap contributors. A route line appears only when the routing service returns driving geometry; transit trips show place markers only.')}</p>
                {osmDirectionsUrl && <a className="planner-osm-link" href={osmDirectionsUrl} target="_blank" rel="noreferrer">{t('Open driving route in OpenStreetMap')} <ExternalLink size={13}/></a>}
                <div className="planner-nearby-links">
                  {form.cities.map((city) => <span key={city}>
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`hotels near ${city}, Rajasthan`)}`} target="_blank" rel="noreferrer">{t('Hotels near')} {city} <ExternalLink size={12}/></a>
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`restaurants near ${city}, Rajasthan`)}`} target="_blank" rel="noreferrer">{t('Restaurants near')} {city} <ExternalLink size={12}/></a>
                  </span>)}
                </div>
              </section>

              {currentBudget && (
                <section className="planner-budget-section">
                  <div className="planner-section-heading"><div><span>{t('BUDGET SUMMARY')}</span><h3>{t('Estimated trip costs')}</h3></div><strong>{formatINR(currentBudget.total)}</strong></div>
                  <div className="planner-budget-grid">
                    {[
                      ['Intercity transportation', currentBudget.intercityTransportation, plan.route ? `Estimated road-route segment rate for ${form.transport}; not a fare quote.` : `Planning estimate for ${form.transport}; no live fare or timetable data.`],
                      ['Local transportation', currentBudget.localTransportation, plan.route ? 'OSRM-based local driving legs or planning estimate; not live fares.' : 'Planning allowance only; no live local fares or transit times.'],
                      ['Accommodation', currentBudget.accommodation, `${form.accommodation} preference using sample rates; not live quotes.`],
                      ['Breakfast', currentBudget.breakfast, 'Planning allowance for all travellers and trip days; not a menu quote.'],
                      ['Lunch', currentBudget.lunch, 'Planning allowance for all travellers and trip days; not a menu quote.'],
                      ['Dinner', currentBudget.dinner, 'Planning allowance for all travellers and trip days; not a menu quote.'],
                      ['Attraction tickets', currentBudget.entryTickets, 'Sample attraction amounts × travellers; verify current official prices.'],
                      ['Shopping', currentBudget.shopping, form.preferences.includes('Shopping') ? 'Optional allowance; set a personal cap.' : 'Not included; no shopping allowance selected.'],
                      ['Other expenses', currentBudget.other, 'Planning allowance for small expenses.'],
                    ].map(([label, amount, description]) => (
                      <div className="planner-budget-item" key={String(label)}><span>{t(String(label))}</span><strong>{formatINR(Number(amount))}</strong><small>{t(String(description))}</small></div>
                    ))}
                  </div>
                  <div className={currentBudget.overBudget?'planner-budget-total over':'planner-budget-total'}>
                    <span>{t('Group total')} · {formatINR(currentBudget.perPerson)} {t('per person')} · {formatINR(currentBudget.perDay)} {t('per day')}</span><strong>{formatINR(currentBudget.total)} / {formatINR(currentBudget.budget)} {t('budget')}</strong>
                    <small>{currentBudget.overBudget ? t(`Over budget by ${formatINR(-currentBudget.remaining)}`) : t(`Remaining budget: ${formatINR(currentBudget.remaining)}`)}</small>
                  </div>
                  {currentBudget.overBudget && <div className="planner-savings"><h4>{t('Ways to bring the estimate down')}</h4><ul>{currentBudget.suggestions.map((suggestion) => <li key={suggestion}>{t(suggestion)}</li>)}</ul></div>}
                </section>
              )}

              <section className="planner-travel-info">
                <div className="planner-section-heading"><div><span>{t('BEFORE YOU GO')}</span><h3>{t('Useful travel information')}</h3></div></div>
                <div className="planner-travel-info-grid">
                  <article><h4>{t('Season & weather')}</h4><p>{t('October to March is generally more comfortable for sightseeing. Summer heat can be intense, especially in desert areas. Live weather is not connected; check a current forecast before departure.')}</p></article>
                  <article><h4>{t('Local language')}</h4><p>{t('Hindi is widely understood. English is common at many visitor sites.')}</p></article>
                  <article><h4>{t('Getting around')}</h4><p>{t('City options may include auto-rickshaws, taxis, buses and walking; intercity travel may use train, bus or road. Schedules, availability and fares are not fetched by this planner.')}</p></article>
                  <article><h4>{t('Food & shopping')}</h4><p>{[...new Set(form.cities.flatMap((city) => experiences.filter((item) => item.city === city && (item.type === 'Food' || item.type === 'Shopping')).map((item) => item.name)))].join(' · ') || t('Explore local food and crafts')} {t('are catalogue ideas, not verified vendors. Check local listings and prices before purchase.')}</p></article>
                  <article><h4>{t('Practical safety')}</h4><p>{t('Carry water, sun protection and comfortable footwear; keep valuables secure, use licensed transport where possible, and follow venue, religious-site and local safety guidance.')}</p></article>
                  <article><h4>{t('Emergency & medical help')}</h4><p>{t('India’s emergency response number is 112. Specific hospitals and emergency-service availability are not verified in this demo.')}</p>{form.cities.map((city) => <a key={city} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`hospitals near ${city}, Rajasthan`)}`} target="_blank" rel="noreferrer">{t('Hospitals near')} {city} <ExternalLink size={12}/></a>)}</article>
                  <article><h4>{t('Useful items to carry')}</h4><p>{t('Photo ID, prescribed medicines, a refillable water bottle, sun protection, comfortable walking shoes and a charged phone with offline maps for patchy coverage.')}</p></article>
                </div>
              </section>
            </>
          )}

          <section className="planner-saved-section">
          <div className="planner-section-heading"><div><span>{t('ON THIS DEVICE')}</span><h3>{t('Saved trips')}</h3></div><small>{validSavedTrips.length + legacySavedTrips.length} {t('saved')}</small></div>
          {validSavedTrips.length + legacySavedTrips.length
            ? <div className="planner-saved-list">
              {validSavedTrips.map((trip) => (
                <article key={trip.id}><div><strong>{language === 'हिन्दी' ? `${trip.form.cities.join(' + ')} · ${trip.days.length} दिन` : trip.title}</strong><small>{t('Saved')} {new Intl.DateTimeFormat(language === 'हिन्दी' ? 'hi-IN' : 'en-IN',{dateStyle:'medium'}).format(new Date(trip.createdAt))} · {trip.days.length} {t(trip.days.length === 1 ? 'day' : 'days')}</small></div><button type="button" onClick={() => loadSavedTrip(trip)}>{t('Load trip')}</button><button type="button" aria-label={`${t('Delete')} ${trip.title}`} onClick={() => deleteSavedTrip(trip.id)}><Trash2 size={15}/></button></article>
              ))}
              {legacySavedTrips.map((trip) => (
                <article key={`legacy-${trip.id}`}><div><strong>{trip.title}</strong><small>{t('Earlier saved plan')}{trip.created ? ` · ${new Intl.DateTimeFormat(language === 'हिन्दी' ? 'hi-IN' : 'en-IN',{dateStyle:'medium'}).format(new Date(trip.created))}` : ''} · {t('regenerate to build schedule')}</small></div><button type="button" onClick={() => loadLegacyTrip(trip)}>{t('Load inputs')}</button><button type="button" aria-label={`${t('Delete')} ${trip.title}`} onClick={() => deleteSavedTrip(String(trip.id))}><Trash2 size={15}/></button></article>
              ))}
            </div>
              : <p className="planner-saved-empty">{t('Your saved itineraries will appear here.')}</p>}
          </section>
        </section>
      </div>
    </div>
  )
}

function TravelBuddies({notify}:{notify:(text:string)=>void}) {
  const { language, setLanguage, t } = useI18n()
  const [destination,setDestination]=useState('All')
  const [travelStyle,setTravelStyle]=useState('All')
  const [interest,setInterest]=useState('All')
  const [budget,setBudget]=useState('All')
  const [travelDate,setTravelDate]=useState('')
  const [tab,setTab]=useState<'matches'|'requests'|'buddies'|'chat'>('matches')
  const [requests,setRequests]=useStored<string[]>('ym-buddy-requests',[])
  const [incomingRequests,setIncomingRequests]=useStored<string[]>('ym-buddy-incoming-requests',['b3'])
  const [connected,setConnected]=useStored<string[]>('ym-buddy-connected',[])
  const [chatPerson,setChatPerson]=useState(buddyProfiles[0])
  const [messages,setMessages]=useStored<{from:string;text:string}[]>('ym-chat-messages',[{from:'buddy',text:'Hi! Are you planning to explore Jaipur heritage places?'},{from:'me',text:'Yes, I am visiting in December.'}])
  const [message,setMessage]=useState('')
  const [translated,setTranslated]=useState(false)
  const dateMatches=(dates:string)=>{
    if(!travelDate)return true
    const selected=new Date(`${travelDate}T12:00:00`)
    const selectedDay=selected.getDate()
    const selectedMonth=selected.toLocaleString('en-US',{month:'short'}).toLowerCase()
    const range=dates.match(/^(\d{1,2})-(\d{1,2}) ([A-Za-z]{3})$/)
    return Boolean(range&&range[3]?.toLowerCase()===selectedMonth&&selectedDay>=Number(range[1])&&selectedDay<=Number(range[2]))
  }
  const profiles=buddyProfiles.filter((p)=>{
    const matchesDestination=destination==='All'||p.destination===destination
    const matchesStyle=travelStyle==='All'||p.category===travelStyle
    const matchesInterest=interest==='All'||p.interests.includes(interest)
    const matchesBudget=budget==='All'||(budget==='under-1500'&&p.budgetPerDay<1500)||(budget==='1500-3000'&&p.budgetPerDay>=1500&&p.budgetPerDay<=3000)||(budget==='over-3000'&&p.budgetPerDay>3000)
    return matchesDestination&&matchesStyle&&matchesInterest&&matchesBudget&&dateMatches(p.dates)
  })
  const localizedProfiles=profiles.map((p)=>({...p,intro:localizedContent(language,'buddies',p.id,'intro',p.intro),interests:p.interests.map((interest)=>t(interest)),category:localizedContent(language,'buddies',p.id,'group',p.category)}))
  const activeChatPerson=buddyProfiles.find((p)=>p.id===chatPerson.id)??chatPerson
  const localizedChatPerson={...activeChatPerson,intro:localizedContent(language,'buddies',activeChatPerson.id,'intro',activeChatPerson.intro),interests:activeChatPerson.interests.map((interest)=>t(interest)),category:localizedContent(language,'buddies',activeChatPerson.id,'group',activeChatPerson.category)}
  const send=()=>{if(!message.trim())return;setMessages([...messages,{from:'me',text:message.trim()}]);setMessage('');notify(t('Message sent'))}
  return (
    <div className="page buddy-page">
      <div className="buddy-head"><div><span className="kicker">{t('TRAVEL TOGETHER')}</span><h1>{t('Find your Travel Buddy')}</h1><p>{t('Meet compatible travellers through mutual consent.')}</p></div><button onClick={()=>notify(t('Demo profile opened'))}><CircleUserRound size={17}/> {t('My profile')}</button></div>
      <div className="container">
        <div className="buddy-demo-notice" role="note"><ShieldCheck size={17}/><span>{t('Demo only: all profiles, travel windows, budgets, requests, match explanations and chats are simulated in this browser. No real travellers, identity checks or messaging service are connected.')}</span></div>
        <div className="buddy-tabs"><button className={tab==='matches'?'active':''} onClick={()=>setTab('matches')}><Compass size={16}/> {t('Matches')}</button><button className={tab==='requests'?'active':''} onClick={()=>setTab('requests')}><UserPlus size={16}/> {t('Requests')} <span>{requests.length+incomingRequests.length}</span></button><button className={tab==='buddies'?'active':''} onClick={()=>setTab('buddies')}><Users size={16}/> {t('My Buddies')}</button><button className={tab==='chat'?'active':''} onClick={()=>setTab('chat')}><MessageCircle size={16}/> {t('Chat')}</button></div>
        {tab==='matches'&&<>
          <div className="buddy-filters">
            <select aria-label={t('Destination')} value={destination} onChange={e=>setDestination(e.target.value)}><option value="All">{t('All destinations')}</option>{[...new Set(buddyProfiles.map(p=>p.destination))].map(c=><option key={c}>{c}</option>)}</select>
            <label>{t('Travel date')}<input type="date" value={travelDate} onChange={(event)=>setTravelDate(event.target.value)} aria-label={t('Travel date')}/></label>
            <select aria-label={t('Travel style')} value={travelStyle} onChange={e=>setTravelStyle(e.target.value)}><option value="All">{t('All travel styles')}</option>{[...new Set(buddyProfiles.map(p=>p.category))].map(style=><option key={style}>{t(style)}</option>)}</select>
            <select aria-label={t('Daily budget')} value={budget} onChange={e=>setBudget(e.target.value)}><option value="All">{t('Any sample budget')}</option><option value="under-1500">{t('Under ₹1,500 / day')}</option><option value="1500-3000">{t('₹1,500–₹3,000 / day')}</option><option value="over-3000">{t('Over ₹3,000 / day')}</option></select>
            <select aria-label={t('Interest')} value={interest} onChange={e=>setInterest(e.target.value)}><option value="All">{t('Any interest')}</option>{[...new Set(buddyProfiles.flatMap(p=>p.interests))].sort().map(item=><option key={item}>{t(item)}</option>)}</select>
          </div>
          <p className="buddy-filter-note">{t('Travel windows have no year in this demo; date filtering compares month and day only. Sample daily budgets are illustrative.')}</p>
          <div className="buddy-grid">{localizedProfiles.map((p)=>{const sent=requests.includes(p.id);const activeOriginal=buddyProfiles.find((item)=>item.id===p.id);const shared=activeOriginal?.interests.filter((item)=>interest!=='All'&&item===interest)??[];const matchReasons=[destination!=='All'&&p.destination===destination?t('Destination matches your filter'):null,travelStyle!=='All'&&p.category===travelStyle?t('Travel style matches your filter'):null,...shared.map((item)=>`${t('Interest match')}: ${t(item)}`)].filter((reason):reason is string=>Boolean(reason));return <article className="buddy-card" key={p.id}><div className="buddy-photo"><AssetImage record={p.image} label={`${t('Demo profile')}: ${p.name}`} kind="person"/><span>{t('DEMO')}<small>{t('Profile')}</small></span></div><div className="buddy-info"><h3>{p.name}, {p.age}</h3><p><MapPin size={14}/>{p.destination} • {p.dates} · {formatINR(p.budgetPerDay)} {t('/ day')} {t('(sample)')}</p><p>{p.intro}</p><div className="interest-tags">{p.interests.map(i=><span key={i}>{i}</span>)}</div><div className="buddy-match-explanation"><strong>{t('Why this appears')}</strong><span>{matchReasons.length?matchReasons.join(' · '):t('No personal compatibility score is calculated; compare these sample details with your preferences.')}</span></div><div className="buddy-meta"><span><Languages size={13}/>{p.languages.map((spokenLanguage)=>t(spokenLanguage)).join(', ')}</span><span><Users size={13}/>{p.category}</span></div><div className="buddy-actions"><button className="outline" onClick={()=>{setChatPerson(activeOriginal??buddyProfiles[0]);setTab('chat')}}>{t('View Profile')}</button><button className={sent?'sent':''} onClick={()=>{setRequests(sent?requests.filter(id=>id!==p.id):[...requests,p.id]);notify(t(sent?'Connection request withdrawn':'Demo connection request sent'))}}>{sent?<Check size={16}/>:<UserPlus size={16}/>} {t(sent?'Request Sent':'Connect')}</button></div></div></article>})}{!localizedProfiles.length&&<div className="empty-inline">{t('No demo profiles match these filters.')}</div>}</div>
        </>}
        {tab==='requests'&&<div className="simple-grid">
          <div className="panel"><h2>{t('Incoming demo requests')}</h2>{incomingRequests.length?buddyProfiles.filter(p=>incomingRequests.includes(p.id)).map(p=><div className="request-row" key={p.id}><AssetImage record={p.image} label={`${t('Demo profile')}: ${p.name}`} kind="person"/><div><strong>{p.name}</strong><small>{p.destination} • {t(p.category)} · {t('Simulated request')}</small></div><button onClick={()=>{setConnected([...new Set([...connected,p.id])]);setIncomingRequests(incomingRequests.filter(id=>id!==p.id));notify(t('Demo connection accepted'))}}>{t('Accept')}</button><button onClick={()=>{setIncomingRequests(incomingRequests.filter(id=>id!==p.id));notify(t('Demo request rejected'))}}>{t('Reject')}</button></div>):<div className="empty-inline">{t('No simulated incoming requests.')}</div>}</div>
          <div className="panel"><h2>{t('Sent demo requests')}</h2>{requests.length?buddyProfiles.filter(p=>requests.includes(p.id)).map(p=><div className="request-row sent-request-row" key={p.id}><AssetImage record={p.image} label={`${t('Demo profile')}: ${p.name}`} kind="person"/><div><strong>{p.name}</strong><small>{p.destination} • {t('Simulated request')}</small></div><button onClick={()=>{setRequests(requests.filter(id=>id!==p.id));notify(t('Demo request withdrawn'))}}>{t('Withdraw')}</button></div>):<div className="empty-inline">{t('No sent demo requests.')}</div>}</div>
        </div>}
        {tab==='buddies'&&<div className="simple-grid"><div className="panel"><h2>{t('Connected Travellers')}</h2>{connected.length?buddyProfiles.filter(p=>connected.includes(p.id)).map(p=><div className="request-row" key={p.id}><AssetImage record={p.image} label={`Demo traveler: ${p.name}`} kind="person"/><div><strong>{p.name}</strong><small>{p.destination}</small></div><button onClick={()=>{setChatPerson(p);setTab('chat')}}>{t('Chat')}</button></div>):<div className="empty-inline">{t('No connected travellers yet. Send a request to start.')}</div>}</div></div>}
        {tab==='chat'&&<div className="chat-layout"><aside><h3>{t('Demo conversations')}</h3>{buddyProfiles.slice(0,5).map(p=><button className={chatPerson.id===p.id?'active':''} onClick={()=>setChatPerson(p)} key={p.id}><AssetImage record={p.image} label={`${t('Demo profile')}: ${p.name}`} kind="person"/><div><strong>{p.name}</strong><small>{p.destination}</small></div></button>)}</aside><section><header><AssetImage record={localizedChatPerson.image} label={`${t('Demo profile')}: ${localizedChatPerson.name}`} kind="person"/><div><strong>{localizedChatPerson.name}</strong><small><ShieldCheck size={12}/> {t('Simulated messages')}</small></div><select aria-label={t('Display language')} value={language} onChange={(event) => setLanguage(event.target.value as Language)}><option>English</option><option>हिन्दी</option></select></header><div className="chat-messages">{messages.map((m,i)=><div className={`bubble ${m.from==='me'?'me':'them'}`} key={i}>{m.text}{translated&&m.from==='buddy'&&<small>{t('Demo translation: नमस्ते! क्या आप...')}</small>}</div>)}</div><div className="chat-controls"><button onClick={()=>setTranslated(!translated)}><Languages size={15}/>{t(translated?'Hide demo translation':'Translate demo')}</button><div><input value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder={t('Write a simulated message...')}/><button aria-label={t('Send demo message')} onClick={send}><Send size={17}/></button></div></div></section></div>}
      </div>
      <div className="container safety-card"><ShieldCheck size={26}/><div><h3>{t('Travel Buddy privacy & safety')}</h3><p>{t('Connections require mutual acceptance. Never publicly expose personal phone numbers. Blocking and reporting controls should be available before sharing any information. Live location sharing is optional and consent-based.')}</p></div></div>
    </div>
  )
}

function LocalExperiences() {
  const { language, t } = useI18n()
  const [type,setType]=useState('All')
  const [city,setCity]=useState('All')
  const [query,setQuery]=useState('')
  const [previewId,setPreviewId]=useState<string|null>(null)
  const triggerRef=useRef<HTMLButtonElement|null>(null)
  const closeRef=useRef<HTMLButtonElement|null>(null)
  const filtered=experiences.filter((experience)=>{
    const localized=localizedExperience(experience,language)
    return (type==='All'||experience.type===type)
      &&(city==='All'||experience.city===city)
      &&`${experience.name} ${experience.category} ${localized.name} ${localized.category} ${localized.description}`.toLowerCase().includes(query.toLowerCase())
  })
  const previewIndex=experiences.findIndex((experience)=>experience.id===previewId)
  const preview=previewIndex>=0?localizedExperience(experiences[previewIndex],language):null

  useEffect(()=>{
    if(!previewId)return
    const previousOverflow=document.body.style.overflow
    document.body.style.overflow='hidden'
    const onKeyDown=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();setPreviewId(null)}
      if(event.key==='ArrowLeft'){event.preventDefault();setPreviewId(experiences[(previewIndex-1+experiences.length)%experiences.length].id)}
      if(event.key==='ArrowRight'){event.preventDefault();setPreviewId(experiences[(previewIndex+1)%experiences.length].id)}
    }
    window.addEventListener('keydown',onKeyDown)
    closeRef.current?.focus()
    return ()=>{
      document.body.style.overflow=previousOverflow
      window.removeEventListener('keydown',onKeyDown)
      triggerRef.current?.focus()
    }
  },[previewId,previewIndex])

  const handleTouchStart=(event:ReactTouchEvent<HTMLDivElement>)=>{
    const touch=event.changedTouches[0]
    if(touch)event.currentTarget.dataset.touchStartX=String(touch.clientX)
  }
  const handleTouchEnd=(event:ReactTouchEvent<HTMLDivElement>)=>{
    const startX=Number(event.currentTarget.dataset.touchStartX)
    const touch=event.changedTouches[0]
    if(!touch||!Number.isFinite(startX))return
    const delta=touch.clientX-startX
    if(Math.abs(delta)<50)return
    setPreviewId(experiences[(previewIndex+(delta<0?1:-1)+experiences.length)%experiences.length].id)
  }

  return (
    <div className="page">
      <div className="page-hero local-hero"><div><span className="kicker">{t('TASTE & CRAFT')}</span><h1>{t('Local Food & Shopping')}</h1><p>{t('Discover authentic flavours and support local artisans.')}</p></div></div>
      <div className="container">
        <div className="experience-toolbar"><div className="search-inline"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t('Search food or handicraft')}/></div><button className={type==='All'?'active':''} onClick={()=>setType('All')}>{t('All')}</button><button className={type==='Food'?'active':''} onClick={()=>setType('Food')}><Utensils size={15}/> {t('Food')}</button><button className={type==='Shopping'?'active':''} onClick={()=>setType('Shopping')}><ShoppingBag size={15}/> {t('Shopping')}</button><select aria-label={t('City')} value={city} onChange={e=>setCity(e.target.value)}><option value="All">{t('All')}</option>{[...new Set(experiences.map(e=>e.city))].map(c=><option key={c}>{c}</option>)}</select></div>
        <div className="experience-grid">{filtered.map(raw=>{const e=localizedExperience(raw,language);return <article className="experience-card" key={e.id}><div><button type="button" className="experience-image-button" aria-label={`${t('Preview photo')}: ${e.name}`} onClick={(event)=>{triggerRef.current=event.currentTarget;setPreviewId(e.id)}}><AssetImage record={e.image} label={e.name} kind={e.type==='Food'?'food':'shopping'}/></button><span>{t(e.type)}</span></div><section><h3>{e.name}</h3><p>{e.description}</p><div><span><MapPin size={13}/>{e.city}</span><strong>{e.price}</strong></div><small>{t('Sample vendor (unverified):')} {e.shop}</small><button onClick={()=>window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${e.name} ${e.city}, Rajasthan`)}`,'_blank','noopener,noreferrer')}><MapPin size={14}/> {t('Find item nearby')}</button></section></article>})}</div>
      </div>
      {preview&&<div className="experience-lightbox" role="presentation" onClick={(event)=>{if(event.target===event.currentTarget)setPreviewId(null)}}>
        <div className="lightbox-dialog" role="dialog" aria-modal="true" aria-label={`${t('Image preview')}: ${preview.name}`} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <button ref={closeRef} type="button" className="lightbox-close" onClick={()=>setPreviewId(null)} aria-label={t('Close image preview')}><X/></button>
          <button type="button" className="lightbox-nav lightbox-previous" onClick={()=>setPreviewId(experiences[(previewIndex-1+experiences.length)%experiences.length].id)} aria-label={t('Previous image')}><ArrowLeft/></button>
          <div className="lightbox-image-wrap"><AssetImage record={preview.image} label={preview.name} kind={preview.type==='Food'?'food':'shopping'} className="lightbox-image"/></div>
          <button type="button" className="lightbox-nav lightbox-next" onClick={()=>setPreviewId(experiences[(previewIndex+1)%experiences.length].id)} aria-label={t('Next image')}><ArrowRight/></button>
          <div className="lightbox-caption"><h2>{preview.name}</h2><p>{preview.description}</p></div>
        </div>
      </div>}
    </div>
  )
}

function HotelsPage() {
  const { language, t } = useI18n()
  const [city,setCity]=useState('All')
  const [query,setQuery]=useState('')
  const filtered=hotels.filter(h=>(city==='All'||h.city===city)&&h.name.toLowerCase().includes(query.toLowerCase()))
  return (
    <div className="page">
      <div className="page-hero hotels-hero"><div><span className="kicker">{t('STAY IN COMFORT')}</span><h1>{t('Hotels near Rajasthan attractions')}</h1><p>{t('Explore sample stays close to your favourite destinations.')}</p></div></div>
      <div className="container">
        <div className="explore-toolbar"><div className="search-inline"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t('Search hotels')}/></div><select aria-label={t('City')} value={city} onChange={e=>setCity(e.target.value)}><option>All</option>{[...new Set(hotels.map(h=>h.city))].map(c=><option key={c}>{c}</option>)}</select></div>
        <div className="hotel-grid">{filtered.map(h=><article className="hotel-card" key={h.id}><AssetImage record={h.image} label={h.name} kind="hotel"/><div><div className="hotel-top"><span>{h.city}</span><b><Star size={14} fill="currentColor"/>{h.rating}</b></div><h3>{h.name}</h3><p><MapPin size={14}/>{h.distance} {t('from selected attraction')}</p><div className="facilities">{h.facilities.map(f=><span key={f}>{t(f)}</span>)}</div><div className="hotel-bottom"><div><small>{t('Approx. from')}</small><strong>₹{h.price.toLocaleString(language === 'हिन्दी' ? 'hi-IN' : 'en-IN')}<span>{t('/night')}</span></strong></div><button onClick={()=>window.alert(t('Sample hotel details — live availability is not connected.'))}>{t('View details')}</button></div></div></article>)}</div>
      </div>
    </div>
  )
}

function AuthPage({mode,notify}:{mode:'login'|'signup'|'forgot';notify:(text:string)=>void}) {
  const { t } = useI18n()
  const navigate=useNavigate()
  const [,setUser]=useStored<{name:string;email:string}|null>('ym-user',null)
  const [name,setName]=useState('')
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const submit=(e:FormEvent)=>{e.preventDefault();if(mode==='forgot'){notify(t(`Demo reset link sent to ${email}`));return}const next={name:name||email.split('@')[0]||'Explorer',email:email||'explorer@example.com'};setUser(next);notify(t(mode==='signup'?'Account created successfully':'Welcome back'));navigate('/profile')}
  return (
    <div className="auth-page"><div className="auth-image"><div><Brand/><blockquote>{t('“Your journey, your culture, your companion.”')}</blockquote></div></div><div className="auth-form-wrap"><form className="auth-form" onSubmit={submit}><div className="auth-brand-mobile"><Brand/></div>{mode==='login'&&<><span className="kicker">{t('WELCOME BACK')}</span><h1>{t('Sign in to YatraMitra')}</h1></>}    {mode==='signup'&&<><span className="kicker">{t('JOIN THE JOURNEY')}</span><h1>{t('Create your account')}</h1></>}{mode==='forgot'&&<><span className="kicker">{t('PASSWORD RESET')}</span><h1>{t('Forgot your password?')}</h1></>}
    {mode==='signup'&&<label>{t('Full name')}<input value={name} onChange={e=>setName(e.target.value)} placeholder={t('Your full name')} required/></label>}<label>{t('Email address')}<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required/></label>{mode!=='forgot'&&<label>{t('Password')}<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required/></label>}<button type="submit">{t(mode==='login'?'Sign In':mode==='signup'?'Create Account':'Send Reset Link')} <ArrowRight size={16}/></button>
      {mode==='login'&&<><Link className="forgot" to="/forgot">{t('Forgot password?')}</Link><p>{t('New to YatraMitra?')} <Link to="/signup">{t('Create account')}</Link></p></>}{mode==='signup'&&<p>{t('Already have an account?')} <Link to="/login">{t('Sign in')}</Link></p>}{mode==='forgot'&&<p><Link to="/login">{t('Back to sign in')}</Link></p>}
      <small>{t('Demo authentication — data is stored locally in this browser.')}</small></form></div></div>
  )
}

function Profile({user,logout,notify}:{user:{name:string;email:string};logout:()=>void;notify:(text:string)=>void}) {
  const { t } = useI18n()
  const [saved]=useStored<string[]>('ym-saved-destinations',[])
  const [itineraries]=useStored<any[]>('ym-itineraries',[])
  return (
    <div className="page profile-page">
      <div className="container">
        <aside>
          <div className="profile-card">
            <div className="profile-avatar">{user.name.charAt(0).toUpperCase()}</div>
            <h2>{user.name}</h2>
            <p>{user.email}</p>
            <button onClick={logout}><LogOut size={15}/> {t('Sign out')}</button>
          </div>
          <nav>
            <button className="active">{t('Overview')}</button>
            <button onClick={()=>notify(t('Profile editing is available in this demo'))}>{t('Edit profile')}</button>
            <button onClick={()=>notify(t(`${saved.length} saved destinations`))}>{t('Saved destinations')}</button>
            <button onClick={()=>notify(t(`${itineraries.length} saved itineraries`))}>{t('Saved itineraries')}</button>
          </nav>
        </aside>
        <section className="profile-main">
          <h1>{t('Welcome,')} {user.name.split(' ')[0]}</h1>
          <div className="profile-stats">
            <article><Heart/><strong>{saved.length}</strong><span>{t('Saved places')}</span></article>
            <article><RouteIcon/><strong>{itineraries.length}</strong><span>{t('Itineraries')}</span></article>
            <article><Users/><strong>0</strong><span>{t('Travel buddies')}</span></article>
          </div>
        </section>
      </div>
    </div>
  )
}

function InformationPage({page}:{page:'about'|'privacy'|'terms'}) {
  const {t}=useI18n()
  const content={
    about:{eyebrow:'ABOUT YATRAMITRA',title:'Travel Rajasthan with context',sections:[
      ['Discover with context','YatraMitra brings Rajasthan destination guides, local food and craft ideas, an editable trip planner, traveller discovery and a map into one place.'],
      ['A prototype, clearly labelled','This project is a frontend prototype. Profiles, stays, costs, opening hours and ticket prices may be sample data; no booking, identity verification or live messaging is provided.'],
    ]},
    privacy:{eyebrow:'PRIVACY',title:'Your data and this prototype',sections:[
      ['Stored in this browser','Demo profile details, saved destinations and trips, buddy requests, and chat messages are stored in browser local storage on this device. They are not synced to a YatraMitra account or server by this prototype.'],
      ['Your choices','Avoid entering sensitive personal information in demo forms or chats. Clearing this site’s browser storage removes locally saved prototype data. External map and image providers may receive requests when you use their services.'],
    ]},
    terms:{eyebrow:'TERMS',title:'Using YatraMitra',sections:[
      ['Planning information','Destination hours, weekly closures, ticket amounts, accommodation prices, travel times and suggestions are informational estimates or sample data. Confirm current details with the venue or provider before travel. No live availability, booking, reservation or price is promised.'],
      ['External services and safety','Map directions open third-party services and follow their terms. Use your judgement, follow official venue notices and current local guidance. This prototype is not an emergency service.'],
    ]},
  }[page]
  return <div className="page info-page"><div className="page-hero compact"><div><span className="kicker">{t(content.eyebrow)}</span><h1>{t(content.title)}</h1></div></div><article className="container info-content">{content.sections.map(([heading,body])=><section key={heading}><h2>{t(heading)}</h2><p>{t(body)}</p></section>)}{page==='about'&&<Link className="info-cta" to="/explore">{t('Explore destinations')} <ArrowRight size={16}/></Link>}</article></div>
}

function FeedbackPage({notify}:{notify:(text:string)=>void}) {
  const {t}=useI18n()
  const [topic,setTopic]=useState('Website usability')
  const [message,setMessage]=useState('')
  const [error,setError]=useState('')
  const submit=(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault()
    if(message.trim().length<10){setError(t('Please enter at least 10 characters of feedback.'));return}
    try{
      const current=JSON.parse(localStorage.getItem('ym-feedback')??'[]')
      if(!Array.isArray(current))throw new Error('Stored feedback has an invalid format.')
      const entry={id:crypto.randomUUID(),topic,message:message.trim(),createdAt:new Date().toISOString()}
      localStorage.setItem('ym-feedback',JSON.stringify([entry,...current].slice(0,20)))
      setMessage('')
      setError('')
      notify(t('Feedback saved on this device; it has not been sent to a support team.'))
    }catch(storageError){
      const detail=storageError instanceof Error?storageError.message:'Browser storage is unavailable.'
      setError(`${t('Could not save your feedback:')} ${detail}`)
    }
  }
  return <div className="page info-page"><div className="page-hero compact"><div><span className="kicker">{t('HELP US IMPROVE')}</span><h1>{t('Share feedback')}</h1></div></div><div className="container feedback-content"><p>{t('Feedback is saved locally in this browser only. It is not transmitted to YatraMitra.')}</p><form onSubmit={submit}><label>{t('Feedback topic')}<select value={topic} onChange={(event)=>setTopic(event.target.value)}><option>{t('Website usability')}</option><option>{t('Destination information')}</option><option>{t('Accessibility')}</option><option>{t('Something else')}</option></select></label><label>{t('Your feedback')}<textarea value={message} onChange={(event)=>setMessage(event.target.value)} minLength={10} maxLength={1000} rows={6} required placeholder={t('Please do not include passwords, contact details or other sensitive information.')}/></label><small>{message.length}/1000</small>{error&&<p role="alert" className="feedback-error">{error}</p>}<button type="submit">{t('Save feedback')} <Send size={15}/></button></form></div></div>
}

function NotFound(){const {t}=useI18n();return <div className="empty-state not-found"><Compass/><h1>{t('Page not found')}</h1><Link to="/">{t('Return home')}</Link></div>}

function Footer(){
  const {t}=useI18n()
  return <footer><div className="footer-brand"><Brand/><p>{t('Explore heritage. Connect cultures. Travel smarter.')}</p></div><nav aria-label={t('Explore')}><h4>{t('Explore')}</h4><Link to="/explore">{t('Destinations')}</Link><Link to="/experiences">{t('Local Experiences')}</Link><Link to="/hotels">{t('Hotels')}</Link><Link to="/map">{t('Map')}</Link></nav><nav aria-label={t('Plan')}><h4>{t('Plan')}</h4><Link to="/planner">{t('Trip Planner')}</Link><Link to="/buddies">{t('Travel Buddy')}</Link></nav><nav aria-label={t('Company information')}><h4>{t('YatraMitra')}</h4><Link to="/about">{t('About')}</Link><Link to="/feedback">{t('Feedback')}</Link><Link to="/privacy">{t('Privacy Policy')}</Link><Link to="/terms">{t('Terms of Use')}</Link></nav><div className="footer-bottom"><span>© 2026 YatraMitra. {t('Prototype demo.')}</span><span>{t('Sample information; verify before travel.')}</span></div></footer>
}

export default function App(){
  return <BrowserRouter><AppShell/></BrowserRouter>
}
