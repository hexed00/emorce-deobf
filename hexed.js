/**
 * Emorce HEXED v2 — hardened Lua obfuscator
 * Compatible with Synapse/Script-Ware/Fluxus-style executors (loadstring).
 */
const crypto = require('crypto');

function seedFrom(s) {
  return crypto.createHash('sha256').update(s).digest().readUInt32BE(0);
}
function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function rndName(rng, n) {
  n = n || 8;
  const alphabet = 'Il1O0_';
  let s = 'IlO_'[Math.floor(rng() * 4)];
  for (let i = 1; i < n; i++) s += alphabet[Math.floor(rng() * alphabet.length)];
  return s;
}
function xorBytes(data, key) {
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) out[i] = data[i] ^ key[i % key.length];
  return out;
}
function arr(xs) {
  return '{' + xs.join(',') + '}';
}

function obfuscate(source, opts) {
  opts = opts || {};
  if (!source || !String(source).trim()) throw new Error('empty source');
  source = String(source).replace(/^\uFEFF/, '');

  const buildId =
    opts.buildId ||
    crypto.createHash('sha1').update(source).digest('hex').slice(0, 10);
  const rng = mulberry32(seedFrom(buildId + '|emorce-hexed-v2'));

  const key = Buffer.from(
    Array.from({ length: 32 }, () => 1 + Math.floor(rng() * 255))
  );
  const opmask = 1 + Math.floor(rng() * 200);
  const plain = Buffer.from(source, 'utf8');
  const payload = xorBytes(plain, key);

  const chunk = 48;
  const chunks = [];
  for (let i = 0; i < payload.length; i += chunk) {
    chunks.push([...payload.slice(i, i + chunk)]);
  }

  const N = {};
  for (const k of [
    'vm', 'ops', 'K', 'R', 'pc', 'decode', 'key', 'buf', 'chk', 'env',
    'loader', 'x', 'y', 'z', 'state', 'dispatch', 'const', 'pool',
    'mask', 'inner', 'wrap', 'bxor', 'run'
  ]) {
    N[k] = rndName(rng, 7 + Math.floor(rng() * 5));
  }

  const checksum = (payload.length * 31 + key[0] * 17 + opmask) >>> 0;
  const keyArr = arr([...key]);
  const chunkTables = chunks.map(arr).join(',');
  const fakeBc = Array.from(
    { length: 96 + Math.floor(rng() * 64) },
    () => Math.floor(rng() * 256)
  );

  const states = [0, 1, 2, 3, 4, 5, 6, 7].sort(() => rng() - 0.5);
  const [s0, s1, s2, s3] = states;
  const ot = 2 + Math.floor(rng() * 7);
  const of = 2 + Math.floor(rng() * 7);
  const op_true = `(function(${N.x})return(${N.x}*${N.x}>=0)end)(${ot})`;
  const op_false = `(function(${N.x})return(${N.x}*${N.x}<0)end)(${of})`;
  const op_loadk = 10 ^ opmask;
  const op_call = 20 ^ opmask;
  const op_ret = 30 ^ opmask;
  const op_jmp = 40 ^ opmask;

  const bxorFn = `local function ${N.bxor}(a,b)local r,p=0,1 for i=0,7 do local aa=a%2 local bb=b%2 if aa~=bb then r=r+p end a=(a-aa)/2 b=(b-bb)/2 p=p*2 end return r end`;

  const code = `--[[ Emorce HEXED v2 // build ${buildId} ]]
local ${N.env}=(getfenv and getfenv())or _ENV or _G
local ${N.loader}=(type(loadstring)=="function" and loadstring)or(type(load)=="function" and load)or(${N.env} and (${N.env}.loadstring or ${N.env}.load))
if not ${N.loader} then error("HEXED: no loadstring/load in this environment",0) end
local ${N.key}=${keyArr}
local ${N.pool}={${chunkTables}}
local ${N.mask}=${opmask}
local ${N.const}=${arr(fakeBc)}
local ${N.ops}={[${op_loadk}]=1,[${op_call}]=2,[${op_ret}]=3,[${op_jmp}]=4}
${bxorFn}
local function ${N.decode}()
  local ${N.buf}={}
  local ${N.x}=1
  for ${N.y}=1,#${N.pool} do
    local ${N.z}=${N.pool}[${N.y}]
    for ${N.pc}=1,#${N.z} do
      local ${N.R}=${N.z}[${N.pc}]
      ${N.buf}[${N.x}]=string.char(${N.bxor}(${N.R},${N.key}[((${N.x}-1)%#${N.key})+1]))
      ${N.x}=${N.x}+1
    end
  end
  return table.concat(${N.buf})
end
local function ${N.chk}()
  local n=0
  for i=1,#${N.pool} do n=n+#${N.pool}[i] end
  local c=((n*31)+(${N.key}[1]*17)+${N.mask})%4294967296
  if c~=${checksum} then while ${op_true} do end end
  return true
end
local function ${N.vm}()
  local ${N.R}, ${N.pc}, ${N.K}={},1,${N.const}
  while ${N.pc}<=#${N.K} do
    local ins=${N.K}[${N.pc}]
    local op=(ins+${N.mask})%251
    if ${N.ops}[op]==3 then break end
    ${N.pc}=${N.pc}+1
    if ${op_false} then break end
  end
end
${N.vm}()
if not ${N.chk}() then return end
local ${N.inner}=${N.decode}()
local ${N.wrap}=${N.loader}(${N.inner},"=@EmorceHEXED/${buildId}")
if not ${N.wrap} then error("HEXED: compile failed",0) end
return ${N.wrap}()
`;

  return code;
}

module.exports = { obfuscate };

if (require.main === module) {
  const fs = require('fs');
  const src = fs.readFileSync(process.argv[2] || '/dev/stdin', 'utf8');
  process.stdout.write(obfuscate(src));
}
