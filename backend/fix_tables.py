import os
import pyodbc
from dotenv import load_dotenv

def drop_all_tables():
    load_dotenv('.env')
    conn_str = os.getenv('ODBC_CONNECTION_STRING')
    
    if not conn_str:
        print("Error: ODBC_CONNECTION_STRING not found in .env file.")
        return

    print("Connecting to database...")
    try:
        conn = pyodbc.connect(conn_str, autocommit=True)
        cursor = conn.cursor()
        print("Successfully connected. Dropping all tables...")

        # SQL to drop all foreign keys and then all tables
        drop_script = """
        -- Drop all foreign key constraints
        DECLARE @Sql NVARCHAR(MAX);
        DECLARE @Cursor CURSOR;

        SET @Cursor = CURSOR FAST_FORWARD FOR
        SELECT DISTINCT 'ALTER TABLE [' + tc2.TABLE_SCHEMA + '].[' +  tc2.TABLE_NAME + '] DROP [' + rc1.CONSTRAINT_NAME + '];'
        FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc1
        LEFT JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc2 ON tc2.CONSTRAINT_NAME = rc1.CONSTRAINT_NAME;

        OPEN @Cursor;
        FETCH NEXT FROM @Cursor INTO @Sql;
        WHILE (@@FETCH_STATUS = 0)
        BEGIN
            EXEC sp_executesql @Sql;
            FETCH NEXT FROM @Cursor INTO @Sql;
        END;
        CLOSE @Cursor;
        DEALLOCATE @Cursor;

        -- Drop all tables
        DECLARE @Sql2 NVARCHAR(MAX);
        DECLARE @Cursor2 CURSOR;

        SET @Cursor2 = CURSOR FAST_FORWARD FOR
        SELECT 'DROP TABLE [' + TABLE_SCHEMA + '].[' + TABLE_NAME + '];'
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE = 'BASE TABLE';

        OPEN @Cursor2;
        FETCH NEXT FROM @Cursor2 INTO @Sql2;
        WHILE (@@FETCH_STATUS = 0)
        BEGIN
            EXEC sp_executesql @Sql2;
            FETCH NEXT FROM @Cursor2 INTO @Sql2;
        END;
        CLOSE @Cursor2;
        DEALLOCATE @Cursor2;
        """

        cursor.execute(drop_script)
        print("All tables have been successfully dropped!")

    except pyodbc.Error as e:
        print(f"Database error occurred: {e}")
        print("\nNote: If this is a timeout error, your SQL Server service is likely frozen and needs to be restarted from services.msc.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    confirm = input("WARNING: This will drop ALL tables in the database. Are you sure? (y/n): ")
    if confirm.lower() == 'y':
        drop_all_tables()
    else:
        print("Operation cancelled.")
