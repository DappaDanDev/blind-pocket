import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Fix for Nillion SDK Node.js modules in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        buffer: false,
        util: false,
        url: false,
        querystring: false,
        http: false,
        https: false,
        net: false,
        tls: false,
        zlib: false,
        events: false,
        child_process: false,
        cluster: false,
        module: false,
        perf_hooks: false,
        worker_threads: false,
        async_hooks: false,
        inspector: false,
        dns: false,
        dgram: false,
        readline: false,
        repl: false,
        tty: false,
        constants: false,
        vm: false,
        string_decoder: false,
        timers: false,
        console: false,
        process: false,
        assert: false,
        domain: false,
        punycode: false,
        v8: false,
        sys: false,
      };
    }
    
    return config;
  },
  
  // Disable strict mode to handle potential React issues with SDK
  reactStrictMode: false,
  
  // Add headers for CORS and development
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization'
          }
        ]
      }
    ];
  },
  
};

export default nextConfig;
