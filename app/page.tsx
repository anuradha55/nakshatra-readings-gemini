import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Services from "@/components/Services";
import BookingForm from "@/components/BookingForm";
import AiPrediction from "@/components/AiPrediction";
import Starfield from "@/components/Starfield";

export default function Home() {
  return (
    <>
      <Starfield />
      <Navbar />
      <main>
        <Hero />
        <div className="wrap">
          <div className="glyph-divider">☉ ☾ ☿ ♀ ♂</div>
        </div>
        <AiPrediction />
        <About />
        <Services />
        <BookingForm />
      </main>
      <footer>
        <div className="wrap">
          © 2026 Nakshatra Readings · Bookings confirmed by email after payment
        </div>
      </footer>
    </>
  );
}