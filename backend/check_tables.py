import sys, os
sys.path.append(os.getcwd())
from app.db.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    res = conn.execute(text("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'"))
    print([r[0] for r in res])
