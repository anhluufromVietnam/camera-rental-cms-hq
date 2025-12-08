"use client";

import { useRef, useEffect, useMemo, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/firebase.config";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  User,
  Camera,
  Phone,
  List,
  Package,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, differenceInDays, parseISO } from "date-fns";
import { vi } from "date-fns/locale";

type BookingStatus = "pending" | "confirmed" | "active" | "completed" | "overtime" | "cancelled" | "unknown";

interface StatusLog {
  id?: string;
  status: BookingStatus;
  timestamp: string;
}

interface Booking {
  id: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  cameraId: string;
  cameraName: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  totalDays?: number;
  dailyRate?: number;
  totalAmount?: number;
  status: BookingStatus;
  createdAt?: string;
  notes?: string;
  statusChangeLogs?: Record<string, { status: BookingStatus; timestamp: string }>;
  __logs?: StatusLog[];
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  bookings: Booking[];
}

const MONTHS = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];
const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: "bg-yellow-500",
  confirmed: "bg-blue-500",
  active: "bg-green-500",
  completed: "bg-gray-500",
  overtime: "bg-orange-500",
  cancelled: "bg-red-500",
  unknown: "bg-gray-500",
};

const EVENT_COLORS = {
  giao: "bg-indigo-600",
  nhan: "bg-emerald-600",
  reserved: "bg-yellow-600",
};

const normalizeToDate = (d: string | Date) => {
  const date = typeof d === "string" ? parseISO(d) : new Date(d);
  if (isNaN(date.getTime())) return new Date(0);
  date.setHours(0, 0, 0, 0);
  return date;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const ACTIVE_STATUSES: BookingStatus[] = ["pending", "confirmed", "active", "overtime"];

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"month" | "day">("month");

  const timelineRef = useRef<HTMLDivElement>(null);
  const now = new Date();
  const currentHour = now.getHours();
  const displayHours = Array.from({ length: 16 }, (_, i) => i + 7); // 7 → 22
  const activeDay = selectedDay || new Date();

  // Hàm tính thống kê cho bất kỳ ngày nào (linh hoạt, xử lý tất cả trường hợp)
  const calculateStatsForDay = (targetDate: Date) => {
    const dayStart = normalizeToDate(targetDate);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const activeBookings = bookings.filter((b) => {
      // 1. Bắt buộc có dữ liệu cần thiết (bỏ qua nếu thiếu → tránh crash)
      if (!b || !b.startDate || !b.endDate || !b.cameraId || !b.customerName) return false;

      // 2. Chỉ count các status đang "chiếm máy" (bỏ status lạ hoặc không xác định)
      if (!ACTIVE_STATUSES.includes(b.status)) return false;

      // 3. Kiểm tra ngày hợp lệ (start > end → bỏ qua, dữ liệu lỗi)
      const start = normalizeToDate(b.startDate);
      const end = normalizeToDate(b.endDate);
      if (start > end) return false;

      // 4. Kiểm tra overlap với ngày target (chuẩn cho multi-day, same-day)
      return start <= dayEnd && end >= dayStart;
    });

    // Máy đang thuê: unique cameraId (chuẩn, không trùng máy)
    const uniqueCameras = new Set(activeBookings.map(b => b.cameraId)).size;

    // Khách đang thuê: unique bằng tên + sđt (xử lý trùng tên nhưng khác người, nếu thiếu phone dùng email)
    const uniqueCustomers = new Set(
      activeBookings.map(b => {
        const name = (b.customerName || "").trim().toLowerCase();
        const phone = (b.customerPhone || "").trim();
        const email = (b.customerEmail || "").trim().toLowerCase();
        return name ? `${name}|${phone || email || b.id}` : b.id; // fallback id nếu thiếu hết
      })
    ).size;

    // Tổng đơn đang hoạt động (full count, không unique)
    const totalBookings = activeBookings.length;

    return {
      totalCameras: uniqueCameras,
      totalCustomers: uniqueCustomers,
      totalBookings,
    };
  };

  const stats = useMemo(() => {
    const target = viewMode === "day" && selectedDay ? selectedDay : new Date();
    return calculateStatsForDay(target);
  }, [bookings, viewMode, selectedDay]);

  // Auto scroll to current hour in Day View
  useEffect(() => {
    if (viewMode === "day" && timelineRef.current) {
      const currentHour = new Date().getHours();
      if (currentHour >= 7 && currentHour <= 22) {
        const index = currentHour - 7;
        const hourHeight = 48;
        timelineRef.current.scrollTop = index * hourHeight - 100;
      }
    }
  }, [viewMode, activeDay]);

  // Load bookings from Firebase
  useEffect(() => {
    const bookingsRef = ref(db, "bookings");
    const unsub = onValue(bookingsRef, (snap) => {
      if (!snap.exists()) {
        setBookings([]);
        return;
      }
      const data = snap.val();
      const list: Booking[] = Object.entries(data).map(([id, v]: [string, any]) => {
        const b = { id, ...v } as Booking;
        const logsObj = v.statusChangeLogs;
        if (logsObj && typeof logsObj === "object") {
          b.__logs = Object.entries(logsObj).map(([lid, lv]: [string, any]) => {
            let ts = lv.changedAt || lv.timestamp || lv;
            let dateVal: Date;
            if (!ts) dateVal = new Date(0);
            else if (typeof ts === "object" && "seconds" in ts) dateVal = new Date(ts.seconds * 1000);
            else if (typeof ts === "number") dateVal = new Date(ts < 1e12 ? ts * 1000 : ts);
            else if (typeof ts === "string") {
              const parsed = parseISO(ts);
              dateVal = isNaN(parsed.getTime()) ? new Date(0) : parsed;
            } else dateVal = new Date(0);
            return {
              id: lid,
              status: lv.newStatus || lv.status || "unknown",
              timestamp: dateVal.toISOString(),
            };
          }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        } else {
          b.__logs = [];
        }
        return b;
      });
      setBookings(list);
      try { localStorage.setItem("bookings", JSON.stringify(list)); } catch { }
    }, (error) => {
      console.error("Firebase error:", error);
      try {
        const saved = localStorage.getItem("bookings");
        if (saved) setBookings(JSON.parse(saved));
      } catch { }
    });
    return () => unsub();
  }, []);

  // Calendar generation
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));

    const days: CalendarDay[] = [];
    const iter = new Date(startDate);

    while (iter <= endDate) {
      const dayStart = normalizeToDate(iter);
      const dayEnd = new Date(iter);
      dayEnd.setHours(23, 59, 59, 999);

      const dayBookings = bookings.filter(b => {
        if (!b.startDate || !b.endDate) return false;
        const start = normalizeToDate(b.startDate);
        const end = normalizeToDate(b.endDate);
        return start <= dayEnd && end >= dayStart;
      });

      days.push({
        date: new Date(iter),
        isCurrentMonth: iter.getMonth() === month,
        bookings: dayBookings,
      });
      iter.setDate(iter.getDate() + 1);
    }
    return days;
  }, [bookings, currentDate]);

  const navigateMonth = (dir: "prev" | "next") => {
    setCurrentDate(d => {
      const copy = new Date(d);
      copy.setMonth(copy.getMonth() + (dir === "prev" ? -1 : 1));
      return copy;
    });
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDay(today);
    setViewMode("day");
  };

  const openDay = (date: Date) => {
    setSelectedDay(date);
    setViewMode("day");
  };

  // Events for a day
  type EventItem = {
    id: string;
    booking: Booking;
    type: "giao" | "nhan" | "reserved";
    time?: Date;
    title: string;
    colorClass: string;
  };

  const getEventsForDay = (day: Date): EventItem[] => {
    const dayStart = normalizeToDate(day);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    const events: EventItem[] = [];

    bookings.forEach(b => {
      const start = normalizeToDate(b.startDate);
      const end = normalizeToDate(b.endDate);
      if (start > dayEnd || end < dayStart) return;

      const logs = b.__logs || [];
      const activeLog = logs.find(l => l.status === "active");
      const completedLog = logs.find(l => l.status === "completed");

      // Giao
      if (activeLog && isSameDay(new Date(activeLog.timestamp), day)) {
        events.push({
          id: `${b.id}-giao`,
          booking: b,
          type: "giao",
          time: new Date(activeLog.timestamp),
          title: `Giao: ${b.customerName}`,
          colorClass: EVENT_COLORS.giao,
        });
      } else if (isSameDay(start, day)) {
        const t = new Date(start);
        t.setHours(b.startTime ? parseInt(b.startTime.split(":")[0]) : 9, 0);
        events.push({
          id: `${b.id}-giao-default`,
          booking: b,
          type: "giao",
          time: t,
          title: `Giao (dự kiến): ${b.customerName}`,
          colorClass: EVENT_COLORS.giao,
        });
      }

      // Nhận
      if (completedLog && isSameDay(new Date(completedLog.timestamp), day)) {
        events.push({
          id: `${b.id}-nhan`,
          booking: b,
          type: "nhan",
          time: new Date(completedLog.timestamp),
          title: `Nhận: ${b.customerName}`,
          colorClass: EVENT_COLORS.nhan,
        });
      } else if (isSameDay(end, day)) {
        const t = new Date(end);
        t.setHours(b.endTime ? parseInt(b.endTime.split(":")[0]) : 18, 0);
        events.push({
          id: `${b.id}-nhan-default`,
          booking: b,
          type: "nhan",
          time: t,
          title: `Nhận (dự kiến): ${b.customerName}`,
          colorClass: EVENT_COLORS.nhan,
        });
      }

      // Reserved
      if (start <= dayEnd && end >= dayStart && !isSameDay(start, day) && !isSameDay(end, day)) {
        events.push({
          id: `${b.id}-reserved`,
          booking: b,
          type: "reserved",
          title: `Đang thuê: ${b.customerName}`,
          colorClass: EVENT_COLORS.reserved,
        });
      }
    });

    events.sort((a, b) => {
      if (a.type === "reserved" && b.type !== "reserved") return -1;
      if (b.type === "reserved" && a.type !== "reserved") return 1;
      if (!a.time && b.time) return 1;
      if (!b.time && a.time) return -1;
      return (a.time?.getTime() || 0) - (b.time?.getTime() || 0);
    });

    return events;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Lịch thuê máy</h2>
        <p className="text-sm sm:text-base text-muted-foreground">Xem lịch theo tháng hoặc chi tiết theo ngày</p>
      </div>

      {/* THỐNG KÊ ĐỘNG - HIỂN THỊ LUÔN TRÊN CÙNG */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Thống kê ngày {format(viewMode === "day" && selectedDay ? selectedDay : new Date(), "dd/MM/yyyy", { locale: vi })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-5 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                {stats.totalCameras}
              </div>
              <div className="text-sm text-muted-foreground mt-2 flex items-center justify-center gap-1">
                <Camera className="h-4 w-4" />
                Máy đang cho thuê
              </div>
            </div>

            <div className="text-center p-5 bg-green-50 dark:bg-green-950/30 rounded-xl border border-green-200 dark:border-green-800">
              <div className="text-4xl font-bold text-green-600 dark:text-green-400">
                {stats.totalCustomers}
              </div>
              <div className="text-sm text-muted-foreground mt-2 flex items-center justify-center gap-1">
                <Users className="h-4 w-4" />
                Khách hàng đang thuê
              </div>
            </div>

            <div className="text-center p-5 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-800">
              <div className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                {stats.totalBookings}
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                Tổng đơn đang hoạt động
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <div className="flex gap-2 flex-wrap">
          <Button variant={viewMode === "month" ? "default" : "outline"} onClick={() => setViewMode("month")}>
            Tháng
          </Button>
          <Button variant={viewMode === "day" ? "default" : "outline"} onClick={() => { setViewMode("day"); setSelectedDay(new Date()); }}>
            Ngày
          </Button>
        </div>

        <div className="mt-2 sm:mt-0 sm:ml-auto flex items-center gap-1 flex-wrap">
          <Button variant="outline" size="icon" onClick={() => navigateMonth("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="px-3 text-center">
            <div className="font-semibold text-sm sm:text-base">{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</div>
          </div>
          <Button variant="outline" size="icon" onClick={() => navigateMonth("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>Hôm nay</Button>
        </div>
      </div>

      {/* MONTH VIEW */}
      {viewMode === "month" && (
        <Card>
          <CardContent className="p-0 overflow-auto">
            <div className="inline-block min-w-full">
              {/* Header ngày trong tuần */}
              <div className="grid grid-cols-7 gap-px bg-border">
                {WEEKDAYS.map(d => (
                  <div key={d} className="bg-card p-2 text-center text-xs font-medium text-muted-foreground truncate">
                    {d}
                  </div>
                ))}
              </div>

              {/* Các tuần */}
              <div className="grid gap-px" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {calendarDays.map((day, i) => {
                  const bookingsOfDay = bookings.filter(b =>
                    isSameDay(normalizeToDate(b.startDate), day.date) ||
                    isSameDay(normalizeToDate(b.endDate), day.date) ||
                    (normalizeToDate(b.startDate) < day.date && normalizeToDate(b.endDate) > day.date)
                  );

                  return (
                    <div
                      key={i}
                      onClick={() => openDay(day.date)}
                      className={cn(
                        "relative flex flex-col items-start p-2 bg-card cursor-pointer hover:bg-muted/50 transition",
                        !day.isCurrentMonth && "bg-muted/20 text-muted-foreground"
                      )}
                      style={{ aspectRatio: '1 / 1' }} // giữ vuông
                    >
                      {/* Ngày + badge */}
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className={cn("text-sm font-medium", isSameDay(day.date, new Date()) && "text-primary font-bold")}>
                          {day.date.getDate()}
                        </span>
                        {isSameDay(day.date, new Date()) && <Badge className="h-5 text-xs">Hôm nay</Badge>}
                      </div>

                      {/* Bookings */}
                      <div className="flex flex-col gap-1 w-full overflow-hidden">
                        {bookingsOfDay.slice(0, 3).map((b, idx) => (
                          <div
                            key={b.id + idx}
                            onClick={(e) => { e.stopPropagation(); setSelectedBooking(b); }}
                            className={cn("px-1 py-0.5 rounded text-white text-xs truncate shadow-sm cursor-pointer w-full", STATUS_COLORS[b.status])}
                            title={`${b.customerName} — ${b.cameraName}`}
                          >
                            {b.customerName}
                          </div>
                        ))}
                        {bookingsOfDay.length > 3 && (
                          <div className="text-xs text-muted-foreground truncate">
                            +{bookingsOfDay.length - 3} khác
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

      )}

      {viewMode === "day" && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-xl sm:text-2xl font-bold">
                  {format(activeDay, "EEEE, dd/MM/yyyy", { locale: vi })}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {MONTHS[activeDay.getMonth()]} {activeDay.getFullYear()}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedDay(d => { const prev = new Date(d || new Date()); prev.setDate(prev.getDate() - 1); return prev; })}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedDay(d => { const next = new Date(d || new Date()); next.setDate(next.getDate() + 1); return next; })}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="default" size="sm" onClick={() => setSelectedDay(new Date())}>
                  Hôm nay
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            <div className="overflow-auto max-h-[calc(10*3rem)]">
              <div
                ref={timelineRef}
                className="w-full grid grid-cols-[60px_1fr] max-h-[70vh] sm:max-h-[80vh] border rounded-lg bg-card/50 scrollbar-thin scrollbar-thumb-muted"
              >
                {/* Cột giờ: 7h → 22h */}
                <div className="sticky top-0 z-10 bg-card border-r">
                  {displayHours.map((h) => (
                    <div
                      key={h}
                      className={cn(
                        "h-12 flex items-center justify-end pr-3 text-sm font-medium border-b relative",
                        h === currentHour && "bg-primary/10 text-primary font-bold"
                      )}
                    >
                      {String(h).padStart(2, "0")}:00
                      {h === currentHour && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
                    </div>
                  ))}
                </div>

                {/* Cột sự kiện */}
                <div className="relative flex flex-col">
                  {displayHours.map((h) => {
                    const hourEvents = getEventsForDay(activeDay).filter(
                      (e) => e.time && e.time.getHours() === h
                    );
                    return (
                      <div key={h} className="h-12 border-b border-muted/20 flex items-center gap-1 px-1 sm:px-2">
                        {hourEvents.length === 0 ? (
                          <div className="text-xs text-muted-foreground/50 truncate">—</div>
                        ) : (
                          hourEvents.map((ev) => (
                            <div
                              key={ev.id}
                              onClick={() => setSelectedBooking(ev.booking)}
                              className={cn(
                                "px-2 py-1 rounded-md text-white text-xs font-medium cursor-pointer shadow-md transition-all hover:scale-105 whitespace-nowrap truncate",
                                ev.colorClass
                              )}
                              title={`${ev.title} • ${ev.time ? format(ev.time, "HH:mm") : "Cả ngày"} • Thuê: ${ev.booking.startTime || "--:--"
                                } - ${ev.booking.endTime || "--:--"}`}
                            >
                              <div className="flex items-center gap-1 truncate">
                                <Camera className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{ev.booking.cameraName}</span>
                              </div>
                              <div className="text-xs opacity-90 mt-0.5 truncate">
                                {ev.title.split(":")[0]} • {ev.time ? format(ev.time, "HH:mm") : "Cả ngày"}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>

            {/* Danh sách sự kiện */}
            <div className="mt-4 sm:mt-8">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <List className="h-5 w-5" />
                Sự kiện trong ngày
              </h3>
              {getEventsForDay(activeDay).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Không có lịch giao/nhận nào hôm nay.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {getEventsForDay(activeDay).map((ev) => (
                    <div key={ev.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border rounded-lg hover:border-primary/50 transition bg-card shadow-sm gap-2 sm:gap-0">
                      <div className="flex-1">
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
                          <div className={cn("w-3 h-3 rounded-full", ev.colorClass)} />
                          <div className="font-semibold text-foreground truncate">{ev.title}</div>
                          <Badge variant="outline" className="ml-2 truncate">{ev.booking.cameraName}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1 ml-0 sm:ml-6 truncate">
                          {ev.time ? (
                            <span className="font-medium text-primary">{format(ev.time, "HH:mm")}</span>
                          ) : "Cả ngày"} • {ev.booking.customerName}
                        </div>
                      </div>
                      <Button size="sm" variant="default" onClick={() => setSelectedBooking(ev.booking)}>
                        Xem chi tiết
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* DIALOG CHI TIẾT */}
      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent className="w-full max-w-flex sm:max-w-lg max-h-[80vh] sm:max-h-[90vh] overflow-auto p-4">
          <DialogHeader>
            <DialogTitle>Chi tiết đơn thuê</DialogTitle>
            <DialogDescription>Thông tin đầy đủ về đơn đặt</DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <Badge className={cn("text-white", STATUS_COLORS[selectedBooking.status])}>
                  {selectedBooking.status === "pending"
                    ? "Chờ xác nhận"
                    : selectedBooking.status === "confirmed"
                      ? "Đã xác nhận"
                      : selectedBooking.status === "active"
                        ? "Đang thuê"
                        : selectedBooking.status === "completed"
                          ? "Hoàn thành"
                          : selectedBooking.status === "overtime"
                            ? "Quá hạn"
                            : selectedBooking.status === "cancelled"
                              ? "Đã hủy"
                              : selectedBooking.status}
                </Badge>
                <span className="text-muted-foreground">#{selectedBooking.id.slice(0, 8)}</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{selectedBooking.customerName}</p>
                    {selectedBooking.customerEmail && (
                      <p className="text-muted-foreground">{selectedBooking.customerEmail}</p>
                    )}
                  </div>
                </div>

                {selectedBooking.customerPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedBooking.customerPhone}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{selectedBooking.cameraName}</span>
                </div>

                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p>
                      {format(normalizeToDate(selectedBooking.startDate), "dd/MM/yyyy")} →{" "}
                      {format(normalizeToDate(selectedBooking.endDate), "dd/MM/yyyy")}
                    </p>
                    <p className="text-muted-foreground">
                      {differenceInDays(
                        normalizeToDate(selectedBooking.endDate),
                        normalizeToDate(selectedBooking.startDate)
                      ) + 1}{" "}
                      ngày
                    </p>
                    {(selectedBooking.startTime || selectedBooking.endTime) && (
                      <p className="text-muted-foreground">
                        Nhận: <b>{selectedBooking.startTime || "--:--"}</b> | Trả: <b>{selectedBooking.endTime || "--:--"}</b>
                      </p>
                    )}
                  </div>
                </div>

                <div className="border-t pt-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Đơn giá:</span>
                    <span>{(selectedBooking.dailyRate || 0).toLocaleString("vi-VN")}đ/ngày</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Tổng:</span>
                    <span className="text-primary">{(selectedBooking.totalAmount || 0).toLocaleString("vi-VN")}đ</span>
                  </div>
                </div>

                {selectedBooking.notes && (
                  <div className="border-t pt-2">
                    <p className="text-muted-foreground font-medium">Ghi chú:</p>
                    <p className="italic">{selectedBooking.notes}</p>
                  </div>
                )}

                {selectedBooking.__logs && selectedBooking.__logs.length > 0 && (
                  <div className="border-t pt-2">
                    <p className="font-medium mb-2">Lịch sử trạng thái:</p>
                    <div className="space-y-1 text-xs">
                      {selectedBooking.__logs.map((log) => {
                        const date = new Date(log.timestamp);
                        return (
                          <div key={log.id || log.timestamp} className="flex justify-between">
                            <span
                              className={cn(
                                "font-medium",
                                log.status === "pending" && "text-yellow-600",
                                log.status === "confirmed" && "text-blue-600",
                                log.status === "active" && "text-green-600",
                                log.status === "completed" && "text-gray-600",
                                log.status === "overtime" && "text-orange-600",
                                log.status === "cancelled" && "text-red-600"
                              )}
                            >
                              {log.status === "pending"
                                ? "Chờ"
                                : log.status === "confirmed"
                                  ? "Xác nhận"
                                  : log.status === "active"
                                    ? "Đang thuê"
                                    : log.status === "completed"
                                      ? "Hoàn thành"
                                      : log.status === "overtime"
                                        ? "Quá hạn"
                                        : log.status === "cancelled"
                                          ? "Hủy"
                                          : log.status}
                            </span>
                            <span className="text-muted-foreground">
                              {isNaN(date.getTime()) ? "—" : format(date, "HH:mm dd/MM")}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}