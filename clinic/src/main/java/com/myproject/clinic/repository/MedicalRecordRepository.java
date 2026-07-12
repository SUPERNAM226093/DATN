package com.myproject.clinic.repository;

import com.myproject.clinic.entity.MedicalRecord;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MedicalRecordRepository extends JpaRepository<MedicalRecord, Long> {

    @EntityGraph(attributePaths = { "appointment", "doctor" })
    Optional<MedicalRecord> findByAppointmentId(Long appointmentId);

    @EntityGraph(attributePaths = { "appointment", "doctor" })
    List<MedicalRecord> findByAppointmentPatientId(Long patientId);

    @EntityGraph(attributePaths = { "appointment", "doctor" })
    List<MedicalRecord> findByDoctorId(Long doctorId);
}
