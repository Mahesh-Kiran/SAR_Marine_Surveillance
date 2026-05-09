import React, { useState } from 'react';
import AuthLayout from './AuthLayout';

const PhoneAuthPage = () => {
  const [step, setStep] = useState('phone'); // 'phone' or 'verify'
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Send verification code
  const handleSendCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:3001/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess('Verification code sent successfully');
        setStep('verify');
      } else {
        setError(data.error || 'Failed to send verification code');
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Verify code and complete auth
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:3001/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone, code })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess('Authentication successful! Redirecting...');
        // Redirect to dashboard or reload page
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
      } else {
        setError(data.error || 'Invalid verification code');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Go back to phone input
  const handleBackToPhone = () => {
    setStep('phone');
    setCode('');
    setError('');
    setSuccess('');
  };

  // Resend verification code
  const handleResendCode = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:3001/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phone })
      });
      
      if (response.ok) {
        setSuccess('New verification code sent');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to resend code');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout 
      title="SYSTEM ACCESS" 
      subtitle="Phone-based authentication for SAR terminal"
    >
      <div className="space-y-6">
        {step === 'phone' ? (
          
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <h2 className="text-white text-lg font-mono font-bold tracking-wider uppercase">
                Enter Phone Number
              </h2>
              <p className="text-gray-400 font-mono text-sm leading-relaxed">
                We'll send you a verification code via SMS to secure your access to the SAR detection system.
              </p>
            </div>

            <form onSubmit={handleSendCode} className="space-y-6">
              <div className="space-y-3">
                <label className="text-gray-300 font-mono font-medium tracking-wide uppercase text-sm block">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1234567890"
                  required
                  className="w-full bg-black/60 border border-gray-600 text-white placeholder-gray-500 px-4 py-4 focus:ring-1 focus:ring-white focus:border-white backdrop-blur-sm font-mono transition-all duration-200 text-sm focus:outline-none"
                />
                <p className="text-gray-500 font-mono text-xs mt-2">
                  Include country code (e.g., +1 for US, +44 for UK)
                </p>
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-500/50 rounded p-4">
                  <p className="text-red-400 font-mono text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-900/30 border border-green-500/50 rounded p-4">
                  <p className="text-green-400 font-mono text-sm">{success}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !phone.trim()}
                className={`w-full font-mono font-semibold py-4 px-6 transition-all duration-200 shadow-lg hover:shadow-xl tracking-wide uppercase text-sm ${
                  loading || !phone.trim()
                    ? 'bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white hover:border-gray-500'
                }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-3">
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Sending Code</span>
                  </div>
                ) : (
                  'Send Verification Code'
                )}
              </button>
            </form>
          </div>
        ) : (
        
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <h2 className="text-white text-lg font-mono font-bold tracking-wider uppercase">
                Enter Verification Code
              </h2>
              <p className="text-gray-400 font-mono text-sm leading-relaxed">
                We sent a 6-digit code to <span className="text-blue-400">{phone}</span>
              </p>
            </div>

            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div className="space-y-3">
                <label className="text-gray-300 font-mono font-medium tracking-wide uppercase text-sm block">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  maxLength="6"
                  required
                  className="w-full bg-black/60 border border-gray-600 text-white placeholder-gray-500 px-4 py-4 focus:ring-1 focus:ring-white focus:border-white backdrop-blur-sm font-mono transition-all duration-200 text-sm focus:outline-none text-center text-xl tracking-widest"
                />
                <p className="text-gray-500 font-mono text-xs mt-2">
                  Enter the 6-digit code from your SMS
                </p>
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-500/50 rounded p-4">
                  <p className="text-red-400 font-mono text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-900/30 border border-green-500/50 rounded p-4">
                  <p className="text-green-400 font-mono text-sm">{success}</p>
                </div>
              )}

              <div className="space-y-4">
                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className={`w-full font-mono font-semibold py-4 px-6 transition-all duration-200 shadow-lg hover:shadow-xl tracking-wide uppercase text-sm ${
                    loading || code.length !== 6
                      ? 'bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 border border-blue-500 text-white hover:border-blue-400'
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-3">
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                      <span>Verifying</span>
                    </div>
                  ) : (
                    'Verify & Access Terminal'
                  )}
                </button>

                <div className="flex items-center justify-between text-sm font-mono">
                  <button
                    type="button"
                    onClick={handleBackToPhone}
                    className="text-gray-400 hover:text-white transition-colors duration-200 underline"
                  >
                    ← Change Phone Number
                  </button>

                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={loading}
                    className="text-blue-400 hover:text-blue-300 transition-colors duration-200 underline"
                  >
                    Resend Code
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Status Footer */}
        <div className="mt-6 pt-4 border-t border-gray-700">
          <div className="flex items-center justify-between text-xs font-mono text-gray-500">
            <span>{step === 'phone' ? 'PHONE AUTH READY' : 'VERIFICATION ACTIVE'}</span>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                step === 'phone' ? 'bg-blue-500' : 'bg-green-500'
              }`}></div>
              <span>SECURE</span>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-gray-800/30 border border-gray-700/50 rounded p-4">
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 text-blue-400 mt-0.5">🔒</div>
            <div>
              <h4 className="text-blue-300 font-mono text-sm font-bold mb-2 uppercase tracking-wide">
                Secure Access Protocol
              </h4>
              <ul className="space-y-1 text-xs font-mono text-gray-400">
                <li>• SMS verification ensures secure terminal access</li>
                <li>• Your phone number is encrypted and protected</li>
                <li>• Session expires after 24 hours for security</li>
                <li>• No passwords required - phone-based authentication</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default PhoneAuthPage;
