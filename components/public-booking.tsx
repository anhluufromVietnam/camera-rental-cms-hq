"use client"

import { useState, useEffect } from "react"
import { get, ref, onValue, push } from "firebase/database"
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

interface PaymentInfo {
  qrUrl?: string
  bankName: string
  accountNumber: string
  accountHolder: string
  paymentSyntax: string
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
  const [showSuccess, setShowSuccess] = useState(false)
  const [stepError, setStepError] = useState("")
  const [_, setPhoneError] = useState<string>("")
  const [isConfirmSubmitting, setIsConfirmSubmitting] = useState(false)
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null)
  const [bookedDates, setBookedDates] = useState<Date[]>([])

  const { toast } = useToast()
  useEffect(() => {
    if (!showSuccess) return
    const timer = setTimeout(() => {
      setShowSuccess(false)
      setStep("select")
    }, 3000)
    return () => clearTimeout(timer)
  }, [showSuccess])

  // Fetch available cameras (only active ones)
  useEffect(() => {
    const camerasRef = ref(db, "cameras");

    const unsubscribe = onValue(camerasRef, (snapshot) => {
      const camerasData = snapshot.exists() ? snapshot.val() : {};

      const cameraList = Object.entries(camerasData)
        .map(([id, camValue]) => {
          const cam = camValue as Omit<CameraType, "id">;
          return { id, ...cam };
        })
        .filter((c) => c.status === "active"); 

      setCameras(cameraList);
    });

    return () => unsubscribe();
  }, []);


  // Fetch booked dates for the selected camera
  useEffect(() => {
    if (!selectedCamera?.id) return

    const fetchBookedDates = async () => {
      try {
        const snap = await get(ref(db, "bookings"))
        if (!snap.exists()) return

        const allBookings = Object.values(snap.val())

        const dates: Date[] = []

        allBookings.forEach((b: any) => {
          if (!b || b.cameraId !== selectedCamera.id) return
          if (!["pending", "confirmed"].includes(b.status)) return

          const start = new Date(b.startDate)
          const end = new Date(b.endDate)

          // Lấy tất cả các ngày trong khoảng start → end
          const current = new Date(start)
          while (current <= end) {
            dates.push(new Date(current))
            current.setDate(current.getDate() + 1)
          }
        })

        setBookedDates(dates)
      } catch (err) {
        console.error("Lỗi khi tải ngày đã đặt:", err)
      }
    }

    fetchBookedDates()
  }, [selectedCamera])

  const handleCameraSelect = (camera: CameraType) => {
    setSelectedCamera(camera)
    setBookingForm((prev) => ({ ...prev, cameraId: camera.id }))
    setStep("dates")
  }

  const handleDateSelect = async () => {
    if (!bookingForm.startDate || !bookingForm.endDate) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn ngày bắt đầu và ngày kết thúc.",
        variant: "destructive",
      })
      return
    }

    try {
      const bookingsSnap = await get(ref(db, "bookings"))
      if (bookingsSnap.exists()) {
        const allBookings = Object.values(bookingsSnap.val())
        const selectedCameraId = selectedCamera?.id

        if (!selectedCameraId) {
          toast({
            title: "Lỗi",
            description: "Không xác định được máy ảnh.",
            variant: "destructive",
          })
          return
        }

        const selectedStart = new Date(bookingForm.startDate)
        const selectedEnd = new Date(bookingForm.endDate)

        selectedStart.setHours(0, 0, 0, 0)
        selectedEnd.setHours(23, 59, 59, 999)

        const isOverlap = allBookings.some((b: any) => {
          if (!b || b.cameraId !== selectedCameraId) return false
          if (!b.startDate || !b.endDate) return false
          if (!["pending", "confirmed"].includes(b.status)) return false

          const start = new Date(b.startDate)
          const end = new Date(b.endDate)

          start.setHours(0, 0, 0, 0)
          end.setHours(23, 59, 59, 999)

          return selectedStart <= end && selectedEnd >= start
        })

        if (isOverlap) {
          toast({
            title: "Trùng lịch thuê",
            description:
              "Máy ảnh này chưa được trả trong ngày bạn chọn. Vui lòng chọn thời gian khác (sau ngày trả).",
            variant: "destructive",
          })
          return
        }
      }
    } catch (error) {
      console.error("Lỗi khi kiểm tra trùng lịch:", error)
      toast({
        title: "Lỗi kiểm tra lịch",
        description: "Không thể kiểm tra lịch đặt máy. Vui lòng thử lại sau.",
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

    if (!selectedCamera) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng tải lên ảnh xác nhận thanh toán",
        variant: "destructive",
      })
      return
    }

    setStep("confirm")
  }

  const handleConfirmSubmit = async () => {
    if (!selectedCamera || !bookingForm.startDate || !bookingForm.endDate) {
      toast({
        title: "Lỗi",
        description: "Thiếu thông tin đặt thuê, vui lòng thử lại",
        variant: "destructive",
      })
      return
    }

    setIsConfirmSubmitting(true)

    try {
      const newBooking = {
        customerName: bookingForm.customerName,
        customerEmail: bookingForm.customerEmail,
        customerPhone: bookingForm.customerPhone,
        cameraId: selectedCamera.id,
        cameraName: selectedCamera.name,
        startDate: format(bookingForm.startDate!, "yyyy-MM-dd"),
        endDate: format(bookingForm.endDate!, "yyyy-MM-dd"),
        startTime: bookingForm.startTime || "",
        endTime: bookingForm.endTime || "",
        totalDays: calculateTotalDays(),
        dailyRate: getPricingInfo().rate,
        totalAmount: calculateTotalAmount(),
        status: "pending",
        createdAt: new Date().toISOString(),
        notes: bookingForm.notes,
      }

      await push(ref(db, "bookings"), newBooking)
      setShowSuccess(true)
      resetForm()
      setTimeout(() => {
        window.open("https://www.facebook.com/messages/t/1294650282213798/")
      }, 1200)
    } catch (err) {
      console.error("Lỗi khi tạo booking:", err)
      toast({
        title: "Lỗi",
        description: "Không thể hoàn tất đặt máy",
        variant: "destructive",
      })
    } finally {
      setIsConfirmSubmitting(false)
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

  const isDayValid = () => {
    return (
      bookingForm.startDate &&
      bookingForm.endDate &&
      bookingForm.startTime &&
      bookingForm.endTime
    )
  }

  useEffect(() => {
    const fetchPaymentInfo = async () => {
      try {
        const snapshot = await get(ref(db, "settings"))
        console.log("✅ Snapshot exists:", snapshot.exists())
        console.log("📦 Snapshot value:", snapshot.val())

        if (snapshot.exists()) {
          setPaymentInfo(snapshot.val() as PaymentInfo)
        } else {
          console.warn("⚠️ Không tìm thấy dữ liệu trong /settings")
        }
      } catch (error) {
        console.error("❌ Lỗi khi lấy payment info:", error)
      }
    }

    fetchPaymentInfo()
  }, [])


  const stepsConfig = [
    { key: "select", label: "Chọn máy ảnh", icon: CameraIcon },
    { key: "dates", label: "Chọn ngày", icon: CalendarIcon },
    { key: "details", label: "Thông tin khách", icon: User },
    { key: "confirm", label: "Xác nhận", icon: Check },
  ] as const

  const validateStep = (key: (typeof stepsConfig)[number]["key"]) => {
    if (key === "select" && !selectedCamera) return "Vui lòng chọn máy ảnh"
    if (key === "dates" && (!isDayValid()))
      return "Vui lòng chọn ngày thuê và ngày trả"
    if (key === "confirm" && !isFormValid())
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

            {/* 🟢 Legend hướng dẫn */}
            <div className="flex items-center justify-center w-full gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-primary rounded-sm" /> <span>Ngày đã chọn</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-400 rounded-sm" /> <span>Đã được đặt</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-gray-200 rounded-sm border" /> <span>Không khả dụng</span>
              </div>
            </div>

            {/* 📅 Grid chọn ngày bắt đầu và kết thúc */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* ---- Ngày bắt đầu ---- */}
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
                        onSelect={(date) =>
                          setBookingForm((prev) => ({
                            ...prev,
                            startDate: date || null,
                            endDate: null,
                          }))
                        }
                        disabled={(date) => {
                          const isBooked = bookedDates.some(
                            (d) => d.toDateString() === date.toDateString()
                          );
                          const isPast = date < new Date();
                          return isBooked || isPast;
                        }}
                        modifiers={{
                          booked: bookedDates,
                        }}
                        modifiersStyles={{
                          booked: { backgroundColor: "#f87171", color: "white", borderRadius: "50%"},
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <Select
                    value={bookingForm.startTime || ""}
                    onValueChange={(value) =>
                      setBookingForm((prev) => ({ ...prev, startTime: value }))
                    }
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

              {/* ---- Ngày kết thúc ---- */}
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
                        onSelect={(date) =>
                          setBookingForm((prev) => ({ ...prev, endDate: date || null }))
                        }
                        disabled={(date) => {
                          const isBeforeStart =
                            bookingForm.startDate && date < bookingForm.startDate;
                          const isBooked = bookedDates.some(
                            (d) => d.toDateString() === date.toDateString()
                          );
                          return isBeforeStart || isBooked;
                        }}
                        modifiers={{
                          booked: bookedDates,
                        }}
                        modifiersStyles={{
                          booked: { backgroundColor: "#f87171", color: "white", borderRadius: "50%"},
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <Select
                    value={bookingForm.endTime || ""}
                    onValueChange={(value) =>
                      setBookingForm((prev) => ({ ...prev, endTime: value }))
                    }
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

            {/* Hiển thị tóm tắt */}
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

            {/* Nút điều hướng */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("select")}>
                Quay lại
              </Button>
              <Button onClick={handleDateSelect} className="flex-1" disabled={!isDayValid()}>
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
        <Card className="max-w-4xl mx-auto w-full">
          <CardHeader>
            <CardTitle>Xác nhận đặt thuê</CardTitle>
            <CardDescription>
              Vui lòng kiểm tra lại thông tin trước khi thanh toán
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-8">
              {/* LEFT: Booking summary */}
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
                    {/* Ngày & giờ thuê */}
                    <div className="flex items-start gap-2">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground mt-1" />
                      <div>
                        <p className="text-sm font-[Be_Vietnam_Pro]">Thời gian thuê</p>
                        <p className="text-sm text-muted-foreground">
                          {bookingForm.startDate &&
                            format(bookingForm.startDate, "dd/MM/yyyy", { locale: vi })}{" "}
                          -{" "}
                          {bookingForm.endDate &&
                            format(bookingForm.endDate, "dd/MM/yyyy", { locale: vi })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Giờ nhận:{" "}
                          <b>
                            {bookingForm.startTime
                              ? bookingForm.startTime
                              : "Chưa chọn"}
                          </b>{" "}
                          | Giờ trả:{" "}
                          <b>
                            {bookingForm.endTime ? bookingForm.endTime : "Chưa chọn"}
                          </b>
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

                  {/* Khách hàng */}
                  {/* Khách hàng */}
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

              {/* RIGHT: Payment info */}
              <div className="flex flex-col items-center justify-center space-y-4 border-l pl-6 text-center">
                <h3 className="text-lg font-semibold font-[Be_Vietnam_Pro]">
                  Thông tin thanh toán
                </h3>

                {paymentInfo ? (
                  <>
                    {paymentInfo.qrUrl && (
                      <div className="w-48 h-48 border rounded-lg overflow-hidden bg-white">
                        <img
                          src={paymentInfo.qrUrl}
                          alt="Mã QR thanh toán"
                          className="object-contain w-full h-full p-2"
                        />
                      </div>
                    )}

                    <div className="text-sm mt-2 space-y-1 font-[Be_Vietnam_Pro]">
                      <p>
                        Ngân hàng: <b>{paymentInfo.bankName}</b>
                      </p>
                      <p>
                        Số TK: <b>{paymentInfo.accountNumber}</b>
                      </p>
                      <p>
                        Chủ TK: <b>{paymentInfo.accountHolder}</b>
                      </p>
                      <p>
                        Nội dung:{" "}
                        <b>
                          {paymentInfo.paymentSyntax
                            .replace("[Tên]", bookingForm.customerName || "Khách hàng")
                            .replace(
                              "[Ngày thuê]",
                              bookingForm.startDate
                                ? format(bookingForm.startDate, "dd/MM/yyyy", { locale: vi })
                                : "N/A"
                            )}
                        </b>
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Đang tải thông tin thanh toán...
                  </p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep("details")}>
                Quay lại
              </Button>
              <Button
                onClick={handleConfirmSubmit}
                className="flex-1"
                disabled={isConfirmSubmitting}
              >
                {isConfirmSubmitting ? "Đang xử lý..." : "Xác nhận & Thanh toán"}
              </Button>
            </div>
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
              setTimeout(() => setStep("select"), 3000)
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
