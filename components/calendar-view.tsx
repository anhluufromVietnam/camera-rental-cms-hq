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

      {/* ==== MONTH VIEW ==== */}
      {viewMode === "month" && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map(d => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
              ))}
            </div>

            {/* chia calendarDays thành tuần (mỗi tuần 7 ngày) */}
            <div className="space-y-2">
              {Array.from({ length: Math.ceil(calendarDays.length / 7) }).map((_, weekIdx) => {
                const weekDays = calendarDays.slice(weekIdx * 7, weekIdx * 7 + 7)
                const weekStartDate = normalizeToDate(weekDays[0].date)
                const weekEndDate = new Date(normalizeToDate(weekDays[6].date))
                weekEndDate.setHours(23, 59, 59, 999)

                // Lấy tất cả booking có overlap với tuần này
                const bookingsInWeek = bookings
                  .map(b => {
                    const start = normalizeToDate(b.startDate)
                    const end = normalizeToDate(b.endDate)
                    return { booking: b, start, end }
                  })
                  .filter(x => !(x.start > weekEndDate || x.end < weekStartDate))
                  // sắp theo start date tăng dần (ưu tiên gần nhất)
                  .sort((a, b) => a.start.getTime() - b.start.getTime())

                // chuyển booking sang chỉ số trong tuần: startIdx (0..6), endIdx (0..6)
                const ranged = bookingsInWeek.map(x => {
                  const visibleStart = x.start < weekStartDate ? weekStartDate : x.start
                  const visibleEnd = x.end > weekEndDate ? weekEndDate : x.end
                  const startIdx = Math.max(0, Math.floor((visibleStart.getTime() - weekStartDate.getTime()) / (1000 * 60 * 60 * 24)))
                  const endIdx = Math.min(6, Math.floor((visibleEnd.getTime() - weekStartDate.getTime()) / (1000 * 60 * 60 * 24)))
                  return { ...x, visibleStart, visibleEnd, startIdx, endIdx }
                })

                // packing non-overlapping into rows (max 3 rows)
                const rows: Array<typeof ranged> = []
                const overflow: typeof ranged = []
                for (const item of ranged) {
                  let placed = false
                  for (let r = 0; r < 3; r++) {
                    if (!rows[r]) rows[r] = []
                    // check no overlap with existing items in this row
                    const conflict = rows[r].some(existing => !(item.endIdx < existing.startIdx || item.startIdx > existing.endIdx))
                    if (!conflict) {
                      rows[r].push(item)
                      placed = true
                      break
                    }
                  }
                  if (!placed) overflow.push(item)
                }

                // compute hidden counts per day (for showing +X in that day's cell)
                const hiddenCountByDay: number[] = new Array(7).fill(0)
                if (overflow.length > 0) {
                  // for each overflow booking, increment on the day where it starts (relative)
                  for (const h of overflow) {
                    const dayIdx = h.startIdx // day within week where its visible portion begins
                    if (dayIdx >= 0 && dayIdx <= 6) hiddenCountByDay[dayIdx]++
                  }
                }

                return (
                  <div key={weekIdx} className="relative border rounded-md overflow-hidden bg-background">
                    {/* grid 7 ngày */}
                    <div className="grid grid-cols-7 gap-px bg-muted/10">
                      {weekDays.map((day, i) => (
                        <div
                          key={i}
                          onClick={() => openDay(day.date, day.bookings)}
                          className={cn(
                            "min-h-20 p-2 bg-white cursor-pointer hover:bg-muted/50 transition relative",
                            !day.isCurrentMonth && "bg-muted/20 text-muted-foreground"
                          )}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className={cn("text-sm font-medium", isSameDay(day.date, new Date()) && "text-primary font-bold")}>
                              {day.date.getDate()}
                            </span>
                            {isSameDay(day.date, new Date()) && <Badge className="h-5 text-xs">Hôm nay</Badge>}
                          </div>

                          {/* Các booking tĩnh hiển thị top (chỉ những booking bắt đầu trong ô này và được packed vào hàng) */}
                          <div className="space-y-1 text-xs">
                            {/* hiển thị bookings mà startIdx === i và nằm trong rows (tối đa 3 hàng) */}
                            {rows.map((row, ridx) => {
                              const item = row.find(it => it.startIdx === i)
                              if (!item) return null
                              // Only show if this item was placed in a visible row (rows array length <=3)
                              return (
                                <div
                                  key={item.booking.id + "-r" + ridx}
                                  onClick={e => { e.stopPropagation(); setSelectedBooking(item.booking) }}
                                  className={cn("p-1 rounded text-white truncate cursor-pointer shadow-sm", STATUS_COLORS[item.booking.status])}
                                  title={`${item.booking.customerName} • ${item.booking.cameraName} (${format(item.visibleStart, "dd/MM")} → ${format(item.visibleEnd, "dd/MM")})`}
                                >
                                  {item.booking.customerName}
                                </div>
                              )
                            })}

                            {/* nếu có booking bắt đầu ở ô này mà không được hiển thị (overflow) */}
                            {hiddenCountByDay[i] > 0 && (
                              <div className="text-muted-foreground text-xs">+{hiddenCountByDay[i]} đơn khác</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Render thanh booking ngang (overlay) theo rows để kéo dài qua ô */}
                    <div className="absolute inset-0 z-10">
                      {rows.map((row, ridx) =>
                        row.map(item => {
                          const leftPct = (item.startIdx / 7) * 100
                          // width measured in columns spanned (endIdx - startIdx + 1)
                          const spanCols = item.endIdx - item.startIdx + 1
                          const widthPct = (spanCols / 7) * 100
                          const topPx = 24 + ridx * 20 // offset trong ô để không che ngày
                          return (
                            <div
                              key={item.booking.id + "-bar-" + ridx}
                              style={{
                                left: `${leftPct}%`,
                                width: `${widthPct}%`,
                                top: `${topPx}px`,
                              }}
                              className={cn("absolute h-5 px-2 rounded text-[11px] text-white flex items-center overflow-hidden pointer-events-auto shadow", STATUS_COLORS[item.booking.status])}
                              onClick={() => setSelectedBooking(item.booking)}
                              title={`${item.booking.customerName} — ${item.booking.cameraName}`}
                            >
                              <span className="truncate">{item.booking.customerName}</span>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}


      {/* ==== DAY VIEW ==== */}
      {viewMode === "day" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{format(activeDay, "EEEE, dd/MM/yyyy", { locale: vi })}</CardTitle>
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
            {/* Timeline ngang */}
            <div className="overflow-x-auto">
              <div className="min-w-[800px] relative border rounded-lg p-4 bg-muted/10">
                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                  {["8h", "10h", "12h", "14h", "16h", "18h"].map(h => (
                    <div key={h} className="w-[calc(100%/6)] text-center">{h}</div>
                  ))}
                </div>

                <div className="relative h-[220px]">
                  {/* Background grid */}
                  <div className="absolute inset-0 flex">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="flex-1 border-l border-muted/30 last:border-r"></div>
                    ))}
                  </div>

                  {/* Các booking trong ngày */}
                  <div className="absolute inset-0 space-y-2 p-1">
                    {getEventsForDay(activeDay).map((ev, idx) => {
                      // chuyển đổi time sang phần trăm vị trí ngang
                      const startHour = ev.booking.startTime ? parseInt(ev.booking.startTime.split(":")[0]) : 8
                      const endHour = ev.booking.endTime ? parseInt(ev.booking.endTime.split(":")[0]) : 18
                      const startPct = ((startHour - 8) / 10) * 100
                      const endPct = ((endHour - 8) / 10) * 100
                      const widthPct = Math.max(endPct - startPct, 8)

                      return (
                        <div
                          key={ev.id + idx}
                          onClick={() => setSelectedBooking(ev.booking)}
                          className={cn(
                            "absolute top-0 text-xs text-white rounded shadow-md px-2 py-1 cursor-pointer",
                            STATUS_COLORS[ev.booking.status as BookingStatus]
                          )}
                          style={{
                            top: `${idx * 36}px`,
                            left: `${startPct}%`,
                            width: `${widthPct}%`,
                            minWidth: "6%",
                          }}
                          title={ev.title}
                        >
                          {ev.booking.customerName} ({ev.booking.cameraName})
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Danh sách sự kiện */}
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
                  <Calendar className="h-4 w-4 text-muted-foreground" />
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