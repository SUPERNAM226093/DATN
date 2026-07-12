package com.myproject.clinic.repository;

import com.myproject.clinic.entity.HealthPackageBooking;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collection;
import java.util.List;

public interface HealthPackageBookingRepository extends JpaRepository<HealthPackageBooking, Long> {

    @EntityGraph(attributePaths = { "patient", "healthPackage" })
    List<HealthPackageBooking> findByPatientIdOrderByCreatedAtDesc(Long patientId);

    @EntityGraph(attributePaths = { "patient", "healthPackage" })
    List<HealthPackageBooking> findByHealthPackageIdOrderByBookingDateAscBookingTimeAsc(Long healthPackageId);

    @EntityGraph(attributePaths = { "patient", "healthPackage" })
    List<HealthPackageBooking> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    boolean existsByPatientIdAndBookingDateAndBookingTimeAndStatusNotIn(
            Long patientId, LocalDate date, LocalTime time, Collection<String> statuses);

    boolean existsByHealthPackageIdAndBookingDateAndBookingTimeAndStatusNotIn(
            Long healthPackageId, LocalDate date, LocalTime time, Collection<String> statuses);

    boolean existsByHealthPackageIdAndBookingDateAndBookingTimeAndStatusNotInAndIdNot(
            Long healthPackageId, LocalDate date, LocalTime time, Collection<String> statuses, Long id);

    @Query("SELECT COUNT(h) > 0 FROM HealthPackageBooking h WHERE h.healthPackage.id = :healthPackageId "
            + "AND (h.bookingDate > :today OR (h.bookingDate = :today AND h.bookingTime > :nowTime)) "
            + "AND h.status NOT IN :doneStatuses")
    boolean existsFutureActiveBookingByHealthPackageId(
            @Param("healthPackageId") Long healthPackageId,
            @Param("today") LocalDate today,
            @Param("nowTime") LocalTime nowTime,
            @Param("doneStatuses") Collection<String> doneStatuses);
}
