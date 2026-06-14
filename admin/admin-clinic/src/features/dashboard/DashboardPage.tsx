import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../store/AuthContext';

import api from '../../services/api';
import {
    HiOutlineCalendarDays,
    HiOutlineDocumentText,
    HiOutlineUserPlus,
    HiOutlineCheckBadge,
    HiChevronLeft,
    HiChevronRight
} from 'react-icons/hi2';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';


interface DirectAppointmentChartPoint {
    date: string;
    fullDate: string;
    completedCount: number;
    otherCount: number;
}

interface TodayAppointmentDTO {
    id: string;
    patientName: string;
    doctorName: string;
    time: string;
    sourceType: string;
    status: string;
}

interface DashboardStats {
    summary: {
        totalPackageBookings: number;
        totalRoomBookings: number;
        newPatients: number;
        totalConfirmedOrCompletedAppointments: number;
    };
    directChartData: DirectAppointmentChartPoint[];
    todayAppointments: TodayAppointmentDTO[];
}

/**
 * COMPONENT CON: SummaryCard
 * MÔ TẢ: Hiển thị một thẻ thống kê nhanh (Ví dụ: Tổng lịch hẹn) dạng hình chữ nhật ngang, gọn gàng và tinh tế.
 */
const SummaryCard = ({
    title,
    value,
    icon: Icon,
    bgColor,
    loading
}: {
    title: string,
    value: number,
    icon: any,
    bgColor: string,
    loading: boolean
}) => {
    return (
        <div className="summary-card" style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: '16px',
            backgroundColor: '#fff',
            borderRadius: '12px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            border: '1px solid #e2e8f0',
            gap: '14px',
            minHeight: 'auto',
        }}>
            <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                backgroundColor: bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: `0 4px 8px ${bgColor}30`
            }}>
                <Icon size={24} color="#ffffff" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', overflow: 'hidden' }}>
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', width: '100%' }}>
                    {title}
                </span>
                <span style={{ fontSize: '20px', color: '#0f172a', fontWeight: 800, lineHeight: 1.2 }}>
                    {loading && !value ? '...' : value.toLocaleString()}
                </span>
            </div>
        </div>
    );
};

export default function DashboardPage() {
    const { user } = useAuth();



    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null); // Dữ liệu từ API
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const renderCalendarDays = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);

        const days = [];
        const prevMonthDays = getDaysInMonth(year, month - 1);

        for (let i = firstDay - 1; i >= 0; i--) {
            days.push({ day: prevMonthDays - i, isCurrentMonth: false, date: new Date(year, month - 1, prevMonthDays - i) });
        }

        for (let i = 1; i <= daysInMonth; i++) {
            days.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) });
        }

        const nextDays = 42 - days.length;
        for (let i = 1; i <= nextDays; i++) {
            days.push({ day: i, isCurrentMonth: false, date: new Date(year, month + 1, i) });
        }

        return days;
    };
    const fetchChartData = useCallback(async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        try {
            // Chuyển date sang local yyyy-MM-dd để query chính xác
            const offset = selectedDate.getTimezoneOffset();
            const localDate = new Date(selectedDate.getTime() - (offset * 60 * 1000));
            const dateStr = localDate.toISOString().split('T')[0];
            const res = await api.get(`/dashboard/stats?date=${dateStr}`);
            setDashboardData(res.data);
            setError(null);
        } catch (err: any) {
            if (!isBackground) setError("Không thể tải dữ liệu thống kê");
        } finally {
            if (!isBackground) setLoading(false);
        }
    }, [selectedDate]);

    // Thiết lập tải dữ liệu khi component mount hoặc thay đổi ngày
    useEffect(() => {
        fetchChartData();
    }, [fetchChartData]);



    return (
        <div className="dashboard-wrapper">
            {/* PHẦN ĐẦU TRANG: LỜI CHÀO VÀ BỘ LỌC THỜI GIAN */}
            <div className="dashboard-header-modern">
                <div className="header-text">
                    <h1>Chào buổi sáng, Bác sĩ {user?.fullName?.split(' ').pop() || 'User'}</h1>
                    <p className="subtitle">Dữ liệu được làm mới khi tải lại trang hoặc chọn ngày trên lịch.</p>
                </div>

            </div>

            {/* CÁC THẺ THỐNG KÊ NHANH (Summary Cards) */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', gap: '12px', marginTop: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>Tổng quan hoạt động</h2>
                <div style={{ padding: '4px 12px', backgroundColor: '#e0e7ff', color: '#4338ca', borderRadius: '16px', fontSize: '13px', fontWeight: 600 }}>
                    30 Ngày Qua
                </div>
            </div>
            <div className="summary-grid-4">
                <SummaryCard
                    title="Gói khám đã đặt"
                    value={dashboardData?.summary.totalPackageBookings || 0}
                    icon={HiOutlineCalendarDays}
                    bgColor="#f43f5e" // Đỏ hồng (Rose)
                    loading={loading}
                />
                <SummaryCard
                    title="Dịch vụ chỗ ở đã đặt"
                    value={dashboardData?.summary.totalRoomBookings || 0}
                    icon={HiOutlineDocumentText}
                    bgColor="#f59e0b" // Cam (Amber)
                    loading={loading}
                />
                <SummaryCard
                    title="Bệnh nhân mới"
                    value={dashboardData?.summary.newPatients || 0}
                    icon={HiOutlineUserPlus}
                    bgColor="#14b8a6" // Xanh ngọc (Teal)
                    loading={loading}
                />
                <SummaryCard
                    title="Tổng ca khám đã xong"
                    value={dashboardData?.summary.totalConfirmedOrCompletedAppointments || 0}
                    icon={HiOutlineCheckBadge}
                    bgColor="#3b82f6" // Xanh dương (Blue)
                    loading={loading}
                />
            </div>

            {/* BIỂU ĐỒ CHÍNH VÀ BIỂU ĐỒ PHỤ */}
            <div className="dashboard-main-content">
                {/* BIỂU ĐỒ CỘT CHỒNG - Số ca khám trực tiếp */}
                <div className="main-chart-container">
                    <div className="main-chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="main-chart-info">
                            <h3>Lịch Khám Trực Tiếp (30 Ngày Qua)</h3>
                            <p>Số lượng lịch hẹn trực tiếp đã hoàn thành và các trạng thái khác.</p>
                        </div>
                    </div>

                    <div className="main-chart-body">
                        {loading && !dashboardData ? (
                            <div className="loading-state">Đang xử lý dữ liệu...</div>
                        ) : error ? (
                            <div className="error-state">{error}</div>
                        ) : (
                            <ResponsiveContainer width="100%" height={350}>
                                <BarChart data={dashboardData?.directChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    />
                                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '13px', fontWeight: 500 }} />
                                    <Bar dataKey="completedCount" name="Đã hoàn thành trực tiếp" stackId="a" fill="#1d4ed8" radius={[0, 0, 4, 4]} barSize={32} />
                                    <Bar dataKey="otherCount" name="Trạng thái khác" stackId="a" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* CALENDAR & APPOINTMENTS WIDGET */}
                <div className="side-chart-container" style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#fff', borderRadius: '12px', padding: '0', overflow: 'hidden' }}>
                    <div style={{ padding: '20px 20px 0 20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Lịch hẹn</h3>
                        </div>

                        {/* Calendar Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <button
                                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                                style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff', cursor: 'pointer' }}
                            >
                                <HiChevronLeft size={16} color="#64748b" />
                            </button>
                            <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                                {"Tháng " + (currentMonth.getMonth() + 1) + " năm " + currentMonth.getFullYear()}
                            </span>
                            <button
                                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                                style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff', cursor: 'pointer' }}
                            >
                                <HiChevronRight size={16} color="#64748b" />
                            </button>
                        </div>

                        {/* Calendar Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '8px' }}>
                            {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(day => (
                                <div key={day} style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', padding: '8px 0' }}>{day}</div>
                            ))}
                            {renderCalendarDays().map((d, i) => {
                                const isSelected = d.date.toDateString() === selectedDate.toDateString();
                                return (
                                    <div
                                        key={i}
                                        onClick={() => setSelectedDate(d.date)}
                                        style={{
                                            height: '36px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '13px',
                                            fontWeight: isSelected ? 600 : 500,
                                            color: isSelected ? '#fff' : (d.isCurrentMonth ? '#0f172a' : '#cbd5e1'),
                                            backgroundColor: isSelected ? '#3b82f6' : 'transparent',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {d.day}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Appointments List */}
                    <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '16px 20px', overflowY: 'auto', maxHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                        {loading && !dashboardData ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {[1, 2].map(i => (
                                    <div key={i} style={{ height: '76px', backgroundColor: '#e2e8f0', borderRadius: '12px', opacity: 1 - (i * 0.3) }} />
                                ))}
                            </div>
                        ) : error ? (
                            <div style={{ padding: '20px', color: '#ef4444', backgroundColor: '#fef2f2', borderRadius: '12px', border: '1px solid #fecaca', fontSize: '14px', textAlign: 'center' }}>
                                {error}
                            </div>
                        ) : dashboardData?.todayAppointments && dashboardData.todayAppointments.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {dashboardData.todayAppointments.map((appt, idx) => {
                                    const isOnline = appt.sourceType === 'ONLINE';
                                    const bgColor = isOnline ? '#faf5ff' : '#f1f5f9';
                                    const titleColor = '#0f172a';

                                    return (
                                        <div key={appt.id || idx} style={{
                                            padding: '16px',
                                            borderRadius: '12px',
                                            backgroundColor: bgColor,
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <span style={{ fontSize: '14px', fontWeight: 700, color: titleColor }}>
                                                    {isOnline ? 'Tư vấn trực tuyến' : 'Khám thường'}
                                                </span>
                                                <span style={{ fontSize: '13px', fontWeight: 500, color: '#475569' }}>
                                                    BN: {appt.patientName} — BS: {appt.doctorName}
                                                </span>
                                                <span style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <HiOutlineCalendarDays size={14} />
                                                    {(() => {
                                                        const daysOfWeek = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                                                        return `${daysOfWeek[selectedDate.getDay()]}, ${String(selectedDate.getDate()).padStart(2, '0')}/${String(selectedDate.getMonth() + 1).padStart(2, '0')}/${selectedDate.getFullYear()}, ${appt.time}`;
                                                    })()}
                                                </span>
                                            </div>

                                            {/* Avatars */}
                                            <div style={{ display: 'flex', marginLeft: '12px' }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#e2e8f0', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, color: '#64748b', zIndex: 2 }}>
                                                    {appt.patientName.charAt(0)}
                                                </div>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#3b82f6', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, color: '#fff', marginLeft: '-12px', zIndex: 1 }}>
                                                    BS
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '14px', minHeight: '150px', gap: '8px' }}>
                                <HiOutlineCheckBadge size={32} color="#cbd5e1" />
                                Không có lịch hẹn
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
