// ============================================
// ANALIZZATORE PREVENTIVI - Backend Server
// GuidaPorteBlindate.it - v1.3 (Database Porte Blindate)
// ============================================

require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurazione Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ============================================
// CONTATORE PREVENTIVI
// ============================================
const COUNTER_FILE = './counter.json';

function getCounter() {
  try {
    if (fs.existsSync(COUNTER_FILE)) {
      const data = JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf8'));
      return data;
    }
  } catch (e) {
    console.error('Errore lettura contatore:', e);
  }
  // Default: inizia da oggi 06/01/2026
  return { count: 0, since: '06/01/2026' };
}

function incrementCounter() {
  const counter = getCounter();
  counter.count++;
  try {
    fs.writeFileSync(COUNTER_FILE, JSON.stringify(counter, null, 2));
  } catch (e) {
    console.error('Errore scrittura contatore:', e);
  }
  return counter;
}

// Endpoint per ottenere il contatore
app.get('/api/counter', (req, res) => {
  const counter = getCounter();
  res.json(counter);
});

// Configurazione upload file
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Max 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo file non supportato. Usa JPG, PNG, WEBP, GIF o PDF.'));
    }
  }
});

// ============================================
// MASTER PROMPT - Sistema di Analisi v1.3
// ============================================

const MASTER_PROMPT = `# IDENTITÀ E RUOLO

Sei l'**Esperto Tecnico Senior** di "GuidaPorteBlindate.it", un consulente indipendente specializzato in porte blindate con oltre 20 anni di esperienza nel settore.

Il tuo compito è **analizzare preventivi di porte blindate** caricati dagli utenti, confrontarli con le loro esigenze dichiarate e fornire un'analisi professionale ma comprensibile.

**Tono di voce:** Professionale, empatico, chiaro. Parli come un consulente di fiducia che vuole aiutare il cliente a fare la scelta giusta.

---

# ⚠️ REGOLA FONDAMENTALE: LETTURA PRECISA

**LEGGI ATTENTAMENTE E LETTERALMENTE** ogni parola nel preventivo. 

## ISTRUZIONI CRITICHE:
1. **NON INVENTARE** - Se un dato non è scritto, scrivi "Non specificato"
2. **NON INTERPRETARE** - Riporta ESATTAMENTE marca e modello come scritti
3. **NON CONFONDERE** marche simili:
   - "Securemme" ≠ "EVVA" (sono marche diverse!)
   - "EVO K75" è Securemme, NON EVVA
   - "ICS" è EVVA, NON Securemme
4. **LEGGI PAROLA PER PAROLA** il nome del cilindro, defender, serratura
5. **SE NON RIESCI A LEGGERE** un testo, scrivi "Testo non leggibile" invece di inventare

## PRIMA DI RISPONDERE:
- Rileggi 2 volte la sezione "Cilindro" del preventivo
- Rileggi 2 volte la sezione "Serratura" del preventivo  
- Rileggi 2 volte la sezione "Defender" del preventivo
- Trascrivi ESATTAMENTE quello che vedi scritto

---

# 🚪 DATABASE PORTE BLINDATE - PRODUTTORI E MODELLI

## DIERRE
| Modello | Classe |
|---------|--------|
| Synergy In | 3 o 4 |
| Synergy Out | 3 o 4 |
| Sentry-Evo | 3 o 4 |
| Sentry | 3 |
| Tablet | 3 |
| Five Star 5 | 5 |

## TORTEROLO & RE
| Modello | Classe |
|---------|--------|
| Gold Plus | 4 |
| Gold | 3 |
| Confort | 3 |
| Sun-Light | 3 |
| Protection | 3 |
| E-Glide | 4 |

## BAUXT
| Modello | Classe |
|---------|--------|
| Elite | 4 o 5 |
| Superior | 4 |
| Junior | 3 |
| Basic | 3 |
| F1 | 3 |
| F3 | 3 o 4 |

## VIGHI SECURITY DOORS
| Modello | Classe |
|---------|--------|
| Viguard | 4 |
| Fortia 5 | 5 |
| Top 2003 | 4 |
| Top 2001 | 3 |

## DI.BI.
| Modello | Classe |
|---------|--------|
| 884 | 4 |
| 883 | 3 |
| Poker | 3 |
| Argo | 3 |

## OIKOS VENEZIA
| Modello | Classe |
|---------|--------|
| Evolution | 3 o 4 |
| Synua | 3 |
| Nova | 3 |

## GASPEROTTI
| Modello | Classe |
|---------|--------|
| Habitat EX.70 | 3 o 4 |
| Habitat K EX.70 | 3 o 4 |
| Blindo Comfort.70 | 3 |
| Klima Gold.70 | 3 o 4 |
| Tria.70 | 3 |

## GARDESA
| Modello | Classe |
|---------|--------|
| Solid | 4 |
| Florence | 3 |
| Venice | 3 |
| Regular | 3 |
| N300 | 3 |
| Giotto | 3 |

## METALNOVA
| Modello | Classe |
|---------|--------|
| Serie 91 | 3 o 4 |
| Superclima | 3 o 4 |
| Hub | 3 |
| Motion | 3 o 4 |
| Vetra | 3 |

## MASTER
| Modello | Classe |
|---------|--------|
| Tech | 3 |
| Standard | 3 |
| Euro Sound | 3 |
| Tirare | 3 |
| Euro Plus | 3 o 4 |
| AK 47 | 3 o 4 |

## BUNKER
| Modello | Classe |
|---------|--------|
| ThermoEnergy | 3 o 4 |
| E-Lite | 3 o 4 |
| Basic | 3 |
| Kosmoinox-304 | 3 |
| Urano Glass | 3 |
| Helios Glass | 3 |

## ICA
| Modello | Classe |
|---------|--------|
| Defender | 3 |
| Stopper | 3 |
| Stopper F4 | 4 |
| Blocker | 3 |

## FAIP
| Modello | Classe |
|---------|--------|
| Extra Plus | 4 |
| Confort | 3 |
| Special Confort | 3 |
| Extreme | 5 |
| Blindovetro | 3 |

## MAESTRO (Maestro Blindati)
| Modello | Classe |
|---------|--------|
| Rotox | 4 |
| Magnum C4 | 4 |
| BPlus | 3 |
| Glass Plus | 3 |

## MISTER SHUT
| Modello | Classe |
|---------|--------|
| Maxima | 4 |
| Next | 3 |
| Biliko | 3 |

## ALIAS
| Modello | Classe |
|---------|--------|
| Steel | 3 |
| Steel Plus | 3 |
| ZTL | 3 |

## STARK
| Modello | Classe |
|---------|--------|
| Style SH4 | 4 |
| Style St7 | 4 |
| Project PR7 | 3 |

## SILVELOX
| Modello | Classe |
|---------|--------|
| Maxima | 4 |
| Sikura | 3 |

## PD PORTE BLINDATE
| Modello | Classe |
|---------|--------|
| C1 | 2 |
| A1 | 3 |
| B1 | 4 |

## STIRPARO
| Modello | Classe |
|---------|--------|
| Esse | 4 |
| Life | 3 |

## FERWALL
| Modello | Classe |
|---------|--------|
| Blindo | 3 |
| Lion | 3 |

## PIACENTINI
| Modello | Classe |
|---------|--------|
| Dolmen | 3 |

## T&T
| Modello | Classe |
|---------|--------|
| Sicur 3 | 3 |
| Sicur 4 | 4 |

---

## ⚠️ PRODUTTORI NON IN LISTA

In Italia esistono centinaia di piccoli produttori locali di porte blindate.
Se il produttore NON è nel database sopra:
1. **LEGGI la classe dal preventivo** (se indicata)
2. Se non indicata, segnala come "Classe non specificata - richiedere certificazione"
3. NON inventare la classe!

---

# DATABASE COMPONENTI

## CILINDRI - CLASSIFICAZIONE PER MARCA E MODELLO

### PREMIUM (⭐⭐⭐⭐⭐) - Richiesto per MASSIMA SICUREZZA
| Marca | Modelli |
|-------|---------|
| EVVA | MCS, 4KS |
| CISA | RS5 |
| Mottura | C55 |
| Dormakaba | Kaba Expert Cross |
| Dom | Diamant |

### ALTA SICUREZZA (⭐⭐⭐⭐)
| Marca | Modelli |
|-------|---------|
| Securemme | EVO K75, K75 Top |
| EVVA | 3KS |
| CISA | AP4 S |
| Mottura | Champions C48 Platinum, Champions C48 Gold |
| ISEO | R50 |
| AGB | Scudo DCK |
| Dormakaba | Kaba Matrix |
| Dierre | D-Up |
| KESO | 8000 |

### MEDIA SICUREZZA (⭐⭐⭐)
| Marca | Modelli |
|-------|---------|
| Securemme | EVO K64 |
| EVVA | ICS |
| CISA | RS3 S |
| Mottura | Champions C28 |
| ISEO | R7 |
| AGB | Scudo 5000 |
| Dierre | NewPower |
| KESO | 4000 |

### BASE (⭐⭐)
| Marca | Modelli |
|-------|---------|
| Securemme | EVO K22 |
| CISA | Astral Tekno PRO, Asix P80 |
| Mottura | Champions CP6 |
| ISEO | R6 |
| Dierre | R6 ISEO |

---

## DEFENDER

### PREMIUM MAGNETICO (⭐⭐⭐⭐⭐) - Richiesto per MASSIMA SICUREZZA
- Disec Mag 3G Diamond (rivestimento diamantato)
- Azzi HB Patt (rivestimento diamantato)
- Disec Mag 3G
- Mottura DF37 Magnetico

### ALTA SICUREZZA (⭐⭐⭐⭐)
- Ciperre BKL Magnetico  
- Securemme Mecdef (meccanico rotante)
- Altri defender magnetici

### BASE (⭐⭐)
- Defender cromo satinato
- Defender base anti-tubo
- Qualsiasi defender senza specifica "magnetico" o "rotante"

---

## SERRATURE

### TIPO MECCANISMO:
- **"Ingranaggi con trappola antieffrazione"** = PREMIUM ⭐⭐⭐⭐⭐ (Richiesto per MASSIMA SICUREZZA)
- **"Frizionata con trappola"** = ALTA ⭐⭐⭐⭐
- **"Frizionata"** = MEDIA ⭐⭐⭐
- **"A scatto"** = BASE ⭐⭐ (vulnerabile)
- **"Doppia mappa"** = 🔴 OBSOLETA (da sostituire!)

### PUNTI DI CHIUSURA:
- **Ganci rotanti** = PREMIUM (massima sicurezza)
- **11+ punti** = Alta sicurezza plus
- **10 punti** = Alta sicurezza
- **8 punti** = Media sicurezza
- **6 punti o meno** = Base

---

# 🎯 PROFILI DI SICUREZZA UTENTE

## SICUREZZA BASE (sicurezza_richiesta = "BASE")
**Contesto:** Condominio sicuro, zona tranquilla
**Requisiti minimi:**
- Classe: 3
- Cilindro: Base o Media
- Defender: Base OK
- Serratura: Frizionata OK

## ALTA SICUREZZA (sicurezza_richiesta = "ALTA")  
**Contesto:** Villa, zona isolata
**Requisiti minimi:**
- Classe: 3-4 (consigliata 4)
- Cilindro: Alta sicurezza (K75, 3KS, AP4S, ecc.)
- Defender: Magnetico consigliato
- Serratura: Frizionata con trappola o Ingranaggi

## MASSIMA SICUREZZA (sicurezza_richiesta = "MASSIMA")
**Contesto:** Per chi vuole il massimo della protezione
**Requisiti OBBLIGATORI:**
- Classe: **4 (obbligatoria)**
- Cilindro: **PREMIUM (EVVA MCS/4KS, CISA RS5, Mottura C55, Dom Diamant)**
- Defender: **Magnetico PREMIUM (Disec Mag 3G, DF37 Magnetico)**
- Serratura: **Ingranaggi con trappola antieffrazione (obbligatoria)**

⚠️ Se l'utente ha scelto MASSIMA SICUREZZA e il preventivo NON include TUTTI questi requisiti, segnala come CRITICITÀ GRAVE con suggerimenti di upgrade specifici.

---

# REGOLE GAP ANALYSIS

## 🔴 ERRORI GRAVI (Criticità Alta)
1. SE Utente="Villa/Esposto" E Pannello="Laminato/MDF" → "CRITICITÀ GRAVE: Pannello non adatto per esterno!"
2. SE Serratura="Doppia mappa" → "CRITICITÀ GRAVE: Tecnologia obsoleta e vulnerabile!"
3. SE Utente="MASSIMA" E Classe<4 → "CRITICITÀ: Richiesta Classe 4 per massima sicurezza!"
4. SE Utente="MASSIMA" E Cilindro≠Premium → "CRITICITÀ: Richiesto cilindro Premium per massima sicurezza!"
5. SE Utente="MASSIMA" E Defender≠Magnetico Premium → "CRITICITÀ: Richiesto defender magnetico premium!"
6. SE Utente="MASSIMA" E Serratura≠"Ingranaggi con trappola" → "CRITICITÀ: Richiesta serratura a ingranaggi con trappola!"
7. SE Classe dichiarata nel preventivo ≠ Classe nel database per quel modello → "ATTENZIONE: Verificare classe dichiarata!"

## ⚠️ AVVISI
1. SE Utente="ALTA" E Classe<4 → "Per alta sicurezza è consigliata Classe 4"
2. SE Utente="Rumore=Sì" E (dB<38 O dB non specificato) → "Isolamento acustico insufficiente o non dichiarato"
3. SE Utente="ALTA" E Cilindro=BASE → "Cilindro sottodimensionato per alta sicurezza"
4. SE Utente="ALTA" E Defender="Base" → "Per alta sicurezza consigliato defender magnetico"
5. SE Utente="Bonus Fiscali=Sì" E (Ud>1.3 O Ud non specificato) → "Verifica requisiti termici per detrazioni"
6. SE Utente="Spifferi=Sì" E Ud non specificato → "Richiedi valore trasmittanza termica"

## ✅ PUNTI POSITIVI DA EVIDENZIARE
- Serratura a ingranaggi con trappola = Ottimo!
- Cilindro Premium (MCS, 4KS, RS5, C55) = Eccellente!
- Cilindro Alta sicurezza (K75, 3KS, AP4S) = Molto buono!
- Defender magnetico premium = Ottimo!
- Classe 4 certificata = Ottimo!
- Isolamento ≥40dB = Ottimo per rumore!
- Ud ≤1.2 = Ottimo per bonus fiscali!
- Modello riconosciuto nel database = Produttore affidabile!

---

# PROFILO IDEALE RIEPILOGO

| Livello Utente | Classe | Cilindro | Defender | Serratura |
|----------------|--------|----------|----------|-----------|
| BASE | 3 | Base/Media | Base OK | Frizionata |
| ALTA | 4 | Alta (K75, 3KS, AP4S) | Magnetico | Frizionata con trappola |
| MASSIMA | 4 | **Premium (MCS, 4KS, RS5, C55)** | **Magnetico Premium** | **Ingranaggi con trappola** |

---

# OUTPUT RICHIESTO

Rispondi SEMPRE con un JSON valido con questa struttura:

{
  "client_report": "# Report in Markdown - vedi struttura sotto",
  "db_record": {
    "dealer_info": { "name": "Nome Rivenditore", "city": "Città", "province": "XX" },
    "product_id": { "manufacturer": "Marca Porta", "model": "Modello", "quote_date": "MM/YYYY o null" },
    "pricing": { "total_gross": 0.00 },
    "specs": {
      "security_class": "3 o 4 o null",
      "security_class_from_db": "Classe dal database se modello riconosciuto",
      "cylinder_brand": "MARCA ESATTA dal preventivo",
      "cylinder_model": "MODELLO ESATTO dal preventivo",
      "cylinder_tier": "premium/alta/media/base",
      "defender_type": "TIPO ESATTO dal preventivo",
      "defender_tier": "premium/alta/base",
      "lock_type": "TIPO ESATTO serratura",
      "lock_points": null,
      "panel_material": "Materiale pannello",
      "acoustic_db": null,
      "thermal_ud": null
    },
    "analysis_result": { "score": 0, "critical_errors": 0, "warnings": 0, "positives": 0 }
  }
}

---

# STRUTTURA CLIENT_REPORT (Markdown)

## Analisi Preventivo [Marca] - [Modello se presente]

### 📊 Punteggio Complessivo: X/10
[Breve motivazione del punteggio basata sul livello di sicurezza richiesto]
[Se modello riconosciuto nel database, menzionalo come punto positivo]

### ✅ Cosa Va Bene
- [Elenco punti positivi REALI trovati nel preventivo]
- [Cita i componenti con marca e modello ESATTI]
- [Se produttore/modello nel database: "Produttore riconosciuto - Classe X confermata"]

### ⚠️ Criticità Rilevate
**ALTA PRIORITÀ:**
1. [Criticità grave - specialmente se non soddisfa i requisiti del livello scelto]
2. [Se classe dichiarata diversa da database: segnalare discrepanza]

**DA VALUTARE:**
1. [Avvisi meno gravi]

### 💡 Raccomandazioni Finali
[Consigli specifici basati sul livello di sicurezza scelto dall'utente]
[Se MASSIMA SICUREZZA: elenca esattamente cosa manca per raggiungere quel livello]
[Stima costi upgrade se applicabile]

---

# IMPORTANTE - PRIVACY GDPR

**NON ESTRARRE MAI:**
- Nome/Cognome del cliente
- Indirizzo completo (via, numero civico)
- Numero di telefono
- Email

**ESTRAI SOLO:**
- Nome azienda rivenditrice
- Città e provincia del rivenditore
- Dati tecnici e prezzi`;

// ============================================
// API ENDPOINT - Analisi Preventivo
// ============================================

// Supporta sia singolo file che multipli per analisi
const uploadMultipleAnalisi = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }
}).fields([
  { name: 'preventivo', maxCount: 1 },
  { name: 'preventivi', maxCount: 10 }
]);

app.post('/api/analizza', uploadMultipleAnalisi, async (req, res) => {
  try {
    console.log('📥 Richiesta ANALISI FINALE ricevuta');
    
    const isMultiple = req.body.isMultiple === 'true';
    let files = [];
    
    if (isMultiple && req.files['preventivi']) {
      files = req.files['preventivi'];
      console.log(`📄 ${files.length} immagini ricevute per analisi`);
    } else if (req.files['preventivo']) {
      files = req.files['preventivo'];
      console.log('📄 1 file ricevuto per analisi');
    } else {
      return res.status(400).json({ error: 'Nessun file caricato' });
    }

    // Verifica contesto utente
    let userContext;
    try {
      userContext = JSON.parse(req.body.userContext || '{}');
    } catch (e) {
      return res.status(400).json({ error: 'Contesto utente non valido' });
    }

    // Dati verificati dall'utente (Step 6)
    let verifiedData;
    try {
      verifiedData = JSON.parse(req.body.verifiedData || '{}');
    } catch (e) {
      verifiedData = {};
    }

    console.log('📋 Contesto utente:', userContext);
    console.log('✅ Dati verificati:', verifiedData);

    // Costruisci array di contenuti per Claude
    const contentArray = [];
    
    for (const file of files) {
      const base64Image = file.buffer.toString('base64');
      contentArray.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: file.mimetype,
          data: base64Image,
        },
      });
    }

    // Traduci il livello di sicurezza per il prompt
    const sicurezzaDescriptions = {
      'BASE': 'SICUREZZA BASE - Condominio sicuro, zona tranquilla. Requisiti: Classe 3, cilindro base/media, defender base OK.',
      'ALTA': 'ALTA SICUREZZA - Villa, zona isolata. Requisiti: Classe 4 consigliata, cilindro alta sicurezza (K75, 3KS, AP4S), defender magnetico consigliato.',
      'MASSIMA': 'MASSIMA SICUREZZA - Vuole il massimo della protezione. Requisiti OBBLIGATORI: Classe 4, cilindro PREMIUM (EVVA MCS/4KS, CISA RS5, Mottura C55), defender magnetico PREMIUM, serratura a INGRANAGGI CON TRAPPOLA.'
    };

    const sicurezzaDesc = sicurezzaDescriptions[userContext.sicurezza_richiesta] || 'Non specificato';

    // Costruisci il prompt con i dati GIÀ VERIFICATI dall'utente
    const userPrompt = `## CONTESTO UTENTE (dal wizard)

**Abitazione:** ${userContext.abitazione}
**Esposizione:** ${userContext.esposizione}
**Livello Sicurezza Richiesto:** ${sicurezzaDesc}
**Problemi di rumore:** ${userContext.rumore ? 'Sì' : 'No'}
**Problemi di spifferi:** ${userContext.spifferi ? 'Sì' : 'No'}
**Interesse Bonus Fiscali:** ${userContext.bonus_fiscali ? 'Sì' : 'No'}

---

## ✅ DATI PREVENTIVO VERIFICATI DALL'UTENTE

L'utente ha già verificato e confermato questi dati estratti dal preventivo:

- **Marca Porta:** ${verifiedData.brand || 'Non specificato'}
- **Modello:** ${verifiedData.model || 'Non specificato'}
- **Classe Antieffrazione:** ${verifiedData.security_class ? 'Classe ' + verifiedData.security_class : 'Non specificata'}
- **Serratura:** ${verifiedData.lock_type || 'Non specificata'}
- **Cilindro:** ${verifiedData.cylinder || 'Non specificato'}
- **Defender:** ${verifiedData.defender || 'Non specificato'}
- **Prezzo:** ${verifiedData.price ? '€' + verifiedData.price : 'Non specificato'}

⚠️ USA QUESTI DATI VERIFICATI per la tua analisi. Non tentare di ri-leggere il preventivo, fidati dei dati forniti sopra.

---

## COMPITO

Basandoti sui DATI VERIFICATI sopra e sul LIVELLO DI SICUREZZA RICHIESTO dall'utente:

1. Valuta se il preventivo soddisfa le esigenze dell'utente
2. Identifica criticità e punti positivi
3. Fornisci raccomandazioni specifiche

Restituisci SOLO un JSON valido con:
- "client_report": analisi in Markdown per il cliente
- "db_record": dati per il database`;

    // Aggiungi il prompt all'array di contenuti
    contentArray.push({
      type: 'text',
      text: userPrompt,
    });

    console.log(`🤖 Invio richiesta analisi finale a Claude (${files.length} immagini)...`);

    // Chiamata API Claude
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: contentArray,
        },
      ],
      system: MASTER_PROMPT,
    });

    console.log('✅ Risposta analisi ricevuta da Claude');
    console.log('📊 Token usati - Input:', message.usage.input_tokens, 'Output:', message.usage.output_tokens);

    // Estrai la risposta
    const responseText = message.content[0].text;
    
    // Prova a parsare il JSON dalla risposta
    let analysisResult;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('JSON non trovato nella risposta');
      }
    } catch (parseError) {
      console.error('⚠️ Errore parsing JSON, restituisco testo raw');
      analysisResult = {
        client_report: responseText,
        db_record: null,
        parse_error: true
      };
    }

    // Aggiungi info sui token usati
    analysisResult.usage = {
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
      estimated_cost: (message.usage.input_tokens * 0.003 / 1000) + (message.usage.output_tokens * 0.015 / 1000)
    };

    // Incrementa contatore preventivi analizzati
    const counter = incrementCounter();
    console.log('📈 Preventivi analizzati totali:', counter.count);

    // Salva nel database (chiamata asincrona, non blocca la risposta)
    try {
      const dbData = {
        provincia: userContext.provincia || null,
        abitazione: userContext.abitazione || null,
        esposizione: userContext.esposizione || null,
        sicurezza_richiesta: userContext.sicurezza_richiesta || null,
        brand: verifiedData.brand || null,
        model: verifiedData.model || null,
        security_class: verifiedData.security_class || null,
        lock_type: verifiedData.lock_type || null,
        cylinder: verifiedData.cylinder || null,
        defender: verifiedData.defender || null,
        price: verifiedData.price || null,
        punteggio: analysisResult.db_record?.punteggio_conformita || null
      };
      
      fetch('https://www.guidaporteblindate.it/api-salva-preventivo.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': 'GPB_2026_SecretKey_Osservatorio'
        },
        body: JSON.stringify(dbData)
      })
      .then(resp => resp.json())
      .then(result => console.log('💾 Salvato nel DB:', result))
      .catch(err => console.error('⚠️ Errore salvataggio DB:', err.message));
    } catch (dbError) {
      console.error('⚠️ Errore preparazione dati DB:', dbError.message);
    }

    res.json(analysisResult);

  } catch (error) {
    console.error('❌ Errore:', error);
    res.status(500).json({ 
      error: 'Errore durante l\'analisi', 
      details: error.message 
    });
  }
});

// ============================================
// API ENDPOINT - Estrazione Dati (Step intermedio)
// ============================================

// Supporta sia singolo file che multipli
const uploadMultiple = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }
}).fields([
  { name: 'preventivo', maxCount: 1 },
  { name: 'preventivi', maxCount: 10 }
]);

app.post('/api/estrai', uploadMultiple, async (req, res) => {
  try {
    console.log('📥 Richiesta ESTRAZIONE dati ricevuta');
    
    const isMultiple = req.body.isMultiple === 'true';
    let files = [];
    
    if (isMultiple && req.files['preventivi']) {
      files = req.files['preventivi'];
      console.log(`📄 ${files.length} immagini ricevute (separate)`);
    } else if (req.files['preventivo']) {
      files = req.files['preventivo'];
      console.log('📄 1 file ricevuto');
    } else {
      return res.status(400).json({ error: 'Nessun file caricato' });
    }

    // Costruisci array di contenuti per Claude
    const contentArray = [];
    
    for (const file of files) {
      const base64Image = file.buffer.toString('base64');
      contentArray.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: file.mimetype,
          data: base64Image,
        },
      });
    }
    
    // Aggiungi il prompt alla fine
    const extractionPrompt = `Estrai i dati da questo preventivo di porta blindata.

${files.length > 1 ? `ATTENZIONE: Il preventivo è composto da ${files.length} IMMAGINI/PAGINE. Analizzale TUTTE.` : ''}

REGOLE:
- Scrivi SOLO quello che è scritto chiaramente
- Se un dato NON c'è, scrivi null
- NON inventare nulla

TROVA:
1. PRODUTTORE: Dierre, Metalnova, Alias, Gardesa, Maestro, Oikos, Bauxt, Gasperotti, Vighi, Torterolo, Bunker, Stark, ecc.
2. MODELLO: nome/codice del modello (es: Tablet Plus, 91 DOM, Steel, Synergy, BPlus)
3. CLASSE: 3, 4 o 5 (cerca "classe 3", "classe tre", "classe 4", ecc.)
4. SERRATURA: tipo (ingranaggi, frizionata, automatica, a scatto)
5. CILINDRO: marca e modello SE specificati (es: Securemme K75, EVVA MCS, D-UP). Se dice solo "cilindro europeo" scrivi null
6. DEFENDER: 
   - Se dice "magnetico" o "Disec" o "Mecdef" → scrivi "Magnetico"
   - Se dice solo colore (cromo, bronzo, satinato) → scrivi "Base"
   - Se non specificato → null
7. PREZZO: il totale finale in euro (numero senza €)

Rispondi SOLO con questo JSON:
{"brand":"...","model":"...","security_class":"...","lock_type":"...","cylinder":"...","defender":"...","price":"..."}`;

    contentArray.push({
      type: 'text',
      text: extractionPrompt,
    });

    console.log(`🤖 Invio richiesta estrazione a Claude Sonnet (${files.length} immagini)...`);

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: contentArray,
        },
      ],
    });

    console.log('✅ Risposta estrazione ricevuta');
    console.log('📊 Token usati - Input:', message.usage.input_tokens, 'Output:', message.usage.output_tokens);

    const responseText = message.content[0].text;
    
    let extracted;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('JSON non trovato');
      }
    } catch (parseError) {
      console.error('⚠️ Errore parsing JSON estrazione');
      extracted = {
        brand: null,
        model: null,
        security_class: null,
        lock_type: null,
        cylinder: null,
        defender: null,
        price: null
      };
    }

    res.json({ 
      extracted,
      usage: {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens
      }
    });

  } catch (error) {
    console.error('❌ Errore estrazione:', error);
    res.status(500).json({ 
      error: 'Errore durante l\'estrazione', 
      details: error.message,
      extracted: null
    });
  }
});

// Endpoint di test
app.get('/api/test', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server Analizzatore Preventivi v1.4 funzionante!',
    version: '1.4 - Immagini Multiple Separate',
    timestamp: new Date().toISOString()
  });
});

// Avvia server
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 ==========================================');
  console.log('   ANALIZZATORE PREVENTIVI v1.3');
  console.log('   (Database Porte Blindate)');
  console.log('   ==========================================');
  console.log('');
  console.log('   🌐 Apri nel browser: http://localhost:' + PORT);
  console.log('   📡 API endpoint: http://localhost:' + PORT + '/api/analizza');
  console.log('');
  console.log('   🚪 Produttori in database: 22');
  console.log('   🔒 Livelli sicurezza: BASE | ALTA | MASSIMA');
  console.log('');
  console.log('   Premi Ctrl+C per fermare il server');
  console.log('');
});
