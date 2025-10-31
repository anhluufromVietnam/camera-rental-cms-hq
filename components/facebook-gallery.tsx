"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ExternalLink, ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"

interface FacebookGalleryProps {
  albumUrl: string
}

export function FacebookGallery({ albumUrl }: FacebookGalleryProps) {
  const [currentPage, setCurrentPage] = useState(0)
  const photosPerPage = 10

  const photos = [
    { id: 1, url: "/beautiful-woman-taking-photos-with-camera.jpg" },
    { id: 2, url: "/professional-camera-equipment-rental.jpg" },
    { id: 3, url: "/woman-photographer-with-canon-camera.jpg" },
    { id: 4, url: "/aesthetic-photography-session.jpg" },
    { id: 5, url: "/camera-rental-customer-happy.jpg" },
    { id: 6, url: "/beautiful-portrait-photography.jpg" },
    { id: 7, url: "/wedding-photography-with-rented-camera.jpg" },
    { id: 8, url: "/travel-photography-vietnam.jpg" },
    { id: 9, url: "/professional-photoshoot-setup.jpg" },
    { id: 10, url: "/camera-lens-collection.jpg" },
    { id: 11, url: "/female-photographer-working.jpg" },
    { id: 12, url: "/photography-studio-equipment.png" },
    { id: 13, url: "/beautiful-landscape.png" },
    { id: 14, url: "/camera-rental-service.png" },
    { id: 15, url: "/professional-photography-gear.jpg" },
    { id: 16, url: "/happy-customer-with-camera.jpg" },
    { id: 17, url: "/aesthetic-photo-session.jpg" },
    { id: 18, url: "/camera-equipment-showcase.jpg" },
    { id: 19, url: "/placeholder.svg?height=400&width=400" },
    { id: 20, url: "/placeholder.svg?height=400&width=400" },
  ]

  const totalPages = Math.ceil(photos.length / photosPerPage)
  const currentPhotos = photos.slice(currentPage * photosPerPage, (currentPage + 1) * photosPerPage)

  const nextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1)
    }
  }

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
    }
  }

  return (
    <div className="space-y-6">
      {/* Photo Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        {currentPhotos.map((photo, index) => (
          <div
            key={photo.id}
            className="aspect-square rounded-2xl overflow-hidden glass-light border border-white/20 hover:glass-strong transition-all duration-300 group cursor-pointer"
            style={{
              animationDelay: `${index * 50}ms`,
            }}
          >
            <div className="relative w-full h-full">
              <Image
                src={photo.url || "/placeholder.svg"}
                alt={`Customer photo ${photo.id}`}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={prevPage}
          disabled={currentPage === 0}
          className="rounded-xl glass-light border-white/30 bg-transparent hover:glass disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Trước
        </Button>

        <div className="flex items-center gap-2">
          {[...Array(totalPages)].map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentPage(index)}
              className={`w-2 h-2 rounded-full transition-all ${currentPage === index ? "bg-pink-400 w-6" : "bg-white/30 hover:bg-white/50"
                }`}
              aria-label={`Go to page ${index + 1}`}
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={nextPage}
          disabled={currentPage === totalPages - 1}
          className="rounded-xl glass-light border-white/30 bg-transparent hover:glass disabled:opacity-50"
        >
          Sau
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* View Full Album Button */}
      <div className="text-center pt-4">
        <Button
          size="lg"
          className="rounded-2xl shadow-lg bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-8"
          onClick={() => window.open(albumUrl, "_blank")}
        >
          <ExternalLink className="h-5 w-5 mr-2" />
          Xem toàn bộ album trên Facebook
        </Button>
        <p className="text-sm text-foreground/60 mt-3">Hơn {photos.length}+ ảnh từ khách hàng của chúng tôi</p>
      </div>
    </div>
  )
}
