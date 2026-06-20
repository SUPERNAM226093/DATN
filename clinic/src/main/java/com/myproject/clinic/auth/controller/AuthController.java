package com.myproject.clinic.auth.controller;

import com.myproject.clinic.auth.dto.*;
import com.myproject.clinic.auth.service.AuthService;
import com.myproject.clinic.utils.EmailService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final EmailService emailService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        String message = authService.forgotPassword(request);
        return ResponseEntity.ok(Map.of("message", message));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(Map.of("message", "Mật khẩu đã được cập nhật thành công. Vui lòng đăng nhập lại."));
    }

    // Endpoint test SMTP tạm thời - xóa sau khi fix xong
    @GetMapping("/test-email")
    public ResponseEntity<?> testEmail(@RequestParam(defaultValue = "namngkij04@gmail.com") String to) {
        log.info("[TEST] Gửi email test đến: {}", to);
        try {
            emailService.sendForgotPasswordEmail(to, "Test User", "TEST-CODE-123");
            return ResponseEntity.ok(Map.of("status", "SUCCESS", "message", "Email đã gửi tới " + to));
        } catch (Exception e) {
            log.error("[TEST] Lỗi: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("status", "FAILED", "error", e.getMessage()));
        }
    }
}
