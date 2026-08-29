import type { Stop } from "../models";

/** Support stops along the Via Dutra used by the demo scenario. */
export const STOPS: Stop[] = [
  {
    id: "stop-aparecida",
    name: "Posto Frango Assado - Aparecida",
    lat: -22.8486,
    lng: -45.2327,
    scheduledDwellMin: 25,
    pois: [
      {
        id: "poi-ap-01",
        name: "Frango Assado Restaurante",
        category: "food",
        rating: 4.4,
        priceLevel: 2,
      },
      {
        id: "poi-ap-02",
        name: "Cafe do Ponto Express",
        category: "coffee",
        rating: 4.2,
        priceLevel: 2,
      },
      {
        id: "poi-ap-03",
        name: "Lanchonete Rota 116",
        category: "food",
        rating: 3.9,
        priceLevel: 1,
      },
      {
        id: "poi-ap-04",
        name: "Loja de Conveniencia AmPm",
        category: "convenience",
        rating: 4.1,
        priceLevel: 2,
      },
      {
        id: "poi-ap-05",
        name: "Doces da Basilica",
        category: "food",
        rating: 4.7,
        priceLevel: 2,
      },
    ],
  },
  {
    id: "stop-resende",
    name: "Graal Resende",
    lat: -22.4708,
    lng: -44.4512,
    scheduledDwellMin: 20,
    pois: [
      {
        id: "poi-re-01",
        name: "Restaurante Graal Buffet",
        category: "food",
        rating: 4.3,
        priceLevel: 3,
      },
      {
        id: "poi-re-02",
        name: "Cafeteria Grao da Serra",
        category: "coffee",
        rating: 4.5,
        priceLevel: 2,
      },
      {
        id: "poi-re-03",
        name: "Burguer da Estrada",
        category: "food",
        rating: 4.0,
        priceLevel: 2,
      },
      {
        id: "poi-re-04",
        name: "Conveniencia BR Mania",
        category: "convenience",
        rating: 3.9,
        priceLevel: 2,
      },
    ],
  },
];
