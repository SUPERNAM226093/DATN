package com.myproject.clinic.prescription.service;

import com.myproject.clinic.entity.*;
import com.myproject.clinic.exception.ResourceNotFoundException;
import com.myproject.clinic.prescription.dto.*;
import com.myproject.clinic.repository.*;
import com.myproject.clinic.utils.EmailService;
import com.myproject.clinic.utils.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class PrescriptionService {

        private final PrescriptionRepository prescriptionRepository;
        private final MedicalRecordRepository medicalRecordRepository;
        private final DoctorRepository doctorRepository;
        private final EmailService emailService;
        private final SecurityUtils securityUtils;

        public List<PrescriptionResponse> findAll() {
                if (securityUtils.hasGlobalDataAccess()) {
                        return prescriptionRepository.findAll().stream().map(this::toResponse).toList();
                }
                // DOCTOR: chỉ được xem đơn thuốc của chính mình
                Doctor doctor = securityUtils.requireCurrentDoctor();
                return prescriptionRepository.findByDoctorIdOrderByCreatedAtDesc(doctor.getId())
                                .stream().map(this::toResponse).toList();
        }

        public List<PrescriptionResponse> findByUserId(Long userId) {
                return prescriptionRepository.findByMedicalRecordAppointmentPatientIdOrderByCreatedAtDesc(userId)
                                .stream().map(this::toResponse).toList();
        }

        public PrescriptionResponse findById(Long id) {
                Prescription prescription = prescriptionRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException("Prescription", id));
                // Kiểm tra quyền sở hữu nếu là DOCTOR
                securityUtils.assertDoctorOwnership("Prescription", id, prescription.getDoctor().getId());
                return toResponse(prescription);
        }

        @Transactional
        public PrescriptionResponse create(PrescriptionRequest request) {
                MedicalRecord record = medicalRecordRepository.findById(request.getMedicalRecordId())
                                .orElseThrow(() -> new ResourceNotFoundException("MedicalRecord",
                                                request.getMedicalRecordId()));

                prescriptionRepository.findByMedicalRecordId(request.getMedicalRecordId()).ifPresent(existing -> {
                        throw new IllegalArgumentException("Ho so benh an nay da co don thuoc. Vui long chon ho so khac hoac cap nhat don hien co.");
                });

                securityUtils.assertDoctorOwnership("MedicalRecord (for Prescription creation)",
                                record.getId(), record.getDoctor().getId());

                // Auto-inject doctorId từ session; tránh spoofing
                Long resolvedDoctorId = securityUtils.resolveAndValidateDoctorId(request.getDoctorId());
                Doctor doctor = doctorRepository.findById(resolvedDoctorId)
                                .orElseThrow(() -> new ResourceNotFoundException("Doctor", resolvedDoctorId));

                Prescription prescription = Prescription.builder()
                                .medicalRecord(record)
                                .doctor(doctor)
                                .items(new ArrayList<>())
                                .build();

                if (request.getItems() != null) {
                        for (PrescriptionItemRequest itemReq : request.getItems()) {
                                PrescriptionItem item = PrescriptionItem.builder()
                                                .prescription(prescription)
                                                .medicineName(itemReq.getMedicineName())
                                                .dosage(itemReq.getDosage())
                                                .frequency(itemReq.getFrequency())
                                                .duration(itemReq.getDuration())
                                                .note(itemReq.getNote())
                                                .build();
                                prescription.getItems().add(item);
                        }
                }

                Prescription savedPrescription = prescriptionRepository.save(prescription);
                emailService.sendPrescriptionEmail(savedPrescription.getId());
                return toResponse(savedPrescription);
        }

        public PrescriptionResponse update(Long id, PrescriptionRequest request) {
                Prescription prescription = prescriptionRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException("Prescription", id));
                // Kiểm tra quyền sở hữu nếu là DOCTOR
                securityUtils.assertDoctorOwnership("Prescription", id, prescription.getDoctor().getId());
                // Update is limited to replacing items if provided
                Prescription savedPrescription = prescriptionRepository.save(prescription);
                emailService.sendPrescriptionEmail(savedPrescription.getId());
                return toResponse(savedPrescription);
        }

        public void delete(Long id) {
                Prescription prescription = prescriptionRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException("Prescription", id));
                // Kiểm tra quyền sở hữu nếu là DOCTOR
                securityUtils.assertDoctorOwnership("Prescription", id, prescription.getDoctor().getId());
                prescriptionRepository.deleteById(id);
        }

        private PrescriptionResponse toResponse(Prescription p) {
                List<PrescriptionItemResponse> items = p.getItems().stream()
                                .map(item -> PrescriptionItemResponse.builder()
                                                .id(item.getId())
                                                .medicineName(item.getMedicineName())
                                                .dosage(item.getDosage())
                                                .frequency(item.getFrequency())
                                                .duration(item.getDuration())
                                                .note(item.getNote())
                                                .build())
                                .toList();

                return PrescriptionResponse.builder()
                                .id(p.getId())
                                .medicalRecordId(p.getMedicalRecord().getId())
                                .doctorId(p.getDoctor().getId())
                                .doctorName(p.getDoctor().getUser().getFullName())
                                .createdAt(p.getCreatedAt())
                                .items(items)
                                .build();
        }
}
