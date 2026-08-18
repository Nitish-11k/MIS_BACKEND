/*******************************************************************************
 * 03_fact_account_snapshot.sql
 * Banking MIS Data Warehouse — Consolidated Account Fact Table
 *
 * Daily snapshot of ALL account types via ACCOUNT_CATEGORY discriminator:
 *   - 'DEPOSIT' from DEPOSITS_BALANCE_FILE_DEPD0586
 *   - 'LOAN'    from LOANSBALANCEFILE_LOND2390
 *   - 'CC_OD'   from CC_OD_BALANCE_FILE_DEPD0580
 *
 * One row per (SNAPSHOT_DATE, ACCOUNT_NO, ACCOUNT_CATEGORY).
 * Non-destructive: dbo.* staging tables are read-only.
 * Idempotent: Uses IF NOT EXISTS.
 *
 * Target: MIS_DATABASE on DESKTOP-CNDH3DO
 ******************************************************************************/

USE MIS_DATABASE;
GO

-- ============================================================================
-- 1. Create FACT_ACCOUNT_SNAPSHOT
-- ============================================================================
IF OBJECT_ID(N'dw.FACT_ACCOUNT_SNAPSHOT', N'U') IS NULL
BEGIN
    CREATE TABLE dw.FACT_ACCOUNT_SNAPSHOT (
        SNAPSHOT_ID             BIGINT          IDENTITY(1,1),
        SNAPSHOT_DATE           DATE            NOT NULL,
        ACCOUNT_NO              VARCHAR(30)     NOT NULL,
        CUSTOMER_NO             VARCHAR(50)     NULL,
        CUSTOMER_NAME           NVARCHAR(255)   NULL,
        BRANCH_CODE             VARCHAR(10)     NOT NULL,
        ACCOUNT_CATEGORY        VARCHAR(20)     NOT NULL
                                CHECK (ACCOUNT_CATEGORY IN ('DEPOSIT','LOAN','CC_OD')),
        ACCOUNT_TYPE            VARCHAR(100)    NULL,
        PRODUCT_DESCRIPTION     VARCHAR(255)    NULL,
        CURRENT_BALANCE         DECIMAL(18,2)   NULL,
        AVAILABLE_BALANCE       DECIMAL(18,2)   NULL,
        UNCLEARED_BALANCE       DECIMAL(18,2)   NULL,
        SANCTIONED_LIMIT        DECIMAL(18,2)   NULL,
        DRAWING_POWER           DECIMAL(18,2)   NULL,
        OUTSTANDING             DECIMAL(18,2)   NULL,
        IRREGULARITY            DECIMAL(18,2)   NULL,
        THEORETICAL_BALANCE     DECIMAL(18,2)   NULL,
        INTEREST_RATE           DECIMAL(8,4)    NULL,
        TERM_MONTHS             INT             NULL,
        ACCOUNT_STATUS          VARCHAR(20)     NULL,
        ARREAR_CONDITION        VARCHAR(20)     NULL,
        SANCTION_DATE           DATE            NULL,
        OPEN_DATE               DATE            NULL,
        CLOSE_DATE              DATE            NULL,
        MATURITY_DATE           DATE            NULL,
        LIMIT_EXPIRY_DATE       DATE            NULL,
        NEW_IRAC                VARCHAR(10)     NULL,
        OLD_IRAC                VARCHAR(10)     NULL,
        EMI_DUE                 INT             NULL,
        EMI_PAID                INT             NULL,
        EMI_OVERDUE             INT             NULL,
        ADVANCE_PAID_AMT        DECIMAL(18,2)   NULL,
        JOINT_HOLD_FLAG         VARCHAR(5)      NULL,
        ACCT_MAINTAIN_BRANCH    VARCHAR(10)     NULL,
        SOURCE_REPORT_ID        VARCHAR(30)     NULL,
        SOURCE_TABLE            VARCHAR(100)    NULL,
        ETL_LOADED_AT           DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),

        CONSTRAINT PK_FACT_ACCOUNT_SNAPSHOT
            PRIMARY KEY NONCLUSTERED (SNAPSHOT_ID)
    );

    -- Unique clustered index: enforces one snapshot per account+date+category
    CREATE UNIQUE CLUSTERED INDEX UCX_FACT_ACCT_SNAP_DateAcctCat
        ON dw.FACT_ACCOUNT_SNAPSHOT (SNAPSHOT_DATE, ACCOUNT_NO, ACCOUNT_CATEGORY);

    -- Branch-level filtering (for dashboard and RLS)
    CREATE NONCLUSTERED INDEX IX_FACT_ACCT_SNAP_BranchDate
        ON dw.FACT_ACCOUNT_SNAPSHOT (BRANCH_CODE, SNAPSHOT_DATE)
        INCLUDE (ACCOUNT_CATEGORY, CURRENT_BALANCE, OUTSTANDING, ACCOUNT_STATUS);

    -- Category-based queries (deposit vs loan vs CC/OD)
    CREATE NONCLUSTERED INDEX IX_FACT_ACCT_SNAP_CategoryDate
        ON dw.FACT_ACCOUNT_SNAPSHOT (ACCOUNT_CATEGORY, SNAPSHOT_DATE)
        INCLUDE (BRANCH_CODE, CURRENT_BALANCE, OUTSTANDING, INTEREST_RATE);

    -- Status filtering (open/closed/dormant)
    CREATE NONCLUSTERED INDEX IX_FACT_ACCT_SNAP_Status
        ON dw.FACT_ACCOUNT_SNAPSHOT (ACCOUNT_STATUS, SNAPSHOT_DATE)
        INCLUDE (ACCOUNT_CATEGORY, BRANCH_CODE);

    -- Foreign key to branch dimension
    -- (Soft FK: enforced by ETL, not hard constraint, to handle late-arriving branches)
    -- ALTER TABLE dw.FACT_ACCOUNT_SNAPSHOT
    --     ADD CONSTRAINT FK_FACT_ACCT_SNAP_Branch
    --     FOREIGN KEY (BRANCH_CODE) REFERENCES dw.DIM_BRANCH_HIERARCHY(BRANCH_CODE);

    PRINT '>> Table dw.FACT_ACCOUNT_SNAPSHOT created with 4 indexes.';
END
ELSE
    PRINT '>> Table dw.FACT_ACCOUNT_SNAPSHOT already exists — skipped.';
GO

PRINT '============================================================';
PRINT '  03_fact_account_snapshot.sql completed successfully.';
PRINT '============================================================';
GO
