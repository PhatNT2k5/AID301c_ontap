import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "../../store";
import { PetArt, type Mood } from "./PetArt";
import { onPet } from "./petBus";

const lines: Record<Mood, string[]> = {
  idle: ["Hi! Ôn bài cùng mình nha", "Hôm nay làm 1 section nhé?", "Mình ngồi đây cổ vũ nè"],
  happy: ["Đúng rồi!", "Giỏi quá~", "Meow~ chuẩn luôn", "Tiếp nào tiếp nào!"],
  sad: ["Sai mất rồi...", "Không sao, đọc giải thích nha", "Câu này sẽ quay lại, nhớ kỹ nha"],
  angry: ["Sai 3 câu liền rồi đó!", "Hmph! Đọc kỹ đề nha", "Tập trung nào!"],
  excited: ["Wow! Xong rồi!", "Đỉnh quá đi!", "Giỏi ghê luôn!"],
  sleepy: ["Zzz... buồn ngủ quá", "Nghỉ chút rồi học tiếp nha..."],
  curious: ["Tìm gì đó?", "Hửm?", "Câu nào khó vậy?"],
};

const cheers = [
  "Cố lên! Sắp thi rồi đó",
  "Làm sai thì vào Sổ tay luyện lại nha",
  "Thử Thi nhanh 20 câu không?",
  "Meow~ học xong thưởng trà sữa",
  "Mỗi ngày một section là đủ nè",
];

const pick = (list: string[]): string => list[Math.floor(Math.random() * list.length)];

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

  const say = useCallback((next: Mood, text?: string) => {
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
            if (s.right % 5 === 0) say("excited", `Combo ${s.right} câu đúng liền!`);
            else say("happy");
            break;
          case "wrong":
            s.wrong += 1;
            s.right = 0;
            say(s.wrong >= 3 ? "angry" : "sad");
            break;
          case "complete":
            say("excited", pick(["Xong rồi! Giỏi quá~", "Wow! Hoàn thành luôn!", "Thêm một phần nữa xong!"]));
            break;
          case "exam": {
            const score = event.score.toFixed(1);
            if (event.score >= 8) say("excited", `${score} điểm! Wow!`);
            else if (event.score >= 5) say("happy", `${score} điểm, qua môn rồi!`);
            else say("sad", `${score} điểm... ôn thêm chút nha`);
            break;
          }
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

  return (
    <div className="pet" data-mood={mood}>
      {bubble && (
        <p className="pet-bubble" role="status">
          {bubble}
        </p>
      )}
      <button
        className="pet-btn"
        title="Bấm để nhận lời cổ vũ"
        aria-label="Pet cổ vũ"
        onClick={() => say("happy", pick(cheers))}
      >
        <PetArt mood={mood} />
      </button>
    </div>
  );
};
