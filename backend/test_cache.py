import urllib.request
import json
import time

BASE = "http://127.0.0.1:8001"

def test_endpoint(name, url):
    print(f"\n=== {name} ===")
    
    # First call (cache miss - hits DB)
    t1 = time.time()
    try:
        response = urllib.request.urlopen(url, timeout=60)
        data = response.read().decode('utf-8')
        elapsed1 = time.time() - t1
        parsed = json.loads(data)
        print(f"  1st call (DB): {elapsed1:.3f}s")
        # Print a preview
        if isinstance(parsed, dict):
            print(f"  Keys: {list(parsed.keys())}")
        elif isinstance(parsed, list):
            print(f"  Items: {len(parsed)}")
    except Exception as e:
        print(f"  1st call ERROR: {e}")
        return
    
    # Second call (cache hit - should be instant)
    t2 = time.time()
    try:
        response = urllib.request.urlopen(url, timeout=10)
        data2 = response.read().decode('utf-8')
        elapsed2 = time.time() - t2
        print(f"  2nd call (CACHE): {elapsed2:.3f}s")
        print(f"  Speedup: {elapsed1/elapsed2:.1f}x faster!")
    except Exception as e:
        print(f"  2nd call ERROR: {e}")

# Test key endpoints
test_endpoint("KPI Summary", f"{BASE}/api/kpi-summary?branch_code=ALL&period=30D")
test_endpoint("Account Metrics", f"{BASE}/api/account-metrics?branch_code=ALL&period=30D")
test_endpoint("NPA Summary", f"{BASE}/api/npa-summary?branch_code=ALL&period=30D")
test_endpoint("Trend Data", f"{BASE}/api/trend-data?branch_code=ALL&period=30D")
test_endpoint("NPA Trend", f"{BASE}/api/npa-trend?branch_code=ALL&period=30D")

# Check cache stats
print("\n=== Cache Stats ===")
response = urllib.request.urlopen(f"{BASE}/api/cache-stats", timeout=5)
stats = json.loads(response.read().decode('utf-8'))
print(f"  {json.dumps(stats, indent=2)}")
