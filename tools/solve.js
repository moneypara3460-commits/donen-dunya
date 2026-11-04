// Her bölümün çözülebilir olduğunu ve en az kaç dokunuş gerektiğini bulur: node tools/solve.js
const load=require("./load");
const E=load("engine.js"),{LEVELS}=load("levels.js");
const K=6; // her 0.1 sn'de bir karar
function simulate(lv,s,act){
  if(act===1) s=E.rotate(s,1); else if(act===2) s=E.rotate(s,-1);
  for(let i=0;i<K&&s.status==="run";i++) s=E.step(lv,s,E.DT);
  return s;
}
const key=s=>[Math.round(s.x*40),Math.round(s.y*40),s.g,Math.round(s.v)].join(",");
function solve(rows,maxDecisions=260,cap=400000){
  const lv=E.parseLevel(rows);
  let frontier=[{s:E.newState(lv),path:[]}];
  const seen=new Set([key(frontier[0].s)]);
  let total=0;
  for(let d=0;d<maxDecisions&&frontier.length;d++){
    const next=[];
    for(const {s,path} of frontier) for(const act of [0,1,2]){
      const n=simulate(lv,s,act);
      if(n.status==="dead") continue;
      const p=act?[...path,[d,act]]:path;
      if(n.status==="won") return {ok:true,taps:p.length,secs:((d+1)*K/60).toFixed(1)};
      const k=key(n); if(seen.has(k)) continue;
      seen.add(k);total++;next.push({s:n,path:p});
    }
    frontier=next;
    if(total>cap) return {ok:false,reason:"cap"};
  }
  return {ok:false,reason:"none"};
}
LEVELS.forEach((L,i)=>{const r=solve(L.rows);console.log(i+1,L.name,"par:",L.par,JSON.stringify(r));});

// --- Zorluk ölçümü: ilk dokunuşu kaç farklı anda yapınca bölüm hâlâ çözülebiliyor? (ne kadar çoksa o kadar kolay)
function solvableFrom(lv,s0,maxDecisions=200,cap=120000){
  let frontier=[s0];const seen=new Set([key(s0)]);let total=0;
  for(let d=0;d<maxDecisions&&frontier.length;d++){
    const next=[];
    for(const s of frontier) for(const act of [0,1,2]){
      const n=simulate(lv,s,act);
      if(n.status==="dead") continue;
      if(n.status==="won") return true;
      const k=key(n); if(seen.has(k)) continue;
      seen.add(k);total++;next.push(n);
    }
    frontier=next;if(total>cap) return false;
  }
  return false;
}
if(process.argv.includes("--window")){
  LEVELS.forEach((L,i)=>{
    const lv=E.parseLevel(L.rows);
    let s=E.newState(lv),ok=0,tot=0,first=-1,last=-1;
    for(let d=0;d<40&&s.status==="run";d++){
      tot++;
      const a=simulate(lv,s,1),b=simulate(lv,s,2);
      const good=(a.status!=="dead"&&solvableFrom(lv,a))||(b.status!=="dead"&&solvableFrom(lv,b));
      if(good){ok++;if(first<0)first=d;last=d;}
      s=simulate(lv,s,0);
    }
    console.log(i+1,L.name,"ilk dokunuş için uygun an sayısı:",ok,"("+(ok*0.1).toFixed(1)+" sn)","aralık:",first,"-",last);
  });
}
