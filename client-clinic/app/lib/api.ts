const isServer = typeof window === 'undefined';
const API_BASE_URL = isServer
    ? (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || "https://silent-vector-chi-steven.trycloudflare.com")
    : (process.env.NEXT_PUBLIC_API_URL || "https://silent-vector-chi-steven.trycloudflare.com");

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DoctorResponse {
    id: number;
    userId: number | null;
    fullName: string;
    email: string;
    specializationName: string;
    clinicId: number;
    experienceYears: number;
    bio: string;
    featureImageUrl: string | null;
    phoneNumber?: string | null;
}

export interface ClinicServiceResponse {
    id: number;
    name: string;
    description: string;
    price: number;
    type: string;
    durationMinutes: number;
    createdByName: string;
    featureImageUrl: string | null;
}

export interface RoomResponse {
    id: number;
    roomCode: string;
    name: string;
    floor: string;
    bedType: string;
    maxCapacity: number;
    pricePerNight: number;
    cleaningFee: number;
    serviceFee: number;
    description: string;
    amenities: string[];
    images: string[];
    isActive: boolean;
    isAvailable: boolean;
    status: string; // AVAILABLE, UNAVAILABLE, MAINTENANCE
}

export interface RoomBookingRequest {
    roomId: number;
    patientName: string;
    checkInDate: string;
    checkOutDate: string;
    numberOfPatients: number;
    specialNotes: string;
    contactPhone: string;
}

export interface RoomBookingResponse {
    id: number;
    patientName: string;
    // Backend trả về object lồng nhau, không phải flat string
    room: {
        id: number;
        roomCode: string;
        name: string;
    } | null;
    bookedBy: {
        id: number;
        fullName: string;
    } | null;
    // Giữ lại cả roomName để tương thích ngược (deprecated, dùng room.name thay thế)
    roomName?: string;
    checkInDate: string;
    checkOutDate: string;
    actualCheckInAt?: string;
    actualCheckOutAt?: string;
    totalNights: number;
    estimatedFee: number;
    totalPrice?: number;
    status: string;
    specialNotes: string;
    contactPhone?: string;
    cancelReason?: string;
    rejectReason?: string;
    createdAt?: string;
}

export interface SpecializationResponse {
    id: number;
    name: string;
    description: string;
    featureImageUrl: string | null;
}

export interface DoctorScheduleResponse {
    id: number;
    doctorId: number;
    doctorName: string;
    workDate: string;
    startTime: string;
    endTime: string;
    createdAt: string;
    available: boolean;
}

export interface HealthPackageResponse {
    id: number;
    name: string;
    description: string;
    price: number;
    featureImageUrl: string | null;
    createdAt: string;
}

export interface HealthPackageScheduleResponse {
    id: number;
    healthPackageId: number;
    healthPackageName: string;
    workDate: string;
    startTime: string;
    endTime: string;
    createdAt: string;
}

export interface HealthPackageBookingRequest {
    patientId: number;
    healthPackageId: number;
    bookingDate: string;
    bookingTime: string;
    note?: string;
}

export interface HealthPackageBookingResponse {
    id: number;
    patientId: number;
    patientName: string;
    healthPackageId: number;
    healthPackageName: string;
    packagePrice: number;
    bookingDate: string;
    bookingTime: string;
    status: string;
    note: string | null;
    createdAt: string;
}

export interface AppointmentRequest {
    patientId: number;
    doctorId: number;
    serviceId?: number;
    scheduleId?: number;
    healthPackageId?: number;
    appointmentDate: string;
    appointmentTime: string;
    status?: string;
    note?: string;
}

export interface AppointmentResponse {
    id: number;
    patientId: number;
    patientName: string;
    doctorId: number;
    doctorName: string;
    serviceName: string | null;
    healthPackageName: string | null;
    appointmentDate: string;
    appointmentTime: string;
    status: string;
    note: string;
    createdAt: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    fullName: string;
    phone: string;
    dateOfBirth: string;
    gender: string;
    address: string;
}

export interface AuthResponse {
    userId: number;
    token: string;
    email: string;
    fullName: string;
    role: string;
}

export interface UserDetailResponse {
    id: number;
    email: string;
    fullName: string;
    phone: string;
    dateOfBirth: string | null;
    gender: string | null;
    address: string | null;
    roleName: string;
    status: string;
}

/**
 * HÀM: fetchUserById
 * MÔ TẢ: Lấy thông tin chi tiết của một người dùng theo ID (Dùng để hiển thị trang cá nhân).
 * Đòi hỏi Authorization token gửi kèm.
 */
export async function fetchUserById(id: number): Promise<UserDetailResponse> {
    const res = await fetch(`${API_BASE_URL}/api/users/${id}`, {
        cache: "no-store", // Không cache để luôn lấy thông tin cập nhật mới nhất
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Không thể lấy thông tin người dùng từ máy chủ");
    return res.json();
}

/**
 * HÀM: updateProfile
 * MÔ TẢ: Cập nhật thông tin cá nhân của Bệnh nhân (Họ tên, SĐT, Mật khẩu mới).
 * Tự động đăng xuất nếu Token hết hạn (nhận mã 401).
 */
export async function updateProfile(data: { fullName?: string; phone?: string; password?: string }): Promise<UserDetailResponse> {
    const res = await fetch(`${API_BASE_URL}/api/users/profile`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(data),
    });
    // Xử lý khi phiên đăng nhập bị hết hạn
    if (res.status === 401) {
        if (typeof window !== "undefined") {
            localStorage.removeItem("clinic_user");
            localStorage.removeItem("clinic_token");
            window.location.href = "/login?expired=true";
        }
        throw new Error("ERR_UNAUTHORIZED: Phiên đăng nhập đã hết hạn");
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Cập nhật thông tin thất bại");
    }
    return res.json();
}


// ─── Các Hàm Gọi API Nghiệp Vụ (API Functions) ─────────────────────────────────

/**
 * HÀM: getAuthHeaders
 * MÔ TẢ: Hàm trợ giúp tự động đọc JWT Token từ localStorage và đính kèm vào Header "Authorization: Bearer <Token>".
 * Hỗ trợ gộp thêm các Header tùy chỉnh khác.
 */
function getAuthHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = { ...customHeaders };
    if (typeof window !== "undefined") {
        try {
            const saved = localStorage.getItem("clinic_user");
            if (saved) {
                const user = JSON.parse(saved) as AuthResponse;
                if (user && user.token) {
                    headers["Authorization"] = `Bearer ${user.token}`;
                }
            }
        } catch (e) {
            console.error("Lỗi khi đọc token từ localStorage:", e);
        }
    }
    return headers;
}

/**
 * HÀM: getImageUrl
 * MÔ TẢ: Chuyển đổi một đường dẫn ảnh lưu ở backend thành URL hoàn chỉnh có chứa hostname.
 */
export function getImageUrl(url: string | null): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

/**
 * HÀM: fetchDoctors
 * MÔ TẢ: Lấy danh sách toàn bộ Bác sĩ hoặc tìm kiếm bác sĩ theo tên.
 */
export async function fetchDoctors(name?: string): Promise<DoctorResponse[]> {
    const query = name ? `?name=${encodeURIComponent(name)}` : '';
    const res = await fetch(`${API_BASE_URL}/api/doctors${query}`, {
        cache: "no-store",
    });
    if (!res.ok) throw new Error("Không thể tải danh sách bác sĩ");
    return res.json();
}

/**
 * HÀM: fetchDoctorById
 * MÔ TẢ: Lấy thông tin chi tiết của một bác sĩ cụ thể dựa trên ID bác sĩ.
 */
export async function fetchDoctorById(id: number): Promise<DoctorResponse> {
    const res = await fetch(`${API_BASE_URL}/api/doctors/${id}`, {
        cache: "no-store",
    });
    if (!res.ok) throw new Error("Không thể lấy thông tin bác sĩ");
    return res.json();
}

/**
 * HÀM: fetchDoctorSchedules
 * MÔ TẢ: Tải danh sách tất cả các ngày trực / lịch làm việc của một bác sĩ cụ thể.
 */
export async function fetchDoctorSchedules(doctorId: number): Promise<DoctorScheduleResponse[]> {
    const res = await fetch(`${API_BASE_URL}/api/doctors/${doctorId}/schedules`, {
        cache: "no-store",
    });
    if (!res.ok) throw new Error("Không thể tải lịch trực của bác sĩ");
    return res.json();
}

/**
 * HÀM: fetchAvailableSlots
 * MÔ TẢ: Lấy các khung giờ khám còn trống (available) của bác sĩ vào một ngày cụ thể.
 */
export async function fetchAvailableSlots(doctorId: number, date: string): Promise<DoctorScheduleResponse[]> {
    const res = await fetch(`${API_BASE_URL}/api/doctors/${doctorId}/available-slots?date=${date}`, {
        cache: "no-store",
    });
    if (!res.ok) throw new Error("Không thể tải các khung giờ trống");
    return res.json();
}

/**
 * HÀM: fetchClinicServices
 * MÔ TẢ: Lấy danh sách các Dịch vụ khám/chữa bệnh của phòng khám.
 */
export async function fetchClinicServices(): Promise<ClinicServiceResponse[]> {
    const res = await fetch(`${API_BASE_URL}/api/services`, {
        cache: "no-store",
    });
    if (!res.ok) throw new Error("Không thể tải danh sách dịch vụ y tế");
    return res.json();
}

/**
 * HÀM: fetchClinicServiceById
 * MÔ TẢ: Lấy thông tin chi tiết của một dịch vụ y tế theo ID.
 */
export async function fetchClinicServiceById(id: number): Promise<ClinicServiceResponse> {
    const res = await fetch(`${API_BASE_URL}/api/services/${id}`, {
        cache: "no-store",
    });
    if (!res.ok) throw new Error("Không thể lấy thông tin dịch vụ");
    return res.json();
}

/**
 * HÀM: fetchRooms
 * MÔ TẢ: Lấy danh sách phòng bệnh/phòng lưu trú hỗ trợ bệnh nhân nội trú.
 */
export async function fetchRooms(): Promise<RoomResponse[]> {
    const res = await fetch(`${API_BASE_URL}/api/rooms`, {
        cache: "no-store",
    });
    if (!res.ok) throw new Error("Không thể tải danh sách phòng lưu trú");
    return res.json();
}

/**
 * HÀM: createRoomBooking
 * MÔ TẢ: Đăng ký đặt phòng lưu trú cho bệnh nhân. Cần đính kèm JWT xác thực.
 */
export async function createRoomBooking(userId: number, request: RoomBookingRequest): Promise<RoomBookingResponse> {
    // Đảm bảo checkInDate và checkOutDate đúng định dạng LocalDateTime Java: yyyy-MM-ddTHH:mm:ss
    // Bỏ phần timezone (.000Z) vì backend dùng LocalDateTime không có timezone
    const sanitize = (dt: string) => {
        if (!dt) return dt;
        // Nếu đã có dạng ISO 8601 có Z thì cắt bỏ
        return dt.replace('Z', '').replace(/\.\d{3}$/, '').substring(0, 19);
    };
    const sanitizedRequest = {
        ...request,
        checkInDate: sanitize(request.checkInDate),
        checkOutDate: sanitize(request.checkOutDate),
    };
    const res = await fetch(`${API_BASE_URL}/api/room-bookings/${userId}`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(sanitizedRequest),
    });
    if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = "Đăng ký phòng lưu trú thất bại";
        try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || errorMessage;
        } catch {
            errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
    }
    return res.json();
}

/**
 * HÀM: fetchSpecializations
 * MÔ TẢ: Lấy danh sách toàn bộ các chuyên khoa của phòng khám (Khoa Nội, Khoa Nhi, Tim mạch...).
 */
export async function fetchSpecializations(): Promise<SpecializationResponse[]> {
    const res = await fetch(`${API_BASE_URL}/api/specializations`, {
        cache: "no-store",
    });
    if (!res.ok) throw new Error("Không thể tải danh sách chuyên khoa");
    return res.json();
}

/**
 * HÀM: fetchSpecializationById
 * MÔ TẢ: Lấy thông tin chi tiết một chuyên khoa theo ID.
 */
export async function fetchSpecializationById(id: number): Promise<SpecializationResponse> {
    const res = await fetch(`${API_BASE_URL}/api/specializations/${id}`, {
        cache: "no-store",
    });
    if (!res.ok) throw new Error("Không tìm thấy thông tin chuyên khoa");
    return res.json();
}

/**
 * HÀM: fetchDoctorsBySpecialization
 * MÔ TẢ: Lọc và trả về danh sách bác sĩ thuộc một chuyên khoa cụ thể.
 */
export async function fetchDoctorsBySpecialization(specializationName: string): Promise<DoctorResponse[]> {
    const allDoctors = await fetchDoctors();
    return allDoctors.filter(d => d.specializationName === specializationName);
}

/**
 * HÀM: fetchHealthPackages
 * MÔ TẢ: Lấy danh sách các Gói khám sức khỏe định kỳ toàn diện.
 */
export async function fetchHealthPackages(): Promise<HealthPackageResponse[]> {
    const res = await fetch(`${API_BASE_URL}/api/health-packages`, {
        cache: "no-store",
    });
    if (!res.ok) throw new Error("Không thể tải danh sách gói khám");
    return res.json();
}

/**
 * HÀM: fetchHealthPackageById
 * MÔ TẢ: Lấy chi tiết thông tin gói khám theo ID.
 */
export async function fetchHealthPackageById(id: number): Promise<HealthPackageResponse> {
    const res = await fetch(`${API_BASE_URL}/api/health-packages/${id}`, {
        cache: "no-store",
    });
    if (!res.ok) throw new Error("Không thể lấy thông tin gói khám");
    return res.json();
}

/**
 * HÀM: fetchHealthPackageSchedules
 * MÔ TẢ: Tải danh sách lịch khám hỗ trợ cho một gói khám sức khỏe cụ thể.
 */
export async function fetchHealthPackageSchedules(packageId: number): Promise<HealthPackageScheduleResponse[]> {
    const res = await fetch(`${API_BASE_URL}/api/health-packages/${packageId}/schedules`, {
        cache: "no-store",
    });
    if (!res.ok) throw new Error("Không thể tải lịch khám của gói");
    return res.json();
}

/**
 * HÀM: fetchAppointmentsBySchedule
 * MÔ TẢ: Lấy danh sách các lịch khám thuộc về một khung giờ trực cụ thể.
 */
export async function fetchAppointmentsBySchedule(scheduleId: number): Promise<AppointmentResponse[]> {
    const res = await fetch(`${API_BASE_URL}/api/appointments/by-schedule/${scheduleId}`, {
        cache: "no-store",
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Không thể tải lịch khám theo lịch biểu");
    return res.json();
}

/**
 * HÀM: createAppointment
 * MÔ TẢ: API tạo lịch hẹn khám trực tiếp tại cơ sở y tế (Core booking flow).
 */
export async function createAppointment(request: AppointmentRequest): Promise<AppointmentResponse> {
    const res = await fetch(`${API_BASE_URL}/api/appointments`, {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(request),
    });
    if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = "Đăng ký lịch khám thất bại";
        try {
            const errJson = JSON.parse(errorText);
            errorMessage = errJson.message || errorMessage;
        } catch {
            errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
    }
    return res.json();
}

/**
 * HÀM: login
 * MÔ TẢ: Gửi thông tin đăng nhập của người dùng.
 */
export async function login(request: LoginRequest): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });
    if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = "Đăng nhập thất bại";
        try {
            const errJson = JSON.parse(errorText);
            errorMessage = errJson.message || errorMessage;
        } catch {
            errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
    }
    return res.json();
}

/**
 * HÀM: register
 * MÔ TẢ: Đăng ký tài khoản bệnh nhân mới.
 */
export async function register(request: RegisterRequest): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
    });
    if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = "Đăng ký tài khoản thất bại";
        try {
            const errJson = JSON.parse(errorText);
            errorMessage = errJson.message || errorMessage;
        } catch {
            errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
    }
    return res.json();
}

/**
 * HÀM: forgotPassword
 * MÔ TẢ: Yêu cầu hệ thống tạo và gửi mã xác thực khôi phục mật khẩu vào Email.
 */
export async function forgotPassword(email: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
    });
    if (!res.ok) {
        if (res.status === 429) throw new Error("Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau.");
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Không thể thực hiện yêu cầu khôi phục");
    }
    return res.json();
}

/**
 * HÀM: resetPassword
 * MÔ TẢ: Xác thực OTP và ghi nhận mật khẩu mới thay thế mật khẩu cũ.
 */
export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Mã xác thực không hợp lệ hoặc đã hết hạn");
    }
    return res.json();
}

// ─── Hồ Sơ Bệnh Án & Bệnh Lịch ────────────────────────────────────────────────

export interface MedicalRecordResponse {
    id: number;
    appointmentId: number;
    doctorId: number;
    doctorName: string;
    patientName: string;
    diagnosis: string;
    conclusion: string;
    createdAt: string;
}

/**
 * HÀM: fetchMedicalRecordsByPatient
 * MÔ TẢ: Tải danh sách bệnh án của bệnh nhân theo ID (Yêu cầu xác thực Admin/Bác sĩ).
 */
export async function fetchMedicalRecordsByPatient(patientId: number): Promise<MedicalRecordResponse[]> {
    const res = await fetch(`${API_BASE_URL}/api/medical-records/by-patient/${patientId}`, {
        cache: "no-store",
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Không thể tải hồ sơ bệnh án");
    return res.json();
}

/**
 * HÀM: fetchMyMedicalRecords
 * MÔ TẢ: Bệnh nhân tự tải danh sách bệnh án cá nhân của mình.
 */
export async function fetchMyMedicalRecords(): Promise<MedicalRecordResponse[]> {
    const res = await fetch(`${API_BASE_URL}/api/medical-records/my-records`, {
        cache: "no-store",
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Không thể tải bệnh án cá nhân");
    return res.json();
}

/**
 * HÀM: fetchAppointmentsByPatient
 * MÔ TẢ: Tải danh sách các lịch khám trực tiếp mà bệnh nhân đã đặt.
 */
export async function fetchAppointmentsByPatient(patientId: number): Promise<AppointmentResponse[]> {
    const res = await fetch(`${API_BASE_URL}/api/appointments/by-patient/${patientId}`, {
        cache: "no-store",
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Không thể tải lịch sử lịch khám");
    return res.json();
}

/**
 * HÀM: fetchRoomBookingsByUser
 * MÔ TẢ: Tải lịch sử các lượt đặt phòng nội trú của bệnh nhân.
 */
export async function fetchRoomBookingsByUser(userId: number): Promise<RoomBookingResponse[]> {
    const res = await fetch(`${API_BASE_URL}/api/room-bookings/by-user/${userId}`, {
        cache: "no-store",
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Không thể tải lịch sử đặt phòng");
    return res.json();
}

/**
 * HÀM: cancelRoomBooking
 * MÔ TẢ: Hủy yêu cầu đặt phòng lưu trú kèm theo lý do hủy.
 */
export async function cancelRoomBooking(bookingId: number, userId: number, reason: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/room-bookings/${bookingId}/cancel/${userId}?reason=${encodeURIComponent(reason)}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
    });
    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Yêu cầu hủy đặt phòng thất bại");
    }
}

/**
 * HÀM: cancelAppointment
 * MÔ TẢ: Hủy lịch khám trực tiếp tại phòng khám kèm theo lý do hủy.
 */
export async function cancelAppointment(appointmentId: number, userId: number, reason: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/appointments/${appointmentId}/cancel/${userId}?reason=${encodeURIComponent(reason)}`, {
        method: "PUT",
        headers: getAuthHeaders(),
    });
    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Yêu cầu hủy lịch khám thất bại");
    }
}

// ─── Đơn Thuốc Y Tế ──────────────────────────────────────────────────────────

export interface PrescriptionItemResponse {
    id: number;
    medicineName: string;
    dosage: string;
    frequency: string;
    duration: string;
    note: string;
}

export interface PrescriptionResponse {
    id: number;
    medicalRecordId: number;
    doctorId: number;
    doctorName: string;
    createdAt: string;
    items: PrescriptionItemResponse[];
}

/**
 * HÀM: fetchPrescriptionsByPatient
 * MÔ TẢ: Tải toàn bộ danh sách đơn thuốc đã kê của một bệnh nhân.
 */
export async function fetchPrescriptionsByPatient(patientId: number): Promise<PrescriptionResponse[]> {
    const res = await fetch(`${API_BASE_URL}/api/prescriptions/patient/${patientId}`, {
        cache: "no-store",
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Không thể tải đơn thuốc y tế");
    return res.json();
}


// ─── Gói Khám Sức Khỏe (Health Package Booking) ───────────────────────────────

/**
 * HÀM: createHealthPackageBooking
 * MÔ TẢ: Gửi yêu cầu đăng ký khám một gói sức khỏe.
 */
export async function createHealthPackageBooking(
    request: HealthPackageBookingRequest
): Promise<HealthPackageBookingResponse> {
    const res = await fetch(`${API_BASE_URL}/api/health-package-bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(request),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Đặt lịch gói khám thất bại");
    }
    return res.json();
}

/**
 * HÀM: fetchHealthPackageBookingsByPatient
 * MÔ TẢ: Tải danh sách các gói khám bệnh mà bệnh nhân hiện tại đã đăng ký.
 */
export async function fetchHealthPackageBookingsByPatient(
    patientId: number
): Promise<HealthPackageBookingResponse[]> {
    const res = await fetch(`${API_BASE_URL}/api/health-package-bookings/patient/${patientId}`, {
        cache: "no-store",
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Không thể tải danh sách gói khám đã đặt");
    return res.json();
}

/**
 * HÀM: cancelHealthPackageBooking
 * MÔ TẢ: Hủy lịch hẹn của gói khám sức khỏe.
 */
export async function cancelHealthPackageBooking(
    id: number,
    patientId: number,
    reason: string
): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/health-package-bookings/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ patientId, reason }),
    });
    if (!res.ok) throw new Error("Hủy lịch gói khám thất bại");
}

// ─── Tư Vấn Trực Tuyến Qua Video Call (Online Consultation) ────────────────────

export interface OnlineConsultationRequest {
    patientId: number;
    doctorId: number;
    specializationId?: number;
    serviceId?: number;
    phoneNumber: string;
    amount: number;
    consultationDate?: string;
    consultationTime?: string;
}

export interface OnlineConsultationResponse {
    id: number;
    patientId: number;
    patientName: string;
    doctorId: number;
    doctorName: string;
    specializationName: string | null;
    serviceName: string | null;
    phoneNumber: string;
    amount: number;
    paymentStatus: "PENDING" | "PAID" | "CANCELLED";
    meetingLink: string | null;
    consultationDate: string | null;
    consultationTime: string | null;
    expiredAt: string;
    createdAt: string;
}

/**
 * HÀM: createOnlineConsultation
 * MÔ TẢ: Đăng ký tư vấn trực tuyến (Tạo yêu cầu và hóa đơn chờ thanh toán).
 */
export async function createOnlineConsultation(
    request: OnlineConsultationRequest
): Promise<OnlineConsultationResponse> {
    const res = await fetch(`${API_BASE_URL}/api/online-consultations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(request),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message || "Tạo đơn tư vấn thất bại");
    }
    return res.json();
}

/**
 * HÀM: fetchOnlineConsultationById
 * MÔ TẢ: Xem chi tiết đơn tư vấn trực tuyến theo ID (Để lấy thông tin link phòng họp).
 */
export async function fetchOnlineConsultationById(
    id: number,
    patientId?: number
): Promise<OnlineConsultationResponse> {
    const query = patientId ? `?patientId=${patientId}` : "";
    const res = await fetch(`${API_BASE_URL}/api/online-consultations/${id}${query}`, {
        cache: "no-store",
        headers: getAuthHeaders(),
    });
    if (res.status === 403) throw new Error("Bạn không có quyền xem thông tin tư vấn này");
    if (!res.ok) throw new Error("Không tìm thấy đơn tư vấn");
    return res.json();
}

/**
 * HÀM: fetchOnlineConsultationsByPatient
 * MÔ TẢ: Tải lịch sử tất cả các ca tư vấn online của bệnh nhân.
 */
export async function fetchOnlineConsultationsByPatient(
    patientId: number
): Promise<OnlineConsultationResponse[]> {
    const res = await fetch(`${API_BASE_URL}/api/online-consultations/patient/${patientId}`, {
        cache: "no-store",
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Không thể tải lịch sử tư vấn");
    return res.json();
}

/**
 * HÀM: fetchAllOnlineConsultations
 * MÔ TẢ: Lấy danh sách toàn bộ các yêu cầu tư vấn trực tuyến trên hệ thống (Dành cho Admin/Bác sĩ).
 */
export async function fetchAllOnlineConsultations(
    status?: string
): Promise<OnlineConsultationResponse[]> {
    const query = status ? `?status=${status}` : "";
    const res = await fetch(`${API_BASE_URL}/api/online-consultations${query}`, {
        cache: "no-store",
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Không thể tải danh sách tư vấn");
    return res.json();
}

/**
 * HÀM: approveOnlineConsultation
 * MÔ TẢ: Phê duyệt yêu cầu tư vấn online và đính kèm đường dẫn liên kết phòng họp (Google Meet/Zoom...).
 */
export async function approveOnlineConsultation(
    id: number,
    meetingLink: string
): Promise<OnlineConsultationResponse> {
    const res = await fetch(`${API_BASE_URL}/api/online-consultations/${id}/approve`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ meetingLink }),
    });
    if (!res.ok) throw new Error("Duyệt ca tư vấn online thất bại");
    return res.json();
}

/**
 * HÀM: cancelOnlineConsultation
 * MÔ TẢ: Hủy yêu cầu tư vấn online của bệnh nhân.
 */
export async function cancelOnlineConsultation(
    id: number,
    patientId: number
): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/online-consultations/${id}/cancel?patientId=${patientId}`, {
        method: "POST",
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Hủy đơn tư vấn thất bại");
}

/**
 * HÀM: fetchVnPayPaymentUrl
 * MÔ TẢ: Lấy đường dẫn cổng thanh toán VNPay cho đơn tư vấn trực tuyến.
 */
export async function fetchVnPayPaymentUrl(
    id: number
): Promise<{ paymentUrl: string }> {
    const res = await fetch(`${API_BASE_URL}/api/online-consultations/${id}/vnpay-payment-url`, {
        cache: "no-store",
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Không thể lấy liên kết thanh toán VNPay");
    return res.json();
}

/**
 * HÀM: verifyVnPayCallback
 * MÔ TẢ: Gửi tham số callback từ VNPay để backend kiểm tra chữ ký và cập nhật trạng thái đơn.
 */
export async function verifyVnPayCallback(
    queryParams: string
): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE_URL}/api/online-consultations/vnpay-callback${queryParams}`, {
        cache: "no-store",
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Không thể xác thực kết quả thanh toán từ máy chủ");
    return res.json();
}

// ─── Tạo mã VietQR tự động (VietQR Helper) ───────────────────────────────────

/**
 * HÀM: buildVietQRUrl
 * MÔ TẢ: Sinh đường dẫn mã QR động theo tiêu chuẩn VietQR (Qua cổng img.vietqr.io)
 * Giúp bệnh nhân chuyển khoản thanh toán trực tuyến nhanh chóng với thông tin ngân hàng và số tiền điền sẵn.
 */
export function buildVietQRUrl(params: {
    bankId: string;
    accountNo: string;
    accountName: string;
    amount: number;
    orderId: number;
}): string {
    const { bankId, accountNo, accountName, amount, orderId } = params;
    const addInfo = encodeURIComponent(`THANH TOAN ONLINE ${orderId}`);
    const encodedName = encodeURIComponent(accountName);
    return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.jpg?amount=${amount}&addInfo=${addInfo}&accountName=${encodedName}`;
}

export async function fetchBookedHealthPackageSlots(packageId: number, date: string): Promise<string[]> {
    const res = await fetch(`${API_BASE_URL}/api/health-package-bookings/booked-slots/${packageId}?date=${date}`, {
        method: "GET",
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Không thể tải danh sách khung giờ đã đặt");
    return res.json();
}

export async function fetchBookedOnlineConsultationSlots(doctorId: number, date: string): Promise<string[]> {
    const res = await fetch(`${API_BASE_URL}/api/online-consultations/booked-slots/${doctorId}?date=${date}`, {
        method: "GET",
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Không thể tải danh sách khung giờ đã đặt");
    return res.json();
}
