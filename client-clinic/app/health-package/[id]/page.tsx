"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    fetchHealthPackageById,
    createHealthPackageBooking,
    HealthPackageResponse,
    AuthResponse,
    fetchHealthPackageBookingsByPatient,
    fetchBookedHealthPackageSlots,
} from "../../lib/api";

import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { getTodayStr, getCurrentTimeStr } from "../../lib/dateUtils";

function formatPrice(price: number): string {
    return new Intl.NumberFormat("vi-VN").format(price) + "đ";
}

function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    return {
        dayOfWeek: days[d.getDay()],
        full: `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`,
    };
}

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

const FIXED_SLOTS = [
    { start: "08:00", end: "09:00" },
    { start: "09:00", end: "10:00" },
    { start: "10:00", end: "11:00" },
    { start: "11:00", end: "12:00" },
    { start: "12:00", end: "13:00" },
    { start: "13:00", end: "14:00" },
    { start: "14:00", end: "15:00" },
    { start: "15:00", end: "16:00" },
    { start: "16:00", end: "17:00" },
];

export default function HealthPackageDetailPage() {

    const params = useParams();
    const router = useRouter();
    const packageId = Number(params.id);

    const [pkg, setPkg] = useState<HealthPackageResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState(getTodayStr());
    const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
    const [bookingNote, setBookingNote] = useState("");
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [bookingError, setBookingError] = useState<string | null>(null);
    const [bookedSlots, setBookedSlots] = useState<string[]>([]);

    useEffect(() => {
        if (!packageId) return;
        fetchHealthPackageById(packageId)
            .then((p) => { setPkg(p); setLoading(false); })
            .catch(() => { setError("Không thể tải thông tin gói khám"); setLoading(false); });
    }, [packageId]);

    useEffect(() => {
        if (!packageId || !selectedDate) return;
        fetchBookedHealthPackageSlots(packageId, selectedDate)
            .then(slots => setBookedSlots(slots))
            .catch(() => setBookedSlots([]));
    }, [packageId, selectedDate]);

    const handleBooking = async () => {
        if (!selectedSlot || !pkg) return;

        const user = getLoggedInUser();
        if (!user || !user.userId) {
            setBookingError("Vui lòng đăng nhập để đặt lịch khám");
            return;
        }

        setBookingLoading(true);
        setBookingError(null);

        try {
            // Validate maximum 3 active health package bookings to prevent spam
            try {
                const userBookings = await fetchHealthPackageBookingsByPatient(user.userId);
                const activeBookings = userBookings.filter(b =>
                    b.status !== "CANCELLED" && b.status !== "COMPLETED"
                );
                if (activeBookings.length >= 3) {
                    setBookingError("Bạn đã đạt giới hạn tối đa 3 lượt xét duyệt gói khám đang chờ. Vui lòng chờ khám xong hoặc hủy bớt để đặt thêm.");
                    setBookingLoading(false);
                    return;
                }
            } catch (fetchErr) {
                console.error("Không thể kiểm tra lịch sử gói khám:", fetchErr);
            }

            await createHealthPackageBooking({
                patientId: user.userId,
                healthPackageId: pkg.id,
                bookingDate: selectedDate,
                bookingTime: selectedSlot.start,
                note: bookingNote || undefined,
            });
            setBookingSuccess(true);
            setSelectedSlot(null);
            setBookingNote("");
            setTimeout(() => setBookingSuccess(false), 5000);

            // Refresh booked slots immediately
            fetchBookedHealthPackageSlots(pkg.id, selectedDate)
                .then(slots => setBookedSlots(slots))
                .catch(() => { });
        } catch (err: any) {
            let message = err.message || "Đặt lịch gói khám thất bại. Vui lòng thử lại.";

            // Map specific backend errors to clean Vietnamese
            if (message.includes("Đã có lịch khám")) {
                message = "Đã có lịch khám vào khung giờ này.";
            } else if (message.includes("Đã có người đặt")) {
                message = "Đã có người đặt.";
            }

            setBookingError(message);
        } finally {
            setBookingLoading(false);
        }
    };

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="min-h-screen bg-gradient-to-b from-[#f0f8ff] to-white pt-36">
                    <div className="max-w-4xl mx-auto px-4 py-12">
                        <div className="animate-pulse space-y-6">
                            <div className="h-8 w-48 bg-gray-200 rounded" />
                            <div className="bg-white rounded-3xl overflow-hidden shadow-sm">
                                <div className="h-64 bg-gray-200" />
                                <div className="p-8 space-y-4">
                                    <div className="h-8 w-64 bg-gray-200 rounded" />
                                    <div className="h-4 w-full bg-gray-200 rounded" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <Footer />
            </>
        );
    }

    if (error || !pkg) {
        return (
            <>
                <Navbar />
                <div className="min-h-screen bg-gradient-to-b from-[#f0f8ff] to-white flex items-center justify-center pt-36">
                    <div className="bg-white rounded-3xl shadow-lg p-12 text-center max-w-md">
                        <p className="text-red-600 font-medium mb-4">{error}</p>
                        <button onClick={() => router.back()} className="text-[#7C6EE6] hover:underline text-sm">
                            ← Quay lại
                        </button>
                    </div>
                </div>
                <Footer />
            </>
        );
    }

    return (
        <>
            <Navbar />
            <div className="min-h-screen bg-gradient-to-b from-[#f0f8ff] to-white pt-36">
                <div className="max-w-4xl mx-auto px-4 py-8">

                    {/* Back button */}
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#7C6EE6] mb-6 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Quay lại
                    </button>

                    {/* Package Info */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                        <div className="h-72 bg-gradient-to-br from-[#F3F0FF] to-[#f9f8ff] flex items-center justify-center relative overflow-hidden">
                            {pkg.featureImageUrl ? (
                                <img
                                    src={`http://localhost:8081${pkg.featureImageUrl}`}
                                    alt={pkg.name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <svg className="w-24 h-24 text-[#7C6EE6]/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                            )}
                        </div>

                        <div className="p-8">
                            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                                <div>
                                    <h1 className="text-2xl font-bold text-[#392E7B] mb-2">{pkg.name}</h1>
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-xs font-semibold">
                                        ❤️ Gói khám sức khỏe
                                    </span>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-400 mb-1">Giá gói khám</p>
                                    <p className="text-3xl font-bold text-[#f26522]">
                                        {pkg.price ? formatPrice(pkg.price) : "Liên hệ"}
                                    </p>
                                </div>
                            </div>

                            {pkg.description && (
                                <div>
                                    <h3 className="text-sm font-bold text-[#392E7B] mb-3">Mô tả gói khám</h3>
                                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{pkg.description}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Schedule Picker */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 mb-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <h2 className="text-lg font-bold text-[#392E7B] flex items-center gap-2">
                                <svg className="w-5 h-5 text-[#7C6EE6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Lịch khám gói sức khỏe
                            </h2>
                            <div className="flex items-center gap-3">
                                <label htmlFor="booking-date" className="text-sm font-medium text-gray-500 whitespace-nowrap">
                                    Chọn ngày khám
                                </label>
                                <input
                                    id="booking-date"
                                    type="date"
                                    value={selectedDate}
                                    min={getTodayStr()}
                                    onChange={(e) => { setSelectedDate(e.target.value); setSelectedSlot(null); }}
                                    className="px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C6EE6]/20 focus:border-[#7C6EE6] cursor-pointer"
                                />
                            </div>
                        </div>

                        <div className="bg-[#fdfaf9] rounded-2xl border border-[#fef3f0] p-4">
                            <p className="text-xs font-bold text-[#f26522] uppercase tracking-wider mb-4">
                                {formatDate(selectedDate).dayOfWeek}, {formatDate(selectedDate).full}
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {FIXED_SLOTS.filter(slot => {
                                    if (selectedDate > getTodayStr()) return true;
                                    return slot.start > getCurrentTimeStr();
                                }).map((slot, index) => {
                                    const isSelected = selectedSlot?.start === slot.start;
                                    const isBooked = bookedSlots.includes(slot.start);
                                    return (
                                        <button
                                            key={index}
                                            onClick={() => setSelectedSlot(isSelected ? null : slot)}
                                            disabled={isBooked}
                                            className={`py-4 rounded-xl text-sm font-semibold transition-all duration-200 border text-center ${isBooked
                                                ? "bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed opacity-50"
                                                : isSelected
                                                    ? "bg-[#f26522] text-white border-[#f26522] shadow-md shadow-[#f26522]/30 scale-105"
                                                    : "bg-white text-gray-700 hover:bg-orange-50 hover:text-[#f26522] border-gray-200 hover:border-[#f26522]/30"
                                                }`}
                                        >
                                            {slot.start} – {slot.end}
                                        </button>
                                    );
                                })}
                                {FIXED_SLOTS.filter(slot => {
                                    if (selectedDate > getTodayStr()) return true;
                                    return slot.start > getCurrentTimeStr();
                                }).length === 0 && (
                                        <div className="col-span-full py-8 text-center text-gray-400">
                                            Rất tiếc, các khung giờ khám hôm nay đã hết. Vui lòng chọn ngày khác!
                                        </div>
                                    )}
                            </div>
                        </div>
                    </div>

                    {/* Booking Confirmation */}
                    {selectedSlot && (
                        <div className="bg-white rounded-3xl shadow-sm border border-[#f26522]/20 p-8 mb-6">
                            <h3 className="text-lg font-bold text-[#392E7B] mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 text-[#f26522]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                Xác nhận đặt lịch
                            </h3>

                            <div className="bg-orange-50 rounded-2xl p-5 mb-5">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-500 text-xs mb-1">Gói khám</p>
                                        <p className="font-semibold text-[#392E7B]">{pkg.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-xs mb-1">Ngày khám</p>
                                        <p className="font-semibold text-[#392E7B]">{formatDate(selectedDate).full}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-xs mb-1">Giờ khám</p>
                                        <p className="font-semibold text-[#392E7B]">{selectedSlot.start} – {selectedSlot.end}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-5">
                                <label className="block text-sm font-medium text-[#392E7B] mb-2">
                                    Ghi chú (nếu có)
                                </label>
                                <textarea
                                    value={bookingNote}
                                    onChange={(e) => setBookingNote(e.target.value)}
                                    placeholder="Mô tả triệu chứng hoặc yêu cầu đặc biệt..."
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#f26522]/20 focus:border-[#f26522] resize-none"
                                    rows={3}
                                    disabled={bookingLoading}
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setSelectedSlot(null); setBookingError(null); }}
                                    disabled={bookingLoading}
                                    className="px-6 py-3 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    onClick={handleBooking}
                                    disabled={bookingLoading}
                                    className="flex-1 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-[#f26522] hover:bg-[#e05a1a] shadow-lg shadow-[#f26522]/30 transition-all hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {bookingLoading && (
                                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                    )}
                                    Xác nhận đặt lịch
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Success Toast */}
            {bookingSuccess && (
                <div className="fixed bottom-6 right-6 bg-green-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-50">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="font-medium">Đặt lịch gói khám thành công!</span>
                </div>
            )}

            {/* Error Modal */}
            {bookingError && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
                        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Thông báo</h3>
                        <p className="text-gray-600 text-sm mb-6 leading-relaxed">{bookingError}</p>
                        <button
                            onClick={() => setBookingError(null)}
                            className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-xl transition-colors"
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            )}

            <Footer />
        </>
    );
}
