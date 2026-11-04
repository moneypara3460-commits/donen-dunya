// ES modülü olan engine.js ve levels.js dosyalarını node'da test için yükler
const fs=require("fs"),path=require("path");
module.exports=function load(file){
  const src=fs.readFileSync(path.join(__dirname,"..",file),"utf8");
  const names=[...src.matchAll(/^export (?:const|function) (\w+)/gm)].map(m=>m[1]);
  const body=src.replace(/^export /gm,"")+"\nreturn {"+names.join(",")+"};";
  return new Function(body)();
};
