const SarLoader = () => {
  return (
    <div className="w-screen h-screen bg-black overflow-hidden fixed top-0 left-0 flex items-center justify-center">
      {/* Background grid pattern */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                         linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }}></div>

      {/* Range rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative">
          <div className="w-80 h-80 border border-gray-700/30 rounded-full animate-ping opacity-30"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-gray-600/25 rounded-full animate-ping delay-300 opacity-25"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-gray-500/20 rounded-full animate-ping delay-700 opacity-20"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-gray-400/15 rounded-full animate-ping delay-1000 opacity-15"></div>
        </div>
      </div>

      {/* Rotating sweep line */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-80 h-80">
          <div className="absolute top-1/2 left-1/2 w-0.5 h-40 bg-gradient-to-t from-transparent via-white/60 to-transparent origin-bottom -translate-x-1/2 animate-spin opacity-70" style={{ animationDuration: '4s' }}></div>
        </div>
      </div>

      {/* Center content */}
      <div className="relative z-10 text-center">
        {/* SAR Icon/Symbol */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-20 h-20 bg-gray-900/80 border border-gray-600/40 flex items-center justify-center shadow-xl">
              <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                <circle cx="12" cy="12" r="3" strokeWidth={0.5} fill="currentColor" opacity={0.3} />
              </svg>
            </div>
            
            {/* Signal indicator */}
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-white flex items-center justify-center animate-pulse">
              <div className="w-2 h-2 bg-black rounded-full"></div>
            </div>
            
            {/* Pulsing ring around icon */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 border border-gray-500/30 rounded-full animate-pulse opacity-50"></div>
          </div>
        </div>

        {/* Loading text */}
        <h1 className="text-3xl font-bold text-white mb-4 font-mono tracking-[0.2em] uppercase">
          SAR System
        </h1>
        <p className="text-gray-400 text-lg font-mono tracking-wide mb-8">
          Initializing Terminal...
        </p>

        {/* Progress bar */}
        <div className="w-80 mx-auto mb-6">
          <div className="bg-gray-800/50 border border-gray-600/40 h-3">
            <div className="h-full bg-gradient-to-r from-gray-600 to-white animate-pulse" style={{
              width: '0%',
              animation: 'sarProgress 3s ease-in-out infinite'
            }}></div>
          </div>
        </div>

        {/* Status indicators */}
        <div className="flex justify-center space-x-6 mb-8">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-gray-400 font-mono text-sm uppercase tracking-wide">System Online</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse delay-300"></div>
            <span className="text-gray-400 font-mono text-sm uppercase tracking-wide">Radar Active</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-700"></div>
            <span className="text-gray-400 font-mono text-sm uppercase tracking-wide">Signal Processing</span>
          </div>
        </div>

        {/* Technical readouts */}
        <div className="text-gray-500 font-mono text-xs space-y-1">
          <p>X-BAND FREQUENCY: 9.6 GHz</p>
          <p>POLARIZATION: VV/VH</p>
          <p>RANGE RESOLUTION: 1.0m</p>
          <p>STATUS: AUTHENTICATING...</p>
        </div>

        {/* Animated dots */}
        <div className="flex justify-center space-x-1 mt-6">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-white rounded-full animate-pulse delay-200"></div>
          <div className="w-2 h-2 bg-white rounded-full animate-pulse delay-500"></div>
        </div>
      </div>

      {/* Corner brackets */}
      <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-gray-600/40"></div>
      <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-gray-600/40"></div>
      <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-gray-600/40"></div>
      <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-gray-600/40"></div>

      {/* Bottom status bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
        <div className="flex items-center space-x-4 text-xs font-mono text-gray-600">
          <span>SYNTHETIC APERTURE RADAR</span>
          <span>•</span>
          <span>CLASSIFIED SYSTEM</span>
          <span>•</span>
          <span>{new Date().toISOString().slice(11, 19)} UTC</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes sarProgress {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default SarLoader;