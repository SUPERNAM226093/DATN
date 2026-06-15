package com.myproject.clinic.repository;

import com.myproject.clinic.entity.ServiceRegistration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServiceRegistrationRepository extends JpaRepository<ServiceRegistration, Long> {
    List<ServiceRegistration> findByUserId(Long userId);
}
