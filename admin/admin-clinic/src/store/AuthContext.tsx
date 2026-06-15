import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import api from '../services/api';

interface User {
    userId: number;
    email: string;
    fullName: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isAdmin: boolean;
    isDoctor: boolean;
    isStaff: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    updateUser: (user: Partial<User>) => void;
    allowedPaths: Set<string>;
    isPathAllowed: (path: string) => boolean;
    isPermissionsLoaded: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(() => {
        try {
            const stored = localStorage.getItem('user');
            return stored ? (JSON.parse(stored) as User) : null;
        } catch {
            localStorage.removeItem('user');
            return null;
        }
    });

    const [token, setToken] = useState<string | null>(() => {
        // Khôi phục phiên đăng nhập sau khi reload trang.
        return localStorage.getItem('token');
    });

    // Danh sách route (URL) được phép truy cập cho vai trò hiện tại.
    const [allowedPaths, setAllowedPaths] = useState<Set<string>>(new Set());
    // Cờ báo hiệu: quyền đã được tính xong chưa? Dùng để tránh ProtectedRoute điều hướng sai khi quyền chưa load xong.
    const [isPermissionsLoaded, setIsPermissionsLoaded] = useState<boolean>(false);

    /**
     * HÀM: fetchAllowedPaths
     * MỤC ĐÍCH: Nhận vào tên vai trò (role) của người dùng, rồi tạo ra một danh sách
     *           các đường dẫn URL mà người đó được phép truy cập trong hệ thống admin.
     *
     * CÁCH HOẠT ĐỘNG:
     *   1. Chuẩn hóa tên role: Backend có thể trả về "STAFF" hoặc "ROLE_STAFF",
     *      hàm loại bỏ tiền tố "ROLE_" và chuyển về viết HOA để so sánh nhất quán.
     *   2. So sánh với từng vai trò đã biết (ADMIN, STAFF, DOCTOR) rồi gán danh sách
     *      đường dẫn tương ứng vào state `allowedPaths`.
     *   3. Đánh dấu `isPermissionsLoaded = true` để báo ProtectedRoute có thể quyết định.
     *
     * QUY TẮC PHÂN QUYỀN:
     *   - ADMIN  → Set(['*'])                 → Được vào TẤT CẢ các trang.
     *   - STAFF  → Set(['/rooms', '/health-packages', ...]) → Chỉ vào các trang vận hành.
     *   - DOCTOR → Set(['/appointments', '/medical-records', ...]) → Chỉ vào trang chuyên môn.
     *   - Khác   → Set(['__no_permission__'])  → Bị chặn tất cả.
     *
     * LƯU Ý: Hàm này ĐỒNG BỘ (không async), tính toán ngay trong bộ nhớ, không gọi API.
     *        Bọc trong useCallback để React không tạo lại hàm mỗi lần render.
     */
    const fetchAllowedPaths = useCallback((rawRoleName: string) => {
        // Backend có thể trả về STAFF hoặc ROLE_STAFF, nên cần chuẩn hóa về cùng một dạng.
        const roleName = rawRoleName.replace(/^ROLE_/, '').toUpperCase();

        if (roleName === 'ADMIN') {
            // * nghĩa là cho phép toàn bộ route nội bộ của admin.
            setAllowedPaths(new Set(['*']));
            setIsPermissionsLoaded(true);
            return;
        }
        if (roleName === 'STAFF') {
            // STAFF được truy cập: Phòng bệnh, Đặt phòng, Gói khám, Đăng ký gói khám, Tư vấn, Lịch hẹn
            setAllowedPaths(new Set([
                '/rooms',
                '/room-bookings',
                '/health-packages',
                '/health-package-bookings',
                '/online-consultations',
                '/appointments',
            ]));
            setIsPermissionsLoaded(true);
            return;
        }
        if (roleName === 'DOCTOR') {
            // DOCTOR được truy cập: Tư vấn, Lịch hẹn, Hồ sơ bệnh án, Đơn thuốc
            setAllowedPaths(new Set([
                '/online-consultations',
                '/appointments',
                '/medical-records',
                '/prescriptions',
            ]));
            setIsPermissionsLoaded(true);
            return;
        }
        // Sentinel này giúp phân biệt rõ trạng thái "đã tính quyền nhưng không được vào đâu".
        setAllowedPaths(new Set(['__no_permission__']));
        setIsPermissionsLoaded(true);
    }, []);

    /**
     * HOOK: useEffect — Theo dõi sự thay đổi của `user.role`
     * MỤC ĐÍCH: Tự động tính lại danh sách đường dẫn được phép mỗi khi vai trò
     *           người dùng thay đổi (đăng nhập, đăng xuất, đổi role).
     *
     * CÁC KỊCH BẢN CHẠY:
     *   1. Chưa đăng nhập (user = null): Xóa sạch quyền cũ, đánh dấu đã tải xong
     *      để app không bị treo ở màn "Đang xác thực phân quyền...".
     *   2. Vừa đăng nhập thành công: user.role được set → effect chạy → gọi
     *      fetchAllowedPaths để tính danh sách đường dẫn cho role đó.
     *   3. Trước khi tính: Đặt isPermissionsLoaded = false để ProtectedRoute biết phải chờ,
     *      tránh điều hướng sai trong thời gian tính toán.
     *
     * DEPENDENCY [user?.role]: Effect chỉ chạy lại khi GIÁ TRỊ role thay đổi,
     *      không chạy lại mỗi lần render (tối ưu hiệu suất).
     */
    useEffect(() => {
        if (!user?.role) {
            // Không có user/role → xóa toàn bộ quyền cũ để tránh dùng nhầm dữ liệu phiên trước.
            setAllowedPaths(new Set());
            setIsPermissionsLoaded(true);
            return;
        }
        // Mỗi lần role đổi: tạm đánh dấu chưa sẵn sàng, rồi tính lại quyền theo role mới.
        setIsPermissionsLoaded(false);
        fetchAllowedPaths(user.role); // Hàm đồng bộ, gọi trực tiếp không cần await.
    }, [user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

    /**
     * HÀM: isPathAllowed
     * MỤC ĐÍCH: Kiểm tra xem một đường dẫn URL cụ thể có nằm trong danh sách
     *           được phép của người dùng hiện tại hay không.
     *
     * NHẬN VÀO: path — chuỗi URL hiện tại (ví dụ: "/appointments", "/medical-records/5")
     * TRẢ VỀ:   true = được vào trang đó | false = bị chặn, đẩy về /profile
     *
     * QUY TẮC KIỂM TRA (theo thứ tự ưu tiên):
     *   1. Các route công khai (/login, /profile, /) → luôn cho vào.
     *   2. allowedPaths chứa '*' (ADMIN)              → cho vào tất cả.
     *   3. allowedPaths chứa '__no_permission__'       → chặn tất cả.
     *   4. Kiểm tra khớp chính xác hoặc là route con:
     *      Ví dụ: có '/appointments' trong Set → '/appointments/123' cũng được vào.
     *
     * SỬ DỤNG BỞI: ProtectedRoute.tsx (dòng 41) — mỗi lần user điều hướng tới trang mới.
     */
    const isPathAllowed = useCallback((path: string) => {
        // Các route nền tảng luôn cho vào để app còn đăng nhập, xem hồ sơ và điều hướng gốc.
        if (path === '/' || path === '/profile' || path === '/login') return true;

        if (allowedPaths.has('*')) return true;                    // ADMIN: toàn quyền
        if (allowedPaths.has('__no_permission__')) return false;   // Role lạ: chặn hết

        // Khớp tuyệt đối (/appointments) hoặc khớp route con (/appointments/123).
        for (const p of allowedPaths) {
            if (p === path || path.startsWith(p + '/')) {
                return true;
            }
        }
        return false;
    }, [allowedPaths]);

    /**
     * HÀM: login
     * MỤC ĐÍCH: Gửi thông tin đăng nhập lên Backend, nhận về JWT Token và thông tin
     *           người dùng, rồi lưu vào localStorage để duy trì phiên đăng nhập.
     *
     * LUỒNG XỬ LÝ:
     *   1. Gọi POST /api/auth/login với { email, password }.
     *   2. Nhận về: { userId, email, fullName, role, token (JWT) }.
     *   3. Nếu role là PATIENT hoặc USER → ném lỗi ngay, không cho vào admin portal.
     *   4. Lưu token + user vào localStorage (để reload trang vẫn còn phiên đăng nhập).
     *   5. Cập nhật state → useEffect sẽ tự kích hoạt và tính lại allowedPaths.
     *
     * LỖI CÓ THỂ XẢY RA (sẽ được LoginPage bắt và hiển thị toast):
     *   - Sai email/mật khẩu           → Backend trả 401 → ném lỗi Axios.
     *   - Tài khoản PATIENT đăng nhập  → throw new Error() ngay tại Frontend.
     *
     * GỌI BỞI: LoginPage.tsx khi người dùng bấm nút "Đăng nhập".
     */
    const login = useCallback(async (email: string, password: string) => {
        const res = await api.post('/auth/login', { email, password });
        const data = res.data;

        // Đăng nhập thành công về phía Backend, nhưng tài khoản PATIENT/USER không được vào admin.
        if (data.role === 'PATIENT' || data.role === 'USER') {
            throw new Error('Access denied. Regular users cannot access the administration portal.');
        }

        const u: User = {
            userId: data.userId,
            email: data.email,
            fullName: data.fullName,
            role: data.role,
        };

        localStorage.setItem('token', data.token); // Lưu JWT để gắn vào header API sau này.
        localStorage.setItem('user', JSON.stringify(u)); // Lưu thông tin user để hiển thị trên UI.
        setToken(data.token);
        setUser(u); // Cập nhật state → useEffect chạy → fetchAllowedPaths tính quyền mới.
    }, []);

    /**
     * HÀM: logout
     * MỤC ĐÍCH: Xóa toàn bộ dữ liệu phiên đăng nhập và điều hướng về trang đăng nhập.
     *
     * CÁCH HOẠT ĐỘNG:
     *   1. Xóa token và user khỏi localStorage.
     *   2. Reset state token và user về null.
     *   3. Dùng window.location.href (reload cứng) thay vì navigate() để đảm bảo
     *      xóa sạch TOÀN BỘ state React còn sót lại trong bộ nhớ, tránh dữ liệu cũ
     *      của người dùng trước hiển thị lại.
     *
     * GỌI BỞI: Header.tsx khi người dùng bấm nút "Đăng xuất".
     */
    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
        // Reload cứng: xóa sạch mọi state React và cache route, đưa về trang login.
        window.location.href = '/login';
    }, []);

    /**
     * HÀM: updateUser
     * MỤC ĐÍCH: Cập nhật MỘT PHẦN thông tin người dùng đang đăng nhập
     *           (ví dụ: đổi họ tên, ảnh đại diện từ trang Profile).
     *
     * THAM SỐ:
     *   - updatedFields: Partial<User> — chỉ truyền các trường muốn thay đổi.
     *     Ví dụ: updateUser({ fullName: 'Nguyễn Văn B' })
     *     → Giữ nguyên email, role, userId; chỉ đổi fullName.
     *
     * CÁCH HOẠT ĐỘNG:
     *   - Spread operator: { ...prev, ...updatedFields } gộp thông tin cũ và mới.
     *   - Ghi lại localStorage để lần reload sau vẫn thấy thông tin đã cập nhật.
     *   - Cập nhật state user → Header, ProfileModal tự render lại với tên/ảnh mới.
     *
     * GỌI BỞI: ProfilePage.tsx sau khi người dùng lưu thành công thông tin cá nhân.
     */
    const updateUser = useCallback((updatedFields: Partial<User>) => {
        setUser(prev => {
            if (!prev) return null;
            const updated = { ...prev, ...updatedFields }; // Gộp thông tin cũ + mới.
            localStorage.setItem('user', JSON.stringify(updated)); // Đồng bộ với localStorage.
            return updated;
        });
    }, []);

    /**
     * CÁC BIẾN TRẠNG THÁI DẪN XUẤT (Derived State / Computed Values)
     * MỤC ĐÍCH: Tính sẵn các cờ boolean từ state gốc để các component con
     *           dùng trực tiếp mà không phải tự so sánh role mỗi lần render.
     *
     * - isAuthenticated: true khi CẢ HAI token VÀ user đều tồn tại và khác null.
     *   (Chỉ có token thôi chưa đủ — user có thể đã bị clear nhưng token chưa xóa kịp)
     * - isAdmin:  true khi role === 'ADMIN'  → dùng để hiện/ẩn nút Thêm/Xóa toàn hệ thống.
     * - isDoctor: true khi role === 'DOCTOR' → dùng để lọc dữ liệu riêng của bác sĩ đó.
     * - isStaff:  true khi role === 'STAFF'  → dùng để kiểm tra quyền quản lý phòng/gói.
     */
    const isAuthenticated = !!token && !!user;
    const isAdmin  = user?.role === 'ADMIN';
    const isDoctor = user?.role === 'DOCTOR';
    const isStaff  = user?.role === 'STAFF';

    /**
     * PHẦN: AuthContext.Provider
     * MỤC ĐÍCH: Bọc toàn bộ ứng dụng và chia sẻ (provide) các giá trị xuống
     *           cho BẤT KỲ component con nào muốn dùng qua hook useAuth().
     *
     * CÁC GIÁ TRỊ ĐƯỢC CHIA SẺ XUỐNG:
     *   - user, token           → Thông tin phiên đăng nhập hiện tại.
     *   - isAuthenticated       → Cờ kiểm tra đã đăng nhập chưa (ProtectedRoute dùng).
     *   - isAdmin/isDoctor/isStaff → Cờ vai trò nhanh (dùng để ẩn/hiện nút bấm trong UI).
     *   - login, logout         → Hàm thao tác phiên (LoginPage, Header gọi).
     *   - updateUser            → Hàm cập nhật thông tin cá nhân (ProfilePage gọi).
     *   - allowedPaths          → Danh sách URL được phép (Sidebar dùng để ẩn/hiện menu).
     *   - isPathAllowed         → Hàm kiểm tra quyền URL (ProtectedRoute dùng để chặn).
     *   - isPermissionsLoaded   → Cờ báo quyền đã tính xong, tránh điều hướng sai sớm.
     */
    return (
        <AuthContext.Provider value={{
            user,
            token,
            isAuthenticated,
            isAdmin,
            isDoctor,
            isStaff,
            login,
            logout,
            updateUser,
            allowedPaths,
            isPathAllowed,
            isPermissionsLoaded
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
