/*******************************************************************************
 * 09_dashboard_queries.sql
 * Banking MIS Data Warehouse — Production Dashboard Queries
 *
 * 8 high-performance SQL queries for the React dashboard:
 *   1. Executive Overview KPIs
 *   2. Business Mix & Product Portfolio
 *   3. Product Portfolio Top-10
 *   4. NPA Classification Breakdown
 *   5. Arrears Aging Slabs Distribution
 *   6. Top/Bottom Branches by Deposits
 *   7. Top/Bottom Branches by Advances
 *   8. Top/Bottom Branches by NPA
 *
 * All queries are RLS-transparent — security predicates auto-apply
 * based on SESSION_CONTEXT('user_login').
 *
 * Parameter: @ReportDate DATE — the snapshot date to query.
 * If not specified, uses the latest available date.
 *
 * Target: MIS_DATABASE on DESKTOP-CNDH3DO
 ******************************************************************************/

USE MIS_DATABASE;
GO

-- ============================================================================
-- QUERY 1: Executive Overview KPIs
-- Returns a single row of bank-wide (or RLS-filtered) headline metrics.
-- ============================================================================
CREATE OR ALTER PROCEDURE dw.sp_Dashboard_ExecutiveKPIs
    @ReportDate DATE = NULL,
    @BranchCode VARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Default to latest available date
    IF @ReportDate IS NULL
        SELECT @ReportDate = MAX(SNAPSHOT_DATE) FROM dw.FACT_ACCOUNT_SNAPSHOT;

    SELECT
        @ReportDate                                                          AS REPORT_DATE,

        -- Account counts
        SUM(CASE WHEN ACCOUNT_CATEGORY = 'DEPOSIT' THEN 1 ELSE 0 END) AS TOTAL_DEPOSIT_ACCOUNTS,
        SUM(CASE WHEN ACCOUNT_CATEGORY = 'LOAN' THEN 1 ELSE 0 END) AS TOTAL_LOAN_ACCOUNTS,
        SUM(CASE WHEN ACCOUNT_CATEGORY = 'CC_OD' THEN 1 ELSE 0 END) AS TOTAL_CCOD_ACCOUNTS,
        COUNT(ACCOUNT_NO)                                           AS TOTAL_ACCOUNTS,

        -- Volume metrics
        SUM(CASE WHEN ACCOUNT_CATEGORY = 'DEPOSIT'
            THEN ISNULL(CURRENT_BALANCE, 0) ELSE 0 END)                      AS TOTAL_DEPOSITS,
        SUM(CASE WHEN ACCOUNT_CATEGORY = 'LOAN'
            THEN ISNULL(OUTSTANDING, 0) ELSE 0 END)                          AS TOTAL_ADVANCES,
        SUM(CASE WHEN ACCOUNT_CATEGORY = 'CC_OD'
            THEN ABS(ISNULL(CURRENT_BALANCE, 0)) ELSE 0 END)                AS TOTAL_CCOD_OUTSTANDING,

        -- Status breakdown
        SUM(CASE WHEN ACCOUNT_STATUS = 'OPEN' THEN 1 ELSE 0 END) AS OPEN_ACCOUNTS,
        SUM(CASE WHEN ACCOUNT_STATUS = 'CLOSED' THEN 1 ELSE 0 END) AS CLOSED_ACCOUNTS,

        -- NPA headline (from risk table)
        (SELECT COUNT(r.ACCOUNT_NO)
         FROM dw.FACT_LOAN_RISK_DELINQUENCY r
         WHERE r.SNAPSHOT_DATE = @ReportDate
           AND r.IS_CONFIRMED_NPA = 1
           AND (@BranchCode IS NULL OR r.BRANCH_CODE = @BranchCode))           AS TOTAL_NPA_ACCOUNTS,

        (SELECT ISNULL(SUM(r.BALANCE_OUTSTANDING), 0)
         FROM dw.FACT_LOAN_RISK_DELINQUENCY r
         WHERE r.SNAPSHOT_DATE = @ReportDate
           AND r.IS_CONFIRMED_NPA = 1
           AND (@BranchCode IS NULL OR r.BRANCH_CODE = @BranchCode))           AS TOTAL_NPA_OUTSTANDING,

        -- Audit exceptions count
        (SELECT COUNT(*)
         FROM dw.FACT_AUDIT_EXCEPTIONS e
         WHERE e.SNAPSHOT_DATE = @ReportDate
           AND e.SEVERITY IN ('HIGH','CRITICAL')
           AND (@BranchCode IS NULL OR e.BRANCH_CODE = @BranchCode))           AS CRITICAL_EXCEPTIONS

    FROM dw.FACT_ACCOUNT_SNAPSHOT
    WHERE SNAPSHOT_DATE = @ReportDate
      AND (@BranchCode IS NULL OR BRANCH_CODE = @BranchCode);
END;
GO

-- ============================================================================
-- QUERY 2: Business Mix & Product Portfolio Distribution
-- Category-wise deposit, loan, CC/OD breakdown.
-- ============================================================================
CREATE OR ALTER PROCEDURE dw.sp_Dashboard_BusinessMix
    @ReportDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @ReportDate IS NULL
        SELECT @ReportDate = MAX(SNAPSHOT_DATE) FROM dw.FACT_ACCOUNT_SNAPSHOT;

    SELECT
        ACCOUNT_CATEGORY,
        COUNT(ACCOUNT_NO)                                           AS ACCOUNT_COUNT,
        SUM(CASE
            WHEN ACCOUNT_CATEGORY = 'DEPOSIT' THEN ISNULL(CURRENT_BALANCE, 0)
            WHEN ACCOUNT_CATEGORY = 'LOAN'    THEN ISNULL(OUTSTANDING, 0)
            WHEN ACCOUNT_CATEGORY = 'CC_OD'   THEN ABS(ISNULL(CURRENT_BALANCE, 0))
            ELSE 0
        END)                                                                 AS TOTAL_VOLUME,
        AVG(INTEREST_RATE)                                                   AS AVG_INTEREST_RATE,
        MIN(INTEREST_RATE)                                                   AS MIN_INTEREST_RATE,
        MAX(INTEREST_RATE)                                                   AS MAX_INTEREST_RATE
    FROM dw.FACT_ACCOUNT_SNAPSHOT
    WHERE SNAPSHOT_DATE = @ReportDate
    GROUP BY ACCOUNT_CATEGORY
    ORDER BY TOTAL_VOLUME DESC;
END;
GO

-- ============================================================================
-- QUERY 3: Product Portfolio Top-10 by Balance
-- Breaks down by ACCOUNT_TYPE within each category.
-- ============================================================================
CREATE OR ALTER PROCEDURE dw.sp_Dashboard_ProductPortfolio
    @ReportDate DATE = NULL,
    @TopN INT = 10,
    @BranchCode VARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @ReportDate IS NULL
        SELECT @ReportDate = MAX(SNAPSHOT_DATE) FROM dw.FACT_ACCOUNT_SNAPSHOT;

    ;WITH ProductRanked AS (
        SELECT
            ACCOUNT_CATEGORY,
            ISNULL(ACCOUNT_TYPE, 'UNKNOWN')                                  AS PRODUCT_TYPE,
            COUNT(ACCOUNT_NO)                                       AS ACCOUNT_COUNT,
            SUM(CASE
                WHEN ACCOUNT_CATEGORY = 'DEPOSIT' THEN ISNULL(CURRENT_BALANCE, 0)
                ELSE ISNULL(OUTSTANDING, ISNULL(ABS(CURRENT_BALANCE), 0))
            END)                                                             AS TOTAL_BALANCE,
            AVG(INTEREST_RATE)                                               AS AVG_RATE,
            ROW_NUMBER() OVER (
                PARTITION BY ACCOUNT_CATEGORY
                ORDER BY SUM(CASE
                    WHEN ACCOUNT_CATEGORY = 'DEPOSIT' THEN ISNULL(CURRENT_BALANCE, 0)
                    ELSE ISNULL(OUTSTANDING, ISNULL(ABS(CURRENT_BALANCE), 0))
                END) DESC
            )                                                                AS RNK
        FROM dw.FACT_ACCOUNT_SNAPSHOT
        WHERE SNAPSHOT_DATE = @ReportDate
          AND (@BranchCode IS NULL OR BRANCH_CODE = @BranchCode)
        GROUP BY ACCOUNT_CATEGORY, ACCOUNT_TYPE
    )
    SELECT
        ACCOUNT_CATEGORY,
        PRODUCT_TYPE,
        ACCOUNT_COUNT,
        TOTAL_BALANCE,
        AVG_RATE,
        RNK
    FROM ProductRanked
    WHERE RNK <= @TopN
    ORDER BY ACCOUNT_CATEGORY, RNK;
END;
GO

-- ============================================================================
-- QUERY 4: NPA & Delinquency Breakdown by Asset Category
-- Classification: STANDARD, SUB_STANDARD, DOUBTFUL, LOSS
-- ============================================================================
CREATE OR ALTER PROCEDURE dw.sp_Dashboard_NPABreakdown
    @ReportDate DATE = NULL,
    @BranchCode VARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @ReportDate IS NULL
        SELECT @ReportDate = MAX(SNAPSHOT_DATE) FROM dw.FACT_LOAN_RISK_DELINQUENCY;

    SELECT
        ISNULL(NPA_CLASSIFICATION, 'UNCLASSIFIED')                           AS ASSET_CATEGORY,
        COUNT(ACCOUNT_NO)                                           AS ACCOUNT_COUNT,
        SUM(ISNULL(BALANCE_OUTSTANDING, 0))                                  AS TOTAL_OUTSTANDING,
        SUM(ISNULL(INCA, 0))                                                 AS TOTAL_INCA,
        SUM(ISNULL(UIPY, 0))                                                 AS TOTAL_UIPY,
        SUM(ISNULL(OVERDUE_INTEREST, 0))                                     AS TOTAL_OVERDUE_INTEREST,
        SUM(ISNULL(IRREGULAR_AMOUNT, 0))                                     AS TOTAL_IRREGULAR,
        SUM(CASE WHEN IS_PROBABLE_NPA = 1 THEN 1 ELSE 0 END)    AS PROBABLE_NPA_COUNT,
        SUM(CASE WHEN IS_CONFIRMED_NPA = 1 THEN 1 ELSE 0 END)  AS CONFIRMED_NPA_COUNT,
        SUM(ISNULL(BALANCE_OUTSTANDING, 0)) * 100.0 / NULLIF(
            (SELECT SUM(ISNULL(BALANCE_OUTSTANDING, 0)) FROM dw.FACT_LOAN_RISK_DELINQUENCY WHERE SNAPSHOT_DATE = @ReportDate AND (@BranchCode IS NULL OR BRANCH_CODE = @BranchCode)), 0
        ) AS PORTFOLIO_PERCENTAGE
    FROM dw.FACT_LOAN_RISK_DELINQUENCY
    WHERE SNAPSHOT_DATE = @ReportDate
      AND (@BranchCode IS NULL OR BRANCH_CODE = @BranchCode)
    GROUP BY NPA_CLASSIFICATION
    ORDER BY
        CASE NPA_CLASSIFICATION
            WHEN 'STANDARD'     THEN 1
            WHEN 'SUB_STANDARD' THEN 2
            WHEN 'DOUBTFUL'     THEN 3
            WHEN 'LOSS'         THEN 4
            ELSE 5
        END;
END;
GO

-- ============================================================================
-- QUERY 5: Arrears Aging Slabs Distribution
-- Aggregated across all loan accounts with arrears data.
-- ============================================================================
CREATE OR ALTER PROCEDURE dw.sp_Dashboard_ArrearsAging
    @ReportDate DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @ReportDate IS NULL
        SELECT @ReportDate = MAX(SNAPSHOT_DATE) FROM dw.FACT_LOAN_RISK_DELINQUENCY;

    SELECT
        '1D - 28D'                                                           AS ARREARS_SLAB,
        1                                                                     AS SORT_ORDER,
        COUNT(CASE WHEN ISNULL(ARREARS_1D_28D, 0) <> 0 THEN 1 END)          AS ACCOUNT_COUNT,
        SUM(ISNULL(ARREARS_1D_28D, 0))                                       AS TOTAL_ARREARS
    FROM dw.FACT_LOAN_RISK_DELINQUENCY WHERE SNAPSHOT_DATE = @ReportDate

    UNION ALL

    SELECT '29D - 3M', 2,
        COUNT(CASE WHEN ISNULL(ARREARS_29D_3M, 0) <> 0 THEN 1 END),
        SUM(ISNULL(ARREARS_29D_3M, 0))
    FROM dw.FACT_LOAN_RISK_DELINQUENCY WHERE SNAPSHOT_DATE = @ReportDate

    UNION ALL

    SELECT '3M - 6M', 3,
        COUNT(CASE WHEN ISNULL(ARREARS_3M_6M, 0) <> 0 THEN 1 END),
        SUM(ISNULL(ARREARS_3M_6M, 0))
    FROM dw.FACT_LOAN_RISK_DELINQUENCY WHERE SNAPSHOT_DATE = @ReportDate

    UNION ALL

    SELECT '6M - 1Y', 4,
        COUNT(CASE WHEN ISNULL(ARREARS_6M_1Y, 0) <> 0 THEN 1 END),
        SUM(ISNULL(ARREARS_6M_1Y, 0))
    FROM dw.FACT_LOAN_RISK_DELINQUENCY WHERE SNAPSHOT_DATE = @ReportDate

    UNION ALL

    SELECT '1Y - 3Y', 5,
        COUNT(CASE WHEN ISNULL(ARREARS_1Y_3Y, 0) <> 0 THEN 1 END),
        SUM(ISNULL(ARREARS_1Y_3Y, 0))
    FROM dw.FACT_LOAN_RISK_DELINQUENCY WHERE SNAPSHOT_DATE = @ReportDate

    UNION ALL

    SELECT '3Y+', 6,
        COUNT(CASE WHEN ISNULL(ARREARS_3Y_PLUS, 0) <> 0 THEN 1 END),
        SUM(ISNULL(ARREARS_3Y_PLUS, 0))
    FROM dw.FACT_LOAN_RISK_DELINQUENCY WHERE SNAPSHOT_DATE = @ReportDate

    ORDER BY SORT_ORDER;
END;
GO

-- ============================================================================
-- QUERY 6: Top & Bottom Branches by Deposit Volume
-- ============================================================================
CREATE OR ALTER PROCEDURE dw.sp_Dashboard_BranchRankDeposits
    @ReportDate DATE = NULL,
    @TopN INT = 10,
    @BranchCode VARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @ReportDate IS NULL
        SELECT @ReportDate = MAX(SNAPSHOT_DATE) FROM dw.FACT_ACCOUNT_SNAPSHOT;

    ;WITH BranchDeposits AS (
        SELECT
            a.BRANCH_CODE,
            b.BRANCH_NAME,
            b.REGIONAL_OFFICE_NAME,
            b.DISTRICT,
            COUNT(a.ACCOUNT_NO)                                     AS DEPOSIT_ACCOUNTS,
            SUM(ISNULL(a.CURRENT_BALANCE, 0))                                AS TOTAL_DEPOSITS,
            AVG(a.INTEREST_RATE)                                             AS AVG_RATE,
            RANK() OVER (ORDER BY SUM(ISNULL(a.CURRENT_BALANCE, 0)) DESC)   AS RANK_TOP,
            RANK() OVER (ORDER BY SUM(ISNULL(a.CURRENT_BALANCE, 0)) ASC)    AS RANK_BOTTOM
        FROM dw.FACT_ACCOUNT_SNAPSHOT a
        LEFT JOIN dw.DIM_BRANCH_HIERARCHY b ON a.BRANCH_CODE = b.BRANCH_CODE
        WHERE a.SNAPSHOT_DATE = @ReportDate
          AND a.ACCOUNT_CATEGORY = 'DEPOSIT'
          AND (@BranchCode IS NULL OR a.BRANCH_CODE = @BranchCode)
        GROUP BY a.BRANCH_CODE, b.BRANCH_NAME, b.REGIONAL_OFFICE_NAME, b.DISTRICT
    )
    SELECT
        BRANCH_CODE,
        BRANCH_NAME,
        REGIONAL_OFFICE_NAME,
        DISTRICT,
        DEPOSIT_ACCOUNTS,
        TOTAL_DEPOSITS,
        AVG_RATE,
        CASE WHEN RANK_TOP    <= @TopN THEN 'TOP'
             WHEN RANK_BOTTOM <= @TopN THEN 'BOTTOM'
             ELSE 'MIDDLE'
        END                                                                  AS RANKING_CATEGORY,
        RANK_TOP
    FROM BranchDeposits
    WHERE RANK_TOP <= @TopN OR RANK_BOTTOM <= @TopN
    ORDER BY RANK_TOP;
END;
GO

-- ============================================================================
-- QUERY 7: Top & Bottom Branches by Advances
-- ============================================================================
CREATE OR ALTER PROCEDURE dw.sp_Dashboard_BranchRankAdvances
    @ReportDate DATE = NULL,
    @TopN INT = 10,
    @BranchCode VARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @ReportDate IS NULL
        SELECT @ReportDate = MAX(SNAPSHOT_DATE) FROM dw.FACT_ACCOUNT_SNAPSHOT;

    ;WITH BranchAdvances AS (
        SELECT
            a.BRANCH_CODE,
            b.BRANCH_NAME,
            b.REGIONAL_OFFICE_NAME,
            b.DISTRICT,
            COUNT(a.ACCOUNT_NO)                                     AS LOAN_ACCOUNTS,
            SUM(ISNULL(a.OUTSTANDING, 0))                                    AS TOTAL_ADVANCES,
            AVG(a.INTEREST_RATE)                                             AS AVG_RATE,
            RANK() OVER (ORDER BY SUM(ISNULL(a.OUTSTANDING, 0)) DESC)       AS RANK_TOP,
            RANK() OVER (ORDER BY SUM(ISNULL(a.OUTSTANDING, 0)) ASC)        AS RANK_BOTTOM
        FROM dw.FACT_ACCOUNT_SNAPSHOT a
        LEFT JOIN dw.DIM_BRANCH_HIERARCHY b ON a.BRANCH_CODE = b.BRANCH_CODE
        WHERE a.SNAPSHOT_DATE = @ReportDate
          AND a.ACCOUNT_CATEGORY IN ('LOAN', 'CC_OD')
          AND (@BranchCode IS NULL OR a.BRANCH_CODE = @BranchCode)
        GROUP BY a.BRANCH_CODE, b.BRANCH_NAME, b.REGIONAL_OFFICE_NAME, b.DISTRICT
    )
    SELECT
        BRANCH_CODE,
        BRANCH_NAME,
        REGIONAL_OFFICE_NAME,
        DISTRICT,
        LOAN_ACCOUNTS,
        TOTAL_ADVANCES,
        AVG_RATE,
        CASE WHEN RANK_TOP    <= @TopN THEN 'TOP'
             WHEN RANK_BOTTOM <= @TopN THEN 'BOTTOM'
             ELSE 'MIDDLE'
        END                                                                  AS RANKING_CATEGORY,
        RANK_TOP
    FROM BranchAdvances
    WHERE RANK_TOP <= @TopN OR RANK_BOTTOM <= @TopN
    ORDER BY RANK_TOP;
END;
GO

-- ============================================================================
-- QUERY 8: Top & Bottom Branches by NPA Volume
-- ============================================================================
CREATE OR ALTER PROCEDURE dw.sp_Dashboard_BranchRankNPA
    @ReportDate DATE = NULL,
    @TopN INT = 10,
    @BranchCode VARCHAR(20) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @ReportDate IS NULL
        SELECT @ReportDate = MAX(SNAPSHOT_DATE) FROM dw.FACT_LOAN_RISK_DELINQUENCY;

    ;WITH BranchNPA AS (
        SELECT
            r.BRANCH_CODE,
            b.BRANCH_NAME,
            b.REGIONAL_OFFICE_NAME,
            b.DISTRICT,
            COUNT(r.ACCOUNT_NO)                                     AS NPA_ACCOUNTS,
            SUM(ISNULL(r.BALANCE_OUTSTANDING, 0))                            AS NPA_OUTSTANDING,
            SUM(ISNULL(r.INCA, 0))                                           AS TOTAL_INCA,
            SUM(ISNULL(r.UIPY, 0))                                           AS TOTAL_UIPY,
            -- NPA classification breakdown
            SUM(CASE WHEN r.NPA_CLASSIFICATION = 'SUB_STANDARD' THEN 1 ELSE 0 END) AS SUB_STD_COUNT,
            SUM(CASE WHEN r.NPA_CLASSIFICATION = 'DOUBTFUL' THEN 1 ELSE 0 END) AS DOUBTFUL_COUNT,
            SUM(CASE WHEN r.NPA_CLASSIFICATION = 'LOSS' THEN 1 ELSE 0 END) AS LOSS_COUNT,
            RANK() OVER (ORDER BY SUM(ISNULL(r.BALANCE_OUTSTANDING, 0)) DESC) AS RANK_TOP,
            RANK() OVER (ORDER BY SUM(ISNULL(r.BALANCE_OUTSTANDING, 0)) ASC)  AS RANK_BOTTOM
        FROM dw.FACT_LOAN_RISK_DELINQUENCY r
        LEFT JOIN dw.DIM_BRANCH_HIERARCHY b ON r.BRANCH_CODE = b.BRANCH_CODE
        WHERE r.SNAPSHOT_DATE = @ReportDate
          AND r.IS_CONFIRMED_NPA = 1
          AND (@BranchCode IS NULL OR r.BRANCH_CODE = @BranchCode)
        GROUP BY r.BRANCH_CODE, b.BRANCH_NAME, b.REGIONAL_OFFICE_NAME, b.DISTRICT
    )
    SELECT
        BRANCH_CODE,
        BRANCH_NAME,
        REGIONAL_OFFICE_NAME,
        DISTRICT,
        NPA_ACCOUNTS,
        NPA_OUTSTANDING,
        TOTAL_INCA,
        TOTAL_UIPY,
        SUB_STD_COUNT,
        DOUBTFUL_COUNT,
        LOSS_COUNT,
        CASE WHEN RANK_TOP    <= @TopN THEN 'TOP_NPA'
             WHEN RANK_BOTTOM <= @TopN THEN 'LEAST_NPA'
             ELSE 'MIDDLE'
        END                                                                  AS RANKING_CATEGORY,
        RANK_TOP
    FROM BranchNPA
    WHERE RANK_TOP <= @TopN OR RANK_BOTTOM <= @TopN
    ORDER BY RANK_TOP;
END;
GO

PRINT '============================================================';
PRINT '  09_dashboard_queries.sql completed successfully.';
PRINT '  Created 8 dashboard stored procedures.';
PRINT '============================================================';
GO




