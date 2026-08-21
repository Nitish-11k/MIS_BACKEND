import sys, os
sys.path.append(os.getcwd())
from app.db.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    dep = conn.execute(text("SELECT DISTINCT STATUS, COUNT(*) FROM dep_shadow_file GROUP BY STATUS"))
    print('dep_shadow_file STATUS:', [r for r in dep])
    loan = conn.execute(text("SELECT DISTINCT STATUS, COUNT(*) FROM loan_shadow_file GROUP BY STATUS"))
    print('loan_shadow_file STATUS:', [r for r in loan])
