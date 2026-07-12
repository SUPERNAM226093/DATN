package com.myproject.clinic.utils;

import com.myproject.clinic.entity.Appointment;
import com.myproject.clinic.entity.MedicalRecord;
import com.myproject.clinic.entity.Prescription;
import com.myproject.clinic.entity.User;
import com.myproject.clinic.repository.AppointmentRepository;
import com.myproject.clinic.repository.MedicalRecordRepository;
import com.myproject.clinic.repository.PrescriptionRepository;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender javaMailSender;
    private final AppointmentRepository appointmentRepository;
    private final MedicalRecordRepository medicalRecordRepository;
    private final PrescriptionRepository prescriptionRepository;

    @org.springframework.beans.factory.annotation.Value("${spring.mail.username}")
    private String fromEmail;

    @Async
    @Transactional
    public void sendAppointmentStatusEmail(Long appointmentId) {
        Appointment appointment = appointmentRepository.findById(appointmentId).orElse(null);
        if (appointment == null || appointment.getPatient() == null)
            return;
        User patient = appointment.getPatient();
        String to = patient.getEmail();
        String subject = "Biến động trạng thái cuộc hẹn của bạn - Clinic System";

        String dateStr = appointment.getAppointmentDate() != null ? appointment.getAppointmentDate().toString()
                : "Chưa cập nhật";
        String timeStr = appointment.getAppointmentTime() != null ? appointment.getAppointmentTime().toString()
                : "Chưa cập nhật";
        String noteStr = appointment.getNote() != null ? appointment.getNote() : "Không có";

        String htmlContent = String.format(
                "<html><head><style>" +
                        "body { font-family: Arial, sans-serif; background-color: #f7f9fc; padding: 20px; }" +
                        ".container { background-color: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 600px; margin: auto; }"
                        +
                        "h2 { color: #0056b3; }" +
                        ".label { font-weight: bold; color: #555; }" +
                        ".value { color: #000; margin-bottom: 10px; }" +
                        ".footer { margin-top: 30px; font-size: 12px; color: #999; text-align: center; border-top: 1px solid #ddd; padding-top: 10px; }"
                        +
                        "</style></head><body>" +
                        "<div class='container'>" +
                        "<h2>Thông báo cập nhật lịch khám</h2>" +
                        "<p>Xin chào <b>%s</b>,</p>" +
                        "<p>Lịch khám của bạn đã được cập nhật trạng thái mới.</p>" +
                        "<div><span class='label'>Bác sĩ: </span><span class='value'>%s</span></div>" +
                        "<div><span class='label'>Ngày khám: </span><span class='value'>%s</span></div>" +
                        "<div><span class='label'>Giờ khám: </span><span class='value'>%s</span></div>" +
                        "<div><span class='label'>Trạng thái: </span><span class='value' style='color: #28a745; font-weight: bold;'>%s</span></div>"
                        +
                        "<div><span class='label'>Ghi chú: </span><span class='value'>%s</span></div>" +
                        "<p>Cảm ơn bạn đã tin tưởng phòng khám của chúng tôi!</p>" +
                        "<div class='footer'>Đây là email tự động, vui lòng không trả lời.</div>" +
                        "</div></body></html>",
                patient.getFullName(),
                appointment.getDoctor().getUser().getFullName(),
                dateStr,
                timeStr,
                appointment.getStatus(),
                noteStr);
        sendHtmlEmail(to, subject, htmlContent);
    }

    @Async
    @Transactional
    public void sendMedicalRecordEmail(Long recordId) {
        MedicalRecord record = medicalRecordRepository.findById(recordId).orElse(null);
        if (record == null || record.getAppointment() == null)
            return;
        User patient = record.getAppointment().getPatient();
        String to = patient.getEmail();
        String subject = "Thông báo: Hồ sơ bệnh án mới / cập nhật - Clinic System";

        String htmlContent = String.format(
                "<html><head><style>" +
                        "body { font-family: Arial, sans-serif; background-color: #f7f9fc; padding: 20px; }" +
                        ".container { background-color: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 600px; margin: auto; }"
                        +
                        "h2 { color: #0056b3; }" +
                        ".label { font-weight: bold; color: #555; }" +
                        ".value { color: #000; margin-bottom: 10px; }" +
                        ".footer { margin-top: 30px; font-size: 12px; color: #999; text-align: center; border-top: 1px solid #ddd; padding-top: 10px; }"
                        +
                        "</style></head><body>" +
                        "<div class='container'>" +
                        "<h2>Hồ sơ bệnh án của bạn</h2>" +
                        "<p>Xin chào <b>%s</b>,</p>" +
                        "<p>Hồ sơ bệnh án của bạn đã được ghi nhận hoặc cập nhật.</p>" +
                        "<div><span class='label'>Bác sĩ khám: </span><span class='value'>%s</span></div>" +
                        "<div><span class='label'>Chẩn đoán: </span><span class='value'>%s</span></div>" +
                        "<div><span class='label'>Kết luận: </span><span class='value'>%s</span></div>" +
                        "<div class='footer'>Cảm ơn bạn đã thăm khám tại Clinic.</div>" +
                        "</div></body></html>",
                patient.getFullName(),
                record.getDoctor().getUser().getFullName(),
                record.getDiagnosis(),
                record.getConclusion());
        sendHtmlEmail(to, subject, htmlContent);
    }

    @Async
    @Transactional
    public void sendPrescriptionEmail(Long prescriptionId) {
        Prescription prescription = prescriptionRepository.findById(prescriptionId).orElse(null);
        if (prescription == null || prescription.getMedicalRecord() == null)
            return;
        User patient = prescription.getMedicalRecord().getAppointment().getPatient();
        String to = patient.getEmail();
        String subject = "Thông báo: Đơn thuốc mới / cập nhật - Clinic System";

        String htmlContent = String.format(
                "<html><head><style>" +
                        "body { font-family: Arial, sans-serif; background-color: #f7f9fc; padding: 20px; }" +
                        ".container { background-color: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 600px; margin: auto; }"
                        +
                        "h2 { color: #0056b3; }" +
                        ".label { font-weight: bold; color: #555; }" +
                        ".value { color: #000; margin-bottom: 10px; }" +
                        ".footer { margin-top: 30px; font-size: 12px; color: #999; text-align: center; border-top: 1px solid #ddd; padding-top: 10px; }"
                        +
                        "</style></head><body>" +
                        "<div class='container'>" +
                        "<h2>Đơn thuốc của bạn</h2>" +
                        "<p>Xin chào <b>%s</b>,</p>" +
                        "<p>Bác sĩ <b>%s</b> đã kê cho bạn một đơn thuốc mới hoặc vừa có cập nhật.</p>" +
                        "<p>Vui lòng đăng nhập vào hệ thống để xem chi tiết các loại thuốc và liều lượng.</p>" +
                        "<div class='footer'>Cảm ơn bạn đã thăm khám tại Clinic.</div>" +
                        "</div></body></html>",
                patient.getFullName(),
                prescription.getDoctor().getUser().getFullName());
        sendHtmlEmail(to, subject, htmlContent);
    }

    // KHÔNG @Async để exception SMTP được bubble lên caller (AuthService)
    public void sendForgotPasswordEmail(String to, String fullName, String tempCode) {
        String subject = "Mã xác nhận khôi phục mật khẩu - Clinic System";

        String htmlContent = String.format(
                "<html><head><style>" +
                        "body { font-family: Arial, sans-serif; background-color: #f7f9fc; padding: 20px; }" +
                        ".container { background-color: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 600px; margin: auto; }"
                        +
                        "h2 { color: #0056b3; }" +
                        ".code-box { background-color: #f1f3f5; border: 1px dashed #0056b3; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; color: #d63384; letter-spacing: 5px; margin: 20px 0; }"
                        +
                        ".footer { margin-top: 30px; font-size: 12px; color: #999; text-align: center; border-top: 1px solid #ddd; padding-top: 10px; }"
                        +
                        "</style></head><body>" +
                        "<div class='container'>" +
                        "<h2>Khôi phục mật khẩu</h2>" +
                        "<p>Xin chào <b>%s</b>,</p>" +
                        "<p>Chúng tôi nhận được yêu cầu khôi phục mật khẩu cho tài khoản của bạn. Vui lòng sử dụng mã xác nhận dưới đây để tiếp tục:</p>"
                        +
                        "<div class='code-box'>%s</div>" +
                        "<p>Mã này có hiệu lực trong vòng <b>15 phút</b>. Nếu bạn không yêu cầu thay đổi này, vui lòng bỏ qua email này.</p>"
                        +
                        "<div class='footer'>Cảm ơn bạn đã thăm khám tại Clinic.</div>" +
                        "</div></body></html>",
                fullName,
                tempCode);
        log.info("Sending email to: " + to);
        boolean sent = sendHtmlEmail(to, subject, htmlContent);
        if (!sent) {
            throw new IllegalStateException(
                    "Không gửi được email khôi phục mật khẩu. Vui lòng kiểm tra SMTP_EMAIL và APP_PASSWORD.");
        }
    }

    private boolean sendHtmlEmail(String to, String subject, String htmlContent) {
        if (fromEmail == null || fromEmail.isBlank()) {
            log.error("[EMAIL] SMTP_EMAIL chưa được cấu hình. Kiểm tra biến SMTP_EMAIL trong .env");
            return false;
        }

        log.info("[EMAIL] Chuẩn bị gửi email từ {} đến {}", fromEmail, to);
        log.info("[EMAIL] SMTP host: smtp.gmail.com:587, auth=true, starttls=true");

        try {
            MimeMessage message = javaMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(to);
            helper.setFrom(fromEmail);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            javaMailSender.send(message);
            log.info("[EMAIL] Gửi thành công đến {}", to);
            return true;
        } catch (Exception e) {
            log.error("[EMAIL] THẤT BẠI khi gửi đến {}. Lỗi: {}", to, e.getMessage(), e);
            return false;
        }
    }
}
