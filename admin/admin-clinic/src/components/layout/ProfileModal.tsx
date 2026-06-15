import { useState, useEffect } from 'react';
import { useAuth } from '../../store/AuthContext';
import api from '../../services/api';
import './ProfileModal.css';
interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * COMPONENT: ProfileModal
 * MÔ TẢ: Hộp thoại (Modal) cho phép người dùng xem và cập nhật thông tin cá nhân của họ.
 * - Hiển thị ảnh đại diện tạm thời, họ tên, email và vai trò (Role).
 * - Cho phép thay đổi họ tên mới và số điện thoại mới.
 * - Hỗ trợ thay đổi mật khẩu (nếu điền). Mật khẩu mới cần tối thiểu 6 ký tự.
 * - Sau khi cập nhật thành công, thông tin cục bộ trong localStorage sẽ được cập nhật đồng bộ để hiển thị lên UI.
 */
export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
    // Lấy thông tin người dùng hiện tại và hàm cập nhật thông tin người dùng từ AuthContext
    const { user, updateUser } = useAuth();

    // Các state quản lý trạng thái tải (loading), thông báo lỗi (error), và thông báo thành công (success)
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // State lưu dữ liệu form chỉnh sửa thông tin cá nhân
    const [form, setForm] = useState({
        fullName: '',
        phone: '',
        password: '',
        confirmPassword: ''
    });
    const [showPassword, setShowPassword] = useState(false);

    const ERROR_MAP: Record<string, string> = {
        "ERR_PHONE_EXISTS": "Số điện thoại này đã được sử dụng bởi tài khoản khác.",
        "ERR_INVALID_FORMAT": "Dữ liệu nhập vào không hợp lệ. SĐT cần đúng chuẩn và mật khẩu (nếu đổi) cần ít nhất 6 ký tự.",
        "ERR_UNAUTHORIZED": "Phiên đăng nhập hết hạn, vui lòng đăng nhập lại."
    };

    const getErrorMessage = (rawError: string) => {
        for (const key in ERROR_MAP) {
            if (rawError.includes(key)) return ERROR_MAP[key];
        }
        return rawError;
    };

    // Effect: Khi modal được mở lên, tiến hành gọi API để lấy thông tin chi tiết người dùng mới nhất từ database
    useEffect(() => {
        if (isOpen && user) {
            const fetchUser = async () => {
                try {
                    const res = await api.get(`/users/${user.userId}`);
                    setForm({
                        fullName: res.data.fullName || '',
                        phone: res.data.phone || '',
                        password: '',
                        confirmPassword: ''
                    });
                } catch (err) {
                    console.error("Không thể lấy thông tin chi tiết người dùng", err);
                }
            };
            fetchUser();
        }
    }, [isOpen, user]);

    // Nếu Modal không được thiết lập mở (isOpen === false), không render gì cả
    if (!isOpen) return null;

    /**
     * HÀM: handleSubmit
     * MÔ TẢ: Xử lý sự kiện gửi form (Submit) để lưu thông tin cập nhật lên server.
     * @param e Đối tượng sự kiện FormEvent của React.
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Kiểm tra độ dài mật khẩu mới (nếu người dùng có ý định thay đổi mật khẩu)
        if (form.password && form.password.length < 6) {
            setError("Mật khẩu mới phải có ít nhất 6 ký tự.");
            return;
        }

        // Đảm bảo mật khẩu xác nhận khớp hoàn toàn với mật khẩu mới đã nhập
        if (form.password !== form.confirmPassword) {
            setError("Mật khẩu xác nhận không khớp.");
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // Chuẩn bị dữ liệu để gửi lên Server
            const dataToUpdate: any = {
                fullName: form.fullName,
                phone: form.phone,
            };
            // Chỉ gửi newPassword nếu người dùng nhập vào
            if (form.password) {
                dataToUpdate.newPassword = form.password;
            }

            // Gọi API cập nhật thông tin cá nhân của người dùng hiện tại
            await api.put(`/users/profile`, dataToUpdate);
            setSuccess('Cập nhật thông tin thành công!');

            // Cập nhật lại thông tin tài khoản lưu trữ cục bộ để Header/Sidebar cập nhật ngay lập tức
            updateUser({ fullName: form.fullName });

            // Reset lại ô mật khẩu
            setForm(prev => ({ ...prev, password: '', confirmPassword: '' }));

            // Đóng modal sau 1 giây hiển thị thông báo thành công
            setTimeout(() => {
                onClose();
            }, 1000);
        } catch (err: any) {
            setError(getErrorMessage(err.response?.data?.message || err.message || 'Có lỗi xảy ra, vui lòng thử lại.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content profile-modal">
                {/* Tiêu đề modal và nút đóng ở góc trên bên phải */}
                <div className="modal-header">
                    <h2>Hồ sơ của bạn</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    {/* Banner hiển thị ảnh đại diện và vai trò (Role) */}
                    <div className="profile-info-banner">
                        <div className="profile-avatar">
                            {form.fullName.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="profile-details">
                            <h3>{form.fullName}</h3>
                            <p>{user?.email}</p>
                            <span className="role-badge">{user?.role}</span>
                        </div>
                    </div>

                    {/* Hiển thị các ô thông báo lỗi hoặc thông báo thành công */}
                    {error && <div className="alert alert-error">{error}</div>}
                    {success && <div className="alert alert-success">{success}</div>}

                    {/* Form chỉnh sửa dữ liệu */}
                    <form onSubmit={handleSubmit} className="profile-form">
                        <div className="form-group">
                            <label>Họ và tên mới</label>
                            <input
                                type="text"
                                required
                                value={form.fullName}
                                onChange={e => setForm({ ...form, fullName: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Số điện thoại mới</label>
                            <input
                                type="tel"
                                inputMode="tel"
                                maxLength={15}
                                required
                                value={form.phone}
                                onChange={e => setForm({ ...form, phone: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Mật khẩu mới (Để trống nếu không đổi)</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                    placeholder="••••••••"
                                />
                                {/* Nút xem/ẩn mật khẩu ẩn hiện linh hoạt */}
                                {form.password && (
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}
                                    >
                                        {showPassword ? "🙈" : "👁️"}
                                    </button>
                                )}
                            </div>
                        </div>
                        {/* Chỉ hiện ô nhập lại mật khẩu nếu người dùng bắt đầu gõ mật khẩu mới */}
                        {form.password && (
                            <div className="form-group">
                                <label>Xác nhận mật khẩu mới</label>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={form.confirmPassword}
                                    onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                                    placeholder="••••••••"
                                    required={!!form.password}
                                />
                            </div>
                        )}
                        {/* Các nút hành động lưu thay đổi hoặc hủy */}
                        <div className="form-actions">
                            <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
