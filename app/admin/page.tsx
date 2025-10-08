"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { CameraManagement } from "@/components/camera-management"
import { BookingDashboard } from "@/components/booking-dashboard"
import { CalendarView } from "@/components/calendar-view"
import { OrderManagement } from "@/components/order-management"
import { SettingsImage } from "@/components/settings-image"
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
      <div className="min-h-screen flex items-center justify-center bg-background font-[Be_Vietnam_Pro] text-[16px] font-semibold text-foreground">
        <h1 className="text-lg animate-pulse">Đang tải...</h1>
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/80 to-background font-[Be_Vietnam_Pro] text-[16px] font-semibold text-foreground">
      {/* Header */}
      <header className="border-b bg-card/70 backdrop-blur-md shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Camera className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Camera Rental CMS</h1>
          </div>

          <div className="flex items-center gap-5">
            <span className="text-sm text-muted-foreground">Admin Dashboard</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="font-semibold hover:bg-primary hover:text-white transition-all"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Đăng xuất
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="cameras" className="space-y-8">
          {/* Tabs header */}
          <div className="w-full bg-card/60 backdrop-blur border rounded-xl p-2 shadow-sm">
            <TabsList className="grid w-full grid-cols-5 bg-transparent gap-2">
              {[
                { value: "cameras", icon: Camera, label: "Quản lý máy ảnh" },
                { value: "bookings", icon: Package, label: "Đơn hàng" },
                { value: "calendar", icon: Calendar, label: "Lịch" },
                { value: "orders", icon: Settings, label: "Quản lý đơn" },
                { value: "settings", icon: Settings, label: "Cài đặt" },
              ].map(({ value, icon: Icon, label }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="flex items-center justify-center gap-2 rounded-lg py-3 text-[15px] font-medium transition-all
                    data-[state=active]:bg-primary data-[state=active]:text-white hover:bg-primary/10"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Tabs content */}
          <TabsContent value="cameras" className="animate-fadeIn">
            <CameraManagement />
          </TabsContent>

          <TabsContent value="bookings" className="animate-fadeIn">
            <BookingDashboard />
          </TabsContent>

          <TabsContent value="calendar" className="animate-fadeIn">
            <CalendarView />
          </TabsContent>

          <TabsContent value="orders" className="animate-fadeIn">
            <OrderManagement />
          </TabsContent>

          <TabsContent value="settings" className="animate-fadeIn">
            <SettingsImage />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
