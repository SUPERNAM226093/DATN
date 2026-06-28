"use client";

import dynamic from "next/dynamic";

const NearestClinicContent = dynamic(
  () => import("./NearestClinicContent"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-600">Đang tải bản đồ...</p>
      </div>
    )
  }
);

/**
 * Đoạn code này dùng để gọi giao diện bản đồ ra,vì leaflet cần window trình duyệt mà server ko có
 */
export default function NearestClinicWrapper() {
  return <NearestClinicContent />;
}
