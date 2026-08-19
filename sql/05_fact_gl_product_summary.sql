/*******************************************************************************
 * 05_fact_gl_product_summary.sql
 * Banking MIS Data Warehouse — GL Product Summary Fact Table
 *
 * GL Class Code (GLCC) summaries, ledger totals, and daily flow breakdowns
 * by Cash, Clearing, and Transfer (Credit vs. Debit).
 *
 * One row per (SNAPSHOT_DATE, BRANCH_CODE, GL_CLASS_CODE).
 *
 * Sources: GLCC_WISE_BAL_REP (GL7043-01), GLCC_WISE_SUM_REP (GL7043-02),
 *          BAL_IN_LOAN_ACC_GLCC_WISE_DET/SUM (GL7044-01/02),
 *          DAILY_PRODUCTWISE_REPORT_LOAN_DEP_CLEARING_GNBD7376
 *
 * Target: MIS_DATABASE on DESKTOP-CNDH3DO
 ******************************************************************************/

USE MIS_DATABASE;
GO

-- ============================================================================
-- 1. Create FACT_GL_PRODUCT_SUMMARY
-- ============================================================================
IF OBJECT_ID(N'dw.FACT_GL_PRODUCT_SUMMARY', N'U') IS NULL
BEGIN
    CREATE TABLE dw.FACT_GL_PRODUCT_SUMMARY (
        GL_SUMMARY_ID           BIGINT          IDENTITY(1,1),
        SNAPSHOT_DATE           DATE            NOT NULL,
        BRANCH_CODE             VARCHAR(10)     NOT NULL,
        GL_CLASS_CODE           VARCHAR(50)     NOT NULL,
        PRODUCT_NAME            VARCHAR(255)    NULL,

        -- Ledger totals
        ACCOUNT_COUNT           INT             NULL,
        TOTAL_DR_BALANCE        DECIMAL(18,2)   NULL,
        TOTAL_CR_BALANCE        DECIMAL(18,2)   NULL,
        TOTAL_INTEREST          DECIMAL(18,2)   NULL,
        TOTAL_DR_OD_INT         DECIMAL(18,2)   NULL,
        TOTAL_UNCLEARED         DECIMAL(18,2)   NULL,
        TOTAL_COLLECTION        DECIMAL(18,2)   NULL,

        -- Daily flow breakdowns (from GNBD7376)
        DAILY_CASH_CREDIT       DECIMAL(18,2)   NULL,
        DAILY_CASH_DEBIT        DECIMAL(18,2)   NULL,
        DAILY_CLR_CREDIT        DECIMAL(18,2)   NULL,
        DAILY_CLR_DEBIT         DECIMAL(18,2)   NULL,
        DAILY_TFR_CREDIT        DECIMAL(18,2)   NULL,
        DAILY_TFR_DEBIT         DECIMAL(18,2)   NULL,
        DAILY_TOTAL_CREDIT      DECIMAL(18,2)   NULL,
        DAILY_TOTAL_DEBIT       DECIMAL(18,2)   NULL,

        -- Audit trail
        SOURCE_REPORT_ID        VARCHAR(30)     NULL,
        SOURCE_TABLE            VARCHAR(100)    NULL,
        ETL_LOADED_AT           DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),

        CONSTRAINT PK_FACT_GL_PRODUCT_SUMMARY
            PRIMARY KEY NONCLUSTERED (GL_SUMMARY_ID)
    );

    -- Unique clustered: one GL summary per GLCC+Branch+Date
    CREATE UNIQUE CLUSTERED INDEX UCX_FACT_GL_DateBranchGLCC
        ON dw.FACT_GL_PRODUCT_SUMMARY (SNAPSHOT_DATE, BRANCH_CODE, GL_CLASS_CODE);

    -- GLCC-level queries across branches
    CREATE NONCLUSTERED INDEX IX_FACT_GL_GLCCDate
        ON dw.FACT_GL_PRODUCT_SUMMARY (GL_CLASS_CODE, SNAPSHOT_DATE)
        INCLUDE (TOTAL_DR_BALANCE, TOTAL_CR_BALANCE, ACCOUNT_COUNT);

    -- Branch-level product analysis
    CREATE NONCLUSTERED INDEX IX_FACT_GL_BranchDate
        ON dw.FACT_GL_PRODUCT_SUMMARY (BRANCH_CODE, SNAPSHOT_DATE)
        INCLUDE (GL_CLASS_CODE, PRODUCT_NAME, TOTAL_DR_BALANCE, TOTAL_CR_BALANCE);

    PRINT '>> Table dw.FACT_GL_PRODUCT_SUMMARY created with 3 indexes.';
END
ELSE
    PRINT '>> Table dw.FACT_GL_PRODUCT_SUMMARY already exists — skipped.';
GO

PRINT '============================================================';
PRINT '  05_fact_gl_product_summary.sql completed successfully.';
PRINT '============================================================';
GO
