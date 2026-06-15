package com.myproject.clinic.repository;

import com.myproject.clinic.entity.MedicalRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MedicalRecordRepository extends JpaRepository<MedicalRecord, Long> {
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"appointment", "doctor"})
    Optional<MedicalRecord> findByAppointmentId(Long appointmentId);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"appointment", "doctor"})
    List<MedicalRecord> findByAppointmentPatientId(Long patientId);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"appointment", "doctor"})
    List<MedicalRecord> findByDoctorId(Long doctorId);
}
