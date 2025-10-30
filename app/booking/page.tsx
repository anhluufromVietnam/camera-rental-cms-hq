"use client"
import { PublicBooking } from "@/components/public-booking"
import { Camera, Heart, Shield, Clock, Star, Sparkles } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FacebookGallery } from "@/components/facebook-gallery"

export default function BookingPage() {
  return (
    <div className="min-h-screen">
      <header className="glass-strong sticky top-0 z-50 border-b border-white/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-2xl bg-gradient-to-br from-pink-400/30 to-purple-400/30 backdrop-blur-sm">
                <Camera className="h-6 w-6 text-pink-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                  Lens & Light
                </h1>
                <p className="text-xs text-foreground/60">Camera Rental Studio</p>
              </div>
            </div>
            <Link
              href="/admin/login"
              className="px-4 py-2 rounded-xl glass-light text-sm font-medium hover:glass transition-all border border-white/20"
            >
              Admin
            </Link>
          </div>
        </div>
      </header>

      <section className="relative py-20 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-light border border-white/30 mb-4">
              <Sparkles className="h-4 w-4 text-pink-400" />
              <span className="text-sm font-medium text-foreground/80">Chụp ảnh đẹp, thuê máy chuyên nghiệp</span>
            </div>

            <h2 className="text-5xl md:text-6xl font-bold leading-tight">
              <span className="bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Ghi lại khoảnh khắc
              </span>
              <br />
              <span className="text-foreground">của riêng bạn</span>
            </h2>

            <p className="text-xl text-foreground/70 max-w-2xl mx-auto leading-relaxed">
              Thuê máy ảnh chuyên nghiệp với giá ưu đãi. Dành riêng cho những người phụ nữ yêu thích nhiếp ảnh, muốn lưu
              giữ những khoảnh khắc đẹp nhất trong cuộc sống.
            </p>

            <div className="flex flex-wrap gap-4 justify-center pt-4">
              <Button
                size="lg"
                className="rounded-2xl shadow-lg bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white px-8"
                onClick={() => document.getElementById("booking-section")?.scrollIntoView({ behavior: "smooth" })}
              >
                Đặt thuê ngay
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-2xl glass-light border-white/30 hover:glass bg-transparent"
                onClick={() => document.getElementById("story-section")?.scrollIntoView({ behavior: "smooth" })}
              >
                Tìm hiểu thêm
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 border-y border-white/10">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {[
              { icon: Shield, title: "Bảo hành toàn diện", desc: "Máy móc được kiểm tra kỹ lưỡng" },
              { icon: Clock, title: "Giao nhận nhanh", desc: "Trong vòng 2 giờ tại TP.HCM" },
              { icon: Heart, title: "Hỗ trợ tận tình", desc: "Tư vấn sử dụng miễn phí" },
              { icon: Star, title: "Giá cả hợp lý", desc: "Ưu đãi cho khách hàng thân thiết" },
            ].map((item, index) => (
              <div key={index} className="text-center space-y-3">
                <div className="inline-flex p-4 rounded-2xl glass-light border border-white/20">
                  <item.icon className="h-6 w-6 text-pink-400" />
                </div>
                <h3 className="font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm text-foreground/60">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="booking-section" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                Chọn máy ảnh phù hợp với bạn
              </span>
            </h2>
            <p className="text-lg text-foreground/70">
              Đa dạng dòng máy từ cơ bản đến chuyên nghiệp, phù hợp với mọi nhu cầu
            </p>
          </div>

          <PublicBooking />
        </div>
      </section>

      <section className="py-20 bg-gradient-to-b from-transparent via-pink-500/5 to-transparent">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                Những khoảnh khắc đẹp từ khách hàng
              </span>
            </h2>
            <p className="text-lg text-foreground/70">
              Hơn 500+ khách hàng đã tin tưởng và tạo ra những bức ảnh tuyệt vời
            </p>
          </div>

          <div className="max-w-6xl mx-auto glass-card rounded-3xl p-6 md:p-10 border border-white/20">
            <FacebookGallery albumUrl="https://www.facebook.com/media/set?vanity=bbbtranslation&set=a.746067487801116" />
          </div>
        </div>
      </section>

      <section id="story-section" className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">
                <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                  Câu chuyện của chúng tôi
                </span>
              </h2>
              <p className="text-lg text-foreground/70">Khởi nguồn từ niềm đam mê nhiếp ảnh và mong muốn chia sẻ</p>
            </div>

            <div className="glass-card rounded-3xl p-8 md:p-12 space-y-6 border border-white/20">
              <p className="text-lg text-foreground/80 leading-relaxed">
                <span className="text-2xl text-pink-400 font-serif">"</span>
                Lens & Light ra đời từ câu chuyện của một người phụ nữ yêu thích nhiếp ảnh. Tôi hiểu rằng không phải ai
                cũng có điều kiện sở hữu một chiếc máy ảnh chuyên nghiệp, nhưng mọi người đều xứng đáng có những bức ảnh
                đẹp để lưu giữ kỷ niệm.
              </p>

              <p className="text-lg text-foreground/80 leading-relaxed">
                Chúng tôi tin rằng mỗi khoảnh khắc trong cuộc sống đều đáng được ghi lại một cách trọn vẹn nhất. Từ
                những chuyến du lịch, tiệc sinh nhật, đám cưới, cho đến những buổi chụp ảnh cá nhân - tất cả đều xứng
                đáng có một chiếc máy ảnh tốt nhất.
              </p>

              <p className="text-lg text-foreground/80 leading-relaxed">
                Với đội ngũ toàn nữ giới, chúng tôi hiểu tâm lý và nhu cầu của các chị em phụ nữ. Chúng tôi không chỉ
                cho thuê máy ảnh, mà còn chia sẻ kinh nghiệm, hướng dẫn sử dụng và tư vấn để bạn có những bức ảnh đẹp
                nhất.
                <span className="text-2xl text-pink-400 font-serif">"</span>
              </p>

              <div className="pt-6 border-t border-white/20">
                <p className="text-foreground/60 italic">- Minh Anh, Founder & Creative Director</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-b from-transparent via-purple-500/5 to-transparent">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                Khách hàng nói gì về chúng tôi
              </span>
            </h2>
            <p className="text-lg text-foreground/70">Những phản hồi chân thực từ khách hàng đã sử dụng dịch vụ</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              {
                name: "Lan Anh",
                role: "Content Creator",
                content:
                  "Máy ảnh chất lượng tuyệt vời, giá cả hợp lý. Chị chủ rất nhiệt tình hướng dẫn mình sử dụng. Mình đã có những bức ảnh du lịch Đà Lạt cực đẹp!",
                rating: 5,
              },
              {
                name: "Thu Hà",
                role: "Cô dâu mới",
                content:
                  "Thuê máy cho đám cưới của mình, dịch vụ chuyên nghiệp lắm. Giao nhận đúng giờ, máy móc mới tinh. Cảm ơn team đã giúp mình có những khoảnh khắc đẹp nhất!",
                rating: 5,
              },
              {
                name: "Phương Anh",
                role: "Nhiếp ảnh nghiệp dư",
                content:
                  "Lần đầu thuê máy ảnh chuyên nghiệp, mình hơi lo lắng nhưng chị tư vấn rất kỹ. Máy Canon 5D Mark IV chụp ảnh chân dung đẹp xuất sắc!",
                rating: 5,
              },
            ].map((testimonial, index) => (
              <div
                key={index}
                className="glass-card rounded-3xl p-6 space-y-4 border border-white/20 hover:glass-strong transition-all"
              >
                <div className="flex gap-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-foreground/80 leading-relaxed">"{testimonial.content}"</p>
                <div className="pt-4 border-t border-white/20">
                  <p className="font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-sm text-foreground/60">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-pink-400/30 to-purple-400/30 backdrop-blur-sm">
                <Camera className="h-8 w-8 text-pink-500" />
              </div>
              <div className="text-left">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                  Lens & Light
                </h3>
                <p className="text-sm text-foreground/60">Camera Rental Studio</p>
              </div>
            </div>

            <p className="text-foreground/70">Ghi lại những khoảnh khắc đẹp nhất của bạn với thiết bị chuyên nghiệp</p>

            <div className="flex flex-wrap gap-6 justify-center text-sm text-foreground/60 pt-6 border-t border-white/10">
              <a href="tel:0123456789" className="hover:text-pink-400 transition-colors">
                Hotline: 0123 456 789
              </a>
              <a href="mailto:hello@lensandlight.vn" className="hover:text-pink-400 transition-colors">
                hello@lensandlight.vn
              </a>
              <a href="#" className="hover:text-pink-400 transition-colors">
                Facebook
              </a>
              <a href="#" className="hover:text-pink-400 transition-colors">
                Instagram
              </a>
            </div>

            <p className="text-sm text-foreground/50 pt-6">
              © 2025 Lens & Light. Made with <Heart className="inline h-4 w-4 text-pink-400" /> for photography lovers
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
