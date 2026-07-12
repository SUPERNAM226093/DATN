package com.myproject.clinic.repository;

import com.myproject.clinic.entity.OnlineConsultation;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface OnlineConsultationRepository extends JpaRepository<OnlineConsultation, Long> {

    @EntityGraph(attributePaths = { "patient", "doctor", "specialization", "service" })
    List<OnlineConsultation> findByPatientIdOrderByCreatedAtDesc(Long patientId);

    @EntityGraph(attributePaths = { "patient", "doctor", "specialization", "service" })
    List<OnlineConsultation> findByPaymentStatusOrderByCreatedAtDesc(String paymentStatus);

    @EntityGraph(attributePaths = { "patient", "doctor", "specialization", "service" })
    List<OnlineConsultation> findBySpecializationId(Long specializationId);

    @EntityGraph(attributePaths = { "patient", "doctor", "specialization", "service" })
    List<OnlineConsultation> findByDoctorId(Long doctorId);

    boolean existsByDoctorId(Long doctorId);

    @Modifying
    @Transactional
    @Query("UPDATE OnlineConsultation o SET o.paymentStatus = 'CANCELLED' "
            + "WHERE o.paymentStatus = 'PENDING' AND o.expiredAt < :now")
    int cancelExpiredConsultations(LocalDateTime now);

    boolean existsByPatientIdAndConsultationDateAndConsultationTimeAndPaymentStatusNotIn(
            Long patientId, LocalDate date, String time, Collection<String> statuses);

    boolean existsByDoctorIdAndConsultationDateAndConsultationTimeAndPaymentStatusNotIn(
            Long doctorId, LocalDate date, String time, Collection<String> statuses);

    boolean existsByPatientIdAndConsultationDateAndConsultationTimeAndPaymentStatusNotInAndIdNot(
            Long patientId, LocalDate date, String time, Collection<String> statuses, Long id);

    boolean existsByDoctorIdAndConsultationDateAndConsultationTimeAndPaymentStatusNotInAndIdNot(
            Long doctorId, LocalDate date, String time, Collection<String> statuses, Long id);

    long countByPatientIdAndPaymentStatusIn(Long patientId, Collection<String> statuses);

    @Query("SELECT COUNT(o) > 0 FROM OnlineConsultation o WHERE o.doctor.id = :doctorId "
            + "AND (o.consultationDate > :today OR (o.consultationDate = :today AND o.consultationTime > :nowTimeStr)) "
            + "AND o.paymentStatus NOT IN :doneStatuses")
    boolean existsFutureActiveConsultationByDoctorId(
            @Param("doctorId") Long doctorId,
            @Param("today") LocalDate today,
            @Param("nowTimeStr") String nowTimeStr,
            @Param("doneStatuses") Collection<String> doneStatuses);

    @EntityGraph(attributePaths = { "patient", "doctor", "specialization", "service" })
    List<OnlineConsultation> findByConsultationDate(LocalDate date);

    long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    long countByPaymentStatusIgnoreCaseAndCreatedAtBetween(String paymentStatus, LocalDateTime start, LocalDateTime end);

    @EntityGraph(attributePaths = { "patient", "doctor", "specialization", "service" })
    List<OnlineConsultation> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    @EntityGraph(attributePaths = { "patient", "doctor", "specialization", "service" })
    List<OnlineConsultation> findByPaymentStatusIgnoreCaseAndCreatedAtBetween(
            String paymentStatus, LocalDateTime start, LocalDateTime end);
}
