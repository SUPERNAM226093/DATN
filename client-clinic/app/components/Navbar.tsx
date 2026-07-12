"use client";
/**
 * FILE: Navbar.tsx
 * MÔ TẢ: Thành phần thanh điều hướng chính, quản lý menu, đa ngôn ngữ, và xác thực người dùng (Đăng nhập/Đăng ký).
 */
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

import { login, register, forgotPassword, resetPassword, LoginRequest, RegisterRequest, AuthResponse } from "../lib/api";
import { useToast } from "../context/ToastContext";
import { usePWA } from "../hooks/usePWA";
import { usePathname } from "next/navigation";

const socialLinks = [
    { name: "Tiktok", icon: "🎵" },
    { name: "Facebook", icon: "f" },
    { name: "Zalo", icon: "Z" },
    { name: "Youtube", icon: "▶" },
];

interface MenuItem {
    key: string;
    hasDropdown: boolean;
    name?: string;
    href?: string;
    subItems?: Array<{
        key: string;
        href: string;
        name?: string;
    }>;
}

/**
 * CẤU HÌNH MENU CHÍNH: Định nghĩa các mục trên thanh điều hướng và menu con (dropdown).
 */
const menuItems: MenuItem[] = [
    {
        key: "facilities",
        name: "Cơ sở y tế",
        hasDropdown: true,
        subItems: [
            { key: "nearestClinic", name: "Tìm cơ sở y tế", href: "/nearest-clinic" },
            { key: "allHospitals", name: "Tất cả cơ sở y tế", href: "/hospitals" },
        ]
    },
    {
        key: "services",
        name: "Dịch vụ y tế",
        hasDropdown: true,
        subItems: [
            { key: "specializationBooking", name: "Đặt lịch khám theo chuyên khoa", href: "/specialization" },
            { key: "healthPackage", name: "Gói khám sức khỏe toàn diện", href: "/health-package" },
            { key: "onlineConsultation", name: "Khám tư vấn từ xa", href: "/video-call/booking" }
        ]
    },
    {
        key: "doctors",
        name: "Đội ngũ Bác sĩ",
        hasDropdown: false,
        href: "/doctor"
    },

    {
        key: "guide",
        name: "Hướng dẫn",
        hasDropdown: true,
        subItems: [
            { key: "faq", name: "Câu hỏi thường gặp (FAQ)", href: "/guide/faq" }
        ]
    },
    {
        key: "contact",
        name: "Liên hệ",
        hasDropdown: true,
        subItems: [
            { key: "contactAll", name: "Thông tin liên hệ", href: "/contact" }
        ]
    }
];

type AuthTab = "login" | "register" | "forgot";
const SHOW_PWA_DOWNLOAD_BUTTON = false;

export default function Navbar() {
    const pathname = usePathname();
    const isHomepage = pathname === "/";

    const { showToast } = useToast();

    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authTab, setAuthTab] = useState<AuthTab>("login");
    const [user, setUser] = useState<AuthResponse | null>(null);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const { isInstallable, isStandalone, isIOS, installApp } = usePWA();
    const [loginForm, setLoginForm] = useState<LoginRequest>({ email: "", password: "" });
    const [registerForm, setRegisterForm] = useState<RegisterRequest>({
        email: "",
        password: "",
        fullName: "",
        phone: "",
        gender: "",
        dateOfBirth: "",
        address: "",
    });
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [authSuccess, setAuthSuccess] = useState<string | null>(null);
    const [forgotEmail, setForgotEmail] = useState("");
    const [resetToken, setResetToken] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [forgotStep, setForgotStep] = useState(1);

    const [resendCountdown, setResendCountdown] = useState(0);

    const modalRef = useRef<HTMLDivElement>(null);
    const userMenuRef = useRef<HTMLDivElement>(null);
    /**
     * EFFECT: loadUser
     * Nhiệm vụ: Tự động kiểm tra trạng thái đăng nhập của bệnh nhân mỗi khi trang được tải lại (F5).
     * Đọc token và thông tin user từ LocalStorage. Đồng thời lắng nghe sự kiện cập nhật profile để đồng bộ dữ liệu.
     */
    useEffect(() => {
        const loadUser = () => {
            const savedUser = localStorage.getItem("clinic_user");
            const savedToken = localStorage.getItem("clinic_token");
            if (savedUser && savedToken) {
                try {
                    // Chuyển đổi chuỗi JSON lưu trong bộ nhớ thành đối tượng JavaScript
                    setUser(JSON.parse(savedUser));
                } catch {
                    // Nếu dữ liệu bị hỏng hoặc không đúng định dạng, tiến hành xóa sạch bộ nhớ để tránh lỗi hệ thống
                    localStorage.removeItem("clinic_user");
                    localStorage.removeItem("clinic_token");
                }
            } else {
                setUser(null);
            }
        };

        loadUser();

        // Lắng nghe sự kiện tùy chỉnh 'userProfileUpdated' (được kích hoạt khi người dùng thay đổi thông tin cá nhân ở trang Hồ sơ)
        window.addEventListener("userProfileUpdated", loadUser);
        return () => window.removeEventListener("userProfileUpdated", loadUser);
    }, []);

    /**
     * EFFECT: handleScroll
     * Nhiệm vụ: Lắng nghe sự kiện cuộn chuột trên cửa sổ trình duyệt (window scroll).
     * Khi cuộn xuống quá 50px, biến isScrolled chuyển sang true, kích hoạt đổi màu nền thanh Navbar sang đục và thêm bóng đổ.
     */
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    /**
     * EFFECT: handleOutsideClick
     * Nhiệm vụ: Tối ưu hóa trải nghiệm người dùng bằng cách tự động ẩn các cửa sổ popup (Modal, Menu Avatar)
     * khi họ nhấp chuột ra ngoài vùng hiển thị của các phần tử này.
     */
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            // Nếu click ra ngoài khung Modal xác thực đang mở thì đóng Modal và xóa sạch dữ liệu form
            if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
                setShowAuthModal(false);
                resetForm();
            }
            // Nếu click ra ngoài khung Menu của Avatar đang mở thì ẩn Menu đi
            if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    /**
     * EFFECT: handleEscKey
     * Nhiệm vụ: Lắng nghe sự kiện nhấn phím ESC trên bàn phím để người dùng có thể đóng Modal xác thực nhanh chóng.
     */
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setShowAuthModal(false);
                resetForm();
            }
        };
        document.addEventListener("keydown", handleEsc);
        return () => document.removeEventListener("keydown", handleEsc);
    }, []);

    /**
     * HÀM: resetForm
     * Nhiệm vụ: Xóa sạch dữ liệu đã nhập trong các Form đăng nhập, đăng ký và làm sạch thông báo lỗi/thành công.
     */
    const resetForm = () => {
        setLoginForm({ email: "", password: "" });
        setRegisterForm({
            email: "", password: "", fullName: "", phone: "", gender: "", dateOfBirth: "", address: "",
        });
        setAuthError(null);
        setAuthSuccess(null);
    };

    /**
     * HÀM: openAuthModal
     * Nhiệm vụ: Mở hộp thoại Modal xác thực và đặt Tab hiển thị mong muốn (login, register, forgot).
     * Đồng thời tự động đóng menu mobile nếu đang mở.
     */
    const openAuthModal = (tab: AuthTab) => {
        setAuthTab(tab);
        setShowAuthModal(true);
        setMobileMenuOpen(false);
    };

    /**
     * HÀM: handleLogin
     * Nhiệm vụ: Xử lý quy trình gửi yêu cầu Đăng nhập tài khoản bệnh nhân lên backend.
     */
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthLoading(true);
        setAuthError(null);
        try {
            // Gọi hàm API thực hiện POST request đăng nhập
            const res = await login(loginForm);

            // Chặn đăng nhập nếu người dùng sử dụng tài khoản nhân viên/bác sĩ/admin ở cổng bệnh nhân
            if (res.role === "ADMIN" || res.role === "STAFF" || res.role === "DOCTOR") {
                showToast("Tài khoản này không có quyền truy cập trang khách hàng. Vui lòng dùng tài khoản Patient.", "error");
                setAuthLoading(false);
                return;
            }

            // Lưu thông tin người dùng vào state và bộ nhớ trình duyệt (localStorage)
            setUser(res);
            localStorage.setItem("clinic_token", res.token);
            localStorage.setItem("clinic_user", JSON.stringify(res));

            // Đóng Modal và làm sạch form
            setShowAuthModal(false);
            resetForm();
            showToast("Đăng nhập thành công!", "success");

            // Tải lại trang web để cập nhật toàn bộ trạng thái hệ thống và đồng bộ giỏ hàng, thông tin khám
            setTimeout(() => {
                window.location.href = "/";
            }, 500);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.";
            showToast(message, "error");
        } finally {
            setAuthLoading(false);
        }
    };

    /**
     * HÀM: handleForgotPassword
     * Nhiệm vụ: Xử lý yêu cầu gửi mã xác nhận (OTP) về Email của bệnh nhân để chuẩn bị đổi mật khẩu mới.
     */
    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        // Kiểm tra bảo mật: Hệ thống chỉ chấp nhận định dạng email @gmail.com
        if (!forgotEmail.match(/^[a-zA-Z0-9._%+-]+@gmail\.com$/)) {
            showToast("Hệ thống chỉ hỗ trợ khôi phục mật khẩu cho tài khoản Gmail (@gmail.com).", "error");
            return;
        }
        setAuthLoading(true);
        try {
            // Gọi API yêu cầu đặt lại mật khẩu
            const res = await forgotPassword(forgotEmail);
            showToast(res.message, "success");
            // Chuyển form sang bước thứ 2 (Nhập OTP & Mật khẩu mới)
            setForgotStep(2);
            // Kích hoạt đồng hồ đếm ngược chờ gửi lại mã
            startCountdown();
        } catch (err: any) {
            showToast(err.message, "error");
        } finally {
            setAuthLoading(false);
        }
    };

    /**
     * HÀM: handleResetPassword
     * Nhiệm vụ: Gửi mã OTP xác thực và mật khẩu mới lên backend để ghi đè mật khẩu cũ của bệnh nhân.
     */
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        // Ràng buộc bảo mật: Mật khẩu tối thiểu phải từ 6 ký tự
        if (newPassword.length < 6) {
            showToast("Mật khẩu mới phải có ít nhất 6 ký tự để đảm bảo an toàn.", "error");
            return;
        }
        // Kiểm tra xem hai lần nhập mật khẩu có trùng khớp hay không
        if (newPassword !== confirmPassword) {
            showToast("Mật khẩu xác nhận không trùng khớp. Vui lòng nhập lại.", "error");
            return;
        }
        setAuthLoading(true);
        try {
            // Gọi API gửi mã OTP cùng mật khẩu mới lên server để thực hiện thay đổi
            const res = await resetPassword(resetToken, newPassword);
            showToast(res.message, "success");
            setTimeout(() => {
                // Đổi giao diện hiển thị về Tab Đăng nhập và reset các thông số form
                setAuthTab("login");
                setForgotStep(1);
                resetForm();
            }, 2000);
        } catch (err: any) {
            showToast(err.message, "error");
        } finally {
            setAuthLoading(false);
        }
    };

    /**
     * HÀM: startCountdown
     * Nhiệm vụ: Đếm ngược thời gian chờ (60 giây) trước khi kích hoạt lại tính năng gửi mã OTP.
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

    /**
     * HÀM: handleRegister
     * Nhiệm vụ: Xử lý gửi thông tin cá nhân của bệnh nhân lên backend để đăng ký tài khoản mới.
     */
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();

        // Ràng buộc định dạng email: Chỉ hỗ trợ email đuôi @gmail.com
        if (!registerForm.email.toLowerCase().endsWith("@gmail.com")) {
            showToast("Hệ thống chỉ hỗ trợ đăng ký tài khoản qua Gmail (@gmail.com).", "error");
            return;
        }

        // Ràng buộc số điện thoại: Phải bao gồm đúng 10 chữ số
        if (registerForm.phone && !/^\d{10}$/.test(registerForm.phone)) {
            showToast("Số điện thoại không hợp lệ. Vui lòng nhập đúng 10 chữ số.", "error");
            return;
        }

        setAuthLoading(true);
        try {
            const res = await register({
                ...registerForm,
                dateOfBirth: "2000-01-01",
                address: "Chưa cập nhật",
            });

            setUser(res);
            localStorage.setItem("clinic_token", res.token);
            localStorage.setItem("clinic_user", JSON.stringify(res));
            showToast("Đăng ký tài khoản thành công!", "success");

            setTimeout(() => {
                setShowAuthModal(false);
                resetForm();
                window.location.href = "/";
            }, 1000);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Đăng ký thất bại. Email này có thể đã được sử dụng.";
            showToast(message, "error");
        } finally {
            setAuthLoading(false);
        }
    };

    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem("clinic_token");
        localStorage.removeItem("clinic_user");
        showToast("Đã đăng xuất thành công khỏi hệ thống!", "info");
        setTimeout(() => {
            window.location.href = "/";
        }, 500);
    };

    return (
        <>
            {/* NAVBAR DÙNG CHUNG: Thanh điều hướng cố định ở đầu màn hình cho toàn bộ client.
                Ở đầu trang chủ thì trong suốt để hòa với Hero Banner; khi cuộn xuống hoặc ở trang khác thì chuyển sang xanh đậm. */}
            <header
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${!isHomepage || isScrolled
                    ? "bg-[#042f2e]/95 backdrop-blur-md border-b border-white/10 shadow-lg"
                    : "bg-transparent border-transparent"
                    }`}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-20">
                        {/* LOGO THƯƠNG HIỆU: Dùng ảnh trong public, đặt bên trái Navbar và dẫn về trang chủ. */}
                        <a href="/" className="flex items-center gap-2 shrink-0">
                            <Image
                                src="/logo-medpro.png"
                                alt="MedPro"
                                width={130}
                                height={40}
                                className="h-16 w-auto object-contain brightness-0 invert"
                            />
                        </a>

                        {/* MENU DESKTOP: Render từ menuItems để các mục điều hướng dùng chung, không viết lại ở từng trang. */}
                        <nav className="hidden lg:flex items-center gap-1.5 ml-auto mr-8">
                            {menuItems.map((item) => (
                                <div
                                    key={item.key}
                                    className="relative group"
                                    onMouseEnter={() => setActiveDropdown(item.key)}
                                    onMouseLeave={() => setActiveDropdown(null)}
                                >
                                    {item.hasDropdown ? (
                                        <button
                                            className={`flex items-center gap-1 px-4 py-2 text-sm transition-all duration-200 font-bold whitespace-nowrap !text-white relative`}
                                        >
                                            {item.name}
                                            <svg
                                                className={`w-3 h-3 transition-transform duration-200 ${activeDropdown === item.key ? "rotate-180" : ""
                                                    }`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                            <div
                                                className={`absolute bottom-0 left-4 right-4 h-0.5 bg-emerald-300 transition-all duration-300 ${activeDropdown === item.key ? "opacity-100" : "opacity-0"
                                                    }`}
                                            />
                                        </button>
                                    ) : (
                                        <Link
                                            href={item.href || "#"}
                                            className={`flex items-center gap-1 px-4 py-2 text-sm transition-all duration-200 font-bold whitespace-nowrap !text-white relative`}
                                        >
                                            {item.name}
                                            <div
                                                className={`absolute bottom-0 left-4 right-4 h-0.5 bg-emerald-300 transition-all duration-300 ${activeDropdown === item.key ? "opacity-100" : "opacity-0"
                                                    }`}
                                            />
                                        </Link>
                                    )}

                                    {/* SUB-MENU DROPDOWN */}
                                    {item.hasDropdown && item.subItems && (
                                        <div
                                            className={`absolute top-full left-0 w-80 pt-2 z-50 transition-all duration-200 transform origin-top ${activeDropdown === item.key
                                                ? "opacity-100 scale-100"
                                                : "opacity-0 scale-95 pointer-events-none"
                                                }`}
                                        >
                                            <div className="bg-white rounded-xl shadow-2xl border border-[#b2e8d9] py-1.5 overflow-hidden">
                                                {item.key === "yourInfo" && user ? (
                                                    <div className="flex flex-col">
                                                        <div className="px-4 py-4 bg-[#f0fdf8] border-b border-[#b2e8d9]">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span className="text-[10px] font-bold text-white bg-[#0d6b52] px-2 py-0.5 rounded-md uppercase tracking-wider">
                                                                    {user.role}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm font-bold text-[#0a3d2e] truncate">
                                                                {user.fullName || "Người dùng"}
                                                            </p>
                                                            <p className="text-[11px] text-[#4d8871] truncate">{user.email}</p>
                                                        </div>
                                                        <div className="py-1">
                                                            {item.subItems.map((sub) => (
                                                                <Link
                                                                    key={sub.key}
                                                                    href={sub.href}
                                                                    className="w-full text-left px-4 py-2.5 text-sm text-[#0a3d2e] hover:bg-[#e8f9f4] flex items-center gap-3 transition-colors group"
                                                                >
                                                                    <svg
                                                                        className="w-4 h-4 text-[#0d6b52]"
                                                                        fill="none"
                                                                        stroke="currentColor"
                                                                        viewBox="0 0 24 24"
                                                                    >
                                                                        {sub.key === "profile" && (
                                                                            <path
                                                                                strokeLinecap="round"
                                                                                strokeLinejoin="round"
                                                                                strokeWidth={2}
                                                                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                                                            />
                                                                        )}
                                                                        {sub.key === "history" && (
                                                                            <path
                                                                                strokeLinecap="round"
                                                                                strokeLinejoin="round"
                                                                                strokeWidth={2}
                                                                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                                                            />
                                                                        )}
                                                                        {sub.key === "prescriptions" && (
                                                                            <path
                                                                                strokeLinecap="round"
                                                                                strokeLinejoin="round"
                                                                                strokeWidth={2}
                                                                                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                                                                            />
                                                                        )}
                                                                    </svg>
                                                                    <span className="group-hover:text-[#0d6b52]">{sub.name}</span>
                                                                </Link>
                                                            ))}
                                                        </div>
                                                        <div className="border-t border-[#b2e8d9] py-1">
                                                            <button
                                                                onClick={handleLogout}
                                                                className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                                            >
                                                                <svg
                                                                    className="w-4 h-4"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    viewBox="0 0 24 24"
                                                                >
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        strokeWidth={2}
                                                                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                                                    />
                                                                </svg>
                                                                {"Đăng xuất"}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="px-3 py-2">
                                                        <p className="text-[10px] font-bold text-[#4d8871] uppercase tracking-widest px-3 mb-2">
                                                            {item.name}
                                                        </p>
                                                        {item.subItems.map((sub) => (
                                                            <Link
                                                                key={sub.key}
                                                                href={sub.href}
                                                                className="flex items-start gap-2.5 px-3 py-2.5 text-sm text-[#0a3d2e] hover:text-[#0d6b52] hover:bg-[#e8f9f4] rounded-lg transition-all group"
                                                                onClick={() => setActiveDropdown(null)}
                                                            >
                                                                <div className="w-1.5 h-1.5 rounded-full bg-[#b2e8d9] group-hover:bg-[#0d6b52] mt-1.5 flex-shrink-0" />
                                                                <span className="flex-1 leading-normal font-semibold">{sub.name}</span>
                                                            </Link>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </nav>

                        {/* DESKTOP USER/AUTH CONTROLS */}
                        <div className="hidden lg:flex items-center gap-3">
                            {/* PWA Download Button */}
                            {SHOW_PWA_DOWNLOAD_BUTTON && !isStandalone && (isInstallable || isIOS) && (
                                <button
                                    onClick={() =>
                                        isIOS
                                            ? showToast("Hệ điều hành iOS/Mac hiện chưa được hỗ trợ tải ứng dụng này.", "error")
                                            : installApp()
                                    }
                                    className="bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[11px] font-bold px-4 py-2 rounded-full transition-all flex items-center gap-1.5"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                                        />
                                    </svg>
                                    {"Tải ứng dụng"}
                                </button>
                            )}

                            {user ? (
                                <div className="relative" ref={userMenuRef}>
                                    <button
                                        onClick={() => setShowUserMenu(!showUserMenu)}
                                        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold px-4 py-2 rounded-full transition-all shadow-sm group"
                                    >
                                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#0d6b52] to-[#0ea882] text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                                            {user.fullName?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="max-w-[120px] truncate">{user.fullName || user.email}</span>
                                        <svg
                                            className={`w-3 h-3 transition-transform ${showUserMenu ? "rotate-180" : ""}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {showUserMenu && (
                                        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-[#b2e8d9] overflow-hidden z-50 animate-in fade-in slide-in-from-top-1">
                                            <div className="px-4 py-4 bg-[#f0fdf8] border-b border-[#b2e8d9]">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-[10px] font-bold text-white bg-[#0d6b52] px-2 py-0.5 rounded-md uppercase tracking-wider">
                                                        {user.role}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-bold text-[#0a3d2e] truncate">
                                                    {user.fullName || "Người dùng"}
                                                </p>
                                                <p className="text-[11px] text-[#4d8871] truncate">{user.email}</p>
                                            </div>
                                            <div className="py-1">
                                                <Link
                                                    href="/ho-so-kham"
                                                    className="w-full text-left px-4 py-2.5 text-sm text-[#0a3d2e] hover:bg-[#e8f9f4] flex items-center gap-3 transition-colors group"
                                                >
                                                    <svg
                                                        className="w-4 h-4 text-[#0d6b52]"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                                        />
                                                    </svg>
                                                    <span className="group-hover:text-[#0d6b52]">{"Hồ sơ cá nhân"}</span>
                                                </Link>
                                                <Link
                                                    href="/lich-su-kham"
                                                    className="w-full text-left px-4 py-2.5 text-sm text-[#0a3d2e] hover:bg-[#e8f9f4] flex items-center gap-3 transition-colors group"
                                                >
                                                    <svg
                                                        className="w-4 h-4 text-[#0d6b52]"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                                        />
                                                    </svg>
                                                    <span className="group-hover:text-[#0d6b52]">{"Lịch sử khám"}</span>
                                                </Link>
                                                <Link
                                                    href="/don-thuoc"
                                                    className="w-full text-left px-4 py-2.5 text-sm text-[#0a3d2e] hover:bg-[#e8f9f4] flex items-center gap-3 transition-colors group"
                                                >
                                                    <svg
                                                        className="w-4 h-4 text-[#0d6b52]"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                                                        />
                                                    </svg>
                                                    <span className="group-hover:text-[#0d6b52]">{"Đơn thuốc của tôi"}</span>
                                                </Link>
                                            </div>
                                            <div className="border-t border-[#b2e8d9] py-1">
                                                <button
                                                    onClick={handleLogout}
                                                    className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                                >
                                                    <svg
                                                        className="w-4 h-4"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                                        />
                                                    </svg>
                                                    {"Đăng xuất"}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <button
                                    onClick={() => openAuthModal("login")}
                                    className="px-6 py-2.5 rounded-full text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md transition-all whitespace-nowrap active:scale-95"
                                >
                                    Đăng nhập
                                </button>
                            )}
                        </div>

                        {/* MOBILE MENU TOGGLE BUTTON */}
                        <button
                            className="lg:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {mobileMenuOpen ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                )}
                            </svg>
                        </button>
                    </div>

                    {/* MOBILE NAV MENU */}
                    {mobileMenuOpen && (
                        <div className="lg:hidden bg-[#042f2e] border-t border-white/10 shadow-2xl max-h-[80vh] overflow-y-auto rounded-b-2xl">
                            <div className="px-4 py-4 space-y-2">
                                {menuItems.map((item) => (
                                    <div key={item.key} className="space-y-1">
                                        <div
                                            className="flex items-center justify-between px-3 py-3 text-sm font-semibold text-white/90 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                                            onClick={() => setActiveDropdown(activeDropdown === item.key ? null : item.key)}
                                        >
                                            <Link href={item.href || "#"} className="flex-1">
                                                {item.name}
                                            </Link>
                                            {item.hasDropdown && (
                                                <svg
                                                    className={`w-4 h-4 transition-transform ${activeDropdown === item.key ? "rotate-180" : ""
                                                        }`}
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M19 9l-7 7-7-7"
                                                    />
                                                </svg>
                                            )}
                                        </div>
                                        {item.hasDropdown && activeDropdown === item.key && (
                                            <div className="ml-4 pl-4 border-l border-white/20 space-y-1">
                                                {item.subItems?.map((sub) => (
                                                    <Link
                                                        key={sub.key}
                                                        href={sub.href}
                                                        className="block px-3 py-2 text-sm text-white/70 hover:text-white"
                                                        onClick={() => setMobileMenuOpen(false)}
                                                    >
                                                        {sub.name}
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {!user && (
                                    <div className="pt-4 mt-2 border-t border-white/10 flex gap-2">
                                        <button
                                            onClick={() => openAuthModal("login")}
                                            className="flex-1 text-center px-3 py-2.5 text-sm font-semibold text-white border border-white/30 rounded-lg hover:bg-white/10 transition-colors"
                                        >
                                            {"Đăng nhập"}
                                        </button>
                                        <button
                                            onClick={() => openAuthModal("register")}
                                            className="flex-1 text-center px-3 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors"
                                        >
                                            {"Đăng ký"}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* --- KHỐI MODAL ĐĂNG NHẬP / ĐĂNG KÝ (AUTH MODAL) --- */}
            {showAuthModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div
                        ref={modalRef}
                        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                        style={{ animation: "modalIn 0.3s ease-out" }}
                    >
                        {/* ĐẦU MODAL - HIỆN TIÊU ĐỀ THEO TAB */}
                        <div className="bg-black px-6 py-5 text-white relative overflow-hidden">
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full" />
                            <h2 className="text-lg font-bold relative z-10 text-white">
                                {authTab === "login" ? "Đăng nhập" : authTab === "register" ? "Đăng ký tài khoản" : "Quên mật khẩu"}
                            </h2>
                            <button onClick={() => { setShowAuthModal(false); resetForm(); }} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* THANH CHỌN TAB */}
                        <div className="flex border-b border-gray-200">
                            <button onClick={() => { setAuthTab("login"); setAuthError(null); }} className={`flex-1 py-3 text-sm font-semibold transition-colors relative ${authTab === "login" ? "text-black" : "text-gray-400"}`}>
                                {"Đăng nhập"}
                                {authTab === "login" && <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-black rounded-full" />}
                            </button>
                            <button onClick={() => { setAuthTab("register"); setAuthError(null); }} className={`flex-1 py-3 text-sm font-semibold transition-colors relative ${authTab === "register" ? "text-black" : "text-gray-400"}`}>
                                {"Đăng ký"}
                                {authTab === "register" && <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-black rounded-full" />}
                            </button>
                        </div>

                        {/* NỘI DUNG FORM */}
                        <div className="px-6 py-5">
                            {authTab === "login" ? (
                                /* FORM ĐĂNG NHẬP */
                                <form onSubmit={handleLogin} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">{"Email"}</label>
                                        <input type="email" required value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} placeholder="example@gmail.com" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/30 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">{"Mật khẩu"}</label>
                                        <input type="password" required value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} placeholder="••••••••" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/30 outline-none" />
                                    </div>
                                    <button type="submit" disabled={authLoading} className="w-full btn-premium py-3 rounded-xl">
                                        {authLoading ? "Đang xử lý..." : "Đăng nhập"}
                                    </button>
                                    <div className="text-right">
                                        <button type="button" onClick={() => { setAuthTab("forgot"); setForgotStep(1); }} className="text-xs text-[#2e5bff] hover:underline">Quên mật khẩu?</button>
                                    </div>
                                </form>
                            ) : authTab === "register" ? (
                                /* FORM ĐĂNG KÝ */
                                <form onSubmit={handleRegister} className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Họ và tên</label>
                                        <input type="text" required value={registerForm.fullName} onChange={(e) => setRegisterForm({ ...registerForm, fullName: e.target.value })} placeholder="Nguyễn Văn A" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/30 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                                        <input type="email" required value={registerForm.email} onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })} placeholder="example@gmail.com" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/30 outline-none" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Mật khẩu</label>
                                            <input type="password" required minLength={6} value={registerForm.password} onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })} placeholder="••••••••" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/30 outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Số điện thoại</label>
                                            <input type="tel" required value={registerForm.phone} onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })} placeholder="09xxxx" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-black/30 outline-none" />
                                        </div>
                                    </div>
                                    <button type="submit" disabled={authLoading} className="w-full btn-premium py-3 rounded-xl mt-2">
                                        {authLoading ? "Đang xử lý..." : "Đăng ký tài khoản"}
                                    </button>
                                </form>
                            ) : (
                                /* LUỒNG QUÊN MẬT KHẨU */
                                <div className="space-y-4">
                                    {forgotStep === 1 ? (
                                        <form onSubmit={handleForgotPassword} className="space-y-4">
                                            <p className="text-sm text-gray-500">Chúng tôi sẽ gửi mã xác thực tới Email của bạn.</p>
                                            <input type="email" required value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="example@gmail.com" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-black/30" />
                                            <button type="submit" disabled={authLoading} className="w-full bg-[#2e5bff] text-white py-3 rounded-lg">{authLoading ? "Đang gửi..." : "Tiếp tục"}</button>
                                        </form>
                                    ) : (
                                        <form onSubmit={handleResetPassword} className="space-y-3">
                                            <input type="text" required maxLength={8} value={resetToken} onChange={(e) => setResetToken(e.target.value)} placeholder="Mã xác thực (OTP)" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-center font-bold" />
                                            <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mật khẩu mới" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                                            <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Xác nhận mật khẩu" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                                            <button type="submit" disabled={authLoading} className="w-full bg-[#2e5bff] text-white py-2.5 rounded-lg">Cập nhật mật khẩu</button>
                                            <button type="button" onClick={() => setForgotStep(1)} className="w-full text-xs text-gray-500 hover:underline mt-1">Quay lại nhập Email</button>
                                        </form>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <style jsx>{`
                        @keyframes modalIn {
                            from { opacity: 0; transform: scale(0.95) translateY(10px); }
                            to { opacity: 1; transform: scale(1) translateY(0); }
                        }
                    `}</style>
                </div>
            )}
        </>
    );
}
