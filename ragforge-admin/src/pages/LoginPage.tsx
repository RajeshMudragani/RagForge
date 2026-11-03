import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Bot, Eye, EyeOff } from "lucide-react";
import { authApi } from "../api/auth.api";
import { useAuth } from "../store/auth.store";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

export function LoginPage() {
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const [tab, setTab] = useState<"login" | "register">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [tenantId, setTenantId] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    if (isAuthenticated) return <Navigate to="/chat" replace />;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res =
                tab === "login"
                    ? await authApi.login(email, password)
                    : await authApi.register(email, password, firstName, lastName, tenantId || undefined);
            const { accessToken, refreshToken, user } = res.data.data;
            login(accessToken, refreshToken, user);
            navigate("/chat");
        } catch (err: unknown) {
            const apiError = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error;
            setError(apiError?.message ?? "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-brand-50 via-surface-50 to-surface-100 flex items-center justify-center p-4">
            {/* Background blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-100 rounded-full opacity-40 blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-surface-200 rounded-full opacity-40 blur-3xl" />
            </div>

            <div className="w-full max-w-md relative">
                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center mb-4 shadow-panel">
                        <Bot className="h-9 w-9 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-[#1e1c1a] tracking-tight">RAG Studio</h1>
                    <p className="text-base text-surface-500 mt-1">AI-powered document intelligence</p>
                </div>

                <div className="bg-white rounded-3xl shadow-panel border border-surface-200 p-5 sm:p-8">
                    {/* Tab switcher */}
                    <div className="flex rounded-2xl bg-surface-100 p-1 mb-6">
                        {(["login", "register"] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => { setTab(t); setError(""); }}
                                className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all capitalize ${
                                    tab === t
                                        ? "bg-white shadow text-[#1e1c1a]"
                                        : "text-surface-500 hover:text-surface-700"
                                }`}
                            >
                                {t === "login" ? "Sign in" : "Sign up"}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {tab === "register" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <Input id="firstName" label="First name" placeholder="Jane"
                                    value={firstName} onChange={(e) => setFirstName(e.target.value)} required autoFocus />
                                <Input id="lastName" label="Last name" placeholder="Doe"
                                    value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                            </div>
                        )}
                        <Input id="email" label="Email" type="email" placeholder="you@company.com"
                            value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus={tab === "login"} />
                        <Input
                            id="password" label="Password"
                            type={showPassword ? "text" : "password"} placeholder="••••••••"
                            value={password} onChange={(e) => setPassword(e.target.value)} required
                            rightIcon={
                                <button type="button" onClick={() => setShowPassword(v => !v)}
                                    className="text-surface-400 hover:text-surface-600 transition-colors"
                                    aria-label={showPassword ? "Hide password" : "Show password"}>
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            }
                            hint={tab === "register" ? "Minimum 8 characters" : undefined}
                        />
                        {tab === "register" && (
                            <Input id="tenantId" label="Tenant ID" placeholder="Leave blank to create new"
                                value={tenantId} onChange={(e) => setTenantId(e.target.value)}
                                hint="Optional — join an existing organisation" />
                        )}
                        {error && (
                            <div className="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                                {error}
                            </div>
                        )}
                        <Button type="submit" size="lg" loading={loading} className="w-full mt-2">
                            {tab === "login" ? "Sign in" : "Create account"}
                        </Button>
                    </form>
                </div>

                <p className="text-center text-sm text-surface-400 mt-6">
                    Enterprise-grade RAG · Built with OpenRouter &amp; PostgreSQL
                </p>
            </div>
        </div>
    );
}
