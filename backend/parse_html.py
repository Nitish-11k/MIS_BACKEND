import json
import re
# pyrefly: ignore [missing-import]
from bs4 import BeautifulSoup
import os
import sys

# Add the backend directory to the path so we can import from app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.api import get_db_connection

html_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "branches.html")
with open(html_path, 'r', encoding='utf-8') as f:
    html_content = f.read()

soup = BeautifulSoup(html_content, 'html.parser')
table = soup.find('table', {'class': 'table table-bordered'})
if not table:
    print("Table not found")
    sys.exit(1)

branches = []
for row in table.find('tbody').find_all('tr'):
    cols = row.find_all('td')
    if len(cols) >= 4:
        sno = cols[0].text.strip()
        name = cols[1].text.strip()
        address = cols[2].text.strip()
        district = cols[3].text.strip()
        contact = cols[4].text.strip() if len(cols) > 4 else ""
        
        region = "Head Complex" if district.lower() == "jammu" else district
        
        branches.append({
            "name": name,
            "address": address,
            "district": district,
            "region": region,
            "contact": contact
        })

print(f"Extracted {len(branches)} branches.")

conn = get_db_connection()
cursor = conn.cursor()

# Drop table if exists
try:
    cursor.execute("DROP TABLE BRANCH_NETWORK")
    conn.commit()
    print("Dropped existing BRANCH_NETWORK table.")
except Exception as e:
    print("Table probably didn't exist.")

# Create table
cursor.execute("""
CREATE TABLE BRANCH_NETWORK (
    ID INT PRIMARY KEY IDENTITY(1,1),
    HEAD_OFFICE VARCHAR(255),
    REGIONAL_OFFICE VARCHAR(255),
    BRANCH_NAME VARCHAR(255),
    DISTRICT VARCHAR(255),
    ADDRESS VARCHAR(500),
    CONTACT_NO VARCHAR(100)
)
""")
conn.commit()
print("Created BRANCH_NETWORK table.")

# Insert data
for b in branches:
    cursor.execute("""
        INSERT INTO BRANCH_NETWORK (HEAD_OFFICE, REGIONAL_OFFICE, BRANCH_NAME, DISTRICT, ADDRESS, CONTACT_NO)
        VALUES (?, ?, ?, ?, ?, ?)
    """, ("Head Office", b["region"], b["name"], b["district"], b["address"], b["contact"]))

conn.commit()
conn.close()
print("Successfully inserted all branches.")
