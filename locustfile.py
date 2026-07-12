import itertools
import os
import random
import time
from datetime import date, timedelta

from locust import HttpUser, between, task


# Cau hinh host mac dinh:
# - Mac dinh test product qua Cloudflare tunnel.
# - Trang / cua link nay dang tra 401, nen script chi test API backend.
BACKEND_HOST = os.getenv("BACKEND_HOST", "https://jean-skirt-term-des.trycloudflare.com")
FRONTEND_HOST = os.getenv("FRONTEND_HOST", "https://jean-skirt-term-des.trycloudflare.com")

# Du lieu test tai.
PASSWORD = os.getenv("LOCUST_TEST_PASSWORD", "Test@123456")
EMAIL_PREFIX = os.getenv("LOCUST_EMAIL_PREFIX", "loadtest")
EMAIL_DOMAIN = os.getenv("LOCUST_EMAIL_DOMAIN", "gmail.com")

# ID bac si/dich vu dung cho testcase chi tiet va dat lich.
# Nen doi thanh ID that trong DB de giam loi:
# $env:LOCUST_DOCTOR_IDS="3,7,9"
# $env:LOCUST_SERVICE_IDS="1,2,5"
DOCTOR_IDS = [
    int(value)
    for value in os.getenv("LOCUST_DOCTOR_IDS", "1").split(",")
    if value.strip()
]
SERVICE_IDS = [
    int(value)
    for value in os.getenv("LOCUST_SERVICE_IDS", "").split(",")
    if value.strip()
]

# Counter dung de sinh email/session/slot lich hen khong trung nhau.
_unique_counter = itertools.count(int(time.time() * 1000))

# 28 slot/ngay. 1000 lich hen se duoc rai qua nhieu ngay/gio khac nhau.
APPOINTMENT_TIMES = [
    f"{hour:02d}:{minute:02d}:00"
    for hour in [8, 9, 10, 11, 13, 14, 15]
    for minute in [0, 15, 30, 45]
]


def unique_email(prefix="user"):
    return f"{EMAIL_PREFIX}_{prefix}_{next(_unique_counter)}@{EMAIL_DOMAIN}"


def appointment_slot(slot_index):
    day_offset = 1 + (slot_index // len(APPOINTMENT_TIMES))
    time_value = APPOINTMENT_TIMES[slot_index % len(APPOINTMENT_TIMES)]
    date_value = (date.today() + timedelta(days=day_offset)).isoformat()
    return date_value, time_value


def future_day(offset=None):
    offset = offset or random.randint(1, 30)
    return (date.today() + timedelta(days=offset)).isoformat()


class ClinicLoadUser(HttpUser):
    host = BACKEND_HOST
    wait_time = between(1, 3)

    def on_start(self):
        # Moi user ao co tai khoan rieng, nhung khong dat lich ngay trong setup.
        # Dat lich la 1 testcase rieng de Locust hien thanh dong rieng tren bang.
        self.user_id = None
        self.token = None
        self.email = unique_email("patient")
        self.appointment_created = False

    def register_payload(self, email=None):
        return {
            "email": email or unique_email("register"),
            "password": PASSWORD,
            "fullName": "Load Test Patient",
            "phone": f"09{random.randint(10000000, 99999999)}",
            "dateOfBirth": "1998-01-01",
            "gender": random.choice(["MALE", "FEMALE"]),
            "address": "Load test address",
        }

    def remember_auth(self, response):
        try:
            data = response.json()
        except ValueError:
            return
        self.user_id = data.get("userId") or self.user_id
        self.token = data.get("token") or self.token

    def auth_headers(self):
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    def ensure_registered(self):
        # Ham phu tro: neu user ao chua co tai khoan thi dang ky.
        # Request van duoc tinh vao testcase POST /api/auth/register.
        if self.user_id:
            return
        with self.client.post(
            "/api/auth/register",
            json=self.register_payload(self.email),
            headers={"Content-Type": "application/json"},
            name="POST /api/auth/register",
            catch_response=True,
        ) as response:
            if response.status_code == 200:
                response.success()
                self.remember_auth(response)
            else:
                response.failure(response.text[:300])


    @task(10)
    def get_doctor_list(self):
        # TC2: Lay danh sach bac si tren trang chu.
        self.client.get("/api/doctors", name="GET /api/doctors")

    @task(8)
    def get_service_list(self):
        # TC3: Lay danh sach dich vu.
        self.client.get("/api/services", name="GET /api/services")

    @task(8)
    def get_health_package_list(self):
        # TC4: Lay danh sach goi kham.
        self.client.get("/api/health-packages", name="GET /api/health-packages")

    @task(8)
    def view_doctor_detail(self):
        # TC5: Xem chi tiet 1 bac si va lay lich trong cua bac si do.
        doctor_id = random.choice(DOCTOR_IDS)
        self.client.get(f"/api/doctors/{doctor_id}", name="GET /api/doctors/{id}")
        self.client.get(
            f"/api/doctors/{doctor_id}/available-slots?date={future_day()}",
            name="GET /api/doctors/{id}/available-slots",
        )

    @task(4)
    def register_account(self):
        # TC6: Dang ky tai khoan moi, test ghi DB + ma hoa password + tao token.
        self.ensure_registered()

    @task(4)
    def login_account(self):
        # TC7: Dang nhap bang tai khoan da dang ky.
        self.ensure_registered()
        if not self.user_id:
            return
        with self.client.post(
            "/api/auth/login",
            json={"email": self.email, "password": PASSWORD},
            headers={"Content-Type": "application/json"},
            name="POST /api/auth/login",
            catch_response=True,
        ) as response:
            if response.status_code == 200:
                response.success()
                self.remember_auth(response)
            else:
                response.failure(response.text[:300])

    @task(5)
    def create_appointment(self):
        # TC8: Dat lich. Moi user ao chi tao 1 lich, slot ngay/gio rieng de giam trung lich.
        self.ensure_registered()
        if self.appointment_created or not self.user_id:
            return

        slot_index = next(_unique_counter)
        appointment_date, appointment_time = appointment_slot(slot_index)
        payload = {
            "patientId": self.user_id,
            "doctorId": DOCTOR_IDS[slot_index % len(DOCTOR_IDS)],
            "appointmentDate": appointment_date,
            "appointmentTime": appointment_time,
            "status": "PENDING",
            "note": f"Locust appointment slot {slot_index}",
        }
        if SERVICE_IDS:
            payload["serviceId"] = SERVICE_IDS[slot_index % len(SERVICE_IDS)]

        with self.client.post(
            "/api/appointments",
            json=payload,
            headers=self.auth_headers(),
            name="POST /api/appointments",
            catch_response=True,
        ) as response:
            if response.status_code == 200:
                self.appointment_created = True
                response.success()
            else:
                response.failure(response.text[:300])

    @task(3)
    def get_patient_appointments(self):
        # TC9: Lay lich su lich hen cua benh nhan vua tao.
        self.ensure_registered()
        if self.user_id:
            self.client.get(
                f"/api/appointments/by-patient/{self.user_id}",
                headers=self.auth_headers(),
                name="GET /api/appointments/by-patient/{id}",
            )

    @task(5)
    def chat_with_ai_assistant(self):
        # TC10: Chat voi tro ly AI.
        session_id = f"locust-{next(_unique_counter)}"
        messages = [
            "Tu van cho toi bac si tim mach",
            "Co goi kham tong quat nao phu hop khong?",
            "Toi dau dau va met moi nen kham khoa nao?",
            "Cho toi danh sach bac si co lich kham gan nhat",
        ]
        payload = {
            "sessionId": session_id,
            "message": random.choice(messages),
            "userId": self.user_id,
        }
        self.client.post(
            "/api/chat",
            json=payload,
            headers={"Content-Type": "application/json"},
            name="POST /api/chat",
        )


