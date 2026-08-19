/*******************************************************************************
 * 07_etl_procedures.sql
 * Banking MIS Data Warehouse — Idempotent ELT Stored Procedures
 *
 * 7 stored procedures:
 *   1. dw.sp_Load_DIM_BRANCH_HIERARCHY    — MERGE from dbo.BRANCH_NETWORK
 *   2. dw.sp_Load_FACT_ACCOUNT_SNAPSHOT    — 3 staging tables → unified fact
 *   3. dw.sp_Load_FACT_LOAN_RISK          — 7 staging tables → risk fact
 *   4. dw.sp_Load_FACT_GL_PRODUCT_SUMMARY — 5 staging tables → GL fact
 *   5. dw.sp_Load_FACT_AUDIT_EXCEPTIONS   — 5 staging tables → audit fact
 *   6. dw.sp_RunFullETL                   — Master orchestrator
 *   7. dw.sp_RunIncrementalETL            — Date-filtered ETL
 *
 * All procedures apply normalization functions during transformation.
 * Idempotency: DELETE-then-INSERT within explicit transactions.
 * Non-destructive: dbo.* staging tables are read-only.
 *
 * Target: MIS_DATABASE on DESKTOP-CNDH3DO
 ******************************************************************************/

USE MIS_DATABASE;
GO

-- ============================================================================
-- Helper: Safely check if a staging table exists before querying it
-- ============================================================================
CREATE OR ALTER FUNCTION dw.fn_TableExists (@table_name SYSNAME)
RETURNS BIT
AS
BEGIN
    RETURN CASE
        WHEN EXISTS (
            SELECT 1 FROM sys.tables t
            JOIN sys.schemas s ON t.schema_id = s.schema_id
            WHERE s.name = 'dbo' AND t.name = @table_name
        ) THEN 1 ELSE 0
    END;
END;
GO

-- ############################################################################
-- 1. sp_Load_DIM_BRANCH_HIERARCHY
-- ############################################################################
CREATE OR ALTER PROCEDURE dw.sp_Load_DIM_BRANCH_HIERARCHY
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @run_id BIGINT, @rows INT = 0, @err NVARCHAR(4000);

    INSERT INTO dw.ETL_RUN_LOG (PROCEDURE_NAME, STATUS)
    VALUES ('sp_Load_DIM_BRANCH_HIERARCHY', 'RUNNING');
    SET @run_id = SCOPE_IDENTITY();

    BEGIN TRY
        ;WITH RO_Lookup AS (
            SELECT
                REGIONAL_OFFICE,
                'RO' + RIGHT('00' + CAST(ROW_NUMBER() OVER (ORDER BY
                    CASE
                        WHEN UPPER(REGIONAL_OFFICE) = 'HEAD OFFICE' THEN 0
                        WHEN UPPER(REGIONAL_OFFICE) = 'UNASSIGNED'  THEN 999
                        ELSE 1
                    END, REGIONAL_OFFICE
                ) AS VARCHAR(2)), 2) AS RO_CODE
            FROM (
                SELECT DISTINCT ISNULL(REGIONAL_OFFICE, 'Unassigned') AS REGIONAL_OFFICE
                FROM dbo.BRANCH_NETWORK
            ) ro
        )
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
        ) AS src ON tgt.BRANCH_CODE = src.BRANCH_CODE
        WHEN MATCHED THEN UPDATE SET
            tgt.BRANCH_NAME          = src.BRANCH_NAME,
            tgt.REGIONAL_OFFICE_CODE = src.REGIONAL_OFFICE_CODE,
            tgt.REGIONAL_OFFICE_NAME = src.REGIONAL_OFFICE_NAME,
            tgt.DISTRICT             = src.DISTRICT,
            tgt.ADDRESS              = src.ADDRESS,
            tgt.UPDATED_AT           = SYSUTCDATETIME()
        WHEN NOT MATCHED BY TARGET THEN INSERT
            (BRANCH_CODE, BRANCH_NAME, REGIONAL_OFFICE_CODE, REGIONAL_OFFICE_NAME,
             HEAD_OFFICE_CODE, DISTRICT, ADDRESS, IS_ACTIVE)
        VALUES
            (src.BRANCH_CODE, src.BRANCH_NAME, src.REGIONAL_OFFICE_CODE,
             src.REGIONAL_OFFICE_NAME, src.HEAD_OFFICE_CODE, src.DISTRICT,
             src.ADDRESS, 1);

        SET @rows = @@ROWCOUNT;

        UPDATE dw.ETL_RUN_LOG
        SET STATUS = 'SUCCESS', ROWS_AFFECTED = @rows, COMPLETED_AT = SYSUTCDATETIME()
        WHERE RUN_ID = @run_id;

        PRINT '>> DIM_BRANCH_HIERARCHY loaded: ' + CAST(@rows AS VARCHAR(10)) + ' rows.';
    END TRY
    BEGIN CATCH
        SET @err = ERROR_MESSAGE();
        UPDATE dw.ETL_RUN_LOG
        SET STATUS = 'FAILED', ERROR_MESSAGE = @err, COMPLETED_AT = SYSUTCDATETIME()
        WHERE RUN_ID = @run_id;
        PRINT '>> ERROR in sp_Load_DIM_BRANCH_HIERARCHY: ' + @err;
    END CATCH
END;
GO

-- ############################################################################
-- 2. sp_Load_FACT_ACCOUNT_SNAPSHOT
--    Sources: DEPOSITS_BALANCE_FILE_DEPD0586, LOANSBALANCEFILE_LOND2390,
--             CC_OD_BALANCE_FILE_DEPD0580
-- ############################################################################
CREATE OR ALTER PROCEDURE dw.sp_Load_FACT_ACCOUNT_SNAPSHOT
    @SnapshotDate DATE = NULL    -- NULL = load all available dates
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @run_id BIGINT, @rows INT = 0, @total_rows INT = 0, @err NVARCHAR(4000);

    INSERT INTO dw.ETL_RUN_LOG (PROCEDURE_NAME, SNAPSHOT_DATE, STATUS)
    VALUES ('sp_Load_FACT_ACCOUNT_SNAPSHOT', @SnapshotDate, 'RUNNING');
    SET @run_id = SCOPE_IDENTITY();

    BEGIN TRY
        BEGIN TRANSACTION;

        -- ================================================================
        -- 2a. DEPOSITS from DEPOSITS_BALANCE_FILE_DEPD0586
        -- ================================================================
        IF OBJECT_ID('dbo.DEPOSITS_BALANCE_FILE_DEPD0586', 'U') IS NOT NULL
        BEGIN
            -- Idempotent: delete existing DEPOSIT snapshots for this date
            IF @SnapshotDate IS NOT NULL
                DELETE FROM dw.FACT_ACCOUNT_SNAPSHOT
                WHERE SNAPSHOT_DATE = @SnapshotDate AND ACCOUNT_CATEGORY = 'DEPOSIT'
                  AND SOURCE_TABLE = 'DEPOSITS_BALANCE_FILE_DEPD0586';
            ELSE
                DELETE FROM dw.FACT_ACCOUNT_SNAPSHOT
                WHERE ACCOUNT_CATEGORY = 'DEPOSIT'
                  AND SOURCE_TABLE = 'DEPOSITS_BALANCE_FILE_DEPD0586';

            INSERT INTO dw.FACT_ACCOUNT_SNAPSHOT (
                SNAPSHOT_DATE, ACCOUNT_NO, CUSTOMER_NAME, BRANCH_CODE,
                ACCOUNT_CATEGORY, ACCOUNT_TYPE, CURRENT_BALANCE,
                AVAILABLE_BALANCE, UNCLEARED_BALANCE, SANCTIONED_LIMIT,
                INTEREST_RATE, ACCOUNT_STATUS, JOINT_HOLD_FLAG,
                SOURCE_REPORT_ID, SOURCE_TABLE
            )
            SELECT
                dw.fn_ParseDate(dep.PROC_DATE)                               AS SNAPSHOT_DATE,
                dw.fn_NormalizeAccountNo(dep.ACCOUNT_NUMBER)                  AS ACCOUNT_NO,
                LTRIM(RTRIM(dep.CUSTOMER_NAME))                               AS CUSTOMER_NAME,
                dw.fn_NormalizeBranchCode(dep.BRANCH_CODE)                   AS BRANCH_CODE,
                'DEPOSIT'                                                     AS ACCOUNT_CATEGORY,
                LTRIM(RTRIM(dep.ACCOUNT_TYPE))                                AS ACCOUNT_TYPE,
                dw.fn_ParseFinancialAmount(dep.CURRENT_BALANCE)              AS CURRENT_BALANCE,
                dw.fn_ParseFinancialAmount(dep.AVAILABLE_BALANCE)            AS AVAILABLE_BALANCE,
                dw.fn_ParseFinancialAmount(dep.UNCLEARED_BALANCE)            AS UNCLEARED_BALANCE,
                dw.fn_ParseFinancialAmount(dep.LIMIT)                        AS SANCTIONED_LIMIT,
                -- Handle composite INT_RATE field: '8.00 OPEN' -> rate = 8.00
                CASE
                    WHEN ISNUMERIC(LTRIM(RTRIM(dep.INT_RATE)) + 'e0') = 1
                        THEN TRY_CAST(LTRIM(RTRIM(dep.INT_RATE)) AS DECIMAL(8,4))
                    WHEN dep.INT_RATE LIKE '%[0-9]%'
                        THEN TRY_CAST(LEFT(LTRIM(RTRIM(dep.INT_RATE)),
                             PATINDEX('%[^0-9.]%', LTRIM(RTRIM(dep.INT_RATE)) + 'X') - 1)
                             AS DECIMAL(8,4))
                    ELSE NULL
                END                                                           AS INTEREST_RATE,
                -- Handle composite STATUS field or standalone
                dw.fn_NormalizeAccountStatus(
                    CASE
                        WHEN dep.STATUS IS NOT NULL AND LTRIM(RTRIM(dep.STATUS)) <> ''
                            THEN dep.STATUS
                        -- Extract status from composite INT_RATE if present
                        WHEN dep.INT_RATE LIKE '% %'
                            THEN LTRIM(SUBSTRING(dep.INT_RATE,
                                 PATINDEX('%[A-Za-z]%', dep.INT_RATE), 200))
                        ELSE NULL
                    END
                )                                                             AS ACCOUNT_STATUS,
                LTRIM(RTRIM(dep.JOINT_HOLD_FLAG))                             AS JOINT_HOLD_FLAG,
                dep.REPORT_ID                                                 AS SOURCE_REPORT_ID,
                'DEPOSITS_BALANCE_FILE_DEPD0586'                              AS SOURCE_TABLE
            FROM dbo.DEPOSITS_BALANCE_FILE_DEPD0586 dep
            WHERE dep.ACCOUNT_NUMBER IS NOT NULL
              AND LTRIM(RTRIM(dep.ACCOUNT_NUMBER)) <> ''
              AND (@SnapshotDate IS NULL OR dw.fn_ParseDate(dep.PROC_DATE) = @SnapshotDate);

            SET @rows = @@ROWCOUNT;
            SET @total_rows = @total_rows + @rows;
            PRINT '>> DEPOSIT rows loaded: ' + CAST(@rows AS VARCHAR(10));
        END

        -- ================================================================
        -- 2b. LOANS from LOANSBALANCEFILE_LOND2390
        -- ================================================================
        IF OBJECT_ID('dbo.LOANSBALANCEFILE_LOND2390', 'U') IS NOT NULL
        BEGIN
            IF @SnapshotDate IS NOT NULL
                DELETE FROM dw.FACT_ACCOUNT_SNAPSHOT
                WHERE SNAPSHOT_DATE = @SnapshotDate AND ACCOUNT_CATEGORY = 'LOAN'
                  AND SOURCE_TABLE = 'LOANSBALANCEFILE_LOND2390';
            ELSE
                DELETE FROM dw.FACT_ACCOUNT_SNAPSHOT
                WHERE ACCOUNT_CATEGORY = 'LOAN'
                  AND SOURCE_TABLE = 'LOANSBALANCEFILE_LOND2390';

            INSERT INTO dw.FACT_ACCOUNT_SNAPSHOT (
                SNAPSHOT_DATE, ACCOUNT_NO, CUSTOMER_NAME, BRANCH_CODE,
                ACCOUNT_CATEGORY, ACCOUNT_TYPE, OUTSTANDING, SANCTIONED_LIMIT,
                INTEREST_RATE, IRREGULARITY, THEORETICAL_BALANCE,
                SANCTION_DATE, NEW_IRAC, OLD_IRAC,
                EMI_DUE, EMI_PAID, EMI_OVERDUE, ADVANCE_PAID_AMT,
                ARREAR_CONDITION, ACCT_MAINTAIN_BRANCH,
                SOURCE_REPORT_ID, SOURCE_TABLE
            )
            SELECT
                dw.fn_ParseDate(ln.PROC_DATE)                                AS SNAPSHOT_DATE,
                dw.fn_NormalizeAccountNo(ln.ACCOUNT_NO)                      AS ACCOUNT_NO,
                LTRIM(RTRIM(ln.CUSTOMER_NAME))                                AS CUSTOMER_NAME,
                dw.fn_NormalizeBranchCode(ln.BRANCH_CODE)                    AS BRANCH_CODE,
                'LOAN'                                                        AS ACCOUNT_CATEGORY,
                LTRIM(RTRIM(ln.ACCOUNT_TYPE))                                 AS ACCOUNT_TYPE,
                dw.fn_ParseFinancialAmount(ln.OUTSTANDING)                   AS OUTSTANDING,
                dw.fn_ParseFinancialAmount(ln.LIMIT)                         AS SANCTIONED_LIMIT,
                TRY_CAST(LTRIM(RTRIM(ln.INT_RATE)) AS DECIMAL(8,4))          AS INTEREST_RATE,
                dw.fn_ParseFinancialAmount(ln.IRREGULARITY)                  AS IRREGULARITY,
                dw.fn_ParseFinancialAmount(ln.THEO_BAL)                      AS THEORETICAL_BALANCE,
                dw.fn_ParseDate(ln.SANCTION_DATE)                            AS SANCTION_DATE,
                LTRIM(RTRIM(ln.NEW_IRAC))                                     AS NEW_IRAC,
                LTRIM(RTRIM(ln.OLD_IRAC))                                     AS OLD_IRAC,
                TRY_CAST(ln.EMIS_DUE AS INT)                                 AS EMI_DUE,
                TRY_CAST(ln.EMIS_PAID AS INT)                                AS EMI_PAID,
                TRY_CAST(ln.EMIS_OVERDUE AS INT)                             AS EMI_OVERDUE,
                dw.fn_ParseFinancialAmount(ln.ADV_PAID_AMT)                  AS ADVANCE_PAID_AMT,
                LTRIM(RTRIM(ln.ARREAR_COND))                                  AS ARREAR_CONDITION,
                dw.fn_NormalizeBranchCode(ln.ACCT_MTAIN_BRCH)               AS ACCT_MAINTAIN_BRANCH,
                ln.REPORT_ID                                                  AS SOURCE_REPORT_ID,
                'LOANSBALANCEFILE_LOND2390'                                   AS SOURCE_TABLE
            FROM dbo.LOANSBALANCEFILE_LOND2390 ln
            WHERE ln.ACCOUNT_NO IS NOT NULL
              AND LTRIM(RTRIM(ln.ACCOUNT_NO)) <> ''
              AND (@SnapshotDate IS NULL OR dw.fn_ParseDate(ln.PROC_DATE) = @SnapshotDate);

            SET @rows = @@ROWCOUNT;
            SET @total_rows = @total_rows + @rows;
            PRINT '>> LOAN rows loaded: ' + CAST(@rows AS VARCHAR(10));
        END

        -- ================================================================
        -- 2c. CC/OD from CC_OD_BALANCE_FILE_DEPD0580
        -- ================================================================
        IF OBJECT_ID('dbo.CC_OD_BALANCE_FILE_DEPD0580', 'U') IS NOT NULL
        BEGIN
            IF @SnapshotDate IS NOT NULL
                DELETE FROM dw.FACT_ACCOUNT_SNAPSHOT
                WHERE SNAPSHOT_DATE = @SnapshotDate AND ACCOUNT_CATEGORY = 'CC_OD'
                  AND SOURCE_TABLE = 'CC_OD_BALANCE_FILE_DEPD0580';
            ELSE
                DELETE FROM dw.FACT_ACCOUNT_SNAPSHOT
                WHERE ACCOUNT_CATEGORY = 'CC_OD'
                  AND SOURCE_TABLE = 'CC_OD_BALANCE_FILE_DEPD0580';

            INSERT INTO dw.FACT_ACCOUNT_SNAPSHOT (
                SNAPSHOT_DATE, ACCOUNT_NO, CUSTOMER_NAME, BRANCH_CODE,
                ACCOUNT_CATEGORY, ACCOUNT_TYPE, CURRENT_BALANCE,
                UNCLEARED_BALANCE, SANCTIONED_LIMIT, DRAWING_POWER,
                IRREGULARITY, INTEREST_RATE, ACCOUNT_STATUS,
                ARREAR_CONDITION, LIMIT_EXPIRY_DATE, SANCTION_DATE,
                ACCT_MAINTAIN_BRANCH,
                SOURCE_REPORT_ID, SOURCE_TABLE
            )
            SELECT
                dw.fn_ParseDate(cc.PROC_DATE)                                AS SNAPSHOT_DATE,
                dw.fn_NormalizeAccountNo(cc.ACCOUNT_NUM)                     AS ACCOUNT_NO,
                LTRIM(RTRIM(cc.CUSTOMER_NAME))                                AS CUSTOMER_NAME,
                dw.fn_NormalizeBranchCode(cc.BRANCH_CODE)                    AS BRANCH_CODE,
                'CC_OD'                                                       AS ACCOUNT_CATEGORY,
                LTRIM(RTRIM(cc.ACCOUNT_TYP_DESC))                             AS ACCOUNT_TYPE,
                dw.fn_ParseFinancialAmount(cc.ACCOUNT_BALANCE)               AS CURRENT_BALANCE,
                dw.fn_ParseFinancialAmount(cc.UNCLEARED_BALANCE)             AS UNCLEARED_BALANCE,
                dw.fn_ParseFinancialAmount(cc.LIMIT)                         AS SANCTIONED_LIMIT,
                dw.fn_ParseFinancialAmount(cc.DRAWING_POWER)                 AS DRAWING_POWER,
                dw.fn_ParseFinancialAmount(cc.IRREGULARITY)                  AS IRREGULARITY,
                TRY_CAST(LTRIM(RTRIM(cc.RATE)) AS DECIMAL(8,4))              AS INTEREST_RATE,
                dw.fn_NormalizeAccountStatus(cc.STATUS)                      AS ACCOUNT_STATUS,
                LTRIM(RTRIM(cc.ARREAR_COND))                                  AS ARREAR_CONDITION,
                dw.fn_ParseDate(cc.LMT_EXPY_DT)                             AS LIMIT_EXPIRY_DATE,
                dw.fn_ParseDate(cc.SANCTION_DT)                              AS SANCTION_DATE,
                dw.fn_NormalizeBranchCode(cc.ACCT_MAINTAIN_BRANCH)           AS ACCT_MAINTAIN_BRANCH,
                cc.REPORT_ID                                                  AS SOURCE_REPORT_ID,
                'CC_OD_BALANCE_FILE_DEPD0580'                                AS SOURCE_TABLE
            FROM dbo.CC_OD_BALANCE_FILE_DEPD0580 cc
            WHERE cc.ACCOUNT_NUM IS NOT NULL
              AND LTRIM(RTRIM(cc.ACCOUNT_NUM)) <> ''
              AND (@SnapshotDate IS NULL OR dw.fn_ParseDate(cc.PROC_DATE) = @SnapshotDate);

            SET @rows = @@ROWCOUNT;
            SET @total_rows = @total_rows + @rows;
            PRINT '>> CC_OD rows loaded: ' + CAST(@rows AS VARCHAR(10));
        END

        COMMIT TRANSACTION;

        UPDATE dw.ETL_RUN_LOG
        SET STATUS = 'SUCCESS', ROWS_AFFECTED = @total_rows, COMPLETED_AT = SYSUTCDATETIME()
        WHERE RUN_ID = @run_id;

        PRINT '>> FACT_ACCOUNT_SNAPSHOT total loaded: ' + CAST(@total_rows AS VARCHAR(10));
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        SET @err = ERROR_MESSAGE();
        UPDATE dw.ETL_RUN_LOG
        SET STATUS = 'FAILED', ERROR_MESSAGE = @err, COMPLETED_AT = SYSUTCDATETIME()
        WHERE RUN_ID = @run_id;
        PRINT '>> ERROR in sp_Load_FACT_ACCOUNT_SNAPSHOT: ' + @err;
        THROW;
    END CATCH
END;
GO

-- ############################################################################
-- 3. sp_Load_FACT_LOAN_RISK_DELINQUENCY
--    Sources: NPA_STMT, LISTOF_NPA_ACCOUNTS_LOND2572,
--             PROBABLE_NPA_REPORT_LOND2463, ARREARS_BREAK_UP_LOND2498,
--             DRAWING_POWER_LOND2388, LOAN_IRREGULAR_REPORT,
--             IRREGULAR_EXCESS_DRAW_LOND2397CPC
-- ############################################################################
CREATE OR ALTER PROCEDURE dw.sp_Load_FACT_LOAN_RISK_DELINQUENCY
    @SnapshotDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @run_id BIGINT, @rows INT = 0, @total_rows INT = 0, @err NVARCHAR(4000);

    INSERT INTO dw.ETL_RUN_LOG (PROCEDURE_NAME, SNAPSHOT_DATE, STATUS)
    VALUES ('sp_Load_FACT_LOAN_RISK_DELINQUENCY', @SnapshotDate, 'RUNNING');
    SET @run_id = SCOPE_IDENTITY();

    BEGIN TRY
        BEGIN TRANSACTION;

        -- ================================================================
        -- 3a. Primary NPA data from NPA_STMT
        -- ================================================================
        IF OBJECT_ID('dbo.NPA_STMT', 'U') IS NOT NULL
        BEGIN
            IF @SnapshotDate IS NOT NULL
                DELETE FROM dw.FACT_LOAN_RISK_DELINQUENCY
                WHERE SNAPSHOT_DATE = @SnapshotDate
                  AND SOURCE_TABLE = 'NPA_STMT';
            ELSE
                DELETE FROM dw.FACT_LOAN_RISK_DELINQUENCY
                WHERE SOURCE_TABLE = 'NPA_STMT';

            INSERT INTO dw.FACT_LOAN_RISK_DELINQUENCY (
                SNAPSHOT_DATE, ACCOUNT_NO, CUSTOMER_NO, CUSTOMER_NAME,
                BRANCH_CODE, PRODUCT_DESCRIPTION, SYSTEM_CODE,
                NPA_CLASSIFICATION, OLD_IRAC, NEW_IRAC,
                NPA_DATE, LAST_ARREARS_DATE,
                BALANCE_OUTSTANDING, OVERDUE_INTEREST, INCA, UIPY,
                IRREGULAR_AMOUNT, IS_CONFIRMED_NPA,
                SOURCE_REPORT_ID, SOURCE_TABLE
            )
            SELECT
                dw.fn_ParseDate(npa.PROC_DATE)                               AS SNAPSHOT_DATE,
                dw.fn_NormalizeAccountNo(npa.ACCT_NO)                        AS ACCOUNT_NO,
                dw.fn_NormalizeCustomerID(npa.CUST_NO)                       AS CUSTOMER_NO,
                LTRIM(RTRIM(npa.NAME))                                        AS CUSTOMER_NAME,
                dw.fn_NormalizeBranchCode(
                    COALESCE(npa.BRANCH_CODE, npa.BR_NO)
                )                                                             AS BRANCH_CODE,
                LTRIM(RTRIM(npa.PROD_DESCRIPTION))                            AS PRODUCT_DESCRIPTION,
                LTRIM(RTRIM(npa.SYS))                                         AS SYSTEM_CODE,
                -- Derive NPA classification from NEW_IRAC numeric code
                dw.fn_NormalizeAssetClass(npa.NI)                            AS NPA_CLASSIFICATION,
                LTRIM(RTRIM(npa.OI))                                          AS OLD_IRAC,
                LTRIM(RTRIM(npa.NI))                                          AS NEW_IRAC,
                dw.fn_ParseDate(npa.NPA_DATE)                                AS NPA_DATE,
                dw.fn_ParseDate(npa.LST_ARR_D)                               AS LAST_ARREARS_DATE,
                dw.fn_ParseFinancialAmount(npa.BAL_OUTSTAND)                 AS BALANCE_OUTSTANDING,
                dw.fn_ParseFinancialAmount(npa.OVERDUE_INT)                  AS OVERDUE_INTEREST,
                dw.fn_ParseFinancialAmount(npa.INCA)                         AS INCA,
                dw.fn_ParseFinancialAmount(npa.UIPY)                         AS UIPY,
                dw.fn_ParseFinancialAmount(npa.IRR_AMT)                      AS IRREGULAR_AMOUNT,
                1                                                             AS IS_CONFIRMED_NPA,
                npa.REPORT_ID                                                 AS SOURCE_REPORT_ID,
                'NPA_STMT'                                                    AS SOURCE_TABLE
            FROM dbo.NPA_STMT npa
            WHERE npa.ACCT_NO IS NOT NULL
              AND LTRIM(RTRIM(npa.ACCT_NO)) <> ''
              AND (@SnapshotDate IS NULL OR dw.fn_ParseDate(npa.PROC_DATE) = @SnapshotDate);

            SET @rows = @@ROWCOUNT;
            SET @total_rows = @total_rows + @rows;
            PRINT '>> NPA_STMT rows loaded: ' + CAST(@rows AS VARCHAR(10));
        END

        -- ================================================================
        -- 3b. Confirmed NPA list from LISTOF_NPA_ACCOUNTS_LOND2572
        --     Merge into existing risk rows or insert new ones
        -- ================================================================
        IF OBJECT_ID('dbo.LISTOF_NPA_ACCOUNTS_LOND2572', 'U') IS NOT NULL
        BEGIN
            -- Insert only accounts not already loaded from NPA_STMT
            INSERT INTO dw.FACT_LOAN_RISK_DELINQUENCY (
                SNAPSHOT_DATE, ACCOUNT_NO, CUSTOMER_NAME, BRANCH_CODE,
                NPA_CLASSIFICATION, OLD_IRAC, NEW_IRAC, NPA_DATE,
                BALANCE_OUTSTANDING, INCA, UIPY, OUTSTANDING,
                ARREAR_CONDITION, IS_CONFIRMED_NPA,
                SOURCE_REPORT_ID, SOURCE_TABLE
            )
            SELECT
                dw.fn_ParseDate(npl.PROC_DATE)                               AS SNAPSHOT_DATE,
                dw.fn_NormalizeAccountNo(npl.ACCOUNT_NUMBER)                 AS ACCOUNT_NO,
                LTRIM(RTRIM(npl.CUSTOMER_NAME))                               AS CUSTOMER_NAME,
                dw.fn_NormalizeBranchCode(npl.BRANCH_CODE)                   AS BRANCH_CODE,
                dw.fn_NormalizeAssetClass(npl.NEW_IRAC)                      AS NPA_CLASSIFICATION,
                LTRIM(RTRIM(npl.OLD_IRAC))                                    AS OLD_IRAC,
                LTRIM(RTRIM(npl.NEW_IRAC))                                    AS NEW_IRAC,
                dw.fn_ParseDate(npl.NPA_DATE)                                AS NPA_DATE,
                dw.fn_ParseFinancialAmount(npl.OUTSTANDING)                  AS BALANCE_OUTSTANDING,
                dw.fn_ParseFinancialAmount(npl.INCA)                         AS INCA,
                dw.fn_ParseFinancialAmount(npl.UIPY)                         AS UIPY,
                dw.fn_ParseFinancialAmount(npl.OUTSTANDING)                  AS OUTSTANDING,
                LTRIM(RTRIM(npl.ARR_COND))                                    AS ARREAR_CONDITION,
                1                                                             AS IS_CONFIRMED_NPA,
                npl.REPORT_ID                                                 AS SOURCE_REPORT_ID,
                'LISTOF_NPA_ACCOUNTS_LOND2572'                               AS SOURCE_TABLE
            FROM dbo.LISTOF_NPA_ACCOUNTS_LOND2572 npl
            WHERE npl.ACCOUNT_NUMBER IS NOT NULL
              AND LTRIM(RTRIM(npl.ACCOUNT_NUMBER)) <> ''
              AND (@SnapshotDate IS NULL OR dw.fn_ParseDate(npl.PROC_DATE) = @SnapshotDate)
              AND NOT EXISTS (
                  SELECT 1 FROM dw.FACT_LOAN_RISK_DELINQUENCY r
                  WHERE r.ACCOUNT_NO = dw.fn_NormalizeAccountNo(npl.ACCOUNT_NUMBER)
                    AND r.SNAPSHOT_DATE = dw.fn_ParseDate(npl.PROC_DATE)
              );

            SET @rows = @@ROWCOUNT;
            SET @total_rows = @total_rows + @rows;
            PRINT '>> LOND2572 (NPA list) rows loaded: ' + CAST(@rows AS VARCHAR(10));
        END

        -- ================================================================
        -- 3c. Probable NPA from PROBABLE_NPA_REPORT_LOND2463
        -- ================================================================
        IF OBJECT_ID('dbo.PROBABLE_NPA_REPORT_LOND2463', 'U') IS NOT NULL
        BEGIN
            INSERT INTO dw.FACT_LOAN_RISK_DELINQUENCY (
                SNAPSHOT_DATE, ACCOUNT_NO, CUSTOMER_NAME, BRANCH_CODE,
                PRODUCT_DESCRIPTION, OUTSTANDING, LIMIT_AMOUNT,
                RISK_GRADE, IS_PROBABLE_NPA, IS_CONFIRMED_NPA,
                SOURCE_REPORT_ID, SOURCE_TABLE
            )
            SELECT
                dw.fn_ParseDate(pnpa.PROC_DATE)                              AS SNAPSHOT_DATE,
                dw.fn_NormalizeAccountNo(pnpa.ACCOUNT_NO)                    AS ACCOUNT_NO,
                LTRIM(RTRIM(pnpa.ACCOUNT_NAME))                               AS CUSTOMER_NAME,
                dw.fn_NormalizeBranchCode(pnpa.BRANCH_CODE)                  AS BRANCH_CODE,
                LTRIM(RTRIM(pnpa.FACILITY))                                   AS PRODUCT_DESCRIPTION,
                dw.fn_ParseFinancialAmount(pnpa.OUTSTANDING)                 AS OUTSTANDING,
                dw.fn_ParseFinancialAmount(pnpa.LIMIT)                       AS LIMIT_AMOUNT,
                LTRIM(RTRIM(pnpa.RISK_GRADE))                                 AS RISK_GRADE,
                1                                                             AS IS_PROBABLE_NPA,
                0                                                             AS IS_CONFIRMED_NPA,
                pnpa.REPORT_ID                                                AS SOURCE_REPORT_ID,
                'PROBABLE_NPA_REPORT_LOND2463'                               AS SOURCE_TABLE
            FROM dbo.PROBABLE_NPA_REPORT_LOND2463 pnpa
            WHERE pnpa.ACCOUNT_NO IS NOT NULL
              AND LTRIM(RTRIM(pnpa.ACCOUNT_NO)) <> ''
              AND (@SnapshotDate IS NULL OR dw.fn_ParseDate(pnpa.PROC_DATE) = @SnapshotDate)
              AND NOT EXISTS (
                  SELECT 1 FROM dw.FACT_LOAN_RISK_DELINQUENCY r
                  WHERE r.ACCOUNT_NO = dw.fn_NormalizeAccountNo(pnpa.ACCOUNT_NO)
                    AND r.SNAPSHOT_DATE = dw.fn_ParseDate(pnpa.PROC_DATE)
              );

            SET @rows = @@ROWCOUNT;
            SET @total_rows = @total_rows + @rows;
            PRINT '>> LOND2463 (Probable NPA) rows loaded: ' + CAST(@rows AS VARCHAR(10));
        END

        -- ================================================================
        -- 3d. Arrears aging from ARREARS_BREAK_UP_LOND2498
        --     Update existing risk rows with arrears slab data
        -- ================================================================
        IF OBJECT_ID('dbo.ARREARS_BREAK_UP_LOND2498', 'U') IS NOT NULL
        BEGIN
            -- Update arrears slabs on existing risk rows
            UPDATE r
            SET
                r.ARREARS_1D_28D  = dw.fn_ParseFinancialAmount(a.ARREARS_1D_28D),
                r.ARREARS_29D_3M  = dw.fn_ParseFinancialAmount(a.ARREARS_29D_3M),
                r.ARREARS_3M_6M   = dw.fn_ParseFinancialAmount(a.ARREARS_3M_6M),
                r.ARREARS_6M_1Y   = dw.fn_ParseFinancialAmount(a.ARREARS_6M_1Y),
                r.ARREARS_1Y_3Y   = dw.fn_ParseFinancialAmount(a.ARREARS_1Y_3Y),
                r.ARREARS_3Y_PLUS = ISNULL(dw.fn_ParseFinancialAmount(a.ARREARS_3Y_5Y), 0)
                                  + ISNULL(dw.fn_ParseFinancialAmount(a.ARREARS_5Y_7Y), 0)
                                  + ISNULL(dw.fn_ParseFinancialAmount(a.ARREARS_7Y_10Y), 0)
                                  + ISNULL(dw.fn_ParseFinancialAmount(a.ARREARS_10Y_15Y), 0)
                                  + ISNULL(dw.fn_ParseFinancialAmount(a.ARREARS_15Y_ABOVE), 0)
            FROM dw.FACT_LOAN_RISK_DELINQUENCY r
            INNER JOIN dbo.ARREARS_BREAK_UP_LOND2498 a
                ON dw.fn_NormalizeAccountNo(a.LOAN_ACCOUNT) = r.ACCOUNT_NO
                AND dw.fn_ParseDate(a.PROC_DATE) = r.SNAPSHOT_DATE
            WHERE (@SnapshotDate IS NULL OR r.SNAPSHOT_DATE = @SnapshotDate);

            SET @rows = @@ROWCOUNT;
            PRINT '>> LOND2498 (Arrears) rows updated: ' + CAST(@rows AS VARCHAR(10));

            -- Insert arrears for accounts not yet in the risk table
            INSERT INTO dw.FACT_LOAN_RISK_DELINQUENCY (
                SNAPSHOT_DATE, ACCOUNT_NO, BRANCH_CODE, PRODUCT_DESCRIPTION,
                BALANCE_OUTSTANDING,
                ARREARS_1D_28D, ARREARS_29D_3M, ARREARS_3M_6M,
                ARREARS_6M_1Y, ARREARS_1Y_3Y, ARREARS_3Y_PLUS,
                SOURCE_REPORT_ID, SOURCE_TABLE
            )
            SELECT
                dw.fn_ParseDate(a.PROC_DATE)                                 AS SNAPSHOT_DATE,
                dw.fn_NormalizeAccountNo(a.LOAN_ACCOUNT)                     AS ACCOUNT_NO,
                dw.fn_NormalizeBranchCode(a.BRANCH_CODE)                     AS BRANCH_CODE,
                LTRIM(RTRIM(a.PRODUCT_DESCRIPTION))                           AS PRODUCT_DESCRIPTION,
                dw.fn_ParseFinancialAmount(a.ACCOUNT_BALANCE)                AS BALANCE_OUTSTANDING,
                dw.fn_ParseFinancialAmount(a.ARREARS_1D_28D),
                dw.fn_ParseFinancialAmount(a.ARREARS_29D_3M),
                dw.fn_ParseFinancialAmount(a.ARREARS_3M_6M),
                dw.fn_ParseFinancialAmount(a.ARREARS_6M_1Y),
                dw.fn_ParseFinancialAmount(a.ARREARS_1Y_3Y),
                ISNULL(dw.fn_ParseFinancialAmount(a.ARREARS_3Y_5Y), 0)
                  + ISNULL(dw.fn_ParseFinancialAmount(a.ARREARS_5Y_7Y), 0)
                  + ISNULL(dw.fn_ParseFinancialAmount(a.ARREARS_7Y_10Y), 0)
                  + ISNULL(dw.fn_ParseFinancialAmount(a.ARREARS_10Y_15Y), 0)
                  + ISNULL(dw.fn_ParseFinancialAmount(a.ARREARS_15Y_ABOVE), 0),
                a.REPORT_ID,
                'ARREARS_BREAK_UP_LOND2498'
            FROM dbo.ARREARS_BREAK_UP_LOND2498 a
            WHERE a.LOAN_ACCOUNT IS NOT NULL
              AND LTRIM(RTRIM(a.LOAN_ACCOUNT)) <> ''
              AND (@SnapshotDate IS NULL OR dw.fn_ParseDate(a.PROC_DATE) = @SnapshotDate)
              AND NOT EXISTS (
                  SELECT 1 FROM dw.FACT_LOAN_RISK_DELINQUENCY r
                  WHERE r.ACCOUNT_NO = dw.fn_NormalizeAccountNo(a.LOAN_ACCOUNT)
                    AND r.SNAPSHOT_DATE = dw.fn_ParseDate(a.PROC_DATE)
              );

            SET @rows = @@ROWCOUNT;
            SET @total_rows = @total_rows + @rows;
            PRINT '>> LOND2498 (Arrears) new rows inserted: ' + CAST(@rows AS VARCHAR(10));
        END

        -- ================================================================
        -- 3e. Drawing Power from DRAWING_POWER_LOND2388
        -- ================================================================
        IF OBJECT_ID('dbo.DRAWING_POWER_LOND2388', 'U') IS NOT NULL
        BEGIN
            -- Update existing risk rows with DP data
            UPDATE r
            SET
                r.DRAWING_POWER    = dw.fn_ParseFinancialAmount(dp.DRAWING_POWER),
                r.DP_VARIANCE      = dw.fn_ParseFinancialAmount(dp.ACTUAL_VARIANCE),
                r.OUTSTANDING      = COALESCE(r.OUTSTANDING, dw.fn_ParseFinancialAmount(dp.OUTSTANDING)),
                r.BENCHMARK_LEVEL  = LTRIM(RTRIM(dp.BENCHMARK_LEVEL)),
                r.TOLERANCE_LEVEL  = LTRIM(RTRIM(dp.TOLERANCE_LEVEL))
            FROM dw.FACT_LOAN_RISK_DELINQUENCY r
            INNER JOIN dbo.DRAWING_POWER_LOND2388 dp
                ON dw.fn_NormalizeAccountNo(dp.ACCOUNT_NO) = r.ACCOUNT_NO
                AND dw.fn_ParseDate(dp.PROC_DATE) = r.SNAPSHOT_DATE
            WHERE (@SnapshotDate IS NULL OR r.SNAPSHOT_DATE = @SnapshotDate);

            SET @rows = @@ROWCOUNT;
            PRINT '>> LOND2388 (Drawing Power) rows updated: ' + CAST(@rows AS VARCHAR(10));
        END

        -- ================================================================
        -- 3f. Loan Irregular Report
        -- ================================================================
        IF OBJECT_ID('dbo.LOAN_IRREGULAR_REPORT', 'U') IS NOT NULL
        BEGIN
            INSERT INTO dw.FACT_LOAN_RISK_DELINQUENCY (
                SNAPSHOT_DATE, ACCOUNT_NO, CUSTOMER_NAME, BRANCH_CODE,
                PRODUCT_DESCRIPTION, OUTSTANDING, IRREGULAR_AMOUNT,
                OLD_IRAC, NEW_IRAC,
                SOURCE_REPORT_ID, SOURCE_TABLE
            )
            SELECT
                dw.fn_ParseDate(ir.PROC_DATE)                                AS SNAPSHOT_DATE,
                dw.fn_NormalizeAccountNo(ir.ACCOUNT_NO)                      AS ACCOUNT_NO,
                LTRIM(RTRIM(ir.NAME_OF_BORROWER))                             AS CUSTOMER_NAME,
                dw.fn_NormalizeBranchCode(ir.BRANCH_CODE)                    AS BRANCH_CODE,
                LTRIM(RTRIM(ir.DESCRIPT))                                      AS PRODUCT_DESCRIPTION,
                dw.fn_ParseFinancialAmount(ir.OUTSTANDING)                   AS OUTSTANDING,
                dw.fn_ParseFinancialAmount(ir.IRREGULARITY)                  AS IRREGULARITY,
                dw.fn_NormalizeAssetClass(ir.OLD_BAD_IND)                    AS OLD_IRAC,
                dw.fn_NormalizeAssetClass(ir.NEW_BAD_IND)                    AS NEW_IRAC,
                ir.REPORT_ID                                                  AS SOURCE_REPORT_ID,
                'LOAN_IRREGULAR_REPORT'                                      AS SOURCE_TABLE
            FROM dbo.LOAN_IRREGULAR_REPORT ir
            WHERE ir.ACCOUNT_NO IS NOT NULL
              AND LTRIM(RTRIM(ir.ACCOUNT_NO)) <> ''
              AND (@SnapshotDate IS NULL OR dw.fn_ParseDate(ir.PROC_DATE) = @SnapshotDate)
              AND NOT EXISTS (
                  SELECT 1 FROM dw.FACT_LOAN_RISK_DELINQUENCY r
                  WHERE r.ACCOUNT_NO = dw.fn_NormalizeAccountNo(ir.ACCOUNT_NO)
                    AND r.SNAPSHOT_DATE = dw.fn_ParseDate(ir.PROC_DATE)
              );

            SET @rows = @@ROWCOUNT;
            SET @total_rows = @total_rows + @rows;
            PRINT '>> LOAN_IRREGULAR_REPORT rows loaded: ' + CAST(@rows AS VARCHAR(10));
        END

        -- ================================================================
        -- 3g. Irregular Excess Draw from IRREGULAR_EXCESS_DRAW_LOND2397CPC
        -- ================================================================
        IF OBJECT_ID('dbo.IRREGULAR_EXCESS_DRAW_LOND2397CPC', 'U') IS NOT NULL
        BEGIN
            INSERT INTO dw.FACT_LOAN_RISK_DELINQUENCY (
                SNAPSHOT_DATE, ACCOUNT_NO, CUSTOMER_NAME, BRANCH_CODE,
                PRODUCT_DESCRIPTION, OUTSTANDING, LIMIT_AMOUNT,
                DRAWING_POWER, IRREGULAR_AMOUNT,
                SOURCE_REPORT_ID, SOURCE_TABLE
            )
            SELECT
                dw.fn_ParseDate(ied.PROC_DATE)                               AS SNAPSHOT_DATE,
                dw.fn_NormalizeAccountNo(ied.ACCOUNT_NUMBER)                 AS ACCOUNT_NO,
                LTRIM(RTRIM(ied.NAME_OF_BORROWER))                            AS CUSTOMER_NAME,
                dw.fn_NormalizeBranchCode(ied.BRANCH_CODE)                   AS BRANCH_CODE,
                LTRIM(RTRIM(ied.PRODUCT_SUBPRODUCT_TYPE))                     AS PRODUCT_DESCRIPTION,
                dw.fn_ParseFinancialAmount(ied.OUTSTANDING)                  AS OUTSTANDING,
                dw.fn_ParseFinancialAmount(ied.LIMIT_AMOUNT)                 AS LIMIT_AMOUNT,
                dw.fn_ParseFinancialAmount(ied.DRAWING_POWER)                AS DRAWING_POWER,
                dw.fn_ParseFinancialAmount(ied.IRREGULARITY)                 AS IRREGULARITY,
                ied.REPORT_ID                                                 AS SOURCE_REPORT_ID,
                'IRREGULAR_EXCESS_DRAW_LOND2397CPC'                          AS SOURCE_TABLE
            FROM dbo.IRREGULAR_EXCESS_DRAW_LOND2397CPC ied
            WHERE ied.ACCOUNT_NUMBER IS NOT NULL
              AND LTRIM(RTRIM(ied.ACCOUNT_NUMBER)) <> ''
              AND (@SnapshotDate IS NULL OR dw.fn_ParseDate(ied.PROC_DATE) = @SnapshotDate)
              AND NOT EXISTS (
                  SELECT 1 FROM dw.FACT_LOAN_RISK_DELINQUENCY r
                  WHERE r.ACCOUNT_NO = dw.fn_NormalizeAccountNo(ied.ACCOUNT_NUMBER)
                    AND r.SNAPSHOT_DATE = dw.fn_ParseDate(ied.PROC_DATE)
              );

            SET @rows = @@ROWCOUNT;
            SET @total_rows = @total_rows + @rows;
            PRINT '>> LOND2397CPC (Excess Draw) rows loaded: ' + CAST(@rows AS VARCHAR(10));
        END

        COMMIT TRANSACTION;

        UPDATE dw.ETL_RUN_LOG
        SET STATUS = 'SUCCESS', ROWS_AFFECTED = @total_rows, COMPLETED_AT = SYSUTCDATETIME()
        WHERE RUN_ID = @run_id;

        PRINT '>> FACT_LOAN_RISK_DELINQUENCY total loaded: ' + CAST(@total_rows AS VARCHAR(10));
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        SET @err = ERROR_MESSAGE();
        UPDATE dw.ETL_RUN_LOG
        SET STATUS = 'FAILED', ERROR_MESSAGE = @err, COMPLETED_AT = SYSUTCDATETIME()
        WHERE RUN_ID = @run_id;
        PRINT '>> ERROR in sp_Load_FACT_LOAN_RISK_DELINQUENCY: ' + @err;
        THROW;
    END CATCH
END;
GO

-- ############################################################################
-- 4. sp_Load_FACT_GL_PRODUCT_SUMMARY
--    Sources: GLCC_WISE_SUM_REP, GLCC_WISE_BAL_REP,
--             BAL_IN_LOAN_ACC_GLCC_WISE_SUM,
--             DAILY_PRODUCTWISE_REPORT_LOAN_DEP_CLEARING_GNBD7376
-- ############################################################################
CREATE OR ALTER PROCEDURE dw.sp_Load_FACT_GL_PRODUCT_SUMMARY
    @SnapshotDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @run_id BIGINT, @rows INT = 0, @total_rows INT = 0, @err NVARCHAR(4000);

    INSERT INTO dw.ETL_RUN_LOG (PROCEDURE_NAME, SNAPSHOT_DATE, STATUS)
    VALUES ('sp_Load_FACT_GL_PRODUCT_SUMMARY', @SnapshotDate, 'RUNNING');
    SET @run_id = SCOPE_IDENTITY();

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Idempotent delete for this date
        IF @SnapshotDate IS NOT NULL
            DELETE FROM dw.FACT_GL_PRODUCT_SUMMARY WHERE SNAPSHOT_DATE = @SnapshotDate;
        ELSE
            DELETE FROM dw.FACT_GL_PRODUCT_SUMMARY WHERE 1 = 1;

        -- ================================================================
        -- 4a. GLCC Summary from GLCC_WISE_SUM_REP
        -- ================================================================
        IF OBJECT_ID('dbo.GLCC_WISE_SUM_REP', 'U') IS NOT NULL
        BEGIN
            INSERT INTO dw.FACT_GL_PRODUCT_SUMMARY (
                SNAPSHOT_DATE, BRANCH_CODE, GL_CLASS_CODE, PRODUCT_NAME,
                ACCOUNT_COUNT, TOTAL_DR_BALANCE, TOTAL_CR_BALANCE,
                TOTAL_INTEREST, TOTAL_DR_OD_INT, TOTAL_UNCLEARED, TOTAL_COLLECTION,
                SOURCE_REPORT_ID, SOURCE_TABLE
            )
            SELECT
                dw.fn_ParseDate(gs.PROC_DATE)                                AS SNAPSHOT_DATE,
                dw.fn_NormalizeBranchCode(gs.BRANCH_CODE)                    AS BRANCH_CODE,
                LTRIM(RTRIM(gs.GL_CLASS_CODE))                                AS GL_CLASS_CODE,
                MAX(LTRIM(RTRIM(gs.NAME)))                                    AS PRODUCT_NAME,
                SUM(TRY_CAST(LTRIM(RTRIM(gs.ACT_TOTAL)) AS INT))             AS ACCOUNT_COUNT,
                SUM(dw.fn_ParseFinancialAmount(gs.TOTAL_AMOUNT))             AS TOTAL_DR_BALANCE,
                NULL                                                          AS TOTAL_CR_BALANCE,
                SUM(dw.fn_ParseFinancialAmount(gs.TOTAL_INTEREST))           AS TOTAL_INTEREST,
                SUM(dw.fn_ParseFinancialAmount(gs.TOTAL_DR_OD_INT))          AS TOTAL_DR_OD_INT,
                SUM(dw.fn_ParseFinancialAmount(gs.TOTAL_UNCLEARED_AMT))      AS TOTAL_UNCLEARED,
                SUM(dw.fn_ParseFinancialAmount(gs.TOTAL_COLLECTION_AMT))     AS TOTAL_COLLECTION,
                MIN(gs.REPORT_ID)                                             AS SOURCE_REPORT_ID,
                'GLCC_WISE_SUM_REP'                                          AS SOURCE_TABLE
            FROM dbo.GLCC_WISE_SUM_REP gs
            WHERE gs.GL_CLASS_CODE IS NOT NULL
              AND LTRIM(RTRIM(gs.GL_CLASS_CODE)) <> ''
              AND (@SnapshotDate IS NULL OR dw.fn_ParseDate(gs.PROC_DATE) = @SnapshotDate)
            GROUP BY 
                dw.fn_ParseDate(gs.PROC_DATE),
                dw.fn_NormalizeBranchCode(gs.BRANCH_CODE),
                LTRIM(RTRIM(gs.GL_CLASS_CODE));

            SET @rows = @@ROWCOUNT;
            SET @total_rows = @total_rows + @rows;
            PRINT '>> GLCC_WISE_SUM_REP rows loaded: ' + CAST(@rows AS VARCHAR(10));
        END

        -- ================================================================
        -- 4b. GLCC Detail aggregation from GLCC_WISE_BAL_REP
        --     Aggregate account-level into GLCC-level if not already loaded
        -- ================================================================
        IF OBJECT_ID('dbo.GLCC_WISE_BAL_REP', 'U') IS NOT NULL
        BEGIN
            INSERT INTO dw.FACT_GL_PRODUCT_SUMMARY (
                SNAPSHOT_DATE, BRANCH_CODE, GL_CLASS_CODE,
                ACCOUNT_COUNT, TOTAL_DR_BALANCE, TOTAL_CR_BALANCE,
                TOTAL_INTEREST, TOTAL_DR_OD_INT, TOTAL_UNCLEARED, TOTAL_COLLECTION,
                SOURCE_REPORT_ID, SOURCE_TABLE
            )
            SELECT
                dw.fn_ParseDate(gb.PROC_DATE)                                AS SNAPSHOT_DATE,
                dw.fn_NormalizeBranchCode(gb.BRANCH_CODE)                    AS BRANCH_CODE,
                LTRIM(RTRIM(gb.GL_CLASS_CODE))                                AS GL_CLASS_CODE,
                COUNT(*)                                                      AS ACCOUNT_COUNT,
                SUM(dw.fn_ParseFinancialAmount(gb.DR_BALANCE))               AS TOTAL_DR_BALANCE,
                SUM(dw.fn_ParseFinancialAmount(gb.CR_BALANCE))               AS TOTAL_CR_BALANCE,
                SUM(dw.fn_ParseFinancialAmount(gb.INT_BALANCE))              AS TOTAL_INTEREST,
                SUM(dw.fn_ParseFinancialAmount(gb.OD_DR_INT_BAL))            AS TOTAL_DR_OD_INT,
                SUM(dw.fn_ParseFinancialAmount(gb.UNCLRED_BAL))              AS TOTAL_UNCLEARED,
                SUM(dw.fn_ParseFinancialAmount(gb.COLL_AMT))                 AS TOTAL_COLLECTION,
                MIN(gb.REPORT_ID)                                             AS SOURCE_REPORT_ID,
                'GLCC_WISE_BAL_REP'                                          AS SOURCE_TABLE
            FROM dbo.GLCC_WISE_BAL_REP gb
            WHERE gb.GL_CLASS_CODE IS NOT NULL
              AND LTRIM(RTRIM(gb.GL_CLASS_CODE)) <> ''
              AND (@SnapshotDate IS NULL OR dw.fn_ParseDate(gb.PROC_DATE) = @SnapshotDate)
              -- Avoid duplicating GLCCs already loaded from SUM_REP
              AND NOT EXISTS (
                  SELECT 1 FROM dw.FACT_GL_PRODUCT_SUMMARY g
                  WHERE g.GL_CLASS_CODE = LTRIM(RTRIM(gb.GL_CLASS_CODE))
                    AND g.BRANCH_CODE = dw.fn_NormalizeBranchCode(gb.BRANCH_CODE)
                    AND g.SNAPSHOT_DATE = dw.fn_ParseDate(gb.PROC_DATE)
              )
            GROUP BY
                dw.fn_ParseDate(gb.PROC_DATE),
                dw.fn_NormalizeBranchCode(gb.BRANCH_CODE),
                LTRIM(RTRIM(gb.GL_CLASS_CODE));

            SET @rows = @@ROWCOUNT;
            SET @total_rows = @total_rows + @rows;
            PRINT '>> GLCC_WISE_BAL_REP rows loaded (aggregated): ' + CAST(@rows AS VARCHAR(10));
        END

        -- ================================================================
        -- 4c. Daily flow data from DAILY_PRODUCTWISE_REPORT GNBD7376
        --     Update existing GL rows with cash/clearing/transfer breakdowns
        -- ================================================================
        IF OBJECT_ID('dbo.DAILY_PRODUCTWISE_REPORT_LOAN_DEP_CLEARING_GNBD7376', 'U') IS NOT NULL
        BEGIN
            -- Aggregate daily flows by branch + prod_code and update matching GL rows
            ;WITH DailyFlows AS (
                SELECT
                    dw.fn_ParseDate(df.PROC_DATE)                            AS SNAPSHOT_DATE,
                    dw.fn_NormalizeBranchCode(df.BRANCH_CODE)                AS BRANCH_CODE,
                    LTRIM(RTRIM(df.PROD_CODE))                                AS PROD_CODE,
                    SUM(dw.fn_ParseFinancialAmount(df.CASH_CREDIT))          AS CASH_CR,
                    SUM(dw.fn_ParseFinancialAmount(df.CASH_DEBIT))           AS CASH_DR,
                    SUM(dw.fn_ParseFinancialAmount(df.CLEARING_CREDIT))      AS CLR_CR,
                    SUM(dw.fn_ParseFinancialAmount(df.CLEARING_DEBIT))       AS CLR_DR,
                    SUM(dw.fn_ParseFinancialAmount(df.TRANSFER_CREDIT))      AS TFR_CR,
                    SUM(dw.fn_ParseFinancialAmount(df.TRANSFER_DEBIT))       AS TFR_DR,
                    SUM(dw.fn_ParseFinancialAmount(df.PRODUCT_TOTAL_CREDIT)) AS TOT_CR,
                    SUM(dw.fn_ParseFinancialAmount(df.PRODUCT_TOTAL_DEBIT))  AS TOT_DR
                FROM dbo.DAILY_PRODUCTWISE_REPORT_LOAN_DEP_CLEARING_GNBD7376 df
                WHERE df.ACCOUNT_NO IS NOT NULL
                  AND LTRIM(RTRIM(df.ACCOUNT_NO)) <> ''
                  AND (@SnapshotDate IS NULL OR dw.fn_ParseDate(df.PROC_DATE) = @SnapshotDate)
                GROUP BY
                    dw.fn_ParseDate(df.PROC_DATE),
                    dw.fn_NormalizeBranchCode(df.BRANCH_CODE),
                    LTRIM(RTRIM(df.PROD_CODE))
            )
            UPDATE g
            SET
                g.DAILY_CASH_CREDIT  = f.CASH_CR,
                g.DAILY_CASH_DEBIT   = f.CASH_DR,
                g.DAILY_CLR_CREDIT   = f.CLR_CR,
                g.DAILY_CLR_DEBIT    = f.CLR_DR,
                g.DAILY_TFR_CREDIT   = f.TFR_CR,
                g.DAILY_TFR_DEBIT    = f.TFR_DR,
                g.DAILY_TOTAL_CREDIT = f.TOT_CR,
                g.DAILY_TOTAL_DEBIT  = f.TOT_DR
            FROM dw.FACT_GL_PRODUCT_SUMMARY g
            INNER JOIN DailyFlows f
                ON g.SNAPSHOT_DATE = f.SNAPSHOT_DATE
                AND g.BRANCH_CODE  = f.BRANCH_CODE
                AND g.GL_CLASS_CODE LIKE '%' + f.PROD_CODE + '%';

            SET @rows = @@ROWCOUNT;
            PRINT '>> GNBD7376 (Daily flows) rows updated: ' + CAST(@rows AS VARCHAR(10));

            -- Insert daily flow records for products not in GL summary
            ;WITH DailyFlows AS (
                SELECT
                    dw.fn_ParseDate(df.PROC_DATE)                            AS SNAPSHOT_DATE,
                    dw.fn_NormalizeBranchCode(df.BRANCH_CODE)                AS BRANCH_CODE,
                    LTRIM(RTRIM(df.PROD_CODE))                                AS GL_CLASS_CODE,
                    MAX(LTRIM(RTRIM(df.PROD_DESC)))                           AS PRODUCT_NAME,
                    COUNT(*)                                                   AS ACCOUNT_COUNT,
                    SUM(dw.fn_ParseFinancialAmount(df.CASH_CREDIT))          AS CASH_CR,
                    SUM(dw.fn_ParseFinancialAmount(df.CASH_DEBIT))           AS CASH_DR,
                    SUM(dw.fn_ParseFinancialAmount(df.CLEARING_CREDIT))      AS CLR_CR,
                    SUM(dw.fn_ParseFinancialAmount(df.CLEARING_DEBIT))       AS CLR_DR,
                    SUM(dw.fn_ParseFinancialAmount(df.TRANSFER_CREDIT))      AS TFR_CR,
                    SUM(dw.fn_ParseFinancialAmount(df.TRANSFER_DEBIT))       AS TFR_DR,
                    SUM(dw.fn_ParseFinancialAmount(df.PRODUCT_TOTAL_CREDIT)) AS TOT_CR,
                    SUM(dw.fn_ParseFinancialAmount(df.PRODUCT_TOTAL_DEBIT))  AS TOT_DR,
                    MIN(df.REPORT_ID)                                         AS REPORT_ID
                FROM dbo.DAILY_PRODUCTWISE_REPORT_LOAN_DEP_CLEARING_GNBD7376 df
                WHERE df.ACCOUNT_NO IS NOT NULL
                  AND LTRIM(RTRIM(df.ACCOUNT_NO)) <> ''
                  AND (@SnapshotDate IS NULL OR dw.fn_ParseDate(df.PROC_DATE) = @SnapshotDate)
                GROUP BY
                    dw.fn_ParseDate(df.PROC_DATE),
                    dw.fn_NormalizeBranchCode(df.BRANCH_CODE),
                    LTRIM(RTRIM(df.PROD_CODE))
            )
            INSERT INTO dw.FACT_GL_PRODUCT_SUMMARY (
                SNAPSHOT_DATE, BRANCH_CODE, GL_CLASS_CODE, PRODUCT_NAME, ACCOUNT_COUNT,
                DAILY_CASH_CREDIT, DAILY_CASH_DEBIT, DAILY_CLR_CREDIT, DAILY_CLR_DEBIT,
                DAILY_TFR_CREDIT, DAILY_TFR_DEBIT, DAILY_TOTAL_CREDIT, DAILY_TOTAL_DEBIT,
                SOURCE_REPORT_ID, SOURCE_TABLE
            )
            SELECT
                f.SNAPSHOT_DATE, f.BRANCH_CODE, f.GL_CLASS_CODE, f.PRODUCT_NAME, f.ACCOUNT_COUNT,
                f.CASH_CR, f.CASH_DR, f.CLR_CR, f.CLR_DR, f.TFR_CR, f.TFR_DR, f.TOT_CR, f.TOT_DR,
                f.REPORT_ID, 'GNBD7376'
            FROM DailyFlows f
            WHERE NOT EXISTS (
                SELECT 1 FROM dw.FACT_GL_PRODUCT_SUMMARY g
                WHERE g.SNAPSHOT_DATE = f.SNAPSHOT_DATE
                  AND g.BRANCH_CODE = f.BRANCH_CODE
                  AND g.GL_CLASS_CODE = f.GL_CLASS_CODE
            );

            SET @rows = @@ROWCOUNT;
            SET @total_rows = @total_rows + @rows;
            PRINT '>> GNBD7376 (Daily flows) new rows inserted: ' + CAST(@rows AS VARCHAR(10));
        END

        COMMIT TRANSACTION;

        UPDATE dw.ETL_RUN_LOG
        SET STATUS = 'SUCCESS', ROWS_AFFECTED = @total_rows, COMPLETED_AT = SYSUTCDATETIME()
        WHERE RUN_ID = @run_id;

        PRINT '>> FACT_GL_PRODUCT_SUMMARY total loaded: ' + CAST(@total_rows AS VARCHAR(10));
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        SET @err = ERROR_MESSAGE();
        UPDATE dw.ETL_RUN_LOG
        SET STATUS = 'FAILED', ERROR_MESSAGE = @err, COMPLETED_AT = SYSUTCDATETIME()
        WHERE RUN_ID = @run_id;
        PRINT '>> ERROR in sp_Load_FACT_GL_PRODUCT_SUMMARY: ' + @err;
        THROW;
    END CATCH
END;
GO

-- ############################################################################
-- 5. sp_Load_FACT_AUDIT_EXCEPTIONS
--    Sources: EXCEPTION_REPORT_DEPD0670, EXCEPTION_REPORT_FOR_INTEREST_RATES_VARIATION_DEPD0650,
--             REPORT_HIGH_VALUE_TRANSACTIONS, LIEN_MARKED_REMOVAL_DEPD0702,
--             AUDIT_BGL_ACCOUNTS_AGE_WISE_BREAK_UP_GEND0805
-- ############################################################################
CREATE OR ALTER PROCEDURE dw.sp_Load_FACT_AUDIT_EXCEPTIONS
    @SnapshotDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @run_id BIGINT, @rows INT = 0, @total_rows INT = 0, @err NVARCHAR(4000);

    INSERT INTO dw.ETL_RUN_LOG (PROCEDURE_NAME, SNAPSHOT_DATE, STATUS)
    VALUES ('sp_Load_FACT_AUDIT_EXCEPTIONS', @SnapshotDate, 'RUNNING');
    SET @run_id = SCOPE_IDENTITY();

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Idempotent delete
        IF @SnapshotDate IS NOT NULL
            DELETE FROM dw.FACT_AUDIT_EXCEPTIONS WHERE SNAPSHOT_DATE = @SnapshotDate;
        ELSE
            DELETE FROM dw.FACT_AUDIT_EXCEPTIONS WHERE 1 = 1;

        -- ================================================================
        -- 5a. Transaction Limit Breaches from EXCEPTION_REPORT_DEPD0670
        -- ================================================================
        IF OBJECT_ID('dbo.EXCEPTION_REPORT_DEPD0670', 'U') IS NOT NULL
        BEGIN
            INSERT INTO dw.FACT_AUDIT_EXCEPTIONS (
                SNAPSHOT_DATE, BRANCH_CODE, ACCOUNT_NO, CUSTOMER_NAME,
                EXCEPTION_TYPE, TRAN_CODE, JOURNAL_NO, AMOUNT,
                OUTSTANDING, LIMIT_AMOUNT, ERROR_DESC, SUP_ID, SUP_ERR_NO,
                SEVERITY, SOURCE_REPORT_ID, SOURCE_TABLE
            )
            SELECT
                dw.fn_ParseDate(ex.PROC_DATE)                                AS SNAPSHOT_DATE,
                dw.fn_NormalizeBranchCode(ex.BRANCH_CODE)                    AS BRANCH_CODE,
                dw.fn_NormalizeAccountNo(ex.ACCOUNT_NO)                      AS ACCOUNT_NO,
                LTRIM(RTRIM(ex.CUSTOMER_NAME))                                AS CUSTOMER_NAME,
                'TXN_LIMIT_BREACH'                                            AS EXCEPTION_TYPE,
                LTRIM(RTRIM(ex.TRAN_CODE))                                    AS TRAN_CODE,
                LTRIM(RTRIM(ex.JRNL_NO))                                      AS JOURNAL_NO,
                dw.fn_ParseFinancialAmount(ex.AMOUNT)                        AS AMOUNT,
                dw.fn_ParseFinancialAmount(ex.OUTSTANDING)                   AS OUTSTANDING,
                dw.fn_ParseFinancialAmount(ex.LIMIT_AMOUNT)                  AS LIMIT_AMOUNT,
                LTRIM(RTRIM(ex.ERROR_DESC))                                    AS ERROR_DESC,
                LTRIM(RTRIM(ex.SUP_ID))                                        AS SUP_ID,
                LTRIM(RTRIM(ex.SUP_ERR_NO))                                    AS SUP_ERR_NO,
                -- Auto-calculate severity based on amount vs limit
                CASE
                    WHEN dw.fn_ParseFinancialAmount(ex.AMOUNT) >= 1000000  THEN 'CRITICAL'
                    WHEN dw.fn_ParseFinancialAmount(ex.AMOUNT) >= 500000   THEN 'HIGH'
                    WHEN dw.fn_ParseFinancialAmount(ex.AMOUNT) >= 100000   THEN 'MEDIUM'
                    ELSE 'LOW'
                END                                                           AS SEVERITY,
                ex.REPORT_ID                                                  AS SOURCE_REPORT_ID,
                'EXCEPTION_REPORT_DEPD0670'                                  AS SOURCE_TABLE
            FROM dbo.EXCEPTION_REPORT_DEPD0670 ex
            WHERE ex.ACCOUNT_NO IS NOT NULL
              AND LTRIM(RTRIM(ex.ACCOUNT_NO)) <> ''
              AND (@SnapshotDate IS NULL OR dw.fn_ParseDate(ex.PROC_DATE) = @SnapshotDate);

            SET @rows = @@ROWCOUNT;
            SET @total_rows = @total_rows + @rows;
            PRINT '>> DEPD0670 (TXN Limit) rows loaded: ' + CAST(@rows AS VARCHAR(10));
        END

        -- ================================================================
        -- 5b. Interest Rate Variances from DEPD0650
        -- ================================================================
        IF OBJECT_ID('dbo.EXCEPTION_REPORT_FOR_INTEREST_RATES_VARIATION_DEPD0650', 'U') IS NOT NULL
        BEGIN
            INSERT INTO dw.FACT_AUDIT_EXCEPTIONS (
                SNAPSHOT_DATE, BRANCH_CODE, ACCOUNT_NO, CUSTOMER_NAME,
                EXCEPTION_TYPE, SANCTION_AMOUNT, ACCOUNT_TYPE, SUB_TYPE,
                PRODUCT_INT_RATE, EFFECTIVE_INT_RATE, RATE_VARIANCE,
                SEVERITY, SOURCE_REPORT_ID, SOURCE_TABLE
            )
            SELECT
                dw.fn_ParseDate(irv.PROC_DATE)                               AS SNAPSHOT_DATE,
                dw.fn_NormalizeBranchCode(irv.BRANCH_CODE)                   AS BRANCH_CODE,
                dw.fn_NormalizeAccountNo(irv.ACCOUNT_NUMBER)                 AS ACCOUNT_NO,
                LTRIM(RTRIM(irv.CUSTOMER_NAME))                               AS CUSTOMER_NAME,
                'INT_RATE_VARIANCE'                                           AS EXCEPTION_TYPE,
                dw.fn_ParseFinancialAmount(irv.SANCTION_AMOUNT)              AS SANCTION_AMOUNT,
                LTRIM(RTRIM(irv.ACCT_TYPE))                                    AS ACCOUNT_TYPE,
                LTRIM(RTRIM(irv.SUB_TYPE))                                     AS SUB_TYPE,
                TRY_CAST(LTRIM(RTRIM(irv.PRODUCT_INT_RATE)) AS DECIMAL(8,4)) AS PRODUCT_INT_RATE,
                TRY_CAST(LTRIM(RTRIM(irv.EFFECTIVE_INT_RATE)) AS DECIMAL(8,4)) AS EFFECTIVE_INT_RATE,
                -- Compute variance
                ABS(
                    ISNULL(TRY_CAST(LTRIM(RTRIM(irv.EFFECTIVE_INT_RATE)) AS DECIMAL(8,4)), 0)
                  - ISNULL(TRY_CAST(LTRIM(RTRIM(irv.PRODUCT_INT_RATE)) AS DECIMAL(8,4)), 0)
                )                                                             AS RATE_VARIANCE,
                CASE
                    WHEN ABS(
                        ISNULL(TRY_CAST(irv.EFFECTIVE_INT_RATE AS DECIMAL(8,4)), 0)
                      - ISNULL(TRY_CAST(irv.PRODUCT_INT_RATE AS DECIMAL(8,4)), 0)
                    ) >= 2.0 THEN 'CRITICAL'
                    WHEN ABS(
                        ISNULL(TRY_CAST(irv.EFFECTIVE_INT_RATE AS DECIMAL(8,4)), 0)
                      - ISNULL(TRY_CAST(irv.PRODUCT_INT_RATE AS DECIMAL(8,4)), 0)
                    ) >= 1.0 THEN 'HIGH'
                    WHEN ABS(
                        ISNULL(TRY_CAST(irv.EFFECTIVE_INT_RATE AS DECIMAL(8,4)), 0)
                      - ISNULL(TRY_CAST(irv.PRODUCT_INT_RATE AS DECIMAL(8,4)), 0)
                    ) >= 0.5 THEN 'MEDIUM'
                    ELSE 'LOW'
                END                                                           AS SEVERITY,
                irv.REPORT_ID                                                 AS SOURCE_REPORT_ID,
                'EXCEPTION_REPORT_FOR_INTEREST_RATES_VARIATION_DEPD0650'     AS SOURCE_TABLE
            FROM dbo.EXCEPTION_REPORT_FOR_INTEREST_RATES_VARIATION_DEPD0650 irv
            WHERE irv.ACCOUNT_NUMBER IS NOT NULL
              AND LTRIM(RTRIM(irv.ACCOUNT_NUMBER)) <> ''
              AND (@SnapshotDate IS NULL OR dw.fn_ParseDate(irv.PROC_DATE) = @SnapshotDate);

            SET @rows = @@ROWCOUNT;
            SET @total_rows = @total_rows + @rows;
            PRINT '>> DEPD0650 (Rate Variance) rows loaded: ' + CAST(@rows AS VARCHAR(10));
        END

        -- ================================================================
        -- 5c. High-Value Transactions from REPORT_HIGH_VALUE_TRANSACTIONS
        -- ================================================================
        IF OBJECT_ID('dbo.REPORT_HIGH_VALUE_TRANSACTIONS', 'U') IS NOT NULL
        BEGIN
            INSERT INTO dw.FACT_AUDIT_EXCEPTIONS (
                SNAPSHOT_DATE, BRANCH_CODE, ACCOUNT_NO, CUSTOMER_NAME,
                EXCEPTION_TYPE, AMOUNT, TRANSACTION_DATE, NARRATION,
                SEVERITY, SOURCE_REPORT_ID, SOURCE_TABLE
            )
            SELECT
                dw.fn_ParseDate(hvt.PROC_DATE)                               AS SNAPSHOT_DATE,
                dw.fn_NormalizeBranchCode(hvt.BRANCH_CODE)                   AS BRANCH_CODE,
                dw.fn_NormalizeAccountNo(hvt.ACCOUNT_NO)                     AS ACCOUNT_NO,
                LTRIM(RTRIM(hvt.ACCOUNT_NAME))                                AS CUSTOMER_NAME,
                'HIGH_VALUE_TXN'                                              AS EXCEPTION_TYPE,
                dw.fn_ParseFinancialAmount(hvt.AMOUNT)                       AS AMOUNT,
                dw.fn_ParseDate(hvt.TRANS_DATE)                              AS TRANSACTION_DATE,
                LTRIM(RTRIM(hvt.NARRATION))                                    AS NARRATION,
                CASE
                    WHEN ABS(ISNULL(dw.fn_ParseFinancialAmount(hvt.AMOUNT), 0)) >= 5000000 THEN 'CRITICAL'
                    WHEN ABS(ISNULL(dw.fn_ParseFinancialAmount(hvt.AMOUNT), 0)) >= 1000000 THEN 'HIGH'
                    ELSE 'MEDIUM'
                END                                                           AS SEVERITY,
                hvt.REPORT_ID                                                 AS SOURCE_REPORT_ID,
                'REPORT_HIGH_VALUE_TRANSACTIONS'                             AS SOURCE_TABLE
            FROM dbo.REPORT_HIGH_VALUE_TRANSACTIONS hvt
            WHERE hvt.ACCOUNT_NO IS NOT NULL
              AND LTRIM(RTRIM(hvt.ACCOUNT_NO)) <> ''
              AND (@SnapshotDate IS NULL OR dw.fn_ParseDate(hvt.PROC_DATE) = @SnapshotDate);

            SET @rows = @@ROWCOUNT;
            SET @total_rows = @total_rows + @rows;
            PRINT '>> HVT rows loaded: ' + CAST(@rows AS VARCHAR(10));
        END

        -- ================================================================
        -- 5d. Lien Operations from LIEN_MARKED_REMOVAL_DEPD0702
        -- ================================================================
        IF OBJECT_ID('dbo.LIEN_MARKED_REMOVAL_DEPD0702', 'U') IS NOT NULL
        BEGIN
            INSERT INTO dw.FACT_AUDIT_EXCEPTIONS (
                SNAPSHOT_DATE, BRANCH_CODE, ACCOUNT_NO,
                EXCEPTION_TYPE, ACCOUNT_TYPE, LIEN_AMOUNT,
                LIEN_ACTION, LIEN_REASON, USER_ID, CHECKER_ID,
                SEVERITY, SOURCE_REPORT_ID, SOURCE_TABLE
            )
            SELECT
                dw.fn_ParseDate(lm.PROC_DATE)                               AS SNAPSHOT_DATE,
                dw.fn_NormalizeBranchCode(lm.BRANCH_CODE)                    AS BRANCH_CODE,
                dw.fn_NormalizeAccountNo(lm.ACCOUNT_NO)                      AS ACCOUNT_NO,
                'LIEN_OPERATION'                                              AS EXCEPTION_TYPE,
                LTRIM(RTRIM(lm.TYPE_OF_ACCOUNT))                              AS ACCOUNT_TYPE,
                dw.fn_ParseFinancialAmount(lm.LIEN_AMOUNT)                   AS LIEN_AMOUNT,
                CASE LTRIM(RTRIM(UPPER(lm.MARK_REM)))
                    WHEN 'MARK' THEN 'MARK'
                    WHEN 'REM'  THEN 'REMOVE'
                    ELSE LTRIM(RTRIM(lm.MARK_REM))
                END                                                           AS LIEN_ACTION,
                LTRIM(RTRIM(lm.REASON))                                        AS LIEN_REASON,
                LTRIM(RTRIM(lm.USER_ID))                                       AS USER_ID,
                LTRIM(RTRIM(lm.CHK_ID))                                        AS CHECKER_ID,
                CASE
                    WHEN ABS(ISNULL(dw.fn_ParseFinancialAmount(lm.LIEN_AMOUNT), 0)) >= 500000 THEN 'HIGH'
                    WHEN ABS(ISNULL(dw.fn_ParseFinancialAmount(lm.LIEN_AMOUNT), 0)) >= 100000 THEN 'MEDIUM'
                    ELSE 'LOW'
                END                                                           AS SEVERITY,
                lm.REPORT_ID                                                  AS SOURCE_REPORT_ID,
                'LIEN_MARKED_REMOVAL_DEPD0702'                               AS SOURCE_TABLE
            FROM dbo.LIEN_MARKED_REMOVAL_DEPD0702 lm
            WHERE lm.ACCOUNT_NO IS NOT NULL
              AND LTRIM(RTRIM(lm.ACCOUNT_NO)) <> ''
              AND (@SnapshotDate IS NULL OR dw.fn_ParseDate(lm.PROC_DATE) = @SnapshotDate);

            SET @rows = @@ROWCOUNT;
            SET @total_rows = @total_rows + @rows;
            PRINT '>> DEPD0702 (Lien) rows loaded: ' + CAST(@rows AS VARCHAR(10));
        END

        COMMIT TRANSACTION;

        UPDATE dw.ETL_RUN_LOG
        SET STATUS = 'SUCCESS', ROWS_AFFECTED = @total_rows, COMPLETED_AT = SYSUTCDATETIME()
        WHERE RUN_ID = @run_id;

        PRINT '>> FACT_AUDIT_EXCEPTIONS total loaded: ' + CAST(@total_rows AS VARCHAR(10));
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        SET @err = ERROR_MESSAGE();
        UPDATE dw.ETL_RUN_LOG
        SET STATUS = 'FAILED', ERROR_MESSAGE = @err, COMPLETED_AT = SYSUTCDATETIME()
        WHERE RUN_ID = @run_id;
        PRINT '>> ERROR in sp_Load_FACT_AUDIT_EXCEPTIONS: ' + @err;
        THROW;
    END CATCH
END;
GO

-- ############################################################################
-- 6. sp_RunFullETL — Master Orchestrator
-- ############################################################################
CREATE OR ALTER PROCEDURE dw.sp_RunFullETL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @run_id BIGINT, @err NVARCHAR(4000);
    DECLARE @start_time DATETIME2(3) = SYSUTCDATETIME();

    INSERT INTO dw.ETL_RUN_LOG (PROCEDURE_NAME, STATUS)
    VALUES ('sp_RunFullETL', 'RUNNING');
    SET @run_id = SCOPE_IDENTITY();

    PRINT '==========================================================';
    PRINT '  FULL ETL RUN STARTED AT ' + CONVERT(VARCHAR(30), @start_time, 121);
    PRINT '==========================================================';

    BEGIN TRY
        -- Step 1: Dimension
        PRINT '>> Step 1/5: Loading DIM_BRANCH_HIERARCHY...';
        EXEC dw.sp_Load_DIM_BRANCH_HIERARCHY;

        -- Step 2: Account Snapshot
        PRINT '>> Step 2/5: Loading FACT_ACCOUNT_SNAPSHOT...';
        EXEC dw.sp_Load_FACT_ACCOUNT_SNAPSHOT @SnapshotDate = NULL;

        -- Step 3: Loan Risk
        PRINT '>> Step 3/5: Loading FACT_LOAN_RISK_DELINQUENCY...';
        EXEC dw.sp_Load_FACT_LOAN_RISK_DELINQUENCY @SnapshotDate = NULL;

        -- Step 4: GL Product Summary
        PRINT '>> Step 4/5: Loading FACT_GL_PRODUCT_SUMMARY...';
        EXEC dw.sp_Load_FACT_GL_PRODUCT_SUMMARY @SnapshotDate = NULL;

        -- Step 5: Audit Exceptions
        PRINT '>> Step 5/7: Loading FACT_AUDIT_EXCEPTIONS...';
        EXEC dw.sp_Load_FACT_AUDIT_EXCEPTIONS @SnapshotDate = NULL;

        -- Step 6: Account Opened
        PRINT '>> Step 6/7: Loading FACT_ACCOUNT_OPENED...';
        EXEC dw.sp_Load_FACT_ACCOUNT_OPENED;

        -- Step 7: Account Closed
        PRINT '>> Step 7/7: Loading FACT_ACCOUNT_CLOSED...';
        EXEC dw.sp_Load_FACT_ACCOUNT_CLOSED;

        UPDATE dw.ETL_RUN_LOG
        SET STATUS = 'SUCCESS', COMPLETED_AT = SYSUTCDATETIME()
        WHERE RUN_ID = @run_id;

        PRINT '==========================================================';
        PRINT '  FULL ETL RUN COMPLETED SUCCESSFULLY';
        PRINT '  Duration: ' + CAST(DATEDIFF(SECOND, @start_time, SYSUTCDATETIME()) AS VARCHAR(10)) + ' seconds';
        PRINT '==========================================================';
    END TRY
    BEGIN CATCH
        SET @err = ERROR_MESSAGE();
        UPDATE dw.ETL_RUN_LOG
        SET STATUS = 'FAILED', ERROR_MESSAGE = @err, COMPLETED_AT = SYSUTCDATETIME()
        WHERE RUN_ID = @run_id;

        PRINT '==========================================================';
        PRINT '  FULL ETL RUN FAILED: ' + @err;
        PRINT '==========================================================';
    END CATCH
END;
GO

-- ############################################################################
-- 7. sp_RunIncrementalETL — Date-Filtered ETL
-- ############################################################################
CREATE OR ALTER PROCEDURE dw.sp_RunIncrementalETL
    @SnapshotDate DATE
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @run_id BIGINT, @err NVARCHAR(4000);
    DECLARE @start_time DATETIME2(3) = SYSUTCDATETIME();

    IF @SnapshotDate IS NULL
    BEGIN
        RAISERROR('sp_RunIncrementalETL requires a @SnapshotDate parameter.', 16, 1);
        RETURN;
    END

    INSERT INTO dw.ETL_RUN_LOG (PROCEDURE_NAME, SNAPSHOT_DATE, STATUS)
    VALUES ('sp_RunIncrementalETL', @SnapshotDate, 'RUNNING');
    SET @run_id = SCOPE_IDENTITY();

    PRINT '==========================================================';
    PRINT '  INCREMENTAL ETL FOR ' + CONVERT(VARCHAR(10), @SnapshotDate, 23);
    PRINT '==========================================================';

    BEGIN TRY
        EXEC dw.sp_Load_DIM_BRANCH_HIERARCHY;
        EXEC dw.sp_Load_FACT_ACCOUNT_SNAPSHOT    @SnapshotDate = @SnapshotDate;
        EXEC dw.sp_Load_FACT_LOAN_RISK_DELINQUENCY @SnapshotDate = @SnapshotDate;
        EXEC dw.sp_Load_FACT_GL_PRODUCT_SUMMARY  @SnapshotDate = @SnapshotDate;
        EXEC dw.sp_Load_FACT_AUDIT_EXCEPTIONS    @SnapshotDate = @SnapshotDate;

        UPDATE dw.ETL_RUN_LOG
        SET STATUS = 'SUCCESS', COMPLETED_AT = SYSUTCDATETIME()
        WHERE RUN_ID = @run_id;

        PRINT '>> Incremental ETL completed in '
            + CAST(DATEDIFF(SECOND, @start_time, SYSUTCDATETIME()) AS VARCHAR(10)) + ' seconds.';
    END TRY
    BEGIN CATCH
        SET @err = ERROR_MESSAGE();
        UPDATE dw.ETL_RUN_LOG
        SET STATUS = 'FAILED', ERROR_MESSAGE = @err, COMPLETED_AT = SYSUTCDATETIME()
        WHERE RUN_ID = @run_id;
        PRINT '>> ERROR in sp_RunIncrementalETL: ' + @err;
    END CATCH
END;
GO

PRINT '============================================================';
PRINT '  07_etl_procedures.sql completed successfully.';
PRINT '  Created 8 objects (1 function + 7 procedures).';
PRINT '============================================================';
GO
-- ############################################################################
-- 5B. sp_Load_FACT_ACCOUNT_OPENED
-- ############################################################################
CREATE OR ALTER PROCEDURE dw.sp_Load_FACT_ACCOUNT_OPENED
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @run_id BIGINT, @err NVARCHAR(4000), @rows INT = 0;

    INSERT INTO dw.ETL_RUN_LOG (PROCEDURE_NAME, STATUS)
    VALUES ('sp_Load_FACT_ACCOUNT_OPENED', 'RUNNING');
    SET @run_id = SCOPE_IDENTITY();

    BEGIN TRY
        IF dw.fn_TableExists('ACCOUNT_OPENED_REPORT') = 1
        BEGIN
            BEGIN TRANSACTION;
            TRUNCATE TABLE dw.FACT_ACCOUNT_OPENED;
            
            INSERT INTO dw.FACT_ACCOUNT_OPENED (
                OPENED_DATE, ACCOUNT_NO, CUSTOMER_NAME, BRANCH_CODE,
                ACCOUNT_CATEGORY, PRODUCT_CODE, BALANCE
            )
            SELECT
                dw.fn_ParseDate(OPENED_DATE),
                dw.fn_NormalizeAccountNo(ACCOUNT_NUMBER),
                LTRIM(RTRIM(ACCOUNT_NAME)),
                dw.fn_NormalizeBranchCode(BRANCH_CODE),
                CASE 
                    WHEN PRODUCT LIKE '6%' THEN 'LOAN'
                    WHEN PRODUCT LIKE '3%' OR PRODUCT LIKE '5%' OR PRODUCT LIKE '1%' OR PRODUCT LIKE '2%' THEN 'DEPOSIT'
                    ELSE 'DEPOSIT'
                END,
                LTRIM(RTRIM(PRODUCT)),
                CAST(ISNULL(NULLIF(REPLACE(BALANCE, ',', ''), ''), '0') AS DECIMAL(18,2))
            FROM dbo.ACCOUNT_OPENED_REPORT;
            
            SET @rows = @@ROWCOUNT;
            COMMIT TRANSACTION;
        END

        UPDATE dw.ETL_RUN_LOG
        SET STATUS = 'SUCCESS', ROWS_AFFECTED = @rows, COMPLETED_AT = SYSUTCDATETIME()
        WHERE RUN_ID = @run_id;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        SET @err = ERROR_MESSAGE();
        UPDATE dw.ETL_RUN_LOG
        SET STATUS = 'FAILED', ERROR_MESSAGE = @err, COMPLETED_AT = SYSUTCDATETIME()
        WHERE RUN_ID = @run_id;
        THROW;
    END CATCH
END;
GO

-- ############################################################################
-- 5C. sp_Load_FACT_ACCOUNT_CLOSED
-- ############################################################################
CREATE OR ALTER PROCEDURE dw.sp_Load_FACT_ACCOUNT_CLOSED
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @run_id BIGINT, @err NVARCHAR(4000), @rows INT = 0;

    INSERT INTO dw.ETL_RUN_LOG (PROCEDURE_NAME, STATUS)
    VALUES ('sp_Load_FACT_ACCOUNT_CLOSED', 'RUNNING');
    SET @run_id = SCOPE_IDENTITY();

    BEGIN TRY
        IF dw.fn_TableExists('ACCOUNT_CLOSED_REPORT') = 1
        BEGIN
            BEGIN TRANSACTION;
            TRUNCATE TABLE dw.FACT_ACCOUNT_CLOSED;
            
            INSERT INTO dw.FACT_ACCOUNT_CLOSED (
                CLOSED_DATE, ACCOUNT_NO, CUSTOMER_NAME, BRANCH_CODE,
                ACCOUNT_CATEGORY, PRODUCT_CODE
            )
            SELECT
                dw.fn_ParseDate(CLOSED_DATE),
                dw.fn_NormalizeAccountNo(ACCOUNT_NUMBER),
                LTRIM(RTRIM(ACCOUNT_NAME)),
                dw.fn_NormalizeBranchCode(BRANCH_CODE),
                CASE 
                    WHEN PRODUCT LIKE '6%' THEN 'LOAN'
                    WHEN PRODUCT LIKE '3%' OR PRODUCT LIKE '5%' OR PRODUCT LIKE '1%' OR PRODUCT LIKE '2%' THEN 'DEPOSIT'
                    ELSE 'DEPOSIT'
                END,
                LTRIM(RTRIM(PRODUCT))
            FROM dbo.ACCOUNT_CLOSED_REPORT;
            
            SET @rows = @@ROWCOUNT;
            COMMIT TRANSACTION;
        END

        UPDATE dw.ETL_RUN_LOG
        SET STATUS = 'SUCCESS', ROWS_AFFECTED = @rows, COMPLETED_AT = SYSUTCDATETIME()
        WHERE RUN_ID = @run_id;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        SET @err = ERROR_MESSAGE();
        UPDATE dw.ETL_RUN_LOG
        SET STATUS = 'FAILED', ERROR_MESSAGE = @err, COMPLETED_AT = SYSUTCDATETIME()
        WHERE RUN_ID = @run_id;
        THROW;
    END CATCH
END;
GO
