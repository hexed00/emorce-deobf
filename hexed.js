/**
 * Emorce HEXED — browser/server JS port
 * Layers: per-build XOR key, scrambled idents, CF state machine, fake VM noise, anti-tamper checksum
 */
const crypto = require('crypto');

function seedFrom(s) {
  return crypto.createHash('sha256').update(s).digest().readUInt32BE(0);
}
function rndName(rng, n = 8) {
  const alphabet = 'Il1O0_';
  let s = 'IlO_'[Math.floor(rng() * 4)];
  for (let i = 1; i < n; i++) s += alphabet[Math.floor(rng() * alphabet.length)];
  return s;
}
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function xorBytes(data, key) {
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) out[i] = data[i] ^ key[i % key.length];
  return out;
}

function obfuscate(source, buildId) {
  buildId = buildId || crypto.createHash('sha1').update(source).digest('hex').slice(0, 10);
  const rng = mulberry32(seedFrom(buildId + '|emorce-hexed'));
  const key = Buffer.from(Array.from({ length: 32 }, () => 1 + Math.floor(rng() * 255)));
  const opmask = 1 + Math.floor(rng() * 200);
  const plain = Buffer.from(source, 'utf8');
  const payload = xorBytes(plain, key);
  const chunk = 40;
  const chunks = [];
  for (let i = 0; i < payload.length; i += chunk) {
    chunks.push([...payload.slice(i, i + chunk)]);
  }
  const N = {};
  for (const k of ['vm','ops','K','R','pc','decode','key','buf','run','chk','env','loader','x','y','z','state','dispatch','const','pool','seed','mask','inner','wrap']) {
    N[k] = rndName(rng, 6 + Math.floor(rng() * 6));
  }
  const nums = [...payload];
  const checksum = (nums.length * 31 + key[0] * 17 + opmask) >>> 0;
  const arr = (xs) => '{' + xs.join(',') + '}';
  const keyArr = arr([...key]);
  const chunkTables = chunks.map(arr).join(',');
  const fakeBc = Array.from({ length: 80 + Math.floor(rng() * 80) }, () => Math.floor(rng() * 256));
  const states = [0,1,2,3,4,5,6,7].sort(() => rng() - 0.5);
  const [s0,s1,s2,s3] = states;
  const ot = 2 + Math.floor(rng() * 7);
  const of = 2 + Math.floor(rng() * 7);
  const op_true = `(function(${N.x})return (${N.x}*${N.x}>=0)end)(${ot})`;
  const op_false = `(function(${N.x})return (${N.x}*${N.x}<0)end)(${of})`;
  const op_loadk = 10 ^ opmask;
  const op_call = 20 ^ opmask;
  const op_ret = 30 ^ opmask;
  const op_jmp = 40 ^ opmask;

  return `--[[
  Emorce HEXED  //  build ${buildId}
  multi-layer vm + string cipher + cf flatten
  do not redistribute
]]
return(function(...)
local ${N.env}=getfenv and getfenv()or _ENV
local ${N.loader}=${N.env}["\\108\\111\\97\\100\\115\\116\\114\\105\\110\\103"]or ${N.env}["\\108\\111\\97\\100"]or loadstring or load
local ${N.key}=${keyArr}
local ${N.pool}={${chunkTables}}
local ${N.mask}=${opmask}
local ${N.chk}=${checksum}
local ${N.const}=${arr(fakeBc)}
local ${N.ops}={
[${op_loadk}]=1,[${op_call}]=2,[${op_ret}]=3,[${op_jmp}]=4
}
local function ${N.decode}()
  local ${N.buf}={}
  local ${N.x}=1
  for ${N.y}=1,#${N.pool} do
    local ${N.z}=${N.pool}[${N.y}]
    for ${N.pc}=1,#${N.z} do
      local ${N.R}=${N.z}[${N.pc}]
      local _a=${N.R};local _b=${N.key}[((${N.x}-1)%#${N.key})+1];local _r=0;local _p=1;local _aa,_bb;for _i=0,7 do _aa=_a%2;_bb=_b%2;if _aa~=_bb then _r=_r+_p end;_a=(_a-_aa)/2;_b=(_b-_bb)/2;_p=_p*2 end;${N.buf}[${N.x}]=string.char(_r)
      ${N.x}=${N.x}+1
    end
  end
  return table.concat(${N.buf})
end
local function ${N.chk}()
  local n=0
  for i=1,#${N.pool} do n=n+#${N.pool}[i] end
  local c=((n*31)+(${N.key}[1]*17)+${N.mask})%4294967296
  if c~=${checksum} then
    while ${op_true} do end
  end
  return true
end
local function ${N.dispatch}(${N.state})
  while true do
    if ${N.state}==${s0} then
      if not ${N.chk}() then return end
      ${N.state}=${s1}
    elseif ${N.state}==${s1} then
      local ${N.inner}=${N.decode}()
      local ${N.wrap}=${N.loader}(${N.inner}, "emorce://hexed/${buildId}")
      if not ${N.wrap} then
        ${N.state}=${s3}
      else
        ${N.state}=${s2}
        return ${N.wrap}(...)
      end
    elseif ${N.state}==${s2} then
      return
    elseif ${N.state}==${s3} then
      error("hexed: loader rejected payload", 0)
    else
      ${N.state}=${s0}
    end
    if ${op_false} then ${N.state}=${s3} end
  end
end
local function ${N.vm}()
  local ${N.R}={}
  local ${N.pc}=1
  local ${N.K}=${N.const}
  while ${N.pc}<=#${N.K} do
    local ins=${N.K}[${N.pc}]
    local op=(ins+${N.mask})%251
    if ${N.ops}[op]==1 then
      ${N.R}[1]=ins
    elseif ${N.ops}[op]==3 then
      break
    end
    ${N.pc}=${N.pc}+1
    if ${op_false} then break end
  end
end
${N.vm}()
return ${N.dispatch}(${s0})
end)(...)
`;
}

module.exports = { obfuscate };

if (require.main === module) {
  const fs = require('fs');
  const src = fs.readFileSync(process.argv[2] || '/dev/stdin', 'utf8');
  process.stdout.write(obfuscate(src));
}
