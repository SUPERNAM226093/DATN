package com.myproject.clinic.repository;

import com.myproject.clinic.entity.HealthPackageSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface HealthPackageScheduleRepository extends JpaRepository<HealthPackageSchedule, Long> {
    List<HealthPackageSchedule> findByHealthPackageId(Long healthPackageId);
}
