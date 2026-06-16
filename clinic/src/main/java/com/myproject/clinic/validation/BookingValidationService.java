package com.myproject.clinic.validation;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.myproject.clinic.repository.AppointmentRepository;
import com.myproject.clinic.repository.HealthPackageBookingRepository;
import com.myproject.clinic.repository.OnlineConsultationRepository;
import com.myproject.clinic.repository.RoomBookingRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class BookingValidationService {

    private final AppointmentRepository appointmentRepository;
    private final OnlineConsultationRepository consultationRepository;
    private final HealthPackageBookingRepository healthPackageRepository;
    private final RoomBookingRepository roomBookingRepository;
    private final List<String> IGNORED_STATUSES = List.of("CANCELLED", "REJECTED", "COMPLETED");

    /**
     * LOGIC 1: Kiểm tra sự sẵn sàng của Bệnh nhân trên TẤT CẢ các dịch vụ.
     */
    public void validatePatientAvailability(Long patientId, LocalDate date, LocalTime parsedTime) {

        boolean hasConflict = appointmentRepository.existsByPatientIdAndAppointmentDateAndAppointmentTimeAndStatusNotIn(
                patientId, date, parsedTime, IGNORED_STATUSES) ||
                consultationRepository.existsByPatientIdAndConsultationDateAndConsultationTimeAndPaymentStatusNotIn(
                        patientId, date, parsedTime.toString().substring(0, 5), IGNORED_STATUSES)
                ||
                healthPackageRepository.existsByPatientIdAndBookingDateAndBookingTimeAndStatusNotIn(
                        patientId, date, parsedTime, IGNORED_STATUSES);

        if (hasConflict) {
            // Nếu phát hiện bất kỳ bản ghi nào trùng khớp -> Ném lỗi 409 Conflict
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bạn đã có một lịch khám khác vào khung giờ này.");
        }
    }

    /**
     * LOGIC 2: Kiểm tra sự sẵn sàng của Bác sĩ.
     */
    public void validateDoctorAvailability(Long doctorId, LocalDate date, LocalTime parsedTime) {
        // Kiểm tra trong bảng lịch khám tại chỗ
        if (appointmentRepository.existsByDoctorIdAndAppointmentDateAndAppointmentTimeAndStatusNotIn(
                doctorId, date, parsedTime, IGNORED_STATUSES)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Bác sĩ hiện đã có lịch khám tại phòng vào khung giờ này.");
        }

        // Kiểm tra trong bảng tư vấn trực tuyến (Online)
        if (consultationRepository.existsByDoctorIdAndConsultationDateAndConsultationTimeAndPaymentStatusNotIn(
                doctorId, date, parsedTime.toString().substring(0, 5), IGNORED_STATUSES)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Bác sĩ đã có lịch tư vấn Video vào khung giờ này.");
        }
    }

    /**
     * LOGIC 3: Kiểm tra tính sẵn sàng của Phòng (Room Availability).
     */
    public void validateRoomAvailability(Long roomId, LocalDateTime checkIn, LocalDateTime checkOut) {
        // findFirstOverlappingBooking: Tìm bản ghi đầu tiên có thời gian giao thoa
        // trong DB
        com.myproject.clinic.entity.RoomBooking overlap = roomBookingRepository.findFirstOverlappingBooking(roomId,
                checkIn, checkOut, IGNORED_STATUSES);

        if (overlap != null) {
            String startStr = overlap.getCheckInDate().toLocalDate().toString();
            String endStr = overlap.getCheckOutDate().toLocalDate().toString();
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Phòng này hiện đã được đặt từ " + startStr + " đến " + endStr + ". Vui lòng chọn ngày khác.");
        }
    }

    /**
     * LOGIC 4: Kiểm tra sự sẵn sàng của Gói khám (Health Package).
     */
    public void validateHealthPackageAvailability(Long healthPackageId, LocalDate date, LocalTime parsedTime,
            Long currentBookingId, boolean isAppointmentFlow) {

        // Bước 1: Kiểm tra trong bảng Appointment (Lịch khám lẻ có gán gói)
        boolean existsInAppointments;
        if (isAppointmentFlow && currentBookingId != null) {
            // Khi Cập nhật (Update): Phải dùng `IdNot` để bỏ qua bản ghi hiện tại
            existsInAppointments = appointmentRepository
                    .existsByHealthPackageIdAndAppointmentDateAndAppointmentTimeAndStatusNotInAndIdNot(
                            healthPackageId, date, parsedTime, IGNORED_STATUSES, currentBookingId);
        } else {
            // Khi Tạo mới (Create)
            existsInAppointments = appointmentRepository
                    .existsByHealthPackageIdAndAppointmentDateAndAppointmentTimeAndStatusNotIn(
                            healthPackageId, date, parsedTime, IGNORED_STATUSES);
        }

        if (existsInAppointments) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Gói khám này đã đạt giới hạn đăng ký vào giờ đã chọn.");
        }

        // Bước 2: Kiểm tra tương tự trong bảng HealthPackageBooking (Đăng ký gói chuyên
        // sâu)
        boolean existsInBookings;
        if (!isAppointmentFlow && currentBookingId != null) {
            existsInBookings = healthPackageRepository
                    .existsByHealthPackageIdAndBookingDateAndBookingTimeAndStatusNotInAndIdNot(
                            healthPackageId, date, parsedTime, IGNORED_STATUSES, currentBookingId);
        } else {
            existsInBookings = healthPackageRepository
                    .existsByHealthPackageIdAndBookingDateAndBookingTimeAndStatusNotIn(
                            healthPackageId, date, parsedTime, IGNORED_STATUSES);
        }

        if (existsInBookings) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Khung giờ cho gói khám này hiện không còn trống.");
        }
    }

    /**
     * LOGIC 5: Kiểm tra Tư vấn trực tuyến (Online Consultation).
     * XỬ LÝ PHỨC TẠP: Cần kiểm tra chéo (Cross-check) cả phía Bệnh nhân và Bác sĩ.
     */
    public void validateOnlineConsultationAvailability(Long patientId, Long doctorId, LocalDate date,
            LocalTime parsedTime, Long currentConsultationId) {
        String timeStr = parsedTime.toString().substring(0, 5); // Chuyển định dạng giờ về HH:mm

        // 1. Kiểm tra xung đột phía Bệnh nhân (Chỉ trong bảng tư vấn Online)
        boolean patientConflict;
        if (currentConsultationId != null) {
            patientConflict = consultationRepository
                    .existsByPatientIdAndConsultationDateAndConsultationTimeAndPaymentStatusNotInAndIdNot(
                            patientId, date, timeStr, IGNORED_STATUSES, currentConsultationId);
        } else {
            patientConflict = consultationRepository
                    .existsByPatientIdAndConsultationDateAndConsultationTimeAndPaymentStatusNotIn(
                            patientId, date, timeStr, IGNORED_STATUSES);
        }

        if (patientConflict) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Bạn đang có một yêu cầu tư vấn Online khác cùng giờ.");
        }

        // 2. Kiểm tra xung đột phía Bác sĩ (Chỉ trong bảng tư vấn Online)
        boolean doctorConflict;
        if (currentConsultationId != null) {
            doctorConflict = consultationRepository
                    .existsByDoctorIdAndConsultationDateAndConsultationTimeAndPaymentStatusNotInAndIdNot(
                            doctorId, date, timeStr, IGNORED_STATUSES, currentConsultationId);
        } else {
            doctorConflict = consultationRepository
                    .existsByDoctorIdAndConsultationDateAndConsultationTimeAndPaymentStatusNotIn(
                            doctorId, date, timeStr, IGNORED_STATUSES);
        }

        if (doctorConflict) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Bác sĩ đã có lịch tư vấn trực tuyến với bệnh nhân khác.");
        }

        // Bác sĩ:
        if (appointmentRepository.existsByDoctorIdAndAppointmentDateAndAppointmentTimeAndStatusNotIn(
                doctorId, date, parsedTime, IGNORED_STATUSES)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Bác sĩ hiện đã có lịch khám tại phòng vào khung giờ này.");
        }

        // Bệnh nhân:
        if (appointmentRepository.existsByPatientIdAndAppointmentDateAndAppointmentTimeAndStatusNotIn(
                patientId, date, parsedTime, IGNORED_STATUSES) ||
                healthPackageRepository.existsByPatientIdAndBookingDateAndBookingTimeAndStatusNotIn(
                        patientId, date, parsedTime, IGNORED_STATUSES)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Bệnh nhân đã có một lịch khám khác vào khung giờ này.");
        }
    }

    public void validateMaxActiveAppointments(Long patientId) {
        long count = appointmentRepository.findByPatientId(patientId).stream()
                .filter(a -> !"CANCELLED".equals(a.getStatus()) && !"COMPLETED".equals(a.getStatus()))
                .count();
        if (count >= 3) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Bạn đã đạt giới hạn tối đa 3 lượt lịch hẹn khám đang chờ. Vui lòng chờ khám xong hoặc hủy bớt để đặt thêm.");
        }
    }

    public void validateMaxActiveHealthPackageBookings(Long patientId) {
        long count = healthPackageRepository.findByPatientIdOrderByCreatedAtDesc(patientId).stream()
                .filter(b -> !"CANCELLED".equals(b.getStatus()) && !"COMPLETED".equals(b.getStatus()))
                .count();
        if (count >= 3) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Bạn đã đạt giới hạn tối đa 3 lượt xét duyệt gói khám đang chờ. Vui lòng chờ khám xong hoặc hủy bớt để đặt thêm.");
        }
    }

    public void validateMaxActiveRoomBookings(Long patientId) {
        long count = roomBookingRepository.findByBookedById(patientId).stream()
                .filter(b -> !"CANCELLED".equals(b.getStatus()) && !"COMPLETED".equals(b.getStatus()))
                .count();
        if (count >= 3) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Bạn đã đạt giới hạn tối đa 3 lượt đặt chỗ ở đang hoạt động. Vui lòng chờ sử dụng xong hoặc hủy bớt để đặt thêm.");
        }
    }
}
