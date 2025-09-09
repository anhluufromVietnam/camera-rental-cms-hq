"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  TrendingUp,
  DollarSign,
  Package,
  Users,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react"

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
    const savedBookings = localStorage.getItem("bookings")
    if (savedBookings) {
      setBookings(JSON.parse(savedBookings))
    } else {
      // Initialize with sample booking data
      const sampleBookings: Booking[] = [
        {
          id: "1",
          customerName: "Nguyễn Văn A",
          customerEmail: "nguyenvana@email.com",
          customerPhone: "0901234567",
          cameraId: "1",
          cameraName: "Canon EOS R5",
          startDate: "2024-01-15",
          endDate: "2024-01-18",
          totalDays: 3,
          dailyRate: 150000,
          totalAmount: 450000,
          status: "confirmed",
          createdAt: "2024-01-10T10:00:00Z",
          notes: "Thuê cho sự kiện cưới",
        },
        {
          id: "2",
          customerName: "Trần Thị B",
          customerEmail: "tranthib@email.com",
          customerPhone: "0907654321",
          cameraId: "2",
          cameraName: "Sony A7 IV",
          startDate: "2024-01-20",
          endDate: "2024-01-22",
          totalDays: 2,
          dailyRate: 120000,
          totalAmount: 240000,
          status: "pending",
          createdAt: "2024-01-12T14:30:00Z",
          notes: "Chụp ảnh sản phẩm",
        },
        {
          id: "3",
          customerName: "Lê Văn C",
          customerEmail: "levanc@email.com",
          customerPhone: "0912345678",
          cameraId: "1",
          cameraName: "Canon EOS R5",
          startDate: "2024-01-08",
          endDate: "2024-01-12",
          totalDays: 4,
          dailyRate: 150000,
          totalAmount: 600000,
          status: "completed",
          createdAt: "2024-01-05T09:15:00Z",
        },
      ]
      setBookings(sampleBookings)
      localStorage.setItem("bookings", JSON.stringify(sampleBookings))
    }
  }, [])

  // Save bookings to localStorage whenever bookings state changes
  useEffect(() => {
    localStorage.setItem("bookings", JSON.stringify(bookings))
  }, [bookings])

  // Calculate dashboard statistics
  const stats = {
    totalBookings: bookings.length,
    pendingBookings: bookings.filter((b) => b.status === "pending").length,
    activeBookings: bookings.filter((b) => b.status === "active").length,
    totalRevenue: bookings.filter((b) => b.status === "completed").reduce((sum, b) => sum + b.totalAmount, 0),
    monthlyRevenue: bookings
      .filter((b) => {
        const bookingDate = new Date(b.createdAt)
        const currentMonth = new Date().getMonth()
        return b.status === "completed" && bookingDate.getMonth() === currentMonth
      })
      .reduce((sum, b) => sum + b.totalAmount, 0),
  }

  // Filter bookings based on search and filters
  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      booking.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
            return bookingDate.getMonth() === now.getMonth() && bookingDate.getFullYear() === now.getFullYear()
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
      <Badge variant="secondary" className="flex items-center gap-1">
        {getStatusIcon(status)}
        {statusConfig?.label || status}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Dashboard đơn hàng</h2>
        <p className="text-muted-foreground">Tổng quan về các đơn đặt thuê máy ảnh</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng đơn hàng</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBookings}</div>
            <p className="text-xs text-muted-foreground">+2 từ tuần trước</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chờ xác nhận</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingBookings}</div>
            <p className="text-xs text-muted-foreground">Cần xử lý</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đang thuê</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeBookings}</div>
            <p className="text-xs text-muted-foreground">Đang hoạt động</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Doanh thu tháng</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.monthlyRevenue.toLocaleString("vi-VN")}đ</div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              +12% từ tháng trước
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm theo tên khách hàng, email hoặc máy ảnh..."
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
              <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-4">
                    <div>
                      <h4 className="font-semibold">{booking.customerName}</h4>
                      <p className="text-sm text-muted-foreground">{booking.customerEmail}</p>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">{booking.cameraName}</p>
                      <p className="text-muted-foreground">
                        {new Date(booking.startDate).toLocaleDateString("vi-VN")} -{" "}
                        {new Date(booking.endDate).toLocaleDateString("vi-VN")}
                      </p>
                    </div>
                  </div>

                  {booking.notes && <p className="text-sm text-muted-foreground italic">Ghi chú: {booking.notes}</p>}
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold">{booking.totalAmount.toLocaleString("vi-VN")}đ</p>
                    <p className="text-sm text-muted-foreground">{booking.totalDays} ngày</p>
                  </div>

                  {getStatusBadge(booking.status)}

                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {filteredBookings.length === 0 && (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Không tìm thấy đơn hàng</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== "all" || dateFilter !== "all"
                    ? "Không có đơn hàng nào phù hợp với bộ lọc hiện tại"
                    : "Chưa có đơn hàng nào trong hệ thống"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
