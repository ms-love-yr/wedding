from __future__ import annotations

import json
from pathlib import Path
import unicodedata


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "site-data.js"
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".JPG", ".JPEG", ".PNG", ".WEBP"}
SEASON_ORDER = {"spring": 0, "summer": 1, "autumn": 2, "winter": 3, "봄": 0, "여름": 1, "가을": 2, "겨울": 3}
SEASON_LABEL = {"spring": "봄", "summer": "여름", "autumn": "가을", "winter": "겨울", "봄": "봄", "여름": "여름", "가을": "가을", "겨울": "겨울"}


def natural_key(path: Path) -> tuple[int, str]:
    stem = unicodedata.normalize("NFC", path.stem)
    season = "".join(char for char in stem if not char.isdigit()).strip()
    digits = "".join(char for char in stem if char.isdigit())
    if season in SEASON_ORDER:
        index = int(digits) if digits else 0
        return (SEASON_ORDER[season] * 1000 + index, stem)
    return (999999, stem)


def display_title(path: Path) -> str:
    stem = unicodedata.normalize("NFC", path.stem)
    season = "".join(char for char in stem if not char.isdigit()).strip()
    digits = "".join(char for char in stem if char.isdigit())
    if season in SEASON_LABEL:
        return f"{SEASON_LABEL[season]}{digits}"
    return stem.replace("-", " ")


def build_items(folder: str) -> list[dict[str, str]]:
    base_dir = ROOT / folder
    items = []
    for path in sorted(base_dir.iterdir(), key=natural_key):
        if path.is_file() and path.suffix in IMAGE_SUFFIXES:
            items.append(
                {
                    "src": path.as_posix().replace(f"{ROOT.as_posix()}/", ""),
                    "title": display_title(path),
                }
            )
    return items


def main() -> None:
    payload = {
        "gallery": build_items("images/gallery"),
        "past": build_items("images/history"),
    }
    script = "window.SITE_DATA = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n"
    OUTPUT.write_text(script, encoding="utf-8")


if __name__ == "__main__":
    main()
