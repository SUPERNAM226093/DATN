"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
    fetchMedicalRecordsByPatient,
    fetchUserById,
    updateProfile,
    MedicalRecordResponse,
    UserDetailResponse,
    AuthResponse,
} from "../lib/api";

import { useToast } from "../context/ToastContext";

function getLoggedInUser(): AuthResponse | null {
    if (typeof window === "undefined") return null;
    try {
        const saved = localStorage.getItem("clinic_user");
        if (!saved) return null;
        return JSON.parse(saved) as AuthResponse;
    } catch {
        return null;
    }
}

function formatDateTime(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function maskEmail(email: string) {
    if (!email) return "";
    const [name, domain] = email.split("@");
    if (name.length <= 2) return email;
    return name.substring(0, 2) + "****" + "@" + domain;
}

export default function MedicalRecordPage() {
    
    const router = useRouter();
    const { showToast } = useToast();
    const [records, setRecords] = useState<MedicalRecordResponse[]>([]);
    const [userDetails, setUserDetails] = useState<UserDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<AuthResponse | null>(null);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    // Profile Edit State
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        fullName: "",
        phone: "",
        password: "",
        confirmPassword: "",
    });
    const [saving, setSaving] = useState(false);
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

    useEffect(() => {
        const loggedUser = getLoggedInUser();
        if (!loggedUser) {
            setError("Vui lòng đăng nhập để xem hồ sơ khám.");
            setLoading(false);
            return;
        }
        setUser(loggedUser);
        
        // Initialize with cached data to avoid empty screen
        setUserDetails({
            id: loggedUser.userId,
            email: loggedUser.email,
            fullName: loggedUser.fullName,
            phone: "",
            dateOfBirth: null,
            gender: null,
            address: null,
            roleName: loggedUser.role,
            status: "ACTIVE"
        });

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            
            try {
                // Fetch user details
                try {
                    const userData = await fetchUserById(loggedUser.userId);
                    setUserDetails(userData);
                    setEditForm({
                        fullName: userData.fullName || "",
                        phone: userData.phone || "",
                        password: "",
                        confirmPassword: "",
                    });
                } catch (uErr) {
                    console.error("Failed to fetch user details:", uErr);
                    // We keep the cached data from loggedUser
                }

                // Fetch medical records
                try {
                    const recordsData = await fetchMedicalRecordsByPatient(loggedUser.userId);
                    setRecords(recordsData);
                } catch (mErr) {
                    console.error("Failed to fetch medical records:", mErr);
                    setError("Không thể tải hồ sơ khám. Vui lòng thử lại.");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userDetails || !user) return;
        
        if (editForm.password && editForm.password.length < 6) {
            showToast("Mật khẩu mới phải có ít nhất 6 ký tự.", "error");
            return;
        }
        
        if (editForm.password !== editForm.confirmPassword) {
            showToast("Mật khẩu xác nhận không khớp.", "error");
            return;
        }

        setSaving(true);
        try {
            const updated = await updateProfile({
                fullName: editForm.fullName,
                phone: editForm.phone,
                password: editForm.password || undefined
            });
            
            setUserDetails(updated);
            // Cập nhật lại AuthResponse trong localStorage
            const updatedAuth = { ...user, fullName: updated.fullName };
            localStorage.setItem("clinic_user", JSON.stringify(updatedAuth));
            setUser(updatedAuth);
            window.dispatchEvent(new Event("userProfileUpdated"));
            
            setIsEditing(false);
            setEditForm(prev => ({ ...prev, password: "", confirmPassword: "" }));
            showToast("Cập nhật thông tin thành công!", "success");
            
            // Xóa đoạn window.location.reload() ở đây
            // UI sẽ tự cập nhật nhờ thay đổi userDetails & user state
            
        } catch (err: any) {
            showToast(getErrorMessage(err.message || "Cập nhật thất bại"), "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Navbar />
            <div className="min-h-screen bg-[var(--background)] pt-36 pb-20">
                <div className="max-w-5xl mx-auto px-4 py-8">
                    {/* Header */}
                    <div className="mb-8 flex items-center justify-between">
                        <div>
                            <button
                                onClick={() => router.back()}
                                className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#7C6EE6] mb-4 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                {"Quay lại"}
                            </button>
                            <h1 className="text-3xl font-bold text-[#392E7B]">Hồ sơ của bạn</h1>
                        </div>
                    </div>

                    {/* Profile Section */}
                    <div className="bg-white rounded-3xl shadow-xl shadow-emerald-100/50 overflow-hidden mb-12 border border-emerald-50">
                        <div className="bg-gradient-to-r from-[#7C6EE6] to-[#6D5DD3] p-8 text-white">
                            <div className="flex items-center gap-6">
                                <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-4xl font-bold shadow-inner">
                                    {userDetails?.fullName?.charAt(0).toUpperCase() || "U"}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold mb-1">{userDetails?.fullName}</h2>
                                    <div className="flex items-center gap-2 text-white/80 text-sm">
                                        <span className="px-2 py-0.5 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider">
                                            {userDetails?.roleName || "PATIENT"}
                                        </span>
                                        <span>•</span>
                                        <span>{maskEmail(userDetails?.email || "")}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8">
                            {!isEditing ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">Họ và tên</label>
                                            <p className="text-lg font-semibold text-[#392E7B]">{userDetails?.fullName || "Chưa cập nhật"}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">Số điện thoại</label>
                                            <p className="text-lg font-semibold text-[#392E7B]">{userDetails?.phone || "Chưa cập nhật"}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">Email (Không thể sửa)</label>
                                            <p className="text-lg font-semibold text-gray-500 italic">{maskEmail(userDetails?.email || "")}</p>
                                        </div>
                                        <div className="pt-2">
                                            <button 
                                                onClick={() => setIsEditing(true)}
                                                className="px-6 py-2.5 rounded-xl bg-[#7C6EE6] text-white font-bold text-sm shadow-lg shadow-emerald-200 hover:scale-105 transition-all"
                                            >
                                                Thay đổi thông tin
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleUpdateProfile} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">Họ và tên mới</label>
                                            <input 
                                                type="text"
                                                value={editForm.fullName}
                                                onChange={e => setEditForm({...editForm, fullName: e.target.value})}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#7C6EE6] focus:ring-2 focus:ring-[#7C6EE6]/20 transition-all outline-none"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">Số điện thoại mới</label>
                                            <input 
                                                type="tel"
                                                inputMode="tel"
                                                maxLength={15}
                                                value={editForm.phone}
                                                onChange={e => setEditForm({...editForm, phone: e.target.value})}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#7C6EE6] focus:ring-2 focus:ring-[#7C6EE6]/20 transition-all outline-none"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="relative">
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">Mật khẩu mới (Để trống nếu không đổi)</label>
                                            <input 
                                                type={showPassword ? "text" : "password"}
                                                value={editForm.password}
                                                onChange={e => setEditForm({...editForm, password: e.target.value})}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#7C6EE6] focus:ring-2 focus:ring-[#7C6EE6]/20 transition-all outline-none"
                                                placeholder="••••••••"
                                            />
                                            {editForm.password && (
                                                <button 
                                                    type="button" 
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-4 top-9 text-gray-400 hover:text-[#7C6EE6]"
                                                >
                                                    {showPassword ? "🙈" : "👁️"}
                                                </button>
                                            )}
                                        </div>
                                        {editForm.password && (
                                            <div className="relative">
                                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">Xác nhận mật khẩu mới</label>
                                                <input 
                                                    type={showPassword ? "text" : "password"}
                                                    value={editForm.confirmPassword}
                                                    onChange={e => setEditForm({...editForm, confirmPassword: e.target.value})}
                                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#7C6EE6] focus:ring-2 focus:ring-[#7C6EE6]/20 transition-all outline-none"
                                                    placeholder="••••••••"
                                                    required={!!editForm.password}
                                                />
                                            </div>
                                        )}
                                        <div className="flex gap-3 pt-4">
                                            <button 
                                                type="submit"
                                                disabled={saving}
                                                className="flex-1 px-6 py-2.5 rounded-xl bg-green-500 text-white font-bold text-sm shadow-lg shadow-green-200 hover:bg-green-600 transition-all disabled:opacity-50"
                                            >
                                                {saving ? "Đang lưu..." : "Lưu thay đổi"}
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    setIsEditing(false);
                                                    setEditForm({
                                                        fullName: userDetails?.fullName || "",
                                                        phone: userDetails?.phone || "",
                                                        password: "",
                                                        confirmPassword: "",
                                                    });
                                                }}
                                                className="px-6 py-2.5 rounded-xl bg-gray-100 text-gray-500 font-bold text-sm hover:bg-gray-200 transition-all disabled:opacity-50"
                                                disabled={saving}
                                            >
                                                Hủy
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* Medical Records Section */}
                    <div className="mt-16">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-2xl">📋</div>
                            <div>
                                <h2 className="text-2xl font-bold text-[#392E7B]">Lịch sử chẩn đoán của bác sĩ</h2>
                                <p className="text-sm text-gray-400">Xem lại các kết luận khám bệnh của bạn</p>
                            </div>
                        </div>

                        {/* Loading Records */}
                        {loading && (
                            <div className="space-y-4">
                                {[1, 2].map((i) => (
                                    <div key={i} className="bg-white rounded-3xl p-8 shadow-sm animate-pulse border border-gray-50">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="w-12 h-12 bg-gray-100 rounded-2xl" />
                                            <div className="space-y-2">
                                                <div className="h-4 w-48 bg-gray-100 rounded" />
                                                <div className="h-3 w-32 bg-gray-100 rounded" />
                                            </div>
                                        </div>
                                        <div className="h-20 w-full bg-gray-50 rounded-2xl" />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Error Records */}
                        {error && !loading && (
                            <div className="bg-white rounded-3xl shadow-sm border border-red-50 p-12 text-center">
                                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center text-4xl">⚠️</div>
                                <p className="text-red-600 font-medium mb-2">{error}</p>
                                <p className="text-sm text-gray-400">Vui lòng thử lại sau</p>
                            </div>
                        )}

                        {/* Empty Records */}
                        {!loading && !error && records.length === 0 && (
                            <div className="bg-white rounded-3xl shadow-sm border border-emerald-50 p-12 text-center">
                                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center text-4xl">📄</div>
                                <p className="text-[#392E7B] font-semibold mb-1">Chưa có hồ sơ bệnh án nào</p>
                                <p className="text-sm text-gray-400">Thông tin chẩn đoán sẽ hiện ở đây sau khi bạn hoàn tất khám bệnh.</p>
                            </div>
                        )}

                        {/* Records List */}
                        {!loading && !error && records.length > 0 && (
                            <div className="space-y-6">
                                {records.map((record) => {
                                    const isExpanded = expandedId === record.id;
                                    return (
                                        <div
                                            key={record.id}
                                            className="bg-white rounded-3xl shadow-md shadow-emerald-50/50 border border-emerald-50 overflow-hidden hover:border-[#7C6EE6]/30 transition-all"
                                        >
                                            <button
                                                onClick={() => setExpandedId(isExpanded ? null : record.id)}
                                                className="w-full text-left p-8 flex items-start justify-between gap-4"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-4 mb-4">
                                                        <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-2xl shadow-inner">
                                                            📑
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-[#392E7B] text-lg">
                                                                Mã hồ sơ: #{record.id}
                                                            </p>
                                                            <p className="text-sm text-gray-400 font-medium">
                                                                Ngày khám: {formatDateTime(record.createdAt)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 text-[#7C6EE6] text-sm font-bold">
                                                            👨‍⚕️ Bác sĩ: {record.doctorName}
                                                        </span>
                                                        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-50 text-gray-500 text-sm font-bold">
                                                            🆔 Lịch hẹn: #{record.appointmentId}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className={`w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center transition-all duration-300 ${isExpanded ? "rotate-180 bg-[#7C6EE6] text-white" : "text-gray-400"}`}>
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </button>

                                            {isExpanded && (
                                                <div className="px-8 pb-8 pt-2 border-t border-gray-50 bg-gray-50/30">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-50">
                                                            <div className="flex items-center gap-2 mb-4">
                                                                <span className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-sm">🩺</span>
                                                                <h3 className="text-xs font-black text-[#7C6EE6] uppercase tracking-widest">
                                                                    Chuẩn đoán của bác sĩ
                                                                </h3>
                                                            </div>
                                                            <p className="text-[#392E7B] leading-relaxed font-medium">
                                                                {record.diagnosis || "Chưa có thông tin chuẩn đoán"}
                                                            </p>
                                                        </div>
                                                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-50">
                                                            <div className="flex items-center gap-2 mb-4">
                                                                <span className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-sm">📝</span>
                                                                <h3 className="text-xs font-black text-green-600 uppercase tracking-widest">
                                                                    Kết luận & Hướng điều trị
                                                                </h3>
                                                            </div>
                                                            <p className="text-[#392E7B] leading-relaxed font-medium">
                                                                {record.conclusion || "Chưa có kết luận"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
}

