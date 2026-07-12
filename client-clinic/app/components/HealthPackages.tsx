"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

import { fetchHealthPackages, HealthPackageResponse, getImageUrl } from "../lib/api";
function formatPrice(price: number): string {
    return new Intl.NumberFormat("vi-VN").format(price) + "đ";
}

export default function HealthPackages() {
    const scrollRef = useRef<HTMLDivElement>(null); // Điều khiển cuộn ngang
    const router = useRouter(); // Điều hướng trang
    const [packages, setPackages] = useState<HealthPackageResponse[]>([]); // Danh sách gói khám
    const [loading, setLoading] = useState(true); // Trạng thái tải dữ liệu
    const [error, setError] = useState<string | null>(null); // Lưu lỗi nếu API thất bại

    /**
     * HÀM 1: useEffect loadPackages
     * MÔ TẢ: Lấy danh sách gói khám từ API khi trang web được tải.
     */
    useEffect(() => {
        fetchHealthPackages()
            .then((data) => {
                setPackages(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error("Error fetching health packages:", err);
                setError("Không thể tải danh sách gói khám");
                setLoading(false);
            });
    }, []);

    /**
     * HÀM 2: scroll
     * MÔ TẢ: Xử lý cuộn ngang khi người dùng nhấn mũi tên.
     */
    const scroll = (direction: "left" | "right") => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({
                left: direction === "left" ? -300 : 300,
                behavior: "smooth",
            });
        }
    };

    const CARD_COLORS = [
        "#1565c0", "#c62828", "#00695c", "#4527a0", "#e65100",
        "#0277bd", "#ad1457", "#2e7d32", "#6a1b9a", "#ef6c00",
    ];

    /**
     * HÀM 3: getCardColor
     * MÔ TẢ: Trả về màu sắc cho thẻ gói khám dựa trên index.
     */
    const getCardColor = (index: number) =>
        CARD_COLORS[index % CARD_COLORS.length];

    // TRẠNG THÁI ĐANG TẢI (Loading Skeleton) - Hiển thị các ô vuông nhấp nháy khi đang lấy dữ liệu
    if (loading) {
        return (
            <section className="py-14 bg-transparent">
                <div className="max-w-6xl mx-auto px-4">
                    <h2 className="text-xl md:text-2xl font-bold text-center text-[#000000] mb-10 tracking-wide">
                        {"CHĂM SÓC SỨC KHỎE TOÀN DIỆN"}
                    </h2>
                    <div className="flex gap-5 overflow-hidden">
                        {[1, 2, 3, 4].map((i) => (
                            <div
                                key={i}
                                className="flex-shrink-0 w-[260px] bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse"
                            >
                                <div className="h-40 bg-gray-200" />
                                <div className="p-4 space-y-2">
                                    <div className="h-4 w-40 bg-gray-200 rounded" />
                                    <div className="h-3 w-20 bg-gray-200 rounded" />
                                    <div className="h-10 w-full bg-gray-200 rounded-lg mt-4" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    // TRẠNG THÁI LỖI (Error State)
    if (error) {
        return (
            <section className="py-14 bg-transparent">
                <div className="max-w-6xl mx-auto px-4 text-center">
                    <h2 className="text-xl md:text-2xl font-bold text-[#000000] mb-6 tracking-wide">
                        {"CHĂM SÓC SỨC KHỎE TOÀN DIỆN"}
                    </h2>
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-8 inline-block">
                        <svg className="w-10 h-10 text-red-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                        <p className="text-red-600 text-sm font-medium">{error}</p>
                        {/* Nút bấm tải lại trang */}
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

    // Empty state
    if (packages.length === 0) {
        return (
            <section className="py-14 bg-transparent">
                <div className="max-w-6xl mx-auto px-4 text-center">
                    <h2 className="text-xl md:text-2xl font-bold text-[#000000] mb-6 tracking-wide">
                        {"CHĂM SÓC SỨC KHỎE TOÀN DIỆN"}
                    </h2>
                    <p className="text-gray-500 text-sm">{"Hiện chưa có gói khám nào."}</p>
                </div>
            </section>
        );
    }

    return (
        <section className="py-14 bg-transparent">
            <div className="max-w-7xl mx-auto px-4">
                {/* Tiêu đề mục Gói khám - Modern Navy Style */}
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-extrabold text-[#0a3d2e] tracking-tight">
                        {"CHĂM SÓC SỨC KHỎE TOÀN DIỆN"}
                    </h2>
                    <div className="w-16 h-1.5 bg-[#0d6b52] mx-auto mt-4 rounded-full opacity-20"></div>
                </div>

                {/* Cards */}
                <div className="relative group">
                    <button
                        onClick={() => scroll("left")}
                        className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-500 hover:text-black hover:shadow-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <button
                        onClick={() => scroll("right")}
                        className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center text-gray-500 hover:text-black hover:shadow-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>

                    <div
                        ref={scrollRef}
                        className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory"
                        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                    >
                        {packages.map((pkg, index) => (
                            <div
                                key={pkg.id}
                                onClick={() => router.push(`/health-package/${pkg.id}`)}
                                className="flex-shrink-0 w-[260px] snap-start card-premium overflow-hidden cursor-pointer flex flex-col"
                            >
                                {/* PHẦN HÌNH ẢNH MINH HỌA GÓI KHÁM */}
                                <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative overflow-hidden">
                                    {pkg.featureImageUrl ? (
                                        /* Ảnh thật từ máy chủ */
                                        <img
                                            src={getImageUrl(pkg.featureImageUrl)}
                                            alt={pkg.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        /* Hiển thị Icon mặc định nếu không có ảnh */
                                        <>
                                            <div
                                                className="absolute inset-0 opacity-10"
                                                style={{ backgroundColor: getCardColor(index) }}
                                            />
                                            <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                                        </>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-4 flex flex-col flex-1">
                                    <h3 className="text-sm font-bold text-[#000000] mb-2 leading-tight line-clamp-2 min-h-[34px]">
                                        {pkg.name}
                                    </h3>
                                    {pkg.description && (
                                        <div className="flex items-start gap-1.5 text-xs text-gray-500 mb-1.5">
                                            <svg className="w-3.5 h-3.5 mt-0.5 text-black flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4zm3 1h6v4H7V5zm6 6H7v2h6v-2z" clipRule="evenodd" />
                                            </svg>
                                            <span className="line-clamp-2">{pkg.description}</span>
                                        </div>
                                    )}
                                    {pkg.price && (
                                        <div className="flex items-center gap-1.5 text-xs mb-4">
                                            <svg className="w-3.5 h-3.5 text-black" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                            </svg>
                                            <span className="text-black font-semibold">{formatPrice(pkg.price)}</span>
                                        </div>
                                    )}

                                    <button
                                        onClick={(e) => { e.stopPropagation(); router.push(`/health-package/${pkg.id}`); }}
                                        className="w-full btn-premium text-sm py-2.5 rounded-lg mt-auto"
                                    >
                                        {"Đặt khám ngay"}
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

