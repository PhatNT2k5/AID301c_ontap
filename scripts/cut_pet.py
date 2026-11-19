"""Cut the MeoLearn pet poses out of image-pet/pet.png into transparent sprites.

Each pose is cropped from the sheet, upscaled, separated from the sheet by flood-filling the
background up to the dark outline, reduced to the largest connected shape (the cat, dropping labels and loose decorations), edge-cleaned, then
placed on one shared canvas at the same scale with the feet on the bottom edge so switching
poses does not make the pet jump.

Usage: .venv/Scripts/python scripts/cut_pet.py
Output: public/pet/<pose>.webp and public/pet/fx-<name>.webp
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SHEET = ROOT / "image-pet" / "pet.png"
OUT = ROOT / "public" / "pet"
SCALE = 2  # sheet poses are ~170px tall; 2x keeps them sharp on high-DPI screens
PAD = 6

Box = tuple[int, int, int, int]
Point = tuple[int, int]


@dataclass(frozen=True)
class Pose:
    box: Box  # (left, top, right, bottom) on the 1536x1024 sheet, label pill excluded
    seal: int = 6  # widest outline gap to bridge, in 2x pixels
    erase: tuple[Box, ...] = ()  # decorations next to the cat (sheet coords), painted out first
    seal_lines: tuple[tuple[Point, ...], ...] = ()  # extra barrier strokes where the art is open


# Coordinates were read off gridded crops of the sheet; the sketchy line art leaves the belly or
# feet open in some poses, so those get a seal line that only acts as a flood-fill barrier.
POSES = {
    "idle": Pose((680, 78, 875, 258)),
    "happy": Pose(
        (882, 92, 1078, 258),
        seal=16,
        erase=((888, 98, 916, 134), (882, 150, 903, 184), (1048, 143, 1078, 182), (1028, 92, 1078, 114)),
    ),
    "curious": Pose((1292, 52, 1495, 258), seal=8),
    "sad": Pose(
        (686, 312, 888, 462),
        seal=10,
        erase=((686, 312, 714, 347), (686, 396, 702, 424), (848, 322, 882, 357)),
        seal_lines=(((711, 418), (721, 446), (800, 448), (832, 446)), ((842, 395), (858, 404))),
    ),
    "angry": Pose(
        (898, 296, 1100, 464),
        seal=10,
        erase=((1008, 298, 1046, 334), (1047, 298, 1100, 346)),
        seal_lines=(((930, 413), (919, 423)), ((916, 447), (940, 450), (1060, 458), (1066, 445))),
    ),
    "sleepy": Pose(
        (1096, 300, 1305, 464),
        seal=10,
        erase=((1243, 302, 1305, 346), (1096, 383, 1114, 414), (1293, 380, 1305, 412)),
        seal_lines=(
            ((1130, 440), (1140, 456), (1250, 452), (1282, 447)),
            ((1270, 378), (1285, 401)),
        ),
    ),
}

# Effects drawn next to poses, kept as separate overlay sprites.
EFFECTS = {
    "zzz": (1245, 305, 1305, 345),
    "question": (1455, 52, 1490, 100),
    "note": (1235, 60, 1275, 92),
    "anger": (1050, 296, 1098, 340),
}


INK_T = 222  # luminance below this is line art / shading (sheet background and body are ~250)
BG_L = 251.0


def disk(radius: int) -> np.ndarray:
    y, x = np.ogrid[-radius : radius + 1, -radius : radius + 1]
    return x * x + y * y <= radius * radius


def trim_below_feet(figure: np.ndarray, lum: np.ndarray) -> np.ndarray:
    """Drop the pale ground shadow under the feet: nothing may sit below the lowest dark stroke
    of the whole drawing (the bottom of the paws). Per-column trimming was tried and carved
    notches where the belly outline is open, so the cut is one horizontal line."""
    dark_rows = np.flatnonzero((figure & (lum < 160)).any(axis=1))
    if dark_rows.size == 0:
        return figure
    keep = np.arange(figure.shape[0]) <= dark_rows[-1] + 2
    return figure & keep[:, None]


def cut(pose: Pose, keep_largest: bool) -> Image.Image:
    """Separate the drawing from the sheet using its closed dark outline.

    The cat's body is the same off-white as the sheet, so color keying or rembg cannot tell them
    apart. Instead: flood-fill the background from the crop border through light pixels, stopping
    at the outline; everything the fill cannot reach is the drawing.
    """
    left, top = pose.box[0], pose.box[1]
    sheet = Image.open(SHEET).convert("RGB")
    crop = sheet.crop(pose.box)
    paint = ImageDraw.Draw(crop)
    for x0, y0, x1, y1 in pose.erase:
        paint.rectangle((x0 - left, y0 - top, x1 - left, y1 - top), fill=(252, 254, 239))
    crop = crop.resize((crop.width * SCALE, crop.height * SCALE), Image.LANCZOS)
    rgb = np.array(crop).astype(np.float32)
    lum = rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32)

    # Seal lines go into the barrier only, never into the output pixels.
    seal_img = Image.new("L", crop.size, 0)
    seal_draw = ImageDraw.Draw(seal_img)
    for line in pose.seal_lines:
        pts = [((x - left) * SCALE, (y - top) * SCALE) for x, y in line]
        seal_draw.line(pts, fill=255, width=4)
    sealed = np.array(seal_img) > 0
    seal = pose.seal

    # Barrier = line art with its gaps bridged. Closing (dilate then erode) only adds pixels
    # inside gaps narrower than 2*seal, so the outer contour of the drawing does not grow.
    pad = seal + 2
    ink = np.pad((lum < INK_T) | sealed, pad)
    barrier = ndimage.binary_closing(ink, structure=disk(seal))[pad:-pad, pad:-pad]
    open_area, _ = ndimage.label(~barrier)
    border_ids = np.unique(np.concatenate([open_area[0], open_area[-1], open_area[:, 0], open_area[:, -1]]))
    background = np.isin(open_area, border_ids[border_ids > 0])

    figure = ~background
    labels, count = ndimage.label(figure)
    if count == 0:
        raise RuntimeError(f"nothing found in {pose.box}")
    sizes = ndimage.sum(figure, labels, range(1, count + 1))
    if keep_largest:
        figure = labels == (int(np.argmax(sizes)) + 1)
    else:
        # Effects: drop specks, keep every real stroke (e.g. the three z's).
        keep = [i + 1 for i, size in enumerate(sizes) if size >= 30]
        figure = np.isin(labels, keep)
    figure = ndimage.binary_fill_holes(figure)
    if keep_largest:
        figure = trim_below_feet(figure, lum)

    # Anti-aliased outer edge: estimate coverage from how far the pixel is from the background
    # tone, and un-mix the background color so no pale halo shows on dark themes.
    alpha = figure.astype(np.float32)
    edge = figure & ndimage.binary_dilation(~figure, iterations=2)
    coverage = np.clip((BG_L - lum) / (BG_L - 120.0), 0.0, 1.0)
    alpha[edge] = coverage[edge]
    bg_rgb = np.array([252.0, 254.0, 239.0], dtype=np.float32)
    safe = np.maximum(alpha, 1e-3)[..., None]
    unmixed = np.clip((rgb - (1.0 - alpha[..., None]) * bg_rgb) / safe, 0, 255)
    rgb = np.where(edge[..., None], unmixed, rgb)

    out = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    img = Image.fromarray(out, "RGBA")
    bbox = img.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    return img.crop(bbox) if bbox else img


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    poses = {name: cut(pose, keep_largest=True) for name, pose in POSES.items()}
    width = max(p.width for p in poses.values()) + PAD * 2
    height = max(p.height for p in poses.values()) + PAD
    for name, pose in poses.items():
        canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        # Feet on the bottom edge, horizontally centered.
        canvas.paste(pose, ((width - pose.width) // 2, height - pose.height), pose)
        canvas.save(OUT / f"{name}.webp", "WEBP", quality=92, method=6)
        print(f"{name}: pose {pose.size} -> canvas {canvas.size}")

    for name, box in EFFECTS.items():
        fx = cut(Pose(box, seal=2), keep_largest=False)
        fx.save(OUT / f"fx-{name}.webp", "WEBP", quality=92, method=6)
        print(f"fx-{name}: {fx.size}")


if __name__ == "__main__":
    main()
