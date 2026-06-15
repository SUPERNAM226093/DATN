package com.myproject.clinic.repository;

import com.myproject.clinic.entity.Specialization;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SpecializationRepository extends JpaRepository<Specialization, Long> {
    java.util.List<Specialization> findByStatus(String status);
}
