-- Plenion reporting warehouse starter schema
-- Purpose: land HFSQL exports into PostgreSQL and build a semantic reporting layer.
-- This script is intentionally conservative: it uses generic keys and measures
-- because the exact HFSQL column names still need to be confirmed.

CREATE SCHEMA IF NOT EXISTS plenion_raw;
CREATE SCHEMA IF NOT EXISTS plenion_dw;
CREATE SCHEMA IF NOT EXISTS plenion_mart;

CREATE TABLE IF NOT EXISTS plenion_raw.load_batch (
  load_batch_id      bigserial PRIMARY KEY,
  source_system      text NOT NULL,
  source_backup_ref  text,
  started_at         timestamptz NOT NULL DEFAULT now(),
  finished_at        timestamptz,
  status             text NOT NULL DEFAULT 'running',
  notes              text
);

CREATE TABLE IF NOT EXISTS plenion_raw.source_table_registry (
  source_table_id    bigserial PRIMARY KEY,
  source_system      text NOT NULL,
  source_table_name  text NOT NULL,
  target_table_name  text NOT NULL,
  load_mode          text NOT NULL DEFAULT 'full',
  notes              text,
  UNIQUE (source_system, source_table_name)
);

CREATE TABLE IF NOT EXISTS plenion_raw.source_row_log (
  source_row_log_id  bigserial PRIMARY KEY,
  load_batch_id      bigint NOT NULL REFERENCES plenion_raw.load_batch(load_batch_id),
  source_table_name  text NOT NULL,
  source_row_id      text NOT NULL,
  checksum_value     text,
  loaded_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plenion_dw.dim_date (
  date_key           integer PRIMARY KEY,
  calendar_date      date NOT NULL UNIQUE,
  year              integer NOT NULL,
  quarter           integer NOT NULL,
  month             integer NOT NULL,
  month_name        text NOT NULL,
  week_of_year      integer NOT NULL,
  day_of_month      integer NOT NULL,
  day_name          text NOT NULL,
  is_weekend        boolean NOT NULL
);

CREATE TABLE IF NOT EXISTS plenion_dw.dim_company (
  company_key        bigserial PRIMARY KEY,
  source_system      text NOT NULL,
  source_key         text NOT NULL UNIQUE,
  company_code       text,
  company_name       text NOT NULL,
  legal_name         text,
  created_at         timestamptz,
  updated_at         timestamptz
);

CREATE TABLE IF NOT EXISTS plenion_dw.dim_customer (
  customer_key       bigserial PRIMARY KEY,
  source_system      text NOT NULL,
  source_key         text NOT NULL UNIQUE,
  customer_code      text,
  customer_name      text NOT NULL,
  vat_number         text,
  contact_name       text,
  contact_email      text,
  phone              text,
  city               text,
  postal_code        text,
  country            text,
  created_at         timestamptz,
  updated_at         timestamptz
);

CREATE TABLE IF NOT EXISTS plenion_dw.dim_supplier (
  supplier_key       bigserial PRIMARY KEY,
  source_system      text NOT NULL,
  source_key         text NOT NULL UNIQUE,
  supplier_code      text,
  supplier_name      text NOT NULL,
  vat_number         text,
  city               text,
  country            text,
  created_at         timestamptz,
  updated_at         timestamptz
);

CREATE TABLE IF NOT EXISTS plenion_dw.dim_article (
  article_key        bigserial PRIMARY KEY,
  source_system      text NOT NULL,
  source_key         text NOT NULL UNIQUE,
  article_code       text,
  article_name       text NOT NULL,
  article_group      text,
  unit               text,
  brand              text,
  active             boolean,
  created_at         timestamptz,
  updated_at         timestamptz
);

CREATE TABLE IF NOT EXISTS plenion_dw.dim_project (
  project_key        bigserial PRIMARY KEY,
  source_system      text NOT NULL,
  source_key         text NOT NULL UNIQUE,
  project_code       text,
  project_name       text NOT NULL,
  project_type       text,
  customer_key       bigint REFERENCES plenion_dw.dim_customer(customer_key),
  status             text,
  start_date         date,
  end_date           date,
  created_at         timestamptz,
  updated_at         timestamptz
);

CREATE TABLE IF NOT EXISTS plenion_dw.dim_user (
  user_key           bigserial PRIMARY KEY,
  source_system      text NOT NULL,
  source_key         text NOT NULL UNIQUE,
  user_name          text NOT NULL,
  email              text,
  role_name          text,
  company_key        bigint REFERENCES plenion_dw.dim_company(company_key),
  created_at         timestamptz,
  updated_at         timestamptz
);

CREATE TABLE IF NOT EXISTS plenion_dw.dim_technique (
  technique_key      bigserial PRIMARY KEY,
  source_system      text NOT NULL,
  source_key         text NOT NULL UNIQUE,
  technique_code     text NOT NULL,
  technique_label    text NOT NULL,
  description        text
);

CREATE TABLE IF NOT EXISTS plenion_dw.fact_invoice_line (
  invoice_line_key   bigserial PRIMARY KEY,
  source_system      text NOT NULL,
  source_table       text NOT NULL,
  source_key         text NOT NULL UNIQUE,
  invoice_number     text NOT NULL,
  invoice_date       date,
  customer_key       bigint REFERENCES plenion_dw.dim_customer(customer_key),
  company_key        bigint REFERENCES plenion_dw.dim_company(company_key),
  project_key        bigint REFERENCES plenion_dw.dim_project(project_key),
  article_key        bigint REFERENCES plenion_dw.dim_article(article_key),
  quantity           numeric(18,4),
  unit_price_net     numeric(18,4),
  net_amount         numeric(18,2),
  vat_amount         numeric(18,2),
  gross_amount       numeric(18,2),
  margin_amount      numeric(18,2),
  status             text,
  created_at         timestamptz,
  updated_at         timestamptz,
  load_batch_id      bigint REFERENCES plenion_raw.load_batch(load_batch_id)
);

CREATE TABLE IF NOT EXISTS plenion_dw.fact_work_order (
  work_order_key     bigserial PRIMARY KEY,
  source_system      text NOT NULL,
  source_table       text NOT NULL,
  source_key         text NOT NULL UNIQUE,
  work_order_number  text NOT NULL,
  opened_at          timestamp,
  planned_at         timestamp,
  closed_at          timestamp,
  customer_key       bigint REFERENCES plenion_dw.dim_customer(customer_key),
  company_key        bigint REFERENCES plenion_dw.dim_company(company_key),
  project_key        bigint REFERENCES plenion_dw.dim_project(project_key),
  assignee_key       bigint REFERENCES plenion_dw.dim_user(user_key),
  technique_key      bigint REFERENCES plenion_dw.dim_technique(technique_key),
  status             text,
  hours_planned      numeric(18,2),
  hours_actual       numeric(18,2),
  material_cost      numeric(18,2),
  labor_cost         numeric(18,2),
  total_cost         numeric(18,2),
  total_revenue      numeric(18,2),
  load_batch_id      bigint REFERENCES plenion_raw.load_batch(load_batch_id)
);

CREATE TABLE IF NOT EXISTS plenion_dw.fact_project_line (
  project_line_key   bigserial PRIMARY KEY,
  source_system      text NOT NULL,
  source_table       text NOT NULL,
  source_key         text NOT NULL UNIQUE,
  project_key        bigint REFERENCES plenion_dw.dim_project(project_key),
  article_key        bigint REFERENCES plenion_dw.dim_article(article_key),
  technique_key      bigint REFERENCES plenion_dw.dim_technique(technique_key),
  line_type          text,
  description        text,
  quantity           numeric(18,4),
  unit_price_net     numeric(18,4),
  net_amount         numeric(18,2),
  cost_amount        numeric(18,2),
  margin_amount      numeric(18,2),
  load_batch_id      bigint REFERENCES plenion_raw.load_batch(load_batch_id)
);

CREATE TABLE IF NOT EXISTS plenion_dw.fact_stock_movement (
  stock_movement_key bigserial PRIMARY KEY,
  source_system      text NOT NULL,
  source_table       text NOT NULL,
  source_key         text NOT NULL UNIQUE,
  movement_date      timestamp,
  article_key        bigint REFERENCES plenion_dw.dim_article(article_key),
  project_key        bigint REFERENCES plenion_dw.dim_project(project_key),
  warehouse_name     text,
  location_name      text,
  movement_type      text,
  quantity           numeric(18,4),
  unit_cost          numeric(18,4),
  stock_value        numeric(18,2),
  load_batch_id      bigint REFERENCES plenion_raw.load_batch(load_batch_id)
);

CREATE TABLE IF NOT EXISTS plenion_dw.fact_maintenance_event (
  maintenance_event_key bigserial PRIMARY KEY,
  source_system      text NOT NULL,
  source_table       text NOT NULL,
  source_key         text NOT NULL UNIQUE,
  event_date         date,
  customer_key       bigint REFERENCES plenion_dw.dim_customer(customer_key),
  project_key        bigint REFERENCES plenion_dw.dim_project(project_key),
  article_key        bigint REFERENCES plenion_dw.dim_article(article_key),
  technique_key      bigint REFERENCES plenion_dw.dim_technique(technique_key),
  event_type         text,
  result_status      text,
  due_date           date,
  closed_date        date,
  load_batch_id      bigint REFERENCES plenion_raw.load_batch(load_batch_id)
);

CREATE TABLE IF NOT EXISTS plenion_dw.fact_task (
  task_key           bigserial PRIMARY KEY,
  source_system      text NOT NULL,
  source_table       text NOT NULL,
  source_key         text NOT NULL UNIQUE,
  task_number        text NOT NULL,
  task_title         text NOT NULL,
  created_at         timestamp,
  due_at             timestamp,
  completed_at       timestamp,
  request_status     text,
  task_status        text,
  requester_key      bigint REFERENCES plenion_dw.dim_user(user_key),
  assignee_key       bigint REFERENCES plenion_dw.dim_user(user_key),
  company_key        bigint REFERENCES plenion_dw.dim_company(company_key),
  customer_key       bigint REFERENCES plenion_dw.dim_customer(customer_key),
  project_key        bigint REFERENCES plenion_dw.dim_project(project_key),
  technique_key      bigint REFERENCES plenion_dw.dim_technique(technique_key),
  load_batch_id      bigint REFERENCES plenion_raw.load_batch(load_batch_id)
);

CREATE OR REPLACE VIEW plenion_mart.mart_invoice_monthly AS
SELECT
  date_trunc('month', invoice_date)::date AS invoice_month,
  COUNT(*) AS invoice_lines,
  SUM(net_amount) AS net_revenue,
  SUM(vat_amount) AS vat_amount,
  SUM(gross_amount) AS gross_revenue,
  SUM(margin_amount) AS margin_amount
FROM plenion_dw.fact_invoice_line
WHERE invoice_date IS NOT NULL
GROUP BY 1
ORDER BY 1;

CREATE OR REPLACE VIEW plenion_mart.mart_workorder_aging AS
SELECT
  status,
  COUNT(*) AS work_orders,
  AVG(
    CASE
      WHEN closed_at IS NULL AND opened_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (now() - opened_at)) / 86400.0
    END
  ) AS avg_open_days,
  AVG(hours_actual) AS avg_hours_actual,
  SUM(total_revenue) AS total_revenue,
  SUM(total_cost) AS total_cost
FROM plenion_dw.fact_work_order
GROUP BY 1;

CREATE OR REPLACE VIEW plenion_mart.mart_project_margin AS
SELECT
  p.project_code,
  p.project_name,
  COUNT(pl.project_line_key) AS project_lines,
  SUM(pl.net_amount) AS revenue,
  SUM(pl.cost_amount) AS cost_amount,
  SUM(pl.margin_amount) AS margin_amount
FROM plenion_dw.dim_project p
LEFT JOIN plenion_dw.fact_project_line pl
  ON pl.project_key = p.project_key
GROUP BY p.project_code, p.project_name;

CREATE OR REPLACE VIEW plenion_mart.mart_stock_valuation AS
SELECT
  warehouse_name,
  location_name,
  COUNT(*) AS movements,
  SUM(quantity) AS quantity,
  SUM(stock_value) AS stock_value
FROM plenion_dw.fact_stock_movement
GROUP BY warehouse_name, location_name;

CREATE OR REPLACE VIEW plenion_mart.mart_article_sales AS
SELECT
  a.article_code,
  a.article_name,
  COUNT(*) AS invoice_lines,
  SUM(f.quantity) AS quantity_sold,
  SUM(f.net_amount) AS net_revenue,
  SUM(f.margin_amount) AS margin_amount
FROM plenion_dw.fact_invoice_line f
LEFT JOIN plenion_dw.dim_article a
  ON a.article_key = f.article_key
GROUP BY a.article_code, a.article_name;

CREATE OR REPLACE VIEW plenion_mart.mart_maintenance_due AS
SELECT
  event_type,
  result_status,
  COUNT(*) AS events_due,
  COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND closed_date IS NULL) AS overdue_events
FROM plenion_dw.fact_maintenance_event
GROUP BY event_type, result_status;

CREATE OR REPLACE VIEW plenion_mart.mart_resource_load AS
WITH task_load AS (
  SELECT
    assignee_key,
    COUNT(*) FILTER (WHERE task_status IN ('OPEN', 'IN_PROGRESS', 'WAITING_FOR_INFO')) AS open_tasks,
    AVG(
      CASE
        WHEN due_at IS NOT NULL AND completed_at IS NULL
          THEN EXTRACT(EPOCH FROM (due_at - now())) / 86400.0
      END
    ) AS avg_task_days_to_due
  FROM plenion_dw.fact_task
  GROUP BY assignee_key
),
workorder_load AS (
  SELECT
    assignee_key,
    COUNT(*) FILTER (WHERE status IN ('OPEN', 'IN_PROGRESS', 'WAITING_FOR_INFO')) AS open_work_orders
  FROM plenion_dw.fact_work_order
  GROUP BY assignee_key
)
SELECT
  u.user_name,
  COALESCE(t.open_tasks, 0) AS open_tasks,
  COALESCE(w.open_work_orders, 0) AS open_work_orders,
  t.avg_task_days_to_due
FROM plenion_dw.dim_user u
LEFT JOIN task_load t
  ON t.assignee_key = u.user_key
LEFT JOIN workorder_load w
  ON w.assignee_key = u.user_key;
