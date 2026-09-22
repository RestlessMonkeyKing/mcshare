// ─── mcshare ────────────────────────────────────────────────
// Rules: codes live 1 hour · max 10 posts/hour · only the sender
// can delete their own code (owner token). No copy button.
// Works offline (localStorage). Goes live with supabase-config.js.

const ICONS = [
  { id: 'steve', name: 'Steve', img: 'Icons/Steve.png' },
  { id: 'alex', name: 'Alex', img: 'Icons/Alex.png' },
  { id: 'agent', name: 'Agent', img: 'Icons/Agent.png' },
  { id: 'llama', name: 'Llama', img: 'Icons/LLama.png' },
  { id: 'panda', name: 'Panda', img: 'Icons/Panda.png' },
  { id: 'apple', name: 'Apple', img: 'Icons/Apple.png' },
  { id: 'book', name: 'Book & Quill', img: 'Icons/Book & Quill.png' },
  { id: 'cake', name: 'Cake', img: 'Icons/Cake.png' },
  { id: 'cookie', name: 'Cookie', img: 'Icons/Cookie.png' },
  { id: 'map', name: 'Map', img: 'Icons/Map.png' },
  { id: 'pickaxe', name: 'Pickaxe', img: 'Icons/Pickaxe.png' },
  { id: 'sign', name: 'Sign', img: 'Icons/Sign.png' },
  { id: 'bucket', name: 'Water Bucket', img: 'Icons/Water Bucket.png' },
  { id: 'balloon', name: 'Balloon', img: 'Icons/Balloon.png' },
  { id: 'carrot', name: 'Carrot', img: 'Icons/Carrot.png' },
  { id: 'fish', name: 'Fish', img: 'Icons/Fish.png' },
  { id: 'ladder', name: 'Ladder', img: 'Icons/Ladder.png' },
  { id: 'potion', name: 'Potion', img: 'Icons/Potion.png' },
];
const byId = (id) => ICONS.find((i) => i.id === id);
const ALLOWED = new Set(ICONS.map((i) => i.id));

const HOUR_MS = 3600 * 1000;
const MAX_PER_HOUR = 10;

// ─── Identity: one secret per browser. Only matching token can delete. ───
const OWNER_KEY = 'mcshare_owner';
const STORE_KEY = 'mcshare_v3';
const TIMES_KEY = 'mcshare_post_times';
function getOwner() {
  let t = null;
  try { t = localStorage.getItem(OWNER_KEY); } catch {}
  if (!t) {
    t = (crypto.randomUUID ? crypto.randomUUID() : 'o' + Date.now() + Math.random().toString(16).slice(2));
    try { localStorage.setItem(OWNER_KEY, t); } catch {}
  }
  return t;
}
const OWNER = getOwner();

// ─── Supabase ───
const CFG = window.MCSHARE_CONFIG || window.BLOCKCODES_CONFIG || {};
const hasKeys =
  CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY &&
  !CFG.SUPABASE_URL.includes('PASTE') && !CFG.SUPABASE_ANON_KEY.includes('PASTE');
let sb = null;
if (hasKeys && window.supabase) {
  sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
}
const statusPill = document.getElementById('statusPill');
function setStatus(live) {
  statusPill.textContent = live ? '● Live' : '● Local mode';
  statusPill.classList.toggle('live', live);
}
setStatus(!!sb);

// ─── Elements / state ───
let activeSlot = 0;
let picked = [null, null, null, null];
let allCodes = [];

const slotsEl = document.getElementById('slots');
const paletteEl = document.getElementById('palette');
const gridEl = document.getElementById('grid');
const titleInput = document.getElementById('titleInput');
const charCount = document.getElementById('charCount');
const msgEl = document.getElementById('msg');
const quotaEl = document.getElementById('quota');
const searchEl = document.getElementById('search');
const dotsEl = document.getElementById('dots');
const countBadge = document.getElementById('countBadge');
const toastEl = document.getElementById('toast');
const confettiEl = document.getElementById('confetti');
const shareBtn = document.getElementById('shareBtn');

let toastTimer;
function toast(text) {
  toastEl.textContent = text;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}
function say(text, isErr = false) {
  msgEl.textContent = text;
  msgEl.classList.toggle('err', isErr);
  if (!isErr) setTimeout(() => { if (msgEl.textContent === text) msgEl.textContent = ''; }, 2600);
}
function boom() {
  const colors = ['#5cbb3a', '#ffbf2a', '#ff7ab8', '#6ecbff', '#fff8e7'];
  for (let k = 0; k < 46; k++) {
    const p = document.createElement('i');
    p.style.left = 20 + Math.random() * 60 + 'vw';
    p.style.background = colors[k % colors.length];
    p.style.animationDuration = 1.1 + Math.random() * 1.4 + 's';
    confettiEl.appendChild(p);
    setTimeout(() => p.remove(), 2600);
  }
}

// ─── Picker ───
ICONS.forEach((icon) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'icon-btn';
  b.title = icon.name;
  b.dataset.id = icon.id;
  b.innerHTML = `<img src="${icon.img}" alt="${icon.name}" loading="lazy" /><span class="n">${icon.name}</span>`;
  b.onclick = () => {
    picked[activeSlot] = icon.id;
    activeSlot = Math.min(3, activeSlot + 1);
    if (navigator.vibrate) navigator.vibrate(8);
    renderSlots();
  };
  paletteEl.appendChild(b);
});
function renderSlots() {
  [...slotsEl.children].forEach((btn, i) => {
    btn.classList.toggle('active', i === activeSlot);
    const ic = picked[i] ? byId(picked[i]) : null;
    btn.classList.toggle('filled', !!ic);
    btn.innerHTML = ic ? `<img src="${ic.img}" alt="${ic.name}" title="${ic.name}" />` : '<span>?</span>';
    btn.onclick = () => { activeSlot = i; renderSlots(); };
  });
  const n = picked.filter(Boolean).length;
  [...dotsEl.children].forEach((d, i) => d.classList.toggle('on', i < n));
  [...paletteEl.children].forEach((b) => b.classList.toggle('picked', picked.includes(b.dataset.id)));
}
renderSlots();
titleInput.addEventListener('input', () => { charCount.textContent = `${titleInput.value.length}/60`; });
document.getElementById('randomBtn').onclick = () => {
  const pool = [...ALLOWED];
  picked = [0, 1, 2, 3].map(() => pool[Math.floor(Math.random() * pool.length)]);
  activeSlot = 0;
  renderSlots();
  toast('🎲 Random combo!');
};
document.getElementById('clearBtn').onclick = () => {
  picked = [null, null, null, null];
  activeSlot = 0;
  renderSlots();
};

// ─── Storage ───
const nowISO = () => new Date().toISOString();
const in1hISO = () => new Date(Date.now() + HOUR_MS).toISOString();
const isExpired = (c) => c.expires_at && new Date(c.expires_at).getTime() <= Date.now();

function readLocal() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      return JSON.parse(raw)
        .filter((c) => c.code?.every((id) => ALLOWED.has(id)))
        .filter((c) => !isExpired(c));
    }
  } catch {}
  return [];
}
function writeLocal(codes) { try { localStorage.setItem(STORE_KEY, JSON.stringify(codes)); } catch {} }

function recentPostTimes() {
  try {
    const arr = JSON.parse(localStorage.getItem(TIMES_KEY) || '[]');
    const fresh = arr.filter((t) => Date.now() - t < HOUR_MS);
    localStorage.setItem(TIMES_KEY, JSON.stringify(fresh));
    return fresh;
  } catch { return []; }
}
function recordPostTime() {
  const arr = recentPostTimes();
  arr.push(Date.now());
  try { localStorage.setItem(TIMES_KEY, JSON.stringify(arr)); } catch {}
}
function updateQuotaUI(leftOverride) {
  const left = leftOverride ?? Math.max(0, MAX_PER_HOUR - recentPostTimes().length);
  quotaEl.textContent = `⏳ Codes expire in 1h · ${left}/${MAX_PER_HOUR} posts left this hour`;
}

function rowToCode(r) {
  return {
    id: r.id,
    title: r.title,
    code: [r.slot1, r.slot2, r.slot3, r.slot4],
    owner_token: r.owner_token || null,
    created_at: r.created_at,
    expires_at: r.expires_at,
  };
}

async function fetchCodes() {
  gridLoading();
  if (sb) {
    const { data, error } = await sb.from('codes')
      .select('*').gte('expires_at', nowISO())
      .order('created_at', { ascending: false }).limit(100);
    if (error) { console.warn(error); setStatus(false); allCodes = readLocal(); }
    else {
      setStatus(true);
      allCodes = (data || []).map(rowToCode).filter((c) => c.code.every((id) => ALLOWED.has(id)));
    }
  } else {
    allCodes = readLocal();
  }
  updateQuotaUI();
  renderGrid(searchEl.value);
}

async function myPostsThisHour() {
  if (!sb) return recentPostTimes().length;
  const hourAgo = new Date(Date.now() - HOUR_MS).toISOString();
  const { count, error } = await sb.from('codes')
    .select('id', { count: 'exact', head: true })
    .eq('owner_token', OWNER).gte('created_at', hourAgo);
  if (error) { console.warn(error); return recentPostTimes().length; }
  return count || 0;
}

async function addCode(title, code) {
  // client-side rate limit (server trigger backs it up)
  if ((await myPostsThisHour()) >= MAX_PER_HOUR) {
    throw new Error(`Slow down! Max ${MAX_PER_HOUR} codes per hour.`);
  }
  if (sb) {
    const { data, error } = await sb.from('codes').insert({
      title, slot1: code[0], slot2: code[1], slot3: code[2], slot4: code[3],
      owner_token: OWNER, expires_at: in1hISO(),
    }).select().single();
    if (error) throw error;
    allCodes.unshift(rowToCode(data));
  } else {
    allCodes.unshift({ id: 'c' + Date.now(), title, code: [...code], owner_token: OWNER, created_at: nowISO(), expires_at: in1hISO() });
    writeLocal(allCodes);
  }
  recordPostTime();
}

// Owner-only delete: secure RPC on Supabase, token match locally.
async function removeCode(c) {
  if (c.owner_token && c.owner_token !== OWNER) throw new Error('Not yours');
  if (sb) {
    const { data, error } = await sb.rpc('delete_my_code', { p_id: c.id, p_token: OWNER });
    if (error) throw error;
    if (data !== true) throw new Error('Not yours or already gone');
    allCodes = allCodes.filter((x) => String(x.id) !== String(c.id));
  } else {
    allCodes = allCodes.filter((x) => x.id !== c.id);
    writeLocal(allCodes);
  }
}

// ─── Grid (no copy button) ───
function gridLoading() {
  gridEl.innerHTML = '<div class="skel"></div><div class="skel"></div><div class="skel"></div>';
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
function expiryLabel(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  const m = Math.floor(ms / 60000);
  if (m < 1) return '<1m left';
  if (m < 60) return `${m}m left`;
  return `${Math.floor(m / 60)}h ${m % 60}m left`;
}

function renderGrid(filter = '') {
  allCodes = allCodes.filter((c) => !isExpired(c));
  const f = filter.trim().toLowerCase();
  const list = allCodes.filter((c) =>
    !f || c.title.toLowerCase().includes(f) ||
    c.code.map((id) => byId(id)?.name.toLowerCase()).join(' ').includes(f));
  countBadge.textContent = `${allCodes.length} live`;
  gridEl.innerHTML = '';
  if (!list.length) {
    gridEl.innerHTML = `<div class="empty"><img src="Icons/Map.png" alt="map" /><p>No live codes right now.<br>Post one above — it lasts 1 hour ↑</p></div>`;
    return;
  }
  list.forEach((c, idx) => {
    const mine = !c.owner_token || c.owner_token === OWNER;
    const div = document.createElement('div');
    div.className = 'code-card' + (mine ? ' mine' : '');
    div.style.setProperty('--i', idx);
    const boxes = c.code.map((id) => {
      const ic = byId(id);
      return ic ? `<div class="box" title="${ic.name}"><img src="${ic.img}" alt="${ic.name}" loading="lazy" /></div>` : '';
    }).join('');
    div.innerHTML = `<div class="meta"><h3>${escapeHtml(c.title)}</h3>${mine ? '<span class="mine-tag">yours</span>' : ''}</div>
      <div class="boxes">${boxes}</div>
      <div class="foot"><span class="expiry">⏳ ${expiryLabel(c.expires_at)}</span>${mine ? '<button class="del" title="Delete your code">Take down ✕</button>' : ''}</div>`;
    if (mine) {
      div.querySelector('.del').onclick = async () => {
        if (!confirm(`Take down "${c.title}"?`)) return;
        try { await removeCode(c); updateQuotaUI(); renderGrid(searchEl.value); toast('Taken down'); }
        catch (e) { toast(e.message || 'Delete failed'); }
      };
    }
    gridEl.appendChild(div);
  });
}

shareBtn.onclick = async () => {
  if (picked.some((p) => !p)) { say('Pick all 4 icons first!', true); return; }
  const title = (titleInput.value.trim() || 'Untitled World').slice(0, 60);
  shareBtn.disabled = true;
  try {
    await addCode(title, [...picked]);
    picked = [null, null, null, null];
    activeSlot = 0;
    titleInput.value = '';
    charCount.textContent = '0/60';
    renderSlots();
    updateQuotaUI();
    renderGrid(searchEl.value);
    say('Posted! Live for 1 hour 🎉');
    boom();
    toast('Code shared for 1 hour!');
    document.getElementById('live').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    say(e.message || 'Could not post.', true);
  } finally {
    shareBtn.disabled = false;
  }
};

searchEl.oninput = () => renderGrid(searchEl.value);

// tick: refresh countdowns + drop expired (every 30s)
setInterval(() => renderGrid(searchEl.value), 30000);
fetchCodes();
