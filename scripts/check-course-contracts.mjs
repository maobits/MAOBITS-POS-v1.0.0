import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();const dir=path.join(root,'course','modules');
const folders=fs.readdirSync(dir).filter(x=>fs.statSync(path.join(dir,x)).isDirectory());
const manifests=folders.map(f=>({folder:f,data:JSON.parse(fs.readFileSync(path.join(dir,f,'module.manifest.json'),'utf8'))}));
const ids=new Set(manifests.map(x=>x.data.id));const aliases=new Set(['foundation','database','security','permissions','catalog-base','products','inventory','customers','pos','checkout','cash','sales','reports','backup-settings','qa-course']);
let errors=[];
for(const {folder,data:m} of manifests){for(const p of m.sourcePaths??[]){if(!fs.existsSync(path.join(root,p)))errors.push(`${m.id}: missing sourcePath ${p}`);}for(const d of m.dependencies??[]){if(!aliases.has(d)&&!ids.has(d))errors.push(`${m.id}: unknown dependency ${d}`);}const slidesPath=path.join(dir,folder,'slides.json');if(!fs.existsSync(slidesPath))errors.push(`${m.id}: missing slides.json`);else{const s=JSON.parse(fs.readFileSync(slidesPath,'utf8'));if(s.slides?.length!==7)errors.push(`${m.id}: expected 7 slides`);}}
if(errors.length){console.error(errors.join('\n'));process.exit(1);}console.log(`Course contracts OK · ${manifests.length} modules · ${manifests.length*7} slide scenes`);
