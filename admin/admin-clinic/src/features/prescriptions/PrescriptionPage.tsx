import { useEffect, useState } from 'react';
import api from '../../services/api';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { toast } from 'react-toastify';

import { HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi2';
import { useAuth } from '../../store/AuthContext';

/**
 * FILE: PrescriptionPage.tsx
 * MÔ TẢ: Trang quản lý Đơn thuốc (Prescriptions).
 * Cho phép Bác sĩ tạo đơn thuốc dựa trên Hồ sơ bệnh án đã có.
 * Một đơn thuốc có thể bao gồm nhiều loại thuốc khác nhau (Prescription Items).
 */

interface PrescriptionItem { medicineName: string; dosage: string; frequency: string; duration: string; note: string; }
interface Prescription { id: number; medicalRecordId: number; doctorId: number; doctorName: string; createdAt: string; items: PrescriptionItem[]; }
interface MedicalRecordOption { id: number; doctorId: number; doctorName: string; diagnosis: string; }
interface DoctorOption { id: number; userId: number; fullName: string; specializationName: string; }

const emptyItem: PrescriptionItem = { medicineName: '', dosage: '', frequency: '', duration: '', note: '' };

const emptyForm = { medicalRecordId: '', doctorId: '', items: [{ ...emptyItem }] as PrescriptionItem[] };

export default function PrescriptionPage() {
    const { user, isDoctor, isAdmin } = useAuth();
    // ADMIN va DOCTOR duoc tao don thuoc; chi ADMIN duoc xoa.
    const canAdd = isAdmin || isDoctor;
    const canDelete = isAdmin;
    const [items, setItems] = useState<Prescription[]>([]); // Danh sách các đơn thuốc hiện có
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    // Danh sách dữ liệu để chọn khi tạo đơn thuốc
    const [medicalRecords, setMedicalRecords] = useState<MedicalRecordOption[]>([]);
    const [doctors, setDoctors] = useState<DoctorOption[]>([]);

    const fetchData = async () => {
        try {
            const res = await api.get('/prescriptions');
            setItems(res.data);
        }
        catch {
            toast.error('Không thể tải danh sách đơn thuốc');
        }
        finally {
            setLoading(false);
        }
    };

    const fetchOptions = async () => {
        try {
            const [mrRes, docRes, prescriptionRes] = await Promise.all([
                api.get('/medical-records'),
                api.get('/doctors'),
                api.get('/prescriptions'),
            ]);
            const doctorList: DoctorOption[] = docRes.data;
            const currentDoctor = doctorList.find(d => d.userId === user?.userId);
            const usedMedicalRecordIds = new Set((prescriptionRes.data as Prescription[]).map(p => p.medicalRecordId));
            const availableRecords = (mrRes.data as MedicalRecordOption[]).filter(mr => {
                const belongsToCurrentDoctor = !isDoctor || (currentDoctor && mr.doctorId === currentDoctor.id);
                return belongsToCurrentDoctor && !usedMedicalRecordIds.has(mr.id);
            });
            setMedicalRecords(availableRecords);
            setDoctors(doctorList);
        } catch { /* Bo qua loi neu danh sach tam thoi trong */ }
    };

    useEffect(() => {
        fetchData();
        fetchOptions();
    }, []);

    const openCreate = () => {
        let defaultDoctorId = '';
        if (isDoctor) {
            const doc = doctors.find(d => d.userId === user?.userId);
            if (doc) defaultDoctorId = String(doc.id);
        }
        setForm({ ...emptyForm, doctorId: defaultDoctorId, items: [{ ...emptyItem }] });
        setEditingId(null);
        setShowModal(true);
    };

    const handleSubmit = async () => {
        try {
            const payload = {
                medicalRecordId: Number(form.medicalRecordId),
                doctorId: Number(form.doctorId),
                items: form.items.filter(i => i.medicineName.trim() !== '')
            };

            if (editingId) {
                await api.put(`/prescriptions/${editingId}`, payload);
                toast.success('Cập nhật đơn thuốc thành công');
            }
            else {
                await api.post('/prescriptions', payload);
                toast.success('Đã tạo đơn thuốc mới');
            }
            setShowModal(false);
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Có lỗi khi lưu đơn thuốc');
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/prescriptions/${deleteId}`);
            toast.success('Đã xóa đơn thuốc');
            setDeleteId(null);
            fetchData();
        }
        catch {
            toast.error('Xóa đơn thuốc thất bại');
        }
    };

    const updateItem = (idx: number, field: string, value: string) => {
        const newItems = [...form.items];
        (newItems[idx] as any)[field] = value;
        setForm({ ...form, items: newItems });
    };

    const addItem = () => setForm({ ...form, items: [...form.items, { ...emptyItem }] });
    const removeItem = (idx: number) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });

    if (loading) return <div className="loading-spinner"><div className="spinner" /></div>;

    return (
        <div className="page-container">
            {/* TIÊU ĐỀ TRANG */}
            <div className="page-header">
                <div>
                    <h1>{"Đơn thuốc"}</h1>
                    <p>{"Quản lý đơn thuốc bệnh nhân"}</p>
                </div>
                {canAdd && (
                    <button className="btn btn-primary" onClick={openCreate}><HiOutlinePlus /> {"Thêm Đơn thuốc"}</button>
                )}
            </div>

            {/* BẢNG DANH SÁCH ĐƠN THUỐC */}
            <div className="table-container"><div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>{"ID"}</th>
                            <th>{"Hồ sơ bệnh án"}</th>
                            <th>{"Bác sĩ"}</th>
                            <th>{"Thuốc"}</th>
                            <th>{"Ngày tạo"}</th>
                            <th>{"Thao tác"}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map(p => (
                            <tr key={p.id}>
                                <td>#{p.id}</td>
                                <td>#{p.medicalRecordId}</td>
                                <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{p.doctorName}</td>
                                <td>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {p.items.map((item, idx) => (
                                            <span key={idx} style={{ fontSize: '0.75rem', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                                                {item.medicineName} • {item.dosage} ({item.frequency})
                                            </span>
                                        ))}
                                        {p.items.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Chưa có thuốc</span>}
                                    </div>
                                </td>
                                <td>{p.createdAt ? new Date(p.createdAt).toLocaleDateString('vi-VN') : '—'}</td>
                                <td>
                                    <div className="table-actions">
                                        {/*
                                        <button className="btn-icon" onClick={() => openEdit(p)} title="Sửa đơn thuốc"><HiOutlinePencil /></button>
                                        */}
                                        {canDelete && (
                                            <button className="btn-icon" onClick={() => setDeleteId(p.id)} title="Xóa đơn thuốc"><HiOutlineTrash /></button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {items.length === 0 && <tr><td colSpan={6} className="empty-state">{"Không có đơn thuốc nào"}</td></tr>}
                    </tbody>
                </table>
            </div></div>

            {/* MODAL THÊM / SỬA ĐƠN THUỐC */}
            {showModal && (
                <Modal title={editingId ? "Sửa Đơn thuốc" : "Tạo Đơn thuốc"} onClose={() => setShowModal(false)} wide>
                    <div className="form-row">
                        <div className="form-group">
                            <label>{"Hồ sơ bệnh án"}</label>
                            <select className="form-control" value={form.medicalRecordId} onChange={e => setForm({ ...form, medicalRecordId: e.target.value })}>
                                <option value="">--- Chọn bệnh án để kê đơn ---</option>
                                {medicalRecords.map(mr => (
                                    <option key={mr.id} value={mr.id}>
                                        #{mr.id} - BS {mr.doctorName} - {mr.diagnosis ? mr.diagnosis.substring(0, 50) + '...' : 'Không có chẩn đoán'}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>{"Bác sĩ"}</label>
                            <select className="form-control" value={form.doctorId} onChange={e => setForm({ ...form, doctorId: e.target.value })} disabled={isDoctor}>
                                <option value="">--- Chọn bác sĩ ---</option>
                                {doctors.map(d => (
                                    <option key={d.id} value={d.id}>
                                        {d.fullName} ({d.specializationName || 'Bác sĩ'})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div style={{ marginTop: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Chi tiết danh mục thuốc chỉ định
                            </label>
                            <button className="btn btn-sm btn-ghost" onClick={addItem}><HiOutlinePlus /> {"Thêm thuốc"}</button>
                        </div>

                        {form.items.map((item, idx) => (
                            <div key={idx} style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 'var(--radius-md)', marginBottom: 12, border: '1px solid var(--border-color)' }}>
                                <div className="form-row">
                                    <div className="form-group"><label>{"Tên thuốc"}</label><input className="form-control" value={item.medicineName} onChange={e => updateItem(idx, 'medicineName', e.target.value)} placeholder="Ví dụ: Paracetamol 500mg" /></div>
                                    <div className="form-group"><label>{"Liều lượng"}</label><input className="form-control" value={item.dosage} onChange={e => updateItem(idx, 'dosage', e.target.value)} placeholder="Ví dụ: 1 viên" /></div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group"><label>{"Tần suất"}</label><input className="form-control" value={item.frequency} onChange={e => updateItem(idx, 'frequency', e.target.value)} placeholder="Ví dụ: 3 lần/ngày, sau ăn" /></div>
                                    <div className="form-group"><label>{"Thời gian dùng"}</label><input className="form-control" value={item.duration} onChange={e => updateItem(idx, 'duration', e.target.value)} placeholder="Ví dụ: 7 ngày" /></div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    {form.items.length > 1 && <button className="btn btn-sm btn-ghost" style={{ color: 'var(--accent-danger)' }} onClick={() => removeItem(idx)}><HiOutlineTrash /> Gỡ bỏ</button>}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="form-actions" style={{ marginTop: 24 }}>
                        <button className="btn btn-ghost" onClick={() => setShowModal(false)}>{"Hủy"}</button>
                        <button className="btn btn-primary" onClick={handleSubmit}>{editingId ? "Cập nhật" : "Tạo mới"}</button>
                    </div>
                </Modal>
            )}

            {deleteId && <ConfirmDialog title={"Xóa Đơn thuốc"} message={"Bạn có chắc chắn không?"} onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />}
        </div>
    );
}
