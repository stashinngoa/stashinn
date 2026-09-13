'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { requestOTP, verifyOTP } from './actions';

function LoginForm() {
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next') || '/dashboard';
  const urlError = searchParams.get('error');

  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  
  const hasAutoLoginParam = nextUrl.includes('autoLogin=true');
  const [isProcessing, setIsProcessing] = useState(hasAutoLoginParam);
  const [isAutoLogin, setIsAutoLogin] = useState(hasAutoLoginParam);
  const [error, setError] = useState(urlError || '');
  const [message, setMessage] = useState('');

  // Handle Supabase implicit flow hash (#access_token=...)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
      setIsProcessing(true); // Hide form immediately to prevent split-second flash
      setIsAutoLogin(true);
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      import('@stashinn/lib/supabase/client').then(({ createClient }) => {
        const supabase = createClient();
        
        if (accessToken && refreshToken) {
          // Force set the session to guarantee the cookie gets written
          supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          }).then(({ data }) => {
            if (data.session) {
              setTimeout(() => {
                window.location.href = nextUrl;
              }, 1000);
            }
          });
        } else {
          // Fallback to auto-detection
          supabase.auth.getSession().then(({ data }) => {
            if (data.session) {
              setTimeout(() => {
                window.location.href = nextUrl;
              }, 1000);
            }
          });
        }
      });
    }
  }, [nextUrl]);

  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [verificationToken, setVerificationToken] = useState<string>('');

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsProcessing(true);

    const isEmail = identifier.includes('@');

    try {
      if (isEmail) {
        // Supabase Native Email Auth
        const { createClient } = await import('@stashinn/lib/supabase/client');
        const supabase = createClient();
        const { error: err } = await supabase.auth.signInWithOtp({
          email: identifier,
          options: {
            shouldCreateUser: false // Only allow login for existing guests
          }
        });
        
        if (err) {
          setError(err.message.includes('Signups not allowed') ? 'No account found with this email. Please book a space first to create an account.' : err.message);
        } else {
          setStep('verify');
          setMessage('Email OTP sent! Please check your inbox.');
        }
      } else {
        // Fast2SMS Phone Auth (via server action)
        const res = await requestOTP(identifier);
        if (res.error) {
          setError(res.error);
        } else {
          setVerificationToken(res.verificationToken || '');
          setStep('verify');
          setMessage('SMS OTP sent to your phone!');
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to send OTP. Please try again.');
    }

    setIsProcessing(false);
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsProcessing(true);

    const isEmail = identifier.includes('@');

    try {
      if (isEmail) {
        // Supabase Native Email Auth
        const { createClient } = await import('@stashinn/lib/supabase/client');
        const supabase = createClient();
        const { error: err, data } = await supabase.auth.verifyOtp({
          email: identifier,
          token: otp,
          type: 'email'
        });
        
        if (err) {
          setError(err.message);
          setIsProcessing(false);
        } else {
          window.location.href = nextUrl; // Directly redirect, session is set
        }
      } else {
        // Fast2SMS Phone Auth Verification (via server action)
        const res = await verifyOTP(identifier, otp, nextUrl, verificationToken);
        
        if (res.error) {
          setError(res.error);
          setIsProcessing(false);
        } else if (res.redirectUrl) {
          window.location.href = res.redirectUrl;
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Invalid OTP.');
      setIsProcessing(false);
    }
  };

  if (isAutoLogin) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-brand-orange border-t-transparent rounded-full animate-spin mb-4"></div>
          <h2 className="text-xl font-bold text-gray-900">Setting up your session...</h2>
          <p className="text-gray-500 mt-2">You will be redirected momentarily.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-950 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-900 p-10 rounded-xl shadow-lg dark:shadow-2xl dark:border dark:border-gray-800">
        <div>
          <div className="flex justify-center mb-4">
            <img src="/StashInn_Light.png" alt="StashInn" className="h-16 w-auto dark:hidden" />
            <img src="/StashInn_Dark.png" alt="StashInn" className="h-16 w-auto hidden dark:block" />
          </div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Sign in to StashInn
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Customer Portal (Passwordless)
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm text-center border border-red-200">
            {error}
          </div>
        )}
        
        {message && (
          <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm text-center border border-green-200 font-medium">
            {message}
          </div>
        )}

        {step === 'request' ? (
          <form className="mt-8 space-y-6" onSubmit={handleRequestOTP}>
            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email or Mobile Number
              </label>
              <input
                id="identifier"
                type="text"
                required
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white placeholder-gray-500 rounded-lg focus:outline-none focus:ring-brand-orange focus:border-brand-orange sm:text-sm"
                placeholder="e.g. rahul@example.com or 9876543210"
              />
            </div>

            <button
              id="request-otp-button"
              type="submit"
              disabled={isProcessing || !identifier}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-brand-orange hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-orange disabled:opacity-50 transition-colors"
            >
              {isProcessing ? 'Sending...' : 'Request OTP'}
            </button>
            
            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
              <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                New to StashInn? <br/> Just book a space as a guest to create your account!
              </p>
            </div>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleVerifyOTP}>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enter 6-Digit OTP
                </label>
                <button 
                  type="button" 
                  onClick={() => {
                    setStep('request');
                    setOtp('');
                    setMessage('');
                  }}
                  className="text-xs text-brand-orange hover:underline font-medium"
                >
                  Change Email/Mobile
                </button>
              </div>
              <input
                id="otp"
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value)}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white placeholder-gray-500 rounded-lg focus:outline-none focus:ring-brand-orange focus:border-brand-orange sm:text-lg text-center font-mono tracking-[0.5em]"
                placeholder="------"
              />
            </div>

            <button
              type="submit"
              disabled={isProcessing || otp.length !== 6}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-black dark:hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 transition-colors"
            >
              {isProcessing ? 'Verifying...' : 'Login'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-brand-orange border-t-transparent rounded-full animate-spin mb-4"></div>
          <h2 className="text-xl font-bold text-gray-900">Setting up your session...</h2>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

