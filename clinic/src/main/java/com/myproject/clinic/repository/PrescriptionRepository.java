package com.myproject.clinic.repository;

import com.myproject.clinic.entity.Prescription;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PrescriptionRepository extends JpaRepository<Prescription, Long> {

    @EntityGraph(attributePaths = { "medicalRecord", "doctor" })
    Optional<Prescription> findByMedicalRecordId(Long medicalRecordId);

    @EntityGraph(attributePaths = { "medicalRecord", "doctor" })
    List<Prescription> findByMedicalRecordAppointmentPatientIdOrderByCreatedAtDesc(Long patientId);

    @EntityGraph(attributePaths = { "medicalRecord", "doctor" })
    List<Prescription> findByDoctorIdOrderByCreatedAtDesc(Long doctorId);

    long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    @Modifying
    @Transactional
    @Query("UPDATE Prescription p SET p.createdAt = :now WHERE p.createdAt IS NULL")
    void fixNullDates(LocalDateTime now);
}
