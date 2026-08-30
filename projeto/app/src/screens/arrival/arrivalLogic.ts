import type { Poi, PoiCategory, Trip } from '@jornada/shared';

export type MealPeriod = 'breakfast' | 'lunch' | 'dinner' | 'generic';

/** Rating a partir do qual o POI ganha o selo "Bem avaliado". */
export const WELL_RATED_THRESHOLD = 4.5;

/**
 * Extrai a hora local do relógio simulado direto da string ISO
 * (ex.: "2026-09-14T06:30:00-03:00" -> 6), sem depender do fuso do aparelho.
 */
export function extractHour(clockIso: string | null): number | null {
  if (!clockIso) return null;
  const match = /T(\d{2}):/.exec(clockIso);
  if (!match) return null;
  const hour = Number(match[1]);
  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null;
}

export function getMealPeriod(hour: number | null): MealPeriod {
  if (hour === null) return 'generic';
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 18 && hour < 23) return 'dinner';
  return 'generic';
}

export function getGreeting(hour: number | null): string {
  if (hour === null) return 'Olá';
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function getMealSectionTitle(period: MealPeriod): string {
  switch (period) {
    case 'breakfast':
      return 'Para o seu café da manhã';
    case 'lunch':
      return 'Para o seu almoço';
    case 'dinner':
      return 'Para o seu jantar';
    case 'generic':
      return 'Perto do terminal';
  }
}

const MEAL_CATEGORIES: Record<MealPeriod, PoiCategory[]> = {
  breakfast: ['coffee'],
  lunch: ['food'],
  dinner: ['food'],
  generic: ['coffee', 'food'],
};

const SERVICE_CATEGORIES: PoiCategory[] = ['pharmacy', 'convenience', 'other'];

function byRatingDesc(a: Poi, b: Poi): number {
  return b.rating - a.rating;
}

/** Recomendações de alimentação de acordo com o horário do desembarque. */
export function filterMealPois(pois: Poi[], period: MealPeriod): Poi[] {
  const categories = MEAL_CATEGORIES[period];
  return pois.filter((poi) => categories.includes(poi.category)).sort(byRatingDesc);
}

/** Serviços úteis independentes do horário (farmácia, conveniência, transporte). */
export function filterServicePois(pois: Poi[]): Poi[] {
  return pois.filter((poi) => SERVICE_CATEGORIES.includes(poi.category)).sort(byRatingDesc);
}

export const CATEGORY_LABELS: Record<PoiCategory, string> = {
  coffee: 'Café e padaria',
  food: 'Restaurante',
  convenience: 'Conveniência',
  pharmacy: 'Farmácia',
  restroom: 'Banheiro',
  other: 'Transporte',
};

export interface DestinationParts {
  city: string;
  terminal: string | null;
}

/** Separa "Rio de Janeiro (Terminal Novo Rio)" em cidade e terminal. */
export function parseDestination(destination: string): DestinationParts {
  const match = /^(.*?)\s*\((.+)\)\s*$/.exec(destination);
  if (!match) return { city: destination.trim(), terminal: null };
  return { city: (match[1] ?? '').trim(), terminal: (match[2] ?? '').trim() };
}

/** Cidades que pedem artigo masculino na saudação ("Bem-vindo ao ..."). */
const CITIES_WITH_MASCULINE_ARTICLE = new Set(['Rio de Janeiro', 'Recife']);

export function welcomeMessage(city: string): string {
  const preposition = CITIES_WITH_MASCULINE_ARTICLE.has(city) ? 'ao' : 'a';
  return `Bem-vindo ${preposition} ${city}`;
}

/** Duração programada da viagem em horas, a partir dos horários do bilhete. */
export function tripDurationHours(trip: Trip): number {
  const ms = Date.parse(trip.arrivalIso) - Date.parse(trip.departureIso);
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return ms / 3_600_000;
}
