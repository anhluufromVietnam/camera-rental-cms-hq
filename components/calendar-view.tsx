"use client"

import { useEffect, useMemo, useState } from "react"
import { ref, onValue } from "firebase/database"
import { db } from "@/firebase.config"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  User,
  Camera,
  Phone,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format, differenceInDays, parseISO } from "date-fns"
import { vi } from "date-fns/locale"

type BookingStatus = "pending" | "confirmed" | "active" | "completed" | "overtime" | "cancelled"

interface StatusLog {
  id?: string
  status: BookingStatus
  timestamp: string // ISO
}

interface Booking {
  id: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  cameraId: string
  cameraName: string
  startDate: string // "YYYY-MM-DD"
  endDate: string // "YYYY-MM-DD"
  startTime?: string
  endTime?: string
  totalDays?: number
  dailyRate?: number
  totalAmount?: number
  status: BookingStatus
  createdAt?: string
  notes?: string
  statusChangeLogs?: Record<string, { status: BookingStatus; timestamp: string }>
  __logs?: StatusLog[]
}

interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  bookings: Booking[]
}

const MONTHS = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
]

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: "bg-yellow-500",
  confirmed: "bg-blue-500",
  active: "bg-green-500",
  completed: "bg-gray-500",
  overtime: "bg-orange-500",
  cancelled: "bg-red-500",
}

const EVENT_COLORS = {
  giao: "bg-indigo-600",
  nhan: "bg-emerald-600",
  reserved: "bg-yellow-500",
  maintenance: "bg-gray-500",
}

const normalizeToDate = (d: string | Date) => {
  const date = typeof d === "string" ? parseISO(d) : new Date(d)
  date.setHours(0, 0, 0, 0)
  return date
}

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [viewMode, setViewMode] = useState<"month" | "day">("month")

  // Load bookings & normalize logs
  useEffect(() => {
    const bookingsRef = ref(db, "bookings")
    const unsub = onValue(bookingsRef, (snap) => {
      if (!snap.exists()) {
        setBookings([])
        return
      }
      const data: Record<string, any> = snap.val()
      const list: Booking[] = Object.entries(data).map(([id, v]) => {
        const b = { id, ...(v as any) } as Booking
        const logsObj = v?.statusChangeLogs || null
        if (logsObj && typeof logsObj === "object") {
          b.__logs = Object.entries(logsObj).map(([lid, lv]: [string, any]) => {
            let dateVal: Date
            const ts = lv.changedAt || lv.timestamp

            if (!ts) {
              dateVal = new Date(0)
            } else if (typeof ts === "object" && "seconds" in ts) {
              dateVal = new Date(ts.seconds * 1000)
            } else if (typeof ts === "number") {
              dateVal = new Date(ts < 1e12 ? ts * 1000 : ts)
            } else if (typeof ts === "string") {
              const parsed = parseISO(ts)
              dateVal = isNaN(parsed.getTime()) ? new Date(0) : parsed
            } else {
              dateVal = new Date(0)
            }

            return {
              id: lid,
              status: lv.newStatus || lv.status || "unknown",
              timestamp: dateVal.toISOString(),
            }
          }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        } else {
          b.__logs = []
        }
        return b
      })
      setBookings(list)
    })
    return () => unsub()
  }, [])

  // Save bookings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("bookings", JSON.stringify(bookings))
    } catch {
      console.warn("Failed to save bookings to localStorage")
    }
  }, [bookings])

  // Calendar generation
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - startDate.getDay())
    const endDate = new Date(lastDay)
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()))

    const days: CalendarDay[] = []
    const iter = new Date(startDate)

    while (iter <= endDate) {
      const dayStart = new Date(iter)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(iter)
      dayEnd.setHours(23, 59, 59, 999)

      const dayBookings = bookings.filter((b) => {
        if (!b.startDate || !b.endDate) return false
        const start = normalizeToDate(b.startDate)
        const end = normalizeToDate(b.endDate)
        return start <= dayEnd && end >= dayStart
      })

      days.push({
        date: new Date(iter),
        isCurrentMonth: iter.getMonth() === month,
        bookings: dayBookings,
      })

      iter.setDate(iter.getDate() + 1)
    }

    return days
  }, [bookings, currentDate])

  // Navigation
  const navigateMonth = (dir: "prev" | "next") => {
    setCurrentDate((d) => {
      const copy = new Date(d)
      copy.setMonth(copy.getMonth() + (dir === "prev" ? -1 : 1))
      return copy
    })
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setViewMode("day")
    setSelectedDay(today)
  }

  // Day events
  type EventItem = {
    id: string
    booking: Booking
    type: "giao" | "nhan" | "reserved"
    time?: Date
    title: string
    colorClass: string
  }

  const getEventsForDay = (day: Date): EventItem[] => {
    const dayStart = normalizeToDate(day)
    const dayEnd = new Date(dayStart)
    dayEnd.setHours(23, 59, 59, 999)

    const events: EventItem[] = []

    bookings.forEach((b) => {
      if (!b.startDate || !b.endDate) return
      const start = normalizeToDate(b.startDate)
      const end = normalizeToDate(b.endDate)
      if (start > dayEnd || end < dayStart) return

      const logs = b.__logs || []
      const activeLog = logs.find((l) => l.status === "active")
      const completedLog = logs.find((l) => l.status === "completed")

      // Giao event
      if (activeLog) {
        const ts = new Date(activeLog.timestamp)
        if (isSameDay(ts, day)) {
          events.push({
            id: `${b.id}-giao-${activeLog.id ?? activeLog.timestamp}`,
            booking: b,
            type: "giao",
            time: ts,
            title: `Giao: ${b.customerName}`,
            colorClass: EVENT_COLORS.giao,
          })
        }
      } else if (isSameDay(start, day)) {
        const t = new Date(start)
        t.setHours(b.startTime ? parseInt(b.startTime.split(":")[0]) : 9, 0, 0, 0)
        events.push({
          id: `${b.id}-giao-default`,
          booking: b,
          type: "giao",
          time: t,
          title: `Giao (dự kiến): ${b.customerName}`,
          colorClass: EVENT_COLORS.giao,
        })
      }

      // Nhan event
      if (completedLog) {
        const ts = new Date(completedLog.timestamp)
        if (isSameDay(ts, day)) {
          events.push({
            id: `${b.id}-nhan-${completedLog.id ?? completedLog.timestamp}`,
            booking: b,
            type: "nhan",
            time: ts,
            title: `Nhận: ${b.customerName}`,
            colorClass: EVENT_COLORS.nhan,
          })
        }
      } else if (isSameDay(end, day)) {
        const t = new Date(end)
        t.setHours(b.endTime ? parseInt(b.endTime.split(":")[0]) : 18, 0, 0, 0)
        events.push({
          id: `${b.id}-nhan-default`,
          booking: b,
          type: "nhan",
          time: t,
          title: `Nhận (dự kiến): ${b.customerName}`,
          colorClass: EVENT_COLORS.nhan,
        })
      }

      // Reserved event
      if (start <= dayEnd && end >= dayStart && !isSameDay(start, day) && !isSameDay(end, day)) {
        events.push({
          id: `${b.id}-reserved-${format(day, "yyyyMMdd")}`,
          booking: b,
          type: "reserved",
          title: `Đang thuê: ${b.customerName}`,
          colorClass: EVENT_COLORS.reserved,
        })
      }
    })

    events.sort((a, b) => {
      if (a.type === "reserved" && b.type !== "reserved") return -1
      if (b.type === "reserved" && a.type !== "reserved") return 1
      if (!a.time || !b.time) return 0
      return a.time.getTime() - b.time.getTime()
    })

    return events
  }

  // Display hours for day view
  const now = new Date()
  const currentHour = now.getHours()
  const displayHours = Array.from({ length: 24 }, (_, i) => i) // Show all 24 hours for consistency

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Lịch & Dashboard</h2>
        <p className="text-muted-foreground">Xem lịch đặt thuê theo tháng hoặc theo ngày (0–24h). Nhấn vào ngày để xem chi tiết.</p>
      </div>

      <div className="flex items-center gap-2">
        <Button variant={viewMode === "month" ? "default" : "outline"} onClick={() => setViewMode("month")}>Month View</Button>
        <Button variant={viewMode === "day" ? "default" : "outline"} onClick={() => { setViewMode("day"); setSelectedDay(new Date()) }}>Today / Day View</Button>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="text-center">
            <div className="text-lg font-semibold">{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" onClick={goToToday}>Hôm nay</Button>
        </div>
      </div>

      {viewMode === "month" && (
        <Card>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center text-sm font-medium text-muted-foreground p-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedDay(day.date)}
                  className={cn(
                    "min-h-[90px] p-2 border rounded cursor-pointer hover:bg-muted/50 transition-colors flex flex-col",
                    !day.isCurrentMonth && "bg-muted/20 text-muted-foreground"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className={cn("text-sm font-medium", isSameDay(day.date, new Date()) && "text-primary font-bold")}>
                      {day.date.getDate()}
                    </div>
                    {isSameDay(day.date, new Date()) && <Badge className="bg-primary text-white">Hôm nay</Badge>}
                  </div>
                  <div className="flex-1 space-y-1 overflow-hidden">
                    {day.bookings.slice(0, 2).map((b) => (
                      <div
                        key={b.id}
                        onClick={(e) => { e.stopPropagation(); setSelectedBooking(b) }}
                        className={cn("text-xs p-1 rounded text-white truncate cursor-pointer", STATUS_COLORS[b.status])}
                        title={`${b.customerName} — ${b.cameraName}`}
                      >
                        {b.customerName} ({b.cameraName})
                      </div>
                    ))}
                    {day.bookings.length > 2 && <div className="text-xs text-muted-foreground">+{day.bookings.length - 2} khác</div>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {viewMode === "day" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <CardTitle className="text-xl">{format(selectedDay || new Date(), "dd/MM/yyyy", { locale: vi })}</CardTitle>
                  <div className="text-sm text-muted-foreground">{MONTHS[(selectedDay || new Date()).getMonth()]} {(selectedDay || new Date()).getFullYear()}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  setSelectedDay((d) => {
                    const c = new Date(d || new Date())
                    c.setDate(c.getDate() - 1)
                    return c
                  })
                }}>Prev day</Button>
                <Button variant="outline" size="sm" onClick={() => {
                  setSelectedDay((d) => {
                    const c = new Date(d || new Date())
                    c.setDate(c.getDate() + 1)
                    return c
                  })
                }}>Next day</Button>
                <Button variant="outline" onClick={() => setSelectedDay(new Date())}>Today</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[80px_1fr] gap-4">
              <div className="space-y-1">
                {displayHours.map((h) => (
                  <div key={h} className="text-xs text-muted-foreground h-10 flex items-center justify-end pr-2">
                    {String(h).padStart(2, "0")}:00
                    {h === currentHour && isSameDay(selectedDay || new Date(), new Date()) && (
                      <span className="ml-1 text-primary font-bold">●</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="space-y-1 relative">
                {displayHours.map((h) => {
                  const events = getEventsForDay(selectedDay || new Date()).filter((ev) => ev.time && ev.time.getHours() === h)
                  return (
                    <div key={h} className="h-10 border-b border-muted/50 flex items-center gap-2 px-2">
                      <div className="flex gap-2 flex-wrap">
                        {events.map((ev) => (
                          <div
                            key={ev.id}
                            onClick={() => setSelectedBooking(ev.booking)}
                            className={cn("px-2 py-1 rounded text-white text-sm cursor-pointer shadow", ev.colorClass)}
                            title={`${ev.title} • ${ev.time ? format(ev.time, "HH:mm", { locale: vi }) : "All day"}`}
                          >
                            <div className="font-medium">{ev.booking.cameraName}</div>
                            <div className="text-xs opacity-90">
                              {ev.title} {ev.time ? `• ${format(ev.time, "HH:mm", { locale: vi })}` : ""}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
                <div className="absolute top-0 right-0 mr-4 mt-2">
                  {getEventsForDay(selectedDay || new Date()).filter(e => e.type === "reserved").map((ev) => (
                    <div key={ev.id} className={cn("px-3 py-1 rounded mb-2 text-white text-sm", ev.colorClass)}>
                      {ev.title}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Sự kiện trong ngày</h3>
              <div className="space-y-2">
                {getEventsForDay(selectedDay || new Date()).length === 0 && (
                  <div className="text-sm text-muted-foreground">Không có sự kiện hôm nay.</div>
                )}
                {getEventsForDay(selectedDay || new Date()).map((ev) => (
                  <div key={ev.id} className="p-3 border rounded flex justify-between items-center">
                    <div>
                      <div className="font-medium">{ev.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {ev.time ? format(ev.time, "HH:mm dd/MM/yyyy", { locale: vi }) : "Cả ngày"} • {ev.booking.cameraName}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-white", STATUS_COLORS[ev.booking.status])}>{ev.booking.status}</Badge>
                      <Button variant="outline" size="sm" onClick={() => setSelectedBooking(ev.booking)}>Chi tiết</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Chi tiết đặt thuê</DialogTitle>
            <DialogDescription>Thông tin chi tiết về đơn đặt thuê</DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge className={cn("text-white", STATUS_COLORS[selectedBooking.status])}>{selectedBooking.status}</Badge>
                <span className="text-sm text-muted-foreground">#{selectedBooking.id}</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{selectedBooking.customerName}</p>
                    <p className="text-sm text-muted-foreground">{selectedBooking.customerEmail || "Không có email"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{selectedBooking.customerPhone || "Không có số điện thoại"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{selectedBooking.cameraName} (ID: {selectedBooking.cameraId})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm">
                    <p>
                      {format(normalizeToDate(selectedBooking.startDate), "dd/MM/yyyy", { locale: vi })} -{" "}
                      {format(normalizeToDate(selectedBooking.endDate), "dd/MM/yyyy", { locale: vi })}
                    </p>
                    <p className="text-muted-foreground">{differenceInDays(normalizeToDate(selectedBooking.endDate), normalizeToDate(selectedBooking.startDate)) + 1} ngày</p>
                    {(selectedBooking.startTime || selectedBooking.endTime) && (
                      <p className="text-muted-foreground italic">
                        Giờ nhận: <span className="font-medium text-foreground">{selectedBooking.startTime || "--:--"}</span> -
                        Giờ trả: <span className="font-medium text-foreground">{selectedBooking.endTime || "--:--"}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="border-t pt-3 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Đơn giá:</span>
                    <span className="font-medium">{(selectedBooking.dailyRate ?? 0).toLocaleString("vi-VN")}đ / ngày</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Tổng tiền:</span>
                    <span className="font-bold text-lg">{(selectedBooking.totalAmount ?? 0).toLocaleString("vi-VN")}đ</span>
                  </div>
                </div>
                {selectedBooking.notes && (
                  <div className="border-t pt-3">
                    <p className="text-sm text-muted-foreground">Ghi chú:</p>
                    <p className="text-sm italic">{selectedBooking.notes}</p>
                  </div>
                )}
                {selectedBooking.__logs?.length ? (
                  <div className="border-t pt-3">
                    <h4 className="font-medium mb-2">Lịch sử trạng thái</h4>
                    <div className="space-y-2 text-sm">
                      {selectedBooking.__logs!.map((l) => {
                        const dateValue = new Date(l.timestamp)
                        const getStatusLabel = (status: string) => {
                          switch (status) {
                            case "pending": return "Chờ xác nhận"
                            case "confirmed": return "Đã xác nhận"
                            case "active": return "Đang thuê"
                            case "completed": return "Đã hoàn thành"
                            case "overtime": return "Quá hạn"
                            case "cancelled": return "Đã hủy"
                            default: return status
                          }
                        }
                        const getStatusColor = (status: string) => {
                          switch (status) {
                            case "pending": return "text-yellow-600"
                            case "confirmed": return "text-blue-600"
                            case "active": return "text-green-600"
                            case "completed": return "text-gray-600"
                            case "overtime": return "text-orange-600"
                            case "cancelled": return "text-red-600"
                            default: return "text-foreground"
                          }
                        }
                        return (
                          <div key={l.id ?? l.timestamp} className="flex justify-between items-center">
                            <div className={cn("capitalize font-medium", getStatusColor(l.status))}>
                              {getStatusLabel(l.status)}
                            </div>
                            <div className="text-muted-foreground">
                              {isNaN(dateValue.getTime())
                                ? "Không xác định"
                                : format(dateValue, "dd/MM/yyyy HH:mm", { locale: vi })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
