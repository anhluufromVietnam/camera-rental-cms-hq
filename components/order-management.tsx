"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  User,
  Calendar,
  Phone,
  Mail,
  Camera,
  Edit,
  Trash2,
  RefreshCw,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

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
  adminNotes?: string
}

const STATUS_CONFIG = {
  pending: {
    label: "Chờ xác nhận",
    color: "bg-yellow-500",
    textColor: "text-yellow-700",
    bgColor: "bg-yellow-50",
    icon: Clock,
    nextStatus: "confirmed",
  },
  confirmed: {
    label: "Đã xác nhận",
    color: "bg-blue-500",
    textColor: "text-blue-700",
    bgColor: "bg-blue-50",
    icon: CheckCircle,
    nextStatus: "active",
  },
  active: {
    label: "Đang thuê",
    color: "bg-green-500",
    textColor: "text-green-700",
    bgColor: "bg-green-50",
    icon: Package,
    nextStatus: "completed",
  },
  completed: {
    label: "Hoàn thành",
    color: "bg-gray-500",
    textColor: "text-gray-700",
    bgColor: "bg-gray-50",
    icon: CheckCircle,
    nextStatus: null,
  },
  cancelled: {
    label: "Đã hủy",
    color: "bg-red-500",
    textColor: "text-red-700",
    bgColor: "bg-red-50",
    icon: XCircle,
    nextStatus: null,
  },
}

export function OrderManagement() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isStatusUpdateOpen, setIsStatusUpdateOpen] = useState(false)
  const [newStatus, setNewStatus] = useState<string>("")
  const [adminNotes, setAdminNotes] = useState("")
  const { toast } = useToast()

  useEffect(() => {
    loadBookings()
  }, [])

  useEffect(() => {
    filterBookings()
  }, [bookings, searchTerm, statusFilter])

  const loadBookings = () => {
    const savedBookings = localStorage.getItem("bookings")
    if (savedBookings) {
      const parsedBookings = JSON.parse(savedBookings)
      setBookings(parsedBookings)
    }
  }

  const filterBookings = () => {
    let filtered = bookings

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (booking) =>
          booking.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          booking.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
          booking.cameraName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          booking.id.includes(searchTerm),
      )
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((booking) => booking.status === statusFilter)
    }

    // Sort by creation date (newest first)
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    setFilteredBookings(filtered)
  }

  const updateBookingStatus = (bookingId: string, status: string, notes?: string) => {
    const updatedBookings = bookings.map((booking) => {
      if (booking.id === bookingId) {
        return {
          ...booking,
          status: status as any,
          adminNotes: notes || booking.adminNotes,
        }
      }
      return booking
    })

    setBookings(updatedBookings)
    localStorage.setItem("bookings", JSON.stringify(updatedBookings))

    // Update camera availability if status changes
    if (status === "cancelled" || status === "completed") {
      updateCameraAvailability(bookingId, 1) // Return camera to available pool
    } else if (status === "confirmed") {
      // Camera was already reserved when booking was created
    }

    toast({
      title: "Thành công",
      description: `Đã cập nhật trạng thái đơn hàng thành "${STATUS_CONFIG[status as keyof typeof STATUS_CONFIG].label}"`,
    })
  }

  const updateCameraAvailability = (bookingId: string, change: number) => {
    const booking = bookings.find((b) => b.id === bookingId)
    if (!booking) return

    const cameras = JSON.parse(localStorage.getItem("cameras") || "[]")
    const updatedCameras = cameras.map((camera: any) => {
      if (camera.id === booking.cameraId) {
        return {
          ...camera,
          available: Math.min(camera.quantity, camera.available + change),
        }
      }
      return camera
    })

    localStorage.setItem("cameras", JSON.stringify(updatedCameras))
  }

  const handleStatusUpdate = () => {
    if (!selectedBooking || !newStatus) return

    updateBookingStatus(selectedBooking.id, newStatus, adminNotes)
    setIsStatusUpdateOpen(false)
    setSelectedBooking(null)
    setNewStatus("")
    setAdminNotes("")
  }

  const handleQuickStatusUpdate = (booking: Booking, status: string) => {
    updateBookingStatus(booking.id, status)
  }

  const deleteBooking = (bookingId: string) => {
    const updatedBookings = bookings.filter((booking) => booking.id !== bookingId)
    setBookings(updatedBookings)
    localStorage.setItem("bookings", JSON.stringify(updatedBookings))

    // Return camera to available pool
    updateCameraAvailability(bookingId, 1)

    toast({
      title: "Thành công",
      description: "Đã xóa đơn hàng",
    })
  }

  const getStatusStats = () => {
    return {
      total: bookings.length,
      pending: bookings.filter((b) => b.status === "pending").length,
      confirmed: bookings.filter((b) => b.status === "confirmed").length,
      active: bookings.filter((b) => b.status === "active").length,
      completed: bookings.filter((b) => b.status === "completed").length,
      cancelled: bookings.filter((b) => b.status === "cancelled").length,
    }
  }

  const stats = getStatusStats()

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]
    const Icon = config.icon

    return (
      <Badge variant="secondary" className={cn("flex items-center gap-1", config.textColor)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    )
  }

  const canUpdateStatus = (booking: Booking) => {
    const config = STATUS_CONFIG[booking.status]
    return config.nextStatus !== null
  }

  const getNextStatusLabel = (booking: Booking) => {
    const config = STATUS_CONFIG[booking.status]
    if (!config.nextStatus) return null
    return STATUS_CONFIG[config.nextStatus as keyof typeof STATUS_CONFIG].label
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Quản lý đơn hàng</h2>
          <p className="text-muted-foreground">Xác nhận và quản lý tình trạng đơn hàng</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadBookings}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Tổng đơn hàng</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Chờ xác nhận</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{stats.confirmed}</div>
            <p className="text-xs text-muted-foreground">Đã xác nhận</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Đang thuê</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-gray-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Hoàn thành</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
            <p className="text-xs text-muted-foreground">Đã hủy</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm theo tên khách hàng, email, máy ảnh hoặc mã đơn..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Lọc theo trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="pending">Chờ xác nhận</SelectItem>
            <SelectItem value="confirmed">Đã xác nhận</SelectItem>
            <SelectItem value="active">Đang thuê</SelectItem>
            <SelectItem value="completed">Hoàn thành</SelectItem>
            <SelectItem value="cancelled">Đã hủy</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders List */}
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
              <div
                key={booking.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <h4 className="font-semibold">{booking.customerName}</h4>
                        <p className="text-sm text-muted-foreground">#{booking.id}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Camera className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{booking.cameraName}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(booking.startDate).toLocaleDateString("vi-VN")} -{" "}
                          {new Date(booking.endDate).toLocaleDateString("vi-VN")}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold">{booking.totalAmount.toLocaleString("vi-VN")}đ</p>
                      <p className="text-sm text-muted-foreground">{booking.totalDays} ngày</p>
                    </div>
                  </div>

                  {booking.notes && <p className="text-sm text-muted-foreground italic">Ghi chú: {booking.notes}</p>}

                  {booking.adminNotes && <p className="text-sm text-blue-600 italic">Admin: {booking.adminNotes}</p>}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {getStatusBadge(booking.status)}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedBooking(booking)
                      setIsDetailsOpen(true)
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>

                  {canUpdateStatus(booking) && (
                    <Button
                      size="sm"
                      onClick={() => handleQuickStatusUpdate(booking, STATUS_CONFIG[booking.status].nextStatus!)}
                      className="text-xs"
                    >
                      {getNextStatusLabel(booking)}
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedBooking(booking)
                      setNewStatus(booking.status)
                      setAdminNotes(booking.adminNotes || "")
                      setIsStatusUpdateOpen(true)
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>

                  {booking.status === "pending" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteBooking(booking.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {filteredBookings.length === 0 && (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Không tìm thấy đơn hàng</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== "all"
                    ? "Không có đơn hàng nào phù hợp với bộ lọc hiện tại"
                    : "Chưa có đơn hàng nào trong hệ thống"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Chi tiết đơn hàng #{selectedBooking?.id}
            </DialogTitle>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                {getStatusBadge(selectedBooking.status)}
                <span className="text-sm text-muted-foreground">
                  Tạo lúc: {new Date(selectedBooking.createdAt).toLocaleString("vi-VN")}
                </span>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Thông tin khách hàng</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedBooking.customerName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedBooking.customerEmail}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedBooking.customerPhone}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Thông tin thuê</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Camera className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedBooking.cameraName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {new Date(selectedBooking.startDate).toLocaleDateString("vi-VN")} -{" "}
                          {new Date(selectedBooking.endDate).toLocaleDateString("vi-VN")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedBooking.totalDays} ngày</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {selectedBooking.notes && (
                <div>
                  <h4 className="font-semibold mb-2">Ghi chú của khách hàng</h4>
                  <p className="text-sm text-muted-foreground italic bg-muted/50 p-3 rounded">
                    {selectedBooking.notes}
                  </p>
                </div>
              )}

              {selectedBooking.adminNotes && (
                <div>
                  <h4 className="font-semibold mb-2">Ghi chú của admin</h4>
                  <p className="text-sm text-blue-600 italic bg-blue-50 p-3 rounded">{selectedBooking.adminNotes}</p>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Tổng tiền:</span>
                  <span className="text-primary">{selectedBooking.totalAmount.toLocaleString("vi-VN")}đ</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog open={isStatusUpdateOpen} onOpenChange={setIsStatusUpdateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cập nhật trạng thái đơn hàng</DialogTitle>
            <DialogDescription>
              Thay đổi trạng thái và thêm ghi chú cho đơn hàng #{selectedBooking?.id}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Trạng thái mới</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Chờ xác nhận</SelectItem>
                  <SelectItem value="confirmed">Đã xác nhận</SelectItem>
                  <SelectItem value="active">Đang thuê</SelectItem>
                  <SelectItem value="completed">Hoàn thành</SelectItem>
                  <SelectItem value="cancelled">Đã hủy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ghi chú admin (tùy chọn)</Label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Thêm ghi chú về việc cập nhật trạng thái..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusUpdateOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleStatusUpdate} disabled={!newStatus}>
              Cập nhật
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
