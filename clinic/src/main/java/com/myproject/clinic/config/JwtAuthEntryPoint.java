package com.myproject.clinic.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Lớp xử lý lỗi chưa xác thực (JwtAuthEntryPoint)
 * và trả về phản hồi lỗi JSON dạng 401 Unauthorized thay vì trang HTML mặc định
 * của máy chủ.
 */
@Component
public class JwtAuthEntryPoint implements AuthenticationEntryPoint {

    @Override
    public void commence(HttpServletRequest request,
            HttpServletResponse response,
            AuthenticationException authException) throws IOException {
        // Thiết lập kiểu nội dung trả về là JSON và mã HTTP Status là 401
        // (Unauthorized)
        response.setContentType("application/json");
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);

        // Tạo cấu trúc dữ liệu JSON báo lỗi dạng Map
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("status", 401);
        body.put("message", "Unauthorized: " + authException.getMessage());

        // Sử dụng thư viện Jackson (ObjectMapper) để tuần tự hóa (serialize) Map thành
        // chuỗi JSON viết trực tiếp ra Response
        new ObjectMapper().writeValue(response.getOutputStream(), body);
    }
}
