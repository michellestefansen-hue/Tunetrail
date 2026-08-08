/**
 * Gjør en HTML-side om til noe som er stabilt fra natt til natt.
 *
 * Dette er den avgjørende delen av endringsvakten. Hasjer man rå HTML, endrer
 * alt seg hver gang: cookie-samtykke, nedtellinger, roterende sosiale feeder,
 * tilfeldige skjematokener, annonser. Da flagges alle 669 nettstedene hver
 * natt, og vakten er verdiløs.
 *
 * Så: bort med alt som ikke er lesbar tekst, og bort med tall -- bortsett fra
 * årstall, for «2027» som dukker opp er nettopp signalet vi er ute etter. En
 * nedtelling som går fra 44 til 43 dager forsvinner. Et artistnavn som dukker
 * opp, gjør det ikke.
 *
 * Ligger utenfor ruten fordi den må kunne kjøres mot ekte nettsteder i en test.
 * Den er den ene tingen her som stille kan slutte å virke.
 */
export function normalise(html: string): string {
  return (
    html
      // Manus, stil og svg er der ingen av signalene bor, og der mesteparten av
      // støyen bor -- cache-nøkler, tokener, innebygde data.
      .replace(/<(script|style|noscript|svg|head)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&#\d+;/g, " ")
      .toLowerCase()
      // Adresser og e-post inneholder ofte cache-nøkler som endrer seg hver natt.
      .replace(/https?:\/\/\S+/g, " ")
      .replace(/\S+@\S+\.\S+/g, " ")
      // Klokkeslett og datoer på tallform: rene støykilder på en forside.
      .replace(/\b\d{1,2}[:.]\d{2}(:\d{2})?\b/g, " ")
      .replace(/\b\d{4}-\d{2}-\d{2}\b/g, " ")
      // Alle frittstående tall bort, unntatt årstall. Nedtellinger, besøkstall
      // og prislapper svinger uten at noe egentlig har skjedd.
      .replace(/\b\d+\b/g, (n) => {
        const year = Number(n);
        return n.length === 4 && year >= 1900 && year <= 2100 ? n : " ";
      })
      .replace(/[^\p{L}\p{N}\s&'-]/gu, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Under dette er siden i praksis tom for oss: et JavaScript-skall vi ikke kan
 * lese. Et fingeravtrykk av den ville låst festivalen i et falskt «uendret».
 */
export const MIN_TEXT_LENGTH = 200;

/**
 * Ordene på siden som et sortert sett, uten gjentakelser.
 *
 * Rekkefølgen kastes med vilje. Castlefest stokker artistkarusellen sin ved
 * hver lasting: to hentinger to sekunder fra hverandre ga nøyaktig like mange
 * tegn, men i ulik rekkefølge -- og dermed ulikt avtrykk. Det ville blitt en
 * falsk alarm hver eneste natt, i all framtid.
 *
 * Prisen er at en ren omstokking ikke lenger merkes. Den prisen er verdt å ta:
 * en lineup som faktisk endrer seg, får eller mister navn, og det fanges. En
 * karusell som bytter rekkefølge, har ikke endret seg i det hele tatt.
 */
export function canonicalise(text: string): string {
  return [...new Set(text.split(" "))].sort().join(" ");
}

export async function fingerprint(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
