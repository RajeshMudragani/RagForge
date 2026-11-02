import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./store/auth.store";
import { AppLayout } from "./components/layout/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { ChatPage } from "./pages/ChatPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { CollectionsPage } from "./pages/CollectionsPage";

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/" element={<AppLayout />}>
                        <Route index element={<Navigate to="/chat" replace />} />
                        <Route path="chat" element={<ChatPage />} />
                        <Route path="chat/:conversationId" element={<ChatPage />} />
                        <Route path="documents" element={<DocumentsPage />} />
                        <Route path="collections" element={<CollectionsPage />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/chat" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}
