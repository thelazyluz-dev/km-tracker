import { useState, useEffect, useMemo, useCallback } from "react";
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
function isWorkday(y,m,d)  { const w=dowOf(y,m,d); return w>=0&&w<=4; }
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

  const lastM = new Date(today.getFullYear(),today.getMonth()-1,1);
  const [uf, setUf] = useState({year:lastM.getFullYear(),month:lastM.getMonth(),odometer:"",dayOverrides:{},dailyLogs:{}});
  const [dayModal, setDayModal] = useState(null); // {iso, year, month, d}
  const [modalOdo, setModalOdo] = useState("");

  useEffect(()=>{
    const d=loadData();
    setAppData(d);
    setScreen(d?.setup?"main":"setup");
  },[]);

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

  function showToast(msg,color=cl.green){
    setToast({msg,color});
    setTimeout(()=>setToast(null),2500);
  }

  const getPrevOdo = useCallback((year,month)=>{
    if(!appData?.setup) return 0;
    const months=getYearMonths(appData.setup.yearStart);
    let prev=appData.setup.startOdometer;
    for(const {year:yr,month:mo,key} of months){
      if(yr===year&&mo===month) break;
      if(appData.months?.[key]?.odometer) prev=appData.months[key].odometer;
    }
    return prev;
  },[appData]);

  const calcMonth = useCallback((year,month)=>{
    const mk=mKey(year,month);
    const entry=appData?.months?.[mk];
    if(!entry?.odometer) return null;
    const prevOdo=getPrevOdo(year,month);
    const totalKm=entry.odometer-prevOdo;
    const me=migrateEntry(entry);
    const workDays=countWorkdays(year,month,me.dayOverrides||{});
    const workKm=workDays*(appData.setup.commute||62);
    const personal=Math.max(0,totalKm-workKm);
    return {totalKm,workDays,workKm,personal,odometer:entry.odometer,dayOverrides:me.dayOverrides||{}};
  },[appData,getPrevOdo]);

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
    return {totalPersonal,remaining,monthsLeft,allowance,pct,byMonth,months,budget,maxPersonal};
  },[appData,todayKey,calcMonth]);

  const livePreview=useMemo(()=>{
    if(!appData?.setup||!uf.odometer) return null;
    const prevOdo=getPrevOdo(uf.year,uf.month);
    const totalKm=Number(uf.odometer)-prevOdo;
    if(totalKm<0||isNaN(totalKm)) return null;
    const workDays=countWorkdays(uf.year,uf.month,uf.dayOverrides);
    const workKm=workDays*(appData.setup.commute||62);
    const personal=Math.max(0,totalKm-workKm);
    return {totalKm,workDays,workKm,personal,prevOdo};
  },[uf.odometer,uf.dayOverrides,uf.year,uf.month,appData,getPrevOdo]);

  const liveFromLogs=useMemo(()=>{
    const logs=uf.dailyLogs||{};
    const dates=Object.keys(logs).sort();
    if(!dates.length||!appData?.setup) return null;
    const latestDate=dates[dates.length-1];
    const latestOdo=logs[latestDate];
    const prevOdo=getPrevOdo(uf.year,uf.month);
    const totalKm=latestOdo-prevOdo;
    if(totalKm<0||isNaN(totalKm)) return null;
    const dd=Number(latestDate.split("-")[2]);
    let workKm=0;
    for(let d=1;d<=dd;d++){
      const iso=toISO(uf.year,uf.month,d);
      if(getEffectiveState(iso,uf.year,uf.month,d,uf.dayOverrides)==="work") workKm+=(appData.setup.commute||62);
    }
    const personal=Math.max(0,totalKm-workKm);
    return {totalKm,workKm,personal,latestDate};
  },[uf.dailyLogs,uf.year,uf.month,uf.dayOverrides,appData,getPrevOdo]);

  function openDayModal(iso, year, month, d){
    const existing = (uf.dailyLogs||{})[iso];
    setModalOdo(existing ? String(existing) : "");
    setDayModal({iso, year, month, d});
  }

  function saveDayModal(newState){
    if(!dayModal) return;
    const {iso, year, month, d} = dayModal;
    const mk = mKey(year, month);
    // update dayOverrides
    const def = getDefaultState(iso, year, month, d);
    const newOv = {...uf.dayOverrides};
    if(newState === def) delete newOv[iso]; else newOv[iso] = newState;
    // update dailyLogs
    const newLogs = {...(uf.dailyLogs||{})};
    if(modalOdo) newLogs[iso] = Number(modalOdo);
    else delete newLogs[iso];
    // persist
    const ex = migrateEntry(appData?.months?.[mk]) || {dayOverrides:{}};
    const updated = {...ex, dayOverrides: newOv, dailyLogs: newLogs};
    persist({...appData, months:{...(appData.months||{}), [mk]: updated}});
    setUf(prev => ({...prev, dayOverrides: newOv, dailyLogs: newLogs}));
    setDayModal(null);
    showToast("נשמר ✓", cl.green);
  }

  function deleteDayOdo(){
    if(!dayModal) return;
    const {iso, year, month} = dayModal;
    const mk = mKey(year, month);
    const newLogs = {...(uf.dailyLogs||{})};
    delete newLogs[iso];
    const ex = migrateEntry(appData?.months?.[mk]) || {dayOverrides:{}};
    persist({...appData, months:{...(appData.months||{}), [mk]: {...ex, dailyLogs: newLogs}}});
    setUf(prev => ({...prev, dailyLogs: newLogs}));
    setModalOdo("");
    showToast("נמחק", cl.red);
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
    if(livePreview&&annual&&annual.allowance>0&&livePreview.personal>annual.allowance*1.2){
      const ok=window.confirm(`ק"מ פרטיים (${livePreview.personal}) חורגים ב-20% מהמכסה החודשית (${annual.allowance}).\nלשמור בכל זאת?`);
      if(!ok) return;
    }
    const mk=mKey(uf.year,uf.month);
    const newData={
      ...appData,
      months:{...(appData.months||{}),[mk]:{odometer:Number(uf.odometer),dayOverrides:uf.dayOverrides,dailyLogs:uf.dailyLogs||{},savedAt:new Date().toISOString()}}
    };
    persist(newData);
    showToast(`${MONTH_HE[uf.month]} נשמר ✓`);
    setTab("dashboard");
  }

  function openUpdate(year,month){
    const mk=mKey(year,month);
    const ex=migrateEntry(appData?.months?.[mk]);
    setUf({year,month,odometer:ex?.odometer?.toString()||"",dayOverrides:ex?.dayOverrides||{},dailyLogs:ex?.dailyLogs||{}});
    setTab("update");
  }

  function navigateMonth(dir){
    setUf(prev=>{
      const d=new Date(prev.year,prev.month+dir,1);
      const y=d.getFullYear(),m=d.getMonth();
      const mk=mKey(y,m);
      const ex=migrateEntry(appData?.months?.[mk]);
      return {year:y,month:m,odometer:ex?.odometer?.toString()||"",dayOverrides:ex?.dayOverrides||{},dailyLogs:ex?.dailyLogs||{}};
    });
  }

  function cycleDay(iso,y,m,d){
    setUf(prev=>{
      const def=getDefaultState(iso,y,m,d);
      const cur=getEffectiveState(iso,y,m,d,prev.dayOverrides);
      const next=def==="holiday"
        ?({holiday:"work",work:"off",off:"holiday"})[cur]
        :(cur==="work"?"off":"work");
      const newOv={...prev.dayOverrides};
      if(next===def) delete newOv[iso]; else newOv[iso]=next;
      return {...prev,dayOverrides:newOv};
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

            const hasOdo = !!(uf.dailyLogs||{})[iso];
            return(
              <div key={i} className="day-cell" onClick={()=>openDayModal(iso,year,month,d)}
                style={{textAlign:"center",padding:"4px 2px",borderRadius:"8px",background:cfg.bg,
                  border:`1px solid ${isToday?cl.accent:hasOdo?"rgba(251,191,36,0.5)":cfg.border}`,
                  color:cfg.color,cursor:"pointer",height:"44px",overflow:"hidden",
                  display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:"1px"}}>
                <span style={{fontSize:"13px",fontWeight:700,lineHeight:1}}>{d}</span>
                {hasOdo
                  ? <span style={{fontSize:"8px",lineHeight:1,color:cl.yellow}}>📍</span>
                  : holiday
                    ? <span style={{fontSize:"6px",fontWeight:700,lineHeight:"1.1",maxWidth:"100%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",paddingInline:"2px",opacity:0.9}}>{holiday}</span>
                    : <span style={{fontSize:"10px",lineHeight:1}}>{cfg.icon}</span>
                }
              </div>
            );
          })}
        </div>
        <p style={{fontSize:"11px",color:cl.muted,margin:"10px 0 0",textAlign:"center"}}>לחץ על יום לעדכון ומד ק״מ</p>
      </div>
    );
  }

  function renderTimeline(){
    if(!annual) return null;
    return(
      <div style={{display:"flex",gap:"5px",flexWrap:"wrap"}}>
        {annual.months.map(({year,month,key})=>{
          const s=annual.byMonth[key];
          const isCurr=key===todayKey;
          let bg="rgba(255,255,255,0.04)", textC=cl.muted, borderC="transparent";
          if(s){ bg=s.personal>annual.allowance*1.2?cl.redBg:cl.greenBg; textC=s.personal>annual.allowance*1.2?cl.red:cl.green; }
          else if(isCurr){ bg=cl.accentBg; textC=cl.accent; }
          if(isCurr) borderC=cl.accent;

          return(
            <div key={key} className="month-pill" onClick={()=>openUpdate(year,month)}
              style={{padding:"6px 10px",borderRadius:"10px",background:bg,cursor:"pointer",border:`1.5px solid ${borderC}`,color:textC,fontSize:"12px",minWidth:"42px",textAlign:"center",fontWeight:isCurr?700:500}}>
              {MONTH_HE[month].slice(0,3)}
            </div>
          );
        })}
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
                <div key={key} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"2px"}}>
                  <div className={s&&!isFuture?"bar-seg":undefined}
                    style={{width:"100%",height:`${barH||2}px`,
                      background:isFuture?"rgba(255,255,255,0.04)":s?barGrad(s.personal):"rgba(255,255,255,0.06)",
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
            <button style={S.btnGhost} className="btn-ghost" onClick={doReset}>איפוס</button>
          </div>
        </div>

        <div style={S.tabs}>
          {[["dashboard","📊 סטטוס"],["update","✏️ עדכון"],["history","📋 היסטוריה"]].map(([k,l])=>(
            <button key={k} className="tab-btn" style={S.tab(tab===k)} onClick={()=>setTab(k)}>{l}</button>
          ))}
        </div>

        {tab==="dashboard" && (
          <div className="tab-content">
            {annual && !annual.byMonth[todayKey] && reminderDismissed!==todayKey && (
              <div className="reminder-banner km-card" style={{...S.card,background:"rgba(251,191,36,0.07)",border:"1px solid rgba(251,191,36,0.2)",display:"flex",alignItems:"flex-start",gap:"14px",marginBottom:"14px"}}>
                <span style={{fontSize:"22px",lineHeight:1,marginTop:"2px"}}>🔔</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:"14px",color:cl.yellow,marginBottom:"5px"}}>תזכורת חודשית</div>
                  <div style={{fontSize:"13px",color:"rgba(251,191,36,0.75)",lineHeight:"1.6"}}>
                    עוד לא הזנת את מד הק"מ לחודש <strong style={{color:cl.yellow}}>{MONTH_HE[today.getMonth()]}</strong>.
                  </div>
                  <div style={{display:"flex",gap:"8px",marginTop:"12px"}}>
                    <button className="btn-main" style={{...S.btn,marginTop:0,padding:"9px 18px",fontSize:"13px",width:"auto",background:"linear-gradient(135deg,#92400e,#fbbf24)"}}
                      onClick={()=>{ setTab("update"); setUf(f=>({...f,year:today.getFullYear(),month:today.getMonth()})); }}>
                      עדכן עכשיו ←
                    </button>
                    <button style={S.btnGhost} className="btn-ghost" onClick={dismissReminder}>אחר כך</button>
                  </div>
                </div>
              </div>
            )}
            {/* Hero card */}
            <div className="km-card" style={{...S.card,background:"linear-gradient(145deg,rgba(124,58,237,0.15) 0%,rgba(52,211,153,0.06) 100%)",border:"1px solid rgba(167,139,250,0.18)"}}>
              <div style={S.sectionTitle}>נותר לנסוע השנה</div>
              <div style={{display:"flex",alignItems:"center",gap:"20px"}}>
                <div style={{position:"relative",flexShrink:0}}>
                  <RingProgress pct={annual.pct} color={annual.pct>90?cl.red:annual.pct>70?cl.orange:cl.accent} trackColor={isDark?"rgba(255,255,255,0.07)":"rgba(0,0,0,0.07)"}/>
                  <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                    <div style={{fontSize:"15px",fontWeight:800,color:annual.pct>90?cl.red:cl.muted2}}>{annual.pct}%</div>
                    <div style={{fontSize:"9px",color:cl.muted,letterSpacing:"0.5px"}}>נוצל</div>
                  </div>
                </div>
                <div style={{flex:1}}>
                  <div className="stat-num" style={{fontSize:"52px",fontWeight:800,lineHeight:1,background:annual.remaining<1000?"linear-gradient(135deg,#f87171,#fca5a5)":annual.pct>70?"linear-gradient(135deg,#fb923c,#fcd34d)":"linear-gradient(135deg,#a78bfa,#34d399)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>
                    {annual.remaining.toLocaleString()}
                  </div>
                  <div style={{fontSize:"13px",color:cl.muted,marginTop:"6px"}}>מתוך <span style={{color:cl.muted2,fontWeight:600}}>{annual.budget.toLocaleString()}</span> ק"מ שנתי</div>
                  <div style={{background:"rgba(255,255,255,0.05)",borderRadius:"8px",height:"6px",marginTop:"14px",overflow:"hidden"}}>
                    <div className="progress-fill" style={{width:`${annual.pct}%`,height:"100%",borderRadius:"8px",background:annual.pct>90?"linear-gradient(90deg,#f87171,#fca5a5)":annual.pct>70?"linear-gradient(90deg,#fb923c,#fcd34d)":"linear-gradient(90deg,#7c3aed,#a78bfa)"}}/>
                  </div>
                </div>
              </div>
            </div>
            {/* Allowance card */}
            <div className="km-card" style={S.card}>
              <div style={S.sectionTitle}>מכסה לחודש הנוכחי</div>
              <div style={{display:"flex",alignItems:"flex-end",gap:"8px"}}>
                <div className="stat-num" style={{fontSize:"44px",fontWeight:800,lineHeight:1,background:"linear-gradient(135deg,#818cf8,#a78bfa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",backgroundClip:"text"}}>
                  {annual.allowance.toLocaleString()}
                </div>
                <div style={{fontSize:"14px",color:cl.muted,marginBottom:"6px"}}>ק"מ</div>
              </div>
              <div style={{fontSize:"12px",color:cl.muted,marginTop:"6px"}}>
                יתרת ק״מ מחולקת בין {annual.monthsLeft} חודשים — מהחודש הנוכחי עד סוף השנה
              </div>
            </div>
            <div className="km-card" style={S.card}>
              <div style={S.sectionTitle}>ק"מ פרטי לפי חודש</div>
              {renderBarChart()}
            </div>
            <div className="km-card" style={{...S.card,marginBottom:0}}>
              <div style={S.sectionTitle}>ציר זמן שנתי</div>
              {renderTimeline()}
            </div>
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
            <label style={{...S.label,marginTop:0}}>קריאת מד נוכחית (ק"מ)</label>
            <input style={S.input} type="number" placeholder="למשל: 47250" value={uf.odometer} onChange={e=>setUf({...uf,odometer:e.target.value})}/>

            <label style={S.label}>ימי עבודה / חופש</label>
            <p style={{...S.hint,marginTop:"-6px",marginBottom:"8px"}}>לחץ על כל יום כדי לשנות את סטטוסו</p>
            {renderCalendar()}

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

            {liveFromLogs&&(
              <div style={{marginTop:"14px",padding:"14px",background:"rgba(52,211,153,0.07)",borderRadius:"12px",border:"1px solid rgba(52,211,153,0.2)"}}>
                <div style={{fontSize:"10px",color:cl.green,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px",fontWeight:700}}>סטטוס חי · {liveFromLogs.latestDate}</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",textAlign:"center"}}>
                  <div><div style={{fontSize:"18px",fontWeight:800,color:cl.text}}>{liveFromLogs.totalKm}</div><div style={{fontSize:"10px",color:cl.muted}}>סה״כ</div></div>
                  <div><div style={{fontSize:"18px",fontWeight:800,color:cl.blue}}>{liveFromLogs.workKm}</div><div style={{fontSize:"10px",color:cl.muted}}>עבודה</div></div>
                  <div><div style={{fontSize:"18px",fontWeight:800,color:liveFromLogs.personal>annual?.allowance?cl.orange:cl.green}}>{liveFromLogs.personal}</div><div style={{fontSize:"10px",color:cl.muted}}>פרטי</div></div>
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
                  <div style={{background:"rgba(255,255,255,0.05)",borderRadius:"4px",height:"4px",overflow:"hidden"}}>
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
        <div className="modal-overlay-anim" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:"20px",direction:"rtl"}}>
          <div className="modal-card-anim" style={{...S.card,width:"100%",maxWidth:"360px",marginBottom:0,border:"1px solid rgba(167,139,250,0.2)"}}>
            <div style={{fontSize:"18px",fontWeight:800,color:cl.text,marginBottom:"4px"}}>הגדרות</div>
            <div style={{fontSize:"12px",color:cl.muted,marginBottom:"20px"}}>עריכת פרמטרי חישוב</div>
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
            <button style={{...S.btnGhost,width:"100%",marginTop:"8px",justifyContent:"center",display:"flex",padding:"12px"}}
              className="btn-ghost" onClick={()=>setShowSettings(false)}>ביטול</button>
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
        const state = getEffectiveState(iso, year, month, d, uf.dayOverrides);
        const holiday = HOLIDAYS[iso];
        const dayName = DAY_HE[dowOf(year, month, d)];
        const STATE_CFG_MODAL = {
          work:    {label:"עבדתי",     icon:"🚗", color:cl.green,  bg:"rgba(52,211,153,0.15)",  border:"rgba(52,211,153,0.4)"},
          off:     {label:"לא עבדתי", icon:"🏠", color:cl.red,    bg:"rgba(248,113,113,0.15)", border:"rgba(248,113,113,0.4)"},
          holiday: {label:"חג / חופש",icon:"🟡", color:cl.yellow, bg:"rgba(251,191,36,0.13)",  border:"rgba(251,191,36,0.35)"},
        };
        return(
          <div className="modal-overlay-anim" onClick={()=>setDayModal(null)}
            style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(6px)",zIndex:200,display:"flex",alignItems:"flex-end",direction:"rtl"}}>
            <div className="modal-card-anim" onClick={e=>e.stopPropagation()}
              style={{width:"100%",background:cl.surface,borderRadius:"24px 24px 0 0",padding:"24px 20px 36px",border:`1px solid ${cl.border}`,borderBottom:"none"}}>
              {/* handle */}
              <div style={{width:"40px",height:"4px",background:"rgba(255,255,255,0.15)",borderRadius:"2px",margin:"0 auto 20px"}}/>
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
              {/* state toggle */}
              <div style={{fontSize:"11px",fontWeight:700,color:cl.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px"}}>סטטוס יום</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",marginBottom:"20px"}}>
                {Object.entries(STATE_CFG_MODAL).map(([k,c])=>(
                  <button key={k} onClick={()=>saveDayModal(k)}
                    style={{padding:"12px 6px",borderRadius:"12px",border:`2px solid ${state===k?c.border:"transparent"}`,
                      background:state===k?c.bg:cl.surface2,cursor:"pointer",textAlign:"center",
                      transition:"all 0.15s",outline:"none",fontFamily:"inherit"}}>
                    <div style={{fontSize:"20px",marginBottom:"4px"}}>{c.icon}</div>
                    <div style={{fontSize:"11px",fontWeight:700,color:state===k?c.color:cl.muted}}>{c.label}</div>
                  </button>
                ))}
              </div>
              {/* odometer input */}
              <div style={{fontSize:"11px",fontWeight:700,color:cl.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:"8px"}}>קריאת מד (אופציונלי)</div>
              <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
                <input style={{...S.input,flex:1,fontSize:"18px",padding:"14px 16px"}}
                  type="number" placeholder="למשל: 47500"
                  value={modalOdo} onChange={e=>setModalOdo(e.target.value)}/>
                {modalOdo&&(
                  <button onClick={()=>setModalOdo("")}
                    style={{background:cl.redBg,border:`1px solid rgba(248,113,113,0.3)`,borderRadius:"10px",padding:"12px",cursor:"pointer",color:cl.red,fontSize:"16px",lineHeight:1}}>✕</button>
                )}
              </div>
              <p style={{fontSize:"12px",color:cl.muted,margin:"8px 0 20px",lineHeight:"1.5"}}>
                הזן את מד הק״מ הנוכחי כדי לקבל סטטוס חי של ק״מ פרטי עד היום
              </p>
              <div style={{display:"flex",gap:"10px"}}>
                <button className="btn-main" style={{...S.btn,marginTop:0,flex:1}}
                  onClick={()=>saveDayModal(state)}>שמור ✓</button>
                <button style={{...S.btnGhost,padding:"14px 18px",fontSize:"14px"}}
                  className="btn-ghost" onClick={()=>setDayModal(null)}>ביטול</button>
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
