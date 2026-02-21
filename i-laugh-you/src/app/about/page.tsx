import type { Metadata } from "next";
import Image from "next/image";
import "./about.css";

export const metadata: Metadata = {
  title: "About — I LAUGH YOU!",
  description:
    "The story behind I LAUGH YOU! — an art project exploring the relationship between art and capitalism. By DTSQR.",
};

export default function AboutPage() {
  return (
    <div id="about-page">
      {/* Hero */}
      <header id="about-hero">
        <a href="/" id="about-logo-link">
          <Image
            src="/img/logo-white.png"
            alt="I LAUGH YOU Logo"
            width={400}
            height={150}
            priority
          />
        </a>
        <h1>Die Geschichte hinter dem Bild</h1>
        <p className="about-hero-sub">
          Ein Kunstprojekt. Ein Selbstportr&auml;t. 6&rsquo;059 einzigartige
          St&uuml;cke. Eine Liebeserkl&auml;rung an die Kunst &mdash; und an
          den Kapitalismus.
        </p>
      </header>

      {/* Intro */}
      <section className="about-section">
        <div className="about-content">
          <h2>Was ist I&nbsp;LAUGH&nbsp;YOU?</h2>
          <p>
            <strong>I&nbsp;LAUGH&nbsp;YOU!</strong> ist ein Kunstprojekt, das
            &ouml;ffentlich die Beziehung zwischen{" "}
            <em className="art-highlight">Kunst</em> und{" "}
            <em className="capitalism-highlight">Kapitalismus</em> diskutieren
            m&ouml;chte. Es begann 2009 als studentisches Projekt an der
            Fachhochschule f&uuml;r Kunst und Gestaltung in Basel &mdash;
            genauer am <strong>Hyperwerk</strong> &mdash; und hat sich seitdem
            zu einem eigenst&auml;ndigen Konzept entwickelt, das &uuml;ber den
            universit&auml;ren Rahmen hinausgewachsen ist.
          </p>
          <p>
            Im Kern geht es um eine einfache, aber provokante Frage:{" "}
            <strong>
              Was bestimmt den Wert eines Kunstwerks &mdash; die Sch&ouml;nheit
              oder der Hype?
            </strong>
          </p>
        </div>
      </section>

      {/* The Painting */}
      <section className="about-section about-section-dark">
        <div className="about-content">
          <h2>Das Gem&auml;lde</h2>
          <div className="about-two-col">
            <div className="about-col-text">
              <p>
                Alles begann mit einem ambitionierten Ziel: das{" "}
                <strong>
                  gr&ouml;sste Selbstportr&auml;t der Kunstgeschichte
                </strong>{" "}
                zu malen. Ein riesiges &Ouml;lgem&auml;lde, geschaffen von
                einem einzigen Kunststudenten, Pinselstrich f&uuml;r
                Pinselstrich.
              </p>
              <p>
                Das Gem&auml;lde ist nicht einfach ein Portr&auml;t &mdash; es
                ist ein <em>Statement</em>. Es zeigt das Gesicht des
                K&uuml;nstlers in einer Gr&ouml;sse, die normalerweise
                monumentalen Pers&ouml;nlichkeiten der Geschichte vorbehalten
                ist. Die &Uuml;bertreibung ist Absicht: Warum sollte ein
                unbekannter Student kein riesiges Selbstportr&auml;t malen?
              </p>
              <p>
                Das fertige Werk wurde anschliessend in einem aufwendigen
                Verfahren Stück f&uuml;r St&uuml;ck fotografiert &mdash;{" "}
                <strong>6&rsquo;059 einzigartige Einzelbilder</strong>, jedes
                ein Ausschnitt des Originals, jedes einmalig.
              </p>
            </div>
            <div className="about-col-image">
              <Image
                src="/img/how-it-all-started.png"
                alt="Ein Kunststudent malt ein riesiges Selbstportr&auml;t"
                width={400}
                height={400}
                className="about-illustration"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="about-section">
        <div className="about-content">
          <h2>Wie es funktioniert</h2>
          <div className="about-steps">
            <div className="about-step">
              <div className="about-step-number">01</div>
              <h3>W&auml;hle Dein St&uuml;ck</h3>
              <p>
                Erkunde das Gem&auml;lde in einer interaktiven
                Hochaufl&ouml;sungs-Ansicht. Zoome rein, entdecke Details und
                finde das St&uuml;ck, das Dich anspricht &mdash; vielleicht
                passt es sogar zu Deiner Sofa-Farbe.
              </p>
            </div>
            <div className="about-step">
              <div className="about-step-number">02</div>
              <h3>Der Preis steigt</h3>
              <p>
                Das erste St&uuml;ck kostet{" "}
                <strong className="capitalism-highlight">100 CHF</strong>. Mit
                jedem Verkauf steigt der Preis exponentiell. Das letzte
                St&uuml;ck wird{" "}
                <strong className="capitalism-highlight">1&rsquo;000 CHF</strong>{" "}
                kosten. Wer fr&uuml;h kauft, kauft g&uuml;nstig.
              </p>
            </div>
            <div className="about-step">
              <div className="about-step-number">03</div>
              <h3>Dein Kunstwerk kommt zu Dir</h3>
              <p>
                Jedes gekaufte St&uuml;ck wird als hochwertiger Druck (30
                &times; 40 cm) direkt zu Dir nach Hause geliefert. Es ist Dein
                pers&ouml;nliches Fragment eines gr&ouml;sseren Ganzen.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Concept */}
      <section className="about-section about-section-dark">
        <div className="about-content">
          <h2>Das Konzept: Kunst &times; Kapitalismus</h2>
          <p>
            Warum kostet ein Basquiat-Kritzler Millionen, w&auml;hrend
            talentierte Strassenkünstler um Centbetr&auml;ge spielen? Der Wert
            von Kunst wird selten von der Kunst selbst bestimmt &mdash; sondern
            von Angebot, Nachfrage und vor allem vom <em>Narrativ</em>.
          </p>
          <p>
            <strong>I&nbsp;LAUGH&nbsp;YOU!</strong> macht diesen Mechanismus
            sichtbar: Die ersten St&uuml;cke sind am g&uuml;nstigsten und
            wahrscheinlich auch am{" "}
            <span className="art-highlight">sch&ouml;nsten</span> &mdash;
            Augen, Mund, markante Gesichtszüge. Doch je popul&auml;rer das
            Projekt wird, desto prestigetr&auml;chtiger wird es, &uuml;berhaupt
            ein St&uuml;ck zu besitzen. Pl&ouml;tzlich zahlen Menschen{" "}
            <span className="capitalism-highlight">
              das Zehnfache f&uuml;r ein St&uuml;ck Hinterkopf
            </span>{" "}
            &mdash; nicht wegen der &Auml;sthetik, sondern wegen des Status.
          </p>
          <p>
            Genau so funktioniert der Kunstmarkt. Und genau das zeigt dieses
            Projekt &mdash; nicht durch eine Erkl&auml;rung, sondern durch{" "}
            <strong>Erleben</strong>.
          </p>

          <blockquote className="about-quote">
            &laquo;Die sch&ouml;nsten St&uuml;cke kosten am wenigsten. Die
            teuersten St&uuml;cke kauft man nicht wegen der Sch&ouml;nheit,
            sondern wegen der Zugeh&ouml;rigkeit.&raquo;
          </blockquote>
        </div>
      </section>

      {/* What Makes It Different */}
      <section className="about-section">
        <div className="about-content">
          <h2>Was I&nbsp;LAUGH&nbsp;YOU! besonders macht</h2>
          <div className="about-features">
            <div className="about-feature">
              <h3>Jedes St&uuml;ck ist einzigartig</h3>
              <p>
                Es gibt keine Kopien, keine Editionen, keine Reproduktionen.
                Jedes der 6&rsquo;059 St&uuml;cke existiert genau einmal. Wenn
                es verkauft ist, ist es weg &mdash; f&uuml;r immer.
              </p>
            </div>
            <div className="about-feature">
              <h3>Teil eines gr&ouml;sseren Ganzen</h3>
              <p>
                Anders als ein normaler Kunstdruck ist jedes St&uuml;ck ein
                Fragment eines gr&ouml;sseren Werks. Es tr&auml;gt eine
                Geschichte in sich &mdash; die Geschichte des gesamten
                Gem&auml;ldes, des Projekts und der Idee dahinter.
              </p>
            </div>
            <div className="about-feature">
              <h3>Eine Investition in Kunst</h3>
              <p>
                Durch die steigende Preisdynamik und die begrenzte Anzahl von
                St&uuml;cken funktioniert jedes Bild wie eine
                Wertanlage. Fr&uuml;he K&auml;ufer erhalten die
                attraktivsten Motive zum niedrigsten Preis &mdash; ein Vorteil,
                der sich mit zunehmender Bekanntheit des Projekts
                potenziert.
              </p>
            </div>
            <div className="about-feature">
              <h3>Kunst mit Botschaft</h3>
              <p>
                I&nbsp;LAUGH&nbsp;YOU! ist kein dekorierbarer Druck. Es ist ein
                Kommentar zum Kunstmarkt, verpackt als Kunstwerk. Wer ein
                St&uuml;ck besitzt, nimmt an diesem Diskurs teil.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="about-section about-section-dark">
        <div className="about-content">
          <h2>Die Reise</h2>
          <div className="about-timeline">
            <div className="about-timeline-entry">
              <div className="about-timeline-year">2009</div>
              <div className="about-timeline-text">
                <h3>Der Anfang</h3>
                <p>
                  Als Projekt am Hyperwerk der Fachhochschule f&uuml;r Kunst und
                  Gestaltung in Basel ins Leben gerufen. Ein Student, eine
                  Vision, ein riesiges &Ouml;lgem&auml;lde.
                </p>
              </div>
            </div>
            <div className="about-timeline-entry">
              <div className="about-timeline-year">2010&ndash;2014</div>
              <div className="about-timeline-text">
                <h3>Das Malen</h3>
                <p>
                  Jahre der akribischen Arbeit am Gem&auml;lde. Schicht um
                  Schicht &Ouml;lfarbe, hunderte Stunden im Atelier. Das
                  Selbstportr&auml;t w&auml;chst.
                </p>
              </div>
            </div>
            <div className="about-timeline-entry">
              <div className="about-timeline-year">2015&ndash;2018</div>
              <div className="about-timeline-text">
                <h3>Die Digitalisierung</h3>
                <p>
                  Das fertige Gem&auml;lde wird St&uuml;ck f&uuml;r
                  St&uuml;ck in einem aufwendigen Verfahren fotografiert.
                  6&rsquo;059 einzigartige Einzelbilder entstehen.
                </p>
              </div>
            </div>
            <div className="about-timeline-entry">
              <div className="about-timeline-year">2019</div>
              <div className="about-timeline-text">
                <h3>Die Plattform</h3>
                <p>
                  Die erste Version der Website geht live. Das Gem&auml;lde wird
                  als interaktive Hochaufl&ouml;sungs-Ansicht zug&auml;nglich.
                  Die Welt kann jetzt jedes einzelne St&uuml;ck erkunden.
                </p>
              </div>
            </div>
            <div className="about-timeline-entry">
              <div className="about-timeline-year">2020&ndash;heute</div>
              <div className="about-timeline-text">
                <h3>Die Evolution</h3>
                <p>
                  Das Projekt w&auml;chst &uuml;ber den universit&auml;ren
                  Kontext hinaus. Neue Technologien, neue Features, neues
                  Design &mdash; aber dieselbe Idee: Kunst und Kapitalismus
                  sichtbar machen.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Artist */}
      <section className="about-section">
        <div className="about-content">
          <h2>Der K&uuml;nstler</h2>
          <div className="about-artist">
            <div className="about-artist-info">
              <h3>
                DTSQR{" "}
                <span className="about-artist-tagline">
                  &mdash; a restless spirit trapped in time and space
                </span>
              </h3>
              <p>
                <strong>Dot Square</strong> lebt und arbeitet in der Schweiz.
                Nach dem Abschluss seines Bachelor-Studiums am Hyperwerk
                entwickelte er seine Programmier- und Design-F&auml;higkeiten bei
                verschiedenen Startups &mdash; w&auml;hrend die Leidenschaft
                f&uuml;rs Malen immer blieb.
              </p>
              <p>
                DTSQR bewegt sich an der Schnittstelle von Technologie und
                Kunst. Seine Arbeit fragt immer dasselbe: Was passiert, wenn man
                klassische Kunstformen mit digitalen Systemen verbindet? Was
                passiert, wenn man den Kunstmarkt nicht kritisiert, sondern ihn
                als Kunstwerk inszeniert?
              </p>
              <p>
                I&nbsp;LAUGH&nbsp;YOU! ist die konsequenteste Antwort auf diese
                Fragen &mdash; ein Projekt, das gleichzeitig Kunst ist und
                &uuml;ber Kunst nachdenkt.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Love Letter */}
      <section className="about-section about-section-love">
        <div className="about-content">
          <h2>Der Liebesbrief</h2>
          <p>
            Hinter all den Konzepten, dem Preissystem und der Technologie steckt
            noch etwas anderes. Etwas Pers&ouml;nliches.
          </p>
          <p>
            Der K&uuml;nstler beschreibt sein Werk als einen{" "}
            <em className="love-highlight">&laquo;sehr seltsamen Liebesbrief an ein
            M&auml;dchen, das f&uuml;r immer fort ist, aber nie vergessen
            wird&raquo;</em>. Es ist diese Mischung aus Ironie und Aufrichtigkeit,
            aus Kalkül und Gef&uuml;hl, die das Projekt zu mehr macht als
            einem cleveren Konzept.
          </p>
          <p>
            Jedes der 6&rsquo;059 St&uuml;cke tr&auml;gt diese Geschichte in
            sich. Wer ein St&uuml;ck kauft, kauft nicht nur Kunst &mdash;
            sondern ein Fragment einer Liebeserkl&auml;rung.
          </p>
        </div>
      </section>

      {/* Numbers */}
      <section className="about-section about-section-dark">
        <div className="about-content">
          <h2>In Zahlen</h2>
          <div className="about-stats">
            <div className="about-stat">
              <span className="about-stat-number">6&rsquo;059</span>
              <span className="about-stat-label">Einzigartige St&uuml;cke</span>
            </div>
            <div className="about-stat">
              <span className="about-stat-number">1</span>
              <span className="about-stat-label">&Ouml;lgem&auml;lde</span>
            </div>
            <div className="about-stat">
              <span className="about-stat-number">100&ndash;1&rsquo;000</span>
              <span className="about-stat-label">CHF Preisspanne</span>
            </div>
            <div className="about-stat">
              <span className="about-stat-number">30&times;40</span>
              <span className="about-stat-label">cm pro Druck</span>
            </div>
            <div className="about-stat">
              <span className="about-stat-number">2009</span>
              <span className="about-stat-label">Projektstart</span>
            </div>
            <div className="about-stat">
              <span className="about-stat-number">&infin;</span>
              <span className="about-stat-label">Leidenschaft</span>
            </div>
          </div>
        </div>
      </section>

      {/* Contact / CTA */}
      <section className="about-section about-section-cta">
        <div className="about-content">
          <h2>Bereit?</h2>
          <p>
            Entdecke das Gem&auml;lde, finde Dein St&uuml;ck und werde Teil
            der Geschichte.
          </p>
          <a href="/" className="about-cta-button">
            Zum Gem&auml;lde
          </a>
          <div className="about-contact">
            <p>
              Fragen, Kooperationen oder einfach Hallo sagen?
              <br />
              <a href="mailto:info@i-laugh-you.com">info@i-laugh-you.com</a>
            </p>
            <div className="about-social">
              <a
                href="https://www.facebook.com/ilaughyouofficial"
                target="_blank"
                rel="noopener noreferrer"
              >
                Facebook
              </a>
              <a
                href="https://www.instagram.com/ilaughyouofficial"
                target="_blank"
                rel="noopener noreferrer"
              >
                Instagram
              </a>
              <a
                href="https://twitter.com/ily6059"
                target="_blank"
                rel="noopener noreferrer"
              >
                Twitter
              </a>
              <a
                href="https://www.pinterest.ch/ily6059/pins/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Pinterest
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="about-footer">
        <p>&copy; {new Date().getFullYear()} I LAUGH YOU!</p>
        <p>Gemacht mit Liebe und Lachen in der Schweiz</p>
        <p>
          <a href="/blog">Blog</a>
        </p>
      </footer>
    </div>
  );
}
