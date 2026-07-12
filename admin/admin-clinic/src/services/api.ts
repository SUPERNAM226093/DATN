import axios from 'axios';
import { Logger } from '../utils/logger';

const configuredApiUrl = (import.meta.env.VITE_API_URL || 'https://jean-skirt-term-des.trycloudflare.com')
    .trim()
    .replace(/\/$/, '');

const api = axios.create({
    baseURL: `${configuredApiUrl}/api`,
});

// Bộ chặn Request (Request Interceptor) - Tự động đính kèm Token xác thực JWT vào header trước khi gửi request
api.interceptors.request.use((config) => {
    // Lấy mã JWT token đã được lưu trong localStorage của trình duyệt
    const token = localStorage.getItem('token');
    if (token) {
        // Cấu hình Header Authorization theo chuẩn Bearer token để Spring Boot Security xác thực quyền truy cập
        config.headers.Authorization = `Bearer ${token}`;
    }

    // Xử lý loại dữ liệu gửi đi (Content-Type)
    if (config.data instanceof FormData) {
        // Nếu dữ liệu gửi đi là FormData (ví dụ: upload ảnh bác sĩ/chuyên khoa), trình duyệt sẽ tự thiết lập Content-Type kèm boundary phù hợp
        // delete config.headers['Content-Type'];
    } else if (!config.headers['Content-Type']) {
        // Mặc định đối với các dữ liệu thông thường thì gửi dưới dạng JSON
        config.headers['Content-Type'] = 'application/json';
    }

    return config;
});

// Bộ chặn Response (Response Interceptor) - Xử lý tập trung các phản hồi trả về từ Server và quản lý lỗi
api.interceptors.response.use(
    (response) => response, // Trả về phản hồi trực tiếp nếu request thành công (HTTP 2xx)
    (error) => {
        // Kiểm tra xem lỗi xảy ra có phải từ request đăng nhập hay không (để tránh redirect vô tận khi gõ sai mật khẩu)
        const isLoginRequest = error.config?.url?.includes('/auth/login');

        // Nếu mã trạng thái là 401 Unauthorized (hết hạn phiên đăng nhập hoặc chưa đăng nhập) và không phải request đăng nhập
        if (error.response?.status === 401 && !isLoginRequest) {
            Logger.error("Bị lỗi 401 Unauthorized tại API", {
                url: error.config?.url,
                data: error.response?.data
            });

            // Tạm thời hiển thị Toast thay vì kích ra ngay lập tức để User (và mình) kịp nhìn thấy URL nào gây lỗi 401
            alert(`[DEBUG] Lỗi 401 ở API: ${error.config?.url}. Đã ghi log.`);

            // Tiến hành dọn dẹp các thông tin đăng nhập cũ trong localStorage để bảo mật thông tin
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // Chuyển hướng người dùng về trang đăng nhập của hệ thống quản trị
            window.location.href = '/login';
        }

        // Định dạng lại thông báo lỗi giúp hiển thị giao diện UI (Toast) hoặc debug dễ dàng hơn
        const message = error.response?.data?.message || error.message || 'Có lỗi xảy ra ngoài ý muốn';
        const status = error.response?.status ? ` [HTTP ${error.response.status}]` : '';
        // Lưu thông báo lỗi thân thiện vào thuộc tính displayMessage
        error.displayMessage = message + status;

        return Promise.reject(error);
    }
);

export default api;
