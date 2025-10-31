"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { CameraManagement } from "@/components/camera-management"
import { BookingDashboard } from "@/components/booking-dashboard"
import { CalendarView } from "@/components/calendar-view"
import { OrderManagement } from "@/components/order-management"
import { GalleryManagement } from "@/components/gallery-management"
import { Camera, Calendar, Package, Settings, LogOut, ImageIcon } from "lucide-react"

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const authStatus = localStorage.getItem("adminAuth")
    if (authStatus === "true") {
      setIsAuthenticated(true)
    } else {
      router.push("/admin/login")
    }
    setLoading(false)
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("adminAuth")
    router.push("/admin/login")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Đang tải...</h1>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen">
      <header className="glass-strong border-b-2 border-white/30 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-xl">
                <Camera className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Camera Rental CMS</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-foreground/70 font-medium">Admin Dashboard</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="glass-light hover:glass border-white/30 bg-transparent"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Đăng xuất
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="glass-card rounded-3xl p-6">
          <Tabs defaultValue="cameras" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5 glass p-2 h-auto gap-2">
              <TabsTrigger
                value="cameras"
                className="flex items-center gap-2 data-[state=active]:glass-strong data-[state=active]:shadow-lg rounded-xl py-3 transition-all"
              >
                <Camera className="h-4 w-4" />
                <span className="hidden sm:inline">Máy ảnh</span>
              </TabsTrigger>
              <TabsTrigger
                value="bookings"
                className="flex items-center gap-2 data-[state=active]:glass-strong data-[state=active]:shadow-lg rounded-xl py-3 transition-all"
              >
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Đơn hàng</span>
              </TabsTrigger>
              <TabsTrigger
                value="calendar"
                className="flex items-center gap-2 data-[state=active]:glass-strong data-[state=active]:shadow-lg rounded-xl py-3 transition-all"
              >
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Lịch</span>
              </TabsTrigger>
              <TabsTrigger
                value="gallery"
                className="flex items-center gap-2 data-[state=active]:glass-strong data-[state=active]:shadow-lg rounded-xl py-3 transition-all"
              >
                <ImageIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Gallery</span>
              </TabsTrigger>
              <TabsTrigger
                value="orders"
                className="flex items-center gap-2 data-[state=active]:glass-strong data-[state=active]:shadow-lg rounded-xl py-3 transition-all"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Quản lý</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cameras">
              <CameraManagement />
            </TabsContent>

            <TabsContent value="bookings">
              <BookingDashboard />
            </TabsContent>

            <TabsContent value="calendar">
              <CalendarView />
            </TabsContent>

            <TabsContent value="gallery">
              <GalleryManagement />
            </TabsContent>

            <TabsContent value="orders">
              <OrderManagement />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
