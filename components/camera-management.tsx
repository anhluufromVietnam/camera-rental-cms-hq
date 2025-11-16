"use client"

import React, { useState, useEffect } from "react"
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
import { Plus, Edit, Trash2, Package, X, Camera } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { database } from "@/lib/firebase"
import { ref, push, set, get, remove, update, onValue } from "firebase/database"

interface Camera {
  id: string
  name: string
  brand: string
  model: string
  category: string
  ondayRate: number
  fullDayRate: number
  threeDaysRate: number
  fiveDaysRate: number
  quantity: number
  available: number
  description: string
  specifications: string
  status: "active" | "maintenance" | "retired"
  images?: string[]
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
  const [selectedRates, setSelectedRates] = useState<Record<string, string>>({})
  const { toast } = useToast()

  // Load cameras
  useEffect(() => {
    const camerasRef = ref(database, "cameras")
    const unsubscribe = onValue(camerasRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        const list: Camera[] = Object.entries(data).map(([id, cam]: [string, any]) => ({
          id,
          ...cam,
          images: cam.images || [],
        }))
        setCameras(list)
      } else {
        setCameras([])
      }
    }, (error) => {
      console.error("Firebase error:", error)
      loadFromLocalStorage()
    })

    const loadFromLocalStorage = () => {
      try {
        const saved = localStorage.getItem("cameras")
        if (saved) setCameras(JSON.parse(saved))
      } catch (e) {
        console.error("Lỗi localStorage:", e)
      }
    }

    return () => unsubscribe()
  }, [])

  const handleAddCamera = async (data: Omit<Camera, "id">) => {
    try {
      const newRef = push(ref(database, "cameras"))
      await set(newRef, data)
      toast({ title: "Thành công", description: "Đã thêm máy ảnh" })
      setIsAddDialogOpen(false)
    } catch (error) {
      fallbackSave(data)
    }
  }

  const handleEditCamera = async (data: Omit<Camera, "id">) => {
    if (!editingCamera) return
    try {
      await update(ref(database, `cameras/${editingCamera.id}`), data)
      toast({ title: "Thành công", description: "Đã cập nhật" })
      setEditingCamera(null)
    } catch (error) {
      fallbackUpdate(editingCamera.id, data)
    }
  }

  const handleDeleteCamera = async (id: string) => {
    if (!confirm("Xóa máy ảnh này?")) return
    try {
      await remove(ref(database, `cameras/${id}`))
      toast({ title: "Thành công", description: "Đã xóa" })
    } catch (error) {
      fallbackDelete(id)
    }
  }

  const fallbackSave = (data: Omit<Camera, "id">) => {
    const newCam = { ...data, id: Date.now().toString() }
    const updated = [...cameras, newCam]
    setCameras(updated)
    localStorage.setItem("cameras", JSON.stringify(updated))
    toast({ title: "Lưu tạm", description: "Đã lưu vào bộ nhớ cục bộ" })
    setIsAddDialogOpen(false)
  }

  const fallbackUpdate = (id: string, data: Omit<Camera, "id">) => {
    const updated = cameras.map(c => c.id === id ? { ...data, id } : c)
    setCameras(updated)
    localStorage.setItem("cameras", JSON.stringify(updated))
    toast({ title: "Lưu tạm", description: "Đã cập nhật cục bộ" })
    setEditingCamera(null)
  }

  const fallbackDelete = (id: string) => {
    const updated = cameras.filter(c => c.id !== id)
    setCameras(updated)
    localStorage.setItem("cameras", JSON.stringify(updated))
    toast({ title: "Lưu tạm", description: "Đã xóa cục bộ" })
  }

  const getRatePrice = (camera: Camera, type: string) => {
    switch (type) {
      case "ondayRate": return camera.ondayRate
      case "fullDayRate": return camera.fullDayRate || camera.ondayRate
      case "threeDaysRate": return camera.threeDaysRate || camera.ondayRate
      case "fiveDaysRate": return camera.fiveDaysRate || camera.ondayRate
      default: return camera.ondayRate
    }
  }

  const filtered = cameras.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.model.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Quản lý máy ảnh</h2>
          <p className="text-muted-foreground text-sm md:text-base">Quản lý kho máy ảnh và thiết bị</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Thêm máy ảnh
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
            <DialogHeader className="sticky top-0 bg-background p-6 border-b">
              <DialogTitle>Thêm máy ảnh mới</DialogTitle>
              <DialogDescription>Nhập thông tin chi tiết</DialogDescription>
            </DialogHeader>
            <div className="p-6">
              <CameraForm onSubmit={handleAddCamera} />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        <Input
          placeholder="Tìm kiếm máy ảnh..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Package className="h-4 w-4" />
          Tổng: {cameras.length} máy
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(camera => (
          <Card key={camera.id} className="relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <CameraIcon className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-base md:text-lg">{camera.name}</CardTitle>
                    <CardDescription>{camera.brand} {camera.model}</CardDescription>
                  </div>
                </div>
                <Badge variant={camera.status === "active" ? "default" : "secondary"}>
                  {camera.status === "active" ? "Hoạt động" : camera.status === "maintenance" ? "Bảo trì" : "Ngừng"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Loại</Label>
                  <p className="font-medium">{camera.category}</p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Giá thuê</Label>
                <Select
                  value={selectedRates[camera.id] || "ondayRate"}
                  onValueChange={v => setSelectedRates(p => ({ ...p, [camera.id]: v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-900">
                    <SelectItem value="ondayRate">Trong ngày</SelectItem>
                    <SelectItem value="fullDayRate">1 ngày</SelectItem>
                    <SelectItem value="threeDaysRate">3 ngày</SelectItem>
                    <SelectItem value="fiveDaysRate">5 ngày</SelectItem>
                  </SelectContent>
                </Select>
                <p className="font-medium mt-1 text-primary">
                  {getRatePrice(camera, selectedRates[camera.id] || "ondayRate").toLocaleString("vi-VN")}đ
                </p>
              </div>

              {camera.images && camera.images.length > 0 && (
                <div className="flex gap-1 -ml-1">
                  {camera.images.slice(0, 3).map((img, i) => (
                    <img key={i} src={img} alt="" className="w-12 h-12 object-cover rounded border" />
                  ))}
                  {camera.images.length > 3 && <div className="w-12 h-12 bg-muted rounded flex items-center justify-center text-xs">+{camera.images.length - 3}</div>}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Dialog open={editingCamera?.id === camera.id} onOpenChange={o => !o && setEditingCamera(null)}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => setEditingCamera(camera)}>
                      <Edit className="h-3 w-3 mr-1" /> Sửa
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
                    <DialogHeader className="sticky top-0 bg-background p-6 border-b">
                      <DialogTitle>Chỉnh sửa máy ảnh</DialogTitle>
                      <DialogDescription>Cập nhật thông tin</DialogDescription>
                    </DialogHeader>
                    <div className="p-6">
                      <CameraForm camera={camera} onSubmit={handleEditCamera} isEditing />
                    </div>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDeleteCamera(camera.id)}>
                  <Trash2 className="h-3 w-3 mr-1" /> Xóa
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Camera className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Không tìm thấy máy ảnh</h3>
            <p className="text-muted-foreground">
              {searchTerm ? "Không có kết quả phù hợp" : "Chưa có máy ảnh nào"}
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
    ondayRate: camera?.ondayRate || 0,
    fullDayRate: camera?.fullDayRate || 0,
    threeDaysRate: camera?.threeDaysRate || 0,
    fiveDaysRate: camera?.fiveDaysRate || 0,
    quantity: camera?.quantity || 1,
    available: camera?.available || 1,
    description: camera?.description || "",
    specifications: camera?.specifications || "",
    status: camera?.status || "active",
    images: camera?.images || [],
  })

  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>(camera?.images || [])
  const [uploading, setUploading] = useState(false)

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || [])
    setFiles(prev => [...prev, ...newFiles])
    setPreviews(prev => [...prev, ...newFiles.map(f => URL.createObjectURL(f))])
  }

  const removeImage = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploading(true)

    let imageUrls = formData.images || []

    if (files.length > 0) {
      const fd = new FormData()
      files.forEach(f => fd.append("files", f))
      fd.append("cameraName", formData.name)

      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd })
        if (res.ok) {
          const data = await res.json()
          imageUrls = [...imageUrls, ...data.urls]
        }
      } catch (err) {
        console.error("Upload lỗi:", err)
      }
    }

    onSubmit({ ...formData, images: imageUrls })
    setUploading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Tên máy ảnh *</Label>
          <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} required />
        </div>
        <div>
          <Label>Thương hiệu *</Label>
          <Input value={formData.brand} onChange={e => setFormData(p => ({ ...p, brand: e.target.value }))} required />
        </div>
        <div>
          <Label>Model *</Label>
          <Input value={formData.model} onChange={e => setFormData(p => ({ ...p, model: e.target.value }))} required />
        </div>
        <div>
          <Label>Loại máy ảnh</Label>
          <Select value={formData.category} onValueChange={v => setFormData(p => ({ ...p, category: v }))}>
            <SelectTrigger><SelectValue placeholder="Chọn loại" /></SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-900">
              {CAMERA_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        <Label>Giá thuê (VNĐ)</Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Trong ngày (6h)</Label>
            <Input type="number" value={formData.ondayRate} onChange={e => setFormData(p => ({ ...p, ondayRate: +e.target.value || 0 }))} />
          </div>
          <div>
            <Label className="text-xs">1 ngày</Label>
            <Input type="number" value={formData.fullDayRate} onChange={e => setFormData(p => ({ ...p, fullDayRate: +e.target.value || 0 }))} />
          </div>
          <div>
            <Label className="text-xs">3 ngày</Label>
            <Input type="number" value={formData.threeDaysRate} onChange={e => setFormData(p => ({ ...p, threeDaysRate: +e.target.value || 0 }))} />
          </div>
          <div>
            <Label className="text-xs">5 ngày</Label>
            <Input type="number" value={formData.fiveDaysRate} onChange={e => setFormData(p => ({ ...p, fiveDaysRate: +e.target.value || 0 }))} />
          </div>
        </div>
      </div>
      <div>
        <Label>Ảnh máy ảnh</Label>
        <Input type="file" accept="image/*" multiple onChange={handleFiles} className="mt-1" />
        {(previews.length > 0) && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mt-3">
            {previews.map((url, i) => (
              <div key={i} className="relative group rounded-lg overflow-hidden border">
                <img src={url} alt="" className="w-full h-24 object-cover" />
                <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <Label>Mô tả</Label>
        <Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} rows={3} />
      </div>

      <div>
        <Label>Thông số kỹ thuật</Label>
        <Textarea value={formData.specifications} onChange={e => setFormData(p => ({ ...p, specifications: e.target.value }))} rows={3} />
      </div>

      <div>
        <Label>Trạng thái</Label>
        <Select value={formData.status} onValueChange={v => setFormData(p => ({ ...p, status: v as any }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent className="bg-white dark:bg-gray-900">
            <SelectItem value="active">Hoạt động</SelectItem>
            <SelectItem value="maintenance">Bảo trì</SelectItem>
            <SelectItem value="retired">Ngừng hoạt động</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={uploading} className="w-full sm:w-auto">
          {uploading ? "Đang xử lý..." : isEditing ? "Cập nhật" : "Thêm máy ảnh"}
        </Button>
      </DialogFooter>
    </form>
  )
}