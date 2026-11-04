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
