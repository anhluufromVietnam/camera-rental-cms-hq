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
  timestamp: string
}

interface Booking {
  id: string
  customerName: string
  customerEmail?: string
  customerPhone?: string
  cameraId: string
  cameraName: string
  startDate: string
  endDate: string
  startTime?: string
  endTime?: string
  totalDays?: number
  dailyRate?: number
  totalAmount?: number
  status: BookingStatus
  createdAt?: string
  notes?: string
  statusChangeLogs?: Record<string, any>
  __logs?: StatusLog[]
}

interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  bookings: Booking[]
}

const MONTHS = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"]
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
  reserved: "bg-yellow-600",
}

const normalizeToDate = (d: string | Date) => {
  const date = typeof d === "string" ? new Date(d) : new Date(d)
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

  // Load bookings
  useEffect(() => {
    const bookingsRef = ref(db, "bookings")
    const unsub = onValue(bookingsRef, (snap) => {
      if (!snap.exists()) {
        setBookings([])
        return
      }
      const data = snap.val()
      const list: Booking[] = Object.entries(data).map(([id, v]: [string, any]) => {
        const b: Booking = { id, ...v }
        const logsObj = v.statusChangeLogs
        if (logsObj && typeof logsObj === "object") {
          b.__logs = Object.entries(logsObj).map(([lid, lv]: [string, any]) => {
            let ts = lv.changedAt || lv.timestamp || lv
            let dateVal: Date
            if (!ts) dateVal = new Date(0)
            else if (typeof ts === "object" && "seconds" in ts) dateVal = new Date(ts.seconds * 1000)
            else if (typeof ts === "number") dateVal = new Date(ts < 1e12 ? ts * 1000 : ts)
            else if (typeof ts === "string") {
              const parsed = parseISO(ts)
              dateVal = isNaN(parsed.getTime()) ? new Date(0) : parsed
            } else dateVal = new Date(0)
            return {
              id: lid,
              status: lv.newStatus || lv.status || "unknown",
              timestamp: dateVal.toISOString(),
            }
          }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        } else {
          b.__logs = [];
        }


        return b
      })
      setBookings(list)
      try { localStorage.setItem("bookings", JSON.stringify(list)) } catch { }
    }, (error) => {
      console.error("Firebase error:", error)
      try {
        const saved = localStorage.getItem("bookings")
        if (saved) setBookings(JSON.parse(saved))
      } catch { }
    })
    return () => unsub()
  }, [])

  // Calendar generation
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    const endDate = new Date(lastDay)
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()))

    const days: CalendarDay[] = []
    const iter = new Date(startDate)

    while (iter <= endDate) {
      const dayStart = normalizeToDate(iter)
      const dayEnd = new Date(iter)
      dayEnd.setHours(23, 59, 59, 999)

      const dayBookings = bookings.filter(b => {
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
    setCurrentDate(d => {
      const copy = new Date(d)
      copy.setMonth(copy.getMonth() + (dir === "prev" ? -1 : 1))
      return copy
    })
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDay(today)
    setViewMode("day")
  }

  const openDay = (date: Date, dayBookings: Booking[]) => {
    setSelectedDay(date)
    setViewMode("day")
  }

  // Events for a day
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

    bookings.forEach(b => {
      const start = normalizeToDate(b.startDate)
      const end = normalizeToDate(b.endDate)
      if (start > dayEnd || end < dayStart) return

      const logs = b.__logs || []
      const activeLog = logs.find(l => l.status === "active")
      const completedLog = logs.find(l => l.status === "completed")

      // Giao
      if (activeLog && isSameDay(new Date(activeLog.timestamp), day)) {
        events.push({
          id: `${b.id}-giao`,
          booking: b,
          type: "giao",
          time: new Date(activeLog.timestamp),
          title: `Giao: ${b.customerName}`,
          colorClass: EVENT_COLORS.giao,
        })
      } else if (isSameDay(start, day)) {
        const t = new Date(start)
        t.setHours(b.startTime ? parseInt(b.startTime.split(":")[0]) : 9, 0)
        events.push({
          id: `${b.id}-giao-default`,
          booking: b,
          type: "giao",
          time: t,
          title: `Giao (dự kiến): ${b.customerName}`,
          colorClass: EVENT_COLORS.giao,
        })
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
        })
      } else if (isSameDay(end, day)) {
        const t = new Date(end)
        t.setHours(b.endTime ? parseInt(b.endTime.split(":")[0]) : 18, 0)
        events.push({
          id: `${b.id}-nhan-default`,
          booking: b,
          type: "nhan",
          time: t,
          title: `Nhận (dự kiến): ${b.customerName}`,
          colorClass: EVENT_COLORS.nhan,
        })
      }

      // Reserved
      if (start <= dayEnd && end >= dayStart && !isSameDay(start, day) && !isSameDay(end, day)) {
        events.push({
          id: `${b.id}-reserved`,
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
      if (!a.time && b.time) return 1
      if (!b.time && a.time) return -1
      return (a.time?.getTime() || 0) - (b.time?.getTime() || 0)
    })

    return events
  }

  // Display hours for Day View (±2 giờ hiện tại)
  const now = new Date()
  const currentHour = now.getHours()
  const displayHours = useMemo(() => {
    const hours: number[] = []
    for (let i = -2; i <= 2; i++) {
      const h = currentHour + i
      if (h >= 0 && h <= 23) hours.push(h)
    }
    return hours.length > 0 ? hours : [currentHour]
  }, [currentHour])

  const activeDay = selectedDay || new Date()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Lịch thuê máy</h2>
        <p className="text-muted-foreground">Xem lịch theo tháng hoặc chi tiết theo ngày</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant={viewMode === "month" ? "default" : "outline"} onClick={() => setViewMode("month")}>
          Tháng
        </Button>
        <Button variant={viewMode === "day" ? "default" : "outline"} onClick={() => { setViewMode("day"); setSelectedDay(new Date()) }}>
          Ngày
        </Button>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => navigateMonth("prev")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="px-3 text-center">
            <div className="font-semibold">{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</div>
          </div>
          <Button variant="outline" size="icon" onClick={() => navigateMonth("next")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToToday}>Hôm nay</Button>
        </div>
      </div>

      {/* Month View */}
      {viewMode === "month" && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map(d => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => (
                <div
                  key={i}
                  onClick={() => openDay(day.date, day.bookings)}
                  className={cn(
                    "min-h-20 p-2 border rounded cursor-pointer hover:bg-muted/50 transition flex flex-col",
                    !day.isCurrentMonth && "bg-muted/20 text-muted-foreground"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn("text-sm font-medium", isSameDay(day.date, new Date()) && "text-primary font-bold")}>
                      {day.date.getDate()}
                    </span>
                    {isSameDay(day.date, new Date()) && <Badge className="h-5 text-xs">Hôm nay</Badge>}
                  </div>
                  <div className="space-y-1 text-xs">
                    {day.bookings.slice(0, 2).map(b => (
                      <div
                        key={b.id}
                        onClick={e => { e.stopPropagation(); setSelectedBooking(b) }}
                        className={cn("p-1 rounded text-white truncate cursor-pointer", STATUS_COLORS[b.status])}
                        title={`${b.customerName} - ${b.cameraName}`}
                      >
                        {b.customerName}
                      </div>
                    ))}
                    {day.bookings.length > 2 && <div className="text-muted-foreground">+{day.bookings.length - 2}</div>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Day View */}
      {viewMode === "day" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{format(activeDay, "EEEE, dd/MM/yyyy", { locale: vi })}</CardTitle>
              </div>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => setSelectedDay(d => {
                  const prev = new Date(d || new Date())
                  prev.setDate(prev.getDate() - 1)
                  return prev
                })}>Prev</Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedDay(d => {
                  const next = new Date(d || new Date())
                  next.setDate(next.getDate() + 1)
                  return next
                })}>Next</Button>
                <Button variant="outline" onClick={() => setSelectedDay(new Date())}>Hôm nay</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[60px_1fr] gap-4">
              <div className="space-y-1">
                {displayHours.map(h => (
                  <div key={h} className="h-12 flex items-center justify-end pr-2 text-xs text-muted-foreground">
                    {String(h).padStart(2, "0")}:00
                    {h === currentHour && <span className="ml-1 text-primary">●</span>}
                  </div>
                ))}
              </div>
              <div className="space-y-1 relative">
                {displayHours.map(h => {
                  const hourEvents = getEventsForDay(activeDay).filter(e => e.time?.getHours() === h)
                  return (
                    <div key={h} className="h-12 border-b border-muted/20 flex items-center gap-2 px-2">
                      {hourEvents.map(ev => (
                        <div
                          key={ev.id}
                          onClick={() => setSelectedBooking(ev.booking)}
                          className={cn("px-2 py-1 rounded text-white text-xs cursor-pointer shadow-sm", ev.colorClass)}
                          title={ev.title}
                        >
                          {ev.booking.cameraName} • {format(ev.time!, "HH:mm")}
                        </div>
                      ))}
                    </div>
                  )
                })}
                {/* Reserved events */}
                <div className="absolute top-2 right-2 space-y-1">
                  {getEventsForDay(activeDay).filter(e => e.type === "reserved").map(ev => (
                    <div key={ev.id} className={cn("px-2 py-1 rounded text-white text-xs", ev.colorClass)}>
                      {ev.title}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="font-semibold mb-3">Sự kiện trong ngày</h3>
              {getEventsForDay(activeDay).length === 0 ? (
                <p className="text-sm text-muted-foreground">Không có sự kiện.</p>
              ) : (
                <div className="space-y-2">
                  {getEventsForDay(activeDay).map(ev => (
                    <div key={ev.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">{ev.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {ev.time ? format(ev.time, "HH:mm") : "Cả ngày"} • {ev.booking.cameraName}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setSelectedBooking(ev.booking)}>
                        Chi tiết
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Booking Detail Dialog */}
      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Chi tiết đơn thuê</DialogTitle>
            <DialogDescription>Thông tin đầy đủ về đơn đặt</DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <Badge className={cn("text-white", STATUS_COLORS[selectedBooking.status])}>
                  {selectedBooking.status === "pending" ? "Chờ xác nhận" :
                    selectedBooking.status === "confirmed" ? "Đã xác nhận" :
                      selectedBooking.status === "active" ? "Đang thuê" :
                        selectedBooking.status === "completed" ? "Hoàn thành" :
                          selectedBooking.status === "overtime" ? "Quá hạn" :
                            selectedBooking.status === "cancelled" ? "Đã hủy" : selectedBooking.status}
                </Badge>
                <span className="text-muted-foreground">#{selectedBooking.id.slice(0, 8)}</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{selectedBooking.customerName}</p>
                    {selectedBooking.customerEmail && <p className="text-muted-foreground">{selectedBooking.customerEmail}</p>}
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
                    <p>{format(normalizeToDate(selectedBooking.startDate), "dd/MM/yyyy")} → {format(normalizeToDate(selectedBooking.endDate), "dd/MM/yyyy")}</p>
                    <p className="text-muted-foreground">{differenceInDays(normalizeToDate(selectedBooking.endDate), normalizeToDate(selectedBooking.startDate)) + 1} ngày</p>
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
                      {selectedBooking.__logs.map(log => {
                        const date = new Date(log.timestamp)
                        return (
                          <div key={log.id || log.timestamp} className="flex justify-between">
                            <span className={cn(
                              "font-medium",
                              log.status === "pending" && "text-yellow-600",
                              log.status === "confirmed" && "text-blue-600",
                              log.status === "active" && "text-green-600",
                              log.status === "completed" && "text-gray-600",
                              log.status === "overtime" && "text-orange-600",
                              log.status === "cancelled" && "text-red-600"
                            )}>
                              {log.status === "pending" ? "Chờ" :
                                log.status === "confirmed" ? "Xác nhận" :
                                  log.status === "active" ? "Đang thuê" :
                                    log.status === "completed" ? "Hoàn thành" :
                                      log.status === "overtime" ? "Quá hạn" :
                                        log.status === "cancelled" ? "Hủy" : log.status}
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
  )
}