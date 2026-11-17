# AID301c – Web ôn thi

Website học môn AID301c (FPT University), giao diện tiếng Việt, gồm 3 phần:

- **Ôn tập**: 235 câu trắc nghiệm gom từ 4 đề thi (FA25 FE, SP26 FE, SU26 FE, SU26 RE) và 2 bộ Quizlet, đã bỏ câu trùng, chia thành các section khoảng 10 câu. Phải trả lời đúng hết các câu trong section thì section sau mới mở. Chọn sai thì hiện giải thích tiếng Việt và câu đó quay lại ở cuối section. Có âm thanh khi đúng, khi sai và khi xong section. Tiến độ được lưu trong trình duyệt.
- **Học tập**: 6 chương bám theo chuỗi khóa IBM AI Enterprise Workflow (Coursera), mỗi chương có video thuyết minh khoảng 5 phút kèm tóm tắt và nguồn.
- **Cần kiểm tra**: danh sách những câu chưa có đáp án chính thức (do AI giải, lấy theo bình luận, các nguồn mâu thuẫn, hoặc AI không đồng ý với đáp án nguồn).

> FPT không công khai slide hay đề cương AID301c. Phần Học tập dựa trên bộ câu hỏi và các nguồn công khai ghi trong từng chương.

## Dùng ngay

Mở `dist/index.html` bằng trình duyệt (double-click). Toàn bộ JS, CSS, font và dữ liệu đã được gộp vào file đó. Video nằm ở `dist/videos/`, phải để chung thư mục với `index.html`.

## Deploy

`dist/` là site tĩnh. Có thể deploy theo một trong các cách:

- Netlify: kéo thả thư mục `dist` vào https://app.netlify.com/drop
- Vercel: import repo GitHub này, Vercel tự nhận Vite (build `npm run build`, output `dist`), không cần cấu hình thêm
- GitHub Pages: đưa nội dung `dist/` lên branch `gh-pages`

## Build lại

Yêu cầu Node 20+ và Python 3.11+.

```bash
npm install
npm run build
```

## Pipeline dữ liệu

```
data/raw/*.json          câu hỏi chép từ ảnh đề và PDF Quizlet (mỗi nguồn 1 file)
scripts/merge_dedupe.py  -> data/merged.json     gộp nguồn, bỏ trùng, map đáp án theo nội dung lựa chọn
data/annot/batch*.json   chương, giải thích tiếng Việt, AI tự giải và soát đáp án
data/chapters/ch*.json   nội dung chương, nguồn, kịch bản video
scripts/finalize.py      -> data/questions.json, data/chapters.json   (web dùng 2 file này)
scripts/build_videos.py  -> public/videos/ch*.mp4
```

Thứ tự ưu tiên đáp án: đề có đáp án tham khảo (SU26) > Quizlet > bình luận fuexam (SP26) > AI giải (FA25). Khi AI không đồng ý với đáp án nguồn mà có nguồn khác ủng hộ đáp án của AI, web hiện đáp án theo số đông và gắn cờ cần kiểm tra.

### Sửa một đáp án

Sửa trực tiếp trong `data/questions.json`:

- `answer`: danh sách key đúng, ví dụ `["B"]`
- `needsReview`: đặt `false` (và xoá `reviewReason`) sau khi đã kiểm tra xong

Sau đó chạy `npm run build`. Lưu ý: chạy lại `scripts/finalize.py` sẽ ghi đè các chỉnh sửa tay trong `questions.json`. Nếu muốn giữ thay đổi lâu dài, hãy sửa trong `data/annot/` hoặc `data/merged.json`.

### Tạo lại video

```bash
python -m venv .venv
.venv/Scripts/pip install edge-tts imageio-ffmpeg playwright
.venv/Scripts/python -m playwright install chromium
.venv/Scripts/python scripts/build_videos.py        # tất cả chương
.venv/Scripts/python scripts/build_videos.py 3 5    # chỉ chương 3 và 5
```

Script dùng giọng `vi-VN-HoaiMyNeural` của dịch vụ Microsoft Edge TTS, nên cần có mạng; kịch bản sẽ được gửi lên dịch vụ đó. Slide được Playwright render thành ảnh, phụ đề in thẳng vào hình, rồi ghép thành MP4 bằng ffmpeg đi kèm `imageio-ffmpeg`.
