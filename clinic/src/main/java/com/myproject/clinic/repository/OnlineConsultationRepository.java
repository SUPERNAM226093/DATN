package com.myproject.clinic.repository;

import com.myproject.clinic.entity.OnlineConsultation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OnlineConsultationRepository extends JpaRepository<OnlineConsultation, Long> {

        @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"patient", "doctor", "specialization", "service"})
        List<OnlineConsultation> findByPatientIdOrderByCreatedAtDesc(Long patientId);

        @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"patient", "doctor", "specialization", "service"})
        List<OnlineConsultation> findByPaymentStatusOrderByCreatedAtDesc(String paymentStatus);

        @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"patient", "doctor", "specialization", "service"})
        List<OnlineConsultation> findBySpecializationId(Long specializationId);

        @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"patient", "doctor", "specialization", "service"})
        List<OnlineConsultation> findByDoctorId(Long doctorId);

        boolean existsByDoctorId(Long doctorId);

        @Modifying
        @Transactional
        @Query("UPDATE OnlineConsultation o SET o.paymentStatus = 'CANCELLED' " +
                        "WHERE o.paymentStatus = 'PENDING' AND o.expiredAt < :now")
        int cancelExpiredConsultations(LocalDateTime now);

        boolean existsByPatientIdAndConsultationDateAndConsultationTimeAndPaymentStatusNotIn(
                        Long patientId, java.time.LocalDate date, String time, java.util.Collection<String> statuses);

        boolean existsByDoctorIdAndConsultationDateAndConsultationTimeAndPaymentStatusNotIn(
                        Long doctorId, java.time.LocalDate date, String time, java.util.Collection<String> statuses);

        boolean existsByPatientIdAndConsultationDateAndConsultationTimeAndPaymentStatusNotInAndIdNot(
                        Long patientId, java.time.LocalDate date, String time, java.util.Collection<String> statuses,
                        Long id);

        boolean existsByDoctorIdAndConsultationDateAndConsultationTimeAndPaymentStatusNotInAndIdNot(
                        Long doctorId, java.time.LocalDate date, String time, java.util.Collection<String> statuses,
                        Long id);

        long countByPatientIdAndPaymentStatusIn(Long patientId, java.util.Collection<String> statuses);

        @org.springframework.data.jpa.repository.Query("SELECT COUNT(o) > 0 FROM OnlineConsultation o WHERE o.doctor.id = :doctorId "
                        +
                        "AND (o.consultationDate > :today OR (o.consultationDate = :today AND o.consultationTime > :nowTimeStr)) "
                        +
                        "AND o.paymentStatus NOT IN :doneStatuses")
        boolean existsFutureActiveConsultationByDoctorId(
                        @org.springframework.data.repository.query.Param("doctorId") Long doctorId,
                        @org.springframework.data.repository.query.Param("today") java.time.LocalDate today,
                        @org.springframework.data.repository.query.Param("nowTimeStr") String nowTimeStr,
                        @org.springframework.data.repository.query.Param("doneStatuses") java.util.Collection<String> doneStatuses);

        @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"patient", "doctor", "specialization", "service"})
        List<OnlineConsultation> findByConsultationDate(java.time.LocalDate date);

        long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

        long countByPaymentStatusIgnoreCaseAndCreatedAtBetween(String paymentStatus, LocalDateTime start, LocalDateTime end);

        @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"patient", "doctor", "specialization", "service"})
        List<OnlineConsultation> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

        @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"patient", "doctor", "specialization", "service"})
        List<OnlineConsultation> findByPaymentStatusIgnoreCaseAndCreatedAtBetween(String paymentStatus, LocalDateTime start, LocalDateTime end);
}
