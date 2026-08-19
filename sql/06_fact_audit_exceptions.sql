/*******************************************************************************
 * 06_fact_audit_exceptions.sql
 * Banking MIS Data Warehouse — Audit Exceptions Fact Table
 *
 * Compliance and audit anomaly tracking:
 *   - Transaction limit breaches (DEPD0670)
 *   - Interest rate variances (DEPD0650)
 *   - High-value transaction flags (BR2599)
 *   - Lien operations (DEPD0702)
 *   - BGL aging (GEND0805)
 *
 * One row per exception event.
 * Target: MIS_DATABASE on DESKTOP-CNDH3DO
 ******************************************************************************/

USE MIS_DATABASE;
GO

-- ============================================================================
-- 1. Create FACT_AUDIT_EXCEPTIONS
-- ============================================================================
IF OBJECT_ID(N'dw.FACT_AUDIT_EXCEPTIONS', N'U') IS NULL
BEGIN
    CREATE TABLE dw.FACT_AUDIT_EXCEPTIONS (
        EXCEPTION_ID            BIGINT          IDENTITY(1,1),
        SNAPSHOT_DATE           DATE            NOT NULL,
        BRANCH_CODE             VARCHAR(10)     NOT NULL,
        ACCOUNT_NO              VARCHAR(30)     NULL,
        CUSTOMER_NAME           NVARCHAR(255)   NULL,

        -- Exception classification
        EXCEPTION_TYPE          VARCHAR(50)     NOT NULL
                                CHECK (EXCEPTION_TYPE IN (
                                    'TXN_LIMIT_BREACH',
                                    'INT_RATE_VARIANCE',
                                    'HIGH_VALUE_TXN',
                                    'LIEN_OPERATION',
                                    'BGL_AGING',
                                    'DEBIT_INCOME_ACCT',
                                    'CREDIT_EXPENSE_ACCT',
                                    'OTHER'
                                )),

        -- Transaction details
        TRAN_CODE               VARCHAR(20)     NULL,
        JOURNAL_NO              VARCHAR(20)     NULL,
        AMOUNT                  DECIMAL(18,2)   NULL,
        OUTSTANDING             DECIMAL(18,2)   NULL,
        LIMIT_AMOUNT            DECIMAL(18,2)   NULL,

        -- Interest rate variance details
        SANCTION_AMOUNT         DECIMAL(18,2)   NULL,
        ACCOUNT_TYPE            VARCHAR(50)     NULL,
        SUB_TYPE                VARCHAR(50)     NULL,
        PRODUCT_INT_RATE        DECIMAL(8,4)    NULL,
        EFFECTIVE_INT_RATE      DECIMAL(8,4)    NULL,
        RATE_VARIANCE           DECIMAL(8,4)    NULL,

        -- Lien details
        LIEN_AMOUNT             DECIMAL(18,2)   NULL,
        LIEN_ACTION             VARCHAR(20)     NULL,       -- MARK / REMOVE
        LIEN_REASON             VARCHAR(500)    NULL,
        USER_ID                 VARCHAR(50)     NULL,
        CHECKER_ID              VARCHAR(50)     NULL,

        -- HVT details
        TRANSACTION_DATE        DATE            NULL,
        NARRATION               VARCHAR(500)    NULL,

        -- Error/supervision
        ERROR_DESC              VARCHAR(500)    NULL,
        SUP_ID                  VARCHAR(20)     NULL,
        SUP_ERR_NO              VARCHAR(50)     NULL,

        -- Severity auto-calculated by ETL
        SEVERITY                VARCHAR(10)     NULL
                                CHECK (SEVERITY IN ('LOW','MEDIUM','HIGH','CRITICAL')),

        -- Audit trail
        SOURCE_REPORT_ID        VARCHAR(30)     NULL,
        SOURCE_TABLE            VARCHAR(100)    NULL,
        ETL_LOADED_AT           DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),

        CONSTRAINT PK_FACT_AUDIT_EXCEPTIONS
            PRIMARY KEY NONCLUSTERED (EXCEPTION_ID)
    );

    -- Clustered by date for time-series queries
    CREATE CLUSTERED INDEX CX_FACT_AUDIT_DateID
        ON dw.FACT_AUDIT_EXCEPTIONS (SNAPSHOT_DATE, EXCEPTION_ID);

    -- Branch + date for branch-level exception views
    CREATE NONCLUSTERED INDEX IX_FACT_AUDIT_BranchDate
        ON dw.FACT_AUDIT_EXCEPTIONS (BRANCH_CODE, SNAPSHOT_DATE)
        INCLUDE (EXCEPTION_TYPE, SEVERITY, AMOUNT);

    -- Exception type analysis
    CREATE NONCLUSTERED INDEX IX_FACT_AUDIT_TypeDate
        ON dw.FACT_AUDIT_EXCEPTIONS (EXCEPTION_TYPE, SNAPSHOT_DATE)
        INCLUDE (BRANCH_CODE, SEVERITY, AMOUNT);

    -- Severity filtering for critical alerts
    CREATE NONCLUSTERED INDEX IX_FACT_AUDIT_Severity
        ON dw.FACT_AUDIT_EXCEPTIONS (SEVERITY, SNAPSHOT_DATE)
        INCLUDE (EXCEPTION_TYPE, BRANCH_CODE, AMOUNT)
        WHERE SEVERITY IN ('HIGH', 'CRITICAL');

    PRINT '>> Table dw.FACT_AUDIT_EXCEPTIONS created with 4 indexes.';
END
ELSE
    PRINT '>> Table dw.FACT_AUDIT_EXCEPTIONS already exists — skipped.';
GO

PRINT '============================================================';
PRINT '  06_fact_audit_exceptions.sql completed successfully.';
PRINT '============================================================';
GO
