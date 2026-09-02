import urllib.request
try:
    response = urllib.request.urlopen("http://127.0.0.1:8000/api/deposits-dashboard?branch_code=ALL&period=7D", timeout=5)
    print("STATUS:", response.status)
    print("BODY:", response.read().decode('utf-8')[:200])
except Exception as e:
    print("ERROR:", e)
