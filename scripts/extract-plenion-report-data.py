from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from datetime import datetime, time, timezone
from pathlib import Path
import xml.etree.ElementTree as ET


SOURCE_ROOT = Path(r"C:\Temp\_PLENION TEST - DATABASE\Plenion")
OUTPUT_PATH = Path(
    r"C:\Users\RemkoVanderVeken\OneDrive - Q-home\Documents\New project\src\data\plenion-report-data.json"
)

NS = {
    "cbc": "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
    "cac": "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
}


def text_or_default(node: ET.Element | None, default: str = "") -> str:
    if node is None or node.text is None:
        return default
    return node.text.strip()


def findtext(root: ET.Element, path: str, namespaces: dict[str, str] | None = None, default: str = "") -> str:
    value = root.findtext(path, default=default, namespaces=namespaces or {})
    return value.strip() if isinstance(value, str) else default


def parse_float(value: str | None) -> float:
    if not value:
        return 0.0
    try:
        return float(value.replace(",", "."))
    except ValueError:
        return 0.0


def parse_invoice(path: Path) -> dict | None:
    try:
        root = ET.parse(path).getroot()
    except ET.ParseError:
        return None

    invoice_id = findtext(root, "./cbc:ID", NS)
    issue_date = findtext(root, "./cbc:IssueDate", NS)
    due_date = findtext(root, "./cbc:DueDate", NS)
    note = findtext(root, "./cbc:Note", NS)
    supplier_name = findtext(root, ".//cac:AccountingSupplierParty//cbc:Name", NS)
    customer_name = findtext(root, ".//cac:AccountingCustomerParty//cbc:Name", NS)
    total_net = parse_float(findtext(root, ".//cac:LegalMonetaryTotal/cbc:TaxExclusiveAmount", NS))
    total_vat = parse_float(findtext(root, ".//cac:TaxTotal/cbc:TaxAmount", NS))
    total_gross = parse_float(findtext(root, ".//cac:LegalMonetaryTotal/cbc:PayableAmount", NS))
    line_count = len(root.findall(".//cac:InvoiceLine", NS))

    return {
        "id": invoice_id,
        "issueDate": issue_date,
        "dueDate": due_date,
        "note": note,
        "supplierName": supplier_name,
        "customerName": customer_name,
        "netAmount": round(total_net, 2),
        "vatAmount": round(total_vat, 2),
        "grossAmount": round(total_gross, 2),
        "lineCount": line_count,
        "fileName": path.name,
    }


def parse_mobile_order(path: Path) -> dict | None:
    text = path.read_bytes().decode("utf-16-le", errors="ignore")

    def grab(pattern: str) -> str:
        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        return match.group(1).strip() if match else ""

    bonnummer = grab(r"<bonnummer>\s*(.*?)\s*</bonnummer>")
    klantcode = grab(r"<klantcode>\s*(.*?)\s*</klantcode>")
    datum = grab(r"<datum>\s*(.*?)\s*</datum>")
    tijd = grab(r"<tijd>\s*(.*?)\s*</tijd>")
    referentie = grab(r"<referentie>\s*(.*?)\s*</referentie>")
    werk_klaar = grab(r"<WERKKLAAR>\s*(.*?)\s*</WERKKLAAR>") == "1"
    bonlijnen = re.findall(r"<bonlijn>(.*?)</bonlijn>", text, re.IGNORECASE | re.DOTALL)
    first_bonlijn = bonlijnen[0] if bonlijnen else ""
    artikel_code = re.search(r"<artikelcode>\s*(.*?)\s*</artikelcode>", first_bonlijn, re.IGNORECASE | re.DOTALL)
    aantal_match = re.search(r"<aantal>\s*(.*?)\s*</aantal>", first_bonlijn, re.IGNORECASE | re.DOTALL)
    prestatie = re.search(r"<prestatie>(.*?)</prestatie>", text, re.IGNORECASE | re.DOTALL)
    prestatie_block = prestatie.group(1) if prestatie else ""
    resource_match = re.search(r"<rescode>\s*(.*?)\s*</rescode>", prestatie_block, re.IGNORECASE | re.DOTALL)
    uur_van_match = re.search(r"<uurvan>\s*(.*?)\s*</uurvan>", prestatie_block, re.IGNORECASE | re.DOTALL)
    uur_tot_match = re.search(r"<uurtot>\s*(.*?)\s*</uurtot>", prestatie_block, re.IGNORECASE | re.DOTALL)
    start_lat_match = re.search(r"<GpsStartLat>\s*(.*?)\s*</GpsStartLat>", prestatie_block, re.IGNORECASE | re.DOTALL)
    stop_lat_match = re.search(r"<GpsStopLat>\s*(.*?)\s*</GpsStopLat>", prestatie_block, re.IGNORECASE | re.DOTALL)
    resource = resource_match.group(1).strip() if resource_match else ""
    uur_van = uur_van_match.group(1).strip() if uur_van_match else ""
    uur_tot = uur_tot_match.group(1).strip() if uur_tot_match else ""
    aantal = parse_float(aantal_match.group(1) if aantal_match else "")

    duration_hours = None
    if len(uur_van) == 4 and len(uur_tot) == 4:
        start = time(int(uur_van[:2]), int(uur_van[2:]))
        end = time(int(uur_tot[:2]), int(uur_tot[2:]))
        start_dt = datetime.combine(datetime(2000, 1, 1), start)
        end_dt = datetime.combine(datetime(2000, 1, 1), end)
        duration_hours = round((end_dt - start_dt).total_seconds() / 3600, 2)

    return {
        "bonNumber": bonnummer,
        "customerCode": klantcode,
        "date": datum,
        "time": tijd,
        "reference": referentie,
        "workReady": werk_klaar,
        "firstArticleCode": artikel_code.group(1).strip() if artikel_code else "",
        "quantity": aantal,
        "resourceCode": resource,
        "startTime": uur_van,
        "endTime": uur_tot,
        "durationHours": duration_hours,
        "lineCount": len(bonlijnen),
        "gpsStartLat": parse_float(start_lat_match.group(1) if start_lat_match else ""),
        "gpsStopLat": parse_float(stop_lat_match.group(1) if stop_lat_match else ""),
        "fileName": path.name,
    }


def parse_supplier_order(path: Path) -> dict | None:
    try:
        root = ET.parse(path).getroot()
    except ET.ParseError:
        return None

    customer_order_id = text_or_default(root.find("./Request/Order/Create/OrderHeader/CustomerOrderID"))
    customer_order_ref = text_or_default(root.find("./Request/Order/Create/OrderHeader/CustomerOrderRef"))
    day = text_or_default(root.find("./Request/Order/Create/OrderHeader/OrderDate/Day"))
    month = text_or_default(root.find("./Request/Order/Create/OrderHeader/OrderDate/Month"))
    year = text_or_default(root.find("./Request/Order/Create/OrderHeader/OrderDate/Year"))
    deliver_to = text_or_default(root.find("./Request/Order/Create/OrderHeader/DeliveryLocation/DeliveryAddress/DeliverTo"))
    city = text_or_default(root.find("./Request/Order/Create/OrderHeader/DeliveryLocation/DeliveryAddress/City"))
    line_count = len(root.findall("./Request/Order/Create/OrderLine"))
    supplier_items = [
        text_or_default(line.find("./Material/SupplierItemID"))
        for line in root.findall("./Request/Order/Create/OrderLine")
    ]

    order_date = ""
    if day and month and year:
        order_date = f"{year}-{month.zfill(2)}-{day.zfill(2)}"

    return {
        "customerOrderId": customer_order_id,
        "customerOrderRef": customer_order_ref,
        "orderDate": order_date,
        "deliverTo": deliver_to,
        "city": city,
        "lineCount": line_count,
        "supplierItemIds": supplier_items,
        "fileName": path.name,
    }


def month_bucket(date_string: str) -> str:
    if not date_string:
        return "unknown"
    return date_string[:7]


def compact_to_month(date_string: str) -> str:
    if len(date_string) >= 6 and date_string.isdigit():
        return f"{date_string[:4]}-{date_string[4:6]}"
    return "unknown"


def safe_float_sum(values: list[float]) -> float:
    return round(sum(values), 2)


def main() -> None:
    invoice_paths = sorted((SOURCE_ROOT / "PLDOCS" / "Dummieboekhouding").glob("*.xml"))
    mobile_paths = sorted((SOURCE_ROOT / "PLDOCS" / "PlenionMobile" / "Temp" / "OK").glob("*.XML"))
    supplier_order_paths = sorted((SOURCE_ROOT / "PLDOCS" / "Documenten" / "BUOrderposting").glob("*.xml"))

    invoices = [item for item in (parse_invoice(path) for path in invoice_paths) if item]
    mobile_orders = [item for item in (parse_mobile_order(path) for path in mobile_paths) if item]
    supplier_orders = [item for item in (parse_supplier_order(path) for path in supplier_order_paths) if item]

    invoice_by_month = defaultdict(float)
    invoice_by_customer = defaultdict(float)
    invoice_notes = Counter()
    for invoice in invoices:
        invoice_by_month[month_bucket(invoice["issueDate"])] += invoice["netAmount"]
        invoice_by_customer[invoice["customerName"] or "Unknown customer"] += invoice["netAmount"]
        if invoice["note"]:
            invoice_notes[invoice["note"]] += 1

    mobile_by_month = Counter()
    mobile_by_resource = Counter()
    for order in mobile_orders:
        mobile_by_month[compact_to_month(order["date"])] += 1
        mobile_by_resource[order["resourceCode"] or "Unknown resource"] += 1

    supplier_months = Counter()
    for order in supplier_orders:
        supplier_months[month_bucket(order["orderDate"])] += 1

    invoices_sorted = sorted(invoices, key=lambda item: item["issueDate"], reverse=True)
    mobile_sorted = sorted(mobile_orders, key=lambda item: item["date"], reverse=True)
    supplier_sorted = sorted(supplier_orders, key=lambda item: item["orderDate"], reverse=True)

    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "sourceRoot": str(SOURCE_ROOT),
        "sources": {
            "invoiceXmlCount": len(invoice_paths),
            "mobileOrderXmlCount": len(mobile_paths),
            "supplierOrderXmlCount": len(supplier_order_paths),
        },
        "invoices": {
            "count": len(invoices),
            "netTotal": safe_float_sum([item["netAmount"] for item in invoices]),
            "vatTotal": safe_float_sum([item["vatAmount"] for item in invoices]),
            "grossTotal": safe_float_sum([item["grossAmount"] for item in invoices]),
            "averageNet": round(safe_float_sum([item["netAmount"] for item in invoices]) / len(invoices), 2) if invoices else 0,
            "customerCount": len({item["customerName"] for item in invoices if item["customerName"]}),
            "months": [
                {"month": month, "netTotal": round(total, 2)}
                for month, total in sorted(invoice_by_month.items())
                if month != "unknown"
            ],
            "topCustomers": [
                {"name": name, "netTotal": round(total, 2)}
                for name, total in sorted(invoice_by_customer.items(), key=lambda item: item[1], reverse=True)[:5]
            ],
            "topNotes": [
                {"note": note, "count": count}
                for note, count in invoice_notes.most_common(5)
            ],
            "all": invoices,
            "recent": invoices_sorted[:5],
        },
        "workOrders": {
            "count": len(mobile_orders),
            "completedCount": sum(1 for item in mobile_orders if item["workReady"]),
            "lineCount": sum(item["lineCount"] for item in mobile_orders),
            "averageDurationHours": round(
                sum(item["durationHours"] for item in mobile_orders if item["durationHours"] is not None)
                / max(1, sum(1 for item in mobile_orders if item["durationHours"] is not None)),
                2,
            ),
            "resourceUsage": [
                {"resource": resource, "count": count}
                for resource, count in mobile_by_resource.most_common(5)
            ],
            "months": [
                {"month": month, "count": count}
                for month, count in sorted(mobile_by_month.items())
                if month != "unknown"
            ],
            "all": mobile_orders,
            "recent": mobile_sorted[:5],
        },
        "supplierOrders": {
            "count": len(supplier_orders),
            "lineCount": sum(item["lineCount"] for item in supplier_orders),
            "months": [
                {"month": month, "count": count}
                for month, count in sorted(supplier_months.items())
                if month != "unknown"
            ],
            "all": supplier_orders,
            "recent": supplier_sorted[:5],
        },
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
