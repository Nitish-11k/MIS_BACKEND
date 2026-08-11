import sqlite3
c = sqlite3.connect('mis_data.db')
tables = [r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table'")]
empty = []
for t in tables:
    try:
        count = c.execute(f"SELECT count(*) FROM {t}").fetchone()[0]
        if count == 0:
            empty.append(t)
    except:
        pass
print(f'Empty tables: {len(empty)}')
print(empty)
