/*******************************************************************************
 * 04_fact_loan_risk_delinquency.sql
 * Banking MIS Data Warehouse — Loan Risk & Delinquency Fact Table
 *
 * Granular delinquency metrics per loan account:
 *   - NPA classification (Standard, Sub-standard, Doubtful, Loss)
 *   - Arrears aging slabs (1D-28D, 29D-3M, 3M-6M, 6M-1Y, 1Y-3Y, 3Y+)
 *   - Drawing power variances
 *   - Uncollected interest (INCA, UIPY)
 *   - Irregular/excess amounts
 *
 * Sources: NPA_STMT, LISTOF_NPA_ACCOUNTS_LOND2572,
 *          PROBABLE_NPA_REPORT_LOND2463, ARREARS_BREAK_UP_LOND2498,
 *          DRAWING_POWER_LOND2388, LOAN_IRREGULAR_REPORT,
 *          IRREGULAR_EXCESS_DRAW_LOND2397CPC
 *
 * One row per (SNAPSHOT_DATE, ACCOUNT_NO).
 * Target: MIS_DATABASE on DESKTOP-CNDH3DO
 ******************************************************************************/

USE MIS_DATABASE;
GO

-- ============================================================================
-- 1. Create FACT_LOAN_RISK_DELINQUENCY
-- ============================================================================
IF OBJECT_ID(N'dw.FACT_LOAN_RISK_DELINQUENCY', N'U') IS NULL
BEGIN
    CREATE TABLE dw.FACT_LOAN_RISK_DELINQUENCY (
        RISK_ID                 BIGINT          IDENTITY(1,1),
        SNAPSHOT_DATE           DATE            NOT NULL,
        ACCOUNT_NO              VARCHAR(30)     NOT NULL,
        CUSTOMER_NO             VARCHAR(50)     NULL,
        CUSTOMER_NAME           NVARCHAR(255)   NULL,
        BRANCH_CODE             VARCHAR(10)     NOT NULL,
        PRODUCT_DESCRIPTION     VARCHAR(255)    NULL,
        SYSTEM_CODE             VARCHAR(10)     NULL,       -- e.g., 'CCOD', 'LOAN'

        -- NPA Classification
        NPA_CLASSIFICATION      VARCHAR(30)     NULL,       -- STANDARD / SUB_STANDARD / DOUBTFUL / LOSS
        OLD_IRAC                VARCHAR(10)     NULL,
        NEW_IRAC                VARCHAR(10)     NULL,
        NPA_DATE                DATE            NULL,
        LAST_ARREARS_DATE       DATE            NULL,

        -- Balances
        BALANCE_OUTSTANDING     DECIMAL(18,2)   NULL,
        OVERDUE_INTEREST        DECIMAL(18,2)   NULL,
        INCA                    DECIMAL(18,2)   NULL,       -- Interest Not Collected Amount
        UIPY                    DECIMAL(18,2)   NULL,       -- Unrecovered Interest Prior Year
        IRREGULAR_AMOUNT        DECIMAL(18,2)   NULL,

        -- Arrears Aging Slabs
        ARREARS_1D_28D          DECIMAL(18,2)   NULL,
        ARREARS_29D_3M          DECIMAL(18,2)   NULL,
        ARREARS_3M_6M           DECIMAL(18,2)   NULL,
        ARREARS_6M_1Y           DECIMAL(18,2)   NULL,
        ARREARS_1Y_3Y           DECIMAL(18,2)   NULL,
        ARREARS_3Y_PLUS         DECIMAL(18,2)   NULL,       -- Consolidated 3Y-5Y + 5Y-7Y + 7Y-10Y + 10Y-15Y + 15Y+

        -- Drawing Power
        DRAWING_POWER           DECIMAL(18,2)   NULL,
        DP_VARIANCE             DECIMAL(18,2)   NULL,
        BENCHMARK_LEVEL         VARCHAR(50)     NULL,
        TOLERANCE_LEVEL         VARCHAR(50)     NULL,

        -- Irregularity details
        OUTSTANDING             DECIMAL(18,2)   NULL,
        LIMIT_AMOUNT            DECIMAL(18,2)   NULL,
        RISK_GRADE              VARCHAR(20)     NULL,
        ARREAR_CONDITION        VARCHAR(20)     NULL,

        -- Probable NPA indicators
        IS_PROBABLE_NPA         BIT             NULL DEFAULT 0,
        IS_CONFIRMED_NPA        BIT             NULL DEFAULT 0,

        -- Audit trail
        SOURCE_REPORT_ID        VARCHAR(30)     NULL,
        SOURCE_TABLE            VARCHAR(100)    NULL,
        ETL_LOADED_AT           DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),

        CONSTRAINT PK_FACT_LOAN_RISK PRIMARY KEY NONCLUSTERED (RISK_ID)
    );

    -- Unique clustered: one risk record per account per date
    CREATE UNIQUE CLUSTERED INDEX UCX_FACT_RISK_DateAcct
        ON dw.FACT_LOAN_RISK_DELINQUENCY (SNAPSHOT_DATE, ACCOUNT_NO);

    -- Branch + date for branch-level risk queries
    CREATE NONCLUSTERED INDEX IX_FACT_RISK_BranchDate
        ON dw.FACT_LOAN_RISK_DELINQUENCY (BRANCH_CODE, SNAPSHOT_DATE)
        INCLUDE (NPA_CLASSIFICATION, BALANCE_OUTSTANDING, IRREGULAR_AMOUNT);

    -- NPA classification for delinquency dashboards
    CREATE NONCLUSTERED INDEX IX_FACT_RISK_NPAClass
        ON dw.FACT_LOAN_RISK_DELINQUENCY (NPA_CLASSIFICATION, SNAPSHOT_DATE)
        INCLUDE (BRANCH_CODE, BALANCE_OUTSTANDING, INCA, UIPY);

    -- NPA date for trend analysis
    CREATE NONCLUSTERED INDEX IX_FACT_RISK_NPADate
        ON dw.FACT_LOAN_RISK_DELINQUENCY (NPA_DATE)
        INCLUDE (ACCOUNT_NO, NPA_CLASSIFICATION, BRANCH_CODE);

    -- Probable NPA watchlist
    CREATE NONCLUSTERED INDEX IX_FACT_RISK_ProbableNPA
        ON dw.FACT_LOAN_RISK_DELINQUENCY (IS_PROBABLE_NPA, SNAPSHOT_DATE)
        WHERE IS_PROBABLE_NPA = 1;

    PRINT '>> Table dw.FACT_LOAN_RISK_DELINQUENCY created with 5 indexes.';
END
ELSE
    PRINT '>> Table dw.FACT_LOAN_RISK_DELINQUENCY already exists — skipped.';
GO

PRINT '============================================================';
PRINT '  04_fact_loan_risk_delinquency.sql completed successfully.';
PRINT '============================================================';
GO
