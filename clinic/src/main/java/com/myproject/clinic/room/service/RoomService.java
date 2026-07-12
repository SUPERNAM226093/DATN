package com.myproject.clinic.room.service;

import com.myproject.clinic.config.FileStorageService;
import com.myproject.clinic.entity.Room;
import com.myproject.clinic.repository.RoomRepository;
import com.myproject.clinic.room.dto.RoomDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoomService {

    private final RoomRepository roomRepository;
    private final FileStorageService fileStorageService;
    private final com.myproject.clinic.repository.RoomBookingRepository bookingRepository;

    public List<RoomDTO> getAllRooms() {
        return roomRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public List<RoomDTO> getActiveRooms() {
        return roomRepository.findByIsActiveTrue().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    public RoomDTO getRoomById(Long id) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Room not found"));
        return convertToDTO(room);
    }

    @Transactional
    public RoomDTO createRoom(RoomDTO dto) {
        if (roomRepository.existsByRoomCode(dto.getRoomCode())) {
            throw new RuntimeException("Room code already exists");
        }
        Room room = convertToEntity(dto);
        return convertToDTO(roomRepository.save(room));
    }

    @Transactional
    public RoomDTO updateRoom(Long id, RoomDTO dto) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Room not found"));

        room.setName(dto.getName());
        room.setFloor(dto.getFloor());
        room.setBedType(dto.getBedType());
        room.setMaxCapacity(dto.getMaxCapacity());
        room.setPricePerNight(dto.getPricePerNight());
        room.setCleaningFee(dto.getCleaningFee());
        room.setServiceFee(dto.getServiceFee());
        room.setDescription(dto.getDescription());
        room.setAmenities(dto.getAmenities());
        room.setImages(dto.getImages());
        room.setIsActive(dto.getIsActive());
        room.setTotalBeds(dto.getTotalBeds());
        room.setAvailableBeds(dto.getAvailableBeds());
        room.setStatus(dto.getStatus());

        return convertToDTO(roomRepository.save(room));
    }

    @Transactional
    public void deleteRoom(Long id) {
        if (bookingRepository.existsByRoomId(id)) {
            throw new IllegalArgumentException("Không thể xóa phòng vì đã có lượt đặt phòng liên quan.");
        }
        roomRepository.deleteById(id);
    }

    @Transactional
    public RoomDTO uploadImage(Long id, MultipartFile file) {
        System.out.println(">>> Received request to upload image for Room ID: " + id);
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Room not found"));

        String imageUrl = fileStorageService.store(file, "rooms");
        System.out.println(">>> Room image stored at: " + imageUrl);

        if (room.getImages() == null) {
            room.setImages(new ArrayList<>());
        }
        // Add new image at the beginning so it becomes the thumbnail
        room.getImages().add(0, imageUrl);

        return convertToDTO(roomRepository.save(room));
    }

    private RoomDTO convertToDTO(Room room) {
        RoomDTO dto = new RoomDTO();
        dto.setId(room.getId());
        dto.setRoomCode(room.getRoomCode());
        dto.setName(room.getName());
        dto.setFloor(room.getFloor());
        dto.setBedType(room.getBedType());
        dto.setMaxCapacity(room.getMaxCapacity());
        dto.setPricePerNight(room.getPricePerNight());
        dto.setCleaningFee(room.getCleaningFee());
        dto.setServiceFee(room.getServiceFee());
        dto.setDescription(room.getDescription());
        dto.setAmenities(room.getAmenities());

        // Map image paths to /images/ path
        if (room.getImages() != null) {
            dto.setImages(room.getImages().stream()
                    .map(img -> img.startsWith("/") ? img : "/images/" + img)
                    .collect(Collectors.toList()));
        }

        dto.setIsActive(room.getIsActive());

        // Logical status
        String status = room.getStatus() != null ? room.getStatus() : "AVAILABLE";
        Integer totalBeds = room.getTotalBeds() != null ? room.getTotalBeds() : 1;
        Integer availableBeds = room.getAvailableBeds() != null ? room.getAvailableBeds() : totalBeds;

        if (!"MAINTENANCE".equals(status)) {
            if (availableBeds <= 0) {
                status = "UNAVAILABLE";
            }
        }
        dto.setStatus(status);
        dto.setTotalBeds(totalBeds);
        dto.setAvailableBeds(availableBeds);

        dto.setIsAvailable("AVAILABLE".equals(status));
        return dto;
    }

    private Room convertToEntity(RoomDTO dto) {
        return Room.builder()
                .roomCode(dto.getRoomCode())
                .name(dto.getName())
                .floor(dto.getFloor())
                .bedType(dto.getBedType())
                .maxCapacity(dto.getMaxCapacity())
                .pricePerNight(dto.getPricePerNight())
                .cleaningFee(dto.getCleaningFee())
                .serviceFee(dto.getServiceFee())
                .description(dto.getDescription())
                .amenities(dto.getAmenities())
                .images(dto.getImages())
                .totalBeds(dto.getTotalBeds() != null ? dto.getTotalBeds() : 1)
                .availableBeds(dto.getAvailableBeds() != null ? dto.getAvailableBeds()
                        : (dto.getTotalBeds() != null ? dto.getTotalBeds() : 1))
                .status(dto.getStatus() != null ? dto.getStatus() : "AVAILABLE")
                .isActive(dto.getIsActive() != null ? dto.getIsActive() : true)
                .build();
    }
}
