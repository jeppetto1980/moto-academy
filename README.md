# 🏍️ Moto Academy

App web per ragazzi (15–17 anni) che spiega come funziona una moto con modelli 3D animati.

## Cosa contiene
- **Home 3D**: moto naked originale in un'officina con luci a spot, punti da toccare sulle parti, scelta del colore
- **10 capitoli** con passaggi animati in 3D, etichette a richiamo e narratore vocale:
  1. La moto vista da fuori · 2. Motore a 4 tempi · 3. Valvole e bialbero · 4. Carburatore e iniezione · 5. Accensione
  6. Olio e raffreddamento · 7. Frizione e cambio (con simulatore) · 8. Catena, pignone e corona · 9. Telaio, freni e sospensioni · 10. Controlli prima di partire
- Quiz a fine capitolo, badge, checklist del pilota e "Patentino da meccanico"
- Glossario, tema chiaro/scuro, suono del motore, installabile sul telefono (PWA) e utilizzabile offline

## Avviarla sul computer
```bash
npm install
npm run dev
```

## Pubblicarla su GitHub Pages
1. Carica il progetto in un repository GitHub (branch `main`)
2. Su GitHub: **Settings → Pages → Source: GitHub Actions**
3. Ad ogni push l'app viene pubblicata in automatico su `https://<utente>.github.io/<nome-repo>/`

## Dove modificare i contenuti
Tutti i testi (passaggi, quiz, glossario, descrizioni delle parti) sono in `src/data/content.js`.

## Struttura
```
src/
  data/content.js        testi, quiz, glossario
  scenes/                modelli 3D (moto, motore, cambio)
  chapters/              schermate dei capitoli
  components/            interfaccia comune (quiz, contagiri, stage 3D)
  lib/                   suono del motore e salvataggio progressi
```

Tecnologie: React, Three.js (react-three-fiber), Framer Motion, Vite.
I valori tecnici del simulatore (rapporti, coppia, velocità) sono indicativi di una 125 cc e servono a scopo didattico.
