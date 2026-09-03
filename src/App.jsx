import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import "./App.css";

const KEY = "km_v5";
const DEFAULT_BUDGET = 8400;
const MONTH_HE = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
const DAY_HE   = ["א׳","ב׳","ג׳","ד׳","ה׳","ו׳","ש׳"];

const HOLIDAYS = {
  "2025-04-13":"פסח א׳","2025-04-18":"פסח ז׳","2025-04-30":"יום העצמאות",
  "2025-06-02":"שבועות","2025-09-22":"ראש השנה א׳","2025-09-23":"ראש השנה ב׳",
  "2025-10-01":"יום כיפור","2025-10-06":"סוכות","2025-10-13":"שמיני עצרת",
  "2026-03-03":"פורים","2026-04-02":"פסח א׳","2026-04-08":"פסח ז׳",
  "2026-04-22":"יום העצמאות","2026-05-21":"שבועות","2026-09-20":"ראש השנה א׳",
  "2026-09-21":"ראש השנה ב׳","2026-09-29":"יום כיפור","2026-10-04":"סוכות",
  "2026-10-11":"שמיני עצרת",
  "2027-03-23":"פורים","2027-04-21":"פסח א׳","2027-04-27":"פסח ז׳",
  "2027-05-11":"יום העצמאות","2027-06-11":"שבועות","2027-09-11":"ראש השנה א׳",
  "2027-09-12":"ראש השנה ב׳","2027-09-20":"יום כיפור","2027-09-25":"סוכות",
  "2027-10-02":"שמיני עצרת",
};

function daysInMonth(y,m)  { return new Date(y,m+1,0).getDate(); }
function dowOf(y,m,d)      { return new Date(y,m,d).getDay(); }

function toISO(y,m,d)      { return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`; }
function mKey(y,m)         { return `${y}-${String(m+1).padStart(2,"0")}`; }

function getDefaultState(iso,y,m,d){
  if(HOLIDAYS[iso]) return "holiday";
  const w=dowOf(y,m,d);
  return (w===5||w===6)?"off":"work";
}
function getEffectiveState(iso,y,m,d,ov){ return ov?.[iso]??getDefaultState(iso,y,m,d); }

// Counting is bounded on both sides: `from` for the month tracking started in
// (days before you owned the app were never measured) and `to` for the month in
// progress (days that haven't happened have no commute yet).
function countWorkdays(y,m,ov={},to,from){
  const last=Math.min(to??daysInMonth(y,m),daysInMonth(y,m));
  const first=Math.max(from??1,1);
  let n=0;
  for(let d=first;d<=last;d++){
    const iso=toISO(y,m,d);
    if(getEffectiveState(iso,y,m,d,ov)==="work") n++;
  }
  return n;
}

// Tracking begins the day the app was set up, which is not necessarily the day
// the km-year began. Old data has no trackFrom — it started at yearStart.
function trackFromOf(setup){ return setup?.trackFrom || setup?.yearStart; }

function migrateEntry(e){
  if(!e) return e;
  if(e.dayOverrides) return e;
  const dayOverrides={};
  for(const iso of (e.offDays||[])) dayOverrides[iso]="off";
  for(const iso of (e.extraDays||[])) dayOverrides[iso]="work";
  return {...e,dayOverrides};
}

function getYearMonths(yearStart) {
  const [sy,sm]=yearStart.split("-").map(Number);
  return Array.from({length:12},(_,i)=>{
    const t=(sm-1)+i, yr=sy+Math.floor(t/12), mo=t%12;
    return {year:yr,month:mo,key:mKey(yr,mo)};
  });
}

// Sunday-anchored week key (Israeli week)
function weekStartOf(dt){
  const t=new Date(dt.getFullYear(),dt.getMonth(),dt.getDate());
  t.setDate(t.getDate()-t.getDay());
  return t;
}
function weekKeyOf(dt){
  const s=weekStartOf(dt);
  return toISO(s.getFullYear(),s.getMonth(),s.getDate());
}


function loadData() { try{return JSON.parse(localStorage.getItem(KEY));}catch{return null;} }
function saveData(d) { try{localStorage.setItem(KEY,JSON.stringify(d));}catch{} }

const clDark = {
  bg:           "#1a1a2e",
  surface:      "#242438",
  surface2:     "#2e2e46",
  border:       "rgba(255,255,255,0.13)",
  borderStrong: "rgba(255,255,255,0.22)",
  text:         "#f2f0fa",
  muted:        "rgba(242,240,250,0.55)",
  muted2:       "rgba(242,240,250,0.82)",
  accent:       "#a78bfa",
  accentBg:     "rgba(167,139,250,0.15)",
  green:        "#34d399",
  greenBg:      "rgba(52,211,153,0.14)",
  orange:       "#fb923c",
  orangeBg:     "rgba(251,146,60,0.14)",
  red:          "#f87171",
  redBg:        "rgba(248,113,113,0.14)",
  yellow:       "#fbbf24",
  yellowBg:     "rgba(251,191,36,0.12)",
  blue:         "#818cf8",
  blueBg:       "rgba(129,140,248,0.14)",
};

const clLight = {
  bg:           "#f4f3ff",
  surface:      "#ffffff",
  surface2:     "#eeecfb",
  border:       "rgba(0,0,0,0.09)",
  borderStrong: "rgba(0,0,0,0.18)",
  text:         "#1a1730",
  muted:        "rgba(26,23,48,0.5)",
  muted2:       "rgba(26,23,48,0.78)",
  accent:       "#7c3aed",
  accentBg:     "rgba(124,58,237,0.1)",
  green:        "#059669",
  greenBg:      "rgba(5,150,105,0.1)",
  orange:       "#d97706",
  orangeBg:     "rgba(217,119,6,0.1)",
  red:          "#dc2626",
  redBg:        "rgba(220,38,38,0.1)",
  yellow:       "#b45309",
  yellowBg:     "rgba(180,83,9,0.1)",
  blue:         "#4f46e5",
  blueBg:       "rgba(79,70,229,0.1)",
};

// Hebrew letterforms aren't designed for tracking, and uppercase is a no-op —
// so section labels get weight and colour instead of spacing.
const FONT = "-apple-system,BlinkMacSystemFont,'SF Pro Display','Segoe UI',system-ui,sans-serif";

function makeS(cl){
  return {
    page:  {minHeight:"100vh",background:cl.bg,display:"flex",justifyContent:"center",padding:"20px 16px 32px",fontFamily:FONT,direction:"rtl"},
    wrap:  {width:"100%",maxWidth:"430px"},
    card:  {background:cl.surface,borderRadius:"18px",padding:"20px",marginBottom:"12px",border:`1px solid ${cl.border}`},
    cardYellow: {background:cl.yellowBg,borderRadius:"18px",padding:"18px 20px",marginBottom:"12px",border:`1px solid ${cl.yellow}33`},
    sectionTitle: {fontSize:"13px",fontWeight:700,color:cl.muted2,margin:"0 0 14px"},
    h1:    {fontSize:"26px",fontWeight:800,color:cl.text,margin:0},
    label: {display:"block",fontSize:"13px",fontWeight:600,color:cl.muted2,marginBottom:"8px",marginTop:"20px"},
    hint:  {fontSize:"12.5px",color:cl.muted,marginTop:"6px",lineHeight:"1.65"},
    input: {width:"100%",background:cl.surface2,border:`1px solid ${cl.border}`,borderRadius:"12px",color:cl.text,fontSize:"17px",fontWeight:600,padding:"15px 16px",boxSizing:"border-box",outline:"none",fontFamily:FONT},
    btn:   {width:"100%",marginTop:"20px",padding:"16px",borderRadius:"14px",background:"linear-gradient(135deg,#7c3aed 0%,#a78bfa 100%)",color:"#fff",fontWeight:700,fontSize:"15px",border:"none",cursor:"pointer",fontFamily:FONT},
    btnGhost: {padding:"10px 15px",borderRadius:"11px",background:"transparent",border:`1px solid ${cl.border}`,color:cl.muted2,fontSize:"13.5px",fontWeight:600,cursor:"pointer",fontFamily:FONT},
    tab:  (a)=>({flex:1,padding:"11px 4px",background:a?cl.surface:"transparent",color:a?cl.text:cl.muted,border:"none",cursor:"pointer",fontWeight:a?700:500,fontSize:"14px",fontFamily:FONT,borderRadius:"10px",boxShadow:a?"0 1px 4px rgba(0,0,0,0.12)":"none",transition:"all .18s"}),
    tabs: {display:"flex",background:cl.surface2,borderRadius:"14px",padding:"4px",marginBottom:"18px",border:`1px solid ${cl.border}`},
    row:  {display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 0",borderBottom:`1px solid ${cl.border}`,fontSize:"14px"},
    badge:(c,bg)=>({display:"inline-flex",alignItems:"center",padding:"5px 12px",borderRadius:"20px",fontSize:"12.5px",fontWeight:700,color:c,background:bg}),
  };
}

function RingProgress({pct,color,trackColor}){
  const r=46, circ=2*Math.PI*r, offset=circ-(Math.min(pct,100)/100)*circ;
  return(
    <svg width="120" height="120" style={{transform:"rotate(-90deg)",flexShrink:0}}>
      <circle cx="60" cy="60" r={r} fill="none" stroke={trackColor||"rgba(255,255,255,0.07)"} strokeWidth="9"/>
      <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{transition:"stroke-dashoffset 1.1s cubic-bezier(0.4,0,0.2,1)",filter:`drop-shadow(0 0 6px ${color}88)`}}/>
    </svg>
  );
}

const REMINDER_KEY = "km_reminder_dismissed";
const INSTALL_KEY  = "km_install_dismissed";
const WEEK_MS      = 7*24*60*60*1000;

function isInstalled(){
  try{
    return window.matchMedia("(display-mode: standalone)").matches
        || window.navigator.standalone === true;   // iOS Safari
  }catch{ return false; }
}
const isIOS = ()=>/iphone|ipad|ipod/i.test(navigator.userAgent);

export default function App() {
  // Stable for the session — a fresh `new Date()` each render would make every
  // memo that depends on it recompute on every keystroke.
  const today = useMemo(()=>{
    const n=new Date();
    return new Date(n.getFullYear(),n.getMonth(),n.getDate());
  },[]);
  const todayISO = toISO(today.getFullYear(),today.getMonth(),today.getDate());
  const todayKey = mKey(today.getFullYear(),today.getMonth());

  const [isDark, setIsDark] = useState(()=>window.matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(()=>{
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = e => setIsDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  },[]);
  const cl = isDark ? clDark : clLight;
  const S  = makeS(cl);

  const [appData, setAppData] = useState(null);
  const [screen,  setScreen]  = useState("loading");
  const [tab,     setTab]     = useState("dashboard");
  const [toast,   setToast]   = useState(null);
  const [reminderDismissed, setReminderDismissed] = useState(()=>{
    try{ return localStorage.getItem(REMINDER_KEY)||""; }catch{ return ""; }
  });
  // ── Install prompt: offered at most once a week, never once installed ──
  const [installEvt, setInstallEvt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  useEffect(()=>{
    if(isInstalled()) return;
    let last=0;
    try{ last=Number(localStorage.getItem(INSTALL_KEY))||0; }catch{}
    if(Date.now()-last < WEEK_MS) return;
    // Chrome hands us a deferred prompt; iOS never does, so show instructions.
    const onPrompt=(e)=>{ e.preventDefault(); setInstallEvt(e); setShowInstall(true); };
    window.addEventListener("beforeinstallprompt",onPrompt);
    const t=setTimeout(()=>{ if(isIOS()) setShowInstall(true); },1200);
    const onInstalled=()=>{ setShowInstall(false); setInstallEvt(null); };
    window.addEventListener("appinstalled",onInstalled);
    return ()=>{ window.removeEventListener("beforeinstallprompt",onPrompt);
                 window.removeEventListener("appinstalled",onInstalled); clearTimeout(t); };
  },[]);

  function dismissInstall(){
    try{ localStorage.setItem(INSTALL_KEY,String(Date.now())); }catch{}
    setShowInstall(false);
  }
  async function doInstall(){
    if(!installEvt) return;
    installEvt.prompt();
    try{ await installEvt.userChoice; }catch{}
    setInstallEvt(null); dismissInstall();
  }

  const [showSettings, setShowSettings] = useState(false);
  const [showAbout,    setShowAbout]    = useState(false);
  const [settingsForm, setSettingsForm] = useState({commute:"",yearlyBudget:""});

  const [sf, setSf] = useState({yearStart:`${today.getFullYear()}-01-01`,startOdo:"",commute:"62",
                                yearlyBudget:String(DEFAULT_BUDGET),mode:"today",priorPersonal:""});

  // Joining after the km-year already began needs different questions
  const midYear = useMemo(()=>{
    if(!sf.yearStart) return false;
    return sf.yearStart.slice(0,7) < todayKey;
  },[sf.yearStart,todayKey]);
  const monthsSinceStart = useMemo(()=>{
    if(!midYear) return 0;
    const [y,m]=sf.yearStart.split("-").map(Number);
    return (today.getFullYear()-y)*12+(today.getMonth()-(m-1));
  },[midYear,sf.yearStart,today]);

  const [uf, setUf] = useState({year:today.getFullYear(),month:today.getMonth(),odometer:"",dayOverrides:{}});
  const TAB_ORDER=["dashboard","update","history"];
  const [tabDir,setTabDir]=useState(0);
  const goTab=(k)=>{ setTabDir(TAB_ORDER.indexOf(k)-TAB_ORDER.indexOf(tab)); setTab(k); };
  const tabAnim=tabDir===0?"tab-content":`tab-content ${tabDir>0?"from-start":"from-end"}`;

  const [showCalendar, setShowCalendar] = useState(false);
  const [showDetails, setShowDetails]   = useState(false);
  // Synchronous mirror of `uf` — lets rapid stepper taps read the freshest value
  const ufRef = useRef(uf);
  ufRef.current = uf;
  const [dayModal, setDayModal] = useState(null); // {iso, year, month, d}
  const [modalState, setModalState] = useState(null);

  useEffect(()=>{
    const d=loadData();
    setAppData(d);
    setScreen(d?.setup?"main":"setup");
    // Early in the month you're usually here to close out the month that just
    // ended — open that one instead of a nearly-empty current month.
    if(d?.setup && today.getDate()<=5){
      const pm=new Date(today.getFullYear(),today.getMonth()-1,1);
      const pk=mKey(pm.getFullYear(),pm.getMonth());
      const inYear=getYearMonths(d.setup.yearStart).some(m=>m.key===pk);
      if(inYear && !d.months?.[pk]?.odometer){
        const ex=migrateEntry(d.months?.[pk]);
        setUf({year:pm.getFullYear(),month:pm.getMonth(),odometer:"",
               dayOverrides:ex?.dayOverrides||{}});
      }
    }
  },[]);


  // Register Service Worker
  useEffect(()=>{
    if(!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(import.meta.env.BASE_URL + "sw.js").then(reg=>{
      // Listen for notification-click → open update tab
      navigator.serviceWorker.addEventListener("message",(e)=>{
        if(e.data?.type==="OPEN_UPDATE_TAB") goTab("update");
      });
      // Register Periodic Background Sync if supported (~Chrome Android)
      if("periodicSync" in reg){
        Notification.requestPermission().then(perm=>{
          if(perm==="granted"){
            reg.periodicSync.register("km-monthly-reminder",{minInterval: 24*60*60*1000})
              .catch(()=>{});
          }
        });
      }
    }).catch(()=>{});
  },[]);

  // The month a reminder should be about: the one that just ended, if it has
  // no reading yet. Falls back to the current month once we're past mid-month.
  const pendingMonth = useMemo(()=>{
    if(!appData?.setup) return null;
    const inYear=(k)=>getYearMonths(appData.setup.yearStart).some(m=>m.key===k);
    const pm=new Date(today.getFullYear(),today.getMonth()-1,1);
    const pk=mKey(pm.getFullYear(),pm.getMonth());
    if(inYear(pk)&&!appData.months?.[pk]?.odometer)
      return {key:pk,name:MONTH_HE[pm.getMonth()],year:pm.getFullYear(),month:pm.getMonth()};
    if(today.getDate()>=15&&inYear(todayKey)&&!appData.months?.[todayKey]?.odometer)
      return {key:todayKey,name:MONTH_HE[today.getMonth()],year:today.getFullYear(),month:today.getMonth()};
    return null;
  },[appData,today,todayKey]);

  function syncStateToSW(d, dismissed, pending){
    if(!("serviceWorker" in navigator)||!navigator.serviceWorker.controller) return;
    navigator.serviceWorker.controller.postMessage({
      type:"KM_STATE",
      payload:{
        pendingMonth:     pending?.key  ?? null,
        pendingMonthName: pending?.name ?? null,
        reminderDismissed: dismissed ?? localStorage.getItem(REMINDER_KEY) ?? "",
      }
    });
  }

  // Keep the worker's picture current whenever the pending month changes
  useEffect(()=>{ syncStateToSW(appData,null,pendingMonth); },[pendingMonth]);

  function persist(d){
    setAppData({...d});
    saveData({...d});
    // Give SW time to activate on first load
    setTimeout(()=>syncStateToSW(d, null, pendingMonth), 500);
  }

  function dismissReminder(){
    const k=pendingMonth?.key||todayKey;
    try{ localStorage.setItem(REMINDER_KEY, k); }catch{}
    setReminderDismissed(k);
    syncStateToSW(appData, pendingMonth?.key||todayKey, pendingMonth);
  }

  // Async-safe persist — always builds on the freshest state
  function persistWith(updater){
    setAppData(prev=>{
      const next=updater(prev);
      if(!next) return prev;
      saveData(next);
      setTimeout(()=>syncStateToSW(next,null,pendingMonth),300);
      return next;
    });
  }

  function showToast(msg,color=cl.green){
    setToast({msg,color});
    setTimeout(()=>setToast(null),2500);
  }

  // ── Set a single day's state directly in stored data ──────────────────
  function setDayState(y,m,d,state){
    const iso=toISO(y,m,d), mk=mKey(y,m), def=getDefaultState(iso,y,m,d);
    const apply=(src)=>{ const ov={...src}; if(state===def) delete ov[iso]; else ov[iso]=state; return ov; };
    // update the synchronous mirror first so back-to-back calls compound
    if(ufRef.current.year===y&&ufRef.current.month===m){
      ufRef.current={...ufRef.current,dayOverrides:apply(ufRef.current.dayOverrides)};
    }
    persistWith(prev=>{
      if(!prev?.setup) return prev;
      const ex=migrateEntry(prev.months?.[mk])||{dayOverrides:{}};
      return {...prev,months:{...(prev.months||{}),[mk]:{...ex,dayOverrides:apply(ex.dayOverrides||{})}}};
    });
    setUf(p=>(p.year!==y||p.month!==m)?p:{...p,dayOverrides:apply(p.dayOverrides)});
  }

  // ── Workday stepper: nudge the count without opening the calendar ─────
  // Reads through ufRef so rapid taps compound instead of fighting a stale render.
  function adjustWorkDays(delta){
    const {year,month}=ufRef.current;
    const mk=mKey(year,month);
    const maxD=mk===todayKey?today.getDate():daysInMonth(year,month);
    const ov=ufRef.current.dayOverrides;
    let target=null;
    if(delta<0){
      for(let d=maxD;d>=1&&!target;d--){
        const iso=toISO(year,month,d);
        if(getEffectiveState(iso,year,month,d,ov)==="work") target={d,state:"off"};
      }
    }else{
      // prefer undoing a previous "off" on a normal workday
      for(let d=maxD;d>=1&&!target;d--){
        const iso=toISO(year,month,d);
        if(ov[iso]&&ov[iso]!=="work"&&getDefaultState(iso,year,month,d)==="work") target={d,state:"work"};
      }
      for(let d=maxD;d>=1&&!target;d--){
        const iso=toISO(year,month,d);
        if(getEffectiveState(iso,year,month,d,ov)!=="work") target={d,state:"work"};
      }
    }
    if(target) setDayState(year,month,target.d,target.state);
  }

  // ── Weekly check-in: "how many days did you drive this week?" ─────────
  function applyWeeklyCheckin(count){
    if(!appData?.setup) return;
    const sunday=weekStartOf(today);
    const days=[];
    for(let i=0;i<=today.getDay();i++){
      const dt=new Date(sunday.getFullYear(),sunday.getMonth(),sunday.getDate()+i);
      const y=dt.getFullYear(),m=dt.getMonth(),d=dt.getDate(),k=mKey(y,m);
      // A week can start in the previous month. That month may already have a
      // saved reading — rewriting its days would silently change a figure the
      // user has already closed out, so those days are left alone.
      if(appData.months?.[k]?.odometer) continue;
      days.push({y,m,d,iso:toISO(y,m,d),mk:k});
    }
    if(!days.length){ skipWeeklyCheckin(); showToast("השבוע כבר מכוסה בחודש שנסגר"); return; }
    const months={...(appData.months||{})};
    for(const x of days) months[x.mk]=migrateEntry(months[x.mk])||{dayOverrides:{}};
    // clear this week's overrides so a re-answer replaces the previous one
    for(const x of days){
      const ov={...(months[x.mk].dayOverrides||{})};
      delete ov[x.iso];
      months[x.mk]={...months[x.mk],dayOverrides:ov};
    }
    const defWork=days.filter(x=>getDefaultState(x.iso,x.y,x.m,x.d)==="work");
    // fewer days than the default → mark the latest workdays as off
    for(let i=0;i<Math.max(0,defWork.length-count);i++){
      const x=defWork[defWork.length-1-i];
      months[x.mk]={...months[x.mk],dayOverrides:{...months[x.mk].dayOverrides,[x.iso]:"off"}};
    }
    // more days than the default → promote weekend/holiday days
    const nonWork=days.filter(x=>getDefaultState(x.iso,x.y,x.m,x.d)!=="work");
    for(let i=0;i<Math.max(0,count-defWork.length)&&i<nonWork.length;i++){
      const x=nonWork[i];
      months[x.mk]={...months[x.mk],dayOverrides:{...months[x.mk].dayOverrides,[x.iso]:"work"}};
    }
    persist({...appData,months,lastWeekLogged:weekKeyOf(today)});
    // keep the edit form in sync if it's showing an affected month
    const ufMk=mKey(uf.year,uf.month);
    if(months[ufMk]) setUf(p=>({...p,dayOverrides:months[ufMk].dayOverrides||{}}));
    showToast(`נרשמו ${count} ימי עבודה השבוע ✓`);
  }

  function skipWeeklyCheckin(){
    persistWith(prev=>prev?{...prev,lastWeekLogged:weekKeyOf(today)}:prev);
  }

  // ── Backup / restore ─────────────────────────────────────────────────
  function exportJSON(){
    if(!appData) return;
    const blob=new Blob([JSON.stringify(appData,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url; a.download=`8-400-backup-${todayISO}.json`; a.click();
    URL.revokeObjectURL(url);
    showToast("גיבוי הורד ✓");
  }

  function importJSON(file){
    if(!file) return;
    const reader=new FileReader();
    reader.onload=e=>{
      try{
        const d=JSON.parse(e.target.result);
        const s=d?.setup;
        const ok = s && /^\d{4}-\d{2}-\d{2}$/.test(s.yearStart||"")
          && Number.isFinite(Number(s.startOdometer)) && Number(s.commute)>0
          && (d.months==null || (typeof d.months==="object" && !Array.isArray(d.months)));
        if(!ok) throw new Error("invalid");
        if(!window.confirm("לשחזר את הגיבוי? כל הנתונים הנוכחיים יוחלפו.")) return;
        persist({...d,months:d.months||{}});
        setShowSettings(false); showToast("הנתונים שוחזרו ✓");
      }catch{ showToast("קובץ גיבוי לא תקין",cl.red); }
    };
    reader.readAsText(file);
  }

  // ── Start a new tracking year ────────────────────────────────────────
  function startNewYear(){
    if(!appData?.setup) return;
    const months=getYearMonths(appData.setup.yearStart);
    const lastRec=[...months].reverse().find(m=>appData.months?.[m.key]?.odometer);
    const startOdometer=lastRec?appData.months[lastRec.key].odometer:appData.setup.startOdometer;
    const [sy,sm,sd]=appData.setup.yearStart.split("-").map(Number);
    const newStart=`${sy+1}-${String(sm).padStart(2,"0")}-${String(sd).padStart(2,"0")}`;
    if(!window.confirm(`להתחיל שנה חדשה מ-${newStart}?\nהשנה הקודמת תישמר בארכיון.`)) return;
    persistWith(prev=>({
      ...prev,
      setup:{...prev.setup,yearStart:newStart,startOdometer},
      months:{},
      archive:[...(prev.archive||[]),{yearStart:prev.setup.yearStart,months:prev.months||{},
               budget:prev.setup.yearlyBudget||DEFAULT_BUDGET}],
    }));
    setUf({year:today.getFullYear(),month:today.getMonth(),odometer:"",dayOverrides:{}});
    showToast("שנה חדשה החלה ✓");
  }

  // Returns the last recorded odometer before this month, plus any months that
  // were skipped since then — their km are folded into this month's total, so
  // their workdays must be counted too or personal km get wildly inflated.
  // Month tracking began in, and the day within it
  const trackFrom    = trackFromOf(appData?.setup);
  const trackFromKey = trackFrom ? trackFrom.slice(0,7) : null;
  const trackFromDay = trackFrom ? Number(trackFrom.slice(8,10)) : 1;

  const getPrevInfo = useCallback((year,month)=>{
    if(!appData?.setup) return {odo:0,gapMonths:[]};
    const tk=trackFromOf(appData.setup).slice(0,7);
    const months=getYearMonths(appData.setup.yearStart);
    let prev=appData.setup.startOdometer, gap=[];
    for(const m of months){
      if(m.year===year&&m.month===month) break;
      if(m.key<tk) continue;                       // before the app existed
      if(appData.months?.[m.key]?.odometer){ prev=appData.months[m.key].odometer; gap=[]; }
      else gap.push(m);
    }
    return {odo:prev,gapMonths:gap};
  },[appData]);

  const getPrevOdo = useCallback((year,month)=>getPrevInfo(year,month).odo,[getPrevInfo]);

  // A month still in progress is counted only up to today, so a mid-month
  // reading isn't charged for commutes that haven't happened yet. This must
  // match what the update screen previews, or the number changes on save.
  const capFor = useCallback((year,month)=>
    mKey(year,month)===todayKey ? today.getDate() : undefined
  ,[todayKey,today]);

  // First counted day: the month tracking started in begins mid-month
  const floorFor = useCallback((year,month)=>
    mKey(year,month)===trackFromKey ? trackFromDay : undefined
  ,[trackFromKey,trackFromDay]);

  // Workdays for a month, plus those of any skipped months folded into it
  const workDaysFor = useCallback((year,month,overrides,gapMonths)=>{
    let n=countWorkdays(year,month,overrides||{},capFor(year,month),floorFor(year,month));
    for(const g of (gapMonths||[])){
      const ge=migrateEntry(appData?.months?.[g.key]);
      n+=countWorkdays(g.year,g.month,ge?.dayOverrides||{},capFor(g.year,g.month),floorFor(g.year,g.month));
    }
    return n;
  },[appData,capFor,floorFor]);

  const calcMonth = useCallback((year,month)=>{
    const mk=mKey(year,month);
    const entry=appData?.months?.[mk];
    if(!entry?.odometer) return null;
    const {odo:prevOdo,gapMonths}=getPrevInfo(year,month);
    const totalKm=entry.odometer-prevOdo;
    const me=migrateEntry(entry);
    const workDays=workDaysFor(year,month,me.dayOverrides||{},gapMonths);
    const workKm=workDays*(appData.setup.commute||62);
    const personal=Math.max(0,totalKm-workKm);
    return {totalKm,workDays,workKm,personal,odometer:entry.odometer,
            dayOverrides:me.dayOverrides||{},gapMonths};
  },[appData,getPrevInfo,workDaysFor]);

  const annual=useMemo(()=>{
    if(!appData?.setup) return null;
    const months=getYearMonths(appData.setup.yearStart);
    const tk=trackFromOf(appData.setup).slice(0,7);
    // Km already spent this cycle before the app was installed. Zero for anyone
    // who started at the beginning of their km-year.
    const priorPersonal=Math.max(0,Number(appData.setup.priorPersonal)||0);
    let totalPersonal=priorPersonal;
    const byMonth={};
    for(const {year,month,key} of months){
      if(key<tk) continue;                         // no data for these
      const s=calcMonth(year,month);
      if(s){totalPersonal+=s.personal;byMonth[key]=s;}
    }
    const budget=appData.setup.yearlyBudget||DEFAULT_BUDGET;
    const remaining=Math.max(0,budget-totalPersonal);
    const monthsLeft=months.filter(m=>m.key>=todayKey).length;
    const allowance=monthsLeft>0?Math.round(remaining/monthsLeft):0;
    const pct=Math.min(100,Math.round(totalPersonal/budget*100));
    const maxPersonal=Math.max(1,...Object.values(byMonth).map(s=>s.personal));

    // Forecast: project the tracked months' average across the months that are
    // actually being tracked, then add what was already spent before setup.
    const recorded=Object.values(byMonth);
    const trackedTotal=totalPersonal-priorPersonal;
    const avg=recorded.length?trackedTotal/recorded.length:0;
    const trackedMonths=months.filter(m=>m.key>=tk).length;
    const projected=Math.round(priorPersonal+avg*trackedMonths);
    const overBy=projected-budget;

    // Year boundary: has the tracked 12-month window finished?
    const lastKey=months[months.length-1].key;
    const yearEnded=todayKey>lastKey;

    // Daily budget for the rest of the current month
    const dim=daysInMonth(today.getFullYear(),today.getMonth());
    const daysLeftInMonth=Math.max(1,dim-today.getDate()+1);
    const perDay=Math.round(allowance/daysLeftInMonth);

    // Precision only matters near the limit — one workday is worth `commute` km
    const commute=appData.setup.commute||62;
    const oneDayShare=remaining>0?(commute/remaining):1;
    const precisionMatters=pct>=65||oneDayShare>0.08;

    return {totalPersonal,remaining,monthsLeft,allowance,pct,byMonth,months,budget,
            maxPersonal,projected,overBy,avg,yearEnded,lastKey,perDay,daysLeftInMonth,
            precisionMatters,recordedCount:recorded.length,commute,priorPersonal,trackedMonths};
  },[appData,todayKey,calcMonth,today]);

  // Workdays in the currently-edited month, counted only up to today when the
  // month is still running (a mid-month reading can't include future commutes).
  const ufWorkDays=useMemo(()=>{
    const mk=mKey(uf.year,uf.month);
    const upTo=mk<todayKey?daysInMonth(uf.year,uf.month):mk===todayKey?today.getDate():0;
    let n=0;
    for(let d=1;d<=upTo;d++){
      const iso=toISO(uf.year,uf.month,d);
      if(getEffectiveState(iso,uf.year,uf.month,d,uf.dayOverrides)==="work") n++;
    }
    return n;
  },[uf.year,uf.month,uf.dayOverrides,todayKey,today]);

  const livePreview=useMemo(()=>{
    if(!appData?.setup||!uf.odometer) return null;
    const {odo:prevOdo,gapMonths}=getPrevInfo(uf.year,uf.month);
    const totalKm=Number(uf.odometer)-prevOdo;
    if(totalKm<0||isNaN(totalKm)) return null;
    let workDays=ufWorkDays;
    for(const g of gapMonths){
      const ge=migrateEntry(appData?.months?.[g.key]);
      workDays+=countWorkdays(g.year,g.month,ge?.dayOverrides||{},capFor(g.year,g.month));
    }
    const workKm=workDays*(appData.setup.commute||62);
    const personal=Math.max(0,totalKm-workKm);
    return {totalKm,workDays,workKm,personal,prevOdo,gapMonths};
  },[uf.odometer,uf.year,uf.month,appData,getPrevInfo,ufWorkDays,capFor]);


  // The single "am I OK?" answer the dashboard leads with
  const verdict = useMemo(()=>{
    if(!annual) return null;
    const over = annual.recordedCount>=2 && annual.overBy>0;
    if(annual.remaining<=0) return {icon:"🔴",color:cl.red,tint:cl.redBg,title:"חרגת מהמכסה",
      line:`ניצלת את כל ${annual.budget.toLocaleString()} הק״מ השנתיים.`};
    if(over) return {icon:"⚠️",color:cl.orange,tint:cl.orangeBg,title:"צפויה חריגה",
      line:<>בקצב הנוכחי תחרוג ב-<strong style={{color:cl.orange}}>{annual.overBy.toLocaleString()}</strong> ק״מ.
            כדאי לרדת ל-{annual.allowance.toLocaleString()} ק״מ בחודש.</>};
    if(annual.pct>=85) return {icon:"⚠️",color:cl.orange,tint:cl.orangeBg,title:"שים לב",
      line:<>נשארו <strong style={{color:cl.orange}}>{annual.remaining.toLocaleString()}</strong> ק״מ בלבד
            ל-{annual.monthsLeft} החודשים הבאים.</>};
    return {icon:"✅",color:cl.green,tint:cl.greenBg,title:"אתה בסדר",
      line:<>נשארו <strong style={{color:cl.text}}>{annual.remaining.toLocaleString()}</strong> ק״מ
            מתוך {annual.budget.toLocaleString()}.</>};
  },[annual,cl]);

  function openDayModal(iso, year, month, d){
    setModalState(getEffectiveState(iso, year, month, d, uf.dayOverrides));
    setDayModal({iso, year, month, d});
  }

  // One decision per day now, so tapping a state saves and closes.
  function saveDayModal(newState){
    if(!dayModal) return;
    const {year, month, d} = dayModal;
    setDayState(year, month, d, newState);
    setDayModal(null);
  }

  function handleSetup(){
    const odo=Number(sf.startOdo), c=Number(sf.commute), b=Number(sf.yearlyBudget)||DEFAULT_BUDGET;
    if(!sf.yearStart||!(odo>=0)||!(c>0)){ showToast("בדוק את הערכים שהזנת",cl.red); return; }
    // "today" mode measures from now, so the odometer belongs to today, not to
    // the start of the km-year, and anything already spent is carried in.
    const startedToday = midYear && sf.mode==="today";
    const d={setup:{
      yearStart:sf.yearStart,
      trackFrom: startedToday ? todayISO : sf.yearStart,
      startOdometer:odo, commute:c, yearlyBudget:b,
      priorPersonal: startedToday ? Math.max(0,Number(sf.priorPersonal)||0) : 0,
    },months:{}};
    persist(d);
    setScreen("main");
    showToast("ההגדרות נשמרו ✓");
  }

  function handleSaveSettings(){
    const c=Number(settingsForm.commute), b=Number(settingsForm.yearlyBudget);
    if(!(c>0)||!(b>0)){ showToast("הזן מספרים חיוביים",cl.red); return; }
    const newData={
      ...appData,
      setup:{...appData.setup,commute:c,yearlyBudget:b}
    };
    persist(newData);
    setShowSettings(false);
    showToast("ההגדרות עודכנו ✓");
  }

  function handleSave(){
    if(!uf.odometer) return;
    const prevOdo=getPrevOdo(uf.year,uf.month);
    if(Number(uf.odometer)<prevOdo){
      alert("קריאת המד לא יכולה להיות קטנה מהקריאה הקודמת ("+prevOdo+")");
      return;
    }
    // Typo guard — a mistyped digit can silently wipe out the whole budget
    if(livePreview){
      const spanMonths=1+(livePreview.gapMonths?.length||0);
      if(livePreview.totalKm>spanMonths*7000){
        const ok=window.confirm(
          `הקריאה מראה ${livePreview.totalKm.toLocaleString()} ק״מ ב-${spanMonths===1?"חודש":`${spanMonths} חודשים`}.\n`+
          `זה נראה גבוה מאוד — אולי נפלה טעות הקלדה?\n\nלשמור בכל זאת?`);
        if(!ok) return;
      }
    }
    if(livePreview&&annual&&annual.allowance>0&&livePreview.personal>annual.allowance*1.2){
      const ok=window.confirm(`ק"מ פרטיים (${livePreview.personal}) חורגים ב-20% מהמכסה החודשית (${annual.allowance}).\nלשמור בכל זאת?`);
      if(!ok) return;
    }
    const mk=mKey(uf.year,uf.month);
    const newData={
      ...appData,
      months:{...(appData.months||{}),[mk]:{odometer:Number(uf.odometer),dayOverrides:uf.dayOverrides,savedAt:new Date().toISOString()}}
    };
    persist(newData);
    showToast(`${MONTH_HE[uf.month]} נשמר ✓`);
    goTab("dashboard");
  }

  function openUpdate(year,month){
    const mk=mKey(year,month);
    const ex=migrateEntry(appData?.months?.[mk]);
    setUf({year,month,odometer:ex?.odometer?.toString()||"",dayOverrides:ex?.dayOverrides||{}});
    goTab("update");
  }

  function navigateMonth(dir){
    setUf(prev=>{
      const d=new Date(prev.year,prev.month+dir,1);
      const y=d.getFullYear(),m=d.getMonth();
      // A month that hasn't happened has nothing to record, and letting the
      // stepper loose there writes overrides the counter can never show.
      const k=mKey(y,m);
      if(k>todayKey||(trackFromKey&&k<trackFromKey)) return prev;
      const ex=migrateEntry(appData?.months?.[mKey(y,m)]);
      return {year:y,month:m,odometer:ex?.odometer?.toString()||"",dayOverrides:ex?.dayOverrides||{}};
    });
  }

  const atCurrentMonth = mKey(uf.year,uf.month)>=todayKey;
  const atFirstMonth   = !!trackFromKey && mKey(uf.year,uf.month)<=trackFromKey;

  function doReset(){
    if(!window.confirm("לאפס את כל הנתונים ולהתחיל מחדש?")) return;
    localStorage.removeItem(KEY);
    setAppData(null);
    setScreen("setup");
    goTab("dashboard");
  }

  function exportCSV(){
    if(!annual) return;
    const rows=[["חודש","ימי עבודה","ק\"מ עבודה","ק\"מ פרטי","סה\"כ ק\"מ"]];
    for(const {year,month,key} of annual.months){
      const s=annual.byMonth[key];
      if(!s) continue;
      rows.push([`${MONTH_HE[month]} ${year}`,s.workDays,s.workKm,s.personal,s.totalKm]);
    }
    const csv="\uFEFF"+rows.map(r=>r.join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download=`km-tracker-${appData.setup.yearStart}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if(screen==="loading") return null;

  if(screen==="setup") return(
    <div style={S.page}>
      <div style={S.wrap}>
        <div style={{paddingBottom:"28px",marginBottom:"28px"}}>
          <div style={{fontSize:"13px",fontWeight:600,color:cl.accent,marginBottom:"10px"}}>ברוך הבא</div>
          <div style={{...S.h1,fontSize:"32px"}}>🚗 8-400</div>
          <div style={{fontSize:"14px",color:cl.muted2,marginTop:"8px",lineHeight:"1.6"}}>ניהול חכם של ק״מ שנתי</div>
        </div>
        <div style={{...S.cardYellow,display:"flex",gap:"14px",alignItems:"flex-start"}}>
          <span style={{fontSize:"22px",lineHeight:1,marginTop:"2px"}}>💡</span>
          <div style={{fontSize:"13px",color:cl.yellow,lineHeight:"1.7"}}>
            <strong>פעם בחודש</strong> מזינים את קריאת המד ומסמנים ימים שלא נסעתם לעבודה. הכל מחושב אוטומטית.
          </div>
        </div>
        <div style={S.card}>
          <div style={S.sectionTitle}>הגדרות ראשוניות</div>

          <label style={{...S.label,marginTop:0}}>מתי מתחדשת מכסת הק״מ שלך?</label>
          <input style={S.input} type="date" value={sf.yearStart} onChange={e=>setSf({...sf,yearStart:e.target.value})}/>
          <p style={S.hint}>בדרך כלל 1 בינואר. זה החלון שהתקציב השנתי נספר בתוכו.</p>

          {midYear ? (
            <>
              <div style={{...S.cardYellow,marginTop:"18px",marginBottom:"4px"}}>
                <div style={{fontSize:"13.5px",fontWeight:700,color:cl.yellow,marginBottom:"6px"}}>
                  אתה מצטרף באמצע השנה
                </div>
                <div style={{fontSize:"12.5px",color:cl.muted2,lineHeight:"1.7"}}>
                  כבר נסעת {monthsSinceStart} חודשים מהמכסה הנוכחית. בחר איך להתחיל:
                </div>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginTop:"14px"}}>
                {[["known","יש לי הקריאה מתחילת השנה"],["today","אתחיל למדוד מהיום"]].map(([k,l])=>(
                  <button key={k} onClick={()=>setSf({...sf,mode:k})}
                    style={{padding:"14px 10px",borderRadius:"12px",cursor:"pointer",fontFamily:FONT,
                      fontSize:"12.5px",fontWeight:700,lineHeight:"1.45",
                      border:`2px solid ${sf.mode===k?cl.accent:"transparent"}`,
                      background:sf.mode===k?cl.accentBg:cl.surface2,
                      color:sf.mode===k?cl.accent:cl.muted2}}>{l}</button>
                ))}
              </div>

              {sf.mode==="known" ? (
                <>
                  <label style={S.label}>קריאת המד ב-{sf.yearStart} (ק״מ)</label>
                  <input style={S.input} type="number" placeholder="למשל: 45000"
                    value={sf.startOdo} onChange={e=>setSf({...sf,startOdo:e.target.value})}/>
                  <p style={S.hint}>הכי מדויק — כל השנה תחושב נכון מהיום הראשון.</p>
                </>
              ) : (
                <>
                  <label style={S.label}>קריאת המד היום (ק״מ)</label>
                  <input style={S.input} type="number" placeholder="למשל: 53600"
                    value={sf.startOdo} onChange={e=>setSf({...sf,startOdo:e.target.value})}/>
                  <label style={S.label}>כמה ק״מ פרטי כבר ניצלת השנה?</label>
                  <input style={S.input} type="number" placeholder="למשל: 3500 — אם לא ידוע, השאר ריק"
                    value={sf.priorPersonal} onChange={e=>setSf({...sf,priorPersonal:e.target.value})}/>
                  <p style={{...S.hint,color:cl.yellow}}>
                    בלי המספר הזה המכסה החודשית תיראה גדולה ממה שבאמת נשאר לך.
                    אפשר לקבל אותו מהליסינג או ממחלקת הרכב.
                  </p>
                </>
              )}
            </>
          ) : (
            <>
              <label style={S.label}>קריאת המד בתאריך זה (ק״מ)</label>
              <input style={S.input} type="number" placeholder="למשל: 45000"
                value={sf.startOdo} onChange={e=>setSf({...sf,startOdo:e.target.value})}/>
            </>
          )}

          <label style={S.label}>הלוך-חזור לעבודה (ק"מ ליום)</label>
          <input style={S.input} type="number" placeholder="למשל: 62" value={sf.commute} onChange={e=>setSf({...sf,commute:e.target.value})}/>
          <label style={S.label}>תקציב ק"מ פרטי שנתי</label>
          <input style={S.input} type="number" placeholder="למשל: 8400" value={sf.yearlyBudget} onChange={e=>setSf({...sf,yearlyBudget:e.target.value})}/>
          <button className="btn-main" style={S.btn} onClick={handleSetup}>התחל מעקב ←</button>
        </div>
      </div>
    </div>
  );

  function renderCalendar(){
    const {year,month}=uf;
    const dim=daysInMonth(year,month);
    const firstDow=dowOf(year,month,1);
    const cells=Array(firstDow).fill(null);
    for(let d=1;d<=dim;d++) cells.push(d);
    while(cells.length%7!==0) cells.push(null);

    const STATE_CFG={
      work:    {label:"עבדתי",    icon:"🚗", bg:"rgba(52,211,153,0.13)",  color:cl.green,  border:"rgba(52,211,153,0.4)"},
      off:     {label:"לא עבדתי", icon:"🏠", bg:"rgba(248,113,113,0.13)", color:cl.red,    border:"rgba(248,113,113,0.4)"},
      holiday: {label:"חג / חופש",icon:"🟡", bg:"rgba(251,191,36,0.1)",   color:cl.yellow, border:"rgba(251,191,36,0.3)"},
    };

    return(
      <div>
        {/* Legend — one quiet row, not three competing cards */}
        <div style={{display:"flex",justifyContent:"center",gap:"16px",marginBottom:"16px",flexWrap:"wrap"}}>
          {Object.entries(STATE_CFG).map(([k,c])=>(
            <div key={k} style={{display:"flex",alignItems:"center",gap:"5px"}}>
              <span style={{fontSize:"13px"}}>{c.icon}</span>
              <span style={{fontSize:"12px",fontWeight:600,color:cl.muted2}}>{c.label}</span>
            </div>
          ))}
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"3px",marginBottom:"7px"}}>
          {DAY_HE.map(h=><div key={h} style={{textAlign:"center",fontSize:"11.5px",color:cl.muted,padding:"2px 0",fontWeight:700}}>{h}</div>)}
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"3px"}}>
          {cells.map((d,i)=>{
            if(!d) return <div key={i}/>;
            const iso=toISO(year,month,d);
            const state=getEffectiveState(iso,year,month,d,uf.dayOverrides);
            const cfg=STATE_CFG[state];
            const holiday=HOLIDAYS[iso];
            const isToday=iso===todayISO;
            // Days that haven't happened aren't counted, so they mustn't look
            // like they were — otherwise the calendar contradicts the counter.
            const isFuture=iso>todayISO;

            return(
              <div key={i} className="day-cell" onClick={()=>openDayModal(iso,year,month,d)}
                style={{textAlign:"center",padding:"4px 2px",borderRadius:"8px",
                  background:isFuture?"transparent":cfg.bg,
                  opacity:isFuture?0.4:1,
                  border:`1px solid ${isToday?cl.accent:isFuture?cl.border:cfg.border}`,
                  color:isFuture?cl.muted:cfg.color,cursor:"pointer",height:"46px",overflow:"hidden",
                  display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"2px"}}>
                <span style={{fontSize:"14px",fontWeight:isToday?800:700,lineHeight:1}}>{d}</span>
                {/* Holiday names were unreadable at 7px — the colour and 🟡 carry
                    the meaning, and the day sheet spells the name out. */}
                {isFuture
                  ? <span style={{fontSize:"9px",lineHeight:1,opacity:0.5}}>·</span>
                  : <span style={{fontSize:"11px",lineHeight:1}}>{cfg.icon}</span>}
              </div>
            );
          })}
        </div>
        <p style={{fontSize:"11.5px",color:cl.muted,margin:"12px 0 0",textAlign:"center"}}>
          לחץ על יום כדי לשנות את הסטטוס שלו
        </p>
      </div>
    );
  }



  function renderBarChart(){
    if(!annual) return null;
    const chartH=90;
    // The scale must cover the allowance too, or its marker lands outside the chart
    const yMax=Math.max(100,Math.ceil(Math.max(annual.maxPersonal||0,annual.allowance||0)/100)*100);
    const ticks=[0,Math.round(yMax/2),yMax];
    const barGrad=(p)=>p>annual.allowance*1.2?"linear-gradient(180deg,#f87171,#fca5a5)":p>annual.allowance?"linear-gradient(180deg,#fb923c,#fcd34d)":"linear-gradient(180deg,#a78bfa,#34d399)";
    const allowanceLineY=annual.allowance>0
      ? Math.min(chartH,Math.round((annual.allowance/yMax)*chartH))
      : null;
    const gridC=isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.07)";
    return(
      <div style={{display:"flex",gap:"7px",paddingTop:"4px"}}>
        {/* Y axis */}
        <div style={{display:"flex",flexDirection:"column",justifyContent:"space-between",
          height:`${chartH+16}px`,paddingBottom:"16px",flexShrink:0,width:"26px"}}>
          {ticks.slice().reverse().map(t=>(
            <div key={t} style={{fontSize:"9.5px",color:cl.muted,lineHeight:1,textAlign:"left",fontWeight:600}}>
              {t>=1000?`${(t/1000).toFixed(1)}k`:t}
            </div>
          ))}
        </div>
        {/* bars, gridlines and the allowance marker */}
        <div style={{flex:1,position:"relative"}}>
          {ticks.map(t=>(
            <div key={t} style={{position:"absolute",left:0,right:0,
              bottom:`${16+Math.round((t/yMax)*chartH)}px`,borderTop:`1px solid ${gridC}`,pointerEvents:"none"}}/>
          ))}
          {allowanceLineY!=null&&(
            <div style={{position:"absolute",left:0,right:0,bottom:`${16+allowanceLineY}px`,
              borderTop:`1.5px dashed ${cl.accent}99`,zIndex:1,pointerEvents:"none"}}>
              <span style={{position:"absolute",right:0,top:"-15px",fontSize:"9.5px",fontWeight:700,
                color:cl.accent,background:cl.surface,padding:"0 4px",borderRadius:"3px"}}>מכסה</span>
            </div>
          )}
          <div style={{display:"flex",alignItems:"flex-end",gap:"4px",height:`${chartH+16}px`,paddingBottom:"16px",position:"relative",zIndex:2}}>
            {annual.months.map(({year,month,key},i)=>{
              const s=annual.byMonth[key];
              const isFuture=key>todayKey;
              const isCurr=key===todayKey;
              const preTrack=trackFromKey&&key<trackFromKey;
              const barH=s?Math.max(4,Math.round((s.personal/yMax)*chartH)):0;
              return(
                <div key={key} className={preTrack?undefined:"month-pill"}
                  onClick={preTrack?undefined:()=>openUpdate(year,month)}
                  style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"4px",
                    cursor:preTrack?"default":"pointer"}}>
                  <div className={s&&!isFuture?"bar-seg":undefined}
                    style={{width:"100%",height:`${barH||3}px`,
                      background:isFuture||preTrack?gridC:s?barGrad(s.personal):gridC,
                      borderRadius:"4px 4px 2px 2px",
                      boxShadow:isCurr?`0 0 0 1.5px ${cl.accent}`:"none",
                      opacity:isFuture?0.5:preTrack?0.28:1,
                      animationDelay:`${i*0.04}s`}}/>
                  <div style={{fontSize:"9px",color:isCurr?cl.accent:cl.muted,
                    fontWeight:isCurr?800:600,opacity:preTrack?0.45:1}}>
                    {MONTH_HE[month].slice(0,3)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return(
    <div style={S.page}>
      <div style={S.wrap}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"18px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"9px"}}>
            <span style={{fontSize:"25px",lineHeight:1}}>🚗</span>
            <div style={{...S.h1,fontSize:"24px",letterSpacing:"-0.5px"}}>8-400</div>
          </div>
          <div style={{display:"flex",gap:"7px"}}>
            <button style={{...S.btnGhost,padding:"9px 12px",fontSize:"15px"}} className="btn-ghost" onClick={()=>setShowAbout(true)}>ℹ️</button>
            <button style={{...S.btnGhost,padding:"9px 12px",fontSize:"15px"}} className="btn-ghost" onClick={()=>{
              setSettingsForm({commute:String(appData.setup.commute),yearlyBudget:String(appData.setup.yearlyBudget||DEFAULT_BUDGET)});
              setShowSettings(true);
            }}>⚙️</button>
          </div>
        </div>

        <div style={S.tabs}>
          {[["dashboard","📊 סטטוס"],["update","✏️ עדכון"],["history","📋 היסטוריה"]].map(([k,l])=>(
            <button key={k} className="tab-btn" style={S.tab(tab===k)} onClick={()=>goTab(k)}>{l}</button>
          ))}
        </div>

        {tab==="dashboard" && annual && (
          <div className={tabAnim}>
            {/* Exactly one action card — whichever matters most right now */}
            {(()=>{
              if(annual.yearEnded) return(
                <div className="reminder-banner km-card" style={{...S.card,background:cl.accentBg,border:`1px solid ${cl.accent}44`}}>
                  <div style={{fontWeight:700,fontSize:"15px",color:cl.accent,marginBottom:"6px"}}>🎉 שנת המדידה הסתיימה</div>
                  <div style={{fontSize:"13px",color:cl.muted2,lineHeight:"1.6",marginBottom:"14px"}}>
                    סיימת עם <strong style={{color:cl.text}}>{annual.totalPersonal.toLocaleString()}</strong> ק״מ פרטי
                    מתוך {annual.budget.toLocaleString()}. הנתונים יישמרו בארכיון.
                  </div>
                  <button className="btn-main" style={{...S.btn,marginTop:0}} onClick={startNewYear}>התחל שנה חדשה ←</button>
                </div>
              );
              // A user with nothing recorded gets the welcome card below —
              // telling them they "forgot" a month would contradict it.
              if(annual.recordedCount>0 && pendingMonth && reminderDismissed!==pendingMonth.key) return(
                <div className="reminder-banner km-card" style={{...S.card,background:cl.yellowBg,border:`1px solid ${cl.yellow}44`}}>
                  <div style={{fontWeight:700,fontSize:"15px",color:cl.yellow,marginBottom:"5px"}}>🔔 עוד לא עדכנת את {pendingMonth.name}</div>
                  <div style={{fontSize:"12.5px",color:cl.muted2,lineHeight:"1.6"}}>
                    ככל שמעדכנים קרוב יותר לסוף החודש, החישוב מדויק יותר.
                  </div>
                  <div style={{display:"flex",gap:"8px",marginTop:"13px"}}>
                    <button className="btn-main" style={{...S.btn,marginTop:0,padding:"11px 20px",fontSize:"13px",width:"auto",background:"linear-gradient(135deg,#92400e,#fbbf24)"}}
                      onClick={()=>openUpdate(pendingMonth.year,pendingMonth.month)}>עדכן עכשיו ←</button>
                    <button style={S.btnGhost} className="btn-ghost" onClick={dismissReminder}>אחר כך</button>
                  </div>
                </div>
              );
              if(today.getDay()>=4 && appData?.lastWeekLogged!==weekKeyOf(today)) return(
                <div className="reminder-banner km-card" style={{...S.card,background:cl.greenBg,border:`1px solid ${cl.green}44`}}>
                  <div style={{fontWeight:700,fontSize:"15px",color:cl.green,marginBottom:"14px"}}>📅 כמה ימים נסעת לעבודה השבוע?</div>
                  <div style={{display:"flex",gap:"7px"}}>
                    {[0,1,2,3,4,5].map(n=>(
                      <button key={n} onClick={()=>applyWeeklyCheckin(n)}
                        style={{flex:1,padding:"14px 0",borderRadius:"12px",border:`1px solid ${cl.green}55`,
                          background:cl.surface,color:cl.text,fontSize:"17px",fontWeight:800,cursor:"pointer",fontFamily:"inherit"}}>{n}</button>
                    ))}
                  </div>
                  <button style={{...S.btnGhost,width:"100%",marginTop:"10px",display:"flex",justifyContent:"center",padding:"10px"}}
                    className="btn-ghost" onClick={skipWeeklyCheckin}>דלג השבוע</button>
                </div>
              );
              return null;
            })()}

            {/* A new user has nothing to judge yet — say what to do instead of
                showing a 0% ring with no explanation. */}
            {annual.recordedCount===0 && annual.priorPersonal===0 && (
              <div className="km-card" style={{...S.card,textAlign:"center",padding:"32px 24px",
                background:`linear-gradient(160deg,${cl.accentBg} 0%,transparent 75%)`,
                border:`1px solid ${cl.accent}33`}}>
                <div style={{fontSize:"36px",marginBottom:"12px"}}>👋</div>
                <div style={{fontSize:"18px",fontWeight:800,color:cl.text,marginBottom:"8px"}}>הכל מוכן</div>
                <div style={{fontSize:"13.5px",color:cl.muted2,lineHeight:"1.7",marginBottom:"18px"}}>
                  יש לך <strong style={{color:cl.text}}>{annual.budget.toLocaleString()}</strong> ק״מ פרטיים לשנה.
                  בסוף כל חודש הזן את קריאת המד — השאר מחושב לבד.
                </div>
                <button className="btn-main" style={{...S.btn,marginTop:0}}
                  onClick={()=>openUpdate(uf.year,uf.month)}>הזן קריאה ראשונה ←</button>
              </div>
            )}

            {/* The one answer: am I OK? */}
            {(annual.recordedCount>0||annual.priorPersonal>0) && (
            <div className="km-card" style={{...S.card,textAlign:"center",paddingTop:"28px",paddingBottom:"26px",
              background:`linear-gradient(160deg,${verdict.tint} 0%,transparent 75%)`,border:`1px solid ${verdict.color}33`}}>
              <div style={{position:"relative",width:"120px",margin:"0 auto"}}>
                <RingProgress pct={annual.pct} color={verdict.color} trackColor={isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.07)"}/>
                <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                  <div style={{fontSize:"30px",lineHeight:1}}>{verdict.icon}</div>
                </div>
              </div>
              <div style={{fontSize:"21px",fontWeight:800,color:verdict.color,marginTop:"16px"}}>{verdict.title}</div>
              <div style={{fontSize:"14.5px",color:cl.muted2,marginTop:"7px",lineHeight:"1.65",
                maxWidth:"290px",marginInline:"auto"}}>{verdict.line}</div>
            </div>
            )}

            {/* This month, in the terms people actually think in */}
            <div className="km-card" style={S.card}>
              <div style={S.sectionTitle}>מה מותר לי החודש</div>
              <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between"}}>
                <div style={{display:"flex",alignItems:"baseline",gap:"7px"}}>
                  <div className="stat-num" style={{fontSize:"44px",fontWeight:800,lineHeight:1,
                    color:cl.text,letterSpacing:"-1.5px"}}>{annual.allowance.toLocaleString()}</div>
                  <div style={{fontSize:"15px",color:cl.muted,fontWeight:600}}>ק"מ</div>
                </div>
                <span style={S.badge(cl.blue,cl.blueBg)}>≈ {annual.perDay.toLocaleString()} ליום</span>
              </div>
              <div style={{fontSize:"12.5px",color:cl.muted,marginTop:"10px"}}>
                נשארו {annual.daysLeftInMonth} ימים בחודש
              </div>
            </div>

            {/* Chart doubles as the year timeline — tap a bar to edit that month */}
            <div className="km-card" style={S.card}>
              <div style={{...S.sectionTitle,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span>ק״מ פרטי לפי חודש</span>
                <span style={{fontSize:"11.5px",fontWeight:500,color:cl.muted}}>לחץ לעריכה</span>
              </div>
              {renderBarChart()}
            </div>

            {/* Everything else lives behind one toggle */}
            <button className="btn-ghost" onClick={()=>setShowDetails(v=>!v)}
              style={{width:"100%",padding:"14px",borderRadius:"14px",border:`1px solid ${cl.border}`,
                background:"transparent",color:cl.muted2,fontSize:"13.5px",fontWeight:600,
                cursor:"pointer",fontFamily:FONT}}>
              {showDetails?"הסתר פרטים ▲":"פרטים נוספים ▼"}
            </button>

            {showDetails && (
              <div style={{marginTop:"14px"}}>
                <div className="km-card" style={S.card}>
                  <div style={S.sectionTitle}>מספרים</div>
                  {[["נוצל עד כה",`${annual.totalPersonal.toLocaleString()} ק"מ`],
                    ["תקציב שנתי",`${annual.budget.toLocaleString()} ק"מ`],
                    ["ממוצע חודשי",annual.recordedCount?`${Math.round(annual.avg).toLocaleString()} ק"מ`:"—"],
                    ["תחזית לסוף השנה",annual.recordedCount>=2?`${annual.projected.toLocaleString()} ק"מ`:"—"],
                    ["חודשים שנותרו",String(annual.monthsLeft)]].map(([k,v],i,arr)=>(
                    <div key={k} style={{...S.row,borderBottom:i===arr.length-1?"none":`1px solid ${cl.border}`}}>
                      <span style={{color:cl.muted}}>{k}</span>
                      <span style={{color:cl.text,fontWeight:700}}>{v}</span>
                    </div>
                  ))}
                </div>
                {!annual.precisionMatters && annual.recordedCount>=1 && (
                  <div style={{...S.card,background:cl.greenBg,border:`1px solid ${cl.green}33`,
                    display:"flex",gap:"12px",alignItems:"flex-start",marginBottom:0}}>
                    <span style={{fontSize:"20px",lineHeight:1,marginTop:"1px"}}>✅</span>
                    <div style={{fontSize:"13px",color:cl.muted2,lineHeight:"1.6"}}>
                      אתה רחוק מהגבול — לא צריך לדייק בספירת הימים.
                      יום עבודה אחד שווה {annual.commute} ק״מ בלבד מתוך היתרה.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab==="update" && (
          <div className={tabAnim+" km-card"} style={S.card}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"18px"}}>
              <button style={{...S.btnGhost,padding:"10px 16px",fontSize:"15px",
                opacity:atFirstMonth?0.3:1,cursor:atFirstMonth?"default":"pointer"}}
                className="btn-ghost" disabled={atFirstMonth} onClick={()=>navigateMonth(-1)}>→</button>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"12px",fontWeight:700,color:cl.muted}}>{uf.year}</div>
                <div style={{fontSize:"19px",fontWeight:800,color:cl.text,marginTop:"1px"}}>{MONTH_HE[uf.month]}</div>
              </div>
              <button style={{...S.btnGhost,padding:"10px 16px",fontSize:"15px",
                opacity:atCurrentMonth?0.3:1,cursor:atCurrentMonth?"default":"pointer"}}
                className="btn-ghost" disabled={atCurrentMonth} onClick={()=>navigateMonth(1)}>←</button>
            </div>
            {livePreview?.gapMonths?.length>0 && (
              <div style={{padding:"12px 14px",borderRadius:"12px",background:cl.yellowBg,
                border:"1px solid rgba(251,191,36,0.3)",marginBottom:"16px",fontSize:"12px",
                color:cl.yellow,lineHeight:"1.6"}}>
                ⚠️ לא עודכן {livePreview.gapMonths.map(g=>MONTH_HE[g.month]).join(", ")} —
                הק״מ של {livePreview.gapMonths.length>1?"החודשים האלה":"החודש הזה"} נכללים כאן,
                וימי העבודה שלהם נספרים יחד.
              </div>
            )}

            <label style={{...S.label,marginTop:0}}>קריאת מד נוכחית (ק"מ)</label>
            <input style={S.input} type="number" placeholder="למשל: 47250" value={uf.odometer} onChange={e=>setUf({...uf,odometer:e.target.value})}/>

            {/* Workday count — the primary input. The calendar is optional detail. */}
            <label style={S.label}>כמה ימים נסעת לעבודה?</label>
            <div style={{display:"flex",alignItems:"center",gap:"14px",background:cl.surface2,
              borderRadius:"14px",padding:"14px 18px",border:`1px solid ${cl.border}`}}>
              <button className="btn-ghost" onClick={()=>adjustWorkDays(-1)} disabled={ufWorkDays<=0}
                style={{width:"46px",height:"46px",borderRadius:"12px",border:`1px solid ${cl.border}`,
                  background:"transparent",color:ufWorkDays<=0?cl.muted:cl.text,fontSize:"24px",
                  cursor:ufWorkDays<=0?"default":"pointer",fontFamily:"inherit",lineHeight:1,
                  opacity:ufWorkDays<=0?0.4:1}}>−</button>
              <div style={{flex:1,textAlign:"center"}}>
                <div className="stat-num" style={{fontSize:"38px",fontWeight:800,color:cl.text,lineHeight:1}}>{ufWorkDays}</div>
                <div style={{fontSize:"11px",color:cl.muted,marginTop:"4px"}}>ימי עבודה</div>
              </div>
              <button className="btn-ghost" onClick={()=>adjustWorkDays(1)}
                style={{width:"46px",height:"46px",borderRadius:"12px",border:`1px solid ${cl.border}`,
                  background:"transparent",color:cl.text,fontSize:"24px",cursor:"pointer",
                  fontFamily:"inherit",lineHeight:1}}>+</button>
            </div>
            <p style={{...S.hint,marginTop:"8px"}}>
              {mKey(uf.year,uf.month)===todayKey
                ? "נספר עד היום. ברירת המחדל: א׳–ה׳ עבודה, שישי־שבת וחגים חופש."
                : "ברירת המחדל: א׳–ה׳ עבודה, שישי־שבת וחגים חופש."}
            </p>


            <button className="btn-ghost" onClick={()=>setShowCalendar(v=>!v)}
              style={{width:"100%",marginTop:"14px",padding:"12px",borderRadius:"12px",
                border:`1px solid ${cl.border}`,background:"transparent",color:cl.muted2,
                fontSize:"13px",cursor:"pointer",fontFamily:"inherit"}}>
              {showCalendar?"▲ הסתר לוח שנה":"▼ פתח לוח שנה — לסמן ימים מדויקים"}
            </button>

            {showCalendar && <div style={{marginTop:"16px"}}>{renderCalendar()}</div>}

            {livePreview && (
              <div style={{marginTop:"16px",padding:"16px",background:cl.surface2,borderRadius:"14px",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",border:`1px solid ${cl.border}`}}>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:"11px",color:cl.muted,marginBottom:"4px",}}>סה"כ</div>
                  <div style={{fontSize:"20px",fontWeight:800,color:cl.text}}>{livePreview.totalKm}</div>
                  <div style={{fontSize:"10px",color:cl.muted}}>ק"מ</div>
                </div>
                <div style={{textAlign:"center",borderRight:`1px solid ${cl.border}`,borderLeft:`1px solid ${cl.border}`}}>
                  <div style={{fontSize:"11px",color:cl.muted,marginBottom:"4px",}}>עבודה</div>
                  <div style={{fontSize:"20px",fontWeight:800,color:cl.blue}}>{livePreview.workKm}</div>
                  <div style={{fontSize:"10px",color:cl.muted}}>ק"מ</div>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:"11px",color:cl.muted,marginBottom:"4px",}}>פרטי</div>
                  <div style={{fontSize:"20px",fontWeight:800,color:annual&&livePreview.personal>annual.allowance?cl.orange:cl.green}}>{livePreview.personal}</div>
                  <div style={{fontSize:"10px",color:cl.muted}}>ק"מ</div>
                </div>
              </div>
            )}


            <button className="btn-main" style={S.btn} onClick={handleSave}>שמור עדכון ✓</button>
          </div>
        )}

        {tab==="history" && (
          <div className={tabAnim}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
              <div style={S.sectionTitle}>היסטוריית נסיעות</div>
              <button style={S.btnGhost} className="btn-ghost" onClick={exportCSV}>⬇ CSV</button>
            </div>
            {annual.recordedCount===0 ? (
              <div style={{...S.card,textAlign:"center",padding:"40px 24px"}}>
                <div style={{fontSize:"34px",marginBottom:"12px",opacity:0.7}}>📋</div>
                <div style={{fontSize:"15px",fontWeight:700,color:cl.text,marginBottom:"6px"}}>עדיין אין היסטוריה</div>
                <div style={{fontSize:"13px",color:cl.muted,lineHeight:"1.65"}}>
                  אחרי שתזין את קריאת המד הראשונה, כל חודש יופיע כאן.
                </div>
              </div>
            ) : (
              <div style={{...S.card,padding:"6px 20px"}}>
                {annual.months.map(m=>{
                  const s=annual.byMonth[m.key];
                  if(!s) return null;
                  const isOver=annual.allowance>0&&s.personal>annual.allowance*1.2;
                  const barW=Math.round((s.personal/Math.max(1,annual.maxPersonal))*100);
                  return(
                    <div key={m.key} className="hist-row" onClick={()=>openUpdate(m.year,m.month)}
                      style={{padding:"15px 0",borderBottom:`1px solid ${cl.border}`,cursor:"pointer"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:"9px"}}>
                        <div style={{display:"flex",alignItems:"baseline",gap:"8px"}}>
                          <span style={{fontWeight:700,fontSize:"15px",color:cl.text}}>{MONTH_HE[m.month]}</span>
                          <span style={{fontSize:"11.5px",color:cl.muted}}>{s.workDays} ימי עבודה</span>
                        </div>
                        <div style={{display:"flex",alignItems:"baseline",gap:"5px"}}>
                          <span className="stat-num" style={{fontSize:"19px",fontWeight:800,
                            color:isOver?cl.red:cl.text}}>{s.personal.toLocaleString()}</span>
                          <span style={{fontSize:"11.5px",color:cl.muted}}>פרטי</span>
                        </div>
                      </div>
                      <div style={{background:isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.07)",
                        borderRadius:"3px",height:"3px",overflow:"hidden"}}>
                        <div style={{width:`${barW}%`,height:"100%",borderRadius:"3px",
                          background:isOver?"linear-gradient(90deg,#f87171,#fca5a5)":"linear-gradient(90deg,#7c3aed,#34d399)",
                          transition:"width .6s ease"}}/>
                      </div>
                      <div style={{fontSize:"11.5px",color:cl.muted,marginTop:"8px",display:"flex",gap:"14px"}}>
                        <span>עבודה <span style={{color:cl.muted2,fontWeight:600}}>{s.workKm.toLocaleString()}</span></span>
                        <span>סה״כ <span style={{color:cl.muted2,fontWeight:600}}>{s.totalKm.toLocaleString()}</span></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {showSettings && (
        <div className="modal-overlay-anim" style={{position:"fixed",inset:0,background:cl.bg,zIndex:100,
          overflowY:"auto",direction:"rtl",padding:"20px 16px 40px",display:"flex",justifyContent:"center"}}>
          <div style={{width:"100%",maxWidth:"430px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"12px",paddingBottom:"18px",marginBottom:"18px",
              borderBottom:`1px solid ${cl.border}`}}>
              <button style={{...S.btnGhost,padding:"9px 14px",fontSize:"16px"}} className="btn-ghost"
                onClick={()=>setShowSettings(false)}>→</button>
              <div style={{fontSize:"20px",fontWeight:800,color:cl.text}}>הגדרות</div>
            </div>
            <div style={{...S.card,marginBottom:0}}>
            <label style={{...S.label,marginTop:0}}>הלוך-חזור לעבודה (ק"מ ביום)</label>
            <input style={S.input} type="number" value={settingsForm.commute}
              onChange={e=>setSettingsForm({...settingsForm,commute:e.target.value})}/>
            <label style={S.label}>תקציב שנתי (ק"מ)</label>
            <input style={S.input} type="number" value={settingsForm.yearlyBudget}
              onChange={e=>setSettingsForm({...settingsForm,yearlyBudget:e.target.value})}/>
            <button className="btn-main" style={S.btn} onClick={handleSaveSettings}>שמור שינויים</button>
            {"Notification" in window && Notification.permission!=="granted" && (
              <button className="btn-main" style={{...S.btn,marginTop:"8px",background:"linear-gradient(135deg,#92400e,#fb923c)"}}
                onClick={()=>Notification.requestPermission().then(p=>{
                  if(p==="granted"){showToast("התראות מופעלות ✓");syncStateToSW(appData,null,pendingMonth);}
                  else showToast("לא ניתנה הרשאה",cl.red);
                })}>
                🔔 הפעל התראות
              </button>
            )}
            {"Notification" in window && Notification.permission==="granted" && (
              <div style={{marginTop:"10px",fontSize:"12px",color:cl.green,textAlign:"center",fontWeight:600}}>✓ התראות פוש מופעלות</div>
            )}

            {/* Backup / restore */}
            <div style={{marginTop:"22px",paddingTop:"18px",borderTop:`1px solid ${cl.border}`}}>
              <div style={{...S.sectionTitle,marginBottom:"6px"}}>גיבוי ושחזור</div>
              <div style={{fontSize:"12px",color:cl.muted,lineHeight:"1.6",marginBottom:"12px"}}>
                הנתונים שמורים רק בדפדפן הזה. ניקוי היסטוריה או החלפת טלפון ימחקו אותם — כדאי לגבות.
              </div>
              <div style={{display:"flex",gap:"8px"}}>
                <button className="btn-ghost" onClick={exportJSON}
                  style={{flex:1,padding:"13px",borderRadius:"12px",border:`1px solid ${cl.border}`,
                    background:"transparent",color:cl.muted2,fontSize:"13px",fontWeight:700,
                    cursor:"pointer",fontFamily:"inherit"}}>⬇ גבה</button>
                <label style={{flex:1,padding:"13px",borderRadius:"12px",border:`1px solid ${cl.border}`,
                  background:"transparent",color:cl.muted2,fontSize:"13px",fontWeight:700,
                  cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>
                  ⬆ שחזר
                  <input type="file" accept="application/json,.json" style={{display:"none"}}
                    onChange={e=>{importJSON(e.target.files?.[0]); e.target.value="";}}/>
                </label>
              </div>
            </div>

            <div style={{marginTop:"20px",paddingTop:"16px",borderTop:`1px solid ${cl.border}`}}>
              <button style={{width:"100%",padding:"12px",borderRadius:"12px",background:cl.redBg,border:`1px solid rgba(220,38,38,0.25)`,color:cl.red,fontSize:"13px",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}
                onClick={doReset}>🗑 איפוס כל הנתונים</button>
            </div>
            </div>
          </div>
        </div>
      )}

      {showAbout && (()=>{
        const Sec=({title,children})=>(
          <div style={{...S.card,marginBottom:"12px"}}>
            <div style={S.sectionTitle}>{title}</div>
            {children}
          </div>
        );
        const Step=({n,title,children})=>(
          <div style={{display:"flex",gap:"12px",marginBottom:"16px"}}>
            <div style={{flexShrink:0,width:"25px",height:"25px",borderRadius:"50%",background:cl.accentBg,
              color:cl.accent,fontWeight:800,fontSize:"13px",display:"flex",alignItems:"center",
              justifyContent:"center",marginTop:"1px"}}>{n}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:"14px",fontWeight:700,color:cl.text,marginBottom:"3px"}}>{title}</div>
              <div style={{fontSize:"13px",color:cl.muted2,lineHeight:"1.65"}}>{children}</div>
            </div>
          </div>
        );
        const Item=({icon,label,children})=>(
          <div style={{display:"flex",gap:"11px",padding:"11px 0",borderBottom:`1px solid ${cl.border}`}}>
            <span style={{fontSize:"17px",lineHeight:1.3,flexShrink:0,width:"22px",textAlign:"center"}}>{icon}</span>
            <div style={{flex:1}}>
              <div style={{fontSize:"13.5px",fontWeight:700,color:cl.text}}>{label}</div>
              <div style={{fontSize:"12.5px",color:cl.muted,lineHeight:"1.6",marginTop:"2px"}}>{children}</div>
            </div>
          </div>
        );
        const commute=appData?.setup?.commute||62;
        const budget=(appData?.setup?.yearlyBudget||DEFAULT_BUDGET).toLocaleString();
        return(
        <div className="modal-overlay-anim" style={{position:"fixed",inset:0,background:cl.bg,zIndex:100,
          overflowY:"auto",direction:"rtl",padding:"20px 16px 40px",display:"flex",justifyContent:"center"}}>
          <div style={{width:"100%",maxWidth:"430px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"12px",paddingBottom:"18px",marginBottom:"18px",
              borderBottom:`1px solid ${cl.border}`}}>
              <button style={{...S.btnGhost,padding:"9px 14px",fontSize:"16px"}} className="btn-ghost"
                onClick={()=>setShowAbout(false)}>→</button>
              <div style={{fontSize:"20px",fontWeight:800,color:cl.text}}>איך זה עובד</div>
            </div>

            <Sec title="הרעיון בשורה אחת">
              <div style={{fontSize:"14px",color:cl.text,lineHeight:"1.75"}}>
                האפליקציה מניחה שנסעת לעבודה <strong>כל יום א׳–ה׳</strong>, ושבשישי־שבת וחגים לא.
                אתה מסמן <strong style={{color:cl.accent}}>רק את החריגים</strong> — הימים שלא הגעת.
              </div>
              <div style={{marginTop:"14px",padding:"13px 15px",background:cl.surface2,borderRadius:"12px",
                fontSize:"13px",color:cl.muted2,lineHeight:"1.7"}}>
                <div style={{fontWeight:700,color:cl.text,marginBottom:"5px"}}>החישוב</div>
                ק״מ פרטי = כל מה שנסעת, פחות ימי העבודה × {commute} ק״מ.
                <br/>מה שנשאר נגרע מתקציב של {budget} ק״מ לשנה.
              </div>
            </Sec>

            <Sec title="מה לעשות ומתי">
              <Step n="1" title="בתחילת כל חודש">
                פתח את <strong>עדכון</strong> והזן את קריאת מד הק״מ. זו הפעולה היחידה שחייבים לעשות.
                <br/><span style={{color:cl.yellow}}>ככל שמעדכנים קרוב יותר ל-1 בחודש, החישוב מדויק יותר.</span>
              </Step>
              <Step n="2" title="אם לא נסעת לעבודה יום מסוים">
                הורד אותו במונה <strong>«כמה ימים נסעת לעבודה»</strong> עם כפתור −.
                לא צריך לזכור איזה יום בדיוק — רק כמה.
              </Step>
              <Step n="3" title="פעם בשבוע (רשות)">
                בסוף השבוע תופיע שאלה אחת: כמה ימים נסעת השבוע. הקשה אחת, וזהו.
              </Step>
              <div style={{padding:"12px 14px",background:cl.greenBg,borderRadius:"12px",
                fontSize:"12.5px",color:cl.muted2,lineHeight:"1.65",border:`1px solid ${cl.green}33`}}>
                ✅ <strong style={{color:cl.green}}>חודש רגיל לגמרי?</strong> אל תיגע בכלום — רק הזן את המד.
              </div>
            </Sec>

            <Sec title="מה רואים במסך הסטטוס">
              <Item icon="✅" label="הטבעת והמשפט">התשובה הקצרה: אתה בסדר, שים לב, או חרגת.</Item>
              <Item icon="📊" label="מה מותר לי החודש">היתרה השנתית מחולקת בין החודשים שנשארו — כולל החודש הנוכחי.</Item>
              <Item icon="📈" label="הגרף">ק״מ פרטי בכל חודש. הקו המקווקו הוא המכסה — עמודה מעליו היא חריגה. לחיצה על עמודה פותחת את החודש לעריכה.</Item>
              <div style={{display:"flex",gap:"11px",padding:"11px 0"}}>
                <span style={{fontSize:"17px",lineHeight:1.3,flexShrink:0,width:"22px",textAlign:"center"}}>▼</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:"13.5px",fontWeight:700,color:cl.text}}>פרטים נוספים</div>
                  <div style={{fontSize:"12.5px",color:cl.muted,lineHeight:"1.6",marginTop:"2px"}}>
                    ממוצע חודשי ותחזית לאן השנה מגיעה בקצב הנוכחי.
                  </div>
                </div>
              </div>
            </Sec>

            <Sec title="לוח השנה">
              <div style={{fontSize:"13px",color:cl.muted2,lineHeight:"1.7",marginBottom:"12px"}}>
                נפתח מתוך מסך העדכון, למי שרוצה לסמן ימים מדויקים. לחיצה על יום מחליפה את הסטטוס שלו.
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"9px"}}>
                {[["🚗","נסעתי לעבודה","נספר במכסת ימי העבודה"],
                  ["🏠","לא נסעתי","היום הזה נחשב פרטי"],
                  ["🟡","חג או חופש","ברירת מחדל בחגים — ניתן לשנות"],
                  ["·","עוד לא הגיע","ימים עתידיים בחודש הנוכחי, לא נספרים"]].map(([i,t,d])=>(
                  <div key={t} style={{display:"flex",gap:"10px",alignItems:"baseline"}}>
                    <span style={{fontSize:"14px",width:"20px",textAlign:"center",flexShrink:0}}>{i}</span>
                    <div style={{fontSize:"12.5px",color:cl.muted2}}>
                      <strong style={{color:cl.text}}>{t}</strong> — {d}
                    </div>
                  </div>
                ))}
              </div>
            </Sec>

            <Sec title="חשוב לדעת">
              <Item icon="💾" label="הנתונים נשמרים רק בטלפון הזה">
                ניקוי היסטוריית הדפדפן או החלפת מכשיר ימחקו הכל. גבה מדי פעם דרך ⚙️ ← גיבוי ושחזור.
              </Item>
              <div style={{display:"flex",gap:"11px",padding:"11px 0"}}>
                <span style={{fontSize:"17px",lineHeight:1.3,flexShrink:0,width:"22px",textAlign:"center"}}>🔔</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:"13.5px",fontWeight:700,color:cl.text}}>תזכורות</div>
                  <div style={{fontSize:"12.5px",color:cl.muted,lineHeight:"1.6",marginTop:"2px"}}>
                    ב-1, 3 ו-6 בחודש, ואז מפסיקות. התראות פוש עובדות רק באנדרואיד עם האפליקציה מותקנת;
                    באייפון תראה את התזכורת כשתפתח את האפליקציה.
                  </div>
                </div>
              </div>
            </Sec>

            <div style={{textAlign:"center",fontSize:"11px",color:cl.muted,margin:"8px 0 16px"}}>
              8-400 · made by illouzman
            </div>
            <button style={{...S.btnGhost,width:"100%",display:"flex",justifyContent:"center",padding:"13px"}}
              className="btn-ghost" onClick={()=>setShowAbout(false)}>סגור</button>
          </div>
        </div>
        );
      })()}

      {dayModal && (()=>{
        const {iso, year, month, d} = dayModal;
        const holiday = HOLIDAYS[iso];
        const dayName = DAY_HE[dowOf(year, month, d)];
        const STATE_CFG_MODAL = {
          work:    {label:"עבדתי",     icon:"🚗", color:cl.green,  bg:"rgba(52,211,153,0.15)",  border:"rgba(52,211,153,0.4)"},
          off:     {label:"לא עבדתי", icon:"🏠", color:cl.red,    bg:"rgba(248,113,113,0.15)", border:"rgba(248,113,113,0.4)"},
          holiday: {label:"חג / חופש",icon:"🟡", color:cl.yellow, bg:"rgba(251,191,36,0.13)",  border:"rgba(251,191,36,0.35)"},
        };
        const cur = modalState;
        return(
          <div className="modal-overlay-anim" onClick={()=>setDayModal(null)}
            style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(6px)",zIndex:200,display:"flex",alignItems:"flex-end",direction:"rtl"}}>
            <div className="modal-card-anim" onClick={e=>e.stopPropagation()}
              style={{width:"100%",background:cl.surface,borderRadius:"24px 24px 0 0",padding:"24px 20px 36px",border:`1px solid ${cl.border}`,borderBottom:"none"}}>
              {/* handle */}
              <div style={{width:"40px",height:"4px",background:isDark?"rgba(255,255,255,0.15)":"rgba(0,0,0,0.12)",borderRadius:"2px",margin:"0 auto 20px"}}/>
              {/* date header */}
              <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"20px"}}>
                <div style={{background:cl.surface2,borderRadius:"12px",padding:"10px 14px",textAlign:"center",minWidth:"50px",border:`1px solid ${cl.border}`}}>
                  <div style={{fontSize:"22px",fontWeight:800,color:cl.text,lineHeight:1}}>{d}</div>
                  <div style={{fontSize:"10px",color:cl.muted,marginTop:"3px"}}>{dayName}</div>
                </div>
                <div>
                  <div style={{fontSize:"16px",fontWeight:700,color:cl.text}}>{MONTH_HE[month]} {year}</div>
                  {holiday && <div style={{fontSize:"12px",color:cl.yellow,marginTop:"3px"}}>{holiday}</div>}
                </div>
              </div>
              {/* One decision — tapping saves and closes */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px"}}>
                {Object.entries(STATE_CFG_MODAL).map(([k,c])=>(
                  <button key={k} onClick={()=>saveDayModal(k)}
                    style={{padding:"18px 6px",borderRadius:"14px",border:`2px solid ${cur===k?c.border:"transparent"}`,
                      background:cur===k?c.bg:cl.surface2,cursor:"pointer",textAlign:"center",
                      transition:"all 0.15s",outline:"none",fontFamily:"inherit"}}>
                    <div style={{fontSize:"26px",marginBottom:"6px"}}>{c.icon}</div>
                    <div style={{fontSize:"12px",fontWeight:700,color:cur===k?c.color:cl.muted}}>{c.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {showInstall && screen==="main" && (
        <div className="install-banner" style={{position:"fixed",bottom:0,left:0,right:0,zIndex:90,
          background:cl.surface,borderTop:`1px solid ${cl.border}`,padding:"16px 16px 20px",
          direction:"rtl",boxShadow:"0 -8px 32px rgba(0,0,0,0.28)"}}>
          <div style={{maxWidth:"430px",margin:"0 auto"}}>
            <div style={{display:"flex",gap:"12px",alignItems:"flex-start"}}>
              <span style={{fontSize:"26px",lineHeight:1}}>📲</span>
              <div style={{flex:1}}>
                <div style={{fontSize:"14.5px",fontWeight:700,color:cl.text,marginBottom:"3px"}}>
                  התקן את 8-400 על המסך
                </div>
                <div style={{fontSize:"12.5px",color:cl.muted,lineHeight:"1.6"}}>
                  {isIOS()
                    ? <>לחץ על <strong style={{color:cl.muted2}}>שיתוף</strong> ואז <strong style={{color:cl.muted2}}>«הוסף למסך הבית»</strong>.</>
                    : "נפתח כמו אפליקציה רגילה, ומאפשר תזכורות חודשיות."}
                </div>
              </div>
              <button onClick={dismissInstall} aria-label="סגור"
                style={{background:"none",border:"none",color:cl.muted,fontSize:"19px",
                  cursor:"pointer",lineHeight:1,padding:"0 2px",fontFamily:FONT}}>✕</button>
            </div>
            {installEvt && (
              <button className="btn-main" style={{...S.btn,marginTop:"13px",padding:"13px"}}
                onClick={doInstall}>התקן עכשיו</button>
            )}
          </div>
        </div>
      )}

      {toast && <div className="toast-anim" style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",background:toast.color,color:"#fff",padding:"11px 24px",borderRadius:"28px",fontSize:"14px",fontWeight:700,boxShadow:`0 8px 32px ${toast.color}66`,whiteSpace:"nowrap"}}>{toast.msg}</div>}
    </div>
  );
}
