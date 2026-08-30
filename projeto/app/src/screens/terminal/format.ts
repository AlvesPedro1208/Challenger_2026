/**
 * Os timestamps da demo chegam sempre com offset -03:00 e hora "de parede"
 * de São Paulo. Extrair HH:mm direto da string mantém o horário simulado
 * correto mesmo que o dispositivo esteja em outro fuso.
 */
const ISO_TIME_PATTERN = /T(\d{2}):(\d{2})/;

export function formatIsoTime(iso: string | null | undefined): string | null {
  if (!iso) {
    return null;
  }
  const match = ISO_TIME_PATTERN.exec(iso);
  if (!match) {
    return null;
  }
  return `${match[1]}:${match[2]}`;
}

/** Minutos (arredondados) entre o relógio de referência e o alvo. */
export function minutesUntil(
  targetIso: string | null | undefined,
  referenceIso: string | null | undefined,
): number | null {
  if (!targetIso || !referenceIso) {
    return null;
  }
  const target = Date.parse(targetIso);
  const reference = Date.parse(referenceIso);
  if (Number.isNaN(target) || Number.isNaN(reference)) {
    return null;
  }
  return Math.round((target - reference) / 60_000);
}
