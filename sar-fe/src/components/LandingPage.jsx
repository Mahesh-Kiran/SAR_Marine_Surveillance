import { Link } from 'react-router-dom';
import { Satellite, Radar, Target, ArrowRight, Shield, Signal, Database, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import ThemeToggleButton from '@/components/ui/theme-toggle-button';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Image Layer */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('/bg.webp')` }}
      >
        <div className="absolute inset-0 bg-background/90 dark:bg-background/95"></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 opacity-5 dark:opacity-10" style={{
        backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                         linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }}></div>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary/10 border flex items-center justify-center rounded">
                  <Satellite className="w-6 h-6 text-primary" />
                </div>
                <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                  SAR Terminal
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <ThemeToggleButton />
                <Button variant="ghost" asChild className="text-sm">
                  <Link to="/sign-in">Access System</Link>
                </Button>
                <Button asChild className="font-medium text-sm bg-white">
                  <Link to="/sign-up">Initialize</Link>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            {/* Icon */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="w-24 h-24 bg-muted border flex items-center justify-center shadow-2xl rounded">
                  <Satellite className="w-12 h-12 text-primary" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary flex items-center justify-center animate-pulse rounded">
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>
                <div className="absolute -bottom-1 -left-1">
                  <Target className="w-6 h-6 text-muted-foreground animate-pulse" />
                </div>
              </div>
            </div>
            
            {/* Title */}
            <h1 className="text-5xl md:text-6xl font-bold  mb-4 tracking-tight">
              SAR Control
              <span className="block text-muted-foreground text-4xl md:text-5xl mt-2 font-medium">
                Access Terminal
              </span>
            </h1>
            
            {/* Description */}
            <p className="text-lg text-foreground/80 mb-2 max-w-3xl mx-auto leading-relaxed font-medium">
              Classified Synthetic Aperture Radar Authentication System
            </p>
            <p className="text-sm text-muted-foreground mb-8">
              Authorized personnel only • Security clearance required
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Button asChild size="lg" className="font-medium gap-2 bg-white">
                <Link to="/validator">
                  <span>Validator</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="font-medium">
                <Link to="/sign-in">System Login</Link>
              </Button>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
            <Card className="bg-card/80 backdrop-blur-sm border-2 hover:border-primary/50 transition-colors">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-primary/10 border flex items-center justify-center mx-auto mb-6 rounded">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-4 tracking-tight">
                  Security Protocol
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Multi-factor authentication with advanced encryption protocols. Classified security standards enforced.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-sm border-2 hover:border-primary/50 transition-colors">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-primary/10 border flex items-center justify-center mx-auto mb-6 rounded">
                  <Signal className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-4 tracking-tight">
                  Signal Processing
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  High-frequency X-Band radar with real-time data acquisition. Optimized for tactical operations.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/80 backdrop-blur-sm border-2 hover:border-primary/50 transition-colors">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-primary/10 border flex items-center justify-center mx-auto mb-6 rounded">
                  <Database className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-4 tracking-tight">
                  Data Intelligence
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Comprehensive surveillance data with real-time analytics. Intelligence-grade processing capabilities.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* System Status Bar */}
          <Card className="mt-16 bg-muted/60 border-2">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex flex-wrap items-center justify-center gap-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-foreground text-xs font-medium">
                      System Online
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Radio className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground text-xs">X-Band: 9.6 GHz</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Radar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground text-xs">Range: 450km</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Target className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground text-xs">Resolution: 1m</span>
                  </div>
                </div>
                <div className="text-muted-foreground text-xs">
                  {new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer Notice */}
          <div className="text-center mt-12 space-y-2">
            <p className="text-foreground/70 text-xs font-medium">
              Synthetic Aperture Radar Control System • Classified Operation
            </p>
            <p className="text-muted-foreground text-xs">
              Unauthorized access is prohibited and will be prosecuted
            </p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default LandingPage;
