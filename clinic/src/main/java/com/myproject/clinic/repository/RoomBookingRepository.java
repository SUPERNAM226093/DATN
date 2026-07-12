package com.myproject.clinic.repository;

import com.myproject.clinic.entity.RoomBooking;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface RoomBookingRepository extends JpaRepository<RoomBooking, Long> {

    @EntityGraph(attributePaths = { "bookedBy", "room" })
    List<RoomBooking> findByBookedById(Long userId);

    @EntityGraph(attributePaths = { "bookedBy", "room" })
    List<RoomBooking> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    @Query("SELECT b FROM RoomBooking b WHERE b.room.id = :roomId "
            + "AND b.status IN ('CONFIRMED', 'CHECKED_IN') "
            + "AND (:newCheckIn < b.checkOutDate AND :newCheckOut > b.checkInDate)")
    @EntityGraph(attributePaths = { "bookedBy", "room" })
    List<RoomBooking> findOverlappingBookings(
            @Param("roomId") Long roomId,
            @Param("newCheckIn") LocalDateTime newCheckIn,
            @Param("newCheckOut") LocalDateTime newCheckOut);

    @Query("SELECT COUNT(r) > 0 FROM RoomBooking r WHERE r.room.id = :roomId "
            + "AND r.status NOT IN :ignoredStatuses "
            + "AND (r.checkInDate < :checkOut AND r.checkOutDate > :checkIn)")
    boolean existsOverlappingBooking(
            @Param("roomId") Long roomId,
            @Param("checkIn") LocalDateTime checkIn,
            @Param("checkOut") LocalDateTime checkOut,
            @Param("ignoredStatuses") Collection<String> ignoredStatuses);

    @Query(value = "SELECT * FROM room_bookings r WHERE r.room_id = :roomId "
            + "AND r.status NOT IN :ignoredStatuses "
            + "AND (r.check_in_date < :checkOut AND r.check_out_date > :checkIn) LIMIT 1", nativeQuery = true)
    RoomBooking findFirstOverlappingBooking(
            @Param("roomId") Long roomId,
            @Param("checkIn") LocalDateTime checkIn,
            @Param("checkOut") LocalDateTime checkOut,
            @Param("ignoredStatuses") Collection<String> ignoredStatuses);

    @Query("SELECT COUNT(b) > 0 FROM RoomBooking b WHERE b.room.id = :roomId "
            + "AND b.status IN ('CONFIRMED', 'CHECKED_IN') "
            + "AND (CURRENT_TIMESTAMP BETWEEN b.checkInDate AND b.checkOutDate)")
    boolean isRoomOccupiedNow(@Param("roomId") Long roomId);

    boolean existsByRoomId(Long roomId);

    @EntityGraph(attributePaths = { "bookedBy", "room" })
    List<RoomBooking> findByStatus(String status);
}
