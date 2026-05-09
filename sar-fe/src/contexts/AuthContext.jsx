// src/contexts/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  linkWithPhoneNumber
} from 'firebase/auth';
import { auth } from '../firebase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Email/password signup
  const signup = async (email, password, displayName) => {
    try {
      setError(null);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await updateProfile(userCredential.user, { displayName });
      }
      return userCredential;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Email/password login
  const login = async (email, password) => {
    try {
      setError(null);
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Google login
  const loginWithGoogle = async () => {
    try {
      setError(null);
      const provider = new GoogleAuthProvider();
      return await signInWithPopup(auth, provider);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Logout
  const logout = () => signOut(auth);

  // Reset password
  const resetPassword = (email) => sendPasswordResetEmail(auth, email);

 const setupRecaptcha = () => {
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(auth,
      'recaptcha-container',
      {
        size: 'invisible',
        ...(window.location.hostname === 'localhost' && { appVerificationDisabledForTesting: true }),
      },
     
    );
  }
};


  // Send OTP to phone number
  const sendOTP = async (phoneNumber) => {
    try {
      setError(null);
      setupRecaptcha();
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
      return confirmationResult; // Store this to verify later
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Verify OTP code and sign in user
  const verifyOTP = async (confirmationResult, otpCode) => {
    try {
      setError(null);
      const result = await confirmationResult.confirm(otpCode);
      return result.user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Link phone number to the current signed in user (for multi-factor or phone verification)
  const linkPhoneNumber = async (phoneNumber) => {
    try {
      setError(null);
      setupRecaptcha();
      const confirmationResult = await linkWithPhoneNumber(auth.currentUser, phoneNumber, window.recaptchaVerifier);
      return confirmationResult; // Confirm OTP afterward
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    loginWithGoogle,
    logout,
    resetPassword,
    error,
    setError,
    sendOTP,
    verifyOTP,
    linkPhoneNumber,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
