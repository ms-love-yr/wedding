from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "site-data.js"
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".JPG", ".JPEG", ".PNG", ".WEBP"}


def build_items(folder: str) -> list[dict[str, str]]:
    base_dir = ROOT / folder
    items = []
    for path in sorted(base_dir.iterdir()):
        if path.is_file() and path.suffix in IMAGE_SUFFIXES:
            items.append(
                {
                    "src": path.as_posix().replace(f"{ROOT.as_posix()}/", ""),
                    "title": path.stem.replace("-", " "),
                }
            )
    return items


def main() -> None:
    payload = {
        "gallery": build_items("images/gallery"),
        "past": build_items("images/past"),
    }
    script = "window.SITE_DATA = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n"
    OUTPUT.write_text(script, encoding="utf-8")


if __name__ == "__main__":
    main()
