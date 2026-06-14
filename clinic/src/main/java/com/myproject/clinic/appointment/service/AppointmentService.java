package com.myproject.clinic.appointment.service;

import com.myproject.clinic.appointment.dto.AppointmentRequest;
import com.myproject.clinic.appointment.dto.AppointmentResponse;
import com.myproject.clinic.entity.*;
import com.myproject.clinic.exception.ResourceNotFoundException;
import com.myproject.clinic.repository.*;
import com.myproject.clinic.utils.EmailService;
import com.myproject.clinic.utils.SecurityUtils;
import com.myproject.clinic.validation.BookingValidationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;
    private final ClinicServiceRepository clinicServiceRepository;
    private final DoctorScheduleRepository scheduleRepository;
    private final HealthPackageRepository healthPackageRepository;
    private final EmailService emailService;
    private final BookingValidationService bookingValidationService;
    private final SecurityUtils securityUtils;

    public List<AppointmentResponse> findAll() {
        if (securityUtils.hasGlobalDataAccess()) {
            return appointmentRepository.findAll().stream().map(this::toResponse).toList();
        }
        Doctor doctor = securityUtils.requireCurrentDoctor();
        return appointmentRepository.findByDoctorId(doctor.getId())
                .stream().map(this::toResponse).toList();
    }

    public AppointmentResponse findById(Long id) {
        return appointmentRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Lịch hẹn", id));
    }

    /**
     * LOGIC: Tạo mới lịch hẹn.
     * XỬ LÝ KHÓ: Tích hợp Validation Service để kiểm tra xung đột trước khi lưu.
     * Quy trình: Kiểm tra User tồn tại -> Kiểm tra Doctor tồn tại -> VALIDATE xung
     * đột giờ -> Lưu DB.
     */
    @Transactional
    public AppointmentResponse create(AppointmentRequest request) {
        User patient = userRepository.findById(request.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Bệnh nhân", request.getPatientId()));

        Doctor doctor = null;
        if (request.getDoctorId() != null) {
            // SỬ DỤNG PESSIMISTIC LOCK: Khóa bản ghi Bác sĩ này lại.
            // Nếu có user khác cũng đang cố đặt lịch bác sĩ này, họ sẽ phải chờ
            doctor = doctorRepository.findByIdForUpdate(request.getDoctorId())
                    .orElseThrow(() -> new ResourceNotFoundException("Bác sĩ", request.getDoctorId()));
            if (!"ACTIVE".equals(doctor.getUser().getStatus())) {
                throw new IllegalArgumentException("Không thể đặt lịch hẹn với bác sĩ đã ngưng hoạt động.");
            }
        } else if (request.getHealthPackageId() != null) {
            doctor = doctorRepository.findAll().stream()
                    .filter(d -> "ACTIVE".equals(d.getUser().getStatus()))
                    .findFirst().orElse(null);
        }
        bookingValidationService.validateMaxActiveAppointments(request.getPatientId());

        bookingValidationService.validatePatientAvailability(request.getPatientId(), request.getAppointmentDate(),
                request.getAppointmentTime());

        // 2. Kiểm tra Bác sĩ có đang bận vào giờ đó không
        if (doctor != null && request.getHealthPackageId() == null) {
            bookingValidationService.validateDoctorAvailability(doctor.getId(), request.getAppointmentDate(),
                    request.getAppointmentTime());
        }
        if (request.getHealthPackageId() != null) {
            bookingValidationService.validateHealthPackageAvailability(
                    request.getHealthPackageId(),
                    request.getAppointmentDate(),
                    request.getAppointmentTime(),
                    null,
                    true);
        }

        Appointment appointment = Appointment.builder()
                .patient(patient)
                .doctor(doctor)
                .appointmentDate(request.getAppointmentDate())
                .appointmentTime(request.getAppointmentTime())
                .status(request.getStatus() != null ? request.getStatus() : "PENDING")
                .note(request.getNote())
                .build();

        return toResponse(appointmentRepository.save(appointment));
    }

    /**
     * LOGIC: Cập nhật thông tin lịch hẹn.
     * XỬ LÝ: Tự động gửi Email thông báo nếu trạng thái chuyển sang CONFIRMED hoặc
     * COMPLETED.
     */
    @Transactional
    public AppointmentResponse update(Long id, AppointmentRequest request) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lịch hẹn", id));

        // Ràng buộc bảo mật: Bác sĩ chỉ được sửa lịch của mình
        if (appointment.getDoctor() != null) {
            securityUtils.assertDoctorOwnership("Appointment", id, appointment.getDoctor().getId());
        }

        // Nếu thay đổi ngày giờ, phải Validate lại tính sẵn sàng
        if (appointment.getHealthPackage() != null
                && (request.getAppointmentDate() != null || request.getAppointmentTime() != null)) {
            bookingValidationService.validateHealthPackageAvailability(
                    appointment.getHealthPackage().getId(),
                    request.getAppointmentDate() != null ? request.getAppointmentDate()
                            : appointment.getAppointmentDate(),
                    request.getAppointmentTime() != null ? request.getAppointmentTime()
                            : appointment.getAppointmentTime(),
                    appointment.getId(),
                    true);
        }

        if (request.getStatus() != null)
            appointment.setStatus(request.getStatus());
        if (request.getNote() != null)
            appointment.setNote(request.getNote());

        Appointment savedAppointment = appointmentRepository.save(appointment);

        // GỬI EMAIL TỰ ĐỘNG: Thông báo cho bệnh nhân biết lịch đã được xác nhận hoặc đã
        // hoàn thành
        if ("CONFIRMED".equalsIgnoreCase(savedAppointment.getStatus())
                || "COMPLETED".equalsIgnoreCase(savedAppointment.getStatus())) {
            emailService.sendAppointmentStatusEmail(savedAppointment.getId());
        }
        return toResponse(savedAppointment);
    }

    /**
     * LOGIC: Hủy lịch hẹn từ phía Bệnh nhân.
     * XỬ LÝ: Không cho phép hủy nếu lịch đã hoàn thành hoặc đã bị hủy trước đó.
     * Lưu lại lý do hủy vào phần ghi chú (Note).
     */
    @Transactional
    public void cancel(Long id, Long patientId, String reason) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lịch hẹn", id));

        // Kiểm tra quyền: Chỉ chính chủ bệnh nhân mới được hủy
        if (!appointment.getPatient().getId().equals(patientId)) {
            throw new RuntimeException("Bạn không có quyền hủy lịch hẹn này.");
        }

        if ("CANCELLED".equals(appointment.getStatus()) || "COMPLETED".equals(appointment.getStatus())) {
            throw new RuntimeException("Không thể hủy lịch hẹn đã hoàn thành hoặc đã hủy.");
        }

        appointment.setStatus("CANCELLED");
        String currentNote = appointment.getNote() != null ? appointment.getNote() : "";
        // Nối thêm lý do hủy vào ghi chú hiện tại
        appointment.setNote(currentNote + (currentNote.isEmpty() ? "" : " | ") + "Lý do hủy: " + reason);

        appointmentRepository.save(appointment);
    }

    public void delete(Long id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Lịch hẹn", id));
        appointmentRepository.delete(appointment);
    }

    public List<AppointmentResponse> findByScheduleId(Long scheduleId) {
        return appointmentRepository.findByScheduleId(scheduleId)
                .stream().map(this::toResponse).toList();
    }

    public List<AppointmentResponse> findByPatientId(Long patientId) {
        return appointmentRepository.findByPatientId(patientId)
                .stream().map(this::toResponse).toList();
    }

    /**
     * MAPPING: Chuyển đổi Entity sang Response DTO để trả về Frontend.
     * Đảm bảo không trả về các thông tin nhạy cảm của hệ thống.
     */
    private AppointmentResponse toResponse(Appointment a) {
        return AppointmentResponse.builder()
                .id(a.getId())
                .patientId(a.getPatient().getId())
                .patientName(a.getPatient().getFullName())
                .doctorId(a.getDoctor() != null ? a.getDoctor().getId() : null)
                // Nếu không có bác sĩ (khám tại phòng khám chung), hiển thị tên Cơ sở
                .doctorName(a.getDoctor() != null ? a.getDoctor().getUser().getFullName() : "Cơ sở y tế")
                .appointmentDate(a.getAppointmentDate())
                .appointmentTime(a.getAppointmentTime())
                .status(a.getStatus())
                .note(a.getNote())
                .createdAt(a.getCreatedAt())
                .build();
    }
}
