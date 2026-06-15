package com.myproject.clinic.repository;

import com.myproject.clinic.entity.Hospital;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface HospitalRepository extends JpaRepository<Hospital, Long> {

    List<Hospital> findAllByActiveTrue();

    Optional<Hospital> findBySlugAndActiveTrue(String slug);
}
