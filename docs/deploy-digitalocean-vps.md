# Hướng dẫn deploy project này lên VPS DigitalOcean

Tài liệu này viết riêng cho repo hiện tại ở [docker-compose.yaml](../docker-compose.yaml). Mục tiêu là đưa toàn bộ stack lên VPS DigitalOcean bằng Docker Compose, gồm:

- MySQL
- Redis
- Backend Spring Boot
- Client patient Next.js
- Admin React/Vite
- ML backend

Tài liệu giả định là bạn **đã có sẵn VPS DigitalOcean** và có thể SSH vào server.

---

## 1. Kiến trúc chạy của project này

Theo cấu hình hiện tại trong [docker-compose.yaml](../docker-compose.yaml):

- Backend container nghe cổng `8080` bên trong container và map ra VPS là `8081`
- Client patient map ra cổng `5174`
- Admin map ra cổng `3001`
- ML backend map ra cổng `5001`
- MySQL map ra cổng `3307` trên VPS
- Redis map ra cổng `6380` trên VPS

Các biến môi trường backend đang dùng gồm:

- `DB_HOST`
- `CLINIC_DB_PORT`
- `CLINIC_DB_NAME`
- `CLINIC_DB_USER`
- `CLINIC_DB_PASS`
- `ML_BACKEND_URL`
- `GEMINI_API_KEY`
- `HF_TOKEN`

Backend cũng đọc cấu hình từ [clinic/src/main/resources/application.properties](../clinic/src/main/resources/application.properties).

---

## 2. Chuẩn bị trên VPS

SSH vào server:

```bash
ssh root@YOUR_VPS_IP
```

Cập nhật hệ thống:

```bash
apt update && apt upgrade -y
```

Cài Git, Docker và Docker Compose plugin:

```bash
apt install -y git curl ca-certificates
curl -fsSL https://get.docker.com -o get-docker.sh
  sh get-docker.sh
  apt install -y docker-compose-plugin
```

Kiểm tra lại:

```bash
docker --version
docker compose version
```

---

## 3. Clone source code lên VPS

Di chuyển đến thư mục bạn muốn chứa source, ví dụ `/opt`:

```bash
cd /opt
git clone <URL_GIT_CUA_BAN> datn
cd datn
```

Ví dụ nếu repo private thì bạn nên clone bằng SSH key hoặc Personal Access Token.

Kiểm tra đã thấy file compose:

```bash
ls
a
```

Bạn cần nhìn thấy file `docker-compose.yaml` ở root project.

---

## 4. Tạo file biến môi trường cho Docker Compose

File compose hiện tại dùng cú pháp `${GEMINI_API_KEY}` và `${HF_TOKEN}`, nên bạn cần tạo file `.env` ở **root project** (cùng cấp với `docker-compose.yaml`).

Tạo file:

```bash
nano .env
```

Dán nội dung mẫu sau:

```env
GEMINI_API_KEY=your_real_gemini_api_key
HF_TOKEN=your_real_huggingface_token
```

Nếu sau này bạn muốn backend dùng đúng domain/public IP cho frontend, có thể sửa thêm `NEXT_PUBLIC_API_URL` trực tiếp trong `docker-compose.yaml`.

> Lưu ý: hiện tại compose đang hard-code:
>
> - `NEXT_PUBLIC_API_URL=http://localhost:8081`
>
> Nghĩa là nếu người dùng mở frontend từ máy khác thì gọi API sẽ lỗi, vì `localhost` sẽ trỏ về máy của người dùng chứ không phải VPS.
>
> Trước khi deploy public, bạn nên đổi dòng đó thành:
>
> ```yaml
> - NEXT_PUBLIC_API_URL=http://YOUR_VPS_IP:8081
> ```
>
> hoặc tốt hơn là domain thật, ví dụ:
>
> ```yaml
> - NEXT_PUBLIC_API_URL=https://api.yourdomain.com
> ```

---

## 5. Khuyến nghị chỉnh trước khi chạy production

### 5.1 Không để lộ database và redis ra public nếu không cần

Trong [docker-compose.yaml](../docker-compose.yaml), hiện đang map:

- MySQL: `3307:3306`
- Redis: `6380:6379`

Nếu bạn **không cần truy cập MySQL/Redis từ bên ngoài VPS**, nên comment hoặc xóa các dòng `ports` của `mysql` và `redis` để an toàn hơn.

Ví dụ nên đổi:

```yaml
mysql:
  image: mysql:8.0
  container_name: clinic-mysql
  environment:
    MYSQL_ROOT_PASSWORD: strong_password_here
    MYSQL_DATABASE: clinic
  volumes:
    - mysql_data:/var/lib/mysql
    - ./clinic/database/init.sql:/docker-entrypoint-initdb.d/init.sql
  restart: unless-stopped
```

và:

```yaml
redis:
  image: redis:latest
  container_name: clinic-redis
  volumes:
    - redis_data:/data
  restart: unless-stopped
  command: redis-server --save 60 1 --loglevel warning
```

### 5.2 Đổi mật khẩu MySQL mặc định

Hiện compose đang để:

```yaml
MYSQL_ROOT_PASSWORD: root
CLINIC_DB_PASS=root
```

Bạn nên đổi cả 2 giá trị này thành mật khẩu mạnh trước khi chạy production.

Ví dụ:

```yaml
MYSQL_ROOT_PASSWORD=ClinicMysqlRoot@2026!
CLINIC_DB_PASS=ClinicMysqlRoot@2026!
```

Và nhớ sửa đồng bộ trong service `mysql` và `backend`.

### 5.3 Kiểm tra API key

Backend hiện hỗ trợ:

- `GEMINI_API_KEY`
- `HF_TOKEN`

Nhưng phần chat LLM trong code hiện còn ưu tiên Groq/Hugging Face ở [clinic/src/main/java/com/myproject/clinic/utils/LlmService.java](../clinic/src/main/java/com/myproject/clinic/utils/LlmService.java). Vì vậy bạn cần chắc chắn:

- nếu tính năng chatbot dùng Gemini ở phần khác của project, giữ `GEMINI_API_KEY`
- nếu chatbot đang dùng Hugging Face embeddings/LLM thì `HF_TOKEN` phải hợp lệ

Nếu bạn có thêm `GROQ_API_KEY`, nên truyền nó vào backend nữa để chatbot ổn định hơn.

---

## 6. Chỉnh file compose cho VPS public

Mở file compose:

```bash
nano docker-compose.yaml
```

### 6.1 Sửa URL API cho client patient

Tìm đoạn:

```yaml
client:
  environment:
    - INTERNAL_API_URL=http://backend:8080
    - NEXT_PUBLIC_API_URL=http://localhost:8081
```

Đổi thành:

```yaml
client:
  environment:
    - INTERNAL_API_URL=http://backend:8080
    - NEXT_PUBLIC_API_URL=http://YOUR_VPS_IP:8081
```

Ví dụ:

```yaml
- NEXT_PUBLIC_API_URL=http://159.223.xx.xx:8081
```

### 6.2 Nếu muốn admin gọi backend qua VPS

Admin hiện đang có:

```yaml
- BACKEND_URL=http://backend:8080
```

Nếu admin app chỉ gọi backend từ bên trong container/server-side thì có thể giữ nguyên. Nếu có issue gọi API từ browser, bạn sẽ cần kiểm tra cách app admin dùng biến này.

---

## 7. Build và chạy toàn bộ stack

Ở root project:

```bash
docker compose up -d --build
```

Lần đầu sẽ mất vài phút do phải:

- kéo image MySQL, Redis
- build backend
- build client
- build admin
- build ML backend

Kiểm tra trạng thái:

```bash
docker compose ps
```

Xem log toàn hệ thống:

```bash
docker compose logs -f
```

Xem log riêng backend:

```bash
docker compose logs -f backend
```

Xem log riêng client:

```bash
docker compose logs -f client
```

Xem log riêng admin:

```bash
docker compose logs -f admin
```

---

## 8. Mở port trên DigitalOcean / UFW

Nếu VPS có bật `ufw`, mở các cổng cần dùng:

```bash
ufw allow OpenSSH
ufw allow 8081/tcp
ufw allow 5174/tcp
ufw allow 3001/tcp
ufw allow 5001/tcp
ufw enable
ufw status
```

Nếu chỉ test backend API thì chỉ cần mở `8081`.

Nếu muốn truy cập giao diện patient/admin từ bên ngoài thì mở thêm:

- `5174` cho client
- `3001` cho admin

**Không khuyến nghị** mở public các cổng sau nếu không thực sự cần:

- `3307` (MySQL)
- `6380` (Redis)

Nếu bạn dùng **DigitalOcean Cloud Firewall**, tạo inbound rules tương ứng cho:

- TCP `22`
- TCP `8081`
- TCP `5174`
- TCP `3001`
- TCP `5001`

---

## 9. Kiểm tra sau khi deploy

### 9.1 Backend API

Mở trình duyệt hoặc Postman:

```text
http://YOUR_VPS_IP:8081
```

hoặc test một API thực tế của backend, ví dụ endpoint bạn đang dùng.

### 9.2 Frontend patient

```text
http://YOUR_VPS_IP:5174
```

### 9.3 Frontend admin

```text
http://YOUR_VPS_IP:3001
```

### 9.4 ML backend

```text
http://YOUR_VPS_IP:5001
```

---

## 10. Các lệnh vận hành thường dùng

### Dừng hệ thống

```bash
docker compose down
```

### Dừng và xóa cả volumes

```bash
docker compose down -v
```

> Lệnh này sẽ xóa dữ liệu MySQL/Redis trong volume. Chỉ dùng khi bạn chấp nhận mất dữ liệu.

### Rebuild sau khi pull code mới

```bash
git pull
docker compose up -d --build
```

### Khởi động lại riêng backend

```bash
docker compose restart backend
```

### Xem container đang chạy

```bash
docker ps
```

---

## 11. Các lỗi thường gặp

### Lỗi frontend gọi API không được

Nguyên nhân rất hay gặp là `NEXT_PUBLIC_API_URL` vẫn để `http://localhost:8081` trong compose.

Cách sửa:

- đổi sang `http://YOUR_VPS_IP:8081`
- build lại client:

```bash
docker compose up -d --build client
```

### Lỗi backend không lên vì không kết nối được MySQL

Kiểm tra log:

```bash
docker compose logs -f mysql
docker compose logs -f backend
```

Đảm bảo các biến sau khớp nhau:

- `MYSQL_ROOT_PASSWORD`
- `CLINIC_DB_PASS`
- `DB_HOST=mysql`
- `CLINIC_DB_PORT=3306`

### Lỗi chatbot/embedding không hoạt động

Kiểm tra biến môi trường trong `.env`:

- `HF_TOKEN`
- `GEMINI_API_KEY`

Sau đó restart backend:

```bash
docker compose restart backend
```

### Lỗi hết RAM khi build

Nếu VPS quá nhỏ, build đồng thời nhiều service có thể fail. Cách xử lý:

1. tăng RAM droplet
2. build từng service
3. thêm swap

Ví dụ tạo swap 2GB:

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
free -h
```

---

## 12. Quy trình deploy ngắn gọn

Nếu bạn muốn bản rút gọn để làm nhanh:

```bash
ssh root@YOUR_VPS_IP
apt update && apt upgrade -y
apt install -y git curl ca-certificates
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt install -y docker-compose-plugin
cd /opt
git clone <URL_GIT_CUA_BAN> datn
cd datn
nano .env
nano docker-compose.yaml
docker compose up -d --build
docker compose ps
ufw allow OpenSSH
ufw allow 8081/tcp
ufw allow 5174/tcp
ufw allow 3001/tcp
ufw allow 5001/tcp
```

---

## 13. Khuyến nghị tiếp theo

Để chạy production ổn hơn, bạn nên làm thêm các bước sau:

1. gắn domain
2. dựng Nginx reverse proxy
3. cấp HTTPS bằng Let’s Encrypt
4. bỏ map public MySQL/Redis
5. đổi toàn bộ secret mặc định
6. tách file compose dev và compose production

Nếu bạn muốn, bước tiếp theo tôi có thể viết tiếp cho bạn file:

- `docs/deploy-digitalocean-vps-with-domain-nginx-ssl.md`

để bạn deploy theo kiểu domain chuẩn production.