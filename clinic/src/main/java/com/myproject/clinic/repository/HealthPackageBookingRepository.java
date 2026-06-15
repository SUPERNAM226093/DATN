package com.myproject.clinic.repository;

import com.myproject.clinic.entity.HealthPackageBooking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HealthPackageBookingRepository extends JpaRepository<HealthPackageBooking, Long> {
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"patient", "healthPackage"})
    List<HealthPackageBooking> findByPatientIdOrderByCreatedAtDesc(Long patientId);
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"patient", "healthPackage"})
    List<HealthPackageBooking> findByHealthPackageIdOrderByBookingDateAscBookingTimeAsc(Long healthPackageId);
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"patient", "healthPackage"})
    List<HealthPackageBooking> findByCreatedAtBetween(java.time.LocalDateTime start, java.time.LocalDateTime end);

    boolean existsByPatientIdAndBookingDateAndBookingTimeAndStatusNotIn(
            Long patientId, java.time.LocalDate date, java.time.LocalTime time, java.util.Collection<String> statuses);

    boolean existsByHealthPackageIdAndBookingDateAndBookingTimeAndStatusNotIn(
            Long healthPackageId, java.time.LocalDate date, java.time.LocalTime time, java.util.Collection<String> statuses);

    boolean existsByHealthPackageIdAndBookingDateAndBookingTimeAndStatusNotInAndIdNot(
            Long healthPackageId, java.time.LocalDate date, java.time.LocalTime time, java.util.Collection<String> statuses, Long id);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(h) > 0 FROM HealthPackageBooking h WHERE h.healthPackage.id = :healthPackageId " +
            "AND (h.bookingDate > :today OR (h.bookingDate = :today AND h.bookingTime > :nowTime)) " +
            "AND h.status NOT IN :doneStatuses")
    boolean existsFutureActiveBookingByHealthPackageId(
            @org.springframework.data.repository.query.Param("healthPackageId") Long healthPackageId,
            @org.springframework.data.repository.query.Param("today") java.time.LocalDate today,
            @org.springframework.data.repository.query.Param("nowTime") java.time.LocalTime nowTime,
            @org.springframework.data.repository.query.Param("doneStatuses") java.util.Collection<String> doneStatuses);
}
