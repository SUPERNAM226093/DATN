import { useState } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
interface ForgotPasswordModalProps {
    isOpen: boolean;
    onClose: () => void; // 
}

export default function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {

    const [step, setStep] = useState(1); // Điều hướng các bước (1: Nhập Email, 2: Nhập mã & Mật khẩu mới)
    const [email, setEmail] = useState(''); // Email người dùng
    const [token, setToken] = useState(''); // Mã xác thực OTP nhận qua mail
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false); // Trạng thái gọi API
    const [resendCountdown, setResendCountdown] = useState(0); // Thời gian chờ để được gửi lại mã

    if (!isOpen) return null; // Nếu không mở thì không render gì

    /**
     * HÀM: handleSendCode
     * MÔ TẢ: Gửi yêu cầu lấy mã xác thực tới Backend.
     */
    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        // Ràng buộc bảo mật: Chỉ chấp nhận Gmail
        if (!email.match(/^[a-zA-Z0-9._%+-]+@gmail\.com$/)) {
            toast.error("Email không hợp lệ (yêu cầu @gmail.com)");
            return;
        }

        setLoading(true);
        try {
            // API Backend thực hiện kiểm tra email và gửi mail chứa OTP
            const res = await api.post('/auth/forgot-password', { email });
            toast.success(res.data.message);
            setStep(2); // Chuyển sang bước nhập mã
            startCountdown(); // Bắt đầu đếm ngược thời gian chờ gửi lại mã
        } catch (err: any) {
            if (err.response?.status === 429) {
                toast.error("Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau.");
            } else {
                toast.error(err.response?.data?.message || "Có lỗi xảy ra");
            }
        } finally {
            setLoading(false);
        }
    };

    /**
     * HÀM: handleResetPassword
     * MÔ TẢ: Gửi mã OTP và mật khẩu mới để hoàn tất việc khôi phục tài khoản.
     */
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            toast.error("Mật khẩu phải có ít nhất 6 ký tự");
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error("Mật khẩu xác nhận không khớp");
            return;
        }

        setLoading(true);
        try {
            // Backend sẽ kiểm tra Token có khớp với email không và thời hạn của Token
            const res = await api.post('/auth/reset-password', { token, newPassword });
            toast.success(res.data.message);
            // Thành công: Chờ 2 giây rồi đóng modal và reset về bước 1
            setTimeout(() => {
                onClose();
                setStep(1);
            }, 2000);
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Có lỗi xảy ra");
        } finally {
            setLoading(false);
        }
    };

    /**
     * HÀM: startCountdown
     * MÔ TẢ: Đếm ngược 60 giây để tránh spam nút "Gửi lại mã".
     */
    const startCountdown = () => {
        setResendCountdown(60);
        const timer = setInterval(() => {
            setResendCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '400px' }}>
                {/* TIÊU ĐỀ MODAL THEO BƯỚC */}
                <div className="modal-header">
                    <h2>{step === 1 ? "Quên mật khẩu" : "Đặt lại mật khẩu"}</h2>
                    <button onClick={onClose} className="close-btn">&times;</button>
                </div>

                {/* BƯỚC 1: NHẬP EMAIL */}
                {step === 1 ? (
                    <form onSubmit={handleSendCode} className="p-4">
                        <p className="mb-4 text-sm text-gray-600">Nhập địa chỉ Gmail đã đăng ký của bạn. Chúng tôi sẽ gửi mã xác thực tới đó.</p>
                        <div className="form-group mb-4">
                            <label>{"Email"}</label>
                            <input
                                type="email"
                                className="form-control"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="example@gmail.com"
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={onClose} className="btn btn-secondary">{"Hủy"}</button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? "Đang tải..." : "Gửi mã"}
                            </button>
                        </div>
                    </form>
                ) : (
                    /* BƯỚC 2: NHẬP MÃ XÁC THỰC VÀ MẬT KHẨU MỚI */
                    <form onSubmit={handleResetPassword} className="p-4">
                        <div className="form-group mb-3">
                            <label>{"Mã xác nhận"}</label>
                            <input
                                type="text"
                                className="form-control text-center font-bold tracking-widest uppercase"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                required
                                maxLength={8}
                                placeholder="ABC12345"
                            />
                        </div>
                        <div className="form-group mb-3">
                            <label>{"Mật khẩu mới"}</label>
                            <input
                                type="password"
                                className="form-control"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                placeholder="Tối thiểu 6 ký tự"
                            />
                        </div>
                        <div className="form-group mb-4">
                            <label>{"Xác nhận mật khẩu mới"}</label>
                            <input
                                type="password"
                                className="form-control"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                placeholder="Nhập lại mật khẩu"
                            />
                        </div>

                        <div className="flex flex-col gap-3">
                            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                                {loading ? "Đang tải..." : "Cập nhật"}
                            </button>

                            {/* Nút gửi lại mã nếu chưa nhận được mail */}
                            <button
                                type="button"
                                className="text-sm text-blue-600 hover:underline disabled:text-gray-400"
                                onClick={handleSendCode}
                                disabled={loading || resendCountdown > 0}
                            >
                                {resendCountdown > 0
                                    ? `Gửi lại mã sau (${resendCountdown}s)`
                                    : "Gửi lại mã"}
                            </button>
                            <button
                                type="button"
                                className="text-xs text-gray-500 hover:underline text-center"
                                onClick={() => setStep(1)}
                            >
                                Quay lại nhập Email
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
