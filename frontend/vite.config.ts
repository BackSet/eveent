import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/react-tabs', '@radix-ui/react-dropdown-menu', '@radix-ui/react-checkbox', '@radix-ui/react-alert-dialog', '@radix-ui/react-toast', '@radix-ui/react-avatar', '@radix-ui/react-label', '@radix-ui/react-separator', '@radix-ui/react-slot'],
          'vendor-utils': ['axios', 'class-variance-authority', 'clsx', 'tailwind-merge'],
        },
      },
    },
  },
})