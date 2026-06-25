import urllib.request
import json
import uuid
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

session_id = "chat-" + str(uuid.uuid4())

def send_msg(message):
    print(f"\nUser: {message}")
    url = "http://localhost:8081/api/chat"
    req = urllib.request.Request(url, method="POST")
    req.add_header('Content-Type', 'application/json')
    data = {
        "sessionId": session_id,
        "message": message,
        "userId": None
    }
    jsondata = json.dumps(data).encode('utf-8')
    try:
        response = urllib.request.urlopen(req, jsondata)
        res_data = json.loads(response.read().decode('utf-8'))
        print("Bot:", res_data.get("message"))
        print("Intent:", res_data.get("intent"))
        print("Doctors count in response cards:", len(res_data.get("doctors") or []))
    except Exception as e:
        print("Error:", e)

# Turn 1
send_msg("mình muốn tìm hiểu khoa Tai Mũi Họng")

# Turn 2
send_msg("khoa này có bao nhiêu bác sĩ")
