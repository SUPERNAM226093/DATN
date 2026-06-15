package com.myproject.clinic.repository;

import com.myproject.clinic.entity.HealthPackage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface HealthPackageRepository extends JpaRepository<HealthPackage, Long> {
    java.util.List<HealthPackage> findByStatus(String status);
}
