"use client"
import { useState } from "react"
import type React from "react"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function AdminLoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    // Simple authentication check
    if (username === "admin" && password === "1234") {
      localStorage.setItem("adminAuth", "true")
      router.push("/admin")
    } else {
      setError("Tên đăng nhập hoặc mật khẩu không đúng")
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md glass-card rounded-3xl border-white/30 shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-3xl bg-gradient-to-br from-primary/30 to-accent/30 backdrop-blur-xl shadow-lg">
              <Camera className="h-14 w-14 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-foreground">Admin Login</CardTitle>
          <CardDescription className="text-foreground/60 text-base">
            Đăng nhập để truy cập hệ thống quản lý
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-foreground">
                Tên đăng nhập
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
                className="glass-light border-white/30 rounded-2xl h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">
                Mật khẩu
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="1234"
                required
                className="glass-light border-white/30 rounded-2xl h-12"
              />
            </div>

            {error && (
              <Alert variant="destructive" className="glass-light border-red-300/50 rounded-2xl">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full rounded-2xl h-12 text-base shadow-lg" disabled={loading}>
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>
          </form>
          <Button
            type="button"
            variant="outline"
            className="w-full mt-2"
            onClick={() => router.push("/")}
          >
            Quay lại trang đặt máy
          </Button>
          <div className="mt-6 text-center">
            <div className="glass-light rounded-2xl p-3 border-white/20">
              <p className="text-sm text-foreground/70">Demo: admin / 1234</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
