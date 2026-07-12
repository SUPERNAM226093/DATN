# DATN MedPro - He thong phong kham

Du an gom 3 phan chinh:

- `clinic`: backend Spring Boot, MySQL, JWT, upload file, chatbot, VNPay.
- `client-clinic`: website nguoi dung bang Next.js.
- `admin/admin-clinic`: trang quan tri bang Vite + React.

Mac dinh chay local:

| Thanh phan | Thu muc | Cong |
| --- | --- | --- |
| Backend API | `clinic` | `https://jean-skirt-term-des.trycloudflare.com` |
| Client | `client-clinic` | `http://localhost:5173` |
| Admin | `admin/admin-clinic` | `http://localhost:3000` |
| MySQL | local | `localhost:3306` |

## Yeu cau

Can cai san:

- JDK 17
- Node.js 20+
- MySQL 8+
- Git

Kiem tra nhanh:

```bash
java -version
node -v
npm -v
mysql --version
git --version
```

Tren Windows nen dung PowerShell hoac terminal cua IDE.

## Clone project

```bash
git clone https://github.com/SUPERNAM226093/DATN.git
cd DATN
```

## Tao database

Dang nhap MySQL roi tao database `clinic`:

```bash
mysql -u root -p
```

Trong MySQL:

```sql
CREATE DATABASE IF NOT EXISTS clinic
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
EXIT;
```

Neu muon import du lieu mau tu file dump:

```bash
mysql -u root -p clinic < clinic/database/init.sql
```

Neu khong import dump, Spring Boot van co the tu tao/cap nhat bang nho `spring.jpa.hibernate.ddl-auto=update`, nhung se thieu du lieu mau.

## Cau hinh bien moi truong

Tao file `.env` tai thu muc goc project `DATN/.env`.

Vi du local:

```env
DB_HOST=localhost
CLINIC_DB_PORT=3306
CLINIC_DB_NAME=clinic
CLINIC_DB_USER=root
CLINIC_DB_PASS=

SERVER_PORT=8081
JWT_SECRET=clinicSecretKeyForJWTtokenGeneration2026DefaultDevKey

NEXT_PUBLIC_API_URL=https://jean-skirt-term-des.trycloudflare.com
INTERNAL_API_URL=https://jean-skirt-term-des.trycloudflare.com
BACKEND_URL=https://jean-skirt-term-des.trycloudflare.com

CHAT_SESSION_TTL_MINUTES=30
HF_TOKEN=
GROQ_API_KEY=

VNP_TMN_CODE=2LE0NQ35
VNP_HASH_SECRET=42AG3QJQROXLFPTKX8CVAII1G44EX0BJ
VNP_PAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNP_RETURN_URL=http://localhost:5173/video-call/payment/vnpay-callback
```

Ghi chu:

- `CLINIC_DB_PASS` de trong neu MySQL root khong co mat khau.
- `NEXT_PUBLIC_API_URL` dung cho client Next.js.
- `BACKEND_URL` dung cho proxy cua admin Vite.
- Khi deploy production, doi cac URL local sang URL backend public.

## Chay backend

Mo terminal 1:

```bash
cd clinic
./gradlew bootRun
```

Tren Windows neu `./gradlew` loi:

```powershell
cd clinic
.\gradlew.bat bootRun
```

Backend se chay tai:

```txt
https://jean-skirt-term-des.trycloudflare.com
```

## Chay client nguoi dung

Mo terminal 2:

```bash
cd client-clinic
npm install
npm run dev
```

Client se chay tai:

```txt
http://localhost:5173
```

Neu can chi dinh backend khi chay local:

```bash
NEXT_PUBLIC_API_URL=https://jean-skirt-term-des.trycloudflare.com npm run dev
```

PowerShell:

```powershell
$env:NEXT_PUBLIC_API_URL="https://jean-skirt-term-des.trycloudflare.com"
npm run dev
```

## Chay admin

Mo terminal 3:

```bash
cd admin/admin-clinic
npm install
npm run dev
```

Admin se chay tai:

```txt
http://localhost:3000
```

Neu can chi dinh backend:

```bash
BACKEND_URL=https://jean-skirt-term-des.trycloudflare.com npm run dev
```

PowerShell:

```powershell
$env:BACKEND_URL="https://jean-skirt-term-des.trycloudflare.com"
npm run dev
```

## Build kiem tra

Client:

```bash
cd client-clinic
npm run build
```

Admin:

```bash
cd admin/admin-clinic
npm run build
```

Backend:

```bash
cd clinic
./gradlew test
```

Windows:

```powershell
cd clinic
.\gradlew.bat test
```

## Cau hinh production

### Client tren Vercel

Trong Vercel, vao Project Settings -> Environment Variables, them:

```env
NEXT_PUBLIC_API_URL=https://your-backend-domain
INTERNAL_API_URL=https://your-backend-domain
```

Vi du neu dang dung Cloudflare Tunnel:

```env
NEXT_PUBLIC_API_URL=https://jean-skirt-term-des.trycloudflare.com
INTERNAL_API_URL=https://jean-skirt-term-des.trycloudflare.com
```

Sau khi doi env tren Vercel, can redeploy.

### Admin tren Vercel hoac hosting khac

Them bien:

```env
BACKEND_URL=https://your-backend-domain
```

Admin goi API qua `/api`, Vite dev server se proxy ve `BACKEND_URL` khi chay local.

### Backend

Backend can cac bien:

```env
DB_HOST=...
CLINIC_DB_PORT=3306
CLINIC_DB_NAME=clinic
CLINIC_DB_USER=...
CLINIC_DB_PASS=...
SERVER_PORT=8081
JWT_SECRET=...
```

Neu dung VNPay production/test, cap nhat:

```env
VNP_TMN_CODE=...
VNP_HASH_SECRET=...
VNP_PAY_URL=...
VNP_RETURN_URL=https://your-client-domain/video-call/payment/vnpay-callback
```

## Upload va hien thi anh

Backend luu duong dan anh trong DB, frontend hien thi bang helper `getImageUrl()` trong:

```txt
client-clinic/app/lib/api.ts
```

Neu anh hien local nhung len production khong hien, kiem tra:

1. API tra ve `featureImageUrl` co gia tri khong.
2. `NEXT_PUBLIC_API_URL` tren Vercel co tro dung backend public khong.
3. URL anh ghep ra co mo truc tiep duoc tren trinh duyet khong.
4. Backend co public duong dan `/images/...` hoac endpoint file tuong ung khong.

## Len GitHub

```bash
git status
git add .
git commit -m "Your commit message"
git push origin main
```

Neu chi muon day file da sua:

```bash
git add path/to/file
git commit -m "Fix something"
git push origin main
```

## Loi thuong gap

| Loi | Cach xu ly |
| --- | --- |
| Backend khong ket noi MySQL | Kiem tra MySQL dang chay, database `clinic`, user/pass trong `.env` |
| Port 8081 bi chiem | Doi `SERVER_PORT`, dong thoi doi `NEXT_PUBLIC_API_URL` va `BACKEND_URL` |
| Client khong goi duoc API tren Vercel | Them `NEXT_PUBLIC_API_URL` dung domain backend va redeploy |
| Anh bac si/phong/goi kham khong hien | Kiem tra `featureImageUrl`, URL backend public, va duong dan `/images/...` |
| Build Next loi Google Fonts khi offline | Can co internet de Next tai font tu Google trong luc build |
| Admin 401 sau khi login | Xoa localStorage/token cu va dang nhap lai |

## Duong dan hay dung

- Client: `http://localhost:5173`
- Admin: `http://localhost:3000`
- Backend API: `https://jean-skirt-term-des.trycloudflare.com`
- Doctors API: `https://jean-skirt-term-des.trycloudflare.com/api/doctors`
- Specializations API: `https://jean-skirt-term-des.trycloudflare.com/api/specializations`
- Health packages API: `http://localhost:8081 /api/health-packages`