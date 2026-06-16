package com.myproject.clinic.auth.service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.myproject.clinic.auth.dto.AuthResponse;
import com.myproject.clinic.auth.dto.ForgotPasswordRequest;
import com.myproject.clinic.auth.dto.LoginRequest;
import com.myproject.clinic.auth.dto.RegisterRequest;
import com.myproject.clinic.auth.dto.ResetPasswordRequest;
import com.myproject.clinic.config.JwtConfig;
import com.myproject.clinic.entity.PasswordResetToken;
import com.myproject.clinic.entity.User;
import com.myproject.clinic.repository.PasswordResetTokenRepository;
import com.myproject.clinic.repository.UserRepository;
import com.myproject.clinic.utils.EmailService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
// Xử lý các nghiệp vụ xác thực như đăng ký, đăng nhập và khôi phục mật khẩu.
public class AuthService {

        private final UserRepository userRepository;

        private final PasswordResetTokenRepository tokenRepository;
        private final PasswordEncoder passwordEncoder;
        private final JwtConfig jwtConfig;
        private final AuthenticationManager authenticationManager;
        private final UserDetailsService userDetailsService;
        private final EmailService emailService;

        private static final String CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        private static final SecureRandom RANDOM = new SecureRandom();

        // Tạo tài khoản mới cho người dùng và trả về token đăng nhập.
        public AuthResponse register(RegisterRequest request) {
                if (request.getEmail() == null || !request.getEmail().matches("^[a-zA-Z0-9._%+-]+@gmail\\.com$")) {
                        throw new IllegalArgumentException("Email phải đúng định dạng @gmail.com");
                }

                if (userRepository.existsByEmail(request.getEmail())) {
                        throw new IllegalArgumentException("Email này đã được sử dụng trong hệ thống");
                }

                if (request.getPhone() != null && !request.getPhone().matches("^\\d{10}$")) {
                        throw new IllegalArgumentException("Số điện thoại phải có đúng 10 chữ số");
                }

                String defaultRole = "PATIENT";

                User user = User.builder()
                                .email(request.getEmail())
                                .passwordHash(passwordEncoder.encode(request.getPassword()))
                                .fullName(request.getFullName())
                                .phone(request.getPhone())
                                .dateOfBirth(request.getDateOfBirth())
                                .gender(request.getGender())
                                .address(request.getAddress())
                                .roleName(defaultRole)
                                .status("ACTIVE")
                                .build();

                userRepository.save(user);

                UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
                Map<String, Object> extraClaims = new HashMap<>();
                extraClaims.put("role", defaultRole);
                String token = jwtConfig.generateToken(extraClaims, userDetails);

                return AuthResponse.builder()
                                .userId(user.getId())
                                .token(token)
                                .email(user.getEmail())
                                .fullName(user.getFullName())
                                .role(defaultRole)
                                .build();
        }

        // Xác thực thông tin đăng nhập và sinh token cho người dùng hợp lệ.
        public AuthResponse login(LoginRequest request) {
                authenticationManager.authenticate(
                                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

                User user = userRepository.findByEmail(request.getEmail())
                                .orElseThrow(() -> new IllegalArgumentException("Email hoặc mật khẩu không chính xác"));

                if (!"ACTIVE".equals(user.getStatus())) {
                        throw new IllegalArgumentException("Tài khoản này đã bị khóa hoặc ngưng hoạt động.");
                }

                UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
                String roleName = user.getRoleName();
                Map<String, Object> extraClaims = new HashMap<>();
                extraClaims.put("role", roleName);
                String token = jwtConfig.generateToken(extraClaims, userDetails);

                return AuthResponse.builder()
                                .userId(user.getId())
                                .token(token)
                                .email(user.getEmail())
                                .fullName(user.getFullName())
                                .role(user.getRoleName())
                                .build();
        }

        @Transactional
        // Tạo mã đặt lại mật khẩu và gửi về email nếu tài khoản hợp lệ.
        public String forgotPassword(ForgotPasswordRequest request) {
                // Return success message even if email not found for security
                User user = userRepository.findByEmailIgnoreCase(request.getEmail()).orElse(null);
                if (user == null || "DELETED".equals(user.getStatus()) || "LOCKED".equals(user.getStatus())) {
                        return "Nếu email tồn tại trong hệ thống, bạn sẽ nhận được mã khôi phục trong vài phút.";
                }

                // Invalidate old tokens
                tokenRepository.invalidateAllByUser(user);

                // Generate 8-char random code
                String code = generateRandomCode(8);

                // Save hashed token
                PasswordResetToken token = PasswordResetToken.builder()
                                .user(user)
                                .tokenHash(passwordEncoder.encode(code))
                                .expiresAt(LocalDateTime.now().plusMinutes(15))
                                .build();
                tokenRepository.save(token);

                // Send email
                emailService.sendForgotPasswordEmail(user.getEmail(), user.getFullName(), code);

                return "Mã xác nhận đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.";
        }

        @Transactional
        // Kiểm tra mã xác nhận rồi cập nhật mật khẩu mới cho người dùng.
        public void resetPassword(ResetPasswordRequest request) {
                if (request.getNewPassword() == null || request.getNewPassword().length() < 6) {
                        throw new IllegalArgumentException("Mật khẩu mới phải có ít nhất 6 ký tự");
                }

                List<PasswordResetToken> activeTokens = tokenRepository.findAll().stream()
                                .filter(t -> t.getUsedAt() == null && t.getExpiresAt().isAfter(LocalDateTime.now()))
                                .collect(Collectors.toList());

                PasswordResetToken validToken = null;
                for (PasswordResetToken t : activeTokens) {
                        if (passwordEncoder.matches(request.getToken(), t.getTokenHash())) {
                                validToken = t;
                                break;
                        }
                }

                if (validToken == null) {
                        throw new IllegalArgumentException("Mã xác nhận không chính xác hoặc đã hết hạn");
                }

                User user = validToken.getUser();

                // Optional: Check if new password is same as old
                if (passwordEncoder.matches(request.getNewPassword(), user.getPasswordHash())) {
                        throw new IllegalArgumentException("Mật khẩu mới không được trùng với mật khẩu hiện tại");
                }

                user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
                userRepository.save(user);

                validToken.setUsedAt(LocalDateTime.now());
                tokenRepository.save(validToken);
        }

        // Sinh chuỗi ngẫu nhiên với độ dài yêu cầu để làm mã xác nhận.
        private String generateRandomCode(int length) {
                StringBuilder sb = new StringBuilder(length);
                for (int i = 0; i < length; i++) {
                        sb.append(CHARS.charAt(RANDOM.nextInt(CHARS.length())));
                }
                return sb.toString();
        }

        @Scheduled(cron = "0 0 0 * * *") // Run daily at midnight
        @Transactional
        // Xóa các mã đặt lại mật khẩu đã hết hạn hoặc đã được sử dụng.
        public void cleanupTokens() {
                tokenRepository.deleteExpiredOrUsed(LocalDateTime.now());
        }
}
