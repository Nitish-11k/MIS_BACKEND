import sys, os
sys.path.append(os.getcwd())
from app.db.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    dep = conn.execute(text("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'dep_shadow_file'"))
    print('dep_shadow_file columns:', [r[0] for r in dep])
    loan = conn.execute(text("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'loan_shadow_file'"))
    print('loan_shadow_file columns:', [r[0] for r in loan])
