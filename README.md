# Analizzatore Preventivi Porte Blindate

Strumento di analisi preventivi per [GuidaPorteBlindate.it](https://www.guidaporteblindate.it)

## Funzionalità
- Analisi automatica preventivi (immagini e PDF)
- Confronto fino a 3 preventivi
- Verifica componenti (cilindro, defender, serratura)
- Database 22 produttori italiani

## Tecnologie
- Node.js + Express
- Claude AI (Anthropic)
- PDF.js per elaborazione PDF

## Installazione locale
```bash
npm install
cp .env.example .env  # Aggiungi la tua API key
npm start
```

## Variabili ambiente
- `CLAUDE_API_KEY`: API key Anthropic
- `PORT`: Porta server (default: 3000)
