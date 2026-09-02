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

function countWorkdays(y,m,ov={}){
  let n=0;
  for(let d=1;d<=daysInMonth(y,m);d++){
    const iso=toISO(y,m,d);
    if(getEffectiveState(iso,y,m,d,ov)==="work") n++;
  }
  return n;
}

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

// Great-circle distance in metres
function distanceM(lat1,lng1,lat2,lng2){
  const R=6371000, rad=x=>x*Math.PI/180;
  const dLat=rad(lat2-lat1), dLng=rad(lng2-lng1);
  const a=Math.sin(dLat/2)**2+Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.min(1,Math.sqrt(a)));
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

function makeS(cl){
  return {
    page:  {minHeight:"100vh",background:cl.bg,display:"flex",justifyContent:"center",padding:"24px 16px 80px",fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display',system-ui,sans-serif",direction:"rtl"},
    wrap:  {width:"100%",maxWidth:"430px"},
    card:  {background:cl.surface,borderRadius:"20px",padding:"22px 24px",marginBottom:"14px",border:`1px solid ${cl.border}`},
    cardYellow: {background:"rgba(251,191,36,0.07)",borderRadius:"20px",padding:"18px 20px",marginBottom:"14px",border:"1px solid rgba(251,191,36,0.18)"},
    sectionTitle: {fontSize:"10px",fontWeight:700,color:cl.muted,textTransform:"uppercase",letterSpacing:"1.5px",margin:"0 0 16px"},
    h1:    {fontSize:"28px",fontWeight:800,color:cl.text,margin:0,letterSpacing:"-0.5px"},
    label: {display:"block",fontSize:"11px",fontWeight:600,color:cl.muted,marginBottom:"8px",marginTop:"20px",textTransform:"uppercase",letterSpacing:"1px"},
    hint:  {fontSize:"12px",color:cl.muted,marginTop:"5px",lineHeight:"1.6"},
    input: {width:"100%",background:cl.surface2,border:`1px solid ${cl.border}`,borderRadius:"12px",color:cl.text,fontSize:"16px",padding:"14px 16px",boxSizing:"border-box",outline:"none",fontFamily:"inherit"},
    btn:   {width:"100%",marginTop:"20px",padding:"16px",borderRadius:"14px",background:"linear-gradient(135deg,#7c3aed 0%,#a78bfa 100%)",color:"#fff",fontWeight:700,fontSize:"15px",border:"none",cursor:"pointer",fontFamily:"inherit",letterSpacing:"0.3px"},
    btnGhost: {padding:"9px 16px",borderRadius:"10px",background:"transparent",border:`1px solid ${cl.border}`,color:cl.muted2,fontSize:"13px",cursor:"pointer",fontFamily:"inherit"},
    tab:  (a)=>({flex:1,padding:"10px 4px",background:a?"rgba(167,139,250,0.12)":"transparent",color:a?cl.accent:cl.muted,border:"none",cursor:"pointer",fontWeight:a?700:400,fontSize:"13px",fontFamily:"inherit",borderRadius:"9px"}),
    tabs: {display:"flex",background:cl.surface2,borderRadius:"14px",padding:"4px",marginBottom:"20px",border:`1px solid ${cl.border}`},
    row:  {display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 0",borderBottom:`1px solid ${cl.border}`,fontSize:"14px"},
    badge:(c,bg)=>({display:"inline-flex",alignItems:"center",padding:"4px 12px",borderRadius:"20px",fontSize:"12px",fontWeight:700,color:c,background:bg}),
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

export default function App() {
  const today    = new Date();
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
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout,    setShowAbout]    = useState(false);
  const [settingsForm, setSettingsForm] = useState({commute:"",yearlyBudget:""});

  const [sf, setSf] = useState({yearStart:`${today.getFullYear()}-01-01`,startOdo:"",commute:"62",yearlyBudget:String(DEFAULT_BUDGET)});

  const [uf, setUf] = useState({year:today.getFullYear(),month:today.getMonth(),odometer:"",dayOverrides:{}});
  const [showCalendar, setShowCalendar] = useState(false);
  const [showDetails, setShowDetails]   = useState(false);
  // Synchronous mirror of `uf` — lets rapid stepper taps read the freshest value
  const ufRef = useRef(uf);
  ufRef.current = uf;
  const [dayModal, setDayModal] = useState(null); // {iso, year, month, d}
  const [modalState, setModalState] = useState(null);

  const [didAutoCheckin,setDidAutoCheckin]=useState(false);

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

  // Silent GPS check-in on app open (and via ?checkin=1 from an iOS Shortcut).
  // A Service Worker can't read GPS, so this is the closest thing to automatic:
  // opening the app while at work marks the day for you.
  useEffect(()=>{
    if(didAutoCheckin||!appData?.setup?.workLocation) return;
    setDidAutoCheckin(true);
    const forced=new URLSearchParams(window.location.search).has("checkin");
    if(appData.lastAutoCheckin===todayISO&&!forced) return;
    checkInNow(!forced);
    if(forced){
      const u=new URL(window.location.href);
      u.searchParams.delete("checkin");
      window.history.replaceState({},"",u);
    }
  },[appData,didAutoCheckin,todayISO]);

  // Register Service Worker
  useEffect(()=>{
    if(!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(import.meta.env.BASE_URL + "sw.js").then(reg=>{
      // Listen for notification-click → open update tab
      navigator.serviceWorker.addEventListener("message",(e)=>{
        if(e.data?.type==="OPEN_UPDATE_TAB") setTab("update");
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

  function syncStateToSW(d, dismissed){
    if(!("serviceWorker" in navigator)||!navigator.serviceWorker.controller) return;
    const months=d?.setup?getYearMonths(d.setup.yearStart):[];
    const lastEntered=months.slice().reverse().find(({key})=>d?.months?.[key]?.odometer)?.key||null;
    navigator.serviceWorker.controller.postMessage({
      type:"KM_STATE",
      payload:{
        lastEnteredMonth: lastEntered,
        reminderDismissed: dismissed ?? localStorage.getItem(REMINDER_KEY) ?? "",
        lastNotifiedMonth: null,
      }
    });
  }

  function persist(d){
    setAppData({...d});
    saveData({...d});
    // Give SW time to activate on first load
    setTimeout(()=>syncStateToSW(d, null), 500);
  }

  function dismissReminder(){
    try{ localStorage.setItem(REMINDER_KEY, todayKey); }catch{}
    setReminderDismissed(todayKey);
    syncStateToSW(appData, todayKey);
  }

  // Async-safe persist — always builds on the freshest state
  function persistWith(updater){
    setAppData(prev=>{
      const next=updater(prev);
      if(!next) return prev;
      saveData(next);
      setTimeout(()=>syncStateToSW(next,null),300);
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
    const sunday=weekStartOf(today);
    const days=[];
    for(let i=0;i<=today.getDay();i++){
      const dt=new Date(sunday.getFullYear(),sunday.getMonth(),sunday.getDate()+i);
      const y=dt.getFullYear(),m=dt.getMonth(),d=dt.getDate();
      days.push({y,m,d,iso:toISO(y,m,d),mk:mKey(y,m)});
    }
    if(!appData?.setup) return;
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

  // ── GPS ──────────────────────────────────────────────────────────────
  function saveWorkLocation(){
    if(!navigator.geolocation){ showToast("הדפדפן לא תומך במיקום",cl.red); return; }
    showToast("קורא מיקום…",cl.blue);
    navigator.geolocation.getCurrentPosition(
      pos=>{
        persistWith(prev=>prev?{...prev,setup:{...prev.setup,
          workLocation:{lat:pos.coords.latitude,lng:pos.coords.longitude,radius:400}}}:prev);
        showToast("מיקום העבודה נשמר ✓");
      },
      ()=>showToast("לא ניתנה הרשאת מיקום",cl.red),
      {enableHighAccuracy:true,timeout:12000,maximumAge:0}
    );
  }

  function checkInNow(silent=false){
    const wl=appData?.setup?.workLocation;
    if(!wl||!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos=>{
        const dist=distanceM(pos.coords.latitude,pos.coords.longitude,wl.lat,wl.lng);
        if(dist<=(wl.radius||400)){
          setDayState(today.getFullYear(),today.getMonth(),today.getDate(),"work");
          persistWith(prev=>prev?{...prev,lastAutoCheckin:todayISO}:prev);
          showToast("זוהית בעבודה — היום סומן ✓");
        }else if(!silent){
          showToast(`אתה ${dist>1500?`${(dist/1000).toFixed(1)} ק״מ`:`${Math.round(dist)} מ׳`} מהעבודה`,cl.orange);
        }
      },
      ()=>{ if(!silent) showToast("לא ניתן לקרוא מיקום",cl.red); },
      {enableHighAccuracy:false,timeout:12000,maximumAge:120000}
    );
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
        if(!d?.setup?.yearStart) throw new Error("invalid");
        if(!window.confirm("לשחזר את הגיבוי? כל הנתונים הנוכחיים יוחלפו.")) return;
        persist(d); setShowSettings(false); showToast("הנתונים שוחזרו ✓");
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
  const getPrevInfo = useCallback((year,month)=>{
    if(!appData?.setup) return {odo:0,gapMonths:[]};
    const months=getYearMonths(appData.setup.yearStart);
    let prev=appData.setup.startOdometer, gap=[];
    for(const m of months){
      if(m.year===year&&m.month===month) break;
      if(appData.months?.[m.key]?.odometer){ prev=appData.months[m.key].odometer; gap=[]; }
      else gap.push(m);
    }
    return {odo:prev,gapMonths:gap};
  },[appData]);

  const getPrevOdo = useCallback((year,month)=>getPrevInfo(year,month).odo,[getPrevInfo]);

  // Workdays for a month, plus those of any skipped months folded into it
  const workDaysFor = useCallback((year,month,overrides,gapMonths)=>{
    let n=countWorkdays(year,month,overrides||{});
    for(const g of (gapMonths||[])){
      const ge=migrateEntry(appData?.months?.[g.key]);
      n+=countWorkdays(g.year,g.month,ge?.dayOverrides||{});
    }
    return n;
  },[appData]);

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
    let totalPersonal=0;
    const byMonth={};
    for(const {year,month,key} of months){
      const s=calcMonth(year,month);
      if(s){totalPersonal+=s.personal;byMonth[key]=s;}
    }
    const budget=appData.setup.yearlyBudget||DEFAULT_BUDGET;
    const remaining=Math.max(0,budget-totalPersonal);
    const monthsLeft=months.filter(m=>m.key>=todayKey).length;
    const allowance=monthsLeft>0?Math.round(remaining/monthsLeft):0;
    const pct=Math.min(100,Math.round(totalPersonal/budget*100));
    const maxPersonal=Math.max(1,...Object.values(byMonth).map(s=>s.personal));

    // Forecast: extrapolate the average of recorded months over the whole year
    const recorded=Object.values(byMonth);
    const avg=recorded.length?totalPersonal/recorded.length:0;
    const projected=Math.round(avg*12);
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
            precisionMatters,recordedCount:recorded.length,commute};
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
      workDays+=countWorkdays(g.year,g.month,ge?.dayOverrides||{});
    }
    const workKm=workDays*(appData.setup.commute||62);
    const personal=Math.max(0,totalKm-workKm);
    return {totalKm,workDays,workKm,personal,prevOdo,gapMonths};
  },[uf.odometer,uf.year,uf.month,appData,getPrevInfo,ufWorkDays]);


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
    if(!sf.startOdo||!sf.commute||!sf.yearStart) return;
    const d={setup:{yearStart:sf.yearStart,startOdometer:Number(sf.startOdo),commute:Number(sf.commute),yearlyBudget:Number(sf.yearlyBudget)||DEFAULT_BUDGET},months:{}};
    persist(d);
    setScreen("main");
    showToast("ההגדרות נשמרו ✓");
  }

  function handleSaveSettings(){
    if(!settingsForm.commute||!settingsForm.yearlyBudget) return;
    const newData={
      ...appData,
      setup:{...appData.setup,commute:Number(settingsForm.commute),yearlyBudget:Number(settingsForm.yearlyBudget)||DEFAULT_BUDGET}
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
    setTab("dashboard");
  }

  function openUpdate(year,month){
    const mk=mKey(year,month);
    const ex=migrateEntry(appData?.months?.[mk]);
    setUf({year,month,odometer:ex?.odometer?.toString()||"",dayOverrides:ex?.dayOverrides||{}});
    setTab("update");
  }

  function navigateMonth(dir){
    setUf(prev=>{
      const d=new Date(prev.year,prev.month+dir,1);
      const y=d.getFullYear(),m=d.getMonth();
      const mk=mKey(y,m);
      const ex=migrateEntry(appData?.months?.[mk]);
      return {year:y,month:m,odometer:ex?.odometer?.toString()||"",dayOverrides:ex?.dayOverrides||{}};
    });
  }

  function doReset(){
    if(!window.confirm("לאפס את כל הנתונים ולהתחיל מחדש?")) return;
    localStorage.removeItem(KEY);
    setAppData(null);
    setScreen("setup");
    setTab("dashboard");
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
          <div style={{fontSize:"13px",fontWeight:600,color:cl.accent,letterSpacing:"2px",textTransform:"uppercase",marginBottom:"10px"}}>ברוך הבא</div>
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
          <label style={{...S.label,marginTop:0,color:cl.muted2}}>תחילת שנת מדידה</label>
          <input style={S.input} type="date" value={sf.yearStart} onChange={e=>setSf({...sf,yearStart:e.target.value})}/>
          <label style={{...S.label,color:cl.muted2}}>קריאת מד ביום זה (ק"מ)</label>
          <input style={S.input} type="number" placeholder="למשל: 45000" value={sf.startOdo} onChange={e=>setSf({...sf,startOdo:e.target.value})}/>
          <label style={{...S.label,color:cl.muted2}}>הלוך-חזור לעבודה (ק"מ/יום)</label>
          <input style={S.input} type="number" placeholder="למשל: 62" value={sf.commute} onChange={e=>setSf({...sf,commute:e.target.value})}/>
          <label style={{...S.label,color:cl.muted2}}>תקציב ק"מ פרטי שנתי</label>
          <input style={S.input} type="number" placeholder="למשל: 8400" value={sf.yearlyBudget} onChange={e=>setSf({...sf,yearlyBudget:e.target.value})}/>
          <button className="btn-main" style={S.btn} onClick={handleSetup}>התחל מעקב ←</button>
        </div>
      </div>
      <div style={{position:"fixed",bottom:0,left:0,right:0,textAlign:"center",fontSize:"9px",color:"rgba(240,238,248,0.2)",padding:"5px 0 7px",background:cl.bg,borderTop:`1px solid ${cl.border}`}}>made by illouzman</div>
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
        {/* מקרא */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"6px",marginBottom:"14px"}}>
          {Object.entries(STATE_CFG).map(([k,c])=>(
            <div key={k} style={{background:c.bg,border:`1px solid ${c.border}`,borderRadius:"10px",padding:"8px 6px",textAlign:"center"}}>
              <div style={{fontSize:"16px",marginBottom:"2px"}}>{c.icon}</div>
              <div style={{fontSize:"11px",fontWeight:700,color:c.color}}>{c.label}</div>
            </div>
          ))}
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"2px",marginBottom:"6px"}}>
          {DAY_HE.map(h=><div key={h} style={{textAlign:"center",fontSize:"11px",color:cl.muted,padding:"3px 0",fontWeight:600}}>{h}</div>)}
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"3px"}}>
          {cells.map((d,i)=>{
            if(!d) return <div key={i}/>;
            const iso=toISO(year,month,d);
            const state=getEffectiveState(iso,year,month,d,uf.dayOverrides);
            const cfg=STATE_CFG[state];
            const holiday=HOLIDAYS[iso];
            const isToday=iso===toISO(new Date().getFullYear(),new Date().getMonth(),new Date().getDate());

            return(
              <div key={i} className="day-cell" onClick={()=>openDayModal(iso,year,month,d)}
                style={{textAlign:"center",padding:"4px 2px",borderRadius:"8px",background:cfg.bg,
                  border:`1px solid ${isToday?cl.accent:cfg.border}`,
                  color:cfg.color,cursor:"pointer",height:"44px",overflow:"hidden",
                  display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"1px"}}>
                <span style={{fontSize:"13px",fontWeight:700,lineHeight:1}}>{d}</span>
                {holiday
                    ? <span style={{fontSize:"6px",fontWeight:700,lineHeight:"1.1",maxWidth:"100%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",paddingInline:"2px",opacity:0.9}}>{holiday}</span>
                  : <span style={{fontSize:"10px",lineHeight:1}}>{cfg.icon}</span>
                }
              </div>
            );
          })}
        </div>
        <p style={{fontSize:"11px",color:cl.muted,margin:"10px 0 0",textAlign:"center"}}>לחץ על יום כדי לשנות את הסטטוס שלו</p>
      </div>
    );
  }



  function renderBarChart(){
    if(!annual) return null;
    const chartH=90;
    const yMax=Math.ceil((annual.maxPersonal||annual.allowance||100)/100)*100;
    const ticks=[0,Math.round(yMax/2),yMax];
    const barGrad=(p)=>p>annual.allowance*1.2?"linear-gradient(180deg,#f87171,#fca5a5)":p>annual.allowance?"linear-gradient(180deg,#fb923c,#fcd34d)":"linear-gradient(180deg,#a78bfa,#34d399)";
    const allowanceLineY=annual.allowance>0?Math.round((annual.allowance/yMax)*chartH):null;
    return(
      <div style={{display:"flex",gap:"4px",paddingTop:"6px"}}>
        {/* Y axis */}
        <div style={{display:"flex",flexDirection:"column",justifyContent:"space-between",height:`${chartH+14}px`,paddingBottom:"14px",flexShrink:0,width:"28px"}}>
          {ticks.slice().reverse().map(t=>(
            <div key={t} style={{fontSize:"8px",color:cl.muted,lineHeight:1,textAlign:"left"}}>{t>=1000?`${(t/1000).toFixed(1)}k`:t}</div>
          ))}
        </div>
        {/* bars + allowance line */}
        <div style={{flex:1,position:"relative"}}>
          {allowanceLineY!=null&&(
            <div style={{position:"absolute",left:0,right:0,bottom:`${14+allowanceLineY}px`,borderTop:"1px dashed rgba(167,139,250,0.45)",zIndex:1,pointerEvents:"none"}}/>
          )}
          <div style={{display:"flex",alignItems:"flex-end",gap:"3px",height:`${chartH+14}px`,paddingBottom:"14px"}}>
            {annual.months.map(({year,month,key},i)=>{
              const s=annual.byMonth[key];
              const isFuture=key>todayKey;
              const isCurr=key===todayKey;
              const barH=s?Math.max(3,Math.round((s.personal/yMax)*chartH)):0;
              return(
                <div key={key} className="month-pill" onClick={()=>openUpdate(year,month)}
                  style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"2px",cursor:"pointer"}}>
                  <div className={s&&!isFuture?"bar-seg":undefined}
                    style={{width:"100%",height:`${barH||2}px`,
                      background:isFuture?(isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.06)"):s?barGrad(s.personal):(isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.07)"),
                      borderRadius:"3px 3px 0 0",
                      outline:isCurr?`2px solid ${cl.accent}`:"none",
                      opacity:isFuture?0.35:1,
                      animationDelay:`${i*0.04}s`}}/>
                  <div style={{fontSize:"8px",color:isCurr?cl.accent:cl.muted,fontWeight:isCurr?700:"normal"}}>
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
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingBottom:"20px",marginBottom:"20px",borderBottom:`1px solid ${cl.border}`}}>
          <div>
            <div style={{fontSize:"10px",fontWeight:700,color:cl.accent,letterSpacing:"2px",textTransform:"uppercase",marginBottom:"4px"}}>ניהול חכם של ק״מ שנתי</div>
            <div style={{...S.h1,fontSize:"26px"}}>🚗 8-400</div>
          </div>
          <div style={{display:"flex",gap:"8px"}}>
            <button style={S.btnGhost} className="btn-ghost" onClick={()=>setShowAbout(true)}>ℹ️</button>
            <button style={S.btnGhost} className="btn-ghost" onClick={()=>{
              setSettingsForm({commute:String(appData.setup.commute),yearlyBudget:String(appData.setup.yearlyBudget||DEFAULT_BUDGET)});
              setShowSettings(true);
            }}>⚙️</button>
          </div>
        </div>

        <div style={S.tabs}>
          {[["dashboard","📊 סטטוס"],["update","✏️ עדכון"],["history","📋 היסטוריה"]].map(([k,l])=>(
            <button key={k} className="tab-btn" style={S.tab(tab===k)} onClick={()=>setTab(k)}>{l}</button>
          ))}
        </div>

        {tab==="dashboard" && annual && (
          <div className="tab-content">
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
              if(!annual.byMonth[todayKey] && reminderDismissed!==todayKey) return(
                <div className="reminder-banner km-card" style={{...S.card,background:cl.yellowBg,border:`1px solid ${cl.yellow}44`}}>
                  <div style={{fontWeight:700,fontSize:"15px",color:cl.yellow,marginBottom:"6px"}}>🔔 עוד לא עדכנת את {MONTH_HE[today.getMonth()]}</div>
                  <div style={{display:"flex",gap:"8px",marginTop:"12px"}}>
                    <button className="btn-main" style={{...S.btn,marginTop:0,padding:"11px 20px",fontSize:"13px",width:"auto",background:"linear-gradient(135deg,#92400e,#fbbf24)"}}
                      onClick={()=>{setTab("update");openUpdate(today.getFullYear(),today.getMonth());}}>עדכן עכשיו ←</button>
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

            {/* The one answer: am I OK? */}
            <div className="km-card" style={{...S.card,textAlign:"center",paddingTop:"28px",paddingBottom:"26px",
              background:`linear-gradient(160deg,${verdict.tint} 0%,transparent 75%)`,border:`1px solid ${verdict.color}33`}}>
              <div style={{position:"relative",width:"120px",margin:"0 auto"}}>
                <RingProgress pct={annual.pct} color={verdict.color} trackColor={isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.07)"}/>
                <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                  <div style={{fontSize:"30px",lineHeight:1}}>{verdict.icon}</div>
                </div>
              </div>
              <div style={{fontSize:"19px",fontWeight:800,color:verdict.color,marginTop:"14px"}}>{verdict.title}</div>
              <div style={{fontSize:"14px",color:cl.muted2,marginTop:"8px",lineHeight:"1.6"}}>{verdict.line}</div>
            </div>

            {/* This month, in the terms people actually think in */}
            <div className="km-card" style={S.card}>
              <div style={S.sectionTitle}>מה מותר לי החודש</div>
              <div style={{display:"flex",alignItems:"baseline",gap:"8px"}}>
                <div className="stat-num" style={{fontSize:"42px",fontWeight:800,lineHeight:1,color:cl.text}}>
                  {annual.allowance.toLocaleString()}
                </div>
                <div style={{fontSize:"14px",color:cl.muted}}>ק"מ</div>
              </div>
              <div style={{marginTop:"14px",paddingTop:"14px",borderTop:`1px solid ${cl.border}`,
                display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:"13px",color:cl.muted2}}>נשארו {annual.daysLeftInMonth} ימים</span>
                <span style={S.badge(cl.blue,cl.blueBg)}>≈ {annual.perDay.toLocaleString()} ק״מ ליום</span>
              </div>
            </div>

            {/* Chart doubles as the year timeline — tap a bar to edit that month */}
            <div className="km-card" style={S.card}>
              <div style={S.sectionTitle}>לפי חודש · לחץ לעריכה</div>
              {renderBarChart()}
            </div>

            {/* Everything else lives behind one toggle */}
            <button className="btn-ghost" onClick={()=>setShowDetails(v=>!v)}
              style={{width:"100%",padding:"13px",borderRadius:"14px",border:`1px solid ${cl.border}`,
                background:"transparent",color:cl.muted2,fontSize:"13px",cursor:"pointer",fontFamily:"inherit"}}>
              {showDetails?"▲ הסתר פרטים":"▼ פרטים נוספים"}
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
          <div className="tab-content km-card" style={S.card}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"18px"}}>
              <button style={S.btnGhost} className="btn-ghost" onClick={()=>navigateMonth(-1)}>→</button>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"11px",fontWeight:700,color:cl.accent,letterSpacing:"1.5px",textTransform:"uppercase"}}>{uf.year}</div>
                <div style={{fontSize:"18px",fontWeight:800,color:cl.text,marginTop:"2px"}}>{MONTH_HE[uf.month]}</div>
              </div>
              <button style={S.btnGhost} className="btn-ghost" onClick={()=>navigateMonth(1)}>←</button>
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

            {appData?.setup?.workLocation && mKey(uf.year,uf.month)===todayKey && (
              <button className="btn-ghost" onClick={()=>checkInNow(false)}
                style={{width:"100%",marginTop:"10px",padding:"13px",borderRadius:"12px",
                  border:`1px solid ${cl.border}`,background:cl.accentBg,color:cl.accent,
                  fontSize:"13px",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                📍 אני בעבודה עכשיו — סמן את היום
              </button>
            )}

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
                  <div style={{fontSize:"11px",color:cl.muted,marginBottom:"4px",textTransform:"uppercase",letterSpacing:"0.8px"}}>סה"כ</div>
                  <div style={{fontSize:"20px",fontWeight:800,color:cl.text}}>{livePreview.totalKm}</div>
                  <div style={{fontSize:"10px",color:cl.muted}}>ק"מ</div>
                </div>
                <div style={{textAlign:"center",borderRight:`1px solid ${cl.border}`,borderLeft:`1px solid ${cl.border}`}}>
                  <div style={{fontSize:"11px",color:cl.muted,marginBottom:"4px",textTransform:"uppercase",letterSpacing:"0.8px"}}>עבודה</div>
                  <div style={{fontSize:"20px",fontWeight:800,color:cl.blue}}>{livePreview.workKm}</div>
                  <div style={{fontSize:"10px",color:cl.muted}}>ק"מ</div>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:"11px",color:cl.muted,marginBottom:"4px",textTransform:"uppercase",letterSpacing:"0.8px"}}>פרטי</div>
                  <div style={{fontSize:"20px",fontWeight:800,color:annual&&livePreview.personal>annual.allowance?cl.orange:cl.green}}>{livePreview.personal}</div>
                  <div style={{fontSize:"10px",color:cl.muted}}>ק"מ</div>
                </div>
              </div>
            )}


            <button className="btn-main" style={S.btn} onClick={handleSave}>שמור עדכון ✓</button>
          </div>
        )}

        {tab==="history" && (
          <div className="tab-content">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px"}}>
              <div style={S.sectionTitle}>היסטוריית נסיעות</div>
              <button style={S.btnGhost} className="btn-ghost" onClick={exportCSV}>⬇ CSV</button>
            </div>
            {annual.months.map(m=>{
              const s=annual.byMonth[m.key];
              if(!s) return null;
              const isOver=annual.allowance>0&&s.personal>annual.allowance*1.2;
              const barW=annual.maxPersonal>0?Math.round((s.personal/annual.maxPersonal)*100):0;
              return(
                <div key={m.key} className="km-card" style={{...S.card,marginBottom:"10px",cursor:"pointer"}} onClick={()=>openUpdate(m.year,m.month)}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px"}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:"15px",color:cl.text}}>{MONTH_HE[m.month]}</div>
                      <div style={{fontSize:"11px",color:cl.muted,marginTop:"2px"}}>{m.year} · {s.workDays} ימי עבודה</div>
                    </div>
                    <span style={S.badge(isOver?cl.red:cl.green,isOver?cl.redBg:cl.greenBg)}>
                      {s.personal.toLocaleString()} ק"מ פרטי
                    </span>
                  </div>
                  <div style={{background:isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.07)",borderRadius:"4px",height:"4px",overflow:"hidden"}}>
                    <div style={{width:`${barW}%`,height:"100%",borderRadius:"4px",background:isOver?"linear-gradient(90deg,#f87171,#fca5a5)":"linear-gradient(90deg,#7c3aed,#34d399)",transition:"width 0.6s ease"}}/>
                  </div>
                  <div style={{fontSize:"12px",color:cl.muted,marginTop:"8px",display:"flex",gap:"16px"}}>
                    <span>עבודה: <span style={{color:cl.muted2}}>{s.workKm}</span></span>
                    <span>סה"כ: <span style={{color:cl.muted2}}>{s.totalKm}</span></span>
                  </div>
                </div>
              );
            })}
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
                  if(p==="granted"){showToast("התראות מופעלות ✓");syncStateToSW(appData,null);}
                  else showToast("לא ניתנה הרשאה",cl.red);
                })}>
                🔔 הפעל התראות
              </button>
            )}
            {"Notification" in window && Notification.permission==="granted" && (
              <div style={{marginTop:"10px",fontSize:"12px",color:cl.green,textAlign:"center",fontWeight:600}}>✓ התראות פוש מופעלות</div>
            )}
            {/* GPS work location */}
            <div style={{marginTop:"22px",paddingTop:"18px",borderTop:`1px solid ${cl.border}`}}>
              <div style={{...S.sectionTitle,marginBottom:"6px"}}>זיהוי אוטומטי לפי מיקום</div>
              <div style={{fontSize:"12px",color:cl.muted,lineHeight:"1.6",marginBottom:"12px"}}>
                {appData?.setup?.workLocation
                  ? "מיקום העבודה שמור. כל פתיחה של האפליקציה בזמן שאתה בעבודה תסמן את היום אוטומטית."
                  : "שמור את מיקום העבודה (בזמן שאתה שם) — ואז כל פתיחה של האפליקציה בעבודה תסמן את היום לבד."}
              </div>
              <button className="btn-ghost"
                style={{width:"100%",padding:"13px",borderRadius:"12px",
                  border:`1px solid ${appData?.setup?.workLocation?cl.green+"55":cl.border}`,
                  background:appData?.setup?.workLocation?cl.greenBg:"transparent",
                  color:appData?.setup?.workLocation?cl.green:cl.muted2,
                  fontSize:"13px",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}
                onClick={saveWorkLocation}>
                {appData?.setup?.workLocation?"📍 עדכן את מיקום העבודה":"📍 שמור את מיקום העבודה"}
              </button>
              {appData?.setup?.workLocation && (
                <p style={{fontSize:"11px",color:cl.muted,marginTop:"10px",lineHeight:"1.6"}}>
                  💡 ב-iOS אפשר ליצור קיצור דרך: אוטומציה ← "בהגעה למיקום" ← פתח כתובת אתר עם
                  <code style={{background:cl.surface2,padding:"1px 5px",borderRadius:"4px",margin:"0 3px"}}>?checkin=1</code>
                  והיום יסומן לבד.
                </p>
              )}
            </div>

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

      {showAbout && (
        <div className="modal-overlay-anim" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:"20px",direction:"rtl"}}>
          <div className="modal-card-anim" style={{...S.card,width:"100%",maxWidth:"360px",marginBottom:0,border:"1px solid rgba(167,139,250,0.2)"}}>
            <div style={{textAlign:"center",paddingBottom:"20px",marginBottom:"20px",borderBottom:`1px solid ${cl.border}`}}>
              <div style={{fontSize:"40px",marginBottom:"8px"}}>🚗</div>
              <div style={{fontSize:"24px",fontWeight:800,color:cl.text,letterSpacing:"-0.5px"}}>8-400</div>
              <div style={{fontSize:"12px",color:cl.accent,marginTop:"4px",fontWeight:600}}>ניהול חכם של ק״מ שנתי</div>
            </div>
            <div style={{fontSize:"13px",color:cl.muted2,lineHeight:"1.7",marginBottom:"20px"}}>
              אפליקציה למעקב ק״מ פרטי לאורך השנה — חישוב אוטומטי של ק״מ עבודה מול פרטי, ניהול תקציב שנתי ולוח שנה חכם לסימון ימי עבודה.
            </div>
            <div style={{marginBottom:"20px"}}>
              <div style={{fontSize:"10px",fontWeight:700,color:cl.muted,textTransform:"uppercase",letterSpacing:"1.5px",marginBottom:"10px"}}>האפליקציות שלי</div>
              <a href="https://thelazyluz-dev.github.io/shaati/" target="_blank" rel="noopener noreferrer"
                style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",background:cl.surface2,borderRadius:"12px",border:`1px solid ${cl.border}`,textDecoration:"none",cursor:"pointer"}}>
                <div>
                  <div style={{fontSize:"14px",fontWeight:700,color:cl.text}}>⏱ שעתי</div>
                  <div style={{fontSize:"11px",color:cl.muted,marginTop:"2px"}}>מעקב שעות עבודה</div>
                </div>
                <div style={{fontSize:"16px",color:cl.accent}}>←</div>
              </a>
            </div>
            <div style={{textAlign:"center",fontSize:"11px",color:cl.muted,marginBottom:"16px"}}>made by illouzman</div>
            <button style={{...S.btnGhost,width:"100%",display:"flex",justifyContent:"center",padding:"12px"}}
              className="btn-ghost" onClick={()=>setShowAbout(false)}>סגור</button>
          </div>
        </div>
      )}

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

      {toast && <div className="toast-anim" style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",background:toast.color,color:"#fff",padding:"11px 24px",borderRadius:"28px",fontSize:"14px",fontWeight:700,boxShadow:`0 8px 32px ${toast.color}66`,whiteSpace:"nowrap"}}>{toast.msg}</div>}
      <div style={{position:"fixed",bottom:0,left:0,right:0,textAlign:"center",fontSize:"9px",color:"rgba(240,238,248,0.2)",padding:"5px 0 7px",background:cl.bg,borderTop:`1px solid ${cl.border}`}}>made by illouzman</div>
    </div>
  );
}
