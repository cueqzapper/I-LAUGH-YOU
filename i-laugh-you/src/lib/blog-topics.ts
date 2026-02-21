export interface BlogTopic {
  key: string;
  category: BlogCategory;
  titleDe: string;
  promptDe: string;
  imagePrompt: string;
  tags: string[];
}

export type BlogCategory =
  | "kunstmarkt"
  | "kunst-kapitalismus"
  | "kunstgeschichte"
  | "das-projekt"
  | "demokratisierung"
  | "kunstphilosophie"
  | "zeitgenoessische-kunst";

export const CATEGORY_LABELS: Record<BlogCategory, string> = {
  kunstmarkt: "Kunstmarkt",
  "kunst-kapitalismus": "Kunst & Kapitalismus",
  kunstgeschichte: "Kunstgeschichte",
  "das-projekt": "Das Projekt",
  demokratisierung: "Demokratisierung der Kunst",
  kunstphilosophie: "Kunstphilosophie",
  "zeitgenoessische-kunst": "Zeitgenössische Kunst",
};

export const BLOG_TOPICS: BlogTopic[] = [
  // --- Kunstmarkt (8) ---
  {
    key: "auktionshaeuser-macht",
    category: "kunstmarkt",
    titleDe: "Die Macht der Auktionshäuser",
    promptDe:
      "Schreibe einen Artikel über die Rolle von Christie's, Sotheby's und Phillips im globalen Kunstmarkt. Wie bestimmen sie Preise, Trends und wer als relevant gilt?",
    imagePrompt: "auction house interior with paintings and bidders, grand hall",
    tags: ["Auktionen", "Kunstmarkt", "Macht"],
  },
  {
    key: "kunstblase-spekulation",
    category: "kunstmarkt",
    titleDe: "Kunstblase — Spekulation und Überpreise",
    promptDe:
      "Analysiere das Phänomen der Kunstblase: Warum werden manche Werke für absurde Summen gehandelt? Was passiert wenn die Blase platzt?",
    imagePrompt: "abstract balloon made of money floating over a gallery",
    tags: ["Spekulation", "Blase", "Preise"],
  },
  {
    key: "galerien-gatekeeper",
    category: "kunstmarkt",
    titleDe: "Galerien als Gatekeeper",
    promptDe:
      "Untersuche die Rolle von Galerien als Türsteher der Kunstwelt. Wie entscheiden sie, wer ausgestellt wird und wer nicht? Welche Alternativen gibt es?",
    imagePrompt: "gallery entrance with velvet rope and bouncer silhouette",
    tags: ["Galerien", "Zugang", "Selektion"],
  },
  {
    key: "kunstmessen-globalisierung",
    category: "kunstmarkt",
    titleDe: "Art Basel, Frieze & Co. — Kunstmessen im Spannungsfeld",
    promptDe:
      "Schreibe über die großen Kunstmessen der Welt. Wie haben sie den Kunsthandel verändert? Wer profitiert, wer bleibt draußen?",
    imagePrompt: "busy art fair with crowds viewing contemporary installations",
    tags: ["Kunstmessen", "Globalisierung", "Handel"],
  },
  {
    key: "kunstmarkt-online",
    category: "kunstmarkt",
    titleDe: "Der digitale Kunstmarkt",
    promptDe:
      "Wie hat das Internet den Kunsthandel revolutioniert? Von Online-Auktionen bis zu Instagram-Galerien — analysiere die Digitalisierung des Kunstmarkts.",
    imagePrompt: "laptop screen showing art gallery in a modern studio",
    tags: ["Digital", "Online", "Transformation"],
  },
  {
    key: "kunstberater-einfluss",
    category: "kunstmarkt",
    titleDe: "Kunstberater — die unsichtbaren Strippenzieher",
    promptDe:
      "Beleuchte die Rolle von Kunstberatern und -beraterinnen. Wie beeinflussen sie Sammlungen, Preise und Karrieren?",
    imagePrompt: "shadowy figure whispering to a collector in front of paintings",
    tags: ["Berater", "Einfluss", "Sammler"],
  },
  {
    key: "faelschungen-authentizitaet",
    category: "kunstmarkt",
    titleDe: "Fälschungen und die Frage der Authentizität",
    promptDe:
      "Schreibe über berühmte Kunstfälschungen und was sie über unseren Authentizitätsbegriff verraten. Von Beltracchi bis zu KI-generierter Kunst.",
    imagePrompt: "two identical paintings side by side, one crumbling at edges",
    tags: ["Fälschung", "Authentizität", "Betrug"],
  },
  {
    key: "emerging-artists-markt",
    category: "kunstmarkt",
    titleDe: "Emerging Artists — Frischfleisch für den Markt",
    promptDe:
      "Wie werden junge Künstler:innen vom Markt entdeckt, gehypt und manchmal fallengelassen? Die Mechanismen des Emerging-Art-Markts.",
    imagePrompt: "young artist painting in small studio, spotlight from above",
    tags: ["Emerging", "Künstler", "Karriere"],
  },

  // --- Kunst & Kapitalismus (8) ---
  {
    key: "kunst-als-waehrung",
    category: "kunst-kapitalismus",
    titleDe: "Kunst als Währung der Reichen",
    promptDe:
      "Analysiere wie Kunst als alternative Anlageklasse funktioniert. Freihafen-Lager, Steuervermeidung und Geldwäsche — die dunkle Seite der Kunstinvestition.",
    imagePrompt: "golden vault filled with framed paintings instead of money",
    tags: ["Investment", "Reichtum", "Steuern"],
  },
  {
    key: "kuenstler-prekariat",
    category: "kunst-kapitalismus",
    titleDe: "Das Künstler-Prekariat",
    promptDe:
      "Schreibe über die finanzielle Realität der meisten Künstler:innen. Während der Markt Milliardenrekorde feiert, leben 90% der Kunstschaffenden unter der Armutsgrenze.",
    imagePrompt: "empty wallet on a paint-stained artist workbench",
    tags: ["Armut", "Ungleichheit", "Künstler"],
  },
  {
    key: "nft-versprechen-enttaeuschung",
    category: "kunst-kapitalismus",
    titleDe: "NFTs — Revolution oder Spekulation?",
    promptDe:
      "Reflektiere kritisch über das NFT-Phänomen in der Kunst. Was bleibt nach dem Hype? Haben NFTs die Machtverhältnisse im Kunstmarkt verändert?",
    imagePrompt: "pixelated digital artwork dissolving into cryptocurrency symbols",
    tags: ["NFT", "Blockchain", "Spekulation"],
  },
  {
    key: "kunstfreiheit-vs-markt",
    category: "kunst-kapitalismus",
    titleDe: "Kunstfreiheit vs. Marktlogik",
    promptDe:
      "Kann Kunst frei sein, wenn sie sich verkaufen muss? Untersuche das Spannungsfeld zwischen künstlerischer Freiheit und ökonomischem Zwang.",
    imagePrompt: "bird in a golden cage surrounded by price tags",
    tags: ["Freiheit", "Markt", "Spannung"],
  },
  {
    key: "maezenatentum-heute",
    category: "kunst-kapitalismus",
    titleDe: "Mäzenatentum im 21. Jahrhundert",
    promptDe:
      "Von den Medicis bis zu Tech-Milliardären — wie hat sich das Kunstsponsoring verändert? Wer fördert heute Kunst und mit welchen Interessen?",
    imagePrompt: "modern skyscraper casting shadow over a small art studio",
    tags: ["Mäzenatentum", "Sponsoring", "Förderung"],
  },
  {
    key: "kulturfoerderung-staatlich",
    category: "kunst-kapitalismus",
    titleDe: "Staatliche Kulturförderung — Segen oder Kontrolle?",
    promptDe:
      "Untersuche die Rolle staatlicher Kunstförderung in Europa. Befreit sie Künstler:innen vom Markt oder schafft sie neue Abhängigkeiten?",
    imagePrompt: "government building with art flowing out of its windows",
    tags: ["Förderung", "Staat", "Kulturpolitik"],
  },
  {
    key: "warhol-kapitalismus",
    category: "kunst-kapitalismus",
    titleDe: "Warhol und die Kunst des Kapitalismus",
    promptDe:
      "Andy Warhol machte den Kapitalismus zum Thema seiner Kunst — und wurde dabei reich. Was können wir heute von seinem Ansatz lernen?",
    imagePrompt: "pop art style factory with dollar signs as smoke",
    tags: ["Warhol", "Pop Art", "Kapitalismus"],
  },
  {
    key: "kunst-gentrifizierung",
    category: "kunst-kapitalismus",
    titleDe: "Kunst und Gentrifizierung",
    promptDe:
      "Wie Künstler:innen ungewollt zur Aufwertung von Stadtvierteln beitragen und dann selbst verdrängt werden. Der Kreislauf der kulturellen Gentrifizierung.",
    imagePrompt: "artist studio being demolished, luxury apartment rising behind",
    tags: ["Gentrifizierung", "Stadt", "Verdrängung"],
  },

  // --- Kunstgeschichte (7) ---
  {
    key: "impressionismus-revolution",
    category: "kunstgeschichte",
    titleDe: "Der Impressionismus — als Kunst rebellisch wurde",
    promptDe:
      "Erzähle die Geschichte des Impressionismus als revolutionäre Bewegung. Wie Monet, Renoir und Degas die Kunstwelt auf den Kopf stellten.",
    imagePrompt: "impressionist garden scene with bold brushstrokes",
    tags: ["Impressionismus", "Revolution", "Malerei"],
  },
  {
    key: "bauhaus-erbe",
    category: "kunstgeschichte",
    titleDe: "100+ Jahre Bauhaus — ein Erbe für heute",
    promptDe:
      "Analysiere das Erbe des Bauhaus für die heutige Kunst und Gestaltung. Was bleibt relevant, was wurde missverstanden?",
    imagePrompt: "geometric Bauhaus building with colorful shapes",
    tags: ["Bauhaus", "Design", "Moderne"],
  },
  {
    key: "dada-chaos",
    category: "kunstgeschichte",
    titleDe: "Dada — Kunst aus dem Chaos",
    promptDe:
      "Schreibe über die Dada-Bewegung als radikale Antwort auf den Ersten Weltkrieg. Wie das bewusste Chaos zur Kunstform wurde.",
    imagePrompt: "collage of random objects, newspapers and masks in chaotic arrangement",
    tags: ["Dada", "Avantgarde", "Antikunst"],
  },
  {
    key: "frauen-kunstgeschichte",
    category: "kunstgeschichte",
    titleDe: "Die vergessenen Frauen der Kunstgeschichte",
    promptDe:
      "Beleuchte vergessene und unterschätzte Künstlerinnen der Geschichte. Von Artemisia Gentileschi bis Hilma af Klint.",
    imagePrompt: "woman painter in renaissance studio, surrounded by canvases",
    tags: ["Frauen", "Geschichte", "Sichtbarkeit"],
  },
  {
    key: "konzeptkunst-idee",
    category: "kunstgeschichte",
    titleDe: "Konzeptkunst — wenn die Idee das Werk ist",
    promptDe:
      "Erkläre die Konzeptkunst-Bewegung. Warum ist ein leerer Raum oder eine Anweisung auf Papier Kunst? Von Sol LeWitt bis Yoko Ono.",
    imagePrompt: "empty white gallery room with single text on the wall",
    tags: ["Konzeptkunst", "Idee", "Minimal"],
  },
  {
    key: "expressionismus-schrei",
    category: "kunstgeschichte",
    titleDe: "Der Expressionismus — Kunst als Schrei",
    promptDe:
      "Schreibe über den Expressionismus als emotionale Antwort auf die Moderne. Von Kirchner über Schiele bis Munch.",
    imagePrompt: "distorted face painting with bold colors and thick brushstrokes",
    tags: ["Expressionismus", "Emotion", "Moderne"],
  },
  {
    key: "postmoderne-anything-goes",
    category: "kunstgeschichte",
    titleDe: "Postmoderne — alles ist erlaubt, nichts ist sicher",
    promptDe:
      "Analysiere die Postmoderne in der Kunst. Wie der Bruch mit der Moderne neue Freiheiten und neue Probleme schuf.",
    imagePrompt: "fragmented mirror reflecting different art styles simultaneously",
    tags: ["Postmoderne", "Pluralismus", "Ironie"],
  },

  // --- Das Projekt (7) ---
  {
    key: "ily-entstehung",
    category: "das-projekt",
    titleDe: "I LAUGH YOU — wie das größte Selbstporträt entstand",
    promptDe:
      "Erzähle die Entstehungsgeschichte des I LAUGH YOU Projekts. 24.236 einzigartige Teile, die zusammen ein Gesicht ergeben. Preise von 77€ bis 777€ — steigende Preise bei sinkender Auswahl. Beschreibe die Fakten, ohne die dahinterliegende Absicht zu erklären.",
    imagePrompt: "giant mosaic face made of thousands of tiny colorful pieces",
    tags: ["I LAUGH YOU", "Entstehung", "Selbstporträt"],
  },
  {
    key: "ily-preismodell",
    category: "das-projekt",
    titleDe: "Ab 77€ pro Stück — Kunst für alle",
    promptDe:
      "Schreibe über das Preismodell von I LAUGH YOU. 24.236 Teile, Preise von 77€ bis 777€. Je mehr verkauft werden, desto weniger Auswahl bleibt und desto teurer wird es. Beschreibe die Mechanik sachlich — lass den Leser seine eigenen Schlüsse über Wert und Knappheit ziehen.",
    imagePrompt: "single euro coin transforming into colorful artwork",
    tags: ["I LAUGH YOU", "Preis", "Zugang"],
  },
  {
    key: "ily-teilhabe",
    category: "das-projekt",
    titleDe: "24.236 Besitzer — eine Gemeinschaft der Kunst",
    promptDe:
      "Schreibe über die Vision von I LAUGH YOU: ein Kunstwerk, das tausenden Menschen gehört. Was bedeutet geteiltes Eigentum an Kunst?",
    imagePrompt: "crowd of diverse people each holding a small piece of a larger picture",
    tags: ["I LAUGH YOU", "Gemeinschaft", "Teilhabe"],
  },
  {
    key: "ily-lachen-kapitalismus",
    category: "das-projekt",
    titleDe: "Lachen als Waffe gegen den Kunstmarkt",
    promptDe:
      "Analysiere die subversive Kraft des Lachens in I LAUGH YOU. Wie Humor und Ironie als Kritik am Kunstestablishment funktionieren.",
    imagePrompt: "laughing face composed of broken price tags and gallery signs",
    tags: ["I LAUGH YOU", "Humor", "Subversion"],
  },
  {
    key: "ily-demokratie-kunst",
    category: "das-projekt",
    titleDe: "Demokratie in der Kunst — ein Experiment",
    promptDe:
      "Diskutiere I LAUGH YOU als demokratisches Experiment. Kann ein Kunstwerk wirklich allen gehören? Welche Hürden und Chancen gibt es?",
    imagePrompt: "ballot box filled with miniature paintings instead of votes",
    tags: ["I LAUGH YOU", "Demokratie", "Experiment"],
  },
  {
    key: "ily-digitale-kunst",
    category: "das-projekt",
    titleDe: "Zwischen Digital und Physisch — Kunst im Netz",
    promptDe:
      "Schreibe über die digitale Dimension von I LAUGH YOU. Wie das Internet neue Formen der Kunsterfahrung und des Besitzes ermöglicht.",
    imagePrompt: "painting dissolving into pixels and floating through fiber optic cables",
    tags: ["I LAUGH YOU", "Digital", "Internet"],
  },
  {
    key: "ily-provokation",
    category: "das-projekt",
    titleDe: "Provokation als Methode",
    promptDe:
      "Wie I LAUGH YOU bewusst provoziert. Ist es Kunst? Ist es Kommerz? Und warum genau diese Frage der Kern des Projekts ist.",
    imagePrompt: "controversial artwork being debated by suited critics and street audience",
    tags: ["I LAUGH YOU", "Provokation", "Debatte"],
  },

  // --- Demokratisierung (6) ---
  {
    key: "kunst-fuer-alle",
    category: "demokratisierung",
    titleDe: "Kunst für alle — mehr als ein Slogan?",
    promptDe:
      "Hinterfrage den Ruf nach Demokratisierung der Kunst. Wer profitiert wirklich? Welche Modelle funktionieren? Und wo bleibt es bei leeren Worten?",
    imagePrompt: "museum doors being opened wide to a diverse crowd",
    tags: ["Zugang", "Demokratie", "Gleichheit"],
  },
  {
    key: "social-media-kunstrevolution",
    category: "demokratisierung",
    titleDe: "Instagram, TikTok & die Kunstrevolution",
    promptDe:
      "Analysiere wie Social Media die Kunstwelt verändert hat. Können Künstler:innen ohne Galerie erfolgreich sein? Die Macht und Grenzen der Plattformen.",
    imagePrompt: "smartphone screen showing art going viral with hearts and shares",
    tags: ["Social Media", "Plattformen", "Sichtbarkeit"],
  },
  {
    key: "open-source-kunst",
    category: "demokratisierung",
    titleDe: "Open Source Kunst — teile und herrsche (nicht)",
    promptDe:
      "Schreibe über Open-Source-Ansätze in der Kunst. Creative Commons, kollaborative Kunstprojekte und was passiert, wenn Kunst frei wird.",
    imagePrompt: "open padlock surrounded by freely floating creative elements",
    tags: ["Open Source", "Freiheit", "Kollaboration"],
  },
  {
    key: "street-art-demokratisch",
    category: "demokratisierung",
    titleDe: "Street Art — Kunst ohne Eintritt",
    promptDe:
      "Beleuchte Street Art als demokratischste Kunstform. Von Banksy bis zu lokalen Sprayern — Kunst im öffentlichen Raum als Statement.",
    imagePrompt: "colorful mural being painted on a grey concrete wall in a city",
    tags: ["Street Art", "Öffentlich", "Urban"],
  },
  {
    key: "ki-kunst-zugang",
    category: "demokratisierung",
    titleDe: "KI-Kunst — demokratisiert oder entwertet?",
    promptDe:
      "Diskutiere KI-generierte Kunst als Demokratisierungstool. Wenn jeder Kunst schaffen kann, was bedeutet das für Qualität, Originalität und den Beruf Künstler:in?",
    imagePrompt: "human hand and robotic hand both holding a paintbrush",
    tags: ["KI", "Technologie", "Kreativität"],
  },
  {
    key: "community-art-projekte",
    category: "demokratisierung",
    titleDe: "Community Art — Kunst aus der Nachbarschaft",
    promptDe:
      "Schreibe über Community-Art-Projekte weltweit. Wie Kunst Gemeinschaften stärkt, Stimmen gibt und soziale Veränderung bewirkt.",
    imagePrompt: "neighborhood creating a collaborative mural together",
    tags: ["Community", "Sozial", "Gemeinschaft"],
  },

  // --- Kunstphilosophie (7) ---
  {
    key: "was-ist-kunst",
    category: "kunstphilosophie",
    titleDe: "Was ist Kunst? — die ewige Frage",
    promptDe:
      "Untersuche die philosophische Frage 'Was ist Kunst?' von Platon bis heute. Warum es keine endgültige Antwort gibt und warum das gut so ist.",
    imagePrompt: "question mark made of different art materials and styles",
    tags: ["Philosophie", "Definition", "Frage"],
  },
  {
    key: "aura-kunstwerk",
    category: "kunstphilosophie",
    titleDe: "Walter Benjamin und die Aura des Kunstwerks",
    promptDe:
      "Erkläre Benjamins Konzept der Aura im Zeitalter der technischen Reproduzierbarkeit. Was bedeutet es heute, im Zeitalter der digitalen Reproduktion?",
    imagePrompt: "glowing painting in a dark room casting ethereal light",
    tags: ["Benjamin", "Aura", "Reproduktion"],
  },
  {
    key: "schoenheit-kunst",
    category: "kunstphilosophie",
    titleDe: "Muss Kunst schön sein?",
    promptDe:
      "Diskutiere die Beziehung zwischen Kunst und Schönheit. Von der klassischen Ästhetik bis zur bewussten Hässlichkeit in der modernen Kunst.",
    imagePrompt: "half beautiful half disturbing face painting",
    tags: ["Ästhetik", "Schönheit", "Provokation"],
  },
  {
    key: "kuenstler-genie-mythos",
    category: "kunstphilosophie",
    titleDe: "Der Genie-Mythos — muss ein Künstler leiden?",
    promptDe:
      "Hinterfrage den Mythos des leidenden Genies. Von Van Gogh bis zur heutigen Romantisierung psychischer Krankheit bei Künstler:innen.",
    imagePrompt: "tortured artist silhouette in candlelight with masterpiece behind",
    tags: ["Genie", "Mythos", "Leiden"],
  },
  {
    key: "kunst-wahrheit",
    category: "kunstphilosophie",
    titleDe: "Kann Kunst die Wahrheit sagen?",
    promptDe:
      "Schreibe über das Verhältnis von Kunst und Wahrheit. Ist Kunst eine Form der Erkenntnis? Was sieht Kunst, was die Wissenschaft nicht sieht?",
    imagePrompt: "painting revealing hidden reality behind everyday surface",
    tags: ["Wahrheit", "Erkenntnis", "Philosophie"],
  },
  {
    key: "ready-made-duchamp",
    category: "kunstphilosophie",
    titleDe: "Duchamps Urinal — als alles Kunst wurde",
    promptDe:
      "Analysiere Marcel Duchamps Ready-Made und seine Folgen. Wie ein umgedrehtes Urinal den Kunstbegriff für immer veränderte.",
    imagePrompt: "porcelain urinal on a pedestal in a museum with golden frame",
    tags: ["Duchamp", "Ready-Made", "Revolution"],
  },
  {
    key: "betrachter-macht",
    category: "kunstphilosophie",
    titleDe: "Der Betrachter macht das Werk",
    promptDe:
      "Diskutiere die Rolle des Betrachters/der Betrachterin in der Kunst. Entsteht Bedeutung erst im Auge des Publikums? Von Duchamp über Barthes bis zur Participatory Art.",
    imagePrompt: "viewer looking at blank canvas seeing colorful reflections",
    tags: ["Betrachter", "Rezeption", "Partizipation"],
  },

  // --- Zeitgenössische Kunst (7) ---
  {
    key: "ai-art-zukunft",
    category: "zeitgenoessische-kunst",
    titleDe: "KI-Kunst — das Ende des Künstlers?",
    promptDe:
      "Untersuche die Debatte um KI-generierte Kunst. Ist es Kreativität oder Kopie? Wer ist der Autor? Und was bedeutet es für die Zukunft menschlicher Kunst?",
    imagePrompt: "AI neural network forming abstract paintings on digital canvas",
    tags: ["KI", "Zukunft", "Kreativität"],
  },
  {
    key: "performancekunst-koerper",
    category: "zeitgenoessische-kunst",
    titleDe: "Performance-Kunst — der Körper als Material",
    promptDe:
      "Schreibe über Performance-Kunst als radikale Kunstform. Von Marina Abramović bis Tino Sehgal — wenn der Körper zum Kunstwerk wird.",
    imagePrompt: "performer in empty space with audience watching intently",
    tags: ["Performance", "Körper", "Live"],
  },
  {
    key: "politische-kunst",
    category: "zeitgenoessische-kunst",
    titleDe: "Politische Kunst — muss Kunst Stellung beziehen?",
    promptDe:
      "Diskutiere die Verbindung von Kunst und Politik. Von Ai Weiwei bis Guerrilla Girls — kann und soll Kunst die Welt verändern?",
    imagePrompt: "protest signs transformed into colorful art installations",
    tags: ["Politik", "Aktivismus", "Gesellschaft"],
  },
  {
    key: "immersive-experiences",
    category: "zeitgenoessische-kunst",
    titleDe: "Immersive Experiences — Kunst oder Entertainment?",
    promptDe:
      "Analysiere den Trend der immersiven Kunstinstallationen. Teamlab, Van Gogh Experiences — wo hört Kunst auf und wo beginnt Unterhaltung?",
    imagePrompt: "visitors walking through projected colorful light installation",
    tags: ["Immersiv", "Installation", "Erlebnis"],
  },
  {
    key: "kunst-klimakrise",
    category: "zeitgenoessische-kunst",
    titleDe: "Kunst in der Klimakrise",
    promptDe:
      "Wie reagiert die Kunstwelt auf die Klimakrise? Von Olafur Eliasson bis zu Suppenattacken — Kunst als Spiegel und Motor der Umweltbewegung.",
    imagePrompt: "melting sculpture in a gallery, nature reclaiming the space",
    tags: ["Klima", "Umwelt", "Nachhaltigkeit"],
  },
  {
    key: "dekoloniale-kunst",
    category: "zeitgenoessische-kunst",
    titleDe: "Dekoloniale Kunst — wessen Geschichte wird erzählt?",
    promptDe:
      "Schreibe über den dekolonialen Diskurs in der zeitgenössischen Kunst. Wem gehören Museumssammlungen? Wessen Stimmen fehlen?",
    imagePrompt: "museum artifacts floating back towards diverse global cultures",
    tags: ["Dekolonial", "Diversität", "Restitution"],
  },
  {
    key: "kunst-nach-pandemie",
    category: "zeitgenoessische-kunst",
    titleDe: "Kunst nach der Pandemie — was hat sich verändert?",
    promptDe:
      "Untersuche die Auswirkungen der COVID-19-Pandemie auf die Kunstwelt. Virtuelle Ausstellungen, leere Galerien und neue Formen der Kunsterfahrung.",
    imagePrompt: "empty gallery with digital screens showing art to remote viewers",
    tags: ["Pandemie", "Digital", "Wandel"],
  },
];

/**
 * Select a topic, avoiding recent ones.
 */
export function selectBlogTopic(recentTopicKeys: string[]): BlogTopic {
  const recentSet = new Set(recentTopicKeys);
  const available = BLOG_TOPICS.filter((t) => !recentSet.has(t.key));
  const pool = available.length > 0 ? available : BLOG_TOPICS;

  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}
