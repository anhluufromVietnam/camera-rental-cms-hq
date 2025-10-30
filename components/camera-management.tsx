"use client"

import type React from "react"
import { db } from "@/firebase.config"
import { ref, onValue, push, update, remove } from "firebase/database"
import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Edit, Trash2, Package, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Camera {
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
  description: string
  specifications: string
  status: "active" | "maintenance" | "retired"
}

const CAMERA_CATEGORIES = [
  "DSLR",
  "Mirrorless",
  "Film Camera",
  "Action Camera",
  "Instant Camera",
  "Medium Format",
  "Large Format",
]

const CameraIcon = ({ className }: { className?: string }) => (
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

export function CameraManagement() {
  const [cameras, setCameras] = useState<Camera[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingCamera, setEditingCamera] = useState<Camera | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()
  const [selectedRates, setSelectedRates] = useState<Record<string, string>>({})

  const getRatePrice = (camera: Camera, rateType: string) => {
    switch (rateType) {
      case "ondayRate":
        return camera.ondayRate || 0
      case "fullDayRate":
        return camera.fullDayRate || camera.ondayRate || 0
      case "threeDaysRate":
        return camera.threeDaysRate || camera.ondayRate || 0
      case "fiveDaysRate":
        return camera.fiveDaysRate || camera.ondayRate || 0
      default:
        return camera.ondayRate || 0
    }
  }

  useEffect(() => {
    const camerasRef = ref(db, "cameras")
    const unsubscribe = onValue(camerasRef, (snapshot) => {
      if (snapshot.exists()) {
        const data: Record<string, Omit<Camera, "id">> = snapshot.val()
        const cameraList: Camera[] = Object.entries(data).map(([id, value]) => ({
          id,
          ...value,
        }))
        setCameras(cameraList)
      } else {
        setCameras([])
      }
    })
    return () => unsubscribe()
  }, [])

  const handleAddCamera = async (cameraData: Omit<Camera, "id">) => {
    try {
      await push(ref(db, "cameras"), cameraData)
      setIsAddDialogOpen(false)
      toast({ title: "Thành công", description: "Đã thêm máy ảnh mới" })
    } catch (error) {
      console.error("Lỗi thêm camera:", error)
      toast({
        title: "Lỗi",
        description: "Không thể thêm máy ảnh",
        variant: "destructive",
      })
    }
  }

  const handleEditCamera = async (cameraData: Omit<Camera, "id">) => {
    if (!editingCamera) return
    try {
      await update(ref(db, `cameras/${editingCamera.id}`), cameraData)
      setEditingCamera(null)
      toast({ title: "Thành công", description: "Đã cập nhật máy ảnh" })
    } catch (error) {
      console.error("Lỗi cập nhật camera:", error)
      toast({
        title: "Lỗi",
        description: "Không thể cập nhật máy ảnh",
        variant: "destructive",
      })
    }
  }

  const handleDeleteCamera = async (id: string) => {
    try {
      await remove(ref(db, "cameras/" + id))
      toast({ title: "Thành công", description: "Đã xóa máy ảnh" })
    } catch (error) {
      console.error("Lỗi xóa camera:", error)
      toast({
        title: "Lỗi",
        description: "Không thể xóa máy ảnh",
        variant: "destructive",
      })
    }
  }

  const filteredCameras = cameras.filter(
    (camera) =>
      camera.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      camera.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      camera.model.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Quản lý máy ảnh</h2>
          <p className="text-muted-foreground text-sm md:text-base">
            Quản lý kho máy ảnh và thiết bị
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Thêm máy ảnh
            </Button>
          </DialogTrigger>

          {/* ✅ Dialog thêm máy ảnh */}
          <DialogContent
            className="w-[95vw] max-w-[900px] h-[90vh] flex flex-col p-0 rounded-2xl sm:w-[90vw] md:w-[80vw]"
          >
            <DialogHeader className="sticky top-0 z-20 bg-background px-6 pt-4 pb-3 border-b flex items-center justify-between">
              <div>
                <DialogTitle>Thêm máy ảnh mới</DialogTitle>
                <DialogDescription>Nhập thông tin máy ảnh mới vào hệ thống</DialogDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsAddDialogOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6">
              <CameraForm onSubmit={handleAddCamera} />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Thanh tìm kiếm */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        <Input
          placeholder="Tìm kiếm máy ảnh..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm w-full"
        />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Package className="h-4 w-4" />
          Tổng: {cameras.length} máy ảnh
        </div>
      </div>

      {/* Danh sách máy ảnh */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredCameras.map((camera) => (
          <Card key={camera.id} className="relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <CameraIcon className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-base md:text-lg">{camera.name}</CardTitle>
                    <CardDescription>
                      {camera.brand} {camera.model}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={camera.status === "active" ? "default" : "secondary"}>
                  {camera.status === "active"
                    ? "Hoạt động"
                    : camera.status === "maintenance"
                    ? "Bảo trì"
                    : "Ngừng hoạt động"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Loại</Label>
                  <p className="font-medium">{camera.category}</p>
                </div>

                <div>
                  <Label className="text-muted-foreground">Giá thuê</Label>
                  <Select
                    defaultValue="ondayRate"
                    onValueChange={(value) =>
                      setSelectedRates((prev) => ({ ...prev, [camera.id]: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn loại giá" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ondayRate">Trong ngày</SelectItem>
                      <SelectItem value="fullDayRate">1 ngày trở lên</SelectItem>
                      <SelectItem value="threeDaysRate">3 ngày trở lên</SelectItem>
                      <SelectItem value="fiveDaysRate">5 ngày trở lên</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="font-medium mt-2">
                    {getRatePrice(camera, selectedRates[camera.id] || "dailyRate").toLocaleString("vi-VN")}đ
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Mô tả</Label>
                <p className="text-sm mt-1">{camera.description}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">Thông số</Label>
                <p className="text-sm mt-1">{camera.specifications}</p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Dialog open={editingCamera?.id === camera.id} onOpenChange={(open) => !open && setEditingCamera(null)}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingCamera(camera)}
                      className="flex items-center gap-1"
                    >
                      <Edit className="h-3 w-3" />
                      Sửa
                    </Button>
                  </DialogTrigger>

                  {/* ✅ Dialog chỉnh sửa */}
                  <DialogContent
                    className="w-[95vw] max-w-[900px] h-[90vh] flex flex-col p-0 rounded-2xl sm:w-[90vw] md:w-[80vw]"
                  >
                    <DialogHeader className="sticky top-0 z-20 bg-background px-6 pt-4 pb-3 border-b flex items-center justify-between">
                      <div>
                        <DialogTitle>Chỉnh sửa máy ảnh</DialogTitle>
                        <DialogDescription>Cập nhật thông tin máy ảnh trong hệ thống</DialogDescription>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setEditingCamera(null)}>
                        <X className="h-5 w-5" />
                      </Button>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto px-6">
                      <CameraForm camera={camera} onSubmit={handleEditCamera} isEditing />
                    </div>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteCamera(camera.id)}
                  className="flex items-center gap-1 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                  Xóa
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCameras.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CameraIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Không tìm thấy máy ảnh</h3>
            <p className="text-muted-foreground text-center">
              {searchTerm ? "Không có máy ảnh nào phù hợp với từ khóa tìm kiếm" : "Chưa có máy ảnh nào trong hệ thống"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface CameraFormProps {
  camera?: Camera
  onSubmit: (data: Omit<Camera, "id">) => void
  isEditing?: boolean
}

function CameraForm({ camera, onSubmit, isEditing = false }: CameraFormProps) {
  const [formData, setFormData] = useState({
    name: camera?.name || "",
    brand: camera?.brand || "",
    model: camera?.model || "",
    category: camera?.category || "",
    dailyRate: camera?.dailyRate || 0,
    ondayRate: camera?.ondayRate || 0,
    fullDayRate: camera?.fullDayRate || 0,
    threeDaysRate: camera?.threeDaysRate || 0,
    fiveDaysRate: camera?.fiveDaysRate || 0,
    description: camera?.description || "",
    specifications: camera?.specifications || "",
    status: camera?.status || ("active" as const),
    images: camera?.images || [],
  })

  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>(formData.images || [])
  const [uploading, setUploading] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setSelectedFiles(files)
    setPreviewUrls(files.map((file) => URL.createObjectURL(file)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploading(true)

    try {
      let imageUrls: string[] = formData.images || []

      // 🧩 Nếu có file mới, upload lên API local
      if (selectedFiles.length > 0) {
        const formDataToSend = new FormData()
        selectedFiles.forEach((file) => formDataToSend.append("files", file))
        formDataToSend.append("cameraName", formData.name)

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formDataToSend,
        })

        if (res.ok) {
          const data = await res.json()
          imageUrls = data.urls // trả về từ server
        } else {
          console.error("Upload thất bại")
        }
      }

      await onSubmit({ ...formData, images: imageUrls })
    } catch (err) {
      console.error("Lỗi upload:", err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4 text-sm sm:text-base">
      {/* Tên + Thương hiệu */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Tên máy ảnh</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="brand">Thương hiệu</Label>
          <Input
            id="brand"
            value={formData.brand}
            onChange={(e) => setFormData((p) => ({ ...p, brand: e.target.value }))}
            required
          />
        </div>
      </div>

      {/* Model + Loại */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="model">Model</Label>
          <Input
            id="model"
            value={formData.model}
            onChange={(e) => setFormData((p) => ({ ...p, model: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="category">Loại máy ảnh</Label>
          <Select
            value={formData.category}
            onValueChange={(v) => setFormData((p) => ({ ...p, category: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Chọn loại máy ảnh" />
            </SelectTrigger>
            <SelectContent>
              {CAMERA_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Giá thuê */}
      <div className="space-y-2">
        <Label>Giá thuê</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {["ondayRate", "fullDayRate", "threeDaysRate", "fiveDaysRate"].map((rate) => (
            <div key={rate}>
              <Label htmlFor={rate}>
                {{
                  ondayRate: "6 giờ",
                  fullDayRate: "1 ngày",
                  threeDaysRate: "3 ngày",
                  fiveDaysRate: "5 ngày",
                }[rate]}
              </Label>
              <Input
                id={rate}
                type="number"
                value={formData[rate as keyof typeof formData] as number}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    [rate]: Number(e.target.value) || 0,
                  }))
                }
                required
              />
            </div>
          ))}
        </div>
      </div>

          {/* Upload ảnh */}
          <div className="space-y-2">
            <Label htmlFor="images">Ảnh máy ảnh</Label>
            <Input
              id="images"
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
            />

            {/* Hiển thị ảnh đã có + mới chọn */}
            {previewUrls.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-2">
                {previewUrls.map((url, i) => (
                  <div key={i} className="relative group rounded-lg overflow-hidden border">
                    <img
                      src={url}
                      alt={`preview-${i}`}
                      className="w-full h-28 object-cover"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm("Xóa ảnh này?")) return

                        try {
                          // Gửi yêu cầu xóa ảnh tới /api/upload (DELETE)
                          const res = await fetch("/api/upload", {
                            method: "DELETE",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ url }),
                          })

                          if (res.ok) {
                            setPreviewUrls((prev) => prev.filter((u) => u !== url))
                            setFormData((prev) => ({
                              ...prev,
                              images: prev.images.filter((img) => img !== url),
                            }))
                          } else {
                            console.error("Lỗi xóa ảnh trên server")
                          }
                        } catch (err) {
                          console.error("Lỗi xóa ảnh:", err)
                        }
                      }}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-90 hover:opacity-100 transition"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>


      {/* Mô tả + thông số */}
      <div className="space-y-2">
        <Label htmlFor="description">Mô tả</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="specifications">Thông số kỹ thuật</Label>
        <Textarea
          id="specifications"
          value={formData.specifications}
          onChange={(e) => setFormData((p) => ({ ...p, specifications: e.target.value }))}
        />
      </div>

      {/* Trạng thái */}
      <div className="space-y-2">
        <Label htmlFor="status">Trạng thái</Label>
        <Select
          value={formData.status}
          onValueChange={(v: "active" | "maintenance" | "retired") =>
            setFormData((p) => ({ ...p, status: v }))
          }
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Hoạt động</SelectItem>
            <SelectItem value="maintenance">Bảo trì</SelectItem>
            <SelectItem value="retired">Ngừng hoạt động</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DialogFooter className="sticky bottom-0 bg-background border-t pt-3 pb-3">
        <Button type="submit" className="w-full sm:w-auto" disabled={uploading}>
          {uploading ? "Đang tải ảnh..." : isEditing ? "Cập nhật" : "Thêm máy ảnh"}
        </Button>
      </DialogFooter>
    </form>
  )
}
