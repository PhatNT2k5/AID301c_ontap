// Hand-drawn style mascot: a round, spotted cat wearing star headphones. One SVG, face and
// extras swap per mood. Colors come from theme tokens so it follows light/dark mode.
export type Mood = "idle" | "happy" | "sad" | "angry" | "excited" | "sleepy" | "curious";

const STAR = "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9L12 3Z";
const SPARKLE = "M12 2c.6 5 1.8 7.4 10 10-8.2 2.6-9.4 5-10 10-.6-5-1.8-7.4-10-10 8.2-2.6 9.4-5 10-10Z";

const Star = ({ x, y, size, className }: { x: number; y: number; size: number; className?: string }) => (
  <path className={className} d={STAR} transform={`translate(${x - size / 2} ${y - size / 2}) scale(${size / 24})`} />
);

const Sparkle = ({ x, y, size }: { x: number; y: number; size: number }) => (
  <path className="pet-sparkle" d={SPARKLE} transform={`translate(${x - size / 2} ${y - size / 2}) scale(${size / 24})`} />
);

const Face = ({ mood }: { mood: Mood }) => {
  switch (mood) {
    case "happy":
      return (
        <g className="pet-line">
          <path d="M53 70q5-6 10 0M77 70q5-6 10 0" />
          <path className="pet-ink-fill" d="M63 76q7 10 14 0Z" />
        </g>
      );
    case "sleepy":
      return (
        <g className="pet-line">
          <path d="M53 68q5 4 10 0M77 68q5 4 10 0" />
          <ellipse className="pet-ink-fill" cx="70" cy="80" rx="2.2" ry="1.8" />
        </g>
      );
    case "angry":
      return (
        <g className="pet-line">
          <path d="M51 60l12 5M89 60l-12 5" />
          <circle className="pet-ink-fill" cx="58" cy="69" r="2.8" />
          <circle className="pet-ink-fill" cx="82" cy="69" r="2.8" />
          <path d="M63 82q7-6 14 0" />
        </g>
      );
    case "excited":
      return (
        <g>
          <Star className="pet-ink-fill" x={58} y={68} size={13} />
          <Star className="pet-ink-fill" x={82} y={68} size={13} />
          <ellipse className="pet-ink-fill" cx="70" cy="80" rx="4" ry="5" />
        </g>
      );
    case "curious":
      return (
        <g className="pet-line">
          <circle className="pet-ink-fill" cx="58" cy="68" r="3" />
          <circle className="pet-ink-fill" cx="82" cy="67" r="4.4" />
          <circle cx="70" cy="79" r="2.4" />
        </g>
      );
    case "sad":
      return (
        <g className="pet-line">
          <path d="M52 62q5-4 10 0M78 62q5-4 10 0" />
          <circle className="pet-ink-fill" cx="58" cy="69" r="2.8" />
          <circle className="pet-ink-fill" cx="82" cy="69" r="2.8" />
          <path className="pet-tear" d="M56 74q-3 6 0 8 3-2 0-8ZM84 74q-3 6 0 8 3-2 0-8Z" />
          <path d="M63 83q7-6 14 0" />
        </g>
      );
    default:
      return (
        <g className="pet-line">
          <g className="pet-blink">
            <circle className="pet-ink-fill" cx="58" cy="68" r="3.2" />
            <circle className="pet-ink-fill" cx="82" cy="68" r="3.2" />
          </g>
          <path d="M64 77q3 4 6 0 3 4 6 0" />
        </g>
      );
  }
};

const Extras = ({ mood }: { mood: Mood }) => {
  switch (mood) {
    case "happy":
      return (
        <g className="pet-float">
          <text className="pet-note" x="108" y="34">♪</text>
          <text className="pet-note pet-note-2" x="20" y="44">♫</text>
          <Star className="pet-star-deco" x={116} y={58} size={12} />
        </g>
      );
    case "sleepy":
      return (
        <g className="pet-float">
          <text className="pet-zzz" x="100" y="30">z</text>
          <text className="pet-zzz pet-zzz-2" x="110" y="18">z</text>
          <text className="pet-zzz pet-zzz-3" x="121" y="8">z</text>
        </g>
      );
    case "angry":
      return (
        <path
          className="pet-anger"
          d="M108 22q4 4 0 8M116 22q-4 4 0 8M106 34q4-4 8 0M106 18q4 4 8 0"
        />
      );
    case "excited":
      return (
        <g className="pet-pop">
          <Sparkle x={18} y={36} size={16} />
          <Sparkle x={122} y={30} size={20} />
          <Sparkle x={124} y={70} size={11} />
          <Sparkle x={14} y={78} size={10} />
        </g>
      );
    case "curious":
      return (
        <text className="pet-question" x="110" y="36">
          ?
        </text>
      );
    case "sad":
      return (
        <g className="pet-cloud-g">
          <path
            className="pet-cloud"
            d="M48 20a8 8 0 0 1 14-6 10 10 0 0 1 18 2 7 7 0 0 1 4 13H50a7 7 0 0 1-2-9Z"
          />
          <path className="pet-rain" d="M56 34l-2 5M66 34l-2 5M76 34l-2 5" />
        </g>
      );
    default:
      return null;
  }
};

export const PetArt = ({ mood }: { mood: Mood }) => (
  <svg className={`pet-art pet-${mood}`} viewBox="0 0 140 140" aria-hidden>
    <Extras mood={mood} />
    <g className="pet-figure">
      {/* tail */}
      <path
        className="pet-fill-mint pet-line"
        d="M98 112c10-2 18-10 16-20 7-4 4-15-4-13-1-9-13-8-12 0-8 1-7 12 0 14-4 7-4 14 0 19Z"
      />
      {/* body */}
      <ellipse className="pet-fill pet-line" cx="70" cy="106" rx="30" ry="23" />
      <ellipse className="pet-spot" cx="58" cy="110" rx="9" ry="8" />
      <ellipse className="pet-spot" cx="85" cy="100" rx="5" ry="4" />
      {/* paws */}
      <ellipse className="pet-fill pet-line" cx="57" cy="127" rx="8" ry="5" />
      <ellipse className="pet-fill pet-line" cx="83" cy="127" rx="8" ry="5" />

      <g className="pet-head">
        {/* ears */}
        <g className="pet-ears">
          <path className="pet-fill pet-line" d="M41 52 39 24l22 15Z" />
          <path className="pet-fill pet-line" d="M99 52l2-28-22 15Z" />
          <path className="pet-spot" d="M44 44l-1-12 9 7Z" />
          <path className="pet-spot" d="M96 44l1-12-9 7Z" />
        </g>
        {/* head */}
        <ellipse className="pet-fill pet-line" cx="70" cy="67" rx="34" ry="30" />
        <ellipse className="pet-spot" cx="51" cy="54" rx="8" ry="7" />
        <ellipse className="pet-spot" cx="92" cy="80" rx="5" ry="4" />
        {/* blush */}
        <ellipse className="pet-blush" cx="49" cy="77" rx="6" ry="3.5" />
        <ellipse className="pet-blush" cx="91" cy="77" rx="6" ry="3.5" />
        <Face mood={mood} />
        {/* headphones */}
        <path className="pet-band" d="M37 68C33 22 107 22 103 68" />
        <ellipse className="pet-cup pet-line" cx="35" cy="71" rx="9" ry="13" />
        <ellipse className="pet-cup pet-line" cx="105" cy="71" rx="9" ry="13" />
        <Star className="pet-cup-star" x={35} y={71} size={13} />
        <Star className="pet-cup-star" x={105} y={71} size={13} />
      </g>
    </g>
  </svg>
);
