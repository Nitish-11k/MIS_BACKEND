import os
import urllib.parse
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

load_dotenv('.env')

db_url = os.getenv("DATABASE_URL")
if db_url and not db_url.startswith("mssql+"):
    encoded = urllib.parse.quote_plus(db_url)
    db_url = f"mssql+pyodbc:///?odbc_connect={encoded}"

engine = create_engine(db_url, use_setinputsizes=False)
SessionLocal = sessionmaker(bind=engine)