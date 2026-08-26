// المسار القديم `/catalog/submissions` — العرض اتنقل لتاب «اقتراحات البائعين»
// داخل طلبات المواد عشان الأدمن يشوف فورم البائع كامل من نفس الصفحة.
import { Navigate } from 'react-router-dom';

export default function ProductSubmissions() {
  return <Navigate to="/requests/materials?tab=sellers" replace />;
}
