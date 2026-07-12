"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchDoctors, DoctorResponse } from "../lib/api";
import { HOSPITALS } from "../lib/hospitals";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PageHeader from "../components/PageHeader";

const AVATAR_COLORS = ["#1565c0", "#c62828", "#00695c", "#4527a0", "#e65100"];

export default function DoctorListPage() {
    const router = useRouter();
    const [doctors, setDoctors] = useState<DoctorResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedClinicId, setSelectedClinicId] = useState<number | null>(null);

    useEffect(() => {
        fetchDoctors()
            .then((d) => { setDoctors(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const filtered = doctors.filter((d) => {
        const matchSearch = d.fullName.toLowerCase().includes(search.toLowerCase()) ||
            (d.specializationName || "").toLowerCase().includes(search.toLowerCase());
        const matchClinic = selectedClinicId === null ? true : d.clinicId === selectedClinicId;
        return matchSearch && matchClinic;
    });

    return (
        <>
            <Navbar />
            <div className="min-h-screen bg-white pt-36">
                <div className="max-w-5xl mx-auto px-4 py-8">
                    <PageHeader
                        title="Đặt khám theo bác sĩ"
                        subtitle="Chọn bác sĩ phù hợp và đặt lịch khám trực tuyến"
                        backHref="/"
                        backLabel="Trang chủ"
                        icon={
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                        stats={[{ label: "bác sĩ", value: doctors.length }]}
                    />

                    {/* Filters & Search */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-10 flex flex-col md:flex-row gap-6 items-center justify-between">
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setSelectedClinicId(null)}
                                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${selectedClinicId === null
                                    ? "bg-black text-white shadow-lg"
                                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                    }`}
                            >
                                Tất cả
                            </button>
                            {HOSPITALS.map((hospital) => {
                                // Extract the district name for the button label to match UI exactly
                                const shortName = hospital.address.includes("Mỹ Đức") ? "Mỹ Đức" :
                                    hospital.address.includes("Hà Đông") ? "Hà Đông" :
                                        hospital.address.includes("Ba Đình") ? "Ba Đình" :
                                            hospital.address.includes("Cầu Giấy") ? "Cầu Giấy" :
                                                hospital.name.match(/(Med \d+)/)?.[1] || hospital.name.split(" - ")[0];
                                return (
                                    <button
                                        key={hospital.id}
                                        onClick={() => setSelectedClinicId(hospital.id)}
                                        className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${selectedClinicId === hospital.id
                                            ? "bg-black text-white shadow-lg"
                                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                            }`}
                                    >
                                        {shortName}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="relative w-full md:w-80">
                            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Tìm kiếm bác sĩ..."
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-black/10 transition-all"
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="bg-white rounded-2xl p-5 shadow-sm animate-pulse">
                                    <div className="flex gap-4">
                                        <div className="w-16 h-16 rounded-full bg-gray-200" />
                                        <div className="flex-1 space-y-2 pt-1">
                                            <div className="h-4 w-32 bg-gray-200 rounded" />
                                            <div className="h-3 w-24 bg-gray-200 rounded" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-16 text-center">
                            <svg className="w-16 h-16 text-gray-200 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <p className="text-gray-400 text-sm">Không tìm thấy bác sĩ phù hợp</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filtered.map((doc) => (
                                <div
                                    key={doc.id}
                                    onClick={() => router.push(`/doctor/${doc.id}`)}
                                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-lg hover:border-black/20 transition-all duration-300 cursor-pointer group hover:-translate-y-0.5"
                                >
                                    <div className="flex gap-4 items-center">
                                        <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 border-2 border-gray-100 group-hover:border-black transition-colors">
                                            {doc.featureImageUrl ? (
                                                <img src={`https://jean-skirt-term-des.trycloudflare.com${doc.featureImageUrl}`} alt={doc.fullName} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-white text-xl font-bold" style={{ backgroundColor: AVATAR_COLORS[doc.id % AVATAR_COLORS.length] }}>
                                                    {doc.fullName?.split(" ").pop()?.charAt(0) || "?"}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-bold text-black group-hover:text-black group-hover:underline transition-colors truncate">{doc.fullName}</h3>
                                            <p className="text-xs text-gray-500 mt-0.5 truncate">{doc.specializationName || "Đa khoa"}</p>
                                            <p className="text-xs text-gray-400 mt-0.5 truncate">
                                                {HOSPITALS.find(h => h.id === doc.clinicId)?.name || "Chưa phân bổ"}
                                            </p>
                                            {doc.experienceYears > 0 && (
                                                <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                                    ⭐ {doc.experienceYears} năm kinh nghiệm
                                                </span>
                                            )}
                                        </div>
                                        <svg className="w-4 h-4 text-gray-300 group-hover:text-black transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                    {doc.bio && <p className="text-xs text-gray-400 mt-3 line-clamp-2 leading-relaxed">{doc.bio}</p>}
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

