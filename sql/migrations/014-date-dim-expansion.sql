-- Migration 014: Expand l1.date_dim with daily dates from 2022-01-01 to 2026-12-31
-- Uses generate_series to produce ~1,827 rows in a single INSERT statement.
-- Skips dates that already exist (10 existing rows: 300001-300010).
-- date_id starts at 300101 to avoid collision with existing 300001-300010.

BEGIN;

WITH
-- Pre-compute US Federal Reserve bank holidays for 2022-2026
holidays AS (
  SELECT holiday_date::date
  FROM (
    SELECT unnest(ARRAY[
      -- ===== 2022 =====
      -- New Year's Day: Jan 1 (Saturday) → observed Mon Jan 3 (Fed rule: Sat→prev Fri for some, but Fed observes on Mon)
      -- Actually, the standard Fed rule: if Sat → observed Fri; if Sun → observed Mon
      '2021-12-31'::date,  -- New Year 2022: Jan 1 is Sat → observed Fri Dec 31, 2021 (outside range, skip)
      '2022-01-17'::date,  -- MLK Day: 3rd Monday of Jan 2022
      '2022-02-21'::date,  -- Presidents' Day: 3rd Monday of Feb 2022
      '2022-05-30'::date,  -- Memorial Day: Last Monday of May 2022
      '2022-06-20'::date,  -- Juneteenth: Jun 19 is Sun → observed Mon Jun 20
      '2022-07-04'::date,  -- Independence Day: Jul 4 is Mon
      '2022-09-05'::date,  -- Labor Day: 1st Monday of Sep 2022
      '2022-10-10'::date,  -- Columbus Day: 2nd Monday of Oct 2022
      '2022-11-11'::date,  -- Veterans Day: Nov 11 is Fri
      '2022-11-24'::date,  -- Thanksgiving: 4th Thursday of Nov 2022
      '2022-12-26'::date,  -- Christmas: Dec 25 is Sun → observed Mon Dec 26

      -- ===== 2023 =====
      '2023-01-02'::date,  -- New Year: Jan 1 is Sun → observed Mon Jan 2
      '2023-01-16'::date,  -- MLK Day: 3rd Monday of Jan 2023
      '2023-02-20'::date,  -- Presidents' Day: 3rd Monday of Feb 2023
      '2023-05-29'::date,  -- Memorial Day: Last Monday of May 2023
      '2023-06-19'::date,  -- Juneteenth: Jun 19 is Mon
      '2023-07-04'::date,  -- Independence Day: Jul 4 is Tue
      '2023-09-04'::date,  -- Labor Day: 1st Monday of Sep 2023
      '2023-10-09'::date,  -- Columbus Day: 2nd Monday of Oct 2023
      '2023-11-10'::date,  -- Veterans Day: Nov 11 is Sat → observed Fri Nov 10
      '2023-11-23'::date,  -- Thanksgiving: 4th Thursday of Nov 2023
      '2023-12-25'::date,  -- Christmas: Dec 25 is Mon

      -- ===== 2024 =====
      '2024-01-01'::date,  -- New Year: Jan 1 is Mon
      '2024-01-15'::date,  -- MLK Day: 3rd Monday of Jan 2024
      '2024-02-19'::date,  -- Presidents' Day: 3rd Monday of Feb 2024
      '2024-05-27'::date,  -- Memorial Day: Last Monday of May 2024
      '2024-06-19'::date,  -- Juneteenth: Jun 19 is Wed
      '2024-07-04'::date,  -- Independence Day: Jul 4 is Thu
      '2024-09-02'::date,  -- Labor Day: 1st Monday of Sep 2024
      '2024-10-14'::date,  -- Columbus Day: 2nd Monday of Oct 2024
      '2024-11-11'::date,  -- Veterans Day: Nov 11 is Mon
      '2024-11-28'::date,  -- Thanksgiving: 4th Thursday of Nov 2024
      '2024-12-25'::date,  -- Christmas: Dec 25 is Wed

      -- ===== 2025 =====
      '2025-01-01'::date,  -- New Year: Jan 1 is Wed
      '2025-01-20'::date,  -- MLK Day: 3rd Monday of Jan 2025
      '2025-02-17'::date,  -- Presidents' Day: 3rd Monday of Feb 2025
      '2025-05-26'::date,  -- Memorial Day: Last Monday of May 2025
      '2025-06-19'::date,  -- Juneteenth: Jun 19 is Thu
      '2025-07-04'::date,  -- Independence Day: Jul 4 is Fri
      '2025-09-01'::date,  -- Labor Day: 1st Monday of Sep 2025
      '2025-10-13'::date,  -- Columbus Day: 2nd Monday of Oct 2025
      '2025-11-11'::date,  -- Veterans Day: Nov 11 is Tue
      '2025-11-27'::date,  -- Thanksgiving: 4th Thursday of Nov 2025
      '2025-12-25'::date,  -- Christmas: Dec 25 is Thu

      -- ===== 2026 =====
      '2026-01-01'::date,  -- New Year: Jan 1 is Thu
      '2026-01-19'::date,  -- MLK Day: 3rd Monday of Jan 2026
      '2026-02-16'::date,  -- Presidents' Day: 3rd Monday of Feb 2026
      '2026-05-25'::date,  -- Memorial Day: Last Monday of May 2026
      '2026-06-19'::date,  -- Juneteenth: Jun 19 is Fri
      '2026-07-03'::date,  -- Independence Day: Jul 4 is Sat → observed Fri Jul 3
      '2026-09-07'::date,  -- Labor Day: 1st Monday of Sep 2026
      '2026-10-12'::date,  -- Columbus Day: 2nd Monday of Oct 2026
      '2026-11-11'::date,  -- Veterans Day: Nov 11 is Wed
      '2026-11-26'::date,  -- Thanksgiving: 4th Thursday of Nov 2026
      '2026-12-25'::date   -- Christmas: Dec 25 is Fri
    ]) AS holiday_date
  ) sub
  WHERE holiday_date BETWEEN '2022-01-01' AND '2026-12-31'
),
-- Generate all dates in range, excluding those that already exist
new_dates AS (
  SELECT
    d.calendar_date::date AS calendar_date
  FROM generate_series('2022-01-01'::date, '2026-12-31'::date, '1 day'::interval) AS d(calendar_date)
  WHERE NOT EXISTS (
    SELECT 1 FROM l1.date_dim dd WHERE dd.calendar_date = d.calendar_date::date
  )
)
INSERT INTO l1.date_dim (
  date_id,
  calendar_date,
  calendar_year,
  calendar_quarter,
  calendar_month,
  day_of_month,
  day_of_week,
  day_name,
  fiscal_year,
  fiscal_quarter,
  fiscal_month,
  is_weekend_flag,
  is_month_end_flag,
  is_quarter_end_flag,
  is_year_end_flag,
  is_us_business_day_flag,
  is_us_bank_holiday_flag,
  date_day,
  date_month,
  date_quarter,
  date_year,
  created_by,
  record_source,
  load_batch_id
)
SELECT
  -- date_id: sequential from 300101
  ROW_NUMBER() OVER (ORDER BY nd.calendar_date) + 300100 AS date_id,

  nd.calendar_date,

  -- Calendar fields
  EXTRACT(YEAR FROM nd.calendar_date)::integer AS calendar_year,
  'Q' || EXTRACT(QUARTER FROM nd.calendar_date)::integer AS calendar_quarter,
  EXTRACT(MONTH FROM nd.calendar_date)::integer AS calendar_month,
  EXTRACT(DAY FROM nd.calendar_date)::integer AS day_of_month,

  -- day_of_week: ISO standard 1=Monday..7=Sunday
  EXTRACT(ISODOW FROM nd.calendar_date)::integer AS day_of_week,

  -- day_name: trimmed
  TRIM(TO_CHAR(nd.calendar_date, 'Day')) AS day_name,

  -- Fiscal year (October start, named for ending calendar year)
  -- Oct-Dec of year Y → FY Y+1; Jan-Sep of year Y → FY Y
  CASE
    WHEN EXTRACT(MONTH FROM nd.calendar_date) >= 10
    THEN EXTRACT(YEAR FROM nd.calendar_date)::integer + 1
    ELSE EXTRACT(YEAR FROM nd.calendar_date)::integer
  END AS fiscal_year,

  -- Fiscal quarter: Oct-Dec=FQ1, Jan-Mar=FQ2, Apr-Jun=FQ3, Jul-Sep=FQ4
  CASE
    WHEN EXTRACT(MONTH FROM nd.calendar_date) IN (10, 11, 12) THEN 'FQ1'
    WHEN EXTRACT(MONTH FROM nd.calendar_date) IN (1, 2, 3)    THEN 'FQ2'
    WHEN EXTRACT(MONTH FROM nd.calendar_date) IN (4, 5, 6)    THEN 'FQ3'
    WHEN EXTRACT(MONTH FROM nd.calendar_date) IN (7, 8, 9)    THEN 'FQ4'
  END AS fiscal_quarter,

  -- Fiscal month: Oct=1, Nov=2, Dec=3, Jan=4, Feb=5, ..., Sep=12
  CASE
    WHEN EXTRACT(MONTH FROM nd.calendar_date) >= 10
    THEN (EXTRACT(MONTH FROM nd.calendar_date)::integer - 10 + 1)
    ELSE (EXTRACT(MONTH FROM nd.calendar_date)::integer + 3)
  END AS fiscal_month,

  -- Weekend flag
  EXTRACT(ISODOW FROM nd.calendar_date) IN (6, 7) AS is_weekend_flag,

  -- Month end flag
  nd.calendar_date = (date_trunc('month', nd.calendar_date) + INTERVAL '1 month' - INTERVAL '1 day')::date AS is_month_end_flag,

  -- Quarter end flag: last day of Mar, Jun, Sep, Dec
  nd.calendar_date = (date_trunc('month', nd.calendar_date) + INTERVAL '1 month' - INTERVAL '1 day')::date
    AND EXTRACT(MONTH FROM nd.calendar_date) IN (3, 6, 9, 12) AS is_quarter_end_flag,

  -- Year end flag
  EXTRACT(MONTH FROM nd.calendar_date) = 12 AND EXTRACT(DAY FROM nd.calendar_date) = 31 AS is_year_end_flag,

  -- US business day flag (set after holiday check)
  NOT (EXTRACT(ISODOW FROM nd.calendar_date) IN (6, 7))
    AND NOT EXISTS (SELECT 1 FROM holidays h WHERE h.holiday_date = nd.calendar_date)
    AS is_us_business_day_flag,

  -- US bank holiday flag
  EXISTS (SELECT 1 FROM holidays h WHERE h.holiday_date = nd.calendar_date) AS is_us_bank_holiday_flag,

  -- Mirror columns (date_day, date_month, date_quarter, date_year)
  EXTRACT(DAY FROM nd.calendar_date)::integer AS date_day,
  EXTRACT(MONTH FROM nd.calendar_date)::integer AS date_month,
  'Q' || EXTRACT(QUARTER FROM nd.calendar_date)::integer AS date_quarter,
  EXTRACT(YEAR FROM nd.calendar_date)::integer AS date_year,

  -- Audit fields
  'SYSTEM' AS created_by,
  'migration-014' AS record_source,
  'GSIB-INIT-001' AS load_batch_id

FROM new_dates nd
ORDER BY nd.calendar_date;

COMMIT;
