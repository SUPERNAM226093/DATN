package com.myproject.clinic.repository;

import com.myproject.clinic.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

        @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"patient", "doctor", "service", "schedule", "healthPackage"})
        List<Appointment> findByPatientId(Long patientId);

        @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"patient", "doctor", "service", "schedule", "healthPackage"})
        List<Appointment> findByDoctorId(Long doctorId);

        @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"patient", "doctor", "service", "schedule", "healthPackage"})
        List<Appointment> findByScheduleId(Long scheduleId);

        @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"patient", "doctor", "service", "schedule", "healthPackage"})
        List<Appointment> findByHealthPackageId(Long healthPackageId);

        @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"patient", "doctor", "service", "schedule", "healthPackage"})
        List<Appointment> findByAppointmentDate(java.time.LocalDate date);

        boolean existsByPatientIdAndAppointmentDateAndAppointmentTimeAndStatusNotIn(
                        Long patientId, java.time.LocalDate date, java.time.LocalTime time,
                        java.util.Collection<String> statuses);

        boolean existsByDoctorIdAndAppointmentDateAndAppointmentTimeAndStatusNotIn(
                        Long doctorId, java.time.LocalDate date, java.time.LocalTime time,
                        java.util.Collection<String> statuses);

        boolean existsByHealthPackageIdAndAppointmentDateAndAppointmentTimeAndStatusNotIn(
                        Long healthPackageId, java.time.LocalDate date, java.time.LocalTime time,
                        java.util.Collection<String> statuses);

        boolean existsByHealthPackageIdAndAppointmentDateAndAppointmentTimeAndStatusNotInAndIdNot(
                        Long healthPackageId, java.time.LocalDate date, java.time.LocalTime time,
                        java.util.Collection<String> statuses, Long id);

        long countByStatusAndCreatedAtBetween(String status, java.time.LocalDateTime start,
                        java.time.LocalDateTime end);

        long countByStatusIgnoreCaseAndCreatedAtBetween(String status, java.time.LocalDateTime start,
                        java.time.LocalDateTime end);

        @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"patient", "doctor", "service", "schedule", "healthPackage"})
        java.util.List<Appointment> findByStatusAndCreatedAtBetween(String status, java.time.LocalDateTime start,
                        java.time.LocalDateTime end);

        @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"patient", "doctor", "service", "schedule", "healthPackage"})
        java.util.List<Appointment> findByStatusIgnoreCaseAndCreatedAtBetween(String status,
                        java.time.LocalDateTime start, java.time.LocalDateTime end);

        long countByCreatedAtBetween(java.time.LocalDateTime start, java.time.LocalDateTime end);

        @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"patient", "doctor", "service", "schedule", "healthPackage"})
        java.util.List<Appointment> findByCreatedAtBetween(java.time.LocalDateTime start, java.time.LocalDateTime end);

        @org.springframework.data.jpa.repository.Modifying
        @org.springframework.transaction.annotation.Transactional
        @org.springframework.data.jpa.repository.Query("UPDATE Appointment a SET a.createdAt = :now WHERE a.createdAt IS NULL")
        void fixNullDates(java.time.LocalDateTime now);

        @org.springframework.data.jpa.repository.Query("SELECT COUNT(a) > 0 FROM Appointment a WHERE a.doctor.id = :doctorId "
                        +
                        "AND (a.appointmentDate > :today OR (a.appointmentDate = :today AND a.appointmentTime > :nowTime)) "
                        +
                        "AND a.status NOT IN :doneStatuses")
        boolean existsFutureActiveAppointmentByDoctorId(
                        @org.springframework.data.repository.query.Param("doctorId") Long doctorId,
                        @org.springframework.data.repository.query.Param("today") java.time.LocalDate today,
                        @org.springframework.data.repository.query.Param("nowTime") java.time.LocalTime nowTime,
                        @org.springframework.data.repository.query.Param("doneStatuses") java.util.Collection<String> doneStatuses);

        @org.springframework.data.jpa.repository.Query("SELECT COUNT(a) > 0 FROM Appointment a WHERE a.healthPackage.id = :healthPackageId "
                        +
                        "AND (a.appointmentDate > :today OR (a.appointmentDate = :today AND a.appointmentTime > :nowTime)) "
                        +
                        "AND a.status NOT IN :doneStatuses")
        boolean existsFutureActiveAppointmentByHealthPackageId(
                        @org.springframework.data.repository.query.Param("healthPackageId") Long healthPackageId,
                        @org.springframework.data.repository.query.Param("today") java.time.LocalDate today,
                        @org.springframework.data.repository.query.Param("nowTime") java.time.LocalTime nowTime,
                        @org.springframework.data.repository.query.Param("doneStatuses") java.util.Collection<String> doneStatuses);
}
