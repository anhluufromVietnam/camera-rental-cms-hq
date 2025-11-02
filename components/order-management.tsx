"use client"

import { useState, useEffect, useMemo } from "react"
import { ref, onValue, update, push, remove, get } from "firebase/database"
import { db } from "@/firebase.config"
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
  startTime?: string | null
  endTime?: string | null
  totalDays: number
  dailyRate: number
  totalAmount: number
  status: "pending" | "confirmed" | "active" | "completed" | "overtime" | "cancelled"
  createdAt: string
  notes?: string
  adminNotes?: string | null
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
  overtime: {
    label: "Quá hạn",
    color: "bg-orange-500",
    textColor: "text-orange-700",
    bgColor: "bg-orange-50",
    icon: Clock,
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
} as const

export function OrderManagement() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isStatusUpdateOpen, setIsStatusUpdateOpen] = useState(false)
  const [newStatus, setNewStatus] = useState<string>("")
  const [adminNotes, setAdminNotes] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(true)

  const { toast } = useToast()

  // --- realtime load bookings ---
  useEffect(() => {
    const bookingsRef = ref(db, "bookings")
    const unsub = onValue(
      bookingsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data: Record<string, Omit<Booking, "id">> = snapshot.val()
          const list: Booking[] = Object.entries(data).map(([id, v]) => ({ id, ...(v as any) }))
          setBookings(list)
        } else {
          setBookings([])
        }
        setLoading(false)
      },
      (err) => {
        console.error("Realtime booking listener error:", err)
        setLoading(false)
        toast({
          title: "Lỗi kết nối",
          description: "Không thể tải danh sách đơn hàng",
          variant: "destructive",
        })
      },
    )

    return () => {
      // onValue returns an unsubscribe function
      try {
        unsub()
      } catch (e) {
        // fallback: nothing
      }
    }
  }, [toast])

  // --- memoized filteredBookings (no duplicated state) ---
  const filteredBookings = useMemo(() => {
    let filtered = [...bookings]

    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (b) =>
          b.customerName.toLowerCase().includes(q) ||
          b.customerEmail.toLowerCase().includes(q) ||
          b.customerPhone.toLowerCase().includes(q) ||
          b.cameraName.toLowerCase().includes(q) ||
          b.id.includes(searchTerm),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((b) => b.status === statusFilter)
    }

    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return filtered
  }, [bookings, searchTerm, statusFilter])

  // --- helper: update camera available in RTDB ---
  const updateCameraAvailability = async (cameraId: string, change: number) => {
    if (!cameraId) return
    try {
      const cameraRef = ref(db, `cameras/${cameraId}`)
      const snap = await get(cameraRef)
      if (!snap.exists()) return
      const cam: any = snap.val()
      const quantity = Number(cam.quantity || 0)
      const available = Number(cam.available || 0)
      const newAvailable = Math.max(0, Math.min(quantity, available + change))
      await update(cameraRef, { available: newAvailable })
    } catch (err) {
      console.error("updateCameraAvailability error:", err)
    }
  }

  // --- update booking status in RTDB (and recalc camera availability) ---
  const updateBookingStatus = async (
    bookingId: string,
    status: Booking["status"],
    notes?: string | null
  ) => {
    try {
      // lấy đơn gốc từ local state
      const orig = bookings.find((b) => b.id === bookingId)
      if (!orig) return

      const bookingRef = ref(db, `bookings/${bookingId}`)
      const payload: any = { status }

      payload.adminNotes = notes ?? (orig.adminNotes ?? null)

      // --- ghi log thay đổi trạng thái ---
      const logRef = ref(db, `bookings/${bookingId}/statusChangeLogs`)
      await push(logRef, {
        oldStatus: orig.status,
        newStatus: status,
        changedBy: "admin",
        changedAt: new Date().toISOString(),
        notes: notes || null,
      })

      // --- cập nhật trạng thái đơn ---
      await update(bookingRef, payload)

      // tính lại available
      if (orig?.cameraId) {
        await recalcCameraAvailability(orig.cameraId)
      }

      toast({
        title: "Thành công",
        description: `Đã cập nhật trạng thái đơn #${bookingId} → ${STATUS_CONFIG[status].label}`,
      })
    } catch (err) {
      console.error("updateBookingStatus error:", err)
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật trạng thái đơn hàng",
        variant: "destructive",
      })
    }
  }

  // Recalculate availability for a camera
  const recalcCameraAvailability = async (cameraId: string) => {
    const bookingsSnap = await get(ref(db, "bookings"))
    if (!bookingsSnap.exists()) return

    const allBookings = Object.values(bookingsSnap.val()) as Booking[]

    const activeBookings = allBookings.filter(
      (b) => b.cameraId === cameraId && b.status === "confirmed"
    ).length

    // lấy thông tin máy (phải có total lưu trong DB)
    const camSnap = await get(ref(db, `cameras/${cameraId}`))
    if (!camSnap.exists()) return
    const cam = camSnap.val()

    const newAvailable = Math.max(0, (cam.total ?? 1) - activeBookings)

    await update(ref(db, `cameras/${cameraId}`), { available: newAvailable })
  }

  // --- quick helper for clicking next status button ---
  const handleQuickStatusUpdate = async (booking: Booking, status: string) => {
    // ensure typing for status
    await updateBookingStatus(booking.id, status as Booking["status"])
  }

  // --- delete booking (RTDB) ---
  const deleteBooking = async (bookingId: string) => {
    try {
      // get booking to check camera & status
      const orig = bookings.find((b) => b.id === bookingId)
      await remove(ref(db, `bookings/${bookingId}`))

      // if booking was confirmed (reserved), return camera
      if (orig?.status === "confirmed" && orig.cameraId) {
        await updateCameraAvailability(orig.cameraId, +1)
      }

      toast({
        title: "Đã xóa",
        description: `Đã xóa đơn hàng #${bookingId}`,
      })
    } catch (err) {
      console.error("deleteBooking error:", err)
      toast({
        title: "Lỗi",
        description: "Không thể xóa đơn hàng",
        variant: "destructive",
      })
    }
  }

  // --- handle confirm from status update dialog ---
  const handleStatusUpdate = async () => {
    if (!selectedBooking || !newStatus) return
    await updateBookingStatus(selectedBooking.id, newStatus as Booking["status"], adminNotes || null)
    setIsStatusUpdateOpen(false)
    setSelectedBooking(null)
    setNewStatus("")
    setAdminNotes("")
  }

  // --- stats calcs ---
  const stats = useMemo(() => {
    return {
      total: bookings.length,
      pending: bookings.filter((b) => b.status === "pending").length,
      confirmed: bookings.filter((b) => b.status === "confirmed").length,
      active: bookings.filter((b) => b.status === "active").length,
      completed: bookings.filter((b) => b.status === "completed").length,
      overtime: bookings.filter((b) => b.status === "overtime").length,
      cancelled: bookings.filter((b) => b.status === "cancelled").length,
    }
  }, [bookings])

  const getStatusBadge = (status: Booking["status"]) => {
    const config = STATUS_CONFIG[status]
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

  // --- UI render (kept similar to your original) ---
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Quản lý đơn hàng</h2>
          <p className="text-muted-foreground">Xác nhận và quản lý tình trạng đơn hàng</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              // manual refresh: re-read once
              setLoading(true)
              const bookingsRef = ref(db, "bookings")
              get(bookingsRef)
                .then((snap) => {
                  if (snap.exists()) {
                    const data = snap.val()
                    const list: Booking[] = Object.entries(data).map(([id, v]) => ({ id, ...(v as any) }))
                    setBookings(list)
                  } else {
                    setBookings([])
                  }
                })
                .catch((err) => {
                  console.error("Manual refresh error:", err)
                  toast({ title: "Lỗi", description: "Không thể làm mới dữ liệu", variant: "destructive" })
                })
                .finally(() => setLoading(false))
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
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
            <div className="text-2xl font-bold text-orange-600">{stats.overtime}</div>
            <p className="text-xs text-muted-foreground">Quá hạn</p>
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
          <SelectContent className="bg-white dark:bg-gray-900">
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

                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  onClick={() => deleteBooking(booking.id)}
                                                  className="text-destructive hover:text-destructive"
                                                >
                                                  <Trash2 className="h-4 w-4" />
                                                </Button>

                </div>
              </div>
            ))}

            {!loading && filteredBookings.length === 0 && (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Không tìm thấy đơn hàng</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== "all" ? "Không có đơn hàng phù hợp" : "Chưa có đơn hàng trong hệ thống"}
                </p>
              </div>
            )}

            {loading && (
              <div className="text-center py-8 text-muted-foreground">Đang tải danh sách đơn hàng...</div>
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
              Chi tiết đơn hàng
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Mã vận đơn: {selectedBooking?.id}
            </DialogDescription>
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
                      <div>
                        <p className="text-muted-foreground italic">
                          Giờ nhận:{" "}
                          <span className="font-medium text-foreground">
                            {selectedBooking.startTime || "--:--"}
                          </span>{" "}
                          Giờ trả:{" "}
                          <span className="font-medium text-foreground">
                            {selectedBooking.endTime || "--:--"}
                          </span>
                        </p>
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
                <SelectContent className="bg-white dark:bg-gray-900">
                  <SelectItem value="pending">Chờ xác nhận</SelectItem>
                  <SelectItem value="confirmed">Đã xác nhận</SelectItem>
                  <SelectItem value="active">Đang thuê</SelectItem>
                  <SelectItem value="completed">Hoàn thành</SelectItem>
                  <SelectItem value="overtime">Quá hạn</SelectItem>
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
