/*******************************************************************************
 * 08_rls_security.sql
 * Banking MIS Data Warehouse — Hierarchical Row-Level Security (RLS)
 *
 * Implements parameterized security predicates using SESSION_CONTEXT:
 *   - Role = 'HO'     → Complete bank-wide data access
 *   - Role = 'RO'     → Restricted to branches under assigned Regional Office
 *   - Role = 'BRANCH' → Restricted to assigned Branch Code only
 *
 * Uses inline table-valued functions (ITVF) as security predicates.
 * Applied as FILTER predicates on all 4 fact tables.
 *
 * Application layer must call:
 *   EXEC sp_set_session_context N'user_login', N'<user_login>';
 * before querying fact tables for RLS to take effect.
 *
 * Target: MIS_DATABASE on DESKTOP-CNDH3DO
 ******************************************************************************/

USE MIS_DATABASE;
GO

-- ============================================================================
-- 1. Security Predicate Function (Inline Table-Valued Function)
--    This ITVF evaluates whether the current session user has access
--    to a given BRANCH_CODE based on their role assignment.
-- ============================================================================
CREATE OR ALTER FUNCTION dw.fn_RLS_BranchFilter (@BRANCH_CODE VARCHAR(10))
RETURNS TABLE
WITH SCHEMABINDING
AS
RETURN
    SELECT 1 AS access_granted
    WHERE
        -- Bypass: If no session context is set, allow full access
        -- (for admin/ETL scenarios where RLS shouldn't block)
        CAST(SESSION_CONTEXT(N'user_login') AS VARCHAR(128)) IS NULL

        -- Head Office: unrestricted bank-wide access
        OR EXISTS (
            SELECT 1
            FROM dw.USER_BRANCH_ACCESS uba
            WHERE uba.USER_LOGIN = CAST(SESSION_CONTEXT(N'user_login') AS VARCHAR(128))
              AND uba.ACCESS_ROLE = 'HO'
              AND uba.IS_ACTIVE = 1
        )

        -- Regional Office: access to all branches under their assigned RO
        OR EXISTS (
            SELECT 1
            FROM dw.USER_BRANCH_ACCESS uba
            INNER JOIN dw.DIM_BRANCH_HIERARCHY dbh
                ON dbh.REGIONAL_OFFICE_CODE = uba.REGIONAL_OFFICE_CODE
            WHERE uba.USER_LOGIN = CAST(SESSION_CONTEXT(N'user_login') AS VARCHAR(128))
              AND uba.ACCESS_ROLE = 'RO'
              AND uba.IS_ACTIVE = 1
              AND dbh.BRANCH_CODE = @BRANCH_CODE
        )

        -- Branch: access to their exact branch only
        OR EXISTS (
            SELECT 1
            FROM dw.USER_BRANCH_ACCESS uba
            WHERE uba.USER_LOGIN = CAST(SESSION_CONTEXT(N'user_login') AS VARCHAR(128))
              AND uba.ACCESS_ROLE = 'BRANCH'
              AND uba.IS_ACTIVE = 1
              AND uba.BRANCH_CODE = @BRANCH_CODE
        );
GO

-- ============================================================================
-- 2. Drop existing security policies (idempotent re-run)
-- ============================================================================
IF EXISTS (SELECT 1 FROM sys.security_policies WHERE name = N'RLS_FACT_ACCOUNT_SNAPSHOT')
    DROP SECURITY POLICY dw.RLS_FACT_ACCOUNT_SNAPSHOT;
GO

IF EXISTS (SELECT 1 FROM sys.security_policies WHERE name = N'RLS_FACT_LOAN_RISK_DELINQUENCY')
    DROP SECURITY POLICY dw.RLS_FACT_LOAN_RISK_DELINQUENCY;
GO

IF EXISTS (SELECT 1 FROM sys.security_policies WHERE name = N'RLS_FACT_GL_PRODUCT_SUMMARY')
    DROP SECURITY POLICY dw.RLS_FACT_GL_PRODUCT_SUMMARY;
GO

IF EXISTS (SELECT 1 FROM sys.security_policies WHERE name = N'RLS_FACT_AUDIT_EXCEPTIONS')
    DROP SECURITY POLICY dw.RLS_FACT_AUDIT_EXCEPTIONS;
GO

-- ============================================================================
-- 3. Create Security Policies on all 4 Fact Tables
-- ============================================================================

-- 3a. FACT_ACCOUNT_SNAPSHOT
CREATE SECURITY POLICY dw.RLS_FACT_ACCOUNT_SNAPSHOT
    ADD FILTER PREDICATE dw.fn_RLS_BranchFilter(BRANCH_CODE)
    ON dw.FACT_ACCOUNT_SNAPSHOT
    WITH (STATE = ON, SCHEMABINDING = ON);
GO
PRINT '>> Security Policy: RLS_FACT_ACCOUNT_SNAPSHOT applied.';

-- 3b. FACT_LOAN_RISK_DELINQUENCY
CREATE SECURITY POLICY dw.RLS_FACT_LOAN_RISK_DELINQUENCY
    ADD FILTER PREDICATE dw.fn_RLS_BranchFilter(BRANCH_CODE)
    ON dw.FACT_LOAN_RISK_DELINQUENCY
    WITH (STATE = ON, SCHEMABINDING = ON);
GO
PRINT '>> Security Policy: RLS_FACT_LOAN_RISK_DELINQUENCY applied.';

-- 3c. FACT_GL_PRODUCT_SUMMARY
CREATE SECURITY POLICY dw.RLS_FACT_GL_PRODUCT_SUMMARY
    ADD FILTER PREDICATE dw.fn_RLS_BranchFilter(BRANCH_CODE)
    ON dw.FACT_GL_PRODUCT_SUMMARY
    WITH (STATE = ON, SCHEMABINDING = ON);
GO
PRINT '>> Security Policy: RLS_FACT_GL_PRODUCT_SUMMARY applied.';

-- 3d. FACT_AUDIT_EXCEPTIONS
CREATE SECURITY POLICY dw.RLS_FACT_AUDIT_EXCEPTIONS
    ADD FILTER PREDICATE dw.fn_RLS_BranchFilter(BRANCH_CODE)
    ON dw.FACT_AUDIT_EXCEPTIONS
    WITH (STATE = ON, SCHEMABINDING = ON);
GO
PRINT '>> Security Policy: RLS_FACT_AUDIT_EXCEPTIONS applied.';

-- ============================================================================
-- 4. Seed Sample User Assignments (for testing)
-- ============================================================================
PRINT '>> Seeding sample user access for testing...';

-- Clear any existing test users
DELETE FROM dw.USER_BRANCH_ACCESS WHERE USER_LOGIN IN ('ho_admin', 'ro_railhead', 'branch_parade');

-- Head Office Admin — full access
INSERT INTO dw.USER_BRANCH_ACCESS (USER_LOGIN, ACCESS_ROLE, BRANCH_CODE, REGIONAL_OFFICE_CODE)
VALUES ('ho_admin', 'HO', NULL, NULL);

-- Regional Office User — access to Rail Head Complex region
INSERT INTO dw.USER_BRANCH_ACCESS (USER_LOGIN, ACCESS_ROLE, BRANCH_CODE, REGIONAL_OFFICE_CODE)
VALUES ('ro_railhead', 'RO', NULL,
    (SELECT TOP 1 REGIONAL_OFFICE_CODE FROM dw.DIM_BRANCH_HIERARCHY
     WHERE REGIONAL_OFFICE_NAME = 'Rail Head Complex'));

-- Branch User — access to Parade branch only
INSERT INTO dw.USER_BRANCH_ACCESS (USER_LOGIN, ACCESS_ROLE, BRANCH_CODE, REGIONAL_OFFICE_CODE)
VALUES ('branch_parade', 'BRANCH', '00061', NULL);

PRINT '>> Test users seeded: ho_admin (HO), ro_railhead (RO), branch_parade (BRANCH).';
GO

-- ============================================================================
-- 5. Helper procedure: Set session context for RLS
-- ============================================================================
CREATE OR ALTER PROCEDURE dw.sp_SetUserContext
    @user_login VARCHAR(128)
AS
BEGIN
    EXEC sp_set_session_context N'user_login', @user_login;
    PRINT '>> Session context set for: ' + @user_login;
END;
GO

-- ============================================================================
-- 6. Helper procedure: Clear session context (return to admin/unfiltered)
-- ============================================================================
CREATE OR ALTER PROCEDURE dw.sp_ClearUserContext
AS
BEGIN
    EXEC sp_set_session_context N'user_login', NULL;
    PRINT '>> Session context cleared — full access restored.';
END;
GO

PRINT '============================================================';
PRINT '  08_rls_security.sql completed successfully.';
PRINT '  Policies: 4 filter predicates active.';
PRINT '  Test users: ho_admin, ro_railhead, branch_parade.';
PRINT '============================================================';
GO
