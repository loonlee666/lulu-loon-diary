/* ═══════════════════════════════════════════════════════════
   Lulu & Loon's Travel Diary — App JS
   ═══════════════════════════════════════════════════════════ */

const CONFIG = {
  passwords: {
    'lulu2025':   { name:'Lulu', role:'user',  avatar:'🌸' },
    'loon2025':   { name:'Loon', role:'user',  avatar:'🐦' },
    'loon-admin': { name:'Loon', role:'admin', avatar:'🐦' },
  },
  maxImageSize: 800,
  imageQuality: 0.75,
};

let state = { user:null, trips:[], currentTrip:null, currentDay:'D1', adminTrip:null };

function db()  { return window._db; }
function stor(){ return window._storage; }
const F = () => window._firebase;
function col(p)     { return F().collection(db(), p); }
function docRef(p,i){ return F().doc(db(), p, i); }

function init() {
  if (window.firebaseReady) loadTrips();
  else window._onFirebaseReady = loadTrips;
  document.getElementById('pw-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') checkPassword();
  });
}

function checkPassword() {
  const pw = document.getElementById('pw-input').value.trim();
  const user = CONFIG.passwords[pw];
  if (user) {
    state.user = user;
    const gate = document.getElementById('gate');
    gate.style.opacity = '0'; gate.style.transition = 'opacity .4s';
    setTimeout(() => { gate.classList.add('hidden'); document.getElementById('app').classList.remove('hidden'); }, 400);
    document.getElementById('user-name-display').textContent = `${user.avatar} ${user.name}`;
    if (user.role === 'admin') document.getElementById('admin-nav-btn').classList.remove('hidden');
    showToast(`歡迎回來，${user.name}！✨`);
    loadTrips();
  } else {
    document.getElementById('pw-error').textContent = '密碼不對哦，再試試 🔐';
    document.getElementById('pw-input').value = '';
    document.getElementById('pw-input').focus();
  }
}
function logout() {
  state.user = null;
  const gate = document.getElementById('gate');
  gate.classList.remove('hidden'); gate.style.opacity = '1';
  document.getElementById('app').classList.add('hidden');
  document.getElementById('admin-nav-btn').classList.add('hidden');
  document.getElementById('pw-input').value = '';
  document.getElementById('pw-error').textContent = '';
}

function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active'));
  document.getElementById(`page-${name}`).classList.remove('hidden');
  const btn = [...document.querySelectorAll('.nav-link')].find(b => b.getAttribute('onclick') === `showPage('${name}')`);
  if (btn) btn.classList.add('active');
  window.scrollTo(0, 0);
}

function showToast(msg, dur = 2500) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), dur);
}
function openModal(html) {
  document.getElementById('modal-content').innerHTML = html;
  document.getElementById('modal-overlay').classList.remove('hidden');
}
function closeModal() { document.getElementById('modal-overlay').classList.add('hidden'); }

function compressImage(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height, max = CONFIG.maxImageSize;
        if (w > max || h > max) { if (w > h) { h = Math.round(h*max/w); w = max; } else { w = Math.round(w*max/h); h = max; } }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        canvas.toBlob(blob => resolve(blob), 'image/jpeg', CONFIG.imageQuality);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function loadTrips() {
  if (!db()) { useFallbackData(); return; }
  try {
    const snap = await F().getDocs(col('trips'));
    state.trips = [];
    snap.forEach(d => state.trips.push({ id:d.id, ...d.data() }));
    if (!state.trips.length) await seedDefaultTrips();
    renderHome(); renderAllTrips(); renderAdminTripList(); updateStats();
  } catch(e) { console.warn('Firestore 未連接', e); useFallbackData(); }
}
async function seedDefaultTrips() {
  const defaults = [
    { name:'首爾之旅', dates:'7/15 – 7/20', emoji:'🇰🇷', desc:'七月的首爾，Lulu 生日遠征。弘大根據地出發，韓服景福宮到聖水洞，每天都是驚喜。', days:['D1','D2','D3','D4','D5','D6'], coverUrl:'', createdAt:new Date() },
    { name:'馬來西亞婚禮之旅', dates:'9/23 – 9/29', emoji:'🇲🇾', desc:'參加婚禮，也是我們的小旅行。吉隆坡的熱帶風情，最美好的見證。', days:['D1','D2','D3','D4','D5','D6','D7'], coverUrl:'', createdAt:new Date() },
  ];
  for (const t of defaults) { const r = await F().addDoc(col('trips'), t); state.trips.push({ id:r.id, ...t }); }
}
function useFallbackData() {
  state.trips = [
    { id:'seoul',    name:'首爾之旅',       dates:'7/15 – 7/20', emoji:'🇰🇷', desc:'七月的首爾，Lulu 生日遠征。弘大根據地出發，韓服景福宮到聖水洞，每天都是驚喜。', days:['D1','D2','D3','D4','D5','D6'] },
    { id:'malaysia', name:'馬來西亞婚禮之旅', dates:'9/23 – 9/29', emoji:'🇲🇾', desc:'參加婚禮，也是我們的小旅行。吉隆坡的熱帶風情，最美好的見證。', days:['D1','D2','D3','D4','D5','D6','D7'] },
  ];
  renderHome(); renderAllTrips(); renderAdminTripList();
}

function renderHome() {
  document.getElementById('home-trip-grid').innerHTML = state.trips.slice(0,4).map(tripCardHTML).join('');
}
function renderAllTrips() {
  const g = document.getElementById('all-trip-grid');
  if (!g) return;
  g.innerHTML = state.trips.length ? state.trips.map(tripCardHTML).join('')
    : `<div class="empty-state"><div class="empty-state-icon">✈️</div><p>還沒有旅行記錄</p></div>`;
}
function tripCardHTML(t) {
  return `<div class="trip-card" onclick="openTrip('${t.id}')">
    <div class="trip-card-cover">${t.coverUrl?`<img src="${t.coverUrl}" alt="${t.name}"/>`:''}
      <span class="trip-card-cover-emoji">${t.emoji||'✈️'}</span></div>
    <div class="trip-card-body">
      <div class="trip-card-name">${t.name}</div>
      <div class="trip-card-dates">${t.dates||''}</div>
      <div class="trip-card-desc">${t.desc||''}</div>
    </div></div>`;
}
async function updateStats() {
  document.getElementById('stat-trips').textContent = state.trips.length;
  if (!db()) return;
  let n = 0;
  for (const t of state.trips) { try { const s = await F().getDocs(col(`trips/${t.id}/spots`)); n += s.size; } catch(e){} }
  document.getElementById('stat-spots').textContent = n;
}

async function openTrip(tripId) {
  const trip = state.trips.find(t => t.id === tripId);
  if (!trip) return;
  state.currentTrip = trip; state.currentDay = 'D1';
  showPage('trip-detail');
  const isSeoul = (tripId === 'seoul' || (trip.emoji === '🇰🇷' && trip.days?.includes('D1')));
  if (isSeoul && typeof SEOUL_DATA !== 'undefined') renderSeoulDetail(trip);
  else renderTripDetail(trip);
}

// ── SEOUL DETAIL ──────────────────────────────────────────
function renderSeoulDetail(trip) {
  const el = document.getElementById('trip-detail-content');
  const d = SEOUL_DATA;
  const fi = d.flightInfo, ac = d.accommodation;
  const days = Object.keys(d.dayData);

  el.innerHTML = `
    <div class="trip-detail-hero">
      <button class="back-btn" onclick="showPage('trips')">← 返回</button>
      <div class="trip-detail-hero-emoji">${trip.emoji}</div>
      <h1>${trip.name}</h1>
      <div class="trip-dates">${trip.dates}</div>
      <p class="trip-intro">${trip.desc}</p>
    </div>

    <div class="td-info-wrap">
      <div class="td-flight-card">
        <div class="td-flight-title">✈️ 班機資訊</div>
        <div class="td-flight-row">
          <div class="td-flight-seg"><div class="td-airport">TPE</div><div class="td-city">桃園T1</div><div class="td-fmeta">${fi.outbound.depart}</div></div>
          <div class="td-arrow">→</div>
          <div class="td-flight-seg"><div class="td-airport">ICN</div><div class="td-city">仁川T2</div><div class="td-fmeta">${fi.outbound.arrive}</div></div>
        </div>
        <div class="td-fdiv"></div>
        <div class="td-flight-row">
          <div class="td-flight-seg"><div class="td-airport">ICN</div><div class="td-city">仁川T2</div><div class="td-fmeta">${fi.inbound.depart}</div></div>
          <div class="td-arrow">→</div>
          <div class="td-flight-seg"><div class="td-airport">TPE</div><div class="td-city">桃園T1</div><div class="td-fmeta">${fi.inbound.arrive}</div></div>
        </div>
        <div class="td-fwarn">⚠️ ${fi.warning}</div>
      </div>
      <div class="td-stay-card">
        <div class="td-stay-icon">🏠</div>
        <div>
          <strong>${ac.name}</strong>
          <p>${ac.desc}</p>
          <div class="td-stay-price">${ac.price}</div>
          <div class="td-stay-tags">${ac.tags.map(t=>`<span class="td-stay-tag">${t}</span>`).join('')}</div>
        </div>
      </div>
    </div>

    <div class="day-tabs" id="day-tabs">
      ${days.map(d=>`<button class="day-tab ${d===state.currentDay?'active':''}" onclick="filterSeoulDay('${d}')">${d}</button>`).join('')}
    </div>
    <div class="spots-section" id="spots-section"></div>
    <div style="text-align:center;padding:1.5rem 0 3rem">
      <button class="btn-ghost" onclick="showSeoulReview()">✦ 生成旅行回顧</button>
    </div>`;

  renderSeoulDay(state.currentDay);
}

function filterSeoulDay(day) {
  state.currentDay = day;
  document.querySelectorAll('.day-tab').forEach(b => b.classList.toggle('active', b.textContent === day));
  renderSeoulDay(day);
}

function renderSeoulDay(dayKey) {
  const sec = document.getElementById('spots-section');
  const dd = SEOUL_DATA.dayData[dayKey];
  if (!dd || !sec) return;

  let html = `
    <div class="seoul-day-header">
      <div class="seoul-day-emoji">${dd.emoji}</div>
      <div>
        <h2 class="seoul-day-title">${dd.title}</h2>
        <p class="seoul-day-sub">${dd.subtitle}</p>
        <span class="seoul-area-pill">${dd.area}</span>
      </div>
    </div>`;

  if (dd.timeline) {
    html += `<div class="seoul-timeline-card">
      <div class="seoul-timeline-title">⏰ 今日時間軸</div>
      ${dd.timeline.map(t=>`<div class="seoul-timeline-item">${t}</div>`).join('')}
    </div>`;
  }

  const pk = dd.pikmin;
  html += `<div class="pikmin-card">
    <div class="pikmin-card-header">
      <span class="pikmin-flowers">🌿 🌱 🍀</span>
      <strong>${pk.title}</strong>
      <span class="pikmin-estimate">${pk.estimate}</span>
    </div>
    ${pk.tips.map(t=>`<div class="pikmin-tip"><span class="pikmin-tip-icon">${t.icon}</span><span>${t.text}</span></div>`).join('')}
  </div>`;

  for (const section of dd.sections) {
    html += `<div class="spots-category-label">${section.label}</div><div class="spot-list">`;
    for (const spot of section.spots) html += seoulSpotCardHTML(spot);
    html += `</div>`;
  }

  if (dd.alts && dd.alts.length) {
    html += `<div class="alt-section-header"><span>🔀</span><strong>不想去？備選方案</strong><span class="alt-badge">心情切換</span></div>
    <div class="spot-list">${dd.alts.map(a=>seoulAltCardHTML(a)).join('')}</div>`;
  }

  sec.innerHTML = html;

  if (db()) {
    const tid = state.currentTrip?.id || 'seoul';
    const all = dd.sections.flatMap(s=>s.spots).concat(dd.alts||[]);
    all.forEach(s => { loadSpotPhotos(tid,s.id); loadSpotComments(tid,s.id); loadSpotFBState(tid,s.id); });
  }
}

function _tid() { return state.currentTrip?.id || 'seoul'; }

function seoulSpotCardHTML(spot) {
  const icons = { food:'🍜', shop:'🛍', photo:'📸', exp:'✨', beauty:'💆' };

  if (spot.isMedical) return `
    <div class="spot-card medical-card" id="spot-${spot.id}">
      <div class="spot-card-header" onclick="toggleSpot('${spot.id}')">
        <div class="spot-card-left"><div class="spot-icon">💆</div>
          <div><div class="spot-card-name">${spot.name}</div><div class="spot-card-meta">點開查看診所推薦</div></div></div>
        <span id="expand-${spot.id}" style="color:var(--text-lt);font-size:.8rem">▼</span>
      </div>
      <div class="spot-card-body" id="body-${spot.id}">
        ${spot.clinics.map(c=>`<div class="clinic-card"><strong class="clinic-name">${c.name}</strong><p class="clinic-desc">${c.desc}</p><div class="spot-links">${c.links.map(linkHTML).join('')}</div></div>`).join('')}
        ${spot.warn?`<div class="spot-warn">⚠️ ${spot.warn}</div>`:''}
      </div></div>`;

  if (spot.isAirport) return `
    <div class="spot-card airport-card" id="spot-${spot.id}">
      <div class="spot-card-header"><div class="spot-card-left"><div class="spot-icon">✈️</div>
        <div><div class="spot-card-name">${spot.name}</div></div></div></div>
      <div class="spot-card-body open">
        <p class="airport-timeline">${spot.desc.replace(/\n/g,'<br>')}</p>
        <div class="spot-links">${(spot.links||[]).map(linkHTML).join('')}</div>
      </div></div>`;

  const tagsHTML = (spot.tags||[]).map(t=>`<span class="spot-tag spot-tag-${t.c}">${t.t}</span>`).join('');
  const shopsHTML = spot.shops?`<div class="shop-pills">${spot.shops.map(s=>`<a class="shop-pill" href="${s.url}" target="_blank">${s.label}</a>`).join('')}</div>`:'';
  const linksHTML = spot.links?`<div class="spot-links">${spot.links.map(linkHTML).join('')}</div>`:'';

  return `
    <div class="spot-card" id="spot-${spot.id}">
      <div class="spot-card-header" onclick="toggleSpot('${spot.id}')">
        <div class="spot-card-left"><div class="spot-icon">${icons[spot.type]||'📍'}</div>
          <div><div class="spot-card-name">${spot.name}</div><div class="spot-card-meta">${tagsHTML}</div></div></div>
        <div class="spot-card-actions">
          <button class="heart-btn" id="heart-${spot.id}" onclick="event.stopPropagation();toggleHeart(_tid(),'${spot.id}')">🤍</button>
          <span class="heart-count" id="hearts-${spot.id}">0</span>
          <button class="checkin-btn" id="checkin-${spot.id}" onclick="event.stopPropagation();toggleCheckin(_tid(),'${spot.id}')">打卡</button>
        </div>
      </div>
      <div class="spot-card-body" id="body-${spot.id}">
        ${spot.why?`<p class="spot-why">${spot.why}</p>`:''}
        ${spot.desc?`<p class="spot-desc">${spot.desc}</p>`:''}
        ${spot.warn?`<div class="spot-warn">⚠️ ${spot.warn}</div>`:''}
        ${shopsHTML}${linksHTML}
        <div id="diary-wrap-${spot.id}" style="margin:.6rem 0">
          <button class="btn-ghost" style="font-size:.78rem;padding:.3rem .8rem"
            onclick="editDiary(_tid(),'${spot.id}','')">✏️ 寫心得</button>
        </div>
        <div class="photo-grid" id="photos-${spot.id}">
          <label class="photo-upload-label"><span>📷</span><span>上傳照片</span>
            <input type="file" accept="image/*" multiple onchange="uploadPhotos(event,_tid(),'${spot.id}')"/></label>
        </div>
        <div class="comments-section">
          <div class="comments-title">💬 留言</div>
          <div class="comment-list" id="comments-${spot.id}"></div>
          <div class="comment-form">
            <input class="comment-input" id="ci-${spot.id}" placeholder="說點什麼..."/>
            <button class="comment-send" onclick="addComment(_tid(),'${spot.id}')">↑</button>
          </div>
        </div>
      </div>
    </div>`;
}

function seoulAltCardHTML(a) {
  return `
    <div class="spot-card spot-card-alt" id="spot-${a.id}">
      <div class="spot-card-header" onclick="toggleSpot('${a.id}')">
        <div class="spot-card-left"><div class="spot-icon alt-icon">🔖</div>
          <div><div class="spot-card-name">${a.name}</div>
            <div class="spot-card-meta"><span class="spot-tag spot-tag-alt">${a.tag}</span></div></div></div>
        <div class="spot-card-actions">
          <button class="heart-btn" id="heart-${a.id}" onclick="event.stopPropagation();toggleHeart(_tid(),'${a.id}')">🤍</button>
          <span class="heart-count" id="hearts-${a.id}">0</span>
        </div>
      </div>
      <div class="spot-card-body" id="body-${a.id}">
        <p class="spot-why">${a.why}</p>
        <div class="spot-links"><a class="lnk naver" href="${a.link}" target="_blank">🗺 Naver Map</a></div>
        <div class="comments-section" style="margin-top:.6rem">
          <div class="comment-list" id="comments-${a.id}"></div>
          <div class="comment-form">
            <input class="comment-input" id="ci-${a.id}" placeholder="說點什麼..."/>
            <button class="comment-send" onclick="addComment(_tid(),'${a.id}')">↑</button>
          </div>
        </div>
      </div>
    </div>`;
}

function linkHTML(l) { return `<a class="lnk ${l.cls||'web'}" href="${l.url}" target="_blank">${l.label}</a>`; }

// ── GENERIC TRIP DETAIL ───────────────────────────────────
async function renderTripDetail(trip) {
  const el = document.getElementById('trip-detail-content');
  const dayBtns = (trip.days||['D1']).map(d=>
    `<button class="day-tab ${state.currentDay===d?'active':''}" onclick="filterDay('${d}')">${d}</button>`).join('');
  el.innerHTML = `
    <div class="trip-detail-hero">
      <button class="back-btn" onclick="showPage('trips')">← 返回</button>
      <div class="trip-detail-hero-emoji">${trip.emoji||'✈️'}</div>
      <h1>${trip.name}</h1><div class="trip-dates">${trip.dates||''}</div>
      <p class="trip-intro">${trip.desc||''}</p>
    </div>
    <div class="day-tabs" id="day-tabs">
      <button class="day-tab ${state.currentDay==='all'?'active':''}" onclick="filterDay('all')">全部</button>
      ${dayBtns}
    </div>
    <div class="spots-section" id="spots-section"><div class="loading">載入景點中...</div></div>
    <div style="text-align:center;padding:2rem 0 3rem">
      <button class="btn-ghost" onclick="showReview('${trip.id}')">✦ 生成旅行回顧</button>
    </div>`;
  loadSpots(trip.id);
}
function filterDay(day) {
  state.currentDay = day;
  document.querySelectorAll('.day-tab').forEach(b=>b.classList.toggle('active',
    (day==='all'&&b.textContent==='全部')||b.textContent===day));
  loadSpots(state.currentTrip.id);
}

async function loadSpots(tripId) {
  const sec = document.getElementById('spots-section');
  if (!sec||!db()) { if(sec) sec.innerHTML='<div class="empty-state"><div class="empty-state-icon">📍</div><p>Firebase 未連接，設定後景點將自動同步</p></div>'; return; }
  sec.innerHTML='<div class="loading">載入景點中...</div>';
  try {
    const snap = await F().getDocs(col(`trips/${tripId}/spots`));
    let spots=[]; snap.forEach(d=>spots.push({id:d.id,...d.data()}));
    if (state.currentDay!=='all') spots=spots.filter(s=>s.day===state.currentDay);
    spots.sort((a,b)=>(a.order||0)-(b.order||0));
    const cats={spot:{label:'📍 景點',items:[]},food:{label:'🍜 美食',items:[]},'alt-spot':{label:'🔖 備選景點',items:[]},'alt-food':{label:'🔖 備選餐廳',items:[]}};
    spots.forEach(s=>{if(cats[s.type])cats[s.type].items.push(s);});
    let html='';
    for(const[,cat]of Object.entries(cats)){if(!cat.items.length)continue;html+=`<div class="spots-category-label">${cat.label}</div><div class="spot-list">${cat.items.map(s=>genericSpotCardHTML(s,tripId)).join('')}</div>`;}
    if(!html) html='<div class="empty-state"><div class="empty-state-icon">📍</div><p>這天還沒有景點！</p></div>';
    if(state.user?.role==='admin') html+=`<div style="text-align:center;padding:1rem"><button class="btn-ghost" onclick="adminQuickAdd('${tripId}')">+ 快速新增景點</button></div>`;
    sec.innerHTML=html;
    spots.forEach(s=>{loadSpotPhotos(tripId,s.id);loadSpotComments(tripId,s.id);});
  } catch(e){ sec.innerHTML='<div class="empty-state"><p>載入失敗</p></div>'; }
}

function genericSpotCardHTML(s, tripId) {
  const icons={spot:'📍',food:'🍜','alt-spot':'🔖','alt-food':'🔖'};
  return `<div class="spot-card" id="spot-${s.id}">
    <div class="spot-card-header" onclick="toggleSpot('${s.id}')">
      <div class="spot-card-left"><div class="spot-icon">${icons[s.type]||'📍'}</div>
        <div><div class="spot-card-name">${s.name}</div><div class="spot-card-meta">${s.day||''} ${s.addr?'· '+s.addr:''}</div></div></div>
      <div class="spot-card-actions">
        <button class="heart-btn" onclick="event.stopPropagation();toggleHeart('${tripId}','${s.id}')" id="heart-${s.id}">🤍</button>
        <span class="heart-count" id="hearts-${s.id}">${s.hearts||0}</span>
        <button class="checkin-btn ${s.checkedIn?'checked':''}" id="checkin-${s.id}" onclick="event.stopPropagation();toggleCheckin('${tripId}','${s.id}')">${s.checkedIn?'✅ 打卡了':'打卡'}</button>
        ${state.user?.role==='admin'?`<button class="btn-icon" onclick="event.stopPropagation();deleteSpot('${tripId}','${s.id}')">🗑️</button>`:''}
      </div>
    </div>
    <div class="spot-card-body" id="body-${s.id}">
      ${s.note?`<p class="spot-card-note">${s.note}</p>`:''}
      <div id="diary-wrap-${s.id}">${s.diary?`<p class="diary-display">${s.diary}</p><button class="btn-ghost" style="font-size:.78rem;padding:.3rem .8rem;margin-top:.4rem" onclick="editDiary('${tripId}','${s.id}','${escAttr(s.diary||'')}')">✏️ 編輯心得</button>`:`<button class="btn-ghost" style="font-size:.78rem;padding:.3rem .8rem" onclick="editDiary('${tripId}','${s.id}','')">✏️ 寫心得</button>`}</div>
      <div class="photo-grid" id="photos-${s.id}"><label class="photo-upload-label"><span>📷</span><span>上傳照片</span><input type="file" accept="image/*" multiple onchange="uploadPhotos(event,'${tripId}','${s.id}')"/></label></div>
      <div class="comments-section"><div class="comments-title">💬 留言</div><div class="comment-list" id="comments-${s.id}"></div><div class="comment-form"><input class="comment-input" id="ci-${s.id}" placeholder="說點什麼..."/><button class="comment-send" onclick="addComment('${tripId}','${s.id}')">↑</button></div></div>
    </div></div>`;
}

function escAttr(s){ return s.replace(/'/g,"&#39;").replace(/"/g,"&quot;"); }
function toggleSpot(id){ const b=document.getElementById(`body-${id}`); if(b)b.classList.toggle('open'); const i=document.getElementById(`expand-${id}`); if(i)i.textContent=b?.classList.contains('open')?'▲':'▼'; }

async function toggleHeart(tripId, spotId) {
  if(!db()) return showToast('Firebase 未連接，連上後才能愛心 💕');
  const ref=docRef(`trips/${tripId}/spots`,spotId);
  try {
    const snap=await F().getDoc(ref);
    const data=snap.exists()?snap.data():{hearts:0};
    const key=`heart_${state.user?.name}`;
    const already=data[key];
    const newVal=already?Math.max(0,(data.hearts||0)-1):(data.hearts||0)+1;
    if(snap.exists()) await F().updateDoc(ref,{hearts:newVal,[key]:!already});
    else await F().addDoc(col(`trips/${tripId}/spots`),{hearts:newVal,[key]:true});
    const hEl=document.getElementById(`hearts-${spotId}`);
    const bEl=document.getElementById(`heart-${spotId}`);
    if(hEl)hEl.textContent=newVal; if(bEl)bEl.textContent=already?'🤍':'❤️';
  } catch(e){showToast('操作失敗');}
}

async function toggleCheckin(tripId, spotId) {
  if(!db()) return showToast('Firebase 未連接');
  const ref=docRef(`trips/${tripId}/spots`,spotId);
  try {
    const snap=await F().getDoc(ref); const checked=!snap.data()?.checkedIn;
    if(snap.exists()) await F().updateDoc(ref,{checkedIn:checked});
    const btn=document.getElementById(`checkin-${spotId}`);
    if(btn){btn.textContent=checked?'✅ 打卡了':'打卡';btn.classList.toggle('checked',checked);}
    showToast(checked?'✅ 打卡成功！':'打卡取消');
  } catch(e){}
}

async function loadSpotFBState(tripId, spotId) {
  if(!db()) return;
  try {
    const snap=await F().getDoc(docRef(`trips/${tripId}/spots`,spotId));
    if(!snap.exists()) return;
    const data=snap.data(), key=`heart_${state.user?.name}`;
    const hEl=document.getElementById(`hearts-${spotId}`);
    const bEl=document.getElementById(`heart-${spotId}`);
    const cEl=document.getElementById(`checkin-${spotId}`);
    if(hEl)hEl.textContent=data.hearts||0;
    if(bEl)bEl.textContent=data[key]?'❤️':'🤍';
    if(cEl){cEl.textContent=data.checkedIn?'✅ 打卡了':'打卡';cEl.classList.toggle('checked',!!data.checkedIn);}
    if(data.diary){const dw=document.getElementById(`diary-wrap-${spotId}`);if(dw)dw.innerHTML=`<p class="diary-display">${data.diary}</p><button class="btn-ghost" style="font-size:.78rem;padding:.3rem .8rem;margin-top:.4rem" onclick="editDiary('${tripId}','${spotId}','${escAttr(data.diary)}')">✏️ 編輯心得</button>`;}
  } catch(e){}
}

function editDiary(tripId, spotId, current) {
  openModal(`<h3 style="font-family:var(--ff-display);font-size:1.3rem;color:var(--brown);margin-bottom:1rem">✏️ 寫下心得</h3>
    <textarea class="diary-textarea" id="diary-input" placeholder="記錄這個地方給你的感受...">${current}</textarea>
    <div style="display:flex;gap:.6rem;margin-top:.8rem">
      <button class="btn-primary" onclick="saveDiary('${tripId}','${spotId}')">儲存</button>
      <button class="btn-ghost" onclick="closeModal()">取消</button>
    </div>`);
}
async function saveDiary(tripId, spotId) {
  const text=document.getElementById('diary-input').value.trim();
  if(!db()) return showToast('Firebase 未連接');
  const ref=docRef(`trips/${tripId}/spots`,spotId);
  try { if((await F().getDoc(ref)).exists()) await F().updateDoc(ref,{diary:text}); } catch(e){}
  closeModal(); showToast('心得已儲存 💕');
  const dw=document.getElementById(`diary-wrap-${spotId}`);
  if(dw&&text) dw.innerHTML=`<p class="diary-display">${text}</p><button class="btn-ghost" style="font-size:.78rem;padding:.3rem .8rem;margin-top:.4rem" onclick="editDiary('${tripId}','${spotId}','${escAttr(text)}')">✏️ 編輯心得</button>`;
}

async function uploadPhotos(event, tripId, spotId) {
  const files=Array.from(event.target.files);
  if(!files.length||!stor()) return showToast('Firebase Storage 未連接');
  showToast('上傳中... 📷');
  for(const file of files){
    try{
      const blob=await compressImage(file);
      const path=`trips/${tripId}/spots/${spotId}/${Date.now()}_${file.name}`;
      const{ref:sR,uploadBytes,getDownloadURL}=await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js');
      const sr=sR(stor(),path); await uploadBytes(sr,blob);
      const url=await getDownloadURL(sr);
      await F().addDoc(col(`trips/${tripId}/spots/${spotId}/photos`),{url,createdAt:F().serverTimestamp()});
    }catch(e){showToast('上傳失敗 😥');}
  }
  showToast('照片上傳成功！🌟'); loadSpotPhotos(tripId,spotId);
}
async function loadSpotPhotos(tripId, spotId) {
  const grid=document.getElementById(`photos-${spotId}`);
  if(!grid||!db()) return;
  try {
    const snap=await F().getDocs(col(`trips/${tripId}/spots/${spotId}/photos`));
    const label=grid.querySelector('.photo-upload-label');
    grid.querySelectorAll('.photo-thumb').forEach(el=>el.remove());
    snap.forEach(d=>{const{url}=d.data();const th=document.createElement('div');th.className='photo-thumb';th.innerHTML=`<img src="${url}" loading="lazy" onclick="openModal('<img src=\\'${url}\\' style=\\'width:100%\\'>')"/>`;grid.insertBefore(th,label);});
  } catch(e){}
}
async function loadSpotComments(tripId, spotId) {
  const list=document.getElementById(`comments-${spotId}`);
  if(!list||!db()) return;
  try {
    const q=F().query(col(`trips/${tripId}/spots/${spotId}/comments`),F().orderBy('createdAt','asc'));
    F().onSnapshot(q,snap=>{list.innerHTML='';snap.forEach(d=>{const c=d.data();list.innerHTML+=`<div class="comment-item"><div class="comment-avatar">${c.avatar||'🌸'}</div><div class="comment-bubble"><div class="comment-author">${c.author||'Guest'}</div><div class="comment-text">${c.text}</div><div class="comment-time">${formatTime(c.createdAt)}</div></div></div>`;});});
  } catch(e){}
}
async function addComment(tripId, spotId) {
  const input=document.getElementById(`ci-${spotId}`);
  const text=input?.value.trim();
  if(!text||!db()||!state.user) return;
  await F().addDoc(col(`trips/${tripId}/spots/${spotId}/comments`),{text,author:state.user.name,avatar:state.user.avatar,createdAt:F().serverTimestamp()});
  input.value='';
}
function formatTime(ts){ if(!ts) return ''; try{const d=ts.toDate?ts.toDate():new Date(ts);return d.toLocaleDateString('zh-TW',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});}catch{return '';} }

// ── ADMIN ─────────────────────────────────────────────────
async function addTrip() {
  const name=document.getElementById('new-trip-name').value.trim();
  const dates=document.getElementById('new-trip-dates').value.trim();
  const emoji=document.getElementById('new-trip-emoji').value.trim();
  const desc=document.getElementById('new-trip-desc').value.trim();
  if(!name) return showToast('請輸入旅行名稱');
  if(!db()) return showToast('Firebase 未連接');
  await F().addDoc(col('trips'),{name,dates,emoji,desc,coverUrl:'',days:[],createdAt:F().serverTimestamp()});
  showToast(`✅ 旅行「${name}」已新增！`);
  ['new-trip-name','new-trip-dates','new-trip-emoji','new-trip-desc'].forEach(id=>{document.getElementById(id).value='';});
  await loadTrips();
}
async function deleteTrip(tripId){ if(!confirm('確定要刪除？')) return; await F().deleteDoc(docRef('trips',tripId)); showToast('已刪除'); await loadTrips(); }
function selectTripForAdmin(tripId,tripName){ state.adminTrip=tripId; document.getElementById('admin-selected-trip').textContent=tripName; document.getElementById('admin-spot-section').classList.remove('hidden'); document.getElementById('admin-spot-section').scrollIntoView({behavior:'smooth'}); }
async function addSpot() {
  if(!state.adminTrip) return showToast('請先選擇行程');
  const name=document.getElementById('new-spot-name').value.trim();
  const type=document.getElementById('new-spot-type').value;
  const day=document.getElementById('new-spot-day').value.trim();
  const addr=document.getElementById('new-spot-addr').value.trim();
  const note=document.getElementById('new-spot-note').value.trim();
  if(!name) return showToast('請輸入景點名稱');
  await F().addDoc(col(`trips/${state.adminTrip}/spots`),{name,type,day,addr,note,hearts:0,checkedIn:false,diary:'',createdAt:F().serverTimestamp()});
  showToast(`✅「${name}」已新增！`);
  ['new-spot-name','new-spot-day','new-spot-addr','new-spot-note'].forEach(id=>{document.getElementById(id).value='';});
}
async function deleteSpot(tripId,spotId){ if(!confirm('確定要刪除？')) return; await F().deleteDoc(docRef(`trips/${tripId}/spots`,spotId)); showToast('已刪除'); loadSpots(tripId); }
function adminQuickAdd(tripId){ showPage('admin'); selectTripForAdmin(tripId,state.trips.find(t=>t.id===tripId)?.name); }
function renderAdminTripList(){
  const list=document.getElementById('admin-trip-list'); if(!list) return;
  list.innerHTML=state.trips.length?state.trips.map(t=>`<div class="admin-list-item"><span class="admin-list-item-name">${t.emoji||''} ${t.name}</span><div class="admin-list-actions"><button class="btn-ghost" style="font-size:.75rem;padding:.3rem .7rem" onclick="selectTripForAdmin('${t.id}','${escAttr(t.name)}')">新增景點</button><button class="btn-icon" onclick="deleteTrip('${t.id}')">🗑️</button></div></div>`).join(''):'<p style="font-size:.85rem;color:var(--text-lt)">尚無旅行</p>';
}

// ── REVIEW ────────────────────────────────────────────────
function showSeoulReview() {
  const allSpots=Object.values(SEOUL_DATA.dayData).flatMap(d=>d.sections.flatMap(s=>s.spots));
  openModal(`<div style="text-align:center"><p style="font-size:3rem">🇰🇷</p>
    <h2 style="font-family:var(--ff-display);font-size:2rem;color:var(--brown)">首爾之旅</h2>
    <p style="font-family:var(--ff-hand);font-size:1.1rem;color:var(--rose);margin:.3rem 0 1.5rem">7/15 – 7/20 · Lulu 生日遠征</p>
    <div class="review-stat-grid">
      <div class="review-stat-box"><div class="review-stat-num">6</div><div class="review-stat-label">天</div></div>
      <div class="review-stat-box"><div class="review-stat-num">${allSpots.length}</div><div class="review-stat-label">個景點</div></div>
      <div class="review-stat-box"><div class="review-stat-num">250+</div><div class="review-stat-label">皮克敏花苗</div></div>
    </div>
    <p style="font-family:var(--ff-hand);font-size:1.2rem;color:var(--rose);margin-top:1.5rem">謝謝你陪我走過首爾的每一個角落 💕</p>
  </div>`);
}
async function showReview(tripId) {
  const trip=state.trips.find(t=>t.id===tripId); if(!trip||!db()) return;
  const snap=await F().getDocs(col(`trips/${tripId}/spots`));
  let spots=[],checkedIn=0,hearts=0;
  snap.forEach(d=>{const s=d.data();spots.push(s);if(s.checkedIn)checkedIn++;hearts+=(s.hearts||0);});
  openModal(`<div style="text-align:center"><p style="font-size:3rem">${trip.emoji||'✈️'}</p>
    <h2 style="font-family:var(--ff-display);font-size:2rem;color:var(--brown)">${trip.name}</h2>
    <p style="font-family:var(--ff-hand);font-size:1.1rem;color:var(--rose);margin:.3rem 0 1.5rem">${trip.dates||''} · 旅行回顧</p>
    <div class="review-stat-grid">
      <div class="review-stat-box"><div class="review-stat-num">${spots.length}</div><div class="review-stat-label">個景點</div></div>
      <div class="review-stat-box"><div class="review-stat-num">${checkedIn}</div><div class="review-stat-label">已打卡</div></div>
      <div class="review-stat-box"><div class="review-stat-num">${hearts}</div><div class="review-stat-label">個愛心</div></div>
    </div>
    <p style="font-family:var(--ff-hand);font-size:1.2rem;color:var(--rose);margin-top:1.5rem">謝謝你陪我走過這段旅程 💕</p>
  </div>`);
}

init();
