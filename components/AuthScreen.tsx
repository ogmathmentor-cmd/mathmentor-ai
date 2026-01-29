import React, { useState, useMemo } from 'react';
import { Mail, Lock, User, ArrowRight, GraduationCap, X, Eye, EyeOff, ShieldCheck, ShieldAlert, Loader2, CheckSquare, Square, Chrome, AlertTriangle, ExternalLink } from 'lucide-react';
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

interface AuthScreenProps {
  onBack: () => void;
  onLogin: (user: { name: string; email: string; pfp: string }) => void;
}

type AuthMode = 'login' | 'signup' | 'recovery';

const AuthScreen: React.FC<AuthScreenProps> = ({ onBack, onLogin }) => {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const parseFirebaseError = (err: any) => {
    const code = err.code || "";
    const message = err.message || "";
    
    if (code === 'auth/unauthorized-domain' || message.includes('unauthorized-domain')) {
      return (
        <div className="space-y-2 text-left">
          <div className="font-bold flex items-center gap-2">
             <AlertTriangle size={14} /> Unauthorized Domain
          </div>
          <p className="text-[10px] leading-tight opacity-90">
            This domain is not authorized in your Firebase Project. 
            To fix this, go to:
          </p>
          <div className="bg-black/20 p-2 rounded-lg text-[9px] font-bold">
            Firebase Console &rarr; Authentication &rarr; Settings &rarr; Authorized domains
          </div>
          <p className="text-[10px] leading-tight opacity-90">And add this hostname:</p>
          <code className="block bg-black/30 p-1.5 rounded text-[10px] font-mono break-all select-all">
            {window.location.hostname}
          </code>
          <a 
            href="https://console.firebase.google.com/" 
            target="_blank" 
            className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 underline font-bold mt-1"
          >
            Open Console <ExternalLink size={10} />
          </a>
        </div>
      );
    }
    
    return `Error (${code || 'Unknown'}). ${message.replace("Firebase: ", "")}`;
  };

  const passwordStrength = useMemo(() => {
    if (!password) return 0;
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;
    return strength;
  }, [password]);

  const strengthColor = useMemo(() => {
    if (passwordStrength <= 25) return 'bg-red-500';
    if (passwordStrength <= 50) return 'bg-amber-500';
    if (passwordStrength <= 75) return 'bg-blue-500';
    return 'bg-emerald-500';
  }, [passwordStrength]);

  const strengthLabel = useMemo(() => {
    if (passwordStrength <= 25) return 'Weak';
    if (passwordStrength <= 50) return 'Fair';
    if (passwordStrength <= 75) return 'Good';
    return 'Strong';
  }, [passwordStrength]);

  const validateEmail = (email: string) => {
    return String(email).toLowerCase().trim().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  };

  const syncUserProfile = async (firebaseUser: any, defaultName?: string) => {
    const docRef = doc(db, "users", firebaseUser.uid);
    const docSnap = await getDoc(docRef);
    
    const displayName = firebaseUser.displayName || defaultName || (firebaseUser.isAnonymous ? 'Guest Student' : firebaseUser.email?.split('@')[0]) || 'Scholar';
    const pfp = firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`;

    if (!docSnap.exists()) {
      await setDoc(docRef, {
        email: firebaseUser.email || '',
        name: displayName,
        level: "Secondary",
        mode: "learning",
        onboardingShown: false,
        zoom: 100,
        createdAt: new Date(),
        isAnonymous: firebaseUser.isAnonymous
      });
    }

    onLogin({ name: displayName, email: firebaseUser.email || 'Private', pfp });
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const provider = new GoogleAuthProvider();
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        // Redirect logic: page will reload, App.tsx handles the result.
        await signInWithRedirect(auth, provider);
      } else {
        const result = await signInWithPopup(auth, provider);
        await syncUserProfile(result.user);
      }
    } catch (err: any) {
      setError(parseFirebaseError(err));
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    try {
      if (authMode === 'recovery') {
        if (!validateEmail(recoveryEmail)) throw new Error("Please enter a valid email.");
        await sendPasswordResetEmail(auth, recoveryEmail);
        setSuccessMsg(`Recovery instructions sent to ${recoveryEmail}.`);
        setIsSubmitting(false);
        return;
      }

      if (!validateEmail(cleanEmail)) throw new Error("Please enter a valid email address.");

      if (authMode === 'login') {
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
        await syncUserProfile(userCredential.user);
      } else if (authMode === 'signup') {
        if (passwordStrength < 75) throw new Error("Password is too weak.");
        if (password !== confirmPassword) throw new Error("Passwords do not match.");
        if (!agreedToTerms) throw new Error("You must agree to the terms.");

        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        const user = userCredential.user;
        const pfp = `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanEmail}`;
        await updateProfile(user, { displayName: cleanName, photoURL: pfp });
        await syncUserProfile(user, cleanName);
      }
    } catch (err: any) {
      setError(parseFirebaseError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-300" onClick={onBack} />
      
      <div className="w-full max-w-md z-10 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-500 relative">
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl p-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
          <button onClick={onBack} className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"><X size={20} /></button>
          
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 mb-4 group overflow-hidden">
               {isSubmitting ? <Loader2 size={32} className="animate-spin" /> : <GraduationCap size={32} className="group-hover:scale-110" />}
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight text-center">
              {authMode === 'login' ? 'Welcome Back' : authMode === 'signup' ? 'Join MathMentor' : 'Recover Account'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2 flex items-center gap-1.5 text-center">
              <ShieldCheck size={12} className="text-emerald-500" /> Secure Access
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-950/40 border border-red-500/40 rounded-2xl flex items-start gap-3 text-red-400 text-xs font-bold animate-in shake duration-300">
              <ShieldAlert size={18} className="flex-shrink-0 mt-0.5 text-red-500" />
              <div className="flex-1">{error}</div>
            </div>
          )}
          
          {successMsg && (
            <div className="mb-6 p-4 bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/40 rounded-2xl flex items-center gap-3 text-emerald-600 dark:text-emerald-400 text-xs font-bold animate-in zoom-in-95">
              <CheckSquare size={18} /> {successMsg}
            </div>
          )}

          {/* Social Logins */}
          {(authMode === 'login' || authMode === 'signup') && (
            <div className="mb-6">
              <button 
                onClick={handleGoogleSignIn} 
                disabled={isSubmitting} 
                className="w-full flex items-center justify-center gap-3 py-4 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-black text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-sm"
              >
                <Chrome size={18} className="text-indigo-500" /> Sign in with Google
              </button>
            </div>
          )}

          <div className="relative flex items-center justify-center mb-6">
            <div className="w-full h-px bg-slate-100 dark:bg-slate-800"></div>
            <span className="absolute px-3 bg-white dark:bg-slate-900 text-[10px] font-black text-slate-400 uppercase tracking-widest">Or continue with</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {authMode === 'recovery' ? (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Account Email</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500"><Mail size={18} /></div>
                  <input type="email" required value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} className="block w-full pl-10 pr-3 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-700 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 dark:text-white" placeholder="Enter account email" />
                </div>
              </div>
            ) : (
              <>
                {authMode === 'signup' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500"><User size={18} /></div>
                      <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="block w-full pl-10 pr-3 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-700 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 dark:text-white" placeholder="Enter your name" />
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500"><Mail size={18} /></div>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="block w-full pl-10 pr-3 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-700 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 dark:text-white" placeholder="name@example.com" />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Password</label>
                    {authMode === 'login' && <button type="button" onClick={() => setAuthMode('recovery')} className="text-[10px] font-black text-indigo-500 hover:text-indigo-600 uppercase tracking-widest">Forgot?</button>}
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500"><Lock size={18} /></div>
                    <input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} className="block w-full pl-10 pr-12 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-700 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 dark:text-white" placeholder="••••••••" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-indigo-500 transition-colors">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                  </div>
                  {authMode === 'signup' && password && (
                    <div className="mt-2 space-y-1.5 animate-in fade-in">
                      <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-400"><span>Strength: {strengthLabel}</span><span>{passwordStrength}%</span></div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"><div className={`h-full transition-all duration-500 ${strengthColor}`} style={{ width: `${passwordStrength}%` }} /></div>
                    </div>
                  )}
                </div>
                {authMode === 'signup' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Confirm Password</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500"><ShieldCheck size={18} /></div>
                      <input type={showPassword ? 'text' : 'password'} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="block w-full pl-10 pr-3 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-700 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 dark:text-white" placeholder="Repeat password" />
                    </div>
                  </div>
                )}
                {authMode === 'signup' && (
                  <button type="button" onClick={() => setAgreedToTerms(!agreedToTerms)} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left">
                    <div className="mt-0.5 text-indigo-600">{agreedToTerms ? <CheckSquare size={16} /> : <Square size={16} />}</div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal font-medium">I agree to the <span className="text-indigo-500 font-bold">Terms</span> and <span className="text-indigo-500 font-bold">Privacy Policy</span>.</p>
                  </button>
                )}
              </>
            )}
            
            <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 mt-2 disabled:opacity-50">
              {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 
                authMode === 'login' ? 'Sign In with Email' : 
                authMode === 'signup' ? 'Create Account' : 
                'Reset Password'
              }
              {!isSubmitting && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center flex flex-col gap-3">
            <button onClick={() => { setAuthMode(authMode === 'signup' ? 'login' : 'signup'); setError(null); setSuccessMsg(null); }} className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              {authMode === 'signup' ? "Already have an account?" : "Don't have an account?"}{' '}
              <span className="text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-widest">{authMode === 'signup' ? 'Log In' : 'Sign Up'}</span>
            </button>
            {authMode === 'recovery' && (
              <button onClick={() => { setAuthMode('login'); setError(null); setSuccessMsg(null); }} className="text-xs font-black text-indigo-500 uppercase tracking-widest">Back to Login</button>
            )}
          </div>
        </div>
        <p className="mt-6 text-center text-[9px] text-slate-400 dark:text-slate-600 font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2"><ShieldCheck size={12} /> Global Identity Secured</p>
      </div>
    </div>
  );
};

export default AuthScreen;