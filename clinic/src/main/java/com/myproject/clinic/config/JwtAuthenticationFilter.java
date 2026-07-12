package com.myproject.clinic.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtConfig jwtConfig;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        // 1. Lấy thông tin tiêu đề "Authorization" từ HTTP Request gửi lên
        final String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        // 2. Cắt bỏ tiền tố "Bearer " (7 ký tự đầu) để lấy chuỗi Token JWT thô
        final String jwt = authHeader.substring(7);
        try {
            // 3. Giải mã token để lấy địa chỉ Email của người dùng
            final String userEmail = jwtConfig.extractUsername(jwt);

            // 4. Nếu email hợp lệ và người dùng chưa được thiết lập trạng thái đăng nhập
            // (xác thực) trong hệ thống
            if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                // Truy vấn thông tin tài khoản người dùng từ cơ sở dữ liệu dựa trên Email
                UserDetails userDetails = userDetailsService.loadUserByUsername(userEmail);

                // 5. Kiểm tra thời hạn của token và so khớp thông tin email trong token với
                // UserDetails
                if (jwtConfig.isTokenValid(jwt, userDetails)) {
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(userDetails,
                            null, userDetails.getAuthorities());
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (Exception e) {
        }
        filterChain.doFilter(request, response);
    }
}
