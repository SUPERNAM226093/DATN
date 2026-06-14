import { useEffect, useState } from 'react';
import api from '../../services/api';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { toast } from 'react-toastify';

import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi2';
import { useAuth } from '../../store/AuthContext';

interface MedicalRecord { id: number; appointmentId: number; doctorId: number; doctorName: string; diagnosis: string; conclusion: string; createdAt: string; }
interface AppointmentOption { id: number; patientName: string; doctorName: string; appointmentDate: string; }
interface DoctorOption { id: number; userId: number; fullName: string; specializationName: string; }

const emptyForm = { appointmentId: '', doctorId: '', diagnosis: '', conclusion: '' };

export default function MedicalRecordPage() {
    const { user, isDoctor, isAdmin } = useAuth();
    // Phân quyền cứng: DOCTOR chỉ được Xem/Sửa Hồ sơ bệnh án, không được Thêm/Xóa
    const canAdd = isAdmin;
    const canDelete = isAdmin;
    const [items, setItems] = useState<MedicalRecord[]>([]); // Danh sách bệnh án
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    // Danh sách để chọn khi tạo mới
    const [appointments, setAppointments] = useState<AppointmentOption[]>([]);
    const [doctors, setDoctors] = useState<DoctorOption[]>([]);

    const fetchData = async () => {
        try {
            const res = await api.get('/medical-records');
            setItems(res.data);
        }
        catch {
            toast.error('Không thể tải danh sách hồ sơ bệnh án');
        }
        finally {
            setLoading(false);
        }
    };

    const fetchOptions = async () => {
        try {
            const [apptRes, docRes] = await Promise.all([
                api.get('/appointments'),
                api.get('/doctors'),
            ]);
            setAppointments(apptRes.data);
            setDoctors(docRes.data);
        } catch { /* Không hiện lỗi vì danh sách có thể tạm thời trống */ }
    };

    useEffect(() => {
        fetchData();
        fetchOptions();
    }, []);

    /**
     * HÀM: openCreate
     * MÔ TẢ: Mở form tạo bệnh án mới. Tự động điền ID Bác sĩ nếu người đang đăng nhập là Bác sĩ.
     */
    const openCreate = () => {
        let defaultDoctorId = '';
        if (isDoctor) {
            const doc = doctors.find(d => d.userId === user?.userId);
            if (doc) defaultDoctorId = String(doc.id);
        }
        setForm({ ...emptyForm, doctorId: defaultDoctorId });
        setEditingId(null);
        setShowModal(true);
    };

    // Mở form chỉnh sửa bệnh án hiện tại
    /**
     * HÀM: handleSubmit
     * MÔ TẢ: Gửi kết quả chẩn đoán và kết luận lên hệ thống.
     */
    const handleSubmit = async () => {
        try {
            const payload = { appointmentId: Number(form.appointmentId), doctorId: Number(form.doctorId), diagnosis: form.diagnosis, conclusion: form.conclusion };
            if (editingId) {
                await api.put(`/medical-records/${editingId}`, payload);
                toast.success('Cập nhật thành công');
            }
            else {
                await api.post('/medical-records', payload);
                toast.success('Đã ghi nhận hồ sơ bệnh án mới');
            }
            setShowModal(false);
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    /**
     * HÀM: handleDelete
     * MÔ TẢ: Xóa hồ sơ bệnh án (Chỉ Admin mới có quyền thực hiện thao tác này).
     */
    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/medical-records/${deleteId}`);
            toast.success('Đã xóa hồ sơ');
            setDeleteId(null);
            fetchData();
        }
        catch {
            toast.error('Xóa hồ sơ thất bại');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

    return (
        <div className="page-container">
            {/* TIÊU ĐỀ TRANG */}
            <div className="page-header">
                <div>
                    <h1>{"Hồ sơ bệnh án"}</h1>
                    <p>{"Quản lý hồ sơ bệnh án bệnh nhân"}</p>
                </div>
                <button className="btn btn-primary" onClick={openCreate} style={{ display: canAdd ? undefined : 'none' }}><HiOutlinePlus /> {"Thêm Hồ sơ"}</button>
            </div>

            {/* BẢNG DANH SÁCH BỆNH ÁN */}
            <div className="table-container"><div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>{"ID"}</th>
                            <th>{"Mã lịch hẹn"}</th>
                            <th>{"Bác sĩ"}</th>
                            <th>{"Chẩn đoán"}</th>
                            <th>{"Kết luận"}</th>
                            <th>{"Ngày tạo"}</th>
                            <th>{"Thao tác"}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map(r => (
                            <tr key={r.id}>
                                <td>#{r.id}</td>
                                <td>#{r.appointmentId}</td>
                                <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{r.doctorName}</td>
                                {/* Ràng buộc độ dài hiển thị cho text dài */}
                                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.diagnosis}>{r.diagnosis || '—'}</td>
                                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.conclusion}>{r.conclusion || '—'}</td>
                                <td>{r.createdAt ? new Date(r.createdAt).toLocaleDateString('vi-VN') : '—'}</td>
                                <td>
                                    <div className="table-actions">
                                        {/*
                                        <button className="btn-icon" onClick={() => openEdit(r)} title="Sửa bệnh án"><HiOutlinePencil /></button>
                                        */}
                                        {canDelete && (
                                            <button className="btn-icon" onClick={() => setDeleteId(r.id)} title="Xóa bệnh án"><HiOutlineTrash /></button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {items.length === 0 && <tr><td colSpan={7} className="empty-state">{"Không có hồ sơ nào"}</td></tr>}
                    </tbody>
                </table>
            </div></div>

            {/* MODAL THÊM / SỬA HỒ SƠ BỆNH ÁN */}
            {showModal && (
                <Modal title={editingId ? "Sửa Hồ sơ bệnh án" : "Tạo Hồ sơ bệnh án"} onClose={() => setShowModal(false)}>
                    <div className="form-row">
                        {/* Chọn Lịch hẹn tương ứng */}
                        <div className="form-group">
                            <label>{"Lịch hẹn"}</label>
                            <select name="appointmentId" className="form-control" value={form.appointmentId} onChange={handleChange}>
                                <option value="">--- Chọn mã lịch hẹn ---</option>
                                {appointments.map(a => (
                                    <option key={a.id} value={a.id}>
                                        #{a.id} - {a.patientName} (Ngày: {a.appointmentDate})
                                    </option>
                                ))}
                            </select>
                        </div>
                        {/* Chọn Bác sĩ (Bị khóa nếu người dùng là Bác sĩ) */}
                        <div className="form-group">
                            <label>{"Bác sĩ"}</label>
                            <select name="doctorId" className="form-control" value={form.doctorId} onChange={handleChange} disabled={isDoctor}>
                                <option value="">--- Chọn bác sĩ ---</option>
                                {doctors.map(d => (
                                    <option key={d.id} value={d.id}>
                                        {d.fullName} ({d.specializationName || 'Bác sĩ'})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {/* Chi tiết Chẩn đoán và Kết luận y khoa */}
                    <div className="form-group"><label>{"Chẩn đoán"}</label><textarea name="diagnosis" className="form-control" value={form.diagnosis} onChange={handleChange} rows={3} placeholder="Nhập tình trạng bệnh lý, triệu chứng ghi nhận được..." /></div>
                    <div className="form-group"><label>{"Kết luận"}</label><textarea name="conclusion" className="form-control" value={form.conclusion} onChange={handleChange} rows={3} placeholder="Hướng giải quyết, thuốc chỉ định hoặc lời dặn bác sĩ..." /></div>

                    <div className="form-actions">
                        <button className="btn btn-ghost" onClick={() => setShowModal(false)}>{"Hủy"}</button>
                        <button className="btn btn-primary" onClick={handleSubmit}>{editingId ? "Cập nhật" : "Tạo mới"}</button>
                    </div>
                </Modal>
            )}

            {/* DIALOG XÁC NHẬN XÓA */}
            {deleteId && <ConfirmDialog title={"Xóa Hồ sơ"} message={"Bạn có chắc chắn không?"} onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />}
        </div>
    );
}
