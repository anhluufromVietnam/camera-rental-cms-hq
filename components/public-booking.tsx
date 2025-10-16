"use client"

import { useState, useEffect } from "react"
import { ref, onValue, push, DatabaseReference } from "firebase/database"
import { getDownloadURL, uploadBytes, ref as storageRef } from "firebase/storage"
import { db, storage } from "@/firebase.config"
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
import { CameraIcon, CalendarIcon, Clock, Check, Mail, User, BrickWallIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Be_Vietnam_Pro, Inter, Manrope } from "next/font/google"

interface CameraType {
  id: string
  name: string
  brand: string
  model: string
  category: string
  dailyRate: number
  ondayRate: number
  fullDayRate: number
  threeDaysRate: number
  fiveDaysRate: number
  isBooked: boolean
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
  const [step, setStep] = useState<"select" | "dates" | "details" | "confirm" | "payment">("select")
  const [showSuccess, setShowSuccess] = useState(false)
  const [stepError, setStepError] = useState("")
  const [phoneError, setPhoneError] = useState<string>("")
  const [paymentFile, setPaymentFile] = useState<File | null>(null)
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false)


  const { toast } = useToast()
  useEffect(() => {
    if (!showSuccess) return
    const timer = setTimeout(() => {
      setShowSuccess(false)
      setStep("select")
    }, 3000)
    return () => clearTimeout(timer)
  }, [showSuccess])

  useEffect(() => {
    const camerasRef = ref(db, "cameras")
    const bookingsRef = ref(db, "bookings")

    const handleData = (camerasSnap: any, bookingsSnap: any) => {
      const camerasData = camerasSnap.exists() ? camerasSnap.val() : {}
      const bookingsData = bookingsSnap.exists() ? bookingsSnap.val() : {}
      const now = new Date()
      const fourteenDaysLater = new Date()
      fourteenDaysLater.setDate(now.getDate() + 14)

      const cameraList = Object.entries(camerasData).map(([id, camValue]) => {
        const cam = camValue as Omit<CameraType, "id">

        const isBooked = Object.values(bookingsData).some((b: any) => {
          if (b.cameraId !== id) return false
          if (!b.startDate || !b.endDate) return false
          const start = normalizeDate(b.startDate)
          const end = normalizeDate(b.endDate)
          return b.status === "confirmed" && start <= fourteenDaysLater && end >= now
        })

        return { id, ...cam, isBooked }
      })

      setCameras(cameraList.filter((c) => c.status === "active" && !c.isBooked))
    }

    const unsubCameras = onValue(camerasRef, (snapCam) => {
      onValue(bookingsRef, (snapBook) => {
        handleData(snapCam, snapBook)
      })
    })

    return () => unsubCameras()
  }, [])


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

  const handleDetailsSubmit = () => {
    if (!bookingForm.customerName || !bookingForm.customerPhone) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập đầy đủ thông tin khách hàng",
        variant: "destructive",
      })
      return
    }
    setStep("confirm")
  }

  useEffect(() => {
    const paymentRef = ref(db, "paymentInfo")

    const unsub = onValue(paymentRef, (snapshot) => {
      if (snapshot.exists()) {
        setPaymentInfo(snapshot.val())
      } else {
        console.warn("Không tìm thấy thông tin thanh toán trên Firebase")
      }
    })

    return () => unsub()
  }, [])

  const handlePaymentConfirm = async () => {
    if (!selectedCamera) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng tải lên ảnh xác nhận thanh toán",
        variant: "destructive",
      })
      return
    }

    setIsPaymentSubmitting(true)

    try {
      // const paymentStorageRef = storageRef(storage, `payments/${Date.now()}_${paymentFile.name}`)
      // await uploadBytes(paymentStorageRef, paymentFile)
      // const downloadUrl = await getDownloadURL(paymentStorageRef)
      const newBooking = {
        customerName: bookingForm.customerName,
        customerEmail: bookingForm.customerEmail,
        customerPhone: bookingForm.customerPhone,
        cameraId: selectedCamera.id,
        cameraName: selectedCamera.name,
        startDate: format(bookingForm.startDate!, "yyyy-MM-dd"),
        endDate: format(bookingForm.endDate!, "yyyy-MM-dd"),
        totalDays: calculateTotalDays(),
        dailyRate: getPricingInfo().rate,
        totalAmount: calculateTotalAmount(),
        paymentProof: null,
        status: "pending",
        createdAt: new Date().toISOString(),
        notes: bookingForm.notes,
      }

      await push(ref(db, "bookings"), newBooking)

      toast({
        title: "Đặt máy thành công",
        description: "Thanh toán của bạn đã được gửi để xác nhận",
      })

      setStep("select")
      setSelectedCamera(null)
      setPaymentFile(null)
    } catch (err) {
      console.error("Lỗi khi xác nhận thanh toán:", err)
      toast({
        title: "Lỗi",
        description: "Không thể hoàn tất thanh toán",
        variant: "destructive",
      })
    } finally {
      setIsPaymentSubmitting(false)
    }
  }

  useEffect(() => {
    const paymentRef = ref(db, "settings")
    onValue(paymentRef, (snapshot) => {
      if (snapshot.exists()) {
        setPaymentInfo(snapshot.val())
      }
    })
  }, [])


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

  const stepsConfig = [
    { key: "select", label: "Chọn máy ảnh", icon: CameraIcon },
    { key: "dates", label: "Chọn ngày", icon: CalendarIcon },
    { key: "details", label: "Thông tin", icon: User },
    { key: "confirm", label: "Xác nhận", icon: Check },
    { key: "payment", label: "Thanh toán", icon: BrickWallIcon },

  ] as const

  const validateStep = (key: (typeof stepsConfig)[number]["key"]) => {
    if (key === "select" && !selectedCamera) return "Vui lòng chọn máy ảnh"
    if (key === "dates" && (!bookingForm.startDate || !bookingForm.endDate))
      return "Vui lòng chọn ngày thuê"
    if (key === "details" && !isFormValid())
      return "Vui lòng điền đầy đủ thông tin"
    return ""
  }

  const handleStepClick = (targetKey: string) => {
    setStepError("")
    const stepKeys = stepsConfig.map((s) => s.key)
    const currentIndex = stepKeys.indexOf(step)
    const targetIndex = stepKeys.indexOf(targetKey as any)

    if (targetIndex <= currentIndex) {
      setStep(targetKey as any)
      setStepError("")
      return
    }
    for (let i = 0; i < targetIndex; i++) {
      const err = validateStep(stepKeys[i])
      if (err) {
        setStepError(err)
        return
      }
    }
    setStep(targetKey as any)
    setStepError("")
  }

  const calculateTotalDays = () => {
    if (
      !bookingForm.startDate ||
      !bookingForm.endDate ||
      !bookingForm.startTime ||
      !bookingForm.endTime
    ) {
      return 0;
    }

    const diffDate = Math.ceil(
      (normalizeDate(bookingForm.endDate).getTime() - normalizeDate(bookingForm.startDate).getTime()) /
      (1000 * 60 * 60 * 24)
    ) + 1;
    return diffDate;
  };

  const calculateTotalHours = () => {
    if (
      !bookingForm.startDate ||
      !bookingForm.endDate ||
      !bookingForm.startTime ||
      !bookingForm.endTime
    ) {
      return 0;
    }

    const [sh, sm] = bookingForm.startTime.split(":").map(Number);
    const [eh, em] = bookingForm.endTime.split(":").map(Number);

    const startDateTime = new Date(bookingForm.startDate);
    startDateTime.setHours(sh, sm, 0, 0);

    const endDateTime = new Date(bookingForm.endDate);
    endDateTime.setHours(eh, em, 0, 0);

    if (endDateTime <= startDateTime) {
      return 0;
    }

    const diffHours = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);
    return diffHours;
  };

  const getPricingInfo = () => {
    const hours = calculateTotalHours();
    console.log("Hours received in getPricingInfo:", hours);
    if (hours === null || hours === undefined || !selectedCamera) {
      return { rate: 0, label: "", total: 0 };
    }
    let rate: number;
    let label: string;

    if (hours >= 120 && selectedCamera.fiveDaysRate > 0) {
      rate = selectedCamera.fiveDaysRate;
      label = "5 ngày trở lên";
    } else if (hours >= 72 && selectedCamera.threeDaysRate > 0) {
      rate = selectedCamera.threeDaysRate;
      label = "3 ngày trở lên";
    } else if (hours >= 24 && selectedCamera.fullDayRate > 0) {
      rate = selectedCamera.fullDayRate;
      label = "1 ngày trở lên";
    } else {
      rate = selectedCamera.ondayRate || 0;
      label = "Trong ngày";
    }

    const days = Math.ceil(hours / 24);
    const total = days * rate;

    console.log("Pricing Info:", { rate, label, total, days });
    return { rate, label, total };
  };


  const calculateTotalAmount = () => {
    return getPricingInfo().total
  }

  const [paymentInfo, setPaymentInfo] = useState({
    bankName: "",
    accountNumber: "",
    accountHolder: "",
    paymentSyntax: "",
    qrUrl: "",
  })

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-[Be_Vietnam_Pro] text-foreground mb-2">
          Đặt thuê máy ảnh
        </h2>
        <p className="text-muted-foreground">
          Chọn máy ảnh và thời gian thuê phù hợp với nhu cầu của bạn
        </p>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between">
            {stepsConfig.map((stepItem, index) => {
              const Icon = stepItem.icon
              const isActive = step === stepItem.key
              const isCompleted =
                stepsConfig.findIndex((s) => s.key === step) > index

              return (
                <div
                  key={stepItem.key}
                  className={cn(
                    "flex-1 flex flex-col items-center text-center select-none",
                    isActive ? "cursor-default" : "cursor-pointer"
                  )}
                  onClick={() => handleStepClick(stepItem.key)}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors",
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : isCompleted
                          ? "border-green-500 bg-green-500 text-white"
                          : "border-muted-foreground text-muted-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div
                    className={cn(
                      "mt-2 text-sm font-medium",
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground hover:text-primary"
                    )}
                  >
                    {stepItem.label}
                  </div>
                </div>
              )
            })}
          </div>
          {stepError && (
            <p className="text-sm text-red-500 text-center mt-4">{stepError}</p>
          )}
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
                <div className="grid grid-cols-2 gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left bg-transparent">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {bookingForm.startDate
                          ? new Date(bookingForm.startDate).toLocaleDateString("vi-VN")
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
                <Label className="block mb-1 text-sm font-[Be_Vietnam_Pro]">Ngày kết thúc</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left bg-transparent">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {bookingForm.endDate
                          ? new Date(bookingForm.endDate).toLocaleDateString("vi-VN")
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

            {/* Show summary if dates are selected */}
            {bookingForm.startDate && bookingForm.endDate && bookingForm.startTime && bookingForm.endTime && (
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-sm font-[Be_Vietnam_Pro]">Số ngày thuê</Label>
                      <span className="font-[Be_Vietnam_Pro]">{calculateTotalDays()} ngày</span>
                    </div>

                    <div className="flex justify-between">
                      <Label className="text-sm font-[Be_Vietnam_Pro]">Mức giá áp dụng</Label>
                      <span className="font-[Be_Vietnam_Pro]">
                        {getPricingInfo().label} ({getPricingInfo().rate.toLocaleString("vi-VN")}đ/ngày)
                      </span>
                    </div>

                    <Separator />

                    <div className="flex justify-between text-lg font-[Be_Vietnam_Pro]">
                      <Label className="text-sm font-[Be_Vietnam_Pro]">Tổng cộng</Label>
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
              <Button onClick={handleDetailsSubmit} className="flex-1" disabled={!isFormValid()}>
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
            <CardDescription>
              Vui lòng kiểm tra lại thông tin trước khi thanh toán
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {/* Camera info */}
              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <CameraIcon className="h-8 w-8 text-primary" />
                <div>
                  <h4 className="font-[Be_Vietnam_Pro]">{selectedCamera.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedCamera.brand} {selectedCamera.model}
                  </p>
                </div>
              </div>

              {/* Booking info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-[Be_Vietnam_Pro]">Thời gian thuê</p>
                      <p className="text-sm text-muted-foreground">
                        {bookingForm.startDate &&
                          format(bookingForm.startDate, "dd/MM/yyyy", { locale: vi })}{" "}
                        -{" "}
                        {bookingForm.endDate &&
                          format(bookingForm.endDate, "dd/MM/yyyy", { locale: vi })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-[Be_Vietnam_Pro]">Số ngày</p>
                      <p className="text-sm text-muted-foreground">
                        {calculateTotalDays()} ngày
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-[Be_Vietnam_Pro]">Khách hàng</p>
                      <p className="text-sm text-muted-foreground">
                        {bookingForm.customerName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-[Be_Vietnam_Pro]">Liên hệ</p>
                      <p className="text-sm text-muted-foreground">
                        {bookingForm.customerEmail}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {bookingForm.customerPhone}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {bookingForm.notes && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm font-[Be_Vietnam_Pro] mb-1">Ghi chú:</p>
                  <p className="text-sm text-muted-foreground">
                    {bookingForm.notes}
                  </p>
                </div>
              )}

              {/* Tổng cộng */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-lg font-[Be_Vietnam_Pro]">
                      <span className="font-[Be_Vietnam_Pro]">Tổng cộng:</span>
                      <span className="text-primary">
                        {calculateTotalAmount().toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep("details")}>
                Quay lại
              </Button>
              <Button onClick={() => setStep("payment")} className="flex-1">
                Xác nhận & Thanh toán
              </Button>
            </div>
          </CardContent>
        </Card>
      )}


      {/* ✅ Step 5: Payment Instructions */}
      {step === "payment" && selectedCamera && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Thanh toán</CardTitle>
            <CardDescription>
              Quét mã QR hoặc chuyển khoản theo thông tin dưới đây
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-4 text-center shadow-sm">
              <p className="text-sm text-emerald-800 font-medium">
                Tổng tiền cần thanh toán
              </p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">
                {calculateTotalAmount().toLocaleString("vi-VN")} ₫
              </p>
            </div>

            {/* --- Payment info section --- */}
            {paymentInfo ? (
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/60 border border-blue-200 rounded-xl p-6 shadow-sm space-y-5">
                <h4 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                  💳 Thông tin chuyển khoản
                </h4>

                <div>
                  <Label className="text-blue-900 font-medium">Ngân hàng</Label>
                  <p>{paymentInfo.bankName}</p>
                </div>

                <div>
                  <Label className="text-blue-900 font-medium">Số tài khoản</Label>
                  <p className="font-semibold text-lg tracking-wide">{paymentInfo.accountNumber}</p>
                </div>

                <div>
                  <Label className="text-blue-900 font-medium">Chủ tài khoản</Label>
                  <p>{paymentInfo.accountHolder}</p>
                </div>

                <div>
                  <Label className="text-blue-900 font-medium">Cú pháp chuyển khoản</Label>
                  <p className="italic text-sm text-blue-800">
                    {paymentInfo.paymentSyntax
                      ?.replace("[Tên]", bookingForm.customerName || "Tên khách hàng")
                      ?.replace(
                        "[Ngày thuê]",
                        bookingForm.startDate
                          ? format(bookingForm.startDate, "dd/MM/yyyy")
                          : "..."
                      )}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                Đang tải thông tin thanh toán...
              </p>
            )}

            {paymentInfo?.qrUrl ? (
              <div className="text-center">
                <img
                  src={paymentInfo.qrUrl}
                  alt="QR Code"
                  className="w-48 h-48 mx-auto rounded-lg shadow-sm border"
                />
                <p className="mt-2 text-sm text-muted-foreground">Quét mã để thanh toán nhanh</p>
              </div>
            ) : (
              <div className="text-center text-sm text-muted-foreground italic">
                (Chưa có mã QR thanh toán)
              </div>
            )}

            {/* --- Upload proof ---
            <div className="space-y-2">
              <Label>Upload hóa đơn (Ảnh hoặc PDF)</Label>
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setPaymentFile(e.target.files?.[0] || null)}
              />
            </div> */}

            {/* --- Confirm button --- */}
            <Button
              onClick={handlePaymentConfirm}
              // disabled={!paymentFile || isPaymentSubmitting}
              className="w-full"
            >
              {isPaymentSubmitting ? "Đang xử lý..." : "Xác nhận đã thanh toán"}
            </Button>
          </CardContent>
        </Card>
      )}



      {/* Success Dialog */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="max-w-md text-sm font-[Be_Vietnam_Pro]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600 font-semibold">
              <Check className="h-5 w-5" />
              Đặt thuê thành công!
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Yêu cầu đặt thuê của bạn đã được gửi thành công. Chúng tôi sẽ liên hệ với bạn trong thời gian sớm nhất.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => {
              resetForm()
              setShowSuccess(false)
              setTimeout(() => setStep("select"), 200)
            }} className="flex-1">
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
function get(arg0: DatabaseReference) {
  throw new Error("Function not implemented.")
}

