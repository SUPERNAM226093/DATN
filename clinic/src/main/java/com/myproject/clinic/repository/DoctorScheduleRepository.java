package com.myproject.clinic.repository;

import com.myproject.clinic.entity.DoctorSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;

public interface DoctorScheduleRepository extends JpaRepository<DoctorSchedule, Long> {
    List<DoctorSchedule> findByDoctorId(Long doctorId);
    List<DoctorSchedule> findByDoctorIdAndWorkDate(Long doctorId, LocalDate workDate);

    List<DoctorSchedule> findByWorkDate(LocalDate workDate);

    @Query("SELECT ds FROM DoctorSchedule ds WHERE ds.workDate = :date AND ds.doctor.specialization.id = :specId")
    List<DoctorSchedule> findByWorkDateAndSpecializationId(
            @Param("date") LocalDate date,
            @Param("specId") Long specId
    );
}
