import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './store/AuthContext';
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';

import LoginPage from './features/auth/LoginPage';
import DashboardPage from './features/dashboard/DashboardPage';
import UserPage from './features/users/UserPage';

import DoctorPage from './features/doctors/DoctorPage';
import SpecializationPage from './features/specializations/SpecializationPage';
import RoomPage from './features/rooms/RoomPage';
import AppointmentPage from './features/appointments/AppointmentPage';
import MedicalRecordPage from './features/medical-records/MedicalRecordPage';
import PrescriptionPage from './features/prescriptions/PrescriptionPage';
import RoomBookingPage from './features/room-bookings/RoomBookingPage';
import HealthPackagePage from './features/health-packages/HealthPackagePage';
import OnlineConsultationPage from './features/online-consultations/OnlineConsultationPage';
import HealthPackageBookingPage from './features/health-package-bookings/HealthPackageBookingPage';
import ProfilePage from './features/profile/ProfilePage';
import ServiceRegistrationPage from './features/service-registrations/ServiceRegistrationPage';
import { navItems } from './components/layout/Sidebar';

function RedirectIfAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}



function SmartDashboard() {
  const { user, isPathAllowed, isPermissionsLoaded } = useAuth();
  
  // Đợi ma trận quyền load xong trước khi quyết định điều hướng
  if (user && user.role !== 'ADMIN' && !isPermissionsLoaded) {
    return <div className="p-8 text-center text-gray-500">Đang phân tích quyền truy cập...</div>;
  }

  // Admin được xem Dashboard
  if (user?.role === 'ADMIN') return <DashboardPage />;
  
  // Các role khác: Tự động chuyển hướng tới trang đầu tiên họ có quyền truy cập dựa trên danh sách menu
  const firstAllowed = navItems.find(item => item.path !== '/' && isPathAllowed(item.path));
  if (firstAllowed) {
      return <Navigate to={firstAllowed.path} replace />;
  }

  // Nếu không có quyền nào trong menu (nhưng vẫn load được permission), fallback về profile
  return <Navigate to="/profile" replace />;
}

// Khởi tạo toàn bộ hệ thống route của ứng dụng quản trị.
export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<RedirectIfAuth><LoginPage /></RedirectIfAuth>} />

      {/* Protected - wraps all authenticated routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<SmartDashboard />} />

          {/* Tất cả các trang đều dựa hoàn toàn vào isPathAllowed (từ DB) - Không fix cứng chức vụ nào cả */}
          <Route path="/room-bookings" element={<RoomBookingPage />} />
          <Route path="/health-packages" element={<HealthPackagePage />} />
          <Route path="/health-package-bookings" element={<HealthPackageBookingPage />} />
          <Route path="/service-registrations" element={<ServiceRegistrationPage />} />
          <Route path="/users" element={<UserPage />} />
          <Route path="/rooms" element={<RoomPage />} />
          <Route path="/appointments" element={<AppointmentPage />} />
          <Route path="/online-consultations" element={<OnlineConsultationPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/medical-records" element={<MedicalRecordPage />} />
          <Route path="/prescriptions" element={<PrescriptionPage />} />
          <Route path="/doctors" element={<DoctorPage />} />

          <Route path="/specializations" element={<SpecializationPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

