package com.myproject.clinic.utils;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import io.netty.resolver.DefaultAddressResolverGroup;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@Service
@Slf4j
public class LlmService {

    private final WebClient webClient;
    private final ObjectMapper objectMapper;
    private final String hfToken;
    private final String groqApiKey;

    private static final String HF_CHAT_URL = "https://router.huggingface.co/v1/chat/completions";
    private static final String HF_MODEL = "Qwen/Qwen2.5-72B-Instruct";

    private static final String GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String GROQ_MODEL = "llama-3.3-70b-versatile";

    private static final Pattern THINK_PATTERN = Pattern.compile("<think>.*?</think>", Pattern.DOTALL);

    public LlmService(@Value("${hf.token}") String hfToken,
            @Value("${groq.api.key}") String groqApiKey,
            ObjectMapper objectMapper) {
        this.hfToken = hfToken;
        this.groqApiKey = groqApiKey;
        this.objectMapper = objectMapper;
        HttpClient httpClient = HttpClient.create()
                .resolver(DefaultAddressResolverGroup.INSTANCE);

        this.webClient = WebClient.builder()
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(10 * 1024 * 1024))
                // Timeout 25s để tránh treo vô hạn khi deploy production
                .defaultHeader("Connection", "keep-alive")
                .build();
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChatMessage {
        private String role;
        private String content;
    }

    // Sentinel dùng để phát hiện khi LLM thất bại (không phải câu trả lời hợp lệ)
    public static final String LLM_ERROR_SENTINEL = "__LLM_ERROR__";

    /**
     * Gửi danh sách prompt/tin nhắn lên LLM để lấy câu trả lời cho chatbot.
     * Ưu tiên Groq trước để phản hồi nhanh; nếu Groq lỗi thì tự động chuyển sang
     * Hugging Face.
     */
    public String chat(List<ChatMessage> messages) {
        // --- ƯU TIÊN SỬ DỤNG GROQ ---
        if (groqApiKey != null && !groqApiKey.isBlank() && !"your_groq_api_key_here".equals(groqApiKey)) {
            try {
                log.info("[LLM] Đang gọi Groq API với model: {}...", GROQ_MODEL);
                String response = callGroq(messages);
                if (response != null && !response.isBlank())
                    return response;
            } catch (Exception e) {
                log.error("[LLM] Groq API thất bại: {}", e.getMessage());
            }
        }

        // --- HẬU BỊ: SỬ DỤNG HUGGING FACE ---
        if (hfToken != null && !hfToken.isBlank() && !"your_hugging_face_token_here".equals(hfToken)) {
            try {
                log.info("[LLM] Đang gọi Hugging Face Router...");
                String response = callHuggingFace(messages);
                if (response != null && !response.isBlank())
                    return response;
            } catch (Exception e) {
                log.error("[LLM] HuggingFace thất bại: {}", e.getMessage());
            }
        }

        // --- KẾT QUẢ CUỐI CÙNG: Trả sentinel để caller biết LLM lỗi ---
        if ((groqApiKey == null || groqApiKey.isBlank() || "your_groq_api_key_here".equals(groqApiKey)) &&
                (hfToken == null || hfToken.isBlank() || "your_hugging_face_token_here".equals(hfToken))) {
            log.error("[LLM] Chưa cấu hình API Key cho Groq hoặc Hugging Face.");
        } else {
            log.error("[LLM] Cả Groq và Hugging Face đều thất bại.");
        }
        return LLM_ERROR_SENTINEL;
    }

    /**
     * Gọi Groq Chat Completions API với model cấu hình sẵn và trả về nội dung câu
     * trả lời.
     * Đây là nơi payload gồm messages, model, max_tokens được gửi thật sang Groq.
     */
    private String callGroq(List<ChatMessage> messages) throws Exception {
        Map<String, Object> requestBody = Map.of(
                "messages", messages,
                "model", GROQ_MODEL,
                "stream", false,
                "max_tokens", 1024);

        String responseBody = webClient.post()
                .uri(GROQ_CHAT_URL)
                .header("Authorization", "Bearer " + groqApiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofSeconds(25))
                .block();

        JsonNode root = objectMapper.readTree(responseBody);
        if (root.has("error")) {
            log.error("Groq Error Body: {}", root.get("error"));
            return null;
        }
        String content = root.path("choices").get(0).path("message").path("content").asText();
        return stripThinkTags(content);
    }

    /**
     * Gọi Hugging Face Router như phương án dự phòng khi Groq không khả dụng.
     * Hàm dùng cùng định dạng messages để chatbot vẫn trả lời được khi provider
     * chính lỗi.
     */
    private String callHuggingFace(List<ChatMessage> messages) throws Exception {
        // max_tokens=512 đủ cho chatbot y tế, nhanh hơn đáng kể so với 2048
        Map<String, Object> requestBody = Map.of(
                "messages", messages,
                "model", HF_MODEL,
                "stream", false,
                "max_tokens", 512);

        String responseBody = webClient.post()
                .uri(HF_CHAT_URL)
                .header("Authorization", "Bearer " + hfToken)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(String.class)
                .timeout(Duration.ofSeconds(25))
                .block();

        JsonNode root = objectMapper.readTree(responseBody);
        if (root.has("error")) {
            log.error("HF Error Body: {}", root.get("error"));
            return null;
        }
        String content = root.path("choices").get(0).path("message").path("content").asText();
        return stripThinkTags(content);
    }

    /**
     * Phân loại intent nhanh — dùng max_tokens=10 vì chỉ cần 1 từ.
     */
    /**
     * Phân loại intent nhanh bằng LLM cho các luồng cũ cần một nhãn đơn giản.
     * Module RAG hiện tại chủ yếu dùng IntentClassifier, hàm này giữ vai trò tiện
     * ích dùng lại.
     */
    public String classifyIntent(String userMessage) {
        List<ChatMessage> messages = new ArrayList<>();
        messages.add(new ChatMessage("system",
                "Phân loại intent: SYMPTOM (triệu chứng/bệnh), SEARCH (tìm bác sĩ/khoa/gói khám), GENERAL (khác).\n" +
                        "Chỉ trả lời 1 từ."));
        messages.add(new ChatMessage("user", userMessage));

        String result = chat(messages).trim().toUpperCase();

        if (result.contains("SYMPTOM"))
            return "SYMPTOM";
        if (result.contains("SEARCH"))
            return "SEARCH";
        return "GENERAL";
    }

    /**
     * Sinh lời giải thích thân thiện cho kết quả dự đoán bệnh tim từ module machine
     * learning.
     * LLM nhận mức độ rủi ro và các chỉ số y tế, sau đó viết phần tư vấn ngắn cho
     * người dùng.
     */
    public String generateHeartDiseaseExplanation(int level, Map<String, Double> features) {
        StringBuilder prompt = new StringBuilder();
        prompt.append(
                "Bạn là một chuyên gia tư vấn sức khỏe AI. Hệ thống Machine Learning vừa phân tích chỉ số người dùng và đưa ra ")
                .append("Chẩn đoán Mức độ Bệnh Tim là: Cấp độ ").append(level)
                .append(" (Thang: 0 là bình thường, 1-4 là mức độ nghiêm trọng tăng dần).\n\n")
                .append("Dưới đây là các chỉ số y tế lâm sàng của người dùng:\n");

        for (Map.Entry<String, Double> entry : features.entrySet()) {
            prompt.append("- ").append(entry.getKey()).append(": ").append(entry.getValue()).append("\n");
        }

        prompt.append(
                "\nHãy đóng vai thành bác sĩ, giải thích ngắn gọn, xúc tích, thân thiện và chuyên nghiệp về kết quả phân tích này. ")
                .append("Chú ý giải nghĩa một vài chỉ số nếu chúng là nguyên nhân chính gầy rủi ro (như tuổi tác, cholesterol, nhịp tim cao/huyết áp...). ")
                .append("Cuối cùng khuyên người dùng nên đi khám thực tế nếu mức độ >= 1.");

        List<ChatMessage> messages = new ArrayList<>();
        messages.add(new ChatMessage("user", prompt.toString()));
        return chat(messages);
    }

    /**
     * Loại bỏ các đoạn suy luận nội bộ dạng <think>...</think> nếu model trả về.
     * Chỉ giữ nội dung cuối cùng phù hợp để hiển thị cho người dùng.
     */
    private String stripThinkTags(String text) {
        if (text == null)
            return "";
        return THINK_PATTERN.matcher(text).replaceAll("").trim();
    }
}
