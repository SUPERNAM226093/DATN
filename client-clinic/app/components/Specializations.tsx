"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

import { fetchSpecializations, SpecializationResponse } from "../lib/api";

const ICON_COLORS = [
    "#0288d1", "#00897b", "#5c6bc0", "#ef6c00",
    "#ad1457", "#2e7d32", "#6a1b9a", "#c62828",
    "#00838f", "#4527a0", "#1565c0", "#e65100",
    "#0277bd", "#00695c", "#7b1fa2", "#d84315",
];

/**
 * HÀM BỔ TRỢ: getFallbackIcon
 * MÔ TẢ: Trả về một Icon SVG tương ứng với tên chuyên khoa nếu chuyên khoa đó không có ảnh đại diện từ API.
 */
function getFallbackIcon(name: string): React.ReactNode {
    const lower = name.toLowerCase();

    if (lower.includes("tim") || lower.includes("mạch"))
        return (
            <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
        );
    if (lower.includes("mắt"))
        return (
            <>
                <path d="M1 10s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7z" />
                <circle cx="10" cy="10" r="3" />
            </>
        );
    if (lower.includes("thần kinh") || lower.includes("não"))
        return (
            <path d="M10 2a5 5 0 00-3.5 8.5L10 14l3.5-3.5A5 5 0 0010 2zM5 10c-2 1.5-3 4-3 6h16c0-2-1-4.5-3-6" />
        );
    if (lower.includes("xương") || lower.includes("khớp"))
        return (
            <path d="M7 2v4a2 2 0 01-2 2H3v4h2a2 2 0 012 2v4h6v-4a2 2 0 012-2h2V8h-2a2 2 0 01-2-2V2H7z" />
        );
    if (lower.includes("tiêu hóa") || lower.includes("gan") || lower.includes("mật"))
        return (
            <path d="M10 2C5 2 2 6 2 10c0 3 1.5 5.5 4 7l4 1 4-1c2.5-1.5 4-4 4-7 0-4-3-8-8-8zm0 4a2 2 0 110 4 2 2 0 010-4z" />
        );
    if (lower.includes(" hô hấp") || lower.includes("phổi"))
        return (
            <path d="M10 2v6M7 8C4 9 2 12 2 15c0 2 1.5 3 3 3h10c1.5 0 3-1 3-3 0-3-2-6-5-7" />
        );
    if (lower.includes("da") || lower.includes("liễu"))
        return (
            <>
                <circle cx="10" cy="10" r="8" />
                <path d="M6 10c0-2.2 1.8-4 4-4" />
            </>
        );
    if (lower.includes("sản") || lower.includes("phụ khoa"))
        return (
            <path d="M10 2a6 6 0 016 6c0 3-2 5-3.5 7L10 18l-2.5-3C6 13 4 11 4 8a6 6 0 016-6z" />
        );
    if (lower.includes("tai") || lower.includes("mũi") || lower.includes("họng"))
        return (
            <>
                <path d="M5 8a5 5 0 0110 0c0 3-2 5-5 8-3-3-5-5-5-8z" />
                <circle cx="10" cy="8" r="2" />
            </>
        );
    if (lower.includes("nội") || lower.includes("tổng quát"))
        return (
            <path d="M10 2L2 7v9a2 2 0 002 2h12a2 2 0 002-2V7l-8-5zM8 12h4M10 10v4" />
        );
    if (lower.includes("ngoại"))
        return (
            <path d="M14.121 14.121A3 3 0 0012 15H8a3 3 0 01-2.121-.879l-4-4a1.5 1.5 0 010-2.121l8-8a1.5 1.5 0 012.121 0l4 4a3 3 0 01.879 2.121v4a3 3 0 01-.879 2.121z" />
        );
    if (lower.includes("truyền nhiễm"))
        return (
            <>
                <circle cx="10" cy="10" r="6" />
                <circle cx="10" cy="10" r="2" />
                <path d="M10 2v2M10 16v2M2 10h2M16 10h2" />
            </>
        );
    if (lower.includes("tiết niệu") || lower.includes("thận"))
        return (
            <path d="M7 3C5 3 3 5.5 3 9c0 3 1.5 5 4 6l3 2 3-2c2.5-1 4-3 4-6 0-3.5-2-6-4-6S12 5 10 7C8 5 9 3 7 3z" />
        );
    if (lower.includes("nội tiết"))
        return (
            <>
                <circle cx="10" cy="6" r="4" />
                <path d="M4 18c0-3.3 2.7-6 6-6s6 2.7 6 6" />
            </>
        );

    // Default medical cross
    return <path d="M8 2v6H2v4h6v6h4v-6h6V8h-6V2H8z" />;
}

export default function Specializations() {
    // --- KHAI BÁO CÁC HOOK VÀ STATE ---

    const [specializations, setSpecializations] = useState<SpecializationResponse[]>([]); // Danh sách chuyên khoa
    const [loading, setLoading] = useState(true); // Trạng thái đang tải
    const [error, setError] = useState<string | null>(null); // Lưu thông báo lỗi nếu API thất bại
    const router = useRouter();
    const scrollRef = useRef<HTMLDivElement>(null);

    /**
     * HÀM 0: scroll
     * MÔ TẢ: Xử lý cuộn ngang khi nhấn nút mũi tên.
     */
    const scroll = (direction: "left" | "right") => {
        if (scrollRef.current) {
            const scrollAmount = 300;
            scrollRef.current.scrollBy({
                left: direction === "left" ? -scrollAmount : scrollAmount,
                behavior: "smooth",
            });
        }
    };

    /**
     * HÀM 1: useEffect lấy dữ liệu chuyên khoa từ API khi component được khởi tạo.
     */
    useEffect(() => {
        fetchSpecializations()
            .then((data) => {
                setSpecializations(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error fetching specializations:", err);
                setError("Không thể tải danh sách chuyên khoa");
                setLoading(false);
            });
    }, []);

    if (loading) return null;

    return (
        <section className="py-14 bg-transparent">
            <div className="max-w-7xl mx-auto px-4">
                {/* Tiêu đề mục Chuyên khoa - Modern Navy Style */}
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-extrabold text-[#0a3d2e] tracking-tight">
                        CHUYÊN KHOA
                    </h2>
                    <div className="w-16 h-1.5 bg-[#0d6b52] mx-auto mt-4 rounded-full opacity-20"></div>
                </div>

                <div className="relative group/carousel">
                    {/* NÚT ĐIỀU HƯỚNG TRÁI/PHẢI - Premium Style */}
                    <button
                        onClick={() => scroll("left")}
                        className="absolute -left-6 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white shadow-xl flex items-center justify-center text-[#0d6b52] hover:bg-[#0d6b52] hover:text-white transition-all opacity-0 group-hover/carousel:opacity-100"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <button
                        onClick={() => scroll("right")}
                        className="absolute -right-6 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white shadow-xl flex items-center justify-center text-[#0d6b52] hover:bg-[#0d6b52] hover:text-white transition-all opacity-0 group-hover/carousel:opacity-100"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>

                    <div
                        ref={scrollRef}
                        className="flex gap-6 overflow-x-auto pb-8 px-2 no-scrollbar snap-x snap-mandatory"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {specializations.map((spec, index) => (
                            <div
                                key={spec.id}
                                onClick={() => router.push(`/specialization/${spec.id}`)}
                                className="flex-shrink-0 group flex flex-col items-center gap-4 transition-all duration-300 hover:-translate-y-2 cursor-pointer snap-start"
                                title={spec.description || spec.name}
                            >
                                <div className="w-20 h-20 rounded-[1.5rem] bg-white flex items-center justify-center overflow-hidden
                                                shadow-[0_10px_25px_-10px_rgba(0,0,0,0.05)] border border-[#b2e8d9] 
                                                group-hover:shadow-[0_15px_30px_-10px_rgba(13,107,82,0.2)] 
                                                group-hover:border-[#0d6b52]/40 transition-all duration-500 relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--green-ultra)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    {spec.featureImageUrl ? (
                                        <img
                                            src={`http://localhost:8081${spec.featureImageUrl}`}
                                            alt={spec.name}
                                            className="w-10 h-10 object-contain relative z-10 transition-transform group-hover:scale-110"
                                        />
                                    ) : (
                                        <svg className="w-9 h-9 relative z-10" viewBox="0 0 20 20" fill="#0d6b52" stroke="none">
                                            {getFallbackIcon(spec.name)}
                                        </svg>
                                    )}
                                </div>

                                <span className="text-sm text-center text-[#0a3d2e] font-bold leading-tight max-w-[100px]
                                                 group-hover:text-[#0d6b52] transition-colors line-clamp-2">
                                    {spec.name}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
