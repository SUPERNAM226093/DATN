package com.myproject.clinic.utils;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.time.Duration;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

@Slf4j
@Service
public class VnPayService {

    private static final ZoneId PAYMENT_TIME_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter VNPAY_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final String PRODUCTION_RETURN_URL = "https://datn-uqz1.vercel.app/video-call/payment/vnpay-callback";

    @Value("${vnp.tmn.code}")
    private String tmnCode;

    @Value("${vnp.hash.secret}")
    private String hashSecret;

    @Value("${vnp.pay.url}")
    private String payUrl;

    @Value("${vnp.return.url}")
    private String returnUrl;

    private String getTmnCode() {
        return tmnCode != null ? tmnCode.trim() : "";
    }

    private String getHashSecret() {
        return hashSecret != null ? hashSecret.trim() : "";
    }

    private String getPayUrl() {
        return payUrl != null ? payUrl.trim() : "";
    }

    private String getReturnUrl() {
        String configuredUrl = returnUrl != null ? returnUrl.trim() : "";
        if (configuredUrl.isBlank()
                || configuredUrl.contains("localhost")
                || configuredUrl.contains("127.0.0.1")
                || configuredUrl.contains("medpronam.vercel.app")) {
            return PRODUCTION_RETURN_URL;
        }
        return configuredUrl;
    }

    /**
     * Tạo URL thanh toán VNPay.
     */
    public String createPaymentUrl(long amount, String txnRef, String ipAddr) {
        String vnp_Version = "2.1.0";
        ZonedDateTime createdAt = ZonedDateTime.now(PAYMENT_TIME_ZONE).withNano(0);
        ZonedDateTime expiresAt = createdAt.plus(Duration.ofMinutes(15));
        String vnp_Command = "pay";
        String vnp_OrderInfo = "Thanh toan don hang:" + txnRef;
        String vnp_OrderType = "other";
        String vnp_TxnRef = txnRef + "_" + System.currentTimeMillis();

        Map<String, String> vnp_Params = new HashMap<>();
        vnp_Params.put("vnp_Version", vnp_Version);
        vnp_Params.put("vnp_Command", vnp_Command);
        vnp_Params.put("vnp_TmnCode", getTmnCode());
        vnp_Params.put("vnp_Amount", String.valueOf(amount * 100));
        vnp_Params.put("vnp_CurrCode", "VND");
        vnp_Params.put("vnp_TxnRef", vnp_TxnRef);
        vnp_Params.put("vnp_OrderInfo", vnp_OrderInfo);
        vnp_Params.put("vnp_OrderType", vnp_OrderType);
        vnp_Params.put("vnp_Locale", "vn");
        vnp_Params.put("vnp_ReturnUrl", getReturnUrl());
        vnp_Params.put("vnp_IpAddr", ipAddr);

        vnp_Params.put("vnp_CreateDate", VNPAY_DATE_FORMAT.format(createdAt));
        vnp_Params.put("vnp_ExpireDate", VNPAY_DATE_FORMAT.format(expiresAt));

        List<String> fieldNames = new ArrayList<>(vnp_Params.keySet());
        Collections.sort(fieldNames);

        StringBuilder hashData = new StringBuilder();
        StringBuilder query = new StringBuilder();

        for (String fieldName : fieldNames) {
            String fieldValue = vnp_Params.get(fieldName);

            if ((fieldValue != null) && (fieldValue.length() > 0)) {
                try {
                    String encodedName = URLEncoder.encode(fieldName, StandardCharsets.US_ASCII.toString());
                    String encodedValue = URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII.toString());

                    if (hashData.length() > 0) {
                        hashData.append('&');
                    }
                    hashData.append(encodedName).append('=').append(encodedValue);

                    if (query.length() > 0) {
                        query.append('&');
                    }
                    query.append(encodedName).append('=').append(encodedValue);

                } catch (Exception e) {
                    log.error("Error encoding parameter: {}", e.getMessage());
                }
            }
        }

        String queryUrl = query.toString();
        log.info("[VNPay] Raw Hash Data string (encoded): {}", hashData);

        String vnp_SecureHash = hmacSHA512(getHashSecret(), hashData.toString());
        queryUrl += "&vnp_SecureHash=" + vnp_SecureHash;

        String finalUrl = getPayUrl() + "?" + queryUrl;
        log.info("[VNPay] Generated Payment URL: {}", finalUrl);

        return finalUrl;
    }

    /**
     * Xác thực callback VNPay trả về.
     */
    public boolean verifyCallback(Map<String, String> fields) {
        String vnp_SecureHash = fields.get("vnp_SecureHash");
        if (vnp_SecureHash == null) {
            return false;
        }

        Map<String, String> params = new HashMap<>();
        for (Map.Entry<String, String> entry : fields.entrySet()) {
            String key = entry.getKey();
            String val = entry.getValue();
            if (val != null && val.length() > 0 && !key.equals("vnp_SecureHash") && !key.equals("vnp_SecureHashType")) {
                params.put(key, val);
            }
        }

        List<String> fieldNames = new ArrayList<>(params.keySet());
        Collections.sort(fieldNames);

        StringBuilder hashData = new StringBuilder();

        for (String fieldName : fieldNames) {
            String fieldValue = params.get(fieldName);

            try {
                String encodedName = URLEncoder.encode(fieldName, StandardCharsets.US_ASCII.toString());
                String encodedValue = URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII.toString());

                if (hashData.length() > 0) {
                    hashData.append('&');
                }
                hashData.append(encodedName).append('=').append(encodedValue);

            } catch (Exception e) {
                log.error("Error encoding callback parameter: {}", e.getMessage());
            }
        }

        log.info("[VNPay Callback] Raw Hash Data string (encoded): {}", hashData);

        String calculatedHash = hmacSHA512(getHashSecret(), hashData.toString());
        boolean isValid = calculatedHash.equalsIgnoreCase(vnp_SecureHash);

        log.info("[VNPay Callback] Verification status: {}. Received hash: {}, Calculated hash: {}", isValid, vnp_SecureHash, calculatedHash);

        return isValid;
    }

    /**
     * Tạo chữ ký HMAC-SHA512.
     */
    private String hmacSHA512(final String key, final String data) {
        try {
            if (key == null || data == null) {
                throw new NullPointerException();
            }
            Mac hmac512 = Mac.getInstance("HmacSHA512");
            SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA512");
            hmac512.init(secretKey);
            byte[] result = hmac512.doFinal(data.getBytes(StandardCharsets.UTF_8));
            
            StringBuilder sb = new StringBuilder(2 * result.length);
            for (byte b : result) {
                sb.append(String.format("%02x", b & 0xff));
            }
            return sb.toString();
        } catch (Exception ex) {
            log.error("Error calculating HMAC SHA512", ex);
            return "";
        }
    }
}
