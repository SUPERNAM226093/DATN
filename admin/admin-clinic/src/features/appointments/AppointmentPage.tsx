import { type CSSProperties, useEffect, useState } from 'react';
import api from '../../services/api';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { toast } from 'react-toastify';

import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi2';
import { useAuth } from '../../store/AuthContext';
import { t } from '../../utils/i18n';

interface Appointment { id: number; patientId: number; patientName: string; doctorId: number; doctorName: string; serviceName: string; appointmentDate: string; appointmentTime: string; status: string; note: string; createdAt: string; }
interface DoctorOpt { id: number; fullName: string; }
interface UserOpt { id: number; fullName: string; email: string; }

const emptyForm = { patientId: '', doctorId: '', serviceId: '', scheduleId: '', appointmentDate: '', appointmentTime: '', status: 'PENDING', note: '' };

const statusColors: Record<string, string> = { PENDING: 'warning', CONFIRMED: 'info', COMPLETED: 'success', CANCELLED: 'danger' };
const lockedFieldStyle: CSSProperties = {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
    cursor: 'not-allowed',
};

export default function AppointmentPage() {
    const [items, setItems] = useState<Appointment[]>([]); // Danh sách lịch hẹn
    const [doctors, setDoctors] = useState<DoctorOpt[]>([]); // Danh sách bác sĩ (để chọn khi đặt lịch)
    const [patients, setPatients] = useState<UserOpt[]>([]); // Danh sách bệnh nhân
    const [loading, setLoading] = useState(true); // Trạng thái tải dữ liệu
    const [showModal, setShowModal] = useState(false); // Ẩn/hiện Modal thêm/sửa
    const [editingId, setEditingId] = useState<number | null>(null); // ID của lịch hẹn đang chỉnh sửa

    const [form, setForm] = useState(emptyForm); // Dữ liệu form
    const [deleteId, setDeleteId] = useState<number | null>(null); // ID của lịch hẹn đang chờ xóa
    const { isDoctor, isAdmin } = useAuth(); // Lấy thông tin quyền hạn của người dùng đang đăng nhập
    // Phân quyền cứng: chỉ Admin được Thêm/Xóa lịch hẹn; Doctor & Staff chỉ Xem/Sửa
    const canAdd = isAdmin;
    const canDelete = isAdmin;
    const isEditing = editingId !== null;
    const fetchData = async () => {
        try {
            const endpoints: Promise<any>[] = [
                api.get('/appointments'),
                api.get('/doctors'),
                api.get('/services'),
                api.get('/users')
            ];

            const results = await Promise.all(endpoints);
            setItems(results[0].data);
            setDoctors(results[1].data);
            setPatients(results[3].data);
        } catch (err) {
            console.error(err);
            toast.error('Không thể tải dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    // Load dữ liệu khi component được mount
    useEffect(() => { fetchData(); }, []);

    // Mở modal để tạo mới lịch hẹn
    const openCreate = () => {
        setForm({ ...emptyForm, patientId: '' });
        setEditingId(null);
        setShowModal(true);
    };

    // Mở modal để chỉnh sửa lịch hẹn hiện có
    const openEdit = (a: Appointment) => {
        setForm({ patientId: String(a.patientId), doctorId: String(a.doctorId), serviceId: '', scheduleId: '', appointmentDate: a.appointmentDate || '', appointmentTime: a.appointmentTime || '', status: a.status || 'PENDING', note: a.note || '' });
        setEditingId(a.id); setShowModal(true);
    };

    /**
     * HÀM: handleSubmit
     * MÔ TẢ: Xử lý Gửi dữ liệu (Thêm mới hoặc Cập nhật) lên Server.
     */
    const handleSubmit = async () => {
        try {
            const payload = { patientId: Number(form.patientId), doctorId: Number(form.doctorId), serviceId: form.serviceId ? Number(form.serviceId) : undefined, scheduleId: form.scheduleId ? Number(form.scheduleId) : undefined, appointmentDate: form.appointmentDate, appointmentTime: form.appointmentTime, status: form.status, note: form.note };
            if (editingId) {
                await api.put(`/appointments/${editingId}`, payload);
                toast.success('Cập nhật thành công');
            }
            else {
                await api.post('/appointments', payload);
                toast.success('Tạo lịch hẹn thành công');
            }
            setShowModal(false);
            fetchData(); // Tải lại danh sách sau khi thao tác
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    /**
     * HÀM: handleDelete
     * MÔ TẢ: Xử lý Xóa một lịch hẹn.
     */
    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/appointments/${deleteId}`);
            toast.success('Đã xóa lịch hẹn');
            setDeleteId(null);
            fetchData();
        }
        catch {
            toast.error('Xóa thất bại');
        }
    };

    // Cập nhật giá trị form khi người dùng nhập liệu
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

    return (
        <div className="page-container">
            {/* TIÊU ĐỀ TRANG */}
            <div className="page-header">
                <div>
                    <h1>{"Lịch hẹn"}</h1>
                    <p>{"Quản lý lịch hẹn bệnh nhân"}</p>
                </div>
                {/* Chỉ Admin mới được tạo lịch hẹn thủ công tại đây */}
                {canAdd && (
                    <button className="btn btn-primary" onClick={openCreate}><HiOutlinePlus /> {"Lịch hẹn mới"}</button>
                )}
            </div>

            {/* BẢNG DANH SÁCH LỊCH HẸN */}
            <div className="table-container"><div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>{"Bệnh nhân"}</th>
                            <th>{"Bác sĩ"}</th>
                            <th>{"Ngày"}</th>
                            <th>{"Giờ"}</th>
                            <th>{"Trạng thái"}</th>
                            <th>{"Thao tác"}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map(a => (
                            <tr key={a.id}>
                                <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{a.patientName}</td>
                                <td>{a.doctorName}</td>
                                <td>{a.appointmentDate}</td>
                                <td>{a.appointmentTime}</td>
                                <td>
                                    {/* Hiển thị Badge trạng thái với màu sắc tương ứng */}
                                    <span className={`badge badge-${statusColors[a.status] || 'info'}`}>
                                        {t(`status.${a.status.toLowerCase()}`, a.status)}
                                    </span>
                                </td>
                                <td>
                                    <div className="table-actions">
                                        <button className="btn-icon" onClick={() => openEdit(a)} title="Chỉnh sửa"><HiOutlinePencil /></button>
                                        {canDelete && (
                                            <button className="btn-icon" onClick={() => setDeleteId(a.id)} title="Xóa"><HiOutlineTrash /></button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {items.length === 0 && <tr><td colSpan={7} className="empty-state">{"Không có lịch hẹn nào"}</td></tr>}
                    </tbody>
                </table>
            </div></div>

            {/* MODAL THÊM / SỬA LỊCH HẸN */}
            {showModal && (
                <Modal title={editingId ? "Sửa Lịch hẹn" : "Lịch hẹn mới"} onClose={() => setShowModal(false)}>
                    {/* Chọn Bệnh nhân */}
                    <div className="form-group"><label>{"Bệnh nhân"}</label>
                        <select name="patientId" className="form-control" value={form.patientId} onChange={handleChange} disabled={isEditing || isDoctor} style={isEditing || isDoctor ? lockedFieldStyle : undefined}>
                            <option value="">{"Chọn Bệnh nhân"}</option>
                            {patients.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                        </select>
                    </div>
                    {/* Chọn Bác sĩ */}
                    <div className="form-group"><label>{"Bác sĩ"}</label>
                        <select name="doctorId" className="form-control" value={form.doctorId} onChange={handleChange} disabled={isEditing || isDoctor} style={isEditing || isDoctor ? lockedFieldStyle : undefined}>
                            <option value="">{"Chọn Bác sĩ"}</option>
                            {doctors.map(d => <option key={d.id} value={d.id}>{d.fullName}</option>)}
                        </select>
                    </div>

                    {/* Chọn Ngày và Giờ */}
                    <div className="form-row">
                        <div className="form-group"><label>{"Ngày khám"}</label><input name="appointmentDate" type="date" className="form-control" value={form.appointmentDate} onChange={handleChange} disabled={isEditing || isDoctor} style={isEditing || isDoctor ? lockedFieldStyle : undefined} /></div>
                        <div className="form-group"><label>{"Giờ khám"}</label><input name="appointmentTime" type="time" step="3600" className="form-control" value={form.appointmentTime} onChange={handleChange} disabled={isEditing || isDoctor} style={isEditing || isDoctor ? lockedFieldStyle : undefined} /></div>
                    </div>

                    {/* Cập nhật Trạng thái (Doctor có thể dùng phần này để xác nhận lịch hẹn) */}
                    <div className="form-group"><label>{"Trạng thái"}</label>
                        <select name="status" className="form-control" value={form.status} onChange={handleChange}>
                            {form.status === 'CANCELLED' ? (
                                <option value="CANCELLED">{"Đã hủy"}</option>
                            ) : (
                                <>
                                    <option value="PENDING">{"Chờ duyệt"}</option>
                                    <option value="CONFIRMED">{"Đã xác nhận"}</option>
                                    <option value="COMPLETED">{"Hoàn thành"}</option>
                                    <option value="CANCELLED">{"Đã hủy"}</option>
                                </>
                            )}
                        </select>
                    </div>

                    {/* Ghi chú thêm */}
                    <div className="form-group">
                        <label>{"Ghi chú"} {form.status === 'CANCELLED' && <span className="text-danger ml-2">(Lý do hủy)</span>}</label>
                        <textarea name="note" className="form-control" value={form.note} onChange={handleChange} placeholder="Nhập ghi chú hoặc lý do hủy lịch tại đây..." />
                    </div>

                    {/* Nút hành động trong Modal */}
                    <div className="form-actions">
                        <button className="btn btn-ghost" onClick={() => setShowModal(false)}>{"Hủy"}</button>
                        <button className="btn btn-primary" onClick={handleSubmit}>{editingId ? "Cập nhật" : "Tạo mới"}</button>
                    </div>
                </Modal>
            )}

            {/* DIALOG XÁC NHẬN XÓA */}
            {deleteId && <ConfirmDialog title={"Xóa Lịch hẹn"} message={"Bạn có chắc chắn muốn xóa?"} onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />}
        </div>
    );
}
