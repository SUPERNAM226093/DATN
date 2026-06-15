package com.myproject.clinic.repository;

import com.myproject.clinic.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {
    List<Room> findByIsActiveTrue();
    boolean existsByRoomCode(String roomCode);
}
