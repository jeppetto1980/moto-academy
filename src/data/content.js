// Tutti i testi dell'app in un unico posto: per correggere o aggiungere contenuti basta modificare qui.

export const CHAPTERS = [
  { id: 'mappa', n: 1, title: 'La moto vista da fuori', subtitle: 'Tocca le parti e scopri cosa fanno', icon: '🏍️', ready: true },
  { id: 'motore', n: 2, title: 'Il motore a 4 tempi', subtitle: 'Aspirazione, compressione, scoppio, scarico', icon: '⚙️', ready: true },
  { id: 'distribuzione', n: 3, title: 'Valvole e bialbero', subtitle: 'Monoalbero, bialbero, 2 o 4 valvole', icon: '🔩', ready: true },
  { id: 'alimentazione', n: 4, title: 'Carburatore e iniezione', subtitle: 'Come aria e benzina si mescolano', icon: '⛽', ready: true },
  { id: 'accensione', n: 5, title: 'Accensione', subtitle: 'Candela, bobina, centralina', icon: '⚡', ready: true },
  { id: 'raffreddamento', n: 6, title: 'Olio e raffreddamento', subtitle: 'Perché il motore non fonde', icon: '💧', ready: true },
  { id: 'cambio', n: 7, title: 'Frizione e cambio', subtitle: 'Rapporti, folle e cambio sequenziale', icon: '🕹️', ready: true },
  { id: 'trasmissione', n: 8, title: 'Catena, pignone e corona', subtitle: 'Dal cambio alla ruota', icon: '⛓️', ready: true },
  { id: 'ciclistica', n: 9, title: 'Telaio, freni e sospensioni', subtitle: 'Tutto quello che non è motore', icon: '🛞', ready: true },
  { id: 'manutenzione', n: 10, title: 'Controlli prima di partire', subtitle: 'La checklist del pilota', icon: '🧰', ready: true },
]

// Parti toccabili nella home 3D
export const PARTS = {
  motore: {
    name: 'Motore',
    text: 'È il cuore della moto: brucia aria e benzina e trasforma l’energia dell’esplosione in rotazione.',
    chapter: 'motore',
  },
  cambio: {
    name: 'Frizione e cambio',
    text: 'Stanno dietro al motore, nello stesso blocco. Scelgono quanta spinta e quanta velocità mandare alla ruota.',
    chapter: 'cambio',
  },
  alimentazione: {
    name: 'Carburatore / iniezione',
    text: 'Prepara la miscela di aria e benzina da mandare al motore. Le moto nuove usano quasi tutte l’iniezione elettronica.',
    chapter: 'alimentazione',
  },
  catena: {
    name: 'Catena',
    text: 'Porta la rotazione dal pignone (uscita del cambio) alla corona montata sulla ruota posteriore.',
    chapter: 'trasmissione',
  },
  radiatore: {
    name: 'Radiatore',
    text: 'Questo motore è raffreddato a liquido: il liquido passa nel motore, si scalda e poi si raffredda nel radiatore grazie all’aria che lo attraversa.',
    chapter: 'raffreddamento',
  },
  serbatoio: {
    name: 'Serbatoio',
    text: 'Contiene la benzina. Sotto c’è spesso la pompa che la manda all’iniezione.',
    chapter: 'alimentazione',
  },
  scarico: {
    name: 'Scarico',
    text: 'Porta via i gas bruciati. Dentro ci sono il catalizzatore, che riduce le sostanze inquinanti, e il silenziatore.',
    chapter: 'motore',
  },
  forcella: {
    name: 'Forcella',
    text: 'È la sospensione anteriore: due steli con molle e olio che assorbono le buche e tengono la ruota a terra.',
    chapter: 'ciclistica',
  },
  freni: {
    name: 'Freni a disco',
    text: 'La pinza stringe il disco con le pastiglie. Il freno anteriore fa la maggior parte del lavoro di frenata.',
    chapter: 'ciclistica',
  },
  mono: {
    name: 'Mono-ammortizzatore',
    text: 'È la sospensione posteriore: una molla con un ammortizzatore che collega il telaio al forcellone.',
    chapter: 'ciclistica',
  },
}

// I 4 tempi: angolo dell'albero motore da 0° a 720° (2 giri)
export const PHASES = [
  { id: 0, name: 'Aspirazione', color: '#3aa0ff', short: 'Il pistone scende e risucchia aria e benzina.' },
  { id: 1, name: 'Compressione', color: '#a46bff', short: 'Valvole chiuse: il pistone sale e schiaccia la miscela.' },
  { id: 2, name: 'Scoppio', color: '#ff6a1a', short: 'La candela fa la scintilla: l’esplosione spinge giù il pistone.' },
  { id: 3, name: 'Scarico', color: '#9aa3b2', short: 'Il pistone risale e spinge fuori i gas bruciati.' },
]

export const ENGINE_STEPS = [
  {
    title: 'Il cuore della moto',
    body: 'Il motore della moto è un motore **a combustione interna**: dentro un cilindro brucia una miscela di aria e benzina. L’esplosione spinge un pistone e questa spinta diventa la rotazione che muove la ruota.\n\nTrascina il modello con il dito per girarlo.',
    mode: { type: 'run', rpm: 1500 },
    highlight: [],
  },
  {
    title: 'Pistone, biella e albero motore',
    body: 'Il **pistone** va su e giù nel cilindro. La **biella** lo collega all’**albero motore**, che invece gira.\n\nÈ come pedalare in bici: le gambe spingono su e giù e i pedali girano in tondo. Il punto più alto del pistone si chiama **PMS** (Punto Morto Superiore), quello più basso **PMI** (Punto Morto Inferiore).',
    mode: { type: 'run', rpm: 1200 },
    highlight: ['pistone', 'biella', 'albero'],
  },
  {
    title: '1° tempo – Aspirazione',
    body: 'La **valvola di aspirazione** (blu) si apre e il pistone scende dal PMS al PMI. Come una siringa che si riempie, risucchia nel cilindro la **miscela di aria e benzina**.',
    mode: { type: 'phase', phase: 0 },
    highlight: ['valvolaAsp'],
  },
  {
    title: '2° tempo – Compressione',
    body: 'Entrambe le valvole sono **chiuse**. Il pistone risale e schiaccia la miscela in uno spazio piccolissimo, la **camera di combustione**.\n\nPiù la miscela è compressa, più forte sarà l’esplosione.',
    mode: { type: 'phase', phase: 1 },
    highlight: ['pistone'],
  },
  {
    title: '3° tempo – Scoppio',
    body: 'Appena prima del PMS la **candela** fa una scintilla. La miscela brucia in un attimo, i gas si espandono e **spingono il pistone verso il basso** con grande forza.\n\nÈ l’unico dei 4 tempi che produce energia: gli altri tre servono a prepararlo.',
    mode: { type: 'phase', phase: 2 },
    highlight: ['candela'],
  },
  {
    title: '4° tempo – Scarico',
    body: 'La **valvola di scarico** (rossa) si apre e il pistone risale, spingendo fuori i gas bruciati verso la marmitta. Poi il ciclo ricomincia.\n\nI 4 tempi in tutto richiedono **2 giri completi** dell’albero motore.',
    mode: { type: 'phase', phase: 3 },
    highlight: ['valvolaSca'],
  },
  {
    title: 'Tutto insieme',
    body: 'Ora il motore gira. Muovi i **giri** e accendi il **suono** 🔊.\n\nA 9.000 giri al minuto il ciclo si ripete 75 volte al secondo: troppo veloce per l’occhio, per questo qui l’animazione è **rallentata**.',
    mode: { type: 'free' },
    highlight: [],
  },
  {
    title: 'Cosa vuol dire “bialbero”',
    body: 'Le valvole sono aperte dagli **alberi a camme**: alberi con delle “gobbe” (le camme) che, girando, spingono giù le valvole al momento giusto.\n\n**Bialbero** (in inglese DOHC) vuol dire che ci sono **due alberi a camme in testa**: uno per l’aspirazione e uno per lo scarico. Gli alberi a camme girano a **metà velocità** dell’albero motore, perché ogni valvola si apre una volta ogni 2 giri.',
    mode: { type: 'run', rpm: 1000 },
    highlight: ['camme'],
  },
]

export const GEARBOX_STEPS = [
  {
    title: 'Perché serve il cambio',
    body: 'Il motore lavora bene solo in un certo intervallo di giri, ad esempio tra 3.000 e 10.000. Senza cambio la moto potrebbe solo partire piano **oppure** andare veloce, non tutte e due le cose.\n\nIl cambio cambia il **rapporto** tra i giri del motore e quelli della ruota.',
    demo: { gear: 3, throttle: 0.4, clutch: false },
  },
  {
    title: 'Due alberi e tante coppie di ingranaggi',
    body: 'Nel cambio della moto ci sono due alberi: il **primario** (sopra), che riceve il moto dal motore, e il **secondario** (sotto), che lo manda alla catena.\n\nOgni marcia è una **coppia di ingranaggi**. Sono sempre tutti ingranati, ma solo quella evidenziata in arancione è **bloccata** sull’albero e trasmette il moto.',
    demo: { gear: 2, throttle: 0.3, clutch: false },
  },
  {
    title: 'La frizione',
    body: 'La **frizione** è un pacco di dischi stretti tra loro da molle. Quando tiri la leva i dischi si separano e il motore si “stacca” dal cambio.\n\nServe per **partire** senza far spegnere il motore e per **cambiare marcia** senza rovinare gli ingranaggi.',
    demo: { gear: 1, throttle: 0.2, clutch: 'pulse' },
  },
  {
    title: 'Prima contro quinta',
    body: 'In **prima** un ingranaggio piccolo muove uno grande: il motore fa tanti giri per ogni giro della ruota → **tanta spinta, poca velocità**.\n\nIn **quinta** gli ingranaggi sono quasi uguali → **poca spinta, tanta velocità**. Guarda come cambia la velocità dell’albero secondario.',
    demo: { gear: 'cycle', throttle: 0.5, clutch: false },
  },
  {
    title: 'Il cambio sequenziale: 1-N-2-3-4-5',
    body: 'Sulla moto le marce si cambiano **una alla volta**, con il piede: leva giù per la **prima**, su per tutte le altre.\n\nLa **folle (N)** sta tra prima e seconda. Da folle: leva **giù** → prima, leva **su** → seconda. Per trovare la folle partendo dalla prima basta una **mezza spinta verso l’alto**.',
    demo: { gear: 'sequence', throttle: 0.3, clutch: false },
  },
  {
    title: 'Prova tu!',
    body: 'Ora guidi tu. Metti la **prima** (pedale ▼ oppure i pulsanti delle marce), dai **gas** e guarda contagiri e velocità salire. Quando i giri arrivano in alto, passa alla marcia successiva con ▲: vedrai i giri scendere e la velocità continuare a salire.\n\nPer fare le cose come sulla moto vera, tira la **frizione** prima di cambiare: tienila premuta oppure toccala una volta per bloccarla. Puoi anche toccare i numeri delle marce nel disegno 3D.\n\nSe resti in una marcia troppo alta da fermo, il motore si spegne: il simulatore te lo dice.',
    demo: null,
  },
]

export const QUIZ = {
  motore: [
    {
      q: 'Quanti giri fa l’albero motore per completare i 4 tempi?',
      a: ['Mezzo giro', '1 giro', '2 giri', '4 giri'],
      ok: 2,
      why: 'Ogni tempo corrisponde a una corsa del pistone (mezzo giro): 4 corse = 2 giri.',
    },
    {
      q: 'In quale tempo il pistone viene spinto verso il basso dalla combustione?',
      a: ['Aspirazione', 'Compressione', 'Scoppio', 'Scarico'],
      ok: 2,
      why: 'Nello scoppio (o espansione) i gas caldi spingono il pistone: è l’unico tempo che produce lavoro.',
    },
    {
      q: 'Durante la compressione, le valvole sono…',
      a: ['Tutte e due aperte', 'Tutte e due chiuse', 'Aperta solo l’aspirazione', 'Aperta solo lo scarico'],
      ok: 1,
      why: 'Se una valvola fosse aperta la miscela scapperebbe e non si comprimerebbe.',
    },
    {
      q: 'A cosa serve la biella?',
      a: [
        'A chiudere le valvole',
        'A trasformare il su e giù del pistone nella rotazione dell’albero motore',
        'A raffreddare il cilindro',
        'A portare la benzina al motore',
      ],
      ok: 1,
      why: 'Biella e albero motore funzionano come gambe e pedali della bici.',
    },
    {
      q: 'Un motore “bialbero” ha…',
      a: [
        'Due cilindri',
        'Due alberi motore',
        'Due alberi a camme in testa: uno per l’aspirazione e uno per lo scarico',
        'Due candele',
      ],
      ok: 2,
      why: 'Bialbero (DOHC) si riferisce agli alberi a camme, non al numero di cilindri.',
    },
    {
      q: 'Rispetto all’albero motore, l’albero a camme gira…',
      a: ['Alla stessa velocità', 'A metà velocità', 'Al doppio della velocità', 'Solo quando si accelera'],
      ok: 1,
      why: 'Ogni valvola si apre una volta ogni 2 giri dell’albero motore, quindi le camme fanno 1 giro ogni 2.',
    },
  ],
  cambio: [
    {
      q: 'A cosa serve la frizione?',
      a: [
        'A frenare la moto',
        'A staccare il motore dal cambio per partire e cambiare marcia',
        'A dare più potenza',
        'A raffreddare il cambio',
      ],
      ok: 1,
      why: 'Separando i dischi, il motore gira senza trascinare il cambio.',
    },
    {
      q: 'Qual è lo schema tipico di un cambio da moto a 5 marce?',
      a: ['N-1-2-3-4-5', '1-2-3-4-5-N', '1-N-2-3-4-5', '1-2-N-3-4-5'],
      ok: 2,
      why: 'La folle sta tra prima e seconda: giù per la prima, su per le altre.',
    },
    {
      q: 'In prima, rispetto alla quinta, la moto ha…',
      a: ['Più spinta e meno velocità', 'Meno spinta e più velocità', 'Le stesse prestazioni', 'Meno spinta e meno velocità'],
      ok: 0,
      why: 'Il rapporto corto moltiplica la forza ma limita la velocità massima.',
    },
    {
      q: 'Un rapporto di 2,8 in prima significa che…',
      a: [
        'L’albero primario fa 2,8 giri per ogni giro del secondario',
        'La moto va a 2,8 km/h',
        'Ci sono 2,8 ingranaggi',
        'Il secondario fa 2,8 giri per ogni giro del primario',
      ],
      ok: 0,
      why: 'Il rapporto dice quanti giri fa l’ingranaggio che spinge per ogni giro di quello spinto.',
    },
    {
      q: 'Perché una moto ha bisogno del cambio?',
      a: [
        'Perché il motore funziona bene solo in un intervallo di giri',
        'Per fare più rumore',
        'Per consumare meno olio',
        'Perché la catena è troppo corta',
      ],
      ok: 0,
      why: 'Il cambio tiene il motore nei giri giusti a qualunque velocità.',
    },
    {
      q: 'Nel cambio di una moto gli ingranaggi delle varie marce…',
      a: [
        'Si ingranano solo quando li selezioni',
        'Sono sempre ingranati, ma solo uno per volta è bloccato sull’albero',
        'Sono uno solo che cambia dimensione',
        'Sono collegati con delle cinghie',
      ],
      ok: 1,
      why: 'Si chiama cambio a ingranaggi sempre in presa: i “manicotti” bloccano la coppia scelta.',
    },
  ],
}

export const GLOSSARY_RAW = [
  ['Anticipo', 'La scintilla scocca un po’ prima del PMS, perché la combustione ha bisogno di tempo per svilupparsi.'],
  ['Bilanciere', 'Piccola leva che, nel monoalbero, trasmette il movimento dalla camma alla valvola.'],
  ['Bobina', 'Trasformatore che porta i 12 volt della batteria a decine di migliaia di volt per la candela.'],
  ['Fasatura', 'Il momento esatto in cui ogni valvola si apre e si chiude rispetto alla posizione del pistone.'],
  ['Gioco valvole', 'Piccolissimo spazio tra camma e punteria a valvola chiusa; serve perché il metallo si dilata col calore.'],
  ['Incrocio valvole', 'L’attimo in cui valvola di aspirazione e di scarico sono aperte insieme, per riempire meglio il cilindro.'],
  ['Miscela grassa / magra', 'Grassa: troppa benzina rispetto all’aria. Magra: troppa aria.'],
  ['Pick-up', 'Sensore che legge un dentino sul volano e dice alla centralina dove si trova il pistone.'],
  ['Punteria', 'Cappellotto tra camma e valvola che riceve la spinta della camma.'],
  ['Sonda lambda', 'Sensore nello scarico che misura l’ossigeno rimasto e aiuta la centralina a correggere la miscela.'],
  ['Stechiometrico', 'Il rapporto ideale aria/benzina, circa 14,7 a 1 in peso.'],
  ['Termostato', 'Valvola che tiene il liquido lontano dal radiatore finché il motore non è caldo.'],
  ['Venturi', 'Strozzatura del carburatore dove l’aria accelera e la pressione scende, risucchiando la benzina.'],
  ['Viscosità', 'Quanto un olio è denso. In 10W-40 il primo numero indica il comportamento a freddo, il secondo a caldo.'],
  ['Albero a camme', 'Albero con delle gobbe (camme) che aprono e chiudono le valvole al momento giusto.'],
  ['Albero motore', 'Detto anche albero a gomiti: trasforma la spinta del pistone in rotazione.'],
  ['Alesaggio', 'Il diametro del cilindro.'],
  ['Bialbero (DOHC)', 'Due alberi a camme in testa: uno per l’aspirazione e uno per lo scarico.'],
  ['Biella', 'L’asta che collega il pistone all’albero motore.'],
  ['Candela', 'Produce la scintilla che accende la miscela.'],
  ['Cilindrata', 'Il volume “spazzato” dal pistone tra PMI e PMS, in cm³ (es. 125 cc).'],
  ['Coppia', 'La forza con cui il motore fa girare l’albero. Si misura in Nm: è la “spinta” che senti.'],
  ['Corsa', 'La distanza che il pistone percorre tra PMS e PMI.'],
  ['Folle (N)', 'Nessuna marcia inserita: il motore gira ma la ruota non riceve il moto.'],
  ['Frizione', 'Pacco di dischi che collega o separa motore e cambio.'],
  ['Giri/min (rpm)', 'Quante volte al minuto gira l’albero motore. Si leggono sul contagiri.'],
  ['Iniezione', 'Sistema elettronico che spruzza la benzina nella quantità esatta. Ha sostituito il carburatore.'],
  ['Limitatore', 'Taglia l’accensione o la benzina quando il motore supera i giri massimi.'],
  ['Monoalbero (SOHC)', 'Un solo albero a camme in testa che comanda sia l’aspirazione sia lo scarico.'],
  ['PMS / PMI', 'Punto Morto Superiore e Inferiore: i punti dove il pistone si ferma e inverte il movimento.'],
  ['Potenza', 'Quanto lavoro il motore fa in un certo tempo: è legata alla coppia e ai giri. Si misura in kW o CV.'],
  ['Rapporto', 'Quanti giri fa un ingranaggio per ogni giro dell’altro.'],
  ['Testata', 'La parte alta del motore, chiude il cilindro e contiene valvole e alberi a camme.'],
  ['Valvola', 'Una specie di tappo a fungo che apre e chiude i condotti di aspirazione e scarico.'],
]

export const GLOSSARY = [...GLOSSARY_RAW].sort((a, b) => a[0].localeCompare(b[0], 'it'))
