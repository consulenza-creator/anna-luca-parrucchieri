# Pubblicare il sito online con GitHub Pages — guida pratica

Il sito è statico (solo HTML/CSS/JS), quindi GitHub Pages è perfetto: gratuito, HTTPS incluso automaticamente, nessun server da gestire.

## 1. Creare l'account GitHub

Vai su [github.com](https://github.com) e crea un account gratuito (email + password). Consiglio un account dedicato al salone, es. legato alla stessa mail Google/gestionale che create per Firebase, così il progetto resta di proprietà di Anna & Luca e non di un account personale.

## 2. Installare GitHub Desktop (niente riga di comando)

Scarica [GitHub Desktop](https://desktop.github.com) (gratuito, Windows) e fai login con l'account appena creato.

## 3. Collegare la cartella del progetto

1. Apri GitHub Desktop → **File → Add Local Repository**.
2. Seleziona questa cartella: `Sito web + prenotatore Anna & Luca`.
3. Se ti chiede "questa cartella non è un repository Git, vuoi crearne uno?" → clicca **create a repository**.
4. Nome repository suggerito: `anna-luca-parrucchieri`.
5. Clicca **Publish repository**. Lascia **Public** spuntato (necessario per usare GitHub Pages gratis) — non contiene dati sensibili, solo codice del sito.

## 4. Attivare GitHub Pages

1. Vai su github.com, apri il repository appena creato.
2. **Settings → Pages** (menu a sinistra).
3. In "Build and deployment" → Source: **Deploy from a branch**.
4. Branch: **main**, cartella: **/ (root)** → **Save**.
5. Dopo 1-2 minuti il sito è live su:
   `https://[tuo-username].github.io/anna-luca-parrucchieri/`

## 5. Pubblicare aggiornamenti futuri

Ogni volta che il sito viene modificato (da me o da te): apri GitHub Desktop, vedrai le modifiche elencate, scrivi una breve descrizione in basso a sinistra, clicca **Commit to main**, poi **Push origin** in alto. Dopo 1-2 minuti il sito online si aggiorna da solo.

## 6. Dominio personalizzato (quando deciderete di comprarlo)

Quando acquistate un dominio (es. `annalucaparrucchieri.it`): Settings → Pages → **Custom domain**, inserite il dominio, e nel pannello DNS del provider del dominio aggiungete un record CNAME che punta a `[tuo-username].github.io`. GitHub genera il certificato HTTPS automaticamente, gratis.

## Nota sul gestionale (`/gestionale`)

Anche il pannello gestionale viene pubblicato insieme al sito (è nella stessa cartella). Essendo pubblico su GitHub Pages, chiunque conosca l'URL `/gestionale/` può raggiungere la schermata di login — è protetta da vera autenticazione Firebase (email/password di Anna e Luca) e i dati sono protetti dalle regole di sicurezza Firestore già pubblicate. Nessun blocco rimasto su questo fronte.
