const crypto=require('crypto');
function seedFrom(s){return crypto.createHash('sha256').update(s).digest().readUInt32BE(0)}
function mulberry32(a){return function(){let t=(a+=0x6d2b79f5);t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
function rndName(rng,n){n=n||8;const a='Il1O0_';let s='IlO_'[Math.floor(rng()*4)];for(let i=1;i<n;i++)s+=a[Math.floor(rng()*a.length)];return s}
function arr(xs){return '{'+xs.join(',')+'}'}
function obfuscate(source,opts){
opts=opts||{};
if(!source||!String(source).trim())throw new Error('empty source');
source=String(source).replace(/^\uFEFF/,'');
const wrapped='return(function(...)\n'+source+'\nend)(...)';
const buildId=(opts.buildId)||crypto.createHash('sha1').update(source+'|'+Date.now()+'|'+Math.random()).digest('hex').slice(0,12);
const rng=mulberry32(seedFrom(buildId+'|emorce-hexed-v4|'+source.length));
const keyA=Array.from({length:16},()=>1+Math.floor(rng()*255));
const keyB=Array.from({length:16},()=>1+Math.floor(rng()*255));
const keyC=Array.from({length:8},()=>1+Math.floor(rng()*255));
const streamBase=1+Math.floor(rng()*0x7fffffff);
const streamMix=1+Math.floor(rng()*0xffff);
const opmask=1+Math.floor(rng()*200);
const checksumSalt=1+Math.floor(rng()*0xffff);
const idxXor=1+Math.floor(rng()*200);
const nibMask=1+Math.floor(rng()*14);
const plain=Buffer.from(wrapped,'utf8');
const payload=Buffer.alloc(plain.length);
let s=(streamBase^streamMix)>>>0;
for(let i=0;i<plain.length;i++){s=(Math.imul(s,1664525)+1013904223)>>>0;const stream=(s>>>16)&0xff;payload[i]=plain[i]^keyA[i%16]^keyB[i%16]^((keyC[i%8]+stream)&0xff)}
const chunkSize=28+Math.floor(rng()*28);
const realChunks=[];for(let i=0;i<payload.length;i+=chunkSize)realChunks.push([...payload.slice(i,i+chunkSize)]);
const decoyCount=8+Math.floor(rng()*12);const allTables=[];const realIndices=[];let ri=0;
for(let i=0;i<realChunks.length+decoyCount;i++){if(ri<realChunks.length&&(rng()>0.4||i-ri>=decoyCount)){realIndices.push(allTables.length);allTables.push(realChunks[ri++])}else{allTables.push(Array.from({length:12+Math.floor(rng()*48)},()=>Math.floor(rng()*256)))}}
while(ri<realChunks.length){realIndices.push(allTables.length);allTables.push(realChunks[ri++])}
const idxEncoded=realIndices.map(x=>((x+1)^idxXor)&0xffff);
function splitNibbles(bytes){const hi=[],lo=[];for(const b of bytes){hi.push((b>>4)&0xf);lo.push(b&0xf)}return{hi,lo}}
function maskNib(n){return n.map(x=>(x^nibMask)&0xf)}
const kaN=splitNibbles(keyA),kbN=splitNibbles(keyB),kcN=splitNibbles(keyC);
kaN.hi=maskNib(kaN.hi);kaN.lo=maskNib(kaN.lo);kbN.hi=maskNib(kbN.hi);kbN.lo=maskNib(kbN.lo);kcN.hi=maskNib(kcN.hi);kcN.lo=maskNib(kcN.lo);
const keyFp=(keyA.reduce((a,b)=>a+b,0)*3+keyB.reduce((a,b)=>a+b,0)*5+keyC.reduce((a,b)=>a+b,0)*7+checksumSalt)>>>0;
const poolBytes=allTables.reduce((n,t)=>n+t.length,0);
const poolChecksum=((poolBytes*3)+(keyA[0]*17)+(keyB[0]*13)+(keyC[0]*7)+opmask*3+checksumSalt)>>>0;
const idxChecksum=(idxEncoded.reduce((a,b)=>a+b,0)*11+idxXor*19+checksumSalt)>>>0;
const N={};for(const k of['env','loader','kaHi','kaLo','kbHi','kbLo','kcHi','kcLo','mask','pool','idxEnc','idxXor','buf','decode','chk','vm','pc','bxor','add','rebuild','inner','wrap','x','y','z','fp','trap','const','ops','ka','kb','kc'])N[k]=rndName(rng,7+Math.floor(rng()*4));
const fakeBc=Array.from({length:80+Math.floor(rng()*40)},()=>Math.floor(rng()*256));
const ot=2+Math.floor(rng()*7),of=2+Math.floor(rng()*7);
const op_true=`(function(${N.x})return(${N.x}*${N.x}>=0)end)(${ot})`;
const op_false=`(function(${N.x})return(${N.x}*${N.x}<0)end)(${of})`;
const bxorFn=`local function ${N.bxor}(a,b)local r,p=0,1 for i=0,7 do local aa=a%2 local bb=b%2 if aa~=bb then r=r+p end a=(a-aa)/2 b=(b-bb)/2 p=p*2 end return r end`;
const addFn=`local function ${N.add}(a,b)return(a+b)%256 end`;
const rebuildFn=`local function ${N.rebuild}(hi,lo)local t={} local m=${nibMask} for i=1,#hi do local h=${N.bxor}(hi[i],m) local l=${N.bxor}(lo[i],m) t[i]=h*16+l end return t end`;
const seedExpr=`${N.bxor}(${streamBase},${streamMix})`;
const code=`--[[ Emorce HEXED v4 // build ${buildId} ]]\nlocal ${N.env}=(getfenv and getfenv())or _ENV or _G\nlocal ${N.loader}=(type(loadstring)==\"function\" and loadstring)or(type(load)==\"function\" and load)or(${N.env} and (${N.env}.loadstring or ${N.env}.load))\nif not ${N.loader} then error(\"HEXED: no loadstring/load\",0) end\nlocal ${N.kaHi}=${arr(kaN.hi)}\nlocal ${N.kaLo}=${arr(kaN.lo)}\nlocal ${N.kbHi}=${arr(kbN.hi)}\nlocal ${N.kbLo}=${arr(kbN.lo)}\nlocal ${N.kcHi}=${arr(kcN.hi)}\nlocal ${N.kcLo}=${arr(kcN.lo)}\nlocal ${N.mask}=${opmask}\nlocal ${N.idxXor}=${idxXor}\nlocal ${N.pool}={${allTables.map(arr).join(',')}}\nlocal ${N.idxEnc}=${arr(idxEncoded)}\n${bxorFn}\n${addFn}\n${rebuildFn}\nlocal ${N.ka}=${N.rebuild}(${N.kaHi},${N.kaLo})\nlocal ${N.kb}=${N.rebuild}(${N.kbHi},${N.kbLo})\nlocal ${N.kc}=${N.rebuild}(${N.kcHi},${N.kcLo})\nfor i=1,#${N.kaHi} do ${N.kaHi}[i]=nil ${N.kaLo}[i]=nil end\nfor i=1,#${N.kbHi} do ${N.kbHi}[i]=nil ${N.kbLo}[i]=nil end\nfor i=1,#${N.kcHi} do ${N.kcHi}[i]=nil ${N.kcLo}[i]=nil end\nlocal ${N.fp}=tostring(${N.env})\nif type(${N.loader})~=\"function\" then while ${op_true} do end end\nlocal function ${N.chk}()\n local n=0 for i=1,#${N.pool} do n=n+#${N.pool}[i] end\n local c=((n*3)+(${N.ka}[1]*17)+(${N.kb}[1]*13)+(${N.kc}[1]*7)+${N.mask}*3+${checksumSalt})%4294967296\n if c~=${poolChecksum} then while ${op_true} do end end\n local fp=0 for i=1,#${N.ka} do fp=fp+${N.ka}[i] end for i=1,#${N.kb} do fp=fp+${N.kb}[i]*5 end for i=1,#${N.kc} do fp=fp+${N.kc}[i]*7 end\n fp=(fp*3+${checksumSalt})%4294967296\n if fp~=${keyFp} then while ${op_true} do end end\n local ic=0 for i=1,#${N.idxEnc} do ic=ic+${N.idxEnc}[i] end\n ic=(ic*11+${N.idxXor}*19+${checksumSalt})%4294967296\n if ic~=${idxChecksum} then while ${op_true} do end end\n if #${N.fp}<3 then while ${op_true} do end end\n return true\nend\nlocal function ${N.vm}()\n local ${N.pc},${N.const}=1,${arr(fakeBc)}\n local ${N.ops}={[${10^opmask}]=1,[${20^opmask}]=2,[${30^opmask}]=3,[${40^opmask}]=4}\n while ${N.pc}<=#${N.const} do\n  local ins=${N.const}[${N.pc}] local op=(ins+${N.mask})%251\n  if ${N.ops}[op]==3 then break end\n  ${N.pc}=${N.pc}+1\n  if ${op_false} then break end\n end\nend\n${N.vm}()\nif not ${N.chk}() then return end\nlocal function ${N.decode}()\n local ${N.buf}={} local ${N.x}=1 local s=${seedExpr} if s==0 then s=1 end\n for ${N.y}=1,#${N.idxEnc} do\n  local ti=${N.bxor}(${N.idxEnc}[${N.y}],${N.idxXor})\n  local ${N.z}=${N.pool}[ti]\n  if not ${N.z} then while ${op_true} do end end\n  for ${N.pc}=1,#${N.z} do\n   local b=${N.z}[${N.pc}]\n   s=(s*1664525+1013904223)%4294967296\n   local stream=math.floor(s/65536)%256\n   local ka=${N.ka}[((${N.x}-1)%#${N.ka})+1]\n   local kb=${N.kb}[((${N.x}-1)%#${N.kb})+1]\n   local kc=${N.kc}[((${N.x}-1)%#${N.kc})+1]\n   local t=${N.bxor}(b,ka) t=${N.bxor}(t,kb) t=${N.bxor}(t,${N.add}(kc,stream))\n   ${N.buf}[${N.x}]=string.char(t) ${N.x}=${N.x}+1\n  end\n end\n return table.concat(${N.buf})\nend\nlocal ${N.inner}=${N.decode}()\nlocal ${N.wrap}=${N.loader}(${N.inner},\"=@EmorceHEXED/${buildId}\")\nif not ${N.wrap} then error(\"HEXED: compile failed\",0) end\n${N.inner}=nil\nreturn ${N.wrap}()\n`;
return code;
}
module.exports={obfuscate};
