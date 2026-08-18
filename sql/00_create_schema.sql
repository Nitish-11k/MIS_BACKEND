/*******************************************************************************
 * 00_create_schema.sql
 * Banking MIS Data Warehouse — Foundation Objects
 *
 * Creates:
 *   1. [dw] schema  (isolated from raw staging in [dbo])
 *   2. dw.ETL_RUN_LOG  — idempotent ETL audit trail
 *   3. dw.USER_BRANCH_ACCESS  — RLS user-to-branch mapping
 *
 * Idempotent: Safe to re-run. Uses IF NOT EXISTS guards.
 * Non-destructive: No changes to any dbo.* objects.
 *
 * Target: MIS_DATABASE on DESKTOP-CNDH3DO (SQL Server / Azure SQL)
 ******************************************************************************/

USE MIS_DATABASE;
GO

-- ============================================================================
-- 1. Create [dw] schema
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = N'dw')
BEGIN
    EXEC('CREATE SCHEMA dw AUTHORIZATION dbo');
    PRINT '>> Schema [dw] created.';
END
ELSE
    PRINT '>> Schema [dw] already exists — skipped.';
GO

-- ============================================================================
-- 2. ETL Run Log — tracks every ETL execution for idempotency & debugging
-- ============================================================================
IF OBJECT_ID(N'dw.ETL_RUN_LOG', N'U') IS NULL
BEGIN
    CREATE TABLE dw.ETL_RUN_LOG (
        RUN_ID              BIGINT          IDENTITY(1,1)   PRIMARY KEY,
        PROCEDURE_NAME      VARCHAR(128)    NOT NULL,
        SNAPSHOT_DATE       DATE            NULL,
        STATUS              VARCHAR(20)     NOT NULL
                            DEFAULT 'RUNNING'
                            CHECK (STATUS IN ('RUNNING','SUCCESS','FAILED','PARTIAL')),
        ROWS_AFFECTED       INT             NULL,
        ERROR_MESSAGE       NVARCHAR(4000)  NULL,
        STARTED_AT          DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
        COMPLETED_AT        DATETIME2(3)    NULL,
        DURATION_SECONDS    AS DATEDIFF(SECOND, STARTED_AT, COMPLETED_AT)
    );

    -- Index for quick lookups by procedure + date
    CREATE NONCLUSTERED INDEX IX_ETL_RUN_LOG_ProcDate
        ON dw.ETL_RUN_LOG (PROCEDURE_NAME, SNAPSHOT_DATE)
        INCLUDE (STATUS, STARTED_AT);

    PRINT '>> Table dw.ETL_RUN_LOG created.';
END
ELSE
    PRINT '>> Table dw.ETL_RUN_LOG already exists — skipped.';
GO

-- ============================================================================
-- 3. User-Branch Access Mapping — drives Row-Level Security (RLS)
-- ============================================================================
IF OBJECT_ID(N'dw.USER_BRANCH_ACCESS', N'U') IS NULL
BEGIN
    CREATE TABLE dw.USER_BRANCH_ACCESS (
        ACCESS_ID               INT             IDENTITY(1,1)   PRIMARY KEY,
        USER_LOGIN              VARCHAR(128)    NOT NULL,
        ACCESS_ROLE             VARCHAR(10)     NOT NULL
                                CHECK (ACCESS_ROLE IN ('HO','RO','BRANCH')),
        BRANCH_CODE             VARCHAR(10)     NULL,           -- NULL for HO users
        REGIONAL_OFFICE_CODE    VARCHAR(10)     NULL,           -- populated for RO users
        IS_ACTIVE               BIT             NOT NULL DEFAULT 1,
        CREATED_AT              DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
        UPDATED_AT              DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME()
    );

    -- Unique constraint: one user can have one role assignment per branch/RO
    CREATE UNIQUE NONCLUSTERED INDEX UQ_USER_BRANCH_ACCESS_Login
        ON dw.USER_BRANCH_ACCESS (USER_LOGIN, ACCESS_ROLE, BRANCH_CODE)
        WHERE IS_ACTIVE = 1;

    -- Index for RLS predicate lookups
    CREATE NONCLUSTERED INDEX IX_USER_BRANCH_ACCESS_Role
        ON dw.USER_BRANCH_ACCESS (ACCESS_ROLE, REGIONAL_OFFICE_CODE, BRANCH_CODE)
        INCLUDE (USER_LOGIN)
        WHERE IS_ACTIVE = 1;

    PRINT '>> Table dw.USER_BRANCH_ACCESS created.';
END
ELSE
    PRINT '>> Table dw.USER_BRANCH_ACCESS already exists — skipped.';
GO

PRINT '============================================================';
PRINT '  00_create_schema.sql completed successfully.';
PRINT '============================================================';
GO
    ---------------------------------------------------------------------------
    -- dw.FACT_ACCOUNT_OPENED
    -- Tracks accounts opened over time (Accumulating/Event Snapshot)
    ---------------------------------------------------------------------------
    IF OBJECT_ID('dw.FACT_ACCOUNT_OPENED', 'U') IS NOT NULL DROP TABLE dw.FACT_ACCOUNT_OPENED;
    CREATE TABLE dw.FACT_ACCOUNT_OPENED (
        OPENED_DATE             DATE            NOT NULL,
        ACCOUNT_NO              VARCHAR(50)     NOT NULL,
        CUSTOMER_NAME           NVARCHAR(255)   NULL,
        BRANCH_CODE             VARCHAR(10)     NOT NULL,
        ACCOUNT_CATEGORY        VARCHAR(20)     NOT NULL CHECK (ACCOUNT_CATEGORY IN ('DEPOSIT','LOAN','CC_OD')),
        PRODUCT_CODE            VARCHAR(50)     NULL,
        BALANCE                 DECIMAL(18,2)   NULL,
        ETL_LOADED_AT           DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME()
    );
    CREATE NONCLUSTERED INDEX IX_FACT_OPENED_DateBranch ON dw.FACT_ACCOUNT_OPENED (OPENED_DATE, BRANCH_CODE) INCLUDE (ACCOUNT_CATEGORY);

    ---------------------------------------------------------------------------
    -- dw.FACT_ACCOUNT_CLOSED
    -- Tracks accounts closed over time (Accumulating/Event Snapshot)
    ---------------------------------------------------------------------------
    IF OBJECT_ID('dw.FACT_ACCOUNT_CLOSED', 'U') IS NOT NULL DROP TABLE dw.FACT_ACCOUNT_CLOSED;
    CREATE TABLE dw.FACT_ACCOUNT_CLOSED (
        CLOSED_DATE             DATE            NOT NULL,
        ACCOUNT_NO              VARCHAR(50)     NOT NULL,
        CUSTOMER_NAME           NVARCHAR(255)   NULL,
        BRANCH_CODE             VARCHAR(10)     NOT NULL,
        ACCOUNT_CATEGORY        VARCHAR(20)     NOT NULL CHECK (ACCOUNT_CATEGORY IN ('DEPOSIT','LOAN','CC_OD')),
        PRODUCT_CODE            VARCHAR(50)     NULL,
        ETL_LOADED_AT           DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME()
    );
    CREATE NONCLUSTERED INDEX IX_FACT_CLOSED_DateBranch ON dw.FACT_ACCOUNT_CLOSED (CLOSED_DATE, BRANCH_CODE) INCLUDE (ACCOUNT_CATEGORY);
