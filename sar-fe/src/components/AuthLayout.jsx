import { Radar, Radio, Satellite, ScanLine, Zap, Target, Signal } from 'lucide-react';

const AuthLayout = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen min-w-full relative overflow-hidden m-0 p-0 bg-black">

      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/bg.webp')`,
        }}
      >
        <div className="absolute inset-0 bg-black/85"></div>
       
        <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black opacity-60"></div>
      </div>

      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                         linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }}></div>

      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-96 h-96 border border-gray-700/30 rounded-full"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 border border-gray-600/20 rounded-full"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-gray-500/15 rounded-full"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border border-gray-400/10 rounded-full"></div>
        </div>
      </div>

 
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96">
          <div className="absolute top-1/2 left-1/2 w-0.5 h-48 bg-gradient-to-t from-transparent via-white/40 to-transparent origin-bottom -translate-x-1/2 animate-spin opacity-60" style={{ animationDuration: '8s' }}></div>
        </div>
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
       
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="relative group">
              
                <div className="w-20 h-20 bg-gradient-to-br from-gray-900 to-black backdrop-blur-xl border border-gray-600/30 flex items-center justify-center shadow-2xl group-hover:border-gray-400/50 transition-all duration-300">
                  <Satellite className="w-10 h-10 text-gray-300" />
                </div>
                
      
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg animate-pulse">
                  <Signal className="w-3 h-3 text-black" />
                </div>
                
         
                <div className="absolute -bottom-1 -left-1 opacity-70">
                  <Target className="w-4 h-4 text-gray-400 animate-pulse" />
                </div>
    
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border border-gray-500/20 animate-ping opacity-30"></div>
              </div>
            </div>
            
            <h1 className="text-4xl font-bold text-white mb-3 font-mono tracking-wider">
              {title}
            </h1>
            <p className="text-gray-400 text-lg font-mono tracking-wide">{subtitle}</p>
          </div>


          <div className="bg-gray-900/60 backdrop-blur-sm border border-gray-600/30 shadow-2xl p-4 relative overflow-hidden">
     
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gray-400/20 to-transparent"></div>
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>
            <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-transparent via-gray-400/15 to-transparent"></div>
            
          
            <div className="absolute top-2 left-2 w-4 h-4 border-l-2 border-t-2 border-gray-500/50"></div>
            <div className="absolute top-2 right-2 w-4 h-4 border-r-2 border-t-2 border-gray-500/50"></div>
            <div className="absolute bottom-2 left-2 w-4 h-4 border-l-2 border-b-2 border-gray-500/50"></div>
            <div className="absolute bottom-2 right-2 w-4 h-4 border-r-2 border-b-2 border-gray-500/50"></div>
            
            <div className="relative z-10">
              {children}
            </div>
          </div>

          <div className="text-center mt-8">
            <div className="flex justify-center space-x-6 mb-4">
              <div className="flex items-center space-x-2 group cursor-pointer">
                <Radar className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                <ScanLine className="w-5 h-5 text-gray-500 group-hover:text-gray-300 transition-colors animate-pulse" />
              </div>
              
              <div className="w-px h-6 bg-gray-700"></div>
              
              <div className="flex items-center space-x-2 group cursor-pointer">
                <Radio className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                <Zap className="w-5 h-5 text-gray-500 group-hover:text-gray-300 transition-colors" />
              </div>
            </div>
            
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <p className="text-gray-500 text-sm font-mono tracking-wider uppercase">
                SYNTHETIC APERTURE RADAR
              </p>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-500"></div>
            </div>
            
            <p className="text-gray-600 text-xs mt-2 font-mono tracking-wide">
              X-BAND • POLARIMETRIC • SECURE ACCESS
            </p>
            

            <div className="flex justify-center space-x-4 mt-3 text-xs font-mono">
              <span className="text-gray-600">RNG: 450km</span>
              <span className="text-gray-600">AZ: 12°</span>
              <span className="text-gray-600">STATUS: ACTIVE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
