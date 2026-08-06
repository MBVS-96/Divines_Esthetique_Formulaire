# Pacho Barberstyle — site et système de réservation

Site vitrine trilingue (FR / EN / ES) et système de rendez-vous pour
**Pacho Barberstyle**, Rue du Pré-Jérôme 12, 1205 Genève.

Stack : React 18 + Vite + TypeScript + Tailwind, Supabase (Postgres + Auth +
Edge Functions), Resend pour les e-mails. C'est exactement la stack que Lovable
utilise nativement, pour que le transfert se fasse sans réécriture.

---

## 1. Essayer tout de suite (mode démonstration)

```bash
npm install
npm run dev
```

Sans identifiants Supabase, l'application tourne **entièrement dans le
navigateur** : les rendez-vous sont stockés en localStorage et les e-mails ne
partent pas, ils sont affichés dans le panneau d'administration tels qu'ils
partiront en production.

À tester :

| Parcours | Où |
|---|---|
| Réserver une prestation en salon | `/` → *Réserver* |
| Vérifier que le créneau se bloque | reprendre la même date, l'heure a disparu |
| Demander le service VIP à domicile | section *Service VIP* |
| Lire les e-mails générés | `/admin` → onglet *E-mails* |
| Annuler côté client | lien `Annuler` dans l'e-mail de confirmation |
| Agenda, tarifs, horaires, absences | `/admin` (mot de passe démo : `pacho`) |

Le bandeau doré en bas de page rappelle qu'on est en démo et permet de
réinitialiser les données.

---

## 2. Passer en production

### 2.1 Base de données

1. Créer un projet sur [supabase.com](https://supabase.com) (plan gratuit).
2. SQL Editor → coller le contenu de `supabase/migrations/0001_init.sql` → Run.
3. Renseigner les champs privés :

```sql
update settings set
  barber_email = 'contact@pachobarberstyle.ch',
  site_url     = 'https://pachobarberstyle.ch';
```

Le fichier crée les tables, les règles de sécurité (RLS), les fonctions
publiques et insère les quatre prestations avec les tarifs convenus
(Coupe 25.−, Barbe 15.−, Coupe + Barbe 35.−, VIP sur devis).

### 2.2 Compte administrateur

Authentication → Users → *Add user* : l'adresse e-mail de Pacho et un mot de
passe. C'est ce couple qui ouvre `/admin`.

### 2.3 E-mails

1. Créer un compte [Resend](https://resend.com) (3 000 e-mails/mois gratuits).
2. Vérifier le domaine `pachobarberstyle.ch` (enregistrements DNS SPF + DKIM).
   **Sans domaine vérifié, les e-mails partent en spam.**
3. Déployer les fonctions :

```bash
supabase functions deploy send-outbox
supabase functions deploy send-reminders
supabase secrets set RESEND_API_KEY=re_xxx
supabase secrets set RESEND_FROM="Pacho Barberstyle <contact@pachobarberstyle.ch>"
```

4. Les planifier (SQL Editor) :

```sql
select cron.schedule('send-outbox', '* * * * *', $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-outbox',
    headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb
  );
$$);

select cron.schedule('send-reminders', '0 * * * *', $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
    headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb
  );
$$);
```

(`pg_cron` et `pg_net` s'activent dans Database → Extensions.)

### 2.4 Variables du site

Copier `.env.example` vers `.env.local` et remplir `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY` et `VITE_ADMIN_EMAIL`. Dès que ces variables
existent, l'application bascule automatiquement du mode démo vers Supabase —
aucun code à modifier.

---

## 3. Transfert vers Lovable

Le but est de ne dépenser les crédits que sur le visuel.

1. Dans Lovable, créer le projet et **connecter Supabase** (intégration native,
   un clic, même projet que ci-dessus).
2. Copier les dossiers `src/lib`, `src/locales`, `src/components/booking` et
   `src/pages` tels quels. Ils ne dépendent que de React, Tailwind,
   `lucide-react`, `react-router-dom` et `@supabase/supabase-js` — tout est
   déjà présent dans un projet Lovable standard.
3. Utiliser `LOVABLE_PROMPT.md` comme premier prompt : il décrit l'habillage
   (photos, hero, sections) sans jamais redemander la logique de réservation.
4. Garder les crédits pour : les photos réelles, les animations, les retouches
   de mise en page.

**À ne pas faire** : demander à Lovable de « créer un système de réservation ».
Il existe déjà, il est testé, et le refaire coûterait l'essentiel des crédits.

---

## 4. Architecture

```
src/
  lib/
    availability.ts   génération des créneaux (durée, tampon, préavis, blocages)
    tz.ts             conversions Europe/Zurich ↔ UTC, sans dépendance externe
    emails.ts         gabarits d'e-mails (aperçu navigateur)
    validation.ts     e-mail, téléphone suisse E.164, références
    i18n.tsx          FR / EN / ES, formats suisses (JJ.MM.AAAA, 24 h)
    data/
      provider.ts     interface commune aux deux backends
      local.ts        stockage navigateur (démo)
      supabase.ts     production, via fonctions SQL
  components/booking/ parcours de réservation en 4 étapes
  pages/              accueil, annulation, admin, mentions légales
supabase/
  migrations/         schéma, RLS, fonctions SECURITY DEFINER
  functions/          envoi des e-mails et rappels (Deno)
```

### Règles métier

- **Un seul barbier** : une contrainte d'exclusion Postgres rend tout
  chevauchement impossible, quoi que fasse le navigateur.
- **Confirmation automatique**, e-mail et téléphone obligatoires et validés.
- **Anti-abus** : pot de miel invisible, 5 tentatives/heure par adresse,
  maximum 2 rendez-vous à venir par client.
- **VIP à domicile** : pas de grille horaire, préavis de 24 h, statut
  `pending` jusqu'au devis de Pacho.
- **Annulation** : lien signé dans chaque e-mail, libre jusqu'à 24 h avant.
- **Créneaux** : pas de 15 min, tampon de 5 min entre deux rendez-vous,
  calendrier ouvert sur 60 jours.

Tout cela se modifie dans `/admin` ou dans la table `settings`, sans toucher au
code.

### Point d'attention

`src/lib/emails.ts` (navigateur) et `supabase/functions/_shared/emails.ts`
(Deno) rendent les mêmes e-mails et doivent être modifiés ensemble : les deux
environnements ne partagent pas de module.

---

## 5. Reste à fournir

- [ ] Adresse e-mail professionnelle + domaine `.ch`
- [ ] Logo (PNG/SVG fond transparent)
- [ ] Photos du salon, de l'équipe et de coupes
- [ ] Lien Instagram
- [ ] Zone couverte et supplément du service VIP
- [ ] Mentions légales : raison sociale, numéro IDE, hébergeur
      (marqués `[À COMPLÉTER]` dans `src/pages/LegalPage.tsx`)
