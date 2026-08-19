-- Enterprise Banking MIS Master Data Warehouse Schema
-- SQL Server Compatible

-- =========================================================
-- 1. DIMENSION TABLES
-- =========================================================

-- Branch Master
IF OBJECT_ID('dim_branch_hierarchy', 'U') IS NOT NULL DROP TABLE dim_branch_hierarchy;
CREATE TABLE dim_branch_hierarchy (
    branch_code VARCHAR(20) PRIMARY KEY,
    branch_name VARCHAR(150),
    region_name VARCHAR(100),
    zone_name VARCHAR(100),
    district_name VARCHAR(100)
);

-- Customer Master
IF OBJECT_ID('dim_customer_cif', 'U') IS NOT NULL DROP TABLE dim_customer_cif;
CREATE TABLE dim_customer_cif (
    cif_number VARCHAR(50) PRIMARY KEY,
    customer_name VARCHAR(200),
    pan_hash VARCHAR(100),
    sector_classification VARCHAR(50)
);

-- Loan Product & Scheme Master
IF OBJECT_ID('dim_loan_scheme', 'U') IS NOT NULL DROP TABLE dim_loan_scheme;
CREATE TABLE dim_loan_scheme (
    scheme_code VARCHAR(50) PRIMARY KEY,
    scheme_name VARCHAR(150),
    gl_class_code VARCHAR(50),
    loan_type_group VARCHAR(50)
);

-- =========================================================
-- 2. FACT TABLES
-- =========================================================

-- Loan Portfolio Daily Fact
IF OBJECT_ID('fact_loan_master_daily', 'U') IS NOT NULL DROP TABLE fact_loan_master_daily;
CREATE TABLE fact_loan_master_daily (
    account_no VARCHAR(50),
    snapshot_date DATE,
    cif_number VARCHAR(50),
    branch_code VARCHAR(20),
    scheme_code VARCHAR(50),
    sanction_limit DECIMAL(18,2),
    drawing_power DECIMAL(18,2),
    outstanding_balance DECIMAL(18,2),
    theoretical_balance DECIMAL(18,2),
    irregularity_amount DECIMAL(18,2),
    active_interest_rate DECIMAL(10,2),
    rbi_asset_classification VARCHAR(50),
    PRIMARY KEY (account_no, snapshot_date)
);

-- NPA and RBI Provisioning Fact
IF OBJECT_ID('fact_npa_rbi_master', 'U') IS NOT NULL DROP TABLE fact_npa_rbi_master;
CREATE TABLE fact_npa_rbi_master (
    npa_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    account_no VARCHAR(50),
    branch_code VARCHAR(20),
    npa_date DATE,
    gross_npa_amount DECIMAL(18,2),
    overdue_interest_oi DECIMAL(18,2),
    unrealized_int_uipy DECIMAL(18,2),
    income_not_coll_inca DECIMAL(18,2),
    irac_status VARCHAR(50),
    snapshot_date DATE
);

-- Deposit Ledger Daily Fact
IF OBJECT_ID('fact_deposit_master_daily', 'U') IS NOT NULL DROP TABLE fact_deposit_master_daily;
CREATE TABLE fact_deposit_master_daily (
    deposit_account_no VARCHAR(50),
    snapshot_date DATE,
    cif_number VARCHAR(50),
    branch_code VARCHAR(20),
    deposit_type VARCHAR(50),
    current_balance DECIMAL(18,2),
    available_balance DECIMAL(18,2),
    uncleared_balance DECIMAL(18,2),
    interest_rate DECIMAL(10,2),
    account_status VARCHAR(50),
    PRIMARY KEY (deposit_account_no, snapshot_date)
);

-- EWS and Audit Exceptions Fact
IF OBJECT_ID('fact_ews_audit_exceptions', 'U') IS NOT NULL DROP TABLE fact_ews_audit_exceptions;
CREATE TABLE fact_ews_audit_exceptions (
    exception_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    account_no VARCHAR(50),
    branch_code VARCHAR(20),
    exception_type VARCHAR(100),
    exception_description VARCHAR(500),
    breach_amount DECIMAL(18,2),
    audit_status VARCHAR(50),
    log_date DATE
);

-- ========================================================
-- GL MASTER FACT TABLES (NEW)
-- ========================================================

-- 1. GL Balances Daily (Aggregated Balances per GL)
CREATE TABLE fact_gl_balances_daily (
    id INT IDENTITY(1,1) PRIMARY KEY,
    gl_code VARCHAR(100),
    gl_name VARCHAR(255),
    branch_code VARCHAR(50),
    cr_balance DECIMAL(18,2) DEFAULT 0.0,
    dr_balance DECIMAL(18,2) DEFAULT 0.0,
    net_balance DECIMAL(18,2) DEFAULT 0.0,
    snapshot_date DATE
);

-- 2. GL Transactions Daily (Daybook and Supplementary Clearings)
CREATE TABLE fact_gl_transactions_daily (
    id INT IDENTITY(1,1) PRIMARY KEY,
    txn_id VARCHAR(100), -- E.g. JRNL_NO or synthetic ID
    gl_code VARCHAR(100),
    gl_name VARCHAR(255),
    branch_code VARCHAR(50),
    txn_type VARCHAR(50), -- DEBIT or CREDIT or TXN_TYPE
    debit_amount DECIMAL(18,2) DEFAULT 0.0,
    credit_amount DECIMAL(18,2) DEFAULT 0.0,
    transaction_date DATE
);
