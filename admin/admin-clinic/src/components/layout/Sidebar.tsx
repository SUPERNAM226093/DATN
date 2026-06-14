import { NavLink } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';

import {
    HiOutlineHome,
    HiOutlineUsers,
    HiOutlineUserCircle,
    HiOutlineAcademicCap,
    HiOutlineCube,
    HiOutlineCalendar,
    HiOutlineClipboardDocument,
    HiOutlineDocumentText,
    HiOutlineClipboardDocumentList,
    HiOutlineHeart,
    HiOutlineLink,
    HiOutlineVideoCamera,
} from 'react-icons/hi2';
import { t } from '../../utils/i18n';
import './Sidebar.css';

interface NavItem {
    path: string;
    label: string;
    icon: React.ReactNode;
    alwaysVisible?: boolean;
    adminOnly?: boolean;
    hidden?: boolean; // Ẩn khỏi sidebar nhưng route vẫn hoạt động
}

/**
 * Danh sách toàn bộ các danh mục chức năng hiển thị trên Sidebar của trang quản trị.
 */
export const navItems: NavItem[] = [
    { path: '/', label: 'menu.dashboard', icon: <HiOutlineHome />, adminOnly: true },
    { path: '/users', label: 'menu.users', icon: <HiOutlineUsers /> },

    { path: '/doctors', label: 'menu.doctors', icon: <HiOutlineUserCircle /> },
    { path: '/specializations', label: 'menu.specializations', icon: <HiOutlineAcademicCap /> },
    { path: '/rooms', label: 'menu.services', icon: <HiOutlineCube /> },
    { path: '/room-bookings', label: 'menu.registrations', icon: <HiOutlineClipboardDocumentList /> },
    { path: '/service-registrations', label: 'menu.serviceRegistrations', icon: <HiOutlineLink />, hidden: true },
    { path: '/health-packages', label: 'menu.healthPackages', icon: <HiOutlineHeart /> },
    { path: '/health-package-bookings', label: 'menu.healthPackageBookings', icon: <HiOutlineClipboardDocumentList /> },
    { path: '/online-consultations', label: 'menu.onlineConsultations', icon: <HiOutlineVideoCamera /> },
    { path: '/appointments', label: 'menu.appointments', icon: <HiOutlineCalendar /> },
    { path: '/medical-records', label: 'menu.medicalRecords', icon: <HiOutlineClipboardDocument /> },
    { path: '/prescriptions', label: 'menu.prescriptions', icon: <HiOutlineDocumentText /> },
    { path: '/profile', label: 'menu.profile', icon: <HiOutlineUserCircle />, alwaysVisible: true },
];

/**
 * COMPONENT: Sidebar
 * MÔ TẢ: Thanh điều hướng bên trái (Sidebar) của hệ thống Admin.
 * - Lọc danh sách menu hiển thị dựa trên vai trò (ADMIN thấy hết) và quyền được cấp cho từng Route cụ thể (đối với các vai trò khác).
 * - Hiển thị thông báo Cảnh báo (Warning) nếu người dùng không được cấp bất kỳ quyền truy cập nào (`__no_permission__`).
 * - Nhóm các menu thành 4 khu vực: Dashboard, Chức năng chính, Dành cho Admin, và Cá nhân để giao diện gọn gàng hơn.
 */
export default function Sidebar() {
    // Trích xuất các thuộc tính phân quyền và thông tin user hiện tại
    const { user, allowedPaths, isPathAllowed, isPermissionsLoaded, logout } = useAuth();

    // Đang trong trạng thái tải dữ liệu phân quyền
    const loading = !!user?.role && !isPermissionsLoaded;

    // Trường hợp đặc biệt: Tài khoản không có bất kỳ quyền truy cập nào
    if (allowedPaths.has('__no_permission__')) {
        return (
            <aside className="sidebar">
                <div className="sidebar-brand">
                    <div className="sidebar-logo"><span className="logo-icon">⚕</span></div>
                    <div className="sidebar-brand-text">
                        <span className="brand-name">{"Quản trị Phòng khám"}</span>
                    </div>
                </div>
                <nav className="sidebar-nav">
                    <div className="nav-section" style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        <p>⚠️ Tài khoản của bạn chưa được cấp quyền truy cập hoặc vai trò của bạn đã bị khóa.</p>
                        <p style={{ marginTop: '0.5rem' }}>Vui lòng liên hệ Admin để biết thêm chi tiết.</p>
                        <button
                            onClick={logout}
                            style={{
                                marginTop: '1.5rem',
                                width: '100%',
                                padding: '0.6rem 1rem',
                                borderRadius: '6px',
                                backgroundColor: '#dc2626',
                                color: 'white',
                                border: 'none',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#b91c1c')}
                            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#dc2626')}
                        >
                            Đăng xuất
                        </button>
                    </div>
                </nav>
            </aside>
        );
    }

    // Lọc danh sách menu mà người dùng có quyền nhìn thấy
    const visibleItems = navItems.filter(item => {
        // Bỏ qua mục bị ẩn (hidden: true) — route vẫn hoạt động, chỉ không hiện trên menu
        if (item.hidden) return false;
        if (item.alwaysVisible) return true;
        if (item.adminOnly) return user?.role === 'ADMIN';

        // ADMIN mặc định được thấy mọi đường dẫn được khai báo
        if (user?.role === 'ADMIN') return true;

        // Các role khác: Chỉ hiển thị nếu đường dẫn được máy chủ phân quyền cấp phép
        return isPathAllowed(item.path);
    });

    // Phân nhóm các phần tử menu để render theo từng cụm chức năng riêng biệt
    const dashboardItems = visibleItems.filter(i => i.path === '/');
    const mainItems = visibleItems.filter(i =>
        i.path !== '/' &&
        i.path !== '/profile' &&
        !i.adminOnly
    );
    const adminItems = visibleItems.filter(i => i.adminOnly && i.path !== '/');
    const settingsItems = visibleItems.filter(i => i.path === '/profile');

    // Hiển thị trạng thái đang tải (Loading) nếu chưa tải xong phân quyền
    if (loading) {
        return (
            <aside className="sidebar">
                <div className="sidebar-brand">
                    <div className="sidebar-logo"><span className="logo-icon">⚕</span></div>
                    <div className="sidebar-brand-text">
                        <span className="brand-name">{"Quản trị Phòng khám"}</span>
                    </div>
                </div>
                <nav className="sidebar-nav">
                    <div className="nav-section">
                        <span className="nav-section-label">{"Đang tải..."}</span>
                    </div>
                </nav>
            </aside>
        );
    }

    return (
        <aside className="sidebar">
            {/* Header của Sidebar: Tên và Logo phòng khám */}
            <div className="sidebar-brand">
                <div className="sidebar-logo">
                    <span className="logo-icon">⚕</span>
                </div>
                <div className="sidebar-brand-text">
                    <span className="brand-name">{"Quản trị Phòng khám"}</span>
                </div>
            </div>

            {/* Menu điều hướng chính */}
            <nav className="sidebar-nav">
                <div className="nav-section">
                    {/* Nhóm 1: Trang thống kê Dashboard */}
                    {dashboardItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            <span className="nav-label">{t(item.label)}</span>
                        </NavLink>
                    ))}

                    {/* Nhóm 2: Các chức năng nghiệp vụ chính của phòng khám */}
                    {mainItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            <span className="nav-label">{t(item.label)}</span>
                        </NavLink>
                    ))}

                    {/* Nhóm 3: Các chức năng cấu hình hệ thống chỉ dành cho ADMIN */}
                    {adminItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            <span className="nav-label">{t(item.label)}</span>
                        </NavLink>
                    ))}

                    {/* Nhóm 4: Cài đặt và Trang cá nhân */}
                    {settingsItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            <span className="nav-label">{t(item.label)}</span>
                        </NavLink>
                    ))}
                </div>
            </nav>
        </aside>
    );
}
