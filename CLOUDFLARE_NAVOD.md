# ☁️ Přesun aplikace na Cloudflare Pages

Cloudflare Pages je zdarma s těmito limity:
- ✅ **Neomezený přenos dat** (žádný limit jako Netlify měl)
- ✅ **100 000 volání funkcí denně** (cca 3 miliony měsíčně)
- ✅ Bezplatné HTTPS
- ✅ Globální CDN — rychlejší než Netlify
- ✅ Automatický deploy z GitHubu

Pro běžnou rodinnou aplikaci tyto limity prakticky nikdy nedosáhnete.

---

## 🚀 Postup nasazení (10 minut)

### 1. Vytvořte účet Cloudflare

1. Jděte na **https://dash.cloudflare.com/sign-up**
2. Registrujte se e-mailem (free plán, žádná kreditka)
3. Potvrďte e-mail

### 2. Nahrajte soubory do GitHubu

Pokud již máte GitHub repo se starou Netlify verzí — **nechte ho, nemažte nic**. Cloudflare si vytáhne kód odtud.

Nahrajte do GitHubu **z této ZIP**:
- `index.html` (přepíše starý)
- `app.js`
- `sw.js`
- `manifest.json`
- složku `icons/`
- složku `functions/` (toto je nové — Cloudflare formát funkcí)

⚠️ **Můžete nechat i složku `netlify/`** — Cloudflare ji ignoruje. Není potřeba nic mazat.

### 3. Vytvořte projekt v Cloudflare

1. V Cloudflare dashboardu vlevo **Workers & Pages**
2. Klikněte **Create application** → záložka **Pages** → **Connect to Git**
3. **Connect GitHub** → autorizujte přístup k vašemu repu
4. Vyberte svůj repo s aplikací → **Begin setup**
5. **Project name:** např. `ekzem-denik` (bude součástí URL)
6. **Production branch:** `main` (nebo `master` podle toho co máte)
7. **Framework preset:** ponechte „None"
8. **Build command:** ponechte prázdné
9. **Build output directory:** ponechte prázdné (nebo `/`)
10. Klikněte **Save and Deploy**

Za 1–2 minuty bude váš web na `https://ekzem-denik.pages.dev` 🎉

### 4. Přidejte API klíč Gemini

1. V Cloudflare → vaše Pages aplikace → **Settings** → **Variables and Secrets**
2. **Production** sekce → **Add variable**
3. **Type:** vyberte **Secret** (zašifrovaný)
4. **Variable name:** `GEMINI_API_KEY`
5. **Value:** vložte klíč (stejný jako jste měl v Netlify, začíná `AIza...`)
   - Pokud nemáte: zdarma na https://aistudio.google.com/apikey
6. **Save**

### 5. Restart deploy

API klíč si funkce nepřečte automaticky — potřebujeme nový deploy:

1. **Deployments** záložka
2. U nejnovějšího deploye klikněte tři tečky **…** → **Retry deployment**
3. Počkejte ~1 minutu

### 6. Test

1. Otevřete `https://ekzem-denik.pages.dev`
2. Přihlaste se / vytvořte profil
3. Foto AI → vyfotit/nahrát 2 fotky → Porovnat
4. AI analýza by měla fungovat! ✨

---

## 🔄 Pozor – nová URL!

Web má jinou URL než dosud (`.pages.dev` místo `.netlify.app`). To znamená:

- **Data uložená v Netlify verzi zůstanou tam** (každá doména má separátní localStorage)
- Buď začnete v Cloudflare nanovo (čistý profil), nebo si data ručně přeneste
- Pokud jste appku měl přidanou na ploše telefonu — smažte ji a přidejte novou z Cloudflare URL

### Tip: vlastní doména (volitelné, zdarma s vaší doménou)

Pokud máte vlastní doménu (např. `denik-novak.cz`):
1. Cloudflare Pages → **Custom domains** → **Set up a custom domain**
2. Zadejte doménu a nastavte podle pokynů (DNS A/CNAME záznam)
3. SSL certifikát Cloudflare vystaví automaticky zdarma

---

## 🌍 Vlastní doména Cloudflare (volitelně)

Pokud chcete krásnou URL bez `.pages.dev`:

- Doménu `.cz` můžete koupit za ~150 Kč/rok např. na webglobe.cz, wedos.cz nebo přímo cloudflare.com
- V Cloudflare ji připojíte za pár minut a SSL je zdarma

---

## ⚠️ Pokud něco nefunguje

**Chyba „API klíč není nastaven"**
→ Zkontrolujte že máte `GEMINI_API_KEY` v Settings → Variables. Pak Retry deployment.

**Funkce vrací 404**
→ Zkontrolujte že je v GitHubu složka `functions/api/analyze-photos.js` (přesně tato cesta)

**Build selhal**
→ V Cloudflare Pages → Deployments → klikněte na neúspěšný deploy → uvidíte log s chybou

---

## 💡 Porovnání platforem

| Funkce | Netlify Free | Cloudflare Pages Free |
|--------|--------------|----------------------|
| Přenos dat | 100 GB/měsíc | **Neomezeno** |
| Volání funkcí | 125 000/měsíc | **100 000/den** |
| Build minutes | 300/měsíc | 500/měsíc |
| HTTPS | ✅ | ✅ |
| Auto-deploy z GitHubu | ✅ | ✅ |
| Globální CDN | ✅ | ✅ rychlejší |

Pro vaši aplikaci je Cloudflare **mnohem štědřejší** a prakticky neomezený.
