"use client"

import { useState, useEffect, useMemo } from "react"
import { ref, onValue } from "firebase/database"
import { db } from "@/firebase.config"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ChevronLeft, ChevronRight, Calendar, Clock, User, Camera, Phone, List } from "lucide-react"
import { cn } from "@/lib/utils"

interface Booking {
  id: string
  customerName: string
  customerEmail: string
  customerPhone: string
  cameraId: string
  cameraName: string
  startDate: string
  endDate: string
  totalDays: number
  dailyRate: number
  totalAmount: number
  status: "pending" | "confirmed" | "active" | "completed" | "cancelled"
  createdAt: string
  notes?: string
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

const STATUS_COLORS: Record<Booking["status"], string> = {
  pending: "bg-yellow-500",
  confirmed: "bg-blue-500",
  active: "bg-green-500",
  completed: "bg-gray-500",
  cancelled: "bg-red-500",
}

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [bookings, setBookings] = useState<Booking[]>([])
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [selectedDayBookings, setSelectedDayBookings] = useState<Booking[] | null>(null)

  // Load bookings từ Firebase realtime
  useEffect(() => {
    const bookingsRef = ref(db, "bookings")
    const unsubscribe = onValue(bookingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data: Record<string, Omit<Booking, "id">> = snapshot.val()
        const bookingList: Booking[] = Object.entries(data).map(([id, value]) => ({
          id,
          ...value,
        }))
        setBookings(bookingList)
      } else {
        setBookings([])
      }
    })

    return () => unsubscribe()
  }, [])

  // Lưu cache localStorage
  useEffect(() => {
    try {
      localStorage.setItem("bookings", JSON.stringify(bookings))
    } catch (err) {
      console.error("Lỗi lưu localStorage:", err)
    }
  }, [bookings])

  // Generate calendar days for the current month
  const calendarDays = useMemo((): CalendarDay[] => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - startDate.getDay())

    const endDate = new Date(lastDay)
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()))

    const days: CalendarDay[] = []
    const currentDateIter = new Date(startDate)

    while (currentDateIter <= endDate) {
      const dayBookings = bookings.filter((booking) => {
        const bookingStart = new Date(booking.startDate)
        const bookingEnd = new Date(booking.endDate)
        const currentDay = new Date(currentDateIter)
        return currentDay >= bookingStart && currentDay <= bookingEnd
      })

      days.push({
        date: new Date(currentDateIter),
        isCurrentMonth: currentDateIter.getMonth() === month,
        bookings: dayBookings,
      })

      currentDateIter.setDate(currentDateIter.getDate() + 1)
    }

    return days
  }, [bookings, currentDate])

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const getBookingStatusText = (status: Booking["status"]) => {
    switch (status) {
      case "pending":
        return "Chờ xác nhận"
      case "confirmed":
        return "Đã xác nhận"
      case "active":
        return "Đang thuê"
      case "completed":
        return "Hoàn thành"
      case "cancelled":
        return "Đã hủy"
      default:
        return status
    }
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Lịch đặt thuê</h2>
        <p className="text-muted-foreground">Xem lịch đặt thuê máy ảnh theo thời gian</p>
      </div>

      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="text-center">
                <CardTitle className="text-xl">
                  {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                </CardTitle>
              </div>

              <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button variant="outline" onClick={goToToday}>
              Hôm nay
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((day) => (
              <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                {day}
              </div>
            ))}

            {calendarDays.map((day, index) => (
              <div
                key={index}
                className={cn(
                  "min-h-[100px] p-1 border border-border cursor-pointer hover:bg-muted/50 transition-colors",
                  !day.isCurrentMonth && "bg-muted/20 text-muted-foreground",
                  isToday(day.date) && "bg-primary/10 border-primary",
                )}
                onClick={() => {
                  if (day.bookings.length === 1) {
                    setSelectedBooking(day.bookings[0])
                  } else if (day.bookings.length > 1) {
                    setSelectedDayBookings(day.bookings)
                  }
                }}
              >
                <div className="flex flex-col h-full">
                  <div className={cn("text-sm font-medium mb-1", isToday(day.date) && "text-primary font-bold")}>
                    {day.date.getDate()}
                    {isToday(day.date) && <Badge className="ml-2 bg-primary text-white">Hôm nay</Badge>}
                  </div>

                  <div className="flex-1 space-y-1">
                    {day.bookings.slice(0, 2).map((booking) => (
                      <div
                        key={booking.id}
                        className={cn(
                          "text-xs p-1 rounded text-white truncate cursor-pointer",
                          STATUS_COLORS[booking.status],
                        )}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedBooking(booking)
                        }}
                      >
                        {booking.customerName}
                      </div>
                    ))}

                    {day.bookings.length > 2 && (
                      <div className="text-xs text-muted-foreground">+{day.bookings.length - 2} khác</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Chú thích</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {Object.entries(STATUS_COLORS).map(([key, color]) => (
              <div key={key} className="flex items-center gap-2">
                <div className={cn("w-4 h-4 rounded", color)}></div>
                <span className="text-sm">{getBookingStatusText(key as Booking["status"])}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Booking Details Dialog */}
      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Chi tiết đặt thuê
            </DialogTitle>
            <DialogDescription>Thông tin chi tiết về đơn đặt thuê máy ảnh</DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge className={cn("text-white", STATUS_COLORS[selectedBooking.status])}>
                  {getBookingStatusText(selectedBooking.status)}
                </Badge>
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
                  <span className="text-sm font-medium">
                    {selectedBooking.cameraName} (ID: {selectedBooking.cameraId})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div className="text-sm">
                    <p>
                      {new Date(selectedBooking.startDate).toLocaleDateString("vi-VN")} -{" "}
                      {new Date(selectedBooking.endDate).toLocaleDateString("vi-VN")}
                    </p>
                    <p className="text-muted-foreground">{selectedBooking.totalDays} ngày</p>
                  </div>
                </div>

                <div className="border-t pt-3 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Đơn giá:</span>
                    <span className="font-medium">{selectedBooking.dailyRate.toLocaleString("vi-VN")}đ / ngày</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Tổng tiền:</span>
                    <span className="font-bold text-lg">
                      {selectedBooking.totalAmount.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                </div>

                {selectedBooking.notes && (
                  <div className="border-t pt-3">
                    <p className="text-sm text-muted-foreground">Ghi chú:</p>
                    <p className="text-sm italic">{selectedBooking.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Day bookings list dialog */}
      <Dialog open={!!selectedDayBookings} onOpenChange={() => setSelectedDayBookings(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <List className="h-5 w-5" />
              Danh sách đặt thuê trong ngày
            </DialogTitle>
          </DialogHeader>

          {selectedDayBookings && (
            <div className="space-y-3">
              {selectedDayBookings.map((b) => (
                <div
                  key={b.id}
                  className="p-2 border rounded cursor-pointer hover:bg-muted"
                  onClick={() => {
                    setSelectedBooking(b)
                    setSelectedDayBookings(null)
                  }}
                >
                  <div className="flex justify-between items-center">
                    <p className="font-medium">{b.customerName}</p>
                    <Badge className={cn("text-white", STATUS_COLORS[b.status])}>
                      {getBookingStatusText(b.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{b.cameraName}</p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
