import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Guard } from './components/Guard';
import { Shell } from './components/Shell';
import { ToastProvider } from './components/Toast';
import Login from './pages/Login';
import Account from './pages/Account';
import Overview from './pages/Overview';
import SellerRequests from './pages/SellerRequests';
import Companies from './pages/Companies';
import CompanyDetail from './pages/CompanyDetail';
import CompanyMaterials from './pages/CompanyMaterials';
import UsersPage from './pages/Users';
import UserDetail from './pages/UserDetail';
import Products from './pages/Products';
import Taxonomy from './pages/Taxonomy';
import Banners from './pages/Banners';
import ProductRequests from './pages/ProductRequests';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Invoices from './pages/Invoices';
import Quotations from './pages/Quotations';
import Returns from './pages/Returns';
import Wallets from './pages/Wallets';
import Withdrawals from './pages/Withdrawals';
import Credit from './pages/Credit';
import Discounts from './pages/Discounts';
import DeliveryFees from './pages/DeliveryFees';
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
              <Route path="/sellers" element={<SellerRequests />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/companies/:id" element={<CompanyDetail />} />
              <Route path="/companies/:id/materials" element={<CompanyMaterials />} />
              <Route path="/users" element={<Navigate to="/users/buyers" replace />} />
              <Route path="/users/buyers" element={<UsersPage kind="buyers" />} />
              <Route path="/users/sellers" element={<UsersPage kind="sellers" />} />
              <Route path="/users/:id" element={<UserDetail />} />
              <Route path="/catalog/products" element={<Products />} />
              <Route path="/catalog/taxonomy" element={<Taxonomy />} />
              <Route path="/catalog/banners" element={<Banners />} />
              <Route path="/catalog/requests" element={<ProductRequests />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/orders/:id" element={<OrderDetail />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/quotations" element={<Quotations />} />
              <Route path="/returns" element={<Returns />} />
              <Route path="/wallets" element={<Wallets />} />
              <Route path="/withdrawals" element={<Withdrawals />} />
              <Route path="/credit" element={<Credit />} />
              <Route path="/discounts" element={<Discounts />} />
              <Route path="/delivery-fees" element={<DeliveryFees />} />
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
