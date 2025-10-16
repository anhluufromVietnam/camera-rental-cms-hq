"use client"

import { useEffect, useState } from "react"
import { ref, get, set } from "firebase/database"
import { db } from "@/firebase.config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Save, RefreshCw, Upload, CheckCircle2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

// helper: resize image to reduce size
const resizeImage = (file: File, maxWidth = 500): Promise<Blob> => {
  return new Promise((resolve) => {
    const img = new Image()
    const reader = new FileReader()
    reader.onload = (e) => {
      img.src = e.target?.result as string
    }
    img.onload = () => {
      const canvas = document.createElement("canvas")
      const scale = Math.min(maxWidth / img.width, 1)
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      const ctx = canvas.getContext("2d")
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => blob && resolve(blob), "image/jpeg", 0.8)
    }
    reader.readAsDataURL(file)
  })
}

export function SettingsImage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successDialog, setSuccessDialog] = useState(false)

  const [qrUrl, setQrUrl] = useState("")
  const [qrFile, setQrFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState("")

  const [bankName, setBankName] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [accountHolder, setAccountHolder] = useState("")
  const [paymentSyntax, setPaymentSyntax] = useState("")

  // load settings from Realtime DB
  const fetchSettings = async () => {
    try {
      const settingsRef = ref(db, "settings")
      const snapshot = await get(settingsRef)
      if (snapshot.exists()) {
        const data = snapshot.val()
        setQrUrl(data.qrUrl || "")
        setBankName(data.bankName || "")
        setAccountNumber(data.accountNumber || "")
        setAccountHolder(data.accountHolder || "")
        setPaymentSyntax(data.paymentSyntax || "")
      }
    } catch (err) {
      console.error("Error fetching settings:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  // select file (preview only)
  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setQrFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  // save settings (QR sẽ lưu local dưới dạng base64)
  const handleSaveSettings = async () => {
    if (!bankName || !accountNumber || !accountHolder || !paymentSyntax) {
      console.warn("Missing fields, cannot save")
      return
    }

    setSaving(true)
    try {
      let finalQrUrl = qrUrl

      // nếu chọn ảnh mới thì chuyển sang base64 và lưu local
      if (qrFile) {
        const compressedBlob = await resizeImage(qrFile)
        const base64 = await blobToBase64(compressedBlob)
        localStorage.setItem("qrImage", base64)
        finalQrUrl = base64
        setQrUrl(finalQrUrl)
      }

      // lưu dữ liệu vào firebase realtime database
      const settingsRef = ref(db, "settings")
      await set(settingsRef, {
        qrUrl: finalQrUrl,
        bankName,
        accountNumber,
        accountHolder,
        paymentSyntax,
      })

      // reset
      setQrFile(null)
      setPreviewUrl("")
      await fetchSettings()

      // hiển thị dialog thành công
      setSuccessDialog(true)
    } catch (err) {
      console.error("Error saving settings:", err)
    } finally {
      setSaving(false)
    }
  }

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  if (loading) {
    return (
      <div className="text-center text-muted-foreground font-[Be_Vietnam_Pro] text-[16px] font-semibold">
        Đang tải dữ liệu...
      </div>
    )
  }

  return (
    <>
      <div className="max-w-2xl mx-auto font-[Be_Vietnam_Pro] text-[15px] text-foreground font-semibold">
        <Card className="shadow-lg border border-border/60 rounded-2xl">
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              ⚙️ Cài đặt thanh toán
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {/* QR Upload */}
            <div className="space-y-3">
              <Label className="font-medium text-base">Ảnh mã QR thanh toán</Label>

              <div className="relative w-48 h-48 border-2 border-dashed rounded-xl overflow-hidden bg-white flex items-center justify-center shadow-sm">
                {previewUrl || qrUrl ? (
                  <img
                    src={previewUrl || qrUrl}
                    alt="QR Code"
                    className="object-contain w-full h-full p-3"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground italic">Chưa có ảnh QR</p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleSelectFile}
                  className="hidden"
                />
                <Button
                  type="button"
                  onClick={() => document.getElementById("file-upload")?.click()}
                  className="flex items-center gap-2 font-semibold"
                >
                  <Upload className="h-4 w-4" />
                  Chọn ảnh QR
                </Button>
              </div>
            </div>

            {/* Bank Info */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/60 border border-blue-200 rounded-xl p-6 shadow-sm space-y-5">
              <h4 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                💳 Thông tin chuyển khoản
              </h4>

              <div className="space-y-2">
                <Label className="text-blue-900 font-medium">Ngân hàng</Label>
                <Input
                  placeholder="VD: Vietcombank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-blue-900 font-medium">Số tài khoản</Label>
                <Input
                  placeholder="VD: 0123456789"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-blue-900 font-medium">Chủ tài khoản</Label>
                <Input
                  placeholder="VD: CONG TY QUAN LY TOA NHA"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-blue-900 font-medium">Cú pháp chuyển khoản</Label>
                <Input
                  placeholder="VD: Thanh toán [Tên] - [Mã đơn]"
                  value={paymentSyntax}
                  onChange={(e) => setPaymentSyntax(e.target.value)}
                />
              </div>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSaveSettings}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-5 font-semibold rounded-xl shadow-md"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Lưu cài đặt
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ✅ Success Dialog */}
      <Dialog open={successDialog} onOpenChange={setSuccessDialog}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="text-green-600 flex justify-center items-center gap-2 text-xl">
              <CheckCircle2 className="w-6 h-6" />
              Lưu thành công!
            </DialogTitle>
            <DialogDescription className="text-gray-600 pt-2">
              Cài đặt thanh toán của bạn đã được lưu lại thành công
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex justify-center mt-4">
            <Button
              onClick={() => setSuccessDialog(false)}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold"
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
