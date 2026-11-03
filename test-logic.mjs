import { OneEuro } from './js/filters.js';
import { GestureTracker, pinchRatio, fistAmount } from './js/gestures.js';
import { makeTemplateHand, mapToHeadSpace, assignSlots } from './js/handtracking.js';
let fails=0; const ok=(c,m)=>{ console.log((c?'PASS':'FAIL')+' '+m); if(!c) fails++; };

// 1) One Euro: reduz tremor parado, segue movimento rápido
const f=new OneEuro({minCutoff:1.0,beta:0.05}); let raw=[],out=[];
for(let i=0;i<120;i++){ const t=i/30; const v=0.5+(Math.random()-0.5)*0.02; raw.push(v); out.push(f.filter(v,t)); }
const sd=a=>{const m=a.reduce((x,y)=>x+y)/a.length;return Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0)/a.length)};
ok(sd(out.slice(30))<sd(raw.slice(30))*0.6,`tremor reduzido (${sd(raw).toFixed(4)} -> ${sd(out.slice(30)).toFixed(4)})`);
const g=new OneEuro({minCutoff:1.0,beta:0.05}); let last=0; for(let i=0;i<60;i++){ last=g.filter(i*0.02,i/30); }
ok(Math.abs(last-59*0.02)<0.12,`atraso baixo em movimento rápido (erro ${(59*0.02-last).toFixed(3)} m)`);

// 2) Gestos
const gt=new GestureTracker();
const open=makeTemplateHand(0,false), fist=makeTemplateHand(1,false), pinch=makeTemplateHand(0,true);
for(let i=0;i<4;i++) gt.update(open); ok(!gt.pinching&&!gt.grabbing&&gt.name==='open',`mão aberta -> ${gt.name} (pinch ${gt.pinch.toFixed(2)}, fist ${gt.fist.toFixed(2)})`);
for(let i=0;i<4;i++) gt.update(pinch); ok(gt.pinching,`pinça detectada (razão ${gt.pinch.toFixed(2)})`);
for(let i=0;i<4;i++) gt.update(open); ok(!gt.pinching,'pinça solta com histerese');
for(let i=0;i<4;i++) gt.update(fist); ok(gt.grabbing,`punho detectado (fist ${gt.fist.toFixed(2)}) nome=${gt.name}`);
for(let i=0;i<4;i++) gt.update(open); ok(!gt.grabbing,'punho solto');

// 3) Projeção: mão deslocada no vídeo -> deslocada no espaço; mais perto -> maior no vídeo -> menor distância
const world=makeTemplateHand(0,false);
const mkNorm=(cx,cy,s)=>world.map(p=>({x:cx+p.x*s,y:cy-p.y*s,z:0}));
const cfg={aspect:4/3,hfovDeg:65,depthK:1,reach:1,mirror:false,offset:[0,0,0]};
const near=mapToHeadSpace(mkNorm(0.5,0.5,4.0),world,cfg), far=mapToHeadSpace(mkNorm(0.5,0.5,2.0),world,cfg);
ok(near.depth<far.depth,`mais perto => menor distância (${near.depth.toFixed(2)} < ${far.depth.toFixed(2)} m)`);
const right=mapToHeadSpace(mkNorm(0.8,0.5,3),world,cfg), left=mapToHeadSpace(mkNorm(0.2,0.5,3),world,cfg);
ok(right.joints[0].x>0&&left.joints[0].x<0,'posição X segue o vídeo');
const up=mapToHeadSpace(mkNorm(0.5,0.2,3),world,cfg); ok(up.joints[0].y>0,'posição Y: topo do vídeo = cima');
const mir=mapToHeadSpace(mkNorm(0.8,0.5,3),world,{...cfg,mirror:true}); ok(mir.joints[0].x<0,'espelhamento inverte X');

// 4) Slots esquerda/direita com continuidade
const slots={left:{lastCenter:null,lastSeen:-9},right:{lastCenter:null,lastSeen:-9}};
let a=assignSlots([{cx:0.2,cy:0.5},{cx:0.8,cy:0.5}],slots,1);
ok(a.left&&a.left.cx===0.2&&a.right&&a.right.cx===0.8,'duas mãos novas -> esquerda/direita pela posição');
slots.left.lastCenter={x:0.2,y:0.5};slots.left.lastSeen=1;slots.right.lastCenter={x:0.8,y:0.5};slots.right.lastSeen=1;
a=assignSlots([{cx:0.65,cy:0.5},{cx:0.35,cy:0.5}],slots,1.1); ok(a.left.cx===0.35&&a.right.cx===0.65,'continuidade ao movimentar');
a=assignSlots([{cx:0.75,cy:0.5}],slots,1.1); ok(a.right&&!a.left,'uma mão mantém a identidade');
console.log(fails?`\n${fails} FALHAS`:'\nTODOS OS TESTES PASSARAM'); process.exit(fails?1:0);
