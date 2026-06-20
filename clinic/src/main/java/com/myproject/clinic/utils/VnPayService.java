package com.myproject.clinic.utils;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
package com.myproject.clinic.utils;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.*;

/**
 * Service xử lý thanh toán VNPay.
 */
@Slf4j
@Service
public class VnPayService {

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
        return returnUrl != null ? returnUrl.trim() : "";
    }

    /**
     * Tạo URL thanh toán VNPay.
     */
    public String createPaymentUrl(long amount, String txnRef, String ipAddr) {
        String vnp_Version = "2.1.0";
        String vnp_Command = "pay";
        String vnp_OrderInfo = "Thanh toan don hang:" + txnRef;
        String vnp_OrderType = "other";
        String vnp_TxnRef = txnRef;

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

        Calendar cld = Calendar.getInstance(TimeZone.getTimeZone("Etc/GMT+7"));
        SimpleDateFormat formatter = new SimpleDateFormat("yyyyMMddHHmmss");

        String vnp_CreateDate = formatter.format(cld.getTime());
        vnp_Params.put("vnp_CreateDate", vnp_CreateDate);

        cld.add(Calendar.MINUTE, 15);
        String vnp_ExpireDate = formatter.format(cld.getTime());
        vnp_Params.put("vnp_ExpireDate", vnp_ExpireDate);

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

            // Chuyển mảng byte kết quả sang chuỗi hex.
            // Chuỗi này chính là vnp_SecureHash.
            StringBuilder sb = new StringBuilder(2 * result.length);
            for (byte b : result) {
                sb.append(String.format("%02x", b & 0xff));
            }

            // Trả về chữ ký hash.
            return sb.toString();

        } catch (Exception ex) {
            // Nếu lỗi khi tính HMAC thì ghi log và trả chuỗi rỗng.
            log.error("Error calculating HMAC SHA512", ex);
            return "";
        }
    }
}
