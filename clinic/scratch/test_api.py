import urllib.request
import json

try:
    url = "http://localhost:8081/api/services"
    response = urllib.request.urlopen(url)
    data = json.loads(response.read().decode('utf-8'))
    print("Services returned from API:")
    print(json.dumps(data, indent=2, ensure_ascii=False))
except Exception as e:
    print("Error querying API:", e)
