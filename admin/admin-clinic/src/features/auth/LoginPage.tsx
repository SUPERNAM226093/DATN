import { useState, type FormEvent } from 'react';
import { useAuth } from '../../store/AuthContext';
import { toast } from 'react-toastify';
import './LoginPage.css';
import ForgotPasswordModal from './ForgotPasswordModal';


export default function LoginPage() {
    const [email, setEmail] = useState(''); // Lưu email người dùng nhập
    const [password, setPassword] = useState(''); // Lưu mật khẩu người dùng nhập
    const [loading, setLoading] = useState(false); // Trạng thái đang xử lý đăng nhập
    const { login } = useAuth(); // Lấy hàm login từ AuthContext

    const [isForgotOpen, setIsForgotOpen] = useState(false); // Trạng thái đóng/mở Modal quên mật khẩu

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(email, password);
            toast.success("Đăng nhập thành công!");
            window.location.href = '/';
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Thông tin đăng nhập không hợp lệ");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-card">
                    {/* PHẦN ĐẦU TRANG ĐĂNG NHẬP */}
                    <div className="login-header">
                        <div className="login-logo">
                            <span>⚕</span>
                        </div>
                        <h1>{"Clinic Admin"}</h1>
                        <p>{"Đăng nhập vào tài khoản của bạn để tiếp tục"}</p>
                    </div>

                    {/* BIỂU MẪU ĐĂNG NHẬP */}
                    <form onSubmit={handleSubmit} className="login-form">
                        {/* Nhập Email */}
                        <div className="form-group">
                            <label htmlFor="email">{"Địa chỉ Email"}</label>
                            <input
                                id="email"
                                type="email"
                                className="form-control"
                                placeholder={"admin@clinic.com"}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>

                        {/* Nhập Mật khẩu */}
                        <div className="form-group">
                            <label htmlFor="password">{"Mật khẩu"}</label>
                            <input
                                id="password"
                                type="password"
                                className="form-control"
                                placeholder={"Nhập mật khẩu của bạn"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        {/* Lựa chọn Quên mật khẩu */}
                        <div className="login-options">
                            <button
                                type="button"
                                className="forgot-password-link"
                                onClick={() => setIsForgotOpen(true)}
                            >
                                {"Quên mật khẩu"}?
                            </button>
                        </div>

                        {/* Nút gửi Form */}
                        <button
                            type="submit"
                            className="btn btn-primary login-submit"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                                    {"Đang đăng nhập..."}
                                </>
                            ) : (
                                "Đăng nhập"
                            )}
                        </button>
                    </form>
                </div>
            </div>

            {/* CỬA SỔ MODAL QUÊN MẬT KHẨU (FORGOT PASSWORD) */}
            <ForgotPasswordModal
                isOpen={isForgotOpen}
                onClose={() => setIsForgotOpen(false)}
            />
        </div>
    );
}
