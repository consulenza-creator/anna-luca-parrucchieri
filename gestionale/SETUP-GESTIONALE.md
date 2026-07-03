# Attivare il gestionale (gratis) — guida passo passo

Questa guida serve per collegare il prenotatore del sito a un Google Sheet dove finiscono tutte le prenotazioni, con notifica automatica ad Anna e Luca via email e/o Telegram. Costo: zero. Tempo stimato: 15-20 minuti, da fare una sola volta.

## 1. Crea il Google Sheet

1. Vai su [sheets.google.com](https://sheets.google.com) con l'account Google che userete per il salone (può essere l'email annalucaparrucchieri@hotmail.it se collegata a un account Google, oppure uno nuovo dedicato).
2. Crea un foglio vuoto e chiamalo ad esempio "Prenotazioni Anna & Luca".

## 2. Incolla lo script

1. Nel foglio, apri **Estensioni → Apps Script**.
2. Cancella il contenuto di esempio e incolla tutto il contenuto del file `apps-script-backend.gs` (nella stessa cartella di questa guida).
3. In cima al file trovi la sezione **CONFIGURAZIONE**:
   - `OWNER_EMAIL`: l'email che riceverà le notifiche (già impostata su annalucaparrucchieri@hotmail.it, cambiala se preferite un'altra email).
   - `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID`: da compilare solo se volete anche le notifiche Telegram (vedi punto 5). Se le lasciate vuote, funzionano comunque solo le email.
4. Salva (icona del dischetto o Ctrl+S). Dai un nome al progetto, ad esempio "Gestionale Anna & Luca".

## 3. Pubblica come Web App

1. In alto a destra clicca **Esegui la distribuzione → Nuova distribuzione**.
2. Tipo: **App web**.
3. Configurazione:
   - Esegui come: **Me**
   - Chi ha accesso: **Chiunque**  (necessario per far arrivare i dati dal sito)
4. Clicca **Esegui la distribuzione**. La prima volta Google chiederà di autorizzare lo script: segui la procedura (è normale il messaggio "app non verificata", clicca su "Avanzate" → "vai al progetto").
5. Copia l'**URL dell'app web** che viene generato (inizia con `https://script.google.com/macros/s/.../exec`).

## 4. Collega l'URL al sito

1. Apri il file `assets/prenotatore.js` nella cartella del sito.
2. Trova la riga:
   ```js
   const GESTIONALE_WEBHOOK_URL = "";
   ```
3. Incolla l'URL copiato al punto 3.5 tra le virgolette, ad esempio:
   ```js
   const GESTIONALE_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycb.../exec";
   ```
4. Salva. Da questo momento ogni prenotazione confermata sul sito arriva sul Google Sheet e genera la notifica.

Se preferite non fare questa modifica da soli, mandatemi l'URL generato al punto 3.5 e la incollo io.

## 5. (Opzionale ma consigliato) Attivare le notifiche Telegram

Telegram è gratuito, istantaneo e arriva come notifica push sul telefono — molto più comodo dell'email per un avviso "al volo" mentre si lavora in salone.

1. Su Telegram, cerca **@BotFather** e avvia la chat.
2. Scrivi `/newbot`, dai un nome al bot (es. "Anna Luca Prenotazioni") e uno username che finisca in "bot" (es. `AnnaLucaPrenotazioniBot`).
3. BotFather risponde con un **token** (una stringa tipo `123456789:AAExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`): copialo, va nella riga `TELEGRAM_BOT_TOKEN` dello script.
4. Cerca il bot appena creato su Telegram (con lo username scelto) e scrivigli un messaggio qualsiasi (es. "ciao") — serve per "sbloccarlo".
5. Apri questo indirizzo nel browser, sostituendo `IL_TUO_TOKEN`:
   ```
   https://api.telegram.org/botIL_TUO_TOKEN/getUpdates
   ```
6. Nel risultato cerca `"chat":{"id":NUMERO` — quel numero è il **chat id**, va nella riga `TELEGRAM_CHAT_ID` dello script.
7. Torna nell'editor Apps Script, incolla token e chat id nella sezione CONFIGURAZIONE, salva e ripubblica (Esegui la distribuzione → Gestisci distribuzioni → icona matita → Nuova versione → Esegui la distribuzione).

Se in salone volete che *sia Anna che Luca* ricevano le notifiche, la soluzione più semplice è creare un gruppo Telegram con il bot e entrambi dentro, e usare come `TELEGRAM_CHAT_ID` l'id del gruppo (stesso procedimento, il gruppo comparirà tra i risultati di `getUpdates` dopo che qualcuno scrive nel gruppo).

## 6. Testare che funzioni

1. Nell'editor Apps Script, seleziona la funzione `testInvio` dal menu a tendina in alto e clicca **Esegui**.
2. Controlla che arrivi l'email e/o il messaggio Telegram, e che compaia una riga di prova nel foglio "Prenotazioni".
3. Poi prova una prenotazione vera dal sito (`prenota.html`) e verifica che compaia anch'essa.

## Limiti di questa soluzione (onestamente)

Google Sheets + Apps Script è gratuito e sufficiente per un salone con questo volume di prenotazioni, ma ha dei limiti da conoscere: non c'è un vero controllo "anti doppia prenotazione" lato server (il calendario mostrato ai clienti è ancora simulato, non legge il foglio), non c'è un'interfaccia comoda per Anna e Luca oltre al foglio stesso, e non gestisce ancora le cancellazioni (il sito non ha ancora un modo per il cliente di cancellare/modificare un appuntamento). Sono i prossimi passi naturali quando il sito sarà online e vorrete rendere il sistema più robusto.
