import { type CSSProperties, useEffect, useState } from "react";
import { toast } from "react-toastify";

import { HiOutlinePencil, HiOutlineTrash, HiOutlineVideoCamera, HiOutlineArrowPath } from "react-icons/hi2";
import api from "../../services/api";
import Modal from "../../components/ui/Modal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { useAuth } from "../../store/AuthContext";

interface OnlineConsultation {
    id: number;
    patientId: number;
    patientName: string;
    doctorId: number;
    doctorName: string;
    specializationName: string | null;
    serviceName: string | null;
    phoneNumber: string;
    amount: number;
    paymentStatus: "PENDING" | "PAID" | "CANCELLED" | "COMPLETED";
    meetingLink: string | null;
    consultationDate: string | null;
    consultationTime: string | null;
    expiredAt: string;
    createdAt: string;
}

// Màu sắc đại diện cho từng trạng thái thanh toán/cuộc hẹn
const statusColors: Record<string, string> = {
    PENDING: "warning", // Đang chờ quét mã VietQR
    PAID: "success",    // Đã nhận được tiền
    CANCELLED: "danger",// Đã hủy đơn
    COMPLETED: "info", // Hoàn thành
};
const lockedFieldStyle: CSSProperties = {
    backgroundColor: "#f3f4f6",
    color: "#6b7280",
    cursor: "not-allowed",
};

export default function OnlineConsultationPage() {

    const [items, setItems] = useState<OnlineConsultation[]>([]); // Danh sách đơn tư vấn
    const [loading, setLoading] = useState(true);
    const [filterStatus] = useState("ALL"); // Bộ lọc trạng thái

    const [editModal, setEditModal] = useState<OnlineConsultation | null>(null); // Đơn đang được chỉnh sửa
    const [approving, setApproving] = useState(false); // Trạng thái lưu dữ liệu

    const [doctors, setDoctors] = useState<any[]>([]); // Danh sách bác sĩ để gán lại (nếu cần)
    const [specializations, setSpecializations] = useState<any[]>([]);

    // Dữ liệu form chỉnh sửa
    const [editForm, setEditForm] = useState({
        doctorId: "",
        specializationId: "",
        phoneNumber: "",
        amount: 0,
        paymentStatus: "",
        meetingLink: "",
        consultationDate: "",
        consultationTime: ""
    });

    const [deleteId, setDeleteId] = useState<number | null>(null);

    // Phân quyền: DOCTOR và STAFF chỉ được Xem và Sửa, không được Thêm/Xóa
    const { isAdmin } = useAuth();
    const canDelete = isAdmin;
    const fetchData = async () => {
        setLoading(true);
        try {
            const query = filterStatus !== "ALL" ? `?status=${filterStatus}` : "";
            const res = await api.get(`/online-consultations${query}`);
            setItems(res.data);
        } catch {
            toast.error("Không thể tải danh sách tư vấn trực tuyến");
        } finally {
            setLoading(false);
        }
    };

    const fetchOptions = async () => {
        try {
            const [docsRes, specsRes] = await Promise.all([
                api.get("/doctors"),
                api.get("/specializations")
            ]);
            setDoctors(docsRes.data);
            setSpecializations(specsRes.data);
        } catch (err) {
            console.error("Lỗi khi tải danh mục hỗ trợ", err);
        }
    };

    // Load lại dữ liệu mỗi khi bộ lọc trạng thái thay đổi
    useEffect(() => {
        fetchData();
        fetchOptions();
    }, [filterStatus]);


    const handleUpdate = async () => {
        if (!editModal) return;
        setApproving(true);
        try {
            // Gửi dữ liệu cập nhật lên Backend
            await api.put(`/online-consultations/${editModal.id}`, {
                doctorId: Number(editForm.doctorId),
                specializationId: editForm.specializationId ? Number(editForm.specializationId) : null,
                phoneNumber: editForm.phoneNumber,
                amount: Number(editForm.amount),
                paymentStatus: editForm.paymentStatus,
                meetingLink: editForm.meetingLink,
                consultationDate: editForm.consultationDate,
                consultationTime: editForm.consultationTime
            });
            toast.success("Cập nhật thông tin đơn tư vấn thành công!");
            fetchData();
            setEditModal(null);
        } catch (err: any) {
            toast.error(err.displayMessage || "Cập nhật thất bại, vui lòng kiểm tra lại");
        } finally {
            setApproving(false);
        }
    };

    /**
     * HÀM: handleDelete
     * MÔ TẢ: Xóa đơn tư vấn khỏi hệ thống.
     */
    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/online-consultations/${deleteId}`);
            toast.success("Đã xóa đơn đăng ký tư vấn");
            setDeleteId(null);
            fetchData();
        } catch {
            toast.error("Xóa thất bại");
        }
    };

    if (loading && items.length === 0) return <div className="loading-spinner"><div className="spinner" /></div>;

    return (
        <div className="page-container">
            {/* TIÊU ĐỀ TRANG VÀ BỘ LỌC */}
            <div className="page-header">
                <div>
                    <h1>🎥 {"Tư vấn Online"}</h1>
                    <p>{"Quản lý yêu cầu tư vấn Video trực tuyến"}</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-secondary" onClick={fetchData} title="Làm mới dữ liệu">
                        <HiOutlineArrowPath className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* BẢNG DANH SÁCH ĐĂNG KÝ TƯ VẤN */}
            <div className="table-container">
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Mã đơn</th>
                                <th>{"Bệnh nhân"}</th>
                                <th>{"Bác sĩ"}</th>
                                <th>{"Lịch hẹn"}</th>
                                <th>{"Số tiền"}</th>
                                <th>{"Trạng thái"}</th>
                                <th>{"Thao tác"}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((c) => {
                                // Kiểm tra xem đơn PENDING đã quá hạn thanh toán chưa
                                const isExpired = new Date(c.expiredAt) < new Date() && c.paymentStatus === "PENDING";
                                return (
                                    <tr key={c.id} className={isExpired ? "opacity-60" : ""}>
                                        <td><span className="text-xs font-mono text-gray-400">#{c.id}</span></td>
                                        <td>
                                            <div className="font-medium text-primary">{c.patientName}</div>
                                            <div className="text-xs text-secondary">{c.phoneNumber}</div>
                                        </td>
                                        <td>
                                            <div className="font-medium">{c.doctorName}</div>
                                            <div className="text-xs text-secondary">{c.specializationName || "—"}</div>
                                        </td>
                                        <td>
                                            {c.consultationDate ? (
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-blue-700">{c.consultationTime}</span>
                                                    <span className="text-xs text-gray-500">{c.consultationDate}</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 italic text-xs">Chưa xác định</span>
                                            )}
                                        </td>
                                        <td className="font-bold text-orange-600">
                                            {new Intl.NumberFormat("vi-VN").format(c.amount)}đ
                                        </td>
                                        <td>
                                            <span className={`badge badge-${statusColors[c.paymentStatus]}`}>
                                                {c.paymentStatus === "PENDING" && isExpired ? "HẾT HẠN" : c.paymentStatus}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="table-actions">
                                                {/* Nút Sửa: Dùng để xác nhận thanh toán thủ công hoặc dán link phòng họp */}
                                                <button
                                                    className="btn-icon text-orange-500"
                                                    title="Chỉnh sửa / Duyệt đơn"
                                                    onClick={() => {
                                                        setEditModal(c);
                                                        setEditForm({
                                                            doctorId: String(c.doctorId),
                                                            specializationId: c.specializationName && specializations.length > 0
                                                                ? String(specializations.find(s => s.name === c.specializationName)?.id || "")
                                                                : "",
                                                            phoneNumber: c.phoneNumber,
                                                            amount: c.amount,
                                                            paymentStatus: c.paymentStatus,
                                                            meetingLink: c.meetingLink || "",
                                                            consultationDate: c.consultationDate || "",
                                                            consultationTime: c.consultationTime || ""
                                                        });
                                                    }}
                                                >
                                                    <HiOutlinePencil />
                                                </button>
                                                {/* Nếu đã thanh toán và có link, hiện nút vào phòng họp nhanh */}
                                                {c.paymentStatus === "PAID" && c.meetingLink && (
                                                    <a
                                                        href={c.meetingLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="btn-icon text-green-600"
                                                        title="Truy cập phòng tư vấn"
                                                    >
                                                        <HiOutlineVideoCamera />
                                                    </a>
                                                )}
                                                {canDelete && <button className="btn-icon text-red-500" title="Xóa" onClick={() => setDeleteId(c.id)}><HiOutlineTrash /></button>}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {items.length === 0 && <tr><td colSpan={7} className="empty-state">Không có yêu cầu tư vấn nào cần xử lý</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL CHỈNH SỬA VÀ DUYỆT ĐƠN */}
            {editModal && (
                <Modal title="Xử lý hồ sơ tư vấn trực tuyến" onClose={() => setEditModal(null)}>
                    <div className="space-y-4">
                        <div className="form-group">
                            <label className="block text-sm font-semibold mb-1">Bác sĩ phụ trách tư vấn</label>
                            <select
                                className="form-control"
                                value={editForm.doctorId}
                                onChange={(e) => setEditForm({ ...editForm, doctorId: e.target.value })}
                                disabled
                                style={lockedFieldStyle}
                            >
                                {doctors.map(d => (
                                    <option key={d.id} value={d.id}>{d.fullName}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="block text-sm font-semibold mb-1">Số điện thoại liên hệ</label>
                            <input
                                type="text"
                                className="form-control"
                                value={editForm.phoneNumber}
                                onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                                disabled
                                style={lockedFieldStyle}
                            />
                        </div>

                        {/* Thiết lập thời gian tư vấn cụ thể */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="form-group">
                                <label className="block text-sm font-semibold mb-1">Ngày tư vấn</label>
                                <input
                                    type="date"
                                    className="form-control"
                                    value={editForm.consultationDate}
                                    onChange={(e) => setEditForm({ ...editForm, consultationDate: e.target.value })}
                                    disabled
                                    style={lockedFieldStyle}
                                />
                            </div>
                            <div className="form-group">
                                <label className="block text-sm font-semibold mb-1">Khung giờ</label>
                                <select
                                    className="form-control"
                                    value={editForm.consultationTime}
                                    onChange={(e) => setEditForm({ ...editForm, consultationTime: e.target.value })}
                                    disabled
                                    style={lockedFieldStyle}
                                >
                                    <option value="">-- Chọn giờ --</option>
                                    <option value="18:00">18:00</option>
                                    <option value="18:30">18:30</option>
                                    <option value="19:00">19:00</option>
                                    <option value="19:30">19:30</option>
                                    <option value="20:00">20:00</option>
                                </select>
                            </div>
                        </div>

                        {/* QUAN TRỌNG: Duyệt trạng thái thanh toán */}
                        <div className="form-group">
                            <label className="block text-sm font-semibold mb-1">Trạng thái (Duyệt PAID sau khi kiểm tra tài khoản)</label>
                            <select
                                className="form-control"
                                value={editForm.paymentStatus}
                                onChange={(e) => setEditForm({ ...editForm, paymentStatus: e.target.value })}
                            >
                                <option value="PENDING">Chờ quét mã (PENDING)</option>
                                <option value="PAID">Đã nhận thanh toán (PAID)</option>
                                <option value="CANCELLED">Hủy đơn (CANCELLED)</option>
                                <option value="COMPLETED">Hoàn thành (COMPLETED)</option>
                            </select>
                        </div>

                        {/* Gửi Meeting Link cho bệnh nhân */}
                        <div className="form-group">
                            <label className="block text-sm font-semibold mb-1">Link phòng họp Video (Meet/Zoom/Zalo)</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Dán đường dẫn truy cập phòng họp tại đây..."
                                value={editForm.meetingLink}
                                onChange={(e) => setEditForm({ ...editForm, meetingLink: e.target.value })}
                            />
                            <p className="text-xs text-gray-500 mt-1">Lưu ý: Bệnh nhân chỉ thấy nút "Vào phòng họp" khi trạng thái là PAID.</p>
                        </div>

                        <div className="form-actions pt-4">
                            <button className="btn btn-ghost" onClick={() => setEditModal(null)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleUpdate} disabled={approving}>
                                {approving ? "Đang xử lý..." : "Cập nhật đơn tư vấn"}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* DIALOG XÁC NHẬN XÓA */}
            {deleteId && (
                <ConfirmDialog
                    title="Xóa đơn tư vấn"
                    message="Bạn có chắc chắn muốn xóa hồ sơ đăng ký này không? Mọi dữ liệu liên quan sẽ bị mất."
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteId(null)}
                />
            )}
        </div>
    );
}
