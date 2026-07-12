package com.myproject.clinic.repository;

import com.myproject.clinic.entity.Specialization;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SpecializationRepository extends JpaRepository<Specialization, Long> {

    List<Specialization> findByStatus(String status);
}
