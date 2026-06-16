package com.myproject.clinic.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Cấu hình bảo mật Spring Security (SecurityConfig).
 * Phân quyền cố định theo vai trò: ADMIN toàn quyền, STAFF và DOCTOR giới hạn theo chức năng lâm sàng.
 */
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final JwtAuthEntryPoint jwtAuthEntryPoint;
    private final UserDetailsService userDetailsService;

    /**
     * Cấu hình chuỗi bộ lọc bảo mật chính của Spring Security.
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // 1. CORS
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // 2. Tắt CSRF (dùng JWT stateless)
                .csrf(csrf -> csrf.disable())

                // 3. Xử lý lỗi 401
                .exceptionHandling(ex -> ex.authenticationEntryPoint(jwtAuthEntryPoint))

                // 4. Stateless session
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // 5. Phân quyền endpoint
                .authorizeHttpRequests(auth -> auth

                        // ── Public: Auth, ảnh tĩnh ──────────────────────────
                        .requestMatchers("/api/auth/**", "/images/**").permitAll()

                        // ── Public: Dữ liệu xem công khai (không cần đăng nhập) ──
                        .requestMatchers(HttpMethod.GET, "/api/doctors", "/api/doctors/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/services", "/api/services/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/rooms", "/api/rooms/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/specializations", "/api/specializations/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/health-packages", "/api/health-packages/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/hospitals", "/api/hospitals/**").permitAll()

                        // ── Public: API bệnh nhân đặt lịch, tra cứu lịch sử ──
                        .requestMatchers("/api/appointments/by-patient/**").permitAll()
                        .requestMatchers("/api/medical-records/by-patient/**").permitAll()
                        // Bệnh nhân (USER) được tự xem bệnh án của mình
                        .requestMatchers(HttpMethod.GET, "/api/medical-records/my-records").permitAll()
                        .requestMatchers("/api/health-package-bookings/patient/**").permitAll()
                        .requestMatchers("/api/health-package-bookings/booked-slots/**").permitAll()
                        .requestMatchers("/api/online-consultations/patient/**").permitAll()
                        .requestMatchers("/api/room-bookings/by-user/**").permitAll()
                        // Bệnh nhân (role USER) được phép POST tạo đơn đặt phòng và hủy đơn của mình
                        .requestMatchers(HttpMethod.POST, "/api/room-bookings/*").permitAll()
                        .requestMatchers(HttpMethod.DELETE, "/api/room-bookings/*/cancel/*").permitAll()
                        .requestMatchers("/api/prescriptions/patient/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/appointments").permitAll()
                        .requestMatchers(HttpMethod.PUT, "/api/appointments/*/cancel/*").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/health-package-bookings").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/health-package-bookings/*/cancel").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/online-consultations").permitAll()
                        .requestMatchers(HttpMethod.GET,  "/api/online-consultations/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/online-consultations/*/cancel").permitAll()

                        // ── Public: AI & ML ──────────────────────────────────
                        .requestMatchers("/api/machine-learning/heart-disease/predict").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/chat").permitAll()

                        // ── ADMIN: Toàn quyền quản lý người dùng, vai trò ───
                        // Bệnh nhân được xem thông tin cá nhân của chính mình
                        .requestMatchers(HttpMethod.GET, "/api/users/{id}").permitAll()
                        .requestMatchers("/api/users/**").hasAnyRole("ADMIN", "STAFF", "DOCTOR")
                        .requestMatchers("/api/roles/**").hasRole("ADMIN")
                        .requestMatchers("/api/doctors/**").hasAnyRole("ADMIN", "DOCTOR", "STAFF")
                        .requestMatchers("/api/specializations/**").hasAnyRole("ADMIN", "STAFF")

                        // ── STAFF: Dịch vụ & Phòng, Đăng ký, Gói khám ──────
                        .requestMatchers("/api/rooms/**").hasAnyRole("ADMIN", "STAFF")
                        .requestMatchers("/api/room-bookings/**").hasAnyRole("ADMIN", "STAFF")
                        .requestMatchers("/api/health-packages/**").hasAnyRole("ADMIN", "STAFF")
                        .requestMatchers("/api/health-package-bookings/**").hasAnyRole("ADMIN", "STAFF")
                        .requestMatchers("/api/service-registrations/**").hasAnyRole("ADMIN", "STAFF")

                        // ── STAFF + DOCTOR: Lịch hẹn và Tư vấn ─────────────
                        .requestMatchers("/api/appointments/**").hasAnyRole("ADMIN", "STAFF", "DOCTOR")
                        .requestMatchers("/api/online-consultations/**").hasAnyRole("ADMIN", "STAFF", "DOCTOR")

                        // ── DOCTOR: Hồ sơ bệnh án, Đơn thuốc ───────────────
                        .requestMatchers("/api/medical-records/**").hasAnyRole("ADMIN", "DOCTOR")
                        .requestMatchers("/api/prescriptions/**").hasAnyRole("ADMIN", "DOCTOR")

                        // ── Mọi request còn lại phải đăng nhập ──────────────
                        .anyRequest().authenticated()
                )

                // 6. Auth provider
                .authenticationProvider(authenticationProvider())

                // 7. JWT Filter
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * Cấu hình CORS cho phép frontend (NextJS :5173, Vite :3000) gọi API.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of("*"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
