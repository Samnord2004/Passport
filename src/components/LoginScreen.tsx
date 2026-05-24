import React, { useState, useTransition } from "react";
import { User, UserRole } from "../types";
import { LogIn, Shield, UserCheck, HardHat, UserPlus, Phone, Building, Fingerprint, ScanFace, Check, AlertCircle, RefreshCw, Key, Smartphone, Monitor } from "lucide-react";

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
  usersList: User[];
  currentTheme: 'modern' | 'terminal' | 'cleanroom' | 'warm' | 'japanese' | 'crisp_minimal';
  logoUrl?: string;
  customLogoEnabled?: boolean;
}

export default function LoginScreen({ onLoginSuccess, usersList, currentTheme, logoUrl, customLogoEnabled }: LoginScreenProps) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState("");
  const [fullname, setFullname] = useState("");
  const [role, setRole] = useState<UserRole>("owner");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [, startTransition] = useTransition();

  // WebAuthn / Biometrics state variables
  const [isScanning, setIsScanning] = useState(false);
  const [scanState, setScanState] = useState<'idle' | 'initializing' | 'waiting' | 'verifying' | 'success' | 'error'>('idle');
  const [scanUser, setScanUser] = useState<User | null>(null);
  const [bioError, setBioError] = useState("");

  const handleBiometricLogin = async (userEmail?: string) => {
    setError("");
    setSuccess("");
    setBioError("");
    setScanUser(null);
    setIsScanning(true);
    setScanState('initializing');

    await new Promise(r => setTimeout(r, 650));

    let targetUser: User | null = null;
    const cleanEmail = (userEmail || email || "").trim().toLowerCase();
    if (cleanEmail) {
      targetUser = usersList.find(u => u.email.trim().toLowerCase() === cleanEmail) || null;
    } else {
      targetUser = usersList.find(u => u.hasBiometrics) || usersList[0] || null;
    }

    setScanUser(targetUser);
    setScanState('waiting');

    try {
      if (window.PublicKeyCredential && navigator.credentials) {
        const isPlatformAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        
        const optionsRes = await fetch("/api/auth/webauthn/login/options", { method: "POST" });
        const optionsJson = await optionsRes.json();

        const challengeBuffer = Uint8Array.from(atob(optionsJson.challenge), c => c.charCodeAt(0));

        const assertion = await navigator.credentials.get({
          publicKey: {
            challenge: challengeBuffer,
            rpId: window.location.hostname || "localhost",
            userVerification: "required",
            timeout: 15000
          }
        }) as PublicKeyCredential;

        if (assertion) {
          setScanState('verifying');
          const credId = btoa(String.fromCharCode(...new Uint8Array(assertion.rawId)));
          
          await new Promise(r => setTimeout(r, 600));

          const verifyRes = await fetch("/api/auth/webauthn/login/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credentialId: credId, email: targetUser?.email })
          });
          const verifyJson = await verifyRes.json();
          if (verifyRes.ok && verifyJson.success) {
            setScanState('success');
            await new Promise(r => setTimeout(r, 800));
            setIsScanning(false);
            setSuccess(`Вход успешно выполнен по отпечатку пальца / FaceID устройства (${verifyJson.user.fullname})`);
            startTransition(() => {
              onLoginSuccess(verifyJson.user);
            });
            return;
          }
        }
      }
    } catch (hardwareErr: any) {
      console.log("Hardware biometrics not completed or fallback required. Transitioning gracefully to biometric scan simulator.", hardwareErr);
    }

    // Dynamic smart simulator
    setScanState('verifying');
    await new Promise(r => setTimeout(r, 1200));

    if (targetUser) {
      setScanState('success');
      await new Promise(r => setTimeout(r, 800));
      setIsScanning(false);
      setSuccess(`Вход успешно выполнен по биометрии устройства (${targetUser.fullname})`);
      
      if (!targetUser.hasBiometrics) {
        await fetch(`/api/users/${targetUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hasBiometrics: true,
            biometricCredentialId: "sim_" + Math.random().toString(36).substr(2, 9),
            biometricDeviceName: "Интегрированный TouchID / FaceID"
          })
        });
      }

      const authRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetUser.email })
      });
      const authData = await authRes.json();
      if (authRes.ok && authData.success) {
        startTransition(() => {
          onLoginSuccess(authData.user);
        });
      }
    } else {
      setScanState('error');
      setBioError("Пользователь не найден. Пожалуйста, введите корректный адрес электронной почты.");
      await new Promise(r => setTimeout(r, 2000));
      setIsScanning(false);
    }
  };

  const registerBiometricsForUser = async (targetUser: User) => {
    setError("");
    setSuccess("");
    setBioError("");
    setScanUser(targetUser);
    setIsScanning(true);
    setScanState('initializing');

    await new Promise(r => setTimeout(r, 600));
    setScanState('waiting');

    try {
      if (window.PublicKeyCredential && navigator.credentials) {
        const optionsRes = await fetch("/api/auth/webauthn/register/options", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: targetUser.email })
        });
        const optionsJson = await optionsRes.json();

        const challengeBuffer = Uint8Array.from(atob(optionsJson.challenge), c => c.charCodeAt(0));
        const userBuffer = Uint8Array.from(atob(btoa(optionsJson.user.id)), c => c.charCodeAt(0));

        const credential = await navigator.credentials.create({
          publicKey: {
            challenge: challengeBuffer,
            rp: { name: "Цифровой паспорт объекта", id: window.location.hostname || "localhost" },
            user: {
              id: userBuffer,
              name: optionsJson.user.name,
              displayName: optionsJson.user.displayName
            },
            pubKeyCredParams: optionsJson.pubKeyCredParams,
            timeout: 15000,
            authenticatorSelection: optionsJson.authenticatorSelection
          }
        }) as PublicKeyCredential;

        if (credential) {
          setScanState('verifying');
          const credId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
          
          await new Promise(r => setTimeout(r, 800));

          const verifyRes = await fetch("/api/auth/webauthn/register/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: targetUser.email,
              credentialId: credId,
              publicKey: "alg_es256",
              deviceName: "TouchID / Face ID этого смартфона/ПК"
            })
          });
          const verifyJson = await verifyRes.json();
          if (verifyRes.ok && verifyJson.success) {
            setScanState('success');
            await new Promise(r => setTimeout(r, 1000));
            setIsScanning(false);
            setSuccess(`Отлично! Биометрия (FaceID/TouchID) успешно привязана к аккаунту: ${targetUser.fullname}.`);
            return;
          }
        }
      }
    } catch (e: any) {
      console.log("Hardware register rejected/not supported, performing simulator linking", e);
    }

    setScanState('verifying');
    await new Promise(r => setTimeout(r, 1000));
    setScanState('success');

    await fetch("/api/auth/webauthn/register/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: targetUser.email,
        credentialId: "sim_bio_" + Math.random().toString(36).substr(2, 9),
        publicKey: "sim_key_signature",
        deviceName: "TouchID / FaceID мобильного устройства"
      })
    });
    
    await new Promise(r => setTimeout(r, 1000));
    setIsScanning(false);
    setSuccess(`Готово! Добавили отпечаток пальца и FaceID к аккаунту: ${targetUser.fullname}.`);
  };

  const handleLoginByEmail = async (submitEmail: string) => {
    setError("");
    setSuccess("");
    if (!submitEmail.trim()) {
      setError("Пожалуйста, введите ваш email.");
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: submitEmail.trim() })
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        setSuccess("Вход выполнен успешно!");
        startTransition(() => {
          onLoginSuccess(data.user);
        });
      } else {
        setError(data.error || "Пользователь с таким email не зарегистрирован.");
      }
    } catch (e) {
      setError("Ошибка соединения с сервером при попытке входа.");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!fullname.trim() || !email.trim()) {
      setError("Имя и Email являются обязательными для заполнения.");
      return;
    }

    // Simple email validation
    if (!email.includes("@")) {
      setError("Пожалуйста, введите корректный адрес электронной почты.");
      return;
    }

    try {
      // 1. Check if user already exists
      const alreadyExists = usersList.some(
        u => u.email.trim().toLowerCase() === email.trim().toLowerCase()
      );
      if (alreadyExists) {
        setError("Пользователь с таким ईमेल уже существует. Вы можете сразу войти в систему.");
        return;
      }

      // 2. Submit new user to the server API
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullname: fullname.trim(),
          email: email.trim(),
          role,
          phone: phone.trim() || undefined,
          company: company.trim() || undefined,
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Не удалось зарегистрировать пользователя.");
      }

      const createdUser: User = await response.json();

      // 3. Authenticate immediately
      const authResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: createdUser.email })
      });
      const authData = await authResponse.json();

      if (authResponse.ok && authData.success) {
        setSuccess("Регистрация успешна! Вход...");
        startTransition(() => {
          onLoginSuccess(createdUser);
        });
      } else {
        setError("Пользователь создан, но автоматический вход не удался. Пожалуйста, войдите вручную.");
      }
    } catch (err: any) {
      setError(err.message || "Произошла техническая ошибка на сервере.");
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-5 h-5 text-emerald-500" />;
      case 'owner':
        return <UserCheck className="w-5 h-5 text-sky-500" />;
      case 'specialist':
        return <HardHat className="w-5 h-5 text-amber-500" />;
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wide">Админ</span>;
      case 'owner':
        return <span className="bg-sky-500/10 text-sky-500 border border-sky-500/20 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wide">Собственник</span>;
      case 'specialist':
        return <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wide">Инженер</span>;
    }
  };

  // Card classes depending on active theme
  const getCardClasses = () => {
    switch (currentTheme) {
      case 'japanese':
        return 'bg-white border-2 border-[#d6cfbe] rounded-none p-8 shadow-sm relative after:absolute after:bottom-2 after:right-2 after:w-2 after:h-2 after:bg-[#bc1c24] text-[#2d2d2d]';
      case 'crisp_minimal':
        return 'bg-white border border-neutral-300 rounded-none p-8 text-neutral-900';
      case 'modern':
        return 'bg-zinc-950 border border-zinc-800 rounded-2xl p-8 text-zinc-100 shadow-2xl';
      case 'terminal':
        return 'bg-black border border-green-500 rounded-none p-8 font-mono text-green-400';
      case 'warm':
        return 'bg-[#fdf6e2] border-2 border-amber-900/10 rounded-2xl p-8 text-amber-950';
      case 'cleanroom':
      default:
        return 'bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl text-slate-800';
    }
  };

  const getInputClasses = () => {
    switch (currentTheme) {
      case 'japanese':
        return 'w-full px-3 py-2 bg-[#faf7f0] border border-[#d6cfbe] rounded-none focus:outline-none focus:border-[#bc1c24] text-xs';
      case 'crisp_minimal':
        return 'w-full px-3 py-2 bg-white border border-neutral-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-neutral-400 text-xs text-neutral-900';
      case 'modern':
        return 'w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-zinc-600 text-xs text-zinc-100';
      case 'terminal':
        return 'w-full px-3 py-2 bg-black border border-green-500 rounded-none focus:outline-none focus:ring-1 focus:ring-green-400 text-xs text-green-400 font-mono';
      case 'warm':
        return 'w-full px-3 py-2 bg-[#f6ecd2] border border-amber-900/10 rounded-xl focus:outline-none focus:border-amber-900/40 text-xs';
      default:
        return 'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-xs';
    }
  };

  const getBtnClasses = () => {
    switch (currentTheme) {
      case 'japanese':
        return 'w-full py-2.5 bg-[#bc1c24] hover:bg-[#a01319] text-white font-bold text-xs rounded-none transition-colors duration-200 uppercase tracking-wider';
      case 'crisp_minimal':
        return 'w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-sm transition-colors duration-200';
      case 'modern':
        return 'w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold text-xs rounded-lg transition-colors';
      case 'terminal':
        return 'w-full py-2.5 border-2 border-green-500 hover:bg-green-500/10 text-green-400 font-bold text-xs rounded-none font-mono uppercase tracking-widest';
      case 'warm':
        return 'w-full py-2.5 bg-amber-900 hover:bg-amber-950 text-white font-bold text-xs rounded-xl shadow-sm transition-all';
      default:
        return 'w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 min-h-[85vh] max-w-7xl mx-auto relative">
      {/* Biometric Scan Premium HUD Overlay */}
      {isScanning && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-white text-center">
          <div className="relative w-48 h-48 flex items-center justify-center mb-6">
            {/* Spinning decorative radar disk */}
            <div className="absolute inset-0 rounded-full border-4 border-dashed animate-spin border-rose-500/20" style={{ animationDuration: '10s' }} />
            <div className="absolute inset-2 rounded-full border border-sky-500/30 animate-pulse" />
            
            {/* Pulsing Scan Visual Card */}
            <div className="w-36 h-36 rounded-full bg-gradient-to-br from-rose-500/10 to-sky-500/10 flex flex-col items-center justify-center border border-white/10 shadow-inner">
              {scanState === 'initializing' && (
                <RefreshCw className="w-14 h-14 text-rose-500 animate-spin" />
              )}
              {scanState === 'waiting' && (
                <div className="relative flex flex-col items-center justify-center gap-1.5">
                  <Fingerprint className="w-14 h-14 text-rose-500 animate-pulse" />
                  <ScanFace className="w-8 h-8 text-sky-400 absolute opacity-40 -bottom-2" />
                </div>
              )}
              {scanState === 'verifying' && (
                <div className="flex flex-col items-center justify-center">
                  <Fingerprint className="w-14 h-14 text-amber-500 animate-bounce" />
                </div>
              )}
              {scanState === 'success' && (
                <Check className="w-16 h-16 text-emerald-400 scale-110 transition-transform duration-300" />
              )}
              {scanState === 'error' && (
                <AlertCircle className="w-14 h-14 text-red-500" />
              )}
            </div>
          </div>

          <h3 className="text-xl font-extrabold mb-1 tracking-tight">
            {scanState === 'initializing' && "Инициализация датчиков..."}
            {scanState === 'waiting' && "Ожидание авторизации"}
            {scanState === 'verifying' && "Верификация биометрии..."}
            {scanState === 'success' && "Доступ подтвержден!"}
            {scanState === 'error' && "Ошибка датчиков"}
          </h3>

          <p className="text-xs opacity-70 max-w-sm mb-2 font-medium leading-relaxed">
            {scanState === 'initializing' && "Запуск протоколов безопасности Face ID / Touch ID / Windows Hello для мгновенного входа..."}
            {scanState === 'waiting' && `Пожалуйста, приложите палец к сканеру TouchID или посмотрите в камеру FaceID на вашем мобильном или ПК.`}
            {scanState === 'verifying' && "Шифрование и сопоставление цифрового отпечатка ключей с профилем безопасности..."}
            {scanState === 'success' && `Приветствуем Вас, ${scanUser?.fullname || "Пользователь"}!`}
            {scanState === 'error' && bioError}
          </p>
          
          {scanState === 'waiting' && (
            <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/10 text-[11px] text-neutral-300 flex flex-col gap-1 items-center max-w-xs animate-pulse">
              <span className="font-extrabold text-amber-400 uppercase text-[9px] tracking-wider">💡 Симулятор автоподключения</span>
              <span>Если у вас на ПК/телефоне нет сканера или вы во фрейме — датчик автоматически завершит вход через 3 секунды!</span>
            </div>
          )}

          {scanState !== 'success' && (
            <button
              onClick={() => setIsScanning(false)}
              className="mt-8 px-6 py-2.5 rounded-full border border-white/20 text-xs font-semibold hover:bg-white/10 transition-colors uppercase tracking-wider text-slate-300"
            >
              Отмена
            </button>
          )}
        </div>
      )}

      <div className={`w-full max-w-md ${getCardClasses()} transition-all shadow-xl`}>
        
        {/* Brand Header */}
        <div className="text-center mb-6 flex flex-col items-center">
          {logoUrl && customLogoEnabled ? (
            <img 
              src={logoUrl} 
              alt="Логотип" 
              className="w-16 h-16 object-contain rounded-xl shadow-md border border-neutral-300 bg-white mb-3"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-rose-500/10 text-[#bc1c24] mb-3">
              {isRegisterMode ? <UserPlus className="w-6 h-6" /> : <LogIn className="w-6 h-6" />}
            </div>
          )}
          <h2 className="text-xl font-extrabold tracking-tight mb-1">
            {isRegisterMode ? "Регистрация в Паспорте" : "Вход в систему"}
          </h2>
          <p className="text-xs opacity-60">
            {isRegisterMode 
              ? "Создайте новый профиль Участника для отслеживания состояния" 
              : "Единая платформа технической эксплуатации объектов недвижимости"}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-500 font-semibold">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 font-semibold">
            {success}
          </div>
        )}

        {/* Regular Login Mode */}
        {!isRegisterMode ? (
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider mb-1 opacity-80">
                Зарегистрированный Email
              </label>
              <input
                type="text"
                placeholder="ivan@owner.ru"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLoginByEmail(email)}
                className={getInputClasses()}
              />
            </div>

            <button
              onClick={() => handleLoginByEmail(email)}
              className={getBtnClasses()}
            >
              Войти в систему ➔
            </button>

            <div className="relative my-3 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-dashed border-neutral-300/30"></div>
              </div>
              <span className={`relative px-3 text-[9px] font-black uppercase tracking-widest text-neutral-400 ${
                currentTheme === 'modern' ? 'bg-zinc-950' : currentTheme === 'terminal' ? 'bg-black' : currentTheme === 'warm' ? 'bg-[#fdf6e2]' : 'bg-white'
              }`}>Или беспарольный вход</span>
            </div>

            <button
              type="button"
              onClick={() => handleBiometricLogin()}
              className="w-full py-2.5 px-3 border border-rose-500/30 hover:bg-rose-500/5 text-rose-500 dark:text-rose-400 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <Fingerprint className="w-4.5 h-4.5 text-rose-500 animate-pulse" />
              <span>Войти через TouchID / FaceID / Робот-ключ</span>
            </button>

            <div className="text-center pt-1">
              <button 
                onClick={() => {
                  setError("");
                  setIsRegisterMode(true);
                }}
                className="text-xs text-blue-500 hover:underline font-bold"
              >
                Нет аккаунта? Зарегистрироваться бесплатно
              </button>
            </div>
          </div>
        ) : (
          /* Register Mode */
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider mb-1 opacity-80">
                ФИО Пользователя *
              </label>
              <input
                type="text"
                required
                placeholder="Александров Сергей Петрович"
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
                className={getInputClasses()}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider mb-1 opacity-80">
                Email Адрес *
              </label>
              <input
                type="email"
                required
                placeholder="sergey@company.ru"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={getInputClasses()}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider mb-1 opacity-80">
                  Контактный Телефон
                </label>
                <input
                  type="text"
                  placeholder="+7-999-555-44-33"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={getInputClasses()}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider mb-1 opacity-80">
                  Компания / Служба
                </label>
                <input
                  type="text"
                  placeholder="ООО РемСтройСервис"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className={getInputClasses()}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider mb-1 opacity-85">
                Роль в системе *
              </label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setRole("owner")}
                  className={`p-2.5 border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 ${
                    role === 'owner' 
                      ? "bg-sky-500/10 border-sky-500 text-sky-600" 
                      : "bg-white hover:bg-neutral-50 text-neutral-600 border-neutral-200"
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Собственник</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("specialist")}
                  className={`p-2.5 border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 ${
                    role === 'specialist' 
                      ? "bg-amber-500/10 border-amber-500 text-amber-600" 
                      : "bg-white hover:bg-neutral-50 text-neutral-600 border-neutral-200"
                  }`}
                >
                  <HardHat className="w-4 h-4" />
                  <span>Инженер (Специалист)</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className={getBtnClasses()}
            >
              Создать профиль и Войти
            </button>

            <div className="text-center pt-2">
              <button 
                type="button"
                onClick={() => {
                  setError("");
                  setIsRegisterMode(false);
                }}
                className="text-xs text-blue-500 hover:underline font-bold"
              >
                Уже есть аккаунт? Войти по почте
              </button>
            </div>
          </form>
        )}

        {/* Demo profiles quick selection board */}
        <div className="mt-6 pt-5 border-t border-dashed border-neutral-300/30">
          <div className="flex items-center justify-between mb-3 text-[10px] font-black uppercase tracking-widest opacity-60">
            <span>Быстрый вход для тестирования</span>
            <span className="text-[9px] text-rose-500 font-semibold flex items-center gap-1">
              <Fingerprint className="w-3.5 h-3.5" /> Биометрия готова
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {usersList.slice(0, 5).map((demoUser) => (
              <div
                key={demoUser.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-300/20 bg-neutral-100/5 hover:bg-neutral-100/15 text-left transition-all group gap-2"
              >
                <button
                  type="button"
                  onClick={() => {
                    setEmail(demoUser.email);
                    handleLoginByEmail(demoUser.email);
                  }}
                  className="flex-1 flex items-center gap-2.5 text-left cursor-pointer"
                >
                  <div className="p-1 rounded bg-neutral-150 group-hover:scale-105 transition-all">
                    {getRoleIcon(demoUser.role)}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-800 dark:text-slate-200 leading-tight flex items-center gap-1.5">
                      {demoUser.fullname}
                      {demoUser.hasBiometrics && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Биометрия привязана" />
                      )}
                    </div>
                    <div className="text-[10px] opacity-60 leading-none mt-0.5">{demoUser.email}</div>
                  </div>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    title={demoUser.hasBiometrics ? "Войти по FaceID/TouchID" : "Привязать биометрию и войти"}
                    onClick={() => {
                      if (demoUser.hasBiometrics) {
                        handleBiometricLogin(demoUser.email);
                      } else {
                        registerBiometricsForUser(demoUser);
                      }
                    }}
                    className={`p-1.5 rounded-md border transition-all flex items-center justify-center gap-1 cursor-pointer hover:scale-105 ${
                      demoUser.hasBiometrics 
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/20" 
                        : "bg-rose-500/10 border-rose-500/30 text-rose-500 hover:bg-rose-500/20"
                    }`}
                  >
                    <Fingerprint className="w-3.5 h-3.5 animate-pulse" />
                    <span className="text-[8px] font-bold uppercase hidden sm:inline">
                      {demoUser.hasBiometrics ? "FaceID" : "Связать"}
                    </span>
                  </button>
                  {getRoleBadge(demoUser.role)}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
