package com.myproject.clinic.repository;

import com.myproject.clinic.entity.HealthPackage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HealthPackageRepository extends JpaRepository<HealthPackage, Long> {

    List<HealthPackage> findByStatus(String status);
}
