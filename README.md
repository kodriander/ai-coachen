# AI-coachen

Låt AI:n styra din träning och kost i 7 dagar. Det här är appen från videon *"Jag lät AI styra min träning och kost i en vecka"*.

Varje morgon laddar du upp din Whoop-skärmdump (eller skriver in sömn och recovery). Coachen gör dagens pass och kostplan. Under passet loggar du set med +/− eller med rösten, och coachen kommenterar varje set direkt. Du loggar mat med text eller foto, gör en kvällscheck-in och testar dig dag 1 och dag 7.

## Funktioner

- **Morgon:** Whoop-skärmdump läses av automatiskt, eller fyll i för hand.
- **Dagens plan:** pass (övningar, set, reps, vikt) och kostplan anpassad efter sömn, recovery och vad du gjort tidigare dagar.
- **Pass-läge:** steppers för vikt och reps, vilotimer, feedback från coachen efter varje set. Skärmen hålls tänd.
- **Röst:** säg "körde 52,5 sex gånger, sista var tungt" så fylls seten i. Fungerar i Chrome, Edge och Safari.
- **Mat:** skriv eller fota måltiden, få protein och kalorier mot dagens mål.
- **Kväll:** check-in med rösten eller skalor. Coachen använder det i morgondagens plan.
- **Test dag 1 och 7:** bänkpress max reps, chins och kroppsvikt.
- **Resultat:** före och efter, recovery per dag, vikt från Apple Hälsa, delbar resultatbild.
- **Apple Hälsa:** steg, vikt och aktiva kalorier via en iOS-genväg (guide i appen under Inställningar).

## Kör på din egen dator (rekommenderat)

Då kan coachen använda din **ChatGPT-plan** (Plus eller Pro) i stället för en API-nyckel. Det kostar inget extra utöver planen.

Du behöver [Node.js](https://nodejs.org) version 18 eller senare. Sen i Terminalen:

```bash
git clone https://github.com/kodriander/ai-coachen.git
cd ai-coachen
npm install
npm start
```

1. Öppna **http://127.0.0.1:8787** på datorn (skriv 127.0.0.1, inte localhost).
2. Tryck **Fortsätt med ChatGPT** och logga in.
3. Under Inställningar finns en QR-kod. Skanna den med mobilen så öppnas appen där. Mobilen måste vara på samma wifi som datorn, och datorn måste vara igång.

På iPhone: tryck Dela och **Lägg till på hemskärmen**, så funkar den som en app.

Inloggningen sparas bara i mappen `data/` på din dator och skickas bara till OpenAI. Mobilen kommer åt din inloggning genom datorn, och bara enheter som skannat QR-koden släpps in. Vill du byta port: `PORT=3000 npm start`.

**Röst på mobilen:** över vanligt wifi (http) tillåter mobilens webbläsare oftast inte appens mikrofon. Tryck då på mikrofonen i tangentbordet och prata, så skrivs det in och coachen tolkar det på samma sätt.

## Andra sätt

Appen finns också på [kodriander.github.io/ai-coachen](https://kodriander.github.io/ai-coachen/). Där finns ingen server, så du loggar in på ett av de här sätten:

- **Logga in med OpenRouter:** ett tryck, logga in och fyll på några dollar. Kör samma Claude-modeller.
- **Egen Claude-nyckel:** skapa en på [platform.claude.com](https://platform.claude.com/settings/keys) och klistra in den.

## Integritet

Det finns inget konto hos oss. All träningsdata sparas bara i din webbläsare (localStorage). Frågorna till coachen skickas bara till AI:n du valt: Claude, Claude via OpenRouter, eller ChatGPT via din egen dator.

Appen är inte medicinsk rådgivning. Värm alltid upp och lyssna på kroppen.

## Utveckla

```bash
npm run dev      # Vite med hot reload (utan ChatGPT-servern)
npm run build    # bygger till dist/
npm run serve    # startar servern utan att bygga om
```

Repot publiceras automatiskt på GitHub Pages vid push till `main`.

Byggt med React, Vite och TypeScript. ChatGPT-inloggningen följer OpenAI:s [Sign in with ChatGPT för appar med öppen källkod](https://developers.openai.com/siwc/token-sharing-open-source).

## Licens

MIT
