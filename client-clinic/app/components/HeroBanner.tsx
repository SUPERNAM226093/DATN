"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";

import { useRouter } from "next/navigation";
import { fetchDoctors, DoctorResponse, getImageUrl } from "../lib/api";

export default function HeroBanner() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [doctors, setDoctors] = useState<DoctorResponse[]>([]);
    const [suggestions, setSuggestions] = useState<DoctorResponse[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    /**
     * HÀM 1: useEffect này chạy 1 lần khi load trang để lấy danh sách bác sĩ từ Backend.
     * Mục đích: Chuẩn bị dữ liệu cho tính năng tìm kiếm nhanh.
     */
    useEffect(() => {
        const loadDoctors = async () => {
            try {
                const data = await fetchDoctors();
                setDoctors(data);
            } catch (error) {
                console.error("Failed to load doctors:", error);
            }
        };
        loadDoctors();
    }, []);

    /**
     * HÀM 2: Logic xử lý gợi ý khi người dùng nhập vào ô tìm kiếm.
     * Tự động lọc danh sách bác sĩ theo Tên hoặc Chuyên khoa.
     */
    useEffect(() => {
        if (searchQuery.trim().length >= 1) {
            const filtered = doctors.filter(d =>
                d.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                d.specializationName.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setSuggestions(filtered.slice(0, 5)); // Chỉ lấy 5 kết quả đầu tiên để hiển thị gợi ý
            setShowSuggestions(true);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    }, [searchQuery, doctors]);

    /**
     * HÀM 3: Xử lý đóng bảng gợi ý khi người dùng Click chuột ra ngoài khu vực tìm kiếm.
     */
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    /**
     * HÀM 4: Xử lý khi người dùng chọn một bác sĩ từ bảng gợi ý.
     * Sẽ chuyển hướng (navigate) sang trang hồ sơ chi tiết của bác sĩ đó.
     */
    const handleSelectDoctor = (id: number) => {
        router.push(`/doctor/${id}`);
        setShowSuggestions(false);
        setSearchQuery("");
    };

    // Lấy danh sách các lợi ích (Benefits) từ file ngôn ngữ i18n
    const benefits = ["Đặt khám nhanh - Lấy số thứ tự trực tuyến - Tư vấn sức khỏe từ xa", "Đặt khám theo giờ - Đặt càng sớm để có thể có số thứ tự thấp nhất", "Được hoàn tiền khi huỷ khám - Có cơ hội nhận ưu đãi hoàn tiền"];

    return (
        /* HERO BANNER: Khối mở đầu trang chủ chiếm gần toàn màn hình.
           Dùng nền xanh đậm làm màu gốc, sau đó chồng ảnh nền, lớp phủ xanh và ảnh bác sĩ lên trên. */
        <section className="relative pt-36 pb-16 lg:pb-0 overflow-hidden bg-[#042f2e] min-h-screen flex items-center">
            {/* LỚP 1 - Ảnh nền hành lang bệnh viện: phủ kín toàn banner để tạo bối cảnh y tế. */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/clinic_corridor_bg.png"
                    alt="Clinic Background"
                    fill
                    priority
                    sizes="100vw"
                    className="object-cover object-center select-none pointer-events-none opacity-50 lg:opacity-75"
                />
                {/* LỚP 2 - Phủ xanh lên ảnh nền: bên trái đậm để chữ dễ đọc, bên phải nhạt dần để vẫn thấy ảnh bác sĩ và hành lang. */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#042f2e]/95 via-[#134e4a]/90 to-[#042f2e]/95 lg:bg-gradient-to-r lg:from-[#042f2e]/95 lg:via-[#0f766e]/85 lg:via-[#0d9488]/25 lg:to-transparent" />
            </div>

            {/* LỚP 3 - Họa tiết chấm mờ rất nhẹ: tạo chiều sâu cho nền nhưng không làm rối nội dung. */}
            <div className="absolute inset-0 opacity-5 pointer-events-none z-[1]" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.4) 1.5px, transparent 1.5px)', backgroundSize: '40px 40px' }} />

            {/* LỚP 4 - Dấu cộng y tế trang trí: đặt mờ phía sau để nhấn nhận diện ngành y. */}
            <div className="absolute top-24 right-[45%] text-white/5 text-6xl font-thin select-none pointer-events-none z-[1]">+</div>
            <div className="absolute top-48 left-[5%] text-white/5 text-4xl font-thin select-none pointer-events-none z-[1]">+</div>
            <div className="absolute bottom-32 left-[40%] text-white/5 text-5xl font-thin select-none pointer-events-none z-[1]">+</div>

            {/* LỚP 5 - Ảnh nhóm bác sĩ: đặt absolute bên phải, sát đáy banner, nổi trên nền nhưng thấp hơn khối chữ. */}
            <div className="absolute right-[5%] bottom-0 h-[96%] w-[55%] z-10 pointer-events-none hidden lg:flex items-end justify-end">
                <div className="relative w-full max-w-[440px] sm:max-w-[550px] lg:max-w-[850px] h-full">
                    <Image
                        src="/doctors-group.png"
                        alt="Medical Staff"
                        fill
                        priority
                        sizes="(max-width: 1024px) 100vw, 850px"
                        className="object-contain object-bottom select-none pointer-events-none drop-shadow-[0_15px_30px_rgba(0,0,0,0.35)] brightness-105"
                    />
                </div>
            </div>

            {/* LỚP 6 - Khối nội dung chính: căn giữa theo max-width để không bị dàn quá rộng trên màn hình lớn. */}
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full z-20">
                {/* Chia layout thành 12 cột trên desktop: 7 cột trái cho chữ/search, 5 cột phải chừa không gian cho ảnh bác sĩ. */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

                    {/* CỘT TRÁI - Nội dung chính: nhãn, tiêu đề, mô tả, nút PWA, thanh tìm kiếm và danh sách lợi ích. */}
                    <div className="lg:col-span-7 text-left space-y-8 relative z-20">
                        <div className="space-y-4">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Đặt khám trực tuyến nhanh chóng
                            </span>
                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold !text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-400 leading-tight tracking-tight">
                                Kết nối Người Dân với<br />
                                Cơ sở & Dịch vụ Y tế hàng đầu
                            </h1>
                            <p className="text-slate-300 text-sm md:text-base max-w-xl font-medium leading-relaxed">
                                Đặt lịch hẹn khám bệnh dễ dàng tại các phòng khám uy tín, khám từ xa qua video call hoặc đặt dịch vụ chăm sóc sức khoe chỉ với vài bước chạm.
                            </p>
                        </div>

                        {/* THANH TÌM KIẾM - Người dùng nhập tên bác sĩ hoặc chuyên khoa, hệ thống lọc gợi ý ngay bên dưới. */}
                        <div className="relative max-w-xl" ref={searchRef}>
                            <div className="relative flex items-center bg-white rounded-full shadow-2xl p-1.5 border border-white/10 transition-all focus-within:ring-2 focus-within:ring-sky-500/50">
                                <div className="flex items-center flex-1 px-4">
                                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input
                                        type="text"
                                        placeholder="Tìm kiếm bác sĩ hoặc chuyên khoa..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onFocus={() => searchQuery && setShowSuggestions(true)}
                                        className="w-full px-3 py-3.5 text-[15px] text-[#0a3d2e] placeholder-[#4d8871] bg-transparent outline-none font-semibold"
                                    />
                                </div>
                                <button className="px-6 py-3.5 rounded-full text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-emerald-800 hover:from-emerald-500 hover:to-emerald-700 active:scale-95 transition-all shadow-md">
                                    Tìm kiếm
                                </button>
                            </div>

                            {/* DROPDOWN GỢI Ý - Hiện tối đa 5 bác sĩ phù hợp với từ khóa người dùng nhập. */}
                            {showSuggestions && suggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-2xl border border-[#b2e8d9] overflow-hidden z-[60] animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="py-2">
                                        <p className="px-5 py-3 text-[10px] font-bold text-[#4d8871] uppercase tracking-[0.2em] border-b border-[var(--green-ultra)]">
                                            Bác sĩ tìm thấy ({suggestions.length})
                                        </p>
                                        {suggestions.map((doctor) => (
                                            <button
                                                key={doctor.id}
                                                onClick={() => handleSelectDoctor(doctor.id)}
                                                className="w-full px-5 py-4 flex items-center gap-4 hover:bg-[#f0fdf8] transition-all text-left group"
                                            >
                                                <div className="w-12 h-12 rounded-full overflow-hidden bg-[var(--green-ultra)] border border-[#b2e8d9] flex-shrink-0 shadow-sm">
                                                    {doctor.featureImageUrl ? (
                                                        <img src={getImageUrl(doctor.featureImageUrl)} alt={doctor.fullName} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-[#0d6b52] font-bold text-lg">
                                                            {doctor.fullName.charAt(0)}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-[#0a3d2e] group-hover:text-[#0d6b52] transition-colors truncate">
                                                        {doctor.fullName}
                                                    </p>
                                                    <p className="text-[11px] font-medium text-[#4d8871] truncate uppercase tracking-wide">
                                                        {doctor.specializationName}
                                                    </p>
                                                </div>
                                                <div className="w-8 h-8 rounded-full bg-[var(--green-ultra)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                                    <svg className="w-4 h-4 text-[#0d6b52]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="bg-[#f0fdf8] px-4 py-2.5 text-center border-t border-[#b2e8d9]">
                                        <p className="text-[11px] text-[#4d8871] font-medium italic">Nhấn để xem hồ sơ và đặt lịch khám ngay</p>
                                    </div>
                                </div>
                            )}

                            {showSuggestions && searchQuery.trim().length > 0 && suggestions.length === 0 && (
                                <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-2xl border border-[#b2e8d9] p-10 text-center z-[60]">
                                    <div className="w-16 h-16 bg-[var(--green-ultra)] rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-[#b2e8d9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <p className="text-sm text-[#0a3d2e] font-bold">Không tìm thấy bác sĩ nào</p>
                                    <p className="text-xs text-[#4d8871] mt-1">Vui lòng thử tìm kiếm theo tên hoặc chuyên khoa khác</p>
                                </div>
                            )}
                        </div>

                        {/* DANH SÁCH LỢI ÍCH - Tóm tắt nhanh các giá trị chính của hệ thống đặt khám. */}
                        <div className="space-y-3.5 pt-2">
                            {benefits.map((benefit, index) => (
                                <div key={index} className="flex items-start gap-3">
                                    <div className="w-5 h-5 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <svg className="w-3 h-3 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <p className="text-sm font-semibold text-slate-300">
                                        {benefit}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CỘT PHẢI - Chỉ giữ khoảng trống để ảnh bác sĩ absolute bên trên không đè vào nội dung bên trái. */}
                    <div className="lg:col-span-5 hidden lg:block h-[500px] pointer-events-none" />

                </div>
            </div>
        </section>
    );
}
