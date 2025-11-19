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
  const [phoneError, setPhoneError] = useState<string>("")
  const [isConfirmSubmitting, setIsConfirmSubmitting] = useState(false)
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null)
  const [bookedDates, setBookedDates] = useState<Date[]>([])
  const [showGallery, setShowGallery] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const { toast } = useToast()

  useEffect(() => {
    if (!showSuccess) return
    const timer = setTimeout(() => {
      setShowSuccess(false)
      setStep("select")
    }, 3000)
    return () => clearTimeout(timer)
  }, [showSuccess])

  // // Fetch booked dates for the selected camera
  // useEffect(() => {
  //   if (!selectedCamera?.id) return

  //   const fetchBookedDates = async () => {
  //     try {
  //       const snap = await get(ref(db, "bookings"))
  //       if (!snap.exists()) return

  //       const allBookings = Object.values(snap.val())

  //       const dates: Date[] = []

  //       allBookings.forEach((b: any) => {
  //         if (!b || b.cameraId !== selectedCamera.id) return
  //         if (!["pending", "confirmed"].includes(b.status)) return

  //         const start = new Date(b.startDate)
  //         const end = new Date(b.endDate)

  //         // Lấy tất cả các ngày trong khoảng start → end
  //         const current = new Date(start)
  //         while (current <= end) {
  //           dates.push(new Date(current))
  //           current.setDate(current.getDate() + 1)
  //         }
  //       })

  //       setBookedDates(dates)
  //     } catch (err) {
  //       console.error("Lỗi khi tải ngày đã đặt:", err)
  //     }
  //   }

  // Fetch available cameras (only active ones)
  useEffect(() => {
    const camerasRef = ref(db, "cameras")

    const unsubscribe = onValue(camerasRef, (snapshot) => {
      const camerasData = snapshot.exists() ? snapshot.val() : {}

      const cameraList = Object.entries(camerasData)
        .map(([id, camValue]) => {
          const cam = camValue as Omit<CameraType, "id">
          return { id, ...cam }
        })
        .filter((c) => c.status === "active")

      setCameras(cameraList)
    })

    return () => unsubscribe()
  }, [])

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

  const timeOptions = [
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

  const handleDateSelect = async () => {
    if (!bookingForm.startDate || !bookingForm.endDate) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn ngày bắt đầu và ngày kết thúc.",
        variant: "destructive",
      })
      return
    }

    if (!bookingForm.startTime || !bookingForm.endTime) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn giờ nhận và giờ trả.",
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
    if (!bookingForm.customerName || !bookingForm.customerPhone || !bookingForm.customerEmail) {
      toast({
        title: "Thiếu thông tin",
        description: "Vui lòng nhập đầy đủ thông tin khách hàng",
        variant: "destructive",
      })
      return
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(bookingForm.customerEmail)) {
      toast({
        title: "Email không hợp lệ",
        description: "Vui lòng nhập địa chỉ email hợp lệ",
        variant: "destructive",
      })
      return
    }

    // Validate phone
    const phoneRegex = /^[0-9]{9,11}$/
    if (!phoneRegex.test(bookingForm.customerPhone)) {
      toast({
        title: "Số điện thoại không hợp lệ",
        description: "Số điện thoại phải có từ 9-11 chữ số",
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
      }

      await push(ref(db, "bookings"), newBooking)
      setShowSuccess(true)
      resetForm()
      setTimeout(() => {
        window.open("https://www.facebook.com/messages/t/26322425147401520", "_blank")
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
    })
    setStep("select")
    setPhoneError("")
    setStepError("")
  }

  const isFormValid = () => {
    return (
      bookingForm.customerName &&
      bookingForm.customerEmail &&
      bookingForm.customerPhone &&
      bookingForm.startDate &&
      bookingForm.endDate &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookingForm.customerEmail) &&
      /^[0-9]{9,11}$/.test(bookingForm.customerPhone)
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
    { key: "select", label: "Chọn máy ảnh", icon: CameraIcon },
    { key: "dates", label: "Chọn ngày", icon: CalendarIcon },
    { key: "details", label: "Thông tin khách", icon: User },
    { key: "confirm", label: "Xác nhận", icon: Check },
  ] as const

  const validateStep = (key: (typeof stepsConfig)[number]["key"]) => {
    if (key === "select" && !selectedCamera) return "Vui lòng chọn máy ảnh"
    if (key === "dates" && !isDayValid())
      return "Vui lòng chọn ngày thuê và ngày trả"
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

    if (hours >= 120 && selectedCamera.fiveDaysRate > 0) {
      rate = selectedCamera.fiveDaysRate
      label = "5 ngày trở lên"
    } else if (hours >= 72 && selectedCamera.threeDaysRate > 0) {
      rate = selectedCamera.threeDaysRate
      label = "3 ngày trở lên"
    } else if (hours >= 24 && selectedCamera.fullDayRate > 0) {
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
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground mb-2">Đặt thuê máy ảnh</h2>
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

      {/* Step 1: Camera Selection */}
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
            {cameras.map((camera) => {
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
                      }}
                    >
                      Chọn máy này
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        </>
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

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="block mb-1 text-sm font-medium " >Ngày bắt đầu</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {bookingForm.startDate
                          ? new Date(bookingForm.startDate).toLocaleDateString("vi-VN")
                          : "Chọn ngày"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white dark:bg-gray-900">
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
                          )
                          const isPast = date < new Date(new Date().setHours(0, 0, 0, 0))
                          return isBooked || isPast
                        }}
                        modifiers={{
                          booked: bookedDates,
                        }}
                        modifiersStyles={{
                          booked: {
                            backgroundColor: "#f87171",
                            color: "white",
                            borderRadius: "50%",
                          },
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <Select
                    value={bookingForm.startTime || ""}
                    onValueChange={(value) =>
                      setBookingForm((prev) => ({ ...prev, startTime: value, endTime: "" }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Giờ nhận" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-900">
                      {timeOptions.map((t) => (
                        <SelectItem
                          key={t.value}
                          value={`${t.value}:00`}
                        >
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="block mb-1 text-sm font-medium">Ngày kết thúc</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {bookingForm.endDate
                          ? new Date(bookingForm.endDate).toLocaleDateString("vi-VN")
                          : "Chọn ngày"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white dark:bg-gray-900">
                      <Calendar
                        mode="single"
                        selected={bookingForm.endDate || undefined}
                        onSelect={(date) =>
                          setBookingForm((prev) => ({ ...prev, endDate: date || null, endTime: "" }))
                        }
                        disabled={(date) => {
                          const isBeforeStart =
                            bookingForm.startDate && date < bookingForm.startDate
                          const isBooked = bookedDates.some(
                            (d) => d.toDateString() === date.toDateString()
                          )
                          return isBeforeStart || isBooked
                        }}
                        modifiers={{
                          booked: bookedDates,
                        }}
                        modifiersStyles={{
                          booked: {
                            backgroundColor: "#f87171",
                            color: "white",
                            borderRadius: "50%",
                          },
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
                    <SelectContent className="bg-white dark:bg-gray-900">
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

            {bookingForm.startDate &&
              bookingForm.endDate &&
              bookingForm.startTime &&
              bookingForm.endTime && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label className="text-sm font-medium">Số ngày thuê</Label>
                        <span className="font-medium">{calculateTotalDays()} ngày</span>
                      </div>

                      <div className="flex justify-between">
                        <Label className="text-sm font-medium">Mức giá áp dụng</Label>
                        <span className="font-medium">
                          {getPricingInfo().label} ({getPricingInfo().rate.toLocaleString("vi-VN")}
                          đ/ngày)
                        </span>
                      </div>

                      <Separator />

                      <div className="flex justify-between text-lg font-semibold">
                        <Label className="text-sm font-medium">Tổng cộng</Label>
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
            <CardDescription>
              Vui lòng điền đầy đủ thông tin để hoàn tất đặt thuê
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="block mb-1 text-sm font-medium">
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

            <div className="space-y-2">
              <Label htmlFor="phone" className="block mb-1 text-sm font-medium">
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

            <div className="space-y-2">
              <Label htmlFor="email" className="block mb-1 text-sm font-medium">
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                value={bookingForm.customerEmail}
                onChange={(e) => {
                  setBookingForm((prev) => ({ ...prev, customerEmail: e.target.value }))
                }}
                placeholder="Nhập địa chỉ email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="block mb-1 text-sm font-medium">
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
            <CardDescription>Vui lòng kiểm tra lại thông tin trước khi thanh toán</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 border rounded-lg">
                  <CameraIcon className="h-8 w-8 text-primary" />
                  <div>
                    <h4 className="font-semibold">{selectedCamera.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {selectedCamera.brand} {selectedCamera.model}
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground mt-1" />
                      <div>
                        <p className="text-sm font-medium">Thời gian thuê</p>
                        <p className="text-sm text-muted-foreground">
                          {bookingForm.startDate &&
                            format(bookingForm.startDate, "dd/MM/yyyy", { locale: vi })}{" "}
                          -{" "}
                          {bookingForm.endDate &&
                            format(bookingForm.endDate, "dd/MM/yyyy", { locale: vi })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Giờ nhận: <b>{bookingForm.startTime || "Chưa chọn"}</b> | Giờ trả:{" "}
                          <b>{bookingForm.endTime || "Chưa chọn"}</b>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Số ngày</p>
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
                        <p className="text-sm font-medium">Khách hàng</p>
                        <p className="text-sm text-muted-foreground">
                          {bookingForm.customerName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Liên hệ</p>
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
                    <p className="text-sm font-medium mb-1">Ghi chú:</p>
                    <p className="text-sm text-muted-foreground">{bookingForm.notes}</p>
                  </div>
                )}

                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-lg font-semibold">
                        <span>Tổng cộng:</span>
                        <span className="text-primary">
                          {calculateTotalAmount().toLocaleString("vi-VN")}đ
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-col items-center justify-center space-y-4 border-l pl-6 text-center">
                <h3 className="text-lg font-semibold">Thông tin thanh toán</h3>

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

                    <div className="text-sm mt-2 space-y-1">
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

      {cameras.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CameraIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Hiện tại không có máy ảnh</h3>
            <p className="text-muted-foreground text-center">
              Tất cả máy ảnh đang được thuê hoặc bảo trì. Vui lòng quay lại sau.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
