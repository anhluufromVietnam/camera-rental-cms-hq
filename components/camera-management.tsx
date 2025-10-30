"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Edit, Trash2, Package } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { database } from "@/lib/firebase"
import { ref, push, set, get, remove, update } from "firebase/database"

interface Camera {
  id: string
  name: string
  brand: string
  model: string
  category: string
  dailyRate: number
  quantity: number
  available: number
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

  useEffect(() => {
    const loadCameras = async () => {
      try {
        const camerasRef = ref(database, "cameras")
        const snapshot = await get(camerasRef)
        if (snapshot.exists()) {
          const camerasData = snapshot.val()
          const camerasArray = Object.keys(camerasData).map((key) => ({
            id: key,
            ...camerasData[key],
          }))
          setCameras(camerasArray)
        } else {
          // Initialize with sample data if Firebase is empty
          const sampleCameras: Camera[] = [
            {
              id: "1",
              name: "Canon EOS R5",
              brand: "Canon",
              model: "EOS R5",
              category: "Mirrorless",
              dailyRate: 150000,
              quantity: 3,
              available: 2,
              description: "Máy ảnh mirrorless full-frame cao cấp",
              specifications: "45MP, 8K video, dual card slots",
              status: "active",
            },
            {
              id: "2",
              name: "Sony A7 IV",
              brand: "Sony",
              model: "A7 IV",
              category: "Mirrorless",
              dailyRate: 120000,
              quantity: 2,
              available: 1,
              description: "Máy ảnh mirrorless đa năng",
              specifications: "33MP, 4K video, 5-axis stabilization",
              status: "active",
            },
          ]

          // Save sample data to Firebase
          for (const camera of sampleCameras) {
            const { id, ...cameraData } = camera
            await set(ref(database, `cameras/${id}`), cameraData)
          }
          setCameras(sampleCameras)
        }
      } catch (error) {
        console.error("Error loading cameras from Firebase:", error)
        // Fallback to localStorage
        const savedCameras = localStorage.getItem("cameras")
        if (savedCameras) {
          setCameras(JSON.parse(savedCameras))
        }
      }
    }

    loadCameras()
  }, [])

  const handleAddCamera = async (cameraData: Omit<Camera, "id">) => {
    try {
      const camerasRef = ref(database, "cameras")
      const newCameraRef = push(camerasRef)
      await set(newCameraRef, cameraData)

      const newCamera: Camera = {
        ...cameraData,
        id: newCameraRef.key!,
      }
      setCameras((prev) => [...prev, newCamera])
      setIsAddDialogOpen(false)
      toast({
        title: "Thành công",
        description: "Đã thêm máy ảnh mới",
      })
    } catch (error) {
      console.error("Error adding camera to Firebase:", error)
      // Fallback to localStorage
      const newCamera: Camera = {
        ...cameraData,
        id: Date.now().toString(),
      }
      setCameras((prev) => [...prev, newCamera])
      localStorage.setItem("cameras", JSON.stringify([...cameras, newCamera]))
      setIsAddDialogOpen(false)
      toast({
        title: "Thành công",
        description: "Đã thêm máy ảnh mới (lưu cục bộ)",
      })
    }
  }

  const handleEditCamera = async (cameraData: Omit<Camera, "id">) => {
    if (!editingCamera) return

    try {
      const cameraRef = ref(database, `cameras/${editingCamera.id}`)
      await update(cameraRef, cameraData)

      setCameras((prev) =>
        prev.map((camera) => (camera.id === editingCamera.id ? { ...cameraData, id: editingCamera.id } : camera)),
      )
      setEditingCamera(null)
      toast({
        title: "Thành công",
        description: "Đã cập nhật thông tin máy ảnh",
      })
    } catch (error) {
      console.error("Error updating camera in Firebase:", error)
      // Fallback to localStorage
      const updatedCameras = cameras.map((camera) =>
        camera.id === editingCamera.id ? { ...cameraData, id: editingCamera.id } : camera,
      )
      setCameras(updatedCameras)
      localStorage.setItem("cameras", JSON.stringify(updatedCameras))
      setEditingCamera(null)
      toast({
        title: "Thành công",
        description: "Đã cập nhật thông tin máy ảnh (lưu cục bộ)",
      })
    }
  }

  const handleDeleteCamera = async (id: string) => {
    try {
      const cameraRef = ref(database, `cameras/${id}`)
      await remove(cameraRef)

      setCameras((prev) => prev.filter((camera) => camera.id !== id))
      toast({
        title: "Thành công",
        description: "Đã xóa máy ảnh",
      })
    } catch (error) {
      console.error("Error deleting camera from Firebase:", error)
      // Fallback to localStorage
      const updatedCameras = cameras.filter((camera) => camera.id !== id)
      setCameras(updatedCameras)
      localStorage.setItem("cameras", JSON.stringify(updatedCameras))
      toast({
        title: "Thành công",
        description: "Đã xóa máy ảnh (lưu cục bộ)",
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Quản lý máy ảnh</h2>
          <p className="text-muted-foreground">Quản lý kho máy ảnh và thiết bị</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Thêm máy ảnh
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <CameraForm onSubmit={handleAddCamera} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Input
            placeholder="Tìm kiếm máy ảnh..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Package className="h-4 w-4" />
          Tổng: {cameras.length} máy ảnh
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredCameras.map((camera) => (
          <Card key={camera.id} className="relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <CameraIcon className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg">{camera.name}</CardTitle>
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
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Loại</Label>
                  <p className="font-medium">{camera.category}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Giá thuê/ngày</Label>
                  <p className="font-medium">{camera.dailyRate.toLocaleString("vi-VN")}đ</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tổng số lượng</Label>
                  <p className="font-medium">{camera.quantity}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Có sẵn</Label>
                  <p className="font-medium text-green-600">{camera.available}</p>
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
                  <DialogContent className="max-w-2xl">
                    <CameraForm camera={camera} onSubmit={handleEditCamera} isEditing />
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
    quantity: camera?.quantity || 1,
    available: camera?.available || 1,
    description: camera?.description || "",
    specifications: camera?.specifications || "",
    status: camera?.status || ("active" as const),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? "Chỉnh sửa máy ảnh" : "Thêm máy ảnh mới"}</DialogTitle>
        <DialogDescription>
          {isEditing ? "Cập nhật thông tin máy ảnh" : "Nhập thông tin máy ảnh mới vào hệ thống"}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tên máy ảnh</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand">Thương hiệu</Label>
            <Input
              id="brand"
              value={formData.brand}
              onChange={(e) => setFormData((prev) => ({ ...prev, brand: e.target.value }))}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              value={formData.model}
              onChange={(e) => setFormData((prev) => ({ ...prev, model: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Loại máy ảnh</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn loại máy ảnh" />
              </SelectTrigger>
              <SelectContent>
                {CAMERA_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dailyRate">Giá thuê/ngày (VNĐ)</Label>
            <Input
              id="dailyRate"
              type="number"
              value={formData.dailyRate}
              onChange={(e) => setFormData((prev) => ({ ...prev, dailyRate: Number.parseInt(e.target.value) || 0 }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity">Tổng số lượng</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData((prev) => ({ ...prev, quantity: Number.parseInt(e.target.value) || 1 }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="available">Có sẵn</Label>
            <Input
              id="available"
              type="number"
              min="0"
              max={formData.quantity}
              value={formData.available}
              onChange={(e) => setFormData((prev) => ({ ...prev, available: Number.parseInt(e.target.value) || 0 }))}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Trạng thái</Label>
          <Select
            value={formData.status}
            onValueChange={(value: "active" | "maintenance" | "retired") =>
              setFormData((prev) => ({ ...prev, status: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Hoạt động</SelectItem>
              <SelectItem value="maintenance">Bảo trì</SelectItem>
              <SelectItem value="retired">Ngừng hoạt động</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Mô tả</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="specifications">Thông số kỹ thuật</Label>
          <Textarea
            id="specifications"
            value={formData.specifications}
            onChange={(e) => setFormData((prev) => ({ ...prev, specifications: e.target.value }))}
            rows={2}
          />
        </div>

        <DialogFooter>
          <Button type="submit">{isEditing ? "Cập nhật" : "Thêm máy ảnh"}</Button>
        </DialogFooter>
      </form>
    </>
  )
}
