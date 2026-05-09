import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthLayout from './AuthLayout';
import OTPInput from 'react-otp-input';
import { Mail, Lock, Chrome, Smartphone, ShieldCheck, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const SignInPage = () => {
  const [mode, setMode] = useState('password'); // 'password' or 'otp'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [verified, setVerified] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const { login, loginWithGoogle, error, sendOTP, verifyOTP } = useAuth();
  const navigate = useNavigate();

  // Email/password login
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setLocalError('Please fill in all fields');
      return;
    }

    try {
      setIsLoading(true);
      setLocalError('');
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setLocalError(err.message || 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  // Request OTP code
  const handleSendOTP = async () => {
    if (!phone) {
      setLocalError('Enter a valid phone number');
      return;
    }
    try {
      setIsLoading(true);
      setLocalError('');
      const confirmationResult = await sendOTP(phone);
      setConfirmation(confirmationResult);
    } catch (err) {
      setLocalError(err.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP code and login
  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setLocalError('Enter the 6-digit OTP');
      return;
    }
    try {
      setIsLoading(true);
      setLocalError('');
      const user = await verifyOTP(confirmation, otp);
      setVerified(true);
      navigate('/dashboard');
    } catch (err) {
      setLocalError(err.message || 'Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setLocalError('');
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      setLocalError(err.message || 'Failed to sign in with Google');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="System Access"
      subtitle="Authentication required for SAR terminal"
    >
      <div className="space-y-6">
        {mode === 'password' ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold mb-2 tracking-tight">
                Terminal Login
              </h2>
              <p className="text-muted-foreground text-sm">
                Enter credentials to access system
              </p>
            </div>

            {(localError || error) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {localError || error}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@sar-system.mil"
                disabled={isLoading}
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            <div className="text-right">
              <Link
                to="/reset-password"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Reset credentials?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full font-medium"
              size="lg"
            >
              {isLoading ? 'Authenticating...' : 'Access System'}
            </Button>

            {/* Switch to OTP */}
            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => {
                  setMode('otp');
                  setLocalError('');
                }}
                className="text-sm"
              >
                Use mobile OTP instead
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-center tracking-tight">
              Mobile OTP Access
            </h2>

            {(localError || error) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {localError || error}
                </AlertDescription>
              </Alert>
            )}

            {!verified ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    Mobile Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+911234567890"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={isLoading || confirmation}
                    className="font-mono"
                  />
                </div>

                {!confirmation ? (
                  <Button
                    onClick={handleSendOTP}
                    disabled={isLoading}
                    className="w-full font-medium"
                    size="lg"
                  >
                    {isLoading ? 'Sending...' : 'Send OTP'}
                  </Button>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground text-center">
                      Enter the 6-digit code sent to your phone
                    </p>
                    <div className="flex justify-center">
                      <OTPInput
                        value={otp}
                        onChange={setOtp}
                        numInputs={6}
                        containerStyle="flex gap-3"
                        inputStyle="w-12 h-12 text-center text-lg font-semibold border border-input bg-background rounded-md focus:ring-2 focus:ring-ring focus:outline-none"
                        renderInput={(props) => <input {...props} />}
                        isDisabled={isLoading}
                      />
                    </div>
                    <Button
                      onClick={handleVerifyOTP}
                      disabled={isLoading}
                      className="w-full font-medium"
                      size="lg"
                    >
                      {isLoading ? 'Verifying...' : 'Verify Code'}
                    </Button>
                  </>
                )}

                {/* Back to password login */}
                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => {
                      setMode('password');
                      setLocalError('');
                      setPhone('');
                      setOtp('');
                      setConfirmation(null);
                      setVerified(false);
                    }}
                    className="text-sm"
                  >
                    Use email & password instead
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center space-y-3 py-6">
                <ShieldCheck className="w-12 h-12 mx-auto text-green-500" />
                <p className="text-green-600 dark:text-green-400 font-medium">
                  Access Granted — Secure Session Active
                </p>
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="relative">
          <Separator />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="bg-background px-4 text-xs text-muted-foreground">
              Or authenticate with
            </span>
          </div>
        </div>

        {/* Google Auth */}
        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full gap-2"
          size="lg"
        >
          <Chrome className="w-5 h-5" />
          <span className="font-medium">Google Auth</span>
        </Button>

        {/* Sign Up Link */}
        <div className="text-center pt-4 border-t">
          <span className="text-sm text-muted-foreground">New operator? </span>
          <Link
            to="/sign-up"
            className="text-sm text-primary hover:underline"
          >
            Request access
          </Link>
        </div>

        {/* Status Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Badge variant="outline" className="text-xs">
            Terminal: Secure
          </Badge>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <Badge variant="outline" className="text-xs">
              Online
            </Badge>
          </div>
        </div>

        <div id="recaptcha-container"></div>
      </div>
    </AuthLayout>
  );
};

export default SignInPage;
