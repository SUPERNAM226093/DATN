"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    fetchDoctorById,
    fetchDoctorSchedules,
    fetchAvailableSlots,
    createAppointment,
    DoctorResponse,
    DoctorScheduleResponse,
    AuthResponse,
    fetchAppointmentsByPatient,
} from "../../lib/api";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

import { getTodayStr, getCurrentTimeStr } from "../../lib/dateUtils";


const AVATAR_COLORS = ["#1565c0", "#c62828", "#00695c", "#4527a0", "#e65100"];

function formatTime(time: string) {
    return time.substring(0, 5);
}

function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    return {
        dayOfWeek: days[d.getDay()],
        day: d.getDate(),
        month: d.getMonth() + 1,
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

function getClinicInfo(id?: number) {
    switch (id) {
        case 1: return "CS1 - 32 Đại Từ, Hoàng Mai, HN";
        case 2: return "CS2 - 226 Ngô Quyền, Hà Đông, HN";
        case 3: return "CS3 - 82 Kim Mã, Ba Đình, HN";
        case 4: return "CS4 - 10 Hoàng Quốc Việt, Cầu Giấy, HN";
        default: return id ? `Cơ sở ${id}` : "";
    }
}

export default function DoctorDetailPage() {

    const params = useParams();
    const router = useRouter();
    const doctorId = Number(params.id);

    const [doctor, setDoctor] = useState<DoctorResponse | null>(null);
    const [schedules, setSchedules] = useState<DoctorScheduleResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState(getTodayStr());
    const [selectedSchedule, setSelectedSchedule] = useState<DoctorScheduleResponse | null>(null);
    const [bookingNote, setBookingNote] = useState("");
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [bookingError, setBookingError] = useState<string | null>(null);


    useEffect(() => {
        if (!doctorId) return;
        fetchDoctorById(doctorId)
            .then((doc) => {
                setDoctor(doc);
                setLoading(false);
            })
            .catch(() => {
                setError("Không thể tải thông tin bác sĩ");
                setLoading(false);
            });
    }, [doctorId]);

    useEffect(() => {
        if (!doctorId || !selectedDate) return;
        setSlotsLoading(true);
        fetchAvailableSlots(doctorId, selectedDate)
            .then((sched) => {
                let sorted = sched.sort((a, b) => a.startTime.localeCompare(b.startTime));

                // Filter out past slots if selected date is today
                const todayStr = getTodayStr();
                if (selectedDate === todayStr) {
                    const currentTimeStr = getCurrentTimeStr();
                    sorted = sorted.filter(slot => slot.startTime >= currentTimeStr);
                }

                setSchedules(sorted);
                setSlotsLoading(false);
            })
            .catch(() => {
                setSchedules([]);
                setSlotsLoading(false);
            });
    }, [doctorId, selectedDate]);

    const handleBooking = async () => {
        if (!selectedSchedule || !doctor) return;

        const user = getLoggedInUser();
        if (!user || !user.userId) {
            setBookingError("Vui lòng đăng nhập để đặt lịch khám.");
            return;
        }

        setBookingLoading(true);
        setBookingError(null);

        try {
            // Validate maximum 3 active appointments to prevent spam
            try {
                const userAppointments = await fetchAppointmentsByPatient(user.userId);
                const activeAppointments = userAppointments.filter(app =>
                    app.status !== "CANCELLED" && app.status !== "COMPLETED"
                );
                if (activeAppointments.length >= 3) {
                    setBookingError("Bạn đã đạt giới hạn tối đa 3 lượt lịch hẹn khám đang chờ. Vui lòng chờ khám xong hoặc hủy bớt để đặt thêm.");
                    setBookingLoading(false);
                    return;
                }
            } catch (fetchErr) {
                console.error("Không thể kiểm tra lịch sử đặt lịch:", fetchErr);
            }

            await createAppointment({
                patientId: user.userId,
                doctorId: doctor.id,
                scheduleId: selectedSchedule.id,
                appointmentDate: selectedSchedule.workDate,
                appointmentTime: selectedSchedule.startTime,
                note: bookingNote || undefined,
            });
            setBookingSuccess(true);
            setSelectedSchedule(null);
            setBookingNote("");
            setTimeout(() => setBookingSuccess(false), 5000);
        } catch (err: any) {
            let message = err.message || "Đặt lịch thất bại. Vui lòng thử lại.";

            // Handle specific conflict messages from backend
            if (message.includes("Đã có lịch khám") || message.includes("đã đặt một gói khám") || message.includes("đã có người đặt")) {
                message = "Đã có lịch khám vào khung giờ này.";
            } else if (message.includes("Unauthorized")) {
                message = "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại!";
            } else if (message.includes("not found")) {
                message = "Thông tin không hợp lệ hoặc đã bị thay đổi.";
            }

            setBookingError(message);
        } finally {
            setBookingLoading(false);
        }
    };

    // No longer need schedulesByDate reduction as we fetch by specific date

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="min-h-screen bg-white pt-36">
                    <div className="max-w-4xl mx-auto px-4 py-12">
                        <div className="animate-pulse space-y-6">
                            <div className="h-8 w-48 bg-gray-200 rounded" />
                            <div className="bg-white rounded-3xl p-8 shadow-sm">
                                <div className="flex gap-6">
                                    <div className="w-32 h-32 rounded-full bg-gray-200" />
                                    <div className="space-y-3 flex-1">
                                        <div className="h-6 w-48 bg-gray-200 rounded" />
                                        <div className="h-4 w-32 bg-gray-200 rounded" />
                                        <div className="h-4 w-64 bg-gray-200 rounded" />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-3xl p-8 shadow-sm">
                                <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
                                <div className="grid grid-cols-4 gap-3">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div key={i} className="h-20 bg-gray-200 rounded-xl" />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <Footer />
            </>
        );
    }

    if (error || !doctor) {
        return (
            <>
                <Navbar />
                <div className="min-h-screen bg-gradient-to-b from-[#f0f8ff] to-white flex items-center justify-center pt-36">
                    <div className="bg-white rounded-3xl shadow-lg p-12 text-center max-w-md">
                        <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                        <p className="text-red-600 font-medium mb-4">{error}</p>
                        <button onClick={() => router.back()} className="text-black hover:underline text-sm">
                            ← {"Quay lại"}
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
                        className="flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-6 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        {"Quay lại"}
                    </button>

                    {/* Doctor Profile Card */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                        <div className="bg-gradient-to-r from-[var(--green-mid)] to-[var(--green-dark)] h-32 relative" />
                        <div className="px-8 pb-8 -mt-16 relative">
                            <div className="flex flex-col md:flex-row gap-6 items-start">
                                {/* Avatar */}
                                <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white flex-shrink-0">
                                    {doctor.featureImageUrl ? (
                                        <img
                                            src={`http://localhost:8081${doctor.featureImageUrl}`}
                                            alt={doctor.fullName}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div
                                            className="w-full h-full flex items-center justify-center text-white text-4xl font-bold"
                                            style={{ backgroundColor: AVATAR_COLORS[doctorId % AVATAR_COLORS.length] }}
                                        >
                                            {doctor.fullName?.split(" ").pop()?.charAt(0) || "?"}
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="pt-4 md:pt-16 flex-1">
                                    <h1 className="text-2xl font-bold text-[var(--green-dark)] mb-1">{doctor.fullName}</h1>
                                    <div className="flex flex-wrap gap-3 mb-4">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-black text-xs font-semibold">
                                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M7 2a1 1 0 00-.707 1.707L7 4.414v3.758a1 1 0 01-.293.707l-4 4C.817 14.769 2.156 18 4.828 18h10.343c2.673 0 4.012-3.231 2.122-5.121l-4-4A1 1 0 0113 8.172V4.414l.707-.707A1 1 0 0013 2H7zm2 6.172V4h2v4.172a3 3 0 00.879 2.12l1.027 1.028a4 4 0 00-2.171.102l-.47.156a4 4 0 01-2.53 0l-.563-.187 1.116-1.116A3 3 0 009 8.172z" clipRule="evenodd" />
                                            </svg>
                                            {doctor.specializationName || "Đa khoa"}
                                        </span>
                                        {doctor.experienceYears > 0 && (
                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-600 text-xs font-semibold">
                                                ⭐ {doctor.experienceYears} {"năm kinh nghiệm"}
                                            </span>
                                        )}
                                        {doctor.clinicId && (
                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-50 text-green-600 text-xs font-semibold">
                                                ✓ {getClinicInfo(doctor.clinicId)}
                                            </span>
                                        )}
                                    </div>
                                    {doctor.bio && (
                                        <p className="text-sm text-gray-600 leading-relaxed">{doctor.bio}</p>
                                    )}
                                    {doctor.email && (
                                        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                            {doctor.email}
                                        </p>
                                    )}


                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Schedule Calendar */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 mb-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                            <h2 className="text-lg font-bold text-[var(--green-dark)] flex items-center gap-2">
                                <svg className="w-5 h-5 text-[var(--green-mid)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {"Lịch khám bệnh"}
                            </h2>

                            <div className="flex items-center gap-3">
                                <label htmlFor="work-date" className="text-sm font-medium text-gray-500 whitespace-nowrap">Chọn ngày khám</label>
                                <input
                                    id="work-date"
                                    type="date"
                                    value={selectedDate}
                                    min={getTodayStr()}
                                    onChange={(e) => {
                                        setSelectedDate(e.target.value);
                                        setSelectedSchedule(null);
                                    }}
                                    className="px-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--green-mid)]/20 focus:border-[var(--green-mid)] cursor-pointer"
                                />
                            </div>
                        </div>

                        {slotsLoading ? (
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                                    <div key={i} className="h-12 bg-gray-50 rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : schedules.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-sm">Không có lịch trong ngày này</p>
                            </div>
                        ) : (
                            <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                                {schedules.map((slot, index) => {
                                    const isSelected = selectedSchedule?.id === slot.id;
                                    const isAvailable = slot.available;
                                    return (
                                        <button
                                            key={index}
                                            onClick={() => setSelectedSchedule(isSelected ? null : slot)}
                                            disabled={!isAvailable}
                                            className={`px-4 py-4 rounded-xl text-sm font-semibold transition-all duration-200 border text-center flex items-center justify-center min-h-[60px] ${!isAvailable
                                                ? "bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed opacity-50"
                                                : isSelected
                                                    ? "bg-[var(--green-mid)] text-white border-[var(--green-mid)] shadow-md scale-105 z-10"
                                                    : "bg-white text-gray-700 hover:bg-[#E6EFFF] hover:text-[#0065FF] border-gray-200 hover:border-[var(--green-mid)]"
                                                }`}
                                        >
                                            <span>
                                                {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Booking Form */}
                    {selectedSchedule && (
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 mb-6 animate-in slide-in-from-bottom-4">
                            <h3 className="text-lg font-bold text-[var(--green-dark)] mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 text-[var(--green-mid)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                {"Xác nhận đặt lịch"}
                            </h3>

                            <div className="bg-[#f0f8ff] rounded-2xl p-5 mb-5">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-500 text-xs mb-1">{"Bác sĩ"}</p>
                                        <p className="font-semibold text-[var(--green-dark)]">{doctor.fullName}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-xs mb-1">{"Ngày khám"}</p>
                                        <p className="font-semibold text-[var(--green-dark)]">{formatDate(selectedSchedule.workDate).full}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-xs mb-1">{"Thời gian"}</p>
                                        <p className="font-semibold text-[var(--green-dark)]">
                                            {formatTime(selectedSchedule.startTime)} - {formatTime(selectedSchedule.endTime)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-5">
                                <label className="block text-sm font-medium text-[var(--green-dark)] mb-2">{"Ghi chú (tùy chọn)"}</label>
                                <textarea
                                    value={bookingNote}
                                    onChange={(e) => setBookingNote(e.target.value)}
                                    placeholder={"Mô tả triệu chứng hoặc lý do khám..."}
                                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--green-mid)]/20 focus:border-[var(--green-mid)] resize-none"
                                    rows={3}
                                    disabled={bookingLoading}
                                />
                            </div>



                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setSelectedSchedule(null); setBookingError(null); }}
                                    disabled={bookingLoading}
                                    className="px-6 py-3 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
                                >
                                    {"Hủy"}
                                </button>
                                <button
                                    onClick={handleBooking}
                                    disabled={bookingLoading}
                                    className="flex-1 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[var(--green-mid)] to-[var(--green-dark)] hover:from-[#1580cc] hover:to-[#0b5ca0] shadow-lg transition-all hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {bookingLoading ? (
                                        <>
                                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            {"Đang xử lý..."}
                                        </>
                                    ) : (
                                        "Xác nhận đặt lịch khám"
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Success Toast */}
                    {bookingSuccess && (
                        <div className="fixed bottom-6 right-6 bg-green-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4 z-50">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="font-medium">{"Đặt lịch khám thành công!"}</span>
                        </div>
                    )}

                    {/* Error Dialog Modal */}
                    {bookingError && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                            <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-200">
                                <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Thông báo</h3>
                                <p className="text-gray-600 text-sm mb-6 leading-relaxed px-4">{bookingError}</p>
                                <button
                                    onClick={() => setBookingError(null)}
                                    className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-xl transition-colors"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <Footer />


        </>
    );
}
