# SAR Client - Authentication System

A beautiful, modern authentication system with SAR (Synthetic Aperture Radar) inspired design, built with React, Clerk, and Tailwind CSS.

## Features

- 🔐 **Secure Authentication** with Clerk
- 🎨 **Beautiful SAR-inspired UI** with glass morphism effects
- 📱 **Responsive Design** that works on all devices
- 🚀 **Modern React** with hooks and functional components
- 🎯 **Google OAuth** and other social login options
- 📊 **Dashboard** with beautiful stats and activity feed

## Screenshots

The app features:
- Animated gradient backgrounds inspired by SAR imagery
- Glass morphism cards with backdrop blur effects
- Satellite and radar-themed icons
- Smooth animations and transitions
- Professional dashboard with real-time stats

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set up Clerk Authentication

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Create a new application
3. Copy your **Publishable Key**
4. Replace the placeholder in `src/App.jsx`:

```javascript
const CLERK_PUBLISHABLE_KEY = 'pk_test_YOUR_ACTUAL_KEY_HERE';
```

### 3. Configure Social Login (Optional)

In your Clerk Dashboard:
1. Go to **User & Authentication** → **Social Connections**
2. Enable **Google OAuth**
3. Add your Google OAuth credentials

### 4. Install Tailwind CSS

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 5. Run the Development Server

```bash
npm run dev
```

## Project Structure

```
src/
├── components/
│   ├── AuthLayout.jsx      # Main authentication layout
│   ├── SignIn.jsx          # Sign in page
│   ├── SignUp.jsx          # Sign up page
│   └── Dashboard.jsx       # Authenticated user dashboard
├── App.jsx                 # Main app with routing
└── index.css              # Tailwind CSS and custom styles
```

## Routes

- `/` - Redirects to dashboard if signed in, otherwise to sign-in
- `/sign-in` - Sign in page
- `/sign-up` - Sign up page
- `/dashboard` - Main dashboard (requires authentication)

## Customization

### Colors
The app uses a SAR-inspired color palette:
- Primary: Blue gradients (`from-blue-500 to-indigo-600`)
- Background: Dark gradients (`from-slate-900 via-blue-900 to-indigo-900`)
- Accent: Purple and green highlights

### Icons
Uses Lucide React icons:
- `Satellite` - Main app icon
- `Radar` - Scanning/processing
- `Waves` - Data visualization
- `Map` - Project management

## Technologies Used

- **React 19** - Modern React with hooks
- **Clerk** - Authentication and user management
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library
- **React Router** - Client-side routing
- **Vite** - Fast build tool

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
```

Then update `src/App.jsx`:

```javascript
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
```

## Deployment

The app is ready for deployment on:
- Vercel
- Netlify
- GitHub Pages
- Any static hosting service

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use this project for your own applications!
