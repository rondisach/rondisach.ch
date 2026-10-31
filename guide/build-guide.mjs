// Erzeugt guide/pizza-guide.html – die Vorlage für das PDF, das Ofen-Mieter bekommen.
// Ausführen: node guide/build-guide.mjs, dann pizza-guide.html im Browser öffnen und als PDF drucken (A4, Ränder: keine).
import { writeFileSync } from 'node:fs';

const oven = [
  { title: 'Aufstellen', text: 'Ofen draussen auf einen stabilen, nicht brennbaren Tisch stellen, mit mindestens 1 m Abstand zu Wänden, Sonnenschirmen und Dächern. Die Öffnung möglichst nicht in den Wind drehen.' },
  { title: 'Gas anschliessen', text: 'Den Regler von Hand fest auf die Gasflasche schrauben und das Ventil öffnen. Riecht ihr Gas, Ventil sofort zudrehen und den Anschluss nochmals prüfen.' },
  { title: 'Anheizen', text: 'Drehknopf drücken und drehen, bis die Flamme brennt. Dann 25–30 Minuten auf voller Flamme vorheizen: Erst ein richtig heisser Stein gibt einen knusprigen Boden.' },
  { title: 'Backen', text: 'Flamme auf mittel bis hoch stellen und die Pizza einschiessen. Nach 20–30 Sekunden mit der Wendeschaufel eine Vierteldrehung machen, bis der Rand rundum Farbe hat. Nach 60–90 Sekunden ist sie fertig.' },
  { title: 'Zwischendurch', text: 'Zwischen zwei Pizzen 1–2 Minuten warten, damit der Stein wieder Hitze aufnimmt. Mehl- und Griessreste mit der Bürste vom Stein wischen, sonst werden sie bitter.' },
  { title: 'Ausschalten', text: 'Knopf auf Aus und das Ventil an der Flasche zudrehen. Den Ofen 1–2 Stunden auskühlen lassen, bevor ihr ihn bewegt. Den Stein nie mit Wasser reinigen.' },
];

const dough = [
  { title: 'Temperieren', text: 'Die Teigballen 4–5 Stunden vor der ersten Pizza aus dem Kühlschrank nehmen und zugedeckt bei Raumtemperatur stehen lassen. Kalter Teig reisst und lässt sich schlecht ausziehen.' },
  { title: 'Lösen', text: 'Die Arbeitsfläche grosszügig mit Hartweizengriess bestreuen. Den Ballen mit einem Teigschaber aus der Box lösen und mit der Oberseite nach unten in den Griess legen, dann wenden.' },
  { title: 'Rand formen', text: 'Mit den Fingerspitzen von der Mitte nach aussen drücken und einen Rand von gut 1 cm frei lassen. Dort sitzt die Luft, die nachher den luftigen Rand gibt.' },
  { title: 'Ausziehen', text: 'Den Teig über die Handrücken legen, sanft drehen und auseinanderziehen, bis er etwa 30–32 cm gross ist. Die Mitte darf dünn sein, Löcher aber vermeiden.' },
  { title: 'Belegen', text: 'Den Teig auf den leicht bemehlten Schieber ziehen und zügig belegen, in höchstens einer Minute. Danach kurz rütteln: Gleitet die Pizza, ist sie bereit für den Ofen.' },
  { title: 'Einschiessen', text: 'Schieber flach auf den Stein legen und mit einem kurzen, entschlossenen Ruck zurückziehen. Zögern ist der häufigste Grund, warum eine Pizza am Schieber hängen bleibt.' },
];

const rules = [
  { title: 'Tomate', text: 'Geschälte Tomaten (z. B. San Marzano) von Hand zerdrücken, nur mit Salz würzen und nicht kochen. Etwa 3 Esslöffel pro Pizza reichen, dünn verteilt.' },
  { title: 'Mozzarella', text: 'Fior di Latte in Stücke zupfen und eine Stunde abtropfen lassen. Büffelmozzarella und Burrata sind sehr nass und kommen besser erst nach dem Backen drauf.' },
  { title: 'Weniger ist mehr', text: 'Höchstens drei bis vier Beläge pro Pizza. Zu viel Belag macht den Boden nass und die Pizza wird in 90 Sekunden nicht gar.' },
  { title: 'Vorher oder nachher?', text: 'Was gebacken werden muss, kommt vorher drauf. Rohschinken, Rucola, Burrata, Mortadella und frisches Olivenöl kommen erst nach dem Backen, sonst werden sie trocken oder bitter.' },
];

const pizzas = [
  { name: 'Margherita', before: 'Tomate · Fior di Latte · Basilikum', after: 'Olivenöl', tip: 'Der Klassiker zum Einstieg. Basilikum unter den Käse legen, dann verbrennt es nicht.' },
  { name: 'Marinara', before: 'Tomate · Knoblauch in dünnen Scheiben · Oregano', after: 'Olivenöl', tip: 'Ohne Käse und darum ideal zum Üben: Sie gleitet besonders leicht vom Schieber.' },
  { name: 'Salami', before: 'Tomate · Fior di Latte · Salami in dünnen Scheiben', after: 'Olivenöl', tip: 'Dünn geschnittene, leicht scharfe Salami wird knusprig und gibt schönes rotes Öl ab.' },
  { name: 'Prosciutto Crudo', before: 'Tomate · Fior di Latte · Cherrytomaten', after: 'Rohschinken · Rucola · Parmesan', tip: 'Rohschinken nie mitbacken, sonst wird er hart und salzig.' },
  { name: 'Mortadella & Burrata', before: 'Crème · Fior di Latte', after: 'Mortadella · Burrata · gehackte Pistazien', tip: 'Burrata erst kurz vor dem Servieren daraufgeben: kalt auf heiss ist der Trick.' },
  { name: 'Salsiccia', before: 'Tomate · Pecorino · Fior di Latte · Salsiccia · rote Zwiebeln', after: 'Ricotta', tip: 'Salsiccia aus der Haut drücken und in kleinen Stücken kurz anbraten. Zwiebeln hauchdünn schneiden.' },
  { name: 'Vegetariana', before: 'Tomate · Fior di Latte · Aubergine · Zucchetti · Cherrytomaten', after: 'Olivenöl · Basilikum', tip: 'Aubergine und Zucchetti vorher grillieren, in 90 Sekunden werden sie sonst nicht weich.' },
];

// Einkaufsliste: Suchlinks statt Produktlinks, damit sie nicht ins Leere führen, wenn ein Produkt aus dem Sortiment fällt.
const shopping = [
  { name: 'Hartweizengriess', for: 'alle, zum Ausziehen', query: 'hartweizengriess' },
  { name: 'Geschälte Tomaten (Pelati)', for: 'alle ausser Mortadella', query: 'pelati' },
  { name: 'Fior di Latte', for: 'alle ausser Marinara', query: 'fior di latte' },
  { name: 'Olivenöl extra vergine', for: 'Margherita, Marinara, Salami, Vegetariana', query: 'olivenöl extra vergine' },
  { name: 'Basilikum', for: 'Margherita, Vegetariana', query: 'basilikum' },
  { name: 'Knoblauch', for: 'Marinara', query: 'knoblauch' },
  { name: 'Oregano', for: 'Marinara', query: 'oregano' },
  { name: 'Salami', for: 'Salami', query: 'salami' },
  { name: 'Rohschinken', for: 'Prosciutto Crudo', query: 'prosciutto crudo' },
  { name: 'Rucola', for: 'Prosciutto Crudo', query: 'rucola' },
  { name: 'Parmesan', for: 'Prosciutto Crudo', query: 'parmigiano reggiano' },
  { name: 'Cherrytomaten', for: 'Prosciutto Crudo, Vegetariana', query: 'cherrytomaten' },
  { name: 'Crème fraîche', for: 'Mortadella & Burrata', query: 'crème fraîche' },
  { name: 'Mortadella', for: 'Mortadella & Burrata', query: 'mortadella' },
  { name: 'Burrata', for: 'Mortadella & Burrata', query: 'burrata' },
  { name: 'Pistazien', for: 'Mortadella & Burrata', query: 'pistazien' },
  { name: 'Pecorino', for: 'Salsiccia', query: 'pecorino' },
  { name: 'Salsiccia', for: 'Salsiccia', query: 'salsiccia' },
  { name: 'Rote Zwiebeln', for: 'Salsiccia', query: 'rote zwiebeln' },
  { name: 'Ricotta', for: 'Salsiccia', query: 'ricotta' },
  { name: 'Aubergine', for: 'Vegetariana', query: 'aubergine' },
  { name: 'Zucchetti', for: 'Vegetariana', query: 'zucchetti' },
];
const migros = (q) => `https://www.migros.ch/de/search?query=${encodeURIComponent(q)}`;
const coop = (q) => `https://www.coop.ch/de/search/?text=${encodeURIComponent(q)}`;

const amounts = [
  { value: '1–1½', label: 'Teigballen pro Person' },
  { value: '80 g', label: 'Tomate pro Pizza' },
  { value: '90 g', label: 'Fior di Latte pro Pizza' },
  { value: '60–90 s', label: 'Backzeit' },
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const steps = (list) => `<ol class="steps">${list.map((s) => `<li><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`).join('')}</ol>`;
const footer = (n) => `<footer class="foot"><span>rondisach · pizza-guide</span><span>${n} / 4</span></footer>`;

const html = `<!doctype html>
<html lang="de-CH">
<head>
<meta charset="utf-8" />
<title>Pizza-Guide · rondisach</title>
<style>
  @font-face { font-family: 'Inter'; src: url('../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2') format('woff2'); font-weight: 100 900; }
  @font-face { font-family: 'Bricolage'; src: url('../node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-wght-normal.woff2') format('woff2'); font-weight: 200 800; }
  @page { size: A4; margin: 0; }
  :root { --cream: #f3eee4; --panel: #e9e1d5; --ink: #121212; --muted: #665f56; --line: rgba(18, 18, 18, 0.16); --text: #403d38; }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; background: #ccc; color: var(--ink); font: 10pt/1.5 'Inter', sans-serif; }
  .page { position: relative; width: 210mm; height: 297mm; margin: 0 auto 10mm; padding: 16mm 15mm 20mm; background: var(--cream); overflow: hidden; break-after: page; }
  @media print { body { background: none; } .page { margin: 0; } }
  h1, h2, .brand, .amounts strong, .steps li::before, .pizza h3 { font-family: 'Bricolage', sans-serif; font-weight: 800; letter-spacing: -0.04em; margin: 0; }
  .brand { font-size: 18pt; letter-spacing: -0.06em; }
  .kicker { font-size: 8pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: var(--muted); margin-bottom: 3mm; }
  h1 { font-size: 40pt; line-height: 0.95; margin: 8mm 0 5mm; }
  h2 { font-size: 26pt; line-height: 1; margin-bottom: 6mm; }
  h3 { font-size: 10.5pt; margin: 0 0 1.5mm; }
  p { margin: 0; color: var(--text); }
  .lead { font-size: 11pt; max-width: 150mm; margin-bottom: 7mm; }
  .amounts { display: grid; grid-template-columns: repeat(4, 1fr); margin: 0 0 12mm; padding: 0; list-style: none; border-block: 1.5pt solid var(--ink); }
  .page:first-child .amounts { margin-bottom: 8mm; }
  .amounts li { padding: 4mm 3mm; }
  .amounts li + li { border-left: 0.75pt solid var(--line); }
  .amounts strong { display: block; font-size: 18pt; }
  .amounts span { color: var(--muted); font-size: 8.5pt; }
  .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3.5mm; margin: 0; padding: 0; list-style: none; counter-reset: step; }
  .steps li { counter-increment: step; border: 1.5pt solid var(--ink); border-radius: 5mm; padding: 4mm; }
  .steps li::before { content: counter(step, decimal-leading-zero); display: block; font-size: 16pt; margin-bottom: 2mm; }
  .steps p, .rules p, .pizza p { font-size: 9pt; }
  .rules { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; margin-bottom: 5mm; }
  .rules > div { background: var(--panel); border-radius: 5mm; padding: 3.5mm 4mm; }
  .pizzas { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; }
  .pizza { border: 1.5pt solid var(--ink); border-radius: 5mm; padding: 4mm 4.5mm; }
  .pizza h3 { font-size: 13pt; margin-bottom: 2mm; }
  .pizza dl { margin: 0 0 2mm; padding-bottom: 2mm; border-bottom: 0.75pt solid var(--line); font-size: 8.5pt; }
  .pizzaNote { grid-column: span 2; background: var(--ink); color: var(--cream); border-radius: 5mm; padding: 5mm; display: flex; flex-direction: column; justify-content: center; }
  .pizzaNote h3 { font-size: 13pt; font-family: 'Bricolage', sans-serif; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 2mm; }
  .pizzaNote p { color: #cbc3b7; font-size: 9.5pt; }
  .pizza dt { font-size: 6.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); }
  .pizza dd { margin: 0 0 1.5mm; font-weight: 600; line-height: 1.35; }
  .pizza p { font-size: 8.5pt; line-height: 1.4; }
  table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  th { text-align: left; font-size: 7pt; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); padding: 0 2mm 2mm; border-bottom: 1.5pt solid var(--ink); }
  td { padding: 1.9mm 2mm; border-bottom: 0.75pt solid var(--line); }
  td:first-child { font-weight: 700; }
  td.for { color: var(--muted); }
  td.shop { width: 18mm; text-align: center; }
  td.shop a { display: inline-block; padding: 0.6mm 2.5mm; border-radius: 99px; font-weight: 700; font-size: 8pt; text-decoration: none; color: #fff; }
  .m { background: #ff6600; }
  .c { background: #e2001a; }
  .box { margin-top: 8mm; padding: 5mm; border-radius: 5mm; background: var(--ink); color: var(--cream); }
  .box p { color: #cbc3b7; font-size: 9pt; }
  .box h3 { font-size: 11pt; }
  .foot { position: absolute; left: 15mm; right: 15mm; bottom: 9mm; display: flex; justify-content: space-between; font-size: 8pt; color: var(--muted); border-top: 0.75pt solid var(--line); padding-top: 2.5mm; }
</style>
</head>
<body>
  <section class="page">
    <div class="brand">rondisach</div>
    <h1>so wird's<br />rund.</h1>
    <p class="lead">Schön, dass ihr selbst backt! In diesem Guide steht alles, was ihr braucht: wie der Ofen funktioniert, wie ihr unseren Teig auszieht, was auf welche Pizza gehört und wo ihr die Zutaten bekommt.</p>
    <ul class="amounts">${amounts.map((a) => `<li><strong>${a.value}</strong><span>${a.label}</span></li>`).join('')}</ul>
    <div class="kicker">01 · ofen</div>
    <h2>der gozney arc xl.</h2>
    ${steps(oven)}
    ${footer(1)}
  </section>

  <section class="page">
    <div class="kicker">02 · teig</div>
    <h2>vom ballen zur pizza.</h2>
    <p class="lead">Unsere Ballen wiegen 280 g, werden im professionellen Spiralkneter gemacht und reifen 48 Stunden. Ein Wallholz braucht ihr nicht: Es drückt die Luft aus dem Teig, und genau die sorgt für den luftigen Rand.</p>
    ${steps(dough)}
    <div class="box">
      <h3>Wenn etwas klemmt</h3>
      <p>Pizza klebt am Schieber? Etwas mehr Griess darunter und schneller belegen. Boden bleibt hell? Stein länger vorheizen und zwischen den Pizzen etwas warten. Rand verbrennt? Pizza früher drehen und die Flamme etwas kleiner stellen.</p>
    </div>
    ${footer(2)}
  </section>

  <section class="page">
    <div class="kicker">03 · beläge</div>
    <h2>was gehört worauf?</h2>
    <div class="rules">${rules.slice(0, 3).map((r) => `<div><h3>${esc(r.title)}</h3><p>${esc(r.text)}</p></div>`).join('')}</div>
    <div class="pizzas">${pizzas
      .map((p) => `<article class="pizza"><h3>${esc(p.name)}</h3><dl><dt>vor dem ofen</dt><dd>${esc(p.before)}</dd><dt>nach dem ofen</dt><dd>${esc(p.after)}</dd></dl><p>${esc(p.tip)}</p></article>`)
      .join('')}<div class="pizzaNote"><h3>${esc(rules[3].title)}</h3><p>${esc(rules[3].text)}</p></div></div>
    ${footer(3)}
  </section>

  <section class="page">
    <div class="kicker">04 · einkaufen</div>
    <h2>die einkaufsliste.</h2>
    <p class="lead">Alle Zutaten für unsere Pizzen. Ein Klick auf Migros oder Coop öffnet die passende Suche im Onlineshop.</p>
    <table>
      <thead><tr><th>Zutat</th><th>für</th><th></th><th></th></tr></thead>
      <tbody>${shopping
        .map((s) => `<tr><td>${esc(s.name)}</td><td class="for">${esc(s.for)}</td><td class="shop"><a class="m" href="${migros(s.query)}">Migros</a></td><td class="shop"><a class="c" href="${coop(s.query)}">Coop</a></td></tr>`)
        .join('')}</tbody>
    </table>
    ${footer(4)}
  </section>
</body>
</html>
`;

writeFileSync(new URL('./pizza-guide.html', import.meta.url), html);
console.log('guide/pizza-guide.html geschrieben');
