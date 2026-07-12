"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    fetchSpecializationById,
    fetchDoctorsBySpecialization,
    SpecializationResponse,
    DoctorResponse,
} from "../../lib/api";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";


const AVATAR_COLORS = ["#1565c0", "#c62828", "#00695c", "#4527a0", "#e65100"];

export default function SpecializationDetailPage() {

    const params = useParams();
    const router = useRouter();
    const specId = Number(params.id);

    const [specialization, setSpecialization] = useState<SpecializationResponse | null>(null);
    const [doctors, setDoctors] = useState<DoctorResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!specId) return;
        fetchSpecializationById(specId)
            .then(async (spec) => {
                setSpecialization(spec);
                const docs = await fetchDoctorsBySpecialization(spec.name);
                setDoctors(docs);
                setLoading(false);
            })
            .catch(() => {
                setError("Không thể tải thông tin chuyên khoa");
                setLoading(false);
            });
    }, [specId]);

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="min-h-screen bg-white pt-36">
                    <div className="max-w-5xl mx-auto px-4 py-12">
                        <div className="animate-pulse space-y-6">
                            <div className="bg-white rounded-3xl p-8 shadow-sm">
                                <div className="h-8 w-64 bg-gray-200 rounded mb-4" />
                                <div className="h-4 w-full bg-gray-200 rounded mb-2" />
                                <div className="h-4 w-3/4 bg-gray-200 rounded" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="bg-white rounded-2xl p-6 shadow-sm">
                                        <div className="flex gap-4">
                                            <div className="w-16 h-16 rounded-full bg-gray-200" />
                                            <div className="flex-1 space-y-2">
                                                <div className="h-5 w-32 bg-gray-200 rounded" />
                                                <div className="h-4 w-24 bg-gray-200 rounded" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <Footer />
            </>
        );
    }

    if (error || !specialization) {
        return (
            <>
                <Navbar />
                <div className="min-h-screen bg-white flex items-center justify-center pt-36">
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
            <div className="min-h-screen bg-white pt-36">
                <div className="max-w-5xl mx-auto px-4 py-8">
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

                    {/* Specialization Header Card */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                        <div className="bg-gradient-to-r from-[var(--green-mid)] to-[var(--green-dark)] px-8 py-10 relative overflow-hidden">
                            <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full" />
                            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/5 rounded-full" />

                            <div className="relative z-10 flex items-center gap-6">
                                {/* Icon */}
                                <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20 flex-shrink-0">
                                    {specialization.featureImageUrl ? (
                                        <img
                                            src={`https://jean-skirt-term-des.trycloudflare.com${specialization.featureImageUrl}`}
                                            alt={specialization.name}
                                            className="w-12 h-12 object-contain"
                                        />
                                    ) : (
                                        <svg className="w-10 h-10 text-white" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M8 2v6H2v4h6v6h4v-6h6V8h-6V2H8z" />
                                        </svg>
                                    )}
                                </div>

                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                                        {specialization.name}
                                    </h1>
                                    {specialization.description && (
                                        <p className="text-white/80 text-sm leading-relaxed max-w-xl">
                                            {specialization.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="px-8 py-5 bg-white flex items-center gap-8 border-t border-gray-100">
                            <div className="flex items-center gap-2 text-sm">
                                <svg className="w-5 h-5 text-[var(--green-dark)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="text-[var(--green-dark)] font-semibold">{doctors.length}</span>
                                <span className="text-gray-500">{"bác sĩ"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Section Title */}
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-[var(--green-dark)] flex items-center gap-2">
                            <svg className="w-5 h-5 text-[var(--green-mid)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {"Bác sĩ chuyên khoa"} {specialization.name}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            {"Danh sách bác sĩ thuộc chuyên khoa này"}
                        </p>
                    </div>

                    {/* Doctors Grid */}
                    {doctors.length === 0 ? (
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 text-center">
                            <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <p className="text-gray-400 text-sm">{"Hiện chưa có bác sĩ nào thuộc chuyên khoa này"}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {doctors.map((doc) => (
                                <div
                                    key={doc.id}
                                    onClick={() => router.push(`/doctor/${doc.id}`)}
                                    className="card-premium p-5 cursor-pointer group"
                                >
                                    <div className="flex gap-4 items-center">
                                        {/* Avatar */}
                                        <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 border-2 border-gray-100 group-hover:border-[var(--green-mid)] transition-colors">
                                            {doc.featureImageUrl ? (
                                                <img
                                                    src={`https://jean-skirt-term-des.trycloudflare.com${doc.featureImageUrl}`}
                                                    alt={doc.fullName}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div
                                                    className="w-full h-full flex items-center justify-center text-white text-xl font-bold"
                                                    style={{ backgroundColor: AVATAR_COLORS[doc.id % AVATAR_COLORS.length] }}
                                                >
                                                    {doc.fullName?.split(" ").pop()?.charAt(0) || "?"}
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-bold text-[var(--green-dark)] group-hover:text-[var(--green-mid)] group-hover:underline transition-colors truncate">
                                                {doc.fullName}
                                            </h3>
                                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                                                {doc.specializationName || "Đa khoa"}
                                            </p>
                                            {doc.experienceYears > 0 && (
                                                <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                                                    ⭐ {doc.experienceYears} {"năm KN"}
                                                </span>
                                            )}
                                        </div>

                                        {/* Arrow */}
                                        <svg className="w-4 h-4 text-gray-300 group-hover:text-[var(--green-mid)] transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>

                                    {/* Bio preview */}
                                    {doc.bio && (
                                        <p className="text-xs text-gray-400 mt-3 line-clamp-2 leading-relaxed">
                                            {doc.bio}
                                        </p>
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
