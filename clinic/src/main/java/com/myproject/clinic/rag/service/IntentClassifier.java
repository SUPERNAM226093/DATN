package com.myproject.clinic.rag.service;

import com.myproject.clinic.utils.LlmService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Phân loại intent câu hỏi của người dùng qua 2 tầng:
 *
 * Tầng 1 — Regex nhanh (không tốn API call):
 * STATISTICS — bao nhiêu, danh sách bác sĩ, chuyên khoa nào...
 * UNKNOWN — thời tiết, giá vàng, bóng đá... (ngoài y tế)
 *
 * Tầng 2 — LLM fallback (chỉ khi Tầng 1 không xác định được):
 * SYMPTOM, SEARCH, GENERAL, UNKNOWN
 *
 * Intent hỗ trợ (khớp với IntentStrategyFactory):
 * STATISTICS | SYMPTOM | SEARCH | GENERAL | UNKNOWN
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class IntentClassifier {

    private final LlmService llmService;

    private static final Set<String> VALID_INTENTS = Set.of("STATISTICS", "SYMPTOM", "SEARCH", "GENERAL", "UNKNOWN");

    // --- Tầng 1: STATISTICS ---
    private static final Pattern STATISTICS_PATTERN = Pattern.compile(
            "(?U)\\b(bao nhiêu|có mấy|tổng số|danh sách|liệt kê|có những|gồm những|" +
                    "bác sĩ nào|có ai|những ai|khoa nào|chuyên khoa nào|thông tin|kinh nghiệm|ai giỏi|dữ liệu|chi tiết)\\b",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);

    // --- Tầng 1: SYMPTOM (triệu chứng phổ biến) ---
    private static final Pattern SYMPTOM_PATTERN = Pattern.compile(
            "(?U)\\b(đau|nhức|sốt|buồn nôn|nôn|ho|sổ mũi|khó thở|mệt|chóng mặt|" +
                    "ngứa|phát ban|nổi mẩn|sưng|viêm|dị ứng|" +
                    "triệu chứng|bệnh|khám gì|nên khám)\\b",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);

    // --- Tầng 1: SEARCH (tìm kiếm thông tin) ---
    private static final Pattern SEARCH_PATTERN = Pattern.compile(
            "(?U)\\b(tìm|tìm kiếm|tìm bác sĩ|bác sĩ giỏi|gói khám|dịch vụ|" +
                    "chuyên khoa|phòng khám|bác sĩ khoa)\\b",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);

    // --- Tầng 1: UNKNOWN (ngoài phạm vi y tế) ---
    private static final Pattern OUT_OF_SCOPE_PATTERN = Pattern.compile(
            "(?U)\\b(thời tiết|giá vàng|tỷ giá|bóng đá|tin tức|nấu ăn|công thức|" +
                    "trò chơi|game|phim|nhạc|chứng khoán|crypto|bitcoin)\\b",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);

    // --- Tầng 1: GENERAL (câu hỏi thông thường / liên hệ / lịch làm việc /
    // hotline) ---
    private static final Pattern GENERAL_PATTERN = Pattern.compile(
            "(?U)\\b(hotline|sđt|số điện thoại|lịch làm việc|giờ làm việc|giờ mở cửa|thời gian làm việc|" +
                    "địa chỉ|ở đâu|vị trí|bản đồ|liên hệ|email|cskh|chào|hello|hi|xin chào|tạm biệt|bye)\\b",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);

    public List<String> classify(String message) {
        if (message == null || message.isBlank())
            return List.of("UNKNOWN");

        String lower = message.toLowerCase().trim();

        // Tầng 1a: kiểm tra ngoài phạm vi — không cần LLM
        if (OUT_OF_SCOPE_PATTERN.matcher(lower).find()) {
            log.info("[IntentClassifier] Tầng 1 -> UNKNOWN (out of scope): '{}'", truncate(message));
            return List.of("UNKNOWN");
        }

        // Tầng 1b_1: GENERAL — câu hỏi liên hệ / thông tin chung
        if (GENERAL_PATTERN.matcher(lower).find()) {
            log.info("[IntentClassifier] Tầng 1 -> GENERAL: '{}'", truncate(message));
            return List.of("GENERAL");
        }

        // Tầng 1b_2: SYMPTOM — ưu tiên kiểm tra triệu chứng trước (tránh nhầm với
        // STATISTICS "bác sĩ nào")
        if (SYMPTOM_PATTERN.matcher(lower).find()) {
            log.info("[IntentClassifier] Tầng 1 -> SYMPTOM: '{}'", truncate(message));
            return List.of("SYMPTOM");
        }

        // Tầng 1c: SEARCH — tìm kiếm rõ ràng
        if (SEARCH_PATTERN.matcher(lower).find()) {
            log.info("[IntentClassifier] Tầng 1 -> SEARCH: '{}'", truncate(message));
            return List.of("SEARCH");
        }

        // Tầng 1d: STATISTICS — nhận diện nhanh bằng regex
        if (STATISTICS_PATTERN.matcher(lower).find()) {
            log.info("[IntentClassifier] Tầng 1 -> STATISTICS: '{}'", truncate(message));
            return List.of("STATISTICS");
        }

        // Tầng 2: LLM fallback cho SYMPTOM / SEARCH / GENERAL / UNKNOWN
        log.info("[IntentClassifier] Tầng 2 (LLM fallback): '{}'", truncate(message));
        return classifyWithLlm(message);
    }

    /**
     * Gọi LLM để phân loại câu hỏi khi các regex nhanh không nhận diện chắc chắn.
     * Prompt bắt model chỉ trả về một nhãn intent để Factory chọn đúng handler.
     */
    private List<String> classifyWithLlm(String message) {
        List<LlmService.ChatMessage> messages = new ArrayList<>();
        messages.add(new LlmService.ChatMessage("system",
                "Bạn là bộ phân loại intent cho chatbot phòng khám y tế. " +
                        "Phân loại câu hỏi vào ĐÚNG MỘT trong các intent sau:\n" +
                        "- SYMPTOM: người dùng mô tả triệu chứng, hỏi bệnh, hỏi nên khám gì\n" +
                        "- SEARCH: tìm bác sĩ theo tên/chuyên khoa, tìm gói khám sức khỏe\n" +
                        "- STATISTICS: hỏi số lượng hoặc danh sách bác sĩ/chuyên khoa\n" +
                        "- GENERAL: câu hỏi chung về phòng khám (địa chỉ, hotline, đặt lịch)\n" +
                        "- UNKNOWN: hoàn toàn ngoài phạm vi y tế và phòng khám\n\n" +
                        "Chỉ trả lời đúng 1 từ intent. Ví dụ: SYMPTOM"));
        messages.add(new LlmService.ChatMessage("user", message));

        String raw = llmService.chat(messages).trim();

        // LLM thất bại → fallback về GENERAL để tránh lỗi
        if (LlmService.LLM_ERROR_SENTINEL.equals(raw)) {
            log.warn("[IntentClassifier] LLM lỗi khi phân loại intent, mặc định GENERAL.");
            return List.of("GENERAL");
        }

        String cleaned = raw.toUpperCase().replaceAll("[^A-Z]", "");
        log.info("[IntentClassifier] LLM cleaned: '{}'", cleaned);

        String intent = VALID_INTENTS.contains(cleaned) ? cleaned : "GENERAL";
        return List.of(intent);
    }

    /**
     * Kiểm tra intent có thuộc nhóm Structured DB (không cần LLM) hay không.
     * Dùng để quyết định extract params trước khi gọi Strategy.
     */
    /**
     * Xác định intent có cần trích xuất tham số có cấu trúc trước khi xử lý hay
     * không.
     * Hiện chỉ STATISTICS cần bước extract để lấy chuyên khoa, ngày, loại hình
     * khám.
     */
    public boolean isStructuredIntent(String intent) {
        return "STATISTICS".equals(intent);
    }

    /**
     * Rút gọn câu hỏi khi ghi log để log dễ đọc và không quá dài.
     */
    private String truncate(String s) {
        return s.length() > 60 ? s.substring(0, 60) + "..." : s;
    }
}
