 "use client";

import { useEffect, useState } from "react";

export default function Starfield() {
  const [stars, setStars] = useState<
    { left: number; top: number; delay: number }[]
  >([]);

  useEffect(() => {
    setStars(
      Array.from({ length: 70 }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 4,
      }))
    );
  }, []);

  return (
    <div className="stars" aria-hidden="true">
      {stars.map((star, i) => (
        <span
          key={i}
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}
    </div>
  );
}