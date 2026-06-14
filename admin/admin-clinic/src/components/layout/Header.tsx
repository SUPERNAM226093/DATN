import { useAuth } from '../../store/AuthContext';
import { HiOutlineArrowRightOnRectangle, HiOutlineArrowDownTray } from 'react-icons/hi2';
import { useNavigate } from 'react-router-dom';

import { usePWA } from '../../hooks/usePWA';
import './Header.css';

/**
 * COMPONENT: Header
 * MÔ TẢ: Thanh tiêu đề trên cùng của ứng dụng quản trị.
 * - Hiển thị lời chào người dùng đang đăng nhập.
 * - Cung cấp nút cài đặt ứng dụng PWA (nếu thiết bị hỗ trợ).
 * - Hiển thị thông tin tên, ảnh đại diện và vai trò (Role) của người dùng hiện tại, có thể nhấn vào để vào trang cá nhân.
 * - Cung cấp nút Đăng xuất khỏi hệ thống.
 */
export default function Header() {
    // Lấy thông tin user đăng nhập và hàm logout từ AuthContext
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    
    // Kiểm tra và cài đặt ứng dụng dạng PWA (Progressive Web App)
    const { isInstallable, isStandalone, installApp } = usePWA();

    // Xử lý khi nhấn nút Đăng xuất
    const handleLogout = () => {
        logout();
    };

    return (
        <header className="app-header">
            {/* Phần hiển thị lời chào ở góc trái */}
            <div className="header-left">
                <h2 className="header-greeting">
                    {"Chào mừng trở lại, "} <span>{user?.fullName || 'User'}</span>
                </h2>
            </div>
            {/* Các tiện ích và thông tin tài khoản ở góc phải */}
            <div className="header-right">
                {/* Hiển thị nút tải PWA nếu đáp ứng đủ điều kiện cài đặt và chưa chạy ở dạng Standalone */}
                {!isStandalone && isInstallable && (
                    <button 
                        className="install-app-btn" 
                        onClick={installApp} 
                        title={"Tải ứng dụng quản lý"}
                    >
                        <HiOutlineArrowDownTray size={20} />
                        <span>Cài đặt</span>
                    </button>
                )}

                {/* Thông tin tài khoản đăng nhập (Họ tên + Badge chức vụ), click để chuyển hướng đến trang Profile */}
                <div 
                    className="header-user-info" 
                    onClick={() => navigate('/profile')}
                    style={{ cursor: 'pointer' }}
                    title="Xem hồ sơ cá nhân"
                >
                    {/* Ảnh đại diện được lấy từ chữ cái đầu của họ tên */}
                    <div className="header-avatar">
                        {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="header-user-text">
                        <span className="header-user-name">{user?.fullName}</span>
                        <span className={`header-role-badge role-${user?.role?.toLowerCase()}`}>
                            {user?.role}
                        </span>
                    </div>
                </div>
                {/* Nút Đăng xuất */}
                <button className="btn-icon logout-btn" onClick={handleLogout} title={"Đăng xuất"}>
                    <HiOutlineArrowRightOnRectangle size={20} />
                </button>
            </div>
        </header>
    );
}
