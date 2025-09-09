"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { CameraManagement } from "@/components/camera-management"
import { BookingDashboard } from "@/components/booking-dashboard"
import { CalendarView } from "@/components/calendar-view"
import { OrderManagement } from "@/components/order-management"
import { Camera, Calendar, Package, Settings, LogOut } from "lucide-react"

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
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Camera Rental CMS</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Admin Dashboard</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Đăng xuất
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="cameras" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="cameras" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Quản lý máy ảnh
            </TabsTrigger>
            <TabsTrigger value="bookings" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Đơn hàng
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Lịch
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Quản lý đơn
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

          <TabsContent value="orders">
            <OrderManagement />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
