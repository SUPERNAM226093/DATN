import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';

/**
 * Interface định nghĩa các Props cho ProtectedRoute.
 * @property allowedRoles Danh sách các Role (ví dụ: 'ADMIN', 'DOCTOR') được phép truy cập route này.
 */
interface Props {
    allowedRoles?: string[];
}

/**
 * COMPONENT: ProtectedRoute
 * MÔ TẢ: Thành phần bảo vệ các Route  yêu cầu đăng nhập và phân quyền.
 * - Kiểm tra nếu người dùng chưa đăng nhập -> Chuyển hướng về trang Đăng nhập (/login).
 * - Kiểm tra nếu Route chỉ cho phép một số Role cụ thể và Role của user không khớp -> Chuyển hướng về trang chủ 
 * - Kiểm tra nếu đường dẫn hiện tại không nằm trong danh sách quyền được cấp phép (`isPathAllowed`) -> Chuyển hướng về trang cá nhân (/profile).
 */
export default function ProtectedRoute({ allowedRoles }: Props) {
    // Trích xuất trạng thái đăng nhập, thông tin user, và các bộ lọc quyền từ AuthContext
    const { isAuthenticated, user, isPathAllowed, isPermissionsLoaded } = useAuth();
    const location = useLocation();

    // 1. Nếu chưa đăng nhập thành công, chuyển hướng người dùng tới trang Login ngay lập tức
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // 2. Nếu route yêu cầu Role cụ thể mà người dùng hiện tại không có Role đó, chuyển hướng về trang chủ
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    // 3. Kiểm tra phân quyền động: Chờ cho hệ thống tải xong danh sách các API/URL được phép truy cập
    if (!isPermissionsLoaded) {
        return <div className="flex h-screen items-center justify-center text-gray-500">Đang xác thực phân quyền...</div>;
    }

    // 4. Nếu tài khoản không được cấp quyền truy cập tới đường dẫn hiện tại, chuyển hướng về trang Profile
    if (user && !isPathAllowed(location.pathname)) {
        return <Navigate to="/profile" replace />;
    }

    return <Outlet />;
}
