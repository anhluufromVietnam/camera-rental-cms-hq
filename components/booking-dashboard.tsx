"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DollarSign,
  Package,
  Users,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Phone,
  Calendar,
} from "lucide-react"

import { db } from "@/firebase.config"
import { ref, onValue, off } from "firebase/database"

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

const BOOKING_STATUSES = [
  { value: "pending", label: "Chờ xác nhận", color: "bg-yellow-500" },
  { value: "confirmed", label: "Đã xác nhận", color: "bg-blue-500" },
  { value: "active", label: "Đang thuê", color: "bg-green-500" },
  { value: "completed", label: "Hoàn thành", color: "bg-gray-500" },
  { value: "cancelled", label: "Đã hủy", color: "bg-red-500" },
]

export function BookingDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("all")

  useEffect(() => {
    const bookingsRef = ref(db, "bookings")
    const listener = onValue(bookingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        const bookingList: Booking[] = Object.entries(data).map(([id, value]: [string, any]) => ({
          id,
          ...(value as Omit<Booking, "id">),
        }))
        setBookings(bookingList)
      } else {
        setBookings([])
      }
    })

    return () => {
      off(bookingsRef, "value", listener)
    }
  }, [])

  // Stats
  const stats = {
    totalBookings: bookings.length,
    pendingBookings: bookings.filter((b) => b.status === "pending").length,
    activeBookings: bookings.filter((b) => b.status === "active").length,
    totalRevenue: bookings
      .filter((b) => b.status === "completed")
      .reduce((sum, b) => sum + b.totalAmount, 0),
    monthlyRevenue: bookings
      .filter((b) => {
        const bookingDate = new Date(b.createdAt)
        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()
        return (
          b.status === "completed" &&
          bookingDate.getMonth() === currentMonth &&
          bookingDate.getFullYear() === currentYear
        )
      })
      .reduce((sum, b) => sum + b.totalAmount, 0),
  }

  // Filters
  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      booking.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.customerPhone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.cameraName.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || booking.status === statusFilter

    const matchesDate =
      dateFilter === "all" ||
      (() => {
        const bookingDate = new Date(booking.createdAt)
        const now = new Date()

        switch (dateFilter) {
          case "today":
            return bookingDate.toDateString() === now.toDateString()
          case "week":
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            return bookingDate >= weekAgo
          case "month":
            return (
              bookingDate.getMonth() === now.getMonth() &&
              bookingDate.getFullYear() === now.getFullYear()
            )
          default:
            return true
        }
      })()

    return matchesSearch && matchesStatus && matchesDate
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />
      case "confirmed":
        return <CheckCircle className="h-4 w-4" />
      case "active":
        return <Package className="h-4 w-4" />
      case "completed":
        return <CheckCircle className="h-4 w-4" />
      case "cancelled":
        return <XCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = BOOKING_STATUSES.find((s) => s.value === status)
    return (
      <Badge className={`${statusConfig?.color || "bg-gray-300"} flex items-center gap-1 text-white`}>
        {getStatusIcon(status)}
        {statusConfig?.label || status}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-foreground">Dashboard đơn hàng</h2>
        <p className="text-muted-foreground">Tổng quan về các đơn đặt thuê máy ảnh</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng đơn hàng</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBookings}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chờ xác nhận</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingBookings}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đang thuê</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeBookings}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Doanh thu tháng</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.monthlyRevenue.toLocaleString("vi-VN")}đ</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm theo khách hàng, email, sđt, máy ảnh..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Lọc theo trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              {BOOKING_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Lọc theo ngày" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="today">Hôm nay</SelectItem>
              <SelectItem value="week">Tuần này</SelectItem>
              <SelectItem value="month">Tháng này</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Booking List */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách đơn hàng</CardTitle>
          <CardDescription>
            Hiển thị {filteredBookings.length} trong tổng số {bookings.length} đơn hàng
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <div key={booking.id} className="p-4 border rounded-lg space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold">{booking.customerName}</h4>
                    <p className="text-sm text-muted-foreground">{booking.customerEmail}</p>
                    <p className="text-sm flex items-center gap-1">
                      <Phone className="h-4 w-4" /> {booking.customerPhone}
                    </p>
                  </div>
                  {getStatusBadge(booking.status)}
                </div>

                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p>
                      <span className="font-medium">Máy ảnh:</span> {booking.cameraName} ({booking.cameraId})
                    </p>
                    <p className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(booking.startDate).toLocaleDateString("vi-VN")} →{" "}
                      {new Date(booking.endDate).toLocaleDateString("vi-VN")}
                    </p>
                    <p>
                      <span className="font-medium">Số ngày:</span> {booking.totalDays}
                    </p>
                  </div>
                  <div>
                    <p>
                      <span className="font-medium">Giá thuê/ngày:</span>{" "}
                      {booking.dailyRate.toLocaleString("vi-VN")}đ
                    </p>
                    <p>
                      <span className="font-medium">Tổng tiền:</span>{" "}
                      {booking.totalAmount.toLocaleString("vi-VN")}đ
                    </p>
                    <p>
                      <span className="font-medium">Ngày tạo:</span>{" "}
                      {new Date(booking.createdAt).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                </div>

                {booking.notes && (
                  <p className="text-sm italic text-muted-foreground">Ghi chú: {booking.notes}</p>
                )}

                {/* <div className="flex justify-end">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-1" /> Chi tiết
                  </Button>
                </div> */}
              </div>
            ))}

            {filteredBookings.length === 0 && (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Không tìm thấy đơn hàng</h3>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
