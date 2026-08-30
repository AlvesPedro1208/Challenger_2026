// Place names in the dataset carry the terminal as a parenthesised complement
// ("São Paulo (Terminal Tietê)"). Screens show the city in the headline and push
// the terminal down to a secondary line, so both halves are needed separately.

const COMPLEMENT = /\s*\(([^()]*)\)\s*$/;

/** City part of a place name: "São Paulo (Terminal Tietê)" -> "São Paulo". */
export function cityName(place: string): string {
  return place.replace(COMPLEMENT, '').trim();
}

/** Terminal part of a place name: "São Paulo (Terminal Tietê)" -> "Terminal Tietê". */
export function placeComplement(place: string): string {
  return COMPLEMENT.exec(place)?.[1]?.trim() ?? '';
}
