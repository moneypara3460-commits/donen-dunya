// Bölümün "affediciliği": en iyi çözümün dokunuş zamanları ±0.2 sn rastgele kayınca ne kadarı hâlâ başarılı?
// kullanım: node tools/robust.js  (veya levels.js yerine aday bölümler için tools/cand.json)
const load=require("./load");
const E=load("engine.js");
const K=6;
function sim(lv,s,act){if(act===1)s=E.rotate(s,1);else if(act===2)s=E.rotate(s,-1);for(let i=0;i<K&&s.status==="run";i++)s=E.step(lv,s,E.DT);return s;}
const key=s=>[Math.round(s.x*40),Math.round(s.y*40),s.g,Math.round(s.v)].join(",");
function solvePath(lv){
  let fr=[{s:E.newState(lv),p:[]}];const seen=new Set();
  for(let d=0;d<260&&fr.length;d++){const nx=[];
    for(const {s,p} of fr)for(const a of [0,1,2]){const n=sim(lv,s,a);if(n.status==="dead")continue;
      const pp=a?[...p,[d,a]]:p;if(n.status==="won")return pp;
      const k=key(n);if(seen.has(k))continue;seen.add(k);nx.push({s:n,p:pp});}
    fr=nx;}
  return null;
}
function rate(rows,trials=300,jit=2){
  const lv=E.parseLevel(rows),path=solvePath(lv);
  if(!path) return {solvable:false};
  let ok=0;
  for(let t=0;t<trials;t++){
    const plan=path.map(([d,a])=>[Math.max(0,d+Math.round((Math.random()*2-1)*jit)),a]).sort((x,y)=>x[0]-y[0]);
    let s=E.newState(lv),i=0;
    for(let d=0;d<300&&s.status==="run";d++){
      let act=0;
      while(i<plan.length&&plan[i][0]===d){act=plan[i][1];i++;} // aynı anda iki dokunuş: sonuncu geçerli
      s=sim(lv,s,act);
    }
    if(s.status==="won") ok++;
  }
  return {solvable:true,taps:path.length,success:Math.round(ok/trials*100)};
}
module.exports={rate};
if(require.main===module){
  const {LEVELS}=load("levels.js");
  LEVELS.forEach((L,i)=>console.log(i+1,L.name,JSON.stringify(rate(L.rows))));
}
