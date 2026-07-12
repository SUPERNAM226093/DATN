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
> - `NEXT_PUBLIC_API_URL=http://localhost:8081 `
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
Nếu dùng **Cloudflare Tunnel (`cloudflared`)**, quy trình sẽ như sau:

### 1. SSH vào VPS

```bash
ssh root@IP_VPS
```

### 2. Cài Java 17

```bash
sudo apt update
sudo apt install openjdk-17-jdk -y
```

### 3. Cài MySQL

```bash
sudo apt install mysql-server -y
```

Tạo database và user.

### 4. Upload project

* Upload file `app.jar`.
* Upload file `.env`.

### 5. Chạy ứng dụng

```bash
java -jar app.jar
```

Ứng dụng chạy tại:

```text
http://localhost:8080
```

---

## 6. Cài Cloudflare Tunnel

Cài `cloudflared`:

```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb
```

Kiểm tra:

```bash
cloudflared --version
```



## 8. Tạo Tunnel

```bash
cloudflared tunnel create myapp
```

Kết quả sẽ tạo một Tunnel ID.

---

## 9. Tạo file cấu hình

Ví dụ:

```bash
sudo mkdir -p /etc/cloudflared
sudo nano /etc/cloudflared/config.yml
```

Nội dung:

```yaml
tunnel: <Tunnel-ID>
credentials-file: /root/.cloudflared/<Tunnel-ID>.json

ingress:
  - hostname: api.tenmien.com
    service: http://localhost:8080
  - service: http_status:404
```

Ý nghĩa:

* `hostname`: domain sẽ truy cập.
* `service`: chuyển request đến ứng dụng Java ở `localhost:8080`.

---

## 10. Liên kết DNS

```bash
cloudflared tunnel route dns myapp api.tenmien.com
```

Cloudflare sẽ tự tạo bản ghi DNS trỏ đến Tunnel.

---

## 11. Chạy Tunnel

```bash
cloudflared tunnel run myapp
```

Hoặc cài làm service:

```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared

1. SSH vào VPS.

2. Chạy ứng dụng Java:

   ```bash
   java -jar app.jar
   ```

   Ứng dụng chạy ở:

   ```
   http://localhost:8080
   ```

3. Cài `cloudflared`.

4. Chạy lệnh:

   ```bash
   cloudflared tunnel --url http://localhost:8080
   ```

5. Sau vài giây, terminal sẽ hiện một đường dẫn như:

   ```
   https://abc123.trycloudflare.com
   ```


Luồng hoạt động:



Nếu đúng như mô tả của thầy là **"chạy lệnh xong Cloudflare cấp link HTTPS luôn"**, thì gần như chắc chắn là đang dùng **Cloudflare Quick Tunnel** với lệnh:

```bash
cloudflared tunnel --url http://localhost:8080
```
