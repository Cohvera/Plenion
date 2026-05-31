from __future__ import annotations

import base64
import json
import re
from io import BytesIO
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any
import xml.etree.ElementTree as ET

from pypdf import PdfReader


ROOT = Path(r"C:\Temp\_PLENION TEST - DATABASE\Plenion\backup\203\Tomme_Energie")
DOC_ROOT = ROOT.parents[2]
NS = {
    "cbc": "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
    "cac": "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
}
SOURCE_FILES = {
    "suppliers": ROOT / "LEV.fic",
    "articles": ROOT / "ARTIKEL.FIC",
    "catalog": ROOT / "ARTCAT.FIC",
}
MAX_ITEMS_PER_ALIAS = 20
OUTPUT = Path(
    r"C:\Users\RemkoVanderVeken\OneDrive - Q-home\Documents\New project\src\data\plenion-supplier-catalog.json"
)

DATE_RE = re.compile(r"^\d{8}$")
CODE_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9./_-]{1,29}$")
SUPPLIER_START_RE = re.compile(r"^\d{5}$")

IGNORE_EXACT = {
    "XML",
    "JEROEN TOMME",
    "SUPERVISOR",
    "true",
    "false",
    "True",
    "False",
}
IGNORE_PREFIXES = (
    "http://",
    "https://",
    "ftp://",
    "ftpes://",
    "C:\\",
    "D:\\",
    "E:\\",
    "P:\\",
)


def parse_decimal(value: Any) -> Decimal | None:
    if value is None or value == "":
        return None
    if isinstance(value, Decimal):
        return value
    try:
        return Decimal(str(value).replace(",", "."))
    except (InvalidOperation, ValueError):
        return None


def serialize_decimal(value: Decimal | None, places: str | None = None) -> str | None:
    if value is None:
        return None
    if places is not None:
        value = value.quantize(Decimal(places))
    normalized = value.normalize()
    as_text = format(normalized, "f")
    return as_text.rstrip("0").rstrip(".") if "." in as_text else as_text


def ascii_strings(path: Path) -> list[str]:
    data = path.read_bytes()
    return [s.decode("ascii", "ignore") for s in re.findall(rb"[ -~]{3,}", data)]


def is_noise(value: str) -> bool:
    if not value:
        return True
    if value in IGNORE_EXACT:
        return True
    if any(value.startswith(prefix) for prefix in IGNORE_PREFIXES):
        return True
    if DATE_RE.fullmatch(value):
        return True
    if value.isdigit():
        return True
    return False


def normalize_label(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9]+", " ", value).strip()
    return re.sub(r"\s+", " ", cleaned).upper()


def supplier_aliases(name: str) -> set[str]:
    words = [word for word in re.split(r"[^A-Za-z0-9]+", name) if len(word) >= 3]
    aliases = {normalize_label(name)}
    if words:
        aliases.add(normalize_label(words[0]))
    for word in words:
        if word.lower() in {"belux", "belgium", "europe", "n", "v", "bv", "nv", "srl", "sa", "the", "and"}:
            continue
        aliases.add(normalize_label(word))
    return {alias for alias in aliases if alias}


def display_supplier_name(name: str) -> str:
    stripped = name.strip()
    if stripped.upper() == "DIVERSE LEVERANCIER":
        return "Diverse leverancier"
    if stripped.upper() == "LOXONE":
        return "Loxone"
    if stripped.upper() == "SOLAREDGE":
        return "Solaredge"
    if stripped.upper() == "MITSUBISHI":
        return "Mitsubishi"
    return stripped


@dataclass
class SupplierRecord:
    supplier_code: str
    supplier_name: str
    address: str | None
    postal_code: str | None
    city: str | None
    vat_number: str | None
    contact: str | None
    website: str | None
    raw: list[str]


@dataclass
class CatalogRow:
    supplier_name: str
    source_file_name: str
    source_sheet_name: str
    source_row: int
    item_code: str
    item_name_nl: str | None
    item_name_fr: str | None
    series: str | None
    type: str | None
    branch: str | None
    list_price: Decimal | None
    net_price: Decimal | None
    discount_rate: Decimal | None
    model_range: str | None
    currency: str
    price_source: str
    supplier_hint: str | None
    raw: dict[str, Any]


@dataclass
class PriceEvidenceRow:
    supplier_name: str
    source_file_name: str
    source_type: str
    document_id: str | None
    document_date: str | None
    document_reference: str | None
    item_code: str | None
    item_name: str | None
    quantity: Decimal | None
    unit: str | None
    brut_price: Decimal | None
    net_price: Decimal | None
    vat_rate: Decimal | None
    currency: str
    price_source: str
    source_party: str | None
    raw: dict[str, Any]


def parse_supplier_records(strings: list[str]) -> list[SupplierRecord]:
    starts: list[int] = []
    for idx, value in enumerate(strings):
        if not SUPPLIER_START_RE.fullmatch(value):
            continue
        nxt = strings[idx + 1] if idx + 1 < len(strings) else ""
        if is_noise(nxt) or nxt.isdigit():
            continue
        starts.append(idx)

    records: list[SupplierRecord] = []
    for position, start in enumerate(starts):
        end = starts[position + 1] if position + 1 < len(starts) else len(strings)
        chunk = strings[start:end]
        supplier_code = chunk[0]
        supplier_name = display_supplier_name(chunk[1] if len(chunk) > 1 else supplier_code)
        address = chunk[2] if len(chunk) > 2 and not is_noise(chunk[2]) else None
        postal_code = chunk[3] if len(chunk) > 3 and chunk[3].isdigit() else None
        city = chunk[4] if len(chunk) > 4 and not is_noise(chunk[4]) else None
        vat_number = None
        contact = None
        website = None
        for value in chunk:
            if value.startswith(("http://", "https://", "ftp://", "ftpes://")):
                website = value
            elif re.fullmatch(r"[A-Z]{0,2}\d[\d ./-]*", value) and any(ch.isdigit() for ch in value):
                vat_number = vat_number or value
            elif "@" in value and contact is None:
                contact = value
        records.append(
            SupplierRecord(
                supplier_code=supplier_code,
                supplier_name=supplier_name,
                address=address,
                postal_code=postal_code,
                city=city,
                vat_number=vat_number,
                contact=contact,
                website=website,
                raw=chunk,
            )
        )
    return records


def supplier_alias_map(records: list[SupplierRecord]) -> dict[str, str]:
    alias_map: dict[str, str] = {}
    for record in records:
        for alias in supplier_aliases(record.supplier_name):
            alias_map.setdefault(alias, record.supplier_name)
    alias_map.setdefault(normalize_label("Loxone"), "Loxone")
    alias_map.setdefault(normalize_label("Solaredge"), "Solaredge")
    alias_map.setdefault(normalize_label("Mitsubishi"), "Mitsubishi")
    return alias_map


def looks_like_code(value: str) -> bool:
    if is_noise(value):
        return False
    if value in IGNORE_EXACT:
        return False
    if any(value.startswith(prefix) for prefix in IGNORE_PREFIXES):
        return False
    if "/" in value and not re.search(r"[A-Za-z]", value):
        return False
    if len(value) < 2 or len(value) > 30:
        return False
    if value.count(" ") > 0:
        return False
    if not re.search(r"[A-Za-z]", value):
        return False
    if not CODE_RE.fullmatch(value):
        return False
    return True


def looks_like_description(value: str) -> bool:
    if is_noise(value):
        return False
    if value.startswith(IGNORE_PREFIXES):
        return False
    if len(value) < 10:
        return False
    if " " not in value and len(value) < 24:
        return False
    return any(ch.isalpha() for ch in value)


def candidate_codes_from_window(window: list[str], hit_index: int) -> list[str]:
    candidates: list[tuple[int, str]] = []
    for offset in range(1, 7):
        idx = hit_index - offset
        if idx < 0:
            continue
        value = window[idx]
        if looks_like_code(value):
            score = 100 - offset
            if re.search(r"\d", value):
                score += 8
            if "-" in value or "/" in value or "." in value:
                score += 6
            candidates.append((score, value))
    for offset in range(1, 5):
        idx = hit_index + offset
        if idx >= len(window):
            continue
        value = window[idx]
        if looks_like_code(value):
            score = 50 - offset
            if re.search(r"\d", value):
                score += 8
            if "-" in value or "/" in value or "." in value:
                score += 6
            candidates.append((score, value))
    if not candidates:
        return []
    candidates.sort(key=lambda item: (-item[0], len(item[1]), item[1]))
    ordered: list[str] = []
    for _, value in candidates:
        if value not in ordered:
            ordered.append(value)
    return ordered


def best_description_from_window(window: list[str], hit_index: int) -> str | None:
    for offset in range(0, 10):
        idx = hit_index + offset
        if idx >= len(window):
            break
        value = window[idx]
        if looks_like_description(value):
            return value
    for offset in range(hit_index - 1, -1, -1):
        value = window[offset]
        if looks_like_description(value):
            return value
    return None


def brand_hits(strings: list[str], alias_map: dict[str, str]) -> list[tuple[int, str, str]]:
    hits: list[tuple[int, str, str]] = []
    for idx, value in enumerate(strings):
        normalized = normalize_label(value)
        for alias, display in alias_map.items():
            if alias and alias in normalized:
                hits.append((idx, alias, display))
                break
    return hits


def extract_catalog_rows(
    strings_by_file: dict[str, list[str]],
    alias_map: dict[str, str],
) -> list[CatalogRow]:
    rows_by_key: dict[tuple[str, str], CatalogRow] = {}
    per_alias_counts: dict[str, int] = {}

    for source_file_name, strings in strings_by_file.items():
        for idx, alias, supplier_display in brand_hits(strings, alias_map):
            if per_alias_counts.get(alias, 0) >= MAX_ITEMS_PER_ALIAS:
                continue
            window = strings[max(0, idx - 6) : min(len(strings), idx + 10)]
            if not window:
                continue
            relative_hit = min(idx, 6)
            code_candidates = candidate_codes_from_window(window, relative_hit)
            if not code_candidates:
                continue
            description = best_description_from_window(window, relative_hit)
            selected_code = code_candidates[0]
            per_alias_counts[alias] = per_alias_counts.get(alias, 0) + 1
            row = CatalogRow(
                supplier_name=supplier_display,
                source_file_name=source_file_name,
                source_sheet_name="HFSQL",
                source_row=idx + 1,
                item_code=selected_code,
                item_name_nl=description,
                item_name_fr=None,
                series=alias.title() if alias else None,
                type=alias.title() if alias else None,
                branch=None,
                list_price=None,
                net_price=None,
                discount_rate=None,
                model_range=None,
                currency="EUR",
                price_source="Local HFSQL backup only",
                supplier_hint=alias,
                raw={
                "sourceFileName": source_file_name,
                "window": window,
                "codeVariant": selected_code,
                "alias": alias,
                },
            )
            key = (row.supplier_name.lower(), row.item_code.lower())
            existing = rows_by_key.get(key)
            if existing is None:
                rows_by_key[key] = row
            elif existing.item_name_nl is None and row.item_name_nl is not None:
                rows_by_key[key] = row
    return sorted(rows_by_key.values(), key=lambda row: (row.supplier_name.lower(), row.item_code.lower()))


INVOICE_ITEM_LINE_RE = re.compile(
    r"""
    ^(?P<description>.*\S)\s{2,}
    (?P<quantity>\d+(?:[.,]\d+)?)\s+
    (?P<unit>[A-Za-zÀ-ÿ%./-]+)\s+
    (?P<unit_price>\d+(?:[.,]\d+)?)\s+
    (?P<vat_rate>\d+(?:[.,]\d+)?)\s+
    (?P<net_total>\d+(?:[.,]\d+)?)\s*$
    """,
    re.VERBOSE,
)

SUMMARY_LINE_PREFIXES = (
    "Overdracht",
    "Totaal te betalen",
    "Netto:",
    "BTW:",
    "Algemene verkoopsvoorwaarden",
    "BTW-Regime:",
    "Factuur te betalen",
    "Gestructureerde mededeling",
    "Betaalwijze",
)


def normalize_pdf_space(value: str) -> str:
    return re.sub(r"[ \t]+", " ", value.replace("\u00a0", " ")).strip()


def parse_date_fragment(day: str | None, month: str | None, year: str | None) -> str | None:
    if not (day and month and year):
        return None
    if not (day.isdigit() and month.isdigit() and year.isdigit()):
        return None
    return f"{year.zfill(4)}-{month.zfill(2)}-{day.zfill(2)}"


def element_text(node: ET.Element | None) -> str:
    if node is None or node.text is None:
        return ""
    return node.text.strip()


def parse_invoice_metadata(path: Path) -> dict[str, str | None]:
    try:
        root = ET.parse(path).getroot()
    except ET.ParseError:
        return {
            "document_id": None,
            "document_date": None,
            "customer_name": None,
            "source_party": None,
        }

    document_id = root.findtext("./cbc:ID", default=None, namespaces=NS)
    document_date = root.findtext("./cbc:IssueDate", default=None, namespaces=NS)
    customer_name = root.findtext(".//cac:AccountingCustomerParty//cbc:Name", default=None, namespaces=NS)
    source_party = root.findtext(".//cac:AccountingSupplierParty//cbc:Name", default=None, namespaces=NS)

    return {
        "document_id": document_id,
        "document_date": document_date,
        "customer_name": customer_name,
        "source_party": source_party,
    }


def decode_invoice_pdf(path: Path) -> PdfReader | None:
    try:
        root = ET.parse(path).getroot()
    except ET.ParseError:
        return None
    embedded = root.find(".//cbc:EmbeddedDocumentBinaryObject", NS)
    if embedded is None or not (embedded.text or "").strip():
        return None
    try:
        raw_pdf = base64.b64decode("".join((embedded.text or "").split()))
        return PdfReader(BytesIO(raw_pdf))
    except Exception:
        return None


def infer_brand_hint(text: str, alias_map: dict[str, str]) -> str | None:
    normalized = normalize_label(text)
    for alias, display in alias_map.items():
        if alias and alias in normalized:
            return display
    return None


def parse_invoice_text_to_rows(
    text: str,
    *,
    path: Path,
    metadata: dict[str, str | None],
    alias_map: dict[str, str],
) -> list[PriceEvidenceRow]:
    rows: list[PriceEvidenceRow] = []
    pending_description: list[str] = []
    in_items = False
    line_number = 0

    for raw_line in text.splitlines():
        line = raw_line.replace("\u00a0", " ").strip()
        if not line:
            continue
        if "Omschrijving" in line and "Aantal" in line and "Prijs" in line:
            in_items = True
            pending_description = []
            continue
        if not in_items:
            continue
        if any(line.startswith(prefix) for prefix in SUMMARY_LINE_PREFIXES):
            break
        if line.startswith("Pagina ") or line.startswith("Kopie Factuur"):
            continue

        match = INVOICE_ITEM_LINE_RE.match(line)
        if match:
            description = " ".join([part for part in pending_description + [match.group("description").strip()] if part]).strip()
            pending_description = []
            quantity = parse_decimal(match.group("quantity"))
            unit_price = parse_decimal(match.group("unit_price"))
            vat_rate = parse_decimal(match.group("vat_rate"))
            net_total = parse_decimal(match.group("net_total"))
            brut_price = None
            if unit_price is not None and vat_rate is not None:
                brut_price = unit_price * (Decimal("1") + (vat_rate / Decimal("100")))
            supplier_hint = infer_brand_hint(description, alias_map)
            line_number += 1
            rows.append(
                PriceEvidenceRow(
                    supplier_name=supplier_hint or "Invoice evidence",
                    source_file_name=path.name,
                    source_type="invoice-pdf",
                    document_id=metadata.get("document_id"),
                    document_date=metadata.get("document_date"),
                    document_reference=metadata.get("customer_name"),
                    item_code=None,
                    item_name=description or None,
                    quantity=quantity,
                    unit=match.group("unit").strip() or None,
                    brut_price=brut_price,
                    net_price=unit_price,
                    vat_rate=vat_rate,
                    currency="EUR",
                    price_source="Local invoice PDF extracted from embedded document",
                    source_party=metadata.get("source_party"),
                    raw={
                        "lineNumber": line_number,
                        "page": None,
                        "description": description,
                        "quantity": match.group("quantity"),
                        "unit": match.group("unit"),
                        "unitPrice": match.group("unit_price"),
                        "vatRate": match.group("vat_rate"),
                        "netTotal": match.group("net_total"),
                    },
                )
            )
            continue

        if line.startswith("-") or line.isupper() and len(line) < 50:
            pending_description = []
            continue
        if len(line) <= 160 and not re.search(r"\d", line):
            pending_description.append(line)
        elif pending_description and not re.search(r"\d", line):
            pending_description.append(line)

    return rows


def extract_invoice_price_evidence(
    path: Path,
    alias_map: dict[str, str],
) -> list[PriceEvidenceRow]:
    reader = decode_invoice_pdf(path)
    if reader is None:
        return []
    metadata = parse_invoice_metadata(path)
    rows: list[PriceEvidenceRow] = []
    for page_number, page in enumerate(reader.pages, start=1):
        try:
            text = page.extract_text(extraction_mode="layout") or ""
        except TypeError:
            text = page.extract_text() or ""
        page_rows = parse_invoice_text_to_rows(text, path=path, metadata=metadata, alias_map=alias_map)
        for row in page_rows:
            row.raw["page"] = page_number
        rows.extend(page_rows)
    return rows


def parse_generic_order_date(root: ET.Element) -> str | None:
    day = element_text(root.find(".//OrderDate/Day"))
    month = element_text(root.find(".//OrderDate/Month"))
    year = element_text(root.find(".//OrderDate/Year"))
    if day and month and year:
        return parse_date_fragment(day, month, year)
    leverdatum = element_text(root.find(".//Leverdatum"))
    if leverdatum:
        return leverdatum[:10]
    return None


def supplier_name_from_order_file(path: Path) -> str:
    stem = path.stem
    match = re.match(r"^Best([A-Za-z]+)", stem)
    if match:
        return display_supplier_name(match.group(1))
    return display_supplier_name(stem)


def parse_supplier_order_price_evidence(path: Path) -> list[PriceEvidenceRow]:
    try:
        root = ET.parse(path).getroot()
    except ET.ParseError:
        return []

    supplier_name = supplier_name_from_order_file(path)
    document_id = None
    document_reference = None
    source_party = None
    rows: list[PriceEvidenceRow] = []
    document_date = parse_generic_order_date(root)

    if root.tag.lower().endswith("rexelxml"):
        document_id = element_text(root.find(".//CustomerOrderID")) or None
        document_reference = element_text(root.find(".//CustomerOrderRef")) or None
        source_party = element_text(root.find(".//supplierCode")) or None
        for line in root.findall(".//OrderLine"):
            item_code = element_text(line.find("./ArtCode")) or None
            item_name = element_text(line.find("./ArtDescr")) or None
            brut_price = parse_decimal(element_text(line.find("./Bruto")))
            net_price = parse_decimal(element_text(line.find("./Netto")))
            quantity = parse_decimal(element_text(line.find("./Quantity")))
            unit = element_text(line.find("./Unit")) or None
            rows.append(
                PriceEvidenceRow(
                    supplier_name=supplier_name,
                    source_file_name=path.name,
                    source_type="supplier-order",
                    document_id=document_id,
                    document_date=document_date,
                    document_reference=document_reference,
                    item_code=item_code,
                    item_name=item_name,
                    quantity=quantity,
                    unit=unit,
                    brut_price=brut_price,
                    net_price=net_price,
                    vat_rate=None,
                    currency="EUR",
                    price_source="Local supplier order XML",
                    source_party=source_party,
                    raw={
                        "xmlRoot": root.tag,
                        "lineType": "rexel",
                        "artCode": item_code,
                        "artDescr": item_name,
                        "bruto": serialize_decimal(brut_price, "0.001") if brut_price is not None else None,
                        "netto": serialize_decimal(net_price, "0.0001") if net_price is not None else None,
                        "quantity": serialize_decimal(quantity, "0.001") if quantity is not None else None,
                        "unit": unit,
                    },
                )
            )
        return rows

    if root.tag.lower().endswith("cebeoxml"):
        document_id = element_text(root.find(".//CustomerOrderID")) or None
        document_reference = element_text(root.find(".//CustomerOrderRef")) or None
        source_party = element_text(root.find(".//CustomerNumber")) or None
        for line in root.findall(".//OrderLine"):
            item_code = element_text(line.find("./Material/SupplierItemID")) or None
            quantity = parse_decimal(element_text(line.find("./OrderedQuantity")))
            rows.append(
                PriceEvidenceRow(
                    supplier_name=supplier_name,
                    source_file_name=path.name,
                    source_type="supplier-order",
                    document_id=document_id,
                    document_date=document_date,
                    document_reference=document_reference,
                    item_code=item_code,
                    item_name=None,
                    quantity=quantity,
                    unit=None,
                    brut_price=None,
                    net_price=None,
                    vat_rate=None,
                    currency="EUR",
                    price_source="Local supplier order XML (no price exported)",
                    source_party=source_party,
                    raw={
                        "xmlRoot": root.tag,
                        "lineType": "cebeo",
                        "supplierItemID": item_code,
                        "quantity": serialize_decimal(quantity, "0.001") if quantity is not None else None,
                    },
                )
            )
        return rows

    if root.tag.lower().endswith("externalorder"):
        document_reference = element_text(root.find(".//Reference")) or None
        document_date = parse_generic_order_date(root)
        source_party = element_text(root.find(".//Login")) or None
        for line in root.findall(".//ExternalOrderItem"):
            item_code = element_text(line.find("./ProductKey")) or None
            quantity = parse_decimal(element_text(line.find("./NumberOfItems")))
            unit_price = parse_decimal(element_text(line.find("./ProductPrice")))
            total = parse_decimal(element_text(line.find("./Total")))
            if unit_price == Decimal("0"):
                unit_price = None
            rows.append(
                PriceEvidenceRow(
                    supplier_name=supplier_name,
                    source_file_name=path.name,
                    source_type="supplier-order",
                    document_id=None,
                    document_date=document_date,
                    document_reference=document_reference,
                    item_code=item_code,
                    item_name=None,
                    quantity=quantity,
                    unit=None,
                    brut_price=unit_price,
                    net_price=unit_price,
                    vat_rate=None,
                    currency="EUR",
                    price_source="Local supplier order XML",
                    source_party=source_party,
                    raw={
                        "xmlRoot": root.tag,
                        "lineType": "external",
                        "productKey": item_code,
                        "quantity": serialize_decimal(quantity, "0.001") if quantity is not None else None,
                        "productPrice": serialize_decimal(unit_price, "0.0001") if unit_price is not None else None,
                        "total": serialize_decimal(total, "0.0001") if total is not None else None,
                    },
                )
            )
        return rows

    return rows


def extract_price_evidence(
    invoice_paths: list[Path],
    supplier_order_paths: list[Path],
    alias_map: dict[str, str],
) -> list[PriceEvidenceRow]:
    evidence: list[PriceEvidenceRow] = []
    for path in invoice_paths:
        evidence.extend(extract_invoice_price_evidence(path, alias_map))
    for path in supplier_order_paths:
        evidence.extend(parse_supplier_order_price_evidence(path))
    return evidence


def build_brand_alias_map(records: list[SupplierRecord], article_strings: list[str]) -> dict[str, str]:
    alias_map = supplier_alias_map(records)
    article_text = " ".join(article_strings[:1000]).upper()
    for candidate in [
        "LOXONE",
        "MITSUBISHI",
        "SOLAREDGE",
        "DAIKIN",
        "WURTH",
        "CEBEO",
        "REXEL",
        "FACQ",
        "VAN MARCKE",
        "CAIROX",
        "CARBOMAT",
        "OMNI-TERM",
        "TRILEC",
        "FRIGRO",
        "SAX",
    ]:
        if candidate in article_text:
            alias_map.setdefault(normalize_label(candidate), candidate.title() if candidate != "SAX" else "Sax")
    focused_aliases = {
        normalize_label(token)
        for token in [
            "LOXONE",
            "MITSUBISHI",
            "SOLAREDGE",
            "DAIKIN",
            "WURTH",
            "CEBEO",
            "REXEL",
            "FACQ",
            "VAN MARCKE",
            "CAIROX",
            "CARBOMAT",
            "OMNI-TERM",
            "TRILEC",
            "FRIGRO",
            "SAX",
            "AIRVENT",
        ]
    }
    return {
        alias: display
        for alias, display in alias_map.items()
        if alias in focused_aliases or any(token in alias for token in focused_aliases)
    }


def main() -> None:
    source_strings = {name: ascii_strings(path) for name, path in SOURCE_FILES.items()}
    supplier_records = parse_supplier_records(source_strings["suppliers"])
    alias_map = build_brand_alias_map(supplier_records, source_strings["articles"] + source_strings["catalog"])

    rows = extract_catalog_rows(
        {
            "ARTIKEL.FIC": source_strings["articles"],
            "ARTCAT.FIC": source_strings["catalog"],
        },
        alias_map,
    )

    invoice_paths = sorted((DOC_ROOT / "PLDOCS" / "Dummieboekhouding").glob("*.xml"))
    supplier_order_paths = sorted((DOC_ROOT / "PLDOCS" / "Documenten" / "BUOrderposting").glob("*.xml"))
    price_evidence_rows = extract_price_evidence(invoice_paths, supplier_order_paths, alias_map)

    suppliers: dict[str, dict[str, Any]] = {}
    for record in supplier_records:
        suppliers.setdefault(
            record.supplier_name,
            {
                "supplierName": record.supplier_name,
                "itemCount": 0,
                "minListPrice": None,
                "maxListPrice": None,
                "evidenceCount": 0,
                "pricedEvidenceCount": 0,
                "minEvidencePrice": None,
                "maxEvidencePrice": None,
            },
        )

    for row in rows:
        supplier = suppliers.setdefault(
            row.supplier_name,
            {
                "supplierName": row.supplier_name,
                "itemCount": 0,
                "minListPrice": None,
                "maxListPrice": None,
                "evidenceCount": 0,
                "pricedEvidenceCount": 0,
                "minEvidencePrice": None,
                "maxEvidencePrice": None,
            },
        )
        supplier["itemCount"] += 1
        if row.list_price is not None and row.list_price > 0:
            price = float(row.list_price)
            supplier["minListPrice"] = price if supplier["minListPrice"] is None else min(supplier["minListPrice"], price)
            supplier["maxListPrice"] = price if supplier["maxListPrice"] is None else max(supplier["maxListPrice"], price)

    for evidence in price_evidence_rows:
        supplier = suppliers.setdefault(
            evidence.supplier_name,
            {
                "supplierName": evidence.supplier_name,
                "itemCount": 0,
                "minListPrice": None,
                "maxListPrice": None,
                "evidenceCount": 0,
                "pricedEvidenceCount": 0,
                "minEvidencePrice": None,
                "maxEvidencePrice": None,
            },
        )
        supplier["evidenceCount"] += 1
        if evidence.net_price is not None and evidence.net_price > 0:
            supplier["pricedEvidenceCount"] += 1
            price = float(evidence.net_price)
            supplier["minEvidencePrice"] = price if supplier["minEvidencePrice"] is None else min(supplier["minEvidencePrice"], price)
            supplier["maxEvidencePrice"] = price if supplier["maxEvidencePrice"] is None else max(supplier["maxEvidencePrice"], price)

    supplier_rows = sorted(suppliers.values(), key=lambda item: item["supplierName"].lower())
    workbook_meta = [
        {
            "fileName": SOURCE_FILES["suppliers"].name,
            "supplierName": "Plenion supplier master",
            "sheetName": "HFSQL",
            "modifiedAt": datetime.fromtimestamp(SOURCE_FILES["suppliers"].stat().st_mtime).isoformat(),
            "rowCount": len(supplier_records),
        },
        {
            "fileName": SOURCE_FILES["articles"].name,
            "supplierName": "Plenion article master",
            "sheetName": "HFSQL",
            "modifiedAt": datetime.fromtimestamp(SOURCE_FILES["articles"].stat().st_mtime).isoformat(),
            "rowCount": len(source_strings["articles"]),
        },
        {
            "fileName": SOURCE_FILES["catalog"].name,
            "supplierName": "Plenion article catalog",
            "sheetName": "HFSQL",
            "modifiedAt": datetime.fromtimestamp(SOURCE_FILES["catalog"].stat().st_mtime).isoformat(),
            "rowCount": len(source_strings["catalog"]),
        },
        {
            "fileName": "PLDOCS/Dummieboekhouding",
            "supplierName": "Local invoice PDFs",
            "sheetName": "PDF",
            "modifiedAt": datetime.fromtimestamp((DOC_ROOT / "PLDOCS" / "Dummieboekhouding").stat().st_mtime).isoformat(),
            "rowCount": len(invoice_paths),
        },
        {
            "fileName": "PLDOCS/Documenten/BUOrderposting",
            "supplierName": "Local supplier order XML",
            "sheetName": "XML",
            "modifiedAt": datetime.fromtimestamp((DOC_ROOT / "PLDOCS" / "Documenten" / "BUOrderposting").stat().st_mtime).isoformat(),
            "rowCount": len(supplier_order_paths),
        },
    ]

    payload = {
        "sourceRoot": str(ROOT),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "workbookCount": len(workbook_meta),
        "supplierCount": len(supplier_rows),
        "itemCount": len(rows),
        "notes": "Extracted from the local Plenion HFSQL backup only. No online services were used.",
        "workbooks": workbook_meta,
        "suppliers": [
            {
                "supplierName": supplier["supplierName"],
                "itemCount": supplier["itemCount"],
                "evidenceCount": supplier["evidenceCount"],
                "pricedEvidenceCount": supplier["pricedEvidenceCount"],
                "minListPrice": serialize_decimal(parse_decimal(supplier["minListPrice"]), "0.01")
                if supplier["minListPrice"] is not None
                else None,
                "maxListPrice": serialize_decimal(parse_decimal(supplier["maxListPrice"]), "0.01")
                if supplier["maxListPrice"] is not None
                else None,
                "minEvidencePrice": serialize_decimal(parse_decimal(supplier["minEvidencePrice"]), "0.01")
                if supplier["minEvidencePrice"] is not None
                else None,
                "maxEvidencePrice": serialize_decimal(parse_decimal(supplier["maxEvidencePrice"]), "0.01")
                if supplier["maxEvidencePrice"] is not None
                else None,
            }
            for supplier in supplier_rows
        ],
        "items": [
            {
                "supplierName": row.supplier_name,
                "sourceFileName": row.source_file_name,
                "sourceSheetName": row.source_sheet_name,
                "sourceRow": row.source_row,
                "itemCode": row.item_code,
                "itemNameNl": row.item_name_nl,
                "itemNameFr": row.item_name_fr,
                "series": row.series,
                "type": row.type,
                "branch": row.branch,
                "listPrice": serialize_decimal(row.list_price, "0.01"),
                "netPrice": serialize_decimal(row.net_price, "0.01"),
                "discountRate": serialize_decimal(row.discount_rate, "0.0001"),
                "modelRange": row.model_range,
                "currency": row.currency,
                "priceSource": row.price_source,
                "raw": row.raw,
            }
            for row in rows
        ],
        "priceEvidence": [
            {
                "supplierName": evidence.supplier_name,
                "sourceFileName": evidence.source_file_name,
                "sourceType": evidence.source_type,
                "documentId": evidence.document_id,
                "documentDate": evidence.document_date,
                "documentReference": evidence.document_reference,
                "itemCode": evidence.item_code,
                "itemName": evidence.item_name,
                "quantity": serialize_decimal(evidence.quantity, "0.001"),
                "unit": evidence.unit,
                "brutPrice": serialize_decimal(evidence.brut_price, "0.0001"),
                "netPrice": serialize_decimal(evidence.net_price, "0.0001"),
                "vatRate": serialize_decimal(evidence.vat_rate, "0.0001"),
                "currency": evidence.currency,
                "priceSource": evidence.price_source,
                "sourceParty": evidence.source_party,
                "raw": evidence.raw,
            }
            for evidence in price_evidence_rows
        ],
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {len(rows)} items from {payload['workbookCount']} source files to {OUTPUT}")


if __name__ == "__main__":
    main()
