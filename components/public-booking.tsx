"use client"

import { useState, useEffect } from "react"
import { get, ref, onValue, push } from "firebase/database"
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
import { CameraIcon, CalendarIcon, Clock, Check, Mail, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

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
  available: number
  description: string
  specifications: string
  status: "active" | "maintenance" | "retired"
  images?: string[]
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
  depositMethod: string
}

interface PaymentInfo {
  qrUrl?: string
  bankName: string
  accountNumber: string
  accountHolder: string
  paymentSyntax: string
}

interface BookedPeriod {
  startDate: Date
  endDate: Date
  startTime: string
  endTime: string
  status: string
}

const normalizeDate = (d: string | Date) => {
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  return date
}

const isSameDay = (a: Date, b: Date) => {
  return normalizeDate(a).getTime() === normalizeDate(b).getTime()
}

const timesOverlap = (es: string, ee: string, ns: string, ne: string) => {
  const toHour = (t: string) => parseInt(t.split(':')[0], 10)
  const esh = toHour(es || '00:00')
  const eeh = toHour(ee || '23:59')
  const nsh = toHour(ns || '00:00')
  const neh = toHour(ne || '23:59')
  return !(neh <= esh || nsh >= eeh)
}

export function PublicBooking() {
  const [cameras, setCameras] = useState<CameraType[]>([])
  const [availableCameras, setAvailableCameras] = useState<CameraType[]>([])
  const [selectedCamera, setSelectedCamera] = useState<CameraType | null>(null)
  const [bookingForm, setBookingForm] = useState<BookingForm>({
    cameraId: "",
    startDate: null,
    endDate: null,
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    notes: "",
    depositMethod: ""
  })
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isEndPopoverOpen, setIsEndPopoverOpen] = useState(false);
  const [step, setStep] = useState<"dates" | "select" | "details" | "confirm">("dates")
  const [availableCameras, setAvailableCameras] = useState<CameraType[]>([])
  const [showSuccess, setShowSuccess] = useState(false)
  const [stepError, setStepError] = useState("")
  const [phoneError, setPhoneError] = useState<string>("")
  const [isConfirmSubmitting, setIsConfirmSubmitting] = useState(false)
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null)
  const [bookedPeriodsByCamera, setBookedPeriodsByCamera] = useState<Record<string, BookedPeriod[]>>({}) // Modified: periods instead of dates
  const [showGallery, setShowGallery] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const invalidBookingStatuses = ["pending", "confirmed", "active"];

  const { toast } = useToast()

  useEffect(() => {
    if (!showSuccess) return
    const timer = setTimeout(() => {
      setShowSuccess(false)
      setStep("dates")
    }, 3000)
    return () => clearTimeout(timer)
  }, [showSuccess])

  // Fetch all active cameras
  useEffect(() => {
    const camerasRef = ref(db, "cameras")

    const unsubscribe = onValue(camerasRef, (snapshot) => {
      const camerasData = snapshot.exists() ? snapshot.val() : {}

      const cameraList = Object.entries(camerasData)
        .map(([id, camValue]) => {
          const cam = camValue as Omit<CameraType, "id">
          return { id, ...cam }
        })
        .filter((c) => c.status === "active" && c.available === 1)

      setCameras(cameraList)
    })
  }, [])

  // Fetch all bookings and compute booked dates per camera
  // Fetch all bookings and compute booked periods per camera (modified)
  useEffect(() => {
    const bookingsRef = ref(db, "bookings")

    const unsubscribe = onValue(bookingsRef, (snapshot) => {
      const bookingsData = snapshot.exists() ? snapshot.val() : {}
      const bookedMap: Record<string, BookedPeriod[]> = {}

      Object.values(bookingsData).forEach((b: any) => {
        if (!b || !["pending", "confirmed", "active", "overtime"].includes(b.status)) return
        if (!b.startDate || !b.endDate) return // Skip invalid

        const cameraId = b.cameraId
        if (!bookedMap[cameraId]) bookedMap[cameraId] = []

        bookedMap[cameraId].push({
          startDate: new Date(b.startDate),
          endDate: new Date(b.endDate),
          startTime: b.startTime || '00:00', // Default full day if missing
          endTime: b.endTime || '23:59',
          status: b.status
        })
      })

      setBookedPeriodsByCamera(bookedMap)
    })

    return () => unsubscribe()
  }, [])

  // Filter available cameras based on selected dates and times (modified)
  useEffect(() => {
    if (!bookingForm.startDate || !bookingForm.endDate || !bookingForm.startTime || !bookingForm.endTime) {
      setAvailableCameras([])
      return
    }

    const selectedStart = normalizeDate(bookingForm.startDate)
    const selectedEnd = normalizeDate(bookingForm.endDate)
    const selectedStartTime = bookingForm.startTime
    const selectedEndTime = bookingForm.endTime

    const filtered = cameras.filter((camera) => {
      const periods = bookedPeriodsByCamera[camera.id] || []
      const hasOverlap = periods.some((period) => {
        const pStart = normalizeDate(period.startDate)
        const pEnd = normalizeDate(period.endDate)

        if (selectedEnd < pStart || selectedStart > pEnd) return false // No date overlap

        // If multi-day or different days, consider overlap
        if (!isSameDay(selectedStart, selectedEnd) || !isSameDay(pStart, pEnd)) return true

        // Same day: check times
        return timesOverlap(period.startTime, period.endTime, selectedStartTime, selectedEndTime)
      })

      return !hasOverlap
    })

    setAvailableCameras(filtered)
  }, [bookingForm.startDate, bookingForm.endDate, bookingForm.startTime, bookingForm.endTime, cameras, bookedPeriodsByCamera])

  const handleCameraSelect = (camera: CameraType) => {
    setSelectedCamera(camera)
    setBookingForm((prev) => ({ ...prev, cameraId: camera.id }))
    setStep("details")
  }

  const timeOptions = [
    { label: "7:00 sáng", value: 7 },
    { label: "8:00 sáng", value: 8 },
    { label: "9:00 sáng", value: 9 },
    { label: "10:00 sáng", value: 10 },
    { label: "11:00 trưa", value: 11 },
    { label: "12:00 trưa", value: 12 },
    { label: "13:00 chiều", value: 13 },
    { label: "14:00 chiều", value: 14 },
    { label: "15:00 chiều", value: 15 },
    { label: "16:00 chiều", value: 16 },
    { label: "17:00 chiều", value: 17 },
    { label: "18:00 chiều", value: 18 },
    { label: "19:00 tối", value: 19 },
    { label: "20:00 tối", value: 20 },
    { label: "21:00 tối", value: 21 },
    { label: "22:00 tối", value: 22 },
  ]

  const isEndTimeDisabled = (endHour: number) => {
    if (!bookingForm.startTime || !bookingForm.startDate || !bookingForm.endDate)
      return false

    const startHour = Number(bookingForm.startTime.split(":")[0])
    const sameDay =
      bookingForm.startDate.getTime() === bookingForm.endDate.getTime()

    if (sameDay && endHour <= startHour) return true

    return false
  }

  const handleDateSelect = () => {
    if (!bookingForm.startDate || !bookingForm.endDate) {
      toast({ title: "Lỗi", description: "Vui lòng chọn ngày", variant: "destructive" })
      return
    }

    if (availableCameras.length === 0) {
      toast({
        title: "Không có máy sẵn",
        description: "Không có máy ảnh nào sẵn sàng trong khoảng thời gian này. Vui lòng chọn thời gian khác.",
        variant: "destructive",
      })
      return
    }

    setStep("select")
  }

  const handleDetailsSubmit = () => {
    if (!bookingForm.customerName || !bookingForm.customerPhone || !bookingForm.customerEmail) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập đầy đủ thông tin khách hàng",
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
        startDate: format(bookingForm.startDate, "yyyy-MM-dd"),
        endDate: format(bookingForm.endDate, "yyyy-MM-dd"),
        startTime: bookingForm.startTime || "",
        endTime: bookingForm.endTime || "",
        totalDays: calculateTotalDays(),
        dailyRate: getPricingInfo().rate,
        totalAmount: calculateTotalAmount(),
        status: "pending",
        createdAt: new Date().toISOString(),
        notes: bookingForm.notes,
        depositMethod: bookingForm.depositMethod
      }

      await push(ref(db, "bookings"), newBooking)
      setShowSuccess(true)
      resetForm()
      setTimeout(() => {
        // Thử mở Instagram App trước
        window.location.href = "instagram://user?username=chupchoet.digicam";

        // Sau 600ms nếu không có app → fallback sang web
        setTimeout(() => {
          window.location.href = "https://www.instagram.com/chupchoet.digicam/";
        }, 600);
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
      startTime: "",
      endTime: "",
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      notes: "",
      depositMethod: ""
    })
    setStep("dates")
    setPhoneError("")
    setStepError("")
  }

  const isFormValid = () => {
    return (
      bookingForm.customerName.trim() !== "" &&
      bookingForm.customerEmail.trim() !== "" &&
      bookingForm.customerPhone.trim() !== "" &&
      bookingForm.startDate &&
      bookingForm.endDate &&
      /^[0-9]{9,11}$/.test(bookingForm.customerPhone) &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookingForm.customerEmail)
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
        if (snapshot.exists()) {
          setPaymentInfo(snapshot.val() as PaymentInfo)
        }
      } catch (error) {
        console.error("Lỗi khi lấy payment info:", error)
      }
    }

    fetchPaymentInfo()
  }, [])

  const stepsConfig = [
    { key: "dates", label: "Chọn ngày", icon: CalendarIcon },
    { key: "select", label: "Chọn máy ảnh", icon: CameraIcon },
    { key: "select", label: "Chọn máy ảnh", icon: CameraIcon },
    { key: "details", label: "Thông tin khách", icon: User },
    { key: "confirm", label: "Xác nhận", icon: Check },
  ] as const

  const validateStep = (key: (typeof stepsConfig)[number]["key"]) => {
    if (key === "dates" && !isDayValid())
      return "Vui lòng chọn ngày thuê và ngày trả"
    if (key === "select" && !selectedCamera) return "Vui lòng chọn máy ảnh"
    if (key === "select" && !selectedCamera) return "Vui lòng chọn máy ảnh"
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
      return 0
    }

    const diffDate = Math.ceil(
      (normalizeDate(bookingForm.endDate).getTime() - normalizeDate(bookingForm.startDate).getTime()) /
      (1000 * 60 * 60 * 24)
    ) + 1
    return diffDate
  }

  const calculateTotalHours = () => {
    if (
      !bookingForm.startDate ||
      !bookingForm.endDate ||
      !bookingForm.startTime ||
      !bookingForm.endTime
    ) {
      return 0
    }

    const [sh, sm] = bookingForm.startTime.split(":").map(Number)
    const [eh, em] = bookingForm.endTime.split(":").map(Number)

    const startDateTime = new Date(bookingForm.startDate)
    startDateTime.setHours(sh, sm, 0, 0)

    const endDateTime = new Date(bookingForm.endDate)
    endDateTime.setHours(eh, em, 0, 0)

    if (endDateTime <= startDateTime) {
      return 0
    }

    const diffHours = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60)
    return diffHours
  }

  const getPricingInfo = () => {
    const hours = calculateTotalHours()
    if (hours === null || hours === undefined || hours === 0 || !selectedCamera) {
      return { rate: 0, label: "", total: 0 }
    }
    let rate: number
    let label: string

    if (hours > 6 && selectedCamera.fullDayRate > 0) {
      rate = selectedCamera.fullDayRate
      label = "1 ngày trở lên"
    } else {
      rate = selectedCamera.ondayRate || 0
      label = "Trong ngày"
    }

    const days = Math.ceil(hours / 24)
    const total = days * rate

    return { rate, label, total }
  }

  const calculateTotalAmount = () => {
    return getPricingInfo().total
  }

  return (
    <div className="space-y-8 px-4 sm:px-6 md:px-8">
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">Đặt thuê máy ảnh</h2>
        <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
          Chọn thời gian thuê và máy ảnh phù hợp với nhu cầu của bạn
        </p>
      </div>

      {/* Progress Steps */}
      <Card className="max-w-4xl mx-auto">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {stepsConfig.map((stepItem, index) => {
              const Icon = stepItem.icon
              const isActive = step === stepItem.key
              const isCompleted = stepsConfig.findIndex((s) => s.key === step) > index

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
                      isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
                    )}
                  >
                    {stepItem.label}
                  </div>
                </div>
              )
            })}
          </div>
          {stepError && <p className="text-sm text-red-500 text-center mt-4">{stepError}</p>}
        </CardContent>
      </Card>

      {/* Step 1: Date Selection */}
      {step === "dates" && (
        <Card className="max-w-3xl mx-auto shadow-lg">
          <CardHeader className="text-center">
            <CardDescription className="text-base font-bold">
              Chọn ngày bắt đầu và ngày kết thúc thuê máy
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8">

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-primary rounded-sm" />
                <span>Ngày nhận máy</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-400 rounded-sm" />
                <span>Ngày trả máy</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-sm" />
                <span>Không khả dụng</span>
              </div>
            </div>

            {/* Date Selectors */}
            <div className="grid md:grid-cols-2 gap-8">

              {/* Start Date */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Ngày bắt đầu</Label>

                <div className="grid grid-cols-2 gap-3">
                  {/* Calendar */}
                  <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left text-sm sm:text-base truncate"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                        {bookingForm.startDate
                          ? new Date(bookingForm.startDate).toLocaleDateString("vi-VN")
                          : "Ngày nhận"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white dark:bg-gray-900">
                      <Calendar
                        mode="single"
                        selected={bookingForm.startDate || undefined}
                        onSelect={(date) => {
                          setBookingForm((prev) => ({
                            ...prev,
                            startDate: date || null,
                            endDate: null,
                          }));
                          setIsPopoverOpen(false);
                        }}
                        disabled={(date) => {
                          const isBooked = bookedDates.some(
                            (d) => d.toDateString() === date.toDateString()
                          );
                          const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                          return isBooked || isPast;
                        }}
                        modifiers={{ booked: bookedDates }}
                        modifiersStyles={{
                          booked: {
                            backgroundColor: "#f87171",
                            color: "#fff",
                            borderRadius: "50%",
                          },
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  {/* Time */}
                  <Select
                    value={bookingForm.startTime || ""}
                    onValueChange={(value) =>
                      setBookingForm((prev) => ({
                        ...prev,
                        startTime: value,
                        endTime: "",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Giờ nhận" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-300 shadow-md">
                      {timeOptions.map((t) => (
                        <SelectItem key={t.value} value={`${t.value}:00`}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* End Date */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Ngày kết thúc</Label>

                <div className="grid grid-cols-2 gap-3">
                  <Popover open={isEndPopoverOpen} onOpenChange={setIsEndPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left text-sm sm:text-base truncate"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                        {bookingForm.endDate
                          ? new Date(bookingForm.endDate).toLocaleDateString("vi-VN")
                          : "Ngày trả"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white dark:bg-gray-900">
                      <Calendar
                        mode="single"
                        selected={bookingForm.endDate || undefined}
                        onSelect={(date) => {
                          setBookingForm((prev) => ({
                            ...prev,
                            endDate: date || null,
                            endTime: "",
                          }));
                          setIsEndPopoverOpen(false); // <-- Đóng Popover ngay khi chọn ngày
                        }}
                        disabled={(date) => {
                          const isBeforeStart =
                            bookingForm.startDate && date < bookingForm.startDate;
                          const isBooked = bookedDates.some(
                            (d) => d.toDateString() === date.toDateString()
                          );
                          return isBeforeStart || isBooked;
                        }}
                        modifiers={{ booked: bookedDates }}
                        modifiersStyles={{
                          booked: {
                            backgroundColor: "#f87171",
                            color: "#fff",
                            borderRadius: "50%",
                          },
                        }}
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
                    <SelectContent className="bg-white border border-gray-300 shadow-md">
                      {timeOptions.map((t) => (
                        <SelectItem
                          key={t.value}
                          value={`${t.value}:00`}
                          disabled={isEndTimeDisabled(t.value)}
                        >
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="sm:w-auto w-full"
                onClick={() => setStep("select")}
              >
                Quay lại
              </Button>

              <Button
                className="flex-1"
                disabled={!isDayValid()}
                onClick={() => {
                  handleDateSelect();
                  document
                    .getElementById("booking-section")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Tiếp tục
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Camera Selection */}
      {step === "select" && (
        <>
          {/* Gallery Overlay */}
          {showGallery && selectedCamera && selectedCamera.images && selectedCamera.images?.length > 0 && (
            <div className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center select-none">

              {/* Close */}
              <button
                onClick={() => setShowGallery(false)}
                className="
                  absolute top-4 right-4
                  w-12 h-12 sm:w-14 sm:h-14
                  bg-white/20 hover:bg-white/40
                  backdrop-blur-md
                  rounded-full flex items-center justify-center
                  text-black text-3xl
                  transition shadow-lg
                  z-50
                "
              >
                ✕
              </button>

              {/* Main image container */}
              <div className="relative w-full max-w-6xl h-full flex items-center justify-center px-4">

                {/* Prev button */}
                <button
                  onClick={() =>
                    setActiveIndex((prev) =>
                      prev > 0 ? prev - 1 : (selectedCamera.images?.length ?? 0) - 1
                    )
                  }
                  className="
                    absolute left-2 sm:left-4 md:left-10 top-1/2 -translate-y-1/2
                    w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20
                    bg-white/20 hover:bg-white/40 backdrop-blur-lg
                    rounded-full flex items-center justify-center
                    text-black transition shadow-2xl z-40
                  "
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-10 h-10 md:w-14 md:h-14"
                  >
                    <polyline points="15 18 9 12 15 6" />
                  </svg>


                </button>

                {/* Image */}
                <img
                  src={selectedCamera.images[activeIndex]}
                  alt="gallery"
                  className="
                    max-h-[90vh] max-w-[90vw]
                    object-contain rounded-lg
                    transition-all duration-300
                    shadow-2xl
                  "
                />

                {/* Next button */}
                <button
                  onClick={() =>
                    setActiveIndex((prev) =>
                      prev < (selectedCamera.images?.length || 0) - 1 ? prev + 1 : 0
                    )
                  }
                  className=" 
                    absolute right-2 sm:right-4 md:right-10 top-1/2 -translate-y-1/2
                    w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20
                    bg-white/20 hover:bg-white/40 backdrop-blur-lg
                    rounded-full flex items-center justify-center
                    text-black transition shadow-2xl z-40
                  "
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-10 h-10 md:w-14 md:h-14"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>


                </button>
              </div>
            </div>
          )}


          {/* Camera list */}
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {availableCameras.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CameraIcon className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Không có máy ảnh sẵn sàng</h3>
                  <p className="text-muted-foreground text-center">
                    Tất cả máy ảnh đang được thuê hoặc bảo trì trong khoảng thời gian này. Vui lòng chọn thời gian khác.
                  </p>
                </CardContent>
              </Card>
            ) : (
              availableCameras.map((camera) => {
                const imageCount = camera.images?.length || 0
                const visibleImages = camera.images?.slice(0, 3) || []
                const extraCount = imageCount > 3 ? imageCount - 3 : 0

                return (
                  <Card
                    key={camera.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow flex flex-col"
                    onClick={() => handleCameraSelect(camera)}
                  >
                    <div className="grid grid-cols-3 gap-1 p-2">
                      {visibleImages.map((img, idx) => (
                        <div key={idx} className="relative aspect-square overflow-hidden rounded-md">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedCamera(camera)
                              setShowGallery(true)
                              setActiveIndex(idx)
                            }}
                            className="w-full h-full"
                          >
                            <img
                              src={img}
                              alt={`Ảnh ${idx + 1}`}
                              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 rounded-md"
                            />
                            {idx === 2 && extraCount > 0 && (
                              <div className="absolute inset-0 bg-black/60 text-white text-xl font-semibold flex items-center justify-center rounded-md hover:bg-black/70 transition">
                                +{extraCount}
                              </div>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>

                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <CameraIcon className="h-5 w-5 text-primary" />
                        <div>
                          <CardTitle className="text-lg font-semibold">{camera.name}</CardTitle>
                          <CardDescription className="text-sm text-muted-foreground">
                            {camera.brand} {camera.model}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3 flex-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Loại máy</Label>
                        <Badge variant="secondary">{camera.category}</Badge>
                      </div>

                      {camera.description && (
                        <div>
                          <Label className="block mb-1 text-sm font-medium">Mô tả</Label>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {camera.description}
                          </p>
                        </div>
                      )}

                      {camera.specifications && (
                        <div>
                          <Label className="block mb-1 text-sm font-medium">Thông số</Label>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {camera.specifications}
                          </p>
                        </div>
                      )}
                    </CardContent>

                    <div className="p-4 pt-0">
                      <Button
                        variant="default"
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCameraSelect(camera)
                          document.getElementById("booking-section")?.scrollIntoView({ behavior: "smooth" })
                        }}
                      >
                        Chọn máy này
                      </Button>
                    </div>
                  </Card>
                )
              })
            )}
          </div>
        </>
      )}

      {/* Step 3: Customer Details */}
      {step === "details" && (
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle>Thông tin khách hàng</CardTitle>
            <CardDescription>
              Vui lòng điền đầy đủ thông tin để hoàn tất đặt thuê
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Form grid responsive 1 → 2 cột */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

              {/* Họ và tên */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Họ và tên *
                </Label>
                <Input
                  id="name"
                  value={bookingForm.customerName}
                  onChange={(e) =>
                    setBookingForm((prev) => ({ ...prev, customerName: e.target.value }))
                  }
                  placeholder="Nhập họ và tên"
                />
              </div>

              {/* Số điện thoại */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  Số điện thoại *
                </Label>
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
                      setPhoneError("Số điện thoại phải có từ 9-11 chữ số")
                    }
                  }}
                  placeholder="Nhập số điện thoại"
                />
                {phoneError && <p className="text-sm text-red-500">{phoneError}</p>}
              </div>

              {/* Email */}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={bookingForm.customerEmail}
                  onChange={(e) =>
                    setBookingForm((prev) => ({ ...prev, customerEmail: e.target.value }))
                  }
                  placeholder="Nhập địa chỉ email"
                />
              </div>

              {/* Ghi chú */}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes" className="text-sm font-medium">
                  Ghi chú
                </Label>
                <Textarea
                  id="notes"
                  value={bookingForm.notes}
                  onChange={(e) =>
                    setBookingForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Ghi chú thêm về yêu cầu thuê máy (tùy chọn)"
                  rows={3}
                />
              </div>
            </div>

            {/* Deposit method */}
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-sm font-semibold">Phương thức cọc máy</Label>

              <Select
                value={bookingForm.depositMethod}
                onValueChange={(value) =>
                  setBookingForm((prev) => ({ ...prev, depositMethod: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn phương thức cọc" />
                </SelectTrigger>

                <SelectContent className="bg-white dark:bg-gray-900">
                  <SelectItem value="cccd-taisan">
                    Cọc CCCD + tài sản tương đương (Laptop, Macbook, xe máy,...)
                  </SelectItem>
                  <SelectItem value="cccd-80">
                    Cọc CCCD + 80% giá trị máy
                  </SelectItem>
                  <SelectItem value="100">
                    Cọc 100% giá trị máy
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>


            {/* Buttons */}
            <div className="flex flex-col sm:flex-row justify-between gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setStep("select")}
                className="w-full sm:w-auto"
              >
                Quay lại
              </Button>
              <Button
                onClick={() => {
                  handleDetailsSubmit();
                  document
                    .getElementById("booking-section")
                    ?.scrollIntoView({ behavior: "smooth" });
                }} disabled={!isFormValid()}
                className="w-full sm:w-auto sm:flex-1"
              >
                Xem lại đơn hàng
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Confirmation */}
      {step === "confirm" && selectedCamera && (
        <Card className="max-w-4xl mx-auto w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl md:text-2xl text-center font-bold">
              Xác nhận đặt thuê
            </CardTitle>
            <CardDescription className="text-center mt-1 leading-tight alert-blink">
              Khách hàng vui lòng gửi bill chuyển khoản về Fanpage hoặc Instagram
            </CardDescription>
            <CardDescription className="text-center leading-tight alert-blink">
              Nếu không shop sẽ không xác nhận đơn
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div className="space-y-2">
                {/* Camera Info */}
                <div className="flex items-center gap-2 p-3 border rounded-lg justify-center md:justify-start mx-auto md:mx-0">
                  <CameraIcon className="h-8 w-8 text-primary" />
                  <div className="text-center md:text-left">
                    <h3 className="font-semibold text-sm">{selectedCamera.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedCamera.brand} {selectedCamera.model}
                    </p>
                  </div>
                </div>

                {/* Thông tin thuê */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">

                  <div className="space-y-1">
                    <div className="flex items-start gap-2 leading-tight">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Thời gian thuê</p>
                        <p className="text-muted-foreground">
                          {bookingForm.startDate &&
                            format(bookingForm.startDate, "dd/MM/yyyy", { locale: vi })}
                          {" - "}
                          {bookingForm.endDate &&
                            format(bookingForm.endDate, "dd/MM/yyyy", { locale: vi })}
                        </p>
                        <p className="text-muted-foreground">
                          Nhận: <b>{bookingForm.startTime || "Chưa chọn"}</b> | Trả: <b>{bookingForm.endTime || "Chưa chọn"}</b>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 leading-tight">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Số ngày</p>
                        <p className="text-muted-foreground">{calculateTotalDays()} ngày</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 leading-tight">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Khách hàng</p>
                        <p className="text-muted-foreground">{bookingForm.customerName}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 leading-tight">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Liên hệ</p>
                        <p className="text-muted-foreground">{bookingForm.customerEmail}</p>
                        <p className="text-muted-foreground">{bookingForm.customerPhone}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {bookingForm.notes && (
                  <div className="p-2 bg-muted/50 rounded-lg text-sm leading-tight">
                    <p className="font-medium mb-1">Ghi chú:</p>
                    <p className="text-muted-foreground">{bookingForm.notes}</p>
                  </div>
                )}

                {/*DepositMethod*/}
                {bookingForm.depositMethod && (
                  <div className="p-2 bg-muted/50 font-bold rounded-lg text-sm leading-tight">
                    <p className="font-medium mb-1">Phương thức cọc máy:</p>
                    <p className="text-muted-foreground">
                      {bookingForm.depositMethod === "cccd-taisan" &&
                        "Cọc CCCD + tài sản tương đương (Laptop, Macbook, xe máy,...)"}
                    </p>
                    <p className="text-muted-foreground">
                      {bookingForm.depositMethod === "cccd-80" && "Cọc CCCD + 80% giá trị máy"}
                    </p>
                    <p className="text-muted-foreground">
                      {bookingForm.depositMethod === "100" && "Cọc 100% giá trị máy"}
                    </p>
                  </div>)}

                {/* Total */}
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="py-2">
                    <div className="flex justify-between text-base font-semibold">
                      <span>Tổng cộng:</span>
                      <span className="text-primary">
                        {calculateTotalAmount().toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-col items-center text-center space-y-3 md:border-l md:pl-4">
                <h3 className="text-base font-semibold">Thông tin thanh toán</h3>

                {paymentInfo ? (
                  <>
                    {paymentInfo.qrUrl && (
                      <div className="w-36 h-36 border rounded-lg overflow-hidden bg-white">
                        <img
                          src={paymentInfo.qrUrl}
                          alt="QR"
                          className="object-contain w-full h-full p-1"
                        />
                      </div>
                    )}

                    <div className="text-sm space-y-1 leading-tight">
                      <p>Ngân hàng: <b>{paymentInfo.bankName}</b></p>
                      <p>Số TK: <b>{paymentInfo.accountNumber}</b></p>
                      <p>Chủ TK: <b>{paymentInfo.accountHolder}</b></p>
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
                  <p className="text-sm text-muted-foreground italic">Đang tải...</p>
                )}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep("details")} className="w-full sm:w-auto">
                Quay lại
              </Button>
              <Button
                onClick={handleConfirmSubmit}
                className="w-full sm:flex-1"
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600 font-semibold">
              <Check className="h-5 w-5" />
              Đặt thuê thành công!
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Yêu cầu đặt thuê của bạn đã được gửi thành công. Chúng tôi sẽ liên hệ với bạn trong
              thời gian sớm nhất.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                resetForm()
                setShowSuccess(false)
              }}
              className="flex-1"
            >
              Đóng
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
