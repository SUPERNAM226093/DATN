"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchSpecializations, SpecializationResponse } from "../lib/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageHeader from "../components/PageHeader";

export default function SpecializationListPage() {
    const router = useRouter();
    const [items, setItems] = useState<SpecializationResponse[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSpecializations()
            .then((d) => { setItems(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    return (
        <>
            <Navbar />
            <div className="min-h-screen bg-gradient-to-b from-[#f0f8ff] to-white pt-36">
                <div className="max-w-5xl mx-auto px-4 py-8">
                    <PageHeader
                        title="Đặt khám theo chuyên khoa"
                        subtitle="Chọn chuyên khoa phù hợp với triệu chứng của bạn"
                        backHref="/"
                        backLabel="Trang chủ"
                        icon={
                            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M7 2a1 1 0 00-.707 1.707L7 4.414v3.758a1 1 0 01-.293.707l-4 4C.817 14.769 2.156 18 4.828 18h10.343c2.673 0 4.012-3.231 2.122-5.121l-4-4A1 1 0 0113 8.172V4.414l.707-.707A1 1 0 0013 2H7zm2 6.172V4h2v4.172a3 3 0 00.879 2.12l1.027 1.028a4 4 0 00-2.171.102l-.47.156a4 4 0 01-2.53 0l-.563-.187 1.116-1.116A3 3 0 009 8.172z" clipRule="evenodd" />
                            </svg>
                        }
                        stats={[{ label: "chuyên khoa", value: items.length }]}
                    />

                    {loading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                <div key={i} className="bg-white rounded-2xl p-6 shadow-sm animate-pulse">
                                    <div className="w-12 h-12 rounded-xl bg-gray-200 mx-auto mb-3" />
                                    <div className="h-4 w-24 bg-gray-200 rounded mx-auto" />
                                </div>
                            ))}
                        </div>
                    ) : items.length === 0 ? (
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-16 text-center">
                            <p className="text-gray-400 text-sm">Chưa có chuyên khoa nào</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {items.map((spec) => (
                                <div
                                    key={spec.id}
                                    onClick={() => router.push(`/specialization/${spec.id}`)}
                                    className="card-premium p-6 cursor-pointer group text-center"
                                >
                                    <div className="w-14 h-14 rounded-2xl bg-[#E6EFFF] flex items-center justify-center mx-auto mb-3 group-hover:bg-[#0065FF] transition-colors">
                                        {spec.featureImageUrl ? (
                                            <img src={`http://localhost:8081${spec.featureImageUrl}`} alt={spec.name} className="w-8 h-8 object-contain group-hover:brightness-[100] group-hover:invert" />
                                        ) : (
                                            <svg className="w-7 h-7 text-[#0065FF] group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M7 2a1 1 0 00-.707 1.707L7 4.414v3.758a1 1 0 01-.293.707l-4 4C.817 14.769 2.156 18 4.828 18h10.343c2.673 0 4.012-3.231 2.122-5.121l-4-4A1 1 0 0113 8.172V4.414l.707-.707A1 1 0 0013 2H7zm2 6.172V4h2v4.172a3 3 0 00.879 2.12l1.027 1.028a4 4 0 00-2.171.102l-.47.156a4 4 0 01-2.53 0l-.563-.187 1.116-1.116A3 3 0 009 8.172z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </div>
                                    <h3 className="text-sm font-bold text-[#000000] group-hover:text-[#0065FF] transition-colors leading-tight">{spec.name}</h3>
                                    {spec.description && (
                                        <p className="text-xs text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">{spec.description}</p>
                                    )}
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

