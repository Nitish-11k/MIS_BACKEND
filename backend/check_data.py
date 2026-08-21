import sys, os
sys.path.append(os.getcwd())
from app.db.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    print('dep_shadow_file count:', conn.execute(text('SELECT COUNT(*) FROM dep_shadow_file')).fetchone()[0])
    print('loan_shadow_file count:', conn.execute(text('SELECT COUNT(*) FROM loan_shadow_file')).fetchone()[0])
    print('dep_shadow_file sample BRNO:', conn.execute(text('SELECT TOP 5 BRNO FROM dep_shadow_file')).fetchall())
    print('loan_shadow_file sample BRNO:', conn.execute(text('SELECT TOP 5 BRNO FROM loan_shadow_file')).fetchall())
    print('dep_shadow_file sample BRANCH:', conn.execute(text('SELECT TOP 5 BRANCH FROM dep_shadow_file')).fetchall())
    print('dep_shadow_file total bal:', conn.execute(text("SELECT SUM(TRY_CAST(REPLACE(ISNULL(CURRBAL, '0'), ',', '') AS FLOAT)) FROM dep_shadow_file")).fetchone()[0])
