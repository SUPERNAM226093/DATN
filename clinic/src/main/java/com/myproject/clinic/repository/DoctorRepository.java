package com.myproject.clinic.repository;

import com.myproject.clinic.entity.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DoctorRepository extends JpaRepository<Doctor, Long> {
    Optional<Doctor> findByUserId(Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT d FROM Doctor d WHERE d.id = :id")
    Optional<Doctor> findByIdForUpdate(@Param("id") Long id);

    List<Doctor> findBySpecializationId(Long specializationId);

    List<Doctor> findByUser_FullNameContainingIgnoreCase(String name);

    List<Doctor> findByUser_Status(String status);

    List<Doctor> findByUser_FullNameContainingIgnoreCaseAndUser_Status(String name, String status);

    List<Doctor> findBySpecializationIdAndUser_Status(Long specializationId, String status);
}
