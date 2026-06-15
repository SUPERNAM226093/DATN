package com.myproject.clinic.healthpackage.service;

import com.myproject.clinic.entity.HealthPackage;
import com.myproject.clinic.entity.HealthPackageSchedule;
import com.myproject.clinic.exception.ResourceNotFoundException;
import com.myproject.clinic.healthpackage.dto.HealthPackageScheduleRequest;
import com.myproject.clinic.healthpackage.dto.HealthPackageScheduleResponse;
import com.myproject.clinic.repository.HealthPackageRepository;
import com.myproject.clinic.repository.HealthPackageScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Lớp dịch vụ (Service) xử lý logic nghiệp vụ và dữ liệu cho thực thể
 * HealthPackageSchedule.
 */
@Service
@RequiredArgsConstructor
public class HealthPackageScheduleService {

    private final HealthPackageScheduleRepository scheduleRepository;
    private final HealthPackageRepository healthPackageRepository;

    public List<HealthPackageScheduleResponse> findAll() {
        return scheduleRepository.findAll().stream().map(this::toResponse).toList();
    }

    public HealthPackageScheduleResponse findById(Long id) {
        return toResponse(scheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("HealthPackageSchedule", id)));
    }

    public List<HealthPackageScheduleResponse> findByHealthPackageId(Long healthPackageId) {
        return scheduleRepository.findByHealthPackageId(healthPackageId)
                .stream().map(this::toResponse).toList();
    }

    /**
     * Tạo mới và lưu bản ghi vào hệ thống.
     */
    public HealthPackageScheduleResponse create(HealthPackageScheduleRequest request) {
        HealthPackage hp = healthPackageRepository.findById(request.getHealthPackageId())
                .orElseThrow(() -> new ResourceNotFoundException("HealthPackage", request.getHealthPackageId()));

        HealthPackageSchedule schedule = HealthPackageSchedule.builder()
                .healthPackage(hp)
                .workDate(request.getWorkDate())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .build();

        return toResponse(scheduleRepository.save(schedule));
    }

    /**
     * Cập nhật thông tin chi tiết cho bản ghi.
     */
    public HealthPackageScheduleResponse update(Long id, HealthPackageScheduleRequest request) {
        HealthPackageSchedule schedule = scheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("HealthPackageSchedule", id));

        if (request.getWorkDate() != null)
            schedule.setWorkDate(request.getWorkDate());
        if (request.getStartTime() != null)
            schedule.setStartTime(request.getStartTime());
        if (request.getEndTime() != null)
            schedule.setEndTime(request.getEndTime());

        return toResponse(scheduleRepository.save(schedule));
    }

    /**
     * Xóa bản ghi khỏi hệ thống.
     */
    public void delete(Long id) {
        if (!scheduleRepository.existsById(id)) {
            throw new ResourceNotFoundException("HealthPackageSchedule", id);
        }
        scheduleRepository.deleteById(id);
    }

    /**
     * Chuyển đổi đối tượng thực thể (Entity) sang định dạng phản hồi (Response
     * DTO).
     */
    private HealthPackageScheduleResponse toResponse(HealthPackageSchedule s) {
        return HealthPackageScheduleResponse.builder()
                .id(s.getId())
                .healthPackageId(s.getHealthPackage().getId())
                .healthPackageName(s.getHealthPackage().getName())
                .workDate(s.getWorkDate())
                .startTime(s.getStartTime())
                .endTime(s.getEndTime())
                .createdAt(s.getCreatedAt())
                .build();
    }
}
