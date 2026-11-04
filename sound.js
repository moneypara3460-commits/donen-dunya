// DÖNEN DÜNYA - ses efektleri (dosya yok, kodla üretilir)
import { Platform } from "react-native";
const SR=22050;
const B64="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function bytesToBase64(bytes){
  let out="";
  for(let i=0;i<bytes.length;i+=3){
    const a=bytes[i],hasB=i+1<bytes.length,hasC=i+2<bytes.length,b=hasB?bytes[i+1]:0,c=hasC?bytes[i+2]:0;
    out+=B64[a>>2]+B64[((a&3)<<4)|(b>>4)]+(hasB?B64[((b&15)<<2)|(c>>6)]:"=")+(hasC?B64[c&63]:"=");
  }
  return out;
}
function synthWav(parts,total){
  const n=Math.floor(total*SR),buf=new Float32Array(n);
  for(const p of parts){
    const s0=Math.floor(p.t0*SR),len=Math.floor(p.dur*SR);
    let ph=0,lp=0;
    for(let i=0;i<len&&s0+i<n;i++){
      const t=i/len;
      let v;
      if(p.noise){const cut=p.cut+((p.cut2??p.cut)-p.cut)*t;lp+=(Math.random()*2-1-lp)*cut;v=lp*1.8;}
      else{ph+=2*Math.PI*(p.f0+(p.f1-p.f0)*t)/SR;v=p.type==="tri"?(2/Math.PI)*Math.asin(Math.sin(ph)):Math.sin(ph);}
      buf[s0+i]+=v*Math.min(1,i/(SR*.004))*Math.pow(1-t,p.curve||2)*p.vol;
    }
  }
  const bytes=new Uint8Array(44+n*2),dv=new DataView(bytes.buffer);
  const wr=(o,t)=>{for(let i=0;i<t.length;i++)bytes[o+i]=t.charCodeAt(i);};
  wr(0,"RIFF");dv.setUint32(4,36+n*2,true);wr(8,"WAVE");wr(12,"fmt ");
  dv.setUint32(16,16,true);dv.setUint16(20,1,true);dv.setUint16(22,1,true);
  dv.setUint32(24,SR,true);dv.setUint32(28,SR*2,true);dv.setUint16(32,2,true);dv.setUint16(34,16,true);
  wr(36,"data");dv.setUint32(40,n*2,true);
  for(let i=0;i<n;i++) dv.setInt16(44+i*2,Math.max(-1,Math.min(1,buf[i]))*32767,true);
  return "data:audio/wav;base64,"+bytesToBase64(bytes);
}
const tone=(t0,f,dur,vol=.28,curve=2)=>({t0,f0:f,f1:f,dur,vol,type:"tri",curve});
const SOUND_DEFS={
  tick:{total:.1,parts:[{t0:0,f0:900,f1:700,dur:.06,vol:.22,curve:3}]},
  rotate:{total:.22,parts:[{noise:1,cut:.12,cut2:.6,t0:0,dur:.16,vol:.4,curve:2},{t0:0,f0:380,f1:820,dur:.16,vol:.22,curve:2}]},
  die:{total:.5,parts:[{t0:0,f0:320,f1:55,dur:.4,vol:.5,curve:1.5},{noise:1,cut:.45,t0:0,dur:.12,vol:.45,curve:3}]},
  win:{total:1.4,parts:[tone(0,523,.35,.28,1.5),tone(.15,659,.35,.28,1.5),tone(.3,784,.35,.28,1.5),
    tone(.45,1047,.9,.3,1.5),tone(.45,784,.9,.2,1.5),tone(.45,523,.9,.2,1.5),tone(.8,1568,.4,.15,2)]}
};
const uris={},nativePlayers={};
let audioModeSet=false;
export function playSfx(name){
  try{
    if(!uris[name]) uris[name]=synthWav(SOUND_DEFS[name].parts,SOUND_DEFS[name].total);
    const uri=uris[name];
    if(Platform.OS==="web"){
      if(typeof Audio==="undefined") return;
      const a=new Audio(uri);a.volume=.9;
      const pr=a.play();if(pr&&pr.catch) pr.catch(()=>{});
      return;
    }
    const audio=require("expo-audio");
    if(!audioModeSet){audioModeSet=true;try{audio.setAudioModeAsync({playsInSilentMode:true});}catch(e){}}
    let pl=nativePlayers[name];
    if(!pl){pl=audio.createAudioPlayer({uri});nativePlayers[name]=pl;}
    pl.seekTo(0);pl.play();
  }catch(e){}
}
