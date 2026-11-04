// DÖNEN DÜNYA - oyun motoru (saf fonksiyonlar, ekrandan bağımsız)
// Yerçekimi yönleri: 0 aşağı, 1 sol, 2 yukarı, 3 sağ
export const D=[[0,1],[-1,0],[0,-1],[1,0]];
export const PS=0.62;      // oyuncu boyutu (kare cinsinden)
export const RUN=3.4;      // koşu hızı (kare/sn) - hep "ileri" yönde
export const GRAV=28;      // yerçekimi ivmesi
export const VMAX=11;      // en yüksek düşme hızı
export const DT=1/60;      // sabit zaman adımı

export function parseLevel(rows){
  const cells=rows.map(r=>r.split(""));
  let start=null;
  cells.forEach((row,r)=>row.forEach((ch,c)=>{if(ch==="S"){start={c,r};row[c]=" ";}}));
  return {cells,rows:cells.length,cols:cells[0].length,start};
}
export const tileAt=(lv,c,r)=>(c<0||r<0||c>=lv.cols||r>=lv.rows)?"#":lv.cells[r][c];

function collides(lv,x,y){
  const h=PS/2;
  for(let r=Math.floor(y-h);r<=Math.floor(y+h-1e-9);r++)
    for(let c=Math.floor(x-h);c<=Math.floor(x+h-1e-9);c++)
      if(tileAt(lv,c,r)==="#") return true;
  return false;
}
function slide(lv,x,y,dx,dy){
  if(dx===0&&dy===0) return {x,y,blocked:false};
  if(!collides(lv,x+dx,y+dy)) return {x:x+dx,y:y+dy,blocked:false};
  let lo=0,hi=1;
  for(let i=0;i<10;i++){const m=(lo+hi)/2;if(collides(lv,x+dx*m,y+dy*m))hi=m;else lo=m;}
  return {x:x+dx*lo,y:y+dy*lo,blocked:true};
}
function touches(lv,x,y,ch,shrink){
  const h=PS/2*shrink,m=ch==="^"?0.14:0;
  for(let r=Math.floor(y-h);r<=Math.floor(y+h);r++)
    for(let c=Math.floor(x-h);c<=Math.floor(x+h);c++)
      if(tileAt(lv,c,r)===ch&&x+h>c+m&&x-h<c+1-m&&y+h>r+m&&y-h<r+1-m) return true;
  return false;
}
export function newState(lv){return {x:lv.start.c+.5,y:lv.start.r+.5,v:0,g:0,status:"run",frames:0,turns:0};}
// dir: +1 = sol dokunuş (dünya saat yönünün tersine döner), -1 = sağ dokunuş (saat yönünde)
export function rotate(s,dir){
  if(s.status!=="run") return s;
  return {...s,g:(s.g+dir+4)%4,v:0,turns:s.turns+1};
}
export function step(lv,s,dt){
  if(s.status!=="run") return s;
  const gd=D[s.g],fd=D[(s.g+3)%4]; // ileri yön, yerçekiminin 90° yanındadır
  let v=Math.min(s.v+GRAV*dt,VMAX);
  const a=slide(lv,s.x,s.y,fd[0]*RUN*dt,fd[1]*RUN*dt);
  const b=slide(lv,a.x,a.y,gd[0]*v*dt,gd[1]*v*dt);
  if(b.blocked) v=0;
  let status="run";
  if(touches(lv,b.x,b.y,"^",.8)) status="dead";
  else if(touches(lv,b.x,b.y,"G",.8)) status="won";
  return {...s,x:b.x,y:b.y,v,status,frames:s.frames+1};
}
