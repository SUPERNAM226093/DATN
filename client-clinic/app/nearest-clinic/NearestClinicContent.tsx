"use client";

import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix missing marker icons in leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const clinics = [
  {
    id: 1,
    name: "Phòng khám Med 1 - CS1 - Chùa Hương",
    address: "Chùa Hương, Mỹ Đức, Hà Nội",
    lat: 20.6189,
    lng: 105.7456
  },
  {
    id: 2,
    name: "Phòng khám Med 2 - CS2 - 226 Ngô Quyền",
    address: "226 Ngô Quyền, Hà Đông, Hà Nội",
    lat: 20.9716,
    lng: 105.7784
  },
  {
    id: 3,
    name: "Phòng khám Med 3 - CS3 - 82 Kim Mã",
    address: "82 Kim Mã, Ba Đình, Hà Nội",
    lat: 21.0319,
    lng: 105.8243
  },
  {
    id: 4,
    name: "Phòng khám Med 4 - CS4 - 10 Hoàng Quốc Việt",
    address: "10 Hoàng Quốc Việt, Cầu Giấy, Hà Nội",
    lat: 21.0462,
    lng: 105.7937
  }
];

/**
 * Tính toán khoảng cách theo đường thẳng (đường chim bay) giữa 2 tọa độ (latitude, longitude).
 * Sử dụng công thức Haversine để tính khoảng cách trên bề mặt hình cầu của Trái Đất.
 * 
 * @param lat1 Vĩ độ của điểm 1 (Vị trí người dùng)
 * @param lon1 Kinh độ của điểm 1
 * @param lat2 Vĩ độ của điểm 2 (Vị trí cơ sở y tế)
 * @param lon2 Kinh độ của điểm 2
 * @returns Khoảng cách tính bằng Kilômét (km)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180; // Đổi độ chênh lệch vĩ độ sang Radian
  const dLon = ((lon2 - lon1) * Math.PI) / 180; // Đổi độ chênh lệch kinh độ sang Radian

  // Áp dụng công thức Haversine để tính bình phương một nửa góc cung
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;

  // Tính khoảng cách cuối cùng dựa trên góc cung (a) và bán kính Trái Đất (R)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function getRealRoadDistance(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  // Cấu trúc URL gọi API của OSRM. Chú ý: OSRM nhận tọa độ theo thứ tự (Kinh độ, Vĩ độ) tức là (Lng, Lat)
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${fromLng},${fromLat};${toLng},${toLat}` +
    `?overview=full&geometries=geojson`;

  const response = await fetch(url);
  const data = await response.json();

  // Nếu API không trả về mảng routes hoặc mảng rỗng, nghĩa là không tìm thấy đường đi (ví dụ ngăn cách bởi biển)
  if (!data.routes || data.routes.length === 0) {
    throw new Error("Không tìm thấy lộ trình di chuyển");
  }

  const route = data.routes[0]; // Lấy lộ trình tối ưu nhất (nằm ở index 0)

  // OSRM trả về mảng tọa độ vẽ đường đi (polyline) dưới dạng [Lng, Lat]
  // Nhưng React-Leaflet yêu cầu tọa độ vẽ phải là [Lat, Lng], nên ta map lại để đảo ngược vị trí
  const polylinePositions = route.geometry.coordinates.map(([lng, lat]: [number, number]) => [
    lat,
    lng
  ]) as [number, number][];

  return {
    distanceKm: Number((route.distance / 1000).toFixed(2)), // OSRM trả về mét -> Chia 1000 để đổi ra km, làm tròn 2 chữ số thập phân
    durationMin: Math.round(route.duration / 60), // OSRM trả về giây -> Chia 60 để đổi ra phút, làm tròn thành số nguyên
    polyline: polylinePositions // Mảng tọa độ đã đảo ngược để React-Leaflet vẽ polyline
  };
}

export default function NearestClinicContent() {
  const [address, setAddress] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; displayName: string } | null>(null);
  const [results, setResults] = useState<(typeof clinics[0] & { distance: number; duration: number | null; distanceType: string; polyline?: [number, number][] })[]>([]);

  const handleSearch = async () => {
    if (!address.trim()) {
      alert("Vui lòng nhập địa chỉ của bạn");
      return;
    }

    // Gọi API Nominatim của OpenStreetMap để dịch địa chỉ văn bản thành tọa độ (Geocoding)
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      address
    )}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      // Kiểm tra nếu API không tìm thấy địa chỉ nào khớp với từ khóa người dùng nhập
      if (!data || data.length === 0) {
        alert("Không tìm thấy địa chỉ");
        return;
      }

      // Lấy kết quả đầu tiên (có độ chính xác cao nhất) và ép kiểu chuỗi tọa độ về số thập phân
      const userLat = parseFloat(data[0].lat);
      const userLng = parseFloat(data[0].lon);

      // Cập nhật vị trí người dùng vào state để vẽ Marker (Điểm đánh dấu màu xanh) lên bản đồ
      setUserLocation({
        lat: userLat,
        lng: userLng,
        displayName: data[0].display_name // display_name là tên địa chỉ đầy đủ có dấu do API trả về
      });

      // Tạo một mảng Promise để tính toán khoảng cách tới TẤT CẢ các cơ sở y tế CÙNG MỘT LÚC (chạy song song)
      const routeResults = await Promise.all(
        clinics.map(async (clinic) => {
          try {
            // Cố gắng tính khoảng cách đường bộ thực tế bằng OSRM
            const route = await getRealRoadDistance(
              userLat,
              userLng,
              clinic.lat,
              clinic.lng
            );

            return {
              ...clinic,
              distance: route.distanceKm,
              duration: route.durationMin,
              polyline: route.polyline,
              distanceType: "ROAD" // Gắn cờ cho biết đây là kết quả của đường bộ thực tế
            };
          } catch (error) {
            // FALLBACK: Nếu OSRM bị lỗi (quá tải, không tìm ra đường vì có sông/núi...), dùng khoảng cách đường chim bay thay thế
            const straightDistance = calculateDistance(
              userLat,
              userLng,
              clinic.lat,
              clinic.lng
            );

            return {
              ...clinic,
              distance: Number(straightDistance.toFixed(2)),
              duration: null, // Đường chim bay không thể tính được thời gian đi
              distanceType: "STRAIGHT_LINE" // Gắn cờ cho biết kết quả này là đường chim bay
            };
          }
        })
      );

      // Lọc bỏ những kết quả bị lỗi khoảng cách (null) và sắp xếp mảng từ Cơ sở gần nhất -> Xa nhất
      const sortedClinics = routeResults
        .filter((clinic) => clinic.distance !== null)
        .sort((a, b) => a.distance - b.distance);

      setResults(sortedClinics); // Cập nhật lại state để hiển thị Bảng so sánh khoảng cách trên UI
    } catch (error) {
      console.error("Geocoding error:", error);
      alert("Lỗi khi tìm địa chỉ, vui lòng thử lại.");
    }
  };

  const nearestClinic = results[0];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-emerald-800 mb-6 text-center">Tìm cơ sở y tế gần bạn</h2>

      <div className="flex flex-col md:flex-row justify-center items-center gap-4 mb-8">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Nhập địa chỉ của bạn, ví dụ: Nguyễn Trãi, Hà Đông"
          className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
        />

        <button
          onClick={handleSearch}
          className="w-full md:w-auto px-6 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition duration-300"
        >
          Tìm cơ sở gần nhất
        </button>
      </div>

      {nearestClinic && userLocation && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8 text-center shadow-sm">
          <p className="text-lg text-green-800 mb-2">
            <span className="font-bold">Khuyến nghị:</span> Cơ sở gần bạn nhất là{" "}
            <span className="font-bold text-green-900">{nearestClinic.name}</span>
          </p>
          <p className="text-md text-green-800 mb-2">
            Quãng đường di chuyển: <span className="font-bold">{nearestClinic.distance} km</span>
            {nearestClinic.distanceType === "ROAD" ? " (Đường bộ)" : " (Đường chim bay)"}
            {nearestClinic.duration !== null && (
              <> | Thời gian ước tính: <span className="font-bold">{nearestClinic.duration} phút</span></>
            )}
          </p>
          <p className="text-sm text-green-600">
            Tọa độ của bạn (Geocoding): ✓ {userLocation.lat}, {userLocation.lng}
          </p>
        </div>
      )}

      <div className="bg-white p-4 rounded-lg shadow-md mb-8">
        <MapContainer
          center={
            userLocation
              ? [userLocation.lat, userLocation.lng]
              : [21.0285, 105.8542]
          }
          zoom={userLocation ? 12 : 10}
          style={{ height: 500, width: "100%", borderRadius: "0.5rem", zIndex: 0 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {userLocation && (
            <Marker position={[userLocation.lat, userLocation.lng]}>
              <Popup>
                <div className="text-center">
                  <p className="font-bold mb-1">Vị trí của bạn</p>
                  <p className="text-sm">{userLocation.displayName}</p>
                </div>
              </Popup>
            </Marker>
          )}

          {clinics.map((clinic) => (
            <Marker key={clinic.lat} position={[clinic.lat, clinic.lng]}>
              <Popup>
                <div className="text-center">
                  <p className="font-bold text-emerald-800 mb-1">{clinic.name}</p>
                  <p className="text-sm mb-2">{clinic.address}</p>
                  {results.length > 0 && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation?.lat},${userLocation?.lng}&destination=${clinic.lat},${clinic.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 text-xs rounded hover:bg-emerald-200"
                    >
                      Chỉ đường
                    </a>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Vẽ polyline lộ trình đến cơ sở gần nhất nếu có */}
          {nearestClinic?.polyline && (
            <Polyline positions={nearestClinic.polyline} color="blue" weight={4} opacity={0.6} />
          )}
        </MapContainer>
      </div>

      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="bg-emerald-600 px-6 py-4">
            <h3 className="text-xl font-bold text-white">So sánh khoảng cách các cơ sở</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-sm font-semibold text-gray-700">Ưu tiên</th>
                  <th className="px-6 py-3 text-sm font-semibold text-gray-700">Cơ sở & Địa chỉ</th>
                  <th className="px-6 py-3 text-sm font-semibold text-gray-700">Tọa độ</th>
                  <th className="px-6 py-3 text-sm font-semibold text-gray-700">Quãng đường</th>
                  <th className="px-6 py-3 text-sm font-semibold text-gray-700">Thời gian</th>
                  <th className="px-6 py-3 text-sm font-semibold text-gray-700 text-center">Chỉ đường</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {results.map((clinic, index) => (
                  <tr key={clinic.id} className={index === 0 ? "bg-green-50" : "hover:bg-gray-50 transition-colors"}>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${index === 0 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
                        {index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{clinic.name}</div>
                      <div className="text-gray-500 text-xs mt-1">{clinic.address}</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-green-500 whitespace-nowrap">
                      ✓ {clinic.lat}, {clinic.lng}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-semibold ${index === 0 ? 'text-green-600' : 'text-gray-700'}`}>
                        {clinic.distance} km
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-medium ${index === 0 ? 'text-green-600' : 'text-gray-600'}`}>
                        {clinic.duration ? `${clinic.duration} phút` : "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation?.lat},${userLocation?.lng}&destination=${clinic.lat},${clinic.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center px-4 py-2 bg-emerald-50 text-emerald-600 text-sm font-medium rounded-md hover:bg-emerald-100 transition-colors"
                      >
                        Mở Google Maps
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
