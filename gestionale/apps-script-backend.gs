/* ===========================================================
   Anna & Luca Parrucchieri — Gestionale (Google Apps Script)
   ===========================================================
   Cosa fa questo script:
   1. Riceve i dati di ogni prenotazione dal sito (prenota.html)
   2. Li salva come riga in un Google Sheet ("Prenotazioni")
   3. Manda una notifica email e/o Telegram ad Anna e Luca

   Come si installa: vedi il file SETUP-GESTIONALE.md nella stessa
   cartella, passo per passo. Qui sotto vanno inserite 3 informazioni
   (email, token del bot Telegram, chat id) nella sezione CONFIGURAZIONE.
   =========================================================== */

/* ================= CONFIGURAZIONE ================= */
// Email che riceve la notifica di ogni prenotazione/cancellazione.
// Lasciare vuoto ("") per disattivare le notifiche via email.
const OWNER_EMAIL = "annalucaparrucchieri@hotmail.it";

// Token del bot Telegram (lo dà @BotFather, vedi SETUP-GESTIONALE.md).
// Lasciare vuoto ("") per disattivare le notifiche via Telegram.
const TELEGRAM_BOT_TOKEN = "";

// Chat id della persona (o gruppo) che deve ricevere le notifiche Telegram.
const TELEGRAM_CHAT_ID = "";

// Nome del foglio dove vengono salvate le prenotazioni (verrà creato
// automaticamente al primo utilizzo se non esiste già).
const SHEET_NAME = "Prenotazioni";

/* ================= NON SERVE MODIFICARE SOTTO QUESTA RIGA ================= */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    salvaSuFoglio(data);

    const messaggio = costruisciMessaggio(data);
    const oggetto = (data.tipo === 'cancellazione' ? '❌ Cancellazione: ' : '📅 Nuova prenotazione: ')
      + (data.nome || 'cliente') + ' — ' + (data.data || '') + ' ' + (data.ora || '');

    if (OWNER_EMAIL) {
      MailApp.sendEmail(OWNER_EMAIL, oggetto, messaggio);
    }
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
      inviaTelegram(messaggio);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Permette di aprire l'URL nel browser per verificare che lo script sia online.
function doGet(e) {
  return ContentService.createTextOutput("Gestionale Anna & Luca Parrucchieri: online ✅");
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      'Ricevuta il', 'Tipo', 'Nome cliente', 'Telefono', 'Email',
      'Servizi', 'Durata (min)', 'Prezzo (€)', 'Acconto (€)',
      'Data appuntamento', 'Ora', 'Operatore', 'Note', 'Stato'
    ]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function salvaSuFoglio(data) {
  const sheet = getSheet();
  sheet.appendRow([
    new Date(),
    data.tipo || 'nuova',
    data.nome || '',
    data.telefono || '',
    data.email || '',
    data.servizi || '',
    data.durata || '',
    data.prezzo || '',
    data.acconto || '',
    data.data || '',
    data.ora || '',
    data.operatore || '',
    data.note || '',
    data.tipo === 'cancellazione' ? 'Cancellata' : 'Da confermare'
  ]);
}

function costruisciMessaggio(data) {
  let msg = data.tipo === 'cancellazione' ? '❌ CANCELLAZIONE APPUNTAMENTO\n\n' : '📅 NUOVA PRENOTAZIONE\n\n';
  msg += 'Cliente: ' + (data.nome || '-') + '\n';
  msg += 'Telefono: ' + (data.telefono || '-') + '\n';
  if (data.email) msg += 'Email: ' + data.email + '\n';
  msg += 'Servizi: ' + (data.servizi || '-') + ' (' + (data.durata || '?') + ' min)\n';
  msg += 'Data: ' + (data.data || '-') + ' ore ' + (data.ora || '-') + '\n';
  msg += 'Operatore: ' + (data.operatore || '-') + '\n';
  msg += 'Prezzo totale: €' + (data.prezzo || '-') + ' — Acconto: €' + (data.acconto || '-') + '\n';
  if (data.note) msg += '\n📝 Note del cliente: ' + data.note + '\n';
  return msg;
}

function inviaTelegram(testo) {
  const url = 'https://api.telegram.org/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage';
  UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: testo }),
    muteHttpExceptions: true
  });
}

// Funzione di test: eseguila manualmente dall'editor Apps Script
// (menu Esegui > testInvio) per verificare che email/Telegram funzionino
// senza dover passare dal sito.
function testInvio() {
  doPost({
    postData: {
      contents: JSON.stringify({
        tipo: 'nuova',
        nome: 'Prova Test',
        telefono: '333 0000000',
        email: 'prova@test.it',
        servizi: 'Taglio + Piega',
        durata: 55,
        prezzo: 45,
        acconto: 9,
        data: 'Martedì 7 Lug',
        ora: '10:30',
        operatore: 'Anna',
        note: 'Questo è un messaggio di prova, ignoralo.'
      })
    }
  });
}
