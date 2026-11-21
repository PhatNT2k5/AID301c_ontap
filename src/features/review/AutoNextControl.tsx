import { AUTO_NEXT_MAX_S, AUTO_NEXT_MIN_S, AUTO_NEXT_STEP_S, useStore } from "../../store";

const formatSeconds = (s: number) => `${s.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}s`;

/** Toggle + delay slider for moving to the next question automatically after a correct answer. */
export const AutoNextControl = () => {
  const { settings } = useStore();
  const { autoNextOn, autoNextDelay } = settings;

  return (
    <div className="auto-next">
      <label className="auto-next-toggle">
        <input type="checkbox" checked={autoNextOn} onChange={settings.toggleAutoNext} />
        Tự qua câu khi đúng
      </label>
      {autoNextOn && (
        <label className="auto-next-delay">
          <input
            type="range"
            aria-label="Thời gian chờ trước khi qua câu"
            min={AUTO_NEXT_MIN_S}
            max={AUTO_NEXT_MAX_S}
            step={AUTO_NEXT_STEP_S}
            value={autoNextDelay}
            onChange={(e) => settings.setAutoNextDelay(Number(e.target.value))}
            aria-valuetext={formatSeconds(autoNextDelay)}
          />
          <output>{formatSeconds(autoNextDelay)}</output>
        </label>
      )}
    </div>
  );
};
