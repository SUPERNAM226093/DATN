package com.myproject.clinic.dashboard.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.myproject.clinic.dashboard.dto.DashboardStatsResponse;
import com.myproject.clinic.entity.Appointment;
import com.myproject.clinic.repository.AppointmentRepository;
import com.myproject.clinic.repository.HealthPackageBookingRepository;
import com.myproject.clinic.repository.OnlineConsultationRepository;
import com.myproject.clinic.repository.RoomBookingRepository;
import com.myproject.clinic.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DashboardService {

        private final UserRepository userRepository;
        private final AppointmentRepository appointmentRepository;
        private final OnlineConsultationRepository onlineConsultationRepository;
        private final HealthPackageBookingRepository healthPackageBookingRepository;
        private final RoomBookingRepository roomBookingRepository;

        /**
         * LOGIC TRUNG TÂM: Tính toán số liệu thống kê cho Dashboard.
         * GIẢI THÍCH: Hàm này lấy dữ liệu tổng hợp từ các bảng (User, Appointment, Booking...)
         * để so sánh kết quả giữa Giai đoạn hiện tại và Giai đoạn trước đó (để tính %
         * tăng trưởng).
         * 
         * @param period "WEEK" (7 ngày gần nhất) hoặc "MONTH" (30 ngày gần nhất).
         */
        public DashboardStatsResponse getStats(String dateStr) {
                LocalDateTime now = LocalDateTime.now();

                // Khoảng thời gian hiển thị mặc định là 30 ngày gần nhất [T-30 đến Nay]
                LocalDateTime currentStart = now.minusDays(30).with(LocalTime.MIN);
                int daysToDisplay = 30;

                // BƯỚC 1: Tính toán 4 chỉ số thống kê tổng quan (30 ngày gần nhất)
                long newPatients = userRepository.countByRoleNameIgnoreCaseAndCreatedAtBetween("PATIENT", currentStart, now);

                long totalPackageBookings = healthPackageBookingRepository.findByCreatedAtBetween(currentStart, now).stream()
                        .filter(b -> {
                                String status = b.getStatus();
                                return "CONFIRMED".equalsIgnoreCase(status) || "COMPLETED".equalsIgnoreCase(status);
                        })
                        .count();

                long totalRoomBookings = roomBookingRepository.findByCreatedAtBetween(currentStart, now).stream()
                        .filter(b -> {
                                String status = b.getStatus();
                                return "CONFIRMED".equalsIgnoreCase(status) || "COMPLETED".equalsIgnoreCase(status);
                        })
                        .count();

                long offlineCount = appointmentRepository.findByCreatedAtBetween(currentStart, now).stream()
                        .filter(a -> {
                                String status = a.getStatus();
                                return "CONFIRMED".equalsIgnoreCase(status) || "COMPLETED".equalsIgnoreCase(status);
                        })
                        .count();
                
                long onlineCount = onlineConsultationRepository.findByCreatedAtBetween(currentStart, now).stream()
                        .filter(o -> {
                                String status = o.getPaymentStatus();
                                return "CONFIRMED".equalsIgnoreCase(status) || "COMPLETED".equalsIgnoreCase(status);
                        })
                        .count();
                
                long totalConfirmedOrCompletedAppointments = offlineCount + onlineCount;

                // BƯỚC 1.5: Tính toán dữ liệu cho biểu đồ Cột Chồng (Direct Appointments)
                List<DashboardStatsResponse.DirectAppointmentChartPoint> directChartData = new ArrayList<>();
                List<Appointment> recentDirectAppointments = appointmentRepository.findByCreatedAtBetween(currentStart, now);
                
                Map<LocalDate, Long> completedMap = new HashMap<>();
                Map<LocalDate, Long> otherMap = new HashMap<>();

                for (Appointment a : recentDirectAppointments) {
                        if (a.getCreatedAt() != null) {
                                LocalDate date = a.getCreatedAt().toLocalDate();
                                String status = a.getStatus();
                                if ("COMPLETED".equalsIgnoreCase(status)) {
                                        completedMap.put(date, completedMap.getOrDefault(date, 0L) + 1);
                                } else if (!"CANCELLED".equalsIgnoreCase(status)) {
                                        otherMap.put(date, otherMap.getOrDefault(date, 0L) + 1);
                                }
                        }
                }

                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM");
                for (int i = 0; i <= daysToDisplay; i++) {
                        LocalDate date = currentStart.toLocalDate().plusDays(i);
                        if (date.isAfter(now.toLocalDate())) break;

                        directChartData.add(DashboardStatsResponse.DirectAppointmentChartPoint.builder()
                                        .date(date.format(formatter))
                                        .fullDate(date.toString())
                                        .completedCount(completedMap.getOrDefault(date, 0L))
                                        .otherCount(otherMap.getOrDefault(date, 0L))
                                        .build());
                }

                // BƯỚC 4: Lấy danh sách lịch khám theo ngày được chọn (Direct + Online)
                LocalDate targetDate = LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
                if (dateStr != null && !dateStr.trim().isEmpty()) {
                        try {
                                targetDate = LocalDate.parse(dateStr);
                        } catch (Exception e) {
                                // Bỏ qua nếu lỗi format, dùng mặc định
                        }
                }

                List<DashboardStatsResponse.TodayAppointmentDTO> todayAppointments = new ArrayList<>();

                List<Appointment> apps = appointmentRepository.findByAppointmentDate(targetDate);
                for (Appointment a : apps) {
                        String timeStr = a.getAppointmentTime() != null ? a.getAppointmentTime().toString() : "";
                        todayAppointments.add(DashboardStatsResponse.TodayAppointmentDTO.builder()
                                        .id(a.getId() != null ? a.getId().toString() : "")
                                        .patientName(a.getPatient() != null ? a.getPatient().getFullName() : "Khách")
                                        .doctorName(a.getDoctor() != null && a.getDoctor().getUser() != null
                                                        ? a.getDoctor().getUser().getFullName()
                                                        : "Bác sĩ")
                                        .time(timeStr)
                                        .sourceType("APPOINTMENT")
                                        .status(a.getStatus() != null ? a.getStatus() : "PENDING")
                                        .build());
                }

                List<com.myproject.clinic.entity.OnlineConsultation> onlines = onlineConsultationRepository
                                .findByConsultationDate(targetDate);
                for (com.myproject.clinic.entity.OnlineConsultation o : onlines) {
                        String timeStr = o.getConsultationTime() != null ? o.getConsultationTime() : "";
                        todayAppointments.add(DashboardStatsResponse.TodayAppointmentDTO.builder()
                                        .id(o.getId() != null ? o.getId().toString() : "")
                                        .patientName(o.getPatient() != null ? o.getPatient().getFullName() : "Khách")
                                        .doctorName(o.getDoctor() != null && o.getDoctor().getUser() != null
                                                        ? o.getDoctor().getUser().getFullName()
                                                        : "Bác sĩ")
                                        .time(timeStr)
                                        .sourceType("ONLINE")
                                        .status(o.getPaymentStatus() != null ? o.getPaymentStatus() : "PENDING")
                                        .build());
                }

                // Sắp xếp theo thời gian an toàn (null-safe)
                todayAppointments.sort(Comparator.comparing(
                                (DashboardStatsResponse.TodayAppointmentDTO dto) -> {
                                        String t = dto.getTime();
                                        if (t == null || t.isEmpty())
                                                return "99:99";
                                        return t.length() >= 5 ? t.substring(0, 5) : t;
                                },
                                Comparator.nullsLast(String::compareTo)));

                // Giới hạn hiển thị tối đa 15 ca gần nhất
                if (todayAppointments.size() > 15) {
                        todayAppointments = todayAppointments.subList(0, 15);
                }

                // Đóng gói kết quả trả về cho Frontend
                return DashboardStatsResponse.builder()
                                .summary(DashboardStatsResponse.SummaryStats.builder()
                                                .totalPackageBookings(totalPackageBookings)
                                                .totalRoomBookings(totalRoomBookings)
                                                .newPatients(newPatients)
                                                .totalConfirmedOrCompletedAppointments(totalConfirmedOrCompletedAppointments)
                                                .build())
                                .directChartData(directChartData)
                                .todayAppointments(todayAppointments)
                                .build();
        }

}
