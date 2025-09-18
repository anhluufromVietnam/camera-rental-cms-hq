"use client"

import { useState, useEffect } from "react"
import { ref, onValue, push } from "firebase/database"
import { db } from "@/firebase.config"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { CameraIcon, CalendarIcon, Clock, Check, ChevronRight, Mail, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { format, differenceInDays } from "date-fns"
import { vi } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"

interface CameraType {
  id: string
  name: string
  brand: string
  model: string
  category: string
  dailyRate: number
  quantity: number
  available: number
  description: string
  specifications: string
  status: "active" | "maintenance" | "retired"
}

interface BookingForm {
  cameraId: string
  startDate: Date | null
  endDate: Date | null
  customerName: string
  customerEmail: string
  customerPhone: string
  notes: string
}

const normalizeDate = (d: string | Date) => {
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  return date
}

export function PublicBooking() {
  const [cameras, setCameras] = useState<CameraType[]>([])
  const [selectedCamera, setSelectedCamera] = useState<CameraType | null>(null)
  const [bookingForm, setBookingForm] = useState<BookingForm>({
    cameraId: "",
    startDate: null,
    endDate: null,
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    notes: "",
  })
  const [step, setStep] = useState<"select" | "dates" | "details" | "confirm">("select")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const camerasRef = ref(db, "cameras")
    const bookingsRef = ref(db, "bookings")

    const unsubscribeCameras = onValue(camerasRef, (snapshotCam) => {
      const camerasData = snapshotCam.exists() ? snapshotCam.val() : {}
      onValue(bookingsRef, (snapshotBook) => {
        const bookingsData = snapshotBook.exists() ? snapshotBook.val() : {}
        const now = new Date()
        const fourteenDaysLater = new Date()
        fourteenDaysLater.setDate(now.getDate() + 14)

        const cameraList: CameraType[] = Object.entries(camerasData).map(([id, camValue]) => {
          const cam = camValue as Omit<CameraType, "id">

          const relatedBookings = Object.values(bookingsData).filter((b: any) => {
            if (b.cameraId !== id) return false
            if (!b.startDate || !b.endDate) return false

            const start = normalizeDate(b.startDate)
            const end = normalizeDate(b.endDate)

            const overlaps =
              b.status === "confirmed" ||
              (start <= fourteenDaysLater && end >= now)

            return overlaps
          })

          const available = Math.max(0, (cam.quantity ?? 1) - relatedBookings.length)

          return { id, ...cam, available }
        })

        setCameras(cameraList.filter((c) => c.status === "active" && c.available > 0))
      })
    })

    return () => unsubscribeCameras()
  }, [])

  const calculateTotalDays = () => {
    if (!bookingForm.startDate || !bookingForm.endDate) return 0
    const start = normalizeDate(bookingForm.startDate)
    const end = normalizeDate(bookingForm.endDate)
    return differenceInDays(end, start) + 1
  }

  const calculateTotalAmount = () => {
    if (!selectedCamera) return 0
    return calculateTotalDays() * selectedCamera.dailyRate
  }

  const handleCameraSelect = (camera: CameraType) => {
    setSelectedCamera(camera)
    setBookingForm((prev) => ({ ...prev, cameraId: camera.id }))
    setStep("dates")
  }

  const handleDateSelect = () => {
    if (!bookingForm.startDate || !bookingForm.endDate) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn ngày bắt đầu và kết thúc",
        variant: "destructive",
      })
      return
    }
    setStep("details")
  }

  const handleSubmit = async () => {
    if (!selectedCamera || !bookingForm.startDate || !bookingForm.endDate) return

    setIsSubmitting(true)

    const newBooking = {
      customerName: bookingForm.customerName,
      customerEmail: bookingForm.customerEmail,
      customerPhone: bookingForm.customerPhone,
      cameraId: selectedCamera.id,
      cameraName: selectedCamera.name,
      startDate: format(bookingForm.startDate, "yyyy-MM-dd"),
      endDate: format(bookingForm.endDate, "yyyy-MM-dd"),
      totalDays: calculateTotalDays(),
      dailyRate: selectedCamera.dailyRate,
      totalAmount: calculateTotalAmount(),
      status: "pending",
      createdAt: new Date().toISOString(),
      notes: bookingForm.notes,
    }

    try {
      await push(ref(db, "bookings"), newBooking)
      setIsSubmitting(false)
      setShowSuccess(true)
    } catch (err) {
      console.error("Lỗi khi tạo booking:", err)
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setSelectedCamera(null)
    setBookingForm({
      cameraId: "",
      startDate: null,
      endDate: null,
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      notes: "",
    })
    setStep("select")
    setShowSuccess(false)
  }

  const isFormValid = () => {
    return (
      bookingForm.customerName &&
      bookingForm.customerEmail &&
      bookingForm.customerPhone &&
      bookingForm.startDate &&
      bookingForm.endDate
    )
 
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-[Be_Vietnam_Pro] text-foreground mb-2">Đặt thuê máy ảnh</h2>
        <p className="text-muted-foreground">Chọn máy ảnh và thời gian thuê phù hợp với nhu cầu của bạn</p>
      </div>

      {/* Progress Steps */}
    <Card>
  <CardContent className="pt-6">
    <div className="flex justify-between">
      {[
        { key: "select", label: "Chọn máy ảnh", icon: CameraIcon },
        { key: "dates", label: "Chọn ngày", icon: CalendarIcon },
        { key: "details", label: "Thông tin", icon: User },
        { key: "confirm", label: "Xác nhận", icon: Check },
      ].map((stepItem, index) => {
        const Icon = stepItem.icon
        const isActive = step === stepItem.key
        const isCompleted = ["select", "dates", "details", "confirm"].indexOf(step) > index

        return (
          <div
            key={stepItem.key}
            className="flex-1 flex flex-col items-center text-center cursor-pointer"
            onClick={() => setStep(stepItem.key as any)}
          >
            <div
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors",
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : isCompleted
                  ? "border-green-500 bg-green-500 text-white"
                  : "border-muted-foreground text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div
              className={cn(
                "mt-2 text-sm font-medium",
                isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
              )}
            >
              {stepItem.label}
            </div>
          </div>
        )
      })}
    </div>
  </CardContent>
</Card>



      {/* Step 1: Camera Selection */}
      {step === "select" && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cameras.map((camera) => (
            <Card key={camera.id} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CameraIcon className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg">{camera.name}</CardTitle>
                    <CardDescription>
                      {camera.brand} {camera.model}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-[Be_Vietnam_Pro]">Loại máy</Label>
                  <Badge variant="secondary">{camera.category}</Badge>
                </div>

                <div>
                  <Label className="block mb-1 text-sm font-[Be_Vietnam_Pro]">Mô tả</Label>
                  <p className="text-sm text-muted-foreground">{camera.description}</p>
                </div>

                <div>
                  <Label className="block mb-1 text-sm font-[Be_Vietnam_Pro]">Thông số</Label>
                  <p className="text-sm text-muted-foreground">{camera.specifications}</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Còn {camera.available} máy</span>
                  </div>
                  <Button onClick={() => handleCameraSelect(camera)}>Chọn máy này</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Step 2: Date Selection */}
      {step === "dates" && selectedCamera && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CameraIcon className="h-5 w-5" />
              {selectedCamera.name}
            </CardTitle>
            <CardDescription>Chọn ngày bắt đầu và kết thúc thuê máy</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="block mb-1 text-sm font-[Be_Vietnam_Pro]">Ngày bắt đầu</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left bg-transparent">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {bookingForm.startDate
                        ? format(bookingForm.startDate, "dd/MM/yyyy", { locale: vi })
                        : "Chọn ngày"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={bookingForm.startDate || undefined}
                      onSelect={(date) => setBookingForm((prev) => ({ ...prev, startDate: date || null }))}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="block mb-1 text-sm font-[Be_Vietnam_Pro]">Ngày kết thúc</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left bg-transparent">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {bookingForm.endDate ? format(bookingForm.endDate, "dd/MM/yyyy", { locale: vi }) : "Chọn ngày"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={bookingForm.endDate || undefined}
                      onSelect={(date) => setBookingForm((prev) => ({ ...prev, endDate: date || null }))}
                      disabled={(date) => date < (bookingForm.startDate || new Date())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {bookingForm.startDate && bookingForm.endDate && (
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-sm font-[Be_Vietnam_Pro]">Số ngày thuê</Label>
                      <span className="font-[Be_Vietnam_Pro]">{calculateTotalDays()} ngày</span>
                    </div>
                    <div className="flex justify-between">
                      <Label className="text-sm font-[Be_Vietnam_Pro]">Giá thuê/ngày</Label>
                      <span className="font-[Be_Vietnam_Pro]">{selectedCamera.dailyRate.toLocaleString("vi-VN")}đ</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-[Be_Vietnam_Pro]">
                      <Label className="text-sm font-[Be_Vietnam_Pro]">Tổng cộng</Label>
                      <span className="text-primary">{calculateTotalAmount().toLocaleString("vi-VN")}đ</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("select")}>
                Quay lại
              </Button>
              <Button onClick={handleDateSelect} className="flex-1">
                Tiếp tục
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Customer Details */}
      {step === "details" && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Thông tin khách hàng</CardTitle>
            <CardDescription>Vui lòng điền đầy đủ thông tin để hoàn tất đặt thuê</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="block mb-1 text-sm font-[Be_Vietnam_Pro]">Họ và tên *</Label>
                <Input
                  id="name"
                  value={bookingForm.customerName}
                  onChange={(e) => setBookingForm((prev) => ({ ...prev, customerName: e.target.value }))}
                  placeholder="Nhập họ và tên"
                />
              </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="block mb-1 text-sm font-medium">Số điện thoại *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={bookingForm.customerPhone}
                  onChange={(e) => {
                      const value = e.target.value
                      setBookingForm((prev) => ({ ...prev, customerPhone: value }))
                  if (value === "" || /^[0-9]{9,11}$/.test(value)) {
                    setPhoneError("")
                  } else {
                      setPhoneError("Yêu cầu nhập đúng định dạng số điện thoại (9-11 chữ số).")
                  }
                }}
                    placeholder="Nhập số điện thoại"
                    required
                    pattern="^[0-9]{9,11}$"
            />
            
                    
                    </div>


            <div className="space-y-2">
                <Label htmlFor="email" className="block mb-1 text-sm font-medium">Email *</Label>
                    <Input
                          id="email"
                          type="email"
                          value={bookingForm.customerEmail}
                          onChange={(e) => {
                          const value = e.target.value
                          e.target.setCustomValidity(
                          /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value) ? "" : "Email không hợp lệ, vui lòng nhập lại"
                      )
                        setBookingForm((prev) => ({ ...prev, customerEmail: value }))
                      }}
                    placeholder="Nhập địa chỉ email"
                 required
                />

            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="block mb-1 text-sm font-[Be_Vietnam_Pro]">Ghi chú</Label>
              <Textarea
                id="notes"
                value={bookingForm.notes}
                onChange={(e) => setBookingForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Ghi chú thêm về yêu cầu thuê máy (tùy chọn)"
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("dates")}>
                Quay lại
              </Button>
              <Button onClick={() => setStep("confirm")} className="flex-1" disabled={!isFormValid()}>
                Xem lại đơn hàng
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Confirmation */}
      {step === "confirm" && selectedCamera && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Xác nhận đặt thuê</CardTitle>
            <CardDescription>Vui lòng kiểm tra lại thông tin trước khi gửi yêu cầu</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <CameraIcon className="h-8 w-8 text-primary" />
                <div>
                  <h4 className="font-[Be_Vietnam_Pro]">{selectedCamera.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedCamera.brand} {selectedCamera.model}
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-[Be_Vietnam_Pro]">Thời gian thuê</p>
                      <p className="text-sm text-muted-foreground">
                        {bookingForm.startDate && format(bookingForm.startDate, "dd/MM/yyyy", { locale: vi })} - {bookingForm.endDate && format(bookingForm.endDate, "dd/MM/yyyy", { locale: vi })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-[Be_Vietnam_Pro]">Số ngày</p>
                      <p className="text-sm text-muted-foreground">{calculateTotalDays()} ngày</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-[Be_Vietnam_Pro]">Khách hàng</p>
                      <p className="text-sm text-muted-foreground">{bookingForm.customerName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-[Be_Vietnam_Pro]">Liên hệ</p>
                      <p className="text-sm text-muted-foreground">{bookingForm.customerEmail}</p>
                      <p className="text-sm text-muted-foreground">{bookingForm.customerPhone}</p>
                    </div>
                  </div>
                </div>
              </div>

              {bookingForm.notes && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-[Be_Vietnam_Pro] mb-1">Ghi chú:</p>
                  <p className="text-sm text-muted-foreground">{bookingForm.notes}</p>
                </div>
              )}

              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Giá thuê ({calculateTotalDays()} ngày):</span>
                      <span>{(calculateTotalDays() * selectedCamera.dailyRate).toLocaleString("vi-VN")}đ</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-[Be_Vietnam_Pro]">
                      <span>Tổng cộng:</span>
                      <span className="text-primary">{calculateTotalAmount().toLocaleString("vi-VN")}đ</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("details")}>
                Quay lại
              </Button>
              <Button onClick={handleSubmit} className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? "Đang gửi..." : "Gửi yêu cầu đặt thuê"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Check className="h-5 w-5" />
              Đặt thuê thành công!
            </DialogTitle>
            <DialogDescription>
              Yêu cầu đặt thuê của bạn đã được gửi thành công. Chúng tôi sẽ liên hệ với bạn trong thời gian sớm nhất.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={resetForm} className="flex-1 bg-transparent">
              Đặt thuê mới
            </Button>
            <Button onClick={() => setShowSuccess(false)} className="flex-1">
              Đóng
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {cameras.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CameraIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-[Be_Vietnam_Pro] mb-2">Hiện tại không có máy ảnh</h3>
            <p className="text-muted-foreground text-center">
              Tất cả máy ảnh đang được thuê hoặc bảo trì. Vui lòng quay lại sau.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
