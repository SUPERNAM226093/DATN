import urllib.request
import json
import uuid
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

try:
    url = "http://localhost:8081/api/chat"
    req = urllib.request.Request(url, method="POST")
    req.add_header('Content-Type', 'application/json')
    data = {
        "sessionId": "chat-" + str(uuid.uuid4()),
        "message": "cho tôi hỏi hotline và lịch làm việc của phòng khám nhé",
        "userId": None
    }
    jsondata = json.dumps(data).encode('utf-8')
    response = urllib.request.urlopen(req, jsondata)
    res_data = json.loads(response.read().decode('utf-8'))
    print("API Response:", json.dumps(res_data, indent=2, ensure_ascii=False))
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.read().decode('utf-8')}")
except Exception as e:
    print("Error:", e)
