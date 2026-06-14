import { useEffect, useState } from 'react';
import api from '../../services/api';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { toast } from 'react-toastify';

import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlinePhoto } from 'react-icons/hi2';
import { useAuth } from '../../store/AuthContext';

interface Doctor {
    id: number;
    userId: number;
    fullName: string;
    email: string;
    specializationName: string;
    clinicId: number;
    experienceYears: number;
    bio: string;
    status: string;
    featureImageUrl: string;
}
interface UserOption { id: number; fullName: string; email: string; roleName: string; }
interface SpecOption { id: number; name: string; }
const emptyForm = { userId: '', specializationId: '', clinicId: '', experienceYears: '', bio: '' };

export default function DoctorPage() {
    useAuth(); // keep hook if it performs initialization, though it's unused now. Wait, just removing `const { isAdmin } =`
    const [doctors, setDoctors] = useState<Doctor[]>([]); // Danh sách bác sĩ hiện tại
    const [users, setUsers] = useState<UserOption[]>([]); // Danh sách người dùng (để gán quyền bác sĩ)
    const [specs, setSpecs] = useState<SpecOption[]>([]); // Danh sách các chuyên khoa
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    // Lọc danh sách người dùng chỉ lấy những người có Role là DOCTOR
    const doctorUsers = users.filter(u => u.roleName === 'DOCTOR');

    /**
     * HÀM: fetchData
     * MÔ TẢ: Tải toàn bộ dữ liệu cần thiết: Bác sĩ, Người dùng và Chuyên khoa.
     */
    const fetchData = async () => {
        try {
            const [dRes, uRes, sRes] = await Promise.all([
                api.get('/doctors?includeInactive=true'),
                api.get('/users'),
                api.get('/specializations')
            ]);
            setDoctors(dRes.data);
            setUsers(uRes.data);
            setSpecs(sRes.data);
        } catch {
            toast.error('Không thể tải danh sách bác sĩ');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // Mở Modal tạo mới
    const openCreate = () => { setForm(emptyForm); setEditingId(null); setShowModal(true); };

    // Mở Modal chỉnh sửa bác sĩ đã chọn
    const openEdit = (d: Doctor) => {
        const spec = specs.find(s => s.name === d.specializationName);
        setForm({
            userId: String(d.userId),
            specializationId: spec ? String(spec.id) : '',
            clinicId: d.clinicId ? String(d.clinicId) : '',
            experienceYears: d.experienceYears ? String(d.experienceYears) : '',
            bio: d.bio || ''
        });
        setEditingId(d.id); setShowModal(true);
    };

    /**
     * HÀM: handleSubmit
     * MÔ TẢ: Gửi dữ liệu form lên API để tạo mới hoặc cập nhật thông tin bác sĩ.
     */
    const handleSubmit = async () => {
        try {
            const payload = { userId: Number(form.userId), specializationId: form.specializationId ? Number(form.specializationId) : undefined, clinicId: form.clinicId ? Number(form.clinicId) : undefined, experienceYears: form.experienceYears ? Number(form.experienceYears) : undefined, bio: form.bio };
            if (editingId) {
                await api.put(`/doctors/${editingId}`, payload);
                toast.success('Cập nhật thông tin bác sĩ thành công');
            }
            else {
                await api.post('/doctors', payload);
                toast.success('Đã thêm bác sĩ mới');
            }
            setShowModal(false);
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Có lỗi khi lưu thông tin');
        }
    };

    /**
     * HÀM: handleStatusChange
     * MÔ TẢ: Thay đổi trạng thái tài khoản bác sĩ trực tiếp từ danh sách.
     */
    const handleStatusChange = async (doctorId: number, newStatus: string) => {
        try {
            await api.patch(`/doctors/${doctorId}/status`, { status: newStatus });
            toast.success(newStatus === 'ACTIVE' ? 'Đã kích hoạt lại tài khoản bác sĩ' : 'Đã ngưng hoạt động tài khoản bác sĩ');
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Không thể thay đổi trạng thái bác sĩ');
        }
    };

    /**
     * HÀM: handleDelete
     * MÔ TẢ: Xóa bác sĩ khỏi hệ thống (Lưu ý: Không xóa người dùng tương ứng).
     */
    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/doctors/${deleteId}`);
            toast.success('Đã xóa bác sĩ');
            setDeleteId(null);
            fetchData();
        }
        catch (err: any) {
            toast.error(err.response?.data?.message || 'Xóa thất bại');
        }
    };

    /**
     * HÀM: handleImageUpload
     * MÔ TẢ: Xử lý tải lên ảnh đại diện của bác sĩ.
     */
    const handleImageUpload = async (doctorId: number, file: File) => {
        const fd = new FormData();
        fd.append('file', file);
        try {
            await api.post(`/doctors/${doctorId}/feature-image`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Tải ảnh lên thành công');
            fetchData();
        }
        catch {
            toast.error('Tải ảnh thất bại');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

    return (
        <div className="page-container">
            {/* TIÊU ĐỀ TRANG */}
            <div className="page-header">
                <div>
                    <h1>{"Bác sĩ"}</h1>
                    <p>{"Quản lý hồ sơ bác sĩ và chuyên khoa"}</p>
                </div>
                <button className="btn btn-primary" onClick={openCreate}>
                    <HiOutlinePlus /> {"Tạo Bác sĩ"}
                </button>
            </div>

            {/* BẢNG DANH SÁCH BÁC SĨ */}
            <div className="table-container"><div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>{"Ảnh"}</th>
                            <th>{"Tên bác sĩ"}</th>
                            <th>{"Email"}</th>
                            <th>{"Chuyên khoa"}</th>
                            <th>{"Cơ sở"}</th>
                            <th>{"Kinh nghiệm"}</th>
                            <th>{"Trạng thái"}</th>
                            <th>{"Thao tác"}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {doctors.map(d => (
                            <tr key={d.id}>
                                {/* Hiển thị ảnh đại diện */}
                                <td>
                                    {d.featureImageUrl ? (
                                        <img src={d.featureImageUrl} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <HiOutlinePhoto size={16} />
                                        </div>
                                    )}
                                </td>
                                <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{d.fullName}</td>
                                <td>{d.email}</td>
                                <td><span className="badge badge-primary">{d.specializationName || '—'}</span></td>
                                <td>{d.clinicId ? `CS${d.clinicId}` : '—'}</td>
                                <td>{d.experienceYears ? `${d.experienceYears} năm` : '—'}</td>
                                <td>
                                    <select
                                        value={d.status || 'ACTIVE'}
                                        onChange={(e) => handleStatusChange(d.id, e.target.value)}
                                        style={{
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            border: 'none',
                                            cursor: 'pointer',
                                            background: d.status === 'ACTIVE' ? '#d1fae5' : '#fee2e2',
                                            color: d.status === 'ACTIVE' ? '#065f46' : '#991b1b',
                                            outline: 'none',
                                            appearance: 'none',
                                            textAlign: 'center',
                                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                                        }}
                                    >
                                        <option value="ACTIVE" style={{ background: '#fff', color: '#065f46', fontWeight: 'bold' }}>ĐANG HOẠT ĐỘNG</option>
                                        <option value="INACTIVE" style={{ background: '#fff', color: '#991b1b', fontWeight: 'bold' }}>NGƯNG HOẠT ĐỘNG</option>
                                    </select>
                                </td>
                                <td>
                                    <div className="table-actions">
                                        {/* Nút tải lên ảnh */}
                                        <label className="btn-icon" style={{ cursor: 'pointer' }} title="Tải ảnh đại diện">
                                            <HiOutlinePhoto />
                                            <input type="file" accept="image/*" hidden onChange={e => { if (e.target.files?.[0]) handleImageUpload(d.id, e.target.files[0]); }} />
                                        </label>
                                        <button className="btn-icon" onClick={() => openEdit(d)} title="Sửa thông tin bác sĩ"><HiOutlinePencil /></button>
                                        <button className="btn-icon" onClick={() => setDeleteId(d.id)} title="Xóa bác sĩ"><HiOutlineTrash /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {doctors.length === 0 && <tr><td colSpan={8} className="empty-state">{"Không có bác sĩ nào"}</td></tr>}
                    </tbody>
                </table>
            </div></div>

            {/* MODAL THÊM / SỬA BÁC SĨ */}
            {showModal && (
                <Modal title={editingId ? "Sửa Bác sĩ" : "Tạo Bác sĩ"} onClose={() => setShowModal(false)}>
                    {/* Chọn người dùng để gán làm Bác sĩ */}
                    <div className="form-group"><label>{"Người dùng hệ thống"}</label>
                        <select name="userId" className="form-control" value={form.userId} onChange={handleChange} disabled={!!editingId}>
                            <option value="">--- Chọn người dùng ---</option>
                            {doctorUsers.map(u => <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>)}
                        </select>
                    </div>
                    {/* Chọn Chuyên khoa */}
                    <div className="form-group"><label>{"Chuyên khoa"}</label>
                        <select name="specializationId" className="form-control" value={form.specializationId} onChange={handleChange} disabled={!!editingId}>
                            <option value="">--- Chọn chuyên khoa ---</option>
                            {specs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="form-row">
                        {/* Cơ sở y tế và số năm kinh nghiệm */}
                        <div className="form-group"><label>{"Cơ sở"}</label>
                            <select name="clinicId" className="form-control" value={form.clinicId} onChange={handleChange}>
                                <option value="">--- Chọn cơ sở ---</option>
                                <option value="1">Cơ sở 1</option>
                                <option value="2">Cơ sở 2</option>
                                <option value="3">Cơ sở 3</option>
                                <option value="4">Cơ sở 4</option>
                            </select>
                        </div>
                        <div className="form-group"><label>{"Năm kinh nghiệm"}</label><input name="experienceYears" type="number" className="form-control" value={form.experienceYears} onChange={handleChange} /></div>
                    </div>
                    {/* Tiểu sử bác sĩ */}
                    <div className="form-group"><label>{"Tiểu sử"}</label><textarea name="bio" className="form-control" value={form.bio} onChange={handleChange} placeholder="Mô tả tóm tắt về quá trình công tác, thế mạnh của bác sĩ..." /></div>

                    <div className="form-actions">
                        <button className="btn btn-ghost" onClick={() => setShowModal(false)}>{"Hủy"}</button>
                        <button className="btn btn-primary" onClick={handleSubmit}>{editingId ? "Cập nhật" : "Tạo mới"}</button>
                    </div>
                </Modal>
            )}

            {/* DIALOG XÁC NHẬN XÓA */}
            {deleteId && <ConfirmDialog title={"Xóa Bác sĩ"} message={"Bạn có chắc chắn muốn xóa bác sĩ này?"} onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />}
        </div>
    );
}
