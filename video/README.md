# Video chương (Remotion)

Pipeline dựng video thuyết minh cho từng chương. Có `package.json` riêng, không đụng tới web.

```
chapters/chN.script.json   kịch bản: sections → scenes (type, narration, data, pose, beats)
shared/theme.ts            màu theo web/src/index.css, font Be Vietnam Pro + JetBrains Mono
shared/Pet.tsx             mascot MeoLearn dùng sprite trong web/public/pet (thở, chớp bằng transform)
shared/scenes/*.tsx        Cycle, CodeTyping, Quiz (sẽ thêm Stairs, Pipeline, Compare, Matrix, Traps)
shared/pronunciation.json  từ điển phát âm {term, spoken, verified}
pipeline/build.py          script → TTS (cache) → timeline → render → mp4 + vtt + markers
cache/                     audio từng câu, khoá = hash(giọng + tốc độ + văn bản đọc)
out/                       file tạm, khung hình mẫu, pronunciation-check.mp3
```

## Lệnh

Cần `web/.venv` có `edge-tts`, `imageio-ffmpeg` và `numpy`, cùng Node 20 trở lên.

```bash
npm install
npm run demo            # ~40 giây đầu chương 1 -> out/ch1-demo.mp4
npm run build:ch -- 1   # cả chương -> web/public/videos/ch1.mp4, ch1.vtt, ch1.markers.json
npm run studio          # xem và chỉnh trong Remotion Studio
```

## Quy tắc pipeline kiểm tra

- Dòng chữ chính mỗi cảnh không quá 8 từ.
- Hai beat liên tiếp trong một cảnh cách nhau không quá 4 giây. Riêng đoạn đọc đề quiz được miễn.
- Quiz phải lấy câu cùng chương và có `needsReview=false`. Đề và các đáp án được đọc bằng giọng tiếng Anh (`en-US-AvaNeural`).
- Thuật ngữ tiếng Anh trong lời giảng phải có trong `pronunciation.json`. Gặp thuật ngữ mới thì build dừng và thêm mục `needsProposal`. Mục chưa xác nhận được đọc vào `out/pronunciation-check.mp3` để nghe lại.

Remotion miễn phí cho cá nhân. Doanh nghiệp từ 4 người trở lên cần license riêng (xem remotion.dev/license).
