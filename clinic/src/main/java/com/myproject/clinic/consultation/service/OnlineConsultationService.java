package com.myproject.clinic.consultation.service;

import com.myproject.clinic.consultation.dto.*;
import com.myproject.clinic.entity.*;
import com.myproject.clinic.exception.ResourceNotFoundException;
import com.myproject.clinic.repository.*;
import com.myproject.clinic.utils.SecurityUtils;
import com.myproject.clinic.utils.VnPayService;
import com.myproject.clinic.validation.BookingValidationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import java.util.Map;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class OnlineConsultationService {

    private final OnlineConsultationRepository consultationRepository;
    private final UserRepository userRepository;
    private final DoctorRepository doctorRepository;
    private final ClinicServiceRepository serviceRepository;
    private final SpecializationRepository specializationRepository;
    private final BookingValidationService bookingValidationService;
    private final SecurityUtils securityUtils;
    private final com.myproject.clinic.repository.AppointmentRepository appointmentRepository;
    private final VnPayService vnPayService;

    /**
     * LOGIC: Khởi tạo đơn đăng ký tư vấn trực tuyến.
     * GIẢI THÍCH: Khi bệnh nhân chọn bác sĩ và khung giờ Video Call.
     * XỬ LÝ: Hệ thống tự động đặt trạng thái là PENDING và thiết lập thời gian hết
     * hạn là 15 phút.
     * CẬP NHẬT: Thêm @Transactional và Pessimistic Lock trên entity Doctor để chống
     * Race Condition (Trùng lịch).
     */
    @Transactional
    public OnlineConsultationResponse create(OnlineConsultationRequest req) {
        User patient = userRepository.findById(req.getPatientId())
                .orElseThrow(() -> new ResourceNotFoundException("Bệnh nhân", req.getPatientId()));

        // Dùng Pessimistic Lock để khóa hàng Bác sĩ lại trong DB
        // User thứ 2 bấm cùng lúc (1 mili giây sau) sẽ phải chờ User 1 xử lý xong
        Doctor doctor = doctorRepository.findByIdForUpdate(req.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Bác sĩ", req.getDoctorId()));

        if (!"ACTIVE".equals(doctor.getUser().getStatus())) {
            throw new IllegalArgumentException("Không thể đặt lịch tư vấn với bác sĩ đã ngưng hoạt động.");
        }

        Specialization specialization = null;
        if (req.getSpecializationId() != null) {
            specialization = specializationRepository.findById(req.getSpecializationId())
                    .orElseThrow(() -> new ResourceNotFoundException("Specialization", req.getSpecializationId()));
        }

        ClinicService service = null;
        if (req.getServiceId() != null) {
            service = serviceRepository.findById(req.getServiceId())
                    .orElseThrow(() -> new ResourceNotFoundException("Service", req.getServiceId()));
        }

        LocalDate consultationDate = req.getConsultationDate() != null && !req.getConsultationDate().isBlank()
                ? LocalDate.parse(req.getConsultationDate())
                : null;

        // KIỂM TRA XUNG ĐỘT GIỜ: Đảm bảo cả bác sĩ và bệnh nhân đều rảnh vào giờ này
        if (consultationDate != null && req.getConsultationTime() != null) {
            LocalTime parsedTime = LocalTime.parse(req.getConsultationTime());
            bookingValidationService.validateOnlineConsultationAvailability(patient.getId(), doctor.getId(),
                    consultationDate, parsedTime, null);
        }

        OnlineConsultation consultation = OnlineConsultation.builder()
                .patient(patient)
                .doctor(doctor)
                .specialization(specialization)
                .service(service)
                .phoneNumber(req.getPhoneNumber())
                .amount(req.getAmount())
                .paymentStatus("PENDING")
                .consultationDate(consultationDate)
                .consultationTime(req.getConsultationTime())
                // QUAN TRỌNG: Thiết lập thời hạn thanh toán là 15 phút kể từ lúc tạo đơn
                .expiredAt(LocalDateTime.now().plusMinutes(15))
                .build();

        return toResponse(consultationRepository.save(consultation));
    }

    public OnlineConsultationResponse getById(Long id, Long patientId) {
        OnlineConsultation c = consultationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn tư vấn", id));
        if (patientId != null && !c.getPatient().getId().equals(patientId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền truy cập đơn này.");
        }
        return toResponse(c);
    }

    public List<OnlineConsultationResponse> getByPatientId(Long patientId) {
        return consultationRepository.findByPatientIdOrderByCreatedAtDesc(patientId)
                .stream().map(this::toResponse).toList();
    }

    /**
     * LOGIC: Lấy danh sách tư vấn trực tuyến (Có bộ lọc).
     * XỬ LÝ PHÂN QUYỀN:
     * - ADMIN / STAFF (đã được cấp quyền): Trả về toàn bộ đơn tư vấn, có thể lọc
     * theo status/doctorId.
     * - DOCTOR: Tự động giới hạn về đúng doctorId của chính họ (bỏ qua tham số
     * doctorId từ request).
     */
    public List<OnlineConsultationResponse> getAllFiltered(String status, Long doctorId) {
        List<OnlineConsultation> list;

        if (securityUtils.hasGlobalDataAccess()) {
            // ADMIN/STAFF: lấy tất cả, có thể filter thêm theo status và doctorId tùy chọn
            if (status != null && !status.isBlank()) {
                list = consultationRepository.findByPaymentStatusOrderByCreatedAtDesc(status);
            } else {
                list = consultationRepository.findAll();
            }
            // Áp dụng filter doctorId nếu Admin muốn lọc theo bác sĩ cụ thể
            if (doctorId != null) {
                list = list.stream()
                        .filter(c -> c.getDoctor().getId().equals(doctorId))
                        .toList();
            }
        } else {
            // DOCTOR: chỉ được thấy đơn của chính mình, bỏ qua tham số doctorId từ request
            Doctor currentDoctor = securityUtils.requireCurrentDoctor();
            Long myDoctorId = currentDoctor.getId();
            if (status != null && !status.isBlank()) {
                list = consultationRepository.findByPaymentStatusOrderByCreatedAtDesc(status);
            } else {
                list = consultationRepository.findAll();
            }
            list = list.stream()
                    .filter(c -> c.getDoctor().getId().equals(myDoctorId))
                    .toList();
        }

        return list.stream().map(this::toResponse).toList();
    }

    public List<String> getBookedSlots(Long doctorId, LocalDate date) {
        List<String> activeStatuses = List.of("PENDING", "CONFIRMED", "EXAMINING", "COMPLETED");
        List<String> activeOnlineStatuses = List.of("PENDING", "PAID", "CONFIRMED", "COMPLETED");

        List<String> bookedOfflineTimes = appointmentRepository.findByDoctorId(doctorId).stream()
                .filter(a -> a.getAppointmentDate().equals(date) && activeStatuses.contains(a.getStatus()))
                .map(a -> a.getAppointmentTime().toString().substring(0, 5))
                .toList();

        List<String> bookedOnlineTimes = consultationRepository.findByDoctorId(doctorId).stream()
                .filter(c -> c.getConsultationDate() != null && c.getConsultationDate().equals(date)
                        && activeOnlineStatuses.contains(c.getPaymentStatus()))
                .map(OnlineConsultation::getConsultationTime)
                .toList();

        java.util.Set<String> allBooked = new java.util.HashSet<>();
        allBooked.addAll(bookedOfflineTimes);
        allBooked.addAll(bookedOnlineTimes);
        return new java.util.ArrayList<>(allBooked);
    }

    @Transactional
    public OnlineConsultationResponse approve(Long id, ApproveConsultationRequest req) {
        OnlineConsultation c = consultationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn tư vấn", id));

        c.setPaymentStatus("PAID");
        // Cấp đường dẫn phòng họp (Zoom/Meet/Zalo) để bệnh nhân có thể truy cập
        c.setMeetingLink(req.getMeetingLink());
        return toResponse(consultationRepository.save(c));
    }

    /**
     * LOGIC: Cập nhật thông tin đơn tư vấn.
     * XỬ LÝ PHỨC TẠP: Khi Admin thay đổi giờ khám hoặc đổi bác sĩ điều phối.
     */
    @Transactional
    public OnlineConsultationResponse update(Long id, OnlineConsultationRequest req) {
        OnlineConsultation c = consultationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn tư vấn", id));

        // Ràng buộc bảo mật: Bác sĩ chỉ được cập nhật đơn của chính mình
        securityUtils.assertDoctorOwnership("OnlineConsultation", id, c.getDoctor().getId());

        if (req.getDoctorId() != null) {
            // Khi đổi bác sĩ cũng cần lock bác sĩ mới để chống race condition
            Doctor doctor = doctorRepository.findByIdForUpdate(req.getDoctorId())
                    .orElseThrow(() -> new ResourceNotFoundException("Bác sĩ", req.getDoctorId()));
            c.setDoctor(doctor);
        }

        if (req.getSpecializationId() != null) {
            Specialization specialization = specializationRepository.findById(req.getSpecializationId())
                    .orElseThrow(() -> new ResourceNotFoundException("Specialization", req.getSpecializationId()));
            c.setSpecialization(specialization);
        }

        if (req.getServiceId() != null) {
            ClinicService service = serviceRepository.findById(req.getServiceId())
                    .orElseThrow(() -> new ResourceNotFoundException("Service", req.getServiceId()));
            c.setService(service);
        }

        // Cập nhật các thông tin khác...
        if (req.getPaymentStatus() != null)
            c.setPaymentStatus(req.getPaymentStatus());
        if (req.getMeetingLink() != null)
            c.setMeetingLink(req.getMeetingLink());

        if (req.getConsultationDate() != null && !req.getConsultationDate().isBlank()) {
            c.setConsultationDate(LocalDate.parse(req.getConsultationDate()));
        }

        if (req.getConsultationTime() != null && !req.getConsultationTime().isBlank()) {
            c.setConsultationTime(req.getConsultationTime());
        }

        // Đã gỡ bỏ logic check trùng lịch khi Admin cập nhật theo yêu cầu,
        // chỉ giữ lại kiểm tra ở phía Client (hàm create).

        return toResponse(consultationRepository.save(c));
    }

    @Transactional
    public void cancel(Long id, Long patientId) {
        OnlineConsultation c = consultationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn tư vấn", id));
        if (!c.getPatient().getId().equals(patientId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền hủy đơn này.");
        }
        c.setPaymentStatus("CANCELLED");
        consultationRepository.save(c);
    }

    public void delete(Long id) {
        OnlineConsultation c = consultationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn tư vấn", id));
        consultationRepository.delete(c);
    }

    /**
     * TÍNH NĂNG TỰ ĐỘNG (Scheduler): Tự động hủy các đơn chưa thanh toán.
     * CƠ CHẾ: Cứ mỗi 1 phút, hệ thống sẽ quét các đơn PENDING đã quá hạn 15 phút chưa
     * thanh toán.
     * GIẢI THÍCH: Giúp giải phóng khung giờ bận cho bác sĩ để người khác có thể
     * đặt.
     */
    @Scheduled(fixedRate = 60_000)
    public void cancelExpiredConsultations() {
        // Gọi xuống Repository để cập nhật trạng thái CANCELLED hàng loạt bằng 1 câu
        int count = consultationRepository.cancelExpiredConsultations(LocalDateTime.now());
        if (count > 0) {
            log.info("[HỆ THỐNG] Đã tự động hủy {} đơn tư vấn hết hạn thanh toán.", count);
        }
    }

    private OnlineConsultationResponse toResponse(OnlineConsultation c) {
        return OnlineConsultationResponse.builder()
                .id(c.getId())
                .patientId(c.getPatient().getId())
                .patientName(c.getPatient().getFullName())
                .doctorId(c.getDoctor().getId())
                .doctorName(c.getDoctor().getUser() != null ? c.getDoctor().getUser().getFullName() : "N/A")
                .specializationName(c.getSpecialization() != null ? c.getSpecialization().getName() : null)
                .serviceName(c.getService() != null ? c.getService().getName() : null)
                .phoneNumber(c.getPhoneNumber())
                .amount(c.getAmount())
                .paymentStatus(c.getPaymentStatus())
                .meetingLink(c.getMeetingLink())
                .consultationDate(c.getConsultationDate() != null ? c.getConsultationDate().toString() : null)
                .consultationTime(c.getConsultationTime())
                .expiredAt(c.getExpiredAt())
                .createdAt(c.getCreatedAt())
                .build();
    }

    /**
     * Kiểm tra đơn tư vấn còn PENDING rồi tạo URL thanh toán VNPay.
     * ID đơn được truyền sang VNPay qua vnp_TxnRef để callback có thể tìm lại đúng
     * bản ghi.
     */
    @Transactional
    public String createVnPayPaymentUrl(Long id, String ipAddr) {
        OnlineConsultation c = consultationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Đơn tư vấn", id));
        if (!"PENDING".equals(c.getPaymentStatus())) {
            throw new IllegalArgumentException("Đơn tư vấn không ở trạng thái chờ thanh toán.");
        }
        return vnPayService.createPaymentUrl(c.getAmount().longValue(), String.valueOf(c.getId()), ipAddr);
    }

    /**
     * Xử lý callback VNPay sau thanh toán: xác thực chữ ký, lấy mã đơn từ
     * vnp_TxnRef,
     * kiểm tra vnp_ResponseCode và cập nhật trạng thái đơn sang PAID nếu giao dịch
     * thành công.
     */
    @Transactional
    public boolean processVnPayCallback(Map<String, String> params) {
        boolean isValidHash = vnPayService.verifyCallback(params);
        if (!isValidHash) {
            log.error("[VNPay Callback] Chữ ký hash không hợp lệ.");
            return false;
        }

        String responseCode = params.get("vnp_ResponseCode");
        String txnRef = params.get("vnp_TxnRef");
        if (txnRef == null) {
            log.error("[VNPay Callback] Không tìm thấy mã tham chiếu vnp_TxnRef.");
            return false;
        }

        Long consultationId = Long.parseLong(txnRef);
        OnlineConsultation c = consultationRepository.findById(consultationId).orElse(null);
        if (c == null) {
            log.error("[VNPay Callback] Không tìm thấy đơn tư vấn ID: {}", consultationId);
            return false;
        }

        if ("00".equals(responseCode)) {
            c.setPaymentStatus("PAID");
            if (c.getMeetingLink() == null || c.getMeetingLink().isBlank()) {
                c.setMeetingLink("https://meet.google.com/xvy-test-meet");
            }
            consultationRepository.save(c);
            log.info("[VNPay Callback] Thanh toán thành công cho đơn tư vấn ID: {}", consultationId);
            return true;
        } else {
            log.warn("[VNPay Callback] Giao dịch thất bại với mã lỗi: {} cho đơn tư vấn ID: {}", responseCode,
                    consultationId);
            return false;
        }
    }
}
