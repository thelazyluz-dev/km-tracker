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

function countWorkdays(y, m, offDays=[], extraDays=[]) {
  let n=0;
  for(let d=1;d<=daysInMonth(y,m);d++){
    const iso=toISO(y,m,d);
    if(extraDays.includes(iso)){n++;continue;}
    if(isWorkday(y,m,d) && !HOLIDAYS[iso] && !offDays.includes(iso)) n++;
  }
  return n;
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

const cl = {
  bg:           "#08080e",
  surface:      "#0f0f18",
  surface2:     "#161622",
  border:       "rgba(255,255,255,0.06)",
  borderStrong: "rgba(255,255,255,0.13)",
  text:         "#f0eef8",
  muted:        "rgba(240,238,248,0.35)",
  muted2:       "rgba(240,238,248,0.62)",
  accent:       "#a78bfa",
  accentBg:     "rgba(167,139,250,0.1)",
  green:        "#34d399",
  greenBg:      "rgba(52,211,153,0.1)",
  orange:       "#fb923c",
  orangeBg:     "rgba(251,146,60,0.1)",
  red:          "#f87171",
  redBg:        "rgba(248,113,113,0.1)",
  yellow:       "#fbbf24",
  yellowBg:     "rgba(251,191,36,0.08)",
  blue:         "#818cf8",
  blueBg:       "rgba(129,140,248,0.1)",
};

const S = {
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

function RingProgress({pct,color}){
  const r=46, circ=2*Math.PI*r, offset=circ-(Math.min(pct,100)/100)*circ;
  return(
    <svg width="120" height="120" style={{transform:"rotate(-90deg)",flexShrink:0}}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="9"/>
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

  const [appData, setAppData] = useState(null);
  const [screen,  setScreen]  = useState("loading");
  const [tab,     setTab]     = useState("dashboard");
  const [toast,   setToast]   = useState(null);
  const [reminderDismissed, setReminderDismissed] = useState(()=>{
    try{ return localStorage.getItem(REMINDER_KEY)||""; }catch{ return ""; }
  });
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({commute:"",yearlyBudget:""});

  const [sf, setSf] = useState({yearStart:`${today.getFullYear()}-01-01`,startOdo:"",commute:"62",yearlyBudget:String(DEFAULT_BUDGET)});

  const lastM = new Date(today.getFullYear(),today.getMonth()-1,1);
  const [uf, setUf] = useState({year:lastM.getFullYear(),month:lastM.getMonth(),odometer:"",offDays:[],extraDays:[]});

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
    const workDays=countWorkdays(year,month,entry.offDays||[],entry.extraDays||[]);
    const workKm=workDays*(appData.setup.commute||62);
    const personal=Math.max(0,totalKm-workKm);
    return {totalKm,workDays,workKm,personal,odometer:entry.odometer,offDays:entry.offDays||[],extraDays:entry.extraDays||[]};
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
    const workDays=countWorkdays(uf.year,uf.month,uf.offDays,uf.extraDays);
    const workKm=workDays*(appData.setup.commute||62);
    const personal=Math.max(0,totalKm-workKm);
    return {totalKm,workDays,workKm,personal,prevOdo};
  },[uf.odometer,uf.offDays,uf.extraDays,uf.year,uf.month,appData,getPrevOdo]);

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
      months:{...(appData.months||{}),[mk]:{odometer:Number(uf.odometer),offDays:uf.offDays,extraDays:uf.extraDays,savedAt:new Date().toISOString()}}
    };
    persist(newData);
    showToast(`${MONTH_HE[uf.month]} נשמר ✓`);
    setTab("dashboard");
  }

  function openUpdate(year,month){
    const mk=mKey(year,month);
    const ex=appData?.months?.[mk];
    setUf({year,month,odometer:ex?.odometer?.toString()||"",offDays:ex?.offDays||[],extraDays:ex?.extraDays||[]});
    setTab("update");
  }

  function navigateMonth(dir){
    setUf(prev=>{
      const d=new Date(prev.year,prev.month+dir,1);
      const y=d.getFullYear(),m=d.getMonth();
      const mk=mKey(y,m);
      const ex=appData?.months?.[mk];
      return {year:y,month:m,odometer:ex?.odometer?.toString()||"",offDays:ex?.offDays||[],extraDays:ex?.extraDays||[]};
    });
  }

  function toggleDay(iso,naturalWorkday){
    if(naturalWorkday){
      setUf(prev=>({...prev,offDays:prev.offDays.includes(iso)?prev.offDays.filter(d=>d!==iso):[...prev.offDays,iso]}));
    } else {
      setUf(prev=>({...prev,extraDays:prev.extraDays.includes(iso)?prev.extraDays.filter(d=>d!==iso):[...prev.extraDays,iso]}));
    }
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
          <div style={{...S.h1,fontSize:"32px"}}>🚗 8.4k</div>
          <div style={{fontSize:"14px",color:cl.muted,marginTop:"8px",lineHeight:"1.6"}}>מעקב ק"מ פרטי חכם לצרכי מס</div>
        </div>
        <div style={{...S.cardYellow,display:"flex",gap:"14px",alignItems:"flex-start"}}>
          <span style={{fontSize:"22px",lineHeight:1,marginTop:"2px"}}>💡</span>
          <div style={{fontSize:"13px",color:cl.yellow,lineHeight:"1.7"}}>
            <strong>פעם בחודש</strong> מזינים את קריאת המד ומסמנים ימים שלא נסעתם לעבודה. הכל מחושב אוטומטית.
          </div>
        </div>
        <div style={S.card}>
          <div style={S.sectionTitle}>הגדרות ראשוניות</div>
          <label style={{...S.label,marginTop:0}}>תחילת שנת מדידה</label>
          <input style={S.input} type="date" value={sf.yearStart} onChange={e=>setSf({...sf,yearStart:e.target.value})}/>
          <label style={S.label}>קריאת מד ביום זה (ק"מ)</label>
          <input style={S.input} type="number" placeholder="למשל: 45000" value={sf.startOdo} onChange={e=>setSf({...sf,startOdo:e.target.value})}/>
          <label style={S.label}>הלוך-חזור לעבודה (ק"מ/יום)</label>
          <input style={S.input} type="number" placeholder="למשל: 62" value={sf.commute} onChange={e=>setSf({...sf,commute:e.target.value})}/>
          <label style={S.label}>תקציב ק"מ פרטי שנתי</label>
          <input style={S.input} type="number" placeholder="למשל: 8400" value={sf.yearlyBudget} onChange={e=>setSf({...sf,yearlyBudget:e.target.value})}/>
          <button className="btn-main" style={S.btn} onClick={handleSetup}>התחל מעקב ←</button>
        </div>
      </div>
      <div style={{position:"fixed",bottom:0,left:0,right:0,textAlign:"center",fontSize:"11px",color:cl.muted,padding:"6px 0 8px",background:cl.bg,borderTop:`1px solid ${cl.border}`}}>made by illouzman</div>
    </div>
  );

  function renderCalendar(){
    const {year,month}=uf;
    const dim=daysInMonth(year,month);
    const firstDow=dowOf(year,month,1);
    const cells=Array(firstDow).fill(null);
    for(let d=1;d<=dim;d++) cells.push(d);
    while(cells.length%7!==0) cells.push(null);

    return(
      <div>
        {/* מקרא */}
        <div style={{display:"flex",gap:"10px",marginBottom:"10px",fontSize:"11px",color:cl.muted,flexWrap:"wrap"}}>
          <span style={{display:"flex",alignItems:"center",gap:"5px"}}>
            <span style={{width:11,height:11,borderRadius:3,background:"transparent",border:`1.5px solid ${cl.border}`,display:"inline-block",flexShrink:0}}/>
            יום עבודה
          </span>
          <span style={{display:"flex",alignItems:"center",gap:"5px"}}>
            <span style={{width:11,height:11,borderRadius:3,background:cl.redBg,border:`1.5px solid ${cl.red}`,display:"inline-block",flexShrink:0}}/>
            לא נסעתי
          </span>
          <span style={{display:"flex",alignItems:"center",gap:"5px"}}>
            <span style={{width:11,height:11,borderRadius:3,background:cl.yellowBg,border:`1.5px solid #fde68a`,display:"inline-block",flexShrink:0}}/>
            חופש / שבת / חג
          </span>
          <span style={{display:"flex",alignItems:"center",gap:"5px"}}>
            <span style={{width:11,height:11,borderRadius:3,background:cl.greenBg,border:`1.5px solid ${cl.green}`,display:"inline-block",flexShrink:0}}/>
            עבדתי
          </span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"2px",marginBottom:"4px"}}>
          {DAY_HE.map(h=><div key={h} style={{textAlign:"center",fontSize:"11px",color:cl.muted,padding:"3px 0"}}>{h}</div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"3px"}}>
          {cells.map((d,i)=>{
            if(!d) return <div key={i}/>;
            const iso=toISO(year,month,d);
            const isWD=isWorkday(year,month,d);
            const holiday=HOLIDAYS[iso];
            const naturalWorkday=isWD&&!holiday;
            const isOff=uf.offDays.includes(iso);
            const isExtra=uf.extraDays.includes(iso);

            let bg="transparent",color=cl.text,fw="normal";
            if(!naturalWorkday){bg=cl.yellowBg;color=cl.yellow;}
            if(isOff){bg=cl.redBg;color=cl.red;fw="700";}
            if(isExtra){bg=cl.greenBg;color=cl.green;fw="700";}

            return(
              <div key={i} onClick={()=>toggleDay(iso,naturalWorkday)}
                style={{textAlign:"center",padding:"5px 2px 4px",borderRadius:"6px",background:bg,color,fontWeight:fw,cursor:"pointer",lineHeight:"1.2",minHeight:"36px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                <span style={{fontSize:"13px"}}>{d}</span>
                {holiday && <span style={{fontSize:"8px",fontWeight:600,marginTop:"1px",lineHeight:"1.1",wordBreak:"break-all",textAlign:"center",maxWidth:"100%"}}>{holiday}</span>}
              </div>
            );
          })}
        </div>
        <p style={{fontSize:"11px",color:cl.muted,margin:"8px 0 0",textAlign:"center"}}>לחץ על כל יום כדי להחליף בין יום עבודה / לא עבודה</p>
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
    const barGrad=(p)=>p>annual.allowance*1.2?"linear-gradient(180deg,#f87171,#fca5a5)":p>annual.allowance?"linear-gradient(180deg,#fb923c,#fcd34d)":"linear-gradient(180deg,#a78bfa,#34d399)";
    return(
      <div style={{display:"flex",alignItems:"flex-end",gap:"4px",height:"90px",paddingTop:"10px"}}>
        {annual.months.map(({year,month,key},i)=>{
          const s=annual.byMonth[key];
          const isCurr=key===todayKey;
          const barH=s?Math.max(4,Math.round((s.personal/annual.maxPersonal)*70)):0;
          return(
            <div key={key} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"2px"}}>
              <div className={s?"bar-seg":undefined}
                style={{width:"100%",height:`${barH}px`,background:s?barGrad(s.personal):"rgba(255,255,255,0.05)",borderRadius:"4px 4px 0 0",outline:isCurr?`2px solid ${cl.accent}`:"none",animationDelay:`${i*0.04}s`}}/>
              <div style={{fontSize:"9px",color:isCurr?cl.accent:cl.muted,fontWeight:isCurr?700:"normal"}}>
                {MONTH_HE[month].slice(0,3)}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return(
    <div style={S.page}>
      <div style={S.wrap}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingBottom:"20px",marginBottom:"20px",borderBottom:`1px solid ${cl.border}`}}>
          <div>
            <div style={{fontSize:"10px",fontWeight:700,color:cl.accent,letterSpacing:"2px",textTransform:"uppercase",marginBottom:"4px"}}>מעקב ק"מ</div>
            <div style={{...S.h1,fontSize:"26px"}}>🚗 8.4k</div>
          </div>
          <div style={{display:"flex",gap:"8px"}}>
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
                  <RingProgress pct={annual.pct} color={annual.pct>90?cl.red:annual.pct>70?cl.orange:cl.accent}/>
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
              <div style={{fontSize:"12px",color:cl.muted,marginTop:"6px"}}>מחולק שווה בין {annual.monthsLeft} חודשים</div>
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

      {toast && <div className="toast-anim" style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",background:toast.color,color:"#fff",padding:"11px 24px",borderRadius:"28px",fontSize:"14px",fontWeight:700,boxShadow:`0 8px 32px ${toast.color}66`,whiteSpace:"nowrap"}}>{toast.msg}</div>}
      <div style={{position:"fixed",bottom:0,left:0,right:0,textAlign:"center",fontSize:"11px",color:cl.muted,padding:"6px 0 8px",background:cl.bg,borderTop:`1px solid ${cl.border}`}}>made by illouzman</div>
    </div>
  );
}
