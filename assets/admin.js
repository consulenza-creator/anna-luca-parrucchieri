/* ===========================================================
   Anna & Luca Parrucchieri — Gestionale /gestionale
   Backend reale: Firebase Authentication + Firestore
   Progetto: anna-luca-parrucchieri (config in assets/firebase-config.js)
   =========================================================== */

const db = firebase.firestore();
const auth = firebase.auth();

const DAY_NAMES = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
const MONTH_NAMES = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

/* ---------- CACHE LOCALE (sincronizzata in tempo reale con Firestore) ---------- */
let prenotazioniCache = [];
let prodottiCache = [];
let ferieCache = [];
let listenersAttached = false;

/* ---------- LOGIN (Firebase Authentication) ---------- */
document.getElementById('loginForm').addEventListener('submit', (e)=>{
  e.preventDefault();
  const email = document.getElementById('loginUser').value.trim();
  const pass = document.getElementById('loginPass').value.trim();
  const err = document.getElementById('loginError');
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  auth.signInWithEmailAndPassword(email, pass)
    .then(()=>{ err.classList.remove('show'); })
    .catch(()=>{
      err.textContent = 'Email o password errati.';
      err.classList.add('show');
    })
    .finally(()=>{ btn.disabled = false; });
});

document.getElementById('logoutBtn').addEventListener('click', ()=>{
  auth.signOut();
});

auth.onAuthStateChanged(user=>{
  if(user){
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('adminApp').classList.add('show');
    attachFirestoreListeners();
  } else {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('adminApp').classList.remove('show');
  }
});

/* ---------- ASCOLTO IN TEMPO REALE SU FIRESTORE ---------- */
function attachFirestoreListeners(){
  if(listenersAttached) return;
  listenersAttached = true;

  db.collection('prenotazioni').onSnapshot(snap=>{
    prenotazioniCache = snap.docs.map(d=>({ id:d.id, ...d.data() }));
    renderPrenotazioni();
    renderCalendario();
    renderReport();
  }, err=> console.error('Errore lettura prenotazioni:', err));

  db.collection('prodotti').onSnapshot(snap=>{
    prodottiCache = snap.docs.map(d=>({ id:d.id, ...d.data() }));
    renderProdotti();
  }, err=> console.error('Errore lettura prodotti:', err));

  db.collection('ferie').onSnapshot(snap=>{
    ferieCache = snap.docs.map(d=>({ id:d.id, ...d.data() }));
    renderFerie();
  }, err=> console.error('Errore lettura ferie:', err));
}

/* ---------- NAVIGAZIONE VISTE ---------- */
document.querySelectorAll('.admin-nav-item').forEach(item=>{
  item.addEventListener('click', ()=>{
    document.querySelectorAll('.admin-nav-item').forEach(i=>i.classList.remove('active'));
    document.querySelectorAll('.admin-view').forEach(v=>v.classList.remove('active'));
    item.classList.add('active');
    document.getElementById('view-'+item.dataset.view).classList.add('active');
  });
});

/* =========================================================
   1) LISTA PRENOTAZIONI
   ========================================================= */
let prenotazioniFilterData = '';

function renderPrenotazioni(){
  const all = prenotazioniCache.slice().sort((a,b)=> (a.dataISO||'').localeCompare(b.dataISO||''));
  const list = prenotazioniFilterData ? all.filter(b=> b.dataISO === prenotazioniFilterData) : all;
  const wrap = document.getElementById('prenotazioniBody');

  if(all.length === 0){
    wrap.innerHTML = '<div class="admin-empty">Nessuna prenotazione ricevuta finora.</div>';
    return;
  }
  if(list.length === 0){
    wrap.innerHTML = '<div class="admin-empty">Nessuna prenotazione per la data selezionata.</div>';
    return;
  }
  const CHEVRON = '<svg class="chevron" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';

  let html = '<div class="booking-list">';
  list.forEach(b=>{
    html += `<div class="booking-card" data-id="${b.id}">
      <button type="button" class="booking-summary">
        <div class="bs-main">
          <div class="bs-date">${b.data || '-'} <span>${b.ora || ''}</span></div>
          <div class="bs-name">${b.nome || '-'}</div>
        </div>
        <div class="bs-right">
          <span class="pill st-${statoClass(b.stato)}">${b.stato || 'Da confermare'}</span>
          ${CHEVRON}
        </div>
      </button>
      <div class="booking-details">
        <div class="b-row"><span>Telefono</span><span>${b.telefono || '-'}</span></div>
        ${b.email ? `<div class="b-row"><span>Email</span><span>${b.email}</span></div>` : ''}
        <div class="b-row"><span>Servizi</span><span>${b.servizi || '-'} (${b.durata || '?'} min)</span></div>
        <div class="b-row"><span>Operatore</span><span class="pill">${b.operatore || '-'}</span></div>
        <div class="b-row"><span>Prezzo / Acconto</span><span>€${b.prezzo || '-'} / €${b.acconto || '-'}</span></div>
        <div class="b-row"><span>Note</span><span>${b.note || '—'}</span></div>
        <div class="b-row">
          <span>Stato</span>
          <select class="status-select st-${statoClass(b.stato)}" data-id="${b.id}">
            ${['Da confermare','Confermata','Completata','Cancellata'].map(s=>`<option value="${s}" ${b.stato===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>`;
  });
  html += '</div>';
  wrap.innerHTML = html;

  wrap.querySelectorAll('.booking-summary').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      btn.closest('.booking-card').classList.toggle('open');
    });
  });

  wrap.querySelectorAll('.status-select').forEach(sel=>{
    sel.addEventListener('click', (e)=> e.stopPropagation());
    sel.addEventListener('change', ()=>{
      db.collection('prenotazioni').doc(sel.dataset.id).update({ stato: sel.value })
        .catch(err=> console.error('Errore aggiornamento stato:', err));
      // Se viene cancellata, libera lo slot anche nella disponibilità
      // pubblica (stesso id), così il sito torna a proporlo ai clienti.
      if(sel.value === 'Cancellata'){
        db.collection('disponibilita').doc(sel.dataset.id).delete()
          .catch(err=> console.error('Errore liberazione slot disponibilità:', err));
      }
    });
  });
}
function statoClass(s){
  return { 'Da confermare':'nuova', 'Confermata':'confermata', 'Completata':'completata', 'Cancellata':'cancellata' }[s] || 'nuova';
}

/* Filtro per data (bottoni/campo legati una sola volta) */
document.getElementById('filterData').addEventListener('change', (e)=>{
  prenotazioniFilterData = e.target.value;
  renderPrenotazioni();
});
document.getElementById('filterOggi').addEventListener('click', ()=>{
  const iso = new Date().toISOString().slice(0,10);
  document.getElementById('filterData').value = iso;
  prenotazioniFilterData = iso;
  renderPrenotazioni();
});
document.getElementById('filterReset').addEventListener('click', ()=>{
  document.getElementById('filterData').value = '';
  prenotazioniFilterData = '';
  renderPrenotazioni();
});

/* =========================================================
   2) CALENDARIO (settimana in corso, filtrabile per operatore)
   ========================================================= */
let calendarioFiltro = 'Tutti';

function startOfWeek(d){
  const day = d.getDay(); // 0=Dom, 1=Lun ... 6=Sab
  const diff = (day === 0 ? -6 : 1 - day); // porta al Lunedì
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0,0,0,0);
  return monday;
}

function renderCalendario(){
  let list = prenotazioniCache.filter(b=>b.stato !== 'Cancellata');
  if(calendarioFiltro !== 'Tutti'){
    list = list.filter(b=>b.operatore === calendarioFiltro);
  }
  const container = document.getElementById('calendarioBody');
  const today = new Date();
  const todayIso = today.toISOString().slice(0,10);
  const monday = startOfWeek(today);
  let html = '';

  for(let i=0;i<7;i++){
    const d = new Date(monday); d.setDate(monday.getDate()+i);
    const iso = d.toISOString().slice(0,10);
    const isToday = iso === todayIso;
    const dayBookings = list.filter(b=>b.dataISO === iso).sort((a,b)=> (a.ora||'').localeCompare(b.ora||''));

    html += `<div class="agenda-day"><h4>${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}${isToday?' — Oggi':''}</h4>`;
    if(dayBookings.length === 0){
      html += '<div class="agenda-empty">Nessun appuntamento</div>';
    } else {
      dayBookings.forEach(b=>{
        html += `<div class="agenda-item">
          <div class="time">${b.ora}</div>
          <div class="who ${b.operatore}">${b.operatore}</div>
          <div class="info">${b.nome} — ${b.servizi}<small>${b.telefono || ''}${b.note ? ' · 📝 '+b.note : ''}</small></div>
        </div>`;
      });
    }
    html += '</div>';
  }
  container.innerHTML = html;
}

document.querySelectorAll('#calFiltro .chip-filter').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('#calFiltro .chip-filter').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    calendarioFiltro = btn.dataset.chi;
    renderCalendario();
  });
});

/* =========================================================
   3) STOCK PRODOTTI
   ========================================================= */
let prodottiSearchTerm = '';

function renderProdotti(){
  const all = prodottiCache;
  const term = prodottiSearchTerm.trim().toLowerCase();
  const list = term ? all.filter(p => (p.nome+' '+p.categoria).toLowerCase().includes(term)) : all;
  const wrap = document.getElementById('prodottiBody');

  if(all.length === 0){
    wrap.innerHTML = '<div class="admin-empty">Nessun prodotto ancora aggiunto.</div>';
    return;
  }
  if(list.length === 0){
    wrap.innerHTML = '<div class="admin-empty">Nessun prodotto trovato per questa ricerca.</div>';
    return;
  }

  let html = `<div class="admin-table-wrap"><table class="admin-table"><thead><tr>
    <th>Prodotto</th><th>Categoria</th><th>Prezzo</th><th>Scorte</th>
  </tr></thead><tbody>`;
  list.forEach(p=>{
    const low = p.scorte <= p.sogliaMin;
    html += `<tr>
      <td data-label="Prodotto">${p.nome}</td>
      <td data-label="Categoria">${p.categoria}</td>
      <td data-label="Prezzo">€${p.prezzo}</td>
      <td data-label="Scorte">
        <div class="stock-controls">
          <button class="stock-btn" data-id="${p.id}" data-delta="-1">−</button>
          <span class="${low ? 'stock-low' : ''}">${p.scorte}</span>
          <button class="stock-btn" data-id="${p.id}" data-delta="1">+</button>
          ${low ? '<span class="pill" style="background:#FBE4E1;color:var(--err);margin-left:6px;">Scorta bassa</span>' : ''}
        </div>
      </td>
    </tr>`;
  });
  html += '</tbody></table></div>';
  wrap.innerHTML = html;

  wrap.querySelectorAll('.stock-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const item = prodottiCache.find(x=>x.id===btn.dataset.id);
      if(!item) return;
      const newScorte = Math.max(0, item.scorte + parseInt(btn.dataset.delta,10));
      db.collection('prodotti').doc(btn.dataset.id).update({ scorte:newScorte })
        .catch(err=> console.error('Errore aggiornamento scorte:', err));
    });
  });
}

document.getElementById('addProdottoForm').addEventListener('submit', (e)=>{
  e.preventDefault();
  const nome = document.getElementById('newProdNome').value.trim();
  const categoria = document.getElementById('newProdCategoria').value.trim() || 'Generico';
  const scorte = parseInt(document.getElementById('newProdScorte').value, 10) || 0;
  const prezzo = parseFloat(document.getElementById('newProdPrezzo').value) || 0;
  if(!nome) return;
  db.collection('prodotti').add({ nome, categoria, scorte, sogliaMin:3, prezzo })
    .then(()=>{ e.target.reset(); e.target.classList.add('hidden'); })
    .catch(err=> console.error('Errore salvataggio prodotto:', err));
});

document.getElementById('toggleAddProdotto').addEventListener('click', ()=>{
  const form = document.getElementById('addProdottoForm');
  form.classList.toggle('hidden');
  if(!form.classList.contains('hidden')) document.getElementById('newProdNome').focus();
});

document.getElementById('searchProdotto').addEventListener('input', (e)=>{
  prodottiSearchTerm = e.target.value;
  renderProdotti();
});

/* =========================================================
   4) GESTIONE FERIE
   ========================================================= */
function renderFerie(){
  const list = ferieCache.slice().sort((a,b)=> a.data.localeCompare(b.data));
  const wrap = document.getElementById('ferieBody');
  if(list.length === 0){
    wrap.innerHTML = '<div class="admin-empty">Nessuna chiusura straordinaria impostata.</div>';
    return;
  }
  wrap.innerHTML = `<div class="ferie-list">${list.map(f=>`
    <div class="ferie-item">
      <div>
        <div class="d">${formatDate(f.data)} <span class="pill chi-${f.chi||'Tutti'}">${chiLabel(f.chi)}</span></div>
        <div class="n">${f.nota || 'Nessuna nota'}</div>
      </div>
      <button class="del" data-id="${f.id}">Rimuovi</button>
    </div>`).join('')}</div>`;

  wrap.querySelectorAll('.del').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      db.collection('ferie').doc(btn.dataset.id).delete()
        .catch(err=> console.error('Errore rimozione ferie:', err));
    });
  });
}
function formatDate(iso){
  const d = new Date(iso+'T00:00:00');
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}
function chiLabel(chi){
  return { 'Anna':'Anna assente', 'Luca':'Luca assente', 'Tutti':'Salone chiuso' }[chi] || 'Salone chiuso';
}

document.getElementById('addFerieForm').addEventListener('submit', (e)=>{
  e.preventDefault();
  const data = document.getElementById('newFerieData').value;
  const chi = document.getElementById('newFerieChi').value;
  const nota = document.getElementById('newFerieNota').value.trim();
  if(!data) return;
  if(ferieCache.some(f=>f.data===data && f.chi===chi)){ alert('Questa combinazione data/persona è già impostata.'); return; }
  db.collection('ferie').add({ data, chi, nota })
    .then(()=> e.target.reset())
    .catch(err=> console.error('Errore salvataggio ferie:', err));
});

/* =========================================================
   5) REPORT (giorno / settimana / mese)
   ========================================================= */
let reportPeriodo = 'giorno';

function endOfWeek(monday){
  const d = new Date(monday);
  d.setDate(monday.getDate()+6);
  return d;
}

function getReportRange(){
  const today = new Date();
  const todayIso = today.toISOString().slice(0,10);
  if(reportPeriodo === 'giorno'){
    return { from: todayIso, to: todayIso, label: formatDate(todayIso) };
  }
  if(reportPeriodo === 'settimana'){
    const monday = startOfWeek(today);
    const sunday = endOfWeek(monday);
    return { from: monday.toISOString().slice(0,10), to: sunday.toISOString().slice(0,10), label: `${monday.getDate()} ${MONTH_NAMES[monday.getMonth()]} – ${sunday.getDate()} ${MONTH_NAMES[sunday.getMonth()]}` };
  }
  // mese
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const last = new Date(today.getFullYear(), today.getMonth()+1, 0);
  return { from: first.toISOString().slice(0,10), to: last.toISOString().slice(0,10), label: `${MONTH_NAMES[today.getMonth()]} ${today.getFullYear()}` };
}

function renderReport(){
  const range = getReportRange();
  const all = prenotazioniCache.filter(b => b.dataISO >= range.from && b.dataISO <= range.to);
  const attive = all.filter(b => b.stato !== 'Cancellata');
  const cancellate = all.filter(b => b.stato === 'Cancellata');

  const fatturato = attive.reduce((s,b)=> s + (parseFloat(b.prezzo)||0), 0);
  const acconti = attive.reduce((s,b)=> s + (parseFloat(b.acconto)||0), 0);

  const perOperatore = { Anna:{count:0, fatturato:0}, Luca:{count:0, fatturato:0} };
  attive.forEach(b=>{
    if(perOperatore[b.operatore]){
      perOperatore[b.operatore].count++;
      perOperatore[b.operatore].fatturato += (parseFloat(b.prezzo)||0);
    }
  });

  const wrap = document.getElementById('reportBody');
  wrap.innerHTML = `
    <p style="font-size:12.5px;color:var(--charcoal-soft);margin:-6px 0 16px;">Periodo: <b>${range.label}</b></p>
    <div class="grid cols-4" style="margin-bottom:20px;">
      <div class="card"><div class="report-num">${attive.length}</div><div class="report-lbl">Prenotazioni attive</div></div>
      <div class="card"><div class="report-num">€${fatturato.toFixed(2)}</div><div class="report-lbl">Fatturato previsto</div></div>
      <div class="card"><div class="report-num">€${acconti.toFixed(2)}</div><div class="report-lbl">Acconti raccolti</div></div>
      <div class="card"><div class="report-num">${cancellate.length}</div><div class="report-lbl">Cancellate</div></div>
    </div>
    <div class="grid cols-2">
      <div class="card">
        <h3 style="display:flex;align-items:center;gap:8px;"><span style="padding:3px 9px;border-radius:20px;font-size:11px;color:#fff;background:var(--orange);">Anna</span></h3>
        <div class="report-num" style="font-size:22px;">${perOperatore.Anna.count} <span style="font-size:13px;color:var(--charcoal-soft);font-weight:500;">prenotazioni</span></div>
        <p style="margin-top:6px;">€${perOperatore.Anna.fatturato.toFixed(2)} di fatturato previsto</p>
      </div>
      <div class="card">
        <h3 style="display:flex;align-items:center;gap:8px;"><span style="padding:3px 9px;border-radius:20px;font-size:11px;color:#fff;background:var(--teal);">Luca</span></h3>
        <div class="report-num" style="font-size:22px;">${perOperatore.Luca.count} <span style="font-size:13px;color:var(--charcoal-soft);font-weight:500;">prenotazioni</span></div>
        <p style="margin-top:6px;">€${perOperatore.Luca.fatturato.toFixed(2)} di fatturato previsto</p>
      </div>
    </div>
  `;
}

document.querySelectorAll('#reportPeriodo .chip-filter').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('#reportPeriodo .chip-filter').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    reportPeriodo = btn.dataset.periodo;
    renderReport();
  });
});
