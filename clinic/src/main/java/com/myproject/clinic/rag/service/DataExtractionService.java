package com.myproject.clinic.rag.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.myproject.clinic.rag.dto.ExtractionResult;
import com.myproject.clinic.utils.LlmService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * Trích xuất các tham số có cấu trúc từ câu hỏi tự nhiên của người dùng.
 *
 * Luồng:
 * 1. Inject ngày giờ thực của hệ thống vào prompt để LLM quy đổi thời gian
 * tương đối.
 * 2. Gọi LLM trả về JSON với schema cố định.
 * 3. Validate và chuẩn hóa JSON (xử lý thiếu field, null).
 * 4. Resolve tên chuyên khoa thành ID qua AliasNormalizationService.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class DataExtractionService {

    private final LlmService llmService;
    private final ObjectMapper objectMapper;
    private final AliasNormalizationService aliasNormalizationService;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    /**
     * Trích xuất tham số từ câu hỏi người dùng.
     *
     * @param message
     * @param intents
     * @return
     */
    public ExtractionResult extract(String message, List<String> intents) {
        return extract(message, intents, null);
    }

    public ExtractionResult extract(String message, List<String> intents,
            List<java.util.Map<String, String>> chatHistory) {
        String today = LocalDate.now().format(DATE_FORMATTER);
        String tomorrow = LocalDate.now().plusDays(1).format(DATE_FORMATTER);
        String dayOfWeek = getDayOfWeekVi(LocalDate.now());

        List<LlmService.ChatMessage> messages = new ArrayList<>();
        messages.add(new LlmService.ChatMessage("system",
                "Bạn là hệ thống trích xuất tham số cho chatbot phòng khám. " +
                        "Hôm nay là " + dayOfWeek + " ngày " + today + ". Ngày mai là " + tomorrow + ".\n\n" +
                        "Từ câu hỏi của người dùng và lịch sử trò chuyện gần nhất, hãy trích xuất các tham số sau và trả về ĐÚNG JSON schema này:\n"
                        +
                        "{\n" +
                        "  \"specialization\": \"<tên chuyên khoa, tự động suy luận từ lịch sử trò chuyện nếu người dùng dùng từ thay thế như 'khoa này', 'khoa đó' để chỉ chuyên khoa được đề cập gần nhất trước đó, hoặc null nếu không thể xác định>\",\n"
                        +
                        "  \"doctorName\": \"<tên bác sĩ, tự động suy luận từ lịch sử trò chuyện nếu người dùng dùng 'bác sĩ này', 'bác sĩ đó', hoặc null nếu không đề cập>\",\n"
                        +
                        "  \"date\": \"<ngày theo định dạng yyyy-MM-dd, mặc định " + today + " nếu không nói rõ>\",\n" +
                        "  \"type\": \"<ONLINE|OFFLINE|ALL, mặc định ALL>\",\n" +
                        "  \"timeRange\": \"<MORNING|AFTERNOON|ALL, mặc định ALL>\"\n" +
                        "}\n\n" +
                        "Quy tắc:\n" +
                        "- 'hôm nay' = " + today + ", 'ngày mai' = " + tomorrow + "\n" +
                        "- 'sáng' = MORNING (trước 12h), 'chiều' = AFTERNOON (từ 12h trở đi), 'tối' = AFTERNOON\n" +
                        "- 'online', 'trực tuyến', 'từ xa' = ONLINE\n" +
                        "- Phân tích kỹ lịch sử trò chuyện để tìm ra chuyên khoa/bác sĩ được đề cập gần nhất trước đó nếu câu hỏi hiện tại có tính chất tham chiếu (ví dụ: 'khoa này', 'bác sĩ đó').\n"
                        +
                        "- Chỉ trả về JSON thuần túy, không giải thích gì thêm"));

        // Thêm lịch sử chat để LLM hiểu ngữ cảnh của từ "khoa này", "bác sĩ này"
        if (chatHistory != null) {
            int startIdx = Math.max(0, chatHistory.size() - 5);
            for (int i = startIdx; i < chatHistory.size(); i++) {
                java.util.Map<String, String> msg = chatHistory.get(i);
                // Bỏ qua tin nhắn user cuối cùng nếu nó trùng với message đầu vào
                if (i == chatHistory.size() - 1 && "user".equals(msg.get("role"))) {
                    continue;
                }
                messages.add(new LlmService.ChatMessage(msg.get("role"), msg.get("content")));
            }
        }

        messages.add(new LlmService.ChatMessage("user", message));

        String rawJson = llmService.chat(messages).trim();
        log.info("[DataExtraction] Raw JSON từ LLM: {}", rawJson);

        return parseAndValidate(rawJson, intents, today);
    }

    /**
     * Hàm phụ trợ (Helper method) để parse và validate chuỗi JSON trả về từ LLM.
     * Nếu chuỗi JSON bị lỗi (ví dụ: LLM trả về văn bản thừa), hệ thống sẽ bắt
     * exception
     * và trả về một đối tượng ExtractionResult chứa các giá trị an toàn/mặc định.
     */
    private ExtractionResult parseAndValidate(String rawJson, List<String> intents, String defaultDate) {
        try {
            // Loại bỏ markdown code block nếu LLM bọc trong ```json ... ```
            String cleaned = rawJson
                    .replaceAll("```json", "")
                    .replaceAll("```", "")
                    .trim();

            JsonNode node = objectMapper.readTree(cleaned);

            String specialization = getTextOrNull(node, "specialization");
            String doctorName = getTextOrNull(node, "doctorName");
            String date = getTextOrNull(node, "date");
            String type = getTextOrDefault(node, "type", "ALL");
            String timeRange = getTextOrDefault(node, "timeRange", "ALL");

            // Validate date: nếu null thì mặc định hôm nay
            if (date == null || date.isBlank()) {
                date = defaultDate;
                log.debug("[DataExtraction] date null -> mặc định hôm nay: {}", date);
            }

            // Validate type
            if (!List.of("ONLINE", "OFFLINE", "ALL").contains(type.toUpperCase())) {
                type = "ALL";
            }

            // Validate timeRange
            if (!List.of("MORNING", "AFTERNOON", "ALL").contains(timeRange.toUpperCase())) {
                timeRange = "ALL";
            }

            // Resolve specializationId
            Long specializationId = null;
            if (specialization != null && !specialization.isBlank()) {
                specializationId = aliasNormalizationService.resolveSpecializationId(specialization);
                log.info("[DataExtraction] specialization='{}' -> ID={}", specialization, specializationId);
            }

            ExtractionResult result = ExtractionResult.builder()
                    .specialization(specialization)
                    .specializationId(specializationId)
                    .doctorName(doctorName)
                    .date(date)
                    .type(type.toUpperCase())
                    .timeRange(timeRange.toUpperCase())
                    .intents(intents)
                    .build();

            log.info("[DataExtraction] Kết quả: spec={}, specId={}, doctor={}, date={}, type={}, timeRange={}",
                    result.getSpecialization(), result.getSpecializationId(),
                    result.getDoctorName(), result.getDate(),
                    result.getType(), result.getTimeRange());

            return result;

        } catch (Exception e) {
            log.warn("[DataExtraction] Không parse được JSON '{}', dùng giá trị mặc định. Lỗi: {}",
                    rawJson.substring(0, Math.min(100, rawJson.length())), e.getMessage());

            return ExtractionResult.builder()
                    .date(defaultDate)
                    .type("ALL")
                    .timeRange("ALL")
                    .intents(intents)
                    .build();
        }
    }

    /**
     * Trích xuất giá trị Text từ JSON Node, nếu rỗng hoặc chữ "null" thì trả về
     * null thực sự.
     * Tránh lỗi LLM trả về chuỗi "null" thay vì null value trong JSON.
     */
    /**
     * Lấy một field dạng text từ JSON LLM trả về và chuẩn hóa chuỗi rỗng/"null"
     * thành null thật.
     * Cách này giúp các handler phía sau không phải xử lý nhiều biến thể dữ liệu
     * bẩn.
     */
    private String getTextOrNull(JsonNode node, String field) {
        if (node.has(field) && !node.get(field).isNull()) {
            String val = node.get(field).asText().trim();
            return val.isEmpty() || val.equalsIgnoreCase("null") ? null : val;
        }
        return null;
    }

    /**
     * Tương tự getTextOrNull nhưng có hỗ trợ trả về giá trị mặc định nếu null.
     */
    /**
     * Lấy field text từ JSON, nếu thiếu thì dùng giá trị mặc định.
     * Dùng cho các trường có default rõ ràng như type hoặc timeRange.
     */
    private String getTextOrDefault(JsonNode node, String field, String defaultValue) {
        String val = getTextOrNull(node, field);
        return val != null ? val : defaultValue;
    }

    /**
     * Trả về tên Thứ trong tuần (tiếng Việt) dựa trên ngày đưa vào.
     * Giúp cho LLM có thêm context (Ví dụ: "Hôm nay là Thứ Ba") để phân tích câu
     * "Sáng thứ tư tuần này".
     */
    private String getDayOfWeekVi(LocalDate date) {
        return switch (date.getDayOfWeek()) {
            case MONDAY -> "Thứ Hai";
            case TUESDAY -> "Thứ Ba";
            case WEDNESDAY -> "Thứ Tư";
            case THURSDAY -> "Thứ Năm";
            case FRIDAY -> "Thứ Sáu";
            case SATURDAY -> "Thứ Bảy";
            case SUNDAY -> "Chủ Nhật";
        };
    }
}
