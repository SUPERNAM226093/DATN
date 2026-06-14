import { useAuth } from '../../store/AuthContext';
import { HiOutlineArrowRightOnRectangle } from 'react-icons/hi2';
import { useNavigate } from 'react-router-dom';
import './Header.css';

export default function Header() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
    };

    return (
        <header className="app-header">
            <div className="header-left">
                <h2 className="header-greeting">
                    Chào mừng trở lại, <span>{user?.fullName || 'User'}</span>
                </h2>
            </div>

            <div className="header-right">
                <div
                    className="header-user-info"
                    onClick={() => navigate('/profile')}
                    style={{ cursor: 'pointer' }}
                    title="Xem hồ sơ cá nhân"
                >
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

                <button className="btn-icon logout-btn" onClick={handleLogout} title="Đăng xuất">
                    <HiOutlineArrowRightOnRectangle size={20} />
                </button>
            </div>
        </header>
    );
}
