"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "../../../components/Navbar";
import Footer from "../../../components/Footer";
import {
    fetchOnlineConsultationById,
    cancelOnlineConsultation,
    fetchVnPayPaymentUrl,
    OnlineConsultationResponse,
    AuthResponse,
} from "../../../lib/api";


function getLoggedInUser(): AuthResponse | null {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(localStorage.getItem("clinic_user") || ""); } catch { return null; }
}

function formatCountdown(expiredAt: string): string {
    const now = Date.now();
    const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(expiredAt);
    const candidates = hasTimeZone
        ? [new Date(expiredAt).getTime()]
        : [new Date(expiredAt).getTime(), new Date(`${expiredAt}Z`).getTime()];
    const futureCandidates = candidates
        .filter(Number.isFinite)
        .filter(timestamp => timestamp >= now)
        .sort((a, b) => a - b);
    const expiresAt = futureCandidates[0] ?? Math.max(...candidates.filter(Number.isFinite));
    const diff = Math.max(0, expiresAt - now);
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1_000);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function PaymentPage() {
    const params = useParams();
    const router = useRouter();
    const consultationId = Number(params.id);

    // --- CÁC TRẠNG THÁI (STATE) ---
    const [consultation, setConsultation] = useState<OnlineConsultationResponse | null>(null); // Thông tin đơn tư vấn
    const [loading, setLoading] = useState(true); // Trạng thái đang tải dữ liệu
    const [error, setError] = useState<string | null>(null); // Lỗi khi tải dữ liệu
    const [countdown, setCountdown] = useState(""); // Chuỗi đếm ngược thời gian thanh toán
    const [cancelling, setCancelling] = useState(false); // Đang xử lý hủy đơn
    const [paying, setPaying] = useState(false); // Đang xử lý cổng VNPay

    const handleVnPayPayment = async () => {
        setPaying(true);
        try {
            const { paymentUrl } = await fetchVnPayPaymentUrl(consultationId);
            window.location.href = paymentUrl;
        } catch (e: any) {
            alert(e.message || "Không thể khởi tạo liên kết thanh toán VNPay.");
            setPaying(false);
        }
    };

    /**
     * HOOK: Lấy thông tin chi tiết đơn tư vấn khi vào trang
     */
    useEffect(() => {
        const user = getLoggedInUser();
        fetchOnlineConsultationById(consultationId, user?.userId)
            .then(data => {
                setConsultation(data);
                setLoading(false);
            })
            .catch(e => {
                setError(e.message);
                setLoading(false);
            });
    }, [consultationId]);

    // Countdown timer
    /**
     * HOOK: Chạy bộ đếm ngược (Countdown) dựa trên thời gian hết hạn (expiredAt)
     */
    useEffect(() => {
        if (!consultation?.expiredAt) return;
        const timer = setInterval(() => {
            setCountdown(formatCountdown(consultation.expiredAt));
        }, 1000);
        return () => clearInterval(timer);
    }, [consultation?.expiredAt]);

    /**
     * HÀM: Xử lý hủy đơn tư vấn
     */
    const handleCancel = async () => {
        if (!consultation) return;
        const user = getLoggedInUser();
        if (!user) return;
        if (!confirm("Bạn chắc chắn muốn hủy đơn này?")) return;
        setCancelling(true);
        try {
            await cancelOnlineConsultation(consultation.id, user.userId);
            router.push("/lich-su-kham");
        } catch (e: any) {
            alert(e.message);
            setCancelling(false);
        }
    };



    if (loading) return (
        <>
            <Navbar />
            <div className="min-h-screen flex items-center justify-center pt-36">
                <div className="text-center space-y-3">
                    <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin mx-auto" />
                    <p className="text-sm text-gray-500">Đang tải thông tin thanh toán...</p>
                </div>
            </div>
            <Footer />
        </>
    );

    if (error || !consultation) return (
        <>
            <Navbar />
            <div className="min-h-screen flex items-center justify-center pt-36">
                <div className="bg-white rounded-3xl shadow p-10 text-center max-w-sm mx-auto">
                    <div className="w-14 h-14 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="font-semibold text-gray-800 mb-1">Không thể tải thông tin</p>
                    <p className="text-sm text-gray-500 mb-4">{error}</p>
                    <button onClick={() => router.push("/")} className="text-emerald-500 text-sm hover:underline">← Về trang chủ</button>
                </div>
            </div>
            <Footer />
        </>
    );

    const isPaid = consultation.paymentStatus === "PAID";
    const isCancelled = consultation.paymentStatus === "CANCELLED";

    return (
        <>
            <Navbar />
            <div className="min-h-screen bg-gradient-to-br from-[#e8f9f4] via-white to-[#f0f8ff] pt-36 pb-16">
                <div className="max-w-2xl mx-auto px-4 space-y-4">

                    {/* Step indicator - Containerized */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="flex items-center justify-center gap-2 py-6 bg-gray-50/50 border-b border-gray-50">
                            {["Thông tin", "Thanh toán", "Tư vấn"].map((step, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold
                                        ${i === 1 ? "bg-[var(--green-mid)] text-white shadow-md shadow-emerald-200"
                                            : i < 1 ? "bg-green-400 text-white" : "bg-gray-100 text-gray-400"}`}>
                                        {i < 1 ? "✓" : i + 1}
                                    </div>
                                    <span className={`text-xs font-medium ${i === 1 ? "text-[var(--green-mid)]" : i < 1 ? "text-green-500" : "text-gray-400"}`}>{step}</span>
                                    {i < 2 && <div className="w-8 h-px bg-gray-200" />}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Status banners */}
                    {isPaid && (
                        <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4 flex items-center gap-3">
                            <span className="text-2xl">✅</span>
                            <div>
                                <p className="font-semibold text-green-700 text-sm">Đã xác nhận thanh toán</p>
                                {consultation.meetingLink
                                    ? <p className="text-xs text-green-600">Phòng họp đã sẵn sàng. Bấm "Vào phòng họp" để bắt đầu.</p>
                                    : <p className="text-xs text-green-600">Nhân viên đang chuẩn bị phòng họp, vui lòng đợi.</p>}
                            </div>
                        </div>
                    )}
                    {isCancelled && (
                        <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 flex items-center gap-3">
                            <span className="text-2xl">❌</span>
                            <p className="font-semibold text-red-600 text-sm">Đơn tư vấn này đã bị hủy</p>
                        </div>
                    )}

                    {/* Order summary */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-sm font-bold text-[var(--green-dark)] mb-4 flex items-center gap-2">
                            <svg className="w-4 h-4 text-[var(--green-mid)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            Thông tin đơn tư vấn #{consultation.id}
                        </h2>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <p className="text-gray-400 text-xs mb-0.5">Bác sĩ</p>
                                <p className="font-semibold text-[var(--green-dark)]">{consultation.doctorName}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs mb-0.5">Chuyên khoa</p>
                                <p className="font-semibold text-[var(--green-dark)]">{consultation.specializationName || "—"}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs mb-0.5">Dịch vụ</p>
                                <p className="font-semibold text-[var(--green-dark)]">{consultation.serviceName || "—"}</p>
                            </div>
                            <div>
                                <p className="text-gray-400 text-xs mb-0.5">SĐT liên hệ</p>
                                <p className="font-semibold text-[var(--green-dark)]">{consultation.phoneNumber}</p>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between bg-emerald-50 rounded-xl px-4 py-3">
                            <span className="text-sm text-gray-600">Số tiền cần thanh toán</span>
                            <span className="text-xl font-bold text-[#f26522]">
                                {new Intl.NumberFormat("vi-VN").format(consultation.amount)}đ
                            </span>
                        </div>
                    </div>

                    {/* VNPay Payment Section */}
                    {!isPaid && !isCancelled && (
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-bold text-[var(--green-dark)] flex items-center gap-2">
                                    💳 Thanh toán trực tuyến qua VNPay
                                </h2>
                                {countdown && (
                                    <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Hết hạn sau {countdown}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col items-center py-6 px-4 bg-gradient-to-br from-emerald-50/50 to-indigo-50/30 rounded-2xl border border-emerald-100/40">
                                <div className="h-14 flex items-center justify-center mb-4 px-6 py-2 bg-white rounded-xl shadow-sm border border-gray-100">
                                    <img
                                        src="https://sandbox.vnpayment.vn/paymentv2/Images/brands/logo.svg"
                                        alt="VNPay Logo"
                                        className="h-8 object-contain"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 text-center max-w-sm mb-4 leading-relaxed">
                                    Hệ thống sẽ chuyển hướng bạn đến cổng thanh toán bảo mật VNPay. Bạn có thể sử dụng Thẻ nội địa (ATM), Thẻ quốc tế (Visa/Mastercard) hoặc quét QR ứng dụng ngân hàng.
                                </p>
                            </div>

                            <button
                                onClick={handleVnPayPayment}
                                disabled={paying || cancelling}
                                className="w-full py-4 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-emerald-500 via-[var(--green-mid)] to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-200 transition-all hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                            >
                                {paying ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Đang kết nối cổng VNPay...
                                    </>
                                ) : (
                                    <>
                                        💳 Thanh toán ngay với VNPay
                                    </>
                                )}
                            </button>

                            {/* Cancel Button */}
                            <button
                                onClick={handleCancel}
                                disabled={paying || cancelling}
                                className="w-full py-2.5 rounded-xl text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-50/50 transition-colors disabled:opacity-50"
                            >
                                {cancelling ? "Đang hủy đơn..." : "Hủy đơn tư vấn này"}
                            </button>
                        </div>
                    )}

                    {/* Meeting link for paid orders */}
                    {isPaid && consultation.meetingLink && (
                        <div className="bg-white rounded-3xl shadow-sm border border-green-100 p-6 text-center">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.362a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h3 className="font-bold text-[var(--green-dark)] mb-1">Phòng họp đã sẵn sàng!</h3>
                            <p className="text-xs text-gray-500 mb-4">Bấm nút bên dưới để bắt đầu tư vấn với bác sĩ</p>
                            <a
                                href={consultation.meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block w-full py-3.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-[var(--green-mid)] to-[var(--green-dark)] shadow-lg shadow-emerald-200 transition-all hover:shadow-xl"
                            >
                                🎥 Vào phòng họp ngay
                            </a>
                        </div>
                    )}

                    <button onClick={() => router.push("/lich-su-kham")} className="w-full text-center text-sm text-gray-400 hover:text-gray-600 py-2">
                        Xem lịch sử khám →
                    </button>
                </div>
            </div>
            <Footer />
        </>
    );
}
