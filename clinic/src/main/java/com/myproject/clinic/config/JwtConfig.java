package com.myproject.clinic.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Component
public class JwtConfig {
    @Value("${jwt.secret}")
    private String secretKey;

    // Lấy thời hạn hết hạn của token
    @Value("${jwt.expiration}")
    private long expiration;

    public String generateToken(UserDetails userDetails) {
        return generateToken(new HashMap<>(), userDetails);
    }

    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        return Jwts.builder()
                .claims(extraClaims) // Thiết lập các thông tin đính kèm bổ sung
                .subject(userDetails.getUsername()) // Thiết lập chủ thể token (thường là Email/Username)
                .issuedAt(new Date()) // Thời điểm phát hành token
                .expiration(new Date(System.currentTimeMillis() + expiration)) // Thời điểm hết hạn token
                .signWith(getSigningKey()) // Ký mã hóa token sử dụng khóa HMAC-SHA
                .compact(); // Nén và trả về chuỗi JWT dạng String ngắn gọn
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public String extractRole(String token) {
        return extractClaim(token, claims -> claims.get("role", String.class));
    }

    /**
     * Kiểm tra token JWT có hợp lệ không (So sánh trùng tên người dùng và token
     * chưa hết hạn).
     */
    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    /**
     * Kiểm tra xem Token JWT đã hết hạn hay chưa.
     */
    private boolean isTokenExpired(String token) {
        return extractClaim(token, Claims::getExpiration).before(new Date());
    }

    /**
     * Hàm dùng chung để trích xuất một trường thông tin cụ thể (Claim) từ Token JWT
     * bằng cách sử dụng Functional Interface.
     */
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    /**
     * Giải mã và lấy toàn bộ các trường thông tin (Claims) từ Token JWT sau khi đã
     * xác thực chữ ký số thành công.
     */
    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey()) // Xác thực chữ ký token bằng khóa ký
                .build()
                .parseSignedClaims(token) // Phân tích token ký
                .getPayload(); // Trả về nội dung Payload chứa các Claims
    }

    /**
     * Chuyển đổi chuỗi bí mật (Secret Key) dạng thô sang khóa bảo mật SecretKey an
     * toàn cho thuật toán HMAC-SHA.
     */
    private SecretKey getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(
                java.util.Base64.getEncoder().encodeToString(secretKey.getBytes()));
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
