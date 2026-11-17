// Hand-drawn style stars and swirls scattered behind the page (decorative only).
const star = "M12 2.5 14.6 9l6.9.3-5.4 4.3 1.9 6.7L12 16.4l-6 3.9 1.9-6.7L2.5 9.3 9.4 9 12 2.5Z";
const sparkle = "M12 2c.6 5 1.8 7.4 10 10-8.2 2.6-9.4 5-10 10-.6-5-1.8-7.4-10-10 8.2-2.6 9.4-5 10-10Z";
const swirl = "M12 12c0-1.5 2-1.5 2 0s-2 3-4 3-3.5-2-3.5-4S8.5 5.5 12 5.5s6.5 3 6.5 6.5-3 7-7 7";

type Mark = { d: string; x: string; y: string; size: number; rot: number; fill?: boolean };

const marks: Mark[] = [
  { d: star, x: "6%", y: "12%", size: 46, rot: -12 },
  { d: sparkle, x: "92%", y: "8%", size: 26, rot: 0, fill: true },
  { d: star, x: "88%", y: "46%", size: 30, rot: 18, fill: true },
  { d: swirl, x: "4%", y: "64%", size: 38, rot: 0 },
  { d: sparkle, x: "14%", y: "88%", size: 22, rot: 0 },
  { d: star, x: "95%", y: "84%", size: 52, rot: 8 },
  { d: sparkle, x: "52%", y: "96%", size: 18, rot: 0, fill: true },
];

export const Doodles = () => (
  <div className="doodles" aria-hidden>
    {marks.map((m, i) => (
      <svg
        key={i}
        viewBox="0 0 24 24"
        width={m.size}
        height={m.size}
        style={{ left: m.x, top: m.y, transform: `rotate(${m.rot}deg)` }}
        fill={m.fill ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path d={m.d} />
      </svg>
    ))}
  </div>
);
