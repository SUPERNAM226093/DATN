package com.myproject.clinic.exception;

public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }

    /**
     * Khởi tạo ngoại lệ với tên tài nguyên và ID không tìm thấy để sinh ra thông
     * báo lỗi chuẩn.
     * Ví dụ: "Doctor not found with id: 5"
     * 
     * @param resourceName Tên tài nguyên (ví dụ: Doctor, User, Appointment, ...)
     * @param id           ID của tài nguyên không tồn tại
     */
    public ResourceNotFoundException(String resourceName, Long id) {
        super(resourceName + " not found with id: " + id);
    }
}
