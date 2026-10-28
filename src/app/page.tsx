"use client";
import { useEffect, useRef, useState } from "react";
import { Activity, CheckCircle2, FileSpreadsheet, Send, UploadCloud, AlertTriangle, Pause, Play, Save, RotateCcw } from "lucide-react";

type Row = string[];
type Result = { row: number; ok: boolean; message: string; status: "submitted" | "failed" | "uncertain" };
type SavedJob = {
 version: 1; fileName: string; headers: string[]; rows: Row[]; results: Result[];
 nextIndex: number; confirmed: boolean; status: "ready" | "running" | "paused" | "completed" | "attention";
 inFlightIndex: number | null; message: string; minIntervalSeconds: number; maxIntervalSeconds: number;
};
const STORAGE_KEY = "research-google-forms-submission-job-v2";
const DEFAULT_MIN_INTERVAL = 186;
const DEFAULT_MAX_INTERVAL = 229;
const EXPECTED_HEADERS = [
"1. Year of Birth","2. Gender","3. Marital Status","4. Current Work Location (IT Hub)","5. Total Work Experience","6. Current Designation Level","7. Highest Educational Qualification","8. Current Work Mode","9. Organization Size","10. Annual Income Category (INR)",
"Work Engagement Practices [My organization provides excellent training programs to help me improve my technical and professional skills.]",
"Work Engagement Practices [There are clear career advancement opportunities available to me within this company.]",
"Work Engagement Practices [The company actively supports my continuous learning and skill upgrading.]",
"Work Engagement Practices [I receive adequate recognition and appreciation when I do a good job.]",
"Work Engagement Practices [The compensation and benefits offered by my organization are competitive and fair.]",
"Work Engagement Practices [Performance appraisals in my organization are conducted fairly and transparently.]",
"Work Engagement Practices [Management communicates openly and transparently about the company's goals and future plans.]",
"Work Engagement Practices [The organization provides flexible working arrangements to support my work-life balance.]",
"Work Engagement Practices [I am provided with the necessary tools and resources to perform my job effectively.]",
"Employee Outcomes [Overall, I am highly satisfied with my current job and the tasks I perform daily.]",
"Employee Outcomes [My current role aligns well with my personal career expectations and goals.]",
"Employee Outcomes [I find my daily work meaningful and personally fulfilling.]",
"Employee Outcomes [The culture at my workplace positively contributes to my overall mental and emotional well-being.]",
"Employee Outcomes [I feel capable of managing the stress levels associated with my daily work responsibilities.]",
"Employee Outcomes [My work environment allows me to disconnect and recharge after working hours.]",
"Employee Outcomes [I feel a strong sense of belonging and loyalty to this organization.]",
"Employee Outcomes [I am proud to tell others that I work for this company.]",
"Employee Outcomes [I care deeply about the long-term success of this organization.]",
"Relational Climate [The organization strongly considers my goals and values.]",
"Relational Climate [Help is easily available from the organization when I have a problem or face a challenging situation.]",
"Relational Climate [The organization truly cares about my general satisfaction and well-being at work.]",
"Relational Climate [The organization is willing to help me when I need a special favor.]",
"Relational Climate [My immediate manager or team lead provides clear guidance and constructive feedback.]",
"Relational Climate [My supervisor encourages me to participate in decision-making and values my ideas.]",
"Relational Climate [My leader actively supports my professional growth and advocates for my success.]",
"Relational Climate [My supervisor treats me with respect and acknowledges my contributions.]",
"Turnover Intention [I frequently think about quitting my job.]",
"Turnover Intention [I am actively looking for a job at another organization.]",
"Turnover Intention [If I received an offer from another company, I would likely accept it.]",
"Turnover Intention [It is unlikely that I will be working for this organization next year.]",
"Turnover Intention [I do not see myself building a long-term career (3–5 years) at this organization.]",
"What is the single most important factor that would encourage you to build a long-term career with your current organization?"
];
const wait = (ms:number) => new Promise<void>(resolve => setTimeout(resolve,ms));
export default function Home() {
 const [job,setJob] = useState<SavedJob|null>(null);
 const [hydrated,setHydrated] = useState(false);
 const [busy,setBusy] = useState(false);
 const [confirmed,setConfirmed] = useState(false);
 const [countdown,setCountdown] = useState("");
 const pauseRef = useRef(false);
 const busyRef = useRef(false);
 const jobRef = useRef<SavedJob|null>(null);
 const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);
 function save(next:SavedJob|null) {
  jobRef.current=next; setJob(next);
  try { if(next) localStorage.setItem(STORAGE_KEY,JSON.stringify(next)); else localStorage.removeItem(STORAGE_KEY); } catch {}
 }
 useEffect(()=>{
  try {
   const raw=localStorage.getItem(STORAGE_KEY);
   if(raw) {
    const parsed=JSON.parse(raw) as SavedJob;
    if(parsed?.version===1 && Array.isArray(parsed.rows) && Array.isArray(parsed.results)) {
     if(parsed.inFlightIndex!==null && parsed.inFlightIndex!==undefined) {
      const idx=parsed.inFlightIndex;
      const uncertain:Result={row:idx+2,ok:false,status:"uncertain",message:"Submission was interrupted by closing/reloading the app. Check Google Forms before deciding whether to retry."};
      const prior=parsed.results.filter(x=>x.row!==idx+2);
      parsed.results=[...prior,uncertain].sort((a,b)=>a.row-b.row);
      parsed.nextIndex=idx;
      parsed.inFlightIndex=null;
      parsed.status="attention";
      parsed.message=`Excel row ${idx+2} has an unconfirmed result. Check Google Forms before retrying or marking it submitted.`;
     } else if(parsed.status==="running") {
      parsed.status="paused";
      parsed.message="Submission paused because the app was closed or refreshed. Resume when ready.";
     }
     save(parsed);
    }
   }
  } catch {}
  setHydrated(true);
 },[]);
 useEffect(()=>{ return ()=>{ if(timerRef.current) clearInterval(timerRef.current); }; },[]);
 async function readFile(file?:File) {
  if(!file)return;
  if(jobRef.current && jobRef.current.status!=="completed" && !window.confirm("Replace the saved submission queue? This will discard its saved progress.")) return;
  setBusy(true); setConfirmed(false);
  try {
   const XLSX=await import("xlsx"); const wb=XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:true});
   const sheet=wb.Sheets[wb.SheetNames[0]];
   const matrix=XLSX.utils.sheet_to_json<unknown[]>(sheet,{header:1,defval:"",raw:false});
   const h=(matrix[0]??[]).map(v=>String(v??"").trim());
   const data=matrix.slice(1).filter(r=>r.some(v=>String(v??"").trim()!=="")).map(r=>EXPECTED_HEADERS.map((_,i)=>String(r[i]??"").trim()));
   const mismatches=EXPECTED_HEADERS.map((x,i)=>({i,actual:h[i]??"",expected:x})).filter(x=>x.actual!==x.expected);
   const ok=h.length===42 && mismatches.length===0 && data.length>0 && (matrix[0]??[]).length===42;
   const next:SavedJob={version:1,fileName:file.name,headers:h,rows:data,results:[],nextIndex:0,confirmed:false,status:"ready",inFlightIndex:null,minIntervalSeconds:DEFAULT_MIN_INTERVAL,maxIntervalSeconds:DEFAULT_MAX_INTERVAL,message:ok?`Ready: ${data.length} rows; all 42 headers match exactly. Queue saved in this browser.`:`Cannot submit: expected exactly 42 columns in the configured order. Found ${h.length} headers and ${mismatches.length} header mismatches.`};
   save(next);
  } catch(e) { alert(e instanceof Error?e.message:"Could not read workbook."); }
  setBusy(false);
 }
 function updateJob(patch:Partial<SavedJob>) {
  const current=jobRef.current; if(!current)return;
  save({...current,...patch});
 }
 async function submitAll() {
  const current=jobRef.current;
  if(!current || !current.confirmed || busyRef.current || current.status==="completed")return;
  if(current.results.some(x=>x.status==="uncertain")) { updateJob({status:"attention",message:"Resolve the unconfirmed row first. Check Google Forms, then mark it submitted or explicitly retry it."}); return; }
  pauseRef.current=false; busyRef.current=true; setBusy(true);
  let next=jobRef.current!;
  updateJob({status:"running",message:"Submission running. You can pause at any time."});
  while(true) {
   next=jobRef.current!;
   if(pauseRef.current) { updateJob({status:"paused",inFlightIndex:null,message:"Paused. Your queue and completed responses are saved in this browser."}); break; }
   const idx=next.nextIndex;
   if(idx>=next.rows.length) { updateJob({status:"completed",inFlightIndex:null,message:`Completed: all ${next.rows.length} rows received a success response.`}); break; }
   updateJob({status:"running",inFlightIndex:idx,message:`Submitting Excel row ${idx+2}…`});
   try {
    const response=await fetch("/api/google-form-submit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({answers:next.rows[idx]})});
    const data=await response.json();
    const ok=Boolean(data.ok);
    const item:Result={row:idx+2,ok,status:ok?"submitted":"failed",message:String(data.message??data.error??"Unknown result")};
    const after=jobRef.current!;
    updateJob({results:[...after.results.filter(x=>x.row!==idx+2),item].sort((a,b)=>a.row-b.row),nextIndex:ok?idx+1:idx,inFlightIndex:null,status:ok?"running":"attention",message:ok?`Excel row ${idx+2} submitted successfully.`:`Stopped at Excel row ${idx+2}. Check Google Forms before retrying.`});
    if(!ok)break;
   } catch(e) {
    const after=jobRef.current!;
    const item:Result={row:idx+2,ok:false,status:"uncertain",message:"Network error; Google Forms may or may not have received this row. Check the Form before retrying."};
    updateJob({results:[...after.results.filter(x=>x.row!==idx+2),item].sort((a,b)=>a.row-b.row),nextIndex:idx,inFlightIndex:null,status:"attention",message:`Excel row ${idx+2} is unconfirmed. Check Google Forms before retrying.`});
    break;
   }
   next=jobRef.current!;
   if(next.nextIndex<next.rows.length) {
    const latest=jobRef.current!;
    const minMs=Math.max(1,latest.minIntervalSeconds)*1000;
    const maxMs=Math.max(latest.minIntervalSeconds,latest.maxIntervalSeconds)*1000;
    const delayMs=minMs+Math.floor(Math.random()*(maxMs-minMs+1));
    const end=Date.now()+delayMs;
    let interrupted=false;
    while(Date.now()<end) {
     if(pauseRef.current) { interrupted=true; break; }
     const remaining=end-Date.now();
     setCountdown(`${Math.floor(remaining/60000)}m ${Math.floor((remaining%60000)/1000)}s`);
     await wait(Math.min(1000,remaining));
    }
    setCountdown("");
    if(interrupted || pauseRef.current) { updateJob({status:"paused",message:"Paused between submissions. Your progress is saved; resume to continue with the next row."}); break; }
   }
  }
  busyRef.current=false;setBusy(false);setCountdown("");
 }
 function pause() {
  pauseRef.current=true;
  if(!busyRef.current) updateJob({status:"paused",message:"Paused. Your queue and progress are saved in this browser."});
  else updateJob({message:"Pause requested. The current submission will finish, then the queue will pause before the next row."});
 }
 function resolveUncertain(action:"submitted"|"retry") {
  const current=jobRef.current;if(!current)return;
  const uncertain=current.results.find(x=>x.status==="uncertain");if(!uncertain)return;
  if(action==="submitted") {
   const idx=uncertain.row-2;
   updateJob({results:current.results.map(x=>x.row===uncertain.row?{...x,ok:true,status:"submitted",message:"Manually marked submitted after checking Google Forms."}:x),nextIndex:Math.max(current.nextIndex,idx+1),status:"paused",message:"Row marked as submitted. Resume to continue with the next row."});
  } else {
   updateJob({results:current.results.filter(x=>x.row!==uncertain.row),nextIndex:uncertain.row-2,status:"paused",message:"Unconfirmed row queued for retry. Resume when ready."});
  }
 }
 const valid=Boolean(job && job.headers.length===42 && job.rows.length>0 && job.headers.every((h,i)=>h===EXPECTED_HEADERS[i]));
 const submitted=job?.results.filter(x=>x.status==="submitted").length??0;
 const minInterval=job?.minIntervalSeconds??DEFAULT_MIN_INTERVAL;
 const maxInterval=job?.maxIntervalSeconds??DEFAULT_MAX_INTERVAL;
 const uncertain=job?.results.find(x=>x.status==="uncertain");
 if(!hydrated) return <main className="min-h-screen p-10 text-slate-300">Loading saved submission queue…</main>;
 return <main className="min-h-screen px-5 py-8 md:px-10"><div className="mx-auto max-w-6xl">
  <header className="mb-10 flex items-center gap-3"><div className="rounded-2xl border border-white/10 bg-white/5 p-3"><Activity className="h-6 w-6 text-indigo-300"/></div><div><p className="text-lg font-semibold">Research Response Importer</p><p className="text-xs text-slate-400">Google Forms submission workspace · No login</p></div></header>
  <section className="mb-8"><p className="mb-3 text-xs font-semibold uppercase tracking-[.22em] text-indigo-300">Google Forms automation</p><h1 className="text-3xl font-semibold tracking-tight md:text-5xl">From Excel to Google Forms.</h1><p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">Upload your questionnaire workbook, verify the 42-column mapping, and submit each row with a variable three-minute-plus interval. Your queue is saved in this browser.</p></section>
  <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
   <section className="rounded-3xl border border-white/10 bg-slate-900/65 p-6 md:p-8"><div className="mb-5 flex items-center gap-3"><UploadCloud className="text-indigo-300"/><h2 className="text-lg font-semibold">Upload response workbook</h2></div>
    <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-indigo-300/30 bg-indigo-300/[.045] p-6 text-center"><FileSpreadsheet className="mb-4 h-8 w-8 text-indigo-200"/><span className="font-medium">Choose Excel workbook</span><span className="mt-2 text-xs text-slate-400">.xlsx or .xls · first worksheet</span><input className="sr-only" type="file" accept=".xlsx,.xls" onChange={e=>readFile(e.target.files?.[0])}/></label>
    {job&&<div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4"><p className="font-semibold">{job.fileName}</p><p className="mt-1 text-xs text-slate-400">{job.rows.length} response rows · {job.headers.length} detected columns · Saved in this browser</p></div>}
    <p role="status" className="mt-4 text-sm text-slate-300">{job?.message??"Upload the Excel workbook to begin."}</p>
    {job&&valid&&<><div className="mt-5 rounded-xl border border-white/10 p-4"><div className="mb-3 flex items-center justify-between"><strong className="text-sm">Column mapping</strong><span className="text-xs text-slate-400">Excel order → Form entry order</span></div><div className="max-h-56 space-y-2 overflow-auto">{EXPECTED_HEADERS.map((h,i)=><div key={i} className="flex items-start justify-between gap-3 text-xs"><span className="min-w-0 text-slate-300">{i+1}. {h}</span><span className="text-emerald-300">Matched</span></div>)}</div></div>
    <div className="mt-5 rounded-xl border border-white/10 p-4"><strong className="text-sm">Preview (first 3 responses)</strong><div className="mt-3 space-y-3">{job.rows.slice(0,3).map((r,i)=><div key={i} className="border-b border-white/10 pb-3 last:border-0"><p className="mb-1 text-xs font-semibold text-indigo-200">Excel row {i+2}</p><p className="text-xs leading-5 text-slate-300">{r.slice(0,10).join(" · ")}</p></div>)}</div></div>
    <div className="mt-5 rounded-xl border border-indigo-300/20 bg-indigo-300/[.04] p-4">
     <div className="mb-3 flex items-center justify-between gap-3"><strong className="text-sm">Submission interval settings</strong><span className="text-xs text-indigo-200">Randomised delay</span></div>
     <p className="mb-3 text-xs text-slate-400">Choose the minimum and maximum wait between successful submissions. The app randomly selects a delay within this range.</p>
     <div className="grid grid-cols-2 gap-3">
      <label className="text-xs text-slate-300">Minimum delay (seconds)<input type="number" min="1" max="3600" value={minInterval} disabled={busy} onChange={e=>{const v=Math.max(1,Math.min(3600,Number(e.target.value)||1));updateJob({minIntervalSeconds:v,maxIntervalSeconds:Math.max(v,maxInterval)});}} className="mt-2 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white disabled:opacity-50"/></label>
      <label className="text-xs text-slate-300">Maximum delay (seconds)<input type="number" min={minInterval} max="3600" value={maxInterval} disabled={busy} onChange={e=>{const v=Math.max(minInterval,Math.min(3600,Number(e.target.value)||minInterval));updateJob({maxIntervalSeconds:v});}} className="mt-2 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white disabled:opacity-50"/></label>
     </div>
     <p className="mt-3 text-xs text-slate-400">Current random range: {Math.floor(minInterval/60)}m {minInterval%60}s to {Math.floor(maxInterval/60)}m {maxInterval%60}s. Settings are saved with your queue.</p>
    </div>
    <label className="mt-5 flex items-start gap-3 rounded-xl border border-amber-300/20 bg-amber-300/[.06] p-4 text-xs leading-5 text-amber-100"><input type="checkbox" checked={job.confirmed} onChange={e=>updateJob({confirmed:e.target.checked})} className="mt-1"/><span>I have verified the mapping and these are genuine responses that I am authorised to transcribe as new Google Forms submissions. I understand Google Forms will record new submission times.</span></label>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
     <button disabled={busy||!job.confirmed||job.status==="completed"||!valid||Boolean(uncertain)} onClick={submitAll} className="flex items-center justify-center gap-2 rounded-xl bg-indigo-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-40"><Play size={17}/>{job.status==="paused"||job.status==="attention"?"Resume submission":"Start submission"}</button>
     <button disabled={!busy&&job.status!=="running"} onClick={pause} className="flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-3 font-semibold text-slate-100 disabled:opacity-40"><Pause size={17}/>Pause submission</button>
    </div>
    {countdown&&busy&&<p className="mt-3 text-center text-sm text-indigo-200">Next response in {countdown}</p>}
    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-indigo-300" style={{width:`${job.rows.length?submitted/job.rows.length*100:0}%`}}/></div>
    <p className="mt-2 text-xs text-slate-400">{submitted} of {job.rows.length} responses confirmed submitted</p>
    {uncertain&&<div className="mt-4 rounded-xl border border-amber-300/25 bg-amber-300/[.06] p-4 text-sm text-amber-100"><p className="font-semibold">Excel row {uncertain.row} needs verification</p><p className="mt-1 text-xs">{uncertain.message}</p><p className="mt-3 text-xs">Check the Google Form responses first. If it is already there, mark it submitted. Otherwise, queue it for retry.</p><div className="mt-3 flex flex-wrap gap-2"><button onClick={()=>resolveUncertain("submitted")} className="rounded-lg bg-emerald-300 px-3 py-2 text-xs font-semibold text-slate-950">I found it in Forms — mark submitted</button><button onClick={()=>resolveUncertain("retry")} className="rounded-lg border border-amber-200/30 px-3 py-2 text-xs">Not found — allow retry</button></div></div>}
    <button onClick={()=>{if(window.confirm("Clear the saved workbook and all local submission progress? This cannot undo Google Form submissions."))save(null);}} className="mt-4 flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300"><RotateCcw size={14}/>Clear saved queue</button>
    </>}
   </section>
   <aside className="space-y-5"><section className="rounded-3xl border border-white/10 bg-slate-900/65 p-6"><h2 className="mb-4 font-semibold">Submission destination</h2><p className="text-sm text-slate-300">Your Work Engagement questionnaire Google Form</p><a className="mt-3 inline-block text-xs text-indigo-300 underline" href="https://docs.google.com/forms/d/e/1FAIpQLSfjE092Bc4OzAAW0ZKVPAmN1a7jfLQvwAma0ThsjHrJJgtIvw/viewform" target="_blank" rel="noreferrer">Open Google Form</a><div className="mt-5 space-y-3 text-xs text-slate-400"><p>• 42 exact column headers required</p><p>• Each Excel row submitted separately</p><p>• Adjustable random delay between submissions</p><p>• Pause waits for the current request to finish</p><p>• Closing/reloading the app automatically pauses the queue</p><p>• Completed progress is saved in this browser</p></div></section>
   <section className="rounded-3xl border border-white/10 bg-slate-900/65 p-6"><div className="mb-4 flex items-center gap-2"><CheckCircle2 className="text-indigo-300"/><h2 className="font-semibold">Submission results</h2></div>{!job||job.results.length===0?<p className="text-sm text-slate-500">No submissions in this saved queue yet.</p>:<><p className="mb-3 text-xs text-slate-400">{submitted} submitted · {job.results.filter(x=>x.status==="failed").length} failed · {job.results.filter(x=>x.status==="uncertain").length} unconfirmed</p><div className="max-h-80 space-y-2 overflow-auto">{job.results.map(r=><div key={r.row} className="flex items-start gap-2 text-xs"><span className={r.status==="submitted"?"text-emerald-300":r.status==="uncertain"?"text-amber-300":"text-rose-300"}>{r.status==="submitted"?"✓":r.status==="uncertain"?"?":"!"}</span><span className="text-slate-300">Excel row {r.row}: {r.message}</span></div>)}</div></>}</section>
   <div className="flex items-start gap-2 rounded-xl border border-amber-300/15 bg-amber-300/[.05] p-4 text-xs leading-5 text-amber-100/80"><AlertTriangle size={16} className="shrink-0"/><span>Saved progress is local to this browser and device. If a tab closes during a Google Forms request, that row is marked unconfirmed; check Forms before retrying to avoid duplicates. Keep the tab open while a request is actively being sent.</span></div></aside>
  </div>
  <footer className="mt-10 border-t border-white/10 pt-5 text-xs text-slate-500">Research Response Importer · Google Forms submission · No login</footer>
 </div></main>;
}
