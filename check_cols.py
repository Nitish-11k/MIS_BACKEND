import sqlite3
c = sqlite3.connect('mis_data.db')
tables = [r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table' LIMIT 5")]
for t in tables:
    cols = [r[1] for r in c.execute(f"PRAGMA table_info({t})").fetchall()]
    print(t, cols)
