// Her bölümün çözülebilir olduğunu ve en az kaç dokunuş gerektiğini bulur: node tools/solve.js
// Hayaletli bölümlerde: her koşu bir düğmeye varır (ilk değen düğme), son koşu hedefe gider.
const load=require("./load");
const E=load("engine.js"),{LEVELS}=load("levels.js");
const K=6; // her 0.1 sn'de bir karar

// env: {held:[...], openFrame:N}  kapı, openFrame karesinden itibaren açık (Infinity: hiç açılmaz, 0: baştan açık)
function simulate(lv,s,act,env){
  if(act===1) s=E.rotate(s,1); else if(act===2) s=E.rotate(s,-1);
  for(let i=0;i<K&&s.status==="run";i++) s=E.step(lv,s,E.DT,{doorOpen:s.frames>=env.openFrame,held:env.held});
  return s;
}
// Amaç: "won" ya da "button". Dönen: {won:{taps,frames}|null, buttons:{key:{taps,frames}}}
function explore(lv,env,wantWon,maxDecisions=260,cap=500000,opts={}){
  let frontier=[{s:E.newState(lv),taps:0}];
  const seen=new Set();
  const out={won:null,buttons:{}};
  const key=s=>[Math.round(s.x*40),Math.round(s.y*40),s.g,Math.round(s.v),(Number.isFinite(env.openFrame)&&s.frames<env.openFrame?s.frames:-1)].join(",");
  let total=0;
  for(let d=0;d<maxDecisions&&frontier.length;d++){
    const next=[];
    for(const {s,taps} of frontier) for(const act of [0,1,2]){
      const n=simulate(lv,s,act,env);
      if(n.status==="dead") continue;
      const t=taps+(act?1:0);
      if(n.status==="won"){ if(wantWon&&(!out.won||(opts.bestTaps&&t<out.won.taps))) out.won={taps:t,frames:n.frames}; continue; }
      if(n.status==="button"){ if(!wantWon){const o=out.buttons[n.button];if(!o||t<o.taps) out.buttons[n.button]={taps:t,frames:n.frames};} continue; }
      const k=key(n); if(seen.has(k)) continue;
      seen.add(k);total++;next.push({s:n,taps:t});
    }
    if(wantWon&&out.won&&!opts.bestTaps) return out;
    frontier=next;
    if(total>cap) break;
  }
  return out;
}
function solveLevel(rows){
  const lv=E.parseLevel(rows);
  const nb=lv.buttons.length;
  if(nb===0){
    const r=explore(lv,{held:[],openFrame:0},true);
    return r.won?{ok:true,taps:r.won.taps,secs:(r.won.frames/60).toFixed(1)}:{ok:false};
  }
  // düğmelere varış sırası: tüm permütasyonlar
  const keys=lv.buttons.map(b=>b.key);
  const perms=nb===1?[[keys[0]]]:[[keys[0],keys[1]],[keys[1],keys[0]]];
  let best=null;
  for(const order of perms){
    let held=[],taps=0,maxFrames=0,ok=true;const legs=[];
    for(const k of order){
      const r=explore(lv,{held:[...held],openFrame:Infinity},false);
      const hit=r.buttons[k];
      if(!hit){ok=false;break;}
      taps+=hit.taps;legs.push(hit.taps);maxFrames=Math.max(maxFrames,hit.frames);held.push(k);
    }
    if(!ok) continue;
    const fin=explore(lv,{held:[...held],openFrame:maxFrames},true,260,4000000);
    const finPar=explore(lv,{held:[...held],openFrame:0},true,260,500000,{bestTaps:true});
    if(!fin.won||!finPar.won) continue;
    const total=taps+finPar.won.taps;
    if(!best||total<best.taps) best={ok:true,taps:total,order,runs:nb+1,legs,finalTaps:finPar.won.taps,doorOpensAt:(maxFrames/60).toFixed(1)+"s"};
  }
  return best||{ok:false};
}
if(require.main===module) LEVELS.forEach((L,i)=>console.log(i+1,L.name,"par:",L.par,JSON.stringify(solveLevel(L.rows))));
module.exports={solveLevel};
