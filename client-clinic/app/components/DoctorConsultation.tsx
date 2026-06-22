"use client";
/**
 * FILE: DoctorConsultation.tsx
 * MÔ TẢ: Thành phần hiển thị danh sách các bác sĩ tư vấn video dưới dạng thanh cuộn ngang.
 */
import { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { fetchDoctors, DoctorResponse } from "../lib/api";


const AVATAR_COLORS = [
    "#1565c0", "#c62828", "#00695c", "#4527a0", "#e65100",
    "#0277bd", "#ad1457", "#2e7d32", "#6a1b9a", "#ef6c00",
];

export default function DoctorConsultation() {
    // --- 1. KHỞI TẠO CÁC HOOK VÀ BIẾN TRẠNG THÁI (STATE) ---

    const scrollRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const [doctors, setDoctors] = useState<DoctorResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);


    /**
     * HÀM 1: useEffect loadDoctors
     */
    useEffect(() => {
        fetchDoctors()
            .then((data) => {
                setDoctors(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error fetching doctors:", err);
                setError("Không thể tải danh sách bác sĩ");
                setLoading(false);
            });
    }, []);

    /**
     * HÀM 2: scroll
     */
    const scroll = (direction: "left" | "right") => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({
                left: direction === "left" ? -300 : 300,
                behavior: "smooth",
            });
        }
    };

    /**
     * HÀM 3: getAvatarColor
     */
    const getAvatarColor = (index: number) =>
        AVATAR_COLORS[index % AVATAR_COLORS.length];

    /**
     * HÀM 4: getInitial
     */
    const getInitial = (name: string) =>
        name?.split(" ").pop()?.charAt(0) || "?";

    // LOADING STATE
    if (loading) {
        return (
            /* TRẠNG THÁI ĐANG TẢI: Hiển thị khung giả lập card bác sĩ để người dùng biết dữ liệu đang được lấy từ backend. */
            <section className="py-14 bg-transparent">
                <div className="max-w-6xl mx-auto px-4">
                    {/* TIÊU ĐỀ KHU VỰC: Giữ giống layout thật để khi hết loading giao diện không bị nhảy mạnh. */}
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-extrabold text-[#0a3d2e] tracking-tight">
                            {"ĐẶT LỊCH KHÁM VỚI BÁC SĨ"}
                        </h2>
                        <div className="w-16 h-1.5 bg-[#0d6b52] mx-auto mt-4 rounded-full opacity-20"></div>
                    </div>
                    {/* SKELETON CARDS: Các thẻ xám mô phỏng ảnh, tên và nút của card bác sĩ khi dữ liệu chưa tải xong. */}
                    <div className="flex gap-5 overflow-hidden">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex-shrink-0 w-[250px] bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                                <div className="pt-6 pb-4 px-6 flex flex-col items-center">
                                    <div className="w-24 h-24 rounded-full bg-gray-200" />
                                    <div className="mt-3 w-full flex justify-between">
                                        <div className="h-3 w-16 bg-gray-200 rounded" />
                                        <div className="h-3 w-16 bg-gray-200 rounded" />
                                    </div>
                                </div>
                                <div className="px-4 pb-5 space-y-2">
                                    <div className="h-3 w-12 bg-gray-200 rounded" />
                                    <div className="h-4 w-32 bg-gray-200 rounded" />
                                    <div className="h-10 w-full bg-gray-200 rounded-lg mt-4" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    // ERROR STATE
    if (error) {
        return (
            /* TRẠNG THÁI LỖI: Khi API danh sách bác sĩ lỗi, hiển thị thông báo và nút tải lại trang. */
            <section className="py-14 bg-transparent">
                <div className="max-w-6xl mx-auto px-4 text-center">
                    {/* TIÊU ĐỀ KHU VỰC: Vẫn hiển thị tiêu đề để người dùng biết lỗi thuộc phần đặt lịch bác sĩ. */}
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-extrabold text-[#0a3d2e] tracking-tight">
                            {"ĐẶT LỊCH KHÁM VỚI BÁC SĨ"}
                        </h2>
                        <div className="w-16 h-1.5 bg-[#0d6b52] mx-auto mt-4 rounded-full opacity-20"></div>
                    </div>
                    {/* HỘP THÔNG BÁO LỖI: Nền đỏ nhạt, icon cảnh báo và nút thử lại. */}
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-8 inline-block">
                        <svg className="w-10 h-10 text-red-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                        <p className="text-red-600 text-sm font-medium">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-3 text-xs text-red-500 hover:text-red-700 underline"
                        >
                            {"Thử lại"}
                        </button>
                    </div>
                </div>
            </section>
        );
    }

    // EMPTY STATE
    if (doctors.length === 0) {
        return (
            /* TRẠNG THÁI RỖNG: API chạy thành công nhưng chưa có bác sĩ nào để hiển thị. */
            <section className="py-14 bg-transparent">
                <div className="max-w-6xl mx-auto px-4 text-center">
                    {/* TIÊU ĐỀ KHU VỰC: Giữ cùng cấu trúc với trạng thái có dữ liệu. */}
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-extrabold text-[#0a3d2e] tracking-tight">
                            {"ĐẶT LỊCH KHÁM VỚI BÁC SĨ"}
                        </h2>
                        <div className="w-16 h-1.5 bg-[#0d6b52] mx-auto mt-4 rounded-full opacity-20"></div>
                    </div>
                    <p className="text-gray-500 text-sm">{"Hiện chưa có bác sĩ nào."}</p>
                </div>
            </section>
        );
    }

    return (
        /* KHU VỰC ĐẶT LỊCH VỚI BÁC SĨ: Section trên trang chủ hiển thị danh sách bác sĩ dạng carousel ngang. */
        <section className="py-14 bg-transparent">
            {/* CONTAINER CHÍNH: Căn giữa nội dung và giới hạn chiều rộng để card không dàn quá rộng trên màn hình lớn. */}
            <div className="max-w-6xl mx-auto px-4">
                {/* HEADER SECTION: Tiêu đề lớn và gạch nhấn màu xanh, đồng bộ với các section khác trên trang chủ. */}
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-extrabold text-[#0a3d2e] tracking-tight">
                        {"ĐẶT LỊCH KHÁM VỚI BÁC SĨ"}
                    </h2>
                    <div className="w-16 h-1.5 bg-[#0d6b52] mx-auto mt-4 rounded-full opacity-20"></div>
                </div>

                {/* CAROUSEL WRAPPER: Bọc danh sách bác sĩ và hai nút điều hướng trái/phải. */}
                <div className="relative group">
                    {/* NÚT CUỘN TRÁI: Khi hover vào carousel mới hiện, giúp giao diện gọn hơn. */}
                    <button
                        onClick={() => scroll("left")}
                        className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-500 hover:text-[#2e5bff] hover:shadow-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    {/* NÚT CUỘN PHẢI: Cuộn danh sách card bác sĩ sang phải theo từng đoạn 300px. */}
                    <button
                        onClick={() => scroll("right")}
                        className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-500 hover:text-black hover:shadow-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>

                    {/* DANH SÁCH BÁC SĨ: Flex hàng ngang, có overflow-x để kéo/cuộn trên desktop và mobile. */}
                    <div
                        ref={scrollRef}
                        className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory"
                        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                    >
                        {doctors.map((doctor, index) => (
                            /* CARD BÁC SĨ: Mỗi card là một bác sĩ, click vào card sẽ chuyển sang trang chi tiết /doctor/{id}. */
                            <div
                                key={doctor.id}
                                onClick={() => router.push(`/doctor/${doctor.id}`)}
                                className="flex-shrink-0 w-[250px] snap-start card-premium overflow-hidden cursor-pointer"
                            >
                                {/* PHẦN ẢNH ĐẠI DIỆN: Hiển thị ảnh bác sĩ nếu có, nếu không thì dùng chữ cái đầu tên kèm màu nền tự động. */}
                                <div className="relative pt-6 pb-4 px-6">
                                    <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                                        {doctor.featureImageUrl ? (
                                            <img
                                                src={`https://sandy-marker-trance-column.trycloudflare.com${doctor.featureImageUrl}`}
                                                alt={doctor.fullName}
                                                className="w-full h-full rounded-full object-cover"
                                            />
                                        ) : (
                                            <div
                                                className="w-full h-full rounded-full flex items-center justify-center text-white text-2xl font-bold"
                                                style={{ backgroundColor: getAvatarColor(index) }}
                                            >
                                                {getInitial(doctor.fullName)}
                                            </div>
                                        )}
                                    </div>

                                    {/* THÔNG TIN NHANH: Kinh nghiệm và trạng thái xác thực hiển thị ngay dưới ảnh đại diện. */}
                                    <div className="flex justify-between items-center mt-3 text-[10px] text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <span className="font-bold text-gray-400">{"Kinh nghiệm:"}</span>
                                            <span className="font-bold text-black">{doctor.experienceYears} {"năm"}</span>
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                            <span className="text-black font-bold">{"Xác thực"}</span>
                                        </span>
                                    </div>
                                </div>

                                {/* PHẦN NỘI DUNG CARD: Tên bác sĩ, chuyên khoa, email và nút chuyển sang trang tư vấn/đặt lịch. */}
                                <div className="px-4 pb-5">
                                    <h3 className="text-base font-bold text-[#000000] mb-2">
                                        {doctor.fullName}
                                    </h3>
                                    <div className="space-y-1 text-xs text-gray-500 mb-4">
                                        <div className="flex items-center gap-1.5">
                                            <svg className="w-3.5 h-3.5 text-black" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M7 2a1 1 0 00-.707 1.707L7 4.414v3.758a1 1 0 01-.293.707l-4 4C.817 14.769 2.156 18 4.828 18h10.343c2.673 0 4.012-3.231 2.122-5.121l-4-4A1 1 0 0113 8.172V4.414l.707-.707A1 1 0 0013 2H7zm2 6.172V4h2v4.172a3 3 0 00.879 2.12l1.027 1.028a4 4 0 00-2.171.102l-.47.156a4 4 0 01-2.53 0l-.563-.187 1.116-1.116A3 3 0 009 8.172z" clipRule="evenodd" />
                                            </svg>
                                            {doctor.specializationName || "Đa khoa"}
                                        </div>
                                        {doctor.email && (
                                            <div className="flex items-center gap-1.5">
                                                <svg className="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                </svg>
                                                <span className="truncate">{doctor.email}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* NÚT TƯ VẤN NGAY: Chặn nổi bọt sự kiện để click nút không kích hoạt click toàn card hai lần. */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); router.push(`/doctor/${doctor.id}`); }}
                                        className="w-full btn-premium text-sm py-2.5 rounded-lg"
                                    >
                                        {"Tư vấn ngay"}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </section>
    );
}
