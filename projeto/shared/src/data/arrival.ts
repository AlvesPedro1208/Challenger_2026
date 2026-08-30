import type { Poi, UserRouteStats } from "../models";

/**
 * Destination dataset for the demo arrival: establishments around the
 * Terminal Rodoviario Novo Rio (Santo Cristo, Rio de Janeiro) plus the
 * passenger's personal history on the SP-Rio route.
 */

export const NOVO_RIO_POIS: Poi[] = [
  {
    id: "poi-nr-01",
    name: "Café do Alto Santo Cristo",
    category: "coffee",
    rating: 4.6,
    priceLevel: 2,
  },
  {
    id: "poi-nr-02",
    name: "Padaria e Confeitaria Imperial",
    category: "coffee",
    rating: 4.5,
    priceLevel: 1,
  },
  {
    id: "poi-nr-03",
    name: "Cafeteria Grão Carioca",
    category: "coffee",
    rating: 4.3,
    priceLevel: 2,
  },
  {
    id: "poi-nr-04",
    name: "Restaurante Galeto do Porto",
    category: "food",
    rating: 4.6,
    priceLevel: 2,
  },
  {
    id: "poi-nr-05",
    name: "Angu do Gomes Bar e Restaurante",
    category: "food",
    rating: 4.7,
    priceLevel: 2,
  },
  {
    id: "poi-nr-06",
    name: "Cantina Sabor da Rodoviária",
    category: "food",
    rating: 4.0,
    priceLevel: 1,
  },
  {
    id: "poi-nr-07",
    name: "Farmácia Santo Cristo 24h",
    category: "pharmacy",
    rating: 4.2,
    priceLevel: 2,
  },
  {
    id: "poi-nr-08",
    name: "Conveniência Novo Rio Express",
    category: "convenience",
    rating: 4.1,
    priceLevel: 2,
  },
  {
    id: "poi-nr-09",
    name: "Ponto de Táxi e Apps Novo Rio",
    category: "other",
    rating: 4.4,
    priceLevel: 2,
  },
];

/** Road distance of the demo route (Tiete -> Novo Rio via Dutra), in km. */
export const SP_RIO_ROUTE_KM = 434;

/** Personal history of this passenger on the SP-Rio route, before the demo trip. */
export const USER_ROUTE_STATS: UserRouteStats = {
  tripsCount: 7,
  totalKm: 3038,
  totalHours: 52,
};
