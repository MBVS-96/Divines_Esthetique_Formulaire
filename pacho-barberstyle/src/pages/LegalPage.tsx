import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { BUSINESS } from "@/lib/config";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

/**
 * Legal notice and privacy policy.
 *
 * Written in French — the language that governs in Geneva. Placeholders marked
 * [À COMPLÉTER] must be filled with the real company details before going live.
 */
export function LegalPage({ kind }: { kind: "legal" | "privacy" }) {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-ink-800">
        <div className="container-x flex h-16 items-center justify-between">
          <Link to="/" className="font-display text-lg tracking-[0.25em] text-cream">
            PACHO BARBERSTYLE
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="container-x flex-1 py-14">
        <article className="mx-auto max-w-2xl space-y-6 text-sm leading-relaxed text-cream/70">
          <h1 className="font-display text-4xl tracking-wide text-cream">
            {kind === "legal" ? t.legal.legalTitle : t.legal.privacyTitle}
          </h1>
          <p className="text-xs uppercase tracking-widest text-cream/40">
            Version française faisant foi
          </p>
          <div className="rule" />

          {kind === "legal" ? <LegalNotice /> : <PrivacyPolicy />}

          <div className="pt-6">
            <Link to="/" className="btn-outline">
              {t.legal.back}
            </Link>
          </div>
        </article>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-xl tracking-wide text-cream">{title}</h2>
      {children}
    </section>
  );
}

function LegalNotice() {
  return (
    <>
      <Section title="Éditeur du site">
        <p>
          <strong className="text-cream">{BUSINESS.name}</strong>
          <br />
          Raison sociale : [À COMPLÉTER — raison individuelle / Sàrl]
          <br />
          Numéro IDE : [À COMPLÉTER — CHE-xxx.xxx.xxx]
          <br />
          {BUSINESS.street}, {BUSINESS.postalCode} {BUSINESS.city}, {BUSINESS.country}
          <br />
          Téléphone : {BUSINESS.phoneDisplay}
          <br />
          E-mail : {BUSINESS.email}
        </p>
      </Section>

      <Section title="Responsable de la publication">
        <p>[À COMPLÉTER — nom et prénom du responsable]</p>
      </Section>

      <Section title="Hébergement">
        <p>[À COMPLÉTER — nom et adresse de l'hébergeur du site]</p>
      </Section>

      <Section title="Prix">
        <p>
          Les prix affichés sont en francs suisses (CHF), toutes taxes comprises. Ils correspondent
          aux tarifs pratiqués en salon, conformément à l'ordonnance sur l'indication des prix
          (OIP). Le service VIP à domicile fait l'objet d'un devis établi selon la zone de
          déplacement et l'horaire demandé.
        </p>
      </Section>

      <Section title="Rendez-vous et annulation">
        <p>
          Le salon reçoit uniquement sur rendez-vous. Chaque réservation confirmée bloque un
          créneau nominatif. L'annulation est gratuite jusqu'à 24 heures avant l'heure du
          rendez-vous, via le lien figurant dans l'e-mail de confirmation ou par téléphone.
        </p>
      </Section>

      <Section title="Propriété intellectuelle">
        <p>
          L'ensemble des contenus de ce site (textes, photographies, logo) est la propriété de{" "}
          {BUSINESS.name}. Toute reproduction sans autorisation écrite est interdite.
        </p>
      </Section>

      <Section title="Droit applicable">
        <p>
          Le présent site est soumis au droit suisse. Le for juridique est à Genève, sous réserve
          des dispositions impératives contraires.
        </p>
      </Section>
    </>
  );
}

function PrivacyPolicy() {
  return (
    <>
      <Section title="Responsable du traitement">
        <p>
          {BUSINESS.name}, {BUSINESS.street}, {BUSINESS.postalCode} {BUSINESS.city}. Contact :{" "}
          {BUSINESS.email} — {BUSINESS.phoneDisplay}.
        </p>
      </Section>

      <Section title="Données collectées">
        <p>
          Lors d'une réservation, nous collectons uniquement : votre nom, votre adresse e-mail,
          votre numéro de téléphone, la prestation choisie, la date et l'heure du rendez-vous et,
          pour le service VIP à domicile, l'adresse d'intervention ainsi que vos éventuelles
          remarques.
        </p>
      </Section>

      <Section title="Finalité">
        <p>
          Ces données servent exclusivement à gérer votre rendez-vous : confirmation, rappel,
          annulation et contact en cas d'imprévu. Elles ne sont ni vendues, ni louées, ni utilisées
          à des fins publicitaires sans votre accord.
        </p>
      </Section>

      <Section title="Base légale">
        <p>
          Le traitement repose sur l'exécution de la prestation que vous demandez, conformément à
          la loi fédérale sur la protection des données (LPD) et, pour les personnes résidant dans
          l'Union européenne, au Règlement général sur la protection des données (RGPD).
        </p>
      </Section>

      <Section title="Sous-traitants">
        <p>
          Les réservations sont hébergées chez notre prestataire technique et les e-mails de
          confirmation sont acheminés par notre prestataire d'envoi. Ces prestataires agissent sur
          instruction et n'utilisent pas vos données à d'autres fins. [À COMPLÉTER — noms des
          prestataires effectivement utilisés]
        </p>
      </Section>

      <Section title="Durée de conservation">
        <p>
          Les données de rendez-vous sont conservées 24 mois après la dernière prestation, puis
          supprimées.
        </p>
      </Section>

      <Section title="Vos droits">
        <p>
          Vous pouvez à tout moment demander l'accès, la rectification ou la suppression de vos
          données en écrivant à {BUSINESS.email}. Vous pouvez également annuler vous-même un
          rendez-vous grâce au lien reçu par e-mail.
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          Ce site n'utilise aucun cookie publicitaire ni traceur tiers. Seule votre préférence de
          langue est conservée localement dans votre navigateur. [À COMPLÉTER si un outil de mesure
          d'audience est ajouté par la suite]
        </p>
      </Section>
    </>
  );
}
