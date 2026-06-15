package com.myproject.clinic.repository;

import com.myproject.clinic.entity.PasswordResetToken;
import com.myproject.clinic.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    List<PasswordResetToken> findByUserAndUsedAtIsNullAndExpiresAtAfter(User user, LocalDateTime now);

    Optional<PasswordResetToken> findByTokenHashAndUsedAtIsNull(String tokenHash);

    @Modifying
    @Query("UPDATE PasswordResetToken t SET t.usedAt = CURRENT_TIMESTAMP WHERE t.user = :user AND t.usedAt IS NULL")
    void invalidateAllByUser(User user);

    @Modifying
    @Query("DELETE FROM PasswordResetToken t WHERE t.expiresAt < :now OR t.usedAt IS NOT NULL")
    void deleteExpiredOrUsed(LocalDateTime now);
}
