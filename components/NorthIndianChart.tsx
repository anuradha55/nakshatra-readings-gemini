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

// Fixed regions of a North-Indian style chart. The houses do not move;
// the signs and planets inside them change according to the Lagna.
const HOUSE_CENTERS: Record<number, [number, number]> = {
  1: [291, 142], 2: [116, 103], 3: [83, 214], 4: [142, 291],
  5: [83, 368], 6: [116, 479], 7: [291, 440], 8: [466, 479],
  9: [499, 368], 10: [440, 291], 11: [499, 214], 12: [466, 103],
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
          <small>{degreeText(ascendant)} {ascendant.minute}'</small>
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
              const planets = house?.planets ?? [];
              return (
                <g key={number}>
                  <text x={x} y={y - 25} className="kundli-house">{number}</text>
                  <text x={x} y={y - 7} className="kundli-sign">{house?.sign ?? ""}</text>
                  <text x={x} y={y + 15} className="kundli-planets">
                    {planets.map((p) => shortPlanet(p.name)).join("  ") || "—"}
                  </text>
                  {planets.length > 0 && (
                    <text x={x} y={y + 34} className="kundli-degrees">
                      {planets.map((p) => `${shortPlanet(p.name)} ${degreeText(p)}`).join("  ")}
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
          <p className="kundli-note">Houses are numbered from Lagna. Planet placement is taken directly from the calculated Lahiri sidereal, whole-sign D1 chart.</p>
        </div>
      </div>
    </div>
  );
}
