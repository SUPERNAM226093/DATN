package com.myproject.clinic.appointment.service;

import com.myproject.clinic.appointment.dto.AppointmentRequest;
import com.myproject.clinic.appointment.dto.AppointmentResponse;
import com.myproject.clinic.entity.*;
import com.myproject.clinic.exception.ResourceNotFoundException;
import com.myproject.clinic.repository.*;
import com.myproject.clinic.utils.EmailService;
import com.myproject.clinic.utils.SecurityUtils;
import com.myproject.clinic.validation.BookingValidationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AppointmentServiceTest {

    @Mock
    private AppointmentRepository appointmentRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private DoctorRepository doctorRepository;
    @Mock
    private ClinicServiceRepository clinicServiceRepository;
    @Mock
    private DoctorScheduleRepository scheduleRepository;
    @Mock
    private HealthPackageRepository healthPackageRepository;
    @Mock
    private EmailService emailService;
    @Mock
    private BookingValidationService bookingValidationService;
    @Mock
    private SecurityUtils securityUtils;
    @InjectMocks
    private AppointmentService appointmentService;

    private Appointment createAppointment() {
        User patient = User.builder().id(1L).fullName("Patient").build();
        User doctorUser = User.builder().id(2L).fullName("Dr. Smith").status("ACTIVE").build();
        Doctor doctor = Doctor.builder().id(1L).user(doctorUser).build();
        return Appointment.builder().id(1L).patient(patient).doctor(doctor)
                .appointmentDate(LocalDate.of(2026, 3, 1))
                .appointmentTime(LocalTime.of(9, 0))
                .status("PENDING").build();
    }

    @Test
    void findAll_returnsList() {
        when(securityUtils.hasGlobalDataAccess()).thenReturn(true);
        when(appointmentRepository.findAll()).thenReturn(List.of(createAppointment()));
        List<AppointmentResponse> result = appointmentService.findAll();
        assertEquals(1, result.size());
        assertEquals("Patient", result.get(0).getPatientName());
    }

    @Test
    void findById_found() {
        when(appointmentRepository.findById(1L)).thenReturn(Optional.of(createAppointment()));
        AppointmentResponse result = appointmentService.findById(1L);
        assertEquals("PENDING", result.getStatus());
    }

    @Test
    void findById_notFound() {
        when(appointmentRepository.findById(99L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> appointmentService.findById(99L));
    }

    @Test
    void create_success() {
        User patient = User.builder().id(1L).fullName("Patient").build();
        User doctorUser = User.builder().id(2L).fullName("Dr. Smith").status("ACTIVE").build();
        Doctor doctor = Doctor.builder().id(1L).user(doctorUser).build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(patient));
        when(doctorRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(doctor));
        when(appointmentRepository.save(any())).thenReturn(createAppointment());

        AppointmentRequest request = AppointmentRequest.builder()
                .patientId(1L).doctorId(1L)
                .appointmentDate(LocalDate.of(2026, 3, 1))
                .appointmentTime(LocalTime.of(9, 0)).build();
        AppointmentResponse result = appointmentService.create(request);
        assertNotNull(result);
        assertEquals("PENDING", result.getStatus());
    }

    @Test
    void delete_success() {
        when(appointmentRepository.findById(1L)).thenReturn(Optional.of(createAppointment()));
        assertDoesNotThrow(() -> appointmentService.delete(1L));
        verify(appointmentRepository).delete(any(Appointment.class));
    }
}
