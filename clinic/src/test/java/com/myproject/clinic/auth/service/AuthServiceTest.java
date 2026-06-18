package com.myproject.clinic.auth.service;

import com.myproject.clinic.auth.dto.AuthResponse;
import com.myproject.clinic.auth.dto.ForgotPasswordRequest;
import com.myproject.clinic.auth.dto.LoginRequest;
import com.myproject.clinic.auth.dto.RegisterRequest;
import com.myproject.clinic.config.JwtConfig;
import com.myproject.clinic.entity.User;

import com.myproject.clinic.repository.PasswordResetTokenRepository;
import com.myproject.clinic.repository.UserRepository;
import com.myproject.clinic.utils.EmailService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordResetTokenRepository tokenRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtConfig jwtConfig;
    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private UserDetailsService userDetailsService;
    @Mock
    private EmailService emailService;
    @Mock
    private UserDetails userDetails;

    @InjectMocks
    private AuthService authService;

    @Test
    void register_success() {
        RegisterRequest request = RegisterRequest.builder()
                .email("test@gmail.com")
                .password("password123")
                .fullName("Test User")
                .build();

        User savedUser = User.builder()
                .id(1L).email("test@gmail.com").fullName("Test User")
                .passwordHash("encoded").roleName("PATIENT").status("ACTIVE").build();

        when(userRepository.existsByEmail("test@gmail.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(userDetailsService.loadUserByUsername("test@gmail.com")).thenReturn(userDetails);
        when(jwtConfig.generateToken(any(), eq(userDetails))).thenReturn("jwt-token");

        AuthResponse response = authService.register(request);

        assertNotNull(response);
        assertEquals("jwt-token", response.getToken());
        assertEquals("test@gmail.com", response.getEmail());
        assertEquals("Test User", response.getFullName());
        assertEquals("PATIENT", response.getRole());
        verify(userRepository).save(any(User.class));
    }

    @Test
    void register_emailExists_throwsException() {
        RegisterRequest request = RegisterRequest.builder().email("test@gmail.com").password("pass").build();
        when(userRepository.existsByEmail("test@gmail.com")).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> authService.register(request));
        verify(userRepository, never()).save(any());
    }

    @Test
    void login_success() {
        LoginRequest request = LoginRequest.builder().email("test@gmail.com").password("pass").build();
        User user = User.builder().id(1L).email("test@gmail.com").fullName("Test").roleName("PATIENT").status("ACTIVE").build();

        when(userRepository.findByEmail("test@gmail.com")).thenReturn(Optional.of(user));
        when(userDetailsService.loadUserByUsername("test@gmail.com")).thenReturn(userDetails);
        when(jwtConfig.generateToken(any(), eq(userDetails))).thenReturn("jwt-token");

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("jwt-token", response.getToken());
        verify(authenticationManager).authenticate(any(UsernamePasswordAuthenticationToken.class));
    }

    @Test
    void forgotPassword_sendsRecoveryCodeToPatientEmail() {
        ForgotPasswordRequest request = ForgotPasswordRequest.builder().email("patient@gmail.com").build();
        User user = User.builder()
                .id(1L)
                .email("patient@gmail.com")
                .fullName("Patient User")
                .status("ACTIVE")
                .build();

        when(userRepository.findByEmailIgnoreCase("patient@gmail.com")).thenReturn(Optional.of(user));

        String response = authService.forgotPassword(request);

        assertEquals("Mã xác nhận đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.", response);
        verify(tokenRepository).invalidateAllByUser(user);
        verify(tokenRepository).save(any());
        verify(emailService).sendForgotPasswordEmail(eq("patient@gmail.com"), eq("Patient User"), any(String.class));
    }
}
