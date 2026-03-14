BEGIN;

-- ============================================================================
-- Migration 003: Replace 90 placeholder source_system_registry rows with
-- realistic GSIB bank system names for Meridian National Bancorp.
-- IDs 1400011-1400100 are placeholder "Position Ledger N" rows with no FK refs.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- TRADING & MARKETS (1400011-1400025)
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE l1.source_system_registry SET
  source_system_name = 'Murex MX.3',
  data_domain = 'TRADING',
  ingestion_frequency = 'REAL_TIME',
  system_owner = 'Global Markets Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2018-03-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400011;

UPDATE l1.source_system_registry SET
  source_system_name = 'Calypso Technology',
  data_domain = 'TRADING',
  ingestion_frequency = 'REAL_TIME',
  system_owner = 'Derivatives Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2017-06-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400012;

UPDATE l1.source_system_registry SET
  source_system_name = 'Bloomberg Terminal',
  data_domain = 'MARKET_DATA',
  ingestion_frequency = 'REAL_TIME',
  system_owner = 'Market Data Services',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2010-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400013;

UPDATE l1.source_system_registry SET
  source_system_name = 'Refinitiv Eikon',
  data_domain = 'MARKET_DATA',
  ingestion_frequency = 'REAL_TIME',
  system_owner = 'Market Data Services',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2019-04-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400014;

UPDATE l1.source_system_registry SET
  source_system_name = 'ION Trading Fidessa',
  data_domain = 'TRADING',
  ingestion_frequency = 'REAL_TIME',
  system_owner = 'Equities Technology',
  is_active_flag = false,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2015-02-01',
  effective_end_date = '2024-03-31',
  is_current_flag = false
WHERE source_system_id = 1400015;

UPDATE l1.source_system_registry SET
  source_system_name = 'OpenLink Endur',
  data_domain = 'TRADING',
  ingestion_frequency = 'DAILY',
  system_owner = 'Commodities Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2016-09-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400016;

UPDATE l1.source_system_registry SET
  source_system_name = 'Charles River IMS',
  data_domain = 'TRADING',
  ingestion_frequency = 'REAL_TIME',
  system_owner = 'Investment Management Tech',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2020-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400017;

UPDATE l1.source_system_registry SET
  source_system_name = 'Broadridge Impact',
  data_domain = 'TRADING',
  ingestion_frequency = 'DAILY',
  system_owner = 'Post-Trade Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2019-07-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400018;

UPDATE l1.source_system_registry SET
  source_system_name = 'DTCC Gateway',
  data_domain = 'TRADING',
  ingestion_frequency = 'DAILY',
  system_owner = 'Trade Processing',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2014-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400019;

UPDATE l1.source_system_registry SET
  source_system_name = 'ICE Data Services',
  data_domain = 'MARKET_DATA',
  ingestion_frequency = 'REAL_TIME',
  system_owner = 'Market Data Services',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2018-11-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400020;

UPDATE l1.source_system_registry SET
  source_system_name = 'MarkitWire',
  data_domain = 'TRADING',
  ingestion_frequency = 'DAILY',
  system_owner = 'OTC Derivatives Ops',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2016-05-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400021;

UPDATE l1.source_system_registry SET
  source_system_name = 'Tradeweb',
  data_domain = 'TRADING',
  ingestion_frequency = 'REAL_TIME',
  system_owner = 'Fixed Income Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2017-03-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400022;

UPDATE l1.source_system_registry SET
  source_system_name = 'FlexTrade EMS',
  data_domain = 'TRADING',
  ingestion_frequency = 'REAL_TIME',
  system_owner = 'Equities Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2021-06-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400023;

UPDATE l1.source_system_registry SET
  source_system_name = 'Fidessa',
  data_domain = 'TRADING',
  ingestion_frequency = 'REAL_TIME',
  system_owner = 'Equities Technology',
  is_active_flag = false,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2012-01-01',
  effective_end_date = '2023-12-31',
  is_current_flag = false
WHERE source_system_id = 1400024;

UPDATE l1.source_system_registry SET
  source_system_name = 'CME Direct',
  data_domain = 'TRADING',
  ingestion_frequency = 'REAL_TIME',
  system_owner = 'Futures & Options Tech',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2019-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400025;

-- ─────────────────────────────────────────────────────────────────────────────
-- RISK MANAGEMENT (1400026-1400035)
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE l1.source_system_registry SET
  source_system_name = 'SAS Risk Management',
  data_domain = 'RISK',
  ingestion_frequency = 'DAILY',
  system_owner = 'Enterprise Risk Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2016-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400026;

UPDATE l1.source_system_registry SET
  source_system_name = 'MSCI RiskMetrics',
  data_domain = 'RISK',
  ingestion_frequency = 'DAILY',
  system_owner = 'Market Risk Analytics',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2015-06-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400027;

UPDATE l1.source_system_registry SET
  source_system_name = 'Wolters Kluwer OneSumX',
  data_domain = 'RISK',
  ingestion_frequency = 'DAILY',
  system_owner = 'Regulatory Risk Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2020-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400028;

UPDATE l1.source_system_registry SET
  source_system_name = 'Numerix CrossAsset',
  data_domain = 'RISK',
  ingestion_frequency = 'DAILY',
  system_owner = 'Quantitative Analytics',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2019-09-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400029;

UPDATE l1.source_system_registry SET
  source_system_name = 'Beacon Platform',
  data_domain = 'RISK',
  ingestion_frequency = 'DAILY',
  system_owner = 'Quantitative Analytics',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2022-03-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400030;

UPDATE l1.source_system_registry SET
  source_system_name = 'Kamakura Risk Manager',
  data_domain = 'CREDIT_RISK',
  ingestion_frequency = 'DAILY',
  system_owner = 'Credit Risk Analytics',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2018-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400031;

UPDATE l1.source_system_registry SET
  source_system_name = 'Algorithmics (IBM)',
  data_domain = 'RISK',
  ingestion_frequency = 'DAILY',
  system_owner = 'Enterprise Risk Technology',
  is_active_flag = false,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2011-01-01',
  effective_end_date = '2024-06-30',
  is_current_flag = false
WHERE source_system_id = 1400032;

UPDATE l1.source_system_registry SET
  source_system_name = 'FIS Adaptiv',
  data_domain = 'CREDIT_RISK',
  ingestion_frequency = 'DAILY',
  system_owner = 'Counterparty Risk Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2017-04-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400033;

UPDATE l1.source_system_registry SET
  source_system_name = 'Axioma Risk',
  data_domain = 'RISK',
  ingestion_frequency = 'DAILY',
  system_owner = 'Portfolio Risk Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2020-06-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400034;

UPDATE l1.source_system_registry SET
  source_system_name = 'GCorr (Moody''s Analytics)',
  data_domain = 'CREDIT_RISK',
  ingestion_frequency = 'MONTHLY',
  system_owner = 'Credit Portfolio Analytics',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2019-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400035;

-- ─────────────────────────────────────────────────────────────────────────────
-- CREDIT & LENDING (1400036-1400045)
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE l1.source_system_registry SET
  source_system_name = 'nCino Bank Operating System',
  data_domain = 'LENDING',
  ingestion_frequency = 'DAILY',
  system_owner = 'Commercial Lending Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2021-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400036;

UPDATE l1.source_system_registry SET
  source_system_name = 'Finastra Fusion Loan IQ',
  data_domain = 'LENDING',
  ingestion_frequency = 'DAILY',
  system_owner = 'Syndicated Lending Ops',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2018-07-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400037;

UPDATE l1.source_system_registry SET
  source_system_name = 'Temenos Infinity Lending',
  data_domain = 'LENDING',
  ingestion_frequency = 'DAILY',
  system_owner = 'Retail Lending Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2020-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400038;

UPDATE l1.source_system_registry SET
  source_system_name = 'FIS Code Connect',
  data_domain = 'LENDING',
  ingestion_frequency = 'DAILY',
  system_owner = 'Lending Platform Engineering',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2019-03-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400039;

UPDATE l1.source_system_registry SET
  source_system_name = 'Black Knight MSP',
  data_domain = 'LENDING',
  ingestion_frequency = 'DAILY',
  system_owner = 'Mortgage Servicing Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2016-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400040;

UPDATE l1.source_system_registry SET
  source_system_name = 'Ellie Mae Encompass',
  data_domain = 'LENDING',
  ingestion_frequency = 'DAILY',
  system_owner = 'Mortgage Origination Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2017-06-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400041;

UPDATE l1.source_system_registry SET
  source_system_name = 'Abrigo Sageworks',
  data_domain = 'CREDIT_RISK',
  ingestion_frequency = 'WEEKLY',
  system_owner = 'Credit Analysis Technology',
  is_active_flag = false,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2014-01-01',
  effective_end_date = '2023-09-30',
  is_current_flag = false
WHERE source_system_id = 1400042;

UPDATE l1.source_system_registry SET
  source_system_name = 'CreditLens Spreads',
  data_domain = 'CREDIT_RISK',
  ingestion_frequency = 'WEEKLY',
  system_owner = 'Credit Risk Analytics',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2020-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400043;

UPDATE l1.source_system_registry SET
  source_system_name = 'Codat Financial Connect',
  data_domain = 'LENDING',
  ingestion_frequency = 'DAILY',
  system_owner = 'Digital Lending Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2023-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400044;

UPDATE l1.source_system_registry SET
  source_system_name = 'Experian PowerCurve',
  data_domain = 'CREDIT_RISK',
  ingestion_frequency = 'DAILY',
  system_owner = 'Credit Decisioning Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2019-11-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400045;

-- ─────────────────────────────────────────────────────────────────────────────
-- COMPLIANCE & REGULATORY (1400046-1400055)
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE l1.source_system_registry SET
  source_system_name = 'AxiomSL (Adenza)',
  data_domain = 'REGULATORY',
  ingestion_frequency = 'QUARTERLY',
  system_owner = 'Regulatory Reporting Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2017-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400046;

UPDATE l1.source_system_registry SET
  source_system_name = 'Broadridge Regulatory Reporting',
  data_domain = 'REGULATORY',
  ingestion_frequency = 'QUARTERLY',
  system_owner = 'Regulatory Reporting Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2020-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400047;

UPDATE l1.source_system_registry SET
  source_system_name = 'NICE Actimize',
  data_domain = 'COMPLIANCE',
  ingestion_frequency = 'REAL_TIME',
  system_owner = 'Financial Crimes Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2018-04-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400048;

UPDATE l1.source_system_registry SET
  source_system_name = 'Dow Jones Risk & Compliance',
  data_domain = 'COMPLIANCE',
  ingestion_frequency = 'DAILY',
  system_owner = 'KYC/AML Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2016-07-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400049;

UPDATE l1.source_system_registry SET
  source_system_name = 'LexisNexis Risk Solutions',
  data_domain = 'COMPLIANCE',
  ingestion_frequency = 'DAILY',
  system_owner = 'KYC/AML Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2017-03-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400050;

UPDATE l1.source_system_registry SET
  source_system_name = 'Accuity Firco',
  data_domain = 'COMPLIANCE',
  ingestion_frequency = 'REAL_TIME',
  system_owner = 'Sanctions Screening Technology',
  is_active_flag = false,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2013-01-01',
  effective_end_date = '2024-01-31',
  is_current_flag = false
WHERE source_system_id = 1400051;

UPDATE l1.source_system_registry SET
  source_system_name = 'Compliance.ai',
  data_domain = 'COMPLIANCE',
  ingestion_frequency = 'DAILY',
  system_owner = 'Regulatory Change Management',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2022-06-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400052;

UPDATE l1.source_system_registry SET
  source_system_name = 'MetricStream GRC',
  data_domain = 'COMPLIANCE',
  ingestion_frequency = 'WEEKLY',
  system_owner = 'Governance Risk & Compliance',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2020-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400053;

UPDATE l1.source_system_registry SET
  source_system_name = 'Regnology',
  data_domain = 'REGULATORY',
  ingestion_frequency = 'QUARTERLY',
  system_owner = 'Regulatory Reporting Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2021-09-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400054;

UPDATE l1.source_system_registry SET
  source_system_name = 'Suade Labs RegTech',
  data_domain = 'REGULATORY',
  ingestion_frequency = 'DAILY',
  system_owner = 'Regulatory Innovation',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2023-06-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400055;

-- ─────────────────────────────────────────────────────────────────────────────
-- TREASURY & CAPITAL MARKETS (1400056-1400065)
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE l1.source_system_registry SET
  source_system_name = 'FIS Quantum',
  data_domain = 'TREASURY',
  ingestion_frequency = 'DAILY',
  system_owner = 'Treasury Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2018-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400056;

UPDATE l1.source_system_registry SET
  source_system_name = 'Kyriba Treasury Cloud',
  data_domain = 'TREASURY',
  ingestion_frequency = 'DAILY',
  system_owner = 'Corporate Treasury Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2021-03-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400057;

UPDATE l1.source_system_registry SET
  source_system_name = 'Wall Street Systems (ION)',
  data_domain = 'TREASURY',
  ingestion_frequency = 'REAL_TIME',
  system_owner = 'Treasury Trading Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2015-09-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400058;

UPDATE l1.source_system_registry SET
  source_system_name = 'Reval (ION Treasury)',
  data_domain = 'TREASURY',
  ingestion_frequency = 'DAILY',
  system_owner = 'Treasury Risk Technology',
  is_active_flag = false,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2013-06-01',
  effective_end_date = '2023-12-31',
  is_current_flag = false
WHERE source_system_id = 1400059;

UPDATE l1.source_system_registry SET
  source_system_name = 'SAP Treasury & Risk Mgmt',
  data_domain = 'TREASURY',
  ingestion_frequency = 'DAILY',
  system_owner = 'Enterprise Applications',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2016-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400060;

UPDATE l1.source_system_registry SET
  source_system_name = 'Finastra Kondor+',
  data_domain = 'TREASURY',
  ingestion_frequency = 'REAL_TIME',
  system_owner = 'Capital Markets Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2017-04-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400061;

UPDATE l1.source_system_registry SET
  source_system_name = 'GTreasury',
  data_domain = 'TREASURY',
  ingestion_frequency = 'DAILY',
  system_owner = 'Cash Management Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2022-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400062;

UPDATE l1.source_system_registry SET
  source_system_name = 'TreasuryXpress',
  data_domain = 'TREASURY',
  ingestion_frequency = 'DAILY',
  system_owner = 'Corporate Treasury Technology',
  is_active_flag = false,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2014-01-01',
  effective_end_date = '2024-09-30',
  is_current_flag = false
WHERE source_system_id = 1400063;

UPDATE l1.source_system_registry SET
  source_system_name = 'HedgeStar Hedge Accounting',
  data_domain = 'TREASURY',
  ingestion_frequency = 'MONTHLY',
  system_owner = 'Treasury Accounting',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2020-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400064;

UPDATE l1.source_system_registry SET
  source_system_name = 'Chatham Financial Advisory',
  data_domain = 'TREASURY',
  ingestion_frequency = 'MONTHLY',
  system_owner = 'Treasury Risk Advisory',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2019-06-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400065;

-- ─────────────────────────────────────────────────────────────────────────────
-- FINANCE & ACCOUNTING (1400066-1400075)
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE l1.source_system_registry SET
  source_system_name = 'SAP S/4HANA Finance',
  data_domain = 'FINANCE',
  ingestion_frequency = 'DAILY',
  system_owner = 'Enterprise Finance Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2020-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400066;

UPDATE l1.source_system_registry SET
  source_system_name = 'Oracle Financials Cloud',
  data_domain = 'FINANCE',
  ingestion_frequency = 'DAILY',
  system_owner = 'Enterprise Finance Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2019-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400067;

UPDATE l1.source_system_registry SET
  source_system_name = 'Workday Financial Management',
  data_domain = 'FINANCE',
  ingestion_frequency = 'DAILY',
  system_owner = 'HR & Finance Platforms',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2022-07-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400068;

UPDATE l1.source_system_registry SET
  source_system_name = 'BlackLine Financial Close',
  data_domain = 'FINANCE',
  ingestion_frequency = 'DAILY',
  system_owner = 'Financial Close Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2020-06-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400069;

UPDATE l1.source_system_registry SET
  source_system_name = 'Trintech Cadency',
  data_domain = 'FINANCE',
  ingestion_frequency = 'DAILY',
  system_owner = 'Financial Close Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2021-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400070;

UPDATE l1.source_system_registry SET
  source_system_name = 'OneStream XF Platform',
  data_domain = 'FINANCE',
  ingestion_frequency = 'MONTHLY',
  system_owner = 'FP&A Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2022-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400071;

UPDATE l1.source_system_registry SET
  source_system_name = 'Anaplan',
  data_domain = 'FINANCE',
  ingestion_frequency = 'MONTHLY',
  system_owner = 'FP&A Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2021-03-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400072;

UPDATE l1.source_system_registry SET
  source_system_name = 'Oracle Hyperion',
  data_domain = 'FINANCE',
  ingestion_frequency = 'MONTHLY',
  system_owner = 'FP&A Technology',
  is_active_flag = false,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2009-01-01',
  effective_end_date = '2024-03-31',
  is_current_flag = false
WHERE source_system_id = 1400073;

UPDATE l1.source_system_registry SET
  source_system_name = 'Planful (Host Analytics)',
  data_domain = 'FINANCE',
  ingestion_frequency = 'MONTHLY',
  system_owner = 'FP&A Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2023-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400074;

UPDATE l1.source_system_registry SET
  source_system_name = 'FloQast Close Management',
  data_domain = 'FINANCE',
  ingestion_frequency = 'DAILY',
  system_owner = 'Accounting Operations',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2023-06-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400075;

-- ─────────────────────────────────────────────────────────────────────────────
-- DATA & ANALYTICS (1400076-1400085)
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE l1.source_system_registry SET
  source_system_name = 'Bloomberg Data License',
  data_domain = 'MARKET_DATA',
  ingestion_frequency = 'DAILY',
  system_owner = 'Enterprise Data Management',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2012-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400076;

UPDATE l1.source_system_registry SET
  source_system_name = 'Refinitiv DataScope Select',
  data_domain = 'MARKET_DATA',
  ingestion_frequency = 'DAILY',
  system_owner = 'Enterprise Data Management',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2019-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400077;

UPDATE l1.source_system_registry SET
  source_system_name = 'IHS Markit EDM',
  data_domain = 'REFERENCE_DATA',
  ingestion_frequency = 'DAILY',
  system_owner = 'Enterprise Data Management',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2016-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400078;

UPDATE l1.source_system_registry SET
  source_system_name = 'Dun & Bradstreet Direct+',
  data_domain = 'REFERENCE_DATA',
  ingestion_frequency = 'WEEKLY',
  system_owner = 'Counterparty Data Management',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2015-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400079;

UPDATE l1.source_system_registry SET
  source_system_name = 'Bureau van Dijk Orbis',
  data_domain = 'REFERENCE_DATA',
  ingestion_frequency = 'WEEKLY',
  system_owner = 'Counterparty Data Management',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2017-06-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400080;

UPDATE l1.source_system_registry SET
  source_system_name = 'PitchBook Data',
  data_domain = 'REFERENCE_DATA',
  ingestion_frequency = 'WEEKLY',
  system_owner = 'Investment Research Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2021-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400081;

UPDATE l1.source_system_registry SET
  source_system_name = 'Preqin',
  data_domain = 'REFERENCE_DATA',
  ingestion_frequency = 'MONTHLY',
  system_owner = 'Alternative Investments Research',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2022-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400082;

UPDATE l1.source_system_registry SET
  source_system_name = 'Snowflake Data Cloud',
  data_domain = 'DATA_PLATFORM',
  ingestion_frequency = 'REAL_TIME',
  system_owner = 'Cloud Data Platform Engineering',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2023-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400083;

UPDATE l1.source_system_registry SET
  source_system_name = 'Databricks Lakehouse',
  data_domain = 'DATA_PLATFORM',
  ingestion_frequency = 'REAL_TIME',
  system_owner = 'Data Engineering',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2023-06-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400084;

UPDATE l1.source_system_registry SET
  source_system_name = 'Informatica MDM',
  data_domain = 'REFERENCE_DATA',
  ingestion_frequency = 'DAILY',
  system_owner = 'Master Data Management',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2018-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400085;

-- ─────────────────────────────────────────────────────────────────────────────
-- PAYMENTS & OPERATIONS (1400086-1400095)
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE l1.source_system_registry SET
  source_system_name = 'SWIFT Alliance Gateway',
  data_domain = 'PAYMENTS',
  ingestion_frequency = 'REAL_TIME',
  system_owner = 'Global Payments Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2010-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400086;

UPDATE l1.source_system_registry SET
  source_system_name = 'ACI Worldwide UP Platform',
  data_domain = 'PAYMENTS',
  ingestion_frequency = 'REAL_TIME',
  system_owner = 'Real-Time Payments Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2019-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400087;

UPDATE l1.source_system_registry SET
  source_system_name = 'Fiserv Payments Hub',
  data_domain = 'PAYMENTS',
  ingestion_frequency = 'REAL_TIME',
  system_owner = 'Core Payments Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2017-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400088;

UPDATE l1.source_system_registry SET
  source_system_name = 'Bottomline Technologies',
  data_domain = 'PAYMENTS',
  ingestion_frequency = 'DAILY',
  system_owner = 'Commercial Payments Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2018-06-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400089;

UPDATE l1.source_system_registry SET
  source_system_name = 'Volante FinServ Hub',
  data_domain = 'PAYMENTS',
  ingestion_frequency = 'REAL_TIME',
  system_owner = 'Payments Integration',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2022-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400090;

UPDATE l1.source_system_registry SET
  source_system_name = 'FIS NYCE Network',
  data_domain = 'PAYMENTS',
  ingestion_frequency = 'REAL_TIME',
  system_owner = 'Debit Network Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2015-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400091;

UPDATE l1.source_system_registry SET
  source_system_name = 'Temenos Payments Hub',
  data_domain = 'PAYMENTS',
  ingestion_frequency = 'REAL_TIME',
  system_owner = 'Core Banking Payments',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2020-06-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400092;

UPDATE l1.source_system_registry SET
  source_system_name = 'Ripple ODL',
  data_domain = 'PAYMENTS',
  ingestion_frequency = 'REAL_TIME',
  system_owner = 'Digital Payments Innovation',
  is_active_flag = false,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2021-01-01',
  effective_end_date = '2023-06-30',
  is_current_flag = false
WHERE source_system_id = 1400093;

UPDATE l1.source_system_registry SET
  source_system_name = 'NACHA ACH Gateway',
  data_domain = 'PAYMENTS',
  ingestion_frequency = 'DAILY',
  system_owner = 'ACH Operations Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2011-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400094;

UPDATE l1.source_system_registry SET
  source_system_name = 'CLS Bank Settlement',
  data_domain = 'PAYMENTS',
  ingestion_frequency = 'DAILY',
  system_owner = 'FX Settlement Operations',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2013-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400095;

-- ─────────────────────────────────────────────────────────────────────────────
-- COLLATERAL & MARGIN (1400096-1400100)
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE l1.source_system_registry SET
  source_system_name = 'BNY Mellon TriParty',
  data_domain = 'COLLATERAL',
  ingestion_frequency = 'DAILY',
  system_owner = 'Collateral Management',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2014-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400096;

UPDATE l1.source_system_registry SET
  source_system_name = 'Euroclear Collateral Mgmt',
  data_domain = 'COLLATERAL',
  ingestion_frequency = 'DAILY',
  system_owner = 'Collateral Management',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2016-06-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400097;

UPDATE l1.source_system_registry SET
  source_system_name = 'Clearstream Collateral',
  data_domain = 'COLLATERAL',
  ingestion_frequency = 'DAILY',
  system_owner = 'Collateral Management',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2017-01-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400098;

UPDATE l1.source_system_registry SET
  source_system_name = 'CloudMargin',
  data_domain = 'COLLATERAL',
  ingestion_frequency = 'DAILY',
  system_owner = 'Margin Operations Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2021-09-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400099;

UPDATE l1.source_system_registry SET
  source_system_name = 'Cassini SIMM Engine',
  data_domain = 'COLLATERAL',
  ingestion_frequency = 'DAILY',
  system_owner = 'Initial Margin Technology',
  is_active_flag = true,
  created_ts = CURRENT_TIMESTAMP,
  updated_ts = CURRENT_TIMESTAMP,
  created_by = 'SYSTEM',
  record_source = 'CMDB',
  load_batch_id = 'GSIB-INIT-001',
  effective_start_date = '2022-06-01',
  effective_end_date = '9999-12-31',
  is_current_flag = true
WHERE source_system_id = 1400100;

COMMIT;
