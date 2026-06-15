package com.myproject.clinic.repository;

import com.myproject.clinic.entity.ClinicService;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ClinicServiceRepository extends JpaRepository<ClinicService, Long> {
}
