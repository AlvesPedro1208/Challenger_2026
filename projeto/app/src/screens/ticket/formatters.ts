const MONTHS_PT = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const;

const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/;

/**
 * Formats an ISO timestamp preserving the wall-clock time embedded in the
 * string (the trip runs in America/Sao_Paulo regardless of the device).
 */
export function formatDepartureIso(iso: string): { date: string; time: string } | null {
  const match = ISO_PATTERN.exec(iso);
  if (!match) return null;
  const day = Number(match[3]);
  const monthIndex = Number(match[2]) - 1;
  const month = MONTHS_PT[monthIndex];
  if (!month || Number.isNaN(day)) return null;
  return {
    date: `${day} de ${month}`,
    time: `${match[4]}:${match[5]}`,
  };
}

export function formatDelay(delayMin: number): string {
  return delayMin === 1 ? 'Atraso de 1 minuto' : `Atraso de ${delayMin} minutos`;
}
