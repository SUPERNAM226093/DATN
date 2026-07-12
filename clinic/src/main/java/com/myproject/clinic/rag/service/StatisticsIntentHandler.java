package com.myproject.clinic.rag.service;

import com.myproject.clinic.entity.Doctor;
import com.myproject.clinic.entity.Specialization;
import com.myproject.clinic.rag.dto.ChatRequest;
import com.myproject.clinic.rag.dto.ChatResponse;
import com.myproject.clinic.rag.dto.ExtractionResult;
import com.myproject.clinic.repository.DoctorRepository;
import com.myproject.clinic.repository.SpecializationRepository;
import com.myproject.clinic.utils.LlmService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
@Slf4j
@RequiredArgsConstructor
public class StatisticsIntentHandler implements ChatbotIntentStrategy {

    private final DoctorRepository doctorRepository;
    private final SpecializationRepository specializationRepository;
    private final LlmService llmService;

    private static final int MAX_RECORDS = 10;
    private static final String DISCLAIMER = "\n\n> *Thông tin trên mang tính tham khảo. Để được tư vấn chính xác, vui lòng liên hệ hotline phòng khám.*";

    // === STRATEGY PATTERN: implement ChatbotIntentStrategy ===

    /**
     * Trả về intent STATISTICS để xử lý các câu hỏi thống kê, danh sách bác
     * sĩ/chuyên khoa.
     */
    @Override
    public String getSupportedIntent() {
        return "STATISTICS";
    }

    @Override
    public ChatResponse handle(ChatRequest request, java.util.Map<String, Object> state) {
        ExtractionResult params = (ExtractionResult) state.getOrDefault("extractedParams", new ExtractionResult());
        return handle(request.getMessage(), params);
    }

    /**
     * Logic chính của xử lý Thống kê (STATISTICS).
     * Phân nhánh xử lý:
     * 1. Có ID Chuyên khoa: Lọc danh sách bác sĩ thuộc khoa đó
     * 2. Có Tên Chuyên khoa nhưng không tìm thấy ID: Thông báo lỗi lịch sự, liệt kê
     * tên các khoa có sẵn.
     * 3. Hỏi chung chung: Lấy toàn bộ danh sách khoa, đếm số lượng bác sĩ từng
     * khoa, và gợi ý top 5 bác sĩ giỏi nhất.
     * Cuối cùng, ghép các chuỗi văn bản tạo thành `dbContext` và đưa vào LLM
     */
    public ChatResponse handle(String message, ExtractionResult params) {
        StringBuilder dbContext = new StringBuilder();
        List<ChatResponse.DoctorCard> doctorCards = new ArrayList<>();
        List<ChatResponse.CardItem> specCards = new ArrayList<>();

        // --- Truy vấn dữ liệu từ DB ---
        if (params.getSpecializationId() != null) {
            // Hỏi về bác sĩ của một khoa cụ thể
            List<Doctor> doctors = doctorRepository.findBySpecializationId(params.getSpecializationId());
            log.info("[Stats] Tìm bác sĩ theo specId={}: {} bác sĩ", params.getSpecializationId(), doctors.size());

            // Sort by experience descending
            doctors.sort((d1, d2) -> {
                int e1 = d1.getExperienceYears() != null ? d1.getExperienceYears() : 0;
                int e2 = d2.getExperienceYears() != null ? d2.getExperienceYears() : 0;
                return Integer.compare(e2, e1);
            });

            if (doctors.isEmpty()) {
                dbContext.append("Hiện tại không có bác sĩ nào thuộc chuyên khoa '")
                        .append(params.getSpecialization()).append("' trong hệ thống.");
            } else {
                int total = doctors.size();
                List<Doctor> limited = doctors.stream().limit(MAX_RECORDS).toList();

                dbContext.append("Chuyên khoa '").append(params.getSpecialization())
                        .append("' có tổng cộng ").append(total).append(" bác sĩ.\n");
                if (total > MAX_RECORDS) {
                    dbContext.append("(Hiển thị ").append(MAX_RECORDS)
                            .append(" bác sĩ tiêu biểu, sắp xếp theo kinh nghiệm)\n");
                } else {
                    dbContext.append("(Danh sách bác sĩ, sắp xếp theo kinh nghiệm)\n");
                }
                dbContext.append("Danh sách:\n");

                for (Doctor d : limited) {
                    String name = d.getUser().getFullName();
                    int exp = d.getExperienceYears() != null ? d.getExperienceYears() : 0;
                    String bio = d.getBio() != null ? d.getBio().substring(0, Math.min(80, d.getBio().length())) : "";
                    dbContext.append("- BS. ").append(name)
                            .append(" | ").append(exp).append(" năm kinh nghiệm")
                            .append(bio.isEmpty() ? "" : " | " + bio)
                            .append("\n");

                    doctorCards.add(buildDoctorCard(d));
                }

                if (total > MAX_RECORDS) {
                    dbContext.append("Còn ").append(total - MAX_RECORDS)
                            .append(" bác sĩ khác. Bạn có muốn lọc thêm theo tiêu chí không?");
                }
            }

        } else {
            if (params.getSpecialization() != null) {
                dbContext.append("Không tìm thấy chuyên khoa '").append(params.getSpecialization())
                        .append("' trong hệ thống.\n");

                // Chỉ liệt kê tên các chuyên khoa đang có, không gắn thẻ (cards) để tránh làm
                // rối UI
                List<Specialization> specs = specializationRepository.findAll();
                if (!specs.isEmpty()) {
                    dbContext.append("Hiện tại phòng khám chỉ có các chuyên khoa sau: ");
                    String specNames = specs.stream().map(Specialization::getName).collect(Collectors.joining(", "));
                    dbContext.append(specNames).append(".\nBạn có thể hỏi thông tin về các chuyên khoa này.");
                }
            } else {
                // Hỏi chung: danh sách tất cả chuyên khoa / tổng số bác sĩ / top kinh nghiệm
                List<Specialization> specs = specializationRepository.findAll();
                List<Doctor> allDoctors = doctorRepository.findAll();

                // Sort all doctors by experience
                List<Doctor> sortedAllDoctors = new ArrayList<>(allDoctors);
                sortedAllDoctors.sort((d1, d2) -> {
                    int e1 = d1.getExperienceYears() != null ? d1.getExperienceYears() : 0;
                    int e2 = d2.getExperienceYears() != null ? d2.getExperienceYears() : 0;
                    return Integer.compare(e2, e1);
                });

                Map<Long, Long> doctorCountBySpec = allDoctors.stream()
                        .filter(d -> d.getSpecialization() != null)
                        .collect(Collectors.groupingBy(
                                d -> d.getSpecialization().getId(),
                                Collectors.counting()));

                long totalDoctors = allDoctors.size();
                log.info("[Stats] Tổng quan: {} chuyên khoa, {} bác sĩ", specs.size(), totalDoctors);

                dbContext.append("Phòng khám hiện có:\n")
                        .append("- Tổng số bác sĩ: ").append(totalDoctors).append("\n")
                        .append("- Tổng số chuyên khoa: ").append(specs.size()).append("\n\n")
                        .append("Top các bác sĩ nhiều kinh nghiệm nhất phòng khám:\n");

                for (Doctor d : sortedAllDoctors.stream().limit(5).toList()) {
                    String name = d.getUser().getFullName();
                    int exp = d.getExperienceYears() != null ? d.getExperienceYears() : 0;
                    String specName = d.getSpecialization() != null ? d.getSpecialization().getName() : "Đa khoa";
                    dbContext.append("- BS. ").append(name)
                            .append(" (Khoa ").append(specName).append(") - ")
                            .append(exp).append(" năm kinh nghiệm\n");
                    doctorCards.add(buildDoctorCard(d));
                }

                dbContext.append("\nDanh sách chuyên khoa:\n");
                for (Specialization spec : specs) {
                    long docCount = doctorCountBySpec.getOrDefault(spec.getId(), 0L);
                    dbContext.append("• ").append(spec.getName())
                            .append(" (").append(docCount).append(" bác sĩ)\n");
                    specCards.add(ChatResponse.CardItem.builder()
                            .id(spec.getId())
                            .name(spec.getName())
                            .description(spec.getDescription())
                            .featureImageUrl(
                                    spec.getFeatureImage() != null ? "/images/" + spec.getFeatureImage() : null)
                            .type("specialization")
                            .build());
                }
            }
        }

        // --- Tổng hợp câu trả lời qua LLM ---
        String reply = synthesizeResponse(message, dbContext.toString());

        return ChatResponse.builder()
                .message(reply + DISCLAIMER)
                .intent("STATISTICS")
                .step("RESULT")
                .doctors(doctorCards.isEmpty() ? null : doctorCards)
                .specializations(specCards.isEmpty() ? null : specCards)
                .build();
    }

    /**
     * Tổng hợp câu trả lời thông qua LLM.
     * LLM sẽ đọc khối dữ liệu thực tế (context) lấy từ Database, và biến tấu nó
     * thành một đoạn hội thoại
     * tự nhiên, thân thiện với người dùng, tuyệt đối không bịa đặt thêm thông tin
     * ngoài.
     */
    private String synthesizeResponse(String userMessage, String context) {
        if (context.isBlank()) {
            return "Xin lỗi, tôi không tìm thấy thông tin phù hợp. Bạn thử hỏi với từ khóa khác nhé!";
        }

        List<LlmService.ChatMessage> messages = new ArrayList<>();
        messages.add(new LlmService.ChatMessage("system",
                "Bạn là trợ lý ảo thân thiện của phòng khám. " +
                        "Dưới đây là dữ liệu thực tế từ hệ thống:\n\n" + context +
                        "\n\nHãy trả lời câu hỏi của người dùng một cách tự nhiên, thân thiện, " +
                        "dựa VÀO DỮ LIỆU TRÊN, không được bịa thêm thông tin. " +
                        "Nếu có nhiều bác sĩ, gợi ý người dùng đặt lịch với bác sĩ phù hợp nhất. " +
                        "Trả lời bằng tiếng Việt."));
        messages.add(new LlmService.ChatMessage("user", userMessage));

        return llmService.chat(messages);
    }

    private ChatResponse.DoctorCard buildDoctorCard(Doctor d) {
        return ChatResponse.DoctorCard.builder()
                .id(d.getId())
                .fullName(d.getUser().getFullName())
                .specializationName(d.getSpecialization() != null ? d.getSpecialization().getName() : null)
                .bio(d.getBio())
                .featureImageUrl(d.getFeatureImage() != null ? "/images/" + d.getFeatureImage() : null)
                .experienceYears(d.getExperienceYears())
                .build();
    }
}
