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
                  chupchoet.digicam
                </h1>
                <p className="text-xs text-foreground/60">Camera Rental</p>
              </div>
            </div>
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
          Ghi lại khoảnh khắc theo cách của bạn!
          Trải nghiệm dịch vụ thuê máy ảnh chuyên nghiệp, dành cho mọi ai yêu nhiếp ảnh và muốn kể câu chuyện của chính mình qua ống kính.
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
              { icon: Clock, title: "Giao nhận nhanh", desc: "Tại Hà Nội" },
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
            <FacebookGallery albumUrl="https://www.instagram.com/chupchoet.digicam" />
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
          Từ niềm đam mê với nhiếp ảnh và khát khao lan tỏa cảm hứng sáng tạo, chúng mình đã quyết định đầu tư hàng trăm triệu đồng cho những chiếc máy ảnh Fujifilm chất lượng cao, để ai cũng có thể chạm đến trải nghiệm chụp ảnh chuyên nghiệp — chỉ từ 100k.
              </p>

              <p className="text-lg text-foreground/80 leading-relaxed">
          Chúng mình hiểu cảm giác phân vân khi muốn mua máy nhưng sợ ít dùng, nên #chupchoet.digicam ra đời để bạn có thể trải nghiệm nhiều dòng máy khác nhau, khám phá góc nhìn mới, mà chi phí chỉ bằng vài ly trà sữa.
              </p>

              <p className="text-lg text-foreground/80 leading-relaxed">
          Không chỉ cho thuê thiết bị, chúng mình còn muốn đồng hành cùng bạn trong từng khung hình:
          💫 Tặng preset màu độc quyền giúp ảnh có hồn hơn
          🤝 Hỗ trợ tận tình từ khi nhận máy đến lúc trả
          🎒 Phụ kiện đầy đủ từ A–Z, để bạn chỉ việc mang theo niềm cảm hứng và bắt đầu kể câu chuyện của riêng mình qua ống kính.
                <span className="text-2xl text-pink-400 font-serif">"</span>
              </p>

              <div className="pt-6 border-t border-white/20">
                <p className="text-foreground/60 italic">- Minh Thư, Founder & Creative Director</p>
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
                  "Lần đầu thuê máy ảnh chuyên nghiệp, mình hơi lo lắng nhưng chị tư vấn rất kỹ. Máy chụp ảnh chân dung đẹp xuất sắc!",
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
                  chupchoet.digicam
                </h3>
                <p className="text-sm text-foreground/60">Camera Rental</p>
              </div>
            </div>

            <p className="text-foreground/70">Ghi lại những khoảnh khắc đẹp nhất của bạn với thiết bị chuyên nghiệp</p>

            <div className="flex flex-wrap gap-6 justify-center text-sm text-foreground/60 pt-6 border-t border-white/10">
              <a href="tel:0123456789" className="hover:text-pink-400 transition-colors">
                Hotline: 0369399740
              </a>
              <a href="https://www.facebook.com/minhthu.nguyentran.37266" className="hover:text-pink-400 transition-colors">
                Facebook
              </a>
              <a href="https://www.instagram.com/chupchoet.digicam" className="hover:text-pink-400 transition-colors">
                Instagram
              </a>
            </div>

            <p className="text-sm text-foreground/50 pt-6">
              © 2025 chupchoet.digicam. Made with <Heart className="inline h-4 w-4 text-pink-400" /> for photography lovers
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
