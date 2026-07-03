/* ===========================================================
   Anna & Luca Parrucchieri — Prenotatore assistito (prototipo)
   Logica: selezione servizi -> calcolo durata totale -> slot
   liberi simulati su calendario a 2 operatori -> acconto 20%
   (blocco carta, mockup) -> conferma con Google Calendar/.ics
   =========================================================== */

/* ---------- CONFIGURAZIONE (dati reali del salone) ---------- */
const SERVICES = [
  {id:'shampoo', name:'Shampoo', duration:10, price:5},
  {id:'taglio', name:'Taglio', duration:30, price:25},
  {id:'piega', name:'Piega', duration:25, price:20},
  {id:'colore', name:'Colore', duration:60, price:40},
  {id:'balayage', name:'Balayage', duration:90, price:85},
  {id:'barba', name:'Barba', duration:15, price:12},
  {id:'trattamento', name:'Trattamento ricostruttore', duration:20, price:18}
];
const STAFF = ['Anna','Luca'];
const OPEN_HOUR = 9;   // orario apertura reale (Instagram/Facebook: 9-18 mar-sab)
const CLOSE_HOUR = 18; // orario chiusura reale
const CLOSED_WEEKDAYS = [0,1]; // 0=Domenica, 1=Lunedì chiuso
const SLOT_STEP = 30;
const DEPOSIT_RATE = 0.20;
const SALON_ADDRESS = "Viale Lo Re 20, 73100 Lecce (LE)";

// URL del gestionale (Google Apps Script) che salva la prenotazione su Sheet
// e invia le notifiche email/Telegram ad Anna e Luca. Vedi gestionale/SETUP-GESTIONALE.md
// per come ottenerlo. Finché è vuoto, la prenotazione NON viene inviata da nessuna parte:
// resta solo un prototipo dimostrativo lato client.
const GESTIONALE_WEBHOOK_URL = "";

/* ---------- FIRESTORE (dati condivisi con il gestionale) ---------- */
const db = firebase.firestore();

/* ---------- STATO ---------- */
let selectedServices = [];
let staffPref = 'Indifferente';
let daysToShow = 7;
let chosenSlot = null;

/* ---------- UTILS ---------- */
function hashStr(s){ let h=0; for(let i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))>>>0; } return h; }
function isBlockBusy(staff, dateStr, blockIndex){ return (hashStr(staff+'|'+dateStr+'|'+blockIndex) % 100) < 35; }
function pad(n){ return n.toString().padStart(2,'0'); }
function dateStr(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function minToTime(min){ return pad(Math.floor(min/60))+':'+pad(min%60); }
function totalDuration(){ return selectedServices.reduce((s,x)=>s+x.duration,0); }
function totalPrice(){ return selectedServices.reduce((s,x)=>s+x.price,0); }
function avatarRef(staff){ return staff==='Luca' ? '#av-luca' : '#av-anna'; }
const DAY_NAMES = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
const MONTH_NAMES = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

/* ---------- RENDER SERVIZI ---------- */
const serviceList = document.getElementById('serviceList');
SERVICES.forEach(svc=>{
  const el = document.createElement('div');
  el.className = 'b-service';
  el.dataset.id = svc.id;
  el.innerHTML = `<div class="b-service-row"><div><div class="name">${svc.name}</div><div class="meta">${svc.duration} min</div></div></div><div style="display:flex;align-items:center;"><div class="price">€${svc.price}</div><div class="check"><svg viewBox="0 0 24 24"><path d="M4 12l5 5L19 7"/></svg></div></div>`;
  el.addEventListener('click', ()=>{
    const idx = selectedServices.findIndex(s=>s.id===svc.id);
    if(idx>-1){ selectedServices.splice(idx,1); el.classList.remove('selected'); }
    else { selectedServices.push(svc); el.classList.add('selected'); }
    updateSummaryBar();
  });
  serviceList.appendChild(el);
});

document.querySelectorAll('.b-chip').forEach(chip=>{
  chip.addEventListener('click', ()=>{
    document.querySelectorAll('.b-chip').forEach(c=>c.classList.remove('active'));
    chip.classList.add('active');
    staffPref = chip.dataset.staff;
  });
});

function updateSummaryBar(){
  const bar = document.getElementById('summaryBar1');
  const btn = document.getElementById('toStep2');
  if(selectedServices.length===0){
    bar.innerHTML = '<span>Nessun servizio selezionato</span><span></span>';
    btn.disabled = true;
    return;
  }
  bar.innerHTML = `<span>${selectedServices.map(s=>s.name).join(' + ')} — ${totalDuration()} min</span><b>€${totalPrice()}</b>`;
  btn.disabled = false;
}

/* ---------- GENERAZIONE SLOT ---------- */
function findSlotsForDay(d){
  const ds = dateStr(d);
  const weekday = d.getDay();
  if(CLOSED_WEEKDAYS.includes(weekday)) return [];

  // Ferie/assenze impostate dal gestionale: escludono solo l'operatore segnato,
  // a meno che non sia segnato "Tutti" (salone chiuso quel giorno).
  const offToday = getFerieMap()[ds] || [];
  if(STAFF.every(s=>offToday.includes(s))) return [];

  const dur = totalDuration();
  const blocksNeeded = Math.ceil(dur/SLOT_STEP);
  const totalBlocks = Math.floor((CLOSE_HOUR-OPEN_HOUR)*60/SLOT_STEP);
  const staffToCheck = (staffPref==='Indifferente' ? STAFF : [staffPref]).filter(s=> !offToday.includes(s));
  if(staffToCheck.length===0) return [];
  const found = [];
  for(let b=0;b<=totalBlocks-blocksNeeded;b++){
    for(const staff of staffToCheck){
      let free = true;
      for(let k=0;k<blocksNeeded;k++){
        if(isBlockBusy(staff, ds, b+k)){ free=false; break; }
      }
      if(free){
        const startMin = OPEN_HOUR*60 + b*SLOT_STEP;
        found.push({date:new Date(d), staff, startMin, endMin:startMin+dur});
        break;
      }
    }
  }
  return found;
}

function renderSlots(){
  const container = document.getElementById('slotsContainer');
  container.innerHTML = '';
  const today = new Date();
  let anySlot = false;
  for(let i=1;i<=daysToShow;i++){
    const d = new Date(today);
    d.setDate(d.getDate()+i);
    const slots = findSlotsForDay(d).slice(0,4);
    if(slots.length===0) continue;
    anySlot = true;
    const group = document.createElement('div');
    group.className = 'b-day-group';
    group.innerHTML = `<h4>${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}</h4>`;
    const row = document.createElement('div');
    row.className = 'b-slots';
    slots.forEach(s=>{
      const btn = document.createElement('div');
      btn.className = 'b-slot';
      btn.innerHTML = `<svg class="mini-avatar"><use href="${avatarRef(s.staff)}"/></svg><div class="txt"><b>${minToTime(s.startMin)}</b><small>${s.staff}</small></div>`;
      btn.addEventListener('click', ()=>{
        document.querySelectorAll('.b-slot').forEach(x=>x.classList.remove('chosen'));
        btn.classList.add('chosen');
        chosenSlot = s;
        goToStep3();
      });
      row.appendChild(btn);
    });
    group.appendChild(row);
    container.appendChild(group);
  }
  if(!anySlot){
    container.innerHTML = '<p style="color:var(--charcoal-soft);font-size:14px;">Nessuna disponibilità nei prossimi giorni mostrati. Prova ad ampliare la ricerca.</p>';
  }
  const dur = totalDuration();
  document.getElementById('assistantAvatar').querySelector('use').setAttribute('href', staffPref==='Luca' ? '#av-luca' : '#av-anna');
  document.getElementById('assistantMsg').innerHTML =
    `Perfetto! Hai scelto <b>${selectedServices.map(s=>s.name).join(' + ')}</b>, in totale <b>${dur} minuti</b> (€${totalPrice()}).<br>Ecco le prime date disponibili${staffPref!=='Indifferente' ? ' con '+staffPref : ''}:`;
}

document.getElementById('toStep2').addEventListener('click', ()=>{
  daysToShow = 7;
  showStep(2);
  renderSlots();
});
document.getElementById('backTo1').addEventListener('click', ()=>showStep(1));
document.getElementById('loadMoreDays').addEventListener('click', ()=>{
  daysToShow += 7;
  renderSlots();
});

/* ---------- STEP 3: RIEPILOGO ---------- */
function goToStep3(){
  showStep(3);
  const s = chosenSlot;
  const deposit = (totalPrice()*DEPOSIT_RATE).toFixed(2);
  const recap = document.getElementById('recap');
  recap.innerHTML = `
    <div class="b-row"><span>Servizi</span><span>${selectedServices.map(x=>x.name).join(', ')}</span></div>
    <div class="b-row"><span>Durata prevista</span><span>${totalDuration()} min</span></div>
    <div class="b-row"><span>Data</span><span>${DAY_NAMES[s.date.getDay()]} ${s.date.getDate()} ${MONTH_NAMES[s.date.getMonth()]}, ore ${minToTime(s.startMin)}</span></div>
    <div class="b-row"><span>Operatore</span><span>${s.staff}</span></div>
    <div class="b-row total"><span>Totale servizio</span><span>€${totalPrice()}</span></div>
    <div class="b-row"><span>Acconto richiesto ora (bloccato, non addebitato)</span><span><b>€${deposit}</b></span></div>
  `;
  document.getElementById('policyText').innerHTML =
    `<b>Politica di cancellazione:</b> se annulli o modifichi l'appuntamento con almeno 24 ore di anticipo, l'importo bloccato (€${deposit}) viene rilasciato automaticamente e non ti verrà addebitato nulla. Se annulli con meno di 24 ore di anticipo, o non ti presenti, l'importo verrà addebitato come penale per la mancata presentazione.`;
}
document.getElementById('backTo2').addEventListener('click', ()=>showStep(2));
document.getElementById('toStep4').addEventListener('click', ()=>showStep(4));
document.getElementById('backTo3').addEventListener('click', ()=>showStep(3));

/* ---------- STEP 4 → STEP 5 ---------- */
document.getElementById('toStep5').addEventListener('click', ()=>{
  const custName = document.getElementById('custName').value.trim();
  const custPhone = document.getElementById('custPhone').value.trim();
  const custEmail = document.getElementById('custEmail').value.trim();
  const custNotes = document.getElementById('custNotes').value.trim();

  if(!custName || !custPhone){
    alert('Inserisci almeno nome e telefono: servono ad Anna e Luca per riconoscerti in caso di necessità.');
    return;
  }

  showStep(5);
  const s = chosenSlot;
  const deposit = (totalPrice()*DEPOSIT_RATE).toFixed(2);
  document.getElementById('confirmText').innerHTML =
    `${selectedServices.map(x=>x.name).join(' + ')} con <b>${s.staff}</b><br>${DAY_NAMES[s.date.getDay()]} ${s.date.getDate()} ${MONTH_NAMES[s.date.getMonth()]}, ore ${minToTime(s.startMin)}<br>Acconto bloccato: €${deposit}` +
    (custNotes ? `<br><br>📝 Nota inviata: "${custNotes}"` : '');

  const payload = {
    tipo: 'nuova',
    nome: custName,
    telefono: custPhone,
    email: custEmail,
    servizi: selectedServices.map(x=>x.name).join(' + '),
    durata: totalDuration(),
    prezzo: totalPrice(),
    acconto: deposit,
    dataISO: dateStr(s.date),
    data: `${DAY_NAMES[s.date.getDay()]} ${s.date.getDate()} ${MONTH_NAMES[s.date.getMonth()]}`,
    ora: minToTime(s.startMin),
    operatore: s.staff,
    note: custNotes
  };

  sendBookingToGestionale(payload);
  saveBookingToFirebase(payload);
});

/* ---------- INVIO AL GESTIONALE (Google Apps Script / Firebase) ---------- */
function sendBookingToGestionale(payload){
  if(!GESTIONALE_WEBHOOK_URL){
    console.warn('GESTIONALE_WEBHOOK_URL non configurato: la prenotazione non è stata inviata al gestionale remoto. Vedi gestionale/SETUP-GESTIONALE.md');
  } else {
    // text/plain evita il preflight CORS con Google Apps Script Web App
    fetch(GESTIONALE_WEBHOOK_URL, {
      method: 'POST',
      headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify(payload)
    }).catch(err=>{
      console.warn('Invio al gestionale fallito (la prenotazione resta comunque confermata lato cliente):', err);
    });
  }
}

/* ---------- SALVATAGGIO SU FIRESTORE (condiviso con il gestionale) ----------
   La prenotazione scritta qui appare subito, in tempo reale, nel
   pannello /gestionale di Anna e Luca su qualsiasi dispositivo. */
function saveBookingToFirebase(payload){
  db.collection('prenotazioni').add(Object.assign({
    ricevutaIl: new Date().toISOString(),
    stato: 'Da confermare'
  }, payload)).catch(err=>{
    console.warn('Impossibile salvare la prenotazione su Firebase (la prenotazione resta comunque confermata lato cliente):', err);
  });
}

/* ---------- FERIE: assenze impostate dal gestionale ----------
   Letta in tempo reale da Firestore. Restituisce una mappa
   { 'YYYY-MM-DD': ['Anna','Luca'] } con gli operatori NON disponibili
   in quella data (chi === 'Tutti' conta per entrambi). */
let ferieMapCache = {};
db.collection('ferie').onSnapshot(snap=>{
  const map = {};
  snap.docs.forEach(doc=>{
    const f = doc.data();
    const staffOff = f.chi === 'Anna' || f.chi === 'Luca' ? [f.chi] : STAFF.slice();
    map[f.data] = (map[f.data] || []).concat(staffOff);
  });
  ferieMapCache = map;
}, err=>{
  console.warn('Impossibile leggere le ferie da Firebase:', err);
});
function getFerieMap(){
  return ferieMapCache;
}

/* ---------- CALENDARIO: Google Calendar + .ics ---------- */
function buildEventData(){
  const s = chosenSlot;
  const start = new Date(s.date);
  start.setHours(Math.floor(s.startMin/60), s.startMin%60, 0, 0);
  const end = new Date(s.date);
  end.setHours(Math.floor(s.endMin/60), s.endMin%60, 0, 0);
  const fmt = (d)=> d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+'T'+pad(d.getHours())+pad(d.getMinutes())+'00';
  const title = `Appuntamento Anna & Luca — ${selectedServices.map(x=>x.name).join(' + ')}`;
  const details = `Prenotazione presso Anna & Luca Parrucchieri con ${s.staff}. Servizi: ${selectedServices.map(x=>x.name).join(', ')}.`;
  return { title, details, location: SALON_ADDRESS, startStr: fmt(start), endStr: fmt(end) };
}

document.getElementById('addGoogleCal').addEventListener('click', ()=>{
  const e = buildEventData();
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(e.title)}&dates=${e.startStr}/${e.endStr}&details=${encodeURIComponent(e.details)}&location=${encodeURIComponent(e.location)}`;
  window.open(url, '_blank');
});

document.getElementById('downloadIcs').addEventListener('click', ()=>{
  const e = buildEventData();
  const ics = [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Anna e Luca Parrucchieri//Prenotatore//IT','BEGIN:VEVENT',
    'UID:'+Date.now()+'@annaeluca-salone', 'DTSTAMP:'+e.startStr,
    'DTSTART:'+e.startStr, 'DTEND:'+e.endStr,
    'SUMMARY:'+e.title, 'DESCRIPTION:'+e.details, 'LOCATION:'+e.location,
    'END:VEVENT','END:VCALENDAR'
  ].join('\r\n');
  const blob = new Blob([ics], {type:'text/calendar'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'appuntamento-anna-luca.ics';
  link.click();
});

/* ---------- NAVIGAZIONE STEP ---------- */
function showStep(n){
  [1,2,3,4,5].forEach(i=>{
    document.getElementById('bstep'+i).classList.toggle('hidden', i!==n);
  });
  renderStepsNav(n);
  window.scrollTo({top:0, behavior:'smooth'});
}
function renderStepsNav(active){
  const nav = document.getElementById('stepsNav');
  nav.innerHTML='';
  for(let i=1;i<=5;i++){
    const dot = document.createElement('span');
    if(i===active) dot.classList.add('active');
    nav.appendChild(dot);
  }
}
renderStepsNav(1);
