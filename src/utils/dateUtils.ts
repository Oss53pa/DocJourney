/**
 * Utilitaires de calcul de dates.
 * Remplace les calculs manuels `getTime() + days * 86400000` éparpillés dans le code.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Ajoute (ou soustrait si négatif) un nombre de jours à une date. */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

/** Retourne le début de la journée (00:00:00.000) pour une date donnée. */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Retourne le début de la semaine (lundi) pour une date donnée. */
export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay(); // 0=dim, 1=lun, ...
  d.setDate(d.getDate() - day);
  return d;
}
