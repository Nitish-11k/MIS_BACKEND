/*******************************************************************************
 * 02_dim_branch_hierarchy.sql
 * Banking MIS Data Warehouse — Branch Dimension Table
 *
 * Creates dw.DIM_BRANCH_HIERARCHY with auto-generated REGIONAL_OFFICE_CODE
 * values (RO01, RO02, ...) derived from existing BRANCH_NETWORK data.
 *
 * Seeds data from dbo.BRANCH_NETWORK (existing staging table).
 * Non-destructive: dbo.BRANCH_NETWORK is read-only.
 * Idempotent: Uses IF NOT EXISTS and MERGE.
 *
 * Target: MIS_DATABASE on DESKTOP-CNDH3DO
 ******************************************************************************/

USE MIS_DATABASE;
GO

-- ============================================================================
-- 1. Create DIM_BRANCH_HIERARCHY
-- ============================================================================
IF OBJECT_ID(N'dw.DIM_BRANCH_HIERARCHY', N'U') IS NULL
BEGIN
    CREATE TABLE dw.DIM_BRANCH_HIERARCHY (
        BRANCH_CODE             VARCHAR(10)     NOT NULL,
        BRANCH_NAME             VARCHAR(255)    NOT NULL,
        REGIONAL_OFFICE_CODE    VARCHAR(10)     NULL,
        REGIONAL_OFFICE_NAME    VARCHAR(255)    NULL,
        HEAD_OFFICE_CODE        VARCHAR(10)     NOT NULL DEFAULT '00001',
        DISTRICT                VARCHAR(100)    NULL,
        ADDRESS                 VARCHAR(500)    NULL,
        IS_ACTIVE               BIT             NOT NULL DEFAULT 1,
        CREATED_AT              DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),
        UPDATED_AT              DATETIME2(3)    NOT NULL DEFAULT SYSUTCDATETIME(),

        CONSTRAINT PK_DIM_BRANCH_HIERARCHY PRIMARY KEY CLUSTERED (BRANCH_CODE)
    );

    -- For filtering by regional office
    CREATE NONCLUSTERED INDEX IX_DIM_BRANCH_RO
        ON dw.DIM_BRANCH_HIERARCHY (REGIONAL_OFFICE_CODE)
        INCLUDE (BRANCH_NAME, DISTRICT, IS_ACTIVE);

    -- For filtering by district
    CREATE NONCLUSTERED INDEX IX_DIM_BRANCH_DISTRICT
        ON dw.DIM_BRANCH_HIERARCHY (DISTRICT)
        INCLUDE (BRANCH_NAME, REGIONAL_OFFICE_CODE, IS_ACTIVE);

    -- For filtering active branches
    CREATE NONCLUSTERED INDEX IX_DIM_BRANCH_ACTIVE
        ON dw.DIM_BRANCH_HIERARCHY (IS_ACTIVE)
        INCLUDE (BRANCH_NAME, REGIONAL_OFFICE_CODE, DISTRICT)
        WHERE IS_ACTIVE = 1;

    PRINT '>> Table dw.DIM_BRANCH_HIERARCHY created.';
END
ELSE
    PRINT '>> Table dw.DIM_BRANCH_HIERARCHY already exists — skipped DDL.';
GO

-- ============================================================================
-- 2. Seed data from dbo.BRANCH_NETWORK using MERGE
--    Auto-generate REGIONAL_OFFICE_CODE as RO01, RO02, etc.
-- ============================================================================
PRINT '>> Seeding dw.DIM_BRANCH_HIERARCHY from dbo.BRANCH_NETWORK...';

-- Step 2a: Build a lookup of distinct regional offices with auto-generated codes
;WITH RO_Lookup AS (
    SELECT
        REGIONAL_OFFICE,
        'RO' + RIGHT('00' + CAST(ROW_NUMBER() OVER (ORDER BY
            CASE
                WHEN UPPER(REGIONAL_OFFICE) = 'HEAD OFFICE'  THEN 0
                WHEN UPPER(REGIONAL_OFFICE) = 'UNASSIGNED'   THEN 999
                ELSE 1
            END,
            REGIONAL_OFFICE
        ) AS VARCHAR(2)), 2) AS RO_CODE
    FROM (
        SELECT DISTINCT ISNULL(REGIONAL_OFFICE, 'Unassigned') AS REGIONAL_OFFICE
        FROM dbo.BRANCH_NETWORK
    ) ro
)
-- Step 2b: MERGE into DIM_BRANCH_HIERARCHY
MERGE dw.DIM_BRANCH_HIERARCHY AS tgt
USING (
    SELECT
        dw.fn_NormalizeBranchCode(bn.BRANCH_CODE)  AS BRANCH_CODE,
        LTRIM(RTRIM(bn.BRANCH_NAME))                AS BRANCH_NAME,
        ro.RO_CODE                                   AS REGIONAL_OFFICE_CODE,
        ISNULL(bn.REGIONAL_OFFICE, 'Unassigned')     AS REGIONAL_OFFICE_NAME,
        '00001'                                      AS HEAD_OFFICE_CODE,
        ISNULL(bn.DISTRICT, 'Unknown')               AS DISTRICT,
        bn.ADDRESS                                   AS ADDRESS
    FROM dbo.BRANCH_NETWORK bn
    LEFT JOIN RO_Lookup ro
        ON ISNULL(bn.REGIONAL_OFFICE, 'Unassigned') = ro.REGIONAL_OFFICE
    WHERE bn.BRANCH_CODE IS NOT NULL
      AND LTRIM(RTRIM(bn.BRANCH_CODE)) <> ''
) AS src
ON tgt.BRANCH_CODE = src.BRANCH_CODE
WHEN MATCHED THEN
    UPDATE SET
        tgt.BRANCH_NAME          = src.BRANCH_NAME,
        tgt.REGIONAL_OFFICE_CODE = src.REGIONAL_OFFICE_CODE,
        tgt.REGIONAL_OFFICE_NAME = src.REGIONAL_OFFICE_NAME,
        tgt.HEAD_OFFICE_CODE     = src.HEAD_OFFICE_CODE,
        tgt.DISTRICT             = src.DISTRICT,
        tgt.ADDRESS              = src.ADDRESS,
        tgt.UPDATED_AT           = SYSUTCDATETIME()
WHEN NOT MATCHED BY TARGET THEN
    INSERT (BRANCH_CODE, BRANCH_NAME, REGIONAL_OFFICE_CODE, REGIONAL_OFFICE_NAME,
            HEAD_OFFICE_CODE, DISTRICT, ADDRESS, IS_ACTIVE)
    VALUES (src.BRANCH_CODE, src.BRANCH_NAME, src.REGIONAL_OFFICE_CODE,
            src.REGIONAL_OFFICE_NAME, src.HEAD_OFFICE_CODE, src.DISTRICT,
            src.ADDRESS, 1);

DECLARE @merged_count INT = @@ROWCOUNT;
PRINT '>> DIM_BRANCH_HIERARCHY: ' + CAST(@merged_count AS VARCHAR(10)) + ' rows merged/updated.';
GO

-- ============================================================================
-- 3. Verify the regional office code assignment
-- ============================================================================
PRINT '>> Regional Office Code Assignments:';
SELECT DISTINCT
    REGIONAL_OFFICE_CODE,
    REGIONAL_OFFICE_NAME,
    COUNT(*) AS BRANCH_COUNT
FROM dw.DIM_BRANCH_HIERARCHY
GROUP BY REGIONAL_OFFICE_CODE, REGIONAL_OFFICE_NAME
ORDER BY REGIONAL_OFFICE_CODE;
GO

PRINT '============================================================';
PRINT '  02_dim_branch_hierarchy.sql completed successfully.';
PRINT '============================================================';
GO
