import { useCallback, useEffect, useRef, useState } from "react";
import { playCat, stopCat, type CatSound } from "../../lib/sound";
import { useStore } from "../../store";
import { onPet } from "./petBus";

// Sprites are cut from image-pet/pet.png by scripts/cut_pet.py; all share one canvas size with
// the feet on the bottom edge, so swapping the src never shifts the pet.
export type Mood = "idle" | "happy" | "sad" | "angry" | "sleepy" | "curious";

const MOODS: Mood[] = ["idle", "happy", "sad", "angry", "sleepy", "curious"];
const spriteSrc = (mood: Mood) => `pet/${mood}.webp`;

// Effects that were drawn beside each pose on the sheet, shown as separate overlays.
const effect: Partial<Record<Mood, string>> = {
  happy: "note",
  angry: "anger",
  sleepy: "zzz",
  curious: "question",
};

const lines: Record<Mood, string[]> = {
  idle: ["Hi! Ôn bài cùng mình nha", "Hôm nay làm 1 section nhé?", "Mình ngồi đây cổ vũ nè"],
  happy: ["Đúng rồi!", "Giỏi quá~", "Meow~ chuẩn luôn", "Tiếp nào tiếp nào!"],
  sad: ["Sai mất rồi...", "Không sao, đọc giải thích nha", "Câu này sẽ quay lại, nhớ kỹ nha"],
  angry: ["Sai 3 câu liền rồi đó!", "Hmph! Đọc kỹ đề nha", "Tập trung nào!"],
  sleepy: ["Zzz... buồn ngủ quá", "Nghỉ chút rồi học tiếp nha..."],
  curious: ["Tìm gì đó?", "Hửm? Câu này hay nè", "Để xem nào..."],
};

const cheers = [
  "Cố lên! Sắp thi rồi đó",
  "Làm sai thì vào Sổ tay luyện lại nha",
  "Thử Thi nhanh 20 câu không?",
  "Meow~ học xong thưởng trà sữa",
  "Mỗi ngày một section là đủ nè",
];

const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)];

const MOOD_MS = 4000;
const BUBBLE_MS = 3500;
const SLEEP_AFTER_MS = 90_000;

export const Pet = () => {
  const { settings } = useStore();
  const [mood, setMood] = useState<Mood>("idle");
  const [bubble, setBubble] = useState<string | null>(lines.idle[0]);
  const moodRef = useRef<Mood>("idle");
  const streak = useRef({ right: 0, wrong: 0 });
  const lastActive = useRef(Date.now());
  const timers = useRef<{ mood?: number; bubble?: number }>({});
  const soundOn = useRef(settings.soundOn);
  useEffect(() => {
    soundOn.current = settings.soundOn;
  }, [settings.soundOn]);

  // Reactions to quiz events are animation only (the quiz plays its own chime/buzz);
  // the cat makes a sound only when the learner clicks it.
  const say = useCallback((next: Mood, text?: string, sound?: CatSound) => {
    if (sound && soundOn.current) playCat(sound);
    else stopCat();
    window.clearTimeout(timers.current.mood);
    window.clearTimeout(timers.current.bubble);
    moodRef.current = next;
    setMood(next);
    setBubble(text ?? pick(lines[next]));
    timers.current.bubble = window.setTimeout(() => setBubble(null), BUBBLE_MS);
    // Sleeping lasts until the learner comes back; other moods fade back to idle.
    if (next !== "sleepy") {
      timers.current.mood = window.setTimeout(() => {
        moodRef.current = "idle";
        setMood("idle");
      }, MOOD_MS);
    }
  }, []);

  // Preload every pose so the first mood change does not flash an empty frame.
  useEffect(() => {
    for (const m of MOODS) new Image().src = spriteSrc(m);
    for (const fx of Object.values(effect)) new Image().src = `pet/fx-${fx}.webp`;
  }, []);

  // Greeting bubble on load fades by itself.
  useEffect(() => {
    timers.current.bubble = window.setTimeout(() => setBubble(null), BUBBLE_MS);
    const t = timers.current;
    return () => {
      window.clearTimeout(t.mood);
      window.clearTimeout(t.bubble);
    };
  }, []);

  useEffect(
    () =>
      onPet((event) => {
        lastActive.current = Date.now();
        const s = streak.current;
        switch (event.type) {
          case "correct":
            s.right += 1;
            s.wrong = 0;
            if (s.right % 5 === 0) say("happy", `Combo ${s.right} câu đúng liền!`);
            else say("happy");
            break;
          case "wrong":
            s.wrong += 1;
            s.right = 0;
            say(s.wrong >= 3 ? "angry" : "sad");
            break;
          case "complete":
            say("happy", pick(["Xong rồi! Giỏi quá~", "Hoàn thành luôn!", "Thêm một phần nữa xong!"]));
            break;
          case "exam": {
            const score = event.score.toFixed(1);
            if (event.score >= 5)
              say("happy", `${score} điểm${event.score >= 8 ? "! Wow!" : ", qua môn rồi!"}`);
            else say("sad", `${score} điểm... ôn thêm chút nha`);
            break;
          }
          case "start":
          case "search":
            say("curious");
            break;
        }
      }),
    [say],
  );

  // Fall asleep when nothing happens for a while; wake up on any key or click.
  useEffect(() => {
    const wake = () => {
      lastActive.current = Date.now();
      if (moodRef.current === "sleepy") say("curious", "Hả? Mình dậy rồi đây!");
    };
    const check = window.setInterval(() => {
      if (moodRef.current === "idle" && Date.now() - lastActive.current > SLEEP_AFTER_MS) say("sleepy");
    }, 5000);
    window.addEventListener("keydown", wake);
    window.addEventListener("pointerdown", wake);
    return () => {
      window.clearInterval(check);
      window.removeEventListener("keydown", wake);
      window.removeEventListener("pointerdown", wake);
    };
  }, [say]);

  if (!settings.petOn) return null;

  const fx = effect[mood];

  return (
    <div className={`pet pet-${mood}`} data-mood={mood}>
      {bubble && (
        <p className="pet-bubble" role="status">
          {bubble}
        </p>
      )}
      <button
        className="pet-btn"
        title="Bấm để nhận lời cổ vũ"
        aria-label="MeoLearn, bấm để nhận lời cổ vũ"
        onClick={() => say("happy", pick(cheers), pick<CatSound>(["mew", "meow", "trill"]))}
      >
        <img className="pet-sprite" src={spriteSrc(mood)} alt="" draggable={false} />
        {fx && <img key={fx} className={`pet-fx pet-fx-${fx}`} src={`pet/fx-${fx}.webp`} alt="" draggable={false} />}
      </button>
    </div>
  );
};
