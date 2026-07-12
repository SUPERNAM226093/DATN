"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchHealthPackages, HealthPackageResponse } from "../lib/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageHeader from "../components/PageHeader";

function formatPrice(price: number) {
    return new Intl.NumberFormat("vi-VN").format(price) + "đ";
}

export default function HealthPackageListPage() {
    const router = useRouter();
    const [items, setItems] = useState<HealthPackageResponse[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHealthPackages()
            .then((d) => { setItems(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    return (
        <>
            <Navbar />
            <div className="min-h-screen bg-gradient-to-b from-[#f0f8ff] to-white pt-36">
                <div className="max-w-5xl mx-auto px-4 py-8">
                    <PageHeader
                        title="Gói xét nghiệm & kiểm tra sức khỏe"
                        subtitle="Các gói kiểm tra sức khỏe toàn diện, phù hợp mọi nhu cầu"
                        backHref="/"
                        backLabel="Trang chủ"
                        icon={
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        }
                        stats={[{ label: "gói khám", value: items.length }]}
                    />

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="bg-white rounded-2xl shadow-sm animate-pulse">
                                    <div className="h-40 bg-gray-200 rounded-t-2xl" />
                                    <div className="p-5 space-y-2">
                                        <div className="h-5 w-40 bg-gray-200 rounded" />
                                        <div className="h-4 w-full bg-gray-200 rounded" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : items.length === 0 ? (
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-16 text-center">
                            <p className="text-gray-400 text-sm">Chưa có gói khám nào</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {items.map((pkg) => (
                                <div
                                    key={pkg.id}
                                    onClick={() => router.push(`/health-package/${pkg.id}`)}
                                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:border-[#7C6EE6]/20 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group"
                                >
                                    <div className="h-40 bg-gradient-to-br from-[#F3F0FF] to-[#f9f8ff] flex items-center justify-center overflow-hidden">
                                        {pkg.featureImageUrl ? (
                                            <img src={`http://localhost:8081${pkg.featureImageUrl}`} alt={pkg.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <svg className="w-16 h-16 text-[#7C6EE6]/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="p-5">
                                        <h3 className="font-bold text-[#392E7B] group-hover:text-[#7C6EE6] transition-colors mb-1">{pkg.name}</h3>
                                        {pkg.description && <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mb-3">{pkg.description}</p>}
                                        <div className="flex items-center justify-between">
                                            <span className="text-lg font-bold text-[#f26522]">{formatPrice(pkg.price)}</span>
                                            <span className="text-xs text-[#7C6EE6] font-semibold bg-[#F3F0FF] px-3 py-1 rounded-full">Xem chi tiết →</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </>
    );
}

