import { useEffect, useState } from 'react';
import api from '../../services/api';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { toast } from 'react-toastify';
import { t } from '../../utils/i18n';

import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi2';
import { useAuth } from '../../store/AuthContext';

interface User {
    id: number;
    email: string;
    fullName: string;
    phone: string;
    dateOfBirth: string;
    gender: string;
    address: string;
    roleName: string;
    status: string;
    createdAt: string;
}

const emptyForm = { email: '', password: '', fullName: '', phone: '', gender: '', roleName: '', status: 'ACTIVE' };

export default function UserPage() {
    const { isAdmin } = useAuth();
    const [users, setUsers] = useState<User[]>([]);

    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const [form, setForm] = useState(emptyForm);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const fetchData = async () => {
        try {
            const t = Date.now();
            const usersRes = await api.get(`/users?t=${t}`);
            setUsers(usersRes.data);
        } catch {
            toast.error('Không thể tải danh sách người dùng');
        }
        finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const openCreate = () => { setForm(emptyForm); setEditingId(null); setShowModal(true); };

    // Mở Modal để chỉnh sửa tài khoản đã chọn
    const openEdit = (u: User) => {
        setForm({
            email: u.email,
            password: '',
            fullName: u.fullName || '',
            phone: u.phone || '',
            gender: u.gender || '',
            roleName: u.roleName || '',
            status: u.status || 'ACTIVE'
        });
        setEditingId(u.id);
        setShowModal(true);
    };

    /**
     * HÀM: handleSubmit
     * MÔ TẢ: Xử lý lưu thông tin người dùng (Thêm mới hoặc Cập nhật).
     */
    const handleSubmit = async () => {
        try {
            // Chuẩn bị dữ liệu gửi đi (payload), chuyển roleId sang số và chỉ gửi password nếu có nhập
            const payload = {
                ...form,
                roleName: form.roleName || undefined,
                password: form.password || undefined
            };

            if (editingId) {
                await api.put(`/users/${editingId}`, payload);
                toast.success('Cập nhật người dùng thành công');
            } else {
                await api.post('/users', payload);
                toast.success('Đã tạo tài khoản mới thành công');
            }
            setShowModal(false);
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi lưu dữ liệu');
        }
    };

    /**
     * HÀM: handleDelete
     * MÔ TẢ: Xóa tài khoản người dùng khỏi hệ thống.
     */
    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/users/${deleteId}`);
            toast.success('Đã xóa người dùng');
            setDeleteId(null);
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Không thể xóa người dùng này');
        }
    };

    /**
     * HÀM: handleStatusChange
     * MÔ TẢ: Thay đổi trạng thái tài khoản trực tiếp từ bảng danh sách.
     */
    const handleStatusChange = async (userId: number, newStatus: string) => {
        try {
            await api.put(`/users/${userId}`, { status: newStatus });
            toast.success(newStatus === 'ACTIVE' ? 'Đã kích hoạt lại tài khoản' : 'Đã ngưng hoạt động tài khoản');
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Không thể thay đổi trạng thái tài khoản');
        }
    };

    // Cập nhật giá trị form khi gõ phím
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

    return (
        <div className="page-container">
            {/* TIÊU ĐỀ TRANG */}
            <div className="page-header">
                <div>
                    <h1>{"Người dùng"}</h1>
                    <p>{"Quản lý tài khoản người dùng và vai trò"}</p>
                </div>
                <button className="btn btn-primary" onClick={openCreate}><HiOutlinePlus /> {"Thêm Người Khách"}</button>
            </div>

            {/* BẢNG DANH SÁCH NGƯỜI DÙNG */}
            <div className="table-container">
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>{"Họ và tên"}</th>
                                <th>{"Email"}</th>
                                <th>{"Số điện thoại"}</th>
                                <th>{"Giới tính"}</th>
                                <th>{"Vai trò"}</th>
                                <th>{"Trạng thái"}</th>
                                {!isAdmin && <th>{"Thao tác"}</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id}>
                                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{u.fullName}</td>
                                    <td>{u.email}</td>
                                    <td>{u.phone || '—'}</td>
                                    <td>{u.gender ? t(`gender.${u.gender.toLowerCase()}`, u.gender) : '—'}</td>
                                    <td>
                                        {/* Hiển thị màu sắc Badge khác nhau tùy theo vai trò */}
                                        <span className={`badge badge-${(u.roleName || '').toUpperCase() === 'ADMIN' ? 'primary' : (u.roleName || '').toUpperCase() === 'DOCTOR' ? 'success' : 'info'}`}>
                                            {u.roleName || '—'}
                                        </span>
                                    </td>
                                    <td>
                                        <select
                                            value={u.status}
                                            onChange={(e) => handleStatusChange(u.id, e.target.value)}
                                            style={{
                                                padding: '4px 12px',
                                                borderRadius: '20px',
                                                fontSize: '13px',
                                                fontWeight: '600',
                                                border: 'none',
                                                cursor: 'pointer',
                                                background: u.status === 'ACTIVE' ? '#d1fae5' : '#fee2e2',
                                                color: u.status === 'ACTIVE' ? '#065f46' : '#991b1b',
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
                                    {!isAdmin && (
                                        <td>
                                            <div className="table-actions">
                                                {/* Chỉnh sửa: Cấm Admin chỉnh sửa */}
                                                <button className="btn-icon" onClick={() => openEdit(u)} title="Sửa người dùng"><HiOutlinePencil /></button>

                                                {/* Xóa: Ẩn đối với Admin. Role khác tự hiển thị qua phân quyền (CÒN ROLE KIA ADMIN TỰ TÍCH SAU) */}
                                                <button className="btn-icon" onClick={() => setDeleteId(u.id)} title="Xóa người dùng"><HiOutlineTrash /></button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {users.length === 0 && <tr><td colSpan={isAdmin ? 6 : 7} className="empty-state">{"Không tìm thấy người dùng"}</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL THÊM / SỬA NGƯỜI DÙNG */}
            {showModal && (
                <Modal title={editingId ? "Sửa Người dùng" : "Tạo Người Dùng"} onClose={() => setShowModal(false)}>
                    <div className="form-row">
                        {/* Họ tên và Email (Chỉ nhận Gmail) */}
                        <div className="form-group"><label>{"Họ và tên đầy đủ"}</label><input name="fullName" className="form-control" value={form.fullName} onChange={handleChange} placeholder="Ví dụ: Nguyễn Văn A" /></div>
                        <div className="form-group">
                            <label>{"Email"}</label>
                            <input
                                name="email"
                                type="email"
                                className="form-control"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="example@gmail.com"
                                required
                                pattern="^[a-zA-Z0-9._%+-]+@gmail\.com$"
                            />
                        </div>
                    </div>
                    {/* Mật khẩu (Chỉ hiện khi tạo mới) */}
                    {!editingId && <div className="form-group"><label>{"Mật khẩu khởi tạo"}</label><input name="password" type="password" className="form-control" value={form.password} onChange={handleChange} placeholder="Tối thiểu 6 ký tự" /></div>}

                    <div className="form-row">
                        {/* Số điện thoại (Bắt buộc 10 chữ số) */}
                        <div className="form-group">
                            <label>{"Số điện thoại liên hệ"}</label>
                            <input
                                name="phone"
                                className="form-control"
                                value={form.phone}
                                onChange={handleChange}
                                placeholder="09xxxxxxxx"
                                required
                                pattern="\d{10}"
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        {/* Giới tính và Phân quyền */}
                        <div className="form-group"><label>{"Giới tính"}</label>
                            <select name="gender" className="form-control" value={form.gender} onChange={handleChange}>
                                <option value="">--- Chọn ---</option>
                                <option value="MALE">Nam</option>
                                <option value="FEMALE">Nữ</option>
                                <option value="OTHER">Khác</option>
                            </select>
                        </div>
                        <div className="form-group"><label>{"Quyền truy cập (Role)"}</label>
                            <select name="roleName" className="form-control" value={form.roleName} onChange={handleChange}>
                                <option value="">--- Chọn vai trò ---</option>
                                <option value="ADMIN">Quản trị viên (ADMIN)</option>
                                <option value="DOCTOR">Bác sĩ (DOCTOR)</option>
                                <option value="STAFF">Nhân viên (STAFF)</option>
                                <option value="PATIENT">Bệnh nhân (PATIENT)</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        {/* Trạng thái hoạt động */}
                        <div className="form-group"><label>{"Trạng thái tài khoản"}</label>
                            <select name="status" className="form-control" value={form.status} onChange={handleChange}>
                                <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                                <option value="INACTIVE">Khóa tài khoản (INACTIVE)</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button className="btn btn-ghost" onClick={() => setShowModal(false)}>{"Hủy"}</button>
                        <button className="btn btn-primary" onClick={handleSubmit}>{editingId ? "Cập nhật" : "Tạo mới"}</button>
                    </div>
                </Modal>
            )}

            {/* DIALOG XÁC NHẬN XÓA */}
            {deleteId && <ConfirmDialog title={"Xóa Người dùng"} message={"Bạn có chắc chắn muốn xóa người dùng này? Hành động này không thể hoàn tác."} onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />}
        </div>
    );
}
