import urllib.request
import json
try:
    response = urllib.request.urlopen("http://127.0.0.1:8000/api/kpi-summary?branch_code=ALL&period=30D", timeout=30)
    print("STATUS:", response.status)
    print("BODY:", response.read().decode('utf-8'))
except Exception as e:
    print("ERROR:", e)
