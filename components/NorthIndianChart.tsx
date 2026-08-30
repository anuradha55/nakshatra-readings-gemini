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

// Fixed regions for the traditional North-Indian diamond chart.
const HOUSE_CENTERS: Record<number, [number, number]> = {
  1: [291, 132], 2: [145, 86], 3: [76, 190], 4: [145, 291],
  5: [76, 392], 6: [145, 496], 7: [291, 450], 8: [437, 496],
  9: [506, 392], 10: [437, 291], 11: [506, 190], 12: [437, 86],
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
                  <text x={x} y={y - 34} className="kundli-house">{number}</text>
                  <text x={x} y={y - 12} className="kundli-sign">{house?.sign ?? ""}</text>
                  {planets.length === 0 ? (
                    <text x={x} y={y + 15} className="kundli-empty">—</text>
                  ) : (
                    <text x={x} y={y + 14} className="kundli-planets">
                      {planets.map((p, i) => (
                        <tspan key={p.name} x={x} dy={i === 0 ? 0 : 18}>
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
