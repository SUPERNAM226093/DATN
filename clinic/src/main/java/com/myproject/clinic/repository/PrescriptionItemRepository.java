package com.myproject.clinic.repository;

import com.myproject.clinic.entity.PrescriptionItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PrescriptionItemRepository extends JpaRepository<PrescriptionItem, Long> {
}
