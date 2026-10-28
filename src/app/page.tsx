"use client";
import { useState } from "react";
import { Activity, CheckCircle2, FileSpreadsheet, Send, UploadCloud, AlertTriangle } from "lucide-react";

type Row = string[];
type Result = { row: number; ok: boolean; message: string };
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
export default function Home() {
 const [fileName,setFileName]=useState(""); const [headers,setHeaders]=useState<string[]>([]); const [rows,setRows]=useState<Row[]>([]);
 const [busy,setBusy]=useState(false); const [results,setResults]=useState<Result[]>([]); const [progress,setProgress]=useState(0); const [message,setMessage]=useState("Upload the Excel workbook to begin.");
 const [confirmed,setConfirmed]=useState(false);
 async function readFile(file?:File) {
  if(!file)return; setBusy(true); setResults([]); setConfirmed(false);
  try {
   const XLSX=await import("xlsx"); const wb=XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:true});
   const sheet=wb.Sheets[wb.SheetNames[0]];
   const matrix=XLSX.utils.sheet_to_json<unknown[]>(sheet,{header:1,defval:"",raw:false});
   const h=(matrix[0]??[]).map(v=>String(v??"").trim());
   const data=matrix.slice(1).filter(r=>r.some(v=>String(v??"").trim()!=="")).map(r=>EXPECTED_HEADERS.map((_,i)=>String(r[i]??"").trim()));
   setHeaders(h); setRows(data); setFileName(file.name);
   const mismatches=EXPECTED_HEADERS.map((x,i)=>({i,actual:h[i]??"",expected:x})).filter(x=>x.actual!==x.expected);
   setMessage(h.length===42&&data.length>0 ? (mismatches.length===0 ? `Ready: ${data.length} rows and all 42 columns match the configured Google Form order.` : `Loaded ${data.length} rows. ${mismatches.length} header names/order differences detected; verify the preview before submitting.`) : `Expected 42 columns; detected ${h.length}. Please check the workbook.`);
  } catch(e){setMessage(e instanceof Error?e.message:"Could not read workbook.");}
  setBusy(false);
 }
 async function submitAll(){
  if(!confirmed||rows.length===0||headers.length!==42)return;
  setBusy(true);setResults([]);setProgress(0);let done:Result[]=[];
  for(let i=0;i<rows.length;i++){
   try {
    const response=await fetch("/api/google-form-submit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({answers:rows[i]})});
    const data=await response.json();
    const item={row:i+2,ok:Boolean(data.ok),message:String(data.message??data.error??"Unknown result")}; done=[...done,item];setResults([...done]);setProgress(Math.round((i+1)/rows.length*100));
    if(!item.ok){setMessage(`Stopped at Excel row ${i+2}. No later rows were submitted. Verify the Google Form response before retrying.`);break;}
   } catch(e){done=[...done,{row:i+2,ok:false,message:e instanceof Error?e.message:"Network error"}];setResults([...done]);setMessage(`Stopped at Excel row ${i+2} because the submission result could not be confirmed. Do not retry this row until you check Google Forms.`);break;}
   if(i<rows.length-1) await new Promise(resolve=>setTimeout(resolve,1800));
  }
  if(done.length===rows.length&&done.every(x=>x.ok))setMessage(`Completed: ${done.length} rows received a success response from Google Forms.`);
  setBusy(false);setConfirmed(false);
 }
 const valid=headers.length===42&&rows.length>0;
 return <main className="min-h-screen px-5 py-8 md:px-10"><div className="mx-auto max-w-6xl">
  <header className="mb-10 flex items-center gap-3"><div className="rounded-2xl border border-white/10 bg-white/5 p-3"><Activity className="h-6 w-6 text-indigo-300"/></div><div><p className="text-lg font-semibold">Research Response Importer</p><p className="text-xs text-slate-400">Google Forms submission workspace · No login</p></div></header>
  <section className="mb-8"><p className="mb-3 text-xs font-semibold uppercase tracking-[.22em] text-indigo-300">Google Forms automation</p><h1 className="text-3xl font-semibold tracking-tight md:text-5xl">From Excel to Google Forms.</h1><p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">Upload your questionnaire workbook, verify the 42-column mapping, preview participant answers, and submit each row to your Google Form.</p></section>
  <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
   <section className="rounded-3xl border border-white/10 bg-slate-900/65 p-6 md:p-8"><div className="mb-5 flex items-center gap-3"><UploadCloud className="text-indigo-300"/><h2 className="text-lg font-semibold">Upload response workbook</h2></div>
    <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-indigo-300/30 bg-indigo-300/[.045] p-6 text-center"><FileSpreadsheet className="mb-4 h-8 w-8 text-indigo-200"/><span className="font-medium">Choose Excel workbook</span><span className="mt-2 text-xs text-slate-400">.xlsx or .xls · first worksheet</span><input className="sr-only" type="file" accept=".xlsx,.xls" onChange={e=>readFile(e.target.files?.[0])}/></label>
    {fileName&&<div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4"><p className="font-semibold">{fileName}</p><p className="mt-1 text-xs text-slate-400">{rows.length} response rows · {headers.length} detected columns</p></div>}
    <p role="status" className="mt-4 text-sm text-slate-300">{message}</p>
    {valid&&<><div className="mt-5 rounded-xl border border-white/10 p-4"><div className="mb-3 flex items-center justify-between"><strong className="text-sm">Column mapping</strong><span className="text-xs text-slate-400">Excel order → Form entry order</span></div><div className="max-h-56 space-y-2 overflow-auto">{EXPECTED_HEADERS.map((h,i)=><div key={i} className="flex items-start justify-between gap-3 text-xs"><span className="min-w-0 text-slate-300">{i+1}. {h}</span><span className={headers[i]===h?"text-emerald-300":"text-amber-300"}>{headers[i]===h?"Matched":"Check header"}</span></div>)}</div></div>
    <div className="mt-5 rounded-xl border border-white/10 p-4"><strong className="text-sm">Preview (first 3 responses)</strong><div className="mt-3 space-y-3">{rows.slice(0,3).map((r,i)=><div key={i} className="border-b border-white/10 pb-3 last:border-0"><p className="mb-1 text-xs font-semibold text-indigo-200">Excel row {i+2}</p><p className="text-xs leading-5 text-slate-300">{r.slice(0,10).join(" · ")}</p></div>)}</div></div>
    <label className="mt-5 flex items-start gap-3 rounded-xl border border-amber-300/20 bg-amber-300/[.06] p-4 text-xs leading-5 text-amber-100"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} className="mt-1"/><span>I have verified the mapping and these are genuine responses that I am authorised to transcribe as new Google Forms submissions. I understand Google Forms will record new submission times.</span></label>
    <button disabled={busy||!confirmed||!valid} onClick={submitAll} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-40"><Send size={17}/>{busy?"Submitting…":"Submit all responses to Google Forms"}</button>
    {busy&&<div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-indigo-300" style={{width:progress+"%"}}/></div>}</>}
   </section>
   <aside className="space-y-5"><section className="rounded-3xl border border-white/10 bg-slate-900/65 p-6"><h2 className="mb-4 font-semibold">Submission destination</h2><p className="text-sm text-slate-300">Your Work Engagement questionnaire Google Form</p><a className="mt-3 inline-block text-xs text-indigo-300 underline" href="https://docs.google.com/forms/d/e/1FAIpQLSfjE092Bc4OzAAW0ZKVPAmN1a7jfLQvwAma0ThsjHrJJgtIvw/viewform" target="_blank" rel="noreferrer">Open Google Form</a><div className="mt-5 space-y-3 text-xs text-slate-400"><p>• 42 pre-filled entry IDs configured</p><p>• Each Excel row submitted separately</p><p>• 1.8-second pause between submissions</p><p>• Stops at the first unconfirmed submission</p><p>• Does not alter historical timestamps</p></div></section>
   <section className="rounded-3xl border border-white/10 bg-slate-900/65 p-6"><div className="mb-4 flex items-center gap-2"><CheckCircle2 className="text-indigo-300"/><h2 className="font-semibold">Submission results</h2></div>{results.length===0?<p className="text-sm text-slate-500">No submissions in this session yet.</p>:<><p className="mb-3 text-xs text-slate-400">{results.filter(x=>x.ok).length} accepted · {results.filter(x=>!x.ok).length} unconfirmed/failed</p><div className="max-h-80 space-y-2 overflow-auto">{results.map(r=><div key={r.row} className="flex items-start gap-2 text-xs"><span className={r.ok?"text-emerald-300":"text-rose-300"}>{r.ok?"✓":"!"}</span><span className="text-slate-300">Excel row {r.row}: {r.message}</span></div>)}</div></>}</section>
   <div className="flex items-start gap-2 rounded-xl border border-amber-300/15 bg-amber-300/[.05] p-4 text-xs leading-5 text-amber-100/80"><AlertTriangle size={16} className="shrink-0"/><span>Google Forms may enforce sign-in, CAPTCHA, required-field rules, or anti-abuse limits. A failed or uncertain result must be checked in the Form responses before retrying to avoid duplicates.</span></div></aside>
  </div>
  <footer className="mt-10 border-t border-white/10 pt-5 text-xs text-slate-500">Research Response Importer · Google Forms submission · No login</footer>
 </div></main>;
}
