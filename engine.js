// DÖNEN DÜNYA - oyun motoru (saf fonksiyonlar, ekrandan bağımsız)
// Yerçekimi yönleri: 0 aşağı, 1 sol, 2 yukarı, 3 sağ
export const D=[[0,1],[-1,0],[0,-1],[1,0]];
export const PS=0.62;      // oyuncu boyutu (kare cinsinden)
export const RUN=3.4;      // koşu hızı (kare/sn) - hep "ileri" yönde
export const GRAV=28;      // yerçekimi ivmesi
export const VMAX=11;      // en yüksek düşme hızı
export const DT=1/60;      // sabit zaman adımı

// Karakterler: # duvar, ^ diken, G hedef, S başlangıç, B düğme, D kapı (tüm düğmelere hayalet basınca açılır)
export function parseLevel(rows){
  const cells=rows.map(r=>r.split(""));
  let start=null;const buttons=[];
  cells.forEach((row,r)=>row.forEach((ch,c)=>{
    if(ch==="S"){start={c,r};row[c]=" ";}
    if(ch==="B") buttons.push({c,r,key:c+","+r});
  }));
  return {cells,rows:cells.length,cols:cells[0].length,start,buttons};
}
export const tileAt=(lv,c,r)=>(c<0||r<0||c>=lv.cols||r>=lv.rows)?"#":lv.cells[r][c];

function collides(lv,x,y,open){
  const h=PS/2;
  for(let r=Math.floor(y-h);r<=Math.floor(y+h-1e-9);r++)
    for(let c=Math.floor(x-h);c<=Math.floor(x+h-1e-9);c++){
      const ch=tileAt(lv,c,r);
      if(ch==="#"||(ch==="D"&&!open)) return true;
    }
  return false;
}
function slide(lv,x,y,dx,dy,open){
  if(dx===0&&dy===0) return {x,y,blocked:false};
  if(!collides(lv,x+dx,y+dy,open)) return {x:x+dx,y:y+dy,blocked:false};
  let lo=0,hi=1;
  for(let i=0;i<10;i++){const m=(lo+hi)/2;if(collides(lv,x+dx*m,y+dy*m,open))hi=m;else lo=m;}
  return {x:x+dx*lo,y:y+dy*lo,blocked:true};
}
function touches(lv,x,y,ch,shrink){
  const h=PS/2*shrink,m=ch==="^"?0.14:0;
  for(let r=Math.floor(y-h);r<=Math.floor(y+h);r++)
    for(let c=Math.floor(x-h);c<=Math.floor(x+h);c++)
      if(tileAt(lv,c,r)===ch&&x+h>c+m&&x-h<c+1-m&&y+h>r+m&&y-h<r+1-m) return true;
  return false;
}
// Henüz hayalet tarafından tutulmayan bir düğmeye değiyor mu?
function touchedButton(lv,x,y,held){
  const h=PS/2*.8;
  for(const b of lv.buttons){
    if(held.includes(b.key)) continue;
    if(x+h>b.c&&x-h<b.c+1&&y+h>b.r&&y-h<b.r+1) return b.key;
  }
  return null;
}
// Kapı açık mı? ghosts: [{path:[{x,y}...], button:"c,r"}] -- hayalet düğmeye vardığı andan itibaren basılı tutar
export function doorOpenAt(lv,ghosts,frames){
  if(lv.buttons.length===0) return true;
  return ghosts.length===lv.buttons.length&&ghosts.every(g=>frames>=g.path.length-1);
}
export function newState(lv){return {x:lv.start.c+.5,y:lv.start.r+.5,v:0,g:0,status:"run",frames:0,turns:0};}
// dir: +1 = sol dokunuş (dünya saat yönünün tersine döner), -1 = sağ dokunuş (saat yönünde)
export function rotate(s,dir){
  if(s.status!=="run") return s;
  return {...s,g:(s.g+dir+4)%4,v:0,turns:s.turns+1};
}
// env: {doorOpen:bool, held:[düğme anahtarları]}  (hayaletsiz bölümlerde boş bırakılabilir)
export function step(lv,s,dt,env){
  if(s.status!=="run") return s;
  const open=env?env.doorOpen:true,held=env?env.held:[];
  const gd=D[s.g],fd=D[(s.g+3)%4]; // ileri yön, yerçekiminin 90° yanındadır
  let v=Math.min(s.v+GRAV*dt,VMAX);
  const a=slide(lv,s.x,s.y,fd[0]*RUN*dt,fd[1]*RUN*dt,open);
  const b=slide(lv,a.x,a.y,gd[0]*v*dt,gd[1]*v*dt,open);
  if(b.blocked) v=0;
  let status="run",button=null;
  if(touches(lv,b.x,b.y,"^",.8)) status="dead";
  else {
    button=touchedButton(lv,b.x,b.y,held);
    if(button) status="button";
    else if(open&&touches(lv,b.x,b.y,"G",.8)) status="won";
  }
  return {...s,x:b.x,y:b.y,v,status,button,frames:s.frames+1};
}
