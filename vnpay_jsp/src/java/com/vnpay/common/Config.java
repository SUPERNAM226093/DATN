package com.vnpay.common;

import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Random;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import javax.servlet.http.HttpServletRequest;

/**
 * File cấu hình và tiện ích dùng cho demo VNPay.
 *
 * File này chứa:
 * - URL cổng thanh toán VNPay Sandbox
 * - URL nhận kết quả thanh toán
 * - Mã merchant vnp_TmnCode
 * - Khóa bí mật secretKey / vnp_HashSecret
 * - Các hàm tạo hash, ký HMAC-SHA512
 * - Hàm lấy IP người dùng
 * - Hàm tạo mã giao dịch ngẫu nhiên
 *
 * @author CTT VNPAY
 */
public class Config {

    // URL cổng thanh toán VNPay Sandbox.
    // Khi tạo xong paymentUrl, hệ thống sẽ chuyển người dùng sang URL này.
    public static String vnp_PayUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";

    // URL mà VNPay sẽ redirect về sau khi người dùng thanh toán xong.
    // Trong demo, URL này trỏ về file vnpay_return.jsp.
    public static String vnp_ReturnUrl = "http://localhost:8080/vnpay_jsp/vnpay_return.jsp";

    // Mã website / merchant do VNPay cấp.
    // Khi tích hợp thật, cần điền mã vnp_TmnCode được VNPay cung cấp.
    public static String vnp_TmnCode = "2LE0NQ35";

    // Khóa bí mật do VNPay cấp.
    // Khóa này còn gọi là vnp_HashSecret.
    // Dùng để tạo và kiểm tra chữ ký vnp_SecureHash.
    public static String secretKey = "42AG3QJQROXLFPTKX8CVAII1G44EX0BJ";

    // URL API truy vấn giao dịch của VNPay.
    // Dùng cho các nghiệp vụ kiểm tra hoặc truy vấn trạng thái giao dịch.
    public static String vnp_ApiUrl = "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction";

    // Hàm tạo mã MD5 từ một chuỗi message.
    // Trong luồng thanh toán hiện tại, VNPay chủ yếu dùng HMAC-SHA512,
    // nên hàm MD5 thường chỉ còn là hàm tiện ích hoặc phục vụ demo cũ.
    public static String md5(String message) {
        String digest = null;
        try {
            // Khởi tạo thuật toán MD5.
            MessageDigest md = MessageDigest.getInstance("MD5");

            // Chuyển chuỗi message sang byte UTF-8 rồi băm.
            byte[] hash = md.digest(message.getBytes("UTF-8"));

            // Chuyển mảng byte kết quả sang chuỗi hex.
            StringBuilder sb = new StringBuilder(2 * hash.length);
            for (byte b : hash) {
                sb.append(String.format("%02x", b & 0xff));
            }

            digest = sb.toString();
        } catch (UnsupportedEncodingException ex) {
            // Nếu lỗi encoding thì trả chuỗi rỗng.
            digest = "";
        } catch (NoSuchAlgorithmException ex) {
            // Nếu máy không hỗ trợ thuật toán MD5 thì trả chuỗi rỗng.
            digest = "";
        }

        return digest;
    }

    // Hàm tạo mã SHA-256 từ một chuỗi message.
    // Tương tự MD5, đây là hàm tiện ích trong demo VNPay.
    public static String Sha256(String message) {
        String digest = null;
        try {
            // Khởi tạo thuật toán SHA-256.
            MessageDigest md = MessageDigest.getInstance("SHA-256");

            // Băm chuỗi message theo UTF-8.
            byte[] hash = md.digest(message.getBytes("UTF-8"));

            // Chuyển kết quả byte sang chuỗi hex.
            StringBuilder sb = new StringBuilder(2 * hash.length);
            for (byte b : hash) {
                sb.append(String.format("%02x", b & 0xff));
            }

            digest = sb.toString();
        } catch (UnsupportedEncodingException ex) {
            digest = "";
        } catch (NoSuchAlgorithmException ex) {
            digest = "";
        }

        return digest;
    }

    // Hàm tiện ích dùng để tạo chữ ký cho toàn bộ field VNPay.
    // Hàm này nhận Map các tham số, sắp xếp tên field theo alphabet,
    // nối thành chuỗi key=value&key=value, rồi ký bằng HMAC-SHA512.
    public static String hashAllFields(Map fields) {

        // Lấy danh sách tên field từ Map.
        List fieldNames = new ArrayList(fields.keySet());

        // Sắp xếp tên field theo thứ tự alphabet.
        // VNPay yêu cầu dữ liệu phải được sắp xếp trước khi tạo chữ ký.
        Collections.sort(fieldNames);

        // StringBuilder dùng để nối dữ liệu cần ký.
        StringBuilder sb = new StringBuilder();

        Iterator itr = fieldNames.iterator();

        // Duyệt từng field theo thứ tự đã sắp xếp.
        while (itr.hasNext()) {
            String fieldName = (String) itr.next();
            String fieldValue = (String) fields.get(fieldName);

            // Chỉ đưa vào chuỗi ký nếu field có giá trị.
            if ((fieldValue != null) && (fieldValue.length() > 0)) {
                sb.append(fieldName);
                sb.append("=");
                sb.append(fieldValue);
            }

            // Nếu chưa phải field cuối thì thêm dấu &.
            if (itr.hasNext()) {
                sb.append("&");
            }
        }

        // Ký chuỗi dữ liệu bằng secretKey.
        // secretKey chính là vnp_HashSecret do VNPay cấp.
        return hmacSHA512(secretKey, sb.toString());
    }

    // Hàm tạo chữ ký HMAC-SHA512.
    // Đây là hàm quan trọng nhất trong file này.
    // Dùng để tạo vnp_SecureHash khi gửi giao dịch sang VNPay
    // hoặc kiểm tra hash khi VNPay callback về.
    public static String hmacSHA512(final String key, final String data) {
        try {

            // Nếu key hoặc data bị null thì không thể ký dữ liệu.
            if (key == null || data == null) {
                throw new NullPointerException();
            }

            // Khởi tạo đối tượng Mac với thuật toán HmacSHA512.
            final Mac hmac512 = Mac.getInstance("HmacSHA512");

            // Chuyển khóa bí mật từ String sang byte.
            byte[] hmacKeyBytes = key.getBytes();

            // Tạo SecretKeySpec cho thuật toán HmacSHA512.
            final SecretKeySpec secretKey = new SecretKeySpec(hmacKeyBytes, "HmacSHA512");

            // Gắn secretKey vào đối tượng Mac.
            hmac512.init(secretKey);

            // Chuyển dữ liệu cần ký sang byte theo UTF-8.
            byte[] dataBytes = data.getBytes(StandardCharsets.UTF_8);

            // Thực hiện ký dữ liệu.
            // Kết quả là mảng byte chứa chữ ký hash.
            byte[] result = hmac512.doFinal(dataBytes);

            // Chuyển mảng byte sang chuỗi hex.
            // Chuỗi hex này chính là vnp_SecureHash.
            StringBuilder sb = new StringBuilder(2 * result.length);
            for (byte b : result) {
                sb.append(String.format("%02x", b & 0xff));
            }

            return sb.toString();

        } catch (Exception ex) {
            // Nếu có lỗi trong quá trình ký thì trả về chuỗi rỗng.
            return "";
        }
    }

    // Hàm lấy địa chỉ IP của người dùng gửi request.
    // IP này được gửi sang VNPay qua tham số vnp_IpAddr.
    public static String getIpAddress(HttpServletRequest request) {
        String ipAdress;
        try {
            // Nếu request đi qua proxy/load balancer thì IP thật có thể nằm ở header này.
            ipAdress = request.getHeader("X-FORWARDED-FOR");

            // Nếu không có header X-FORWARDED-FOR thì lấy IP trực tiếp từ request.
            if (ipAdress == null) {
                ipAdress = request.getRemoteAddr();
            }
        } catch (Exception e) {
            // Nếu lỗi thì trả về chuỗi báo IP không hợp lệ.
            ipAdress = "Invalid IP:" + e.getMessage();
        }

        return ipAdress;
    }

    // Hàm tạo chuỗi số ngẫu nhiên với độ dài len.
    // Trong demo VNPay, hàm này dùng để tạo vnp_TxnRef,
    // tức mã tham chiếu giao dịch.
    public static String getRandomNumber(int len) {
        Random rnd = new Random();

        // Chỉ dùng các ký tự số từ 0 đến 9.
        String chars = "0123456789";

        StringBuilder sb = new StringBuilder(len);

        // Sinh lần lượt từng chữ số ngẫu nhiên.
        for (int i = 0; i < len; i++) {
            sb.append(chars.charAt(rnd.nextInt(chars.length())));
        }

        // Trả về mã số ngẫu nhiên.
        return sb.toString();
    }
}