package com.myproject.clinic.appointment.controller;

import com.myproject.clinic.appointment.dto.AppointmentRequest;
import com.myproject.clinic.appointment.dto.AppointmentResponse;
import com.myproject.clinic.appointment.service.AppointmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;

    @GetMapping
    public ResponseEntity<List<AppointmentResponse>> getAll() {
        return ResponseEntity.ok(appointmentService.findAll());
    }

    /**
     * Tìm kiếm và lấy thông tin chi tiết của bản ghi theo mã định danh ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<AppointmentResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(appointmentService.findById(id));
    }

    /**
     * Tạo mới và lưu bản ghi vào hệ thống.
     */
    @PostMapping
    public ResponseEntity<AppointmentResponse> create(@RequestBody AppointmentRequest request) {
        return ResponseEntity.ok(appointmentService.create(request));
    }

    /**
     * Cập nhật thông tin chi tiết cho bản ghi.
     */
    @PutMapping("/{id}")
    public ResponseEntity<AppointmentResponse> update(@PathVariable Long id, @RequestBody AppointmentRequest request) {
        return ResponseEntity.ok(appointmentService.update(id, request));
    }

    /**
     * Xóa bản ghi khỏi hệ thống.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        appointmentService.delete(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Phương thức: Lấy theo lịch trình.
     */
    @GetMapping("/by-schedule/{scheduleId}")
    public ResponseEntity<List<AppointmentResponse>> getBySchedule(@PathVariable Long scheduleId) {
        return ResponseEntity.ok(appointmentService.findByScheduleId(scheduleId));
    }

    /**
     * Phương thức: Lấy theo bệnh nhân id.
     */
    @GetMapping("/by-patient/{patientId}")
    public ResponseEntity<List<AppointmentResponse>> getByPatientId(@PathVariable Long patientId) {
        return ResponseEntity.ok(appointmentService.findByPatientId(patientId));
    }

    @PutMapping("/{id}/cancel/{userId}")
    public ResponseEntity<Void> cancelAppointment(
            @PathVariable Long id,
            @PathVariable Long userId,
            @RequestParam String reason) {
        appointmentService.cancel(id, userId, reason);
        return ResponseEntity.noContent().build();
    }
}
