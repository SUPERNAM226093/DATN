package com.myproject.clinic.repository;

import com.myproject.clinic.entity.Prescription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PrescriptionRepository extends JpaRepository<Prescription, Long> {
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"medicalRecord", "doctor"})
    Optional<Prescription> findByMedicalRecordId(Long medicalRecordId);
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"medicalRecord", "doctor"})
    java.util.List<Prescription> findByMedicalRecordAppointmentPatientIdOrderByCreatedAtDesc(Long patientId);
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"medicalRecord", "doctor"})
    java.util.List<Prescription> findByDoctorIdOrderByCreatedAtDesc(Long doctorId);
    long countByCreatedAtBetween(java.time.LocalDateTime start, java.time.LocalDateTime end);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query("UPDATE Prescription p SET p.createdAt = :now WHERE p.createdAt IS NULL")
    void fixNullDates(java.time.LocalDateTime now);
}
