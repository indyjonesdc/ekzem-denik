// Cloudflare Pages Function – AI analýza fotek ekzému přes Google Gemini
// Path: /api/analyze-photos
// Free tier Cloudflare: 100,000 requests/day, neomezený transfer

export async function onRequestPost(context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  const apiKey = context.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: 'API klíč Gemini není nastaven. Přidejte GEMINI_API_KEY v Cloudflare Pages → Settings → Environment variables.',
      }),
      { status: 500, headers }
    );
  }

  try {
    const body = await context.request.json();
    const { photo1, photo2, date1, date2, childAge, childName } = body;

    if (!photo1 || !photo2) {
      return new Response(JSON.stringify({ error: 'Chybí fotky' }), { status: 400, headers });
    }

    // Extract base64 data and media type
    const extract = (dataUrl) => {
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) throw new Error('Neplatný formát fotky');
      let mediaType = match[1].toLowerCase().trim();
      if (mediaType === 'image/jpg') mediaType = 'image/jpeg';
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
      if (!allowed.includes(mediaType)) throw new Error(`Nepodporovaný formát: ${mediaType}`);
      const data = match[2];
      if (!data || data.length < 100) throw new Error('Fotka je prázdná nebo poškozená');
      return { mediaType, data };
    };

    let p1, p2;
    try {
      p1 = extract(photo1);
      p2 = extract(photo2);
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 400, headers });
    }

    const childInfo = childName || childAge
      ? `Jde o dítě${childName ? ' jménem ' + childName : ''}${childAge ? ' (věk ' + childAge + ')' : ''}.`
      : '';

    const prompt = `Jsi pomocný asistent pro rodiče dítěte s ekzémem. Vidíš dvě fotografie ekzému stejného dítěte. ${childInfo}

První fotka (image_1) je STARŠÍ (pořízena ${date2 || 'dříve'}).
Druhá fotka (image_2) je NOVĚJŠÍ (pořízena ${date1 || 'nyní'}).

Pečlivě obě fotky porovnej a odpověz česky podle této struktury:

**🔍 Celkový vývoj**
Jednou větou: zlepšení, zhoršení, nebo stabilní stav.

**📍 Konkrétní pozorování**
- Kde přesně na těle vidíš změny (tváře, lokty, záda, ...)
- Velikost a rozsah postižených ploch
- Intenzita zarudnutí a podráždění
- Stav kůže (suchá, šupinatá, mokvavá, hojící se)

**💡 Doporučení**
2–3 konkrétní rady co dál sledovat nebo na co se zaměřit.

⚠️ Toto není lékařská diagnóza. Při zhoršení nebo pochybnostech kontaktujte dermatologa.

Buď konkrétní, ale citlivý – jde o malé dítě a starostlivého rodiče.

---

**DŮLEŽITÉ – na úplném konci odpovědi přidej tento blok s ohraničujícími rámečky pro NOVĚJŠÍ fotku (image_2):**

\`\`\`json
{
  "regions": [
    {
      "label": "Krátký popis (např. 'Zhoršené zarudnutí')",
      "type": "worse" | "better" | "same" | "new",
      "box": [y1, x1, y2, x2],
      "note": "Volitelná detailnější poznámka"
    }
  ]
}
\`\`\`

Pravidla pro box:
- Souřadnice v rozsahu 0–1000 (normalizováno na rozměry obrázku)
- Formát: [y_min, x_min, y_max, x_max]
- y je vertikální (0 = horní okraj), x je horizontální (0 = levý okraj)
- Vyznač 1–5 oblastí na novější fotce, které stojí za pozornost

Typy:
- "worse" = horší než dříve (červená)
- "better" = lepší/zhojené (zelená)
- "same" = nezměněno ale stále aktivní (oranžová)
- "new" = nově objevené (fialová)

Pokud na novější fotce nevidíš nic významného k vyznačení, vrať prázdné regions: \`{"regions": []}\``;

    const model = 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: 'image_1 (starší fotka):' },
            { inline_data: { mime_type: p2.mediaType, data: p2.data } },
            { text: 'image_2 (novější fotka):' },
            { inline_data: { mime_type: p1.mediaType, data: p1.data } },
            { text: prompt },
          ],
        }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      let detail = errText;
      try {
        const parsed = JSON.parse(errText);
        detail = parsed.error?.message || parsed.message || errText;
      } catch {}
      return new Response(
        JSON.stringify({ error: `Gemini API (${response.status}): ${detail.substring(0, 400)}` }),
        { status: response.status, headers }
      );
    }

    const result = await response.json();
    let analysis = '';
    try {
      analysis = result.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
    } catch {}

    if (!analysis) {
      return new Response(
        JSON.stringify({ error: 'Gemini vrátil prázdnou odpověď. Možná byly fotky zablokovány safety filtrem.' }),
        { status: 500, headers }
      );
    }

    // Extract JSON block with regions
    let regions = [];
    let cleanText = analysis;
    const jsonMatch = analysis.match(/```json\s*([\s\S]+?)\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (Array.isArray(parsed.regions)) {
          regions = parsed.regions
            .filter(r => Array.isArray(r.box) && r.box.length === 4)
            .map(r => ({
              label: String(r.label || '').substring(0, 100),
              type: ['worse', 'better', 'same', 'new'].includes(r.type) ? r.type : 'same',
              box: r.box.map(n => Math.max(0, Math.min(1000, Number(n) || 0))),
              note: String(r.note || '').substring(0, 200),
            }));
        }
        cleanText = analysis.replace(/```json\s*[\s\S]+?\s*```/, '').replace(/---\s*$/, '').trim();
      } catch (err) {}
    }

    return new Response(
      JSON.stringify({ analysis: cleanText, regions }),
      { status: 200, headers }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Chyba serveru: ' + err.message }),
      { status: 500, headers }
    );
  }
}

// CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  });
}
