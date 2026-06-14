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

    // Danh sách route được phép truy cập cho role hiện tại.
    const [allowedPaths, setAllowedPaths] = useState<Set<string>>(new Set());
    // Dùng để tránh quyết định điều hướng trước khi quyền được tính xong.
    const [isPermissionsLoaded, setIsPermissionsLoaded] = useState<boolean>(false);

    // ── Quyền cố định (hardcode) cho từng vai trò ──────────────────────────
    // STAFF: Đăng ký dịch vụ, Gói khám, Đăng ký gói khám → Xem/Thêm/Sửa
    //        Tư vấn trực tuyến, Lịch hẹn → Xem/Sửa (không Thêm/Xóa)
    // DOCTOR: Tư vấn, Lịch hẹn, Hồ sơ bệnh án, Đơn thuốc → Xem/Sửa (không Thêm/Xóa)
    //         Dịch vụ & Phòng (rooms) → Xem/Thêm/Sửa (không Xóa)

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
            // /service-registrations ẩn khỏi menu nên cũng xóa khỏi quyền STAFF
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
            // DOCTOR không có quyền vào /rooms
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

    useEffect(() => {
        if (!user?.role) {
            // Không có user/role thì xóa toàn bộ quyền cũ để tránh dùng nhầm dữ liệu phiên trước.
            setAllowedPaths(new Set());
            setIsPermissionsLoaded(true);
            return;
        }

        // Mỗi lần role đổi, tạm đánh dấu chưa sẵn sàng rồi tính lại quyền theo role mới.
        setIsPermissionsLoaded(false);
        // fetchAllowedPaths đồng bộ (không async) nên gọi trực tiếp
        fetchAllowedPaths(user.role);
    }, [user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

    const isPathAllowed = useCallback((path: string) => {
        // Các route nền tảng luôn cho vào để app còn đăng nhập, xem hồ sơ và điều hướng gốc.
        if (path === '/' || path === '/profile' || path === '/login') return true;

        if (allowedPaths.has('*')) return true;
        if (allowedPaths.has('__no_permission__')) return false;

        // Cho phép cả route đúng tuyệt đối lẫn route con, ví dụ /appointments/123.
        for (const p of allowedPaths) {
            if (p === path || path.startsWith(p + '/')) {
                return true;
            }
        }
        return false;
    }, [allowedPaths]);

    const login = useCallback(async (email: string, password: string) => {
        const res = await api.post('/auth/login', { email, password });
        const data = res.data;

        // Có đăng nhập thành công nhưng nếu là tài khoản phía client thì vẫn chặn khỏi admin portal.
        if (data.role === 'PATIENT' || data.role === 'USER') {
            throw new Error('Access denied. Regular users cannot access the administration portal.');
        }

        const u: User = {
            userId: data.userId,
            email: data.email,
            fullName: data.fullName,
            role: data.role,
        };

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(u));
        setToken(data.token);
        setUser(u);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
        // Reload cứng để xóa sạch state/route đang mở và quay về màn login ngay.
        window.location.href = '/login';
    }, []);

    const updateUser = useCallback((updatedFields: Partial<User>) => {
        setUser(prev => {
            if (!prev) return null;
            const updated = { ...prev, ...updatedFields };
            // Luôn ghi lại localStorage để lần reload sau vẫn thấy thông tin mới nhất.
            localStorage.setItem('user', JSON.stringify(updated));
            return updated;
        });
    }, []);

    const isAuthenticated = !!token && !!user;
    const isAdmin = user?.role === 'ADMIN';
    const isDoctor = user?.role === 'DOCTOR';
    const isStaff = user?.role === 'STAFF';

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
