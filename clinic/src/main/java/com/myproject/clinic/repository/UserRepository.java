package com.myproject.clinic.repository;

import com.myproject.clinic.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmail(String email);

    boolean existsByPhoneAndIdNot(String phone, Long id);

    boolean existsByRoleName(String roleName);

    java.util.List<User> findByRoleName(String roleName);

    long countByRoleNameAndCreatedAtBetween(String roleName, java.time.LocalDateTime start, java.time.LocalDateTime end);

    long countByRoleNameIgnoreCaseAndCreatedAtBetween(String roleName, java.time.LocalDateTime start, java.time.LocalDateTime end);

    java.util.List<User> findByRoleNameAndCreatedAtBetween(String roleName, java.time.LocalDateTime start, java.time.LocalDateTime end);

    java.util.List<User> findByRoleNameIgnoreCaseAndCreatedAtBetween(String roleName, java.time.LocalDateTime start, java.time.LocalDateTime end);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query("UPDATE User u SET u.createdAt = :now WHERE u.createdAt IS NULL")
    void fixNullDates(java.time.LocalDateTime now);
}
