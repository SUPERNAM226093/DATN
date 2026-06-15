package com.myproject.clinic.user.service;

import com.myproject.clinic.repository.AppointmentRepository;
import com.myproject.clinic.repository.OnlineConsultationRepository;
import com.myproject.clinic.entity.User;
import com.myproject.clinic.exception.ResourceNotFoundException;
import com.myproject.clinic.repository.DoctorRepository;
import com.myproject.clinic.repository.UserRepository;
import com.myproject.clinic.user.dto.UpdateProfileRequest;
import com.myproject.clinic.user.dto.UserRequest;
import com.myproject.clinic.user.dto.UserResponse;
import com.myproject.clinic.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository userRepository;

    private final DoctorRepository doctorRepository;
    private final AppointmentRepository appointmentRepository;
    private final OnlineConsultationRepository onlineConsultationRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecurityUtils securityUtils;

    public List<UserResponse> findAll() {
        return userRepository.findAll().stream()
                .filter(u -> !"DELETED".equals(u.getStatus()))
                .map(this::toResponse).toList();
    }

    public UserResponse findById(Long id) {
        return toResponse(userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id)));
    }

    @Transactional
    public UserResponse create(UserRequest request) {
        if (request.getEmail() == null || !request.getEmail().matches("^[a-zA-Z0-9._%+-]+@gmail\\.com$")) {
            throw new IllegalArgumentException("Email phải đúng định dạng @gmail.com");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email này đã được sử dụng trong hệ thống");
        }
        if (request.getPhone() != null && !request.getPhone().matches("^\\d{10}$")) {
            throw new IllegalArgumentException("Số điện thoại phải có đúng 10 chữ số");
        }
        String roleName = request.getRoleName() != null ? request.getRoleName() : "PATIENT";

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .phone(request.getPhone())
                .dateOfBirth(request.getDateOfBirth())
                .gender(request.getGender())
                .address(request.getAddress())
                .roleName(roleName)
                .status(request.getStatus() != null ? request.getStatus() : "ACTIVE")
                .build();

        return toResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse update(Long id, UserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));

        if (request.getFullName() != null)
            user.setFullName(request.getFullName());
        if (request.getPhone() != null) {
            if (!request.getPhone().matches("^\\+?\\d{9,15}$")) {
                throw new IllegalArgumentException("Số điện thoại không hợp lệ");
            }
            user.setPhone(request.getPhone());
        }
        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            if (!request.getEmail().matches("^[a-zA-Z0-9._%+-]+@gmail\\.com$")) {
                throw new IllegalArgumentException("Email phải đúng định dạng @gmail.com");
            }
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new IllegalArgumentException("Email này đã được sử dụng trong hệ thống");
            }
            user.setEmail(request.getEmail());
        }
        if (request.getDateOfBirth() != null)
            user.setDateOfBirth(request.getDateOfBirth());
        if (request.getGender() != null)
            user.setGender(request.getGender());
        if (request.getAddress() != null)
            user.setAddress(request.getAddress());
        if (request.getStatus() != null) {
            String newStatus = request.getStatus();
            if ("INACTIVE".equalsIgnoreCase(newStatus) && !"INACTIVE".equalsIgnoreCase(user.getStatus())) {
                if (user.getRoleName() != null && "DOCTOR".equalsIgnoreCase(user.getRoleName())) {
                    doctorRepository.findByUserId(user.getId()).ifPresent(doctor -> {
                        LocalDate today = LocalDate.now();
                        LocalTime nowTime = LocalTime.now();
                        String nowTimeStr = nowTime.format(DateTimeFormatter.ofPattern("HH:mm"));
                        List<String> DONE_STATUSES = List.of("CANCELLED", "REJECTED", "COMPLETED");

                        boolean hasFutureAppointments = appointmentRepository
                                .existsFutureActiveAppointmentByDoctorId(doctor.getId(), today, nowTime, DONE_STATUSES);

                        boolean hasFutureConsultations = onlineConsultationRepository
                                .existsFutureActiveConsultationByDoctorId(doctor.getId(), today, nowTimeStr,
                                        List.of("CANCELLED"));

                        if (hasFutureAppointments || hasFutureConsultations) {
                            throw new IllegalArgumentException(
                                    "Không thể khóa tài khoản bác sĩ này vì còn lịch hẹn hoặc tư vấn online chưa hoàn thành trong tương lai. "
                                            +
                                            "Vui lòng hủy hoặc hoàn tất các lịch đó trước.");
                        }
                    });
                }
            }
            user.setStatus(newStatus);
        }
        if (request.getRoleName() != null) {
            user.setRoleName(request.getRoleName());
        }
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }

        return toResponse(userRepository.save(user));
    }

    public UserResponse getProfile() {
        return toResponse(securityUtils.getCurrentUser());
    }

    @Transactional
    public UserResponse updateProfile(UpdateProfileRequest request) {
        User user = securityUtils.getCurrentUser();
        Long currentUserId = user.getId();

        String oldFullName = user.getFullName();
        String oldPhone = user.getPhone();

        boolean isChanged = false;
        StringBuilder auditLog = new StringBuilder("User Profile Update [" + currentUserId + "]: ");

        if (request.getFullName() != null && !request.getFullName().trim().isEmpty()) {
            String newFullName = request.getFullName().trim();
            if (!Objects.equals(newFullName, oldFullName)) {
                user.setFullName(newFullName);
                isChanged = true;
                auditLog.append("FullName (").append(oldFullName).append(" -> ").append(newFullName).append(") ");
            }
        }

        if (request.getPhone() != null && !request.getPhone().trim().isEmpty()) {
            String newPhone = request.getPhone().trim();
            if (!Objects.equals(newPhone, oldPhone)) {
                // BE Validation independent of FE
                if (!newPhone.matches(
                        "^(0|\\+84)(\\s|\\.)?((3[2-9])|(5[689])|(7[06-9])|(8[1-689])|(9[0-46-9]))(\\d)(\\s|\\.)?(\\d{3})(\\s|\\.)?(\\d{3})$")) {
                    throw new IllegalArgumentException("ERR_INVALID_FORMAT: Số điện thoại không hợp lệ");
                }
                if (userRepository.existsByPhoneAndIdNot(newPhone, currentUserId)) {
                    throw new IllegalArgumentException(
                            "ERR_PHONE_EXISTS: Số điện thoại này đã được sử dụng bởi tài khoản khác.");
                }
                user.setPhone(newPhone);
                isChanged = true;
                auditLog.append("Phone (").append(oldPhone).append(" -> ").append(newPhone).append(") ");
            }
        }

        if (request.getNewPassword() != null && !request.getNewPassword().isBlank()) {
            log.info("Updating password for user {}: new password length = {}", currentUserId,
                    request.getNewPassword().length());
            // BE Validation: Min 6 chars
            if (request.getNewPassword().length() < 6) {
                throw new IllegalArgumentException("ERR_INVALID_FORMAT: Mật khẩu phải có ít nhất 6 ký tự.");
            }
            user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
            isChanged = true;
            auditLog.append("Password (updated) ");
        }

        if (!isChanged) {
            log.info("User Profile Update [{}]: No changes detected.", currentUserId);
            return toResponse(user);
        }

        log.info(auditLog.toString());
        return toResponse(userRepository.saveAndFlush(user));
    }

    @Transactional
    public void delete(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));

        doctorRepository.findByUserId(user.getId()).ifPresent(doctorRepository::delete);

        user.setStatus("DELETED");
        userRepository.save(user);
    }

    private UserResponse toResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .dateOfBirth(user.getDateOfBirth())
                .gender(user.getGender())
                .address(user.getAddress())
                .roleName(user.getRoleName())
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
