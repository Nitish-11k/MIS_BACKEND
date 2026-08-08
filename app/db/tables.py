from sqlalchemy import Table, Column, String,Integer, MetaData, inspect
from app.db.database import engine
from sqlalchemy import delete

def create_table_if_not_exists(table_name, column_names):
    metadata = MetaData()
    inspector = inspect(engine)

    if inspector.has_table(table_name):
        return Table(table_name, metadata, autoload_with=engine)

    columns = [Column("id", Integer, primary_key=True, autoincrement=True)]
    for cname in column_names:
        columns.append(Column(cname, String(500)))


    table = Table(table_name, metadata, * columns)
    table.create(engine)
    return table

def insert_rows(table, rows):
    with engine.begin() as conn:
        # Dynamic Primary Key determination for Upserts
        possible_pks = ['ACCOUNT_NUMBER', 'ACCOUNT_NO', 'CUSTOMER_NO', 'LOAN_ID', 'ACCOUNT']
        pk_column = None
        for pk in possible_pks:
            if pk in table.c:
                pk_column = pk
                break
                
        if pk_column:
            # Upsert logic: Delete existing rows matching these PKs
            pk_values = [row.get(pk_column) for row in rows if pk_column in row]
            if pk_values:
                stmt = delete(table).where(getattr(table.c, pk_column).in_(pk_values))
                conn.execute(stmt) 
        else:
            print(f"Warning: No common Unique Key found in {table.name} for Upsert. Duplicates may occur.")

        conn.execute(table.insert(), rows)