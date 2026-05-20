import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Satellite, LogOut, CheckCheck, Droplet, Ship } from 'lucide-react';
import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import ThemeToggleButton from '@/components/ui/theme-toggle-button';
import OilSpillValidator from './OilSpillValidator';
import ShipValidator from './AnnotationValidator';

const ValidatorPage = () => {
  const { currentUser, logout } = useAuth();
  const [phoneUser, setPhoneUser] = useState(null);
  const [authType, setAuthType] = useState('loading');
  const navigate = useNavigate();

  // Authentication check
  useEffect(() => {
    const checkPhoneAuth = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/auth/status`, {
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          if (data.authenticated) {
            setPhoneUser({ phone: data.phone });
            setAuthType('phone');
          } else if (currentUser) {
            setAuthType('firebase');
          } else {
            navigate('/');
          }
        } else if (currentUser) {
          setAuthType('firebase');
        } else {
          navigate('/');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        if (currentUser) setAuthType('firebase');
        else navigate('/');
      }
    };
    checkPhoneAuth();
  }, [currentUser, navigate]);

  const handleLogout = async () => {
    try {
      if (authType === 'firebase') await logout();
      else if (authType === 'phone')
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST',
          credentials: 'include'
        });
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getUserDisplayName = () => {
    if (authType === 'firebase' && currentUser)
      return currentUser.displayName ||
        currentUser.email?.split('@')[0]?.toUpperCase() ||
        'FIREBASE_USER';
    else if (authType === 'phone' && phoneUser)
      return `PHONE_USER (${phoneUser.phone?.slice(0, 6)}...)`;
    return 'UNKNOWN';
  };

  if (authType === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-lg font-mono uppercase tracking-wide text-muted-foreground">
            Authenticating Terminal Access
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="mr-2"
            >
              ← Back
            </Button>
            <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted">
              <CheckCheck className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold font-mono tracking-wider uppercase">
              Validation Terminal
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-mono text-muted-foreground">
                  OPERATOR:
                </p>
                <Badge variant="secondary" className="font-mono">
                  {getUserDisplayName()}
                </Badge>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <p className="text-xs font-mono text-muted-foreground">
                  AUTH:
                </p>
                <Badge variant="outline" className="text-xs font-mono">
                  {authType.toUpperCase()}
                </Badge>
              </div>
            </div>

            <Separator orientation="vertical" className="h-8" />
            
            <ThemeToggleButton />
            
            <Button
              onClick={handleLogout}
              variant="destructive"
              size="sm"
              className="font-mono text-xs"
            >
              <LogOut className="mr-2 h-4 w-4" />
              LOGOUT
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-mono uppercase tracking-wide">
              Validation Operations
            </CardTitle>
            <CardDescription className="font-mono">
              Verify and validate annotation accuracy for processed data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="oil-validator" className="w-full">
              <TabsList className="grid w-full grid-cols-2 gap-2">
                <TabsTrigger value="oil-validator" className="gap-2">
                  <Droplet className="h-4 w-4" />
                  <span className="hidden sm:inline">Oil Spill Validator</span>
                  <span className="sm:hidden">Oil Spill</span>
                </TabsTrigger>
                <TabsTrigger value="ship-validator" className="gap-2">
                  <Ship className="h-4 w-4" />
                  <span className="hidden sm:inline">Ship Validator</span>
                  <span className="sm:hidden">Ship</span>
                </TabsTrigger>
              </TabsList>

              <div className="mt-6">
                <TabsContent value="oil-validator" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle className="font-mono text-lg flex items-center gap-2">
                        <Droplet className="h-5 w-5 text-orange-500" />
                        Oil Spill Polygon Validator
                      </CardTitle>
                      <CardDescription className="font-mono">
                        Validate polygon annotations for oil spill detection with DZI and JSON support
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <OilSpillValidator />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="ship-validator" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle className="font-mono text-lg flex items-center gap-2">
                        <Ship className="h-5 w-5 text-blue-500" />
                        Ship Bounding Box Validator
                      </CardTitle>
                      <CardDescription className="font-mono">
                        Validate bounding box annotations for ship detection with DZI and JSON support
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ShipValidator />
                    </CardContent>
                  </Card>
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>

        {/* System Status Footer */}
        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-center">
              <Badge variant="outline" className="font-mono text-xs">
                VALIDATION SYSTEM
              </Badge>
              <Separator orientation="vertical" className="hidden sm:block h-4" />
              <Badge variant="outline" className="font-mono text-xs">
                ANNOTATION VERIFICATION
              </Badge>
              <Separator orientation="vertical" className="hidden sm:block h-4" />
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="font-mono text-xs text-muted-foreground">
                  SYSTEM OPERATIONAL
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ValidatorPage;
