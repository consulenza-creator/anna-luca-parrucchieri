# Migrazione a Firebase — stato attuale

**Aggiornamento: il gestionale è collegato a Firebase, regole di sicurezza pubblicate.** Progetto `anna-luca-parrucchieri` (account dedicato `annalucaparrucchieri@gmail.com`), Firestore e Authentication attivi, login vero con email/password per Anna e Luca, dati condivisi in tempo reale su tutti i dispositivi, database protetto da `firestore.rules`. La parte Firebase è completa per l'uso quotidiano.

Il resto di questo documento (sotto) è la guida originale, lasciata per riferimento.

## Chi deve creare l'account

Non posso creare io l'account Firebase: richiede un account Google reale con verifica (e per alcune funzioni una carta per il piano a consumo, vedi sotto). Va creato da voi o da Anna e Luca. Due strade:

- **Account Google dedicato al salone** (consigliato) — es. `annalucaparrucchieri.gestionale@gmail.com`, così il progetto resta di proprietà del salone e non legato a un account personale.
- **Account Google esistente** di uno di voi, se preferite semplicità.

Una volta creato, basta condividere l'accesso al progetto Firebase con il mio operatore (voi, Valerio) come "Editor" da Firebase Console → Impostazioni progetto → Utenti e autorizzazioni: da lì posso guidarvi o scrivere il codice esatto da incollare.

## Cosa serve attivare

1. Vai su [console.firebase.google.com](https://console.firebase.google.com), crea un nuovo progetto (es. "Anna Luca Parrucchieri").
2. Attiva **Firestore Database** (modalità produzione, regione europe-west, es. `eur3`).
3. Attiva **Authentication** → metodo Email/Password: qui creerete le utenze di Anna e Luca per accedere al gestionale (niente più credenziali fisse nel codice).
4. Le notifiche Telegram automatiche **non richiedono Blaze**: la via gratuita è Google Apps Script (`apps-script-backend.gs` + `SETUP-GESTIONALE.md`), indipendente da Firebase. Blaze servirebbe solo per un'alternativa più complessa (Cloud Function dentro Firebase collegata a Firestore) e non è necessaria per questo progetto.

## Struttura dati prevista (Firestore)

```
prenotazioni/{id}
  nome, telefono, email, servizi, durata, prezzo, acconto,
  dataISO, data, ora, operatore, note, stato, ricevutaIl

prodotti/{id}
  nome, categoria, scorte, sogliaMin, prezzo

ferie/{id}
  data (YYYY-MM-DD), nota

staff/{uid}   ← creato da Authentication, non da compilare a mano
  nome (Anna / Luca), ruolo (admin)
```

Ricalca esattamente le strutture già usate in `assets/admin.js` e nel payload inviato da `assets/prenotatore.js`: la migrazione è soprattutto una sostituzione delle funzioni `getData()`/`setData()` (oggi localStorage) con le equivalenti chiamate `getDocs()`/`setDoc()` di Firestore — la parte grafica e la logica non cambiano.

## Cosa farò io una volta pronto l'accesso

- [x] Sostituire `getData`/`setData` in `assets/admin.js` con le chiamate Firestore (lettura in tempo reale, così Anna e Luca vedono le prenotazioni aggiornarsi da sole senza ricaricare la pagina).
- [x] Sostituire il login prototipale con Firebase Authentication (email/password vere per Anna e Luca, niente credenziali scritte nel codice).
- [ ] Attivare le notifiche Telegram: script già pronto in `apps-script-backend.gs`, gratuito (Google Apps Script, non Firebase), da pubblicare e collegare seguendo `SETUP-GESTIONALE.md` — non ancora fatto, ma non serve alcun piano a pagamento.
- [x] Aggiungere regole di sicurezza Firestore (`firestore.rules`) perché solo Anna e Luca autenticati possano leggere/modificare i dati — pubblicate in console.
- [x] Far leggere a `prenota.html` le ferie direttamente da Firestore in tempo reale (niente più localStorage).
- [x] Disponibilità reale: gli slot mostrati ai clienti ora controllano le prenotazioni Firestore esistenti (lettura in tempo reale su `prenotazioni`, esclude solo quelle "Cancellata") invece di un algoritmo pseudo-casuale. Resta un margine teorico molto piccolo: se due persone confermano lo stesso slot nello stesso istante esatto, in rari casi potrebbero sovrapporsi (il controllo è lato client, non una transazione atomica lato server) — per i volumi di un salone è un rischio trascurabile, ma è onesto segnalarlo.

## Riassunto pratico per voi (stato: fatto)

1. ~~Create l'account Google dedicato al salone.~~ ✅ `annalucaparrucchieri@gmail.com`
2. ~~Create il progetto su Firebase Console.~~ ✅ `anna-luca-parrucchieri`
3. ~~Attivate Firestore e Authentication.~~ ✅
4. Attivare Telegram è gratis e facoltativo: seguite `SETUP-GESTIONALE.md` quando volete (nessun piano a pagamento richiesto). Nel frattempo restano attive le notifiche email già pronte con Apps Script.
5. ~~Mandatemi le chiavi di configurazione.~~ ✅ collegate in `assets/firebase-config.js`.
6. ~~Pubblicare `firestore.rules` in console.~~ ✅
