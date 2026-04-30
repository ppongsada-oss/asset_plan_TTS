import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen relative flex items-center justify-center bg-slate-950 overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Main Login Form Container */}
      <div className="z-10 w-full px-4 flex justify-center">
        <LoginForm />
      </div>
    </div>
  );
}
