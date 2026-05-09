import { useState } from 'react';
import { auth, RecaptchaVerifier, signInWithPhoneNumber } from '../firebase';
import OTPInput from 'react-otp-input';
import AuthLayout from './AuthLayout';
import { Smartphone, ShieldCheck } from 'lucide-react';

const OtpLogin = () => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  const sendOTP = async () => {
    try {
      setIsLoading(true);
      window.recaptchaVerifier = new RecaptchaVerifier('recaptcha-container', {
        size: 'invisible',
      }, auth);

      const confirmationResult = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
      setConfirmation(confirmationResult);
      alert('OTP Sent!');
    } catch (err) {
      console.error(err);
      alert('Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async () => {
    try {
      const result = await confirmation.confirm(otp);
      setVerified(true);
      alert('Logged in as ' + result.user.phoneNumber);
    } catch (err) {
      console.error(err);
      alert('Invalid OTP');
    }
  };

  return (
    <AuthLayout
      title="OTP Access"
      subtitle="Authenticate with secure mobile verification"
    >
      <div className="space-y-6">
        <div id="recaptcha-container"></div>

        {!verified ? (
          <>
            <div>
              <label className="text-gray-300 font-mono uppercase text-sm mb-2 block">
                <Smartphone className="inline w-4 h-4 mr-1" />
                Mobile Number
              </label>
              <input
                type="tel"
                placeholder="+911234567890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-black/60 border border-gray-600 text-white font-mono px-4 py-3"
              />
            </div>

            {!confirmation ? (
              <button
                onClick={sendOTP}
                disabled={isLoading}
                className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-600 py-3 font-mono text-white uppercase tracking-wider"
              >
                {isLoading ? 'SENDING...' : 'SEND OTP'}
              </button>
            ) : (
              <>
                <p className="text-gray-400 text-sm text-center">Enter the 6-digit code sent to your phone</p>
                <OTPInput
                  value={otp}
                  onChange={setOtp}
                  numInputs={6}
                  containerStyle="flex justify-center space-x-3"
                  inputStyle="bg-black/60 border border-gray-600 text-white text-center w-10 py-3"
                />
                <button
                  onClick={verifyOTP}
                  className="w-full bg-green-700 hover:bg-green-600 border border-green-500 py-3 mt-4 font-mono text-white uppercase"
                >
                  VERIFY CODE
                </button>
              </>
            )}
          </>
        ) : (
          <div className="text-center text-green-400 font-mono">
            <ShieldCheck className="w-6 h-6 mx-auto mb-2" />
            Access Granted — Secure Session Active
          </div>
        )}
      </div>
    </AuthLayout>
  );
};

export default OtpLogin;
