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

    // (URL) được phép truy cập 
    const [allowedPaths, setAllowedPaths] = useState<Set<string>>(new Set());
    //  quyền đã được tính xong chưa?
    const [isPermissionsLoaded, setIsPermissionsLoaded] = useState<boolean>(false);

    const fetchAllowedPaths = useCallback((rawRoleName: string) => {
        // Backend có thể trả về STAFF hoặc ROLE_STAFF, nên cần chuẩn hóa về cùng một dạng.
        const roleName = rawRoleName.replace(/^ROLE_/, '').toUpperCase();

        if (roleName === 'ADMIN') {
            setAllowedPaths(new Set(['*']));
            setIsPermissionsLoaded(true);
            return;
        }
        if (roleName === 'STAFF') {
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
     */
    useEffect(() => {
        if (!user?.role) {
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


    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
        window.location.href = '/login';
    }, []);

    /**
     * HÀM: updateUser
     * MỤC ĐÍCH: Cập nhật MỘT PHẦN thông tin người dùng đang đăng nhập
     *   - Ghi lại localStorage để lần reload sau vẫn thấy thông tin đã cập nhật ,ProfileModal tự render lại với tên/ảnh mới.

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
     * CÁC BIẾN TRẠNG THÁI DẪN XUẤT dùng trực tiếp mà không phải tự so sánh role mỗi lần render.
     */
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
