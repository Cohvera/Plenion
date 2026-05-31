# Plenion Backup Analysis

Date: 2026-05-30

Source backup root:

- `C:\Temp\_PLENION TEST - DATABASE\Plenion\`

## What Is In The Backup

The backup is a structured HFSQL/WinDev-style database backup, not a flat export.
That is good news for reporting because the source data is relational and
already organized around business entities.

Strong signals from the backup:

- `backup/203/backup.info` identifies the source as `Tomme_Energie`
- `PLSERVER/dataconf/Tomme/data.ini` and `PlenionWebservice/PLENIONWEBSERVICE_WEB/data.ini` point to the same database
- The database folder contains many `.fic`, `.ndx`, `.mmo`, and `.ftx` files, which is typical for HFSQL
- `PLDOCS/Reports` contains existing report templates such as `R_Bon_*`, `R_FACTUUR_998`, `R_FACTUUR_999`, `R_Meting_19`, `R_Meting_20`, `R_prijsaanvraag`, and `R_vrrd`
- `PLDOCS/Reports/wijzigingen.txt` shows live report modifications, which means report logic is already customizable and worth reusing

## Recommended Extraction Route

### Best route

1. Restore the HFSQL backup into a running HFSQL server.
2. Connect to that server through ODBC, JDBC, or an HFSQL-native connector.
3. Land the tables into PostgreSQL as a raw replica.
4. Build reporting views and marts on top of PostgreSQL.

Why this is the best route:

- It preserves table relationships and primary keys.
- It gives us SQL access for joins, aggregates, and history tracking.
- It avoids trying to parse binary database files by hand.

### Fallback route

If direct database access is blocked, then the next-best option is to export the key
business tables from Plenion itself or from HFSQL tools into CSV/SQL files, then
import them into PostgreSQL.

### Not recommended

- Parsing `.fic` files directly as if they were CSV
- Building reports only from PDFs in `PLDOCS`
- Treating report templates as the source of truth instead of the data tables

## What Can Be Built In SQL

The backup is rich enough to build a proper reporting warehouse.

Best-fit subject areas:

- Sales and invoicing
- Work orders and service execution
- Projects and profitability
- Product and article analysis
- Stock and logistics
- Maintenance and measurement compliance
- Planning and resource load

## Source Tables By Domain

### Finance and invoicing

- `FAK`, `FAKL`, `FAKB`, `FAKC`, `FAKD`, `HFAK`, `HFAKB`, `HFAKL`

### Work orders and operational execution

- `BON`, `BONL`, `BON_LOG`, `BONTMP`, `HBON`, `HLBON`, `HLBONL`

### Projects and margins

- `PROJ`, `PROJ_RUBR`, `PROJ_RUBR_ART`, `PROJ_BUDGET`, `PROJ_PREST`
- `PROJ_LOG`, `PROJ_DOSSIER`, `PROJ_PRODGRP`, `PROJ_OPMOFF`

### Customers, suppliers, and master data

- `KLANT`, `LEV`, `LEVADR`, `CONTACT`, `ADRES`
- `ARTIKEL`, `ARTCAT`, `ARTPRIJSLIJST`, `ARTTECH`, `ARTMATR`, `ARTVAR`

### Planning and resources

- `PLANNING`, `KALENDER`, `RESOURCE*`, `TAAK*`, `TOER*`

### Stock and logistics

- `VRRD`, `VRRDL`, `MAGAZIJNLOCATIE`, `LOT`, `ZENDING`

### Maintenance, measurement, and compliance

- `METING*`, `WERK*`, `KPI`, `STAT*`, `CONTFAK`, `CONT_KWAL`

### Documents and correspondence

- `DOCUMENT`, `DOCINFO`, `DOCUMENT_LINK`, `DMS`, `DMSL`, `BRIEF`, `FOTO`

## Starter SQL Warehouse Design

The safest model is a two-layer warehouse:

### Raw layer

Store source tables as-is, with load metadata:

- `source_system`
- `source_table`
- `source_row_id`
- `loaded_at`
- `load_batch_id`

### Reporting layer

Build conformed dimensions:

- `dim_date`
- `dim_company`
- `dim_customer`
- `dim_supplier`
- `dim_article`
- `dim_project`
- `dim_user`
- `dim_technique`

Build facts:

- `fact_invoice_line`
- `fact_work_order`
- `fact_project_line`
- `fact_stock_movement`
- `fact_maintenance_event`
- `fact_task`

This structure lets us support both management dashboards and operational drill-downs.

## First Report Pack

### 1. Management Dashboard

Answers:

- What was invoiced this month and year-to-date?
- Which customers and projects drive the most revenue?
- What is the open work order backlog?
- Which projects are over budget or low margin?

Measures:

- Net revenue
- Gross revenue
- Invoice count
- Open order count
- Project margin
- Average delivery time

### 2. Finance Dashboard

Answers:

- What is invoiced versus credited?
- Which invoices are overdue?
- Which products and projects generate the best margin?
- Are there recurring write-offs or discounts?

Measures:

- Invoice total
- VAT total
- Credit note total
- Overdue balance
- Margin by project
- Margin by article

### 3. Operations Dashboard

Answers:

- How many jobs are open, in progress, or waiting?
- What is the aging of open work orders?
- Who is overloaded and who has capacity?
- Which work order types take the longest?

Measures:

- Open work orders
- Average cycle time
- SLA breach count
- Technician workload
- Completion rate

### 4. Stock And Procurement Dashboard

Answers:

- Which articles move fastest?
- Where do we carry too much stock?
- Which suppliers are slow or inconsistent?
- What stock is in the wrong location?

Measures:

- Stock value
- Stock turnover
- Fast movers
- Slow movers
- Supplier lead time

### 5. Maintenance And Compliance Dashboard

Answers:

- Which maintenance actions are due soon?
- Which certificates or measurements are overdue?
- What is the pass/fail trend?
- Which customers or assets need follow-up?

Measures:

- Due items
- Overdue items
- Pass rate
- Repeat findings
- Time to close

## Suggested SQL Views

Once the raw layer exists, these are the first views to build:

- `mart_invoice_monthly`
- `mart_project_margin`
- `mart_workorder_aging`
- `mart_article_sales`
- `mart_stock_valuation`
- `mart_maintenance_due`
- `mart_resource_load`

## Practical Next Step

The next useful move is to export or connect the HFSQL data into PostgreSQL and
then confirm exact column names for the main tables:

- `FAK` / `FAKL`
- `BON` / `BONL`
- `PROJ` / `PROJ_RUBR`
- `KLANT`
- `LEV`
- `ARTIKEL`
- `VRRD`

After that, we can turn this into real SQL views and dashboard queries instead of a planning document.
