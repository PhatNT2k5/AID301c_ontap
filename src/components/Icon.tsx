// Small stroke icons (24px grid) so the app needs no icon dependency.
const paths = {
  review: "M4 6h16M4 12h16M4 18h10",
  exam: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  notebook: "M6 3h12v18l-6-4-6 4V3Z",
  study: "M10 8.5v7l6-3.5-6-3.5ZM21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  search: "m20 20-4.5-4.5M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z",
  soundOn: "M4 9v6h4l5 4V5L8 9H4ZM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12",
  soundOff: "M4 9v6h4l5 4V5L8 9H4ZM17 9l5 6M22 9l-5 6",
  sun: "M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  moon: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z",
  auto: "M12 3a9 9 0 1 0 0 18V3ZM21 12a9 9 0 0 1-9 9",
  star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9L12 3Z",
  back: "M15 5l-7 7 7 7",
  check: "m5 12.5 4.5 4.5L19 7",
  lock: "M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6v-9Z",
} as const;

export type IconName = keyof typeof paths;

export const Icon = ({ name, filled = false, size = 20 }: { name: IconName; filled?: boolean; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d={paths[name]} />
  </svg>
);
