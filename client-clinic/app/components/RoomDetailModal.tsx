"use client";

/**
 * FILE: RoomDetailModal.tsx
 * MÔ TẢ: Modal hiển thị thông tin chi tiết về một phòng/chỗ ở nội trú.
 * Hiển thị hình ảnh, mô tả, bảng chi tiết các loại phí và nút điều hướng tới bước đặt phòng.
 */

import { RoomResponse } from "../lib/api";

interface Props {
    room: RoomResponse; // Dữ liệu của phòng đang xem
    onClose: () => void; // Hàm để đóng Modal
    onBook: () => void; // Hàm để chuyển sang bước đặt phòng
}

export default function RoomDetailModal({ room, onClose, onBook }: Props) {


    /**
     * HÀM 1: formatPrice
     * MÔ TẢ: Định dạng số tiền thành chuỗi tiền tệ VNĐ.
     */
    const formatPrice = (price: number) => {
        return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
    };

    // --- CÁC LOẠI PHÍ DỰ KIẾN (Giả định nếu Backend chưa trả về) ---
    const cleaningFee = room.cleaningFee || 30000; // Phí vệ sinh
    const serviceFee = room.serviceFee || 20000;   // Phí dịch vụ
    const totalAvg = room.pricePerNight + cleaningFee + serviceFee; // Tổng phí trung bình mỗi đêm

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl relative">
                {/* NÚT ĐÓNG (Close Button) */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full transition-all"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                {/* HÌNH ẢNH MINH HỌA PHÒNG */}
                <div className="relative h-64">
                    {room.images && room.images.length > 0 ? (
                        <img
                            src={`http://139.59.109.214:8081/${room.images[0]}`}
                            alt={room.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                            <span className="text-4xl font-bold text-gray-300">{room.roomCode}</span>
                        </div>
                    )}
                    {/* Nhãn Tên phòng đè lên ảnh */}
                    <div className="absolute top-4 left-4">
                        <span className="bg-white/90 backdrop-blur-md text-[#000000] px-4 py-1.5 rounded-xl text-xs font-black shadow-lg">
                            {room.name.toUpperCase()}
                        </span>
                    </div>
                </div>

                <div className="p-8">
                    {/* TIÊU ĐỀ VÀ TRẠNG THÁI TRỐNG/HẾT PHÒNG */}
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-black text-[#000000]">{room.name}</h2>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black ${room.isAvailable ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            {room.isAvailable ? 'CÒN PHÒNG' : 'HẾT PHÒNG'}
                        </span>
                    </div>

                    {/* ĐOẠN MÔ TẢ CHI TIẾT */}
                    <p className="text-gray-500 text-sm leading-relaxed mb-8">
                        {room.description || "Phòng nghỉ tiện nghi, thoáng mát dành cho bệnh nhân nội trú. Hệ thống theo dõi y tế và hỗ trợ 24/7."}
                    </p>

                    {/* BẢNG CHI TIẾT CÁC LOẠI PHÍ (Price Breakdown) */}
                    <div className="space-y-3 mb-8">
                        <div className="flex justify-between text-sm border-b border-gray-50 pb-2">
                            <span className="text-gray-400">Phí mỗi đêm:</span>
                            <span className="font-bold text-[#0052CC]">{formatPrice(room.pricePerNight)}</span>
                        </div>
                        <div className="flex justify-between text-sm border-b border-gray-50 pb-2">
                            <span className="text-gray-400">Phí vệ sinh:</span>
                            <span className="font-bold text-gray-600">{formatPrice(cleaningFee)}</span>
                        </div>
                        <div className="flex justify-between text-sm border-b border-gray-50 pb-2">
                            <span className="text-gray-400">Phí dịch vụ:</span>
                            <span className="font-bold text-gray-600">{formatPrice(serviceFee)}</span>
                        </div>
                        {/* TỔNG PHÍ TẠM TÍNH */}
                        <div className="flex justify-between text-sm pt-2">
                            <span className="text-[#000000] font-bold">Trung bình/đêm:</span>
                            <span className="font-black text-[#0052CC]">{formatPrice(totalAvg)}</span>
                        </div>
                    </div>

                    {/* NÚT BẤM ĐẶT PHÒNG */}
                    <button
                        onClick={onBook}
                        disabled={!room.isAvailable}
                        className="w-full bg-[#0052CC] hover:bg-[#e05611] text-white font-black py-4 rounded-2xl shadow-xl shadow-[#0052CC]/20 transition-all disabled:opacity-50 disabled:grayscale"
                    >
                        Đặt phòng này ngay
                    </button>
                </div>
            </div>
        </div>
    );
}
