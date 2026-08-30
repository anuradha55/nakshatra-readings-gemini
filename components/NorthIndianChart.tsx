"use client";

type Planet = {
  name: string;
  sign: string;
  degree: number;
  minute: number;
  second: number;
  nakshatra?: string;
  pada?: number;
  retrograde?: boolean;
};

type ChartHouse = { number: number; sign: string; planets: Planet[] };

type Props = {
  ascendant: { sign: string; degree: number; minute: number; second: number };
  houses: ChartHouse[];
};

const VEDIC_PLANETS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];

/*
 * Visual centers of the 12 individual regions in the traditional
 * North-Indian chart used by the SVG below.
 *
 * The old coordinates put some labels too close to the diagonals/borders,
 * especially houses 1, 6 and 7. These are the actual visual centers of the
 * regions, not the centers of the surrounding square.
 */
const HOUSE_CENTERS: Record<number, [number, number]> = {
  1: [291, 142],
  2: [150, 92],
  3: [91, 191],
  4: [150, 291],
  5: [91, 391],
  6: [150, 490],
  7: [291, 440],
  8: [432, 490],
  9: [491, 391],
  10: [432, 291],
  11: [491, 191],
  12: [432, 92],
};

function shortPlanet(name: string) {
  return ({
    Sun: "Su", Moon: "Mo", Mars: "Ma", Mercury: "Me", Jupiter: "Ju",
    Venus: "Ve", Saturn: "Sa", Rahu: "Ra", Ketu: "Ke",
  } as Record<string, string>)[name] ?? name.slice(0, 2);
}

type DegreeValue = { degree: number };

function degreeText(p: DegreeValue) {
  return `${Math.round(p.degree)}°`;
}

export default function NorthIndianChart({ ascendant, houses }: Props) {
  const byHouse = new Map(houses.map((h) => [h.number, h]));

  return (
    <div className="kundli-card">
      <div className="kundli-title-row">
        <div>
          <div className="eyebrow">D1 · Rashi chart</div>
          <h4>Birth Lagna Chart</h4>
        </div>
        <div className="kundli-lagna">
          <span>Lagna</span>
          <strong>{ascendant.sign}</strong>
          <small>{degreeText(ascendant)} {ascendant.minute}' {ascendant.second}&quot;</small>
        </div>
      </div>

      <div className="kundli-layout">
        <div className="kundli-svg-wrap">
          <svg className="kundli-svg" viewBox="0 0 582 582" role="img" aria-label="North Indian D1 Lagna chart">
            <rect x="9" y="9" width="564" height="564" className="kundli-border" />
            <polygon points="291,9 573,291 291,573 9,291" className="kundli-inner" />
            <line x1="9" y1="9" x2="573" y2="573" className="kundli-line" />
            <line x1="573" y1="9" x2="9" y2="573" className="kundli-line" />

            {[...Array(12)].map((_, index) => {
              const number = index + 1;
              const house = byHouse.get(number);
              const [x, y] = HOUSE_CENTERS[number];
              const planets = (house?.planets ?? []).filter((p) => VEDIC_PLANETS.includes(p.name));

              return (
                <g key={number}>
                  {/*
                   * Keep every row on one x-coordinate. The y positions are
                   * intentionally compact so all content remains inside the
                   * house even when two planets are present.
                   */}
                  <text x={x} y={y - 28} className="kundli-house">{number}</text>
                  <text x={x} y={y - 7} className="kundli-sign">{house?.sign ?? ""}</text>

                  {planets.length === 0 ? (
                    <text x={x} y={y + 18} className="kundli-empty">—</text>
                  ) : (
                    <text x={x} y={y + 18} className="kundli-planets">
                      {planets.map((p, i) => (
                        <tspan key={p.name} x={x} dy={i === 0 ? 0 : 16}>
                          {shortPlanet(p.name)} {degreeText(p)}
                        </tspan>
                      ))}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        <div className="kundli-legend">
          <p><strong>Planet abbreviations</strong></p>
          <p>Su Sun · Mo Moon · Ma Mars · Me Mercury · Ju Jupiter</p>
          <p>Ve Venus · Sa Saturn · Ra Rahu · Ke Ketu</p>
          <p className="kundli-note">Only the nine Vedic planets are shown. Houses are numbered from Lagna, and placement comes directly from the calculated Lahiri sidereal, whole-sign D1 chart.</p>
        </div>
      </div>
    </div>
  );
}
