import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { Services } from "@/components/Services";
import { VipSection } from "@/components/VipSection";
import { BookingFlow } from "@/components/booking/BookingFlow";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";
import { getProvider } from "@/lib/data";
import type { Service } from "@/lib/types";

export function Home() {
  const [services, setServices] = useState<Service[]>([]);
  const [selected, setSelected] = useState<Service | null>(null);

  useEffect(() => {
    void getProvider().getServices().then(setServices);
  }, []);

  /** Picking a service anywhere on the page jumps to the booking panel. */
  const choose = (service: Service | null) => {
    setSelected(service);
    if (service) {
      requestAnimationFrame(() => {
        document.getElementById("reserver")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  return (
    <>
      <Header />
      <main>
        <Hero />
        <Services services={services} onSelect={choose} />
        <VipSection service={services.find((s) => s.atHome)} onSelect={choose} />
        <BookingFlow services={services} selected={selected} onSelect={choose} />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
