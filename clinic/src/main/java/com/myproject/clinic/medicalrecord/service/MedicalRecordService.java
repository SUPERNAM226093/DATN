package com.myproject.clinic.medicalrecord.service;

import com.myproject.clinic.entity.Appointment;
import com.myproject.clinic.entity.Doctor;
import com.myproject.clinic.entity.MedicalRecord;
import com.myproject.clinic.exception.ResourceNotFoundException;
import com.myproject.clinic.medicalrecord.dto.MedicalRecordRequest;
import com.myproject.clinic.medicalrecord.dto.MedicalRecordResponse;
import com.myproject.clinic.repository.AppointmentRepository;
import com.myproject.clinic.repository.DoctorRepository;
import com.myproject.clinic.repository.MedicalRecordRepository;
import com.myproject.clinic.repository.UserRepository;
import com.myproject.clinic.utils.EmailService;
import com.myproject.clinic.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class MedicalRecordService {

        private final MedicalRecordRepository medicalRecordRepository;
        private final AppointmentRepository appointmentRepository;
        private final DoctorRepository doctorRepository;
        private final UserRepository userRepository;
        private final EmailService emailService;
        private final SecurityUtils securityUtils;

        public List<MedicalRecordResponse> findAll() {
                if (securityUtils.hasGlobalDataAccess()) {
                        return medicalRecordRepository.findAll().stream().map(this::toResponse).toList();
                }
                // DOCTOR: chỉ được xem bệnh án của chính mình
                Doctor doctor = securityUtils.requireCurrentDoctor();
                return medicalRecordRepository.findByDoctorId(doctor.getId())
                                .stream().map(this::toResponse).toList();
        }

        public MedicalRecordResponse findById(Long id) {
                return medicalRecordRepository.findById(id)
                                .map(this::toResponse)
                                .orElseThrow(() -> new ResourceNotFoundException("Hồ sơ bệnh án", id));
        }

        /**
         * LOGIC: Lấy hồ sơ bệnh án của chính tôi (Dành cho Patient).
         * GIẢI THÍCH: Lấy email từ Security Context để truy vấn đúng bệnh nhân đang
         * đăng nhập.
         */
        public List<MedicalRecordResponse> findMyRecords() {
                String email = org.springframework.security.core.context.SecurityContextHolder.getContext()
                                .getAuthentication().getName();
                com.myproject.clinic.entity.User currentUser = userRepository.findByEmail(email)
                                .orElseThrow(() -> new ResourceNotFoundException("User", 0L));

                return medicalRecordRepository.findByAppointmentPatientId(currentUser.getId())
                                .stream().map(this::toResponse).toList();
        }

        /**
         * 1. Auto-inject Doctor ID: Hệ thống tự lấy ID bác sĩ từ phiên đăng nhập
         * (Session)
         * thay vì tin tưởng vào dữ liệu gửi từ Frontend (Để chống giả mạo - Spoofing).
         * 2. Ràng buộc: Bác sĩ chỉ được tạo bệnh án cho đúng lịch hẹn (Appointment) mà
         * họ phụ trách.
         */
        public MedicalRecordResponse create(MedicalRecordRequest request) {
                Appointment appointment = appointmentRepository.findById(request.getAppointmentId())
                                .orElseThrow(() -> new ResourceNotFoundException("Lịch hẹn",
                                                request.getAppointmentId()));

                // BẢO MẬT: Xác thực danh tính bác sĩ qua JWT Token
                Long resolvedDoctorId = securityUtils.resolveAndValidateDoctorId(request.getDoctorId());
                Doctor doctor = doctorRepository.findById(resolvedDoctorId)
                                .orElseThrow(() -> new ResourceNotFoundException("Bác sĩ", resolvedDoctorId));

                // KIỂM TRA QUYỀN: Một bác sĩ không thể chẩn đoán cho lịch hẹn của bác sĩ khác
                if (appointment.getDoctor() != null) {
                        securityUtils.assertDoctorOwnership("Lịch hẹn",
                                        appointment.getId(), appointment.getDoctor().getId());
                }

                MedicalRecord record = MedicalRecord.builder()
                                .appointment(appointment)
                                .doctor(doctor)
                                .diagnosis(request.getDiagnosis())
                                .conclusion(request.getConclusion())
                                .build();

                MedicalRecord savedRecord = medicalRecordRepository.save(record);

                // GỬI EMAIL: Tự động gửi nội dung chẩn đoán về email của bệnh nhân
                emailService.sendMedicalRecordEmail(savedRecord.getId());
                return toResponse(savedRecord);
        }

        public MedicalRecordResponse update(Long id, MedicalRecordRequest request) {
                MedicalRecord record = medicalRecordRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException("Hồ sơ bệnh án", id));

                // Ràng buộc bác sĩ phụ trách
                securityUtils.assertDoctorOwnership("MedicalRecord", id, record.getDoctor().getId());

                if (request.getDiagnosis() != null)
                        record.setDiagnosis(request.getDiagnosis());
                if (request.getConclusion() != null)
                        record.setConclusion(request.getConclusion());

                MedicalRecord savedRecord = medicalRecordRepository.save(record);
                // Gửi lại email cập nhật nếu có thay đổi chẩn đoán
                emailService.sendMedicalRecordEmail(savedRecord.getId());
                return toResponse(savedRecord);
        }

        public void delete(Long id) {
                MedicalRecord record = medicalRecordRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException("Hồ sơ bệnh án", id));
                medicalRecordRepository.delete(record);
        }

        public List<MedicalRecordResponse> findByPatientId(Long patientId) {
                return medicalRecordRepository.findByAppointmentPatientId(patientId)
                                .stream().map(this::toResponse).toList();
        }

        private MedicalRecordResponse toResponse(MedicalRecord r) {
                if (r == null)
                        return null;
                return MedicalRecordResponse.builder()
                                .id(r.getId())
                                .appointmentId(r.getAppointment() != null ? r.getAppointment().getId() : null)
                                .doctorName(r.getDoctor() != null && r.getDoctor().getUser() != null
                                                ? r.getDoctor().getUser().getFullName()
                                                : "N/A")
                                .patientName(r.getAppointment() != null && r.getAppointment().getPatient() != null
                                                ? r.getAppointment().getPatient().getFullName()
                                                : "N/A")
                                .diagnosis(r.getDiagnosis())
                                .conclusion(r.getConclusion())
                                .createdAt(r.getCreatedAt())
                                .build();
        }
}
