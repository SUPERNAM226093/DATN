package com.myproject.clinic.repository;

import com.myproject.clinic.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmail(String email);

    boolean existsByPhoneAndIdNot(String phone, Long id);

    boolean existsByRoleName(String roleName);

    List<User> findByRoleName(String roleName);

    long countByRoleNameAndCreatedAtBetween(String roleName, LocalDateTime start, LocalDateTime end);

    long countByRoleNameIgnoreCaseAndCreatedAtBetween(String roleName, LocalDateTime start, LocalDateTime end);

    List<User> findByRoleNameAndCreatedAtBetween(String roleName, LocalDateTime start, LocalDateTime end);

    List<User> findByRoleNameIgnoreCaseAndCreatedAtBetween(String roleName, LocalDateTime start, LocalDateTime end);

    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.createdAt = :now WHERE u.createdAt IS NULL")
    void fixNullDates(LocalDateTime now);
}
