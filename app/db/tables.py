from sqlalchemy import Table, Column, String, MetaData, inspect
from sqlalchemy import delete
from app.db.database import engine


def create_table_if_not_exists(table_name, column_names, primary_key_columns=None):
    metadata = MetaData()
    inspector = inspect(engine)

    if inspector.has_table(table_name):
        return Table(table_name, metadata, autoload_with=engine)

    if primary_key_columns is None:
        primary_key_columns = []

    from sqlalchemy import Integer

    columns = []
    for cname in column_names:
        is_pk = cname in primary_key_columns
        if cname in ("SR_NO", "SLNO"):
            columns.append(Column(cname, Integer, primary_key=is_pk))
        else:
            columns.append(Column(cname, String(500), primary_key=is_pk))

    table = Table(table_name, metadata, *columns)
    table.create(engine)
    return table


def insert_rows(table, rows, primary_key_columns=None):
    if not rows:
        return

    column_names = list(rows[0].keys())
    
    if not primary_key_columns:
        primary_key_columns = ["BRANCH_CODE", "PROC_DATE"]
        if "SR_NO" in rows[0]:
            primary_key_columns = ["SR_NO", "BRANCH_CODE", "PROC_DATE"]
        elif "SLNO" in rows[0]:
            primary_key_columns = ["SLNO", "GL_CLASS_CODE", "BRANCH_CODE", "PROC_DATE"]
        elif "GL_CLASS_CODE" in rows[0]:
            primary_key_columns = ["GL_CLASS_CODE", "BRANCH_CODE", "PROC_DATE"]

    with engine.begin() as conn:
        if primary_key_columns:
            # Delete existing rows that match the same primary key combination
            # (idempotent re-upload: same branch+date+sr_no replaces cleanly)
            for row in rows:
                conditions = [
                    getattr(table.c, col) == row.get(col)
                    for col in primary_key_columns
                    if col in row
                ]
                if conditions:
                    from sqlalchemy import and_
                    stmt = delete(table).where(and_(*conditions))
                    conn.execute(stmt)

        conn.execute(table.insert(), rows)