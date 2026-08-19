# Banking MIS Data Warehouse — Deployment Runbook

## Architecture

```
┌──────────────────────────┐     ┌──────────────────────────┐
│   dbo.* Staging Tables   │────▶│    dw.* Star Schema      │
│   (83+ VARCHAR(500))     │     │    (Typed & Indexed)     │
│                          │     │                          │
│  DEPD0586, LOND2390,     │     │  DIM_BRANCH_HIERARCHY    │
│  DEPD0580, NPA_STMT,     │     │  FACT_ACCOUNT_SNAPSHOT   │
│  LOND2572, LOND2463,     │     │  FACT_LOAN_RISK_DELINQ.  │
│  LOND2498, LOND2388,     │     │  FACT_GL_PRODUCT_SUMMARY │
│  DEPD0670, DEPD0650,     │     │  FACT_AUDIT_EXCEPTIONS   │
│  GNBD7376, etc.          │     │                          │
└──────────────────────────┘     └──────────────────────────┘
         READ ONLY                    WRITE (ETL)
```

## Prerequisites

- SQL Server 2016+ or Azure SQL (for `SESSION_CONTEXT`, `TRY_CONVERT`, `CREATE OR ALTER`)
- `MIS_DATABASE` database exists with raw staging tables in `dbo` schema
- `BRANCH_NETWORK` table populated with branch data
- Admin/sysadmin permissions for RLS policy creation

## Deployment Order

Execute scripts in numbered order:

```
sqlcmd -S DESKTOP-CNDH3DO -d MIS_DATABASE -E -i 00_create_schema.sql
sqlcmd -S DESKTOP-CNDH3DO -d MIS_DATABASE -E -i 01_normalization_functions.sql
sqlcmd -S DESKTOP-CNDH3DO -d MIS_DATABASE -E -i 02_dim_branch_hierarchy.sql
sqlcmd -S DESKTOP-CNDH3DO -d MIS_DATABASE -E -i 03_fact_account_snapshot.sql
sqlcmd -S DESKTOP-CNDH3DO -d MIS_DATABASE -E -i 04_fact_loan_risk_delinquency.sql
sqlcmd -S DESKTOP-CNDH3DO -d MIS_DATABASE -E -i 05_fact_gl_product_summary.sql
sqlcmd -S DESKTOP-CNDH3DO -d MIS_DATABASE -E -i 06_fact_audit_exceptions.sql
sqlcmd -S DESKTOP-CNDH3DO -d MIS_DATABASE -E -i 07_etl_procedures.sql
sqlcmd -S DESKTOP-CNDH3DO -d MIS_DATABASE -E -i 08_rls_security.sql
sqlcmd -S DESKTOP-CNDH3DO -d MIS_DATABASE -E -i 09_dashboard_queries.sql
```

## Running ETL

```sql
-- Full ETL (all dates)
EXEC dw.sp_RunFullETL;

-- Incremental ETL (specific date)
EXEC dw.sp_RunIncrementalETL @SnapshotDate = '2025-04-25';
```

## Testing RLS

```sql
-- Set context as branch user
EXEC dw.sp_SetUserContext 'branch_parade';
SELECT COUNT(*) FROM dw.FACT_ACCOUNT_SNAPSHOT;  -- Only Parade branch data

-- Set context as RO user
EXEC dw.sp_SetUserContext 'ro_railhead';
SELECT COUNT(*) FROM dw.FACT_ACCOUNT_SNAPSHOT;  -- All Rail Head Complex branches

-- Clear context (admin access)
EXEC dw.sp_ClearUserContext;
SELECT COUNT(*) FROM dw.FACT_ACCOUNT_SNAPSHOT;  -- All data
```

## Dashboard Queries

```sql
EXEC dw.sp_Dashboard_ExecutiveKPIs;
EXEC dw.sp_Dashboard_BusinessMix;
EXEC dw.sp_Dashboard_ProductPortfolio @TopN = 10;
EXEC dw.sp_Dashboard_NPABreakdown;
EXEC dw.sp_Dashboard_ArrearsAging;
EXEC dw.sp_Dashboard_BranchRankDeposits @TopN = 10;
EXEC dw.sp_Dashboard_BranchRankAdvances @TopN = 10;
EXEC dw.sp_Dashboard_BranchRankNPA @TopN = 10;
```
