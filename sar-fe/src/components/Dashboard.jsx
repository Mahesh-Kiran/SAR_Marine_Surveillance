import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Satellite, LogOut, Ship, FileImage, Droplet, Edit3, CheckCheck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import ThemeToggleButton from '@/components/ui/theme-toggle-button';

const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const [phoneUser, setPhoneUser] = useState(null);
  const [authType, setAuthType] = useState('loading');
  const navigate = useNavigate();

  // Authentication check
  useEffect(() => {
    const checkPhoneAuth = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/auth/status', {
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
        await fetch('http://localhost:3000/api/auth/logout', {
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
  };

  const modules = [
    {
      id: 'ship-detection',
      title: 'Ship Detection',
      description: 'View and analyze ship detection results',
      icon: Ship,
      route: '/ship-detection',
      color: 'blue'
    },
    {
      id: 'ship-annotation',
      title: 'Ship Annotation',
      description: 'Create and edit ship annotations',
      icon: FileImage,
      route: '/ship-annotation',
      color: 'cyan'
    },
    {
      id: 'oil-detection',
      title: 'Oil Spill Detection',
      description: 'View and analyze oil spill detection',
      icon: Droplet,
      route: '/oil-detection',
      color: 'orange'
    },
    {
      id: 'oil-annotation',
      title: 'Oil Spill Annotation',
      description: 'Create and edit oil spill annotations',
      icon: Edit3,
      route: '/oil-annotation',
      color: 'amber'
    },
    {
      id: 'validators',
      title: 'Annotation Validator',
      description: 'Validate ship bounding boxes and oil spill polygon annotations',
      icon: CheckCheck,
      route: '/validators',
      color: 'green'
    }
  ];

  const getIconColor = (color) => {
    const colors = {
      blue: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
      cyan: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-500',
      orange: 'bg-orange-500/10 border-orange-500/20 text-orange-500',
      amber: 'bg-amber-500/10 border-amber-500/20 text-amber-500',
      green: 'bg-green-500/10 border-green-500/20 text-green-500'
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted">
              <Satellite className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold font-mono tracking-wider uppercase">
              SAR Terminal
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
      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Page Title */}
          <div className="text-center space-y-3">
            <h2 className="text-4xl font-bold tracking-tight">System Operations</h2>
            <p className="text-lg text-muted-foreground">
              Select an operation module to begin processing
            </p>
          </div>

          {/* Module Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <Card
                  key={module.id}
                  className="cursor-pointer transition-all hover:shadow-xl hover:border-primary/50 hover:scale-[1.02]"
                  onClick={() => navigate(module.route)}
                >
                  <CardHeader className="pb-6">
                    <div className="flex items-start gap-6">
                      <div className={`flex h-16 w-16 items-center justify-center rounded-xl border-2 ${getIconColor(module.color)}`}>
                        <Icon className="h-8 w-8" />
                      </div>
                      <div className="flex-1 pt-2">
                        <CardTitle className="text-2xl mb-2">{module.title}</CardTitle>
                        <CardDescription className="text-base">
                          {module.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-end text-sm text-muted-foreground">
                      <span>Click to open</span>
                      <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/50">
        <div className="container px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-center">
            <Badge variant="outline" className="font-mono text-xs">
              SYNTHETIC APERTURE RADAR SYSTEM
            </Badge>
            <Separator orientation="vertical" className="hidden sm:block h-4" />
            <Badge variant="outline" className="font-mono text-xs">
              CLASSIFIED OPERATION
            </Badge>
            <Separator orientation="vertical" className="hidden sm:block h-4" />
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="font-mono text-xs text-muted-foreground">
                SYSTEM OPERATIONAL
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
