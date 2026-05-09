import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthLayout from './AuthLayout';
import { Mail, Lock, User, Chrome, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const SignUpPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const { signup, loginWithGoogle, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password || !displayName) {
      setLocalError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    try {
      setIsLoading(true);
      setLocalError('');
      await signup(email, password, displayName);
      navigate('/dashboard');
    } catch (err) {
      setLocalError(err.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      setIsLoading(true);
      setLocalError('');
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      setLocalError(err.message || 'Failed to sign up with Google');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout 
      title="Join SAR Terminal" 
      subtitle="Create your account to get started"
    >
      <div className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold mb-2 tracking-tight">
              New Operator Registration
            </h2>
            <p className="text-muted-foreground text-sm">
              Create credentials for system access
            </p>
          </div>

          {/* Error Display */}
          {(localError || error) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {localError || error}
              </AlertDescription>
            </Alert>
          )}

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Call Sign
            </Label>
            <Input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Operator-01"
              disabled={isLoading}
            />
          </div>

          {/* Email */}
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

          {/* Password */}
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
              placeholder="Minimum 6 characters"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Password must be at least 6 characters long
            </p>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              disabled={isLoading}
            />
          </div>

          {/* Register Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full font-medium"
            size="lg"
          >
            {isLoading ? 'Registering...' : 'Register Operator'}
          </Button>

          {/* Divider */}
          <div className="relative">
            <Separator />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-background px-4 text-xs text-muted-foreground">
                Or register with
              </span>
            </div>
          </div>

          {/* Google Sign Up */}
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignUp}
            disabled={isLoading}
            className="w-full gap-2"
            size="lg"
          >
            <Chrome className="w-5 h-5" />
            <span className="font-medium">Google Auth</span>
          </Button>

          {/* Sign In Link */}
          <div className="text-center pt-4 border-t">
            <span className="text-sm text-muted-foreground">Already registered? </span>
            <Link 
              to="/sign-in" 
              className="text-sm text-primary hover:underline"
            >
              Access system
            </Link>
          </div>
        </form>

        {/* Status Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Badge variant="outline" className="text-xs">
            New User Registration
          </Badge>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <Badge variant="outline" className="text-xs">
              Ready
            </Badge>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default SignUpPage;
