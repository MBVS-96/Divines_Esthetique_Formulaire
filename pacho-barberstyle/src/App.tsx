import { BrowserRouter, Route, Routes } from "react-router-dom";
import { I18nProvider } from "@/lib/i18n";
import { Home } from "@/pages/Home";
import { CancelPage } from "@/pages/CancelPage";
import { AdminPage } from "@/pages/AdminPage";
import { LegalPage } from "@/pages/LegalPage";
import { DemoBanner } from "@/components/DemoBanner";

export default function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/annuler" element={<CancelPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/mentions-legales" element={<LegalPage kind="legal" />} />
          <Route path="/confidentialite" element={<LegalPage kind="privacy" />} />
          <Route path="*" element={<Home />} />
        </Routes>
        <DemoBanner />
      </BrowserRouter>
    </I18nProvider>
  );
}
