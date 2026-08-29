import type { Ticket, Trip } from "@jornada/shared";

/**
 * Demo trip fixture. The departure is always "today" at 14:50 local
 * time (America/Sao_Paulo, UTC-3) so the scenario works on any day.
 */

const SP_UTC_OFFSET = "-03:00";

function todayAt(time: string): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}T${time}:00${SP_UTC_OFFSET}`;
}

export const DEMO_TRIP: Trip = {
  id: "trip-2026-000123",
  origin: "São Paulo (Terminal Tietê)",
  destination: "Rio de Janeiro (Terminal Novo Rio)",
  departureIso: todayAt("14:50"),
  arrivalIso: todayAt("21:20"),
  company: "Viação Aurora",
  busClass: "Semi Leito",
  seat: "28",
  platform: "45",
};

export const DEMO_TICKET: Ticket = {
  tripId: DEMO_TRIP.id,
  passengerName: "Pedro Alves",
  seat: DEMO_TRIP.seat,
  qrPayload: "JV-2026-000123-28A",
};
