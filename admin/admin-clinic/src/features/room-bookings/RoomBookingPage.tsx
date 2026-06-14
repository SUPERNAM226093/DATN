import { type CSSProperties, useEffect, useState } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import { useAuth } from '../../store/AuthContext';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi2';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
interface RoomBooking {
    id: number;
    patientName: string;
    room: {
        id: number;
        roomCode: string;
        name: string;
    };
    bookedBy: {
        id: number;
        fullName: string;
    };
    checkInDate: string;
    checkOutDate: string;
    numberOfPatients: number;
    totalNights: number;
    estimatedFee: number;
    contactPhone: string;
    status: string;
    specialNotes: string;
    cancelReason?: string;
    rejectReason?: string;
}

interface UserOpt { id: number; fullName: string; email: string; }
interface RoomOpt { id: number; name: string; roomCode: string; pricePerNight: number; }

// Khởi tạo form trống
const emptyForm = {
    bookedById: '',
    roomId: '',
    patientName: '',
    contactPhone: '',
    checkInDate: '',
    checkOutDate: '',
    numberOfPatients: 1,
    status: 'PENDING',
    specialNotes: ''
};
const lockedFieldStyle: CSSProperties = {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
    cursor: 'not-allowed',
};

export default function RoomBookingPage() {
    // --- 1. KHỞI TẠO STATE ---
    const { isAdmin, isStaff } = useAuth();
    // Phân quyền: ADMIN + STAFF full CRUD đơn đặt phòng
    const canAdd = isAdmin || isStaff;
    const canDelete = isAdmin || isStaff;
    const [items, setItems] = useState<RoomBooking[]>([]); // Danh sách đơn đặt phòng
    const [patients, setPatients] = useState<UserOpt[]>([]); // Danh sách người dùng để gán làm người đặt
    const [rooms, setRooms] = useState<RoomOpt[]>([]); // Danh sách phòng hiện có
    const [loading, setLoading] = useState(true);


    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const isEditing = editingId !== null;

    /**
     * HÀM: fetchData
     * MÔ TẢ: Lấy toàn bộ dữ liệu đơn đặt phòng, danh sách người dùng và danh sách phòng.
     */
    const fetchData = async () => {
        setLoading(true);
        try {
            const endpoints = [
                api.get('/room-bookings/all'),
                api.get('/users'),
                api.get('/rooms/all')
            ];
            const results = await Promise.all(endpoints);
            setItems(results[0].data);
            setPatients(results[1].data);
            setRooms(results[2].data);
        } catch {
            toast.error('Không thể tải dữ liệu đặt phòng');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Mở Modal để Admin đặt phòng thủ công
    const openCreate = () => {
        setForm(emptyForm);
        setEditingId(null);
        setShowModal(true);
    };

    // Mở Modal để cập nhật thông tin nhận/trả phòng
    const openEdit = (b: RoomBooking) => {
        setForm({
            bookedById: String(b.bookedBy?.id || ''),
            roomId: String(b.room?.id || ''),
            patientName: b.patientName || '',
            contactPhone: b.contactPhone || '',
            checkInDate: b.checkInDate ? b.checkInDate.substring(0, 16) : '',
            checkOutDate: b.checkOutDate ? b.checkOutDate.substring(0, 16) : '',
            numberOfPatients: b.numberOfPatients || 1,
            status: b.status || 'PENDING',
            specialNotes: b.specialNotes || ''
        });
        setEditingId(b.id);
        setShowModal(true);
    };

    /**
     * HÀM: handleSubmit
     * MÔ TẢ: Xử lý lưu đơn đặt phòng (Tạo mới yêu cầu userId trong đường dẫn API).
     */
    const handleSubmit = async () => {
        try {
            const payload = {
                bookedById: form.bookedById ? Number(form.bookedById) : null,
                roomId: Number(form.roomId),
                patientName: form.patientName,
                contactPhone: form.contactPhone,
                checkInDate: form.checkInDate,
                checkOutDate: form.checkOutDate,
                numberOfPatients: Number(form.numberOfPatients),
                status: form.status,
                specialNotes: form.specialNotes
            };

            if (editingId) {
                await api.put(`/room-bookings/${editingId}`, payload);
                toast.success('Cập nhật trạng thái đơn đặt phòng thành công');
            } else {
                if (!payload.bookedById) {
                    toast.error('Vui lòng chọn Người thực hiện đặt phòng');
                    return;
                }
                // API tạo mới yêu cầu ID của user thực hiện đặt
                await api.post(`/room-bookings/${payload.bookedById}`, payload);
                toast.success('Đã tạo đơn đặt phòng mới');
            }
            setShowModal(false);
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi lưu dữ liệu');
        }
    };

    /**
     * HÀM: handleDelete
     * MÔ TẢ: Hủy/Xóa đơn đặt phòng khỏi hệ thống.
     */
    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/room-bookings/${deleteId}`);
            toast.success('Đã xóa đơn đặt phòng');
            setDeleteId(null);
            fetchData();
        } catch {
            toast.error('Xóa đơn đặt phòng thất bại');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    /**
     * HÀM: getStatusBadge
     * MÔ TẢ: Trả về class CSS tương ứng với trạng thái phòng để hiển thị màu sắc Badge.
     */
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING': return 'badge-warning';     // Chờ duyệt
            case 'CONFIRMED': return 'badge-info';      // Đã xác nhận
            case 'CHECKED_IN': return 'badge-success';  // Đã nhận phòng
            case 'CHECKED_OUT': return 'badge-primary'; // Đã trả phòng
            case 'CANCELLED': return 'badge-secondary'; // Đã hủy
            case 'REJECTED': return 'badge-danger';     // Bị từ chối
            default: return 'badge-secondary';
        }
    };

    if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

    return (
        <div className="page-container">
            {/* TIÊU ĐỀ TRANG */}
            <div className="page-header">
                <div>
                    <h1>{"Đơn đặt phòng"}</h1>
                    <p>{"Quản lý yêu cầu đặt phòng của bệnh nhân"}</p>
                </div>
                {canAdd && (
                    <button className="btn btn-primary" onClick={openCreate}>
                        <HiOutlinePlus /> Tạo đơn đặt phòng mới
                    </button>
                )}
            </div>

            {/* BẢNG DANH SÁCH ĐƠN ĐẶT PHÒNG */}
            <div className="card">
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>{"Bệnh nhân"}</th>
                                <th>{"Phòng"}</th>
                                <th>{"Nhận phòng"}</th>
                                <th>{"Trả phòng"}</th>
                                <th>Số người</th>
                                <th>{"Tổng tiền"}</th>
                                <th>{"Trạng thái"}</th>
                                <th>{"Thao tác"}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-8">{"Không có đơn đặt phòng nào"}</td>
                                </tr>
                            ) : (
                                items.map(b => (
                                    <tr key={b.id}>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{b.patientName}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Người đặt: {b.bookedBy?.fullName}</div>
                                            {b.contactPhone && <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>SĐT: {b.contactPhone}</div>}
                                        </td>
                                        <td>{b.room?.roomCode} - {b.room?.name}</td>
                                        <td>{new Date(b.checkInDate).toLocaleString('vi-VN')}</td>
                                        <td>{new Date(b.checkOutDate).toLocaleString('vi-VN')}</td>
                                        <td>{b.numberOfPatients} bệnh nhân</td>
                                        <td style={{ color: 'var(--primary)', fontWeight: 600 }}>
                                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(b.estimatedFee)}
                                        </td>
                                        <td>
                                            <span className={`badge ${getStatusBadge(b.status)}`}>{b.status}</span>
                                            {/* Hiển thị lý do nếu đơn bị hủy */}
                                            {b.status === 'CANCELLED' && b.cancelReason && (
                                                <div style={{ fontSize: '11px', color: 'var(--text-danger)', marginTop: '4px' }}>
                                                    Lý do: {b.cancelReason}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <div className="table-actions">
                                                <button className="btn-icon" onClick={() => openEdit(b)} title="Cập nhật"><HiOutlinePencil /></button>
                                                {canDelete && (
                                                    <button className="btn-icon" onClick={() => setDeleteId(b.id)} title="Xóa hồ sơ"><HiOutlineTrash /></button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL THÊM / SỬA ĐƠN ĐẶT PHÒNG */}
            {showModal && (
                <Modal title={editingId ? 'Cập nhật thông tin đặt phòng' : 'Đăng ký đặt phòng mới'} onClose={() => setShowModal(false)}>
                    <div className="form-group">
                        <label>Người thực hiện đặt (Hệ thống)</label>
                        <select name="bookedById" className="form-control" value={form.bookedById} onChange={handleChange} disabled={isEditing} style={isEditing ? lockedFieldStyle : undefined}>
                            <option value="">--- Chọn người dùng ---</option>
                            {patients.map(p => <option key={p.id} value={p.id}>{p.fullName} ({p.email})</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Họ tên Bệnh nhân</label>
                        <input name="patientName" type="text" className="form-control" value={form.patientName} onChange={handleChange} disabled={isEditing} style={isEditing ? lockedFieldStyle : undefined} placeholder="Tên bệnh nhân nội trú" />
                    </div>
                    <div className="form-group">
                        <label>Số điện thoại liên hệ</label>
                        <input name="contactPhone" type="text" className="form-control" value={form.contactPhone} onChange={handleChange} disabled={isEditing} style={isEditing ? lockedFieldStyle : undefined} placeholder="Dùng để liên hệ khi nhận phòng" />
                    </div>
                    <div className="form-group">
                        <label>Chọn Phòng</label>
                        <select name="roomId" className="form-control" value={form.roomId} onChange={handleChange} disabled={isEditing} style={isEditing ? lockedFieldStyle : undefined}>
                            <option value="">--- Chọn phòng khám/nội trú ---</option>
                            {rooms.map(r => <option key={r.id} value={r.id}>{r.roomCode} - {r.name}</option>)}
                        </select>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Dự kiến Nhận phòng</label>
                            <input name="checkInDate" type="datetime-local" className="form-control" value={form.checkInDate} onChange={handleChange} disabled={isEditing} style={isEditing ? lockedFieldStyle : undefined} />
                        </div>
                        <div className="form-group">
                            <label>Dự kiến Trả phòng</label>
                            <input name="checkOutDate" type="datetime-local" className="form-control" value={form.checkOutDate} onChange={handleChange} disabled={isEditing} style={isEditing ? lockedFieldStyle : undefined} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Số lượng bệnh nhân</label>
                            <input name="numberOfPatients" type="number" min="1" className="form-control" value={form.numberOfPatients} onChange={handleChange} disabled={isEditing} style={isEditing ? lockedFieldStyle : undefined} />
                        </div>
                        <div className="form-group">
                            <label>Trạng thái đặt phòng</label>
                            <select name="status" className="form-control" value={form.status} onChange={handleChange}>
                                <option value="PENDING">Chờ duyệt (PENDING)</option>
                                <option value="CONFIRMED">Xác nhận (CONFIRMED)</option>
                                <option value="CHECKED_IN">Đã nhận phòng (CHECKED_IN)</option>
                                <option value="CHECKED_OUT">Đã trả phòng (CHECKED_OUT)</option>
                                <option value="CANCELLED">Hủy bỏ (CANCELLED)</option>
                                <option value="REJECTED">Từ chối (REJECTED)</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label>Yêu cầu đặc biệt / Ghi chú</label>
                        <textarea name="specialNotes" className="form-control" value={form.specialNotes} onChange={handleChange} placeholder="Ví dụ: Bệnh nhân cần giường đẩy, phòng yên tĩnh..." />
                    </div>
                    <div className="form-actions">
                        <button className="btn btn-ghost" onClick={() => setShowModal(false)}>{"Hủy"}</button>
                        <button className="btn btn-primary" onClick={handleSubmit}>{editingId ? 'Cập nhật đơn' : 'Lưu thông tin'}</button>
                    </div>
                </Modal>
            )}

            {/* DIALOG XÁC NHẬN XÓA */}
            {deleteId && (
                <ConfirmDialog
                    title="Xóa hồ sơ đặt phòng"
                    message="Bạn có chắc chắn muốn xóa đơn đặt phòng này không? Thao tác này sẽ gỡ bỏ dữ liệu vĩnh viễn."
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteId(null)}
                />
            )}
        </div>
    );
}
