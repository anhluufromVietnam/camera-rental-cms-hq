// components/calendar-view.tsx
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
  Calendar as CalendarIcon,
  Clock,
  User,
  Camera,
  Phone,
  List,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format, differenceInDays, parseISO } from "date-fns"

type BookingStatus = "pending" | "confirmed" | "active" | "completed" | "cancelled"

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
  // optional raw logs object from RTDB -> we'll normalize to array
  statusChangeLogs?: Record<string, { status: BookingStatus; timestamp: string }>
  __logs?: StatusLog[] // normalized
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
  cancelled: "bg-red-500",
}

const EVENT_COLORS = {
  giao: "bg-indigo-600",
  nhan: "bg-emerald-600",
  reserved: "bg-yellow-500",
  maintenance: "bg-gray-500",
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
  const [selectedDayBookings, setSelectedDayBookings] = useState<Booking[] | null>(null)
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
        // normalize logs object to array
        const logsObj = (v && (v as any).statusChangeLogs) || null
        if (logsObj && typeof logsObj === "object") {
          b.__logs = Object.entries(logsObj).map(([lid, lv]: [string, any]) => ({
            id: lid,
            status: lv.status,
            timestamp: lv.timestamp,
          }))
          // sort by timestamp asc
          b.__logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        } else {
          b.__logs = []
        }
        return b
      })
      setBookings(list)
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem("bookings", JSON.stringify(bookings))
    } catch {
      // ignore
    }
  }, [bookings])

  // Calendar generation with inclusive date logic (fixes issues #1 & #2)
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    // start from Sunday of the first week
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - startDate.getDay())

    // end at Saturday of the last week
    const endDate = new Date(lastDay)
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()))

    const days: CalendarDay[] = []
    const iter = new Date(startDate)

    while (iter <= endDate) {
      const dayStart = new Date(iter)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(iter)
      dayEnd.setHours(23, 59, 59, 999)

      // find bookings overlapping this day (inclusive on both ends)
      const dayBookings = bookings.filter((b) => {
        if (!b.startDate || !b.endDate) return false
        // treat stored YYYY-MM-DD as local midnight
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

  // NAV
  const navigateMonth = (dir: "prev" | "next") => {
    setCurrentDate((d) => {
      const copy = new Date(d)
      copy.setMonth(copy.getMonth() + (dir === "prev" ? -1 : 1))
      return copy
    })
  }
  const goToToday = () => {
    setCurrentDate(new Date())
    setViewMode("day")
    setSelectedDay(new Date())
  }

  // Day events extraction (deliver / receive / reserved)
  type EventItem = {
    id: string
    booking: Booking
    type: "giao" | "nhan" | "reserved"
    time?: Date // for giao/nhan
    title: string
    colorClass: string
  }

  const getEventsForDay = (day: Date): EventItem[] => {
    const dayStart = normalizeToDate(day)
    const dayEnd = new Date(dayStart); dayEnd.setHours(23, 59, 59, 999)

    const events: EventItem[] = []

    bookings.forEach((b) => {
      const start = normalizeToDate(b.startDate)
      const end = normalizeToDate(b.endDate)
      // skip if no overlap
      if (start > dayEnd || end < dayStart) return

      const logs = b.__logs || []

      // find active (giao) and completed (nhan) logs
      const activeLog = logs.find((l) => l.status === "active")
      const completedLog = logs.find((l) => l.status === "completed")

      // if active log falls on this day -> giao event at that time
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
      } else {
        // no activeLog: if this day is booking start day -> default giao at 09:00
        if (isSameDay(start, day)) {
          const t = new Date(start)
          t.setHours(9, 0, 0, 0)
          events.push({
            id: `${b.id}-giao-default`,
            booking: b,
            type: "giao",
            time: t,
            title: `Giao (dự kiến): ${b.customerName}`,
            colorClass: EVENT_COLORS.giao,
          })
        }
      }

      // completed / nhan
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
      } else {
        // default receive on endDate at 18:00
        if (isSameDay(end, day)) {
          const t = new Date(end)
          t.setHours(18, 0, 0, 0)
          events.push({
            id: `${b.id}-nhan-default`,
            booking: b,
            type: "nhan",
            time: t,
            title: `Nhận (dự kiến): ${b.customerName}`,
            colorClass: EVENT_COLORS.nhan,
          })
        }
      }

      // if booking spans the day (in-use) — show reserved/all-day indicator only when there's no exact giao/nhan event or to indicate occupancy
      if ((start <= dayEnd && end >= dayStart) && !(isSameDay(start, day) || isSameDay(end, day))) {
        events.push({
          id: `${b.id}-reserved-${format(day, "yyyyMMdd")}`,
          booking: b,
          type: "reserved",
          title: `Đang thuê: ${b.customerName}`,
          colorClass: EVENT_COLORS.reserved,
        })
      }
    })

    // sort events: reserved (all-day) first, then by time
    events.sort((a, b) => {
      if (a.type === "reserved" && b.type !== "reserved") return -1
      if (b.type === "reserved" && a.type !== "reserved") return 1
      if (!a.time && b.time) return 1
      if (!b.time && a.time) return -1
      if (a.time && b.time) return a.time.getTime() - b.time.getTime()
      return 0
    })

    return events
  }

  // UI helpers
  const hours = Array.from({ length: 24 }).map((_, i) => i)

  // handle day click (open daily dialog)
  const openDay = (day: Date, dayBookings: Booking[]) => {
    setSelectedDay(day)
    setSelectedDayBookings(dayBookings)
    setViewMode("day")
  }

  // computed days for current month (from calendarDays)
  // month view: show calendarDays as before
  // day view: show timeline for selectedDay (default to currentDate)
  const activeDay = selectedDay || new Date()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Lịch & Dashboard</h2>
        <p className="text-muted-foreground">Month view + Daily timeline (0–24h). Click ngày để xem chi tiết giao/nhận.</p>
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
            {/* Weekday header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center text-sm font-medium text-muted-foreground p-1">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => (
                <div
                  key={idx}
                  onClick={() => openDay(day.date, day.bookings)}
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
                  <CardTitle className="text-xl">{format(activeDay, "dd/MM/yyyy")}</CardTitle>
                  <div className="text-sm text-muted-foreground">{MONTHS[activeDay.getMonth()]} {activeDay.getFullYear()}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => { setSelectedDay((d) => { if (!d) return new Date(); const c = new Date(d); c.setDate(c.getDate() - 1); return c }) }}>Prev day</Button>
                <Button variant="outline" size="sm" onClick={() => { setSelectedDay((d) => { if (!d) return new Date(); const c = new Date(d); c.setDate(c.getDate() + 1); return c }) }}>Next day</Button>
                <Button variant="outline" onClick={() => { setSelectedDay(new Date()) }}>Today</Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Two column: hours + events */}
            <div className="grid grid-cols-[80px_1fr] gap-4">
              {/* Hours column */}
              <div className="space-y-1">
                {hours.map((h) => (
                  <div key={h} className="text-xs text-muted-foreground h-10 flex items-center justify-end pr-2">
                    {String(h).padStart(2, "0")}:00
                  </div>
                ))}
              </div>

              {/* Events column */}
              <div className="space-y-1 relative">
                {hours.map((h) => {
                  const events = getEventsForDay(activeDay).filter((ev) => ev.time ? ev.time.getHours() === h : false)
                  return (
                    <div key={h} className="h-10 border-b border-muted/50 flex items-center gap-2 px-2">
                      {/* events for this hour */}
                      <div className="flex gap-2">
                        {events.map((ev) => (
                          <div
                            key={ev.id}
                            onClick={() => setSelectedBooking(ev.booking)}
                            className={cn("px-2 py-1 rounded text-white text-sm cursor-pointer shadow", ev.colorClass)}
                            title={`${ev.title} • ${ev.time ? format(ev.time, "HH:mm") : "All day"}`}
                          >
                            <div className="font-medium">{ev.booking.cameraName}</div>
                            <div className="text-xs opacity-90">
                              {ev.title} {ev.time ? `• ${format(ev.time, "HH:mm")}` : ""}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}

                {/* show all-day reserved events (those without time) at top */}
                <div className="absolute top-0 right-0 mr-4 mt-2">
                  {getEventsForDay(activeDay).filter(e => !e.time || e.type === "reserved").map((ev) => (
                    <div key={ev.id} className={cn("px-3 py-1 rounded mb-2 text-white text-sm", ev.colorClass)}>
                      {ev.title}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Below: list of events with more actions */}
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Sự kiện trong ngày</h3>
              <div className="space-y-2">
                {getEventsForDay(activeDay).length === 0 && <div className="text-sm text-muted-foreground">Không có sự kiện hôm nay.</div>}
                {getEventsForDay(activeDay).map((ev) => (
                  <div key={ev.id} className="p-3 border rounded flex justify-between items-center">
                    <div>
                      <div className="font-medium">{ev.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {ev.time ? format(ev.time, "HH:mm dd/MM/yyyy") : "All day"} • {ev.booking.cameraName}
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

      {/* Booking details dialog */}
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
                    <p className="text-sm text-muted-foreground">{selectedBooking.customerEmail}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{selectedBooking.customerPhone}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{selectedBooking.cameraName} (ID: {selectedBooking.cameraId})</span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm">
                    <p>
                      {format(normalizeToDate(selectedBooking.startDate), "dd/MM/yyyy")} - {format(normalizeToDate(selectedBooking.endDate), "dd/MM/yyyy")}
                    </p>
                    <p className="text-muted-foreground">{differenceInDays(normalizeToDate(selectedBooking.endDate), normalizeToDate(selectedBooking.startDate)) + 1} ngày</p>
                    {(selectedBooking.startTime || selectedBooking.endTime) && (
                      <p className="text-muted-foreground italic">
                        Giờ nhận:{" "}
                        <span className="font-medium text-foreground">
                          {selectedBooking.startTime || "--:--"}
                        </span>{" "}
                        - Giờ trả:{" "}
                        <span className="font-medium text-foreground">
                          {selectedBooking.endTime || "--:--"}
                        </span>
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

                {/* statusChangeLogs (if any) */}
                {selectedBooking.__logs?.length ? (
                  <div className="border-t pt-3">
                    <h4 className="font-medium mb-2">Lịch sử trạng thái</h4>
                    <div className="space-y-2 text-sm">
                      {selectedBooking.__logs!.map((l) => (
                        <div key={l.id ?? l.timestamp} className="flex justify-between">
                          <div>{l.status}</div>
                          <div className="text-muted-foreground">
                            {new Date(l.timestamp).toLocaleString("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      ))}
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
