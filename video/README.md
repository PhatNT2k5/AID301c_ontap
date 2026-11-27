# Video chương (Remotion)

Pipeline dựng video thuyết minh cho từng chương. Có `package.json` riêng, không đụng tới web.

```
chapters/chN.script.json   kịch bản: sections → scenes (type, narration, data, pose, beats)
shared/theme.ts            màu theo web/src/index.css, font Be Vietnam Pro + JetBrains Mono
shared/Pet.tsx             mascot MeoLearn dùng sprite trong web/public/pet (thở, chớp bằng transform)
shared/scenes/*.tsx        Cycle, CodeTyping, Quiz (sẽ thêm Stairs, Pipeline, Compare, Matrix, Traps)
shared/pronunciation.json  từ điển phát âm {term, spoken, verified}
pipeline/build.py          script → TTS (cache) → timeline → render → mp4 + vtt + markers
cache/                     audio từng câu, khoá = hash(giọng + tốc độ + văn bản đọc); f5-worker.log
out/                       file tạm, khung hình mẫu, pronunciation-check.mp3
local-tts/                 F5-TTS chạy local (GPU) để clone giọng tiếng Việt, xem local-tts/README.md
```

## Lệnh

Cần `web/.venv` có `edge-tts`, `imageio-ffmpeg` và `numpy`, cùng Node 20 trở lên.

Giọng tiếng Việt mặc định lấy từ **F5-TTS local**: `local-tts/worker.py` clone giọng từ clip `F5_REF` trong `build.py`.
Vì vậy cần cài `local-tts/` (có GPU NVIDIA) trước. Muốn quay về giọng edge-tts cũ (`vi-VN-HoaiMyNeural`) thì đặt biến môi trường:

```powershell
$env:VIDEO_TTS = "edge"; npm run build:ch -- 1
```

Mỗi giọng có cache riêng, nên đổi qua lại không phải sinh lại audio. Muốn đổi clip mẫu hoặc tham số thì sửa `F5_REF` / `F5_SETTINGS` trong `build.py`.
Trước khi đưa cho F5, số được viết thành chữ (1996 → "một nghìn chín trăm chín mươi sáu") và chữ cái đứng riêng được đổi thành tên chữ (B → "bê").
Thuật ngữ tiếng Anh cần phiên âm kiểu Việt trong `pronunciation.json`, vì model F5 tiếng Việt đọc tiếng Anh kém.

Sau khi sửa phiên âm, chạy lại riêng những câu whisper đã báo lỗi (nhanh hơn nhiều so với build lại cả chương):

```powershell
$env:HF_HOME = "$PWD\local-tts\cache\hf"; ..\.venv\Scripts\python.exe pipeline\recheck.py 4 6
```

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
