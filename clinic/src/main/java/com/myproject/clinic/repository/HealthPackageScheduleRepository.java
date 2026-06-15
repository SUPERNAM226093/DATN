package com.myproject.clinic.repository;

import com.myproject.clinic.entity.HealthPackageSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HealthPackageScheduleRepository extends JpaRepository<HealthPackageSchedule, Long> {
    List<HealthPackageSchedule> findByHealthPackageId(Long healthPackageId);
}
