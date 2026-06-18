package com.myproject.clinic.rag.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExtractionResult {

    private String specialization;

 
    private Long specializationId;
    private String doctorName;
    private String date;
    @Builder.Default
    private String type = "ALL";
    @Builder.Default
    private String timeRange = "ALL";

    /**
     * Danh sách intent phát hiện được trong câu hỏi (hỗ trợ multi-intent).
     * Ví dụ: ["STATISTICS", "SEARCH"]
     */
    private java.util.List<String> intents;
}
