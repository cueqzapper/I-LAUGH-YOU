#!/usr/bin/env node
/**
 * Rewrite the German text of the 3 SEO pillar posts.
 *
 * Goals this pass:
 *  - tighter, more gripping German with natural rhythm
 *  - no AI-ish vocabulary (strip "konzeptionell", "Verknappungslogik",
 *    "Validierung", "mit Resonanz schwingen", "Einfluss auf die Kurve", etc.)
 *  - every post keeps pushing the main project (i-laugh-you.com) without
 *    sounding like a pitch deck
 *  - all <h2> headings and <img> tags are preserved byte-for-byte, so the
 *    inline-image anchors remain valid
 *
 * Re-run-safe: applies a full content overwrite and recomputes word_count.
 *
 * Usage:
 *   node scripts/rewrite-pillar-posts-de.js
 */

const path = require("node:path");
const Database = require("better-sqlite3");

const dbPath =
  process.argv[2] || path.resolve(__dirname, "..", "data", "ily.sqlite");

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

function countWords(html) {
  const text = String(html).replace(/<[^>]+>/g, " ");
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// --- New DE content per slug -----------------------------------------------

const REWRITES = [
  {
    slug: "ich-habe-mein-selbstportrait-in-24236-teile-geschnitten",
    excerpt:
      "Warum kostet das erste Stück 77 Franken und das letzte 777? Ein ehrlicher Text über Kunst, Kapitalismus, künstliche Knappheit — und warum ich die Mathematik dahinter offenlege.",
    content:
      `<p>Ich habe mein Selbstporträt in Öl gemalt. Dann habe ich es zerschnitten — auf dem Papier, in 24.236 gleiche Rechtecke. Jedes Rechteck bekommt eine Nummer, ein Zertifikat und einen eigenen Preis. Je mehr Teile verkauft sind, desto teurer wird das nächste. Kein Marketing-Trick. Das <em>ist</em> das Projekt. Dieser Text erklärt, warum — und zwar auf die ehrliche Art, nicht auf die, die sonst in Galerien üblich ist.</p>` +
      `<p>Ich bin Simon, geboren in Deutschland, lebe in der Schweiz. Auf <a href="/">i-laugh-you.com</a> verkaufe ich nummerierte Fragmente genau dieses einen Ölgemäldes. Das erste Stück kostet 77 Franken. Das letzte wird 777 kosten. Dazwischen biegt sich eine Kurve nach oben — je leerer die Leinwand, desto teurer das, was noch übrig ist.</p>` +
      `<h2>Die Mathematik hinter dem Preis (ohne Formel)</h2>` +
      `<img src="/blog-images/2026/04/22/ich-habe-mein-selbstportrait-in-24236-teile-geschnitten-inline-1.png" alt="Eine steil steigende Preiskurve von 77 CHF zu 777 CHF, in Ölfarbe auf dunklem Hintergrund" loading="lazy" class="blog-inline-image" />` +
      `<p>Ganz konkret: 24.236 Teile. Teil Nummer 1 kostet 77 Franken. Teil 12.118, der mathematische Mittelpunkt, liegt bei rund 200 Franken. Teil Nummer 24.236 kostet exakt 777. Jedes einzelne Teil dazwischen ist ein winziges bisschen teurer als das vorherige. Am Anfang merkst du es kaum. Gegen Ende wird die Kurve steil.</p>` +
      `<p>Der Anstieg ist exponentiell, nicht linear. Nicht, weil ich gierig bin, sondern weil so die Welt funktioniert. Wer früh einsteigt, zahlt für den Glauben, dass dieses Projekt etwas wird. Wer spät einsteigt, zahlt für die Bestätigung, dass andere vorher schon überzeugt waren.</p>` +
      `<p>Das habe ich nicht erfunden. So tickt jede Aktie, jeder Sneaker-Release, jede Künstler-Karriere. Ich schreibe es nur offen hin, statt es hinter Galerietüren verschwinden zu lassen.</p>` +
      `<h2>Ehrlichkeit als Konzeptkunst</h2>` +
      `<p>In den meisten Galerien bekommst du den Preis gar nicht erst zu sehen. Er steht „auf Anfrage". Die Preisschilder liegen mit dem Rücken nach oben. Das ist kein Versehen — das ist Methode. Kunst soll sich nicht wie ein Geschäft anfühlen, sondern wie eine Wahrheit, die nur Eingeweihte verstehen.</p>` +
      `<p>Ich finde das unehrlich. Und ich sage das als jemand, der selbst Kunst verkauft.</p>` +
      `<blockquote>Ein fairer Preis ist nicht einer, den niemand diskutiert. Ein fairer Preis ist einer, den jeder sehen kann.</blockquote>` +
      `<p>Deshalb siehst du auf <a href="/">i-laugh-you</a> jederzeit zwei Zahlen: was ein Teil gerade kostet — und wohin die Kurve in den nächsten Wochen läuft. Du kaufst heute oder du wartest. Du glaubst an das Projekt oder eben nicht. Keine Rabattverhandlungen, keine Hinterzimmer-Preise. Der Preis ist der Preis.</p>` +
      `<h2>Was künstliche Verknappung wirklich ist</h2>` +
      `<p>„Limitierte Auflage" klingt nach einem Naturgesetz. Nach etwas, das von selbst knapp geworden ist. Stimmt aber nicht. Jede limitierte Auflage ist eine Entscheidung am Schreibtisch. Irgendjemand hat gesagt: „Ich drucke 100, nicht 10.000." Die Zahl wurde so gewählt, dass sie knapp wirkt und trotzdem genug Umsatz bringt.</p>` +
      `<p>24.236 ist für einen Kunstdruck eine absurd hohe Zahl. Es ist zufällig auch die Einwohnerzahl der Schweizer Gemeinde, in der ich wohne. Ich habe sie bewusst so gewählt, damit sie willkürlich <em>wirkt</em> — weil sie willkürlich <em>ist</em>. Damit niemand denken kann, ich hätte sie im Excel optimiert. Ich habe sie <strong>nicht</strong> optimiert. Ich habe sie genommen. Das ist ein Unterschied.</p>` +
      `<p>Der Punkt ist: Knappheit in der Kunst ist immer gemacht. Ausnahmslos. Die einzige Frage ist, ob der Künstler ehrlich genug ist, das auch laut zuzugeben.</p>` +
      `<h2>Rembrandt hat es auch gemacht (und er wusste es)</h2>` +
      `<img src="/blog-images/2026/04/22/ich-habe-mein-selbstportrait-in-24236-teile-geschnitten-inline-2.png" alt="Rembrandt-Ära Kupferstich-Werkstatt mit Radierplatte und Kerzenlicht" loading="lazy" class="blog-inline-image" />` +
      `<p>Amsterdam, 17. Jahrhundert. Rembrandt van Rijn malt Ölgemälde für reiche Kaufleute und radiert gleichzeitig Porträts für die Bürgerfamilien. Ein Gemälde geht an einen einzigen Sammler, zum Höchstpreis. Eine Radierung druckt er hundertfach und verkauft sie für einen Bruchteil davon.</p>` +
      `<p>Beides ist Rembrandt. Beides trägt seine Handschrift. Der Markt bewertet sie trotzdem komplett unterschiedlich — weil die <em>Produktionsmethode</em> zwei unterschiedliche Knappheiten erzeugt.</p>` +
      `<p>Genau so funktioniert der Kunstmarkt bis heute, nur viel verdeckter. Ein NFT. Ein Druck. Ein Original. Jedes Format hat seinen eigenen Preisraum. <a href="/">i-laugh-you</a> steht in dieser Tradition: eine moderne Radierung, digital nummeriert, mit einem Preis, der sich bewegt wie ein echter Markt. Rembrandt hätte Spaß daran gehabt. Er hat seine Platten ohnehin mehrfach überarbeitet, um neue „Zustände" zu schaffen — reine Preismanipulation, nur dass er es nie so genannt hat. Ich nenne es so.</p>` +
      `<h2>Ja, dieser Text ist auch Marketing</h2>` +
      `<p>An dieser Stelle würde jeder andere Kunstblog so tun, als ginge es ausschließlich um die reine Idee. Ich mache das nicht.</p>` +
      `<p>Dieser Text ist auch Werbung. Er ist für Google geschrieben. Er steht voller Begriffe wie <strong>Kunst und Kapitalismus</strong>, künstliche Verknappung und dynamische Preise — damit Leute, die das googeln, hier landen. Ich will Teile verkaufen. Ich muss Miete zahlen. Das ist kein Geheimnis, das ist mein Alltag.</p>` +
      `<p>Der Unterschied zu den anderen: Ich erzähle es dir. Ich verstecke nichts hinter einer Galeriefassade. Das Projekt ist die Kritik, und die Kritik ist das Projekt. Wenn du ein Stück kaufst, stimmst du nicht nur einer Idee zu — du stimmst einer Methode zu: Transparenz statt Mystifizierung, offen hingestellte Willkür statt versteckter.</p>` +
      `<blockquote>Wer ein Stück kauft, gibt eine Stimme ab — in die eine oder andere Richtung. Auf einem Markt, der dich längst mitgenommen hat, gibt es keinen neutralen Platz mehr.</blockquote>` +
      `<h2>Was du tatsächlich besitzt</h2>` +
      `<p>Einen echten, physischen Kunstdruck. Auf Museumspapier, gerahmt im Massivholzrahmen, versendet über Printful in die Schweiz, nach Deutschland, nach Österreich, oder wohin du willst. Eine Nummer zwischen 1 und 24.236. Ein Zertifikat, auf dem genau steht, welchen Ausschnitt des Originalgemäldes dein Fragment zeigt — Koordinate für Koordinate.</p>` +
      `<p>Und ein Stück einer Geschichte. Wer früh einsteigt, prägt die Kurve für alle, die danach kommen. Wer später einsteigt, bekommt die Bestätigung mitgeliefert, dass das Projekt funktioniert.</p>` +
      `<p>Das ist nicht neutral. Das ist auch nicht böse. Das ist genau so, wie jeder Kunstmarkt funktioniert — nur sage ich es dir vorher.</p>` +
      `<h2>Warum 77 und warum 777?</h2>` +
      `<p>Weil manche Zahlen einfach klingen. 77 ist bezahlbar — ein schöner Abend zu zweit in einem guten Restaurant. 777 ist ein Statement — ein Preis, den man sich bewusst leistet. Zwischen diesen beiden Werten liegt eine ganze Welt.</p>` +
      `<p>Ich hätte auch 50 und 500 nehmen können. Aber 77 und 777 klingen wie Glückszahlen, und Kunst ist am Ende immer auch ein bisschen Aberglaube. Man kauft ein Bild, weil man hofft, dass es etwas bewirkt — für den Raum, für die Stimmung, für den eigenen Alltag, manchmal für die Seele.</p>` +
      `<p>Ich streite das nicht ab. Ich sage nur: Dieser Glaube hat einen Preis. Und ich drucke ihn offen aufs Etikett, statt ihn zu verstecken.</p>` +
      `<h2>Zum Schluss</h2>` +
      `<p>Du musst kein Stück kaufen, damit dieses Projekt funktioniert. Du darfst auch einfach zuschauen. Beobachte, wie die Kurve sich biegt. Beobachte, wie echte Menschen mit echtem Geld echte Entscheidungen treffen. Das ist auch Kunst. Vielleicht sogar die ehrlichste, die es gerade gibt.</p>` +
      `<p>Wenn du wissen willst, wie sich das konkret anfühlt: <a href="/">hier geht es zur Leinwand</a>. Klick ein Fragment an. Sieh dir den aktuellen Preis an. Lies das Zertifikat. Entscheide dich dann — ruhig und bewusst. Mehr verlange ich nicht.</p>` +
      `<p>Und wenn du vorher noch wissen willst, wie ich überhaupt hier gelandet bin: <a href="/about">über das Projekt</a>. Dort steht die ganze Geschichte.</p>`,
  },

  {
    slug: "nummerierter-kunstdruck-was-auflage-wirklich-bedeutet",
    excerpt:
      "Was heißt „23/100\" auf einem Kunstdruck wirklich? Ein ehrlicher Blick auf limitierte Auflagen, Werterhalt und die Psychologie hinter der Nummer — inklusive drei Dinge, die du vor dem Kauf prüfen solltest.",
    content:
      `<p>Du stehst vor einem <strong>nummerierten Kunstdruck</strong> und überlegst, ob du ihn kaufst. In der unteren Ecke steht „23/100", mit Bleistift hingeschrieben, daneben die Signatur des Künstlers. Was heißt das eigentlich? Ist der Druck wertvoller, weil die Zahl niedrig ist? Weniger wert, weil noch 99 andere Exemplare existieren? Die Wahrheit ist nüchterner, als der Kunstmarkt sie hergibt — und spannender, als Pinterest sie erzählt.</p>` +
      `<p>Hier steht, was eine nummerierte Auflage wirklich ist, was sie nicht ist, und worauf du vor dem Kauf achten solltest.</p>` +
      `<h2>Was eine nummerierte Auflage rechtlich ist</h2>` +
      `<p>Eine limitierte Auflage ist nichts anderes als ein Versprechen. Der Künstler sagt: „Ich produziere eine bestimmte Anzahl Exemplare und höre dann auf." Die Druckplatte wird zerstört, die Datei gelöscht, der Prozess stillgelegt.</p>` +
      `<p>Dieses Versprechen ist vertraglich und wird durch ein Echtheitszertifikat dokumentiert — Certificate of Authenticity, kurz COA. Wenn der Künstler es bricht, also heimlich nachdruckt, eine zweite Serie startet oder digitale Kopien verkauft, verliert das Werk sofort an Wert. Manchmal landet so etwas vor Gericht.</p>` +
      `<p>Was eine nummerierte Auflage <em>nicht</em> ist: ein Naturgesetz. Die 100 ist nicht vom Himmel gefallen. Irgendjemand hat sie ausgesucht. Die Knappheit steht auf dem Papier, nicht in der Welt.</p>` +
      `<h2>Kurzes Glossar</h2>` +
      `<img src="/blog-images/2026/04/22/nummerierter-kunstdruck-was-auflage-wirklich-bedeutet-inline-1.png" alt="Echtheitszertifikat eines limitierten Kunstdrucks mit rotem Siegel und handschriftlicher Nummerierung 23/100" loading="lazy" class="blog-inline-image" />` +
      `<ul>` +
      `<li><strong>Edition / Auflage:</strong> Die Gesamtzahl offizieller Exemplare. Die „100" bei 73/100.</li>` +
      `<li><strong>AP (Artist's Proof, Künstlerexemplar):</strong> Zusatz-Exemplare für den Künstler selbst, meist 10 % der Auflage. Zählen offiziell nicht zur nummerierten Serie.</li>` +
      `<li><strong>HC (Hors Commerce):</strong> Französisch für „nicht für den Handel". Exemplare für Galerien, Archive oder Pressezwecke. Existieren, sind aber nicht verkäuflich.</li>` +
      `<li><strong>EA (Épreuve d'Artiste):</strong> Die französische Version des Artist's Proof. Gleicher Inhalt, andere Sprache.</li>` +
      `<li><strong>Giclée:</strong> Hochauflösender Tintenstrahldruck auf Archivpapier. Der Standard für heutige Fine-Art-Drucke.</li>` +
      `<li><strong>Radierung:</strong> Druck von einer geätzten Metallplatte. Die alte Methode (Rembrandt, Dürer) — heute selten, dafür pro Exemplar wertvoller.</li>` +
      `<li><strong>COA:</strong> Das Echtheitszertifikat. Enthält Auflagenhöhe, Nummer, Titel, Signatur und Datum.</li>` +
      `</ul>` +
      `<h2>Warum niedrige Nummern oft mehr wert sind (und warum nicht)</h2>` +
      `<p>„1/100 ist mehr wert als 73/100." Das hörst du auf Messen, in Galerien, auf Reddit. Manchmal stimmt es. Manchmal nicht. Und die Gründe sind interessanter als die Regel selbst.</p>` +
      `<p>Bei alten Druckverfahren — Radierung, Lithografie, Siebdruck — nutzt sich die Platte mit jedem Abzug ab. Der zehnte Abzug ist tatsächlich schärfer als der neunzigste. Hier hat die Nummer einen handfesten, physischen Grund.</p>` +
      `<p>Bei modernen Giclée-Drucken sieht der hundertste Abzug aus wie der erste. Derselbe Drucker, dieselbe Datei, dasselbe Papier. Der Preisunterschied zwischen 1/100 und 73/100 ist dann reine <em>Psychologie</em>.</p>` +
      `<blockquote>Eine niedrige Nummer kauft dir keine bessere Druckqualität. Sie kauft dir das Gefühl, früh dabei gewesen zu sein.</blockquote>` +
      `<p>Das ist nicht falsch. Dieses Gefühl ist ein Teil dessen, was Kunst überhaupt wertvoll macht. Du solltest nur wissen, wofür du gerade bezahlst.</p>` +
      `<h2>Wann Nummerierung Marketing ist — und wann Substanz</h2>` +
      `<p>Die Nummer hat <strong>echten Inhalt</strong>, wenn:</p>` +
      `<ul>` +
      `<li>die Auflage wirklich geschlossen ist und das nachvollziehbar dokumentiert wurde,</li>` +
      `<li>der Druckprozess physische Unterschiede zwischen den Nummern erzeugt (Radierung, Lithografie),</li>` +
      `<li>der Künstler einen Namen hat und eine Auflage von 50 dadurch wirklich selten und gefragt ist,</li>` +
      `<li>ein unabhängiger Verleger — ein Museum, eine Edition-Reihe — für den Prozess geradesteht.</li>` +
      `</ul>` +
      `<p>Die Nummer ist reine <strong>Werbung</strong>, wenn:</p>` +
      `<ul>` +
      `<li>die „limitierte" Auflage bei 5.000 liegt und der Künstler dasselbe Motiv in zehn weiteren Größen verkauft,</li>` +
      `<li>es gar kein Zertifikat gibt — oder das Zertifikat nur vom Künstler selbst stammt, ohne unabhängige Prüfung,</li>` +
      `<li>die Nummer zwar handschriftlich ist, der Druck dahinter aber industriell in Serie gefertigt wurde,</li>` +
      `<li>niemand ernsthaft nachprüfen kann, ob tatsächlich nur 100 Exemplare existieren.</li>` +
      `</ul>` +
      `<h2>Drei Dinge, die du vor dem Kauf prüfen solltest</h2>` +
      `<h3>1. Gibt es ein vollständiges Echtheitszertifikat?</h3>` +
      `<p>Darauf gehören: Titel des Werks, Name des Künstlers, Auflagenhöhe, konkrete Nummer, Druckmethode, Papierqualität, Datum und Signatur. Fehlt davon die Hälfte? Finger weg.</p>` +
      `<h3>2. Wer steht als Verleger dahinter?</h3>` +
      `<p>Ein Druck direkt aus dem Atelier des Künstlers ist nicht automatisch schlechter — aber weniger prüfbar. Ein Verleger oder eine etablierte Galerie hat einen Ruf zu verlieren. Beides kann in Ordnung sein. Entscheidend ist nur: <em>Irgendjemand</em> muss für die Auflagengröße geradestehen.</p>` +
      `<h3>3. Mit welcher Methode wurde gedruckt?</h3>` +
      `<p>Frag konkret nach. Giclée auf Hahnemühle 308 g? Offsetdruck? Lithografie? Die Methode verrät dir mehr über die Langlebigkeit als jede Auflagenzahl. Pigmenttinte auf Archivpapier hält über 100 Jahre. Standard-Tintenstrahl auf Fotopapier verblasst in zehn.</p>` +
      `<h2>Der Sonderfall: sehr große Auflagen</h2>` +
      `<img src="/blog-images/2026/04/22/nummerierter-kunstdruck-was-auflage-wirklich-bedeutet-inline-2.png" alt="Draufsicht auf ein riesiges Raster von 24.236 nummerierten Ausschnitten eines Ölgemäldes" loading="lazy" class="blog-inline-image" />` +
      `<p>Was passiert, wenn die Auflage nicht 100 Exemplare hat, sondern 24.236? Bricht das ganze Prinzip zusammen?</p>` +
      `<p>Das war die Frage, die mich zu meinem eigenen Projekt gebracht hat. Auf <a href="/">i-laugh-you</a> ist die Auflage genau ein Selbstporträt — zerschnitten in 24.236 nummerierte Fragmente. Jedes Fragment zeigt einen anderen Ausschnitt des Originalgemäldes. Jedes trägt eine Nummer. Jedes hat ein eigenes Zertifikat.</p>` +
      `<p>Der Unterschied zur klassischen Auflage: Die Fragmente sind nicht identisch. Jedes Fragment ist ein Unikat — es zeigt einen anderen Teil des Bildes. Die Nummer bleibt, aber die Logik dreht sich um: statt „1 von 100 identischen Drucken" heißt es jetzt „einer von 24.236 unterschiedlichen Ausschnitten eines einzigen Gemäldes".</p>` +
      `<p>Das ist ehrlicher. Die Knappheit wird nicht verschleiert — sie wird offen hingestellt. Eine so hohe Zahl <em>kann</em> gar nicht mehr so tun, als wäre sie natürlich entstanden. Sie ist sichtbar eine Entscheidung.</p>` +
      `<h2>Was du mitnehmen solltest</h2>` +
      `<p>Ein nummerierter Kunstdruck ist genau so viel wert wie die Summe aus drei Dingen:</p>` +
      `<ol>` +
      `<li>die Echtheit ist glaubwürdig dokumentiert,</li>` +
      `<li>die Druckqualität hält lange,</li>` +
      `<li>und Künstler oder Verleger haben einen Ruf, den sie bei Regelbrüchen verlieren würden.</li>` +
      `</ol>` +
      `<p>Die Nummer in der Ecke ist Information, keine Garantie. Ein 1/500 eines bekannten Künstlers auf Museumspapier ist meistens mehr wert als ein 3/50 eines Unbekannten auf Standardpapier.</p>` +
      `<blockquote>Kauf das Werk, nicht die Nummer. Die Nummer beweist nur, dass irgendjemand mitgezählt hat.</blockquote>` +
      `<p>Und wenn dich interessiert, wie eine Auflage aussieht, die ihre eigene Künstlichkeit offen zugibt: <a href="/">Klick dich durch die Leinwand von i-laugh-you</a>. Dort ist die Zahl 24.236 nicht versteckt — sie ist das ganze Thema.</p>`,
  },

  {
    slug: "kunst-nach-farbe-finden-hex-code",
    excerpt:
      "Wie du Kunst findest, die zu deiner Wandfarbe wirklich passt — mit Hex-Codes statt Bauchgefühl. Ohne App, ohne Innenarchitekt. Schritt für Schritt erklärt.",
    content:
      `<p>Die meisten Leute machen einen von zwei teuren Fehlern. Entweder sie kaufen zuerst ein Wandbild, streichen dann die Wand in einer Farbe, die nicht passt, und verbringen das Wochenende mit Farbkarten im Baumarkt. Oder sie streichen zuerst die Wand und kaufen danach Kunst, die neben dem frischen Farbton plötzlich seltsam aussieht. Beides kostet Nerven und Geld.</p>` +
      `<p><strong>Kunst nach Farbe finden</strong> — und zwar systematisch, mit Hex-Codes — ist der entspannte Weg. Kein Innenarchitekt, keine Abo-App. Nur ein bisschen Technik und drei Minuten Farblehre. So geht's.</p>` +
      `<h2>Zuerst: Warum erst Farbe, dann Kunst — und nicht umgekehrt</h2>` +
      `<p>Wandfarbe ist günstig pro Quadratmeter. Ein guter Kunstdruck nicht. Ein Zimmer neu zu streichen kostet dich einen Samstag und 80 Euro Farbe. Ein Kunstwerk wieder abzuhängen, weil es einfach nicht harmoniert, kostet dich mehr — vor allem innerlich.</p>` +
      `<p>Der noch wichtigere Grund: Die Kunst ist der Blickfang, die Wand ist der Hintergrund. Du willst nicht, dass der Hintergrund mit dem Vordergrund kämpft oder ihn am Ende sogar überstrahlt.</p>` +
      `<blockquote>Die Wand dient der Kunst, nicht umgekehrt. Wenn du zuerst die Wand wählst, entscheidest du damit bereits, welche Kunst überhaupt noch passen darf.</blockquote>` +
      `<p>Mein Vorschlag: Wenn du beides neu planst, such dir zuerst das Bild aus und streich danach. Wenn deine Wand aber bereits steht und du sie nicht mehr überstreichen willst, lies weiter. Genau darum geht's im Rest.</p>` +
      `<h2>Schritt 1: Finde den Hex-Code deiner Wand</h2>` +
      `<p>Ein Hex-Code ist ein sechsstelliger Farbwert, zum Beispiel #8FA87A für ein Salbeigrün. Er beschreibt eine Farbe eindeutig — egal auf welchem Gerät, egal in welchem Shop. Sobald du diesen Code hast, kannst du überall im Netz nach genau dieser Farbe suchen.</p>` +
      `<p>So findest du ihn — gratis, ohne Installation:</p>` +
      `<h3>Methode A: Foto + Browser-Pipette</h3>` +
      `<ol>` +
      `<li>Mach ein Foto deiner Wand bei Tageslicht, ohne direkte Sonne. Keine Lampe mit drauf.</li>` +
      `<li>Lade das Foto auf eine Seite wie imagecolorpicker.com hoch — oder öffne es einfach in einem neuen Browser-Tab.</li>` +
      `<li>In Chrome oder Firefox: Rechtsklick auf das Foto → „Untersuchen" (oder F12). Die Entwickler-Ansicht öffnet sich.</li>` +
      `<li>Oben im Elements-Panel findest du ein kleines Pipetten-Symbol. Klick es an, dann klick auf einen Pixel deiner Wand im Foto.</li>` +
      `<li>Der Hex-Code erscheint automatisch. Schreib ihn dir auf.</li>` +
      `</ol>` +
      `<h3>Methode B: ColorZilla (Browser-Erweiterung)</h3>` +
      `<p>ColorZilla ist eine kostenlose Erweiterung für Chrome und Firefox. Installieren, Pipette aktivieren, auf irgendeine Stelle auf deinem Bildschirm klicken — und der Hex-Code liegt in der Zwischenablage. Schneller als Methode A, wenn du das öfter brauchst.</p>` +
      `<h3>Methode C: Direkt beim Farbhersteller</h3>` +
      `<p>Weißt du noch, welche Farbe du gestrichen hast — etwa „Jotun Sage Green 6394"? Dann google einfach den offiziellen Hex-Code dazu. Viele Hersteller veröffentlichen ihn auf ihrer Website. Das Ergebnis ist exakter als jedes Foto, denn Fotos verschieben Farben immer ein bisschen.</p>` +
      `<h2>Schritt 2: Verstehe Farbharmonie in drei Minuten</h2>` +
      `<img src="/blog-images/2026/04/22/kunst-nach-farbe-finden-hex-code-inline-1.png" alt="Farbkreis mit markierten komplementären, analogen und triadischen Farbbeziehungen" loading="lazy" class="blog-inline-image" />` +
      `<p>Du musst dafür keinen Kurs in Farblehre belegen. Drei Begriffe reichen:</p>` +
      `<h3>Komplementär</h3>` +
      `<p>Farben, die sich im Farbkreis gegenüberliegen. Blau und Orange. Rot und Grün. Gelb und Violett. Hoher Kontrast, viel Energie. Ein oranges Bild vor einer blauen Wand zieht sofort alle Blicke auf sich — super für eine Statement-Wand, kann aber in kleinen Räumen schnell anstrengend werden.</p>` +
      `<h3>Analog</h3>` +
      `<p>Farben, die im Farbkreis direkt nebeneinander liegen. Blau, Blaugrün, Grün. Ruhig, harmonisch, natürlich. Kunst in ähnlichen Tönen wie die Wand wirkt einladend und wie aus einem Guss. Perfekt für Schlafzimmer und andere Rückzugsräume.</p>` +
      `<h3>Triadisch</h3>` +
      `<p>Drei Farben, die im Farbkreis gleich weit voneinander entfernt liegen — klassisch Gelb, Blau und Rot. Lebendig, aber trotzdem ausgewogen. Die Kunst nimmt ein oder zwei dieser Farben auf, die Wand die dritte.</p>` +
      `<p>Das reicht. Mehr Theorie brauchst du für den Anfang nicht.</p>` +
      `<h2>Schritt 3: Übersetze den Hex-Code in Suchbegriffe</h2>` +
      `<p>Sagen wir, du hast jetzt #8FA87A. Geh auf colorhexa.com, gib den Code ein. Du bekommst auf einer Seite:</p>` +
      `<ul>` +
      `<li>den Farbnamen (hier: „Moss Green" bzw. „Moosgrün"),</li>` +
      `<li>passende Komplementärfarben (für bewussten Kontrast),</li>` +
      `<li>analoge Farben (für sanfte Harmonie),</li>` +
      `<li>eine Liste ähnlicher, benannter Farben.</li>` +
      `</ul>` +
      `<p>Mit diesen Namen gehst du jetzt auf Suche. „Moosgrün Wandbild" liefert dir harmonische Treffer. „Rostrot Wandbild" — die Komplementärfarbe — liefert dir bewusst kontrastierende.</p>` +
      `<h2>Schritt 4: Nutze eine Kunst-Plattform mit Farb-Filter</h2>` +
      `<img src="/blog-images/2026/04/22/kunst-nach-farbe-finden-hex-code-inline-2.png" alt="Vergleich: salbeigrüne Wand mit Hex-Code #8FA87A neben drei abgestimmten Kunstfragmenten" loading="lazy" class="blog-inline-image" />` +
      `<p>Die meisten Online-Shops für Kunst haben keinen ernsthaften Farbfilter. „Blau" als Kategorie ist viel zu grob. Du suchst #8FA87A, kannst aber nur auf „Grün" filtern — und bekommst Neongrün, Flaschengrün und alles dazwischen durcheinandergewürfelt.</p>` +
      `<p>Nur wenige Plattformen arbeiten mit präziser Farbsuche. <a href="/">i-laugh-you</a> ist eine davon. Das ganze Projekt besteht aus einem einzigen Ölgemälde, das in 24.236 Fragmente zerteilt wurde. Jedes Fragment hat eine eigene dominante Farbpalette, die direkt durchsuchbar ist. Du gibst deinen Hex-Code ein, das System zeigt dir die Fragmente, die genau zu dieser Farbe passen.</p>` +
      `<p>Genau darauf war das Design ausgelegt: Wer eine salbeigrüne Wand hat, soll nicht durch tausende irrelevante Bilder scrollen müssen. Drei Klicks — und du bist bei den zehn Fragmenten, die deine Wandfarbe entweder aufnehmen oder bewusst dagegenhalten.</p>` +
      `<h2>Wann du Farbabstimmung komplett ignorieren solltest</h2>` +
      `<p>Eigentlich nie. Fast nie.</p>` +
      `<p>Es gibt genau eine Ausnahme: Wenn die Kunst bewusst der visuelle Schock sein soll. Ein tiefschwarzes Bild an einer knallweißen Wand. Ein knallrotes Statement in einem ansonsten komplett monochromen Raum. Wenn das Bild der Gesprächsanker für jeden Besucher werden soll, darf es ruhig mit der Wand brechen.</p>` +
      `<p>Aber das ist dann eine bewusste Entscheidung, kein glücklicher Zufall. Wer einfach hofft, dass zufällig gewählter Kontrast schon irgendwie „funktioniert", hat in drei von vier Fällen Pech. Auswählen schlägt Hoffen.</p>` +
      `<h2>Was du tatsächlich tun solltest, wenn du gleich anfängst</h2>` +
      `<ol>` +
      `<li>Foto der Wand machen — Tageslicht, keine Lampe im Bild.</li>` +
      `<li>Hex-Code auslesen (Entwickler-Pipette, ColorZilla oder direkt vom Hersteller).</li>` +
      `<li>Auf colorhexa.com den Farbnamen und die passenden Harmoniefarben ansehen.</li>` +
      `<li>Entscheiden: willst du harmonisch (analog) oder kontrastreich (komplementär)?</li>` +
      `<li>Kunstplattform mit echtem Farbfilter öffnen — oder direkt auf <a href="/">i-laugh-you</a> die Farbpipette über der Leinwand benutzen.</li>` +
      `<li>Vor dem Kauf: Kandidaten in Originalgröße ausdrucken, an die Wand halten, zwei Tage hängen lassen. Erst dann bestellen.</li>` +
      `</ol>` +
      `<blockquote>Ein gutes Wandbild sieht nicht nur bei Tageslicht gut aus. Es muss auch um 22 Uhr unter der Deckenlampe noch funktionieren. Teste das, bevor du zahlst.</blockquote>` +
      `<p>Das ist die ganze Methode. Kein Innenarchitekt, kein Abo. Nur ein Hex-Code, drei Begriffe Farblehre und die Geduld, ein Bild vor dem Kauf zwei Tage an der Wand probe-hängen zu lassen — zur Not als einfacher Papierausdruck.</p>` +
      `<p>Und wenn du die Farbpipette direkt ausprobieren willst: <a href="/">geh auf die Startseite von i-laugh-you</a>. Gib einen Hex-Code ein — das System zeigt dir sofort die Fragmente des Gemäldes, die genau diese Farbe tragen. Kein Katalog durchklicken. Farbe rein, Kunst raus.</p>`,
  },
];

// ---------------------------------------------------------------------------

const selectBySlug = db.prepare(
  `SELECT id, slug FROM blog_articles WHERE slug = ?`
);
const updateArticle = db.prepare(
  `UPDATE blog_articles SET excerpt = ?, content = ?, word_count = ? WHERE id = ?`
);

let updated = 0;
for (const post of REWRITES) {
  const row = selectBySlug.get(post.slug);
  if (!row) {
    console.log(`[miss] ${post.slug}`);
    continue;
  }
  const wc = countWords(post.content);
  updateArticle.run(post.excerpt, post.content, wc, row.id);
  console.log(`[update] ${post.slug} -> ${wc} words`);
  updated++;
}

console.log(`\nDone. Updated ${updated} article(s).`);
db.close();
