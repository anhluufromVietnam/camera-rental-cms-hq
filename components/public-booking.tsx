"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
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
import { database } from "@/lib/firebase"
import { ref, push, get, update } from "firebase/database"

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
  startTime?: string
  endDate: Date | null
  endTime?: string
  customerName: string
  customerEmail: string
  customerPhone: string
  notes: string
}

const CameraComponent = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v11z"></path>
    <circle cx="10" cy="10" r="3"></circle>
    <line x1="14" y1="14" x2="21" y2="21"></line>
  </svg>
)

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
    const loadCameras = async () => {
      try {
        const camerasRef = ref(database, "cameras")
        const snapshot = await get(camerasRef)
        if (snapshot.exists()) {
          const camerasData = snapshot.val()
          const camerasArray = Object.keys(camerasData).map((key) => ({
            id: key,
            ...camerasData[key],
          }))
          // Only show active cameras with available quantity
          setCameras(camerasArray.filter((camera: CameraType) => camera.status === "active" && camera.available > 0))
        } else {
          // Fallback to localStorage if Firebase is empty
          const savedCameras = localStorage.getItem("cameras")
          if (savedCameras) {
            const allCameras = JSON.parse(savedCameras)
            setCameras(allCameras.filter((camera: CameraType) => camera.status === "active" && camera.available > 0))
          }
        }
      } catch (error) {
        console.error("Error loading cameras:", error)
        // Fallback to localStorage on error
        const savedCameras = localStorage.getItem("cameras")
        if (savedCameras) {
          const allCameras = JSON.parse(savedCameras)
          setCameras(allCameras.filter((camera: CameraType) => camera.status === "active" && camera.available > 0))
        }
      }
    }

    loadCameras()
  }, [])

  const calculateTotalDays = () => {
    if (!bookingForm.startDate || !bookingForm.endDate) return 0
    return differenceInDays(bookingForm.endDate, bookingForm.startDate) + 1
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

    // Create new booking
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
      const bookingsRef = ref(database, "bookings")
      await push(bookingsRef, newBooking)

      // Update camera availability in Firebase
      const cameraRef = ref(database, `cameras/${selectedCamera.id}`)
      await update(cameraRef, {
        available: selectedCamera.available - 1,
      })

      // Update local state
      const updatedCameras = cameras.map((camera) =>
        camera.id === selectedCamera.id ? { ...camera, available: camera.available - 1 } : camera,
      )
      setCameras(updatedCameras)

      setTimeout(() => {
        setIsSubmitting(false)
        setShowSuccess(true)
      }, 2000)
    } catch (error) {
      console.error("Error submitting booking:", error)
      const existingBookings = JSON.parse(localStorage.getItem("bookings") || "[]")
      localStorage.setItem(
        "bookings",
        JSON.stringify([...existingBookings, { ...newBooking, id: Date.now().toString() }]),
      )

      // Update camera availability in localStorage
      const updatedCameras = cameras.map((camera) =>
        camera.id === selectedCamera.id ? { ...camera, available: camera.available - 1 } : camera,
      )
      setCameras(updatedCameras)

      const allCameras = JSON.parse(localStorage.getItem("cameras") || "[]")
      const updatedAllCameras = allCameras.map((camera: CameraType) =>
        camera.id === selectedCamera.id ? { ...camera, available: camera.available - 1 } : camera,
      )
      localStorage.setItem("cameras", JSON.stringify(updatedAllCameras))

      setTimeout(() => {
        setIsSubmitting(false)
        setShowSuccess(true)
      }, 2000)
    }
  }

  // THÊM HÀM NÀY
  const getPricingInfo = () => {
    if (!selectedCamera || !bookingForm.startDate || !bookingForm.endDate) {
      return { label: "", rate: 0, total: 0 }
    }
    const days = calculateTotalDays()
    const rate = selectedCamera.dailyRate
    return {
      label: "Giá thường",
      rate,
      total: days * rate
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
      <div className="text-center glass-card rounded-3xl p-8">
        <h2 className="text-4xl font-bold text-foreground mb-3">Đặt thuê máy ảnh</h2>
        <p className="text-foreground/70 text-lg">Chọn máy ảnh và thời gian thuê phù hợp với nhu cầu của bạn</p>
      </div>

      <Card className="glass-strong rounded-3xl border-white/30">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
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
                <div key={stepItem.key} className="flex items-center">
                  <div
                    className={cn(
                      "flex items-center justify-center w-12 h-12 rounded-2xl border-2 transition-all duration-300",
                      isActive
                        ? "border-primary bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg scale-110"
                        : isCompleted
                          ? "border-green-500 bg-gradient-to-br from-green-400 to-green-600 text-white shadow-md"
                          : "border-white/30 bg-white/20 text-foreground/60 backdrop-blur-xl",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className={cn("ml-2 text-sm font-medium", isActive ? "text-foreground" : "text-foreground/60")}>
                    {stepItem.label}
                  </div>
                  {index < 3 && <ChevronRight className="h-4 w-4 mx-4 text-foreground/40" />}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {step === "select" && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cameras.map((camera) => (
            <Card
              key={camera.id}
              className="glass-card cursor-pointer hover:glass-strong hover:scale-105 transition-all duration-300 rounded-3xl border-white/30"
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30 backdrop-blur-xl">
                    <CameraIcon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{camera.name}</CardTitle>
                    <CardDescription className="text-foreground/60">
                      {camera.brand} {camera.model}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="glass-light border-white/20">
                    {camera.category}
                  </Badge>
                  <div className="text-right">
                    <p className="font-bold text-xl text-primary">{camera.dailyRate.toLocaleString("vi-VN")}đ</p>
                    <p className="text-sm text-foreground/60">/ ngày</p>
                  </div>
                </div>

                <p className="text-sm text-foreground/70">{camera.description}</p>

                <div className="text-sm glass-light rounded-2xl p-3 border-white/20">
                  <p className="font-medium text-foreground">Thông số:</p>
                  <p className="text-foreground/70">{camera.specifications}</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm glass-light px-3 py-1.5 rounded-full border-white/20">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-foreground/80">Còn {camera.available} máy</span>
                  </div>
                  <Button onClick={() => handleCameraSelect(camera)} className="rounded-2xl shadow-lg">
                    Chọn máy này
                  </Button>
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
                <Label className="mb-1 text-sm">Ngày bắt đầu</Label> {/* ✅ SỬA: Xóa block */}
                <div className="grid grid-cols-2 gap-2">
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

                  <Select
                    value={bookingForm.startTime || ""}
                    onValueChange={(value) => setBookingForm((prev) => ({ ...prev, startTime: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Giờ nhận" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="08:00">08:00 sáng</SelectItem>
                      <SelectItem value="10:00">10:00 sáng</SelectItem>
                      <SelectItem value="12:00">12:00 trưa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="mb-1 text-sm">Ngày kết thúc</Label> {/* ✅ SỬA: Xóa block */}
                <div className="grid grid-cols-2 gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left bg-transparent">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {bookingForm.endDate
                          ? format(bookingForm.endDate, "dd/MM/yyyy", { locale: vi })
                          : "Chọn ngày"}
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

                  <Select
                    value={bookingForm.endTime || ""}
                    onValueChange={(value) => setBookingForm((prev) => ({ ...prev, endTime: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Giờ trả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="14:00">14:00 chiều</SelectItem>
                      <SelectItem value="16:00">16:00 chiều</SelectItem>
                      <SelectItem value="18:00">18:00 chiều</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Summary - ✅ BÂY GIỜ SẼ HOẠT ĐỘNG */}
            {bookingForm.startDate && bookingForm.endDate && (
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-sm">Số ngày thuê</Label>
                      <span>{calculateTotalDays()} ngày</span>
                    </div>

                    <div className="flex justify-between">
                      <Label className="text-sm">Mức giá áp dụng</Label>
                      <span>
                        {getPricingInfo().label} ({getPricingInfo().rate.toLocaleString("vi-VN")}đ/ngày)
                      </span>
                    </div>

                    <Separator />

                    <div className="flex justify-between text-lg">
                      <Label className="text-sm">Tổng cộng</Label>
                      <span className="text-primary">
                        {getPricingInfo().total.toLocaleString("vi-VN")}đ
                      </span>
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

      {step === "details" && (
        <Card className="max-w-2xl mx-auto glass-card rounded-3xl border-white/30">
          <CardHeader>
            <CardTitle className="text-foreground">Thông tin khách hàng</CardTitle>
            <CardDescription className="text-foreground/60">
              Vui lòng điền đầy đủ thông tin để hoàn tất đặt thuê
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Họ và tên *</Label>
                <Input
                  id="name"
                  value={bookingForm.customerName}
                  onChange={(e) => setBookingForm((prev) => ({ ...prev, customerName: e.target.value }))}
                  placeholder="Nhập họ và tên"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Số điện thoại *</Label>
                <Input
                  id="phone"
                  value={bookingForm.customerPhone}
                  onChange={(e) => setBookingForm((prev) => ({ ...prev, customerPhone: e.target.value }))}
                  placeholder="Nhập số điện thoại"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={bookingForm.customerEmail}
                onChange={(e) => setBookingForm((prev) => ({ ...prev, customerEmail: e.target.value }))}
                placeholder="Nhập địa chỉ email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Ghi chú</Label>
              <Textarea
                id="notes"
                value={bookingForm.notes}
                onChange={(e) => setBookingForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Ghi chú thêm về yêu cầu thuê máy (tùy chọn)"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep("dates")}
                className="glass-light border-white/30 hover:glass rounded-2xl"
              >
                Quay lại
              </Button>
              <Button
                onClick={() => setStep("confirm")}
                className="flex-1 rounded-2xl shadow-lg"
                disabled={!isFormValid()}
              >
                Xem lại đơn hàng
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "confirm" && selectedCamera && (
        <Card className="max-w-2xl mx-auto glass-card rounded-3xl border-white/30">
          <CardHeader>
            <CardTitle className="text-foreground">Xác nhận đặt thuê</CardTitle>
            <CardDescription className="text-foreground/60">
              Vui lòng kiểm tra lại thông tin trước khi gửi yêu cầu
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 glass-light border-2 border-white/30 rounded-2xl">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30 backdrop-blur-xl">
                  <CameraIcon className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">{selectedCamera.name}</h4>
                  <p className="text-sm text-foreground/60">
                    {selectedCamera.brand} {selectedCamera.model}
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Thời gian thuê</p>
                      <p className="text-sm text-muted-foreground">
                        {bookingForm.startDate && format(bookingForm.startDate, "dd/MM/yyyy", { locale: vi })} -{" "}
                        {bookingForm.endDate && format(bookingForm.endDate, "dd/MM/yyyy", { locale: vi })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Số ngày</p>
                      <p className="text-sm text-muted-foreground">{calculateTotalDays()} ngày</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Khách hàng</p>
                      <p className="text-sm text-muted-foreground">{bookingForm.customerName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Liên hệ</p>
                      <p className="text-sm text-muted-foreground">{bookingForm.customerEmail}</p>
                      <p className="text-sm text-muted-foreground">{bookingForm.customerPhone}</p>
                    </div>
                  </div>
                </div>
              </div>

              {bookingForm.notes && (
                <div className="p-4 glass-light rounded-2xl border-white/20">
                  <p className="text-sm font-medium mb-1 text-foreground">Ghi chú:</p>
                  <p className="text-sm text-foreground/70">{bookingForm.notes}</p>
                </div>
              )}

              <Card className="glass-strong rounded-2xl border-2 border-primary/30">
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-foreground/80">
                      <span>Giá thuê ({calculateTotalDays()} ngày):</span>
                      <span className="text-foreground">
                        {(calculateTotalDays() * selectedCamera.dailyRate).toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                    <Separator className="bg-white/20" />
                    <div className="flex justify-between text-lg font-bold">
                      <span className="text-foreground">Tổng cộng:</span>
                      <span className="text-primary text-2xl">{calculateTotalAmount().toLocaleString("vi-VN")}đ</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep("details")}
                className="glass-light border-white/30 hover:glass rounded-2xl"
              >
                Quay lại
              </Button>
              <Button onClick={handleSubmit} className="flex-1 rounded-2xl shadow-lg" disabled={isSubmitting}>
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
        <Card className="glass-card rounded-3xl border-white/30">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="p-6 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-xl mb-4">
              <CameraIcon className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-foreground">Hiện tại không có máy ảnh</h3>
            <p className="text-foreground/60 text-center">
              Tất cả máy ảnh đang được thuê hoặc bảo trì. Vui lòng quay lại sau.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
