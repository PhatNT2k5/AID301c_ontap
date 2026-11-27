# local-tts — F5-TTS tiếng Việt chạy local

Clone giọng từ một clip mẫu 5–12 giây bằng [F5-TTS](https://github.com/SWivid/F5-TTS) + checkpoint
[hynt/F5-TTS-Vietnamese-ViVoice](https://huggingface.co/hynt/F5-TTS-Vietnamese-ViVoice) (1000h, `model_last.pt`).
`pipeline/build.py` dùng folder này qua `worker.py` (load model 1 lần, nhận job JSON qua stdin) cho giọng
tiếng Việt. Clip mẫu đang dùng là `ref/hynt/ref.wav` (1,9 giây), clip người thật do tác giả model phát hành trên GitHub.

> License checkpoint: **CC-BY-NC-SA-4.0**, chỉ dùng phi thương mại. Chỉ clone giọng khi có sự đồng ý của người đó.

## Cấu trúc (mọi thứ nằm trong folder này)

```
.venv/      Python 3.12 + torch 2.7.1 cu128 + f5-tts
models/     vi-1000h/model_last.pt, vocab.txt
cache/      hf/ (vocoder Vocos), uv/ (cache cài gói)
ref/        clip giọng mẫu *.wav + ref_text.txt (transcript đúng từng chữ)
out/        audio sinh ra
synth.py    CLI + hàm dùng chung
worker.py   worker chạy nền cho pipeline video
```

## Dùng

```powershell
.venv\Scripts\python.exe synth.py --ref ref\hynt\ref2.wav --text "Đáp án đúng là bê." --out out\a.wav
.venv\Scripts\python.exe synth.py --ref ref\hynt\ref2.wav --text-file lines.txt --out-dir out\batch
```

- `--ref-text`: transcript của clip mẫu. Nếu bỏ trống thì đọc từ file `<clip>.txt` nằm cạnh file wav. Phải khớp chính xác với audio.
- `--speed`, `--nfe` (32 mặc định, tăng lên 64 thì sạch hơn nhưng chậm gấp đôi), `--seed`.
- Muốn dùng giọng của mình: thu một clip WAV 6–10 giây, nói rõ, không nhạc nền, bỏ vào `ref/` kèm file `.txt` cùng tên chứa transcript, rồi trỏ `F5_REF` trong `pipeline/build.py` tới clip đó.
- Model được train trên text viết thường, nên script tự chuyển sang chữ thường. Số, ký hiệu, từ tiếng Anh nên viết thành chữ theo cách đọc.

RTX 4060 8GB: khoảng 2,5–4 giây cho một đoạn 15 giây audio (chưa tính thời gian load model).

## Cài lại (venv và model không nằm trong git)

```powershell
$env:UV_CACHE_DIR = "$PWD\cache\uv"
uv venv .venv --python 3.12
uv pip install --python .venv\Scripts\python.exe torch==2.7.1 torchaudio==2.7.1 --index-url https://download.pytorch.org/whl/cu128
uv pip install --python .venv\Scripts\python.exe f5-tts
New-Item -ItemType Directory -Force models\vi-1000h
curl.exe -L -o models\vi-1000h\model_last.pt https://huggingface.co/hynt/F5-TTS-Vietnamese-ViVoice/resolve/main/model_last.pt
curl.exe -L -o models\vi-1000h\vocab.txt https://huggingface.co/hynt/F5-TTS-Vietnamese-ViVoice/resolve/main/config.json
```

File `config.json` trên HuggingFace thực chất là vocab, nên khi tải về thì lưu thành `vocab.txt`.

## Gỡ

Xóa folder `local-tts/` là sạch (khoảng 8 GB). Interpreter Python 3.12 của uv là dùng chung từ trước nên không bị ảnh hưởng.
