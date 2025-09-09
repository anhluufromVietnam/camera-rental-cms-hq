"use client"
import { PublicBooking } from "@/components/public-booking"
import { Camera } from "lucide-react"
import Link from "next/link"

export default function BookingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Camera Rental</h1>
            </div>
            <Link href="/admin/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Admin Login
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <PublicBooking />
      </main>
    </div>
  )
}
