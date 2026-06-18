"use client";
/**
 * FILE: ChatWidget.tsx
 * MÔ TẢ: Thành phần chatbot hỗ trợ khách hàng, cho phép tìm kiếm bác sĩ, chuyên khoa và phân tích triệu chứng qua hội thoại AI.
 */
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

interface CardItem {
    id: number;
    name: string;
    description: string;
    featureImageUrl: string | null;
    type: string;
}

interface ScheduleSlot {
    id: number;
    workDate: string;
    startTime: string;
    endTime: string;
}

interface DoctorCard {
    id: number;
    fullName: string;
    specializationName: string;
    bio: string;
    featureImageUrl: string | null;
    experienceYears: number;
    schedules: ScheduleSlot[];
}

interface AppointmentConfirmation {
    appointmentId: number;
    doctorName: string;
    appointmentDate: string;
    appointmentTime: string;
    status: string;
}

interface ChatResponse {
    message: string;
    intent: string;
    step: string;
    specializations: CardItem[] | null;
    doctors: DoctorCard[] | null;
    healthPackages: CardItem[] | null;
    appointmentConfirmation: AppointmentConfirmation | null;
}

interface Message {
    role: "user" | "assistant";
    content: string;
    cards?: CardItem[];
    doctors?: DoctorCard[];
    healthPackages?: CardItem[];
    confirmation?: AppointmentConfirmation;
}

const CHAT_SESSION_STORAGE_KEY = "clinic_chat_session_id";

/**
 * HÀM BỔ TRỢ: generateSessionId
 * MÔ TẢ: Tạo một mã phiên làm việc (Session ID) ngẫu nhiên để phân biệt các cuộc hội thoại khác nhau.
 */
function generateSessionId(): string {
    return "chat-" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

/**
 * Giữ sessionId qua F5 trong cùng tab (khớp TTL ~30 phút phía server).
 */
function getOrCreateSessionId(): string {
    if (typeof window === "undefined") return generateSessionId();
    const existing = sessionStorage.getItem(CHAT_SESSION_STORAGE_KEY);
    if (existing) return existing;
    const id = generateSessionId();
    sessionStorage.setItem(CHAT_SESSION_STORAGE_KEY, id);
    return id;
}

export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false); // Trạng thái đóng/mở cửa sổ chat
    const [messages, setMessages] = useState<Message[]>([ // Danh sách các tin nhắn trong hội thoại
        {
            role: "assistant",
            content: "Xin chào! 👋 Tôi là trợ lý ảo của phòng khám. Tôi có thể giúp bạn:\n\n• 🔍 Tìm kiếm bác sĩ, chuyên khoa, gói khám\n• 🩺 Phân tích triệu chứng và gợi ý chuyên khoa\n\nBạn cần hỗ trợ gì?",
        },
    ]);
    const [input, setInput] = useState(""); // Nội dung tin nhắn người dùng đang gõ
    const [loading, setLoading] = useState(false); // Trạng thái chờ phản hồi từ AI
    const [sessionId] = useState(getOrCreateSessionId); // ID phiên chat (persist sessionStorage)
    const messagesEndRef = useRef<HTMLDivElement>(null); // Dùng để tự động cuộn xuống tin nhắn mới nhất
    const inputRef = useRef<HTMLInputElement>(null); // Tham chiếu tới ô nhập liệu
    const router = useRouter(); // Điều hướng trang

    /**
     * HÀM: useEffect scrollBottom
     * MÔ TẢ: Tự động cuộn xuống cuối danh sách tin nhắn mỗi khi có tin nhắn mới.
     */
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    /**
     * HÀM: useEffect focusInput
     * MÔ TẢ: Tự động focus vào ô nhập liệu khi người dùng mở cửa sổ chat.
     */
    useEffect(() => {
        if (isOpen) inputRef.current?.focus();
    }, [isOpen]);

    /**
     * HÀM 1: getUserId
     * MÔ TẢ: Lấy ID người dùng từ localStorage để cá nhân hóa hội thoại AI.
     */
    const getUserId = (): number | null => {
        if (typeof window === "undefined") return null;
        try {
            const saved = localStorage.getItem("clinic_user");
            if (saved) {
                const user = JSON.parse(saved);
                return user?.userId || null;
            }
        } catch { }
        return null;
    };

    /**
     * HÀM 2: sendMessage
     * MÔ TẢ: Gửi tin nhắn của người dùng lên Backend AI và nhận phản hồi.
     */
    const sendMessage = async () => {
        if (!input.trim() || loading) return;
        const userMessage = input.trim();
        setInput("");
        setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
        setLoading(true);

        // Timeout 28s — khớp với backend timeout 25s + buffer network
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 28000);

        try {
            const res = await fetch(`${API_BASE_URL}/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: controller.signal,
                body: JSON.stringify({
                    sessionId,
                    message: userMessage,
                    userId: getUserId(),
                }),
            });

            clearTimeout(timeoutId);
            if (!res.ok) throw new Error("Chat request failed");
            const data: ChatResponse = await res.json();

            const assistantMsg: Message = {
                role: "assistant",
                content: data.message,
            };
            if (data.specializations) assistantMsg.cards = data.specializations;
            if (data.doctors) assistantMsg.doctors = data.doctors;
            if (data.healthPackages) assistantMsg.healthPackages = data.healthPackages;
            if (data.appointmentConfirmation) assistantMsg.confirmation = data.appointmentConfirmation;

            setMessages((prev) => [...prev, assistantMsg]);
        } catch (err: unknown) {
            clearTimeout(timeoutId);
            console.error("Chat error:", err);
            const isTimeout = err instanceof Error && err.name === "AbortError";
            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant", content: isTimeout
                        ? "⏱️ Hệ thống AI đang bận, vui lòng thử lại sau vài giây nhé."
                        : "Xin lỗi, đã xảy ra lỗi kết nối. Vui lòng thử lại."
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleCardClick = (card: CardItem) => {
        if (card.type === "specialization") {
            router.push(`/specialization/${card.id}`);
        } else if (card.type === "health_package") {
            router.push(`/health-package/${card.id}`);
        }
    };

    const handleDoctorClick = (doctor: DoctorCard) => {
        router.push(`/doctor/${doctor.id}`);
    };

    /**
     * HÀM 5: formatMessage
     * MÔ TẢ: Định dạng văn bản tin nhắn (xử lý xuống dòng và chữ đậm markdown).
     */
    const formatMessage = (text: string) => {
        return text.split("\n").map((line, i) => {
            // Bold markdown
            const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            return (
                <span key={i}>
                    <span dangerouslySetInnerHTML={{ __html: formatted }} />
                    {i < text.split("\n").length - 1 && <br />}
                </span>
            );
        });
    };

    return (
        <>
            <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
                <a
                    href="https://zalo.me/0395208934"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Liên hệ Zalo nhân viên tư vấn"
                    title="Liên hệ Zalo nhân viên tư vấn"
                    className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 bg-white border border-[#c7e7ff]"
                >
                    <svg className="w-9 h-9" viewBox="0 0 64 64" aria-hidden="true">
                        <circle cx="32" cy="32" r="32" fill="#0068FF" />
                        <path fill="#FFFFFF" d="M17.4 20.3h29.2c1.8 0 3.2 1.4 3.2 3.2v17.1c0 1.8-1.4 3.2-3.2 3.2H31.3l-6.7 5.5c-1 .8-2.4.1-2.4-1.2v-4.3h-4.8c-1.8 0-3.2-1.4-3.2-3.2V23.5c0-1.8 1.4-3.2 3.2-3.2Z" />
                        <path fill="#0068FF" d="M24.2 28.2h14.2c.9 0 1.4 1 .8 1.7l-9.2 10.2h8.6c.7 0 1.3.6 1.3 1.3s-.6 1.3-1.3 1.3H24c-.9 0-1.4-1-.8-1.7l9.2-10.2h-8.2c-.7 0-1.3-.6-1.3-1.3s.6-1.3 1.3-1.3Zm17.4 0h2c.7 0 1.3.6 1.3 1.3v11.9c0 .7-.6 1.3-1.3 1.3h-2c-.7 0-1.3-.6-1.3-1.3V29.5c0-.7.6-1.3 1.3-1.3Z" />
                    </svg>
                </a>

                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110"
                    style={{
                        background: "linear-gradient(135deg, #0d6b52 0%, #0ea882 100%)",
                    }}
                    id="chat-toggle-btn"
                    aria-label={isOpen ? "Đóng chatbot" : "Mở chatbot"}
                    title={isOpen ? "Đóng chatbot" : "Mở chatbot"}
                >
                    {isOpen ? (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ) : (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    )}
                </button>
            </div>

            {/* CỬA SỔ CHAT (Chat Panel) */}
            {isOpen && (
                <div
                    className="fixed bottom-24 right-6 z-50 w-96 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200"
                    style={{ height: "560px", maxHeight: "calc(100vh - 140px)" }}
                >
                    {/* PHẦN ĐẦU (Header) */}
                    <div
                        className="px-5 py-4 flex items-center gap-3"
                        style={{
                            background: "linear-gradient(135deg, #0d6b52 0%, #0ea882 100%)",
                        }}
                    >
                        <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-white font-semibold text-sm">Trợ lý MedPro</h3>
                            <p className="text-white/70 text-xs">Luôn sẵn sàng hỗ trợ bạn</p>
                        </div>
                    </div>

                    {/* VÙNG HIỂN THỊ TIN NHẮN */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f0fdf8]">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[85%] ${msg.role === "user" ? "" : ""}`}>
                                    <div
                                        className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.role === "user"
                                            ? "bg-[#0d6b52] text-white rounded-br-sm"
                                            : "bg-white text-[#0a3d2e] rounded-bl-sm shadow-sm border border-[#b2e8d9]"
                                            }`}
                                    >
                                        {formatMessage(msg.content)}
                                    </div>

                                    {/* CARDS GỢI Ý */}
                                    {msg.cards && msg.cards.length > 0 && (
                                        <div className="mt-2 space-y-2">
                                            {msg.cards.map((card) => (
                                                <div
                                                    key={card.id}
                                                    onClick={() => handleCardClick(card)}
                                                    className="bg-white rounded-xl p-3 border border-[#d1faf0] hover:border-[#0ea882] hover:shadow-md cursor-pointer transition-all flex items-center gap-3"
                                                >
                                                    {card.featureImageUrl ? (
                                                        <img
                                                            src={`${API_BASE_URL}${card.featureImageUrl}`}
                                                            alt={card.name}
                                                            className="w-12 h-12 rounded-xl object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-xl bg-[#e8f9f4] flex items-center justify-center">
                                                            <svg className="w-6 h-6 text-[#0d6b52]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-gray-800 truncate">{card.name}</p>
                                                        {card.description && (
                                                            <p className="text-xs text-gray-500 truncate">{card.description}</p>
                                                        )}
                                                    </div>
                                                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* GÓI KHÁM SỨC KHỎE */}
                                    {msg.healthPackages && msg.healthPackages.length > 0 && (
                                        <div className="mt-2 space-y-2">
                                            {msg.healthPackages.map((pkg) => (
                                                <div
                                                    key={pkg.id}
                                                    onClick={() => handleCardClick(pkg)}
                                                    className="bg-white rounded-xl p-3 border border-gray-100 hover:border-green-300 hover:shadow-md cursor-pointer transition-all flex items-center gap-3"
                                                >
                                                    {pkg.featureImageUrl ? (
                                                        <img
                                                            src={`${API_BASE_URL}${pkg.featureImageUrl}`}
                                                            alt={pkg.name}
                                                            className="w-12 h-12 rounded-xl object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                                                            <span className="text-lg">📦</span>
                                                        </div>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-gray-800 truncate">{pkg.name}</p>
                                                        {pkg.description && (
                                                            <p className="text-xs text-gray-500 truncate">{pkg.description}</p>
                                                        )}
                                                    </div>
                                                    <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* BÁC SĨ GỢI Ý */}
                                    {msg.doctors && msg.doctors.length > 0 && (
                                        <div className="mt-2 space-y-2">
                                            {msg.doctors.map((doctor, dIdx) => (
                                                <div
                                                    key={doctor.id}
                                                    className="bg-white rounded-xl p-3 border border-[#d1faf0] hover:border-[#0ea882] hover:shadow-md cursor-pointer transition-all"
                                                    onClick={() => handleDoctorClick(doctor)}
                                                >
                                                    <div className="flex items-center gap-3 mb-2">
                                                        {doctor.featureImageUrl ? (
                                                            <img
                                                                src={`${API_BASE_URL}${doctor.featureImageUrl}`}
                                                                alt={doctor.fullName}
                                                                className="w-10 h-10 rounded-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-full bg-[#e8f9f4] flex items-center justify-center">
                                                                <span className="text-sm">👨‍⚕️</span>
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-semibold text-gray-800">
                                                                {dIdx + 1}. {doctor.fullName}
                                                            </p>
                                                            {doctor.specializationName && (
                                                                <p className="text-xs text-[#0d6b52] font-medium">{doctor.specializationName}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {doctor.schedules && doctor.schedules.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {doctor.schedules.slice(0, 3).map((slot) => (
                                                                <span
                                                                    key={slot.id}
                                                                    className="text-xs bg-[#d1faf0] text-[#0d6b52] px-2 py-0.5 rounded-full"
                                                                >
                                                                    {slot.workDate} {slot.startTime}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* XÁC NHẬN ĐẶT LỊCH KHÁM */}
                                    {msg.confirmation && (
                                        <div className="mt-2 bg-green-50 rounded-xl p-3 border border-green-200">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-green-600 text-lg">✅</span>
                                                <p className="text-sm font-semibold text-green-800">Đặt lịch thành công!</p>
                                            </div>
                                            <p className="text-xs text-green-700">
                                                Bác sĩ: {msg.confirmation.doctorName}<br />
                                                Ngày: {msg.confirmation.appointmentDate}<br />
                                                Giờ: {msg.confirmation.appointmentTime}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm border border-gray-100">
                                    <div className="flex gap-1.5">
                                        <div className="w-2 h-2 bg-[#0d6b52] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                        <div className="w-2 h-2 bg-[#0d6b52] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                        <div className="w-2 h-2 bg-[#0d6b52] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Ô NHẬP TIN NHẮN */}
                    <div className="p-3 border-t border-gray-100 bg-white">
                        <div className="flex items-center gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                                placeholder="Nhập tin nhắn..."
                                disabled={loading}
                                className="flex-1 bg-[#f0fdf8] rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0ea882]/30 border border-[#b2e8d9] transition-all disabled:opacity-50"
                                id="chat-input"
                            />
                            <button
                                onClick={sendMessage}
                                disabled={loading || !input.trim()}
                                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
                                style={{
                                    background: "linear-gradient(135deg, #0d6b52 0%, #0ea882 100%)",
                                }}
                                id="chat-send-btn"
                            >
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
