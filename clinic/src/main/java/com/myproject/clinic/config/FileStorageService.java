package com.myproject.clinic.config;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class FileStorageService {
    private final Path rootLocation = Paths.get("public").toAbsolutePath();

    /**
     * Hàm lưu trữ tệp tin tải lên.
     * Tự động sinh tên tệp bằng UUID ngẫu nhiên để tránh trùng lặp tên tệp, tạo thư
     * mục con nếu chưa có.
     */
    public String store(MultipartFile file, String subDirectory) {
        System.out.println(">>> Attempting to store file. Root location: " + rootLocation);
        try {
            // Kiểm tra tệp tin có rỗng không
            if (file.isEmpty()) {
                throw new RuntimeException("Cannot store empty file");
            }

            // Trích xuất đuôi mở rộng của tệp (Ví dụ: .jpg, .png)
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }

            // Tạo tên tệp tin duy nhất bằng cách ghép chuỗi UUID ngẫu nhiên với đuôi mở
            // rộng
            String storedFilename = UUID.randomUUID() + extension;
            Path destinationDir = rootLocation.resolve(subDirectory);

            System.out.println(">>> Target directory: " + destinationDir);

            // Nếu thư mục con chưa tồn tại thì tiến hành tạo mới
            if (!Files.exists(destinationDir)) {
                Files.createDirectories(destinationDir);
                System.out.println(">>> Created directory: " + destinationDir);
            }

            // Xác định đường dẫn đầy đủ của tệp tin đích
            Path destinationFile = destinationDir.resolve(storedFilename);
            System.out.println(">>> Target file path: " + destinationFile);

            // Sao chép luồng dữ liệu từ tệp tải lên vào tệp tin đích, ghi đè nếu tệp đích
            // đã tồn tại
            Files.copy(file.getInputStream(), destinationFile, StandardCopyOption.REPLACE_EXISTING);
            System.out.println(">>> File copied successfully!");

            // Trả về đường dẫn tương đối để lưu vào database
            return subDirectory + "/" + storedFilename;
        } catch (IOException e) {
            System.err.println(">>> ERROR during file storage: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to store file: " + e.getMessage(), e);
        }
    }

    /**
     * Hàm xóa tệp tin đã lưu trữ theo đường dẫn tương đối.
     * 
     * @param relativePath Đường dẫn tương đối của tệp cần xóa
     */
    public void delete(String relativePath) {
        try {
            if (relativePath != null && !relativePath.isEmpty() && !relativePath.startsWith("http")) {
                // Nếu đường dẫn bắt đầu bằng "/images/", cắt bỏ phần này trước khi tìm kiếm tệp
                if (relativePath.startsWith("/images/")) {
                    relativePath = relativePath.substring(8);
                }
                Path file = rootLocation.resolve(relativePath);

                // Thực hiện xóa tệp nếu tệp đó có tồn tại trên máy chủ
                Files.deleteIfExists(file);
            }
        } catch (IOException e) {
            System.err.println(">>> ERROR during file deletion: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Failed to delete file: " + e.getMessage(), e);
        } catch (Exception e) {
            System.err.println(">>> Unexpected ERROR during file deletion: " + e.getMessage());
        }
    }
}
