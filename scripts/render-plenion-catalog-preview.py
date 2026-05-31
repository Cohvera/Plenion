from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


DATA_PATH = Path(
    r"C:\Users\RemkoVanderVeken\OneDrive - Q-home\Documents\New project\src\data\plenion-supplier-catalog.json"
)
OUT_PATH = Path(
    r"C:\Users\RemkoVanderVeken\OneDrive - Q-home\Documents\New project\docs\research\plenion-catalog-preview.png"
)


def load_font(path: str, size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    try:
        return ImageFont.truetype(path, size=size)
    except OSError:
        return ImageFont.load_default()


FONT_BOLD = load_font(r"C:\Windows\Fonts\arialbd.ttf", 24)
FONT_REG = load_font(r"C:\Windows\Fonts\arial.ttf", 22)
FONT_SMALL = load_font(r"C:\Windows\Fonts\arial.ttf", 18)
FONT_TINY = load_font(r"C:\Windows\Fonts\arial.ttf", 14)
FONT_H1 = load_font(r"C:\Windows\Fonts\arialbd.ttf", 58)
FONT_H2 = load_font(r"C:\Windows\Fonts\arialbd.ttf", 28)
FONT_H3 = load_font(r"C:\Windows\Fonts\arialbd.ttf", 24)


def to_float(value):
    try:
        if value is None or value == "":
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def euro(value: float | None) -> str:
    if value is None or value <= 0:
        return "n/a"
    return f"€{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def fmt_num(value: int) -> str:
    return f"{value:,}".replace(",", " ")


def text_size(draw: ImageDraw.ImageDraw, text: str, font):
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def round_rect(draw: ImageDraw.ImageDraw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font, max_width: int):
    words = text.split()
    lines = []
    current = []
    for word in words:
        trial = " ".join(current + [word])
        if text_size(draw, trial, font)[0] <= max_width or not current:
            current.append(word)
        else:
            lines.append(" ".join(current))
            current = [word]
    if current:
        lines.append(" ".join(current))
    return lines or [text]


def draw_multiline(draw: ImageDraw.ImageDraw, xy, text, font, fill, max_width, line_gap=4):
    x, y = xy
    for line in wrap_text(draw, text, font, max_width):
        draw.text((x, y), line, font=font, fill=fill)
        y += text_size(draw, line, font)[1] + line_gap
    return y


def truncate(text: str, limit: int = 36) -> str:
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


def main() -> None:
    raw = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    suppliers = {}
    for item in raw["items"]:
        name = item["supplierName"]
        record = suppliers.setdefault(
            name,
            {"supplierName": name, "itemCount": 0, "minListPrice": float("inf"), "maxListPrice": float("-inf")},
        )
        record["itemCount"] += 1
        price = to_float(item["listPrice"])
        if price and price > 0:
            record["minListPrice"] = min(record["minListPrice"], price)
            record["maxListPrice"] = max(record["maxListPrice"], price)
    supplier_rows = sorted(suppliers.values(), key=lambda item: item["supplierName"])

    width, height = 1800, 1840
    image = Image.new("RGB", (width, height), "#edf3f8")
    draw = ImageDraw.Draw(image)

    round_rect(draw, (60, 50, 1740, 610), 34, "#0f172a")
    draw.ellipse((1150, 90, 1720, 420), fill="#183153")
    draw.ellipse((1330, 160, 1760, 520), fill="#12243e")
    draw.text((100, 100), "PLENION SUPPLIER CATALOG", font=FONT_TINY, fill="#c7f9e7")
    draw.text((100, 185), "Search supplier items, brut prices,", font=FONT_H1, fill="white")
    draw.text((100, 255), "and net prices from the backup.", font=FONT_H1, fill="white")
    draw_multiline(
        draw,
        (100, 330),
        f"Current snapshot includes {fmt_num(raw['itemCount'])} items across {fmt_num(raw['supplierCount'])} supplier name(s) and {fmt_num(raw['workbookCount'])} source files.",
        FONT_REG,
        "#d2dae7",
        980,
    )
    round_rect(draw, (100, 380, 338, 432), 16, "#9ef0cf")
    draw.text((214, 393), "Open catalog", font=FONT_BOLD, fill="#04130c", anchor="ma")
    round_rect(draw, (356, 380, 556, 432), 16, "#152238", outline=(255, 255, 255, 36))
    draw.text((456, 393), "Search items", font=FONT_BOLD, fill="white", anchor="ma")

    round_rect(draw, (1090, 100, 1680, 360), 26, (255, 255, 255))
    draw.text((1114, 140), "PRICE RANGE", font=FONT_TINY, fill="#64748b")
    prices = [price for price in (to_float(i["listPrice"]) for i in raw["items"]) if price and price > 0]
    min_price = min(prices) if prices else None
    max_price = max(prices) if prices else None
    draw.text((1114, 188), f"{euro(min_price)} to {euro(max_price)}", font=FONT_H2, fill="#0f172a")
    draw_multiline(draw, (1114, 242), "Local backup extraction only. Price fields remain unavailable for now.", FONT_REG, "#475569", 520)
    draw.text((1114, 298), "TOP SUPPLIER", font=FONT_TINY, fill="#64748b")
    draw.text((1114, 334), supplier_rows[0]["supplierName"], font=FONT_H2, fill="#0f172a")

    round_rect(draw, (60, 650, 680, 900), 30, (255, 255, 255))
    draw.text((100, 704), "Suppliers", font=FONT_H3, fill="#0f172a")
    draw.text((100, 740), "Current backup coverage", font=FONT_SMALL, fill="#64748b")
    y = 760
    for supplier in supplier_rows[:6]:
        round_rect(draw, (120, y, 640, y + 78), 20, "#f8fafc", outline=(219, 227, 236))
        draw.text((148, y + 22), supplier["supplierName"], font=FONT_BOLD, fill="#0f172a")
        draw.text((608, y + 24), f"{fmt_num(supplier['itemCount'])} items", font=FONT_BOLD, fill="#0f172a", anchor="ra")
        draw.text(
            (148, y + 48),
            f"{euro(to_float(supplier['minListPrice']))} - {euro(to_float(supplier['maxListPrice']))}",
            font=FONT_TINY,
            fill="#64748b",
        )
        y += 98

    round_rect(draw, (720, 650, 1740, 900), 30, (255, 255, 255))
    draw.text((760, 704), "How to search", font=FONT_H3, fill="#0f172a")
    draw_multiline(
        draw,
        (760, 744),
        "Filter by model code, description, series, type, or source file.",
        FONT_SMALL,
        "#64748b",
        900,
    )
    round_rect(draw, (760, 780, 1700, 850), 18, "#f8fafc", outline=(219, 227, 236))
    draw.text((790, 803), "Examples: MM125, PV-ES-SE-MODBUS, Solaredge, Cebeo", font=FONT_REG, fill="#334155")

    round_rect(draw, (60, 930, 1740, 1780), 30, (255, 255, 255))
    draw.text((100, 985), "Top catalog rows", font=FONT_H3, fill="#0f172a")
    draw_multiline(
        draw,
        (100, 1020),
        "A representative slice of the real Plenion supplier and article records.",
        FONT_SMALL,
        "#64748b",
        920,
    )
    headers = [("Model", 150), ("Description", 360), ("Source file", 1160), ("Brut", 1610)]
    for title, x in headers:
        draw.text((x, 1100), title, font=FONT_BOLD, fill="#0f172a", anchor="la" if x != 1610 else "ra")

    row_y = 1140
    for item in raw["items"][:6]:
        round_rect(draw, (120, row_y, 1680, row_y + 84), 20, "#ffffff", outline=(226, 232, 240))
        draw.text((150, row_y + 28), item["itemCode"], font=FONT_BOLD, fill="#0f172a")
        desc = item.get("itemNameNl") or item.get("itemNameFr") or "No description"
        draw_multiline(draw, (360, row_y + 20), desc, FONT_REG, "#334155", 700)
        draw.text((1160, row_y + 28), truncate(item["sourceFileName"], 32), font=FONT_REG, fill="#334155")
        draw.text((1610, row_y + 28), euro(to_float(item["listPrice"])), font=FONT_BOLD, fill="#0f172a", anchor="ra")
        row_y += 102

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    image.save(OUT_PATH)
    print(OUT_PATH)


if __name__ == "__main__":
    main()
