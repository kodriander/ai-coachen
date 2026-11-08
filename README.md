# AI-coachen

Låt AI:n styra din träning och kost i 7 dagar. Det här är appen från videon *"Jag lät AI styra min träning och kost i en vecka"*.

Varje morgon laddar du upp din Whoop-skärmdump (eller skriver in sömn och recovery). Claude gör dagens pass och kostplan. Under passet loggar du set med +/− eller med rösten, och coachen kommenterar varje set direkt. Du loggar mat med text eller foto, gör en kvällscheck-in och testar dig dag 1 och dag 7.

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

## Kom igång

1. Öppna appen (länk kommer i videon), eller kör den själv, se nedan.
2. Skapa en API-nyckel på [platform.claude.com](https://platform.claude.com/settings/keys) och klistra in den i appen.
3. Fyll i lite om dig och kör.

På iPhone: öppna i Safari, tryck Dela och **Lägg till på hemskärmen**, så funkar den som en app.

## Integritet

Det finns ingen server och inget konto. Din API-nyckel och all data sparas bara i din webbläsare (localStorage) och skickas bara till Claudes API. Du betalar själv för det du använder via din nyckel.

Appen är inte medicinsk rådgivning. Värm alltid upp och lyssna på kroppen.

## Kör själv

```bash
npm install
npm run dev
```

`npm run build` bygger till `dist/`. Repot publiceras automatiskt på GitHub Pages vid push till `main` (aktivera Pages med källan *GitHub Actions* under Settings → Pages).

Byggt med React, Vite, TypeScript och [Claude API](https://platform.claude.com/docs).

## Licens

MIT
