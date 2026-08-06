import type { AvailabilityRule, Service, Settings } from "./types";

/** Business identity. Everything the barber may want to change lives here. */
export const BUSINESS = {
  name: "Pacho Barberstyle",
  tagline: {
    fr: "Barbier à Genève — uniquement sur rendez-vous",
    en: "Barber in Geneva — by appointment only",
    es: "Barbero en Ginebra — únicamente con cita previa",
  },
  street: "Rue du Pré-Jérôme 12",
  postalCode: "1205",
  city: "Genève",
  country: "Suisse",
  /** E.164, used for tel: links. */
  phone: "+41765440320",
  phoneDisplay: "+41 76 544 03 20",
  /** TODO: replace once the .ch domain mailbox exists. */
  email: import.meta.env.VITE_CONTACT_EMAIL ?? "contact@pachobarberstyle.ch",
  instagram: import.meta.env.VITE_INSTAGRAM_URL ?? "https://instagram.com/",
  mapsQuery: "Rue du Pré-Jérôme 12, 1205 Genève",
  timezone: "Europe/Zurich",
} as const;

export const WHATSAPP_LINK = `https://wa.me/${BUSINESS.phone.replace(/\D/g, "")}`;

/**
 * Single-file demo build: hash routing instead of history routing, and no
 * third-party embeds. Lets the whole site be shared as one HTML file that
 * opens from anywhere without a server.
 */
export const STANDALONE = import.meta.env.VITE_STANDALONE === "1";

/** Base for links that have to survive both routing modes. */
export function linkBase(): string {
  return STANDALONE
    ? `${window.location.origin}${window.location.pathname}#`
    : window.location.origin;
}

export const DEFAULT_SETTINGS: Settings = {
  timezone: BUSINESS.timezone,
  slotStepMin: 15,
  bufferMin: 5,
  minNoticeHours: 2,
  vipMinNoticeHours: 24,
  maxAdvanceDays: 60,
  cancelWindowHours: 24,
  maxActivePerCustomer: 2,
};

/** Sunday closed, Monday–Saturday 09:00–20:00. Editable from /admin. */
export const DEFAULT_AVAILABILITY: AvailabilityRule[] = [
  { weekday: 0, openMinute: 0, closeMinute: 0, enabled: false },
  { weekday: 1, openMinute: 9 * 60, closeMinute: 20 * 60, enabled: true },
  { weekday: 2, openMinute: 9 * 60, closeMinute: 20 * 60, enabled: true },
  { weekday: 3, openMinute: 9 * 60, closeMinute: 20 * 60, enabled: true },
  { weekday: 4, openMinute: 9 * 60, closeMinute: 20 * 60, enabled: true },
  { weekday: 5, openMinute: 9 * 60, closeMinute: 20 * 60, enabled: true },
  { weekday: 6, openMinute: 9 * 60, closeMinute: 18 * 60, enabled: true },
];

export const DEFAULT_SERVICES: Service[] = [
  {
    id: "svc-coupe",
    slug: "coupe",
    durationMin: 60,
    priceChf: 25,
    showPrice: true,
    atHome: false,
    active: true,
    sortOrder: 1,
    name: { fr: "Coupe", en: "Haircut", es: "Corte" },
    description: {
      fr: "Coupe aux ciseaux ou à la tondeuse, contours nets, finition et coiffage.",
      en: "Scissor or clipper cut, sharp outline, finish and styling.",
      es: "Corte a tijera o máquina, contornos definidos, acabado y peinado.",
    },
  },
  {
    id: "svc-barbe",
    slug: "barbe",
    durationMin: 30,
    priceChf: 15,
    showPrice: true,
    atHome: false,
    active: true,
    sortOrder: 2,
    name: { fr: "Barbe", en: "Beard", es: "Barba" },
    description: {
      fr: "Taille et dessin de la barbe, serviette chaude, huile de finition.",
      en: "Beard trim and line-up, hot towel, finishing oil.",
      es: "Recorte y perfilado de barba, toalla caliente, aceite de acabado.",
    },
  },
  {
    id: "svc-coupe-barbe",
    slug: "coupe-barbe",
    durationMin: 90,
    priceChf: 35,
    showPrice: true,
    atHome: false,
    active: true,
    sortOrder: 3,
    name: { fr: "Coupe + Barbe", en: "Haircut + Beard", es: "Corte + Barba" },
    description: {
      fr: "La formule complète : coupe, barbe travaillée et finitions.",
      en: "The full service: haircut, styled beard and finishing touches.",
      es: "El servicio completo: corte, barba trabajada y acabados.",
    },
  },
  {
    id: "svc-vip",
    slug: "vip",
    durationMin: 75,
    priceChf: null,
    showPrice: false,
    atHome: true,
    active: true,
    sortOrder: 4,
    name: {
      fr: "Service VIP 24/7 à domicile",
      en: "VIP 24/7 at-home service",
      es: "Servicio VIP 24/7 a domicilio",
    },
    description: {
      fr: "Le barbier se déplace chez vous, à l'heure qui vous arrange, jour et nuit. Sur devis selon la zone et l'horaire.",
      en: "The barber comes to you, at the time that suits you, day or night. Quoted according to area and time.",
      es: "El barbero se desplaza a tu casa, a la hora que te convenga, de día o de noche. Presupuesto según zona y horario.",
    },
  },
];
