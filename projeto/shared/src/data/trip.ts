import type { Ticket, Trip } from "../models";

/**
 * Canonical demo trip: the sp-rio-nightly scenario night, departing
 * Sao Paulo at 22:30 on 2026-09-13 and arriving in Rio at 06:10 the
 * next morning (America/Sao_Paulo, UTC-3).
 */

export const DEMO_TRIP: Trip = {
  id: "sp-rio-2230",
  origin: "São Paulo (Terminal Tietê)",
  destination: "Rio de Janeiro (Terminal Novo Rio)",
  departureIso: "2026-09-13T22:30:00-03:00",
  arrivalIso: "2026-09-14T06:10:00-03:00",
  company: "Viação Aurora",
  busClass: "Semi Leito",
  seat: "28",
  platform: "45",
};

export const DEMO_TICKET: Ticket = {
  tripId: DEMO_TRIP.id,
  passengerName: "Pedro Alves",
  seat: DEMO_TRIP.seat,
  qrPayload: "JV-sp-rio-2230-28",
};
