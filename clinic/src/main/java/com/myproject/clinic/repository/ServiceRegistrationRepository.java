package com.myproject.clinic.repository;

import com.myproject.clinic.entity.ServiceRegistration;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ServiceRegistrationRepository extends JpaRepository<ServiceRegistration, Long> {
    List<ServiceRegistration> findByUserId(Long userId);
}
