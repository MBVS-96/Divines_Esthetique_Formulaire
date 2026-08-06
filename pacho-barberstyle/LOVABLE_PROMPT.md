# Prompt para Lovable

**Cómo usarlo:** crea el proyecto en Lovable, conecta Supabase (integración
nativa) y pega el bloque de abajo como **primer** mensaje. Está en inglés
porque Lovable responde mejor así. No le pidas que construya el sistema de
reservas: ya existe, está probado, y rehacerlo se comería los créditos.

Después de la primera generación, sube el código de este repositorio
(`src/lib`, `src/locales`, `src/components/booking`, `src/pages`) y gasta los
créditos restantes solo en fotos, animaciones y retoques visuales.

---

```
Build a dark, premium single-page website for a barbershop in Geneva,
Switzerland. IMPORTANT: do NOT build any booking logic, database schema, or
appointment system — that already exists and will be pasted in afterwards.
Build only the marketing shell and leave a clearly marked empty section with
id="reserver" where the booking component will be mounted.

BUSINESS
- Name: Pacho Barberstyle
- Address: Rue du Pré-Jérôme 12, 1205 Genève, Switzerland (Plainpalais)
- Phone: +41 76 544 03 20 (click-to-call on mobile)
- By appointment only — no walk-ins. Say this everywhere.
- Services: Coupe 25 CHF / 60 min, Barbe 15 CHF / 30 min,
  Coupe + Barbe 35 CHF / 90 min, and a VIP 24/7 at-home service priced on quote.

STACK
React 18 + Vite + TypeScript + Tailwind CSS + react-router-dom + lucide-react.
No UI kit beyond Tailwind. No external CSS or icon CDNs.

LANGUAGES
Trilingual FR / EN / ES with French as the default and browser-language
detection. Put the translations in src/locales/{fr,en,es}.ts as plain objects
with identical keys, and expose them through a React context in
src/lib/i18n.tsx. Swiss formats: dates DD.MM.YYYY, 24-hour clock, prices as
"25.−" with CHF.

DESIGN
- Palette: near-black background (#0a0a0b), panels #111113, borders #26262b,
  text #f4efe6, single accent gold #c9a227. No other accent colour.
- Fonts: Bebas Neue for headings (wide letter-spacing, uppercase), Inter for
  body text.
- Masculine, sharp, editorial. Generous vertical spacing, thin gold hairline
  dividers, subtle fade-up on scroll. No gradients beyond soft radial glows,
  no rounded-pill buttons, no emoji.
- Mobile-first. Sticky header that turns opaque on scroll, hamburger menu
  under 768px, a fixed "Réserver" call-to-action always reachable.

SECTIONS (in order)
1. Header: wordmark PACHO / BARBERSTYLE, nav (Prestations, Service VIP,
   Réserver, Contact), FR/EN/ES switcher, phone button, gold "Réserver" button.
2. Hero: full-width photo placeholder of a barbershop interior with a dark
   overlay. Badge "Uniquement sur rendez-vous", huge title, subtitle
   "Barbier à Genève", one line of copy, two buttons, and three short
   arguments with icons (no queue / central Geneva / VIP at home 24/7).
3. Services: three cards with name, description, duration and price. Prices
   must be visible — Swiss price-display rules apply to barbers.
4. VIP section: darker band, "24/7" badge, explains the barber travels to the
   client's home, hotel or office, priced on quote. Photo placeholder.
5. Booking: an empty <section id="reserver"> with the heading "Réserver" and a
   comment "{/* booking component mounts here */}". Nothing else.
6. Gallery: responsive grid of 6 photo placeholders with hover zoom.
7. Contact: address, phone, "Uniquement sur rendez-vous", Google Maps embed of
   Rue du Pré-Jérôme 12, 1205 Genève in grayscale, and buttons for call,
   WhatsApp and Instagram.
8. Footer: wordmark, address, links to /mentions-legales and /confidentialite,
   copyright, language switcher.

TECHNICAL
- Routes: / , /annuler , /admin , /mentions-legales , /confidentialite.
  Create the last four as empty placeholder pages; they will be replaced.
- SEO: French <title> and meta description, canonical, Open Graph tags, and a
  HairSalon JSON-LD block with the address, phone, priceRange "CHF 15 - CHF 35"
  and availableLanguage fr/en/es.
- Accessibility: real <button> and <a> elements, visible focus rings, alt text
  on every image, aria-labels on icon-only buttons.
- Use Tailwind theme tokens for the colours above instead of repeating hex
  values in the markup.
```

---

## Segundo prompt (después de subir el código)

```
I have added the booking system files. Mount <BookingFlow /> inside the
existing <section id="reserver">, keep every other section untouched, and do
not modify anything under src/lib or src/locales.
```

## Tercer prompt (fotos, cuando las tengas)

```
Replace the placeholder images with the uploaded photos: [describe each one].
Keep the same layout, aspect ratios and hover behaviour. Compress them and add
loading="lazy" everywhere except the hero image.
```
