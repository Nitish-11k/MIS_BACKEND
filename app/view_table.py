import sys
from sqlalchemy import Table, MetaData, select
from app.db.database import engine


def view_table(table_name, limit=10):
    metadata = MetaData()
    table = Table(table_name, metadata, autoload_with=engine)

    with engine.connect() as conn:
        result = conn.execute(select(table).limit(limit))
        rows = result.fetchall()
        columns = result.keys()

        print(f"\nTable: {table_name}")
        print("Columns:", list(columns))
        print(f"Showing {len(rows)} rows:\n")
        for row in rows:
            print(dict(zip(columns, row)))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m app.view_table TABLE_NAME")
    else:
        view_table(sys.argv[1])