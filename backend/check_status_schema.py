import sys, os
sys.path.append(os.getcwd())
from app.db.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    dep = conn.execute(text("SELECT STATUS, COUNT(*) FROM dep_shadow_file GROUP BY STATUS")).fetchall()
    print('dep statuses:', dep)
    
    loan = conn.execute(text("SELECT ISNULL(SCHEMEDESC, 'Unknown Scheme'), COUNT(*), SUM(TRY_CAST(REPLACE(ISNULL(CURRBAL, '0'), ',', '') AS FLOAT)) FROM loan_shadow_file GROUP BY ISNULL(SCHEMEDESC, 'Unknown Scheme')")).fetchall()
    print('loan schemes:', loan[:10])
