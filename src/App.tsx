import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Guard } from './components/Guard';
import { Shell } from './components/Shell';
import { ToastProvider } from './components/Toast';
import Login from './pages/Login';
import Account from './pages/Account';
import Overview from './pages/Overview';
import CompanyDetail from './pages/CompanyDetail';
import CompanyMaterials from './pages/CompanyMaterials';
import AccountsPage from './pages/accounts/AccountsPage';
import UserDetail from './pages/UserDetail';
import Products from './pages/Products';
import Taxonomy from './pages/Taxonomy';
import Banners from './pages/Banners';
import ProductRequests from './pages/ProductRequests';
import ProductSubmissions from './pages/ProductSubmissions';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Invoices from './pages/Invoices';
import Returns from './pages/Returns';
import Wallets from './pages/Wallets';
import Finance from './pages/Finance';
import Support from './pages/Support';
import NotificationsPage from './pages/Notifications';
import SettingsPage from './pages/Settings';
import AuditLog from './pages/AuditLog';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <Guard>
                  <Shell />
                </Guard>
              }
            >
              <Route path="/" element={<Overview />} />

              {/* تحويلات المسارات القديمة — عشان البوكماركس ماتكسرش */}
              <Route path="/sellers" element={<Navigate to="/accounts/sellers" replace />} />
              <Route path="/companies" element={<Navigate to="/accounts/sellers" replace />} />
              <Route path="/users" element={<Navigate to="/accounts/individuals" replace />} />
              <Route path="/users/buyers" element={<Navigate to="/accounts/individuals" replace />} />
              <Route path="/users/sellers" element={<Navigate to="/accounts/sellers" replace />} />
              <Route path="/catalog/requests" element={<Navigate to="/requests/materials" replace />} />

              <Route path="/companies/:id" element={<CompanyDetail />} />
              <Route path="/companies/:id/materials" element={<CompanyMaterials />} />
              <Route path="/users/:id" element={<UserDetail />} />

              <Route path="/accounts" element={<Navigate to="/accounts/individuals" replace />} />
              {/* الـ key إجباري: التلات تابات نفس نوع المكوّن في نفس مكان الشجرة، فدون
                  key بيعيد React استخدام نفس الـ instance ويسيب الـ state (الفرز والبحث
                  والصفحة) شغّال بعد تبديل التاب — يعني ترتيب بعمود مالوش وجود في التاب
                  الجديد ومن غير أي طريقة لمسحه. الـ key بيجبر remount بحالة نضيفة. */}
              <Route path="/accounts/individuals" element={<AccountsPage key="individual" kind="individual" />} />
              <Route path="/accounts/companies" element={<AccountsPage key="company_buyer" kind="company_buyer" />} />
              <Route path="/accounts/sellers" element={<AccountsPage key="seller" kind="seller" />} />
              <Route path="/catalog/products" element={<Products />} />
              <Route path="/catalog/taxonomy" element={<Taxonomy />} />
              <Route path="/catalog/banners" element={<Banners />} />
              <Route path="/requests/materials" element={<ProductRequests />} />
              <Route path="/catalog/submissions" element={<ProductSubmissions />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/orders/:id" element={<OrderDetail />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/returns" element={<Returns />} />
              <Route path="/wallets" element={<Wallets />} />
              <Route path="/finance" element={<Finance />} />
              <Route path="/withdrawals" element={<Navigate to="/wallets" replace />} />
              <Route path="/credit" element={<Navigate to="/" replace />} />
              <Route path="/discounts" element={<Navigate to="/" replace />} />
              <Route path="/delivery-fees" element={<Navigate to="/" replace />} />
              <Route path="/support" element={<Support />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/audit" element={<AuditLog />} />
              <Route path="/account" element={<Account />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}
