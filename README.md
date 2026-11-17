# AID301c – Web ôn thi

Website học môn AID301c (FPT University), giao diện tiếng Việt, gồm các phần:

- **Ôn tập**: 235 câu trắc nghiệm gom từ 4 đề thi (FA25 FE, SP26 FE, SU26 FE, SU26 RE) và 2 bộ Quizlet, đã bỏ câu trùng, chia thành 24 section khoảng 10 câu (bản đồ dạng phiếu tô trắc nghiệm). Section nào cũng mở, làm theo thứ tự nào cũng được; trả lời đúng hết mọi câu thì section đó xong. Chọn sai thì hiện giải thích tiếng Việt và câu đó quay lại ở cuối section. Có âm thanh khi đúng, khi sai và khi xong section.
- **Đề thi FE**: 4 đề gốc của FPT (SU26 FE, SU26 RE, SP26 FE, FA25 FE) nhóm theo kỳ, giữ đúng thứ tự câu, mỗi đề chia 3 phần để luyện, hoặc thi cả đề có hẹn giờ.
- **Thi thử**: bốc ngẫu nhiên 20/30/50 câu theo chương, hẹn giờ 1,2 phút/câu, bảng chuyển câu, đánh dấu xem lại, chấm điểm thang 10, thống kê theo chương và lịch sử các lần thi.
- **Sổ tay**: câu từng làm sai (tự thêm) và câu đánh dấu sao, có chế độ luyện lại.
- **Học tập**: 6 chương bám theo chuỗi khóa IBM AI Enterprise Workflow (Coursera), mỗi chương có video thuyết minh khoảng 6 phút kèm tóm tắt và nguồn.
- **Tra cứu**: tìm trong câu hỏi, đáp án và giải thích (gõ không dấu được), lọc theo chương, câu cần kiểm tra đáp án, câu đánh dấu, câu từng sai.

Pet: mèo đốm đeo tai nghe ở góc màn hình, đổi trạng thái theo việc học (vui khi đúng, buồn khi sai, giận khi sai 3 câu liền, phấn khích khi xong phần hoặc combo, ngủ khi để lâu không đụng, tò mò khi tìm kiếm). Bấm vào pet để nghe cổ vũ, nút hình bàn chân để ẩn hoặc hiện.

Phím tắt: `1`–`4` hoặc `A`–`D` chọn đáp án, `Enter` sang câu, `←` `→` chuyển câu khi thi thử. Có giao diện sáng/tối. Mọi tiến độ lưu trong trình duyệt (localStorage).

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
