from sqlalchemy import Table, Column, String, MetaData, inspect
from sqlalchemy import delete
from app.db.database import engine

def check_if_tables_exist(table_names):
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    return {name: (name in existing_tables) for name in table_names}

def create_table_if_not_exists(table_name, column_names, primary_key_columns=None):
    metadata = MetaData()
    inspector = inspect(engine)

    if inspector.has_table(table_name):
        return Table(table_name, metadata, autoload_with=engine)

    if primary_key_columns is None:
        primary_key_columns = []

    from sqlalchemy import Integer

    columns = [Column("id", Integer, primary_key=True, autoincrement=True)]
    for cname in column_names:
        columns.append(Column(cname, String(500)))

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
        # Delete existing data for this branch and date to avoid duplicates
        # and ensure a clean slate for the parsed file.
        first_row = rows[0]
        if "BRANCH_CODE" in first_row and "PROC_DATE" in first_row:
            from sqlalchemy import and_, delete
            branch = first_row["BRANCH_CODE"]
            proc_date = first_row["PROC_DATE"]
            
            stmt = delete(table).where(
                and_(
                    table.c.BRANCH_CODE == branch,
                    table.c.PROC_DATE == proc_date
                )
            )
            conn.execute(stmt)

        conn.execute(table.insert(), rows)