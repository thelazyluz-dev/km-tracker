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

function countWorkdays(y, m, offDays=[]) {
  let n=0;
  for(let d=1;d<=daysInMonth(y,m);d++){
    const iso=toISO(y,m,d);
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
  bg:"#f7f6f2", surface:"#ffffff", border:"#e5e3dc",
  text:"#1a1917", muted:"#7c7870", accent:"#1a1917",
  green:"#15803d", greenBg:"#dcfce7",
  orange:"#c2410c", orangeBg:"#ffedd5",
  red:"#b91c1c", redBg:"#fee2e2",
  yellow:"#92400e", yellowBg:"#fef9c3",
  blue:"#1d4ed8", blueBg:"#dbeafe",
};

const S = {
  page:  {minHeight:"100vh",background:cl.bg,display:"flex",justifyContent:"center",padding:"20px 16px 70px",fontFamily:"system-ui, sans-serif",direction:"rtl"},
  wrap:  {width:"100%",maxWidth:"430px"},
  card:  {background:cl.surface,borderRadius:"14px",padding:"20px 22px",marginBottom:"12px",border:`1px solid ${cl.border}`},
  cardYellow: {background:cl.yellowBg,borderRadius:"14px",padding:"16px 18px",marginBottom:"12px",border:`1px solid #fde68a`},
  sectionTitle: {fontSize:"11px",fontWeight:700,color:cl.muted,textTransform:"uppercase",letterSpacing:"1px",margin:"0 0 14px"},
  h1:    {fontSize:"26px",fontWeight:800,color:cl.text,margin:0,letterSpacing:"-0.5px"},
  label: {display:"block",fontSize:"12px",fontWeight:600,color:cl.muted,marginBottom:"6px",marginTop:"16px",textTransform:"uppercase",letterSpacing:"0.5px"},
  hint:  {fontSize:"12px",color:cl.muted,marginTop:"5px",lineHeight:"1.5"},
  input: {width:"100%",background:cl.bg,border:`1px solid ${cl.border}`,borderRadius:"8px",color:cl.text,fontSize:"16px",padding:"11px 13px",boxSizing:"border-box",outline:"none",fontFamily:"inherit"},
  btn:   {width:"100%",marginTop:"16px",padding:"14px",borderRadius:"10px",background:cl.text,color:"#fff",fontWeight:700,fontSize:"15px",border:"none",cursor:"pointer",fontFamily:"inherit",letterSpacing:"0.2px",backgroundImage:"linear-gradient(135deg,#1a1917 0%,#343230 100%)"},
  btnGhost: {padding:"8px 14px",borderRadius:"8px",background:"transparent",border:`1px solid ${cl.border}`,color:cl.muted,fontSize:"13px",cursor:"pointer",fontFamily:"inherit"},
  tab:  (a)=>({flex:1,padding:"10px 4px",background:a?cl.text:"transparent",color:a?"#fff":cl.muted,border:"none",cursor:"pointer",fontWeight:a?700:400,fontSize:"14px",fontFamily:"inherit",borderRadius:"7px"}),
  tabs: {display:"flex",background:cl.bg,borderRadius:"10px",padding:"4px",marginBottom:"16px",border:`1px solid ${cl.border}`},
  row:  {display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${cl.border}`,fontSize:"14px"},
  badge:(c,bg)=>({display:"inline-flex",alignItems:"center",padding:"4px 10px",borderRadius:"20px",fontSize:"12px",fontWeight:700,color:c,background:bg}),
};

export default function App() {
  const today    = new Date();
  const todayISO = toISO(today.getFullYear(),today.getMonth(),today.getDate());
  const todayKey = mKey(today.getFullYear(),today.getMonth());

  const [appData, setAppData] = useState(null);
  const [screen,  setScreen]  = useState("loading");
  const [tab,     setTab]     = useState("dashboard");
  const [toast,   setToast]   = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({commute:"",yearlyBudget:""});

  const [sf, setSf] = useState({yearStart:`${today.getFullYear()}-01-01`,startOdo:"",commute:"62",yearlyBudget:String(DEFAULT_BUDGET)});

  const lastM = new Date(today.getFullYear(),today.getMonth()-1,1);
  const [uf, setUf] = useState({year:lastM.getFullYear(),month:lastM.getMonth(),odometer:"",offDays:[],note:""});

  useEffect(()=>{
    const d=loadData();
    setAppData(d);
    setScreen(d?.setup?"main":"setup");
  },[]);

  function persist(d){setAppData({...d});saveData({...d});}

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
    const workDays=countWorkdays(year,month,entry.offDays||[]);
    const workKm=workDays*(appData.setup.commute||62);
    const personal=Math.max(0,totalKm-workKm);
    return {totalKm,workDays,workKm,personal,odometer:entry.odometer,note:entry.note,offDays:entry.offDays||[]};
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
    const workDays=countWorkdays(uf.year,uf.month,uf.offDays);
    const workKm=workDays*(appData.setup.commute||62);
    const personal=Math.max(0,totalKm-workKm);
    return {totalKm,workDays,workKm,personal,prevOdo};
  },[uf.odometer,uf.offDays,uf.year,uf.month,appData,getPrevOdo]);

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
      months:{...(appData.months||{}),[mk]:{odometer:Number(uf.odometer),offDays:uf.offDays,note:uf.note,savedAt:new Date().toISOString()}}
    };
    persist(newData);
    showToast(`${MONTH_HE[uf.month]} נשמר ✓`);
    setTab("dashboard");
  }

  function openUpdate(year,month){
    const mk=mKey(year,month);
    const ex=appData?.months?.[mk];
    setUf({year,month,odometer:ex?.odometer?.toString()||"",offDays:ex?.offDays||[],note:ex?.note||""});
    setTab("update");
  }

  function navigateMonth(dir){
    setUf(prev=>{
      const d=new Date(prev.year,prev.month+dir,1);
      const y=d.getFullYear(),m=d.getMonth();
      const mk=mKey(y,m);
      const ex=appData?.months?.[mk];
      return {year:y,month:m,odometer:ex?.odometer?.toString()||"",offDays:ex?.offDays||[],note:ex?.note||""};
    });
  }

  function toggleOffDay(iso){
    setUf(prev=>({...prev,offDays:prev.offDays.includes(iso)?prev.offDays.filter(d=>d!==iso):[...prev.offDays,iso]}));
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
    const rows=[["חודש","ימי עבודה","ק\"מ עבודה","ק\"מ פרטי","סה\"כ ק\"מ","הערה"]];
    for(const {year,month,key} of annual.months){
      const s=annual.byMonth[key];
      if(!s) continue;
      rows.push([`${MONTH_HE[month]} ${year}`,s.workDays,s.workKm,s.personal,s.totalKm,`"${(s.note||"").replace(/"/g,'""')}"`]);
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
        <div style={{paddingBottom:"20px",marginBottom:"20px",borderBottom:`2px solid ${cl.text}`}}>
          <div style={S.h1}>🚗 מד ק"מ חכם</div>
        </div>
        <div style={S.cardYellow}>
          <div style={{fontSize:"13px",color:cl.yellow,lineHeight:"1.7"}}>
            <strong>איך עובד המעקב?</strong><br/>
            פעם בחודש מזינים את קריאת המד ומסמנים ימים שלא נסעתם לעבודה.
          </div>
        </div>
        <div style={S.card}>
          <label style={S.label}>מתי מתחילה שנת המדידה?</label>
          <input style={S.input} type="date" value={sf.yearStart} onChange={e=>setSf({...sf,yearStart:e.target.value})}/>
          <label style={S.label}>קריאת מד ביום זה (ק"מ)</label>
          <input style={S.input} type="number" value={sf.startOdo} onChange={e=>setSf({...sf,startOdo:e.target.value})}/>
          <label style={S.label}>הלוך-חזור לעבודה (ק"מ ביום)</label>
          <input style={S.input} type="number" value={sf.commute} onChange={e=>setSf({...sf,commute:e.target.value})}/>
          <label style={S.label}>תקציב ק"מ פרטי שנתי</label>
          <input style={S.input} type="number" value={sf.yearlyBudget} onChange={e=>setSf({...sf,yearlyBudget:e.target.value})}/>
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

    return(
      <div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"2px",marginBottom:"4px"}}>
          {DAY_HE.map(h=><div key={h} style={{textAlign:"center",fontSize:"11px",color:cl.muted,padding:"3px 0"}}>{h}</div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"3px"}}>
          {cells.map((d,i)=>{
            if(!d) return <div key={i}/>;
            const iso=toISO(year,month,d);
            const isWD=isWorkday(year,month,d);
            const holiday=HOLIDAYS[iso];
            const isOff=uf.offDays.includes(iso);
            const canClick=isWD&&!holiday;

            let bg="transparent",color=isWD?cl.text:"#ccc",fw="normal";
            if(holiday){bg=cl.yellowBg;color=cl.yellow;}
            if(isOff){bg=cl.redBg;color=cl.red;fw="700";}

            return(
              <div key={i} onClick={()=>canClick&&toggleOffDay(iso)}
                style={{textAlign:"center",padding:"7px 2px",borderRadius:"6px",background:bg,color,fontWeight:fw,cursor:canClick?"pointer":"default",fontSize:"13px"}}>
                {d}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderTimeline(){
    if(!annual) return null;
    return(
      <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
        {annual.months.map(({year,month,key})=>{
          const s=annual.byMonth[key];
          const isCurr=key===todayKey;
          let bg=cl.border, textC=cl.muted;
          if(s){ bg=s.personal>annual.allowance*1.2?cl.redBg:cl.greenBg; textC=s.personal>annual.allowance*1.2?cl.red:cl.green; }
          else if(isCurr){ bg=cl.yellowBg; textC=cl.yellow; }

          return(
            <div key={key} className="month-pill" onClick={()=>openUpdate(year,month)}
              style={{padding:"6px 10px",borderRadius:"10px",background:bg,cursor:"pointer",border:isCurr?`2px solid ${cl.text}`:`2px solid transparent`,color:textC,fontSize:"12px",minWidth:"44px",textAlign:"center",fontWeight:isCurr?700:500}}>
              {MONTH_HE[month].slice(0,3)}
            </div>
          );
        })}
      </div>
    );
  }

  function renderBarChart(){
    if(!annual) return null;
    const barColor=(p)=>p>annual.allowance*1.2?cl.red:p>annual.allowance?cl.orange:cl.green;
    return(
      <div style={{display:"flex",alignItems:"flex-end",gap:"4px",height:"90px",paddingTop:"10px"}}>
        {annual.months.map(({year,month,key},i)=>{
          const s=annual.byMonth[key];
          const isCurr=key===todayKey;
          const barH=s?Math.max(4,Math.round((s.personal/annual.maxPersonal)*70)):0;
          return(
            <div key={key} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"2px"}}>
              <div className={s?"bar-seg":undefined}
                style={{width:"100%",height:`${barH}px`,background:s?barColor(s.personal):cl.border,borderRadius:"4px 4px 0 0",outline:isCurr?`2px solid ${cl.text}`:"none",animationDelay:`${i*0.04}s`}}/>
              <div style={{fontSize:"9px",color:isCurr?cl.text:cl.muted,fontWeight:isCurr?700:"normal"}}>
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
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingBottom:"18px",marginBottom:"16px",borderBottom:`2px solid ${cl.text}`}}>
          <div style={S.h1}>🚗 מד ק"מ</div>
          <div style={{display:"flex",gap:"8px"}}>
            <button style={S.btnGhost} onClick={()=>{
              setSettingsForm({commute:String(appData.setup.commute),yearlyBudget:String(appData.setup.yearlyBudget||DEFAULT_BUDGET)});
              setShowSettings(true);
            }}>⚙️ הגדרות</button>
            <button style={S.btnGhost} onClick={doReset}>איפוס</button>
          </div>
        </div>

        <div style={S.tabs}>
          {[["dashboard","📊 סטטוס"],["update","✏️ עדכון"],["history","📋 היסטוריה"]].map(([k,l])=>(
            <button key={k} className="tab-btn" style={S.tab(tab===k)} onClick={()=>setTab(k)}>{l}</button>
          ))}
        </div>

        {tab==="dashboard" && (
          <div className="tab-content">
            <div className="km-card" style={S.card}>
              <div style={S.sectionTitle}>נותר לנסוע השנה</div>
              <div style={{fontSize:"54px",fontWeight:800,color:annual.remaining<1000?cl.red:cl.green}}>
                {annual.remaining.toLocaleString()}
              </div>
              <div style={{fontSize:"13px",color:cl.muted,marginTop:"4px"}}>מתוך {annual.budget.toLocaleString()} ק"מ שנתי</div>
              <div style={{background:cl.border,borderRadius:"6px",height:"10px",marginTop:"14px",overflow:"hidden"}}>
                <div className="progress-fill" style={{width:`${annual.pct}%`,height:"100%",borderRadius:"6px",background:annual.pct>90?cl.red:cl.green}}/>
              </div>
            </div>
            <div className="km-card" style={S.card}>
              <div style={S.sectionTitle}>מכסה מחושבת לחודש</div>
              <div style={{fontSize:"42px",fontWeight:800}}>{annual.allowance.toLocaleString()}</div>
            </div>
            <div className="km-card" style={S.card}>
              <div style={S.sectionTitle}>ק"מ פרטי לפי חודש</div>
              {renderBarChart()}
            </div>
            <div className="km-card" style={S.card}>
              <div style={S.sectionTitle}>ציר זמן שנתי</div>
              {renderTimeline()}
            </div>
          </div>
        )}

        {tab==="update" && (
          <div className="tab-content km-card" style={S.card}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"14px"}}>
              <button style={S.btnGhost} onClick={()=>navigateMonth(-1)}>→</button>
              <div style={{...S.sectionTitle,margin:0}}>{MONTH_HE[uf.month]} {uf.year}</div>
              <button style={S.btnGhost} onClick={()=>navigateMonth(1)}>←</button>
            </div>
            <label style={S.label}>קריאת מד נוכחית</label>
            <input style={S.input} type="number" value={uf.odometer} onChange={e=>setUf({...uf,odometer:e.target.value})}/>

            <label style={S.label}>ימים שלא נסעת לעבודה</label>
            {renderCalendar()}

            <label style={{...S.label,marginTop:"14px"}}>הערה (אופציונלי)</label>
            <textarea
              style={{...S.input,height:"68px",resize:"vertical",lineHeight:"1.5"}}
              value={uf.note}
              onChange={e=>setUf({...uf,note:e.target.value})}
              placeholder="למשל: נסיעה מיוחדת, ביקור אצל לקוח..."
            />

            {livePreview && (
              <div style={{marginTop:"15px",padding:"12px",background:cl.bg,borderRadius:"8px",fontSize:"14px",display:"flex",gap:"16px"}}>
                <div>סה"כ: <strong>{livePreview.totalKm}</strong> ק"מ</div>
                <div>עבודה: <strong>{livePreview.workKm}</strong> ק"מ</div>
                <div>פרטי: <strong style={{color:annual&&livePreview.personal>annual.allowance?cl.orange:cl.blue}}>{livePreview.personal}</strong> ק"מ</div>
              </div>
            )}

            <button className="btn-main" style={S.btn} onClick={handleSave}>שמור עדכון</button>
          </div>
        )}

        {tab==="history" && (
          <div className="tab-content km-card" style={S.card}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"12px"}}>
              <div style={{...S.sectionTitle,margin:0}}>היסטוריית נסיעות</div>
              <button style={S.btnGhost} onClick={exportCSV}>⬇ CSV</button>
            </div>
            {annual.months.map(m=>{
              const s=annual.byMonth[m.key];
              if(!s) return null;
              const isOver=annual.allowance>0&&s.personal>annual.allowance*1.2;
              return(
                <div key={m.key} style={{...S.row,flexDirection:"column",alignItems:"flex-start",gap:"6px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",width:"100%",alignItems:"center"}}>
                    <strong>{MONTH_HE[m.month]} {m.year}</strong>
                    <span style={S.badge(isOver?cl.red:cl.green,isOver?cl.redBg:cl.greenBg)}>
                      פרטי: {s.personal} ק"מ
                    </span>
                  </div>
                  <div style={{fontSize:"12px",color:cl.muted,display:"flex",gap:"14px"}}>
                    <span>ימי עבודה: {s.workDays}</span>
                    <span>עבודה: {s.workKm} ק"מ</span>
                    <span>סה"כ: {s.totalKm} ק"מ</span>
                  </div>
                  {s.note&&<div style={{fontSize:"12px",color:cl.muted,fontStyle:"italic"}}>{s.note}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showSettings && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100,padding:"20px",direction:"rtl"}}>
          <div style={{...S.card,width:"100%",maxWidth:"360px",marginBottom:0}}>
            <div style={{...S.sectionTitle,marginBottom:"16px"}}>עריכת הגדרות</div>
            <label style={S.label}>הלוך-חזור לעבודה (ק"מ ביום)</label>
            <input style={S.input} type="number" value={settingsForm.commute}
              onChange={e=>setSettingsForm({...settingsForm,commute:e.target.value})}/>
            <label style={S.label}>תקציב שנתי (ק"מ)</label>
            <input style={S.input} type="number" value={settingsForm.yearlyBudget}
              onChange={e=>setSettingsForm({...settingsForm,yearlyBudget:e.target.value})}/>
            <button style={S.btn} onClick={handleSaveSettings}>שמור</button>
            <button style={{...S.btn,marginTop:"8px",background:"transparent",color:cl.muted,border:`1px solid ${cl.border}`}}
              onClick={()=>setShowSettings(false)}>ביטול</button>
          </div>
        </div>
      )}

      {toast && <div className="toast-anim" style={{position:"fixed",bottom:20,left:"50%",transform:"translateX(-50%)",background:toast.color,color:"#fff",padding:"10px 22px",borderRadius:"24px",fontSize:"14px",fontWeight:700,boxShadow:"0 4px 16px rgba(0,0,0,0.18)"}}>{toast.msg}</div>}
    </div>
  );
}
