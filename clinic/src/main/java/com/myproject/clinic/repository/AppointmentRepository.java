package com.myproject.clinic.repository;

import com.myproject.clinic.entity.Appointment;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collection;
import java.util.List;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    @EntityGraph(attributePaths = { "patient", "doctor", "service", "schedule", "healthPackage" })
    List<Appointment> findByPatientId(Long patientId);

    @EntityGraph(attributePaths = { "patient", "doctor", "service", "schedule", "healthPackage" })
    List<Appointment> findByDoctorId(Long doctorId);

    @EntityGraph(attributePaths = { "patient", "doctor", "service", "schedule", "healthPackage" })
    List<Appointment> findByScheduleId(Long scheduleId);

    @EntityGraph(attributePaths = { "patient", "doctor", "service", "schedule", "healthPackage" })
    List<Appointment> findByHealthPackageId(Long healthPackageId);

    @EntityGraph(attributePaths = { "patient", "doctor", "service", "schedule", "healthPackage" })
    List<Appointment> findByAppointmentDate(LocalDate date);

    boolean existsByPatientIdAndAppointmentDateAndAppointmentTimeAndStatusNotIn(
            Long patientId, LocalDate date, LocalTime time, Collection<String> statuses);

    boolean existsByDoctorIdAndAppointmentDateAndAppointmentTimeAndStatusNotIn(
            Long doctorId, LocalDate date, LocalTime time, Collection<String> statuses);

    boolean existsByHealthPackageIdAndAppointmentDateAndAppointmentTimeAndStatusNotIn(
            Long healthPackageId, LocalDate date, LocalTime time, Collection<String> statuses);

    boolean existsByHealthPackageIdAndAppointmentDateAndAppointmentTimeAndStatusNotInAndIdNot(
            Long healthPackageId, LocalDate date, LocalTime time, Collection<String> statuses, Long id);

    long countByStatusAndCreatedAtBetween(String status, LocalDateTime start, LocalDateTime end);

    long countByStatusIgnoreCaseAndCreatedAtBetween(String status, LocalDateTime start, LocalDateTime end);

    @EntityGraph(attributePaths = { "patient", "doctor", "service", "schedule", "healthPackage" })
    List<Appointment> findByStatusAndCreatedAtBetween(String status, LocalDateTime start, LocalDateTime end);

    @EntityGraph(attributePaths = { "patient", "doctor", "service", "schedule", "healthPackage" })
    List<Appointment> findByStatusIgnoreCaseAndCreatedAtBetween(String status, LocalDateTime start, LocalDateTime end);

    long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    @EntityGraph(attributePaths = { "patient", "doctor", "service", "schedule", "healthPackage" })
    List<Appointment> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    @Modifying
    @Transactional
    @Query("UPDATE Appointment a SET a.createdAt = :now WHERE a.createdAt IS NULL")
    void fixNullDates(LocalDateTime now);

    @Query("SELECT COUNT(a) > 0 FROM Appointment a WHERE a.doctor.id = :doctorId "
            + "AND (a.appointmentDate > :today OR (a.appointmentDate = :today AND a.appointmentTime > :nowTime)) "
            + "AND a.status NOT IN :doneStatuses")
    boolean existsFutureActiveAppointmentByDoctorId(
            @Param("doctorId") Long doctorId,
            @Param("today") LocalDate today,
            @Param("nowTime") LocalTime nowTime,
            @Param("doneStatuses") Collection<String> doneStatuses);

    @Query("SELECT COUNT(a) > 0 FROM Appointment a WHERE a.healthPackage.id = :healthPackageId "
            + "AND (a.appointmentDate > :today OR (a.appointmentDate = :today AND a.appointmentTime > :nowTime)) "
            + "AND a.status NOT IN :doneStatuses")
    boolean existsFutureActiveAppointmentByHealthPackageId(
            @Param("healthPackageId") Long healthPackageId,
            @Param("today") LocalDate today,
            @Param("nowTime") LocalTime nowTime,
            @Param("doneStatuses") Collection<String> doneStatuses);
}
