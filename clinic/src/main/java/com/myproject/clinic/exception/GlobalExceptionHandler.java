package com.myproject.clinic.exception;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * LỚP: GlobalExceptionHandler
 * MÔ TẢ: Bộ xử lý ngoại lệ tập trung cho toàn bộ ứng dụng (Global Exception
 * Handler).
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Xử lý ngoại lệ ResourceNotFoundException (Không tìm thấy tài nguyên dữ liệu).
     * Phản hồi HTTP trả về: 404 NOT FOUND kèm message báo lỗi chi tiết.
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleResourceNotFound(ResourceNotFoundException ex) {
        return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    /**
     * Xử lý ngoại lệ BadCredentialsException (Thông tin đăng nhập không hợp lệ từ
     * Spring Security).
     * Phản hồi HTTP trả về: 401 UNAUTHORIZED.
     */
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String, Object>> handleBadCredentials(BadCredentialsException ex) {
        return buildResponse(HttpStatus.UNAUTHORIZED, "Email hoặc mật khẩu không chính xác");
    }

    /**
     * Xử lý ngoại lệ IllegalArgumentException (Tham số truyền vào không hợp lệ hoặc
     * không đúng logic nghiệp vụ).
     * Phản hồi HTTP trả về: 400 BAD REQUEST.
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    /**
     * Xử lý ngoại lệ ResponseStatusException (Ngoại lệ ném ra kèm theo Http Status
     * cụ thể của Spring).
     * Phản hồi HTTP trả về: Trả về chính mã trạng thái (HttpStatus) và lý do
     * (reason) của ngoại lệ đó.
     * 
     */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatus(ResponseStatusException ex) {
        return buildResponse((HttpStatus) ex.getStatusCode(), ex.getReason());
    }

    /**
     * Xử lý ngoại lệ MethodArgumentNotValidException (Lỗi validate dữ liệu đầu vào
     * - Bean Validation).
     * Xảy ra khi client gửi dữ liệu không thỏa mãn các ràng buộc định nghĩa bằng
     * các annotation như
     * @NotNull, @Size, @Email
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationErrors(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        // Lặp qua danh sách các trường lỗi và gom thông báo lỗi lại dưới dạng Key (tên
        // trường) - Value (mô tả lỗi)
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            errors.put(error.getField(), error.getDefaultMessage());
        }

        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("status", HttpStatus.BAD_REQUEST.value());
        body.put("errors", errors);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
    }

    /**
     * Xử lý ngoại lệ DataIntegrityViolationException (Vi phạm tính toàn vẹn dữ liệu
     * trong database).
     * Xảy ra khi cố tình insert trùng khoá chính/khoá duy nhất (Unique Constraint)
     * hoặc vi phạm ràng buộc khoá ngoại (Foreign Key).
     * Phản hồi HTTP trả về: 409 CONFLICT.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrity(DataIntegrityViolationException ex) {
        return buildResponse(HttpStatus.CONFLICT,
                "Không thể thực hiện thao tác này vì vi phạm ràng buộc dữ liệu hoặc dữ liệu liên quan.");
    }

    /**
     * Xử lý ngoại lệ MethodArgumentTypeMismatchException (Sai kiểu dữ liệu của tham
     * số truyền vào từ URL hoặc Query string).
     * Ví dụ: URL yêu cầu ID là số (/api/users/5) nhưng client truyền vào dạng chuỗi
     * chữ (/api/users/abc).
     * Phản hồi HTTP trả về: 400 BAD REQUEST kèm thông tin kiểu dữ liệu đúng mong
     * đợi.
     */
    @ExceptionHandler(org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTypeMismatch(
            org.springframework.web.method.annotation.MethodArgumentTypeMismatchException ex) {
        return buildResponse(HttpStatus.BAD_REQUEST, "Sai kiểu dữ liệu: " + ex.getName() + " mong đợi kiểu "
                + (ex.getRequiredType() != null ? ex.getRequiredType().getSimpleName() : "Long"));
    }

    /**
     * Xử lý ngoại lệ Exception.class (Lỗi máy chủ nội bộ - Internal Server Error).
     * Đây là bộ lọc cuối cùng dùng để bắt tất cả các lỗi runtime chưa được phân
     * loại hoặc không mong muốn khác
     * nhằm ngăn ngừa việc lộ thông tin nhạy cảm của hệ thống ra bên ngoài.
     * Phản hồi HTTP trả về: 500 INTERNAL SERVER ERROR.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneral(Exception ex) {
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Đã xảy ra lỗi hệ thống: " + ex.getMessage());
    }

    private ResponseEntity<Map<String, Object>> buildResponse(HttpStatus status, String message) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("status", status.value());
        body.put("message", message);
        return ResponseEntity.status(status).body(body);
    }
}
