package com.myproject.clinic.rag.service;

import com.myproject.clinic.entity.Specialization;
import com.myproject.clinic.repository.SpecializationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Chuẩn hóa tên chuyên khoa từ cách người dùng gọi dân dã
 * về đúng tên chuẩn trong Database.
 * Ví dụ: "khoa tim", "bệnh tim", "tim mạch" -> "Tim mạch" (ID=1)
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class AliasNormalizationService {

    private final SpecializationRepository specializationRepository;

    /**
     * Map các từ khóa viết tắt / dân dã sang tên chuẩn trong DB.
     * Nên mở rộng danh sách này khi phòng khám phát sinh thêm chuyên khoa.
     */
    private static final Map<String, String> ALIAS_MAP = Map.ofEntries(
            // Tim mạch
            Map.entry("tim", "Tim mạch"),
            Map.entry("tim mạch", "Tim mạch"),
            Map.entry("bệnh tim", "Tim mạch"),
            Map.entry("khoa tim", "Tim mạch"),
            Map.entry("cardiology", "Tim mạch"),
            Map.entry("cardiovascular", "Tim mạch"),
            // Nhi khoa
            Map.entry("nhi", "Nhi khoa"),
            Map.entry("trẻ em", "Nhi khoa"),
            Map.entry("khoa nhi", "Nhi khoa"),
            Map.entry("pediatric", "Nhi khoa"),
            Map.entry("kids", "Nhi khoa"),
            // Nội khoa
            Map.entry("nội", "Nội khoa"),
            Map.entry("khoa nội", "Nội khoa"),
            Map.entry("internal medicine", "Nội khoa"),
            // Da liễu
            Map.entry("da", "Da liễu"),
            Map.entry("da liễu", "Da liễu"),
            Map.entry("ngoài da", "Da liễu"),
            Map.entry("dermatology", "Da liễu"),
            // Thần kinh
            Map.entry("thần kinh", "Thần kinh"),
            Map.entry("khoa thần kinh", "Thần kinh"),
            Map.entry("đầu", "Thần kinh"),
            Map.entry("neurology", "Thần kinh"),
            // Mắt
            Map.entry("mắt", "Nhãn khoa"),
            Map.entry("nhãn khoa", "Nhãn khoa"),
            Map.entry("ophthalmology", "Nhãn khoa"),
            // Tai mũi họng
            Map.entry("tai mũi họng", "Tai Mũi Họng"),
            Map.entry("tmh", "Tai Mũi Họng"),
            Map.entry("tai", "Tai Mũi Họng"),
            Map.entry("họng", "Tai Mũi Họng"),
            // Xương khớp
            Map.entry("xương khớp", "Cơ xương khớp"),
            Map.entry("xương", "Cơ xương khớp"),
            Map.entry("khớp", "Cơ xương khớp"),
            Map.entry("orthopedic", "Cơ xương khớp"),
            // Sản phụ khoa
            Map.entry("sản", "Sản phụ khoa"),
            Map.entry("phụ khoa", "Sản phụ khoa"),
            Map.entry("obstetrics", "Sản phụ khoa"),
            // Tiêu hóa - Gan mật
            Map.entry("gan", "Tiêu hóa - Gan mật"),
            Map.entry("gan mật", "Tiêu hóa - Gan mật"),
            Map.entry("tiêu hóa", "Tiêu hóa - Gan mật"),
            Map.entry("dạ dày", "Tiêu hóa - Gan mật"),
            Map.entry("gastroenterology", "Tiêu hóa - Gan mật"),
            // Hô hấp
            Map.entry("phổi", "Hô hấp"),
            Map.entry("hô hấp", "Hô hấp"),
            Map.entry("pulmonology", "Hô hấp"),
            // Răng hàm mặt
            Map.entry("răng", "Răng hàm mặt"),
            Map.entry("răng hàm mặt", "Răng hàm mặt"),
            Map.entry("nha khoa", "Răng hàm mặt"),
            Map.entry("dentist", "Răng hàm mặt"));

    /**
     * Tìm ID chuyên khoa từ tên dân dã mà người dùng nhập.
     * Ưu tiên: Khớp chính xác không dấu -> Khớp bán phần không dấu -> Alias Map.
     *
     * @param rawName
     * @return
     */
    public Long resolveSpecializationId(String rawName) {
        if (rawName == null || rawName.isBlank())
            return null;

        String cleanInput = removeDiacritics(rawName.toLowerCase().trim());

        // Tiền xử lý: bỏ các từ "khoa", "chuyên khoa", "phòng khám" để so khớp lõi tốt
        // hơn
        cleanInput = cleanInput.replaceAll("^(chuyen\\s+)?khoa\\s+", "")
                .replaceAll("^phong\\s+kham\\s+", "")
                .trim();

        // Lấy tất cả chuyên khoa từ DB
        List<Specialization> allSpecs = specializationRepository.findAll();

        // Bước 1: Thử tìm khớp chính xác sau khi bỏ dấu
        for (Specialization spec : allSpecs) {
            String cleanSpecName = removeDiacritics(spec.getName().toLowerCase().trim());
            cleanSpecName = cleanSpecName.replaceAll("^(chuyen\\s+)?khoa\\s+", "").trim();

            if (cleanSpecName.equals(cleanInput)) {
                log.info("[AliasNorm] Khớp chính xác không dấu: '{}' -> '{}' (ID={})", rawName, spec.getName(),
                        spec.getId());
                return spec.getId();
            }
        }

        // Bước 2: Thử tìm khớp bán phần (chứa nhau) sau khi bỏ dấu
        for (Specialization spec : allSpecs) {
            String cleanSpecName = removeDiacritics(spec.getName().toLowerCase().trim());
            cleanSpecName = cleanSpecName.replaceAll("^(chuyen\\s+)?khoa\\s+", "").trim();

            if (cleanSpecName.contains(cleanInput) || cleanInput.contains(cleanSpecName)) {
                log.info("[AliasNorm] Khớp bán phần không dấu: '{}' -> '{}' (ID={})", rawName, spec.getName(),
                        spec.getId());
                return spec.getId();
            }
        }

        // Bước 3: Dự phòng tìm theo Alias Map gốc
        String normalized = rawName.toLowerCase().trim();
        String canonicalName = ALIAS_MAP.get(normalized);
        if (canonicalName != null) {
            Optional<Specialization> found = findByName(canonicalName);
            if (found.isPresent()) {
                log.info("[AliasNorm] Khớp Alias Map: '{}' -> '{}' (ID={})", rawName, canonicalName,
                        found.get().getId());
                return found.get().getId();
            }
        }

        log.warn("[AliasNorm] Không tìm thấy chuyên khoa cho: '{}'", rawName);
        return null;
    }

    /**
     * Loại bỏ dấu tiếng Việt để so sánh chuỗi chính xác.
     */
    public static String removeDiacritics(String str) {
        if (str == null)
            return null;
        String nfdNormalizedString = java.text.Normalizer.normalize(str, java.text.Normalizer.Form.NFD);
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        String temp = pattern.matcher(nfdNormalizedString).replaceAll("");
        return temp.replace('đ', 'd').replace('Đ', 'D')
                .replace("o\u031b", "o")
                .replace("u\u031b", "u");
    }

    /**
     * Tìm kiếm một chuyên khoa theo tên chính xác (không phân biệt hoa thường).
     */

    private Optional<Specialization> findByName(String name) {
        return specializationRepository.findAll().stream()
                .filter(s -> s.getName().equalsIgnoreCase(name))
                .findFirst();
    }
}
